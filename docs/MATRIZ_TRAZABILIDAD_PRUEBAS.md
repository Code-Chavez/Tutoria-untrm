# Matriz de trazabilidad de pruebas (TT-100)

Relaciona cada historia de usuario (HU) con las pruebas que la verifican. Es el punto de partida del Sprint 6 y se actualiza
cuando cambia una HU o una prueba.

**Cómo leerla**

- **Servidor:** pruebas de `server/tests` (`unit/`, `integration/`, `http/`). Las de `integration/` y `http/` usan la base real sembrada.
- **Cliente:** pruebas de `client/src` (Vitest + Testing Library).
- **Aceptación:** paso del guion manual `docs/ACEPTACION_RELEASE_v0.4.0.md` que la recorre de punta a punta (ver también
  `docs/ACEPTACION_SECCIONES_1_6_2026-10-09.md` y `docs/ACEPTACION_SECCION7_2026-10-09.md`).
- **E2E:** recorrido de la suite de extremo a extremo (ver la sección «Recorridos E2E»). Hasta que se escriba, figura como *planificado*.
- «—» significa que esa capa no tiene cobertura **propia** para la HU; no se infiere cobertura que no se haya verificado.

## HU → pruebas

| HU | Servidor | Cliente | Aceptación | E2E |
|---|---|---|---|---|
| HU-01 Inicio de sesión | `LoginUseCase`, `authenticate`, `RefreshSessionUseCase`, `bootstrap` (int.) | `LoginPage`, `AuthProvider`, `apiClient` | 4.8, 6.4 | E2E-01 |
| HU-02 Recuperación de contraseña | `RequestPasswordResetUseCase`, `ResetPasswordUseCase`, `passwordReset` (int.) | — | 4.7 | E2E-01 |
| HU-03 Gestión de usuarios | `CreateUserUseCase`, `AssignRoleUseCase`, `accessMatrix` (int.) | — | 6.4 | E2E-08 |
| HU-04 Control de acceso por roles | `authorize`, `routeProtection` (http), `accessMatrix` (int.) | `ProtectedRoute`, `RequireRole`, `navigation`, `Sidebar` | 6.5, 6.6 | E2E-01 |
| HU-05 Información confidencial | `StudentAccessScope`, `ReferralAccessPolicy`, `accessMatrix` (int.) | — | 3.3–3.5, 6.1, 6.2 | E2E-04 |
| HU-06 Perfil y cambio de contraseña | `ChangePasswordUseCase` | `ProfilePage` | — | E2E-08 |
| HU-07 Expiración por inactividad | — | `useIdleTimer`, `apiClient` | 4.8 | E2E-01 |
| HU-08 Carga masiva desde Excel | `ExcelStudentParser`, `ImportStudentsUseCase` | `BulkImportPage` | — | E2E-08 |
| HU-09 Reporte de la carga | `ImportReportWorkbook` | `BulkImportPage` | — | E2E-08 |
| HU-10 Alta y edición de estudiantes | `CreateStudentUseCase`, `LinkStudentPortalAccountUseCase` | `StudentFormModal`, `TutoradoTable`, `LinkPortalAccountModal` | — | E2E-08 |
| HU-11 Estudiantes en riesgo | `MarkStudentRiskUseCase` | `RiskModal` | — | E2E-03 |
| HU-12 Asignación masiva | `AssignStudentsUseCase`, `GetTutorWorkloadUseCase` | `AssignmentPage` | — | E2E-08 |
| HU-13 Reasignación individual | `ReassignStudentUseCase` | `ReassignModal` | 5.4 | E2E-08 |
| HU-14 Entrevista inicial (Anexo 3) | `CreateInterviewUseCase` | `InterviewFormModal` | 2.1 | E2E-03 |
| HU-15 Red de apoyo | `UpsertSupportContactUseCase` | `ExpedientePage` | — | E2E-03 |
| HU-16 Expediente del tutorado | `GetStudentRecordUseCase` | `ExpedientePage` | 1.10, 5.5 | E2E-03 |
| HU-17 Solicitud de tutoría | `CreateTutoringRequestUseCase`, `CreateOwnTutoringRequestUseCase`, `TutoringRequestAttention`, `tutoringRequestCircuit` (int.) | `MyTutoringRequestPage`, `TutoringRequestsInboxPage`, `TutoringRequestModal` | 1.1–1.11 | E2E-02 |
| HU-18 Sesión individual | `ScheduleSessionUseCase`, `sessionValidators` | `SessionFormModal` | 2.2 | E2E-03 |
| HU-19 Sesión grupal | `ScheduleSessionUseCase` | `GroupSessionFormModal` | 2.4 | E2E-03 |
| HU-20 Presencial o virtual | `ScheduleSessionUseCase`, `sessionValidators` | `SessionDetailModal` | 2.2, 2.3 | E2E-03 |
| HU-21 Calendario de sesiones | — | `SessionsCalendarPage`, `MySessionsPage`, `calendar` | 2.2 | E2E-03 |
| HU-22 Registro de asistencia (Anexo 4) | `RegisterAttendanceUseCase`, `RecordSessionAttendanceUseCase`, `SessionOutcome`, `attendanceNumbering` (int.) | `SessionDetailModal` | 2.6–2.11 | E2E-03 |
| HU-23 Reprogramar y cancelar | `RescheduleSessionUseCase`, `CancelSessionUseCase` | `RescheduleSessionModal`, `CancelSessionModal` | 2.5 | E2E-03 |
| HU-24 Ficha de seguimiento (Anexo 5) | `CreateFollowUpUseCase` | `FollowUpFormModal` | 2.8 | E2E-03 |
| HU-25 Evidencias | `UploadSessionEvidenceUseCase`, `ListSessionEvidenceUseCase`, `GetSessionEvidenceFileUseCase` | `SessionDetailModal` | — | E2E-03 |
| HU-26 Alertas de inasistencia y riesgo | `GetRiskAlertsUseCase` | `RiskAlerts` | — | E2E-03 |
| HU-27 Consolidado de horarios y asistencia | `GetScheduleAttendanceReportUseCase`, `ScheduleAttendanceReportPdf`, `…Workbook` | `ScheduleAttendanceReportPage` | 5.2 | E2E-05 |
| HU-28 Ficha de derivación (Anexo 6) | `CreateReferralUseCase`, `GetReferralConstanciaUseCase`, `ReferralConstanciaPdf`, `signedDocuments` (int.) | `ReferralFormModal`, `SignedDocumentsPanel` | 3.1, 3.7, 3.8 | E2E-04 |
| HU-29 Enrutamiento por servicio | `suggestReferralService`, `CreateReferralUseCase` | `ReferralFormModal` | 3.1 | E2E-04 |
| HU-30 Visibilidad restringida | `ReferralAccessPolicy`, `GetReferralByIdUseCase`, `accessMatrix` (int.) | `ReferralsPage` | 3.2–3.5 | E2E-04 |
| HU-31 Estados del caso | `UpdateReferralStatusUseCase` | `ReferralDetailModal` | 3.6 | E2E-04 |
| HU-32 Atención y cierre | `UpdateReferralStatusUseCase` | `ReferralDetailModal` | 3.6 | E2E-04 |
| HU-33 Notificaciones | `GetNotificationsUseCase`, `MarkNotificationReadUseCase`, `MarkAllNotificationsReadUseCase`, `notificationLifecycle` (int.) | `NotificationBell` | 1.2, 1.8, 3.1, 3.2 | E2E-02 |
| HU-34 Seguimiento por la DBU | `GetReferralTrackingUseCase` | `ReferralsPage` | 3.9 | E2E-04 |
| HU-35 Historial de derivaciones | `GetStudentRecordUseCase` | `ExpedientePage` | 5.5 | E2E-04 |
| HU-36 Cuestionario de evaluación | `SubmitEvaluationUseCase`, `GetEvaluationStatusUseCase` | `EvaluationPage` | 4.5 | E2E-07 |
| HU-37 Anonimato y agregados | `GetEvaluationStatisticsUseCase`, `GetEvaluationResultsUseCase` | — | 4.6 | E2E-07 |
| HU-38 Habilitación por periodo | `SetEvaluationWindowUseCase`, `ListEvaluationWindowsUseCase` | `EvaluationPage` | 4.4 | E2E-07 |
| HU-39 Resultados estadísticos | `GetEvaluationStatisticsUseCase`, `GetEvaluationResultsUseCase` | — | 4.6 | E2E-07 |
| HU-40 Sugerencias abiertas | `GetEvaluationSuggestionsUseCase` | — | — | E2E-07 |
| HU-41 Plan de trabajo (Anexo 8) | `WorkPlanUseCases`, `WorkPlanRevisions` | `WorkPlanPage` | 4.1, 4.3 | E2E-06 |
| HU-42 Resolución de aprobación | `WorkPlanResolutionUseCases` | `WorkPlanResolutionCard` | 4.2 | E2E-06 |
| HU-43 Informe semestral (Anexo 9) | `SemesterReportUseCases` | `SemesterReportPage` | 5.1 | E2E-05 |
| HU-44 Consolidado por escuela y facultad | `GetConsolidatedReportUseCase` | `ConsolidatedReportPage` | 5.3 | E2E-05 |
| HU-45 Tablero de indicadores | `GetIndicatorsUseCase` | `IndicatorsPage` | 5.3 | E2E-05 |
| HU-46 Exportación de reportes | `BrandedExport`, `ExportBuilders`, `ExportController` | `ExportButtons`, `downloadFile` | 5.2, 5.3, 5.5 | E2E-05 |
| HU-47 Filtros de reportes | `ReportFilters` | `ReportFilters` (shared) | — | E2E-05 |
| HU-48 Catálogos maestros | `CatalogUseCases` | `CatalogsPage` | 2.10 | E2E-08 |
| HU-49 Parámetros y paneles por rol | `SystemParameterUseCases`, `GetHomePanelUseCase` | `ParametersPage`, `DashboardPage` | 6.5 | E2E-01 |
| HU-50 Identidad visual | `BrandingUseCases` | `BrandingPage`, `BrandingProvider`, `palette` | — | E2E-08 |

