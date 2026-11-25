# SIT UNTRM — v1.0.0-beta.5 (candidata)

Quinta beta de pruebas controladas en el servidor de la UNTRM, con participantes autorizados y **datos ficticios**. Reúne las correcciones de la auditoría del 17/11, la revisión de seguridad del 19/11, el almacenamiento de archivos en Cloudinary con subida por arrastrar o elegir, y la documentación de las prácticas. Sigue sin ser la estable `v1.0.0` ni autoriza el uso con datos reales.

Base de comparación: `v1.0.0-beta.4` (`main`, 19/11/2026, `21b04d3`). Reúne los PR #331 a #348 de `develop` (102 archivos cambiados).

## Qué incluye respecto a v1.0.0-beta.4

| Tema | Cambio (PR) |
|---|---|
| Archivos en Cloudinary | Los archivos nuevos (evidencias, documentos firmados, resoluciones, logo e imágenes del certificado, foto de perfil) se guardan en Cloudinary en modo privado cuando hay credenciales; solo el servidor los lee y los entrega tras comprobar permisos. Sin credenciales se guarda en disco y los archivos anteriores siguen funcionando (#348, issue #347). |
| Subida de archivos | Un solo control para arrastrar o elegir el archivo en todas las subidas. La foto de perfil se sube (PNG, JPG o WebP, hasta 1 MB) en lugar de pegar un enlace (#348). |
| Pedidos de facultad | Los pedidos de facultad que ve la coordinación ya no muestran identificadores internos (#333). |
| Derivaciones | El detalle conserva el nombre y el código del estudiante tras cambiar el estado (#346, issue #345). |
| Dependencias | `effect` fijado a una versión corregida (GHSA-7589-6fvf-x4pw); la auditoría del servidor vuelve a pasar (#344, issue #343). |
| Documentación | Auditoría del 17/11 con el seguimiento de cada hallazgo (#331); revisión de seguridad TT-101 del 19/11 (#334); fichas de asistencia, metodología, diagramas entidad-relación e informe final de prácticas con anexos y referencias APA 7 (#336, #338, #340, #342). |

## Requisitos de despliegue

- **Una migración nueva:** `20261124090000_profile_photo_storage` (columna `users.photo_storage_key`). Se aplica sola al arrancar el servidor. **Respalde la base antes de actualizar.**
- **Variables de entorno nuevas, opcionales:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Sin las tres, los archivos nuevos se guardan en disco como hasta ahora. En producción se deben fijar en el entorno del servidor, nunca en el repositorio.
- **Dependencia nueva del servidor:** `cloudinary` (se instala al construir la imagen).
- Quien venga de beta.3 o anterior debe aplicar además los requisitos de `docs/RELEASE_v1.0.0-beta.4.md` y `docs/RELEASE_v1.0.0-beta.3.md`.

## Verificación realizada

- Cada PR pasó el CI completo antes de fusionarse en `develop` (lint, compilación, pruebas, auditoría, E2E en Chrome, Firefox y WebKit, y respaldo/restauración).
- Cloudinary probado contra una cuenta real: subida, lectura firmada, borrado, 401 sin firma y foto de perfil de punta a punta por la aplicación (issue #347).
- Recorrido por rol con el navegador sobre el entorno local el 24/11, con la corrección del encabezado de derivaciones (#346) verificada en pantalla.
- El resultado del CI de este PR de release es la verificación de lint, compilación, pruebas y auditoría; consultarlo en el PR.

## Limitaciones conocidas

- Las subidas de evidencia de sesión, documentos firmados, resolución, logo e imágenes del certificado usan el mismo almacenamiento y el mismo control que la foto de perfil, pero solo la foto se probó contra Cloudinary real por la aplicación; las demás tienen pruebas unitarias y de componente.
- Los archivos guardados en Cloudinary no los cubre el respaldo local (`backup`); su respaldo depende de la política de la cuenta de Cloudinary.
- H9 sigue abierto como decisión de producto: un docente tutor atiende un solo ciclo y los demás requieren una excepción.
- El historial por semestre muestra la escuela y el tutor **actuales**; guardarlos por periodo queda para después del piloto.
- Siguen pendientes con la DBU y TI: entorno institucional (HTTPS, SMTP, respaldo externo, monitoreo), participantes y fechas del piloto, ciudad de Utcubamba, logos originales del certificado, anonimato de la evaluación (A06) y los formatos de los anexos.
- Los certificados son solo de demostración hasta que la DBU entregue la plantilla oficial.
- Solo Chrome verificado en el ensayo con participantes; Edge, Safari y móvil sin verificar.
- El informe de prácticas falta que lo revise el asesor y se ajuste al formato de la escuela.
- Aprobación del Product Owner pendiente.
