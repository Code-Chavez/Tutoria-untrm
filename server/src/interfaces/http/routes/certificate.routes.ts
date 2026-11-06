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

const router: IRouter = Router();
const requireAuth = authenticate(container.services.tokenService);

const filtersSchema = z.object({
  periodId: z.string().uuid('El periodo debe ser un UUID válido').optional(),
  schoolId: z.string().uuid('La escuela debe ser un UUID válido').optional(),
  status: z.string().min(1).max(40).optional(),
});

function fail(res: Response, error: unknown) {
  if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
  else if (error instanceof InvalidCertificateFilterError) res.status(400).json({ error: error.message });
  else if (error instanceof CertificateForbiddenError) res.status(403).json({ error: error.message });
  else if (error instanceof CertificateNotFoundError) res.status(404).json({ error: error.message });
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

export default router;
