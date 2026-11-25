# SIT UNTRM — v1.0.0 (candidata a versión estable)

Primera versión estable del Sistema Integral de Tutoría de la UNTRM. Reúne todo lo de las betas `v1.0.0-beta.1` a `beta.5` más las correcciones posteriores a `v1.0.0-beta.5`. **Es una candidata: el merge a `main` y el tag los decide el Product Owner** una vez cumplidas las condiciones de la sección siguiente.

Base de comparación: `v1.0.0-beta.5` (`main`, 25/11/2026, `e1af9cd`). Esta candidata añade los PR #354, #358, #359 y #360 de `develop`.

## Qué cambia respecto a v1.0.0-beta.5

| Tema | Cambio (PR) |
|---|---|
| Foto de perfil | La subida enviaba el archivo como JSON y el servidor respondía «Adjunte la foto.»; ahora se envía como formulario con archivo (#354, issue #353). |
| Roles | Todos los roles se editan desde «Roles» salvo el del Administrador; ningún rol base se desactiva ni recibe `admin:system`. El arranque ya no devuelve a un rol base los permisos que se le quitaron (#358, issue #355). |
| Icono de la pestaña | La aplicación tiene favicon con el logotipo de la UNTRM; si se configura otro logotipo institucional, la pestaña lo usa (#359, issue #356). |
| Aceptación de tutoría | Si un horario queda de menos de una sesión (45 minutos), la hora final pasa sola a inicio + 45 minutos y se avisa; el servidor sigue validando (#360, issue #357). |

## Condiciones para publicarla como estable (a cargo del PO, la DBU y TI)

Ninguna de estas condiciones se puede cumplir desde el código. Mientras estén abiertas, esta candidata no autoriza el uso con datos reales:

1. **Visto bueno del Product Owner** sobre esta versión y acta de conformidad (hoy pendiente también para beta.3, beta.4 y beta.5).
2. **Entorno institucional (TI):** HTTPS, SMTP institucional, respaldo externo y monitoreo (`docs/SOLICITUD_A_TI_PILOTO_2026-10-17.md`).
3. **Piloto con usuarios reales:** participantes y fechas con la DBU; los hallazgos críticos y altos se corrigen antes de publicar (`docs/GUIA_PILOTO.md`).
4. **Decisiones de producto abiertas:** H9 (un docente tutor atiende un solo ciclo; los demás requieren una excepción), anonimato de la evaluación (A06) y los formatos de los anexos.
5. **Certificados:** siguen siendo de demostración hasta que la DBU entregue la plantilla oficial y los logotipos originales. Con `CERTIFICATE_DEMO_MODE` apagado (valor por defecto en producción) no se emiten certificados.

## Requisitos de despliegue

- **Sin migraciones nuevas ni variables nuevas** respecto a `v1.0.0-beta.5`. Respalde la base antes de actualizar, como siempre.
- Quien venga de una versión anterior a beta.5 debe aplicar además sus requisitos (`docs/RELEASE_v1.0.0-beta.5.md`: migración `20261124090000_profile_photo_storage` y las variables opcionales `CLOUDINARY_*`).
- Producción: definir `JWT_SECRET`, SMTP, dominios de correo permitidos y, si se usa, las tres variables de Cloudinary en el entorno del servidor; el API secret de Cloudinary usado en pruebas debe regenerarse.

## Verificación realizada

- Cada PR pasó el CI completo antes de fusionarse en `develop` (lint, compilación, pruebas, auditoría, E2E en Chrome, Firefox y WebKit, y respaldo/restauración).
- Cloudinary probado contra una cuenta real (issue #347); roles, favicon y horarios comprobados por pruebas y en el entorno local.
- El resultado del CI de este PR de release es la verificación de lint, compilación, pruebas y auditoría; consultarlo en el PR.

## Limitaciones conocidas

- Los archivos guardados en Cloudinary no los cubre el respaldo local; su respaldo depende de la cuenta de Cloudinary.
- Los permisos que se agreguen al catálogo en el futuro no llegan solos a los roles base existentes: requieren una migración o asignarlos a mano.
- El historial por semestre muestra la escuela y el tutor **actuales**; guardarlos por periodo queda para después del piloto.
- Solo Chrome verificado con participantes; Edge, Safari y móvil sin verificar.
- El informe de prácticas falta que lo revise el asesor y se ajuste al formato de la escuela.
