import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@shared/services/queryClient';
import { BrandingProvider } from '@shared/theme/BrandingProvider';
import { AuthProvider } from '@features/auth/context/AuthProvider';
import { LoginPage } from '@features/auth/components/LoginPage';
import { ForgotPasswordPage } from '@features/auth/components/ForgotPasswordPage';
import { ResetPasswordPage } from '@features/auth/components/ResetPasswordPage';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { RequireRole } from '@shared/components/RequireRole';
import { UnauthorizedPage } from '@shared/components/UnauthorizedPage';
import { AppLayout } from '@shared/components/layout/AppLayout';
import { DashboardPage } from '@features/dashboard/components/DashboardPage';
import { UserManagementPage } from '@features/admin/pages/UserManagementPage';
import { StudentsPage } from '@features/tutorados/pages/StudentsPage';
import { BulkImportPage } from '@features/tutorados/pages/BulkImportPage';
import { ExpedientePage } from '@features/expediente/pages/ExpedientePage';
import { ProfilePage } from '@features/profile/pages/ProfilePage';
import { MyTutoringRequestPage } from '@features/solicitudes/pages/MyTutoringRequestPage';
import { SessionsCalendarPage } from '@features/sesiones/pages/SessionsCalendarPage';
import { AuditLogPage } from '@features/auditoria/pages/AuditLogPage';
import { TutoringRequestsInboxPage } from '@features/solicitudes/pages/TutoringRequestsInboxPage';
import { MySessionsPage } from '@features/sesiones/pages/MySessionsPage';
import { ScheduleAttendanceReportPage } from '@features/informes/pages/ScheduleAttendanceReportPage';
import { SemesterReportPage } from '@features/informes/pages/SemesterReportPage';
import { ConsolidatedReportPage } from '@features/informes/pages/ConsolidatedReportPage';
import { ReferralsPage } from '@features/derivaciones/pages/ReferralsPage';
import { ReferralTrackingPage } from '@features/derivaciones/pages/ReferralTrackingPage';
import { EvaluationPage } from '@features/evaluacion/pages/EvaluationPage';
import { WorkPlanPage } from '@features/planificacion/pages/WorkPlanPage';
import { IndicatorsPage } from '@features/indicadores/pages/IndicatorsPage';
import { CatalogsPage } from '@features/catalogos/pages/CatalogsPage';
import { DataRequestPage } from '@features/pedidos/pages/DataRequestPage';
import { PeriodClosurePage } from '@features/periodo/pages/PeriodClosurePage';
import { TutorAcceptancePage } from '@features/ciclos/pages/TutorAcceptancePage';
import { AdmonitionsPage } from '@features/amonestaciones/pages/AdmonitionsPage';
import { CertificatesPage } from '@features/certificados/pages/CertificatesPage';
import { TeacherBulkImportPage } from '@features/docentes/pages/TeacherBulkImportPage';
import { SectionHome, SectionShell } from '@shared/components/layout/SectionShell';
import { RequestEmailsPage } from '@features/pedidos/pages/RequestEmailsPage';
import { CycleTutorsPage } from '@features/ciclos/pages/CycleTutorsPage';
import { PendingPage } from '@features/pendientes/pages/PendingPage';
import { ROUTE_PERMISSIONS } from '@shared/routePermissions';
import { RolesPage } from '@features/admin/pages/RolesPage';
import { CampusesPage } from '@features/sedes/pages/CampusesPage';
import { ParametersPage } from '@features/parametros/pages/ParametersPage';
import { BrandingPage } from '@features/identidad/pages/BrandingPage';
import { EvaluationWindowsPage } from '@features/evaluacion/pages/EvaluationWindowsPage';
import { EvaluationStatisticsPage } from '@features/evaluacion/pages/EvaluationStatisticsPage';
import { EvaluationSuggestionsPage } from '@features/evaluacion/pages/EvaluationSuggestionsPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/activar-cuenta/:token" element={<ResetPasswordPage mode="activate" />} />
          <Route path="/aceptar-tutoria/:token" element={<TutorAcceptancePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="reportes" element={<SectionHome section="informes" />} />
              <Route element={<SectionShell section="informes" />}>
              <Route
                path="informes"
                element={
                  <RequireRole
                    roles={['Docente Tutor', 'Coordinador', 'Administrador DBU']} permissions={ROUTE_PERMISSIONS['/informes']}
                  >
                    <ScheduleAttendanceReportPage />
                  </RequireRole>
                }
              />
              <Route
                path="informes/semestral"
                element={
                  <RequireRole roles={['Docente Tutor']} permissions={ROUTE_PERMISSIONS['/informes/semestral']}>
                    <SemesterReportPage />
                  </RequireRole>
                }
              />
              <Route
                path="informes/consolidado"
                element={
                  <RequireRole roles={['Administrador DBU', 'Vicerrectorado']} permissions={ROUTE_PERMISSIONS['/informes/consolidado']}>
                    <ConsolidatedReportPage />
                  </RequireRole>
                }
              />
              <Route
                path="indicadores"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador', 'Vicerrectorado']} permissions={ROUTE_PERMISSIONS['/indicadores']}>
                    <IndicatorsPage />
                  </RequireRole>
                }
              />
              <Route
                path="evaluacion/resultados"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador']} permissions={ROUTE_PERMISSIONS['/evaluacion/resultados']}>
                    <EvaluationStatisticsPage />
                  </RequireRole>
                }
              />
              <Route
                path="evaluacion/sugerencias"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador']} permissions={ROUTE_PERMISSIONS['/evaluacion/sugerencias']}>
                    <EvaluationSuggestionsPage />
                  </RequireRole>
                }
              />
              </Route>
              <Route path="periodo" element={<SectionHome section="periodo" />} />
              <Route path="configuracion" element={<SectionHome section="configuracion" />} />
              <Route element={<SectionShell section="periodo" />}>
              <Route
                path="pedir-listas"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador']} permissions={ROUTE_PERMISSIONS['/pedir-listas']}>
                    <DataRequestPage />
                  </RequireRole>
                }
              />
              <Route
                path="carga-masiva"
                element={
                  <RequireRole roles={['Coordinador', 'Administrador DBU']} permissions={ROUTE_PERMISSIONS['/carga-masiva']}>
                    <BulkImportPage />
                  </RequireRole>
                }
              />
              <Route
                path="carga-docentes"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/carga-docentes']}>
                    <TeacherBulkImportPage />
                  </RequireRole>
                }
              />
              <Route
                path="asignacion"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador']} permissions={ROUTE_PERMISSIONS['/asignacion']}>
                    <CycleTutorsPage />
                  </RequireRole>
                }
              />
              <Route
                path="certificados"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/certificados']}>
                    <CertificatesPage />
                  </RequireRole>
                }
              />
              <Route
                path="cierre-periodo"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/cierre-periodo']}>
                    <PeriodClosurePage />
                  </RequireRole>
                }
              />
              <Route
                path="pendientes"
                element={
                  <RequireRole roles={['Coordinador', 'Administrador DBU']} permissions={ROUTE_PERMISSIONS['/pendientes']}>
                    <PendingPage />
                  </RequireRole>
                }
              />
              </Route>
              <Route element={<SectionShell section="configuracion" />}>
              <Route
                path="correos-escuelas"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador']} permissions={ROUTE_PERMISSIONS['/correos-escuelas']}>
                    <RequestEmailsPage />
                  </RequireRole>
                }
              />
              <Route
                path="sedes"
                element={
                  <RequireRole roles={['Administrador DBU', 'Vicerrectorado']} permissions={ROUTE_PERMISSIONS['/sedes']}>
                    <CampusesPage />
                  </RequireRole>
                }
              />
              <Route
                path="evaluacion/configuracion"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/evaluacion/configuracion']}>
                    <EvaluationWindowsPage />
                  </RequireRole>
                }
              />
              <Route
                path="catalogos"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/catalogos']}>
                    <CatalogsPage />
                  </RequireRole>
                }
              />
              <Route
                path="users"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/users']}>
                    <UserManagementPage />
                  </RequireRole>
                }
              />
              <Route
                path="roles"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/roles']}>
                    <RolesPage />
                  </RequireRole>
                }
              />
              <Route
                path="parametros"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/parametros']}>
                    <ParametersPage />
                  </RequireRole>
                }
              />
              <Route
                path="identidad"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/identidad']}>
                    <BrandingPage />
                  </RequireRole>
                }
              />
              <Route
                path="auditoria"
                element={
                  <RequireRole roles={['Administrador DBU']} permissions={ROUTE_PERMISSIONS['/auditoria']}>
                    <AuditLogPage />
                  </RequireRole>
                }
              />
              </Route>
              <Route path="tutores-por-ciclo" element={<Navigate to="/asignacion" replace />} />
              <Route
                path="amonestaciones"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador', 'Decano']} permissions={ROUTE_PERMISSIONS['/amonestaciones']}>
                    <AdmonitionsPage />
                  </RequireRole>
                }
              />
              <Route
                path="plan-semestral"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador']} permissions={ROUTE_PERMISSIONS['/plan-semestral']}>
                    <WorkPlanPage />
                  </RequireRole>
                }
              />
              <Route
                path="tutorados"
                element={
                  <RequireRole roles={['Docente Tutor', 'Coordinador', 'Administrador DBU']} permissions={ROUTE_PERMISSIONS['/tutorados']}>
                    <StudentsPage />
                  </RequireRole>
                }
              />
              <Route path="expediente" element={<Navigate to="/tutorados" replace />} />
              <Route
                path="expediente/:id"
                element={
                  <RequireRole roles={['Docente Tutor', 'Coordinador', 'Administrador DBU']} permissions={ROUTE_PERMISSIONS['/tutorados']}>
                    <ExpedientePage />
                  </RequireRole>
                }
              />
              <Route
                path="sesiones"
                element={
                  <RequireRole roles={['Docente Tutor']} permissions={ROUTE_PERMISSIONS['/sesiones']}>
                    <SessionsCalendarPage />
                  </RequireRole>
                }
              />
              <Route
                path="solicitudes"
                element={
                  <RequireRole roles={['Docente Tutor', 'Coordinador', 'Administrador DBU']} permissions={ROUTE_PERMISSIONS['/solicitudes']}>
                    <TutoringRequestsInboxPage />
                  </RequireRole>
                }
              />
              <Route
                path="mis-sesiones"
                element={
                  <RequireRole roles={['Tutorado']}>
                    <MySessionsPage />
                  </RequireRole>
                }
              />
              <Route
                path="solicitar-tutoria"
                element={
                  <RequireRole roles={['Tutorado']}>
                    <MyTutoringRequestPage />
                  </RequireRole>
                }
              />
              <Route
                path="evaluar-tutoria"
                element={
                  <RequireRole roles={['Tutorado']}>
                    <EvaluationPage />
                  </RequireRole>
                }
              />
              <Route
                path="derivaciones"
                element={
                  <RequireRole roles={['Docente Tutor', 'Profesional de Servicio', 'Administrador DBU']} permissions={ROUTE_PERMISSIONS['/derivaciones']}>
                    <ReferralsPage />
                  </RequireRole>
                }
              />
              <Route
                path="derivaciones/seguimiento"
                element={
                  <RequireRole roles={['Administrador DBU']}>
                    <ReferralTrackingPage />
                  </RequireRole>
                }
              />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="unauthorized" element={<UnauthorizedPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}
