import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { REFERRALS_QUERY_KEY, useUpdateReferralInCache } from './useReferrals';
import type { StudentReferral } from '../services/referralService';

const base = { id: 'r1', studentId: 'f79e7f7d-518a-4f2d', service: 'PSICOLOGIA' } as StudentReferral;

describe('useUpdateReferralInCache', () => {
  it('tras un cambio de estado conserva el nombre y el código del estudiante que trae la lista', () => {
    const client = new QueryClient();
    client.setQueryData<StudentReferral[]>(REFERRALS_QUERY_KEY, [{ ...base, status: 'ENVIADO', studentName: 'Ana Torres Ramos', studentCode: '20191234' }]);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateReferralInCache(), { wrapper });

    // La respuesta del servidor al cambiar el estado no incluye esos dos campos.
    result.current({ ...base, status: 'RECIBIDO' });

    expect(client.getQueryData<StudentReferral[]>(REFERRALS_QUERY_KEY)?.[0]).toMatchObject({ status: 'RECIBIDO', studentName: 'Ana Torres Ramos', studentCode: '20191234' });
  });

  it('si la respuesta sí trae los datos del estudiante, usa los nuevos', () => {
    const client = new QueryClient();
    client.setQueryData<StudentReferral[]>(REFERRALS_QUERY_KEY, [{ ...base, status: 'ENVIADO', studentName: 'Antiguo' }]);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateReferralInCache(), { wrapper });

    result.current({ ...base, status: 'RECIBIDO', studentName: 'Nuevo' });

    expect(client.getQueryData<StudentReferral[]>(REFERRALS_QUERY_KEY)?.[0]?.studentName).toBe('Nuevo');
  });
});
