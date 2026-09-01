## 🚨 Hotfix — Corrección Urgente a Producción

> **Rama:** `hotfix/descripcion` → `main`
> Este template es para correcciones críticas que necesitan llegar a producción de forma inmediata.

## 📝 Descripción del problema

[Describe el bug o incidencia crítica que se está corrigiendo]

## 💥 Impacto

- **Severidad:** [ ] Crítico / [ ] Alto
- **Usuarios afectados:** [Todos / Rol específico / Funcionalidad específica]
- **Desde cuándo ocurre:** [Fecha o commit que introdujo el problema]

## 🔧 Solución aplicada

[Explica qué se hizo para resolver el problema y por qué se eligió este enfoque]

## 📖 Ítem relacionado

- [ ] HU-XX / TT-XX / RSK-XX: [Referencia si aplica]

---

## ✅ Definition of Done — Hotfix (DoD-SIT-001 adaptado)

> Marca **todas** las casillas. Un hotfix requiere los mismos estándares de calidad
> con énfasis en no introducir regresiones.

### C-01 · Criterios de Aceptación

- [ ] La corrección resuelve el problema reportado al 100 %.
- [ ] Se verificó que el escenario problemático ya no ocurre.

### C-02 · Calidad de Código

- [ ] TypeScript compila sin errores en modo estricto (`strict: true`).
- [ ] El fix es mínimo y focalizado — sin refactorizaciones oportunistas.

### C-03 · Pruebas

- [ ] Se agregó al menos un test que reproduce el bug corregido.
- [ ] La suite existente no presenta regresiones.
- [ ] Todas las pruebas pasan localmente.

### C-04 · Seguridad

- [ ] No se exponen credenciales, tokens ni secretos.
- [ ] El fix no introduce vulnerabilidades OWASP Top 10.

### C-05 · Revisión (Code Review)

- [ ] Autorevisión completada con foco en efectos colaterales.
- [ ] Validación del Product Owner (asesor) sobre la corrección.

### C-07 · Integración y Despliegue (CI/CD)

- [ ] Pipeline en verde: lint, build, test y auditoría.
- [ ] El hotfix no rompe funcionalidad existente.
- [ ] Variables de entorno o migraciones documentadas si aplica.

---

## 🔄 Plan de Rollback

- [ ] Si el fix falla, se puede revertir con `git revert` sin efectos colaterales.
- [ ] Pasos de rollback documentados: [Describir o indicar "revert directo"]

## 📸 Evidencia

<!-- Capturas del antes y después del fix -->

| Antes (bug) | Después (fix) |
|-------------|---------------|
|             |               |

## ⚠️ Post-merge

- [ ] Merge del hotfix también hacia `develop` para sincronizar.
- [ ] Crear tag de versión patch (`vX.Y.Z`).
- [ ] Notificar al equipo / asesor sobre el fix desplegado.
