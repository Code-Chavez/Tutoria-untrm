import { useState } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, SelectField, TableSkeleton } from '@shared/components/ui';
import { FileTextIcon } from '@shared/components/icons';
import { useUrlParams } from '@shared/hooks/useUrlParams';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { CertificateDialog, type SubDialog } from '../components/CertificateDialog';
import { ReasonDialog } from '../components/ReasonDialog';
import { ResolutionDialog } from '../components/ResolutionDialog';
import { STATUS_LABEL, STATUS_OPTIONS, STATUS_TONE } from '../certificateLabels';
import {
  useCertificateCandidates,
  useCertificateOptions,
  useCertificates,
  useCommitteeResolutions,
  useObserveCertificate,
  useRejectCertificate,
  useSaveResolution,
  useStartCertificate,
  useVoidCertificate,
} from '../hooks/useCertificates';
import styles from './CertificatesPage.module.css';

const SUB_DIALOGS: readonly SubDialog[] = ['observar', 'rechazar', 'anular', 'resolucion'];

/**
 * Certificados de los docentes tutores (demostración). El periodo, la escuela, el estado, el trámite abierto y la ventana abierta viven en
 * la URL: recargar o compartir el enlace vuelve a la misma vista, y «atrás» cierra la ventana. Lo que se escribe (motivos, comentarios,
 * la resolución) se conserva como borrador de la pestaña, nunca en la URL. El servidor decide qué acciones proceden en cada estado y con
 * qué permiso; aquí solo se muestran las que la persona puede hacer.
 */
