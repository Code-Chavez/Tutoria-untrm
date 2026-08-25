import React, { useEffect, useState } from 'react';
import styles from './UserManagementPage.module.css';
import { User, userService, CreateUserData, UpdateUserData } from '../services/userService';
import { Role, roleService } from '../services/roleService';
import { UserFormModal } from '../components/UserFormModal';
import { PlusIcon, PencilIcon, BanIcon, CheckCircleIcon } from '@shared/components/icons';

type TabId = 'usuarios' | 'catalogos' | 'parametros' | 'bitacora';

const TABS: { id: TabId; label: string }[] = [
  { id: 'usuarios', label: 'Usuarios y roles' },
  { id: 'catalogos', label: 'Catálogos' },
  { id: 'parametros', label: 'Parámetros' },
  { id: 'bitacora', label: 'Bitácora de auditoría' },
];

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabId>('usuarios');

  // Filtros
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Se incrementa para forzar una recarga de la tabla tras crear/editar/togglear.
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshUsers = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setRoles(await roleService.getRoles());
      } catch (error) {
        console.error('Error fetching roles', error);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    let ignore = false;
    const fetchUsers = async () => {
      try {
        const data = await userService.getUsers({
          roleId: filterRole || undefined,
          isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
        });
        if (!ignore) setUsers(data);
      } catch (error) {
        console.error('Error fetching users', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchUsers();
    return () => {
      ignore = true;
    };
  }, [filterRole, filterStatus, refreshKey]);

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
    refreshUsers();
  };

  const handleToggleStatus = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas cambiar el estado de este usuario?')) {
      try {
        await userService.toggleUserStatus(id);
        refreshUsers();
      } catch (error) {
        console.error('Error toggling status', error);
      }
    }
  };

  const getRoleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? 'Desconocido';

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Administración del Sistema</h1>
        <p className={styles.subtitle}>Usuarios, roles, catálogos maestros y parámetros</p>
      </div>

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

      {activeTab === 'usuarios' ? (
        <div className={styles.grid2}>
          {/* ── Usuarios ─────────────────────────────── */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h3>Usuarios</h3>
              <button className={styles.addButton} onClick={() => handleOpenModal()}>
                <PlusIcon size={15} />
                Nuevo
              </button>
            </div>

            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">Todos los roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            <div className={styles.tableWrap}>
              {loading ? (
                <div className={styles.stateMsg}>Cargando usuarios…</div>
              ) : users.length === 0 ? (
                <div className={styles.stateMsg}>No se encontraron usuarios</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th className={styles.actionsHead}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className={styles.userCell}>
                          <span className={styles.userEmail}>{user.email}</span>
                          <span className={styles.userName}>
                            {user.firstName} {user.lastName}
                          </span>
                        </td>
                        <td>
                          <span className={styles.pill}>{getRoleName(user.roleId)}</span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${user.isActive ? styles.statusActive : styles.statusInactive}`}
                          >
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={`${styles.actionButton} ${styles.editButton}`}
                              onClick={() => handleOpenModal(user)}
                              title="Editar"
                              aria-label={`Editar a ${user.firstName} ${user.lastName}`}
                            >
                              <PencilIcon size={15} />
                            </button>
                            <button
                              className={`${styles.actionButton} ${user.isActive ? styles.deactivateButton : styles.activateButton}`}
                              onClick={() => handleToggleStatus(user.id)}
                              title={user.isActive ? 'Desactivar' : 'Activar'}
                              aria-label={
                                user.isActive
                                  ? `Desactivar a ${user.firstName} ${user.lastName}`
                                  : `Activar a ${user.firstName} ${user.lastName}`
                              }
                            >
                              {user.isActive ? <BanIcon size={15} /> : <CheckCircleIcon size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* ── Parámetros del sistema ───────────────── */}
          <SystemParametersPanel />
        </div>
      ) : (
        <div className={styles.placeholder}>
          <span className={styles.soonTag}>Próximamente</span>
          <p>La sección «{activeLabel}» estará disponible en una próxima iteración.</p>
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
    </div>
  );
};

/**
 * Panel de parámetros del sistema. Réplica visual del mockup; la persistencia
 * se conectará al backend en una TT posterior (aún no hay endpoint de parámetros).
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
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h3>Parámetros del sistema</h3>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.field}>
          <label htmlFor="sessionDuration">Duración de sesión (min)</label>
          <input
            id="sessionDuration"
            type="number"
            className={styles.input}
            value={params.sessionDuration}
            onChange={update('sessionDuration')}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="sessionsPerTerm">N° de sesiones por semestre</label>
          <input
            id="sessionsPerTerm"
            type="number"
            className={styles.input}
            value={params.sessionsPerTerm}
            onChange={update('sessionsPerTerm')}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="absenceThreshold">Umbral de alerta por inasistencias</label>
          <input
            id="absenceThreshold"
            type="number"
            className={styles.input}
            value={params.absenceThreshold}
            onChange={update('absenceThreshold')}
          />
        </div>
        <button className={styles.saveButton} onClick={() => setSaved(true)}>
          Guardar parámetros
        </button>
        <p className={styles.paramHint}>
          {saved
            ? 'Valores registrados localmente. La persistencia se habilitará en una próxima iteración.'
            : 'Vista previa — esta sección se conectará al backend próximamente.'}
        </p>
      </div>
    </section>
  );
}
