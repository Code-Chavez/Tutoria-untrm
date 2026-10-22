import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { EvaluationWindowsPage } from './EvaluationWindowsPage';
import { evaluationService, type EvaluationWindowSchoolState } from '../services/evaluationService';

vi.mock('../services/evaluationService', () => ({ evaluationService: { getWindows: vi.fn(), setWindow: vi.fn() } }));
const api = vi.mocked(evaluationService);
const openSchool = { schoolId: 's1', schoolName: 'Ingeniería de Sistemas', isOpen: true };
const closedSchool = { schoolId: 's2', schoolName: 'Enfermería', isOpen: false };
const renderPage = () => render(<QueryClientTestWrapper><EvaluationWindowsPage /></QueryClientTestWrapper>);

describe('EvaluationWindowsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getWindows.mockResolvedValue({ periodName: '2026-II', schools: [openSchool, closedSchool] });
    api.setWindow.mockImplementation(async (schoolId, isOpen) => ({ ...(schoolId === 's1' ? openSchool : closedSchool), isOpen }));
  });

  it('explica el alcance del cierre y permite cancelar sin cambiar el estado', async () => {
    const user = userEvent.setup();
    renderPage();
    const opener = await screen.findByRole('button', { name: 'Cerrar evaluación de Ingeniería de Sistemas' });
    await user.click(opener);
    const dialog = screen.getByRole('alertdialog', { name: 'Cerrar evaluación' });
    expect(dialog).toHaveTextContent('incluso si lo tienen abierto sin enviar');
    expect(dialog).toHaveTextContent('Las respuestas enviadas se conservan');
    expect(dialog).toHaveTextContent('no desactiva la escuela');
    expect(api.setWindow).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(api.setWindow).not.toHaveBeenCalled();
  });

  it('solo cierra la escuela elegida después de confirmar y actualiza su estado', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cerrar evaluación de Ingeniería de Sistemas' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre de evaluación' }));
    await waitFor(() => expect(api.setWindow).toHaveBeenCalledExactlyOnceWith('s1', false));
    expect(await screen.findByRole('status')).toHaveTextContent('Evaluación cerrada para Ingeniería de Sistemas.');
    expect(screen.getByRole('button', { name: 'Habilitar evaluación de Ingeniería de Sistemas' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('explica los requisitos antes de habilitar y conserva la regla de una respuesta por periodo', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Habilitar evaluación de Enfermería' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Habilitar evaluación' });
    expect(dialog).toHaveTextContent('con tutor asignado');
    expect(dialog).toHaveTextContent('una sola vez por periodo');
    expect(api.setWindow).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar habilitación de evaluación' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Evaluación habilitada para Enfermería.');
    expect(api.setWindow).toHaveBeenCalledExactlyOnceWith('s2', true);
  });

  it('mantiene el diálogo con el error y permite reintentar sin mostrar éxito falso', async () => {
    api.setWindow.mockRejectedValueOnce(new Error('Fallo de conexión'));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cerrar evaluación de Ingeniería de Sistemas' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre de evaluación' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre de evaluación' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Evaluación cerrada');
    expect(api.setWindow).toHaveBeenCalledTimes(2);
  });

  it('impide cerrar el diálogo y repetir el envío mientras se está guardando', async () => {
    let finish!: (value: EvaluationWindowSchoolState) => void;
    api.setWindow.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cerrar evaluación de Ingeniería de Sistemas' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre de evaluación' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();
    expect(api.setWindow).toHaveBeenCalledTimes(1);
    finish({ ...openSchool, isOpen: false });
    expect(await screen.findByRole('status')).toHaveTextContent('Evaluación cerrada');
  });

  it('filtra por escuela y estado sin modificar la configuración', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Habilitar evaluación de Enfermería' });
    await user.selectOptions(screen.getByLabelText('Estado de evaluación'), 'closed');
    expect(screen.queryByRole('button', { name: 'Cerrar evaluación de Ingeniería de Sistemas' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Buscar escuela'), 'Sistemas');
    expect(screen.getByText('No hay escuelas en esta vista')).toBeInTheDocument();
    expect(api.setWindow).not.toHaveBeenCalled();
  });
});
