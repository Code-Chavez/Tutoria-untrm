import { useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Card, Button, EmptyState, TableSkeleton } from '@shared/components/ui';
import { ReportIcon, PlusIcon, TrashIcon, DownloadIcon } from '@shared/components/icons';
import { useMySemesterReport, useSaveSemesterReport } from '../hooks/useSemesterReport';
import {
  MySemesterReportView,
  SemesterReportContent,
  SemesterReportRow,
  semesterReportService,
} from '../services/semesterReportService';
import styles from './SemesterReportPage.module.css';

// Informe de implementación de la tutoría semestral (HU-43, Anexo N°9): se
// autollena con las sesiones y seguimientos del periodo y el tutor lo edita.
type Section = 'individual' | 'group';
type TextKey = 'programName' | 'faculty' | 'teacherCategory' | 'tutoringCycles' | 'phone';

// Las cifras se editan como texto y se convierten al guardar.
type FormRow = Omit<SemesterReportRow, 'participants'> & { participants: string };
type FormState = Record<TextKey, string> & Record<Section, FormRow[]>;

const GENERAL_FIELDS: { key: TextKey; label: string }[] = [
  { key: 'programName', label: 'Programa de estudios' },
  { key: 'faculty', label: 'Facultad' },
  { key: 'teacherCategory', label: 'Categoría docente' },
  { key: 'tutoringCycles', label: 'Ciclo/s de tutoría' },
  { key: 'phone', label: 'Celular' },
];

const SECTIONS: { key: Section; title: string }[] = [
  { key: 'individual', title: '2.1 Tutorías individuales' },
  { key: 'group', title: '2.2 Tutorías grupales' },
];

const TEXT_COLUMNS: { key: 'activity' | 'achievements' | 'difficulties' | 'suggestions'; label: string }[] = [
  { key: 'activity', label: 'Actividades' },
  { key: 'achievements', label: 'Logros' },
  { key: 'difficulties', label: 'Dificultades' },
  { key: 'suggestions', label: 'Sugerencias' },
];

const toForm = (c: SemesterReportContent): FormState => ({
  programName: c.programName,
  faculty: c.faculty,
  teacherCategory: c.teacherCategory,
  tutoringCycles: c.tutoringCycles,
  phone: c.phone,
  individual: c.individual.map((r) => ({ ...r, participants: String(r.participants) })),
  group: c.group.map((r) => ({ ...r, participants: String(r.participants) })),
});

const toContent = (f: FormState): SemesterReportContent => {
  const rows = (list: FormRow[]) =>
    list
      // Una fila sin texto (solo el 0 de relleno) se descarta.
      .filter((r) => TEXT_COLUMNS.some((c) => r[c.key].trim() !== ''))
      .map((r) => ({ ...r, participants: Math.max(0, Math.trunc(Number(r.participants) || 0)) }));
  return { ...f, individual: rows(f.individual), group: rows(f.group) };
};

const emptyRow = (): FormRow => ({
  activity: '',
  achievements: '',
  difficulties: '',
  suggestions: '',
  participants: '0',
});

function SemesterReportEditor({ view }: { view: MySemesterReportView }) {
  const save = useSaveSemesterReport();
  const [form, setForm] = useState<FormState>(() => toForm(view.report ?? view.draft));
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const setCell = (section: Section, i: number, key: keyof FormRow, value: string) =>
    setForm((f) => ({
      ...f,
      [section]: f[section].map((r, idx) => (idx === i ? { ...r, [key]: value } : r)),
    }));

  const handleSave = async () => {
    setMessage(null);
    try {
      await save.mutateAsync(toContent(form));
      setMessage({ type: 'ok', text: 'Informe guardado correctamente.' });
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const handleExport = async () => {
    setMessage(null);
    setExporting(true);
    try {
      await semesterReportService.downloadPdf();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card padded>
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          {view.report
            ? 'Editando tu informe guardado. La exportación usa la última versión guardada.'
            : 'Borrador autollenado con tus sesiones y seguimientos del periodo. Revísalo, complétalo y guarda.'}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setForm(toForm(view.draft));
            setMessage(null);
          }}
        >
          Volver a autollenar
        </Button>
      </div>

      <h3 className={styles.sectionTitle}>I. Datos generales</h3>
      <div className={styles.general}>
        <div className={styles.field}>
          <label htmlFor="sr-tutor">Nombre del tutor/a</label>
          <input id="sr-tutor" value={view.tutorName} readOnly />
        </div>
        {GENERAL_FIELDS.map(({ key, label }) => (
          <div className={styles.field} key={key}>
            <label htmlFor={`sr-${key}`}>{label}</label>
            <input
              id={`sr-${key}`}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <h3 className={styles.sectionTitle}>II. Desarrollo del proceso tutorial</h3>
      {SECTIONS.map(({ key: section, title }) => (
        <section className={styles.block} key={section}>
          <h4>{title}</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {TEXT_COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>N° de participantes</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {form[section].map((row, i) => (
                  <tr key={i}>
                    {TEXT_COLUMNS.map((c) => (
                      <td key={c.key}>
                        <textarea
                          rows={2}
                          aria-label={`${title} ${c.label} fila ${i + 1}`}
                          value={row[c.key]}
                          onChange={(e) => setCell(section, i, c.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className={styles.num}>
                      <input
                        type="number"
                        min={0}
                        aria-label={`${title} participantes fila ${i + 1}`}
                        value={row.participants}
                        onChange={(e) => setCell(section, i, 'participants', e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`Quitar fila ${i + 1} de ${title}`}
                        onClick={() =>
                          setForm((f) => ({ ...f, [section]: f[section].filter((_, idx) => idx !== i) }))
                        }
                      >
                        <TrashIcon size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {form[section].length === 0 && <p className={styles.empty}>Sin registros.</p>}
          <Button
            variant="secondary"
            size="sm"
            icon={<PlusIcon size={16} />}
            onClick={() => setForm((f) => ({ ...f, [section]: [...f[section], emptyRow()] }))}
          >
            Agregar fila
          </Button>
        </section>
      ))}

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={styles[message.type]}>
          {message.text}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          icon={<DownloadIcon size={16} />}
          disabled={!view.report}
          loading={exporting}
          onClick={handleExport}
        >
          Exportar PDF
        </Button>
        <Button onClick={handleSave} loading={save.isPending}>
          Guardar informe
        </Button>
      </div>
    </Card>
  );
}

export function SemesterReportPage() {
  const { view, loading, error, refresh } = useMySemesterReport();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Informe semestral de tutoría"
        subtitle={
          view
            ? `Anexo N°9 del Protocolo de Tutoría — periodo ${view.periodName}`
            : 'Anexo N°9 del Protocolo de Tutoría'
        }
        icon={<ReportIcon size={22} />}
      />
      {loading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : error || !view ? (
        <EmptyState
          variant="error"
          icon={<ReportIcon size={26} />}
          title="No se pudo cargar el informe"
          description="Verifica que exista un periodo académico activo y vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : (
        <SemesterReportEditor view={view} />
      )}
    </div>
  );
}
