import { Button, Card, SelectField } from '@shared/components/ui';
import { EMPTY_REPORT_FILTERS, ReportFilterValues } from './reportFilterService';
import { useReportFilterOptions } from './useReportFilterOptions';
import styles from './ReportFilters.module.css';

type FilterKey = keyof ReportFilterValues;

interface ReportFiltersProps {
  value: ReportFilterValues;
  onChange: (next: ReportFilterValues) => void;
  /** Controles a mostrar; por defecto, todos. */
  show?: FilterKey[];
}

const ALL: FilterKey[] = ['periodId', 'facultyId', 'schoolId', 'cycle', 'tutorId'];

// Controles de filtro combinados de los reportes (HU-47): al cambiar cualquiera,
// el reporte se vuelve a consultar sin recargar la página y las exportaciones
// reutilizan los mismos valores.
export function ReportFilters({ value, onChange, show = ALL }: ReportFiltersProps) {
  const { data: options } = useReportFilterOptions();

  const set = (patch: Partial<ReportFilterValues>) => onChange({ ...value, ...patch });
  const schools = (options?.schools ?? []).filter((s) => !value.facultyId || s.facultyId === value.facultyId);
  const active = ALL.some((key) => show.includes(key) && value[key] !== '');

  return (
    <Card padded className={styles.filters}>
      {show.includes('periodId') && (
        <div className={styles.field}>
          <label htmlFor="rf-period">Semestre</label>
          <SelectField id="rf-period" value={value.periodId} onChange={(e) => set({ periodId: e.target.value })}>
            <option value="">Periodo activo</option>
            {(options?.periods ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isActive ? ' (activo)' : ''}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      {show.includes('facultyId') && (
        <div className={styles.field}>
          <label htmlFor="rf-faculty">Facultad</label>
          <SelectField
            id="rf-faculty"
            value={value.facultyId}
            onChange={(e) => {
              // La escuela elegida deja de valer si no pertenece a la nueva facultad.
              const keep = options?.schools.find((s) => s.id === value.schoolId)?.facultyId === e.target.value;
              set({ facultyId: e.target.value, schoolId: keep ? value.schoolId : '' });
            }}
          >
            <option value="">Todas las facultades</option>
            {(options?.faculties ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      {show.includes('schoolId') && (
        <div className={styles.field}>
          <label htmlFor="rf-school">Escuela Profesional</label>
          <SelectField id="rf-school" value={value.schoolId} onChange={(e) => set({ schoolId: e.target.value })}>
            <option value="">Todas las escuelas</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      {show.includes('cycle') && (
        <div className={styles.field}>
          <label htmlFor="rf-cycle">Ciclo</label>
          <SelectField id="rf-cycle" value={value.cycle} onChange={(e) => set({ cycle: e.target.value })}>
            <option value="">Todos los ciclos</option>
            {(options?.cycles ?? []).map((c) => (
              <option key={c} value={String(c)}>
                Ciclo {c}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      {show.includes('tutorId') && (
        <div className={styles.field}>
          <label htmlFor="rf-tutor">Tutor</label>
          <SelectField id="rf-tutor" value={value.tutorId} onChange={(e) => set({ tutorId: e.target.value })}>
            <option value="">Todos los tutores</option>
            {(options?.tutors ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      {active && (
        <div className={styles.clear}>
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_REPORT_FILTERS)}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </Card>
  );
}
