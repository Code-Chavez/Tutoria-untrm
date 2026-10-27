# Levantamiento de requerimientos — ampliación del SIT UNTRM

**Estado: Fase 1 (inventario y diagnóstico) en borrador para revisión, con avance parcial de la Fase 2. No se implementó nada y nada de lo que sigue es una decisión institucional.** Corte del código: `develop` en `c2e0460` (26/10/2026).

Este levantamiento sirve para decidir, no para convertir cada duda en una funcionalidad. Parte de lo que el sistema **ya hace** y de las decisiones que **ya están pedidas** a la DBU, para no duplicarlas. Terminar el diagnóstico **no** completa el levantamiento: ver los criterios por fase en [04](04_AUTORREVISION_FASE1.md).

## Qué contestar primero

→ **[00 · Decisiones P0 en lenguaje sencillo](00_PREGUNTAS_P0_PARA_RESPONDER.md)**: 10 preguntas agrupadas en 4 bloques, con opciones, recomendación y consecuencias. Las otras 21 preguntas están en [02](02_PREGUNTAS_INSTITUCIONALES.md) y no bloquean.

## Entregables

| N.° | Entregable | Fase | Estado |
|---|---|---|---|
| 00 | [Decisiones P0 para responder](00_PREGUNTAS_P0_PARA_RESPONDER.md) | 1 | Borrador |
| 01 | [Diagnóstico actual](01_DIAGNOSTICO_ACTUAL.md): existente, parcial, faltante y evidencia | 1 | Borrador |
| 02 | [Preguntas y decisiones institucionales](02_PREGUNTAS_INSTITUCIONALES.md) (las 31, con registro de decisiones) | 1 | Borrador |
| 03 | [Contraste con el Protocolo, el backlog y las estimaciones](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md), con discrepancias | 1 | Borrador |
| 04 | [Autorrevisión de la Fase 1](04_AUTORREVISION_FASE1.md): criterios de la fase y del levantamiento completo, evaluados por separado | 1 | Borrador |
| 05 | [Requisitos propuestos que no dependen de las P0](05_REQUISITOS_SIN_DEPENDENCIAS.md) (7) | 2 | Avance parcial |
| 06 | [Matriz de roles, permisos y alcance — sistema actual](06_MATRIZ_ROLES_PERMISOS_ACTUAL.md) | 2 | Borrador (solo lo implementado) |
| 07 | [Matriz de eventos, avisos y correos — sistema actual y huecos](07_MATRIZ_EVENTOS_ACTUAL.md) | 2 | Borrador (implementado + huecos) |
| — | Especificación general de requisitos | 2 | No iniciada |
| — | Proceso de certificación (estados y responsables) | 2 | **Bloqueada** por las P0 de certificación |
| 08 | [Catálogo de plantillas de correo — sistema actual](08_CATALOGO_PLANTILLAS_CORREO_ACTUAL.md) (13 plantillas y 5 hallazgos) | 2 | Borrador (solo lo implementado) |
| 09 | [Estados vigentes de solicitud, derivación y designación](09_ESTADOS_ACTUALES_SOLICITUD_Y_DERIVACION.md) | 2 | Borrador (solo lo implementado) |
| — | Backlog propuesto (HU/TT con dependencias) y plan de pruebas con trazabilidad | 4 | No iniciados |

Las fases 3 (validación con las respuestas) y 4 (plan de implementación) no se inician hasta que existan respuestas a las preguntas que las bloquean; lo que **no** depende de ellas sigue avanzando (05–09).

## Convenciones

| Etiqueta | Significado |
|---|---|
| **IMPLEMENTADO / [EXISTE]** | Funciona hoy y tiene evidencia (código, endpoint o prueba). No implica que esté aprobado institucionalmente. |
| **[PARCIAL]** | Existe una parte; se indica cuál falta. |
| **[FALTA]** | No existe en el código ni en los documentos revisados. |
| **PROPUESTO / [PROPUESTA]** | Idea del equipo; no es exigencia de nadie hasta que se apruebe. |
| **PENDIENTE DE DECISIÓN / [CONFIRMAR]** | Hay una contradicción entre fuentes o depende de una decisión que no consta por escrito. |
| **[PROTOCOLO]** | Lo dice el Protocolo N.° 01-2024-UNTRM/DBU (R.C.U. N.° 283-2024), con artículo. |

En todo documento y figura se separan siempre tres estados: **implementado**, **propuesto** y **pendiente de decisión**.

**Identificadores provisionales.** Los existentes son RF-01…RF-50, HU-01…HU-50 (con numeración desfasada en uno respecto de RF a partir de RF-09/HU-08: la bitácora, RF-08, no tiene historia propia), TT-000, TT-001 y TT-100…TT-105, y RSK-001. Aquí se usan `LEV-D` (diagnóstico), `LEV-Q` (preguntas), `LEV-R` (requisitos propuestos) y `E`/`H` (eventos y huecos): **provisionales; no pertenecen al backlog aprobado.**

