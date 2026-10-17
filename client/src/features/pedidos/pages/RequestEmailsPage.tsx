import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Card, CardBody, Button, Badge, EmptyState, NextSteps, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useRequestSchools, useSetRequestEmail } from '../hooks/useDataRequests';
import styles from './RequestEmailsPage.module.css';

// Configuración: el correo de cada escuela al que se piden las listas (estudiantes y docentes). Se configura aquí, una vez; en
// «Pedir listas» solo se muestra a qué correo saldrá el pedido. La coordinación configura sus escuelas; la DBU, todas.
export function RequestEmailsPage() {
  const { user } = useAuth();
  const schoolsQuery = useRequestSchools();
  const setEmail = useSetRequestEmail();
  const [searchParams] = useSearchParams();
  const focused = searchParams.get('escuela');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Escuelas cuyo correo se está editando; si se llega con ?escuela=… esa escuela se abre para editar.
  const [editing, setEditing] = useState<Set<string>>(() => new Set(focused ? [focused] : []));
  const setEditingOf = (id: string, on: boolean) =>
    setEditing((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const schools = (schoolsQuery.data ?? []).filter((s) => user?.role === 'Administrador DBU' || s.coordinatorId === user?.id);

  const save = async (schoolId: string, schoolName: string, email: string | null) => {
    setFeedback(null);
    try {
      await setEmail.mutateAsync({ schoolId, email });
      setDrafts((current) => ({ ...current, [schoolId]: '' }));
      setEditingOf(schoolId, false);
      setFeedback({ ok: true, text: email ? `Correo de ${schoolName} guardado.` : `Correo de ${schoolName} quitado.` });
    } catch (error) {
      setFeedback({ ok: false, text: getApiErrorMessage(error) });
    }
  };

  return (
    <div>
      <PageHeader
        title="Correos de las escuelas"
        subtitle="El correo al que se piden las listas de estudiantes y de docentes de cada escuela. Se configura aquí; en «Pedir listas» solo se elige la escuela y se pide."
        icon={<SettingsIcon size={24} />}
      />

      {feedback && (
        <p role={feedback.ok ? 'status' : 'alert'} className={feedback.ok ? styles.ok : styles.error}>
          {feedback.text}
        </p>
      )}

      {schoolsQuery.isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : schools.length === 0 ? (
        <EmptyState icon={<SettingsIcon size={26} />} title="No tienes escuelas a cargo" description="Pide a la DBU que te asigne como coordinador de una escuela." />
      ) : (
        <Card>
          <CardBody>
            <ul className={styles.list}>
              {schools.map((school) => {
                const draft = drafts[school.id] ?? '';
                return (
                  <li key={school.id} className={`${styles.row} ${focused === school.id ? styles.focused : ''}`}>
                    <div className={styles.name}>
                      <strong>{school.name}</strong>
                      {school.requestEmail ? <span className={styles.current}>{school.requestEmail}</span> : <Badge tone="warning">Sin configurar</Badge>}
                    </div>
                    {school.requestEmail && !editing.has(school.id) ? (
                      <div className={styles.edit}>
                        <Button size="sm" variant="secondary" aria-label={`Editar el correo de ${school.name}`} onClick={() => setEditingOf(school.id, true)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`Quitar el correo de ${school.name}`} onClick={() => save(school.id, school.name, null)}>
                          Quitar
                        </Button>
                      </div>
                    ) : (
                      <div className={styles.edit}>
                        <label htmlFor={`email-${school.id}`} className={styles.srOnly}>
                          Correo de {school.name}
                        </label>
                        <input
                          id={`email-${school.id}`}
                          type="email"
                          className={styles.input}
                          placeholder={school.requestEmail ? 'Escribe el correo nuevo' : 'correo@untrm.edu.pe'}
                          value={draft}
                          onChange={(e) => setDrafts((current) => ({ ...current, [school.id]: e.target.value }))}
                        />
                        <Button size="sm" disabled={!draft.trim()} loading={setEmail.isPending} onClick={() => save(school.id, school.name, draft.trim())}>
                          Guardar
                        </Button>
                        {school.requestEmail && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingOf(school.id, false);
                              setDrafts((current) => ({ ...current, [school.id]: '' }));
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
          { to: '/pedir-listas', label: 'Pedir las listas', description: 'Elige la escuela y la lista, y pídela: sale a este correo' },
        ]}
      />
    </div>
  );
}
