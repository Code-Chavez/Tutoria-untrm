import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitationDialog } from './InvitationDialog';

const invitation = { link: 'https://sit.example.test/activar-cuenta/abc123', expiresAt: '2026-10-18T12:00:00.000Z', emailSent: true };

describe('InvitationDialog (acceso único)', () => {
  it('con el correo enviado avisa que no se generó ninguna clave y muestra el enlace de un solo uso', () => {
    render(<InvitationDialog email="ana@untrm.edu.pe" invitation={invitation} onClose={vi.fn()} />);

    expect(screen.getByText('ana@untrm.edu.pe')).toBeInTheDocument();
    expect(screen.getByText(/No se generó ninguna clave/)).toBeInTheDocument();
    expect(screen.getByLabelText('Enlace de activación')).toHaveTextContent('https://sit.example.test/activar-cuenta/abc123');
    expect(screen.getByText(/una sola vez/i)).toBeInTheDocument();
  });

  it('si el correo no salió, lo dice como alerta y pide entregar el enlace por un medio privado', () => {
    render(<InvitationDialog email="ana@untrm.edu.pe" invitation={{ ...invitation, emailSent: false }} onClose={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo enviar el correo/);
    expect(screen.getByRole('alert')).toHaveTextContent(/medio privado/);
  });

  it('se cierra con «Entendido»', async () => {
    const onClose = vi.fn();
    render(<InvitationDialog email="ana@untrm.edu.pe" invitation={invitation} onClose={onClose} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entendido' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
