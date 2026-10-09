import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferralDetailModal } from './ReferralDetailModal';
import { StudentReferral, referralService } from '../services/referralService';

// Rol y servicio del usuario autenticado en cada prueba.
let mockUser: { role: string; service?: string | null } = { role: 'Profesional de Servicio', service: 'PSICOPEDAGOGIA' };
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));

// El panel de documentos firmados tiene sus propias pruebas.
vi.mock('@features/firmados/hooks/useSignedDocuments', () => ({
  useReferralSignedDocuments: () => ({ documents: [], loading: false, attach: vi.fn() }),
}));

vi.mock('../services/referralService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/referralService')>();
  return {
    ...actual,
    referralService: {
      updateStatus: vi.fn(),
    },
  };
});

describe('ReferralDetailModal (HU-32 - Registro de atención y cierre)', () => {
  const mockReferral: StudentReferral = {
    id: 'ref-1',
    studentId: 'stud-123456789',
    referredById: 'tutor-1',
    checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING'],
    reason: 'Estudiante con problemas académicos persistentes',
    service: 'PSICOPEDAGOGIA',
    receivingInstance: 'Área Psicopedagógica',
    status: 'EN_ATENCION',
    createdAt: '2026-09-26T10:00:00.000Z',
    statusHistory: [
      {
        status: 'EN_ATENCION',
        notes: 'Inició atención',
        createdAt: '2026-09-26T10:05:00.000Z',
      },
    ],
  };

  const onCloseMock = vi.fn();
  const onStatusUpdatedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'Profesional de Servicio', service: 'PSICOPEDAGOGIA' };
  });

  describe('quién puede cambiar el estado (A02)', () => {
    const renderModal = (referral = mockReferral) =>
      render(<ReferralDetailModal referral={referral} onClose={onCloseMock} onStatusUpdated={onStatusUpdatedMock} />);

    it('el profesional del servicio destino ve el formulario y solo los estados siguientes', () => {
      renderModal();

      const options = Array.from((screen.getByLabelText(/Nuevo Estado/i) as HTMLSelectElement).options).map((o) => o.value);
      expect(options).toEqual(['ATENDIDO', 'CERRADO']); // el caso está EN_ATENCION: no se retrocede ni se repite
    });

    it('la DBU también lo ve', () => {
      mockUser = { role: 'Administrador DBU' };
      renderModal();
      expect(screen.getByLabelText(/Nuevo Estado/i)).toBeDefined();
    });

    it('el tutor emisor solo consulta: no hay formulario y se le explica por qué', () => {
      mockUser = { role: 'Docente Tutor' };
      renderModal();

      expect(screen.queryByLabelText(/Nuevo Estado/i)).toBeNull();
      expect(screen.getByText(/Solo el servicio al que se derivó el caso y la DBU/i)).toBeDefined();
    });

    it('un profesional de otro servicio no ve el formulario', () => {
      mockUser = { role: 'Profesional de Servicio', service: 'SALUD' };
      renderModal();
      expect(screen.queryByLabelText(/Nuevo Estado/i)).toBeNull();
    });

    it('un caso recién enviado ofrece todas las etapas posteriores', () => {
      renderModal({ ...mockReferral, status: 'ENVIADO' });
      const options = Array.from((screen.getByLabelText(/Nuevo Estado/i) as HTMLSelectElement).options).map((o) => o.value);
      expect(options).toEqual(['RECIBIDO', 'EN_ATENCION', 'ATENDIDO', 'CERRADO']);
    });
  });

  it('muestra el banner de caso cerrado y deshabilita edición si el estado es CERRADO', () => {
    const closedReferral = { ...mockReferral, status: 'CERRADO' as const };

    render(
      <ReferralDetailModal
        referral={closedReferral}
        onClose={onCloseMock}
        onStatusUpdated={onStatusUpdatedMock}
      />
    );

    expect(screen.getByText(/Caso Cerrado:/i)).toBeDefined();
    expect(screen.queryByText(/Registrar Atención y Cambio de Estado/i)).toBeNull();
  });

  it('exige observaciones al seleccionar el estado CERRADO', async () => {
    render(
      <ReferralDetailModal
        referral={mockReferral}
        onClose={onCloseMock}
        onStatusUpdated={onStatusUpdatedMock}
      />
    );

    const select = screen.getByLabelText(/Nuevo Estado/i);
    fireEvent.change(select, { target: { value: 'CERRADO' } });

    const submitBtn = screen.getByRole('button', { name: /Cerrar Caso Derivado/i });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);

    const textarea = screen.getByLabelText(/Observaciones /i);
    fireEvent.change(textarea, { target: { value: 'Caso atendido y cerrado satisfactoriamente.' } });

    expect(submitBtn.hasAttribute('disabled')).toBe(false);
  });

  it('llama a referralService.updateStatus al guardar cambios con observaciones', async () => {
    const updatedReferral = { ...mockReferral, status: 'ATENDIDO' as const };
    vi.mocked(referralService.updateStatus).mockResolvedValue(updatedReferral);

    render(
      <ReferralDetailModal
        referral={mockReferral}
        onClose={onCloseMock}
        onStatusUpdated={onStatusUpdatedMock}
      />
    );

    const select = screen.getByLabelText(/Nuevo Estado/i);
    fireEvent.change(select, { target: { value: 'ATENDIDO' } });

    const textarea = screen.getByLabelText(/Observaciones /i);
    fireEvent.change(textarea, { target: { value: 'Se realizó la evaluación psicopedagógica y plan de ayuda.' } });

    const submitBtn = screen.getByRole('button', { name: /Registrar Atención/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(referralService.updateStatus).toHaveBeenCalledWith(
        'ref-1',
        'ATENDIDO',
        'Se realizó la evaluación psicopedagógica y plan de ayuda.'
      );
      expect(onStatusUpdatedMock).toHaveBeenCalledWith(updatedReferral);
    });
  });
});
