import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserTable } from './UserTable';
import type { User } from '../services/userService';

const user = (over: Partial<User> = {}): User => ({ id: 'u1', email: 'ana@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz', roleId: 'r1', isActive: true, ...over });

const renderTable = (users: User[], onReissueInvitation = vi.fn()) =>
  render(<UserTable users={users} roleName={() => 'Docente'} onEdit={vi.fn()} onToggleStatus={vi.fn()} onAccess={vi.fn()} onReissueInvitation={onReissueInvitation} />);

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

describe('UserTable: rol y alcance', () => {
  it('cada cuenta ofrece abrir «Rol y alcance» y lo hace para esa cuenta', async () => {
    const onAccess = vi.fn();
    render(<UserTable users={[user({ id: '7' })]} roleName={() => 'Docente'} onEdit={vi.fn()} onToggleStatus={vi.fn()} onAccess={onAccess} onReissueInvitation={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Rol y alcance' }));
    expect(onAccess).toHaveBeenCalledWith(expect.objectContaining({ id: '7' }));
  });
});
