import React, { useMemo, useState } from 'react';
import styles from './UserManagementPage.module.css';
import { User, userService, CreateUserData, UpdateUserData } from '../services/userService';
import { UserFormModal } from '../components/UserFormModal';
import { UserFilters, UserFilterValues } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import { useUsers } from '../hooks/useUsers';
import {
  PageHeader,
  Button,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
} from '@shared/components/ui';
import { PlusIcon, UsersIcon, XCircleIcon, SearchIcon } from '@shared/components/icons';

const EMPTY_FILTERS: UserFilterValues = { search: '', roleId: '', status: '' };

export const UserManagementPage: React.FC = () => {
  const { users, roles, loading, error, refresh } = useUsers();

  const [filters, setFilters] = useState<UserFilterValues>(EMPTY_FILTERS);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [toggling, setToggling] = useState(false);

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? 'Sin rol';

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

  const handleOpenModal = (user?: User) => {
    setUserToEdit(user || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUserToEdit(null);
  };

  const handleSubmit = async (data: CreateUserData | UpdateUserData) => {
    if (userToEdit) {
      await userService.updateUser(userToEdit.id, data as UpdateUserData);
    } else {
      await userService.createUser(data as CreateUserData);
    }
    refresh();
  };

  const confirmToggle = async () => {
    if (!userToToggle) return;
    setToggling(true);
    try {
      await userService.toggleUserStatus(userToToggle.id);
      refresh();
      setUserToToggle(null);
    } catch (err) {
      console.error('Error toggling status', err);
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
          <Button icon={<PlusIcon size={17} />} onClick={() => handleOpenModal()}>
            Nuevo usuario
          </Button>
        }
      />

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
          />
        )}
      </div>

      {isModalOpen && (
        <UserFormModal
          key={userToEdit?.id ?? 'new'}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          userToEdit={userToEdit}
          roles={roles}
        />
      )}

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
