import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { container } from '../../../infrastructure/container';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditAccess, byParam } from '../middleware/auditAccess';
import { requireFileSignature } from '../middleware/fileSignature';
import {
  AdmonitionForbiddenError,
  AdmonitionNotFoundError,
  AdmonitionTutorError,
  InvalidAdmonitionError,
} from '@application/use-cases/admonitions/AdmonitionUseCases';

// Resolución o memorándum escaneado: PDF o imagen, en memoria hasta guardarse (máx. 10 MB).
const MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, MIME_TYPES.includes(file.mimetype)),
});

const bodySchema = z.object({
  tutorId: z.string().uuid('El docente debe ser un UUID válido'),
  issuedOn: z.string(),
  reason: z.string(),
});

const router: IRouter = Router();
const requireAuth = authenticate(container.services.tokenService);

function fail(res: Response, error: unknown) {
  if (error instanceof z.ZodError) res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
  else if (error instanceof InvalidAdmonitionError || error instanceof AdmonitionTutorError) res.status(400).json({ error: error.message });
  else if (error instanceof AdmonitionForbiddenError) res.status(403).json({ error: error.message });
  else if (error instanceof AdmonitionNotFoundError) res.status(404).json({ error: error.message });
  else {
    console.error('Error en amonestaciones', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Amonestaciones a docentes tutores: las emite el Decano de la facultad (o la DBU); la coordinación solo las consulta.
router.get('/admonitions', requireAuth, authorize(['admonitions:read']), async (req: Request, res: Response) => {
  try {
    res.status(200).json({ admonitions: await container.useCases.listAdmonitionsUseCase.execute(req.auth?.sub as string) });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/admonitions/tutors', requireAuth, authorize(['admonitions:write']), async (req: Request, res: Response) => {
  try {
    res.status(200).json({ tutors: await container.useCases.listAdmonishableTutorsUseCase.execute(req.auth?.sub as string) });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/admonitions', requireAuth, authorize(['admonitions:write']), upload.single('file'), requireFileSignature(['pdf', 'png', 'jpeg']), async (req: Request, res: Response) => {
  try {
    const body = bodySchema.parse(req.body);
    const file = req.file && { buffer: req.file.buffer, fileName: req.file.originalname, mimeType: req.file.mimetype, fileSize: req.file.size };
    const created = await container.useCases.issueAdmonitionUseCase.execute(req.auth?.sub as string, { ...body, file }, req.ip);
    res.status(201).json({ admonition: { id: created.id } });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/admonitions/:id/file', requireAuth, auditAccess('Admonition', 'DOWNLOAD', byParam('id')), authorize(['admonitions:read']), async (req: Request, res: Response) => {
  try {
    const { fileName, absolutePath } = await container.useCases.getAdmonitionFileUseCase.execute(req.params.id as string, req.auth?.sub as string);
    res.download(absolutePath, fileName);
  } catch (error) {
    fail(res, error);
  }
});

export default router;
