# Datos de demostración y guion de presentación (issue #265)

Todo lo que crea este script es **ficticio** y se genera por la API pública, con las mismas reglas que usa la aplicación. Sirve para presentar el sistema con un conjunto de datos limpio y coherente que recorre todos los estados del certificado del docente tutor.

## Cómo cargarlos

Necesita la API en marcha, la bandeja de correo de pruebas (Mailpit) y la cuenta del Administrador DBU sembrada (sus datos están en `docs/ACEPTACION_RELEASE_v0.4.0.md`, paso 0).

```bash
cd server
DEMO_ADMIN_EMAIL=<correo del Administrador DBU> DEMO_ADMIN_PASSWORD=<su contraseña> \
API_URL=http://localhost:3000/api MAILPIT_URL=http://localhost:8025 \
npm run seed:demo
```

- Se puede ejecutar varias veces: lo que ya existe no se duplica.
- `DEMO_REFRESH_IMAGES=1` vuelve a subir las imágenes del certificado (no cambia los PDF ya generados).
- El correo de aceptación del docente llega a Mailpit y de ahí el script toma el enlace de un solo uso, igual que lo haría el docente.
- Úselo sobre una base limpia (sembrada con `prisma/seed.ts`). En una base con residuos de pruebas, esos usuarios se mezclan en las listas.

## Qué crea

| Escuela | Docentes | Estados que muestra |
|---|---|---|
| Ingeniería de Sistemas | 9 | Aceptada con PDF generado, aprobado, en revisión, observado y sin trámite (puede iniciar); pendiente de aceptar (2); rechazada (1, con motivo); sin asignación (1) |
| Ingeniería Mecánica Eléctrica | 5 | Aceptada con trámite rechazado; aceptada sin trámite; pendiente de aceptar (2); sin asignación (1) |
| Administración de Empresas | 5 | Aceptada con PDF generado; aceptada con trámite iniciado; pendiente de aceptar (2); sin asignación (1) |
| Ingeniería Mecatrónica (Sede Bagua) | 5 | Aceptada con PDF generado; aceptada con trámite en revisión; aceptada sin trámite; pendiente de aceptar (1); sin asignación (1) |
| Ingeniería en Ciberseguridad (Sede Bagua) | 4 | Aceptada con trámite aprobado; aceptada con PDF generado; pendiente de aceptar (1); sin asignación (1) |

- Las dos escuelas de Bagua se crean aparte en la base (no hay API para crear escuelas) y se asignan a Sede Bagua; el script solo las llena. Su certificado imprime la ciudad de esa sede.
- Una resolución de decanato por escuela, y las imágenes del certificado: logo de la universidad, logo y marca de agua por facultad (FISME y FCEA) y la firma visual del Administrador DBU.
- «Pendiente de aceptar» incluye a los docentes recién designados: designar ya envía la solicitud de aceptación, por eso no hay un estado «sin solicitar» que se pueda crear.
- Los logotipos son dibujos ficticios, no los institucionales. Se reemplazan desde *Certificados → Diseño del certificado* cuando se entregue el diseño original.

## Guion sugerido (10 minutos)

Abrir con el Administrador DBU. **Presentar a 1920 × 1080**; en una pantalla de 1366 px, bajar el zoom del navegador al 80 % para ver la columna de acciones sin desplazar la tabla.

1. **Gestión → Periodo académico → Docentes tutores.** La lista de todos los docentes del periodo 2026-II con su designación y el estado de su certificado.
2. Filtrar por **Designación**: Rechazada (1), Pendiente de aceptar (6), Sin asignación, Aceptada (9).
3. Filtrar por **Trámite de certificado → PDF generado, sin firma** y pulsar **Ver trámite**: el detalle con evidencias, historial y la acción **Descargar PDF**. Abrir el PDF: lleva logos, marca de agua gráfica y la firma, con la marca «DEMOSTRACIÓN — SIN VALOR».
4. Volver y filtrar **Aprobado**: ese trámite está listo para generar su certificado (acción **Generar PDF de demostración**).
5. Con **Aceptada** y **Sin trámite**, pulsar **Iniciar trámite** en un docente: abre el trámite en *Certificados* con las evidencias por revisar.
6. En **Certificados**, mostrar el trámite *Observado* (con su nota) y el *Rechazado* (con su motivo), y la sección **Diseño del certificado** para subir o cambiar logos, marca de agua y firma.
7. En **Cierre de periodo**, mostrar el cuadro de confirmación, que ahora dice `Nombre del periodo "2026-II"`. No cerrar el periodo si se va a seguir presentando.

## Lo que se dice claro en la presentación

- Es un certificado **de demostración**: sin valor, sin firma digital. La plantilla y el formato oficiales dependen de decisiones institucionales pendientes (Q20–Q22, Q24 y Q25 del levantamiento).
- La ciudad de la fecha es la de la sede de la escuela (Configuración → Sedes → «Ciudad de la sede»); si la sede no tiene ciudad se imprime Chachapoyas.
- La aceptación de la demostración por el Product Owner sigue pendiente (issue #232).
