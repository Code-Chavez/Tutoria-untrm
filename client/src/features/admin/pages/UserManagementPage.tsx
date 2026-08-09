import React, { useEffect, useState, useCallback } from 'react';
import styles from './UserManagementPage.module.css';
import { User, userService, CreateUserData, UpdateUserData } from '../services/userService';
import { Role, roleService } from '../services/roleService';
import { UserFormModal } from '../components/UserFormModal';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers({
        roleId: filterRole || undefined,
        isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
      });
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users', error);
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterStatus]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesData = await roleService.getRoles();
        setRoles(rolesData);
      } catch (error) {
        console.error('Error fetching roles', error);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    fetchUsers(); // Recargar la tabla
  };

  const handleToggleStatus = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas cambiar el estado de este usuario?')) {
      try {
        await userService.toggleUserStatus(id);
        fetchUsers();
      } catch (error) {
        console.error('Error toggling status', error);
      }
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Desconocido';
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestión de Usuarios</h1>
        <button className={styles.addButton} onClick={() => handleOpenModal()}>
          + Nuevo Usuario
        </button>
      </div>

      <div className={styles.filters}>
        <select 
          className={styles.filterSelect}
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Todos los Roles</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los Estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>No se encontraron usuarios</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{`${user.firstName} ${user.lastName}`}</td>
                  <td>{user.email}</td>
                  <td>{getRoleName(user.roleId)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${user.isActive ? styles.statusActive : styles.statusInactive}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={() => handleOpenModal(user)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        className={`${styles.actionButton} ${styles.toggleButton}`}
                        onClick={() => handleToggleStatus(user.id)}
                        title={user.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {user.isActive ? '🛑' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        userToEdit={userToEdit}
        roles={roles}
      />
    </div>
  );
};
