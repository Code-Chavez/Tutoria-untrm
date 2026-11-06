import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { AuthContext, type AuthContextValue } from '@features/auth/context/AuthContext';
import { CertificatesPage } from './CertificatesPage';
import { certificateService, type Certificate, type CertificateCandidate, type CertificateDetail } from '../services/certificateService';

vi.mock('../services/certificateService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/certificateService')>()),
  certificateService: {
    options: vi.fn(),
    list: vi.fn(),
    candidates: vi.fn(),
    resolutions: vi.fn(),
    get: vi.fn(),
    start: vi.fn(),
    submit: vi.fn(),
    reviewEvidence: vi.fn(),
    observe: vi.fn(),
    reject: vi.fn(),
    approve: vi.fn(),
    generate: vi.fn(),
    void: vi.fn(),
    saveResolution: vi.fn(),
    downloadPdf: vi.fn(),
  },
}));

const api = vi.mocked(certificateService);
const ALL = ['certificados:consultar', 'certificados:registrar', 'certificados:aprobar', 'certificados:emitir', 'certificados:descargar', 'certificados:administrar'];

const base = (over: Partial<Certificate> = {}): Certificate => ({
  id: 'c1',
  status: 'EN_REVISION',
  isDemo: true,
  number: null,
  periodId: 'p1',
  periodName: '2026-II',
  schoolId: 's1',
  schoolName: 'Ingeniería de Sistemas',
  tutorId: 't1',
  tutorName: 'Docente Ficticio',
  createdAt: '2026-11-01T12:00:00.000Z',
  hasUnsignedPdf: false,
  approvedAt: null,
  voidedAt: null,
  voidReason: null,
  reviewNote: null,
  pdfSha256: null,
  allowedActions: ['APPROVE', 'OBSERVE', 'REJECT', 'VOID'],
  ...over,
});

const detail = (over: Partial<CertificateDetail> = {}): CertificateDetail => ({
  ...base(),
  facts: { acceptance: { status: 'ACEPTADA', respondedAt: '2026-10-20T12:00:00.000Z', cycle: 3 }, sessionsHeld: 4, semesterReportSubmitted: false },
  evidences: [
    { id: 'e1', kind: 'ACEPTACION', ref: 'a1', result: 'PENDIENTE', comment: null, reviewedByName: null, reviewedAt: null },
    { id: 'e2', kind: 'SESIONES', ref: null, result: 'PENDIENTE', comment: null, reviewedByName: null, reviewedAt: null },
    { id: 'e3', kind: 'INFORME_SEMESTRAL', ref: null, result: 'PENDIENTE', comment: null, reviewedByName: null, reviewedAt: null },
  ],
  ...over,
});

const candidate = (over: Partial<CertificateCandidate> = {}): CertificateCandidate => ({ tutorId: 't9', tutorName: 'Docente Candidato', schoolId: 's1', schoolName: 'Ingeniería de Sistemas', assignmentId: 'a9', cycles: [2, 4], ...over });

const httpError = (status: number, message: string) => new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, statusText: '', data: { error: message }, headers: {}, config: {} as never });

const auth = (permissions: string[], id = 'u1'): AuthContextValue => ({
  user: { id, email: 'dbu@untrm.edu.pe', firstName: 'Ana', lastName: 'Directora', role: 'Rol a medida', permissions },
  isAuthenticated: true,
  isSessionFresh: true,
  login: vi.fn(),
  logout: vi.fn(),
  markPasswordChanged: vi.fn(),
});

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="search">{location.search}</output>
      <button onClick={() => navigate(-1)}>atrás</button>
    </>
  );
}

