# Solicitud al área de TI — instalación del SIT para el piloto

**Sistema:** Sistema Integral de Tutoría (SIT) · Dirección de Bienestar Universitario · UNTRM
**Fecha de la solicitud:** 17/10/2026 · **Piloto previsto:** 13/11/2026
**Para qué:** instalar el sistema en un servidor de la universidad y dejar listos el correo, el HTTPS y las copias de respaldo antes del piloto con datos reales.

> Cómo usar este documento: la sección 1 es el mensaje que se puede enviar tal cual a TI. Las secciones 2 a 6 detallan cada pedido para que TI sepa exactamente qué entregar. La sección 7 son las fechas propuestas y la 8, la lista para dar la instalación por buena. Las tablas con «Respuesta de TI» se completan con lo que TI entregue (**las contraseñas no se escriben aquí**).

## 1. Mensaje para TI (resumen)

> **Asunto:** Servidor, dominio, correo y respaldos para el Sistema Integral de Tutoría (piloto 13/11)
>
> Necesitamos instalar el Sistema Integral de Tutoría (SIT) para un piloto con estudiantes y docentes reales el **13/11/2026**. El sistema ya está terminado y probado; para instalarlo necesitamos de TI:
>
> 1. **Un servidor** aislado con Docker (detalle en la sección 2) y acceso SSH para quien lo instale.
> 2. **Un nombre de dominio** (por ejemplo `sit.untrm.edu.pe`) apuntando a ese servidor, con los puertos 80 y 443 abiertos, y certificado HTTPS (el sistema lo obtiene solo; si prefieren terminarlo en su proxy, también se puede).
> 3. **Una cuenta de correo de servicio (SMTP)** para que el sistema envíe correos automáticos a las direcciones institucionales (sección 4).
> 4. **Un destino de copias de respaldo fuera del servidor** y una persona responsable de restaurarlas (sección 5).
> 5. Los **permisos de red** y la **política de actualizaciones y monitoreo** de la sección 6.
>
> Les pedimos una respuesta con fecha tentativa a más tardar el **23/10/2026**, porque necesitamos ese tiempo para instalar, probar el correo y ensayar la restauración antes del piloto. Quedo atento a coordinar una reunión corta si es más fácil.

## 2. Servidor

| Pedido | Detalle | Respuesta de TI |
|---|---|---|
| Servidor | Un equipo (virtual o físico) **dedicado** o aislado de otros sistemas, con **Docker y Docker Compose** | |
| Sistema operativo | Linux (cualquier distribución con Docker) | |
| Recursos mínimos sugeridos | **4 vCPU, 8 GB de RAM, 100 GB de disco** (SSD). *Es una estimación del equipo de desarrollo*: el sistema consume sobre todo CPU; la meta del proyecto es 100 usuarios simultáneos. TI puede ajustarla con su experiencia | |
| Acceso | SSH con llave para quien instale y actualice (usuario con permiso para Docker) | |
| IP del servidor | Necesaria para las reglas de firewall y para el correo | |
| Reloj | Sincronizado por NTP (los enlaces de un solo uso y los registros de auditoría dependen de la hora) | |
| Actualizaciones del sistema operativo | Quién y cuándo las aplica; ventana de mantenimiento acordada | |

El sistema corre en cuatro contenedores (web con HTTPS, API, base de datos PostgreSQL y respaldo diario). **La base de datos no se publica fuera del servidor.**

## 3. Dominio y HTTPS

