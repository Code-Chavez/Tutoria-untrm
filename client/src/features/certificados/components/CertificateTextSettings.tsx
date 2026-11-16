import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/components/ui';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { getCertificateTextSettings, saveCertificateSchoolText, saveCertificateTemplateText, type CertificateTextSettingsView } from '../services/certificateService';
import styles from '../pages/CertificatesPage.module.css';

type Values<T> = { [K in keyof T]: string };

/** Formulario con borrador local: se rehace cuando cambian los datos guardados (la `key` del padre) y avisa si algo falla. */
function useSave<T extends object>(schoolId: string, save: (values: T) => Promise<void>) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['certificate-text-settings', schoolId] });
      setNotice('Cambios guardados.');
    },
  });
  return { mutation, notice, setNotice };
}

function TemplateForm({ schoolId, template, defaults, variables }: { schoolId: string; template: CertificateTextSettingsView['template']; defaults: CertificateTextSettingsView['defaults']; variables: string[] }) {
  const [values, setValues] = useState<Values<{ title: string; bodyText: string }>>({ title: template.title, bodyText: template.bodyText });
  const { mutation, notice, setNotice } = useSave(schoolId, (v: { title: string; bodyText: string }) => saveCertificateTemplateText(schoolId, v));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!mutation.isPending) mutation.mutate(values);
  };
  const change = (patch: Partial<typeof values>) => {
    setNotice('');
    mutation.reset();
    setValues({ ...values, ...patch });
  };
  return (
    <form className={styles.textForm} onSubmit={submit}>
      <strong>Título y texto del certificado</strong>
      <small>Valen para todas las escuelas. Variables: {variables.join(' ')}. Lo que va entre {'{{ }}'} sale en negrita.</small>
      <label htmlFor="cert-title">Título del documento</label>
      <input id="cert-title" value={values.title} maxLength={60} disabled={!template.editable} onChange={(e) => change({ title: e.target.value })} />
      <label htmlFor="cert-body">Texto del certificado</label>
      <textarea id="cert-body" rows={6} value={values.bodyText} maxLength={2000} disabled={!template.editable} onChange={(e) => change({ bodyText: e.target.value })} />
      {template.editable ? (
        <div className={styles.assetActions}>
          <Button type="submit" size="sm" disabled={mutation.isPending}>Guardar texto</Button>
          <Button type="button" variant="secondary" size="sm" disabled={mutation.isPending} onClick={() => change({ title: defaults.title, bodyText: defaults.bodyText })}>Restablecer el texto original</Button>
        </div>
      ) : (
        <small>Solo la administración con permiso de identidad visual puede cambiar este texto.</small>
      )}
      {mutation.isError && <small role="alert">{getApiErrorMessage(mutation.error)}</small>}
      <small role="status">{mutation.isPending ? 'Guardando cambio…' : notice}</small>
    </form>
  );
}

function SchoolForm({ schoolId, school, defaults }: { schoolId: string; school: CertificateTextSettingsView['school']; defaults: CertificateTextSettingsView['defaults'] }) {
  const [values, setValues] = useState<Values<{ department: string; signatoryName: string; signatoryRole: string }>>({
    department: school.department ?? '',
    signatoryName: school.signatoryName ?? '',
    signatoryRole: school.signatoryRole ?? '',
  });
  const { mutation, notice, setNotice } = useSave(schoolId, (v: { department: string; signatoryName: string; signatoryRole: string }) => saveCertificateSchoolText(schoolId, v));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!mutation.isPending) mutation.mutate(values);
  };
  const change = (patch: Partial<typeof values>) => {
    setNotice('');
    mutation.reset();
    setValues({ ...values, ...patch });
  };
  return (
    <form className={styles.textForm} onSubmit={submit}>
      <strong>Departamento y autoridad que firma</strong>
      <small>De esta escuela. Si se deja vacío, el certificado imprime el valor predeterminado que se muestra en cada campo.</small>
      <label htmlFor="cert-department">Departamento académico</label>
      <input id="cert-department" value={values.department} maxLength={120} placeholder={defaults.department} disabled={!school.editable} onChange={(e) => change({ department: e.target.value })} />
      <label htmlFor="cert-signatory-name">Nombre y grado de la autoridad que firma</label>
      <input id="cert-signatory-name" value={values.signatoryName} maxLength={120} placeholder={defaults.signatoryName} disabled={!school.editable} onChange={(e) => change({ signatoryName: e.target.value })} />
      <label htmlFor="cert-signatory-role">Cargo de la autoridad</label>
      <input id="cert-signatory-role" value={values.signatoryRole} maxLength={120} placeholder={defaults.signatoryRole} disabled={!school.editable} onChange={(e) => change({ signatoryRole: e.target.value })} />
      {school.editable ? (
        <div className={styles.assetActions}>
          <Button type="submit" size="sm" disabled={mutation.isPending}>Guardar datos de la escuela</Button>
        </div>
      ) : (
        <small>Tu cuenta no puede cambiar estos datos.</small>
      )}
      {mutation.isError && <small role="alert">{getApiErrorMessage(mutation.error)}</small>}
      <small role="status">{mutation.isPending ? 'Guardando cambio…' : notice}</small>
    </form>
  );
}

/** Textos del certificado que se configuran desde la pantalla (issue #271). Se muestra dentro de «Diseño del certificado». */
export function CertificateTextSettings({ schoolId, open }: { schoolId: string; open: boolean }) {
  const settings = useQuery({
    queryKey: ['certificate-text-settings', schoolId],
    queryFn: () => getCertificateTextSettings(schoolId),
    enabled: open && !!schoolId,
    staleTime: 0,
  });
  if (settings.isLoading) return <p role="status">Cargando textos del certificado…</p>;
  if (settings.isError) return <p role="alert">{getApiErrorMessage(settings.error)}</p>;
  if (!settings.data) return null;
  const { template, school, defaults, variables } = settings.data;
  return (
    <div className={styles.textGrid}>
      <TemplateForm key={`${schoolId}-template-${template.title}-${template.bodyText}`} schoolId={schoolId} template={template} defaults={defaults} variables={variables} />
      <SchoolForm key={`${schoolId}-school-${school.department}-${school.signatoryName}-${school.signatoryRole}`} schoolId={schoolId} school={school} defaults={defaults} />
    </div>
  );
}
