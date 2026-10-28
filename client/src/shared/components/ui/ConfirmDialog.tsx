import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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
 * «Cancelar» quedan sin efecto. `loading` llega del padre unos milisegundos DESPUÉS de pulsar «confirmar»; en ese
 * intervalo la petición ya salió, por eso la confirmación se registra al instante en un ref (`confirming`) y se
 * suelta cuando `loading` pasa de verdadero a falso, cuando cambia el mensaje o, si el padre nunca lo activa, tras CONFIRM_GRACE_MS.
 */
const CONFIRM_GRACE_MS = 300;

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

  const confirming = useRef(false);
  const sawLoading = useRef(false);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(graceTimer.current), []);
  useEffect(() => {
    if (loading) {
      sawLoading.current = true;
      clearTimeout(graceTimer.current);
    } else if (sawLoading.current) {
      sawLoading.current = false;
      confirming.current = false;
    }
  }, [loading]);

  useEffect(() => {
    // Un mensaje nuevo es un resultado nuevo (p. ej. otro pedido equivalente): ya se puede decidir de nuevo.
    clearTimeout(graceTimer.current);
    confirming.current = false;
    sawLoading.current = false;
  }, [message]);

  const cancel = useCallback(() => {
    if (!loading && !confirming.current) onCancel();
  }, [loading, onCancel]);

  const confirm = () => {
    if (loading || confirming.current) return;
    confirming.current = true;
    graceTimer.current = setTimeout(() => {
      confirming.current = false;
    }, CONFIRM_GRACE_MS);
    onConfirm();
  };

  useEffect(() => {
    if (!loading) return;
    // El botón con foco pasa a estar deshabilitado: el foco se queda en el diálogo, no se pierde en la página.
    if (!dialogRef.current?.contains(document.activeElement) || (document.activeElement as HTMLElement).matches(':disabled')) {
      dialogRef.current?.focus();
    }
  }, [loading, dialogRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancel]);

  return (
    <div ref={setRoot}>
      <div className={styles.overlay} onClick={cancel}>
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
            <Button variant="secondary" disabled={loading} onClick={cancel}>
              {cancelLabel}
            </Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={confirm}>
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
