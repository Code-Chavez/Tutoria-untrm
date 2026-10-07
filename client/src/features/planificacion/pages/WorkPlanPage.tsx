import { useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Card, Button, ConfirmDialog, SelectField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { CalendarRangeIcon, PlusIcon, TrashIcon } from '@shared/components/icons';
import { useWorkPlan, useWorkPlansOverview, useSaveWorkPlan } from '../hooks/useWorkPlans';
import {
  DEFAULT_OPERATIONAL_ACTIVITIES,
  WORK_PLAN_STATUS_LABEL,
  WorkPlanContent,
  WorkPlan,
} from '../services/workPlanService';
import { ExportButtons } from '@shared/components/ExportButtons';
import { downloadFile } from '@shared/services/downloadFile';
import { WorkPlanResolutionCard } from '../components/WorkPlanResolutionCard';
import styles from './WorkPlanPage.module.css';

// Plan de trabajo semestral de la escuela (HU-41, Anexo N°8, Art. 17.a).
// Las tablas se editan como texto y se convierten al enviar.
type Row = Record<string, string>;

type TextKey =
  | 'introduction'
  | 'denomination'
  | 'eventType'
  | 'executionDate'
  | 'schedule'
  | 'place'
  | 'modality'
  | 'organizers'
  | 'supportUnit'
  | 'foundation'
  | 'generalObjective'
  | 'targetAudience'
  | 'methodology';

type TableKey = 'planning' | 'programming' | 'physicalResources' | 'humanResources' | 'budget';

type FormState = Record<TextKey, string> &
  Record<TableKey | 'operationalActivities', Row[]> & { specificObjectives: string[] };

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
}

const TABLES: Record<TableKey, { title: string; columns: Column[] }> = {
  planning: {
    title: 'Tabla 1. Planificación de actividades',
    columns: [
      { key: 'activity', label: 'Actividad' },
      { key: 'startDate', label: 'Fecha de inicio', type: 'date' },
      { key: 'endDate', label: 'Fecha de fin', type: 'date' },
    ],
  },
  programming: {
    title: 'Tabla 2. Programación de actividades',
    columns: [
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'activity', label: 'Actividad' },
      { key: 'time', label: 'Hora' },
      { key: 'place', label: 'Lugar' },
      { key: 'responsible', label: 'Responsable' },
    ],
  },
  physicalResources: {
    title: 'Tabla 1. Recursos físicos',
    columns: [
      { key: 'quantity', label: 'Cant.', type: 'number' },
      { key: 'resource', label: 'Recurso' },
      { key: 'characteristics', label: 'Características' },
    ],
  },
  humanResources: {
    title: 'Tabla 2. Recursos humanos',
    columns: [
      { key: 'quantity', label: 'Cant.', type: 'number' },
      { key: 'resource', label: 'Recurso' },
      { key: 'characteristics', label: 'Características' },
    ],
  },
  budget: {
    title: 'Presupuesto',
    columns: [
      { key: 'quantity', label: 'Cant.', type: 'number' },
      { key: 'type', label: 'Tipo' },
      { key: 'resource', label: 'Recurso' },
      { key: 'characteristics', label: 'Características' },
      { key: 'unitCost', label: 'Costo unitario (S/)', type: 'number' },
    ],
  },
};

