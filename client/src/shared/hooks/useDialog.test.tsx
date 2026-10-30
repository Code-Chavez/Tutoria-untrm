import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useDialog } from './useDialog';

function Dialog({ onClose }: { onClose: () => void }) {
  const ref = useDialog(onClose);
  return (
    <div role="dialog" aria-modal="true" aria-label="Nuevo" ref={ref} tabIndex={-1}>
      <button aria-label="Cerrar" onClick={onClose} />
      <input aria-label="Nombre" />
      <button>Guardar</button>
    </div>
  );
}

function Host() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <button>Fuera</button>
      {open && <Dialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function HostWithPendingOpener() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <div>
      <button
        disabled={pending}
        onClick={(event) => {
          setPending(true); // como un botón `loading`: se deshabilita y el navegador le quita el foco (jsdom no lo hace solo)
          event.currentTarget.blur();
          setTimeout(() => {
            setOpen(true);
            setPending(false);
          }, 0);
        }}
      >
        Enviar
      </button>
      {open && <Dialog onClose={() => setOpen(false)} />}
    </div>
  );
}

describe('useDialog (UI-06)', () => {
  it('lleva el foco al primer campo, lo mantiene dentro con Tab y lo devuelve al cerrar con Escape', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);

    expect(screen.getByLabelText('Nombre')).toHaveFocus();

    await user.tab(); // Guardar
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus();
    await user.tab(); // vuelve al inicio del diálogo, no a «Fuera»
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Escape llama a onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Dialog onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('si el botón que abre el diálogo se deshabilitó mientras corría la petición, el foco vuelve a él al cerrar', async () => {
    const user = userEvent.setup();
    render(<HostWithPendingOpener />);
    const opener = screen.getByRole('button', { name: 'Enviar' });
    await user.click(opener);
    await screen.findByRole('dialog');
    expect(document.activeElement).not.toBe(opener); // el diálogo tomó el foco

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
