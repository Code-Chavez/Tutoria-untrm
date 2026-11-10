import { useCallback, useState, type FormEvent } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, SelectField, EmptyState, NextSteps, TableSkeleton } from '@shared/components/ui';
import { MapPinIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useDraft } from '@shared/hooks/useDraft';
import { useAuth } from '@features/auth/hooks/useAuth';
import { type Campus, type CampusKind } from '../services/campusService';
import { useCampuses, useCreateCampus, useSetSchoolCampus, useSetSchoolCampuses, useUpdateCampus } from '../hooks/useCampuses';
import styles from './CampusesPage.module.css';

/** Ciudad de la sede (se imprime en la fecha del certificado). Vacía = la ciudad predeterminada. */
function CampusCity({ campus, save }: { campus: Campus; save: (city: string | null) => Promise<unknown> }) {
  const [city, setCity] = useState(campus.city ?? '');
  const changed = city.trim() !== (campus.city ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (changed) void save(city.trim() === '' ? null : city.trim());
  };
  return (
    <form className={styles.cityForm} onSubmit={submit}>
      <label htmlFor={`city-${campus.id}`}>Ciudad de {campus.name}</label>
      <input id={`city-${campus.id}`} className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chachapoyas (predeterminada)" maxLength={80} />
      <Button type="submit" variant="secondary" size="sm" disabled={!changed}>
        Guardar ciudad
      </Button>
    </form>
  );
}

// Sedes de la universidad y la sede de cada escuela. Las configura Vicerrectorado (o la DBU): una escuela pertenece a una sola sede,
// y de ella depende qué docentes pueden tutorear a sus estudiantes.
export function CampusesPage() {
  const overview = useCampuses();
  const create = useCreateCampus();
  const update = useUpdateCampus();
  const setCampus = useSetSchoolCampus();
  const setCampuses = useSetSchoolCampuses();
  const { user } = useAuth();
  // El nombre de la sede nueva que se estaba escribiendo se conserva como borrador de la pestaña.
  const nameIsEmpty = useCallback((value: string) => value.trim() === '', []);
  const { value: name, setValue: setName, discard: clearName } = useDraft<string>(user?.id, 'campus-name', '', nameIsEmpty);
  const [error, setError] = useState('');
  const [newKind, setNewKind] = useState<CampusKind>('SEDE');

  const campuses = overview.data?.campuses ?? [];
  const schools = overview.data?.schools ?? [];
  const active = campuses.filter((c) => c.isActive);

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await create.mutateAsync({ name, kind: newKind });
      clearName();
      setNewKind('SEDE');
    });
  };

  return (
    <div>
      <PageHeader
        title="Sedes"
        subtitle="Cada escuela profesional pertenece a una sola sede. Un docente tutor solo atiende estudiantes de su escuela."
        icon={<MapPinIcon size={24} />}
      />

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {overview.isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : overview.isError ? (
        <EmptyState icon={<MapPinIcon size={26} />} title="No se pudieron cargar las sedes" description="Vuelve a intentarlo en un momento." />
      ) : (
        <div className={styles.grid}>
          <Card>
            <CardHeader title="Sedes" description={`${active.length} activa(s)`} />
            <CardBody>
              <ul className={styles.list}>
                {campuses.map((campus) => (
                  <li key={campus.id} className={styles.row}>
                    <span className={styles.name}>{campus.name}</span>
                    <Badge tone={campus.isActive ? 'success' : 'neutral'}>{campus.isActive ? 'Activa' : 'Inactiva'}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${campus.isActive ? 'Desactivar' : 'Activar'} ${campus.name}`}
                      onClick={() => run(() => update.mutateAsync({ id: campus.id, isActive: !campus.isActive }))}
                    >
                      {campus.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                    <SelectField
                      aria-label={`Tipo de ${campus.name}`}
                      value={campus.kind ?? 'SEDE'}
                      onChange={(e) => run(() => update.mutateAsync({ id: campus.id, kind: e.target.value as CampusKind }))}
                    >
                      <option value="SEDE">Sede</option>
                      <option value="FILIAL">Filial</option>
                    </SelectField>
                    <CampusCity key={`${campus.id}-${campus.city ?? ''}`} campus={campus} save={(city) => run(() => update.mutateAsync({ id: campus.id, city }))} />
                  </li>
                ))}
              </ul>
              <form className={styles.add} onSubmit={submit}>
                <label htmlFor="campus-name">Nueva sede o filial</label>
                <input id="campus-name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sede … o Filial …" maxLength={80} />
                <SelectField aria-label="Tipo de la nueva sede" value={newKind} onChange={(e) => setNewKind(e.target.value as CampusKind)}>
                  <option value="SEDE">Sede</option>
                  <option value="FILIAL">Filial</option>
                </SelectField>
                <Button type="submit" size="sm" disabled={name.trim().length < 3} loading={create.isPending}>
                  Agregar
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sede de cada escuela" description="Elige dónde se dicta cada escuela profesional." />
            <CardBody>
              {schools.length === 0 ? (
                <p className={styles.muted}>Aún no hay escuelas registradas.</p>
              ) : (
                <ul className={styles.list}>
                  {schools.map((school) => (
                    <li key={school.id} className={styles.row}>
                      <label htmlFor={`campus-${school.id}`} className={styles.name}>
                        {school.name}
                      </label>
                      <SelectField
                        id={`campus-${school.id}`}
                        value={school.campusId ?? ''}
                        onChange={(e) => e.target.value && run(() => setCampus.mutateAsync({ schoolId: school.id, campusId: e.target.value }))}
                      >
                        {!school.campusId && <option value="">Sin sede…</option>}
                        {campuses
                          .filter((c) => c.isActive || c.id === school.campusId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </SelectField>
                      {active.length > 1 && (
                        <fieldset className={styles.alsoTaught}>
                          <legend>Se dicta también en</legend>
                          {active.map((c) => {
                            const taughtIn = school.campusIds ?? (school.campusId ? [school.campusId] : []);
                            const checked = taughtIn.includes(c.id);
                            return (
                              <label key={c.id}>
                                <input
                                  type="checkbox"
                                  aria-label={`${school.name} se dicta en ${c.name}`}
                                  checked={checked}
                                  disabled={checked && taughtIn.length === 1}
                                  onChange={() => run(() => setCampuses.mutateAsync({ schoolId: school.id, campusIds: checked ? taughtIn.filter((id) => id !== c.id) : [...taughtIn, c.id] }))}
                                />{' '}
                                {c.name}
                              </label>
                            );
                          })}
                        </fieldset>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
      <NextSteps
        steps={[
          { to: '/users', label: 'Registrar docentes en su escuela', description: 'Cada docente tutor pertenece a una escuela y, por ella, a una sede' },
          { to: '/catalogos', label: 'Escuelas y facultades', description: 'Si falta una escuela en esta lista' },
        ]}
      />
    </div>
  );
}
