import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { AuthContext } from '@features/auth/context/AuthContext';
import { getRoleLabel } from '@shared/utils/roleLabel';
import { FileDropzone } from '@shared/components/ui';
import { profileService } from '../services/profileService';
import styles from './ProfilePage.module.css';

const PROFILE_QUERY_KEY = ['profile'] as const;
const PHOTO_QUERY_KEY = ['profile-photo'] as const;
const PHOTO_MAX_BYTES = 1024 * 1024;

interface Feedback {
  type: 'ok' | 'error';
  text: string;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const mustChangePassword = auth?.user?.mustChangePassword === true;
  const { data: profile, isLoading: loading } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileService.get(),
  });

  // Formulario de datos de contacto
  const [phone, setPhone] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Feedback | null>(null);

  // Formulario de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Feedback | null>(null);

  // Sincroniza el formulario solo la primera vez que llegan los datos
  // (cacheados o recién pedidos), sin pisar lo que el usuario esté editando
  // si el perfil se revalida en segundo plano.
  const initialized = useRef(false);
  useEffect(() => {
    if (!profile || initialized.current) return;
    initialized.current = true;
    setPhone(profile.phone ?? '');
  }, [profile]);

  // La foto subida no tiene URL pública: se pide con la sesión y se muestra desde un objeto local.
  const hasUploadedPhoto = profile?.hasPhoto === true;
  const { data: uploadedPhotoSrc } = useQuery({
    queryKey: PHOTO_QUERY_KEY,
    queryFn: async () => blobToDataUrl(await profileService.photo()),
    enabled: hasUploadedPhoto,
  });
  const photoSrc = (hasUploadedPhoto ? uploadedPhotoSrc : null) ?? profile?.photoUrl ?? null;

  const changePhoto = async (action: () => Promise<void>, okText: string) => {
    setProfileMsg(null);
    setSavingPhoto(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: PHOTO_QUERY_KEY });
      setProfileMsg({ type: 'ok', text: okText });
    } catch (error) {
      setProfileMsg({ type: 'error', text: getApiErrorMessage(error) });
    } finally {
      setSavingPhoto(false);
    }
  };

  const handlePhotoFile = (file: File) => {
    if (file.size > PHOTO_MAX_BYTES) {
      setProfileMsg({ type: 'error', text: 'La foto no puede superar 1 MB.' });
      return;
    }
    void changePhoto(() => profileService.uploadPhoto(file), 'Foto actualizada.');
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const updated = await profileService.update({ phone });
      queryClient.setQueryData(PROFILE_QUERY_KEY, updated);
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
      auth?.markPasswordChanged();
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

      {mustChangePassword && (
        <p role="alert" className={styles.mustChange}>
          Ingresaste con una clave temporal. Para usar el sistema, cámbiala en «Cambiar contraseña».
        </p>
      )}

      <div className={styles.grid2}>
        {/* ── Datos personales ─────────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Datos personales</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.identity}>
              {photoSrc ? (
                <img className={styles.avatar} src={photoSrc} alt="Foto de perfil" />
              ) : (
                <span className={styles.avatarFallback}>
                  {initials(profile.firstName, profile.lastName)}
                </span>
              )}
              <div>
                <div className={styles.name}>
                  {profile.firstName} {profile.lastName}
                </div>
                <span className={styles.rolePill}>{getRoleLabel(profile.role, profile.service)}</span>
              </div>
            </div>

            <div className={styles.readonlyField}>
              <span className={styles.readonlyLabel}>Correo institucional</span>
              <span className={styles.readonlyValue}>{profile.email}</span>
            </div>

            <div className={styles.field}>
              <span>Foto de perfil</span>
              <FileDropzone
                accept="image/png,image/jpeg,image/webp"
                ariaLabel="Foto de perfil"
                title="Arrastra tu foto aquí o"
                hint="PNG, JPG o WebP · máximo 1 MB"
                busy={savingPhoto}
                onFile={handlePhotoFile}
              />
              {profile.hasPhoto && (
                <button
                  type="button"
                  className={styles.button}
                  disabled={savingPhoto}
                  onClick={() => void changePhoto(() => profileService.removePhoto(), 'Foto eliminada.')}
                >
                  Quitar foto
                </button>
              )}
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

              <button type="submit" className={styles.button} disabled={savingProfile}>
                {savingProfile ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </section>

        {/* ── Cambio de contraseña ─────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Cambiar contraseña</h2>
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
