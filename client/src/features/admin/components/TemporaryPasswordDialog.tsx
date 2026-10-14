import { useEffect, useState } from 'react';
import { useDialogFocus } from '@shared/hooks/useDialog';
import styles from './TemporaryPasswordDialog.module.css';

interface TemporaryPasswordDialogProps {
  email: string;
  temporaryPassword: string;
  onClose: () => void;
}

// La clave temporal de una cuenta nueva se muestra solo aquí y solo una vez: el servidor no la guarda en claro.
export function TemporaryPasswordDialog({ email, temporaryPassword, onClose }: TemporaryPasswordDialogProps) {
  const dialogRef = useDialogFocus();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      // Sin acceso al portapapeles se puede seleccionar y copiar la clave a mano.
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="temp-password-title" ref={dialogRef} tabIndex={-1}>
        <h2 id="temp-password-title">Cuenta creada</h2>
        <p>
          Entrega esta clave temporal a <strong>{email}</strong> en persona o por un canal privado. Se muestra{' '}
          <strong>una sola vez</strong>: al cerrar esta ventana no podrás volver a verla.
        </p>
        <div className={styles.secret}>
          <code aria-label="Clave temporal">{temporaryPassword}</code>
          <button type="button" className={styles.copy} onClick={copy}>
            {copied ? 'Copiada' : 'Copiar'}
          </button>
        </div>
        <p className={styles.hint}>La persona deberá cambiarla al iniciar sesión por primera vez.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.done} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
