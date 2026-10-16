import { useEffect, useState } from 'react';
import { useDialogFocus } from '@shared/hooks/useDialog';
import type { Invitation } from '../services/userService';
import styles from './InvitationDialog.module.css';

interface InvitationDialogProps {
  email: string;
  invitation: Invitation;
  onClose: () => void;
}

// La invitación (enlace de un solo uso) se muestra aquí y solo en esta respuesta: el servidor guarda únicamente su huella.
export function InvitationDialog({ email, invitation, onClose }: InvitationDialogProps) {
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
      await navigator.clipboard.writeText(invitation.link);
      setCopied(true);
    } catch {
      // Sin acceso al portapapeles se puede seleccionar y copiar el enlace a mano.
    }
  };

  const expires = new Date(invitation.expiresAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="invitation-title" ref={dialogRef} tabIndex={-1}>
        <h2 id="invitation-title">Invitación emitida</h2>
        {invitation.emailSent ? (
          <p>
            Se envió un correo a <strong>{email}</strong> con un enlace para que cree su propia contraseña. No se generó ninguna clave.
          </p>
        ) : (
          <p role="alert" className={styles.warn}>
            <strong>No se pudo enviar el correo</strong> a {email}. Entregue este enlace a la persona por un medio privado.
          </p>
        )}
        <div className={styles.secret}>
          <code aria-label="Enlace de activación">{invitation.link}</code>
          <button type="button" className={styles.copy} onClick={copy}>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <p className={styles.hint}>
          El enlace sirve <strong>una sola vez</strong> y vence el {expires}. Quien lo abra primero podrá crear la contraseña de la cuenta: no lo
          comparta. Se muestra solo ahora; si se pierde o vence, emita uno nuevo desde la lista de usuarios.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.done} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
