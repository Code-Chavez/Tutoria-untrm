# Diseño: certificación del docente tutor en modo demostración

**Estado: PROPUESTO. Solo diseño; no hay código, migración ni pantalla.** Concreta, para una primera entrega, lo que [14](14_ESPECIFICACION_CERTIFICACION.md) deja como esqueleto. Parte de la decisión de trabajo Q24 (plantilla de demostración con datos ficticios) y de Q23 = A (el sistema genera sin firma; la firma es externa). **Nada de lo que produzca esta entrega tiene valor como certificado**: lleva la marca «DEMOSTRACIÓN — SIN VALOR» y una numeración propia. Identificadores `LEV-C…` y nombres de estado: provisionales.

## 1. Qué se sabe del formato

El responsable del proyecto compartió, el 05/11/2026, un ejemplo emitido en 2025 por una escuela. Lo observé directamente (imagen de una página, A4 horizontal, 840 × 594 pt, sin texto seleccionable). El documento **no se guarda en el repositorio** porque contiene datos de una persona real; aquí solo se describe su estructura.

| Zona | Contenido observado | Variable |
|---|---|---|
| Cabecera | Franja decorativa; logotipo y nombre de la universidad (izquierda); logotipo de la facultad (derecha) | Logotipos por institución y por facultad |
| Título | «CERTIFICADO» | Texto configurable (el cuerpo dice «constancia»; ver §9) |
| Introducción | «El Director de la Escuela Profesional de {escuela} de la Facultad de {facultad}, de la {universidad}. Extiende la presente constancia a:» | escuela, facultad |
| Nombre | Grado y nombre completo del docente, subrayado | grado académico, nombres, apellidos |
| Cuerpo | «Docente adscrito al Departamento Académico de {departamento} de la {facultad}, como miembro de la **Comisión de Tutoría de Estudiantes** de la Escuela Profesional de {escuela}, aprobado con Resolución de Decanato N.° {número}, a la fecha desempeñando su labor conforme a las actividades planificadas durante el semestre académico {periodo}.» | departamento, resolución, periodo |
| Lugar y fecha | «{ciudad}, {día} {mes} de {año}.» alineado a la derecha | ciudad, fecha de emisión |
| Firma | Línea, nombre y grado del Director, cargo, facultad y universidad. **El ejemplo no muestra firma visible** | firmante y cargo |
| Pie | «N.° REG. 001-2025/UNTRM/FISME-EPIS» abajo a la izquierda; marca de agua con el escudo de la universidad; franja inferior | número de registro |

**Lo que esto responde de [14](14_ESPECIFICACION_CERTIFICACION.md):** en esta escuela quien emite y firma es el **Director de Escuela** (Q20, para este caso) y el número tiene la forma `NNN-AAAA/UNTRM/{siglas facultad}-{siglas escuela}` (insumo de Q25, a confirmar). **No responde** Q21 (qué acredita y con qué criterios) ni Q22 (quién revisa las evidencias): la frase «desempeñando su labor conforme a las actividades planificadas» es una **afirmación de cumplimiento**, y el sistema no la escribe por haber actividad registrada.

## 2. Alcance de la primera entrega (demostración)

Incluye: trámite con estados, evidencias que el sistema muestra al revisor, generación del PDF sin firma con este diseño y con marca de agua, numeración `DEMO-`, descarga con sesión, bitácora, permisos y alcance por escuela. **No incluye:** formato oficial de número, logotipos oficiales, incorporación del PDF firmado ni entrega al docente (esos pasos quedan **deshabilitados** en demostración, §7), correo, certificación por lote, consulta pública de autenticidad ni validación criptográfica de la firma (Q25 a Q29).

## 3. Historia de usuario (borrador para el Product Owner)

> **HU-C01 (provisional) — Certificación del docente tutor.** Como Director de Escuela, quiero preparar, revisar y emitir el certificado de cada docente que integra la comisión de tutoría de mi escuela en un periodo, para que quede constancia de su labor sin armar el documento a mano.

Criterios de aceptación propuestos:
1. Solo se inicia el trámite para un docente con **aceptación vigente** (`ACEPTADA`) en una asignación del periodo, activo y dentro del alcance de quien lo inicia.
2. El revisor ve las **evidencias que el sistema conoce** (aceptación, sesiones realizadas, informe semestral) **solo como información**; aprobar exige marcar cada evidencia como «conforme» y deja su nombre y fecha. El sistema nunca aprueba solo.
3. El PDF se genera **sin firma**, con número asignado de forma transaccional y huella `sha256`, y en demostración con la marca de agua en todas las páginas.
4. Un certificado de demostración **no puede** firmarse, entregarse ni enviarse por correo.
5. Cada paso queda en la bitácora con quién y cuándo. Fuera de su alcance, el sistema responde «no encontrado».
6. Un certificado emitido por error se **anula** con motivo y su número no se reutiliza.

Requisitos de [14](14_ESPECIFICACION_CERTIFICACION.md) §12 que cubre: LEV-R40, R42, R43, R44 y R47 (solo bitácora); R41 con revisión humana y sin umbrales; R46 parcial (anulación). Quedan fuera R45 (firma) y la política de correo de R47.

