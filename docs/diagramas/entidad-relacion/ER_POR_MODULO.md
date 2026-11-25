# Diagramas entidad-relación por módulo

**Fuente:** `server/prisma/schema.prisma` (50 tablas, 92 relaciones). **Referencia:** commit `37278bb`. **Estado:** actual (implementado). Generado con `generar_er.py`; no se edita a mano.

**Cómo leerlos.** Cada recuadro es una tabla con sus columnas reales; `PK` es la clave primaria, `FK` una clave foránea, `UK` una columna única y `"nulo"` una columna que admite nulo. `||--o{` es «uno a muchos» obligatorio; `|o--o{` es «uno a muchos» donde la clave foránea puede ser nula. Una tabla de otro módulo aparece solo con el nombre cuando una relación la cruza.

**Qué no es.** No es el diagrama de clases del dominio (ese se elabora aparte, por módulo). Tampoco muestra restricciones únicas compuestas ni índices.

| ID | Módulo | Tablas |
| --- | --- | --- |
| ER-01 | Acceso, cuentas y auditoría | 8 |
| ER-02 | Estructura académica y configuración | 9 |
| ER-03 | Estudiantes y acompañamiento del tutor | 9 |
| ER-04 | Solicitudes y sesiones de tutoría | 6 |
| ER-05 | Derivaciones, avisos y documentos | 5 |
| ER-06 | Evaluación, planes, informes y pedidos de listas | 6 |
| ER-07 | Certificación del docente tutor (demostración) | 7 |

## ER-01 · Acceso, cuentas y auditoría

