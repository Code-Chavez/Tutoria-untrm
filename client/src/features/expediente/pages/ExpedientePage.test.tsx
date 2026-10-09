import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { ExpedientePage } from './ExpedientePage';
import { studentRecordService, type StudentRecord } from '../services/studentRecordService';

vi.mock('../services/studentRecordService', () => ({
  studentRecordService: { getStudentRecord: vi.fn() },
}));

// La hoja de asistencia firmada (A14) tiene sus propias pruebas.
let mockRole = 'Docente Tutor';
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: mockRole } }) }));
vi.mock('@features/firmados/hooks/useSignedDocuments', () => ({
  useAttendanceSheetDocuments: () => ({ period: { id: 'p1', name: '2026-II' }, documents: [], loading: false, attach: vi.fn() }),
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
    <QueryClientTestWrapper>
      <MemoryRouter initialEntries={['/expediente/s1']}>
        <Routes>
          <Route path="/expediente/:id" element={<ExpedientePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientTestWrapper>,
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

  it('muestra la ficha de seguimiento con los datos del docente (HU-24)', async () => {
    mocked.getStudentRecord.mockResolvedValue({
      ...baseRecord,
      timeline: [
        {
          type: 'followUp',
          id: 'fu-1',
          date: '2026-09-18T00:00:00.000Z',
          reason: 'Seguimiento al acuerdo de reforzamiento',
          agreements: 'Asesorías los martes',
          instructorName: 'Prof. Juan Pérez',
          courseName: 'Cálculo I',
          courseCycle: 3,
          conductedByName: 'Elena Ramírez',
        },
        ...baseRecord.timeline,
      ],
    });
    renderPage();

    expect(await screen.findByText(/ficha de seguimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/seguimiento al acuerdo de reforzamiento/i)).toBeInTheDocument();
    expect(screen.getByText(/prof\. juan pérez/i)).toBeInTheDocument();
    expect(screen.getByText(/cálculo i · ciclo/i)).toBeInTheDocument();
  });

  it('ofrece la hoja de asistencia (Anexo N° 4) para imprimir y adjuntar firmada, según el rol (A14)', async () => {
    mocked.getStudentRecord.mockResolvedValue(baseRecord);
    mockRole = 'Docente Tutor';
    const { unmount } = renderPage();
    expect(await screen.findByText('Hoja de asistencia (Anexo N° 4)')).toBeInTheDocument();
    expect(screen.getByText('Periodo 2026-II')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar hoja para imprimir/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adjuntar documento firmado/ })).toBeInTheDocument();
    unmount();

    // Coordinación consulta, pero no adjunta.
    mockRole = 'Coordinador';
    renderPage();
    await screen.findByText('Hoja de asistencia (Anexo N° 4)');
    expect(screen.queryByRole('button', { name: /Adjuntar documento firmado/ })).not.toBeInTheDocument();
  });

  it('incorpora la solicitud de tutoría al expediente, con su estado y la respuesta (R01)', async () => {
    mocked.getStudentRecord.mockResolvedValue({
      ...baseRecord,
      timeline: [
        {
          type: 'tutoringRequest',
          id: 'r1',
          date: '2026-10-02T00:00:00.000Z',
          caseType: 'ACADEMIC',
          source: 'STUDENT',
          reason: 'Necesito apoyo en Cálculo',
          status: 'ATENDIDA',
          routedToName: 'Elena Ramírez',
          responseNote: 'Te espero el jueves.',
          handledByName: 'Elena Ramírez',
          handledAt: '2026-10-03T00:00:00.000Z',
        },
      ],
    });
    renderPage();

    expect(await screen.findByText('Solicitud de tutoría')).toBeInTheDocument();
    expect(screen.getByText('Atendida')).toBeInTheDocument();
    expect(screen.getByText(/Necesito apoyo en Cálculo/)).toBeInTheDocument();
    expect(screen.getByText(/Te espero el jueves\./)).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no hay eventos', async () => {
    mocked.getStudentRecord.mockResolvedValue({ ...baseRecord, timeline: [] });
    renderPage();

    expect(await screen.findByText(/sin registros en el expediente/i)).toBeInTheDocument();
  });
});
