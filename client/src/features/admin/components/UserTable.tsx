import React from 'react';
import { Badge, IconButton } from '@shared/components/ui';
import { PencilIcon, BanIcon, CheckCircleIcon } from '@shared/components/icons';
import { User } from '../services/userService';
import table from '@shared/components/ui/DataTable.module.css';

interface UserTableProps {
  users: User[];
  roleName: (roleId: string) => string;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

function initials(user: User): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  roleName,
  onEdit,
  onToggleStatus,
}) => (
  <div className={table.scroll}>
    <table className={table.table}>
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Último acceso</th>
          <th className={table.right}>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>
              <div className={table.userCell}>
                <span className={table.avatar}>{initials(user)}</span>
                <div className={table.stack}>
                  <span className={table.name}>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={table.sub}>{user.email}</span>
                </div>
              </div>
            </td>
            <td>
              <Badge tone="info">{roleName(user.roleId)}</Badge>
            </td>
            <td>
              {user.isActive ? (
                <Badge tone="success">Activo</Badge>
              ) : (
                <Badge tone="neutral">Inactivo</Badge>
              )}
            </td>
            <td>
              <span className={table.muted}>—</span>
            </td>
            <td>
              <div className={table.actions}>
                <IconButton label="Editar usuario" onClick={() => onEdit(user)}>
                  <PencilIcon size={16} />
                </IconButton>
                <IconButton
                  label={user.isActive ? 'Desactivar' : 'Activar'}
                  tone={user.isActive ? 'danger' : 'success'}
                  onClick={() => onToggleStatus(user)}
                >
                  {user.isActive ? <BanIcon size={16} /> : <CheckCircleIcon size={16} />}
                </IconButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
