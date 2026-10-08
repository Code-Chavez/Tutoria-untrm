import { Router, type IRouter } from 'express';
import multer from 'multer';
import { container } from '../../../infrastructure/container';
import { SignedDocumentController } from '../controllers/SignedDocumentController';
import { AttendanceSheetPdf } from '../../../infrastructure/parsers/AttendanceSheetPdf';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new SignedDocumentController(
  container.useCases.attachReferralSignedDocumentUseCase,
  container.useCases.listReferralSignedDocumentsUseCase,
  container.useCases.getAttendanceSheetUseCase,
  container.useCases.attachAttendanceSheetSignedDocumentUseCase,
  container.useCases.listAttendanceSheetSignedDocumentsUseCase,
  container.useCases.getSignedDocumentFileUseCase,
  new AttendanceSheetPdf(),
);

// Documentos firmados y escaneados (A14): PDF o imagen, en memoria hasta guardarse (máx. 10 MB, uno por solicitud).
const SIGNED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, SIGNED_MIME_TYPES.includes(file.mimetype));
  },
});

const requireAuth = authenticate(container.services.tokenService);

// Constancia de derivación firmada (Anexo N°6): mismas reglas de visibilidad que la derivación.
router.get('/referrals/:id/signed-documents', requireAuth, authorize(['referrals:read']), controller.listForReferral);
router.post('/referrals/:id/signed-documents', requireAuth, authorize(['referrals:write']), upload.single('file'), controller.attachToReferral);

// Hoja de asistencia a la tutoría individual (Anexo N°4): PDF imprimible y documentos firmados.
router.get('/students/:id/attendance-sheet/pdf', requireAuth, authorize(['sessions:read']), controller.attendanceSheetPdf);
router.get('/students/:id/attendance-sheet/signed-documents', requireAuth, authorize(['sessions:read']), controller.listForAttendanceSheet);
router.post('/students/:id/attendance-sheet/signed-documents', requireAuth, authorize(['sessions:write']), upload.single('file'), controller.attachToAttendanceSheet);

// Descarga de cualquier documento firmado: la regla de acceso depende del caso al que pertenece.
router.get('/signed-documents/:docId/file', requireAuth, controller.download);

export default router;
