import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExpedientePage } from './ExpedientePage';
import { studentRecordService, type StudentRecord } from '../services/studentRecordService';

vi.mock('../services/studentRecordService', () => ({
  studentRecordService: { getStudentRecord: vi.fn() },
}));

const mocked = vi.mocked(studentRecordService);

const baseRecord: StudentRecord = {
  student: {
    id: 's1',
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    cycle: 5,
    isActive: true,
    isAtRisk: false,
    riskReason: null,
  },
  schoolName: 'Ingeniería de Sistemas',
  tutorName: 'Elena Ramírez',
  timeline: [
    {
      type: 'interview',
      id: 'i1',
      date: '2026-09-01T00:00:00.000Z',
      conductedByName: 'Elena Ramírez',
      motives: ['Académica'],
      aspectsDiscussed: 'Bajo rendimiento en Cálculo',
      agreements: 'Tutorías semanales',
    },
    {
      type: 'assignment',
      id: 'a1',
      date: '2026-08-15T00:00:00.000Z',
      previousTutorName: null,
      newTutorName: 'Elena Ramírez',
      reason: 'Asignación inicial',
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/expediente/s1']}>
      <Routes>
        <Route path="/expediente/:id" element={<ExpedientePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ExpedientePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra la línea de tiempo consolidada del estudiante', async () => {
    mocked.getStudentRecord.mockResolvedValue(baseRecord);
    renderPage();

    expect(await screen.findByRole('heading', { name: /ana torres/i })).toBeInTheDocument();
    expect(screen.getByText(/entrevista inicial tutorial/i)).toBeInTheDocument();
    expect(screen.getByText(/asignación de tutor/i)).toBeInTheDocument();
    expect(screen.getByText(/bajo rendimiento en cálculo/i)).toBeInTheDocument();
  });

  it('muestra la persona de red de apoyo cuando el backend la incluye', async () => {
    mocked.getStudentRecord.mockResolvedValue({
      ...baseRecord,
      supportContact: { fullName: 'María Torres', relationship: 'Madre', phone: '987654321' },
    });
    renderPage();

    expect(await screen.findByText(/maría torres/i)).toBeInTheDocument();
    expect(screen.getByText(/madre/i)).toBeInTheDocument();
  });

  it('no muestra la sección de red de apoyo si el backend la omite (sin permiso)', async () => {
    mocked.getStudentRecord.mockResolvedValue(baseRecord); // supportContact: undefined
    renderPage();

    await screen.findByRole('heading', { name: /ana torres/i });
    expect(screen.queryByText(/persona de red de apoyo/i)).not.toBeInTheDocument();
  });

  it('muestra la asistencia confirmada de una sesión individual (HU-22)', async () => {
    mocked.getStudentRecord.mockResolvedValue({
      ...baseRecord,
      timeline: [
        {
          type: 'attendance',
          id: 'att-1',
          date: '2026-09-20T15:45:00.000Z',
          sequenceNumber: 2,
          topic: 'Reforzamiento de Cálculo',
          tutorName: 'Elena Ramírez',
          scheduledAt: '2026-09-20T15:00:00.000Z',
        },
        ...baseRecord.timeline,
      ],
    });
    renderPage();

    expect(await screen.findByText(/asistencia a sesión/i)).toBeInTheDocument();
    expect(screen.getByText(/sesión 2 de 8/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmada con elena ramírez/i)).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no hay eventos', async () => {
    mocked.getStudentRecord.mockResolvedValue({ ...baseRecord, timeline: [] });
    renderPage();

    expect(await screen.findByText(/sin registros en el expediente/i)).toBeInTheDocument();
  });
});
