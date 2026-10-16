import { useState, type FormEvent } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, SelectField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { MapPinIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useCampuses, useCreateCampus, useSetSchoolCampus, useUpdateCampus } from '../hooks/useCampuses';
import styles from './CampusesPage.module.css';

// Sedes de la universidad y la sede de cada escuela. Las configura Vicerrectorado (o la DBU): una escuela pertenece a una sola sede,
// y de ella depende qué docentes pueden tutorear a sus estudiantes.
export function CampusesPage() {
  const overview = useCampuses();
  const create = useCreateCampus();
  const update = useUpdateCampus();
  const setCampus = useSetSchoolCampus();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

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
      await create.mutateAsync(name);
      setName('');
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
                  </li>
                ))}
              </ul>
              <form className={styles.add} onSubmit={submit}>
                <label htmlFor="campus-name">Nueva sede</label>
                <input id="campus-name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sede …" maxLength={80} />
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
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
