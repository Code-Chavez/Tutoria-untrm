# Diccionario de datos

**Fuente:** `server/prisma/schema.prisma` (50 tablas). **Referencia:** commit `37278bb`. **Estado:** actual (implementado). Generado con `generar_er.py`; no se edita a mano. Las columnas son las de la base de datos (`@map`); «Clave» indica clave primaria (PK), foránea (FK) o única (UK).

## ER-01 · Acceso, cuentas y auditoría

### Tabla `users` (User)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `email` | string | UK | no | — |
| `password_hash` | string | — | no | — |
| `first_name` | string | — | no | — |
| `last_name` | string | — | no | — |
| `phone` | string | — | sí | — |
| `photo_url` | string | — | sí | — |
| `is_active` | boolean | — | no | `true` |
| `failed_login_attempts` | int | — | no | `0` |
| `locked_until` | datetime | — | sí | — |
| `must_change_password` | boolean | — | no | `false` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `role_id` | string | FK | no | — |
| `service` | string | — | sí | — |
| `school_id` | string | FK | sí | — |
| `faculty_id` | string | FK | sí | — |

### Tabla `roles` (Role)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `name` | string | UK | no | — |
| `description` | string | — | no | — |
| `created_at` | datetime | — | no | `now()` |
| `is_base` | boolean | — | no | `false` |
| `is_active` | boolean | — | no | `true` |

### Tabla `user_access_policies` (UserAccessPolicy)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `user_id` | string | FK, UK | no | — |
| `role_id` | string | FK | no | — |
| `kind` | string | — | no | — |
| `school_ids` | string[] | — | no | `[]` |
| `faculty_ids` | string[] | — | no | `[]` |
| `service` | string | — | sí | — |
| `revision` | int | — | no | `0` |

### Tabla `permissions` (Permission)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `code` | string | UK | no | — |
| `description` | string | — | no | — |

### Tabla `role_permissions` (RolePermission)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `role_id` | string | PK, FK | no | — |
| `permission_id` | string | PK, FK | no | — |

### Tabla `refresh_tokens` (RefreshToken)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `token_hash` | string | UK | no | — |
| `user_id` | string | FK | no | — |
| `expires_at` | datetime | — | no | — |
| `revoked_at` | datetime | — | sí | — |
| `created_at` | datetime | — | no | `now()` |

### Tabla `password_reset_tokens` (PasswordResetToken)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `token_hash` | string | UK | no | — |
| `user_id` | string | FK | no | — |
| `expires_at` | datetime | — | no | — |
| `used` | boolean | — | no | `false` |
| `created_at` | datetime | — | no | `now()` |

### Tabla `audit_logs` (AuditLog)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `user_id` | string | FK | no | — |
| `action` | string | — | no | — |
| `entity` | string | — | no | — |
| `entity_id` | string | — | no | — |
| `details` | string | — | sí | — |
| `ip_address` | string | — | sí | — |
| `created_at` | datetime | — | no | `now()` |

## ER-02 · Estructura académica y configuración

### Tabla `faculties` (Faculty)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `name` | string | UK | no | — |
| `is_active` | boolean | — | no | `true` |
| `created_at` | datetime | — | no | `now()` |
| `request_email` | string | — | sí | — |

### Tabla `campuses` (Campus)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `name` | string | UK | no | — |
| `city` | string | — | sí | — |
| `kind` | string | — | no | `"SEDE"` |
| `is_active` | boolean | — | no | `true` |
| `created_at` | datetime | — | no | `now()` |

### Tabla `schools` (School)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `name` | string | — | no | — |
| `faculty_id` | string | FK | no | — |
| `cycle_count` | int | — | no | `10` |
| `is_active` | boolean | — | no | `true` |
| `created_at` | datetime | — | no | `now()` |
| `coordinator_id` | string | FK | sí | — |
| `campus_id` | string | FK | sí | — |
| `request_email` | string | — | sí | — |

### Tabla `school_campuses` (SchoolCampus)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `school_id` | string | PK, FK | no | — |
| `campus_id` | string | PK, FK | no | — |

### Tabla `academic_periods` (AcademicPeriod)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `name` | string | UK | no | — |
| `start_date` | datetime | — | no | — |
| `end_date` | datetime | — | no | — |
| `is_active` | boolean | — | no | `true` |
| `created_at` | datetime | — | no | `now()` |
| `closed_at` | datetime | — | sí | — |
| `closed_by_id` | string | — | sí | — |
| `closure_summary` | json | — | sí | — |