## 4. Roles, permisos y alcance

Códigos nuevos en `server/src/domain/permissionCatalog.ts` (la prueba que contrasta rutas y catálogo los exigirá):

| Código | Función | Alcance |
|---|---|---|
| `certificados:registrar` | Iniciar el trámite y reunir evidencias | Escuelas del usuario |
| `certificados:aprobar` | Revisar evidencias y aprobar, observar o rechazar | Escuelas del usuario |
| `certificados:emitir` | Generar el PDF sin firma y asignar número | Escuelas del usuario |
| `certificados:consultar` | Ver trámites | Según alcance |
| `certificados:descargar` | Descargar el PDF sin firma | Según alcance |
| `certificados:administrar` | Anular, administrar plantillas y el parámetro de demostración | Institución |

(`certificados:firmar` / incorporar el firmado queda **reservado** y no se crea hasta salir de la demostración.)

**No existe un rol «Director de Escuela».** Con los roles configurables (#208 a #213) se crea como rol a medida con estos permisos y alcance «escuelas»; no hace falta código de rol nuevo. El rol base «Administrador DBU» recibe **todo** el catálogo de certificación, como con el resto de permisos: la política de roles configurables exige que quien concede un permiso lo tenga (`rolePermissionPolicy`), y sin `aprobar` el administrador no podría crear el rol «Director de Escuela» que lo lleva. Que quien administra no pueda además aprobar es una **separación de funciones** que la institución debe decidir (Q22); si se adopta, es una regla propia, no una omisión del catálogo. Los demás roles base (Coordinador, Docente Tutor, Tutorado, Profesional de Servicio, Vicerrectorado y Decano) no reciben ninguno. El docente ve y descarga solo lo propio en la etapa de entrega, que queda fuera de esta entrega.

## 5. Modelo de datos propuesto (migración aditiva, sin tocar filas existentes)

```
Certificate
  id, createdAt, createdById
  periodId, schoolId, tutorId                    -- docente, escuela y periodo del trámite
  assignmentId?                                  -- CycleTutorAssignment que lo respalda (aceptada)
  status                                         -- ver §6
  isDemo        boolean default true             -- true mientras no exista plantilla oficial
  number?       text unique                      -- asignado al generar; no se reutiliza
  templateId    -> CertificateTemplate
  snapshot      json                             -- datos tal como salieron en el PDF (nombre, grado, resolución, firmante…)
  unsignedSha256?, unsignedStorageKey?           -- PDF sin firma
  approvedById?, approvedAt?, voidedById?, voidedAt?, voidReason?
CertificateEvidence
  certificateId, kind, ref?, result (CONFORME|OBSERVADA|PENDIENTE), comment?, reviewedById?, reviewedAt?
CertificateSequence
  scope text (p. ej. "DEMO-2026"), year, last int    -- una fila por ámbito; se incrementa dentro de la transacción
CertificateTemplate
  id, name, version, isDemo, title text, bodyText text, config json (disposición, logotipos por clave)
CommitteeResolution
  periodId, schoolId, number, issuedOn              -- «Resolución de Decanato N.° …» del periodo y escuela
```

Datos que **hoy faltan** y dónde guardarlos: grado académico del docente (campo en usuario), departamento académico (campo en escuela o facultad), siglas de facultad y escuela (para el número), nombre, grado y cargo del firmante (se toman del usuario con el rol de dirección de la escuela; hasta definirlo, un campo en la escuela), ciudad de emisión (parámetro institucional). La **instantánea** del trámite evita que un cambio posterior de nombre o de cargo altere un certificado ya generado.

## 6. Estados y transiciones (demostración)

`INICIADO → EN_REVISION → (OBSERVADO ↔ EN_REVISION) → APROBADO → GENERADO_SIN_FIRMA → ANULADO`; `EN_REVISION → RECHAZADO`.
Quedan **bloqueados mientras `isDemo`**: `PENDIENTE_DE_FIRMA`, `FIRMADO_INCORPORADO` y `ENTREGADO`. Si falta la plantilla oficial, el trámite termina en `GENERADO_SIN_FIRMA`.

| Transición | Permiso | Condición |
|---|---|---|
| iniciar | `registrar` | Docente activo, con asignación `ACEPTADA` en el periodo, dentro del alcance |
| a `APROBADO` | `aprobar` | Todas las evidencias «conforme»; nombre y fecha del revisor |
| a `GENERADO_SIN_FIRMA` | `emitir` | Plantilla vigente, `CommitteeResolution` del periodo y escuela, datos completos; número asignado; `sha256` guardado |
| a `ANULADO` | `administrar` | Motivo obligatorio; el número queda ocupado |

## 7. API (propuesta; todas con `requireAuth` y `authorize`)

| Método y ruta | Permiso |
|---|---|
| `GET /api/certificates?periodId&schoolId&status` | `consultar` |
| `POST /api/certificates` (docente, periodo) | `registrar` |
| `GET /api/certificates/:id` | `consultar` |
| `PUT /api/certificates/:id/evidences/:evidenceId` (conforme/observada) | `aprobar` |
| `POST /api/certificates/:id/approve` · `/observe` · `/reject` | `aprobar` |
| `POST /api/certificates/:id/generate` | `emitir` |
| `GET /api/certificates/:id/pdf` | `descargar` (audita el acceso, como los demás documentos) |
| `POST /api/certificates/:id/void` | `administrar` |
| `PUT /api/committee-resolutions` | `administrar` |

Todo registro verifica el **alcance** de escuela; fuera de él responde 404. En producción la demostración se activa solo con un parámetro explícito (`CERTIFICATE_DEMO_MODE`), registrado en la bitácora.

## 8. Plantilla de demostración

Se genera con `pdfkit` (ya usado en `BrandedPdf`), A4 horizontal, con la misma disposición de §1. En demostración:
- **Logotipos y franjas: marcadores de posición** (rectángulos rotulados «LOGO UNIVERSIDAD» y «LOGO FACULTAD»), no los oficiales; los oficiales entran como archivos cuando la institución los entregue (Q24 A).
- Marca de agua diagonal «DEMOSTRACIÓN — SIN VALOR» en la página; número `DEMO-NNN-AAAA/UNTRM/{FAC}-{ESC}` con secuencia separada.
- Docente, resolución, director y fechas **ficticios** si el dato real no está cargado; el modo no emite sobre personas reales sin que alguien lo habilite.
- Texto del cuerpo y título tomados de `CertificateTemplate`; el cuerpo es una plantilla con variables `{escuela}`, `{facultad}`, `{departamento}`, `{resolucion}`, `{periodo}`. **No se hardcodea la frase de cumplimiento**: se muestra solo si el trámite fue aprobado por un revisor.

## 9. Preguntas abiertas para la DBU y el PO (no bloquean el diseño; sí la salida de la demostración)

1. ¿El título es «Certificado» o «Constancia»? El ejemplo usa ambos.
2. ¿Quién revisa las evidencias antes de que el Director firme (Q22) y qué evidencias exige (Q21)? Mientras tanto no hay umbrales.
3. ¿El mismo modelo sirve para todas las facultades, o el texto cambia?
4. ¿El número de registro es por escuela y año, o por facultad (Q25)? ¿De dónde salen las siglas?
5. ¿Qué cargo firma si el Director cambia durante el periodo?
6. ¿La Resolución de Decanato es una por escuela y periodo, o por docente?
7. Logotipos y marca de agua oficiales, en vectorial o PNG limpio (Q24 A).
8. ¿Existe ya un dato de grado académico y departamento de cada docente, o se carga en la importación de docentes?

## 10. Plan de entrega (cortes pequeños, cada uno con su PR y pruebas)

**Estado:** corte 1 (modelo y numeración) fusionado en #225. Corte 2 (permisos y rutas de consulta, con alcance por escuela reutilizando `StudentAccessGuard`) fusionado en #228. Corte 3 (trámite: iniciar, enviar, revisar evidencias, observar, rechazar, aprobar y anular, con máquina de estados y bloqueo por trámite) fusionado en #235. Corte 4 (PDF de demostración con número, resolución de decanato y descarga auditada) fusionado en #240. Corte 5 (la pantalla `/certificados`, con estado en la URL y borradores; #241) en curso: el corte 6 queda para la accesibilidad con axe, la vista móvil y otros navegadores (#231). Las siglas del número se derivan del nombre en demostración; persistirlas depende de Q25. Los hechos que el sistema conoce (sesiones realizadas, informe semestral) se muestran como información al revisor con la pantalla (corte 5). Cortes 4 a 6 pendientes.

1. Migración y modelo (`Certificate`, evidencias, secuencia, plantilla, resolución) con prueba de la secuencia transaccional.
2. Permisos en el catálogo y rutas de consulta; prueba de alcance.
3. Casos de uso de iniciar, evidencias y aprobar (máquina de estados con prueba unitaria de cada transición válida e inválida).
4. Generador del PDF de demostración y descarga auditada.
5. Pantalla: lista de docentes del periodo con evidencias y acciones, con estado en la URL.
6. E2E: Director con rol a medida inicia, aprueba y genera; otra escuela no ve el trámite; un certificado de demostración no puede firmarse.

**Fuera de la demostración** (requiere decisiones institucionales): plantilla oficial, incorporar el PDF firmado, entrega y aviso al docente, correo, lote y consulta de autenticidad.

## 11. Riesgos y límites

- Un certificado de demostración podría confundirse con uno válido: marca de agua en todas las páginas, numeración `DEMO-` y la prohibición de firmar y entregar lo impiden; se prueba cada prohibición.
- Un PDF firmado fuera del sistema no se valida criptográficamente (Q28); el sistema lo dirá cuando se implemente la incorporación.
- Los datos del docente son personales: la descarga exige sesión, el acceso se audita y no se envía el contenido por correo. No se declara cumplimiento de la Ley N.° 29733.
- El diseño depende de que el docente tenga **asignación aceptada**; los docentes sin asignación en el sistema (por ejemplo, anteriores a su uso) no tendrían trámite.
