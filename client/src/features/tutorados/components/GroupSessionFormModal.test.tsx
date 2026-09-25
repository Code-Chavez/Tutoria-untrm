import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupSessionFormModal } from './GroupSessionFormModal';
import type { Student } from '../services/studentService';
import type { School } from '../services/schoolService';

const schools: School[] = [
  { id: 'school-1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true },
];

const students: Student[] = [
  {
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
  },
  {
    id: 's2',
    studentCode: '20195678',
    firstName: 'Luis',
    lastName: 'Pérez',
    email: null,
    phone: null,
    cycle: 5,
    isAtRisk: false,
    isActive: true,
    schoolId: 'school-1',
  },
  {
    id: 's3',
    studentCode: '20203344',
    firstName: 'Jhon',
    lastName: 'Rojas',
    email: null,
    phone: null,
    cycle: 5,
    isAtRisk: false,
    isActive: true,
    schoolId: 'school-1',
  },
];

const renderModal = (onSubmit = vi.fn()) => {
  render(
    <GroupSessionFormModal
      students={students}
      schools={schools}
      durationMinutes={45}
      tutorName={() => null}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  );
  return onSubmit;
};

describe('GroupSessionFormModal', () => {
  it('exige fecha, hora y tema antes de validar la selección', async () => {
    const onSubmit = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /programar sesión grupal/i }));

    expect(await screen.findByText(/indica la fecha y la hora/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige al menos dos tutorados seleccionados (Art. 7.b)', async () => {
    const onSubmit = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/fecha/i), '2026-10-01');
    await user.type(screen.getByLabelText(/hora/i), '15:00');
    await user.type(screen.getByLabelText(/tema de la sesión/i), 'Técnicas de estudio');
    await user.click(screen.getByLabelText(/seleccionar ana torres/i));
    await user.click(screen.getByRole('button', { name: /programar sesión grupal/i }));

    expect(await screen.findByText(/selecciona al menos dos tutorados/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige el lugar de una sesión grupal presencial (por defecto)', async () => {
    const onSubmit = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/fecha/i), '2026-10-01');
    await user.type(screen.getByLabelText(/hora/i), '15:00');
    await user.type(screen.getByLabelText(/tema de la sesión/i), 'Técnicas de estudio');
    await user.click(screen.getByLabelText(/seleccionar ana torres/i));
    await user.click(screen.getByLabelText(/seleccionar luis pérez/i));
    await user.click(screen.getByRole('button', { name: /programar sesión grupal/i }));

    expect(await screen.findByText(/indica el lugar/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('confirma con dos o más tutorados seleccionados y el lugar (presencial)', async () => {
    const onSubmit = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/fecha/i), '2026-10-01');
    await user.type(screen.getByLabelText(/hora/i), '15:00');
    await user.type(screen.getByLabelText(/tema de la sesión/i), 'Técnicas de estudio');
    await user.type(screen.getByLabelText(/^lugar$/i), 'Auditorio de la Escuela');
    await user.click(screen.getByLabelText(/seleccionar ana torres/i));
    await user.click(screen.getByLabelText(/seleccionar luis pérez/i));
    await user.click(screen.getByRole('button', { name: /programar sesión grupal/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      studentIds: ['s1', 's2'],
      topic: 'Técnicas de estudio',
      scheduledAt: new Date('2026-10-01T15:00').toISOString(),
      modality: 'PRESENCIAL',
      location: 'Auditorio de la Escuela',
      meetingLink: undefined,
    });
  });

  it('confirma con el enlace de videollamada al elegir modalidad virtual', async () => {
    const onSubmit = renderModal();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/fecha/i), '2026-10-01');
    await user.type(screen.getByLabelText(/hora/i), '15:00');
    await user.type(screen.getByLabelText(/tema de la sesión/i), 'Técnicas de estudio');
    await user.click(screen.getByLabelText(/^virtual$/i));
    await user.type(screen.getByLabelText(/enlace de videollamada/i), 'https://meet.example.com/grupo');
    await user.click(screen.getByLabelText(/seleccionar ana torres/i));
    await user.click(screen.getByLabelText(/seleccionar luis pérez/i));
    await user.click(screen.getByRole('button', { name: /programar sesión grupal/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      studentIds: ['s1', 's2'],
      topic: 'Técnicas de estudio',
      scheduledAt: new Date('2026-10-01T15:00').toISOString(),
      modality: 'VIRTUAL',
      location: undefined,
      meetingLink: 'https://meet.example.com/grupo',
    });
  });
});