| Modelo | Tabla |
| --- | --- |
| `User` | `users` |
| `Role` | `roles` |
| `UserAccessPolicy` | `user_access_policies` |
| `Permission` | `permissions` |
| `RolePermission` | `role_permissions` |
| `RefreshToken` | `refresh_tokens` |
| `PasswordResetToken` | `password_reset_tokens` |
| `AuditLog` | `audit_logs` |

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string phone "nulo"
        string photo_url "nulo"
        boolean is_active
        int failed_login_attempts
        datetime locked_until "nulo"
        boolean must_change_password
        datetime created_at
        datetime updated_at
        string role_id FK
        string service "nulo"
        string school_id FK "nulo"
        string faculty_id FK "nulo"
    }
    Role {
        string id PK
        string name UK
        string description
        datetime created_at
        boolean is_base
        boolean is_active
    }
    UserAccessPolicy {
        string id PK
        string user_id FK, UK
        string role_id FK
        string kind
        string_arr school_ids
        string_arr faculty_ids
        string service "nulo"
        int revision
    }
    Permission {
        string id PK
        string code UK
        string description
    }
    RolePermission {
        string role_id PK, FK
        string permission_id PK, FK
    }
    RefreshToken {
        string id PK
        string token_hash UK
        string user_id FK
        datetime expires_at
        datetime revoked_at "nulo"
        datetime created_at
    }
    PasswordResetToken {
        string id PK
        string token_hash UK
        string user_id FK
        datetime expires_at
        boolean used
        datetime created_at
    }
    AuditLog {
        string id PK
        string user_id FK
        string action
        string entity
        string entity_id
        string details "nulo"
        string ip_address "nulo"
        datetime created_at
    }
    Faculty |o--o{ User : "faculty"
    Permission ||--o{ RolePermission : "permission"
    Role ||--o{ RolePermission : "role"
    Role ||--o{ User : "role"
    Role ||--o{ UserAccessPolicy : "role"
    School |o--o{ User : "school"
    User ||--o{ AuditLog : "user"
    User ||--o{ PasswordResetToken : "user"
    User ||--o{ RefreshToken : "user"
    User ||--o{ UserAccessPolicy : "user"
```

## ER-02 · Estructura académica y configuración

| Modelo | Tabla |
| --- | --- |
| `Faculty` | `faculties` |
| `Campus` | `campuses` |
| `School` | `schools` |
| `SchoolCampus` | `school_campuses` |
| `AcademicPeriod` | `academic_periods` |
| `PeriodEnrollment` | `period_enrollments` |
| `CatalogItem` | `catalog_items` |
| `SystemParameter` | `system_parameters` |
| `BrandingSetting` | `branding_settings` |

```mermaid
erDiagram
    Faculty {
        string id PK
        string name UK
        boolean is_active
        datetime created_at
        string request_email "nulo"
    }
    Campus {
        string id PK
        string name UK
        string city "nulo"
        string kind
        boolean is_active
        datetime created_at
    }
    School {
        string id PK
        string name
        string faculty_id FK
        int cycle_count
        boolean is_active
        datetime created_at
        string coordinator_id FK "nulo"
        string campus_id FK "nulo"
        string request_email "nulo"
    }
    SchoolCampus {
        string school_id PK, FK
        string campus_id PK, FK
    }
    AcademicPeriod {
        string id PK
        string name UK
        datetime start_date
        datetime end_date
        boolean is_active
        datetime created_at
        datetime closed_at "nulo"
        string closed_by_id "nulo"
        json closure_summary "nulo"
    }
    PeriodEnrollment {
        string id PK
        datetime created_at
        string period_id FK
        string student_id FK
        string school_id
        int cycle
    }
    CatalogItem {
        string id PK
        string catalog
        string code
        string name
        boolean is_active
        datetime created_at
    }
    SystemParameter {
        string id PK
        string key UK
        string value
        string label
    }
    BrandingSetting {
        string id PK
        string institution_name
        string short_name
        string primary_color
        string accent_color
        string logo_storage_key "nulo"
        string logo_mime_type "nulo"
        datetime updated_at
    }
    AcademicPeriod ||--o{ PeriodEnrollment : "period"
    Campus |o--o{ School : "campus"
    Campus ||--o{ SchoolCampus : "campus"
    Faculty ||--o{ School : "faculty"
    School ||--o{ SchoolCampus : "school"
    Student ||--o{ PeriodEnrollment : "student"
    User |o--o{ School : "coordinator"
```

## ER-03 · Estudiantes y acompañamiento del tutor

| Modelo | Tabla |
| --- | --- |
| `Student` | `students` |
| `TutorAssignmentHistory` | `tutor_assignment_history` |
| `TutorInterview` | `tutor_interviews` |
| `TutorFollowUp` | `tutor_follow_ups` |
| `SupportContact` | `support_contacts` |
| `StudentPeriodSnapshot` | `student_period_snapshots` |
| `CycleTutorAssignment` | `cycle_tutor_assignments` |
| `DeclineNoticeAttempt` | `decline_notice_attempts` |
| `Admonition` | `admonitions` |

```mermaid
erDiagram
    Student {
        string id PK
        string student_code UK
        string first_name
        string last_name
        string email "nulo"
        string phone "nulo"
        int cycle
        boolean is_at_risk
        string risk_reason "nulo"
        datetime risk_marked_at "nulo"
        boolean is_active
        datetime created_at
        datetime updated_at
        string school_id FK
        string tutor_id FK "nulo"
        datetime assigned_at "nulo"
        string user_id FK, UK "nulo"
    }
    TutorAssignmentHistory {
        string id PK
        datetime created_at
        string reason
        string student_id FK
        string previous_tutor_id FK "nulo"
        string new_tutor_id FK
        string reassigned_by_id FK
    }
    TutorInterview {
        string id PK
        datetime created_at
        datetime updated_at
        string student_id FK
        string conducted_by_id FK
        datetime birth_date "nulo"
        string origin_place "nulo"
        int age "nulo"
        string religion "nulo"
        string marital_status "nulo"
        string siblings_order "nulo"
        string address "nulo"
        int admission_year "nulo"
        boolean motive_academic
        boolean motive_personal_emotional
        boolean motive_vocational
        string motive_detail "nulo"
        string aspects_discussed
        string agreements
    }
    TutorFollowUp {
        string id PK
        datetime created_at
        string student_id FK
        string conducted_by_id FK
        string reason
        string agreements
        string instructor_name "nulo"
        string course_name "nulo"
        int course_cycle "nulo"
    }
    SupportContact {
        string id PK
        datetime created_at
        datetime updated_at
        string student_id FK, UK
        string full_name
        string relationship
        int age "nulo"
        string occupation "nulo"
        string phone
    }
    StudentPeriodSnapshot {
        string id PK
        datetime created_at
        string period_id FK
        string student_id FK
        string school_id
        int cycle
        string tutor_id "nulo"
        boolean is_active
        boolean is_at_risk
    }
    CycleTutorAssignment {
        string id PK
        datetime created_at
        string period_id FK
        string school_id FK
        int cycle
        string tutor_id FK
        boolean is_exception
        string note "nulo"
        string assigned_by_id
        string acceptance_status
        string acceptance_token_hash UK "nulo"
        datetime acceptance_expires_at "nulo"
        datetime requested_at "nulo"
        datetime responded_at "nulo"
        string decline_reason "nulo"
        json availability "nulo"
        string decline_notice_status "nulo"
        string decline_notice_attempt_id "nulo"
    }
    DeclineNoticeAttempt {
        string id PK
        datetime created_at
        string assignment_id FK
        string kind
        string status
        string tutor_id
        datetime declined_at
        string operation_id "nulo"
        string requested_by_id "nulo"
        string reason "nulo"
        string previous_attempt_id FK "nulo"
        string recipient_user_id "nulo"
        string recipient_email "nulo"
        datetime started_at "nulo"
        datetime finished_at "nulo"
        string error_code "nulo"
    }
    Admonition {
        string id PK
        datetime created_at
        string tutor_id FK
        string issued_by_id FK
        string school_id
        string faculty_id
        datetime issued_on
        string reason
        string file_name "nulo"
        string mime_type "nulo"
        int file_size "nulo"
        string storage_key "nulo"
        string sha256 "nulo"
    }
    AcademicPeriod ||--o{ CycleTutorAssignment : "period"
    AcademicPeriod ||--o{ StudentPeriodSnapshot : "period"
    CycleTutorAssignment ||--o{ DeclineNoticeAttempt : "assignment"
    DeclineNoticeAttempt |o--o{ DeclineNoticeAttempt : "previousAttempt"
    School ||--o{ CycleTutorAssignment : "school"
    School ||--o{ Student : "school"
    Student ||--o{ StudentPeriodSnapshot : "student"
    Student ||--o{ SupportContact : "student"
    Student ||--o{ TutorAssignmentHistory : "student"
    Student ||--o{ TutorFollowUp : "student"
    Student ||--o{ TutorInterview : "student"
    User ||--o{ Admonition : "issuedBy"
    User ||--o{ Admonition : "tutor"
    User ||--o{ CycleTutorAssignment : "tutor"
    User |o--o{ Student : "portalUser"
    User |o--o{ Student : "tutor"
    User ||--o{ TutorAssignmentHistory : "newTutor"
    User |o--o{ TutorAssignmentHistory : "previousTutor"
    User ||--o{ TutorAssignmentHistory : "reassignedBy"
    User ||--o{ TutorFollowUp : "conductedBy"
    User ||--o{ TutorInterview : "conductedBy"
```

## ER-04 · Solicitudes y sesiones de tutoría

| Modelo | Tabla |
| --- | --- |
| `TutoringRequest` | `tutoring_requests` |
| `Session` | `sessions` |
| `SessionParticipant` | `session_participants` |
| `SessionAttendance` | `session_attendances` |
| `SessionChangeHistory` | `session_change_history` |
| `SessionEvidence` | `session_evidences` |

```mermaid
erDiagram
    TutoringRequest {
        string id PK
        datetime created_at
        string student_id FK
        string requested_by_id FK
        string source
        string instructor_name "nulo"
        string course_name "nulo"
        string case_type
        string reason
        string routed_to_id FK
        string routed_to_role
        string status
        string response_note "nulo"
        string handled_by_id "nulo"
        datetime handled_at "nulo"
        string session_id "nulo"
        string referral_id "nulo"
    }
    Session {
        string id PK
        datetime created_at
        string tutor_id FK
        string topic
        datetime scheduled_at
        int duration_minutes
        datetime ends_at
        string modality
        string location "nulo"
        string meeting_link "nulo"
        datetime cancelled_at "nulo"
        string cancel_reason "nulo"
    }
    SessionParticipant {
        string id PK
        string session_id FK
        string student_id FK
        boolean attended "nulo"
    }
    SessionAttendance {
        string id PK
        string session_id FK, UK
        int sequence_number
        datetime confirmed_at
        datetime created_at
        string tutor_id "nulo"
        string student_id "nulo"
        string period_id "nulo"
    }
    SessionChangeHistory {
        string id PK
        datetime created_at
        string session_id FK
        string change_type
        string reason
        datetime previous_scheduled_at "nulo"
        datetime new_scheduled_at "nulo"
        string changed_by_id FK
    }
    SessionEvidence {
        string id PK
        datetime created_at
        string session_id FK
        string file_name
        string mime_type
        int file_size
        string storage_key
        string uploaded_by_id FK
    }
    Session ||--o{ SessionAttendance : "session"
    Session ||--o{ SessionChangeHistory : "session"
    Session ||--o{ SessionEvidence : "session"
    Session ||--o{ SessionParticipant : "session"
    Student ||--o{ SessionParticipant : "student"
    Student ||--o{ TutoringRequest : "student"
    User ||--o{ Session : "tutor"
    User ||--o{ SessionChangeHistory : "changedBy"
    User ||--o{ SessionEvidence : "uploadedBy"
    User ||--o{ TutoringRequest : "requestedBy"
    User ||--o{ TutoringRequest : "routedTo"
```

## ER-05 · Derivaciones, avisos y documentos

| Modelo | Tabla |
| --- | --- |
| `StudentReferral` | `student_referrals` |
| `ReferralStatusHistory` | `referral_status_history` |
| `Notification` | `notifications` |
| `EmailOutbox` | `email_outbox` |
| `SignedDocument` | `signed_documents` |

```mermaid
erDiagram
    StudentReferral {
        string id PK
        datetime created_at
        string student_id FK
        string referred_by_id FK
        string_arr checked_aspects
        string reason
        string service
        string receiving_instance "nulo"
        string status
    }
    ReferralStatusHistory {
        string id PK
        datetime created_at
        string referral_id FK
        string status
        string notes "nulo"
        string changed_by_id FK
    }
    Notification {
        string id PK
        datetime created_at
        string user_id FK
        string type
        string message
        string referral_id FK "nulo"
        string tutoring_request_id FK "nulo"
        string session_id FK "nulo"
        boolean read
    }
    EmailOutbox {
        string id PK
        datetime created_at
        string notification_id FK, UK
        string status
        int attempts
        datetime next_attempt_at
        string last_error "nulo"
        datetime sent_at "nulo"
    }
    SignedDocument {
        string id PK
        datetime created_at
        string kind
        string referral_id FK "nulo"
        string student_id FK "nulo"
        string period_id FK "nulo"
        string file_name
        string mime_type
        int file_size
        string storage_key
        string sha256
        string uploaded_by_id FK
    }
    AcademicPeriod |o--o{ SignedDocument : "period"
    Notification ||--o{ EmailOutbox : "notification"
    Session |o--o{ Notification : "session"
    Student |o--o{ SignedDocument : "student"
    Student ||--o{ StudentReferral : "student"
    StudentReferral |o--o{ Notification : "referral"
    StudentReferral ||--o{ ReferralStatusHistory : "referral"
    StudentReferral |o--o{ SignedDocument : "referral"
    TutoringRequest |o--o{ Notification : "tutoringRequest"
    User ||--o{ Notification : "user"
    User ||--o{ ReferralStatusHistory : "changedBy"
    User ||--o{ SignedDocument : "uploadedBy"
    User ||--o{ StudentReferral : "referredBy"
```

## ER-06 · Evaluación, planes, informes y pedidos de listas

| Modelo | Tabla |
| --- | --- |
| `TutorEvaluation` | `tutor_evaluations` |
| `EvaluationWindow` | `evaluation_windows` |
| `WorkPlan` | `work_plans` |
| `WorkPlanVersion` | `work_plan_versions` |
| `TutorSemesterReport` | `tutor_semester_reports` |
| `DataRequest` | `data_requests` |

```mermaid
erDiagram
    TutorEvaluation {
        string id PK
        datetime created_at
        string student_id FK
        string tutor_id FK
        string period_id FK
        string_arr scores
        string likes "nulo"
        string dislikes "nulo"
    }
    EvaluationWindow {
        string id PK
        datetime created_at
        datetime updated_at
        string period_id FK
        string school_id FK
        boolean is_open
    }
    WorkPlan {
        string id PK
        datetime created_at
        datetime updated_at
        string period_id FK
        string school_id FK
        string author_id FK
        string introduction
        string denomination
        string event_type
        string execution_date
        string schedule
        string place
        string modality
        string organizers
        string support_unit
        string foundation
        string general_objective
        string_arr specific_objectives
        string target_audience
        string methodology
        json planning
        json programming
        json physical_resources
        json human_resources
        json budget
        json operational_activities
        string resolution_file_name "nulo"
        int resolution_file_size "nulo"
        string resolution_storage_key "nulo"
        datetime resolution_uploaded_at "nulo"
        int revision
    }
    WorkPlanVersion {
        string id PK
        datetime created_at
        string work_plan_id FK
        int revision
        string author_id
        json content
        string resolution_file_name
        int resolution_file_size
        string resolution_storage_key
        datetime resolution_uploaded_at
    }
    TutorSemesterReport {
        string id PK
        datetime created_at
        datetime updated_at
        string period_id FK
        string tutor_id FK
        string program_name
        string faculty
        string teacher_category
        string tutoring_cycles
        string phone
        json individual
        json group
    }
    DataRequest {
        string id PK
        datetime created_at
        string period_id FK
        string school_id FK "nulo"
        string faculty_id FK "nulo"
        string faculty_name "nulo"
        string_arr school_names
        string kind
        string to_email
        int_arr cycles
        string note "nulo"
        string requested_by_id FK
        string status
        string error "nulo"
        datetime received_at "nulo"
        string received_by_id "nulo"
        string operation_id "nulo"
        string content_hash "nulo"
        string equivalence_key "nulo"
        string resend_of_id FK "nulo"
        datetime attempt_started_at "nulo"
    }
    AcademicPeriod ||--o{ DataRequest : "period"
    AcademicPeriod ||--o{ EvaluationWindow : "period"
    AcademicPeriod ||--o{ TutorEvaluation : "period"
    AcademicPeriod ||--o{ TutorSemesterReport : "period"
    AcademicPeriod ||--o{ WorkPlan : "period"
    DataRequest |o--o{ DataRequest : "resendOf"
    Faculty |o--o{ DataRequest : "faculty"
    School |o--o{ DataRequest : "school"
    School ||--o{ EvaluationWindow : "school"
    School ||--o{ WorkPlan : "school"
    Student ||--o{ TutorEvaluation : "student"
    User ||--o{ DataRequest : "requestedBy"
    User ||--o{ TutorEvaluation : "tutor"
    User ||--o{ TutorSemesterReport : "tutor"
    User ||--o{ WorkPlan : "author"
    WorkPlan ||--o{ WorkPlanVersion : "workPlan"
```

## ER-07 · Certificación del docente tutor (demostración)

| Modelo | Tabla |
| --- | --- |
| `Certificate` | `certificates` |
| `CertificateEvidence` | `certificate_evidences` |
| `CertificateSequence` | `certificate_sequences` |
| `CertificateTemplate` | `certificate_templates` |
| `CommitteeResolution` | `committee_resolutions` |
| `CertificateVisualAsset` | `certificate_visual_assets` |
| `CertificateSchoolSettings` | `certificate_school_settings` |

```mermaid
erDiagram
    Certificate {
        string id PK
        datetime created_at
        datetime updated_at
        string period_id FK
        string school_id FK
        string tutor_id FK
        string assignment_id FK "nulo"
        string created_by_id FK
        string status
        boolean is_demo
        string number UK "nulo"
        string template_id FK "nulo"
        json snapshot "nulo"
        string unsigned_sha256 "nulo"
        string unsigned_storage_key "nulo"
        string approved_by_id FK "nulo"
        datetime approved_at "nulo"
        string voided_by_id FK "nulo"
        datetime voided_at "nulo"
        string void_reason "nulo"
        string review_note "nulo"
    }
    CertificateEvidence {
        string id PK
        datetime created_at
        string certificate_id FK
        string kind
        string ref "nulo"
        string result
        string comment "nulo"
        string reviewed_by_id FK "nulo"
        datetime reviewed_at "nulo"
    }
    CertificateSequence {
        string scope PK
        int year PK
        int last
    }
    CertificateTemplate {
        string id PK
        datetime created_at
        string name
        int version
        boolean is_demo
        boolean is_active
        string title
        string body_text
        json config
    }
    CommitteeResolution {
        string id PK
        datetime created_at
        string period_id FK
        string school_id FK
        string number
        datetime issued_on
        string created_by_id FK
    }
    CertificateVisualAsset {
        string key PK
        bytes content
    }
    CertificateSchoolSettings {
        string school_id PK, FK
        string department "nulo"
        string signatory_name "nulo"
        string signatory_role "nulo"
        datetime updated_at
    }
    AcademicPeriod ||--o{ Certificate : "period"
    AcademicPeriod ||--o{ CommitteeResolution : "period"
    Certificate ||--o{ CertificateEvidence : "certificate"
    CertificateTemplate |o--o{ Certificate : "template"
    CycleTutorAssignment |o--o{ Certificate : "assignment"
    School ||--o{ Certificate : "school"
    School ||--o{ CertificateSchoolSettings : "school"
    School ||--o{ CommitteeResolution : "school"
    User |o--o{ Certificate : "approvedBy"
    User ||--o{ Certificate : "createdBy"
    User ||--o{ Certificate : "tutor"
    User |o--o{ Certificate : "voidedBy"
    User |o--o{ CertificateEvidence : "reviewedBy"
    User ||--o{ CommitteeResolution : "createdBy"
```
