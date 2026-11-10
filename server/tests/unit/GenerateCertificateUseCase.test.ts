import { createHash } from 'node:crypto';
import { GenerateCertificateUseCase, CertificateNotReadyError, DemoModeDisabledError, DownloadCertificatePdfUseCase, CertificateFileIntegrityError } from '../../src/application/use-cases/certification/CertificateIssuanceUseCases';
import { CertificateNotFoundError } from '../../src/application/use-cases/certification/CertificateQueryUseCases';
import { CertificateStateError } from '../../src/application/use-cases/certification/CertificateWorkflowUseCases';
import { CertificateRecord } from '../../src/domain/repositories/CertificateRepository';
import { CertificatePatch } from '../../src/domain/repositories/CertificateWorkflowRepository';

const record = (over: Partial<CertificateRecord> = {}): CertificateRecord => ({
  id: 'c1',
  createdAt: new Date(),
  updatedAt: new Date(),
  periodId: 'p1',
  schoolId: 's1',
  tutorId: 't1',
  assignmentId: 'a1',
  createdById: 'u0',
  status: 'APROBADO',
  isDemo: true,
  number: null,
  templateId: null,
  hasUnsignedPdf: false,
  approvedById: 'u1',
  approvedAt: new Date(),
  voidedById: null,
  voidedAt: null,
  voidReason: null,
  reviewNote: null,
  pdfSha256: null,
  ...over,
});

const PDF = Buffer.from('%PDF-1.3 demo');
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

