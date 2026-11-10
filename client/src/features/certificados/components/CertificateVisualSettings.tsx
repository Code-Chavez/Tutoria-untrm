import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, SelectField } from '@shared/components/ui';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { getCertificateVisualSettings, saveCertificateAsset, type CertificateAssetStatus, type CertificateOptions } from '../services/certificateService';
import styles from '../pages/CertificatesPage.module.css';

const labels = {
  universityLogo: ['Logo de la universidad', 'Se usa en todas las facultades.'],
  facultyLogo: ['Logo de la facultad', 'Se usa en todas las escuelas de esta facultad.'],
  watermark: ['Marca de agua gráfica', 'Se aplica a la facultad y se suma a la marca de demostración.'],
  signature: ['Mi firma visual', 'Se usa en los certificados de esta escuela que generes con tu cuenta.'],
} as const;

function AssetForm({ schoolId, asset }: { schoolId: string; asset: CertificateAssetStatus }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState('');
  const mutation = useMutation({
    mutationFn: (image: File | null) => saveCertificateAsset(schoolId, asset.kind, image),
    onSuccess: async (_, image) => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ['certificate-visual-settings', schoolId] });
      setNotice(image ? 'Imagen guardada.' : 'Imagen retirada.');
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (file && file.size <= 1024 * 1024 && !mutation.isPending) mutation.mutate(file);
  };
  const [label, help] = labels[asset.kind];
  const tooLarge = !!file && file.size > 1024 * 1024;
  return (
    <form className={styles.assetForm} onSubmit={submit}>
      <strong>{label}</strong>
      <small id={`${id}-help`}>{help} {asset.configured ? 'Configurada.' : 'Sin configurar.'}</small>
      {asset.editable && (
        <div className={styles.assetActions}>
          <input
            key={mutation.submittedAt && !file ? mutation.submittedAt : 'file'}
            aria-label={label}
            aria-describedby={`${id}-help`}
            type="file"
            accept="image/png,image/jpeg"
            disabled={mutation.isPending}
            onChange={(event) => {
              mutation.reset();
              setNotice('');
              setFile(event.target.files?.[0] ?? null);
            }}
          />
          <Button type="submit" size="sm" disabled={!file || tooLarge || mutation.isPending}>Guardar</Button>
          {asset.configured && <Button type="button" variant="secondary" size="sm" disabled={mutation.isPending} onClick={() => { setNotice(''); mutation.mutate(null); }}>Quitar</Button>}
        </div>
      )}
      {tooLarge && <small role="alert">La imagen supera 1 MB.</small>}
      {mutation.isError && <small role="alert">{getApiErrorMessage(mutation.error)}</small>}
      <small role="status">{mutation.isPending ? 'Guardando cambio…' : notice}</small>
    </form>
  );
}

export function CertificateVisualSettings({ schools, preferredSchool }: { schools: CertificateOptions['schools']; preferredSchool: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const schoolId = selected || preferredSchool || schools[0]?.id || '';
  const settings = useQuery({
    queryKey: ['certificate-visual-settings', schoolId],
    queryFn: () => getCertificateVisualSettings(schoolId),
    enabled: open && !!schoolId,
    staleTime: 0,
  });

  if (!schools.length) return null;
  return (
    <details className={styles.visualSettings} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Diseño del certificado</summary>
      <p>Guarda las imágenes una vez. Se aplican a los PDF que generes después. Usa JPG o PNG de hasta 1 MB. La firma visual es una imagen para la demostración.</p>
      <label htmlFor="cert-visual-school">Escuela para configurar el diseño</label>
      <SelectField id="cert-visual-school" value={schoolId} onChange={(event) => setSelected(event.target.value)}>
        {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
      </SelectField>
      {settings.isLoading && <p role="status">Cargando configuración…</p>}
      {settings.isError && <p role="alert">{getApiErrorMessage(settings.error)}</p>}
      <div className={styles.assetGrid}>
        {settings.data?.map((asset) => <AssetForm key={`${schoolId}-${asset.kind}`} schoolId={schoolId} asset={asset} />)}
      </div>
    </details>
  );
}
