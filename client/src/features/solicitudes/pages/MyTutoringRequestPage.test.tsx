import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyTutoringRequestPage } from './MyTutoringRequestPage';
import { tutoringRequestService } from '../services/tutoringRequestService';
import type { TutoringRequest } from '../services/tutoringRequestService';

vi.mock('../services/tutoringRequestService', () => ({
  tutoringRequestService: {
    createOwnTutoringRequest: vi.fn(),
  },
}));

const mocked = vi.mocked(tutoringRequestService);

describe('MyTutoringRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exige describir el motivo antes de enviar', async () => {
    const user = userEvent.setup();
    render(<MyTutoringRequestPage />);

    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    expect(await screen.findByText(/describe el motivo/i)).toBeInTheDocument();
    expect(mocked.createOwnTutoringRequest).not.toHaveBeenCalled();
  });

  it('registra la solicitud y muestra a quién se enrutó', async () => {
    mocked.createOwnTutoringRequest.mockResolvedValue({
      id: 'req-1',
      studentId: 's1',
      source: 'STUDENT',
      caseType: 'ACADEMIC',
      reason: 'Dificultad en Cálculo',
      routedToId: 'tutor-1',
      routedToRole: 'tutor',
      createdAt: new Date().toISOString(),
    } as TutoringRequest);
    const user = userEvent.setup();
    render(<MyTutoringRequestPage />);

    await user.type(screen.getByLabelText(/descripción del motivo/i), 'Dificultad en Cálculo');
    await user.click(screen.getByRole('button', { name: /registrar solicitud/i }));

    await waitFor(() => {
      expect(mocked.createOwnTutoringRequest).toHaveBeenCalledWith({
        caseType: 'ACADEMIC',
        reason: 'Dificultad en Cálculo',
      });
    });
    expect(await screen.findByText(/enrutada a tu tutor/i)).toBeInTheDocument();
  });
});
