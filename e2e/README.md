# Pruebas E2E del SIT (TT-100)

Recorridos de extremo a extremo con [Playwright](https://playwright.dev) sobre la interfaz real. Se definen en
`docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md` (E2E-01 … E2E-08).

| Recorrido | Archivo | Estado |
|---|---|---|
| E2E-01 Acceso, menú y panel por rol | `tests/e2e-01-acceso-y-menu.spec.ts` | escrito |
| E2E-02 Solicitud de tutoría | `tests/e2e-02-solicitud-de-tutoria.spec.ts` | escrito |
| E2E-03 Sesiones y asistencia | `tests/e2e-03-sesiones-y-asistencia.spec.ts` | escrito |
| E2E-04 Derivación a un servicio | `tests/e2e-04-derivacion-a-servicio.spec.ts` | escrito |
| E2E-05 Informes y exportaciones | `tests/e2e-05-informes-y-exportaciones.spec.ts` | escrito |
| E2E-06 Plan semestral | `tests/e2e-06-plan-semestral.spec.ts` | escrito |
| E2E-07 Evaluación de tutoría | `tests/e2e-07-evaluacion-de-tutoria.spec.ts` | escrito |
| E2E-08 Administración | `tests/e2e-08-administracion.spec.ts` | escrito (la prueba de identidad visual requiere el arreglo de #100) |

## Cómo correrlas

Necesitan el stack de desarrollo ya levantado y sembrado (cuentas de `docs/ACEPTACION_RELEASE_v0.4.0.md`, paso 0):

```bash
docker compose up -d          # desde la raíz del repositorio
cd e2e
npx -y pnpm@9.15.9 install
npx playwright install chromium     # una sola vez; o use un navegador ya instalado (abajo)
npx playwright test
```

Con Chrome o Edge ya instalados no hace falta descargar nada: `E2E_CHANNEL=chrome npx playwright test`.
Variables opcionales: `E2E_BASE_URL` (por defecto `http://localhost:5173`) y `E2E_API_URL` (por defecto `http://localhost:3000/api`).

## Convenciones

- Cada prueba crea sus propios datos con texto único (`unique()`), así que se puede repetir sin reiniciar la base.
- Las pruebas de un mismo recorrido son seriales: comparten el estado que va dejando el flujo.
- Los accesos del menú se abren con `goToMenu()`: el panel de inicio repite algunos accesos como tarjetas.
- La preparación de datos usa la API con la cuenta de administración; el flujo que se verifica va siempre por la pantalla.
- Los tiempos de espera son holgados (45 s por verificación, 150 s por prueba) porque en un equipo cargado el ingreso tarda varios segundos.
- Hay que evitar el rol `menuitem` en los avisos: hoy son botones dentro de un contenedor `menu`.
