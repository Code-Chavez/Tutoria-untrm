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
  /**
   * Debe devolver la promesa de la operación: el diálogo mantiene bloqueados Escape, el fondo, «Cancelar» y otra
   * confirmación hasta que se resuelva o rechace (y también si lanza un error síncrono). `loading` solo pinta el estado.
   */
  onConfirm: () => Promise<unknown>;
  onCancel: () => void;
}

type PanelProps = Omit<ConfirmDialogProps, 'open'>;

/**
 * Se monta solo mientras el diálogo está abierto: así el foco inicial, su contención y su devolución
 * al botón que lo abrió (useDialogFocus) corresponden exactamente a cada apertura.
 * La operación en curso no se puede cancelar: el bloqueo (`confirming`) se activa en el mismo instante de confirmar y se
 * suelta solo cuando la promesa que devuelve `onConfirm` se resuelve o rechaza, sin depender de cuándo el padre actualice
 * `loading` ni de ningún plazo.
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

  const confirming = useRef(false);

  const cancel = useCallback(() => {
    if (!loading && !confirming.current) onCancel();
  }, [loading, onCancel]);

  const busy = () => loading || confirming.current;
  // Un clic en el fondo o en un botón deshabilitado durante la operación no debe sacar el foco del diálogo.
  const keepFocusInside = (event: React.MouseEvent) => {
    if (busy()) event.preventDefault();
  };
  const refocusIfLeft = (event: React.FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (busy() && !(next && dialogRef.current?.contains(next))) queueMicrotask(() => dialogRef.current?.focus());
  };

  const confirm = () => {
    if (loading || confirming.current) return;
    confirming.current = true;
    const release = () => {
      confirming.current = false;
    };
    let operation: Promise<unknown> | undefined;
    try {
      operation = onConfirm();
    } catch (error) {
      release();
      throw error;
    }
    // Un valor que no es promesa (no cumple el contrato) no deja la operación en curso: se libera de inmediato.
    if (operation && typeof operation.then === 'function') operation.then(release, release);
    else release();
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
      <div className={styles.overlay} onClick={cancel} onMouseDown={keepFocusInside}>
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
          onBlur={refocusIfLeft}
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
