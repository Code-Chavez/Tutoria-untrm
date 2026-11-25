# Anexo B. Diagramas de diseño

Casos de uso, modelo entidad-relación, clases de dominio y diccionario de datos del sistema, generados desde sus fuentes (fuentes PlantUML de los casos de uso, `schema.prisma` y las entidades del servidor). Los diagramas de contexto, actividades, secuencia, estados, componentes y despliegue están en el Capítulo V. Referencia: `develop` al 19/11/2026 (`v1.0.0-beta.4`). Estado: actual (implementado).

## B.1 Casos de uso

El detalle de cada grupo de funciones se presenta como matriz de actores y casos (● indica que el actor participa) y, al final, la vista general en un diagrama. Los identificadores (por ejemplo AC01, PE04) son de la documentación de casos de uso, no del Product Backlog. El alcance de cada actor está restringido por rol, escuela, servicio y periodo.

[[tabla: Casos de uso: Acceso y cuenta personal]]

| Caso de uso | Usuario del sistema |
| --- | --- |
| AC01 Iniciar sesión | ● |
| AC02 Recuperar contraseña | ● |
| AC03 Actualizar perfil personal | ● |
| AC04 Cambiar contraseña | ● |
| AC05 Consultar notificaciones | ● |
| AC06 Cerrar sesión | ● |

[[tabla: Casos de uso: Portal del estudiante]]

| Caso de uso | Estudiante |
| --- | --- |
| ES01 Solicitar tutoría | ● |
| ES02 Consultar estado y respuesta | ● |
| ES03 Consultar sesiones propias | ● |
| ES04 Consultar lugar o enlace de sesión | ● |
| ES05 Responder evaluación de tutoría | ● |
| ES06 Registrar sugerencias en evaluación | ● |

[[tabla: Casos de uso: Acompañamiento del docente tutor]]

| Caso de uso | Docente tutor | Coordinador de tutoría | Administrador (DBU) |
| --- | --- | --- | --- |
| AT01 Consultar estudiantes y expediente | ● | ● | ● |
| AT02 Registrar entrevista inicial | ● |  |  |
| AT03 Registrar persona de red de apoyo | ● |  |  |
| AT04 Atender solicitud de tutoría | ● | ● | ● |
| AT05 Programar sesión individual o grupal | ● |  |  |
| AT06 Reprogramar o cancelar sesión | ● |  |  |
| AT07 Registrar asistencia y evidencias | ● |  |  |
| AT08 Registrar seguimiento tutorial | ● |  |  |
| AT09 Consultar alertas de riesgo | ● | ● | ● |

[[tabla: Casos de uso: Preparación y gestión del periodo]]

| Caso de uso | Coordinador de tutoría | Administrador (DBU) |
| --- | --- | --- |
| PE01 Pedir listas a las escuelas | ● | ● |
| PE02 Importar o registrar estudiantes | ● | ● |
| PE03 Importar docentes tutores |  | ● |
| PE04 Asignar docente por ciclo | ● | ● |
| PE05 Solicitar aceptación del docente | ● | ● |
| PE06 Reasignar estudiante con motivo | ● | ● |
| PE07 Gestionar plan semestral y resolución | ● | ● |
| PE08 Consultar versiones del plan | ● | ● |
| PE09 Cerrar periodo académico |  | ● |

[[tabla: Casos de uso: Derivación y atención especializada]]

| Caso de uso | Docente tutor | Profesional de servicio | Administrador (DBU) |
| --- | --- | --- | --- |
| DE01 Crear derivación a un servicio | ● |  |  |
| DE02 Consultar casos autorizados | ● | ● | ● |
| DE03 Registrar recepción del caso |  | ● | ● |
| DE04 Registrar atención y observaciones |  | ● | ● |
| DE05 Cerrar caso derivado |  | ● | ● |
| DE06 Descargar constancia de derivación | ● | ● | ● |
| DE07 Adjuntar constancia firmada | ● | ● | ● |
| DE08 Supervisar derivaciones de servicios |  |  | ● |

[[tabla: Casos de uso: Informes y evaluación del servicio]]

| Caso de uso | Docente tutor | Coordinador de tutoría | Administrador (DBU) | Vicerrectorado |
| --- | --- | --- | --- | --- |
| IN01 Consultar horarios y asistencia | ● | ● | ● |  |
| IN02 Elaborar informe semestral propio | ● |  |  |  |
| IN03 Consultar informe consolidado |  |  | ● | ● |
| IN04 Consultar indicadores |  | ● | ● | ● |
| IN05 Consultar resultados de evaluación |  | ● | ● |  |
| IN06 Consultar sugerencias de estudiantes |  | ● | ● |  |
| IN07 Habilitar o cerrar evaluación |  |  | ● |  |
| IN08 Exportar informes autorizados | ● | ● | ● | ● |

