# Guía para configurar el correo (SMTP) — SIT · UNTRM

**Para qué sirve:** dejar funcionando el envío de correo del sistema en el entorno del piloto o en producción. Sin SMTP el servidor de producción **no arranca**, y con SMTP mal configurado nadie recibe las recuperaciones de contraseña ni los avisos.

> Esta guía tiene dos partes: **qué pedir** al área de TI de la universidad (secciones 1 y 2) y **qué hacer** con lo que entreguen (secciones 3 a 7). La sección 8 es una lista de comprobación para dar la configuración por buena.

## Contenido

1. [Qué correos envía el sistema](#1-qué-correos-envía-el-sistema)
2. [Qué pedir al área de TI](#2-qué-pedir-al-área-de-ti)
3. [Dónde se configura](#3-dónde-se-configura)
4. [Ejemplos de configuración](#4-ejemplos-de-configuración)
5. [Cómo probarlo](#5-cómo-probarlo)
6. [Si algo falla](#6-si-algo-falla)
7. [Seguridad y buenas prácticas](#7-seguridad-y-buenas-prácticas)
8. [Lista de comprobación](#8-lista-de-comprobación)

## 1. Qué correos envía el sistema

| Correo | Cuándo | A quién |
|---|---|---|
| Recuperación de contraseña | La persona pulsa «¿Olvidaste tu contraseña?» | A su correo (enlace de un solo uso, vale 60 minutos) |
| Avisos | Cada aviso de la campana: nueva solicitud de tutoría, nueva derivación, cambio de estado, constancia de solicitud registrada | Al correo institucional de la persona avisada |

Los correos son formales, **no llevan datos del caso ni el nombre del estudiante** (solo avisan y traen un enlace al sistema). Salen siempre del mismo remitente (`MAIL_FROM`) y de la misma cuenta SMTP. El envío es de mejor esfuerzo: si el SMTP falla, el sistema sigue funcionando y el aviso queda en la campana.

Volumen esperado en un piloto: pocas decenas de correos al día.

## 2. Qué pedir al área de TI

Envíe esta solicitud (puede copiar el texto):

> **Asunto:** Cuenta de correo para el Sistema Integral de Tutoría (SIT)
>
> Necesitamos una cuenta para que el sistema envíe correos automáticos (recuperación de contraseña y avisos de tutoría) a las direcciones institucionales. Les pedimos:
>
> 1. **Servidor SMTP** (nombre o dirección) y **puerto**.
> 2. **Tipo de cifrado**: TLS implícito (puerto 465) o STARTTLS (puerto 587).
> 3. **Una cuenta de servicio** (no personal) con **usuario y contraseña** para enviar, por ejemplo `sit-noreply@untrm.edu.pe`, o confirmación de que se puede enviar sin autenticación desde la IP del servidor (relay autorizado).
> 4. La **dirección remitente** que podemos usar en el campo «De» (por ejemplo `SIT UNTRM <sit-noreply@untrm.edu.pe>`).
> 5. **Límites de envío** (por hora o por día) y si hay filtros que bloqueen mensajes automáticos.
> 6. Que el servidor del sistema (**IP: ______**) pueda **conectarse al puerto SMTP** (reglas de firewall o lista de IP permitidas).
> 7. Que los mensajes del remitente pasen las comprobaciones **SPF, DKIM y DMARC** del dominio, para que no caigan en correo no deseado.
> 8. Si el servidor usa un **certificado interno** (no público), la entidad certificadora para instalarla.
> 9. Un contacto para atender incidencias de entrega.

Anote las respuestas aquí:

| Dato | Valor |
|---|---|
| Servidor (`SMTP_HOST`) | |
| Puerto (`SMTP_PORT`) | |
| Cifrado (`SMTP_SECURE`: `true` solo si es TLS implícito, normalmente puerto 465) | |
| Usuario (`SMTP_USER`) | |
| Contraseña (`SMTP_PASS`) — **no se escribe aquí**, va solo en `.env.production` | |
| Remitente (`MAIL_FROM`) | |
| Límite de envío | |
| Contacto de TI | |

## 3. Dónde se configura

Todo va en el archivo de entorno del servidor, **`.env.production`** (se crea copiando `.env.production.example`; **nunca se sube al repositorio**):

| Variable | Qué es | Ejemplo |
|---|---|---|
| `SMTP_HOST` | Servidor SMTP | `smtp.untrm.edu.pe` |
| `SMTP_PORT` | Puerto | `587` |
| `SMTP_SECURE` | `true` solo con TLS implícito (puerto 465). Con 587 se deja en `false` y se negocia STARTTLS | `false` |
| `SMTP_USER` / `SMTP_PASS` | Cuenta de envío. Si el servidor no pide autenticación, se dejan vacías | `sit-noreply@untrm.edu.pe` |
| `MAIL_FROM` | Remitente que verá la persona. Va entre comillas dobles | `"SIT UNTRM <sit-noreply@untrm.edu.pe>"` |
| `DOMAIN` | Dominio público del sistema. De él se arma `PUBLIC_APP_URL` (`https://` + dominio): **el botón de cada correo lleva ahí**, así que debe ser el dominio real, no `localhost` | `sit.untrm.edu.pe` |
| `EMAIL_NOTIFICATIONS` | `true` (por defecto) envía los avisos por correo; `false` los apaga (la recuperación de contraseña sigue funcionando) | `true` |

Después de cambiar el archivo, aplique la configuración:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

> En `docker-compose.prod.yml`, `PUBLIC_APP_URL` y `CORS_ORIGIN` se construyen solos como `https://` + `DOMAIN`; en producción deben ser `https://` o el servidor no arranca (validación a propósito). Basta con definir bien `DOMAIN`.

## 4. Ejemplos de configuración

Valores de referencia; **confirme siempre con TI**, porque cada proveedor decide su política.

**a) Servidor institucional con autenticación (lo más común)**

```env
SMTP_HOST=smtp.untrm.edu.pe
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sit-noreply@untrm.edu.pe
SMTP_PASS=<contraseña de la cuenta de servicio>
MAIL_FROM="SIT UNTRM <sit-noreply@untrm.edu.pe>"
```

**b) TLS implícito (puerto 465)**

```env
SMTP_PORT=465
SMTP_SECURE=true
```

**c) Relay interno sin usuario (puerto 25, IP del servidor autorizada)**

```env
SMTP_HOST=relay.untrm.edu.pe
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

**d) Gmail o Google Workspace (para pruebas o si la universidad lo usa)**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=cuenta@dominio
SMTP_PASS=<contraseña de aplicación de 16 caracteres>
MAIL_FROM="SIT UNTRM <cuenta@dominio>"
```

Requiere verificación en dos pasos en la cuenta y crear una **contraseña de aplicación** (no sirve la contraseña normal). Google limita los envíos diarios y reescribe el remitente al de la cuenta autenticada. Es válido para probar; para producción conviene el servidor institucional.

**e) Microsoft 365 / Exchange Online (`smtp.office365.com`, 587)**

Solo funciona si el administrador **habilitó el envío SMTP autenticado** para esa cuenta. Microsoft está retirando la autenticación con usuario y contraseña para SMTP en muchos tenants: si la universidad la tiene desactivada, **este sistema no podrá enviar con esa cuenta**, porque hoy solo soporta usuario y contraseña (no OAuth). En ese caso pida a TI un relay SMTP o una cuenta con la autenticación básica permitida.

## 5. Cómo probarlo

### 5.1 Prueba directa del SMTP (la más rápida)

El repositorio incluye `deploy/probar-smtp.js`. Usa las mismas variables que el sistema y no muestra contraseñas.

Solo conexión y credenciales:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T server node - < deploy/probar-smtp.js
```

Y además enviar un correo de prueba a una dirección real:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T server node - tu.correo@untrm.edu.pe < deploy/probar-smtp.js
```

Resultado esperado: `OK: el servidor acepta la conexión y las credenciales.` y, si indicó destinatario, `OK: correo entregado al servidor para …`. Revise la bandeja **y la carpeta de correo no deseado**. Si algo falla, el mensaje empieza con `FALLA:` y el código de error (ver sección 6).

### 5.2 Prueba con el sistema

1. En la pantalla de ingreso, **«¿Olvidaste tu contraseña?»** con una cuenta cuyo correo sea real. Debe llegar el enlace (límite: 5 solicitudes cada 15 minutos por dirección IP).
2. Registre una **solicitud de tutoría** (como tutorado, o como tutor a nombre de un tutorado con cuenta vinculada). Debe llegar un aviso al responsable y, a quien la pidió, la constancia.
3. Abra uno de los correos y compruebe: que el remitente es el esperado, que **el botón lleva al dominio real con HTTPS** y que el enlace abre el caso tras iniciar sesión.

### 5.3 Ver el registro del servidor

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs server | grep "No se pudo enviar"
```

Cada envío fallido deja una línea con el motivo; la operación del usuario no se interrumpe.

## 6. Si algo falla

| Síntoma o error | Causa probable | Qué hacer |
|---|---|---|
| El servidor no arranca y menciona `SMTP_HOST` | Falta definir el servidor | Completar `SMTP_HOST` en `.env.production` |
| `ECONNREFUSED`, `ETIMEDOUT` o `ESOCKET` | El puerto está bloqueado o el servidor/puerto es incorrecto | Comprobar host y puerto; pedir a TI abrir el acceso desde la IP del servidor |
| `ENOTFOUND` / `EDNS` | El nombre del servidor no se resuelve | Revisar el nombre; probar desde el servidor con `nslookup <host>` |
| `EAUTH` / `535 Authentication failed` | Usuario o contraseña incorrectos, o la cuenta exige otra forma de autenticación | Revisar credenciales; con Gmail, usar contraseña de aplicación; con Microsoft 365, ver sección 4e |
| `Greeting never received` o se queda esperando | Cifrado equivocado: puerto 465 con `SMTP_SECURE=false`, o puerto 587 con `SMTP_SECURE=true` | 465 → `true`; 587 y 25 → `false` |
| `self signed certificate` / `unable to verify` | El servidor usa un certificado interno | Pedir a TI la entidad certificadora e instalarla en el servidor (`NODE_EXTRA_CA_CERTS`); el sistema no ignora certificados inválidos, a propósito |
| `550`/`553 … sender address rejected` / `Relay access denied` | El remitente (`MAIL_FROM`) no está autorizado o el servidor no acepta retransmitir desde esa IP | Usar un remitente que TI autorice; pedir autorizar la IP del servidor |
| Llega, pero a correo no deseado | Faltan SPF, DKIM o DMARC del dominio remitente | Pedir a TI configurarlos; probar con un remitente del mismo dominio de la cuenta |
| El botón del correo lleva a una dirección equivocada | `DOMAIN` mal definido (o, en desarrollo, `PUBLIC_APP_URL` apunta a `localhost`) | Poner el dominio público real en `DOMAIN` y reaplicar |
| No llegan los avisos pero sí la recuperación de contraseña | `EMAIL_NOTIFICATIONS=false`, o el destinatario no tiene correo real en su cuenta | Revisar la variable y el correo de cada cuenta (*Usuarios y roles*) |
| Llegan a las personas equivocadas | Las cuentas se crearon con correos de ejemplo | Corregir el correo de cada cuenta |

## 7. Seguridad y buenas prácticas

- Use una **cuenta de servicio** exclusiva del sistema, con los permisos mínimos para enviar. No la cuenta personal de una persona.
- La contraseña **solo** en `.env.production` (permisos restringidos en el servidor, fuera del repositorio). Si se filtra o cambia el personal responsable, cámbiela y reaplique (`up -d`).
- Mantenga el correo **sin datos del caso**: el diseño actual solo avisa y enlaza al sistema, donde se exige iniciar sesión (Ley N.° 29733). No cambie esto sin decidirlo con la DBU.
- Use siempre cifrado: el sistema negocia STARTTLS si el servidor lo ofrece, pero **no lo exige**; confirme con TI que el servidor lo requiera.
- Guarde la respuesta de TI (servidor, límites, contacto) junto con la documentación de despliegue.
- Un volumen alto de avisos genera un correo por aviso (sin resumen diario): revise los límites de envío.

## 8. Lista de comprobación

- [ ] TI entregó servidor, puerto, cifrado, cuenta de servicio y remitente (sección 2).
- [ ] El firewall permite al servidor llegar al puerto SMTP.
- [ ] `.env.production` tiene `SMTP_*`, `MAIL_FROM`, `DOMAIN` (el dominio real) y, si se quiere, `EMAIL_NOTIFICATIONS`.
- [ ] `probar-smtp.js` termina con `OK` y el correo de prueba **llegó a la bandeja** (no a spam).
- [ ] La recuperación de contraseña funcionó con una cuenta real.
- [ ] Una solicitud de tutoría generó el aviso y la constancia, y el botón abre el sistema en el dominio real.
- [ ] Las cuentas del piloto tienen su **correo institucional verdadero**.
- [ ] Registrado quién es el contacto de TI y dónde está guardada la contraseña de la cuenta.
