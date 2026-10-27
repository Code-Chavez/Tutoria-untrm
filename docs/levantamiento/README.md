# Levantamiento de requerimientos — ampliación del SIT UNTRM

**Estado: Fase 1 (inventario y diagnóstico) entregada como borrador para revisión. No se implementó nada y nada de lo que sigue es una decisión institucional.** Corte del código: `develop` en `c2e0460` (26/10/2026).

Este levantamiento sirve para decidir, no para convertir cada duda en una funcionalidad. Parte de lo que el sistema **ya hace** y de las decisiones que **ya están pedidas** a la DBU, para no duplicarlas.

## Entregables

| N.° | Entregable | Fase | Estado |
|---|---|---|---|
| 1 | [Diagnóstico actual](01_DIAGNOSTICO_ACTUAL.md): existente, parcial, faltante y evidencia | 1 | **Entregado (borrador)** |
| — | [Preguntas y decisiones institucionales pendientes](02_PREGUNTAS_INSTITUCIONALES.md), priorizadas por impacto | 1 | **Entregado (borrador)** |
| 2 | Especificación de requisitos | 2 | No iniciado |
| 3 | Matriz de roles, permisos y alcance | 2 | No iniciado |
| 4 | Matriz de eventos, notificaciones y correos | 2 | No iniciado |
| 5 | Proceso de certificación (estados y responsables) | 2 | No iniciado |
| 6 | Catálogo de plantillas de correo y campos variables | 2 | No iniciado |
| 7 | Preguntas pendientes (versión final con las respuestas) | 3 | La versión inicial está en el entregable «Preguntas…» |
| 8 | Backlog propuesto (HU/TT con dependencias) | 4 | No iniciado |
| 9 | Plan de pruebas y trazabilidad | 4 | No iniciado |

Las fases 2 a 4 no se inician hasta que las preguntas marcadas **P0** tengan respuesta o se acuerde trabajar con una suposición declarada.

## Convenciones

| Etiqueta | Significado |
|---|---|
| **[EXISTE]** | Funciona hoy y tiene evidencia (código, endpoint o prueba). No implica que esté aprobado institucionalmente. |
| **[PARCIAL]** | Existe una parte; se indica cuál falta. |
| **[FALTA]** | No existe en el código ni en los documentos revisados. |
| **[CONFIRMAR]** | Hay una contradicción entre fuentes, o depende de una decisión que no consta por escrito. |
| **[PROTOCOLO]** | Lo dice el Protocolo N.° 01-2024-UNTRM/DBU (R.C.U. N.° 283-2024), con artículo. |
| **[PROPUESTA]** | Idea del equipo; no es exigencia de nadie hasta que se apruebe. |

**Identificadores provisionales.** Los identificadores existentes son RF-01…RF-50, HU-01…HU-50 (con numeración desfasada en uno respecto de RF a partir de RF-09/HU-08: la bitácora, RF-08, no tiene historia propia), TT-000, TT-001 y TT-100…TT-105, y RSK-001. Aquí se usan `LEV-D` (filas del diagnóstico) y `LEV-Q` (preguntas): **provisionales; no pertenecen al backlog aprobado** y no deben usarse como HU/TT/RSK.

## Fuentes consultadas y sus límites

| Fuente | Qué se hizo | Límite |
|---|---|---|
| Código del repositorio (servidor, cliente) en `c2e0460` | Lectura dirigida de roles, permisos, avisos, correos, pedidos de listas, aceptación del docente, sesiones, informes, firmas | No se leyó cada archivo; las conclusiones citan los archivos revisados. No se ejecutó la aplicación para esta fase |
| `docs/` del repositorio (decisiones DBU, evaluación del protocolo, estado de pendientes, revisión de roles, guía SMTP, cambios TT-103) | Leídos los citados | Son análisis del equipo, no decisiones institucionales |
| Requerimientos funcionales y no funcionales, historias de usuario (documentos de Word fuera del repositorio) | Texto extraído de los `.docx` (RF-01…RF-50, 16 RNF, HU-01…HU-50) | El Sprint Backlog y la estimación no se releyeron completos en esta fase |
| Protocolo N.° 01-2024-UNTRM/DBU (PDF fuera del repositorio) | Leídos los artículos 5, 17 y 23 a 25 para esta fase (y los resúmenes previos de `docs/EVALUACION_PROTOCOLO_…`) | Las dos primeras páginas del PDF no tienen texto extraíble; no se afirma haber revisado todas las disposiciones de la UNTRM |
| Certificado de ejemplo del encargo (PDF personal, **no se versiona ni se reproduce**) | Solo su estructura técnica (ver diagnóstico, sección F) | **No se pudo leer su contenido**: la página es una imagen sin texto extraíble y no hay herramienta de renderizado instalada. La lista de campos del certificado proviene de la descripción del encargo, no de mi lectura |

## Lo que este levantamiento no incluye

No incluye código, migraciones ni cambios de configuración. No incluye el certificado personal, firmas extraídas, imágenes, claves ni datos de personas: todo el modelo posterior se documentará con datos ficticios y referencias. No declara aprobación del Product Owner, cumplimiento normativo, cobertura, compatibilidad de navegadores ni cierre de auditoría.
