import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@features/auth/context/AuthProvider';
import { LoginPage } from '@features/auth/components/LoginPage';
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AppLayout } from '@shared/components/layout/AppLayout';
import { DashboardPage } from '@features/dashboard/components/DashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
