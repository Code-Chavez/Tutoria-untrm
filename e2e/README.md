# Pruebas E2E del SIT (TT-100)

Recorridos de extremo a extremo con [Playwright](https://playwright.dev) sobre la interfaz real. Se definen en
`docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md` (E2E-01 … E2E-09).

| Recorrido | Archivo | Estado |
|---|---|---|
| E2E-01 Acceso, menú y panel por rol | `tests/e2e-01-acceso-y-menu.spec.ts` | escrito |
| E2E-02 Solicitud de tutoría | `tests/e2e-02-solicitud-de-tutoria.spec.ts` | escrito |
| E2E-03 Sesiones y asistencia | `tests/e2e-03-sesiones-y-asistencia.spec.ts` | escrito |
| E2E-04 Derivación a un servicio | `tests/e2e-04-derivacion-a-servicio.spec.ts` | escrito |
| E2E-05 Informes y exportaciones | `tests/e2e-05-informes-y-exportaciones.spec.ts` | escrito |
| E2E-06 Plan semestral | `tests/e2e-06-plan-semestral.spec.ts` | escrito |
| E2E-07 Evaluación de tutoría | `tests/e2e-07-evaluacion-de-tutoria.spec.ts` | escrito |
| E2E-08 Administración | `tests/e2e-08-administracion.spec.ts` | escrito |
| E2E-09 Carga masiva y asignación | `tests/e2e-09-carga-masiva-y-asignacion.spec.ts` | escrito |
| E2E-10 Cierre de periodo | `tests/e2e-10-cierre-de-periodo.spec.ts` | escrito |
| E2E-11 Pedido de listas por correo | `tests/e2e-11-pedido-de-listas.spec.ts` | escrito |
| E2E-12 Tutor por ciclo, aceptación del docente y amonestación del Decano | `tests/e2e-12-tutor-por-ciclo-y-decano.spec.ts` | escrito |
| E2E-19 Accesibilidad de las pantallas de gestión (axe) | `tests/e2e-19-accesibilidad-gestion.spec.ts` | escrito |
| E2E-20 Estados del docente: rechazo, sin respuesta, correo no enviado | `tests/e2e-20-estados-del-docente.spec.ts` | escrito |

## Cómo correrlas

Necesitan el stack de desarrollo ya levantado y sembrado (cuentas de `docs/ACEPTACION_RELEASE_v0.4.0.md`, paso 0). El arranque ya no siembra: en un entorno nuevo hay que sembrar una vez.

```bash
docker compose up -d          # desde la raíz del repositorio
docker compose exec server pnpm run seed     # solo la primera vez (base vacía); no modifica lo que ya existe
cd e2e
npx -y pnpm@9.15.9 install
npx playwright install chromium     # una sola vez; o use un navegador ya instalado (abajo)
npx playwright test
```

Con Chrome o Edge ya instalados no hace falta descargar nada: `E2E_CHANNEL=chrome npx playwright test`.
Otros navegadores: `E2E_BROWSER=webkit npx playwright test` (WebKit de Playwright; **no equivale a Safari real**) o `E2E_BROWSER=firefox` (en Windows requiere el runtime de Visual C++ que Firefox necesita; sin él falla al abrir con «la configuración en paralelo no es correcta»). Descarga única: `npx playwright install firefox webkit`.
`E2E-19` (accesibilidad con axe de las pantallas de gestión) y `E2E-18` (ingreso, solicitud, sesiones, evaluación y diálogos) usan `@axe-core/playwright`; axe **no sustituye** la prueba con lector de pantalla ni con un teléfono real. `E2E-20` detiene el contenedor `sit-mailpit` un momento para recorrer «correo no enviado» y lo vuelve a iniciar al terminar.
Variables opcionales: `E2E_BASE_URL` (por defecto `http://localhost:5173`) y `E2E_API_URL` (por defecto `http://localhost:3000/api`).

## Convenciones

- Cada prueba crea sus propios datos con texto único (`unique()`), así que se puede repetir sin reiniciar la base.
- Las pruebas de un mismo recorrido son seriales: comparten el estado que va dejando el flujo.
- Los accesos del menú se abren con `goToMenu()`: el panel de inicio repite algunos accesos como tarjetas.
- La preparación de datos usa la API con la cuenta de administración; el flujo que se verifica va siempre por la pantalla.
- Los tiempos de espera son holgados (45 s por verificación, 150 s por prueba) porque en un equipo cargado el ingreso tarda varios segundos.
- Hay que evitar el rol `menuitem` en los avisos: hoy son botones dentro de un contenedor `menu`.

## Capturas del manual de usuario

`playwright.manual.config.ts` y `manual/capturas.spec.ts` generan las imágenes de `docs/manual/img/` que ilustran `docs/MANUAL_USUARIO.md` (no forman parte de `npx playwright test`).
Úselas sobre un entorno recién sembrado para que solo aparezcan datos de demostración:

```bash
docker compose down -v && docker compose up -d --build && docker compose exec server pnpm run seed
cd e2e && E2E_CHANNEL=chrome npx playwright test -c playwright.manual.config.ts
```