### Tabla `period_enrollments` (PeriodEnrollment)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `period_id` | string | FK | no | — |
| `student_id` | string | FK | no | — |
| `school_id` | string | — | no | — |
| `cycle` | int | — | no | — |

### Tabla `catalog_items` (CatalogItem)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `catalog` | string | — | no | — |
| `code` | string | — | no | — |
| `name` | string | — | no | — |
| `is_active` | boolean | — | no | `true` |
| `created_at` | datetime | — | no | `now()` |

### Tabla `system_parameters` (SystemParameter)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `key` | string | UK | no | — |
| `value` | string | — | no | — |
| `label` | string | — | no | — |

### Tabla `branding_settings` (BrandingSetting)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `"default"` |
| `institution_name` | string | — | no | — |
| `short_name` | string | — | no | — |
| `primary_color` | string | — | no | — |
| `accent_color` | string | — | no | — |
| `logo_storage_key` | string | — | sí | — |
| `logo_mime_type` | string | — | sí | — |
| `updated_at` | datetime | — | no | — |

## ER-03 · Estudiantes y acompañamiento del tutor

### Tabla `students` (Student)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `student_code` | string | UK | no | — |
| `first_name` | string | — | no | — |
| `last_name` | string | — | no | — |
| `email` | string | — | sí | — |
| `phone` | string | — | sí | — |
| `cycle` | int | — | no | — |
| `is_at_risk` | boolean | — | no | `false` |
| `risk_reason` | string | — | sí | — |
| `risk_marked_at` | datetime | — | sí | — |
| `is_active` | boolean | — | no | `true` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `school_id` | string | FK | no | — |
| `tutor_id` | string | FK | sí | — |
| `assigned_at` | datetime | — | sí | — |
| `user_id` | string | FK, UK | sí | — |

### Tabla `tutor_assignment_history` (TutorAssignmentHistory)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `reason` | string | — | no | — |
| `student_id` | string | FK | no | — |
| `previous_tutor_id` | string | FK | sí | — |
| `new_tutor_id` | string | FK | no | — |
| `reassigned_by_id` | string | FK | no | — |

### Tabla `tutor_interviews` (TutorInterview)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `student_id` | string | FK | no | — |
| `conducted_by_id` | string | FK | no | — |
| `birth_date` | datetime | — | sí | — |
| `origin_place` | string | — | sí | — |
| `age` | int | — | sí | — |
| `religion` | string | — | sí | — |
| `marital_status` | string | — | sí | — |
| `siblings_order` | string | — | sí | — |
| `address` | string | — | sí | — |
| `admission_year` | int | — | sí | — |
| `motive_academic` | boolean | — | no | `false` |
| `motive_personal_emotional` | boolean | — | no | `false` |
| `motive_vocational` | boolean | — | no | `false` |
| `motive_detail` | string | — | sí | — |
| `aspects_discussed` | string | — | no | — |
| `agreements` | string | — | no | — |

### Tabla `tutor_follow_ups` (TutorFollowUp)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `student_id` | string | FK | no | — |
| `conducted_by_id` | string | FK | no | — |
| `reason` | string | — | no | — |
| `agreements` | string | — | no | — |
| `instructor_name` | string | — | sí | — |
| `course_name` | string | — | sí | — |
| `course_cycle` | int | — | sí | — |

### Tabla `support_contacts` (SupportContact)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `student_id` | string | FK, UK | no | — |
| `full_name` | string | — | no | — |
| `relationship` | string | — | no | — |
| `age` | int | — | sí | — |
| `occupation` | string | — | sí | — |
| `phone` | string | — | no | — |

### Tabla `student_period_snapshots` (StudentPeriodSnapshot)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `period_id` | string | FK | no | — |
| `student_id` | string | FK | no | — |
| `school_id` | string | — | no | — |
| `cycle` | int | — | no | — |
| `tutor_id` | string | — | sí | — |
| `is_active` | boolean | — | no | — |
| `is_at_risk` | boolean | — | no | — |

