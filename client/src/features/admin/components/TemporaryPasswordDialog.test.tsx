import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog';

describe('TemporaryPasswordDialog', () => {
  it('muestra la clave temporal y a quién entregarla, y avisa que se ve una sola vez', () => {
    render(<TemporaryPasswordDialog email="ana@untrm.edu.pe" temporaryPassword="Ab3dEf7hJk9m" onClose={vi.fn()} />);

    expect(screen.getByLabelText('Clave temporal')).toHaveTextContent('Ab3dEf7hJk9m');
    expect(screen.getByText('ana@untrm.edu.pe')).toBeInTheDocument();
    expect(screen.getByText(/una sola vez/i)).toBeInTheDocument();
  });

  it('se cierra con «Entendido»', async () => {
    const onClose = vi.fn();
    render(<TemporaryPasswordDialog email="ana@untrm.edu.pe" temporaryPassword="Ab3dEf7hJk9m" onClose={onClose} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entendido' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
