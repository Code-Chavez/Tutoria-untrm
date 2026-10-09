import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { NotificationBell } from './NotificationBell';
import { notificationService, type AppNotification } from '../services/notificationService';

let mockRole = 'Docente Tutor';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: mockRole } }) }));
vi.mock('../services/notificationService', () => ({
  notificationService: { getNotifications: vi.fn(), markAsRead: vi.fn(), markAllAsRead: vi.fn() },
}));
const mocked = vi.mocked(notificationService);

const note = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n1',
  userId: 'u1',
  type: 'REFERRAL_CREATED',
  message: 'Nueva derivación recibida',
  referralId: null,
  tutoringRequestId: null,
  read: false,
  createdAt: new Date().toISOString(),
  ...over,
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

const renderBell = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <QueryClientTestWrapper>
        <NotificationBell />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </QueryClientTestWrapper>
    </MemoryRouter>,
  );

describe('NotificationBell (R03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'Docente Tutor';
    mocked.markAsRead.mockResolvedValue({} as AppNotification);
    mocked.markAllAsRead.mockResolvedValue(2);
  });

  it('un aviso de derivación abre ese caso concreto', async () => {
    mocked.getNotifications.mockResolvedValue([note({ referralId: 'ref-9' })]);
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByRole('button', { name: 'Notificaciones' }));
    await user.click(await screen.findByText('Nueva derivación recibida'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/derivaciones?caso=ref-9'));
  });

  it('un aviso de solicitud abre la solicitud al personal y el historial al estudiante', async () => {
    mocked.getNotifications.mockResolvedValue([note({ type: 'TUTORING_REQUEST_CREATED', message: 'Nueva solicitud', tutoringRequestId: 'r-1' })]);
    const user = userEvent.setup();
    const { unmount } = renderBell();
    await user.click(await screen.findByRole('button', { name: 'Notificaciones' }));
    await user.click(await screen.findByText('Nueva solicitud'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/solicitudes?solicitud=r-1'));
    unmount();

    mockRole = 'Tutorado';
    renderBell();
    await user.click(await screen.findByRole('button', { name: 'Notificaciones' }));
    await user.click(await screen.findByText('Nueva solicitud'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/solicitar-tutoria'));
  });

  it('«Marcar todas como leídas» las marca en pantalla y en el servidor', async () => {
    mocked.getNotifications.mockResolvedValue([note({ id: 'a' }), note({ id: 'b', message: 'Otro aviso' })]);
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByRole('button', { name: 'Notificaciones' }));
    expect(await screen.findByText('2 sin leer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));

    await waitFor(() => expect(mocked.markAllAsRead).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('2 sin leer')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Marcar todas como leídas' })).not.toBeInTheDocument();
  });
});
