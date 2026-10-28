# Verificación acotada de C-5 (PR #191): proceso de fondo real, recuperación tras reinicio y pantalla *Pendientes*

**Qué es y qué no es.** Registro de una verificación manual con datos ficticios del aviso del rechazo de un docente (LEV-R05). **No** cierra ninguna auditoría ni sustituye a la CI: la CI verde indica que el pipeline pasa, no que no haya regresiones ni que lo verificado aquí sea suficiente.

## Entorno

| Elemento | Valor |
|---|---|
| Commit verificado | `deb0fb14c2ca15a086e8d988a68055658c524a79` (cabeza del PR #191). **Una corrección posterior** surgida de esta verificación (hallazgo F3) está en el commit que añade este archivo |
| Fecha | 27/10/2026 (reloj de la máquina, UTC 23:09–23:35) |
| Sistema | Windows 11, Node v22.19.0, Docker |
| Servidor | El servidor real (`ts-node src/index.ts`) en el puerto 3998, **contra la base exclusiva de pruebas** `sit_db_test` (contenedor `sit-postgres-test`, puerto 5433). **No** se tocó la base ni los contenedores de desarrollo (`sit-postgres`, `sit-server`, `sit-client`, `sit-mailpit`) |
| Correo | Un contenedor **Mailpit v1.21.8 desechable** (`sit-mailpit-verif`, SMTP 11025, interfaz 18025) creado para esto y borrado al terminar. Sin SMTP institucional. Un «servidor SMTP colgado» (un socket que acepta la conexión y nunca responde, puerto 12025) para dejar un envío en curso |
| Cliente | Vite en el puerto 5175 apuntando al servidor 3998; navegador integrado (panel: 1024×768 px CSS, capturas reducidas a 800×600) y emulación móvil 375×812 |
| Datos | Una escuela, una coordinación y un docente **ficticios** (`*-verif-c5@untrm.edu.pe`), designaciones en ciclos 1, 2, 3, 5, 6, 7 y 8, con motivos «(ficticio)». Se borraron al terminar (comprobado por consulta: 0 filas) |
| No se subió | Correos personales, tokens, PDF ni capturas. Los tokens de aceptación eran ficticios y de la base de pruebas |

## 1. El proceso de fondo real recoge lo EN_COLA y la recuperación tras reiniciar

Cada fila indica qué se hizo y qué se observó (consultas a la base y a la API de Mailpit).

| Paso | Observado |
|---|---|
| Servidor A **sin SMTP** (envío deshabilitado, ni intento inmediato ni proceso de fondo). Dos rechazos (ciclos 1 y 6) por `POST /api/tutor-acceptance/:token` | Respuesta `200 {"accepted":false}`. Base: rechazo `RECHAZADA` y aviso `EN_COLA`, sin `started_at`. **Mailpit: 0 correos** |
| *Pendientes* con A | El ítem muestra «no se envió porque el envío de correos no está configurado… Queda en espera… pida a la administración que lo configure», sin botón de reenviar |
| Se detiene A y se **reinicia** como servidor B con SMTP → Mailpit | El proceso de fondo real (primera revisión al arrancar) tomó los dos avisos **sin intento inmediato**: ambos `ENVIADO` unos 11 s después de lanzar el servidor (incluye el arranque). Mailpit: **2 correos**, a la coordinación ficticia, con el motivo y **sin tokens** |
| Esperar 70 s más (dos revisiones) | Siguen **2 correos** y **una** entrada de bitácora de resultado por designación: no se repite |
| Servidor C con el SMTP colgado. Rechazo del ciclo 7; en cuanto el intento pasa a `ENVIANDO` se **mata el proceso** | Intento `ENVIANDO`, con destinatario anotado y sin resultado |
| Se reinicia como servidor D (Mailpit) y se esperan 70 s (el intento no ha superado 5 min) | Sigue `ENVIANDO`; **ningún correo nuevo**: el intento iniciado **no se repite solo** |
| Se **retrocede `started_at` 6 min** con SQL (simula el margen vencido) y se espera una revisión | `INCIERTO` (código `SIN_RESULTADO`), **una** entrada de bitácora, y siguen **2** correos en Mailpit |

*Observación no planeada:* un primer intento de matar el servidor llegó tarde (más de 10 s) y el SMTP colgado ya había vencido su tiempo de saludo: el aviso del ciclo 2 quedó `FALLIDO` (fallo demostrado: no pasó de la conexión). Se aprovechó como caso `FALLIDO` natural y se repitió la prueba del reinicio con el ciclo 7.

## 2. *Pendientes* en escritorio y móvil

Servidor D (Mailpit). Estados vistos: `SIN_REGISTRO` (rechazo anterior a la función), `ENVIADO`, `FALLIDO`, `INCIERTO` (y `EN_COLA` sin SMTP, en el paso anterior).

| Comprobación | Resultado |
|---|---|
| Un ítem por rechazo (sin duplicar) | **Sí**: 5 ítems para 5 ciclos, 1 por ciclo (y 5 en móvil). No aparece una segunda fila del aviso |
| Datos técnicos visibles | **Ninguno**: búsqueda en el texto de la página de `ECONN`, `ESOCKET`, `SendTimeout`, `MailSendError`, `@untrm`, `errorCode`, `SIN_RESULTADO`, `token`: sin coincidencias (escritorio y móvil) |
| Mensajes | Los de cada estado se ven como se redactaron («El servidor de correo aceptó el aviso… no garantiza…», «no aceptó el aviso… Puede reenviarlo», «No se puede saber si el aviso… salió…», «anterior al registro de avisos…»). Nunca «se avisó» ni «nadie recibió» |
| Reenviar un `FALLIDO` (clic) | Sin confirmación; intento nuevo `REENVIO` con motivo `REINTENTO_TRAS_FALLO`; Mailpit +1 correo; mensaje «El servidor de correo aceptó el aviso…» |
| Confirmar un `INCIERTO` (teclado) | El diálogo muestra la fecha del intento anterior y la advertencia de posible duplicado; se confirmó con Intro; intento `REENVIO` con motivo `CONFIRMADO_TRAS_INCIERTO` y `ENVIADO`; Mailpit +1. El envío tardó unos 15 s en el primer uso (ver F4) |
| Rechazo sin registro previo (clic) | El diálogo pide confirmar; intento `REENVIO` con motivo `SIN_REGISTRO_PREVIO` y el **rechazo intacto** (estado, motivo y fecha sin cambios) |
| Móvil 375×812 | Sin desplazamiento horizontal (`scrollWidth` 375), 0 elementos fuera del ancho; el diálogo cabe en la pantalla (19–356 de 375 px de ancho) |
| Teclado (Tab) | Orden lógico: búsqueda → escuela → región de resultados → en cada ítem *Reenviar aviso* (si existe) y luego su enlace → vuelve a «Saltar al contenido». Intro abre el diálogo; **Escape lo cierra** |

Total final en Mailpit: **6 correos** (2 originales automáticos por el proceso de fondo, 4 reenvíos manuales); ninguno duplicado por el sistema.

## 3. Hallazgos

| N.° | Hallazgo | Estado |
|---|---|---|
| F1 | **El diálogo de confirmación compartido (`ConfirmDialog`) no mueve el foco al abrirse, no lo atrapa y no lo devuelve al cerrar.** Con el diálogo abierto el foco sigue en el botón de abajo, y Tab recorre la página que queda detrás (`aria-modal="true"` pero sin gestión de foco). Escape sí cierra. Se midió con `document.activeElement`. Afecta a todos los usos del componente (también C-3 y C-4), no solo a C-5 | **Pendiente separado**, no corregido aquí (cambia un componente compartido) |
| F2 | A ~800 px de ancho el título «Pendientes» se parte («Pend / ientes») porque el filtro de tipo comparte la cabecera. Es anterior a C-5 | **Pendiente separado**, no corregido |
| F3 | **El mensaje de resultado de un reenvío se dibujaba debajo de la lista, fuera de la vista** (posición 780 px con una ventana de 768): quien reenvía no veía la confirmación ni el error. Defecto de C-5 | **Corregido**: el mensaje va ahora sobre la lista (posición 469 px, visible sin desplazar). Comprobado de nuevo en el navegador |
| F4 | El primer envío SMTP del servidor de desarrollo (`ts-node`) tardó unos 15 s; el diálogo de reenvío espera con el botón en carga todo ese tiempo (el servidor espera como máximo 60 s). No se midió en producción | Observación |
| F5 | En el diálogo del rechazo «sin registro» no aparece fecha (no hay intento anterior); la fila ya dice «anterior al registro de avisos» | Observación |

## 4. Límites (lo que NO se verificó)

- Se retrocedió `started_at` por SQL para simular el vencimiento del margen de 5 min; **no se esperaron 5 min reales**. El «reinicio» tras `ENVIANDO` se simuló matando el proceso en pleno envío con un SMTP colgado, no con una caída real del sistema operativo.
- Mailpit acepta mensajes pero **no es entrega real a una bandeja**; no se probó un SMTP institucional ni un proveedor real.
- Los estados `SIN_DESTINATARIO`, `DATOS_INCOMPLETOS`, `OBSOLETO` y `EN_COLA` **con** SMTP configurado no se revisaron visualmente (están cubiertos por pruebas automáticas). El móvil se probó con la emulación del panel, sin un dispositivo real.
- Teclado: se usó Tab real y, para llegar al botón de confirmar del diálogo, se enfocó **por programa** (consecuencia de F1). **No** se probó con lector de pantalla, ni en otros navegadores, ni zoom ni contraste.
- «Escritorio» es el ancho del panel (1024 px CSS), no un monitor grande. No se comparó con capturas de la versión anterior; no se versionaron capturas.
- Una sola ejecución de cada escenario: no es una medida de frecuencia ni de rendimiento.
- Nada de esto corresponde a la aprobación de la institución sobre el **motivo íntegro del docente en el correo**, los **destinatarios** ni **avisos adicionales**: siguen pendientes (Q07).
