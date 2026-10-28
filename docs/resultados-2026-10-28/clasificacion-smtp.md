# Clasificación del resultado de un fallo SMTP (cortes y tiempos agotados tras DATA)

## Hallazgo

Surgió al verificar los mensajes de un pedido fallido (PR #194). Con nodemailer 10.2.1 y un servidor SMTP falso local que acepta EHLO, MAIL, RCPT y DATA, recibe el cuerpo completo (incluido el `.` final) y después **cierra la conexión** o **no responde**, nodemailer rechaza con `ECONNECTION`/`ETIMEDOUT` y `command: 'CONN'` («Connection closed unexpectedly», «Timeout»). `classifySmtpError` trataba `CONN` como «antes de DATA» y devolvía `NOT_ACCEPTED`: el pedido quedaba `FALLIDO` (se puede repetir sin confirmar) aunque el correo pudiera haber salido. La regla documentada (LEV-R04) es que un corte o un tiempo agotado durante o después de DATA es `INCIERTO`. En la práctica solo el plazo de 60 s de la aplicación llegaba a `INCIERTO`, y el tiempo de inactividad del socket (20 s) se adelantaba. Las pruebas unitarias existentes armaban a mano errores con `command: 'DATA'`, que nodemailer no produce en esos casos.

Lo usan por igual los pedidos de listas (C-4) y el aviso del rechazo de un docente (C-5), porque ambos envían con `SmtpMailer`.

## Corrección

- `SmtpMailer` crea un transporte por envío con `transactionLog: true` y un `logger` propio que no escribe nada y solo anota cuándo sale la orden `DATA` (`SmtpProgress.dataStarted`). Así la fase la observa el transporte y no se deduce del nombre del error. Un transporte por envío evita que envíos simultáneos se contaminen.
- `classifySmtpError(error, progress)`: respuesta de rechazo 4xx/5xx ⇒ `NOT_ACCEPTED`; si hay `progress`, `dataStarted` ⇒ `UNCERTAIN` y si no ⇒ `NOT_ACCEPTED`. Sin `progress` se conserva la deducción anterior por `command` (solo fiable para los errores que nodemailer asocia a una orden).
- Plazos de nodemailer configurables solo por `SmtpConfig.timeouts` (para pruebas); los valores por defecto no cambian (10 s, 10 s, 20 s). No cambian estados, códigos HTTP ni textos.

## Privacidad del registro que observa la fase

El `logger` recibe cada orden SMTP que nodemailer registra con `transactionLog` (por ejemplo `RCPT TO:<…>`; nodemailer enmascara las credenciales en su propio registro, pero no se depende de eso). El logger **no guarda ni imprime nada** de lo recibido: solo compara el texto con `DATA` y levanta un booleano (`SmtpProgress.dataStarted`); los demás niveles no hacen nada. Pruebas (`SmtpMailer.test.ts`): durante un envío aceptado y durante un fallo con credenciales configuradas no se escribe nada en `console.*` ni en la salida estándar/de error, y el error lanzado no contiene la clave, el destinatario ni el contenido. Hacer que el logger escriba lo que recibe rompe esas dos pruebas (comprobado). Límite: se vigila lo que el logger y el error exponen; no se audita el resto de nodemailer.

## Pruebas (`server/tests/unit/SmtpMailer.test.ts`, 15)

Servidor SMTP real dentro del proceso (`net.createServer`, 127.0.0.1; no sale nada a la red): aceptado; conexión rechazada, cierre en el saludo, saludo no recibido, destinatario rechazado 550 y tiempo agotado antes de DATA ⇒ `NOT_ACCEPTED`; corte tras el cuerpo, silencio tras el cuerpo (tiempo agotado) y cierre justo al recibir DATA ⇒ `UNCERTAIN`; rechazo 554 tras el cuerpo ⇒ `NOT_ACCEPTED`; dos envíos a la vez sin contaminarse; y la función de clasificación con la fase. Quitando la anotación de DATA fallan 4 (los de «después de DATA»), que es el defecto original.

## Límites

- Una conexión cortada justo después de enviar la orden DATA, antes de la respuesta 354, se clasifica `INCIERTO` (conservador: no se puede demostrar que el servidor no empezó a aceptar).
- La observación depende de la opción documentada `transactionLog` de nodemailer; si una versión futura cambia ese registro, las pruebas con servidor real lo detectarían (fallarían los casos de «después de DATA»).
- **Registros históricos:** los pedidos y avisos que quedaron `FALLIDO` por esta causa antes de la corrección **no se reclasifican**: no hay forma de demostrar cuáles lo fueron. Una persona que revise un `FALLIDO` antiguo con SMTP real debe saber que pudo ser incierto.
- No se probó con un servidor SMTP institucional real ni con STARTTLS/TLS implícito (los casos usan texto plano local).
