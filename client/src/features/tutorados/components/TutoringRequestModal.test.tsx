import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TutoringRequestModal } from './TutoringRequestModal';
import type { Student } from '../services/studentService';

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

describe('TutoringRequestModal', () => {
  it('exige motivo antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TutoringRequestModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    expect(await screen.findByText(/describe el motivo/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('confirma con el origen "estudiante" por defecto', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TutoringRequestModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText(/descripción del motivo/i), 'Bajo rendimiento en Cálculo');
    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      source: 'STUDENT',
      instructorName: undefined,
      courseName: undefined,
      caseType: 'ACADEMIC',
      reason: 'Bajo rendimiento en Cálculo',
    });
  });

  it('exige nombre y curso cuando el origen es docente de asignatura', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TutoringRequestModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByLabelText(/docente de asignatura/i));
    await user.type(screen.getByLabelText(/descripción del motivo/i), 'Alumno con dificultades');
    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    expect(await screen.findByText(/indica el nombre del docente/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía los datos del docente cuando se completan', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TutoringRequestModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByLabelText(/docente de asignatura/i));
    await user.type(screen.getByLabelText(/nombre del docente/i), 'Prof. Juan Pérez');
    await user.type(screen.getByLabelText(/^curso$/i), 'Cálculo I');
    await user.type(screen.getByLabelText(/descripción del motivo/i), 'Alumno con dificultades');
    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'INSTRUCTOR',
        instructorName: 'Prof. Juan Pérez',
        courseName: 'Cálculo I',
      }),
    );
  });
});
