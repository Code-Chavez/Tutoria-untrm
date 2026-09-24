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
import { SettingsIcon, PlusIcon, UsersIcon, XCircleIcon, SearchIcon } from '@shared/components/icons';

type TabId = 'usuarios' | 'catalogos' | 'parametros' | 'bitacora';

const TABS: { id: TabId; label: string }[] = [
  { id: 'usuarios', label: 'Usuarios y roles' },
  { id: 'catalogos', label: 'Catálogos' },
  { id: 'parametros', label: 'Parámetros' },
  { id: 'bitacora', label: 'Bitácora de auditoría' },
];

const EMPTY_FILTERS: UserFilterValues = { search: '', roleId: '', status: '' };

export const UserManagementPage: React.FC = () => {
  const { users, roles, loading, error, refresh } = useUsers();

  const [activeTab, setActiveTab] = useState<TabId>('usuarios');
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

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? '';

  return (
    <div>
      <PageHeader
        title="Administración del Sistema"
        subtitle="Usuarios, roles, catálogos maestros y parámetros"
        icon={<SettingsIcon size={24} />}
        actions={
          activeTab === 'usuarios' && (
            <Button icon={<PlusIcon size={17} />} onClick={() => handleOpenModal()}>
              Nuevo usuario
            </Button>
          )
        }
      />

      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'usuarios' && (
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
      )}

      {activeTab === 'parametros' && <SystemParametersPanel />}

      {(activeTab === 'catalogos' || activeTab === 'bitacora') && (
        <div className={styles.tableCard}>
          <EmptyState
            icon={<UsersIcon size={26} />}
            title={`Sección «${activeLabel}»`}
            description="Este módulo estará disponible en una próxima iteración."
          />
        </div>
      )}

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

/**
 * Panel de parámetros del sistema. Réplica visual; la persistencia se conectará
 * al backend en una TT posterior (aún no hay endpoint de parámetros).
 */
function SystemParametersPanel() {
  const [params, setParams] = useState({
    sessionDuration: '45',
    sessionsPerTerm: '8',
    absenceThreshold: '2',
  });
  const [saved, setSaved] = useState(false);

  const update = (field: keyof typeof params) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  return (
    <div className={styles.paramsCard}>
      <div className={styles.paramsHead}>
        <h3>Parámetros del sistema</h3>
        <p>Valores de configuración del programa de tutoría</p>
      </div>
      <div className={styles.paramsGrid}>
        <div className={styles.field}>
          <label htmlFor="sessionDuration">Duración de sesión (min)</label>
          <input id="sessionDuration" type="number" className={styles.input} value={params.sessionDuration} onChange={update('sessionDuration')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sessionsPerTerm">N° de sesiones por semestre</label>
          <input id="sessionsPerTerm" type="number" className={styles.input} value={params.sessionsPerTerm} onChange={update('sessionsPerTerm')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="absenceThreshold">Umbral de alerta por inasistencias</label>
          <input id="absenceThreshold" type="number" className={styles.input} value={params.absenceThreshold} onChange={update('absenceThreshold')} />
        </div>
      </div>
      <div className={styles.paramsFoot}>
        <Button onClick={() => setSaved(true)}>Guardar parámetros</Button>
        <p className={styles.paramHint}>
          {saved
            ? 'Valores registrados localmente. La persistencia se habilitará en una próxima iteración.'
            : 'Vista previa — esta sección se conectará al backend próximamente.'}
        </p>
      </div>
    </div>
  );
}