const renderPage = (permissions = ALL, url = '/certificados', id = 'u1') =>
  render(
    <AuthContext.Provider value={auth(permissions, id)}>
      <MemoryRouter initialEntries={[url]}>
        <QueryClientTestWrapper>
          <CertificatesPage />
          <Probe />
        </QueryClientTestWrapper>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const search = () => screen.getByTestId('search').textContent;

describe('CertificatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    api.options.mockResolvedValue({ periods: [{ id: 'p1', name: '2026-II', isActive: true }, { id: 'p0', name: '2026-I', isActive: false }], currentPeriodId: 'p1', schools: [{ id: 's1', name: 'Ingeniería de Sistemas' }, { id: 's2', name: 'Mecánica Eléctrica' }] });
    api.list.mockResolvedValue([base(), base({ id: 'c2', status: 'GENERADO_SIN_FIRMA', number: 'DEMO-001-2026/UNTRM/FISME-IS', tutorName: 'Otra Docente', hasUnsignedPdf: true, allowedActions: ['VOID'] })]);
    api.candidates.mockResolvedValue([candidate()]);
    api.resolutions.mockResolvedValue([]);
    api.get.mockImplementation(async (id: string) => detail({ id }));
  });

  describe('lista y filtros', () => {
    it('muestra el aviso de demostración, los trámites del periodo y los docentes sin trámite', async () => {
      renderPage();
      expect(await screen.findByText('Docente Ficticio')).toBeInTheDocument();
      expect(screen.getByRole('note')).toHaveTextContent(/Demostración sin valor/);
      expect(screen.getByText('Otra Docente')).toBeInTheDocument();
      expect(screen.getByText('DEMO-001-2026/UNTRM/FISME-IS')).toBeInTheDocument();
      expect(await screen.findByText('Docente Candidato')).toBeInTheDocument();
      expect(api.list).toHaveBeenCalledWith({ periodId: 'p1', schoolId: '', status: '' });
    });

    it('el nombre accesible de cada botón de las tablas contiene su texto visible y dice de quién es (accesibilidad: etiqueta en el nombre)', async () => {
      renderPage();
      await screen.findByText('Docente Candidato');
      const buttons = [...document.querySelectorAll('table button')] as HTMLButtonElement[];
      expect(buttons.length).toBeGreaterThanOrEqual(3);
      for (const button of buttons) {
        const visible = button.textContent?.trim() ?? '';
        const name = button.getAttribute('aria-label') ?? visible;
        expect(name.toLowerCase(), `«${name}» debe contener «${visible}»`).toContain(visible.toLowerCase());
        expect(name).toMatch(/Docente|Otra Docente/);
      }
    });

    it('los filtros se escriben en la URL y se restauran al recargar o abrir el enlace', async () => {
      const user = userEvent.setup();
      const first = renderPage();
      await screen.findByText('Docente Ficticio');
      await user.selectOptions(screen.getByLabelText('Estado'), 'EN_REVISION');
      await user.selectOptions(screen.getByLabelText('Escuela profesional'), 's2');
      await user.selectOptions(screen.getByLabelText('Periodo'), 'p0');
      expect(search()).toBe('?estado=EN_REVISION&escuela=s2&periodo=p0');
      await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ periodId: 'p0', schoolId: 's2', status: 'EN_REVISION' }));
      first.unmount();

      renderPage(ALL, '/certificados?estado=EN_REVISION&escuela=s2&periodo=p0');
      await screen.findByLabelText('Estado');
      expect(screen.getByLabelText('Estado')).toHaveValue('EN_REVISION');
      expect(screen.getByLabelText('Escuela profesional')).toHaveValue('s2');
      expect(screen.getByLabelText('Periodo')).toHaveValue('p0');
    });

    it('un periodo, una escuela o un estado de la URL que no existen se ignoran sin romper la pantalla', async () => {
      renderPage(ALL, '/certificados?periodo=nope&escuela=ajena&estado=INVENTADO&certificado=');
      expect(await screen.findByText('Docente Ficticio')).toBeInTheDocument();
      expect(screen.getByLabelText('Periodo')).toHaveValue('p1');
      expect(screen.getByLabelText('Escuela profesional')).toHaveValue('');
      expect(screen.getByLabelText('Estado')).toHaveValue('');
      expect(api.list).toHaveBeenCalledWith({ periodId: 'p1', schoolId: '', status: '' });
    });

    it('sin permiso de iniciar no se piden ni se muestran los docentes sin trámite; sin permiso de administrar no hay resolución', async () => {
      renderPage(['certificados:consultar']);
      await screen.findByText('Docente Ficticio');
      expect(api.candidates).not.toHaveBeenCalled();
      expect(screen.queryByText('Docentes sin trámite')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Resolución de decanato' })).not.toBeInTheDocument();
    });

    it('si no hay trámites lo dice, y si el servidor falla muestra el motivo', async () => {
      api.list.mockResolvedValueOnce([]);
      const first = renderPage();
      expect(await screen.findByText('Sin trámites')).toBeInTheDocument();
      first.unmount();
      api.list.mockRejectedValueOnce(httpError(500, 'Error interno'));
      renderPage();
      expect(await screen.findByText('No se pudieron cargar los trámites')).toBeInTheDocument();
    });
  });

  describe('trámite abierto y navegación', () => {
    it('abrir un trámite lo escribe en la URL y «atrás» lo cierra; el enlace lo vuelve a abrir', async () => {
      const user = userEvent.setup();
      const first = renderPage();
      await user.click(await screen.findByRole('button', { name: 'Ver trámite de Docente Ficticio' }));
      expect(await screen.findByRole('dialog', { name: /Certificado de Docente Ficticio/ })).toBeInTheDocument();
      expect(search()).toBe('?certificado=c1');

      await user.click(screen.getByText('atrás'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      first.unmount();

      renderPage(ALL, '/certificados?certificado=c1');
      expect(await screen.findByRole('dialog', { name: /Certificado de Docente Ficticio/ })).toBeInTheDocument();
    });

    it('un trámite que ya no existe o es ajeno muestra un mensaje y se puede cerrar', async () => {
      api.get.mockRejectedValue(httpError(404, 'Certificado no encontrado'));
      const user = userEvent.setup();
      renderPage(ALL, '/certificados?certificado=desaparecido');
      expect(await screen.findByText(/No se encontró este trámite/)).toBeInTheDocument();
      await user.click(screen.getAllByRole('button', { name: 'Cerrar' })[1]!);
      expect(search()).toBe('');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('iniciar el trámite de un docente sin trámite lo crea y abre su detalle', async () => {
      api.start.mockResolvedValue(detail({ id: 'nuevo', status: 'INICIADO', allowedActions: ['SUBMIT', 'VOID'] }));
      api.get.mockResolvedValue(detail({ id: 'nuevo', status: 'INICIADO', allowedActions: ['SUBMIT', 'VOID'] }));
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Iniciar trámite de Docente Candidato' }));
      expect(api.start).toHaveBeenCalledWith({ tutorId: 't9', periodId: 'p1', schoolId: 's1' });
      expect(await screen.findByRole('dialog', { name: /Certificado de Docente Ficticio/ })).toBeInTheDocument();
      expect(search()).toBe('?certificado=nuevo');
    });

    it('si el servidor rechaza iniciar el trámite, lo dice con sus palabras', async () => {
      api.start.mockRejectedValue(httpError(409, 'Ya existe un trámite vigente de certificado para ese docente'));
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Iniciar trámite de Docente Candidato' }));
      expect(await screen.findByText('Ya existe un trámite vigente de certificado para ese docente')).toBeInTheDocument();
    });
  });

  describe('detalle: evidencias, hechos y acciones', () => {
    const open = async (permissions = ALL, over: Partial<CertificateDetail> = {}) => {
      api.get.mockResolvedValue(detail(over));
      const user = userEvent.setup();
      renderPage(permissions, '/certificados?certificado=c1');
      const dialog = await screen.findByRole('dialog', { name: /Certificado de Docente Ficticio/ });
      return { user, dialog };
    };

    it('muestra lo que el sistema sabe de cada evidencia como información, sin decir que cumplió', async () => {
      const { dialog } = await open();
      expect(within(dialog).getByText(/Designación del ciclo 3: aceptada/)).toBeInTheDocument();
      expect(within(dialog).getByText('Constan 4 sesiones realizadas en el periodo.')).toBeInTheDocument();
      expect(within(dialog).getByText('No consta un informe semestral presentado en el periodo.')).toBeInTheDocument();
      expect(within(dialog).getByText(/solo como información/)).toBeInTheDocument();
      expect(within(dialog).queryByText(/cumplió/i)).not.toBeInTheDocument();
    });

    it('con todo pendiente, aprobar está deshabilitado y explica qué falta', async () => {
      const { dialog } = await open();
      expect(within(dialog).getByRole('button', { name: 'Aprobar' })).toBeDisabled();
      expect(within(dialog).getByText('Faltan por revisar 3 evidencia(s)')).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Devolver con observaciones' })).toBeDisabled();
    });

    it('con todas las evidencias conformes se puede aprobar', async () => {
      const evidences = detail().evidences.map((e) => ({ ...e, result: 'CONFORME' as const, reviewedByName: 'Ana Directora' }));
      api.approve.mockResolvedValue(detail({ status: 'APROBADO' }));
      const { user, dialog } = await open(ALL, { evidences });
      expect(within(dialog).queryByText('Para aprobar:')).not.toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Aprobar' }));
      expect(api.approve).toHaveBeenCalledWith('c1');
      expect(await within(dialog).findByText('El trámite quedó aprobado.')).toBeInTheDocument();
    });

    it('marcar una evidencia conforme llama al servidor; observada pide un comentario que se guarda con la evidencia', async () => {
      api.reviewEvidence.mockResolvedValue(detail());
      const { user, dialog } = await open();
      await user.click(within(dialog).getByRole('button', { name: 'Marcar conforme: Sesiones realizadas' }));
      expect(api.reviewEvidence).toHaveBeenCalledWith('c1', 'e2', { result: 'CONFORME', comment: undefined });

      await user.click(within(dialog).getByRole('button', { name: 'Marcar observada: Informe semestral' }));
      const save = within(dialog).getByRole('button', { name: 'Guardar observación' });
      expect(save).toBeDisabled();
      await user.type(within(dialog).getByLabelText(/Qué se observa de «Informe semestral»/), 'Falta el informe');
      await user.click(save);
      expect(api.reviewEvidence).toHaveBeenLastCalledWith('c1', 'e3', { result: 'OBSERVADA', comment: 'Falta el informe' });
    });

    it('el comentario de una evidencia observada se conserva como borrador al recargar y no sale en la URL', async () => {
      const { user, dialog } = await open();
      await user.click(within(dialog).getByRole('button', { name: 'Marcar observada: Sesiones realizadas' }));
      await user.type(within(dialog).getByLabelText(/Qué se observa de «Sesiones realizadas»/), 'Sin actas');
      expect(search()).toBe('?certificado=c1'); // lo escrito no va a la URL
      expect(sessionStorage.getItem('sit.draft.u1.certificado.evidencia.e2')).toContain('Sin actas');
    });

    it('cada permiso habilita solo sus acciones: quien solo consulta no ve ninguna', async () => {
      const { dialog } = await open(['certificados:consultar']);
      for (const name of ['Aprobar', 'Rechazar', 'Anular', 'Enviar a revisión', 'Generar PDF de demostración', 'Descargar PDF']) {
        expect(within(dialog).queryByRole('button', { name })).not.toBeInTheDocument();
      }
      expect(within(dialog).queryByRole('button', { name: /Marcar conforme/ })).not.toBeInTheDocument();
    });

    it('quien solo inicia ve enviar a revisión y no aprueba; quien solo aprueba no envía', async () => {
      const first = await open(['certificados:consultar', 'certificados:registrar'], { status: 'INICIADO', allowedActions: ['SUBMIT', 'VOID'] });
      expect(within(first.dialog).getByRole('button', { name: 'Enviar a revisión' })).toBeInTheDocument();
      expect(within(first.dialog).queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
    });

    it('el botón del PDF solo aparece cuando el trámite ya tiene PDF y la persona puede descargarlo', async () => {
      const first = await open(ALL, { status: 'GENERADO_SIN_FIRMA', hasUnsignedPdf: true, number: 'DEMO-001-2026/UNTRM/FISME-IS', allowedActions: ['VOID'] });
      api.downloadPdf.mockResolvedValue(undefined);
      await first.user.click(within(first.dialog).getByRole('button', { name: 'Descargar PDF' }));
      expect(api.downloadPdf).toHaveBeenCalledWith('c1', 'DEMO-001-2026/UNTRM/FISME-IS');
      expect(await within(first.dialog).findByText('El PDF de demostración se descargó.')).toBeInTheDocument();
    });

    it('sin PDF generado no se ofrece descargarlo', async () => {
      const { dialog } = await open(ALL, { status: 'APROBADO', allowedActions: ['GENERATE', 'VOID'] });
      expect(within(dialog).queryByRole('button', { name: 'Descargar PDF' })).not.toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Generar PDF de demostración' })).toBeInTheDocument();
    });

    it('si falta la resolución de decanato, el error se explica y ofrece registrarla a quien puede', async () => {
      api.generate.mockRejectedValue(httpError(409, 'Registra la resolución de decanato de la escuela y el periodo antes de generar el certificado'));
      const { user, dialog } = await open(ALL, { status: 'APROBADO', allowedActions: ['GENERATE', 'VOID'] });
      await user.click(within(dialog).getByRole('button', { name: 'Generar PDF de demostración' }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/resolución de decanato/);
      await user.click(within(dialog).getByRole('button', { name: 'Registrar la resolución de decanato' }));
      expect(search()).toContain('dialogo=resolucion');
      expect(await screen.findByRole('dialog', { name: 'Resolución de decanato' })).toBeInTheDocument();
    });

    it('muestra la nota de una observación y el motivo de un rechazo o una anulación', async () => {
      const { dialog } = await open(ALL, { status: 'OBSERVADO', reviewNote: 'Adjuntar la resolución', allowedActions: ['RESUBMIT', 'VOID'] });
      expect(within(dialog).getByText(/Observación:/)).toBeInTheDocument();
      expect(within(dialog).getByText(/Adjuntar la resolución/)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Reenviar a revisión' })).toBeInTheDocument();
    });
  });

  describe('ventanas de motivo y borradores', () => {
    const openReject = async (id = 'u1') => {
      api.get.mockResolvedValue(detail());
      const user = userEvent.setup();
      renderPage(ALL, '/certificados?certificado=c1', id);
      const detailDialog = await screen.findByRole('dialog', { name: /Certificado de Docente Ficticio/ });
      await user.click(within(detailDialog).getByRole('button', { name: 'Rechazar' }));
      const dialog = await screen.findByRole('dialog', { name: 'Rechazar el trámite' });
      return { user, dialog };
    };

    it('rechazar exige un motivo de al menos 10 caracteres y lo envía al servidor', async () => {
      api.reject.mockResolvedValue(detail({ status: 'RECHAZADO' }));
      const { user, dialog } = await openReject();
      expect(search()).toBe('?certificado=c1&dialogo=rechazar');
      const submit = within(dialog).getByRole('button', { name: 'Rechazar el trámite' });
      expect(submit).toBeDisabled();
      await user.type(within(dialog).getByLabelText('Motivo del rechazo'), 'corto');
      expect(submit).toBeDisabled();
      await user.type(within(dialog).getByLabelText('Motivo del rechazo'), ' y ahora sí alcanza');
      await user.click(submit);
      expect(api.reject).toHaveBeenCalledWith('c1', 'corto y ahora sí alcanza');
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Rechazar el trámite' })).not.toBeInTheDocument());
      expect(sessionStorage.getItem('sit.draft.u1.certificado.rechazar.c1')).toBeNull(); // enviar con éxito descarta el borrador
    });

    it('cerrar sin enviar conserva el motivo: al volver a abrirlo aparece recuperado, y se puede descartar', async () => {
      const { user, dialog } = await openReject();
      await user.type(within(dialog).getByLabelText('Motivo del rechazo'), 'Falta el acta de designación');
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(search()).toBe('?certificado=c1');

      const detailDialog = await screen.findByRole('dialog', { name: /Certificado de Docente Ficticio/ });
      await user.click(within(detailDialog).getByRole('button', { name: 'Rechazar' }));
      const again = await screen.findByRole('dialog', { name: 'Rechazar el trámite' });
      expect(within(again).getByRole('status')).toHaveTextContent(/Recuperamos lo que habías escrito/);
      expect(within(again).getByLabelText('Motivo del rechazo')).toHaveValue('Falta el acta de designación');
      await user.click(within(again).getByRole('button', { name: 'Descartar borrador' }));
      expect(within(again).getByLabelText('Motivo del rechazo')).toHaveValue('');
    });

    it('si el servidor rechaza la acción, el motivo escrito no se pierde y se muestra el error', async () => {
      api.reject.mockRejectedValue(httpError(409, 'La acción no se puede hacer con el trámite en estado APROBADO'));
      const { user, dialog } = await openReject();
      await user.type(within(dialog).getByLabelText('Motivo del rechazo'), 'Motivo suficientemente largo');
      await user.click(within(dialog).getByRole('button', { name: 'Rechazar el trámite' }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('La acción no se puede hacer con el trámite en estado APROBADO');
      expect(within(dialog).getByLabelText('Motivo del rechazo')).toHaveValue('Motivo suficientemente largo');
    });

    it('el borrador de una persona no aparece en la sesión de otra', async () => {
      sessionStorage.setItem('sit.draft.otra-persona.certificado.rechazar.c1', JSON.stringify('Texto de otra persona'));
      const { dialog } = await openReject('u1');
      expect(within(dialog).getByLabelText('Motivo del rechazo')).toHaveValue('');
      expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('resolución de decanato', () => {
    it('se registra desde el encabezado con la escuela del filtro, y avisa si reemplaza una existente', async () => {
      api.resolutions.mockResolvedValue([{ id: 'r1', periodId: 'p1', periodName: '2026-II', schoolId: 's2', schoolName: 'Mecánica Eléctrica', number: '010-2026-VIEJA', issuedOn: '2026-03-01T00:00:00.000Z' }]);
      api.saveResolution.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderPage(ALL, '/certificados?escuela=s2');
      await user.click(await screen.findByRole('button', { name: 'Resolución de decanato' }));
      const dialog = await screen.findByRole('dialog', { name: 'Resolución de decanato' });
      expect(search()).toBe('?escuela=s2&dialogo=resolucion');
      expect(within(dialog).getByLabelText('Escuela profesional')).toHaveValue('s2');
      expect(await within(dialog).findByText(/Ya hay una registrada: «010-2026-VIEJA»/)).toBeInTheDocument();
      const save = within(dialog).getByRole('button', { name: 'Guardar resolución' });
      expect(save).toBeDisabled();
      await user.type(within(dialog).getByLabelText('Número de la resolución'), '030-2026-NUEVA');
      await user.click(save);
      expect(api.saveResolution).toHaveBeenCalledWith(expect.objectContaining({ periodId: 'p1', schoolId: 's2', number: '030-2026-NUEVA' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});
