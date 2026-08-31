import { useEffect, useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { profileService } from '../services/profileService';
import type { UserProfile } from '../types/profile.types';
import styles from './ProfilePage.module.css';

interface Feedback {
  type: 'ok' | 'error';
  text: string;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Formulario de datos de contacto
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Feedback | null>(null);

  // Formulario de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Feedback | null>(null);

  useEffect(() => {
    let ignore = false;
    const fetchProfile = async () => {
      try {
        const data = await profileService.get();
        if (ignore) return;
        setProfile(data);
        setPhone(data.phone ?? '');
        setPhotoUrl(data.photoUrl ?? '');
      } catch (error) {
        if (!ignore) setProfileMsg({ type: 'error', text: getApiErrorMessage(error) });
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      ignore = true;
    };
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const updated = await profileService.update({ phone, photoUrl });
      setProfile(updated);
      setProfileMsg({ type: 'ok', text: 'Datos actualizados correctamente.' });
    } catch (error) {
      setProfileMsg({ type: 'error', text: getApiErrorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'La confirmación no coincide con la nueva contraseña.' });
      return;
    }

    setSavingPassword(true);
    try {
      await profileService.changePassword({ currentPassword, newPassword });
      setPasswordMsg({
        type: 'ok',
        text: 'Contraseña actualizada. Se cerraron tus otras sesiones.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordMsg({ type: 'error', text: getApiErrorMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.stateMsg}>Cargando perfil…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.stateMsg}>No se pudo cargar el perfil.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mi perfil</h1>
        <p className={styles.subtitle}>Consulta tus datos y gestiona el acceso a tu cuenta.</p>
      </div>

      <div className={styles.grid2}>
        {/* ── Datos personales ─────────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>Datos personales</h3>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.identity}>
              {photoUrl ? (
                <img className={styles.avatar} src={photoUrl} alt="Foto de perfil" />
              ) : (
                <span className={styles.avatarFallback}>
                  {initials(profile.firstName, profile.lastName)}
                </span>
              )}
              <div>
                <div className={styles.name}>
                  {profile.firstName} {profile.lastName}
                </div>
                <span className={styles.rolePill}>{profile.role}</span>
              </div>
            </div>

            <div className={styles.readonlyField}>
              <span className={styles.readonlyLabel}>Correo institucional</span>
              <span className={styles.readonlyValue}>{profile.email}</span>
            </div>

            <form onSubmit={handleProfileSubmit}>
              {profileMsg && (
                <div className={profileMsg.type === 'ok' ? styles.ok : styles.error} role="alert">
                  {profileMsg.text}
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="phone">Teléfono</label>
                <input
                  id="phone"
                  type="tel"
                  className={styles.input}
                  placeholder="Ej. 987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="photoUrl">URL de la foto</label>
                <input
                  id="photoUrl"
                  type="url"
                  className={styles.input}
                  placeholder="https://…"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  disabled={savingProfile}
                />
              </div>

              <button type="submit" className={styles.button} disabled={savingProfile}>
                {savingProfile ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </section>

        {/* ── Cambio de contraseña ─────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3>Cambiar contraseña</h3>
          </div>
          <div className={styles.panelBody}>
            <form onSubmit={handlePasswordSubmit}>
              {passwordMsg && (
                <div className={passwordMsg.type === 'ok' ? styles.ok : styles.error} role="alert">
                  {passwordMsg.text}
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="currentPassword">Contraseña actual</label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="newPassword">Nueva contraseña</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                  minLength={8}
                />
                <span className={styles.hint}>Mínimo 8 caracteres.</span>
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                />
              </div>

              <button type="submit" className={styles.button} disabled={savingPassword}>
                {savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