export function CertificatesPage() {
  const { user } = useAuth();
  const can = (permission: string) => !!user?.permissions?.includes(permission);
  const url = useUrlParams();
  const options = useCertificateOptions();

  // Un valor de la URL que ya no existe (periodo o escuela ajenos, estado inventado) se ignora: la pantalla no se rompe.
  const periodParam = url.get('periodo');
  const periodId = options.data?.periods.some((p) => p.id === periodParam) ? periodParam : (options.data?.currentPeriodId ?? options.data?.periods[0]?.id ?? '');
  const schoolParam = url.get('escuela');
  const schoolId = options.data?.schools.some((s) => s.id === schoolParam) ? schoolParam : '';
  const statusParam = url.get('estado');
  const status = STATUS_OPTIONS.some((s) => s.value === statusParam) ? statusParam : '';
  const periodName = options.data?.periods.find((p) => p.id === periodId)?.name ?? '';

  const certificates = useCertificates({ periodId, schoolId, status }, periodId !== '');
  const candidates = useCertificateCandidates(periodId, schoolId, periodId !== '' && can('certificados:registrar'));
  const resolutions = useCommitteeResolutions(periodId, '', periodId !== '' && can('certificados:consultar'));

  const openId = url.get('certificado');
  const dialogParam = url.get('dialogo');
  const sub = (SUB_DIALOGS as readonly string[]).includes(dialogParam) ? (dialogParam as SubDialog) : null;
  const setFilter = (patch: Record<string, string>) => url.set(patch, { replace: true });
  const openCertificate = (id: string) => url.set({ certificado: id, dialogo: null });
  const closeAll = () => url.set({ certificado: null, dialogo: null }, { replace: true });
  const openSub = (kind: SubDialog) => url.set({ dialogo: kind });
  const closeSub = () => url.set({ dialogo: null }, { replace: true });

  const start = useStartCertificate();
  const observe = useObserveCertificate();
  const reject = useRejectCertificate();
  const voidCertificate = useVoidCertificate();
  const saveResolution = useSaveResolution();
  const [startError, setStartError] = useState('');
  const [dialogError, setDialogError] = useState('');

  const startFor = async (tutorId: string, schoolOfTutor: string) => {
    setStartError('');
    try {
      const created = await start.mutateAsync({ tutorId, periodId, schoolId: schoolOfTutor });
      openCertificate((created as { id: string }).id);
    } catch (error) {
      setStartError(getApiErrorMessage(error));
    }
  };

  const submitReason = async (action: () => Promise<unknown>): Promise<boolean> => {
    setDialogError('');
    try {
      await action();
      closeSub();
      return true;
    } catch (error) {
      setDialogError(getApiErrorMessage(error));
      return false;
    }
  };

  const closeSubWithReset = () => {
    setDialogError('');
    closeSub();
  };

  const currentResolution = (forSchoolId: string) => (resolutions.data ?? []).find((r) => r.schoolId === forSchoolId)?.number ?? '';
  const list = certificates.data ?? [];

  return (
    <div>
      <PageHeader
        title="Certificados"
        subtitle="Constancias de los docentes tutores: iniciar el trámite, revisar las evidencias, aprobar y generar el PDF de demostración."
        icon={<FileTextIcon size={24} />}
        actions={
          can('certificados:administrar') && periodId ? (
            <Button variant="secondary" onClick={() => openSub('resolucion')}>
              Resolución de decanato
            </Button>
          ) : undefined
        }
      />

      <p className={styles.demo} role="note">
        <strong>Demostración sin valor.</strong> Mientras la universidad no entregue el formato oficial, los certificados llevan una marca de agua y un número de demostración, y no se pueden firmar ni entregar.
      </p>

      {options.isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : options.isError ? (
        <EmptyState icon={<FileTextIcon size={26} />} title="No se pudo cargar la pantalla" description={getApiErrorMessage(options.error)} />
      ) : (
        <>
          <div className={styles.filters}>
            <div>
              <label htmlFor="cert-period">Periodo</label>
              <SelectField id="cert-period" value={periodId} onChange={(e) => setFilter({ periodo: e.target.value })}>
                {(options.data?.periods ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <label htmlFor="cert-school">Escuela profesional</label>
              <SelectField id="cert-school" value={schoolId} onChange={(e) => setFilter({ escuela: e.target.value })}>
                <option value="">Todas mis escuelas</option>
                {(options.data?.schools ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <label htmlFor="cert-status">Estado</label>
              <SelectField id="cert-status" value={status} onChange={(e) => setFilter({ estado: e.target.value })}>
                <option value="">Todos</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <Card>
            <CardHeader title="Trámites del periodo" description={periodName ? `Periodo ${periodName}.` : undefined} />
            <CardBody>
              {certificates.isLoading ? (
                <TableSkeleton rows={4} columns={5} />
              ) : certificates.isError ? (
                <EmptyState icon={<FileTextIcon size={26} />} title="No se pudieron cargar los trámites" description={getApiErrorMessage(certificates.error)} />
              ) : list.length === 0 ? (
                <EmptyState icon={<FileTextIcon size={26} />} title="Sin trámites" description="Todavía no hay trámites con estos filtros. Inicia uno desde un docente con designación aceptada." />
              ) : (
                <div className={styles.scroll} role="region" aria-label="Trámites de certificado" tabIndex={0}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Docente</th>
                        <th scope="col">Escuela</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Número</th>
                        <th scope="col">
                          <span className={styles.srOnly}>Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((c) => (
                        <tr key={c.id}>
                          <td>{c.tutorName}</td>
                          <td>{c.schoolName}</td>
                          <td>
                            <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                          </td>
                          <td>{c.number ?? '—'}</td>
                          <td>
                            <Button size="sm" variant="secondary" aria-label={`Ver el trámite de ${c.tutorName}`} onClick={() => openCertificate(c.id)}>
                              Ver trámite
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {can('certificados:registrar') && (
            <Card>
              <CardHeader title="Docentes sin trámite" description="Docentes con designación aceptada en el periodo que todavía no tienen un trámite vigente." />
              <CardBody>
                {startError && (
                  <p role="alert" className={styles.error}>
                    {startError}
                  </p>
                )}
                {candidates.isLoading ? (
                  <TableSkeleton rows={3} columns={4} />
                ) : candidates.isError ? (
                  <EmptyState icon={<FileTextIcon size={26} />} title="No se pudieron cargar los docentes" description={getApiErrorMessage(candidates.error)} />
                ) : (candidates.data ?? []).length === 0 ? (
                  <p className={styles.muted}>No hay docentes pendientes de iniciar su trámite.</p>
                ) : (
                  <div className={styles.scroll} role="region" aria-label="Docentes sin trámite" tabIndex={0}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th scope="col">Docente</th>
                          <th scope="col">Escuela</th>
                          <th scope="col">Ciclos</th>
                          <th scope="col">
                            <span className={styles.srOnly}>Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(candidates.data ?? []).map((c) => (
                          <tr key={`${c.tutorId}|${c.schoolId}`}>
                            <td>{c.tutorName}</td>
                            <td>{c.schoolName}</td>
                            <td>{c.cycles.join(', ')}</td>
                            <td>
                              <Button size="sm" loading={start.isPending} aria-label={`Iniciar el trámite de ${c.tutorName}`} onClick={() => void startFor(c.tutorId, c.schoolId)}>
                                Iniciar trámite
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}

      {openId && <CertificateDialog id={openId} can={can} userId={user?.id} onClose={closeAll} onOpenSub={openSub} />}

      {sub === 'observar' && openId && (
        <ReasonDialog
          title="Devolver con observaciones"
          label="Nota para quien inicia el trámite (opcional)"
          help="El trámite vuelve a quien lo inició con las evidencias que marcaste como observadas."
          submitLabel="Devolver el trámite"
          minLength={0}
          draftOwnerId={user?.id}
          draftKey={`certificado.observar.${openId}`}
          busy={observe.isPending}
          error={dialogError}
          onSubmit={(note) => submitReason(() => observe.mutateAsync({ id: openId, note }))}
          onClose={closeSubWithReset}
        />
      )}
      {sub === 'rechazar' && openId && (
        <ReasonDialog
          title="Rechazar el trámite"
          label="Motivo del rechazo"
          help="El trámite se cierra y el motivo queda registrado. El docente puede volver a iniciar otro trámite."
          submitLabel="Rechazar el trámite"
          minLength={10}
          danger
          draftOwnerId={user?.id}
          draftKey={`certificado.rechazar.${openId}`}
          busy={reject.isPending}
          error={dialogError}
          onSubmit={(reason) => submitReason(() => reject.mutateAsync({ id: openId, reason }))}
          onClose={closeSubWithReset}
        />
      )}
      {sub === 'anular' && openId && (
        <ReasonDialog
          title="Anular el certificado"
          label="Motivo de la anulación"
          help="Un certificado anulado no se reabre y su número no se reutiliza."
          submitLabel="Anular el certificado"
          minLength={10}
          danger
          draftOwnerId={user?.id}
          draftKey={`certificado.anular.${openId}`}
          busy={voidCertificate.isPending}
          error={dialogError}
          onSubmit={(reason) => submitReason(() => voidCertificate.mutateAsync({ id: openId, reason }))}
          onClose={closeSubWithReset}
        />
      )}
      {sub === 'resolucion' && periodId && (
        <ResolutionDialog
          periodName={periodName}
          schools={options.data?.schools ?? []}
          defaultSchoolId={schoolId}
          currentNumber={currentResolution}
          draftOwnerId={user?.id}
          draftKey={`certificado.resolucion.${periodId}`}
          busy={saveResolution.isPending}
          error={dialogError}
          onSubmit={(input) => submitReason(() => saveResolution.mutateAsync({ periodId, ...input }))}
          onClose={closeSubWithReset}
        />
      )}
    </div>
  );
}
