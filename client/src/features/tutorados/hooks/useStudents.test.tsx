import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { useStudents } from './useStudents';
import { studentService } from '../services/studentService';
import { schoolService } from '../services/schoolService';
import { assignmentService } from '@features/asignacion/services/assignmentService';
import { AuthContext } from '@features/auth/context/AuthContext';

vi.mock('../services/studentService', () => ({ studentService: { getStudents: vi.fn(), getPeriodOptions: vi.fn() } }));
vi.mock('../services/schoolService', () => ({ schoolService: { getSchools: vi.fn().mockResolvedValue([]) } }));
vi.mock('@features/asignacion/services/assignmentService', () => ({ assignmentService: { getTutorWorkload: vi.fn().mockResolvedValue([]) } }));

const getStudents = vi.mocked(studentService.getStudents);
const getPeriodOptions = vi.mocked(studentService.getPeriodOptions);
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientTestWrapper>{children}</QueryClientTestWrapper>;

describe('useStudents: periodo', () => {
  beforeEach(() => {
    getStudents.mockReset().mockResolvedValue([]);
    getPeriodOptions.mockReset().mockResolvedValue([{ id: 'p1', name: '2026-II', isActive: true }]);
  });

  it('sin periodo pide la lista sin filtro y no consulta los periodos si no se piden', async () => {
    const { result } = renderHook(() => useStudents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getStudents).toHaveBeenCalledWith(undefined);
    expect(getPeriodOptions).not.toHaveBeenCalled();
    expect(result.current.periods).toEqual([]);
  });

  it('con periodo lo pide al servidor y, si se piden, trae las opciones de periodo', async () => {
    const { result } = renderHook(() => useStudents('p1', true), { wrapper });
    await waitFor(() => expect(result.current.periods).toHaveLength(1));

    expect(getStudents).toHaveBeenCalledWith({ periodId: 'p1' });
    expect(result.current.periodsError).toBe(false);
  });

  it('cambiar de periodo vuelve a pedir la lista con el nuevo, sin mezclar con la anterior', async () => {
    getStudents.mockImplementation(async (filters) => (filters?.periodId === 'p2' ? [{ id: 's2' }] : [{ id: 's1' }]) as never);
    const { result, rerender } = renderHook(({ id }) => useStudents(id), { wrapper, initialProps: { id: '' } });
    await waitFor(() => expect(result.current.students).toEqual([{ id: 's1' }]));

    rerender({ id: 'p2' });
    await waitFor(() => expect(result.current.students).toEqual([{ id: 's2' }]));
    expect(getStudents).toHaveBeenLastCalledWith({ periodId: 'p2' });
  });

  it('si fallan los periodos lo indica, no rompe la lista y permite reintentar', async () => {
    getPeriodOptions.mockRejectedValueOnce(new Error('caído'));
    getStudents.mockResolvedValue([{ id: 's1' }] as never);
    const { result } = renderHook(() => useStudents('', true), { wrapper });
    await waitFor(() => expect(result.current.periodsError).toBe(true));
    expect(result.current.students).toEqual([{ id: 's1' }]);

    await result.current.retryPeriods();
    await waitFor(() => expect(result.current.periodsError).toBe(false));
    expect(result.current.periods).toHaveLength(1);
  });
});

describe('useStudents: permisos (alcance del tutor)', () => {
  const school = (id: string, name: string) => ({ id, name } as never);

  const withPermissions = (permissions: string[]) => ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={{ user: { id: 'u', permissions } } as never}>
      <QueryClientTestWrapper>{children}</QueryClientTestWrapper>
    </AuthContext.Provider>
  );

  beforeEach(() => {
    getStudents.mockReset().mockResolvedValue([{ id: 's1', schoolId: 'e1' }] as never);
    vi.mocked(schoolService.getSchools).mockReset().mockResolvedValue([school('e1', 'Sistemas'), school('e2', 'Mecánica')]);
    vi.mocked(assignmentService.getTutorWorkload).mockClear();
  });

  it('sin students:write no pide los tutores y solo ofrece las escuelas de su lista', async () => {
    const { result } = renderHook(() => useStudents(), { wrapper: withPermissions(['students:read']) });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(assignmentService.getTutorWorkload).not.toHaveBeenCalled();
    expect(result.current.schools.map((s) => s.name)).toEqual(['Sistemas']);
  });

  it('con students:write pide los tutores y ofrece todas las escuelas', async () => {
    const { result } = renderHook(() => useStudents(), { wrapper: withPermissions(['students:read', 'students:write']) });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(assignmentService.getTutorWorkload).toHaveBeenCalled();
    expect(result.current.schools).toHaveLength(2);
  });
});