**Trabajo transversal (no es una HU):** auditoría (`AuditLogUseCases`, `auditEntry`; cliente `AuditLogPage`), configuración de producción
(`productionConfig`), respaldo y restauración (CI «Backup — Restore drill»; aceptación 7.1–7.7).

## Recorridos E2E (planificados)

| Id | Recorrido | HU |
|---|---|---|
| E2E-01 | Ingreso por rol, menú y panel de inicio, recuperación de contraseña, cierre por inactividad | 01, 02, 04, 07, 49 |
| E2E-02 | Solicitud de tutoría del estudiante → bandeja del tutor → atención → respuesta visible; avisos | 17, 33 |
| E2E-03 | Entrevista, sesión individual y grupal, asistencia y tope, cancelación, expediente, alertas | 11, 14–16, 18–26 |
| E2E-04 | Derivación a un servicio → atención → cierre → constancia; visibilidad por rol; seguimiento DBU | 05, 28–35 |
| E2E-05 | Informe semestral, consolidado, indicadores y exportaciones | 27, 43–47 |
| E2E-06 | Plan semestral → resolución → revisión del plan aprobado | 41, 42 |
| E2E-07 | Habilitar evaluación → responder → resultados anónimos | 36–40 |
| E2E-08 | Administración: usuarios, catálogos, carga masiva, asignación, identidad visual, perfil | 03, 06, 08–10, 12, 13, 48, 50 |

## Huecos detectados al armar la matriz

- **Sin prueba propia en el servidor:** HU-07 (solo cliente) y HU-21 (solo cliente).
- **Sin prueba propia en el cliente:** HU-02, HU-03, HU-05, HU-37, HU-39 y HU-40 (pantallas de recuperación, usuarios y resultados de evaluación).
- **Sin paso en el guion de aceptación:** HU-06, 08, 09, 10, 11, 12, 15, 25, 26, 40, 47 y 50.

Los recorridos E2E-03, E2E-07 y E2E-08 están pensados para cerrar la mayoría de estos huecos.
