import { useRef, useState, type CSSProperties } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, Card, Button, ConfirmDialog } from '@shared/components/ui';
import { SettingsIcon, UploadIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { BRANDING_QUERY_KEY, useBranding } from '@shared/theme/BrandingProvider';
import { Branding, brandingService } from '@shared/theme/brandingService';
import { buildPaletteVars, contrastRatio, isHexColor, MIN_TEXT_CONTRAST } from '@shared/theme/palette';
import styles from './BrandingPage.module.css';

const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Identidad visual institucional (HU-50): el DBU ajusta el logotipo, los
// nombres y los colores. Al guardar, toda la interfaz adopta la nueva paleta.
type Message = { type: 'ok' | 'error'; text: string } | null;

function BrandingEditor({
  current,
  logoSrc,
  message,
  setMessage,
}: {
  current: Branding;
  logoSrc: string;
  message: Message;
  setMessage: (message: Message) => void;
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    institutionName: current.institutionName,
    shortName: current.shortName,
    primaryColor: current.primaryColor,
    accentColor: current.accentColor,
  });
  const [confirmReset, setConfirmReset] = useState(false);

  // Cada operación devuelve la identidad ya guardada: se publica en la caché global.
  const publish = (branding: Branding) => {
    queryClient.setQueryData(BRANDING_QUERY_KEY, branding);
    try {
      localStorage.setItem('sit.branding', JSON.stringify(branding));
    } catch {
      // Sin almacenamiento: se vuelve a pedir en la próxima carga.
    }
  };
  const run = async (action: () => Promise<Branding>, okText: string) => {
    setMessage(null);
    try {
      const branding = await action();
      publish(branding);
      setForm({
        institutionName: branding.institutionName,
        shortName: branding.shortName,
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
      });
      setMessage({ type: 'ok', text: okText });
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const save = useMutation({ mutationFn: () => brandingService.update(form) });
  const upload = useMutation({ mutationFn: (file: File) => brandingService.uploadLogo(file) });
  const remove = useMutation({ mutationFn: () => brandingService.removeLogo() });
  const reset = useMutation({ mutationFn: () => brandingService.reset() });

  const colorsValid = isHexColor(form.primaryColor) && isHexColor(form.accentColor);
  const ratio = isHexColor(form.primaryColor) ? contrastRatio(form.primaryColor, '#FFFFFF') : 0;
  const readable = ratio >= MIN_TEXT_CONTRAST;
  const dirty =
    form.institutionName !== current.institutionName ||
    form.shortName !== current.shortName ||
    form.primaryColor.toUpperCase() !== current.primaryColor.toUpperCase() ||
    form.accentColor.toUpperCase() !== current.accentColor.toUpperCase();
  const canSave = dirty && colorsValid && readable && form.institutionName.trim().length >= 3 && form.shortName.trim().length >= 2;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'El logotipo debe ser una imagen PNG, JPEG o WebP.' });
    } else if (file.size > MAX_LOGO_BYTES) {
      setMessage({ type: 'error', text: 'El logotipo no puede superar 1 MB.' });
    } else {
      void run(() => upload.mutateAsync(file), 'Logotipo actualizado.');
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  // La vista previa aplica la paleta elegida solo dentro de su contenedor.
  const previewVars = colorsValid ? (buildPaletteVars(form.primaryColor, form.accentColor) as CSSProperties) : {};

  return (
    <div className={styles.layout}>
      <Card padded>
        <h3 className={styles.heading}>Textos</h3>
        <div className={styles.field}>
          <label htmlFor="br-institution">Nombre de la institución</label>
          <input id="br-institution" value={form.institutionName} maxLength={150} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor="br-short">Nombre corto</label>
          <input id="br-short" value={form.shortName} maxLength={30} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
          <small>Aparece junto al logotipo en la barra lateral y como título del navegador.</small>
        </div>

        <h3 className={styles.heading}>Colores</h3>
        <div className={styles.colors}>
          {([
            ['primaryColor', 'Color principal', 'br-primary'],
            ['accentColor', 'Color de acento', 'br-accent'],
          ] as const).map(([key, label, id]) => (
            <div className={styles.field} key={key}>
              <label htmlFor={id}>{label}</label>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  aria-label={`${label} (selector)`}
                  value={isHexColor(form[key]) ? form[key] : '#000000'}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value.toUpperCase() })}
                />
                <input id={id} value={form[key]} maxLength={7} aria-invalid={!isHexColor(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
        {colorsValid && !readable && (
          <p role="alert" className={styles.warn}>
            El color principal es demasiado claro: el texto blanco sobre él no se leería bien (contraste {ratio.toFixed(1)}:1, mínimo {MIN_TEXT_CONTRAST}:1). Elige un tono más oscuro.
          </p>
        )}
        {!colorsValid && (
          <p role="alert" className={styles.warn}>
            Usa el formato #RRGGBB, por ejemplo #14315F.
          </p>
        )}

        <h3 className={styles.heading}>Logotipo</h3>
        <div className={styles.logoRow}>
          <img src={logoSrc} alt="Logotipo actual" className={styles.logoThumb} />
          <div className={styles.logoActions}>
            <input ref={fileInput} type="file" accept={LOGO_TYPES.join(',')} hidden aria-label="Archivo del logotipo" onChange={(e) => handleFile(e.target.files?.[0])} />
            <Button variant="secondary" size="sm" icon={<UploadIcon size={16} />} loading={upload.isPending} onClick={() => fileInput.current?.click()}>
              {current.hasCustomLogo ? 'Reemplazar logotipo' : 'Subir logotipo'}
            </Button>
            {current.hasCustomLogo && (
              <Button variant="ghost" size="sm" loading={remove.isPending} onClick={() => run(() => remove.mutateAsync(), 'Se restableció el logotipo institucional.')}>
                Usar el logotipo institucional
              </Button>
            )}
            <small>PNG, JPEG o WebP de hasta 1 MB. Se recomienda fondo transparente.</small>
          </div>
        </div>

        {message && (
          <p role={message.type === 'error' ? 'alert' : 'status'} className={message.type === 'error' ? styles.error : styles.ok}>
            {message.text}
          </p>
        )}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            Restablecer identidad UNTRM
          </Button>
          <Button disabled={!canSave} loading={save.isPending} onClick={() => run(() => save.mutateAsync(), 'Identidad guardada: ya se aplica en todo el sistema.')}>
            Guardar cambios
          </Button>
        </div>
      </Card>

      <Card padded>
        <h3 className={styles.heading}>Vista previa</h3>
        <div className={styles.preview} style={previewVars} data-testid="preview">
          <div className={styles.previewBar}>
            <img src={logoSrc} alt="" className={styles.previewLogo} />
            <b>{form.shortName || '—'}</b>
          </div>
          <div className={styles.previewBody}>
            <p>{form.institutionName || '—'}</p>
            <span className={styles.previewButton}>Botón principal</span>
            <span className={styles.previewTag}>Etiqueta</span>
            <span className={styles.previewAccent} />
          </div>
        </div>
        <p className={styles.hint}>Así se verán la barra lateral, los botones y los destacados. Los documentos PDF y Excel conservan la identidad oficial de la UNTRM.</p>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Restablecer identidad"
        message="Se volverá a los colores, nombres y logotipo institucionales de la UNTRM. ¿Continuar?"
        confirmLabel="Restablecer"
        tone="danger"
        loading={reset.isPending}
        onConfirm={async () => {
          await run(() => reset.mutateAsync(), 'Se restableció la identidad institucional.');
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

export function BrandingPage() {
  const { branding, logoSrc } = useBranding();
  // El mensaje vive aquí: el editor se remonta al cambiar la identidad y no debe perderlo.
  const [message, setMessage] = useState<Message>(null);
  return (
    <div className={styles.page}>
      <PageHeader
        title="Identidad visual"
        subtitle="Logotipo, nombres y paleta institucional. Los cambios se aplican a todo el sistema, incluida la pantalla de inicio de sesión."
        icon={<SettingsIcon size={22} />}
      />
      {/* Se remonta si la identidad cambia desde fuera (p. ej. tras restablecer). */}
      <BrandingEditor key={`${branding.updatedAt}-${branding.primaryColor}`} current={branding} logoSrc={logoSrc} message={message} setMessage={setMessage} />
    </div>
  );
}
