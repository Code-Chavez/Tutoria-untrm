import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '@features/catalogos/services/catalogService';
import { schoolService } from '@features/tutorados/services/schoolService';
import styles from './UserManagementPage.module.css';
import { User, userService, CreateUserData, UpdateUserData, Invitation } from '../services/userService';
import { InvitationDialog } from '../components/InvitationDialog';
import { UserFormModal } from '../components/UserFormModal';
import { UserFilters, UserFilterValues } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import { UserAccessDialog } from '../components/UserAccessDialog';
import { roleDisplayName } from '@shared/utils/roleLabel';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useUsers } from '../hooks/useUsers';
import { useUrlParams } from '@shared/hooks/useUrlParams';
import { useAuth } from '@features/auth/hooks/useAuth';
import {
  PageHeader,
  Button,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
} from '@shared/components/ui';
import { PlusIcon, UploadIcon, UsersIcon, XCircleIcon, SearchIcon } from '@shared/components/icons';

const EMPTY_FILTERS: UserFilterValues = { search: '', roleId: '', status: '' };

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { users, roles, loading, error, refresh } = useUsers();
  const faculties = useQuery({ queryKey: ['catalog', 'faculties'], queryFn: () => catalogService.list('faculties'), staleTime: 60_000 }).data ?? [];
  const schools = useQuery({ queryKey: ['schools'], queryFn: () => schoolService.getSchools(), staleTime: 60_000 }).data ?? [];
  // La invitación de una cuenta recién creada (o reemitida): el enlace se muestra una sola vez, a quien administra.
  const [issued, setIssued] = useState<{ email: string; invitation: Invitation } | null>(null);
  const [actionError, setActionError] = useState('');

  // Lo que conviene conservar al recargar o compartir el enlace vive en la URL: los filtros (q, rol, estado) y qué ventana está
  // abierta y sobre quién (nuevo, editar, acceso, confirmar). Lo que se escribe en el formulario se recupera como borrador.
  const url = useUrlParams();
  const { user: me } = useAuth();
  const [search, roleId, status] = [url.get('q'), url.get('rol'), url.get('estado')];
  const filters = useMemo<UserFilterValues>(() => ({ search, roleId, status }), [search, roleId, status]);
  const setFilters = (next: UserFilterValues) => url.set({ q: next.search, rol: next.roleId, estado: next.status }, { replace: true });

  const byId = (id: string) => users.find((u) => u.id === id) ?? null;
  const creating = url.get('nuevo') === '1';
  const userToEdit = byId(url.get('editar'));
  const userForAccess = byId(url.get('acceso'));
  const userToToggle = byId(url.get('confirmar'));
  const isModalOpen = creating || userToEdit !== null;
  const setUserForAccess = (user: User | null) => url.set({ acceso: user?.id ?? null }, { replace: user === null });
  const setUserToToggle = (user: User | null) => url.set({ confirmar: user?.id ?? null }, { replace: user === null });

  // Un enlace a un registro que ya no existe (o que la persona no ve) no deja una ventana fantasma: se limpia el parámetro.
  const dialogIds = [url.get('editar'), url.get('acceso'), url.get('confirmar')].join('|');
  useEffect(() => {
    if (loading || error) return;
    const gone: Record<string, null> = {};
    for (const key of ['editar', 'acceso', 'confirmar']) {
      const id = url.get(key);
      if (id && !users.some((u) => u.id === id)) gone[key] = null;
    }
    if (Object.keys(gone).length > 0) url.set(gone, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, users, dialogIds]);
  const [toggling, setToggling] = useState(false);

  const roleName = (roleId: string) => {
    const name = roles.find((r) => r.id === roleId)?.name;
    return name ? roleDisplayName(name) : 'Sin rol';
  };

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return users.filter((u) => {
      if (filters.roleId && u.roleId !== filters.roleId) return false;
      if (filters.status === 'active' && !u.isActive) return false;
      if (filters.status === 'inactive' && u.isActive) return false;
      if (term) {
        const haystack = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [users, filters]);

  const handleOpenModal = (user?: User) => url.set(user ? { editar: user.id, nuevo: null } : { nuevo: '1', editar: null });

  const handleCloseModal = () => url.set({ editar: null, nuevo: null }, { replace: true });

  const handleSubmit = async (data: CreateUserData | UpdateUserData) => {
    if (userToEdit) {
      await userService.updateUser(userToEdit.id, data as UpdateUserData);
    } else {
      const { user, invitation } = await userService.createUser(data as CreateUserData);
      setIssued({ email: user.email, invitation });
    }
    refresh();
  };

  const reissue = async (user: User) => {
    setActionError('');
    try {
      setIssued({ email: user.email, invitation: await userService.reissueInvitation(user.id) });
      refresh();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  };

  const confirmToggle = async () => {
    if (!userToToggle) return;
    setToggling(true);
    setActionError('');
    try {
      await userService.toggleUserStatus(userToToggle.id);
      refresh();
      setUserToToggle(null);
    } catch (err) {
      // Por ejemplo, desactivar a la última cuenta de administración activa: el servidor explica el motivo y no cambia nada.
      setActionError(getApiErrorMessage(err));
      setUserToToggle(null);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Usuarios y roles"
        subtitle="Cuentas del sistema y el rol de cada persona. Los catálogos y parámetros tienen su propia sección en el menú."
        icon={<UsersIcon size={24} />}
        actions={
          <>
            <Button variant="secondary" icon={<UploadIcon size={17} />} onClick={() => navigate('/carga-docentes')}>
              Importar docentes
            </Button>
            <Button icon={<PlusIcon size={17} />} onClick={() => handleOpenModal()}>
              Nuevo usuario
            </Button>
          </>
        }
      />

      {actionError && (
        <p role="alert" className={styles.inviteError}>
          {actionError}
        </p>
      )}

      <div className={styles.tableCard}>
        <UserFilters
          values={filters}
          roles={roles}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<XCircleIcon size={26} />}
            title="No se pudieron cargar los usuarios"
            description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
            action={<Button variant="secondary" onClick={refresh}>Reintentar</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title={users.length === 0 ? 'Aún no hay usuarios' : 'Sin resultados'}
            description={
              users.length === 0
                ? 'Crea el primer usuario del sistema para comenzar.'
                : 'No se encontraron usuarios con los filtros aplicados.'
            }
          />
        ) : (
          <UserTable
            users={filtered}
            roleName={roleName}
            onEdit={handleOpenModal}
            onToggleStatus={setUserToToggle}
            onAccess={setUserForAccess}
            onReissueInvitation={reissue}
          />
        )}
      </div>

      {isModalOpen && (
        <UserFormModal
          key={userToEdit?.id ?? 'new'}
          draftOwnerId={me?.id}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          userToEdit={userToEdit}
          roles={roles}
          schools={schools}
          faculties={faculties}
        />
      )}

      {userForAccess && (
        <UserAccessDialog
          key={userForAccess.id}
          user={userForAccess}
          role={roles.find((r) => r.id === userForAccess.roleId)}
          schools={schools}
          faculties={faculties}
          onClose={() => setUserForAccess(null)}
        />
      )}

      {issued && <InvitationDialog {...issued} onClose={() => setIssued(null)} />}

      <ConfirmDialog
        open={userToToggle !== null}
        tone={userToToggle?.isActive ? 'danger' : 'primary'}
        title={userToToggle?.isActive ? 'Desactivar usuario' : 'Activar usuario'}
        message={
          userToToggle
            ? `¿Confirmas ${userToToggle.isActive ? 'desactivar' : 'activar'} a ${userToToggle.firstName} ${userToToggle.lastName}?`
            : ''
        }
        confirmLabel={userToToggle?.isActive ? 'Desactivar' : 'Activar'}
        loading={toggling}
        onConfirm={confirmToggle}
        onCancel={() => setUserToToggle(null)}
      />
    </div>
  );
};
