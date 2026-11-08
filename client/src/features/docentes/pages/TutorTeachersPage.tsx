import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, SearchField, SelectField, TableSkeleton } from '@shared/components/ui';
import { UsersIcon } from '@shared/components/icons';
import { useUrlParams } from '@shared/hooks/useUrlParams';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { STATUS_LABEL, STATUS_OPTIONS, STATUS_TONE } from '@features/certificados/certificateLabels';
import { useCertificateOptions, useStartCertificate } from '@features/certificados/hooks/useCertificates';
import type { CertificateStatus } from '@features/certificados/services/certificateService';
import { useTutorTeachers } from '../hooks/useTutorTeachers';
import type { TeacherAcceptance } from '../services/tutorTeacherService';
import styles from './TutorTeachersPage.module.css';

type Tone = 'success' | 'neutral' | 'danger' | 'warning' | 'info';

const ACCEPTANCE: Record<TeacherAcceptance, { label: string; tone: Tone }> = {
  SIN_ASIGNACION: { label: 'Sin asignación', tone: 'neutral' },
  SIN_SOLICITAR: { label: 'Aceptación sin solicitar', tone: 'neutral' },
  PENDIENTE: { label: 'Pendiente de aceptar', tone: 'warning' },
  VENCIDA: { label: 'Sin respuesta (el enlace venció)', tone: 'danger' },
  ACEPTADA: { label: 'Aceptada', tone: 'success' },
  RECHAZADA: { label: 'Rechazada', tone: 'danger' },
};
const ACCEPTANCE_OPTIONS = (Object.keys(ACCEPTANCE) as TeacherAcceptance[]).map((value) => ({ value, label: ACCEPTANCE[value].label }));
const NO_CERTIFICATE = 'SIN_TRAMITE';

/**
 * Docentes tutores de un periodo con su designación y el estado de su trámite de certificación. El periodo, la escuela, los estados y la
 * búsqueda viven en la URL. El servidor decide qué docentes llegan (permiso y escuelas de la cuenta); aquí solo se muestran las acciones
 * que la persona puede hacer, y el trámite se abre o se inicia desde la pantalla de Certificados.
 */
