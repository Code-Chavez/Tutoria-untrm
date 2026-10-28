import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmDialog.module.css';
import { Button } from './Button';
import { AlertTriangleIcon } from '@shared/components/icons';
import { useDialogFocus } from '@shared/hooks/useDialog';
import { useInertBackground } from '@shared/hooks/useInertBackground';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

type PanelProps = Omit<ConfirmDialogProps, 'open'>;

/**
 * Se monta solo mientras el diálogo está abierto: así el foco inicial, su contención y su devolución
 * al botón que lo abrió (useDialogFocus) corresponden exactamente a cada apertura.
 * Mientras `loading` la operación está en curso y no se puede cancelar: Escape, el fondo y
 * «Cancelar» quedan sin efecto.
 */
const ConfirmPanel: React.FC<PanelProps> = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const messageId = useId();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  // Orden importante: al cerrar, React deshace los efectos en este orden. Primero se retira `inert` del fondo
  // y después useDialogFocus devuelve el foco al botón que abrió el diálogo; un elemento inerte no puede recibirlo.
  useInertBackground(root);
  const dialogRef = useDialogFocus<HTMLDivElement>();

  useEffect(() => {
    if (!loading) return;
    // El botón con foco pasa a estar deshabilitado: el foco se queda en el diálogo, no se pierde en la página.
    if (!dialogRef.current?.contains(document.activeElement) || (document.activeElement as HTMLElement).matches(':disabled')) {
      dialogRef.current?.focus();
    }
  }, [loading, dialogRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, onCancel]);

  return (
    <div ref={setRoot}>
      <div className={styles.overlay} onClick={loading ? undefined : onCancel}>
        <div
          ref={dialogRef}
          className={styles.dialog}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          aria-busy={loading || undefined}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`${styles.iconWrap} ${styles[tone]}`}>
            <AlertTriangleIcon size={22} />
          </div>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <div id={messageId} className={styles.message}>{message}</div>
          <div className={styles.actions}>
            <Button variant="secondary" disabled={loading} onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, ...panel }) =>
  open ? createPortal(<ConfirmPanel {...panel} />, document.body) : null;
