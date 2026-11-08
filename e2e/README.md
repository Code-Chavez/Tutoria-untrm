# Pruebas E2E del SIT (TT-100)

Recorridos de extremo a extremo con [Playwright](https://playwright.dev) sobre la interfaz real. Se definen en
`docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md` (E2E-01 … E2E-09).

| Recorrido | Archivo | Estado |
|---|---|---|
| E2E-01 Acceso, menú y panel por rol | `tests/e2e-01-acceso-y-menu.spec.ts` | en el CI |
| E2E-02 Solicitud de tutoría | `tests/e2e-02-solicitud-de-tutoria.spec.ts` | escrito |
| E2E-03 Sesiones y asistencia | `tests/e2e-03-sesiones-y-asistencia.spec.ts` | escrito |
| E2E-04 Derivación a un servicio | `tests/e2e-04-derivacion-a-servicio.spec.ts` | escrito |
| E2E-05 Informes y exportaciones | `tests/e2e-05-informes-y-exportaciones.spec.ts` | escrito |
| E2E-06 Plan semestral | `tests/e2e-06-plan-semestral.spec.ts` | escrito |
| E2E-07 Evaluación de tutoría | `tests/e2e-07-evaluacion-de-tutoria.spec.ts` | escrito |
| E2E-08 Administración | `tests/e2e-08-administracion.spec.ts` | escrito |
| E2E-09 Carga masiva y asignación | `tests/e2e-09-carga-masiva-y-asignacion.spec.ts` | en el CI |
| E2E-10 Cierre de periodo | `tests/e2e-10-cierre-de-periodo.spec.ts` | escrito |
| E2E-11 Pedido de listas por correo | `tests/e2e-11-pedido-de-listas.spec.ts` | escrito |
| E2E-12 Tutor por ciclo, aceptación del docente y amonestación del Decano | `tests/e2e-12-tutor-por-ciclo-y-decano.spec.ts` | en el CI |
| E2E-21 Roles, permisos y alcance: rol nuevo, alcance de una escuela, permiso retirado en sesión, cambio de rol y cuenta sin autorización | `tests/e2e-21-roles-permisos-alcance.spec.ts` | escrito |
| E2E-22 Estado en la URL y borradores: filtros al recargar/otra pestaña, ventanas con Atrás/Adelante, borrador por formulario, limpieza al guardar o descartar y aislamiento entre cuentas | `tests/e2e-22-url-y-borradores.spec.ts` | escrito |
| E2E-23 Certificación (corte 2): permisos nuevos en la pantalla de roles, consulta por escuela, permiso retirado en sesión y cuenta sin autorización; la pantalla de certificación queda pendiente (corte 5) | `tests/e2e-23-certificados-consulta.spec.ts` | escrito |
| E2E-24 Certificación (corte 3): docente que acepta su designación por el enlace del correo, trámite iniciado, revisado, observado, rechazado, aprobado y anulado, con permisos por acción, alcance por escuela y aprobaciones simultáneas (necesita Mailpit: `E2E_MAILPIT_URL`) | `tests/e2e-24-certificados-tramite.spec.ts` | escrito |
| E2E-25 Certificación (corte 4): resolución de decanato, PDF de demostración con número y huella, descarga con sesión, descarga rechazada por permiso o escuela registrada en la bitácora (necesita Mailpit) | `tests/e2e-25-certificados-pdf.spec.ts` | escrito |
| E2E-26 Certificación (corte 5), la pantalla: pestaña de Periodo académico, filtros y trámite abierto en la URL (recargar, otra pestaña, Atrás/Adelante), iniciar, evidencias con hechos informativos, observar, aprobar, resolución de decanato, generar y descargar el PDF, anular, borradores y permisos (necesita Mailpit) | `tests/e2e-26-certificados-pantalla.spec.ts` | escrito |
| E2E-27 Certificación (corte 6), calidad de la pantalla: axe en la lista, el detalle y cada ventana (administración y solo consulta, escritorio y móvil), sin desplazamiento horizontal en 375 y 320 px, recorrido por teclado (foco dentro del diálogo, Escape cierra el de arriba, el foco vuelve) y selector de la sección en móvil (necesita Mailpit) | `tests/e2e-27-certificados-calidad.spec.ts` | escrito |
| E2E-28 Lista «Docentes tutores» de Periodo académico: designación, ciclos y estado del certificado, sin asignación frente a aceptación pendiente, búsqueda y filtros en la URL, abrir o iniciar el trámite en Certificados, cuenta de solo consulta, cuenta con alcance sobre otra escuela y axe | `tests/e2e-28-docentes-tutores.spec.ts` | en el CI |
| E2E-19 Accesibilidad de las pantallas de gestión (axe) | `tests/e2e-19-accesibilidad-gestion.spec.ts` | en el CI |
| E2E-20 Estados del docente: rechazo, sin respuesta, correo no enviado | `tests/e2e-20-estados-del-docente.spec.ts` | en el CI |

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

**Qué navegadores corren en el pipeline (issue #231, decisión del 2026-11-07).** Chrome en toda PR (`ci.yml`, las 13 suites de `test:ci`). Firefox sobre Linux en toda PR que toque `client/`, `server/`, `e2e/` o el workflow, y cada noche (`e2e-browsers.yml`, E2E-21, 22, 23, 26 y 27, ~4 min). WebKit sobre Linux, solo E2E-27 (PR y noche), porque se cae («Page crashed») al recargar en otros recorridos; el mismo motor en Windows pasa E2E-21 a 23, 26 y 27. Edge es Chromium, el mismo motor que Chrome: se prueba a mano antes de cada release con `E2E_CHANNEL=msedge`. Para correr otras suites en los navegadores del workflow: Actions → «E2E browsers» → Run workflow → campo `specs` (p. ej. `e2e-21 e2e-22 e2e-23`). Safari real no se prueba.
`E2E-19` (accesibilidad con axe de las pantallas de gestión) y `E2E-18` (ingreso, solicitud, sesiones, evaluación y diálogos) usan `@axe-core/playwright`; axe **no sustituye** la prueba con lector de pantalla ni con un teléfono real. `E2E-20` detiene el contenedor `sit-mailpit` un momento para recorrer «correo no enviado» y lo vuelve a iniciar al terminar.
**E2E-20** actúa sobre la pila que prueba (vence un enlace con SQL y detiene su servidor de correo) y para eso necesita `E2E_DATABASE_URL` (la `DATABASE_URL` de esa pila, p. ej. `postgresql://sit_user:sit_pass@localhost:5433/sit_e2e_fresh_test`) y, si el SMTP no está en 1025, `E2E_SMTP_PORT`. Localiza los contenedores por el puerto que publican (`docker ps --filter publish=<puerto>`), no por un nombre fijo, y por eso nunca toca los del compose de desarrollo salvo que sean los de la pila probada; sin `E2E_DATABASE_URL` sus casos se omiten. Variables opcionales: `E2E_BASE_URL` (por defecto `http://localhost:5173`) y `E2E_API_URL` (por defecto `http://localhost:3000/api`).

## En el CI

El job **E2E — Playwright (Chrome)** de `.github/workflows/ci.yml` levanta una base PostgreSQL propia, aplica las migraciones y la seed, arranca el servidor (puerto 3100) y el cliente (5174) y corre `pnpm run test:ci` con Chromium. Solo ejecuta las suites que se mantienen al día (hoy **E2E-01**, **E2E-09**, **E2E-12**, **E2E-19**, **E2E-20** y **E2E-21** a **E2E-27**); la lista está en el script `test:ci` de `package.json`.

Las demás suites no están en el CI: E2E-02 a E2E-08, E2E-10, E2E-11 y E2E-13 a E2E-18 pasan sobre una base nueva (corrida completa del 2026-11-06, issue #230) pero se dejaron fuera para no alargar el job; Para incorporar una: ponerla al día, comprobar que pasa dos veces seguidas sobre una base nueva y agregar su prefijo a `test:ci`. El job también levanta Mailpit como servicio y la aplicación envía a él por SMTP: así un recorrido puede leer el enlace que solo llega por correo (E2E-24 lo usa para la aceptación del docente). **Otros navegadores.** E2E-26 y E2E-27 se ejecutan además en Firefox (Linux) y E2E-27 en WebKit (Linux), con el flujo `.github/workflows/e2e-browsers.yml`, que corre en los PR que tocan la pantalla de certificados o sus pruebas y a mano (`workflow_dispatch`); en local, `E2E_BROWSER=webkit`, `E2E_BROWSER=firefox` o `E2E_CHANNEL=msedge`. En el equipo de desarrollo de Windows Firefox no llegó a arrancar (`spawn UNKNOWN`), por eso se comprueba en Linux. E2E-26 no corre en WebKit de Linux porque ese motor se cae («Page crashed») al recargar o navegar, en casos distintos según la ejecución; en WebKit de Windows pasa completo. Qué navegadores corren en el pipeline para el resto de recorridos se decide en el issue #231.

Límite que conviene conocer: el servidor limita `POST /auth/reset-password` a 10 por IP cada 15 minutos, en memoria. Una corrida completa de `test:ci` usa 11, más de los 10 permitidos (cada cuenta nueva que activa un recorrido); dos corridas seguidas contra el mismo servidor responden 429. En local, arranque el servidor con `RESET_PASSWORD_RATE_LIMIT_MAX=100` (se ignora en producción) o reinícielo entre corridas; el CI arranca el servidor con `RESET_PASSWORD_RATE_LIMIT_MAX=200`. Antes de añadir recorridos que activen más cuentas, revise ese presupuesto. Si el job falla, el informe y las trazas (`e2e/playwright-report`, `e2e/test-results`) quedan como artefacto 14 días. El inicio de sesión (`POST /auth/login`) tiene su propio tope de 100 por IP cada 5 minutos: el CI arranca el servidor con `LOGIN_RATE_LIMIT_MAX=2000` (se ignora en producción); en local con corridas completas y rápidas haga lo mismo.

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
