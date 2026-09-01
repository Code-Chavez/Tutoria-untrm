## 🚨 Hotfix — Corrección Urgente a Producción

> **Rama:** `hotfix/descripcion` → `main`
> Este template es para correcciones críticas que necesitan llegar a producción de forma inmediata.

## 📝 Descripción del problema

[Describe el bug o incidencia crítica que se está corrigiendo]

## 💥 Impacto

- **Severidad:** Crítico / Alto
- **Usuarios afectados:** [Todos / Rol específico / Funcionalidad específica]
- **Desde cuándo ocurre:** [Fecha o commit que introdujo el problema]

## 🔧 Solución aplicada

[Explica qué se hizo para resolver el problema y por qué se eligió este enfoque]

## 📖 Ítem relacionado

HU-XX / TT-XX / RSK-XX: [Referencia si aplica]

---

## ✅ DoD técnico — requerido por el gate

> El check `Gate — Main Branch Protection` **solo** valida esta sección: ítems
> verificables (compila, tests, auditoría). Deben estar **todos marcados**.

<!-- DOD-GATE:START -->

### C-01 · Criterios de Aceptación
- [ ] La corrección resuelve el problema reportado y el escenario ya no ocurre.

### C-02 · Calidad de Código
- [ ] TypeScript compila sin errores en modo estricto.
- [ ] El fix es mínimo y focalizado — sin refactorizaciones oportunistas.

### C-03 · Pruebas
- [ ] Se agregó al menos un test que reproduce el bug corregido.
- [ ] La suite existente pasa sin regresiones.

### C-04 · Seguridad
- [ ] No se exponen credenciales, tokens ni secretos.
- [ ] El fix no introduce vulnerabilidades OWASP Top 10.

### C-05 · Autorevisión
- [ ] Autorevisión completada con foco en efectos colaterales.

### C-07 · Integración y Despliegue (CI/CD)
- [ ] Pipeline en verde: lint, build, test y auditoría.
- [ ] Variables de entorno o migraciones documentadas si aplica.

### 🔄 Rollback
- [ ] El fix se puede revertir con `git revert` sin efectos colaterales.

<!-- DOD-GATE:END -->

---

## 🧑 Sign-off — lo confirma quien aprueba el PR

> No lo verifica un check automático; lo valida el revisor al aprobar el PR.

- [ ] Validación del Product Owner (asesor) sobre la corrección.

## 📸 Evidencia

<!-- Capturas del antes y después del fix -->

| Antes (bug) | Después (fix) |
|-------------|---------------|
|             |               |

## ⚠️ Post-merge (tras mergear a main)

> Acciones posteriores al merge; no forman parte del gate.

- Merge del hotfix también hacia `develop` para sincronizar.
- Crear tag de versión patch (`vX.Y.Z`).
- Notificar al equipo / asesor sobre el fix desplegado.
