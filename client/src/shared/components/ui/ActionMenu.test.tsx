import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionMenu } from './ActionMenu';

const setup = () => {
  const a = vi.fn();
  const b = vi.fn();
  render(
    <div>
      <button>Antes</button>
      <ActionMenu
        label="Más acciones de Ana"
        items={[
          { group: 'Acompañamiento', label: 'Solicitar tutoría', onSelect: a },
          { group: 'Gestión', label: 'Marcar en riesgo', tone: 'danger', onSelect: b },
        ]}
      />
    </div>,
  );
  return { a, b };
};

describe('ActionMenu (UI-10)', () => {
  it('abre con etiquetas visibles agrupadas y estado expandido', async () => {
    const user = userEvent.setup();
    setup();
    const trigger = screen.getByRole('button', { name: 'Más acciones de Ana' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Más acciones de Ana' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Solicitar tutoría', 'Marcar en riesgo']);
    expect(screen.getByText('Acompañamiento')).toBeInTheDocument();
    expect(screen.getByText('Gestión')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
  });

  it('se recorre solo con teclado: flechas, Enter y Escape devuelve el foco', async () => {
    const user = userEvent.setup();
    const { b } = setup();
    const trigger = screen.getByRole('button', { name: 'Más acciones de Ana' });
    trigger.focus();

    await user.keyboard('{ArrowDown}'); // abre
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Marcar en riesgo' })).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // da la vuelta
    expect(screen.getByRole('menuitem', { name: 'Solicitar tutoría' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Marcar en riesgo' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(b).not.toHaveBeenCalled();
  });

  it('elegir una opción ejecuta su acción y cierra el menú dejando el foco en el botón', async () => {
    const user = userEvent.setup();
    const { a } = setup();
    const trigger = screen.getByRole('button', { name: 'Más acciones de Ana' });
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Solicitar tutoría' }));

    expect(a).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('un clic fuera lo cierra', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Más acciones de Ana' }));
    await user.click(screen.getByRole('button', { name: 'Antes' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
