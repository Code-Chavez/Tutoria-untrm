import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterviewFormModal } from './InterviewFormModal';
import type { Student } from '@features/tutorados/services/studentService';

vi.mock('@features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { firstName: 'Elena', lastName: 'Ramírez', role: 'Docente Tutor' },
  }),
}));

const student: Student = {
  id: 's1',
  studentCode: '20191234',
  firstName: 'Ana',
  lastName: 'Torres',
  email: null,
  phone: null,
  cycle: 5,
  isAtRisk: false,
  isActive: true,
  schoolId: 'school-1',
};

async function goToStep(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: /siguiente/i }));
  }
}

describe('InterviewFormModal', () => {
  it('exige al menos un motivo antes de avanzar', async () => {
    const user = userEvent.setup();
    render(
      <InterviewFormModal
        student={student}
        schoolName="Ingeniería de Sistemas"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Paso 0 (Filiación) → paso 1 (Red de apoyo, opcional) → paso 2 (Motivo)
    await goToStep(user, 2);
    // Intenta avanzar sin marcar motivo
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    // La ayuda de la sección también menciona "motivo"; el mensaje de error
    // termina en punto sin la referencia al Anexo, lo que lo distingue.
    expect(await screen.findByText(/marca al menos un motivo de la entrevista\.$/i)).toBeInTheDocument();
  });

  it('recorre el flujo completo y confirma con el usuario autenticado', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <InterviewFormModal
        student={student}
        schoolName="Ingeniería de Sistemas"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await goToStep(user, 2); // Filiación → Red de apoyo (se deja vacía) → Motivo
    await user.click(screen.getByLabelText(/^académica$/i));
    await goToStep(user, 1); // → Aspectos
    await user.type(screen.getByLabelText(/aspectos tratados/i), 'Bajo rendimiento en Cálculo');
    await goToStep(user, 1); // → Acuerdos

    expect(screen.getByText(/elena ramírez/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/acuerdos tomados/i), 'Tutorías de reforzamiento semanales');
    await user.click(screen.getByRole('button', { name: /registrar entrevista/i }));

    // La sección de red de apoyo quedó vacía, así que no se envía ese contacto.
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        motiveAcademic: true,
        motivePersonalEmotional: false,
        motiveVocational: false,
        aspectsDiscussed: 'Bajo rendimiento en Cálculo',
        agreements: 'Tutorías de reforzamiento semanales',
      }),
      undefined,
    );
  });

  it('exige apellidos, vínculo y celular si se empieza a llenar la red de apoyo', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <InterviewFormModal
        student={student}
        schoolName="Ingeniería de Sistemas"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await goToStep(user, 1); // → Red de apoyo
    await user.type(screen.getByLabelText(/apellidos y nombres/i), 'María Torres');
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    expect(await screen.findByText(/vínculo y celular/i)).toBeInTheDocument();
  });

  it('envía el contacto de red de apoyo cuando se completa', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <InterviewFormModal
        student={student}
        schoolName="Ingeniería de Sistemas"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await goToStep(user, 1); // → Red de apoyo
    await user.type(screen.getByLabelText(/apellidos y nombres/i), 'María Torres');
    await user.type(screen.getByLabelText(/parentesco/i), 'Madre');
    await user.type(screen.getByLabelText(/celular/i), '987654321');
    await goToStep(user, 1); // → Motivo
    await user.click(screen.getByLabelText(/^académica$/i));
    await goToStep(user, 1); // → Aspectos
    await user.type(screen.getByLabelText(/aspectos tratados/i), 'Bajo rendimiento');
    await goToStep(user, 1); // → Acuerdos
    await user.type(screen.getByLabelText(/acuerdos tomados/i), 'Reforzamiento semanal');
    await user.click(screen.getByRole('button', { name: /registrar entrevista/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.anything(),
      { fullName: 'María Torres', relationship: 'Madre', age: undefined, occupation: undefined, phone: '987654321' },
    );
  });
});
