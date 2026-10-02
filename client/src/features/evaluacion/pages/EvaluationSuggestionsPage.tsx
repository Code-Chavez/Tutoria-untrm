import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Card, Button, SelectField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { StarIcon } from '@shared/components/icons';
import { schoolService } from '@features/tutorados/services/schoolService';
import { facultyService } from '../services/facultyService';
import { useEvaluationSuggestions } from '../hooks/useEvaluationSuggestions';
import styles from './EvaluationSuggestionsPage.module.css';

// Sugerencias abiertas consolidadas del cuestionario de evaluación (HU-40):
// "Me gustaría" / "No me gusta" del periodo activo, de forma anónima.
export function EvaluationSuggestionsPage() {
  const [schoolId, setSchoolId] = useState('');
  const [facultyId, setFacultyId] = useState('');

  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolService.getSchools(),
  });
  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => facultyService.getFaculties(),
  });

  const { report, loading, error, refresh } = useEvaluationSuggestions({
    schoolId: schoolId || undefined,
    facultyId: facultyId || undefined,
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Sugerencias de los estudiantes"
        subtitle="Comentarios abiertos del cuestionario de evaluación, de forma anónima (Anexo N°7)"
        icon={<StarIcon size={22} />}
      />

      <Card padded className={styles.filters}>
        <div className={styles.field}>
          <label>Facultad</label>
          <SelectField value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
            <option value="">Todas las facultades</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className={styles.field}>
          <label>Escuela Profesional</label>
          <SelectField value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">Todas las escuelas</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={4} columns={2} />
      ) : error || !report ? (
        <EmptyState
          variant="error"
          icon={<StarIcon size={26} />}
          title="No se pudo cargar las sugerencias"
          description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : report.suggestions.length === 0 ? (
        <EmptyState
          icon={<StarIcon size={26} />}
          title="Sin sugerencias"
          description={`Ningún estudiante dejó comentarios en el periodo ${report.periodName} con los filtros seleccionados.`}
        />
      ) : (
        <ul className={styles.list}>
          {report.suggestions.map((s, index) => (
            <li key={`${s.tutorId}-${index}`} className={styles.item}>
              <span className={styles.tutor}>Sobre {s.tutorName}</span>
              {s.likes && (
                <p>
                  <b className={styles.likes}>Me gustaría:</b> {s.likes}
                </p>
              )}
              {s.dislikes && (
                <p>
                  <b className={styles.dislikes}>No me gusta:</b> {s.dislikes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
