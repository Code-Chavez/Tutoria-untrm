# Índice de auditorías, diagramas y evidencias históricas

Publicación documental: 22/10/2026. Trazabilidad: TT-100 (pruebas), TT-101 (seguridad), TT-103 (correcciones) y TT-105 (documentación).

Estos documentos conservan el estado observado en su fecha y en el commit indicado por cada autor. **No describen automáticamente el estado actual ni certifican una versión estable.** Los hallazgos, cifras y recomendaciones deben contrastarse con cambios posteriores. Los PR #164 y #165 ya se integraron en develop; resuelven parte de las observaciones previas sobre ciclos, acceso y navegación.

## Auditorías y preparación

- [Auditoría UI del 08/10](AUDITORIA_UI_2026-10-08.md).
- [Revisión de roles](REVISION_ROLES_RELEASE_2026-10-08.md).
- [Auditoría previa a release](AUDITORIA_PRE_RELEASE_2026-10-12.md).
- [Lista de pendientes y fechas](LISTA_PENDIENTES_FECHAS_2026-10-13.md): planificación referencial, no fechas efectivamente cumplidas.
- [Plan de beta](PLAN_BETA_UNTRM_2026-10-15.md).
- [Verificación de rendimiento](VERIFICACION_RENDIMIENTO_BETA_2026-10-13.md).
- [Prompt de auditoría de calidad y uso](PROMPT_CLAUDE_AUDITORIA_CALIDAD_Y_USABILIDAD.md): material reutilizable, no instrucciones de ejecución automática.

## Uso real, protocolo y decisiones

- [Revisión del 17/10](REVISION_USO_REAL_2026-10-17.md).
- [Reevaluación del 18/10](REEVALUACION_USO_REAL_2026-10-18.md).
- [Protocolo y escenarios reales](EVALUACION_PROTOCOLO_Y_ESCENARIOS_REALES_2026-10-18.md).
- [Decisiones pendientes de DBU](DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md).
- [Estado al 19/10](ESTADO_PENDIENTES_2026-10-19.md).

## Diagramas y pruebas

- [Diagramas de casos de uso](diagramas/casos-de-uso/README.md): fuentes PlantUML y paquete ZIP con PNG/SVG; modelo del 18/10, no certificación de permisos ni de cumplimiento normativo.
- [Resultados de navegadores y estados docentes](RESULTADOS_PRUEBAS_NAVEGADORES_Y_DOCENTE_2026-10-19.md).
- [Salidas históricas de pruebas](resultados-2026-10-19/): se incluyen éxitos, errores y repeticiones. Una corrida fallida no debe presentarse como aprobada. Las cuentas de las pruebas son ficticias; los registros conservan rutas del entorno de desarrollo para reproducibilidad.

## Límites de esta entrega

Solo se versiona documentación. No se modifican endpoints, lógica, dependencias, migraciones ni interfaces. No se incluyen archivos subidos a `server/storage/evidence`, credenciales de servicios, entornos locales ni CSS sin uso. No implica aprobación del Product Owner, ejecución del piloto ni movimiento de tarjetas del tablero.
