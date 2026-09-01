import { type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCapIcon,
  CalendarIcon,
  AlertTriangleIcon,
  SendIcon,
  SettingsIcon,
} from '@shared/components/icons';
import styles from './DashboardPage.module.css';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const KPIS: {
  Icon: ComponentType<{ size?: number }>;
  value: string;
  label: string;
  hint: string;
  tone: Tone;
}[] = [
  { Icon: GraduationCapIcon, value: '0', label: 'Tutorados activos', hint: 'Periodo 2026-II', tone: 'info' },
  { Icon: CalendarIcon, value: '0', label: 'Sesiones registradas', hint: 'Acumulado del semestre', tone: 'success' },
  { Icon: AlertTriangleIcon, value: '0', label: 'En riesgo académico', hint: 'Requieren seguimiento', tone: 'warning' },
  { Icon: SendIcon, value: '0', label: 'Derivaciones pendientes', hint: 'Por atender', tone: 'danger' },
];

export function DashboardPage() {
  return (
    <div>
      <div className={styles.header}>
        <h2>Panel de inicio</h2>
        <p>Resumen del periodo académico 2026-II · FISME</p>
      </div>

      <div className={styles.cards}>
        {KPIS.map(({ Icon, value, label, hint, tone }) => (
          <article key={label} className={`${styles.kpi} ${styles[tone]}`}>
            <span className={styles.kpiIcon}>
              <Icon size={18} />
            </span>
            <div className={styles.number}>{value}</div>
            <div className={styles.label}>{label}</div>
            <div className={styles.hint}>{hint}</div>
          </article>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>Primeros pasos</h3>
        </div>
        <div className={styles.panelBody}>
          <p className={styles.intro}>
            El sistema SIT se encuentra operativo. Para comenzar, configura el
            personal y los parámetros del sistema desde el módulo de administración.
          </p>
          <Link to="/users" className={styles.cta}>
            <SettingsIcon size={16} />
            Ir a Administración
          </Link>
        </div>
      </div>
    </div>
  );
}
