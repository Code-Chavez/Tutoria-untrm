import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferralDetailModal } from './ReferralDetailModal';
import { StudentReferral, referralService } from '../services/referralService';

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