const TABS = [
  { id: 'general', label: 'Datos generales' },
  { id: 'objectives', label: 'Fundamentación y objetivos' },
  { id: 'schedule', label: 'Cronograma' },
  { id: 'resources', label: 'Recursos' },
  { id: 'budget', label: 'Presupuesto' },
  { id: 'operational', label: 'Otras consideraciones' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const toRows = (rows: object[]): Row[] =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')])));

function emptyForm(): FormState {
  return {
    introduction: '',
    denomination: '',
    eventType: '',
    executionDate: '',
    schedule: '',
    place: '',
    modality: '',
    organizers: '',
    supportUnit: '',
    foundation: '',
    generalObjective: '',
    specificObjectives: [''],
    targetAudience: '',
    methodology: '',
    planning: [],
    programming: [],
    physicalResources: [],
    humanResources: [],
    budget: [],
    operationalActivities: DEFAULT_OPERATIONAL_ACTIVITIES.map((activity) => ({ activity, date: '' })),
  };
}

function fromPlan(plan: WorkPlan): FormState {
  return {
    ...emptyForm(),
    introduction: plan.introduction,
    denomination: plan.denomination,
    eventType: plan.eventType,
    executionDate: plan.executionDate,
    schedule: plan.schedule,
    place: plan.place,
    modality: plan.modality,
    organizers: plan.organizers,
    supportUnit: plan.supportUnit,
    foundation: plan.foundation,
    generalObjective: plan.generalObjective,
    specificObjectives: plan.specificObjectives.length ? plan.specificObjectives : [''],
    targetAudience: plan.targetAudience,
    methodology: plan.methodology,
    planning: toRows(plan.planning),
    programming: toRows(plan.programming),
    physicalResources: toRows(plan.physicalResources),
    humanResources: toRows(plan.humanResources),
    budget: toRows(plan.budget),
    operationalActivities: toRows(plan.operationalActivities),
  };
}

// Descarta filas totalmente vacías y convierte los campos numéricos.
const clean = <T,>(rows: Row[], numeric: string[] = []): T[] =>
  rows
    .filter((r) => Object.values(r).some((v) => v.trim() !== ''))
    .map(
      (r) =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, numeric.includes(k) ? Number(v) : v.trim()]),
        ) as T,
    );

function toContent(f: FormState): WorkPlanContent {
  return {
    ...f,
    specificObjectives: f.specificObjectives.map((o) => o.trim()).filter(Boolean),
    planning: clean(f.planning),
    programming: clean(f.programming),
    physicalResources: clean(f.physicalResources, ['quantity']),
    humanResources: clean(f.humanResources, ['quantity']),
    budget: clean(f.budget, ['quantity', 'unitCost']),
    operationalActivities: f.operationalActivities.map((a) => ({
      activity: a.activity.trim(),
      date: a.date,
    })),
  };
}