[[tabla: Casos de uso: Administración y supervisión institucional]]

| Caso de uso | Administrador (DBU) | Coordinador de tutoría | Vicerrectorado | Decano |
| --- | --- | --- | --- | --- |
| AD01 Gestionar usuarios, roles y servicios | ● |  |  |  |
| AD02 Vincular cuenta del estudiante | ● | ● |  |  |
| AD03 Configurar correos de escuelas | ● | ● |  |  |
| AD04 Gestionar sedes | ● |  | ● |  |
| AD05 Gestionar catálogos y parámetros | ● |  |  |  |
| AD06 Configurar identidad visual | ● |  |  |  |
| AD07 Consultar bitácora de auditoría | ● |  |  |  |
| AD08 Consultar amonestaciones | ● | ● |  | ● |
| AD09 Emitir amonestación | ● |  |  | ● |

![Casos de uso: vista general. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../../figuras/cu-01.png){w=3.3}

[[horizontal]]
## B.2 Modelo entidad-relación por módulo

Cada figura muestra las tablas de un módulo con sus columnas de clave (PK primaria, FK foránea, UK única) y sus relaciones; las demás columnas están en el diccionario (B.4). Se generan con un script desde `schema.prisma`, que falla si una tabla queda sin módulo (50 tablas y 92 relaciones).

![Entidad-relación ER-01: Acceso, cuentas y auditoría. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-01.png){w=8.2}

![Entidad-relación ER-02: Estructura académica y configuración. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-02.png){w=7.4}

![Entidad-relación ER-03: Estudiantes y acompañamiento del tutor. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-03.png){w=7.8}

![Entidad-relación ER-04: Solicitudes y sesiones de tutoría. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-04.png){w=8.0}

![Entidad-relación ER-05: Derivaciones, avisos y documentos. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-05.png){w=7.2}

![Entidad-relación ER-06: Evaluación, planes, informes y pedidos de listas. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-06.png){w=8.4}

![Entidad-relación ER-07: Certificación del docente tutor (demostración). Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-07.png){w=8.6}

## B.3 Clases de dominio por módulo

Generadas desde las interfaces de `server/src/domain/entities`; las asociaciones se infieren de los campos terminados en `Id` que apuntan a otra entidad del diagrama y se muestran hasta 14 atributos por clase. No incluyen certificación, pedidos de listas, asignación por ciclo ni amonestaciones, cuyos tipos viven junto a sus casos de uso (ver B.2).

![Clases de dominio: Acceso y auditoría. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../../figuras/cl-01.png){w=5.4}

![Clases de dominio: Estudiantes y acompañamiento del tutor. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../../figuras/cl-03.png){w=6.4}

![Clases de dominio: Estructura académica y configuración. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../../figuras/cl-02.png){w=5.6}

![Clases de dominio: Derivaciones, avisos y documentos. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../../figuras/cl-05.png){w=8.2}

![Clases de dominio: Solicitudes y sesiones de tutoría. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../../figuras/cl-04.png){w=8.4}

![Clases de dominio: Evaluación, planes e informes. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../../figuras/cl-06.png){w=7.0}

[[vertical]]
## B.4 Diccionario de datos

Las 50 tablas con sus columnas reales: `nombre tipo` (str texto, int entero, bool lógico, dt fecha y hora), `[PK]` clave primaria, `[FK]` foránea, `[UK]` única y `?` si admite nulo. Valores por defecto y restricciones: en `schema.prisma`. Generado con `generar_er.py` desde el esquema.

[[tabla: Diccionario de datos por tabla]]

