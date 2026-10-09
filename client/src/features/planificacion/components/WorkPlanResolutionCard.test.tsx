import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { WorkPlanResolutionCard } from './WorkPlanResolutionCard';
import { workPlanService } from '../services/workPlanService';
import type { WorkPlan } from '../services/workPlanService';

vi.mock('../services/workPlanService', async () => {
  const actual = await vi.importActual<typeof import('../services/workPlanService')>(
    '../services/workPlanService',
  );
  return {
    ...actual,
    workPlanService: {
      uploadResolution: vi.fn(),
      downloadResolution: vi.fn(),
      getVersions: vi.fn().mockResolvedValue([]),
      downloadVersionResolution: vi.fn(),
    },
  };
});

const mocked = vi.mocked(workPlanService);

const basePlan = { id: 'wp1', inForce: false, status: 'BORRADOR', revision: 1, resolution: null } as unknown as WorkPlan;
const approvedPlan = {
  ...basePlan,
  inForce: true,
  status: 'APROBADO',
  resolution: { fileName: 'RD-123.pdf', fileSize: 2048, uploadedAt: '2026-10-03T10:00:00Z' },
} as unknown as WorkPlan;

function renderCard(plan: WorkPlan) {
  return render(
    <QueryClientTestWrapper>
      <WorkPlanResolutionCard schoolId="s1" plan={plan} />
    </QueryClientTestWrapper>,
  );
}

describe('WorkPlanResolutionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('indica que el plan no es vigente mientras no haya resolución', () => {
    renderCard(basePlan);
    expect(screen.getByText('Plan no vigente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adjuntar resolución/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar/ })).not.toBeInTheDocument();
  });

  it('muestra la revisión pendiente de resolución y lista la versión aprobada anterior (A12)', async () => {
    mocked.getVersions.mockResolvedValue([
      { revision: 1, approvedAt: '2026-09-01T10:00:00Z', resolution: { fileName: 'RD-1.pdf', fileSize: 10 } },
    ]);
    renderCard({ ...basePlan, inForce: true, status: 'EN_REVISION', revision: 2 } as unknown as WorkPlan);
    expect(screen.getByText('Revisión pendiente de resolución')).toBeInTheDocument();
    expect(await screen.findByText(/Revisión 1 · aprobada el/)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Resolución' }));
    expect(mocked.downloadVersionResolution).toHaveBeenCalledWith('s1', 1, 'RD-1.pdf');
  });

  it('sube el PDF seleccionado', async () => {
    mocked.uploadResolution.mockResolvedValue(approvedPlan);
    renderCard(basePlan);
    const file = new File(['pdf'], 'RD-123.pdf', { type: 'application/pdf' });

    await userEvent.upload(screen.getByLabelText('Archivo de la resolución'), file);

    await waitFor(() => expect(mocked.uploadResolution).toHaveBeenCalledWith('s1', file));
  });

  it('rechaza archivos que no son PDF sin llamar al servidor', async () => {
    renderCard(basePlan);
    const input = screen.getByLabelText('Archivo de la resolución');
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('PDF');
    expect(mocked.uploadResolution).not.toHaveBeenCalled();
  });

  it('muestra el plan vigente y permite descargar la resolución', async () => {
    mocked.downloadResolution.mockResolvedValue();
    renderCard(approvedPlan);
    expect(screen.getByText('Plan vigente')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Descargar/ }));

    expect(mocked.downloadResolution).toHaveBeenCalledWith('s1', 'RD-123.pdf');
  });
});
