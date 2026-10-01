import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { EvaluationPage } from './EvaluationPage';
import { evaluationService } from '../services/evaluationService';
import type { EvaluationStatus } from '../services/evaluationService';

vi.mock('../services/evaluationService', async () => {
  const actual = await vi.importActual<typeof import('../services/evaluationService')>(
    '../services/evaluationService',
  );
  return {
    ...actual,
    evaluationService: {
      getStatus: vi.fn(),
      submit: vi.fn(),
    },
  };
});

const mocked = vi.mocked(evaluationService);

function renderPage() {
  return render(
    <QueryClientTestWrapper>
      <EvaluationPage />
    </QueryClientTestWrapper>,
  );
}

describe('EvaluationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra que la evaluación no está disponible si no hay periodo o tutor', async () => {
    mocked.getStatus.mockResolvedValue({
      canRespond: false,
      alreadyResponded: false,
      periodName: null,
    } as EvaluationStatus);
    renderPage();

    expect(await screen.findByText(/no está disponible por ahora/i)).toBeInTheDocument();
  });

  it('muestra que ya se respondió el cuestionario del periodo', async () => {
    mocked.getStatus.mockResolvedValue({
      canRespond: false,
      alreadyResponded: true,
      periodName: '2026-II',
    } as EvaluationStatus);
    renderPage();

    expect(await screen.findByText(/ya respondiste el cuestionario/i)).toBeInTheDocument();
    expect(screen.getByText(/periodo 2026-ii/i)).toBeInTheDocument();
  });

  it('exige responder los 20 ítems antes de enviar', async () => {
    mocked.getStatus.mockResolvedValue({
      canRespond: true,
      alreadyResponded: false,
      periodName: '2026-II',
    } as EvaluationStatus);
    const user = userEvent.setup();
    renderPage();

    const submitButton = await screen.findByRole('button', { name: /enviar evaluación/i });
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);

    expect(mocked.submit).not.toHaveBeenCalled();
  });

  it(
    'envía el cuestionario completo con los campos abiertos',
    async () => {
      mocked.getStatus.mockResolvedValue({
        canRespond: true,
        alreadyResponded: false,
        periodName: '2026-II',
      } as EvaluationStatus);
      mocked.submit.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderPage();

      await screen.findByText('0 de 20 respondidas');

      const siempreOptions = screen.getAllByRole('radio', { name: 'S' });
      expect(siempreOptions).toHaveLength(20);
      for (const option of siempreOptions) {
        await user.click(option);
      }

      await user.type(screen.getByLabelText(/me gustaría/i), 'Más talleres');
      await user.type(screen.getByLabelText(/no me gusta/i), 'Nada');

      const submitButton = screen.getByRole('button', { name: /enviar evaluación/i });
      expect(submitButton).toBeEnabled();
      await user.click(submitButton);

      await waitFor(() => {
        expect(mocked.submit).toHaveBeenCalledWith({
          scores: Array(20).fill('S'),
          likes: 'Más talleres',
          dislikes: 'Nada',
        });
      });
      expect(await screen.findByText(/ya respondiste el cuestionario/i)).toBeInTheDocument();
    },
    20000,
  );
});
