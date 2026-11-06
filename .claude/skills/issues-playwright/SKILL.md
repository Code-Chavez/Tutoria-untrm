---
name: issues-playwright
description: Flujo de trabajo del proyecto SIT-UNTRM con GitHub Issues y Playwright. Úsala antes de modificar código de una tarea del proyecto (buscar o crear el issue y leer sus criterios), al abrir o validar un PR, y cuando un cambio afecta recorridos de usuario (probar con Playwright en un entorno aislado y dejar la evidencia en el issue).
argument-hint: "[#N del issue | descripción de la tarea]"
---

# Issues y Playwright en Tutoria-untrm

Repositorio: `Code-Chavez/Tutoria-untrm`. Los issues y los PR se escriben en **inglés**. Cada tarea del proyecto tiene un issue con criterios verificables; el PR lo vincula y la evidencia queda en el issue.

## 1. Antes de tocar código: tomar el issue

1. Busca el issue de la tarea, abiertos **y cerrados**, con varias palabras clave:
   ```bash
   gh issue list --state all --search "<palabras clave>" --json number,title,state
   gh issue view <N>
   ```
   Si `$ARGUMENTS` trae un número, empieza por `gh issue view`.
2. **Lee los criterios de aceptación** del issue y los comentarios. Si el issue es el padre de una funcionalidad dividida en cortes, trabaja el issue del corte; si el corte no tiene issue, créalo.
3. Si **no existe** y el trabajo es una tarea del proyecto (funcionalidad, defecto, prueba, CI, documentación), crea uno **solo después de comprobar que no hay duplicado** (busca por al menos dos términos, también entre cerrados). No crees issues para consultas, exploración ni ajustes triviales sin alcance.
   ```bash
   gh issue create --title "<verbo + qué, claro y corto>" --label enhancement|bug|documentation --body-file <archivo>
   ```
   Cuerpo: `## Objective` (qué y por qué, una o dos frases) y `## Acceptance criteria` con casillas `- [ ]` **verificables** (comando, resultado esperado, qué se observa). Indica el alcance que queda fuera.
4. Dile a la persona qué issue vas a usar (enlace) antes de empezar.

## 2. Comprobar los criterios

Para cada criterio piensa qué evidencia lo demuestra (prueba, comando, resultado) y verifícalo. Marca una casilla solo cuando la evidencia exista. Lo que no se pueda cumplir o quede fuera, no se marca: se explica y va a otro issue.

## 3. Playwright en cambios que afectan recorridos de usuario

Reutiliza la configuración de `e2e/` (`playwright.config.ts`, `support/`, specs `tests/e2e-NN-*.spec.ts`; lista del CI en el script `test:ci` de `e2e/package.json`). Empieza por los recorridos afectados, luego `test:ci`.

**Entorno aislado y datos ficticios.** Nunca contra la base de desarrollo ni con datos reales. Usa la base exclusiva de pruebas y un servidor propio:

```bash
docker start sit-postgres-test                                  # base sit_db_test en el puerto 5433
cd server && TEST_DATABASE_URL=postgresql://sit_user:sit_pass@localhost:5433/sit_db_test node scripts/prepare-test-db.js
# Bandeja de correo de pruebas (solo si el recorrido necesita un enlace que llega por correo):
docker run -d --name sit-mailpit-e2e -p 1025:1025 -p 8025:8025 axllent/mailpit:v1.21
cd server && PORT=3100 DATABASE_URL=<la URL de arriba> JWT_SECRET=e2e-isolated-secret CORS_ORIGIN=http://localhost:5174 \
  PUBLIC_APP_URL=http://localhost:5174 SMTP_HOST=localhost SMTP_PORT=1025 npx ts-node -r tsconfig-paths/register --transpile-only src/index.ts
cd client && VITE_PROXY_TARGET=http://localhost:3100 npx vite --port 5174 --strictPort
cd e2e && E2E_BASE_URL=http://localhost:5174 E2E_API_URL=http://localhost:3100/api E2E_CHANNEL=chrome \
  npx playwright test e2e-21 e2e-22 --trace on --output=<carpeta local fuera del repositorio> --reporter=list
```

Reglas:
- Antes de levantar la pila comprueba que **no haya un servidor viejo** en 3100 o 5174 (`netstat -ano | grep -E ":(3100|5174) "`).
- `POST /auth/reset-password` admite 10 por IP cada 15 minutos (en memoria): una corrida de `test:ci` usa 6; reinicia el servidor entre corridas locales.
- Al terminar, **detén** servidor, cliente, Mailpit y la base de pruebas.
- Las trazas (`--trace on`) y capturas quedan **solo en local**: no se suben al repositorio ni al issue. La evidencia que compartas (comandos, cifras, nombres de casos) no lleva datos personales; los datos de prueba son ficticios.
- Un fallo se **reproduce, se corrige en una rama** y se vuelve a correr el caso y los relacionados. Una prueba que falla por estar desactualizada se distingue de un defecto del producto (si es lo segundo, issue propio).
- Si la prueba **no pudo ejecutarse** (sin Docker, sin navegador, puerto ocupado…), dilo con el motivo concreto en el issue y en el PR; no la des por pasada.

Si el cambio no toca ningún recorrido de usuario (documentación, CI sin comportamiento, refactor interno cubierto por pruebas unitarias), no hace falta Playwright: indica por qué.

## 4. Pull request

- Rama desde `develop`, PR **hacia `develop`**, título en estilo Conventional Commits, cuerpo con la plantilla completa `.github/pull_request_template.md`.
- En la descripción escribe **`Relacionado con #N`** (no `Closes`: el cierre es manual, ver abajo).
- Marca solo las casillas verificadas. «Pipeline en verde» solo después de ver el CI terminado (cuenta y reporta p. ej. «13 aprobadas y 2 omitidas»). No inventes aprobación del PO, cobertura ni compatibilidad con navegadores que no se probaron.
- No fusiones: la integración la decide la persona responsable.

## 5. Registrar la evidencia en el issue

Comenta en el issue (`gh issue comment <N> --body-file <archivo>`):

```
## Status: <implemented, waiting for integration | integrated>
**Pull request:** #<PR> — CI: <resultado>
**Commit tested:** <git rev-parse HEAD>   **Browser:** <Chrome/Chromium + versión>
**Commands:** <comandos ejecutados>
**Results:** <casos pasados / fallados / pendientes, por suite>
**Criteria:** <cuáles se cumplen y con qué evidencia>
**Pending:** <qué falta y dónde se sigue (issue)>
```

Marca en el cuerpo del issue las casillas de los criterios cumplidos.

## 6. Cerrar el issue

GitHub no cierra solo los issues cuando el PR va a `develop`. Cierra **manualmente** (`gh issue close <N> --reason completed`) solo cuando:
1. el cambio está **integrado** (PR fusionado) y se validó, y
2. **todos** los criterios están cumplidos.

Si queda algo pendiente, **déjalo abierto** y explica en un comentario qué falta; lo que quede fuera del alcance va a un issue nuevo, enlazado. Al cerrar, comenta el resultado final y los PR que lo integraron.