### Tabla `cycle_tutor_assignments` (CycleTutorAssignment)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `period_id` | string | FK | no | — |
| `school_id` | string | FK | no | — |
| `cycle` | int | — | no | — |
| `tutor_id` | string | FK | no | — |
| `is_exception` | boolean | — | no | `false` |
| `note` | string | — | sí | — |
| `assigned_by_id` | string | — | no | — |
| `acceptance_status` | string | — | no | `"SIN_SOLICITAR"` |
| `acceptance_token_hash` | string | UK | sí | — |
| `acceptance_expires_at` | datetime | — | sí | — |
| `requested_at` | datetime | — | sí | — |
| `responded_at` | datetime | — | sí | — |
| `decline_reason` | string | — | sí | — |
| `availability` | json | — | sí | — |
| `decline_notice_status` | string | — | sí | — |
| `decline_notice_attempt_id` | string | — | sí | — |

### Tabla `decline_notice_attempts` (DeclineNoticeAttempt)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `assignment_id` | string | FK | no | — |
| `kind` | string | — | no | — |
| `status` | string | — | no | `"EN_COLA"` |
| `tutor_id` | string | — | no | — |
| `declined_at` | datetime | — | no | — |
| `operation_id` | string | — | sí | — |
| `requested_by_id` | string | — | sí | — |
| `reason` | string | — | sí | — |
| `previous_attempt_id` | string | FK | sí | — |
| `recipient_user_id` | string | — | sí | — |
| `recipient_email` | string | — | sí | — |
| `started_at` | datetime | — | sí | — |
| `finished_at` | datetime | — | sí | — |
| `error_code` | string | — | sí | — |

### Tabla `admonitions` (Admonition)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `tutor_id` | string | FK | no | — |
| `issued_by_id` | string | FK | no | — |
| `school_id` | string | — | no | — |
| `faculty_id` | string | — | no | — |
| `issued_on` | datetime | — | no | — |
| `reason` | string | — | no | — |
| `file_name` | string | — | sí | — |
| `mime_type` | string | — | sí | — |
| `file_size` | int | — | sí | — |
| `storage_key` | string | — | sí | — |
| `sha256` | string | — | sí | — |

## ER-04 · Solicitudes y sesiones de tutoría

### Tabla `tutoring_requests` (TutoringRequest)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `student_id` | string | FK | no | — |
| `requested_by_id` | string | FK | no | — |
| `source` | string | — | no | — |
| `instructor_name` | string | — | sí | — |
| `course_name` | string | — | sí | — |
| `case_type` | string | — | no | — |
| `reason` | string | — | no | — |
| `routed_to_id` | string | FK | no | — |
| `routed_to_role` | string | — | no | — |
| `status` | string | — | no | `"PENDIENTE"` |
| `response_note` | string | — | sí | — |
| `handled_by_id` | string | — | sí | — |
| `handled_at` | datetime | — | sí | — |
| `session_id` | string | — | sí | — |
| `referral_id` | string | — | sí | — |

### Tabla `sessions` (Session)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `tutor_id` | string | FK | no | — |
| `topic` | string | — | no | — |
| `scheduled_at` | datetime | — | no | — |
| `duration_minutes` | int | — | no | — |
| `ends_at` | datetime | — | no | — |
| `modality` | string | — | no | `"PRESENCIAL"` |
| `location` | string | — | sí | — |
| `meeting_link` | string | — | sí | — |
| `cancelled_at` | datetime | — | sí | — |
| `cancel_reason` | string | — | sí | — |

### Tabla `session_participants` (SessionParticipant)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `session_id` | string | FK | no | — |
| `student_id` | string | FK | no | — |
| `attended` | boolean | — | sí | — |

### Tabla `session_attendances` (SessionAttendance)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `session_id` | string | FK, UK | no | — |
| `sequence_number` | int | — | no | — |
| `confirmed_at` | datetime | — | no | — |
| `created_at` | datetime | — | no | `now()` |
| `tutor_id` | string | — | sí | — |
| `student_id` | string | — | sí | — |
| `period_id` | string | — | sí | — |

### Tabla `session_change_history` (SessionChangeHistory)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `session_id` | string | FK | no | — |
| `change_type` | string | — | no | — |
| `reason` | string | — | no | — |
| `previous_scheduled_at` | datetime | — | sí | — |
| `new_scheduled_at` | datetime | — | sí | — |
| `changed_by_id` | string | FK | no | — |

