import { Router, type IRouter, type Request, type Response } from 'express';
import { z } from 'zod';
import { container } from '../../../infrastructure/container';
import { rateLimit } from '../middleware/rateLimit';
import { InvalidAcceptanceLinkError, InvalidAvailabilityError } from '@application/use-cases/cycle-tutors/TutorAcceptanceUseCases';

const router: IRouter = Router();

// Rutas públicas: la autorización es el enlace personal de un solo uso. Se limitan por IP para que no sirvan de sondeo de enlaces.
const limiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 30,
  message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
});

const responseSchema = z.object({
  accept: z.boolean(),
  availability: z.array(z.object({ day: z.number(), start: z.string(), end: z.string(), place: z.string().optional() })).optional(),
  reason: z.string().max(500).optional(),
});

function fail(res: Response, error: unknown) {
  if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.issues });
  else if (error instanceof InvalidAvailabilityError) res.status(400).json({ error: error.message });
  else if (error instanceof InvalidAcceptanceLinkError) res.status(404).json({ error: error.message });
  else res.status(500).json({ error: 'Error interno del servidor' });
}

router.get('/tutor-acceptance/:token', limiter, async (req: Request, res: Response) => {
  try {
    res.status(200).json(await container.useCases.getTutorAcceptanceUseCase.execute(req.params.token as string));
  } catch (error) {
    fail(res, error);
  }
});

router.post('/tutor-acceptance/:token', limiter, async (req: Request, res: Response) => {
  // La respuesta puede contener un enlace personal de activación de un solo uso.
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = responseSchema.parse(req.body);
    res.status(200).json(await container.useCases.respondTutorAcceptanceUseCase.execute(req.params.token as string, body, req.ip));
  } catch (error) {
    fail(res, error);
  }
});

export default router;
