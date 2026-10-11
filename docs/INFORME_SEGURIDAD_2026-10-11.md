# Informe de seguridad — TT-101 (OWASP Top 10 y confidencialidad por rol)

**Fecha:** 11/10/2026 · **Código:** `develop` en `536f8a2` más la rama `security/owasp-hardening` · **Entorno:** stack de desarrollo (docker compose)
con la base sembrada y las cuentas de prueba. **Alcance:** API del servidor y cliente web. **No** incluye infraestructura (servidor, TLS,
cortafuegos, copias de respaldo fuera del equipo): eso se revisa en el despliegue.

**Método:** revisión del código contra las categorías del OWASP Top 10 (2021), más sondeo dinámico de la API en ejecución con las cuentas de cada rol.
No se usó un escáner automático externo (ZAP, Burp): este informe lo complementa, no lo sustituye. Los guiones de sondeo se ejecutaron contra la base
de desarrollo y están descritos abajo.

## Resumen

| Severidad | Hallazgos | Estado |
|---|---|---|
| Alta | 0 | — |
| Media | 1 | Corregido en esta rama |
| Baja | 6 | Corregidos en esta rama (5) y documentado (1) |
| Informativa | 3 | Sin acción |

No se encontró forma de leer datos de otra persona, saltarse el control de roles ni inyectar código. Los hallazgos son de endurecimiento.

## Hallazgos

| # | Sev. | Categoría | Hallazgo | Estado |
|---|---|---|---|---|
| F1 | Media | A04 Diseño inseguro / A08 Integridad | **Los archivos subidos solo se validaban por el tipo MIME que declara el cliente.** Un HTML con `<script>` declarado como `application/pdf` se guardó como «constancia firmada» (201) y se sirvió de vuelta con ese contenido. Mitigado en parte porque se descarga como adjunto y con `nosniff`, pero se aceptaba y almacenaba cualquier contenido. | **Corregido:** `requireFileSignature` comprueba los primeros bytes (PDF, PNG, JPEG, WEBP, XLSX) en documentos firmados, evidencias, resoluciones del plan, logotipo y carga masiva. Pruebas unitarias y de integración. |
| F2 | Baja | A07 Fallas de identificación | **El tiempo de respuesta del inicio de sesión delata qué correos existen:** 14 ms para un correo inexistente frente a 1,5 s para uno registrado (con el mismo mensaje de error). | **Corregido:** se compara contra un hash falso del mismo costo cuando el correo no existe. |
| F3 | Baja | A07 | **El estado «cuenta desactivada» se revelaba solo con el correo**, antes de comprobar la contraseña. | **Corregido:** se revela solo si la contraseña es correcta. |
| F4 | Baja | A05 Configuración | **JSON mal formado respondía 500** (mensaje genérico, sin pila) en vez de 400; un cuerpo demasiado grande, igual. | **Corregido** en el manejador de errores (400 y 413). |
| F5 | Baja | A07 | **Sin tope por IP en el inicio de sesión.** Solo existía el bloqueo por cuenta (5 fallos, 15 min), que permite bloquear cuentas ajenas a propósito. | **Corregido:** tope de 100 intentos por IP cada 5 min (holgado para una oficina tras un mismo NAT). Es un contador en memoria de una sola instancia; si se escala a varias, debe pasar a un almacén compartido. |
| F6 | Baja | A06 Componentes vulnerables | `@playwright/test` 1.49.1 (solo desarrollo) tenía un aviso alto: descarga navegadores sin verificar el certificado. No afecta a producción. | **Corregido:** actualizado a 1.56.1; `pnpm audit` limpio. |
| F7 | Baja | A06 | El servidor mantiene **una advertencia moderada ignorada** (`GHSA-w5hq-g745-h8pq`) en su configuración de auditoría. | **Documentado:** revisar si sigue vigente antes de la v1.0.0. |
| I1 | Info | A02 Fallas criptográficas | En desarrollo, el secreto JWT por defecto firma tokens válidos (un token forjado con ese secreto se acepta como autenticado). La autorización lee el rol de la base de datos, no del token, así que no concede privilegios. La validación de producción **rechaza** los secretos de ejemplo (aceptación 7.6). | Sin acción. |
| I2 | Info | A01 | Un tutorado no puede abrir su propio expediente (`/students/:id/record` responde 403): es por diseño, solo ve sus sesiones y solicitudes. | Sin acción. |
| I3 | Info | A05 | `Strict-Transport-Security` y la política de contenido (CSP) están presentes. HSTS solo tiene efecto sobre HTTPS: depende del dominio y del servidor aún por decidir. | Sin acción. |

