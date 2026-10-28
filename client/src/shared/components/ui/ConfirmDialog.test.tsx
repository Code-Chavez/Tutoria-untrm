import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

function Host({ onConfirm = vi.fn(), loading = false, removeOpenerOnOpen = false }: { onConfirm?: () => void; loading?: boolean; removeOpenerOnOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showOpener, setShowOpener] = useState(true);
  return (
    <div>
      <main>
        {showOpener && (
          <button
            onClick={() => {
              setOpen(true);
              if (removeOpenerOnOpen) setShowOpener(false);
            }}
          >
            Desactivar a Ana
          </button>
        )}
        <button>Otro botón de la página</button>
      </main>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="Desactivar usuario"
        message="¿Confirmas desactivar a Ana?"
        confirmLabel="Desactivar"
        loading={loading}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

describe('ConfirmDialog (F1: foco y teclado)', () => {
  it('al abrirse el foco entra en el diálogo, en «Cancelar», y no ejecuta la acción', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Host onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Desactivar a Ana' }));

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('tiene nombre accesible (título) y descripción (mensaje)', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Desactivar a Ana' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Desactivar usuario' });
    expect(dialog).toHaveAccessibleDescription('¿Confirmas desactivar a Ana?');
  });

  it('Tab y Shift+Tab no salen del diálogo', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Desactivar a Ana' }));
    const dialog = screen.getByRole('alertdialog');

    await user.tab();
    expect(screen.getByRole('button', { name: 'Desactivar' })).toHaveFocus();
    await user.tab(); // del último vuelve al primero
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.tab({ shift: true }); // del primero va al último
    expect(screen.getByRole('button', { name: 'Desactivar' })).toHaveFocus();
    for (let i = 0; i < 5; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('el contenido de fondo queda inerte mientras está abierto y se restablece al cerrar', async () => {
    const user = userEvent.setup();
    const { container } = render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Desactivar a Ana' }));

    expect(container).toHaveAttribute('inert');
    // jsdom no aplica `inert` al árbol de accesibilidad ni al foco: eso se comprobó en un navegador real (ver informe).

    await user.keyboard('{Escape}');
    expect(container).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Otro botón de la página' })).toBeInTheDocument();
  });

  it('Escape cancela y el foco vuelve al botón que lo abrió', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Desactivar a Ana' });
    await user.click(opener);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('el fondo deja de ser inerte ANTES de devolver el foco al botón que abrió el diálogo (un elemento inerte no puede recibir el foco)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Host />);
    const opener = screen.getByRole('button', { name: 'Desactivar a Ana' });
    await user.click(opener);
    let inertAtRestore: boolean | null = null;
    vi.spyOn(opener, 'focus').mockImplementation(() => {
      inertAtRestore = container.hasAttribute('inert');
    });
    await user.keyboard('{Escape}');

    expect(inertAtRestore).toBe(false);
  });

  it('«Cancelar» con el teclado también devuelve el foco al botón que lo abrió', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Desactivar a Ana' });
    await user.click(opener);
    await user.keyboard('{Enter}'); // «Cancelar» tiene el foco inicial

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('confirmar solo ocurre por una acción explícita sobre «Desactivar»', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Host onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Desactivar a Ana' }));
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('si el botón que lo abrió ya no existe, cierra sin error y sin llevar el foco a otro control', async () => {
    const user = userEvent.setup();
    render(<Host removeOpenerOnOpen />);
    await user.click(screen.getByRole('button', { name: 'Desactivar a Ana' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Otro botón de la página' })).not.toHaveFocus();
  });

  it('cargando: la operación no se puede cancelar (Escape, fondo y «Cancelar» sin efecto) y el foco no se pierde', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Desactivar a Ana' }));
    await user.tab(); // «Desactivar» con el foco
    rerender(<Host loading />);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(dialog).toHaveFocus(); // el botón con foco se deshabilitó: el foco queda en el diálogo

    await user.keyboard('{Escape}');
    await user.click(dialog.parentElement as HTMLElement); // clic en el fondo
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('alertdialog').contains(document.activeElement)).toBe(true);
  });

  describe('confirmación recién pulsada, antes de que el padre active `loading`', () => {
    const Controlled = ({ loading, onConfirm, onCancel }: { loading: boolean; onConfirm: () => void; onCancel: () => void }) => (
      <ConfirmDialog open tone="danger" title="Desactivar usuario" message="¿Confirmas?" confirmLabel="Desactivar" loading={loading} onConfirm={onConfirm} onCancel={onCancel} />
    );

    it('Escape, el fondo y «Cancelar» no cancelan en ese intervalo, un segundo «confirmar» no repite, y al terminar la operación vuelven a funcionar', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const { rerender } = render(<Controlled loading={false} onConfirm={onConfirm} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
      // La petición ya salió pero el padre todavía no pasó `loading` a verdadero.
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      fireEvent.click(screen.getByRole('alertdialog').parentElement as HTMLElement);
      fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
      expect(onCancel).not.toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalledTimes(1);

      rerender(<Controlled loading onConfirm={onConfirm} onCancel={onCancel} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCancel).not.toHaveBeenCalled();

      rerender(<Controlled loading={false} onConfirm={onConfirm} onCancel={onCancel} />); // la operación terminó
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('si el padre nunca activa `loading` (confirmación síncrona), el diálogo vuelve a poder cancelarse tras el margen', () => {
      vi.useFakeTimers();
      try {
        const onCancel = vi.fn();
        render(<Controlled loading={false} onConfirm={vi.fn()} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCancel).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
