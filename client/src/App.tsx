import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@features/auth/context/AuthProvider';
import { LoginPage } from '@features/auth/components/LoginPage';
import { ForgotPasswordPage } from '@features/auth/components/ForgotPasswordPage';
import { ResetPasswordPage } from '@features/auth/components/ResetPasswordPage';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AppLayout } from '@shared/components/layout/AppLayout';
import { DashboardPage } from '@features/dashboard/components/DashboardPage';
import { UserManagementPage } from '@features/admin/pages/UserManagementPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UserManagementPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
