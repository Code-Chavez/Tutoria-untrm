import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';
import { container } from '../../../infrastructure/container';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { CertificateForbiddenError, InvalidCertificateFilterError } from '@application/use-cases/certification/CertificateQueryUseCases';

const router: IRouter = Router();
const requireAuth = authenticate(container.services.tokenService);

const filtersSchema = z.object({
  periodId: z.string().uuid('El periodo debe ser un UUID válido'),
  schoolId: z.string().uuid('La escuela debe ser un UUID válido').optional(),
  status: z.string().min(1).max(40).optional(),
  certificateStatus: z.string().min(1).max(40).optional(),
  q: z.string().max(100).optional(),
});

// Lista de docentes tutores de un periodo con su designación y su trámite de certificación. Mismo permiso y mismo alcance por escuela que
// los certificados: quien no puede consultarlos no ve esta lista, y fuera de su alcance no llega ningún dato.
router.get('/tutor-teachers', requireAuth, authorize(['certificados:consultar']), async (req: Request, res: Response) => {
  try {
    const filters = filtersSchema.parse(req.query);
    res.status(200).json({ teachers: await container.useCases.listTutorTeachersUseCase.execute(req.auth?.sub as string, filters) });
  } catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
    else if (error instanceof InvalidCertificateFilterError) res.status(400).json({ error: error.message });
    else if (error instanceof CertificateForbiddenError) res.status(403).json({ error: error.message });
    else {
      console.error('Error en la lista de docentes tutores', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

export default router;
