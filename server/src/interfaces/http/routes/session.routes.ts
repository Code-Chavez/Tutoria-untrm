import { Router, type IRouter } from 'express';
import multer from 'multer';
import { container } from '../../../infrastructure/container';
import { SessionController } from '../controllers/SessionController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const sessionController = new SessionController(
  container.useCases.scheduleSessionUseCase,
  container.useCases.listSessionsUseCase,
  container.useCases.registerAttendanceUseCase,
  container.useCases.rescheduleSessionUseCase,
  container.useCases.cancelSessionUseCase,
  container.useCases.uploadSessionEvidenceUseCase,
  container.useCases.listSessionEvidenceUseCase,
  container.useCases.getSessionEvidenceFileUseCase,
);

// Evidencias de sesión (HU-25): PDF o imagen, en memoria hasta guardarse en
// disco (máx. 10 MB, un archivo por solicitud).
const EVIDENCE_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, EVIDENCE_MIME_TYPES.includes(file.mimetype));
  },
});

const requireAuth = authenticate(container.services.tokenService);

// Programar una sesión de tutoría individual (HU-18, Art. 15.c). El tutor es
// siempre el usuario autenticado; sessions:write es exclusivo de Docente Tutor.
router.post('/sessions', requireAuth, authorize(['sessions:write']), sessionController.create);

// Listar sesiones (?mine=true para la agenda propia, ?studentId= para las de un estudiante).
router.get('/sessions', requireAuth, authorize(['sessions:read']), sessionController.list);

// Registrar la asistencia de una sesión individual (HU-22, Anexo N°4).
router.post(
  '/sessions/:id/attendance',
  requireAuth,
  authorize(['sessions:write']),
  sessionController.registerAttendance,
);

// Reprogramar o cancelar una sesión con motivo obligatorio (HU-23).
router.patch(
  '/sessions/:id/reschedule',
  requireAuth,
  authorize(['sessions:write']),
  sessionController.reschedule,
);
router.patch(
  '/sessions/:id/cancel',
  requireAuth,
  authorize(['sessions:write']),
  sessionController.cancel,
);

// Repositorio de evidencias (HU-25): adjuntar es exclusivo del tutor de la
// sesión; listar y descargar siguen el mismo acceso que ver la sesión.
router.post(
  '/sessions/:id/evidence',
  requireAuth,
  authorize(['sessions:write']),
  uploadEvidence.single('file'),
  sessionController.uploadEvidence,
);
router.get(
  '/sessions/:id/evidence',
  requireAuth,
  authorize(['sessions:read']),
  sessionController.listEvidence,
);
router.get(
  '/sessions/:id/evidence/:evidenceId/file',
  requireAuth,
  authorize(['sessions:read']),
  sessionController.downloadEvidence,
);

export default router;
