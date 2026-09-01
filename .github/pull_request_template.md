## 📝 Descripción

[Explica brevemente qué se implementó o corrigió en este Pull Request]

## 📖 Ítem relacionado

- [ ] HU-XX: [Nombre de la Historia de Usuario]
- [ ] TT-XX: [Nombre de la Tarea Técnica]
- [ ] RSK-XX: [Nombre del Riesgo]

## 🔗 Evidencia relacionada

> Sprint: X · Puntos: X · Horas estimadas: X

---

## ✅ Definition of Done — DoD-SIT-001

> Marca **todas** las casillas antes de solicitar la revisión.
> Este checklist es obligatorio para toda HU, TT y RSK sin excepción.

### C-01 · Criterios de Aceptación

- [ ] El ítem supera el 100 % de sus Criterios de Aceptación y Casos Límite definidos.
- [ ] El Product Owner otorgó su visto bueno sobre el entregable.

### C-02 · Calidad de Código

- [ ] TypeScript compila sin errores en modo estricto (`strict: true`).
- [ ] Aplica Clean Code: nombres descriptivos, responsabilidad única, sin código muerto.
- [ ] Respeta la Arquitectura Hexagonal (server) y la estructura por features (client).

### C-03 · Pruebas

- [ ] El código nuevo cuenta con pruebas que validan su comportamiento.
- [ ] La suite existente no presenta regresiones.
- [ ] Cobertura mínima del 70 % en la lógica de negocio del módulo.
- [ ] Todas las pruebas pasan localmente antes de abrir el PR.

### C-04 · Seguridad

- [ ] No existen credenciales, tokens ni secretos en texto plano.
- [ ] El código no introduce vulnerabilidades OWASP Top 10 (SQL injection, XSS, CSRF).
- [ ] Los datos sensibles del tutorado se tratan conforme a la Ley N° 29733.

### C-05 · Revisión (Code Review)

- [ ] Autorevisión documentada del practicante completada.
- [ ] Pull Request creado con descripción clara del cambio.

### C-06 · Documentación Técnica

- [ ] Código comentado donde es necesario (solo el "por qué", no el "qué").
- [ ] Si crea/modifica endpoints → documentación de API actualizada.
- [ ] Si impacta la UX → borrador del manual de usuario actualizado.

### C-07 · Integración y Despliegue (CI/CD)

- [ ] Pipeline en verde: lint, build, test y auditoría de dependencias.
- [ ] El ítem no rompe la funcionalidad existente.
- [ ] Nuevas dependencias, variables de entorno o migraciones documentadas en este PR.

### C-08 · Interfaz y Experiencia de Usuario

- [ ] Sin regresiones visuales respecto al estado anterior.
- [ ] Componentes responsivos (Mobile First).
- [ ] Aplica la identidad visual UNTRM (colores, tipografía).
- [ ] Compatible con Chrome, Firefox, Edge y Safari.

### C-09 · Git Flow y Gestión del Tablero

- [ ] Rama proviene de `develop` con la convención de nombres (`feature/HU-XX-descripcion`).
- [ ] Commits siguen Conventional Commits (`feat:`, `fix:`, etc.).
- [ ] Tarjeta del tablero Scrum movida a TERMINADO.

---

## 📸 Capturas / Evidencia

<!-- Adjuntar capturas de pantalla o GIFs que demuestren el cambio -->

## 📋 Notas adicionales

<!-- Cualquier contexto adicional, decisiones de diseño o impactos conocidos -->
