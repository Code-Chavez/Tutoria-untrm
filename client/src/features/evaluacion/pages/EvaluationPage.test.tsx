import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { EvaluationPage } from './EvaluationPage';
import { evaluationService } from '../services/evaluationService';
import type { EvaluationStatus } from '../services/evaluationService';

vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'Tutorado' } }) }));

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
    window.sessionStorage.clear(); // los borradores viven en la pestaña: que no pasen de una prueba a otra
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

      const siempreOptions = screen.getAllByRole('radio', { name: 'S Siempre' });
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

  describe('escala y avance (U08, U07)', () => {
    const open = () =>
      mocked.getStatus.mockResolvedValue({ canRespond: true, alreadyResponded: false, periodName: '2026-II' } as EvaluationStatus);

    it('la leyenda de la escala está ANTES de la primera pregunta, con el nombre completo de cada opción', async () => {
      open();
      renderPage();
      await screen.findByText('0 de 20 respondidas');

      const legend = screen.getByRole('list', { name: 'Significado de cada opción' });
      for (const text of ['N = Nunca', 'CN = Casi Nunca', 'AV = A veces', 'CS = Casi Siempre', 'S = Siempre']) {
        expect(legend).toHaveTextContent(text);
      }
      const firstQuestion = screen.getAllByRole('radiogroup')[0];
      expect(legend.compareDocumentPosition(firstQuestion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getAllByRole('radiogroup')).toHaveLength(20); // se conservan las 20 afirmaciones
    });

    it('cada opción dice su nombre completo, no solo la sigla', async () => {
      open();
      renderPage();
      await screen.findByText('0 de 20 respondidas');
      expect(screen.getAllByRole('radio', { name: 'CN Casi Nunca' })).toHaveLength(20);
      expect(screen.getAllByRole('radio', { name: 'AV A veces' })).toHaveLength(20);
    });

    it('lo respondido y lo escrito se conserva al volver, y se puede descartar', async () => {
      open();
      const user = userEvent.setup();
      const first = renderPage();
      await screen.findByText('0 de 20 respondidas');
      const options = screen.getAllByRole('radio', { name: 'S Siempre' });
      await user.click(options[0]);
      await user.click(options[1]);
      await user.type(screen.getByLabelText(/me gustaría/i), 'Más talleres');
      first.unmount();

      renderPage();
      expect(await screen.findByText('2 de 20 respondidas')).toBeInTheDocument();
      expect(screen.getByLabelText(/me gustaría/i)).toHaveValue('Más talleres');
      expect(screen.getByRole('status')).toHaveTextContent('Recuperamos lo que habías escrito');

      await user.click(screen.getByRole('button', { name: 'Descartar borrador' }));
      expect(await screen.findByText('0 de 20 respondidas')).toBeInTheDocument();
      expect(screen.getByLabelText(/me gustaría/i)).toHaveValue('');
    }, 20000);

    it('al enviar no queda borrador', async () => {
      open();
      mocked.submit.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('0 de 20 respondidas');
      for (const option of screen.getAllByRole('radio', { name: 'S Siempre' })) await user.click(option);
      await user.click(screen.getByRole('button', { name: /enviar evaluación/i }));
      await screen.findByText(/ya respondiste el cuestionario/i);
      expect(Object.keys(window.sessionStorage).filter((k) => k.startsWith('sit.draft.'))).toEqual([]);
    }, 20000);

    it('«Ir a la primera que falta» lleva a la siguiente pregunta sin responder, sin perder lo respondido', async () => {
      open();
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('0 de 20 respondidas');
      expect(screen.queryByRole('button', { name: 'Ir a la primera que falta' })).not.toBeInTheDocument(); // aún no respondió nada
      const options = screen.getAllByRole('radio', { name: 'S Siempre' });
      await user.click(options[0]);
      await user.click(options[1]);

      await user.click(screen.getByRole('button', { name: 'Ir a la primera que falta' }));

      expect(document.activeElement).toBe(screen.getAllByRole('radio', { name: 'N Nunca' })[2]); // la 3.ª pregunta
      expect(screen.getByText('2 de 20 respondidas')).toBeInTheDocument();
    }, 20000);
  });
});