function build(over: { row?: CertificateRecord | null; campus?: { city: string | null } | null; settings?: { department: string | null; signatoryName: string | null; signatoryRole: string | null } | null; schoolCampusId?: string | null; demoMode?: boolean; resolution?: unknown; lockedStatus?: string; failAfterDecide?: boolean } = {}) {
  const row = over.row === undefined ? record() : over.row;
  const scopes = { resolve: jest.fn().mockResolvedValue({ kind: 'ALL' }) };
  const certificates = { findById: jest.fn().mockResolvedValue(row), pdfLocationOf: jest.fn() };
  const storage = { save: jest.fn().mockResolvedValue('stored-key.pdf'), resolvePath: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
  const nextSequence = jest.fn().mockResolvedValue(7);
  let patch: CertificatePatch | undefined;
  const workflow = {
    transition: jest.fn(async (_id: string, decide: (c: CertificateRecord, e: never[], tools: { nextSequence: typeof nextSequence }) => Promise<CertificatePatch> | CertificatePatch) => {
      const current = record({ ...(row ?? {}), status: over.lockedStatus ?? row?.status ?? 'APROBADO' });
      patch = await decide(current, [], { nextSequence });
      if (over.failAfterDecide) throw new Error('la transacción no confirmó');
      return { ...current, status: patch.status, number: patch.number ?? null };
    }),
  };
  const audit = { create: jest.fn().mockResolvedValue({}) };
  const deps = {
    schools: { findById: jest.fn().mockResolvedValue({ id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', campusId: over.schoolCampusId === undefined ? 'c1' : over.schoolCampusId }) },
    campuses: { findById: jest.fn().mockResolvedValue(over.campus === undefined ? { id: 'c1', city: null } : over.campus) },
    faculties: { findAll: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica' }]) },
    users: { findById: jest.fn().mockResolvedValue({ id: 't1', firstName: 'Docente', lastName: 'Ficticio' }) },
    periods: { findById: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) },
    resolutions: { find: jest.fn().mockResolvedValue(over.resolution === undefined ? { number: '030-2026-DEMO', issuedOn: new Date('2026-03-01') } : over.resolution) },
    templates: { ensure: jest.fn().mockResolvedValue({ id: 'tpl1', name: 'Demostración', version: 1, isDemo: true, title: 'CERTIFICADO', bodyText: 'Cuerpo {escuela} {periodo} {resolucion}' }) },
    schoolSettings: { find: jest.fn().mockResolvedValue(over.settings ?? null) },
    renderer: { render: jest.fn().mockResolvedValue(PDF) },
    storage,
    demoMode: over.demoMode ?? true,
  };
  const useCase = new GenerateCertificateUseCase(scopes as never, certificates as never, workflow as never, audit as never, deps as never, () => new Date('2026-11-05T12:00:00.000Z'));
  return { useCase, deps, storage, workflow, audit, nextSequence, patchOf: () => patch };
}

describe('GenerateCertificateUseCase', () => {
  it('genera el PDF: número DEMO- de la secuencia, huella, instantánea y plantilla; guarda el archivo una vez', async () => {
    const { useCase, storage, nextSequence, audit, patchOf, deps } = build();
    await useCase.execute('u1', 'c1', '10.0.0.1');

    expect(nextSequence).toHaveBeenCalledWith('DEMO', 2026);
    const patch = patchOf()!;
    expect(patch).toMatchObject({ status: 'GENERADO_SIN_FIRMA', number: 'DEMO-007-2026/UNTRM/FISME-IS', templateId: 'tpl1', unsignedSha256: sha(PDF), unsignedStorageKey: 'stored-key.pdf' });
    expect(patch.snapshot).toMatchObject({ number: 'DEMO-007-2026/UNTRM/FISME-IS', resolutionNumber: '030-2026-DEMO', periodName: '2026-II', departmentIsPlaceholder: true, demo: true });
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(deps.renderer.render).toHaveBeenCalledTimes(1);
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'CERTIFICATE_GENERATED', entityId: 'c1', ipAddress: '10.0.0.1' }));
  });

  describe('ciudad de la fecha (issue #267)', () => {
    const dateLine = (deps: { renderer: { render: jest.Mock } }) => (deps.renderer.render.mock.calls[0] as [{ dateLine: string }])[0].dateLine;

    it('usa la ciudad de la sede de la escuela y la deja en la instantánea', async () => {
      const { useCase, deps, patchOf } = build({ campus: { city: 'Bagua Grande' } });
      await useCase.execute('u1', 'c1');

      expect(dateLine(deps)).toBe('Bagua Grande, 05 noviembre de 2026.');
      expect(patchOf()!.snapshot).toMatchObject({ city: 'Bagua Grande' });
      expect(deps.campuses.findById).toHaveBeenCalledWith('c1');
    });

    it('sin ciudad en la sede, o sin sede, o con una ciudad en blanco, usa Chachapoyas', async () => {
      for (const over of [{ campus: { city: null } }, { schoolCampusId: null, campus: null }, { campus: { city: '   ' } }]) {
        const { useCase, deps, patchOf } = build(over);
        await useCase.execute('u1', 'c1');

        expect(dateLine(deps)).toBe('Chachapoyas, 05 noviembre de 2026.');
        expect(patchOf()!.snapshot).toMatchObject({ city: 'Chachapoyas' });
      }
    });
  });

  describe('departamento y autoridad que firma configurados (issue #271)', () => {
    const rendered = (deps: { renderer: { render: jest.Mock } }) => (deps.renderer.render.mock.calls[0] as [{ signatory: string[]; body: Array<{ text: string }> }])[0];

    it('imprime la autoridad y el departamento de la escuela y los deja en la instantánea', async () => {
      const { useCase, deps, patchOf } = build({ settings: { department: 'Departamento de Ingeniería', signatoryName: 'Dr. Ana Pérez Rojas', signatoryRole: 'Directora de la Escuela' } });
      await useCase.execute('u1', 'c1');

      expect(rendered(deps).signatory.slice(0, 2)).toEqual(['Dr. Ana Pérez Rojas', 'Directora de la Escuela']);
      expect(patchOf()!.snapshot).toMatchObject({ department: 'Departamento de Ingeniería', departmentIsPlaceholder: false, signatoryName: 'Dr. Ana Pérez Rojas', signatoryRole: 'Directora de la Escuela' });
      expect(deps.schoolSettings.find).toHaveBeenCalledWith('s1');
    });

    it('sin configurar mantiene el marcador, el cargo predeterminado y el departamento como marcador', async () => {
      const { useCase, deps, patchOf } = build();
      await useCase.execute('u1', 'c1');

      expect(rendered(deps).signatory[0]).toMatch(/^\[.*autoridad firmante\]$/);
      expect(rendered(deps).signatory[1]).toBe('Director de Escuela de Ingeniería de Sistemas');
      expect(patchOf()!.snapshot).toMatchObject({ department: 'Ingeniería de Sistemas', departmentIsPlaceholder: true });
    });
  });

  it('con el modo de demostración desactivado no hace nada', async () => {
    const { useCase, workflow, storage } = build({ demoMode: false });
    await expect(useCase.execute('u1', 'c1')).rejects.toBeInstanceOf(DemoModeDisabledError);
    expect(workflow.transition).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('un certificado que no es de demostración no se genera (no hay plantilla oficial)', async () => {
    const { useCase, storage } = build({ row: record({ isDemo: false }) });
    await expect(useCase.execute('u1', 'c1')).rejects.toThrow(/No hay plantilla oficial/);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('solo desde APROBADO: cualquier otro estado se rechaza antes de tocar nada', async () => {
    for (const status of ['INICIADO', 'EN_REVISION', 'OBSERVADO', 'RECHAZADO', 'GENERADO_SIN_FIRMA', 'ANULADO']) {
      const { useCase, workflow, storage } = build({ row: record({ status }) });
      await expect(useCase.execute('u1', 'c1')).rejects.toBeInstanceOf(CertificateStateError);
      expect(workflow.transition).not.toHaveBeenCalled();
      expect(storage.save).not.toHaveBeenCalled();
    }
  });

  it('sin resolución de decanato responde «no está listo» y no consume número', async () => {
    const { useCase, nextSequence, storage } = build({ resolution: null });
    await expect(useCase.execute('u1', 'c1')).rejects.toBeInstanceOf(CertificateNotReadyError);
    expect(nextSequence).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('si el trámite cambió de estado mientras esperaba el bloqueo, no toma número ni guarda archivo', async () => {
    const { useCase, nextSequence, storage } = build({ lockedStatus: 'GENERADO_SIN_FIRMA' });
    await expect(useCase.execute('u1', 'c1')).rejects.toBeInstanceOf(CertificateStateError);
    expect(nextSequence).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('si la transacción no confirma, el archivo que se alcanzó a guardar se borra y no se registra la generación', async () => {
    const { useCase, storage, audit } = build({ failAfterDecide: true });
    await expect(useCase.execute('u1', 'c1')).rejects.toThrow('la transacción no confirmó');
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith('stored-key.pdf');
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('un trámite fuera del alcance responde «no encontrado»', async () => {
    const { useCase } = build({ row: null });
    await expect(useCase.execute('u1', 'c1')).rejects.toBeInstanceOf(CertificateNotFoundError);
  });
});

describe('DownloadCertificatePdfUseCase', () => {
  const download = (location: { storageKey: string; sha256: string } | null, bytes: Buffer | Error, row = record({ status: 'GENERADO_SIN_FIRMA', number: 'DEMO-001-2026/UNTRM/FAC-ESC', hasUnsignedPdf: true })) => {
    const scopes = { resolve: jest.fn().mockResolvedValue({ kind: 'ALL' }) };
    const certificates = { findById: jest.fn().mockResolvedValue(row), pdfLocationOf: jest.fn().mockResolvedValue(location) };
    const reader = { read: jest.fn().mockImplementation(() => (bytes instanceof Error ? Promise.reject(bytes) : Promise.resolve(bytes))) };
    return new DownloadCertificatePdfUseCase(scopes as never, certificates as never, {} as never, {} as never, reader);
  };

  it('entrega los bytes cuando coinciden con la huella, con un nombre de archivo seguro', async () => {
    const out = await download({ storageKey: 'k.pdf', sha256: sha(PDF) }, PDF).execute('u1', 'c1');
    expect(out.buffer.equals(PDF)).toBe(true);
    expect(out.fileName).toBe('certificado-DEMO-001-2026-UNTRM-FAC-ESC.pdf');
  });

  it('si la huella no coincide, o el archivo no existe, no se entrega', async () => {
    await expect(download({ storageKey: 'k.pdf', sha256: sha(Buffer.from('otro')) }, PDF).execute('u1', 'c1')).rejects.toBeInstanceOf(CertificateFileIntegrityError);
    await expect(download({ storageKey: 'k.pdf', sha256: sha(PDF) }, Object.assign(new Error('ENOENT'), { code: 'ENOENT' })).execute('u1', 'c1')).rejects.toBeInstanceOf(CertificateFileIntegrityError);
  });

  it('sin PDF generado responde con un error de estado', async () => {
    await expect(download(null, PDF).execute('u1', 'c1')).rejects.toBeInstanceOf(CertificateStateError);
  });
});
