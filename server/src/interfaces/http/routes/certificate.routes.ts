import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';
import { container } from '../../../infrastructure/container';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  CertificateForbiddenError,
  CertificateNotFoundError,
  InvalidCertificateFilterError,
} from '@application/use-cases/certification/CertificateQueryUseCases';
import {
  CertificateNotEligibleError,
  CertificateSchoolNotFoundError,
  CertificateStateError,
  InvalidCertificateInputError,
} from '@application/use-cases/certification/CertificateWorkflowUseCases';
import { CertificateAlreadyExistsError } from '@domain/repositories/CertificateWorkflowRepository';

const router: IRouter = Router();
const requireAuth = authenticate(container.services.tokenService);

const filtersSchema = z.object({
  periodId: z.string().uuid('El periodo debe ser un UUID válido').optional(),
  schoolId: z.string().uuid('La escuela debe ser un UUID válido').optional(),
  status: z.string().min(1).max(40).optional(),
});

const startSchema = z.object({
  tutorId: z.string().uuid('El docente debe ser un UUID válido'),
  periodId: z.string().uuid('El periodo debe ser un UUID válido'),
  schoolId: z.string().uuid('La escuela debe ser un UUID válido'),
});
const evidenceSchema = z.object({ result: z.string().min(1).max(20), comment: z.string().max(2000).nullish() });
const noteSchema = z.object({ note: z.string().max(2000).nullish() });
const reasonSchema = z.object({ reason: z.string().max(2000).optional() });

function fail(res: Response, error: unknown) {
  if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
  else if (error instanceof InvalidCertificateFilterError || error instanceof InvalidCertificateInputError) res.status(400).json({ error: error.message });
  else if (error instanceof CertificateForbiddenError) res.status(403).json({ error: error.message });
  else if (error instanceof CertificateNotFoundError || error instanceof CertificateSchoolNotFoundError) res.status(404).json({ error: error.message });
  else if (error instanceof CertificateStateError || error instanceof CertificateNotEligibleError || error instanceof CertificateAlreadyExistsError) res.status(409).json({ error: error.message });
  else {
    console.error('Error en certificados', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Certificación del docente tutor (diseño: docs/levantamiento/17_DISENO_CERTIFICACION_DEMOSTRACION.md). Corte 2: solo consulta.
// El alcance sale de la misma fuente que el de los tutorados; fuera de él un trámite responde «no encontrado».
router.get('/certificates', requireAuth, authorize(['certificados:consultar']), async (req: Request, res: Response) => {
  try {
    const filters = filtersSchema.parse(req.query);
    res.status(200).json({ certificates: await container.useCases.listCertificatesUseCase.execute(req.auth?.sub as string, filters) });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/certificates/:id', requireAuth, authorize(['certificados:consultar']), async (req: Request, res: Response) => {
  try {
    // Un identificador que no es UUID no puede existir: misma respuesta que un trámite ajeno, sin llegar a la base.
    if (!z.string().uuid().safeParse(req.params.id).success) throw new CertificateNotFoundError();
    res.status(200).json({ certificate: await container.useCases.getCertificateUseCase.execute(req.auth?.sub as string, req.params.id as string) });
  } catch (error) {
    fail(res, error);
  }
});

// Corte 3: el trámite avanza por acciones explícitas, cada una con su permiso. Un identificador que no es UUID responde 404 sin llegar a la base.
const idOf = (req: Request): string => {
  const id = req.params.id as string;
  if (!z.string().uuid().safeParse(id).success) throw new CertificateNotFoundError();
  return id;
};
const sub = (req: Request): string => req.auth?.sub as string;
const detail = async (req: Request, id: string) => ({ certificate: await container.useCases.getCertificateUseCase.execute(sub(req), id) });

router.post('/certificates', requireAuth, authorize(['certificados:registrar']), async (req: Request, res: Response) => {
  try {
    const created = await container.useCases.startCertificateUseCase.execute(sub(req), startSchema.parse(req.body), req.ip);
    res.status(201).json(await detail(req, created.id));
  } catch (error) {
    fail(res, error);
  }
});

router.post('/certificates/:id/submit', requireAuth, authorize(['certificados:registrar']), async (req: Request, res: Response) => {
  try {
    const id = idOf(req);
    await container.useCases.submitCertificateUseCase.execute(sub(req), id, req.ip);
    res.status(200).json(await detail(req, id));
  } catch (error) {
    fail(res, error);
  }
});

router.put('/certificates/:id/evidences/:evidenceId', requireAuth, authorize(['certificados:aprobar']), async (req: Request, res: Response) => {
  try {
    const id = idOf(req);
    const evidenceId = req.params.evidenceId as string;
    if (!z.string().uuid().safeParse(evidenceId).success) throw new CertificateNotFoundError();
    await container.useCases.reviewEvidenceUseCase.execute(sub(req), id, evidenceId, evidenceSchema.parse(req.body), req.ip);
    res.status(200).json(await detail(req, id));
  } catch (error) {
    fail(res, error);
  }
});

router.post('/certificates/:id/observe', requireAuth, authorize(['certificados:aprobar']), async (req: Request, res: Response) => {
  try {
    const id = idOf(req);
    await container.useCases.observeCertificateUseCase.execute(sub(req), id, noteSchema.parse(req.body ?? {}), req.ip);
    res.status(200).json(await detail(req, id));
  } catch (error) {
    fail(res, error);
  }
});

router.post('/certificates/:id/reject', requireAuth, authorize(['certificados:aprobar']), async (req: Request, res: Response) => {
  try {
    const id = idOf(req);
    await container.useCases.rejectCertificateUseCase.execute(sub(req), id, reasonSchema.parse(req.body ?? {}), req.ip);
    res.status(200).json(await detail(req, id));
  } catch (error) {
    fail(res, error);
  }
});

router.post('/certificates/:id/approve', requireAuth, authorize(['certificados:aprobar']), async (req: Request, res: Response) => {
  try {
    const id = idOf(req);
    await container.useCases.approveCertificateUseCase.execute(sub(req), id, req.ip);
    res.status(200).json(await detail(req, id));
  } catch (error) {
    fail(res, error);
  }
});

router.post('/certificates/:id/void', requireAuth, authorize(['certificados:administrar']), async (req: Request, res: Response) => {
  try {
    const id = idOf(req);
    await container.useCases.voidCertificateUseCase.execute(sub(req), id, reasonSchema.parse(req.body ?? {}), req.ip);
    res.status(200).json(await detail(req, id));
  } catch (error) {
    fail(res, error);
  }
});

export default router;
