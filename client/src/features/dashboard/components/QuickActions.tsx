import { type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@features/auth/hooks/useAuth';
import {
  UserPlusIcon,
  UploadIcon,
  GraduationCapIcon,
  SettingsIcon,
  ChevronRightIcon,
} from '@shared/components/icons';
import styles from './QuickActions.module.css';

interface Action {
  label: string;
  description: string;
  to: string;
  Icon: ComponentType<{ size?: number }>;
  roles?: string[]; // nombres de rol; sin roles = todos
}

const ACTIONS: Action[] = [
  {
    label: 'Registrar tutorado',
    description: 'Alta individual de un estudiante',
    to: '/tutorados',
    Icon: UserPlusIcon,
    roles: ['Coordinador', 'Administrador DBU'],
  },
  {
    label: 'Carga masiva',
    description: 'Importar estudiantes desde Excel',
    to: '/carga-masiva',
    Icon: UploadIcon,
    roles: ['Coordinador', 'Administrador DBU'],
  },
  {
    label: 'Ver tutorados',
    description: 'Consultar y filtrar estudiantes',
    to: '/tutorados',
    Icon: GraduationCapIcon,
    roles: ['Docente Tutor', 'Coordinador', 'Administrador DBU'],
  },
  {
    label: 'Administración',
    description: 'Usuarios, roles y parámetros',
    to: '/users',
    Icon: SettingsIcon,
    roles: ['Administrador DBU'],
  },
];

export function QuickActions() {
  const { user } = useAuth();
  const actions = ACTIONS.filter((a) => !a.roles || (user && a.roles.includes(user.role)));

  if (actions.length === 0) return null;

  return (
    <div className={styles.grid}>
      {actions.map((action) => (
        <Link key={action.label} to={action.to} className={styles.action}>
          <span className={styles.icon}>
            <action.Icon size={20} />
          </span>
          <span className={styles.text}>
            <b>{action.label}</b>
            <small>{action.description}</small>
          </span>
          <span className={styles.arrow}>
            <ChevronRightIcon size={16} />
          </span>
        </Link>
      ))}
    </div>
  );
}