### Tabla `session_evidences` (SessionEvidence)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `session_id` | string | FK | no | — |
| `file_name` | string | — | no | — |
| `mime_type` | string | — | no | — |
| `file_size` | int | — | no | — |
| `storage_key` | string | — | no | — |
| `uploaded_by_id` | string | FK | no | — |

## ER-05 · Derivaciones, avisos y documentos

### Tabla `student_referrals` (StudentReferral)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `student_id` | string | FK | no | — |
| `referred_by_id` | string | FK | no | — |
| `checked_aspects` | string[] | — | no | — |
| `reason` | string | — | no | — |
| `service` | string | — | no | — |
| `receiving_instance` | string | — | sí | — |
| `status` | string | — | no | `"ENVIADO"` |

### Tabla `referral_status_history` (ReferralStatusHistory)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `referral_id` | string | FK | no | — |
| `status` | string | — | no | — |
| `notes` | string | — | sí | — |
| `changed_by_id` | string | FK | no | — |

### Tabla `notifications` (Notification)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `user_id` | string | FK | no | — |
| `type` | string | — | no | — |
| `message` | string | — | no | — |
| `referral_id` | string | FK | sí | — |
| `tutoring_request_id` | string | FK | sí | — |
| `session_id` | string | FK | sí | — |
| `read` | boolean | — | no | `false` |

### Tabla `email_outbox` (EmailOutbox)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `notification_id` | string | FK, UK | no | — |
| `status` | string | — | no | `"PENDING"` |
| `attempts` | int | — | no | `0` |
| `next_attempt_at` | datetime | — | no | `now()` |
| `last_error` | string | — | sí | — |
| `sent_at` | datetime | — | sí | — |

### Tabla `signed_documents` (SignedDocument)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `kind` | string | — | no | — |
| `referral_id` | string | FK | sí | — |
| `student_id` | string | FK | sí | — |
| `period_id` | string | FK | sí | — |
| `file_name` | string | — | no | — |
| `mime_type` | string | — | no | — |
| `file_size` | int | — | no | — |
| `storage_key` | string | — | no | — |
| `sha256` | string | — | no | — |
| `uploaded_by_id` | string | FK | no | — |

## ER-06 · Evaluación, planes, informes y pedidos de listas

### Tabla `tutor_evaluations` (TutorEvaluation)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `student_id` | string | FK | no | — |
| `tutor_id` | string | FK | no | — |
| `period_id` | string | FK | no | — |
| `scores` | string[] | — | no | — |
| `likes` | string | — | sí | — |
| `dislikes` | string | — | sí | — |

### Tabla `evaluation_windows` (EvaluationWindow)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `period_id` | string | FK | no | — |
| `school_id` | string | FK | no | — |
| `is_open` | boolean | — | no | `false` |

### Tabla `work_plans` (WorkPlan)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `period_id` | string | FK | no | — |
| `school_id` | string | FK | no | — |
| `author_id` | string | FK | no | — |
| `introduction` | string | — | no | — |
| `denomination` | string | — | no | — |
| `event_type` | string | — | no | — |
| `execution_date` | string | — | no | — |
| `schedule` | string | — | no | — |
| `place` | string | — | no | — |
| `modality` | string | — | no | — |
| `organizers` | string | — | no | — |
| `support_unit` | string | — | no | — |
| `foundation` | string | — | no | — |
| `general_objective` | string | — | no | — |
| `specific_objectives` | string[] | — | no | — |
| `target_audience` | string | — | no | — |
| `methodology` | string | — | no | — |
| `planning` | json | — | no | — |
| `programming` | json | — | no | — |
| `physical_resources` | json | — | no | — |
| `human_resources` | json | — | no | — |
| `budget` | json | — | no | — |
| `operational_activities` | json | — | no | — |
| `resolution_file_name` | string | — | sí | — |
| `resolution_file_size` | int | — | sí | — |
| `resolution_storage_key` | string | — | sí | — |
| `resolution_uploaded_at` | datetime | — | sí | — |
| `revision` | int | — | no | `1` |

### Tabla `work_plan_versions` (WorkPlanVersion)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `work_plan_id` | string | FK | no | — |
| `revision` | int | — | no | — |
| `author_id` | string | — | no | — |
| `content` | json | — | no | — |
| `resolution_file_name` | string | — | no | — |
| `resolution_file_size` | int | — | no | — |
| `resolution_storage_key` | string | — | no | — |
| `resolution_uploaded_at` | datetime | — | no | — |