function WorkPlanEditor({ schoolId, plan }: { schoolId: string; plan: WorkPlan | null }) {
  const [tab, setTab] = useState<TabId>('general');
  const [form, setForm] = useState<FormState>(() => (plan ? fromPlan(plan) : emptyForm()));
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const save = useSaveWorkPlan(schoolId);
  const [confirmRevision, setConfirmRevision] = useState(false);

  // Editar un plan con resolución abre una nueva revisión que debe aprobarse otra vez (A12).
  const approved = plan?.status === 'APROBADO';

  const setText = (key: TextKey, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const setCell = (table: TableKey | 'operationalActivities', i: number, key: string, value: string) =>
    setForm((f) => ({
      ...f,
      [table]: f[table].map((r, idx) => (idx === i ? { ...r, [key]: value } : r)),
    }));
  const addRow = (table: TableKey) =>
    setForm((f) => ({
      ...f,
      [table]: [...f[table], Object.fromEntries(TABLES[table].columns.map((c) => [c.key, '']))],
    }));
  const removeRow = (table: TableKey, i: number) =>
    setForm((f) => ({ ...f, [table]: f[table].filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setConfirmRevision(false);
    setMessage(null);
    try {
      await save.mutateAsync(toContent(form));
      setMessage({
        type: 'ok',
        text: approved
          ? 'Cambios guardados como nueva revisión. Adjunta la resolución que la apruebe; mientras tanto sigue vigente la versión aprobada.'
          : 'Plan de trabajo guardado correctamente.',
      });
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const textField = (key: TextKey, label: string, multiline = false) => (
    <div className={styles.field} key={key}>
      <label htmlFor={`wp-${key}`}>{label}</label>
      {multiline ? (
        <textarea
          id={`wp-${key}`}
          rows={4}
          value={form[key]}
          onChange={(e) => setText(key, e.target.value)}
        />
      ) : (
        <input id={`wp-${key}`} value={form[key]} onChange={(e) => setText(key, e.target.value)} />
      )}
    </div>
  );

  const rowsTable = (table: TableKey) => {
    const { title, columns } = TABLES[table];
    const total = (r: Row) => (Number(r.quantity) || 0) * (Number(r.unitCost) || 0);
    return (
      <section className={styles.tableBlock} key={table}>
        <h3>{title}</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                {table === 'budget' && <th>Costo total (S/)</th>}
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {form[table].map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      <input
                        aria-label={`${c.label} fila ${i + 1}`}
                        type={c.type ?? 'text'}
                        min={c.type === 'number' ? 0 : undefined}
                        value={row[c.key] ?? ''}
                        onChange={(e) => setCell(table, i, c.key, e.target.value)}
                      />
                    </td>
                  ))}
                  {table === 'budget' && <td className={styles.total}>{total(row).toFixed(2)}</td>}
                  <td>
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Quitar fila ${i + 1}`}
                      onClick={() => removeRow(table, i)}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {table === 'budget' && form.budget.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={columns.length}>Total</td>
                  <td className={styles.total}>
                    {form.budget.reduce((acc, r) => acc + total(r), 0).toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Button variant="secondary" size="sm" icon={<PlusIcon size={16} />} onClick={() => addRow(table)}>
          Agregar fila
        </Button>
      </section>
    );
  };

  return (
    <Card padded>
              <div role="tablist" className={styles.tabs}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={tab === t.id}
                    className={tab === t.id ? styles.tabActive : styles.tab}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className={styles.panel}>
                {tab === 'general' && (
                  <>
                    {textField('introduction', 'I. Introducción', true)}
                    {textField('denomination', '2.1 Denominación')}
                    {textField('eventType', '2.2 Tipo de evento')}
                    {textField('executionDate', '2.3 Fecha de ejecución')}
                    {textField('schedule', '2.4 Horario')}
                    {textField('place', '2.5 Lugar')}
                    {textField('modality', '2.6 Modalidad')}
                    {textField('organizers', '2.7 Organizadores')}
                    {textField('supportUnit', '2.8 Unidad de apoyo (opcional)')}
                  </>
                )}

                {tab === 'objectives' && (
                  <>
                    {textField('foundation', 'III. Fundamentación', true)}
                    {textField('generalObjective', 'IV. Objetivo general', true)}
                    <div className={styles.field}>
                      <label>Objetivos específicos</label>
                      {form.specificObjectives.map((o, i) => (
                        <div className={styles.objectiveRow} key={i}>
                          <input
                            aria-label={`Objetivo específico ${i + 1}`}
                            value={o}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                specificObjectives: f.specificObjectives.map((x, idx) =>
                                  idx === i ? e.target.value : x,
                                ),
                              }))
                            }
                          />
                          <button
                            type="button"
                            className={styles.remove}
                            aria-label={`Quitar objetivo ${i + 1}`}
                            disabled={form.specificObjectives.length === 1}
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                specificObjectives: f.specificObjectives.filter((_, idx) => idx !== i),
                              }))
                            }
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<PlusIcon size={16} />}
                        onClick={() =>
                          setForm((f) => ({ ...f, specificObjectives: [...f.specificObjectives, ''] }))
                        }
                      >
                        Agregar objetivo
                      </Button>
                    </div>
                    {textField('targetAudience', 'V. Público objetivo', true)}
                    {textField('methodology', 'VI. Metodología', true)}
                  </>
                )}

                {tab === 'schedule' && (
                  <>
                    {rowsTable('planning')}
                    {rowsTable('programming')}
                  </>
                )}

                {tab === 'resources' && (
                  <>
                    {rowsTable('physicalResources')}
                    {rowsTable('humanResources')}
                  </>
                )}

                {tab === 'budget' && rowsTable('budget')}

                {tab === 'operational' && (
                  <section className={styles.tableBlock}>
                    <h3>X. Actividades operativas</h3>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Actividad</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.operationalActivities.map((a, i) => (
                            <tr key={i}>
                              <td>{a.activity}</td>
                              <td>
                                <input
                                  type="date"
                                  aria-label={`Fecha de ${a.activity}`}
                                  value={a.date}
                                  onChange={(e) => setCell('operationalActivities', i, 'date', e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              {message && (
                <p role={message.type === 'error' ? 'alert' : 'status'} className={styles[message.type]}>
                  {message.text}
                </p>
              )}
              <div className={styles.actions}>
                <Button onClick={approved ? () => setConfirmRevision(true) : handleSave} loading={save.isPending}>
                  {approved ? 'Guardar como nueva revisión' : 'Guardar plan'}
                </Button>
              </div>
              <ConfirmDialog
                open={confirmRevision}
                title="Crear una nueva revisión"
                message="Este plan tiene una resolución de aprobación. Al guardar, la versión aprobada se conserva y los cambios quedan como una nueva revisión que necesita su propia resolución."
                confirmLabel="Guardar revisión"
                loading={save.isPending}
                onConfirm={handleSave}
                onCancel={() => setConfirmRevision(false)}
              />
            </Card>
  );
}

export function WorkPlanPage() {
  const { overview, loading: loadingOverview, error: overviewError, refresh } = useWorkPlansOverview();
  const [selected, setSelected] = useState('');
  // Con una sola escuela (caso típico del coordinador) se selecciona sola.
  const schoolId = selected || (overview?.schools.length === 1 ? overview.schools[0].schoolId : '');
  const { view, loading: loadingPlan } = useWorkPlan(schoolId);

  const header = <PageHeader title="Plan de trabajo semestral" icon={<CalendarRangeIcon size={22} />} />;

  if (loadingOverview) {
    return (
      <div className={styles.page}>
        {header}
        <TableSkeleton rows={5} columns={2} />
      </div>
    );
  }

  if (overviewError || !overview) {
    return (
      <div className={styles.page}>
        {header}
        <EmptyState
          variant="error"
          icon={<CalendarRangeIcon size={26} />}
          title="No se pudo cargar el plan de trabajo"
          description="Verifica que exista un periodo académico activo y vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Plan de trabajo semestral"
        subtitle={`Anexo N°8 del Protocolo de Tutoría — periodo ${overview.periodName}`}
        icon={<CalendarRangeIcon size={22} />}
      />

      {overview.schools.length === 0 ? (
        <EmptyState
          icon={<CalendarRangeIcon size={26} />}
          title="No tienes escuelas asignadas"
          description="Solo el coordinador de una escuela (o la DBU) puede elaborar su plan de trabajo."
        />
      ) : (
        <>
          <Card padded className={styles.selector}>
            <div className={styles.field}>
              <label htmlFor="wp-school">Escuela Profesional</label>
              <SelectField id="wp-school" value={schoolId} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Selecciona una escuela</option>
                {overview.schools.map((s) => (
                  <option key={s.schoolId} value={s.schoolId}>
                    {s.schoolName} {s.status ? `· ${WORK_PLAN_STATUS_LABEL[s.status]}` : '· sin plan'}
                  </option>
                ))}
              </SelectField>
            </div>
          </Card>

          {schoolId && loadingPlan && <TableSkeleton rows={5} columns={2} />}

          {schoolId && !loadingPlan && view && (
            <WorkPlanEditor key={schoolId} schoolId={schoolId} plan={view.plan} />
          )}

          {schoolId && !loadingPlan && view?.plan && (
            <>
              <WorkPlanResolutionCard schoolId={schoolId} plan={view.plan} />
              <div className={styles.exportRow}>
                <ExportButtons
                  formats={['pdf']}
                  onExport={() => downloadFile(`/work-plans/${schoolId}/pdf`, 'plan-trabajo-semestral.pdf')}
                />
                <p className={styles.exportHint}>El PDF refleja la última versión guardada del plan.</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
