import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignmentPage } from './AssignmentPage';
import { studentService, type Student } from '@features/tutorados/services/studentService';
import { schoolService } from '@features/tutorados/services/schoolService';
import { assignmentService } from '../services/assignmentService';

vi.mock('@features/tutorados/services/studentService', () => ({
  studentService: { getStudents: vi.fn() },
}));
vi.mock('@features/tutorados/services/schoolService', () => ({
  schoolService: { getSchools: vi.fn() },
}));
vi.mock('../services/assignmentService', () => ({
  assignmentService: { getTutorWorkload: vi.fn(), assignStudents: vi.fn() },
}));

const student: Student = {
  id: 'stu-1',
  studentCode: '20191234',
  firstName: 'Ana',
  lastName: 'Torres',
  email: null,
  phone: null,
  cycle: 5,
  isAtRisk: false,
  isActive: true,
  schoolId: 'school-1',
  tutorId: null,
};

describe('AssignmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(studentService.getStudents).mockResolvedValue([student]);
    vi.mocked(schoolService.getSchools).mockResolvedValue([]);
    vi.mocked(assignmentService.getTutorWorkload).mockResolvedValue([
      { tutorId: 'tutor-1', fullName: 'Juan Pérez', email: 'juan@untrm.edu.pe', assignedCount: 3 },
    ]);
    vi.mocked(assignmentService.assignStudents).mockResolvedValue(1);
  });

  it('asigna el estudiante seleccionado al tutor elegido', async () => {
    const user = userEvent.setup();
    render(<AssignmentPage />);

    // Selecciona el estudiante
    const checkbox = await screen.findByLabelText(/seleccionar ana torres/i);
    await user.click(checkbox);

    // Elige el tutor
    await user.click(screen.getByRole('radio', { name: /juan pérez/i }));

    // Asigna
    await user.click(screen.getByRole('button', { name: /asignar/i }));

    await waitFor(() =>
      expect(assignmentService.assignStudents).toHaveBeenCalledWith('tutor-1', ['stu-1']),
    );
    expect(await screen.findByText(/se asignaron 1 estudiante/i)).toBeInTheDocument();
  });

  it('mantiene el botón de asignar deshabilitado sin selección', async () => {
    render(<AssignmentPage />);
    const button = await screen.findByRole('button', { name: /asignar/i });
    expect(button).toBeDisabled();
  });
});
