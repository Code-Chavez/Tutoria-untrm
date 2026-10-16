import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserTable } from './UserTable';
import type { User } from '../services/userService';

const user = (over: Partial<User> = {}): User => ({ id: 'u1', email: 'ana@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', roleId: 'r1', isActive: true, ...over });

const renderTable = (users: User[], onReissueInvitation = vi.fn()) =>
  render(<UserTable users={users} roleName={() => 'Docente'} onEdit={vi.fn()} onToggleStatus={vi.fn()} onReissueInvitation={onReissueInvitation} />);

describe('UserTable: cuentas pendientes de activación', () => {
  it('distingue activa, pendiente de activación e inactiva', () => {
    renderTable([user({ id: '1' }), user({ id: '2', mustChangePassword: true }), user({ id: '3', isActive: false })]);

    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de activación')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('solo la cuenta pendiente ofrece emitir una invitación nueva, y lo hace para esa cuenta', async () => {
    const onReissue = vi.fn();
    renderTable([user({ id: '1' }), user({ id: '2', email: 'pendiente@untrm.edu.pe', mustChangePassword: true })], onReissue);

    const buttons = screen.getAllByRole('button', { name: 'Emitir invitación nueva' });
    expect(buttons).toHaveLength(1);
    await userEvent.setup().click(buttons[0]);

    expect(onReissue).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
  });
});
