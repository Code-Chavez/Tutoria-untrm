import { useState } from 'react';
import { useUrlParams } from '@shared/hooks/useUrlParams';
import { useDraft } from '@shared/hooks/useDraft';
import { useCatalog, useCatalogMutations } from '@features/catalogos/hooks/useCatalog';
import { PageHeader, Card, CardBody, Button, Badge, EmptyState, NextSteps, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useRequestSchools, useSetRequestEmail } from '../hooks/useDataRequests';
import styles from './RequestEmailsPage.module.css';

// Destinatarios de los pedidos de listas por escuela y por facultad. En
// «Pedir listas» se muestra el correo configurado para el destinatario elegido.
export function RequestEmailsPage() {
  const { user } = useAuth();
  const schoolsQuery = useRequestSchools();
  const setEmail = useSetRequestEmail();
  const url = useUrlParams();
  const isDbu = user?.role === 'Administrador DBU';
  const facultyMode = isDbu && url.get('tipo') === 'facultades';
  const faculties = useCatalog('faculties', facultyMode);
  const updateFaculty = useCatalogMutations('faculties').update;
  const focusKey = facultyMode ? 'facultad' : 'escuela';
  const focused = url.get(focusKey);
  const draftKey = (id: string) => facultyMode ? `facultad:${id}` : id;
  // El correo escrito se conserva como borrador de la pestaña.
  const { value: drafts, setValue: setDrafts } = useDraft<Record<string, string>>(user?.id, 'correos-escuelas', {}, (v) => Object.values(v).every((x) => !x));
  // El enlace desde el pedido abre la edición del destinatario indicado en la URL.
  const editingParam = url.get('editar');
  const editing = new Set([...(editingParam ? editingParam.split(',') : []), ...(focused ? [focused] : [])]);
  const setEditingOf = (id: string, on: boolean) => {
    const next = new Set(editingParam ? editingParam.split(',') : []);
    if (on) next.add(id);
    else next.delete(id);
    // Al terminar, se limpia también el foco recibido desde el pedido.
    url.set({ editar: [...next].join(','), ...(!on && id === focused ? { [focusKey]: null } : {}) }, { replace: true });
  };
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const schools = (schoolsQuery.data ?? []).filter((school) => isDbu || school.coordinatorId === user?.id);
  const contacts = facultyMode ? faculties.entries : schools;
  const loading = facultyMode ? faculties.loading : schoolsQuery.isLoading;
  const failed = facultyMode ? faculties.error : schoolsQuery.isError;
  const refresh = facultyMode ? faculties.refresh : schoolsQuery.refetch;
  const saving = updateFaculty.isPending || setEmail.isPending;

  const save = async (id: string, name: string, email: string | null) => {
    setFeedback(null);
    try {
      if (facultyMode) await updateFaculty.mutateAsync({ id, input: { requestEmail: email } });
      else await setEmail.mutateAsync({ schoolId: id, email });
      setDrafts((current) => ({ ...current, [draftKey(id)]: '' }));
      setEditingOf(id, false);
      setFeedback({ ok: true, text: email ? `Correo de ${name} guardado.` : `Correo de ${name} quitado.` });
    } catch (error) {
      setFeedback({ ok: false, text: getApiErrorMessage(error) });
    }
  };

  return (
    <div>
      <PageHeader
        title="Correos para pedidos de listas"
        subtitle={isDbu ? "Configura los destinatarios de los pedidos por escuela o por facultad." : "Configura los destinatarios de los pedidos de tus escuelas."}
        icon={<SettingsIcon size={24} />}
      />

      {isDbu && (
        <div className={styles.scope} role="group" aria-label="Tipo de destinatario">
          <Button size="sm" variant={facultyMode ? 'secondary' : 'primary'} aria-pressed={!facultyMode} disabled={saving} onClick={() => {
            url.set({ tipo: null, escuela: null, facultad: null, editar: null }, { replace: true });
            setFeedback(null);
          }}>Escuelas</Button>
          <Button size="sm" variant={facultyMode ? 'primary' : 'secondary'} aria-pressed={facultyMode} disabled={saving} onClick={() => {
            url.set({ tipo: 'facultades', escuela: null, facultad: null, editar: null }, { replace: true });
            setFeedback(null);
          }}>Facultades</Button>
        </div>
      )}

      {feedback && (
        <p role={feedback.ok ? 'status' : 'alert'} className={feedback.ok ? styles.ok : styles.error}>
          {feedback.text}
        </p>
      )}

      {loading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : failed ? (
        <EmptyState variant="error" icon={<SettingsIcon size={26} />} title="No se pudieron cargar los destinatarios" action={<Button onClick={() => refresh()}>Reintentar</Button>} />
      ) : contacts.length === 0 ? (
        <EmptyState icon={<SettingsIcon size={26} />} title={facultyMode ? "Sin facultades registradas" : "No tienes escuelas a cargo"} description={facultyMode ? "Registra una facultad desde Catálogos." : "Pide a la DBU que te asigne como coordinador de una escuela."} />
      ) : (
        <Card>
          <CardBody>
            <ul className={styles.list}>
              {contacts.map((contact) => {
                const draft = drafts[draftKey(contact.id)] ?? '';
                return (
                  <li key={contact.id} className={`${styles.row} ${focused === contact.id ? styles.focused : ''}`}>
                    <div className={styles.name}>
                      <strong>{contact.name}</strong>
                      {contact.requestEmail ? <span className={styles.current}>{contact.requestEmail}</span> : <Badge tone="warning">Sin configurar</Badge>}
                    </div>
                    {contact.requestEmail && !editing.has(contact.id) ? (
                      <div className={styles.edit}>
                        <Button size="sm" variant="secondary" aria-label={`Editar el correo de ${contact.name}`} onClick={() => setEditingOf(contact.id, true)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" disabled={saving} aria-label={`Quitar el correo de ${contact.name}`} onClick={() => save(contact.id, contact.name, null)}>
                          Quitar
                        </Button>
                      </div>
                    ) : (
                      <div className={styles.edit}>
                        <label htmlFor={`email-${contact.id}`} className={styles.srOnly}>
                          Correo de {contact.name}
                        </label>
                        <input
                          id={`email-${contact.id}`}
                          type="email"
                          className={styles.input}
                          placeholder={contact.requestEmail ? 'Escribe el correo nuevo' : 'correo@untrm.edu.pe'}
                          value={draft}
                          onChange={(e) => setDrafts((current) => ({ ...current, [draftKey(contact.id)]: e.target.value }))}
                        />
                        <Button size="sm" disabled={!draft.trim()} loading={saving} onClick={() => save(contact.id, contact.name, draft.trim())}>
                          Guardar
                        </Button>
                        {contact.requestEmail && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingOf(contact.id, false);
                              setDrafts((current) => ({ ...current, [draftKey(contact.id)]: '' }));
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      <NextSteps
        steps={[
          { to: facultyMode ? '/pedir-listas?alcance=facultad' : '/pedir-listas', label: 'Pedir las listas', description: 'Elige el destinatario y la lista que necesitas' },
        ]}
      />
    </div>
  );
}