| Tabla | Columnas |
| --- | --- |
| **users** (ER-01) | id str[PK], email str[UK], password_hash str, first_name str, last_name str, phone str?, photo_url str?, photo_storage_key str?, is_active bool, failed_login_attempts int, locked_until dt?, must_change_password bool, created_at dt, updated_at dt, role_id str[FK], service str?, school_id str[FK]?, faculty_id str[FK]? |
| **roles** (ER-01) | id str[PK], name str[UK], description str, created_at dt, is_base bool, is_active bool |
| **user_access_policies** (ER-01) | id str[PK], user_id str[FK][UK], role_id str[FK], kind str, school_ids str[], faculty_ids str[], service str?, revision int |
| **permissions** (ER-01) | id str[PK], code str[UK], description str |
| **role_permissions** (ER-01) | role_id str[PK][FK], permission_id str[PK][FK] |
| **refresh_tokens** (ER-01) | id str[PK], token_hash str[UK], user_id str[FK], expires_at dt, revoked_at dt?, created_at dt |
| **password_reset_tokens** (ER-01) | id str[PK], token_hash str[UK], user_id str[FK], expires_at dt, used bool, created_at dt |
| **audit_logs** (ER-01) | id str[PK], user_id str[FK], action str, entity str, entity_id str, details str?, ip_address str?, created_at dt |
| **faculties** (ER-02) | id str[PK], name str[UK], is_active bool, created_at dt, request_email str? |
| **campuses** (ER-02) | id str[PK], name str[UK], city str?, kind str, is_active bool, created_at dt |
| **schools** (ER-02) | id str[PK], name str, faculty_id str[FK], cycle_count int, is_active bool, created_at dt, coordinator_id str[FK]?, campus_id str[FK]?, request_email str? |
| **school_campuses** (ER-02) | school_id str[PK][FK], campus_id str[PK][FK] |
| **academic_periods** (ER-02) | id str[PK], name str[UK], start_date dt, end_date dt, is_active bool, created_at dt, closed_at dt?, closed_by_id str?, closure_summary json? |
| **period_enrollments** (ER-02) | id str[PK], created_at dt, period_id str[FK], student_id str[FK], school_id str, cycle int |
| **catalog_items** (ER-02) | id str[PK], catalog str, code str, name str, is_active bool, created_at dt |
| **system_parameters** (ER-02) | id str[PK], key str[UK], value str, label str |
| **branding_settings** (ER-02) | id str[PK], institution_name str, short_name str, primary_color str, accent_color str, logo_storage_key str?, logo_mime_type str?, updated_at dt |
| **students** (ER-03) | id str[PK], student_code str[UK], first_name str, last_name str, email str?, phone str?, cycle int, is_at_risk bool, risk_reason str?, risk_marked_at dt?, is_active bool, created_at dt, updated_at dt, school_id str[FK], tutor_id str[FK]?, assigned_at dt?, user_id str[FK][UK]? |
| **tutor_assignment_history** (ER-03) | id str[PK], created_at dt, reason str, student_id str[FK], previous_tutor_id str[FK]?, new_tutor_id str[FK], reassigned_by_id str[FK] |
| **tutor_interviews** (ER-03) | id str[PK], created_at dt, updated_at dt, student_id str[FK], conducted_by_id str[FK], birth_date dt?, origin_place str?, age int?, religion str?, marital_status str?, siblings_order str?, address str?, admission_year int?, motive_academic bool, motive_personal_emotional bool, motive_vocational bool, motive_detail str?, aspects_discussed str, agreements str |
| **tutor_follow_ups** (ER-03) | id str[PK], created_at dt, student_id str[FK], conducted_by_id str[FK], reason str, agreements str, instructor_name str?, course_name str?, course_cycle int? |
| **support_contacts** (ER-03) | id str[PK], created_at dt, updated_at dt, student_id str[FK][UK], full_name str, relationship str, age int?, occupation str?, phone str |
| **student_period_snapshots** (ER-03) | id str[PK], created_at dt, period_id str[FK], student_id str[FK], school_id str, cycle int, tutor_id str?, is_active bool, is_at_risk bool |
| **cycle_tutor_assignments** (ER-03) | id str[PK], created_at dt, period_id str[FK], school_id str[FK], cycle int, tutor_id str[FK], is_exception bool, note str?, assigned_by_id str, acceptance_status str, acceptance_token_hash str[UK]?, acceptance_expires_at dt?, requested_at dt?, responded_at dt?, decline_reason str?, availability json?, decline_notice_status str?, decline_notice_attempt_id str? |
| **decline_notice_attempts** (ER-03) | id str[PK], created_at dt, assignment_id str[FK], kind str, status str, tutor_id str, declined_at dt, operation_id str?, requested_by_id str?, reason str?, previous_attempt_id str[FK]?, recipient_user_id str?, recipient_email str?, started_at dt?, finished_at dt?, error_code str? |
| **admonitions** (ER-03) | id str[PK], created_at dt, tutor_id str[FK], issued_by_id str[FK], school_id str, faculty_id str, issued_on dt, reason str, file_name str?, mime_type str?, file_size int?, storage_key str?, sha256 str? |
| **tutoring_requests** (ER-04) | id str[PK], created_at dt, student_id str[FK], requested_by_id str[FK], source str, instructor_name str?, course_name str?, case_type str, reason str, routed_to_id str[FK], routed_to_role str, status str, response_note str?, handled_by_id str?, handled_at dt?, session_id str?, referral_id str? |
| **sessions** (ER-04) | id str[PK], created_at dt, tutor_id str[FK], topic str, scheduled_at dt, duration_minutes int, ends_at dt, modality str, location str?, meeting_link str?, cancelled_at dt?, cancel_reason str? |
| **session_participants** (ER-04) | id str[PK], session_id str[FK], student_id str[FK], attended bool? |
| **session_attendances** (ER-04) | id str[PK], session_id str[FK][UK], sequence_number int, confirmed_at dt, created_at dt, tutor_id str?, student_id str?, period_id str? |
| **session_change_history** (ER-04) | id str[PK], created_at dt, session_id str[FK], change_type str, reason str, previous_scheduled_at dt?, new_scheduled_at dt?, changed_by_id str[FK] |
| **session_evidences** (ER-04) | id str[PK], created_at dt, session_id str[FK], file_name str, mime_type str, file_size int, storage_key str, uploaded_by_id str[FK] |
| **student_referrals** (ER-05) | id str[PK], created_at dt, student_id str[FK], referred_by_id str[FK], checked_aspects str[], reason str, service str, receiving_instance str?, status str |
| **referral_status_history** (ER-05) | id str[PK], created_at dt, referral_id str[FK], status str, notes str?, changed_by_id str[FK] |
| **notifications** (ER-05) | id str[PK], created_at dt, user_id str[FK], type str, message str, referral_id str[FK]?, tutoring_request_id str[FK]?, session_id str[FK]?, read bool |
| **email_outbox** (ER-05) | id str[PK], created_at dt, notification_id str[FK][UK], status str, attempts int, next_attempt_at dt, last_error str?, sent_at dt? |
| **signed_documents** (ER-05) | id str[PK], created_at dt, kind str, referral_id str[FK]?, student_id str[FK]?, period_id str[FK]?, file_name str, mime_type str, file_size int, storage_key str, sha256 str, uploaded_by_id str[FK] |
| **tutor_evaluations** (ER-06) | id str[PK], created_at dt, student_id str[FK], tutor_id str[FK], period_id str[FK], scores str[], likes str?, dislikes str? |
| **evaluation_windows** (ER-06) | id str[PK], created_at dt, updated_at dt, period_id str[FK], school_id str[FK], is_open bool |
| **work_plans** (ER-06) | id str[PK], created_at dt, updated_at dt, period_id str[FK], school_id str[FK], author_id str[FK], introduction str, denomination str, event_type str, execution_date str, schedule str, place str, modality str, organizers str, support_unit str, foundation str, general_objective str, specific_objectives str[], target_audience str, methodology str, planning json, programming json, physical_resources json, human_resources json, budget json, operational_activities json, resolution_file_name str?, resolution_file_size int?, resolution_storage_key str?, resolution_uploaded_at dt?, revision int |
| **work_plan_versions** (ER-06) | id str[PK], created_at dt, work_plan_id str[FK], revision int, author_id str, content json, resolution_file_name str, resolution_file_size int, resolution_storage_key str, resolution_uploaded_at dt |
| **tutor_semester_reports** (ER-06) | id str[PK], created_at dt, updated_at dt, period_id str[FK], tutor_id str[FK], program_name str, faculty str, teacher_category str, tutoring_cycles str, phone str, individual json, group json |
| **data_requests** (ER-06) | id str[PK], created_at dt, period_id str[FK], school_id str[FK]?, faculty_id str[FK]?, faculty_name str?, school_names str[], kind str, to_email str, cycles int[], note str?, requested_by_id str[FK], status str, error str?, received_at dt?, received_by_id str?, operation_id str?, content_hash str?, equivalence_key str?, resend_of_id str[FK]?, attempt_started_at dt? |
| **certificates** (ER-07) | id str[PK], created_at dt, updated_at dt, period_id str[FK], school_id str[FK], tutor_id str[FK], assignment_id str[FK]?, created_by_id str[FK], status str, is_demo bool, number str[UK]?, template_id str[FK]?, snapshot json?, unsigned_sha256 str?, unsigned_storage_key str?, approved_by_id str[FK]?, approved_at dt?, voided_by_id str[FK]?, voided_at dt?, void_reason str?, review_note str? |
| **certificate_evidences** (ER-07) | id str[PK], created_at dt, certificate_id str[FK], kind str, ref str?, result str, comment str?, reviewed_by_id str[FK]?, reviewed_at dt? |
| **certificate_sequences** (ER-07) | scope str[PK], year int[PK], last int |
| **certificate_templates** (ER-07) | id str[PK], created_at dt, name str, version int, is_demo bool, is_active bool, title str, body_text str, config json |
| **committee_resolutions** (ER-07) | id str[PK], created_at dt, period_id str[FK], school_id str[FK], number str, issued_on dt, created_by_id str[FK] |
| **certificate_visual_assets** (ER-07) | key str[PK], content bytes |
| **certificate_school_settings** (ER-07) | school_id str[PK][FK], department str?, signatory_name str?, signatory_role str?, updated_at dt |