| Pedido | Detalle | Respuesta de TI |
|---|---|---|
| Nombre de dominio | Por ejemplo `sit.untrm.edu.pe`, con DNS apuntando a la IP del servidor | |
| Puertos | **80 y 443** abiertos hacia el servidor (el 80 solo para obtener/renovar el certificado) | |
| Certificado | Opción A: el sistema lo obtiene solo (Let's Encrypt; requiere que el servidor sea alcanzable desde internet en el 80/443). Opción B: TI entrega un certificado institucional o termina el HTTPS en su balanceador/proxy | |
| Si hay proxy o balanceador delante | Indicar cuántos saltos hay (el sistema debe leer la IP real de cada persona para el límite de intentos y la bitácora) | |
| Acceso | Confirmar si el piloto se usa solo dentro de la red de la universidad o también desde internet (estudiantes desde casa) | |

El sistema **solo arranca en producción con HTTPS** en su dirección pública.

## 4. Correo (SMTP)

El sistema envía correos automáticos formales, siempre desde el mismo remitente. Sin SMTP el servidor de producción **no arranca**.

**Correos que envía** (volumen esperado en el piloto: decenas al día, con picos de unos cientos el día de la carga inicial de cuentas):

| Correo | A quién | Observación |
|---|---|---|
| **Invitación para activar la cuenta** | A cada persona nueva (estudiantes, docentes, coordinación…) | Enlace de un solo uso, vence en 72 horas. **Nadie recibe contraseñas por correo** |
| Recuperación de contraseña | A quien la solicita | Enlace de un solo uso, vence en 60 minutos |
| **Confirmación como docente tutor** | Al docente al que se asigna un ciclo | Enlace de un solo uso para aceptar o rechazar |
| Aviso de rechazo del ciclo | A la coordinación de la escuela | |
| **Pedido de lista de estudiantes** | Al correo que configure cada escuela (puede ser un buzón compartido) | **Lleva adjunto un Excel**, con copia y *Reply-To* a quien lo pide |
| Avisos de la campana | Al correo institucional de la persona avisada | Solicitudes, derivaciones, cambios de estado. No llevan datos del caso ni el nombre del estudiante |

**Qué necesitamos de TI** (complete la tabla):

| Dato | Respuesta de TI |
|---|---|
| Servidor SMTP (`SMTP_HOST`) | |
| Puerto (`SMTP_PORT`) | |
| Cifrado: STARTTLS (puerto 587) o TLS implícito (465) | |
| Cuenta de servicio (no personal): usuario (`SMTP_USER`) | |
| Contraseña (`SMTP_PASS`) — se entrega por un canal seguro, no por este documento | |
| Remitente autorizado (`MAIL_FROM`), p. ej. `SIT UNTRM <sit-noreply@untrm.edu.pe>` | |
| Límite de envío por hora / por día | |
| ¿Se permiten **adjuntos** de 20–50 KB (Excel) y los campos *CC* y *Reply-To*? | |
| Reglas de firewall: el servidor (IP: ______) puede conectarse al puerto SMTP | |
| **SPF, DKIM y DMARC** del dominio del remitente alineados, para que no caigan en correo no deseado | |
| Si el servidor SMTP usa un certificado interno: la entidad certificadora para instalarla | |
| Contacto de TI para incidencias de entrega | |

La guía de configuración y la comprobación con `deploy/probar-smtp.js` están en `docs/GUIA_SMTP.md`.

## 5. Copias de respaldo

El sistema hace un respaldo diario (2:00 a. m.) de la base de datos y de los documentos adjuntos (constancias, evidencias), conserva los últimos 14 y verifica cada copia. **Eso no basta**: si el servidor se pierde, las copias locales se pierden con él.

| Pedido | Detalle | Respuesta de TI |
|---|---|---|
| Destino **fuera del servidor** | Una carpeta montada en otro equipo (NFS/SMB), almacenamiento de la universidad o un comando de subida (`scp`, `rclone`…). Capacidad estimada: unos pocos GB por mes para el piloto | |
| Responsable | Persona de TI que vigila que las copias lleguen y que **sabe restaurarlas** | |
| Retención | Cuánto tiempo guardar las copias externas (sugerencia: 90 días) | |
| **Ensayo de restauración** | Restaurar una copia completa en otro equipo **antes del piloto** y dejar constancia (el procedimiento está en `backup/README.md`) | |
| Alerta | Aviso por correo si una copia falla o no llega al destino externo | |

## 6. Seguridad, red y operación

| Tema | Pedido | Respuesta de TI |
|---|---|---|
| Firewall | Entrada solo 80/443 (y SSH restringido por IP); la base de datos no se expone | |
| Secretos | Quién guarda `JWT_SECRET`, la contraseña de la base y la del SMTP (propuesta: gestor de secretos de la universidad o archivo con permisos restringidos, fuera del repositorio) | |
| Primer administrador | La Dirección de Bienestar define quién; la contraseña inicial se cambia en el primer ingreso y se retira del archivo de entorno | |
| Monitoreo | Que el servidor y el sitio estén en el monitoreo de TI, con aviso si cae (el sistema expone `/api/health`) | |
| Registros (logs) | Dónde se guardan y por cuánto tiempo; el sistema no escribe contraseñas ni enlaces en ellos | |
| Actualizaciones del sistema | Quién ejecuta una actualización (`git pull` + `docker compose up -d --build`, con respaldo previo) y cómo se coordina; la reversión está ensayada (`deploy/README.md`) | |
| Datos personales | Confirmar que el servidor y el destino de respaldos cumplen la Ley N.° 29733 y las políticas de la universidad para datos de estudiantes | |
| Compatibilidad de navegadores | Confirmar con qué navegadores y versiones trabajan los usuarios del piloto (Chrome, Edge, Firefox, Safari, móvil) | |

## 7. Fechas propuestas (de la Dirección de Bienestar; TI puede proponer otras)

| Fecha | Hito | Responsable |
|---|---|---|
| **23/10** | TI responde la solicitud con fechas | TI |
| **27/10** | Servidor, dominio con HTTPS y cuenta SMTP entregados | TI |
| **28/10** | Instalación del sistema, comprobación del correo real (llegada a bandeja y no a correo no deseado) y de los permisos | Desarrollo + TI |
| **30/10** | Copia de respaldo externa funcionando | TI |
| **03/11** | **Ensayo de restauración** en otro equipo, con constancia | TI + Desarrollo |
| **06/11** | Ensayo general con cuentas de prueba: invitación, aceptación del docente, carga de listas, respaldo | Desarrollo + Bienestar |
| **09/11** | Congelamiento: sin cambios salvo urgencias; listas de piloto cargadas | Todos |
| **13/11** | Inicio del piloto | Bienestar |

Si TI no puede cumplir estas fechas, avisar **cuanto antes** cuál es la más cercana posible: el riesgo principal del piloto es llegar a la fecha sin correo real ni respaldo externo.

## 8. Lista para dar la instalación por buena

- [ ] Se abre el sitio con `https://` y candado válido, desde dentro y (si aplica) desde fuera de la red.
- [ ] El primer administrador entra y cambia su contraseña.
- [ ] Se crea una cuenta de prueba: **la invitación llega a la bandeja** (no a correo no deseado) y el enlace sirve una sola vez.
- [ ] La recuperación de contraseña llega y funciona.
- [ ] Un pedido de lista de estudiantes llega con el Excel adjunto, con copia y *Reply-To* correctos.
- [ ] La confirmación del docente llega, su enlace funciona sin iniciar sesión, y la coordinación ve la respuesta.
- [ ] `/api/health` responde y el monitoreo de TI avisa si se detiene el servicio.
- [ ] El respaldo diario se genera, **llega al destino externo** y se ensayó su restauración en otro equipo.
- [ ] La base de datos no es alcanzable desde fuera del servidor.
- [ ] Hay una persona de TI nombrada para incidencias durante el piloto, con su teléfono.

## 9. Datos de contacto

| | Nombre | Correo | Teléfono |
|---|---|---|---|
| Dirección de Bienestar Universitario (responsable) | | | |
| Desarrollo del SIT | | | |
| TI (contacto principal) | | | |
| TI (reemplazo) | | | |
