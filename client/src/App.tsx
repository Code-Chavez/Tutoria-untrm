import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@shared/services/queryClient';
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
import { AssignmentPage } from '@features/asignacion/pages/AssignmentPage';
import { ExpedienteIndexPage } from '@features/expediente/pages/ExpedienteIndexPage';
import { ExpedientePage } from '@features/expediente/pages/ExpedientePage';
import { ProfilePage } from '@features/profile/pages/ProfilePage';
import { MyTutoringRequestPage } from '@features/solicitudes/pages/MyTutoringRequestPage';
import { SessionsCalendarPage } from '@features/sesiones/pages/SessionsCalendarPage';
import { ScheduleAttendanceReportPage } from '@features/informes/pages/ScheduleAttendanceReportPage';
import { ReferralsPage } from '@features/derivaciones/pages/ReferralsPage';
import { ReferralTrackingPage } from '@features/derivaciones/pages/ReferralTrackingPage';
import { EvaluationPage } from '@features/evaluacion/pages/EvaluationPage';
import { EvaluationWindowsPage } from '@features/evaluacion/pages/EvaluationWindowsPage';
import { EvaluationStatisticsPage } from '@features/evaluacion/pages/EvaluationStatisticsPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route
                path="users"
                element={
                  <RequireRole roles={['Administrador DBU']}>
                    <UserManagementPage />
                  </RequireRole>
                }
              />
              <Route
                path="evaluacion/configuracion"
                element={
                  <RequireRole roles={['Administrador DBU']}>
                    <EvaluationWindowsPage />
                  </RequireRole>
                }
              />
              <Route
                path="evaluacion/resultados"
                element={
                  <RequireRole roles={['Administrador DBU', 'Coordinador']}>
                    <EvaluationStatisticsPage />
                  </RequireRole>
                }
              />
              <Route
                path="tutorados"
                element={
                  <RequireRole roles={['Docente Tutor', 'Coordinador', 'Administrador DBU']}>
                    <StudentsPage />
                  </RequireRole>
                }
              />
              <Route
                path="carga-masiva"
                element={
                  <RequireRole roles={['Coordinador', 'Administrador DBU']}>
                    <BulkImportPage />
                  </RequireRole>
                }
              />
              <Route
                path="asignacion"
                element={
                  <RequireRole roles={['Coordinador', 'Administrador DBU']}>
                    <AssignmentPage />
                  </RequireRole>
                }
              />
              <Route
                path="expediente"
                element={
                  <RequireRole roles={['Docente Tutor', 'Coordinador', 'Administrador DBU']}>
                    <ExpedienteIndexPage />
                  </RequireRole>
                }
              />
              <Route
                path="expediente/:id"
                element={
                  <RequireRole roles={['Docente Tutor', 'Coordinador', 'Administrador DBU']}>
                    <ExpedientePage />
                  </RequireRole>
                }
              />
              <Route
                path="sesiones"
                element={
                  <RequireRole roles={['Docente Tutor']}>
                    <SessionsCalendarPage />
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
                path="informes"
                element={
                  <RequireRole
                    roles={['Docente Tutor', 'Coordinador', 'Administrador DBU', 'Vicerrectorado']}
                  >
                    <ScheduleAttendanceReportPage />
                  </RequireRole>
                }
              />
              <Route
                path="derivaciones"
                element={
                  <RequireRole roles={['Docente Tutor', 'Profesional de Servicio', 'Administrador DBU', 'Coordinador']}>
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
    </QueryClientProvider>
  );
}
