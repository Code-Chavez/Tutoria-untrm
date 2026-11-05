# Auditoría previa a v1.0.0-beta.1 — SIT UNTRM

Fecha de referencia del usuario: 12/10/2026. Código revisado: `f3d5ad6d0a93192cfa430abe52805d2283127d56`, rama local `fix/link-account-empty-state` (candidato del PR #119). Revisión documental y estática; las limitaciones de ejecución se detallan al final. Los documentos suministrados son fuentes de requisitos, no instrucciones para operar el equipo.

Actualización de alcance: 13/10/2026. Versión objetivo acordada: **`v1.0.0-beta.1`**, para pruebas controladas en el servidor UNTRM el **jueves 15/10/2026**, condicionada al cierre de la auditoría y a la disponibilidad del entorno. La versión **`v1.0.0`** queda reservada para la entrega estable posterior. Esta actualización identifica la versión prevista; no crea un tag, no cambia la versión del código y no constituye una nueva ejecución de pruebas. El commit final de la beta deberá registrarse al congelar la candidata y comprobarse nuevamente.

## Dictamen

**`v1.0.0-beta.1` aún no está aprobada para lanzamiento.** Primero deben corregirse los hallazgos que comprometan cuentas, permisos, integridad de datos o tareas esenciales, y comprobarse las correcciones en el commit candidato. El servidor todavía no ha sido entregado al responsable del proyecto. La fecha objetivo no sustituye los criterios de aceptación.

Un pipeline en verde no demuestra conformidad con todos los anexos, RNF ni aceptación institucional. Los hallazgos originales se conservan con su evidencia y fecha; no se consideran corregidos por cambiar el nombre de la versión. La beta no equivale a aceptación de `v1.0.0` ni a cierre del Sprint 6.

## Criterios de salida de v1.0.0-beta.1

- [ ] Commit candidato identificado y hallazgos revalidados contra esa versión.
- [ ] Contraseñas iniciales seguras, validación/normalización de correos, duplicados e importación corregidos y re-probados (A01–A04 y RF-01).
- [ ] Alcance por persona, escuela y servicio comprobado; sin acceso indebido a evaluaciones o expedientes (A05). Las restricciones se aplican en el servidor.
- [ ] Validaciones y flujos esenciales sin errores que impidan completar las tareas; regresión, revisión visual de navegación/iconos y formularios por rol completadas.
- [ ] Suite E2E completa del candidato ejecutada y resultados conservados; listar las pruebas no satisface este punto.
- [ ] Servidor beta aislado, HTTPS, secretos propios, respaldos y reversión comprobados; smoke y pruebas de correo en ese entorno completados.
- [ ] Acceso limitado a participantes autorizados y datos ficticios. Si se usa capturador SMTP de ensayo, declararlo y no afirmar entrega institucional real.
- [ ] Limitaciones restantes de formatos, firmas, privacidad y configuración identificadas por hallazgo, con responsable y decisión explícita; no marcar requisitos pendientes como cumplidos.

Las tareas excluidas del alcance beta deben quedar deshabilitadas de forma comprobable cuando impliquen riesgo; ocultar una opción no sustituye el control de acceso. La beta no autoriza utilizar datos sensibles reales con brechas pendientes. El detalle de instalación y agenda está en `docs/PLAN_BETA_UNTRM_2026-10-15.md`.

## Pendientes de aceptación de v1.0.0 estable

Conservar para la aceptación estable la conformidad institucional de anexos y requisitos, las evidencias del piloto formal, las correcciones y regresión posteriores, las mediciones de rendimiento/usabilidad, la operación institucional con SMTP y respaldo externo, la documentación final y el visto bueno del Product Owner. Que una actividad corresponda al cierre estable no permite diferir un defecto que haga insegura o inutilizable la beta.

## Contraste con lo dicho por Claude

| Afirmación | Resultado de la revisión |
|---|---|
| Solo falta fusionar #119 | El PR continúa OPEN, mergedAt=null; las comprobaciones completadas consultadas con GitHub CLI tienen SUCCESS, y los trabajos condicionados de main/Docker aparecen SKIPPED. Hay hallazgos técnicos adicionales abajo. |
| E2E: 9 recorridos, 40 pruebas | Confirmado ejecutando Playwright `test --list` con su configuración: 40 pruebas en 9 archivos. Falta archivar una corrida completa sobre el commit de entrega; el listado no ejecuta los escenarios. |
| E2E en CI opcional | No hay trabajo Playwright en `.github/workflows/ci.yml`. Automatizarlo es recomendable; el backlog TT-100 sí exige ejecución y registro de todos los módulos, aunque no exige expresamente ejecutarlos en CI. |
| Tres parámetros no usados, borrado opcional | Existen en `seedBase.ts`; login usa constantes 5/15 y cliente usa entorno 15 minutos + aviso de 60 segundos. La inconsistencia del panel debe corregirse o explicarse; eliminar configuración requerida sin alternativa no resuelve RF/RNF. |
| Servidor, SMTP, piloto, conformidad | Correcto: requieren decisiones y evidencias reales. Las guías constituyen preparación, no prueba de despliegue ni aceptación. |
| Informe V02 desactualizado | Confirmado: aún menciona ocho recorridos y 36 pruebas y un commit/versión anteriores. Actualizar el corte con resultados comprobados, sin sustituir cifras como si fueran una ejecución nueva. |
| Releases y desactivar correo por persona opcionales | No se identificó obligación documental de usar GitHub Releases ni preferencias individuales. Mantener recuperación de contraseña operativa aunque los avisos voluntarios se desactiven. |

## Hallazgos de código y criterios de cierre

Prioridad alta: resolver antes de usar cuentas/datos reales. Media: resolver o aceptar expresamente como limitación antes del cierre del alcance correspondiente. Evidencia estática significa recorrido del código; los casos siguientes son criterios de re-prueba, no ejecuciones afirmadas.

### A01 — Alta: contraseña inicial fija para todas las cuentas creadas

`server/src/application/use-cases/users/CreateUserUseCase.ts` asigna una contraseña fija cuando no recibe una; `UserController.ts` no admite contraseña en el esquema HTTP. `User` no tiene indicador de cambio obligatorio. La guía del piloto pide cambio al primer ingreso, pero el código revisado no lo fuerza.

Corregir mediante invitación/activación con token temporal de un uso, o secreto inicial aleatorio por persona con cambio obligatorio. No publicar ni reenviar una clave común. Re-prueba: dos altas no comparten secreto; invitación vence y no se reutiliza; una cuenta pendiente no accede a operaciones normales; el secreto no aparece en logs ni respuestas.

### A02 — Alta: correos de cuentas se guardan sin normalización uniforme

`UserController.ts` usa `.email()` sin `.trim()`; `CreateUserUseCase` y `UpdateUserUseCase` persisten el valor recibido. `PrismaUserRepository.findByEmail` hace búsqueda exacta. Login y recuperación buscan `.toLowerCase().trim()`. Una cuenta creada con mayúsculas puede no encontrarse al ingresar; variantes de mayúsculas pueden eludir el control de duplicados.

Definir un normalizador único aplicado antes de validar/consultar/guardar en alta, edición, ingreso y recuperación. Para los correos institucionales, documentar normalización a minúsculas. Antes de migrar históricos, detectar colisiones y resolverlas sin fusionar personas automáticamente. Garantizar unicidad también en la base. Re-prueba: `Persona@untrm.edu.pe`, su variante en minúsculas y espacios exteriores representan la misma cuenta; la edición de la propia cuenta funciona; dos altas simultáneas no crean duplicados.

### A03 — Alta: importación Excel omite validación de correo

`ImportStudentsUseCase.ts` comprueba código, nombres, ciclo, escuela y duplicados de código, pero persiste `row.email?.trim()` sin comprobar formato. La creación manual sí usa Zod `.email()`. Teléfono y nombres también tienen reglas diferentes entre entrada manual/importación.

Compartir reglas de entrada entre formulario e importación y devolver errores por fila/campo. Distinguir correo vacío permitido de correo mal formado. No imponer unicidad de correo en estudiantes sin definir si es regla del negocio: los duplicados obligatorios existentes son código y cuenta. Probar formatos inválidos, espacios, mayúsculas, longitud, nombres solo espacios, teléfonos con letras, códigos con ceros iniciales y duplicados de código internos/en base. `.invalid` puede usarse en datos ficticios, pero nunca enviarse como si fuera destino real.

### A04 — Media: correo duplicado al editar puede responder 500

`UpdateUserUseCase.ts` declara su propio `DuplicateEmailError`; `UserController.ts` captura la clase importada de `CreateUserUseCase.ts`. Son clases distintas: el conflicto de actualización cae en el error genérico. Centralizar la clase de error y mapear el conflicto de unicidad de base, incluyendo concurrencia, a un error descriptivo (400/409 conforme al contrato elegido). Re-prueba HTTP de edición con correo ocupado y UI conservando datos y mostrando el motivo.

### A05 — Alta: alcance de coordinadores en evaluación no restringido por escuela

`GetEvaluationResultsUseCase`, `GetEvaluationStatisticsUseCase` y `GetEvaluationSuggestionsUseCase` aceptan Administrador DBU/Coordinador, sin consultar las escuelas asignadas al solicitante. Los filtros de escuela/facultad son suministrados por el cliente y pueden omitirse/cambiarse. `authorize.ts` comprueba permisos, no alcance territorial; el coordinador tiene `evaluation:manage` en `seedBase.ts`.

Aplicar alcance desde el servidor y comprobarlo para resultados por tutor, estadísticas, sugerencias y sus exportaciones. Si se pretende acceso global, justificarlo y obtener conformidad expresa; no asumirlo por tener el mismo rol. Re-prueba con coordinadores de dos escuelas: omitir filtros o indicar escuela/tutor ajeno no amplía el acceso; la DBU mantiene el alcance aprobado. No se afirma aquí una explotación dinámica.

### A06 — Alta documental/privacidad: anonimato no es total

`SubmitEvaluationUseCase.ts` almacena `studentId`, `tutorId` y respuestas juntos. `PrismaTutorEvaluationRepository` omite identidad en consultas de resultados, pero la relación existe en la base. `EvaluationController.submit` devuelve la evaluación creada al propio autor. La matriz dice «sin vínculo con la identidad», lo que no corresponde al almacenamiento real.

Decidir con DBU: evaluación confidencial con reportes sin identidad, o anonimato real separando comprobante de participación de respuesta. Corregir mensajes, manuales y matriz según lo implementado. Evitar identificación indirecta mediante grupos de una sola respuesta y comentarios libres; definir umbral/política de publicación. No borrar el control de una respuesta por periodo ni añadir identificación a los reportes para imitar el papel.

### A07 — Media: límites y coherencia de datos incompletos

`UserController.ts` permite nombres formados por espacios (minLength sin trim) y teléfono libre; `student.validators.ts` solo limita longitud del teléfono; `supportContact.validators.ts` admite letras si cumplen longitud; `interview.validators.ts` admite fecha de nacimiento futura, edad independiente y año de ingreso hasta 2100; aspectos/acuerdos de entrevista no tienen máximo explícito.

Unificar límites y reglas de fechas; permitir nombres reales con tildes/apóstrofes, no restringirlos arbitrariamente a ASCII. Teléfono opcional con formato acordado (incluido internacional si aplica). Derivar edad de nacimiento cuando exista, impedir fechas futuras incoherentes y años incompatibles con el periodo. Mostrar errores por campo, conservar entradas y anunciar errores de forma accesible. Probar vacíos, espacios, extremos, Unicode y texto largo.

### A08 — Media: parámetros de seguridad visibles no gobiernan la conducta

`seedBase.ts`: inactividad=30 e intentos=3; `LoginUseCase.ts`: 5 intentos y 15 minutos; `client/src/features/auth/sessionConfig.ts`: 15 minutos más aviso de 60 segundos por defecto. Definir fuente autoritativa, validación de rangos y actualización efectiva. Si son exclusivamente configuración del despliegue, retirar controles engañosos y actualizar requisitos/manual. El cierre del cliente no demuestra por sí solo expiración por inactividad del servidor. Probar configuración y múltiples pestañas, renovación y cuenta bloqueada.

### A09 — Alta respecto a RNF-COMP-01: bitácora no cubre lectura sensible

`auditEntry.ts` audita create/update/delete de User y catálogos; las lecturas no crean entrada. `GetReferralByIdUseCase` y `GetStudentRecordUseCase` no registran acceso, ni se encontró auditoría general de lecturas en authenticate/authorize. RNF-COMP-01 exige especialmente acceso a fichas y salud.

Registrar lectura/exportación/descarga sensible con actor, fecha, entidad e IP, sin copiar notas clínicas ni tokens. Verificar cobertura de mutaciones de entrevistas/seguimientos y mecanismo de integridad/retención. La bitácora no es inalterable solo porque no exista un botón de borrado. Probar accesos autorizados, denegados y fallos del registro con política operativa definida.

### A10 — Media: avisos por correo sin entrega durable/reintento

`EmailNotificationRepository.create` persiste el aviso interno y lanza envío sin esperar. Es una buena degradación, pero un proceso terminado o fallo SMTP puede perder el correo; solo se registra advertencia. La validación de producción verifica presencia de SMTP_HOST, no conexión, rango de puerto, remitente o exigencia STARTTLS. `SmtpMailer` negocia STARTTLS si se ofrece, sin `requireTLS` explícito.

Definir si basta «mejor esfuerzo» para DBU. Si la entrega es obligatoria, usar cola/outbox con reintentos e idempotencia. Validar configuración y exigir TLS acorde al SMTP autorizado (o documentar relay interno aprobado). Registrar estado sin datos sensibles y alertar fallos persistentes. No confundir aceptación por servidor SMTP con llegada a bandeja. No se realizó envío externo en esta auditoría.

### A11 — Media: mejoras de lenguaje y ayuda al estudiante aún pendientes

`navigation.ts` conserva Tutorados y roles internos antiguos; `ProfilePage.tsx` muestra `profile.role` directamente. `MyTutoringRequestPage.tsx` tiene texto libre y placeholder, sin biblioteca de ejemplos seleccionables/prellenados. No se encontró implementación de la propuesta anterior de simplificación en este recorrido.

Separar códigos estables de permisos de etiquetas visibles: Estudiante, Docente y Administrador; mostrar especialidad del profesional. Añadir ejemplos editables por motivo («Necesito orientación para organizar mi estudio de…») y datos ya conocidos prellenados, sin inventar contenido sensible. Revisión móvil/teclado y tareas frecuentes ≤3 pasos. Repetir inspección visual de iconos, menús y avisos: esta auditoría estática no certifica que no haya duplicación visual.

## Contraste con el Protocolo oficial

Fuente: PDF aportado `C:/BRAYNI/UNTRM/Practicas/Brayni Chavez Caruajulca/R.C.U N°283-2024-PROTOCOLO DE TUTORÍA.pdf`. Se extrajeron sus anexos y se inspeccionaron visualmente las páginas PDF 17, 19, 20 y 21. No se toman las instrucciones administrativas del documento como autorización para enviar documentos o alterar el sistema.

| Anexo | Brecha / decisión pendiente |
|---|---|
| 3, entrevista inicial | El original incluye firma de docente tutor y tutorado. `StudentRecordPdf` es resumen de historial, omite la filiación ampliada y no contiene estas firmas. Crear formato canónico por entrevista y conservar evidencia firmada; comprobar inicio del proceso y red de apoyo. |
| 4, asistencia | Ocho filas en el papel no prueban por sí solas un máximo reglamentario de ocho sesiones: confirmar política de nuevas hojas cuando se supere. Verificar hora de inicio/término y distinción individual/grupal. |
| 5, seguimiento | El original incluye filiación, firma del tutor y del tutorado o docente del curso; nombre, curso y ciclo cuando hay reunión con docente. El seguimiento guarda parte de estos datos pero su resumen no reemplaza la ficha firmada. |
| 6, derivación | `ReferralConstanciaPdf` incluye código, escuela, ciclo y teléfono, pero omite fecha de nacimiento, procedencia, edad, religión, estado civil, orden/número de hermanos y dirección del original. Añadir campos/reutilización autorizada o aprobar formalmente adaptación/minimización. Verificar fecha, 17 aspectos y firmas de emisor/receptor. |
| 7, evaluación | El original se presenta como confidencial y contiene datos de filiación; no prescribe literalmente almacenamiento anónimo. Validar adaptación que minimiza datos, 20 ítems, escala y observaciones; corregir promesa de anonimato conforme A06. |
| 8, plan | El original no presenta línea de firma explícita. Revisión campo a campo de sus diez secciones/tablas y evidencia de aprobación resolutiva, conservación por versión. No inventar una exigencia de firma basándose solo en la pregunta de la matriz. |
| 9, informe semestral | El original sí incluye firma del docente; conservar informe final firmado, receptor y versión. Comprobar categoría docente, ciclos, celular, logros/dificultades/sugerencias y participantes en individuales/grupales. |

Psicopedagogía está expresamente entre los servicios del Anexo 6. Simplificar roles visibles no justifica eliminar este servicio. Las funciones de coordinación y supervisión deben quedar asignadas aunque no se quiera mostrar Coordinador/Vicerrectorado como roles principales. Acordar matriz de responsabilidades antes de retirar permisos/cuentas.

## Sprint 6, DoD y RNF: pendientes para cerrar

El documento REQUERIMIENTOS FUNCIONALES agrega dos brechas explícitas: RF-01 exige correo `@untrm.edu.pe`, pero los esquemas HTTP revisados solo validan sintaxis y no dominio; RF-39 encarga al coordinador habilitar/cerrar la evaluación y definir fechas de apertura/cierre. `SetEvaluationWindowUseCase.ts` permite solamente Administrador DBU, y esquema/modelo `EvaluationWindow` solo tienen `isOpen`, sin fechas programadas: implementar la aceptación o aprobar formalmente el cambio de responsable y mecanismo. RF-07 exige que el administrador configure la inactividad; RF-08 exige accesos sensibles en bitácora; RF-38 exige anonimato, por lo que A06 requiere una decisión de diseño o ajuste aprobado de alcance. Si se autorizan cuentas externas, registrar formalmente la excepción a RF-01 y aplicarla por política explícita; no dejar el requisito sin control.

SPRINT BACKLOG.docx confirma 09–20/11/2026, fechas referenciales: TT-100 09–10/11; TT-101 11–12/11; piloto TT-102 13/11; correcciones/regresión TT-103 16–17/11; producción + visto bueno PO + smoke TT-104 18/11; manuales e informe TT-105 19–20/11. Preparación adelantada no equivale a Sprint cerrado.

- TT-100: corrida completa identificada por commit/entorno, resultados y RF↔pruebas; casos negativos de correo/datos/permisos anteriores. Playwright cubre Chromium por defecto: falta evidencia Firefox/Edge/Safari y móvil según RNF-USA-01/DoD C08.
- TT-101: revisión de seguridad actualizada tras A01/A05/A09; informe OWASP anterior no incluye infraestructura y mantiene advertencia ignorada de dependencia. Revisar vigencia y justificación, sin afirmar que haya vulnerabilidad explotable solo por la excepción.
- RNF-PERF-01: demostrar ≤3 s con ≥100 usuarios concurrentes. RNF-PERF-02: 2000 filas <2 min; no reemplazar con importación de 12 estudiantes.
- RNF-AVAIL-01/02: monitoreo para objetivo 99%, respaldo externo, restauración real, responsables, retención y alerta al administrador ante fallo. Un contenedor unhealthy/log no asegura que alguien reciba la alerta.
- TT-102: usuarios reales autorizados, fecha/versión, observación, resultados y hallazgos. La guía y plantilla no son ejecución.
- TT-103: corregir hallazgos altos y documentar aceptación de restantes; regresión de cambios.
- TT-104: servidor/dominio/TLS, SMTP real, copia externa, secretos y cuentas iniciales seguras, restore/reversión, smoke y aceptación manual del PO. Documentar decisión DBU/asesor sin asumir aprobación por tener su nombre en DoD.
- DoD C03: evidencia de ≥70% de cobertura de lógica de negocio. `server/jest.config.ts` no establece umbral; obtener reporte por módulo y decidir control automático.
- DoD C06: API actualizada (Swagger o Postman según documento); manuales existentes revisados contra versión final y formatos de entrega acordados.
- TT-105: informe V02, diagramas, horas/constancias, piloto y formato académico; revisar las cifras y referencias. Word/PDF solo cuando el destino lo requiera; no declarar faltantes de contenido por no tener PDF.

## Lista de pruebas de correo antes de aceptar SMTP

1. Alta/edición/login/recuperación con variantes de mayúsculas y espacios; duplicados y concurrencia; política de dominio institucional definida por DBU. El PDF revisado no basta para imponer `@untrm.edu.pe` a toda persona externa; acordar excepciones de profesionales.
2. No confundir sintaxis válida, dominio autorizado, existencia del buzón y propiedad del correo. Para verificar propiedad usar invitación/enlace, no solo regex; no almacenar contraseñas de buzones personales.
3. Recuperación: cuenta activa/inactiva/inexistente, respuesta pública equivalente, límites, enlace expirado/usado/reemplazado, revocación de sesiones y ausencia de token en registros.
4. SMTP: credenciales erróneas, host/puerto inválido, timeout, certificado inválido, TLS y bloqueo por proveedor; configuración sin secretos en salida.
5. Entrega real: remitente autorizado, llegada/spam, SPF/DKIM/DMARC según TI, enlace HTTPS al dominio final, acceso tras login y permisos correctos. No enviar nombres/casos/notas clínicas en los avisos.
6. Nueva solicitud, constancia al solicitante, respuesta, derivación y cambios de estado: destinatarios correctos y ningún servicio ajeno; no reenvíos duplicados.
7. Falla de SMTP: aviso interno y operación sobreviven; estado/reintento/alerta según política; recuperación no promete entrega verificada cuando falló.
8. Preferencias futuras: desactivar avisos voluntarios sin desactivar seguridad/recuperación; mensajes accesibles y versión de texto.

## Alcance y límites de verificación

Se consultó el estado de #119 con GitHub CLI. No se fusionó el PR ni se hizo release. No se modificó código ni se aplicaron correcciones a cuentas o bases. No se enviaron correos externos por iniciativa de la auditoría. La CLI pnpm disponible intentó una comprobación/reinstalación de módulos y abortó por ausencia de TTY; no se autorizó purga ni se reintentó instalación. La invocación inicial de Playwright desde la raíz sin su configuración descubrió archivos de otros runners y falló; esto fue un error de invocación, no evidencia de defectos del proyecto. Al repetir con `e2e/playwright.config.ts` se listaron correctamente 40 pruebas en 9 archivos. Se ejecutaron con Jest las suites existentes de EmailNotifications, LoginUseCase, CreateUserUseCase, UpdateUserUseCase, ImportStudentsUseCase, RequestPasswordResetUseCase y passwordReset de integración: 7 suites, 45 pruebas aprobadas. Estas pruebas usan sus propios datos de ensayo y no cubren todos los hallazgos nuevos; no se ejecutó la suite E2E completa ni se probó entrega SMTP institucional. No se considera esta revisión una nueva aceptación visual completa ni un certificado de ausencia de fallos.

Fuentes locales: protocolo oficial aportado; SPRINT BACKLOG, DoD y REQUERIMIENTOS NO FUNCIONALES aportados; `docs/formatos-anexos-matriz.md`, `GUIA_SMTP.md`, `GUIA_PILOTO.md`, `INFORME_SEGURIDAD_2026-10-11.md`, `MANUAL_USUARIO.md` (existencia), `MANUAL_TECNICO.md` (existencia), informe V02, `e2e/README.md`, flujo CI y archivos de código citados en cada hallazgo.
