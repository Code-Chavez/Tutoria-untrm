import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TutoradoTable } from './TutoradoTable';
import type { Student } from '../services/studentService';

const student = {
  id: 's1',
  studentCode: '20191234',
  firstName: 'Ana',
  lastName: 'Torres',
  cycle: 5,
  isAtRisk: false,
  isActive: true,
  schoolId: 'sc1',
  tutorId: 't1',
  userId: null,
} as unknown as Student;

const handlers = () => ({
  onEdit: vi.fn(),
  onMarkRisk: vi.fn(),
  onUnmarkRisk: vi.fn(),
  onReassign: vi.fn(),
  onRegisterInterview: vi.fn(),
  onViewRecord: vi.fn(),
  onRequestTutoring: vi.fn(),
  onScheduleSession: vi.fn(),
  onLinkAccount: vi.fn(),
  onRegisterFollowUp: vi.fn(),
  onDeriveCase: vi.fn(),
});

const renderTable = (role: { canWrite: boolean; canConductInterview: boolean }, h = handlers()) => {
  render(
    <TutoradoTable
      students={[student]}
      schoolName={() => 'Sistemas'}
      tutorName={() => 'Elena'}
      {...role}
      {...h}
    />,
  );
  return h;
};

const menuLabels = async () => {
  await userEvent.setup().click(screen.getByRole('button', { name: /Más acciones de Ana Torres/ }));
  return screen.getAllByRole('menuitem').map((i) => i.textContent);
};

describe('TutoradoTable: acciones por estudiante (UI-10)', () => {
  it('el tutor ve dos botones y el resto, con etiqueta, en «Más»', async () => {
    renderTable({ canWrite: false, canConductInterview: true });
    const row = within(screen.getAllByRole('row')[1]);
    // Ver expediente y Programar sesión a la vista, más el menú: tres controles en lugar de diez iconos.
    expect(row.getAllByRole('button').filter((b) => !b.hasAttribute('aria-haspopup'))).toHaveLength(2);
    expect(await menuLabels()).toEqual([
      'Solicitar tutoría',
      'Registrar entrevista inicial',
      'Registrar seguimiento',
      'Derivar caso',
    ]);
  });

  it('coordinación ve Editar a la vista y la gestión en «Más»', async () => {
    renderTable({ canWrite: true, canConductInterview: false });
    expect(screen.getByRole('button', { name: 'Editar tutorado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Programar sesión' })).not.toBeInTheDocument();
    expect(await menuLabels()).toEqual(['Solicitar tutoría', 'Reasignar tutor', 'Vincular cuenta', 'Marcar en riesgo']);
  });

  it('la DBU (tutora y gestora) conserva todas las acciones', async () => {
    renderTable({ canWrite: true, canConductInterview: true });
    expect(await menuLabels()).toEqual([
      'Solicitar tutoría',
      'Registrar entrevista inicial',
      'Registrar seguimiento',
      'Derivar caso',
      'Editar tutorado',
      'Reasignar tutor',
      'Vincular cuenta',
      'Marcar en riesgo',
    ]);
  });

  it('elegir una acción del menú llama a su manejador con el estudiante', async () => {
    const h = renderTable({ canWrite: false, canConductInterview: true });
    await menuLabels();
    await userEvent.setup().click(screen.getByRole('menuitem', { name: 'Derivar caso' }));
    expect(h.onDeriveCase).toHaveBeenCalledWith(student);
  });

  it('un estudiante en riesgo ofrece «Quitar riesgo» y sin tutor no se puede reasignar', async () => {
    render(
      <TutoradoTable
        students={[{ ...student, isAtRisk: true, tutorId: null }]}
        schoolName={() => 'Sistemas'}
        tutorName={() => null}
        canWrite
        canConductInterview={false}
        {...handlers()}
      />,
    );
    const labels = await menuLabels();
    expect(labels).toContain('Quitar riesgo');
    expect(labels).not.toContain('Reasignar tutor');
  });
});
