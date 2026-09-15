import { EmptyState } from '@shared/components/ui';
import { ClockIcon } from '@shared/components/icons';

/**
 * Actividad reciente. El backend expone auditoría en GET /audit (permiso
 * audit:read), pero aún no hay un endpoint de "feed" resumido para el panel.
 * Se deja el contenedor preparado con un estado vacío honesto (sin datos
 * inventados) hasta que ese endpoint exista.
 */
export function RecentActivity() {
  return (
    <EmptyState
      icon={<ClockIcon size={26} />}
      title="Sin actividad reciente"
      description="Aquí se mostrarán las últimas acciones del sistema cuando el módulo de bitácora resumida esté disponible."
    />
  );
}