## Advertencias de lectura

1. **Las 323 horas-hombre y los 164 Story Points son las estimaciones originales de planificación** (juicio de experto, un solo recurso): no son horas ejecutadas ni el presupuesto de las ampliaciones, que no están estimadas.
2. **La matriz de permisos de [06](06_MATRIZ_ROLES_PERMISOS_ACTUAL.md) describe la configuración inicial del código (la seed)**, no necesariamente los permisos actuales de cada base de datos ni una política institucional aprobada.
3. **Las funciones existentes sin RF/HU/estimación son brechas de trazabilidad** (ver X4 en [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md)): no se les asigna una aprobación retroactiva.
4. **Las recomendaciones de [00](00_PREGUNTAS_P0_PARA_RESPONDER.md) son propuestas** hasta que la persona o instancia indicada las confirme.

## Coordinación con la documentación integral del informe

Otra sesión (Codex) prepara la documentación integral del informe en `docs/informe-practicas/documentacion-integral/` (borrador **sin versionar** al momento de escribir esto; se leyó solo para coordinar y **no se modificó**). Para no crear versiones contradictorias:

1. **Fuente única de requisitos del levantamiento: esta carpeta.** El plan de la documentación integral ya la designa como punto de partida de la «Especificación de requisitos». La documentación integral debe **referenciar** estos archivos y no copiar sus tablas.
2. **No se duplican los RF/HU existentes** (Word, fuera del repositorio). Si un requisito de aquí contradice a uno existente, la contradicción se registra en [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md) y no se corrige en silencio.
3. **Figuras:** los diagramas del informe llevan los identificadores `DOC-Dxx` del plan de documentación integral; los de aquí, en Mermaid, indican a qué `DOC-Dxx` corresponden (06 → D05/D06; 07 → D06/D07) y son su fuente editable. Si el informe produce una versión final, la fuente sigue siendo el bloque Mermaid.
4. **Estados:** cada figura y tabla se marca como actual (implementado), propuesta o pendiente de decisión, igual que el plan de la documentación integral. Los roles configurables y la certificación **no aparecen como implementados** en ningún documento.
5. **Cambios en esta carpeta** se hacen por PR; el informe cita el commit de referencia.

## Fuentes consultadas y sus límites

| Fuente | Qué se hizo | Límite |
|---|---|---|
| Código del repositorio (servidor, cliente) en `c2e0460` | Lectura dirigida de roles, permisos, avisos, correos, pedidos de listas, aceptación del docente, sesiones, informes, firmas | No se leyó cada archivo; las conclusiones citan los archivos revisados. No se ejecutó la aplicación para estas fases |
| `docs/` del repositorio (decisiones DBU, evaluación del protocolo, estado de pendientes, revisión de roles, guía SMTP, cambios TT-103) | Leídos los citados | Son análisis del equipo, no decisiones institucionales |
| RF, RNF, historias de usuario, Sprint Backlog, Product Backlog y estimación (Word, fuera del repositorio) | Texto extraído de los `.docx`; contraste de las partes relacionadas | No se releyeron completos el Sprint Backlog ni el Product Backlog |
| Protocolo N.° 01-2024-UNTRM/DBU (PDF fuera del repositorio) | Leídos completos los artículos 5, 7 a 17 y 19 a 25 (los arts. 1 y 2 solo en parte), más los resúmenes previos de `docs/EVALUACION_PROTOCOLO_…` | Las dos primeras páginas del PDF no tienen texto extraíble; no se leyeron los arts. 3, 4, 6 y 18 ni los anexos; no se afirma haber revisado todas las disposiciones de la UNTRM |
| Certificado de ejemplo del encargo (PDF personal, **no se versiona ni se reproduce**) | (a) Mi inspección técnica: una página horizontal sin texto extraíble, con un campo de firma digital CAdES. (b) **Observación documentada de la referencia, hecha visualmente por Codex y relatada por el usuario:** aparecen director de Escuela, Resolución de Decanato, docente, escuela, facultad, semestre, ciudad, fecha y registro | **Yo no leí el contenido** (no hay herramienta de renderizado instalada) y **la firma no está validada**: no se verificó su autenticidad ni su vigencia |

## Lo que este levantamiento no incluye

No incluye código, migraciones ni cambios de configuración. No incluye el certificado personal, firmas extraídas, imágenes, claves ni datos de personas: todo el modelo posterior se documentará con datos ficticios y referencias. No declara aprobación del Product Owner, cumplimiento normativo, cobertura, compatibilidad de navegadores ni cierre de auditoría.