### Tabla `tutor_semester_reports` (TutorSemesterReport)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `period_id` | string | FK | no | — |
| `tutor_id` | string | FK | no | — |
| `program_name` | string | — | no | — |
| `faculty` | string | — | no | — |
| `teacher_category` | string | — | no | — |
| `tutoring_cycles` | string | — | no | — |
| `phone` | string | — | no | — |
| `individual` | json | — | no | — |
| `group` | json | — | no | — |

### Tabla `data_requests` (DataRequest)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `period_id` | string | FK | no | — |
| `school_id` | string | FK | sí | — |
| `faculty_id` | string | FK | sí | — |
| `faculty_name` | string | — | sí | — |
| `school_names` | string[] | — | no | `[]` |
| `kind` | string | — | no | `"ESTUDIANTES"` |
| `to_email` | string | — | no | — |
| `cycles` | int[] | — | no | — |
| `note` | string | — | sí | — |
| `requested_by_id` | string | FK | no | — |
| `status` | string | — | no | `"ENVIADO"` |
| `error` | string | — | sí | — |
| `received_at` | datetime | — | sí | — |
| `received_by_id` | string | — | sí | — |
| `operation_id` | string | — | sí | — |
| `content_hash` | string | — | sí | — |
| `equivalence_key` | string | — | sí | — |
| `resend_of_id` | string | FK | sí | — |
| `attempt_started_at` | datetime | — | sí | — |

## ER-07 · Certificación del docente tutor (demostración)

### Tabla `certificates` (Certificate)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `updated_at` | datetime | — | no | — |
| `period_id` | string | FK | no | — |
| `school_id` | string | FK | no | — |
| `tutor_id` | string | FK | no | — |
| `assignment_id` | string | FK | sí | — |
| `created_by_id` | string | FK | no | — |
| `status` | string | — | no | `"INICIADO"` |
| `is_demo` | boolean | — | no | `true` |
| `number` | string | UK | sí | — |
| `template_id` | string | FK | sí | — |
| `snapshot` | json | — | sí | — |
| `unsigned_sha256` | string | — | sí | — |
| `unsigned_storage_key` | string | — | sí | — |
| `approved_by_id` | string | FK | sí | — |
| `approved_at` | datetime | — | sí | — |
| `voided_by_id` | string | FK | sí | — |
| `voided_at` | datetime | — | sí | — |
| `void_reason` | string | — | sí | — |
| `review_note` | string | — | sí | — |

### Tabla `certificate_evidences` (CertificateEvidence)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `certificate_id` | string | FK | no | — |
| `kind` | string | — | no | — |
| `ref` | string | — | sí | — |
| `result` | string | — | no | `"PENDIENTE"` |
| `comment` | string | — | sí | — |
| `reviewed_by_id` | string | FK | sí | — |
| `reviewed_at` | datetime | — | sí | — |

### Tabla `certificate_sequences` (CertificateSequence)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `scope` | string | PK | no | — |
| `year` | int | PK | no | — |
| `last` | int | — | no | `0` |

### Tabla `certificate_templates` (CertificateTemplate)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `name` | string | — | no | — |
| `version` | int | — | no | `1` |
| `is_demo` | boolean | — | no | `true` |
| `is_active` | boolean | — | no | `true` |
| `title` | string | — | no | — |
| `body_text` | string | — | no | — |
| `config` | json | — | no | `"{}"` |

### Tabla `committee_resolutions` (CommitteeResolution)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `id` | string | PK | no | `uuid()` |
| `created_at` | datetime | — | no | `now()` |
| `period_id` | string | FK | no | — |
| `school_id` | string | FK | no | — |
| `number` | string | — | no | — |
| `issued_on` | datetime | — | no | — |
| `created_by_id` | string | FK | no | — |

### Tabla `certificate_visual_assets` (CertificateVisualAsset)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `key` | string | PK | no | — |
| `content` | bytes | — | no | — |

### Tabla `certificate_school_settings` (CertificateSchoolSettings)

| Columna | Tipo | Clave | Nulo | Por defecto |
| --- | --- | --- | --- | --- |
| `school_id` | string | PK, FK | no | — |
| `department` | string | — | sí | — |
| `signatory_name` | string | — | sí | — |
| `signatory_role` | string | — | sí | — |
| `updated_at` | datetime | — | no | — |
