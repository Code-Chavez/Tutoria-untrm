## 🚀 Release — Despliegue a Producción

> **Rama:** `release/vX.Y.Z` → `main` (o `develop` → `main`)
> Este template es para releases planificados al final del Sprint.

## 📝 Resumen del Release

- **Versión:** vX.Y.Z
- **Sprint:** X (DD/MM/YYYY – DD/MM/YYYY)
- **Ítems incluidos:** X HU + X TT + X RSK

## 📦 Ítems incluidos en este Release

| Código | Tipo | Título | Estado |
|--------|------|--------|--------|
| HU-XX  | feat | ...    | ✅     |
| TT-XX  | chore| ...    | ✅     |

---

## ✅ DoD técnico — requerido por el gate

> El check `Gate — Main Branch Protection` **solo** valida esta sección: son
> ítems que el CI respalda (compila, tests, auditoría, versión). Deben estar
> **todos marcados** para poder mergear.

<!-- DOD-GATE:START -->

### C-02 · Calidad de Código
- [ ] TypeScript compila sin errores en modo estricto en server y client.
- [ ] Clean Code y arquitectura respetadas (Hexagonal en server, features en client).

### C-03 · Pruebas
- [ ] Todos los ítems tienen pruebas que validan su comportamiento.
- [ ] Suite completa sin regresiones (CI en verde).

### C-04 · Seguridad
- [ ] Auditoría de dependencias sin vulnerabilidades críticas (`pnpm audit --prod`).
- [ ] No existen credenciales, tokens ni secretos en el código.

### C-06 · Documentación Técnica
- [ ] Endpoints y variables de entorno documentados; migraciones versionadas.

### C-07 · Integración y Despliegue (CI/CD)
- [ ] Pipeline en verde: lint, build, test y audit.
- [ ] Imágenes Docker se construyen y las migraciones se aplican en CI.

### C-09 · Git Flow
- [ ] Ramas y commits siguen la convención (Conventional Commits).
- [ ] Rama release creada desde develop.

### 🏷️ Versionado
- [ ] Versión actualizada en `server/package.json` y `client/package.json`.

<!-- DOD-GATE:END -->

---

## 🧑 Sign-off del incremento — lo confirma quien aprueba el PR

> Estos ítems **no** los puede verificar un check automático (dependen de una
> reunión, del PO o de pruebas manuales). No bloquean el gate: los valida el
> revisor al **aprobar** el Pull Request.

- [ ] **C-01** · Todos los ítems superan sus Criterios de Aceptación.
- [ ] **C-01** · El Product Owner (asesor) otorgó su visto bueno en la Sprint Review.
- [ ] **C-01** · Acta de conformidad firmada o en proceso.
- [ ] **C-05** · Validación del asesor (Product Owner) completada.
- [ ] **C-08** · Sin regresiones visuales; responsivo; identidad UNTRM; navegadores objetivo.
- [ ] **C-03** · Cobertura ≥70 % en lógica de negocio (si se midió).
- [ ] **C-09** · Tarjetas del tablero Scrum movidas a TERMINADO.

---

## 🏷️ Post-merge (tras mergear a main)

> Acciones que ocurren **después** del merge; no forman parte del gate.

- Crear el tag `vX.Y.Z`.
- Back-merge `main → develop`.
- Eliminar la rama `release/*`.

## 📊 Métricas del Sprint

| Métrica | Planificado | Real |
|---------|-------------|------|
| Story Points | X | X |
| Ítems completados | X/X | X/X |

## 📋 Notas del Release

<!-- Cambios importantes, HU diferidas, breaking changes o decisiones relevantes -->