## Qué se comprobó y salió bien

| Categoría | Prueba | Resultado |
|---|---|---|
| A01 Control de acceso | Un tutorado lee el expediente (JSON y PDF) y la hoja de asistencia de otro tutorado | 403 |
| A01 | Un tutor lee el expediente de un tutorado de otro tutor; el coordinador de otra escuela, igual | 404 |
| A01 | Marcar como leído el aviso de otra persona; atender la solicitud de otro tutor | 404 |
| A01 | Descargar un documento firmado siendo el tutorado u otro tutor | 404 |
| A01 | Asignación de campos no previstos en el perfil (`roleId`, `isActive`, `passwordHash`) | Ignorados |
| A02/A07 Tokens | Token `alg: none`; firma ajena con rol alterado; cabecera vacía, `Bearer` sin token, `Basic` | 401 |
| A02 | Autorización por el rol de la base de datos, no por el rol del token | Confirmado (403 aun con el rol «Administrador» en el token) |
| A03 Inyección | Sondas SQL, XSS, nulos y `../` en filtros (`search`, `action`) de estudiantes, usuarios y bitácora | Sin errores 5xx; el acceso a datos va por Prisma (la única consulta cruda es `SELECT 1` del estado de salud) |
| A03 | `eval`, `new Function`, `innerHTML`, `dangerouslySetInnerHTML` en servidor y cliente | No existen |
| A05 Configuración | `helmet` activo, sin `X-Powered-By`, `nosniff`, `X-Frame-Options`, CSP | Presentes |
| A05 CORS | Origen ajeno en petición simple y en preflight | No se refleja; solo el origen configurado |
| A07 | Recuperación de contraseña: misma respuesta exista o no el correo; enlace de un solo uso; límite por IP | Confirmado (aceptación 4.7, pruebas unitarias) |
| A08 Integridad | Rutas con identificadores inválidos o con `..%2F` en descargas | 404, sin salir del directorio de almacenamiento (`path.basename`) |
| A09 Registro | Bitácora de auditoría con inicio de sesión, cambios de estado y adjuntos (`SIGNED_DOCUMENT_ATTACHED`) | Confirmado (aceptación 3.9) |
| A10 SSRF | El servidor no hace peticiones a direcciones indicadas por el usuario | No aplica |

## Datos sensibles por rol (Ley N.° 29733)

La matriz de acceso está cubierta por `server/tests/integration/accessMatrix.test.ts` y `server/tests/http/routeProtection.test.ts` (base real). Se
confirmó además, por la interfaz y la API, que: las notas internas de una derivación no las ve el tutor que la emitió; un servicio no ve los casos de
otro; la coordinación no accede a *Casos derivados* (la API responde 403 con la razón); los resultados de la evaluación son agregados y anónimos.

## Pendiente y recomendaciones

1. **Escáner dinámico externo** (OWASP ZAP) contra un entorno de pruebas ya desplegado con HTTPS: complementa este barrido y revisa lo que depende del servidor.
2. **Tope de intentos en memoria** (F5): si se despliega más de una instancia del servidor, usar un almacén compartido.
3. **Sesión en `localStorage`** (cliente): los tokens viven en el almacenamiento del navegador; con el CSP actual y sin `innerHTML` el riesgo es bajo, pero
   un XSS futuro los expondría. Evaluar cookies `HttpOnly` si la DBU lo exige.
4. **Revisar `GHSA-w5hq-g745-h8pq`** (F7) y mantener `pnpm audit --prod` en el CI (ya existe).
5. **Cabeceras en el proxy de producción** (`client/Caddyfile`): confirmar CSP, HSTS y `Referrer-Policy` en el dominio definitivo.
6. **Ensayo de recuperación y reversión** (aceptación 7.1–7.7): ya ejecutado en local; repetir en el servidor real.

Este informe no certifica ausencia total de defectos ni cumplimiento normativo integral.
