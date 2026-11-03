import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, type AccessInput } from '../services/userService';

const accessKey = (userId: string) => ['user-access', userId] as const;

export function useUserAccess(userId: string) {
  // Sin caché: lo que se muestra debe ser lo vigente en el servidor, no lo visto hace unos minutos.
  return useQuery({ queryKey: accessKey(userId), queryFn: () => userService.getAccess(userId), staleTime: 0, gcTime: 0 });
}

export function useSetUserAccess(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AccessInput) => userService.setAccess(userId, input),
    onSuccess: (access) => queryClient.setQueryData(accessKey(userId), access),
  });
}
