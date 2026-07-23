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

## ✅ Definition of Done — Release (DoD-SIT-001 completo)

> **Todos** los criterios deben estar cumplidos para cada ítem del release.
> Este checklist valida el incremento como potencialmente entregable.

### C-01 · Criterios de Aceptación

- [ ] Todos los ítems del Sprint superan el 100 % de sus Criterios de Aceptación.
- [ ] El Product Owner (asesor) otorgó visto bueno en la Sprint Review.
- [ ] Acta de conformidad firmada o en proceso.

### C-02 · Calidad de Código

- [ ] TypeScript compila sin errores en modo estricto en backend y frontend.
- [ ] Clean Code aplicado: nombres descriptivos, responsabilidad única, sin código muerto.
- [ ] Arquitectura Hexagonal (backend) y estructura por features (frontend) respetadas.

### C-03 · Pruebas

- [ ] Todos los ítems tienen pruebas que validan su comportamiento.
- [ ] Suite completa sin regresiones.
- [ ] Cobertura mínima del 70 % en lógica de negocio.
- [ ] Pruebas de integración ejecutadas contra la base de datos.

### C-04 · Seguridad

- [ ] Auditoría de dependencias sin vulnerabilidades críticas.
- [ ] No existen credenciales, tokens ni secretos en el código.
- [ ] Sin vulnerabilidades OWASP Top 10.
- [ ] Datos del tutorado tratados conforme a la Ley N° 29733.

### C-05 · Revisión (Code Review)

- [ ] Todos los PRs del Sprint pasaron por revisión.
- [ ] Autorevisión documentada del practicante para cada ítem.
- [ ] Validación del asesor (Product Owner) completada.

### C-06 · Documentación Técnica

- [ ] Documentación de API actualizada (endpoints nuevos o modificados).
- [ ] Manual de usuario actualizado si hay cambios en la UX.
- [ ] Variables de entorno nuevas documentadas.
- [ ] Migraciones de base de datos documentadas.

### C-07 · Integración y Despliegue (CI/CD)

- [ ] Pipeline en verde para todos los jobs: lint, build, test, audit.
- [ ] Docker images se construyen correctamente.
- [ ] El release despliega sin romper funcionalidad existente.
- [ ] Migraciones de base de datos probadas en entorno de pruebas.

### C-08 · Interfaz y Experiencia de Usuario

- [ ] Sin regresiones visuales en ningún módulo.
- [ ] Todos los componentes nuevos son responsivos (Mobile First).
- [ ] Identidad visual UNTRM aplicada (colores, tipografía, logos).
- [ ] Compatibilidad verificada: Chrome, Firefox, Edge y Safari.

### C-09 · Git Flow y Gestión del Tablero

- [ ] Todas las ramas siguen la convención de nombres.
- [ ] Todos los commits siguen Conventional Commits.
- [ ] Tarjetas del tablero Scrum movidas a TERMINADO.
- [ ] Rama release creada desde develop y lista para mergear a main.

---

## 🏷️ Versionado

- [ ] Versión actualizada en `backend/package.json` y `frontend/package.json`.
- [ ] Tag `vX.Y.Z` creado tras el merge.
- [ ] Merge de vuelta a `develop` realizado para sincronizar.

## 📊 Métricas del Sprint

| Métrica | Planificado | Real |
|---------|-------------|------|
| Story Points | X | X |
| Horas | X | X |
| Velocidad | X | X |
| Ítems completados | X/X | X/X |

## 📸 Evidencia de funcionamiento

<!-- Capturas o GIFs de las funcionalidades principales del release -->

## 📋 Notas del Release

<!-- Cambios importantes, breaking changes, instrucciones de migración, o decisiones de diseño relevantes -->
