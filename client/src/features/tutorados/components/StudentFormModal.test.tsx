import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentFormModal } from './StudentFormModal';
import type { School } from '../services/schoolService';

const schools: School[] = [
  { id: 'school-1', name: 'Ingeniería de Sistemas', facultyId: 'fac-1', isActive: true },
];

function setup() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <StudentFormModal
      onClose={onClose}
      onSubmit={onSubmit}
      studentToEdit={null}
      schools={schools}
    />,
  );
  return { onSubmit, onClose };
}

describe('StudentFormModal', () => {
  beforeEach(() => sessionStorage.clear());

  it('recupera lo escrito al volver a abrir el formulario y se puede descartar', async () => {
    const user = userEvent.setup();
    const modal = <StudentFormModal onClose={vi.fn()} onSubmit={vi.fn()} studentToEdit={null} schools={schools} draftOwnerId="u1" />;
    const first = render(modal);
    await user.type(screen.getByLabelText(/código universitario/i), '20240001');
    first.unmount();

    render(modal);
    expect(screen.getByLabelText(/código universitario/i)).toHaveValue('20240001');
    await user.click(screen.getByRole('button', { name: /descartar borrador/i }));
    expect(screen.getByLabelText(/código universitario/i)).toHaveValue('');
  });

  it('rechaza un código universitario con formato inválido', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText(/código universitario/i), '123'); // muy corto
    await user.type(screen.getByLabelText(/nombres/i), 'Ana');
    await user.type(screen.getByLabelText(/apellidos/i), 'Torres');
    await user.type(screen.getByLabelText(/ciclo/i), '5');
    await user.selectOptions(screen.getByLabelText(/escuela profesional/i), 'school-1');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText(/entre 8 y 12 dígitos/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía los datos de filiación cuando el formulario es válido', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText(/código universitario/i), '20191234');
    await user.type(screen.getByLabelText(/nombres/i), 'Ana');
    await user.type(screen.getByLabelText(/apellidos/i), 'Torres');
    await user.type(screen.getByLabelText(/ciclo/i), '5');
    await user.selectOptions(screen.getByLabelText(/escuela profesional/i), 'school-1');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        studentCode: '20191234',
        firstName: 'Ana',
        lastName: 'Torres',
        email: undefined,
        phone: undefined,
        cycle: 5,
        schoolId: 'school-1',
      });
    });
  });
});
