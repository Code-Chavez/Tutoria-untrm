import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@shared/services/apiClient';
import { studentService } from './studentService';

vi.mock('@shared/services/apiClient', () => ({ apiClient: { get: vi.fn() } }));
const get = vi.mocked(apiClient.get);

describe('studentService: filtro por periodo', () => {
  beforeEach(() => get.mockReset());

  it('pide la lista con el periodo y los demás filtros en la consulta', async () => {
    get.mockResolvedValue({ data: { students: [{ id: 's1', periodCycle: 2 }] } });

    const students = await studentService.getStudents({ periodId: 'p1', cycle: 2, search: 'ana' });

    expect(get).toHaveBeenCalledWith('/students?periodId=p1&cycle=2&search=ana');
    expect(students).toEqual([{ id: 's1', periodCycle: 2 }]);
  });

  it('sin periodo no agrega nada a la consulta (la lista de siempre)', async () => {
    get.mockResolvedValue({ data: { students: [] } });

    await studentService.getStudents();
    await studentService.getStudents({ periodId: '' });

    expect(get).toHaveBeenNthCalledWith(1, '/students?');
    expect(get).toHaveBeenNthCalledWith(2, '/students?');
  });

  it('las opciones de periodo se leen de /periods/options', async () => {
    const periods = [{ id: 'p1', name: '2026-II', isActive: true }];
    get.mockResolvedValue({ data: { periods } });

    expect(await studentService.getPeriodOptions()).toEqual(periods);
    expect(get).toHaveBeenCalledWith('/periods/options');
  });
});