export function TutorTeachersPage() {
  const { user } = useAuth();
  const can = (permission: string) => !!user?.permissions?.includes(permission);
  const navigate = useNavigate();
  const url = useUrlParams();
  const options = useCertificateOptions();
  const start = useStartCertificate();
  const [startError, setStartError] = useState('');

  // Un valor de la URL que ya no existe (periodo o escuela ajenos, estado inventado) se ignora: la pantalla no se rompe.
  const periodParam = url.get('periodo');
  const periodId = options.data?.periods.some((p) => p.id === periodParam) ? periodParam : (options.data?.currentPeriodId ?? options.data?.periods[0]?.id ?? '');
  const schoolParam = url.get('escuela');
  const schoolId = options.data?.schools.some((s) => s.id === schoolParam) ? schoolParam : '';
  const statusParam = url.get('estado');
  const status = ACCEPTANCE_OPTIONS.some((s) => s.value === statusParam) ? statusParam : '';
  const certParam = url.get('tramite');
  const certificateStatus = certParam === NO_CERTIFICATE || STATUS_OPTIONS.some((s) => s.value === certParam) ? certParam : '';
  const q = url.get('q');
  const periodName = options.data?.periods.find((p) => p.id === periodId)?.name ?? '';
  const setFilter = (patch: Record<string, string>) => url.set(patch, { replace: true });

  const teachers = useTutorTeachers({ periodId, schoolId, status, certificateStatus, q: q.trim() }, periodId !== '');
  const list = teachers.data ?? [];
  const hasFilters = schoolId !== '' || status !== '' || certificateStatus !== '' || q !== '';

  const certificatesUrl = (certificateId: string, forSchoolId: string | null) =>
    `/certificados?${new URLSearchParams({ periodo: periodId, ...(forSchoolId ? { escuela: forSchoolId } : {}), certificado: certificateId }).toString()}`;

  const startFor = async (tutorId: string, forSchoolId: string) => {
    setStartError('');
    try {
      const created = (await start.mutateAsync({ tutorId, periodId, schoolId: forSchoolId })) as { id: string };
      navigate(certificatesUrl(created.id, forSchoolId));
    } catch (error) {
      setStartError(getApiErrorMessage(error));
    }
  };

  return (
    <div>
      <PageHeader
        title="Docentes tutores"
        subtitle="Los docentes del periodo con su designación, la respuesta a la aceptación y el estado de su certificado."
        icon={<UsersIcon size={24} />}
      />

      {options.isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : options.isError ? (
        <EmptyState icon={<UsersIcon size={26} />} title="No se pudo cargar la pantalla" description={getApiErrorMessage(options.error)} />
      ) : (
        <>
          <div className={styles.filters}>
            <div>
              <label htmlFor="tt-period">Periodo</label>
              <SelectField id="tt-period" value={periodId} onChange={(e) => setFilter({ periodo: e.target.value })}>
                {(options.data?.periods ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <label htmlFor="tt-school">Escuela profesional</label>
              <SelectField id="tt-school" value={schoolId} onChange={(e) => setFilter({ escuela: e.target.value })}>
                <option value="">Todas mis escuelas</option>
                {(options.data?.schools ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <label htmlFor="tt-status">Designación</label>
              <SelectField id="tt-status" value={status} onChange={(e) => setFilter({ estado: e.target.value })}>
                <option value="">Todas</option>
                {ACCEPTANCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <label htmlFor="tt-cert">Trámite de certificado</label>
              <SelectField id="tt-cert" value={certificateStatus} onChange={(e) => setFilter({ tramite: e.target.value })}>
                <option value="">Todos</option>
                <option value={NO_CERTIFICATE}>Sin trámite</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <label htmlFor="tt-search">Buscar por nombre</label>
              <SearchField id="tt-search" placeholder="Nombre del docente…" value={q} onChange={(e) => setFilter({ q: e.target.value })} />
            </div>
          </div>

          <Card>
            <CardHeader title="Docentes del periodo" description={periodName ? `Periodo ${periodName}.` : undefined} />
            <CardBody>
              {startError && (
                <p role="alert" className={styles.error}>
                  {startError}
                </p>
              )}
              {teachers.isLoading ? (
                <TableSkeleton rows={4} columns={5} />
              ) : teachers.isError ? (
                <EmptyState icon={<UsersIcon size={26} />} title="No se pudo cargar la lista" description={getApiErrorMessage(teachers.error)} />
              ) : list.length === 0 ? (
                <EmptyState
                  icon={<UsersIcon size={26} />}
                  title={hasFilters ? 'Ningún docente coincide' : 'Sin docentes'}
                  description={hasFilters ? 'Prueba con otros filtros o quita la búsqueda.' : 'Todavía no hay docentes tutores en tus escuelas para este periodo.'}
                />
              ) : (
                <div className={styles.scroll} role="region" aria-label="Docentes tutores" tabIndex={0}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Docente</th>
                        <th scope="col">Escuela</th>
                        <th scope="col">Ciclos</th>
                        <th scope="col">Designación</th>
                        <th scope="col">Certificado</th>
                        <th scope="col">
                          <span className={styles.srOnly}>Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((t) => (
                        <tr key={`${t.tutorId}|${t.schoolId ?? ''}`}>
                          <td>{t.tutorName}</td>
                          <td>{t.schoolName}</td>
                          <td>
                            {t.cycles.length === 0 ? (
                              '—'
                            ) : (
                              <span className={styles.cycles}>
                                {t.cycles.map((c) => (
                                  <Badge key={c.cycle} tone={ACCEPTANCE[c.acceptance].tone}>{`Ciclo ${c.cycle}: ${ACCEPTANCE[c.acceptance].label}`}</Badge>
                                ))}
                              </span>
                            )}
                          </td>
                          <td>
                            <Badge tone={ACCEPTANCE[t.acceptance].tone}>{ACCEPTANCE[t.acceptance].label}</Badge>
                          </td>
                          <td>
                            {t.certificateStatus ? (
                              <Badge tone={STATUS_TONE[t.certificateStatus as CertificateStatus]}>{STATUS_LABEL[t.certificateStatus as CertificateStatus]}</Badge>
                            ) : (
                              'Sin trámite'
                            )}
                          </td>
                          <td>
                            {t.certificateId && (
                              <Button size="sm" variant="secondary" aria-label={`Ver trámite de ${t.tutorName}`} onClick={() => navigate(certificatesUrl(t.certificateId as string, t.schoolId))}>
                                Ver trámite
                              </Button>
                            )}{' '}
                            {t.canStartCertificate && t.schoolId && can('certificados:registrar') && (
                              <Button size="sm" loading={start.isPending} aria-label={`Iniciar trámite de ${t.tutorName}`} onClick={() => void startFor(t.tutorId, t.schoolId as string)}>
                                Iniciar trámite
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
