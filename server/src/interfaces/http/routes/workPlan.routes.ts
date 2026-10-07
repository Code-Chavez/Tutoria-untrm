import { Router, type IRouter } from 'express';
import multer from 'multer';
import { container } from '../../../infrastructure/container';
import { WorkPlanController } from '../controllers/WorkPlanController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const workPlanController = new WorkPlanController(
  container.useCases.listWorkPlansUseCase,
  container.useCases.getWorkPlanUseCase,
  container.useCases.saveWorkPlanUseCase,
  container.useCases.uploadWorkPlanResolutionUseCase,
  container.useCases.getWorkPlanResolutionFileUseCase,
  container.useCases.listWorkPlanVersionsUseCase,
  container.useCases.getWorkPlanVersionResolutionFileUseCase,
);

// La resolución de aprobación es un único PDF en memoria (máx. 10 MB).
const uploadResolution = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf');
  },
});

const requireAuth = authenticate(container.services.tokenService);

// Plan de trabajo semestral (HU-41, Art. 17.a): el acceso por escuela se
// valida dentro de los casos de uso (DBU todas; Coordinador solo las suyas).
router.get('/work-plans', requireAuth, authorize(['work-plans:read']), workPlanController.list);
router.get(
  '/work-plans/:schoolId',
  requireAuth,
  authorize(['work-plans:read']),
  workPlanController.get,
);
router.put(
  '/work-plans/:schoolId',
  requireAuth,
  authorize(['work-plans:write']),
  workPlanController.save,
);

router.post(
  '/work-plans/:schoolId/resolution',
  requireAuth,
  authorize(['work-plans:write']),
  uploadResolution.single('file'),
  workPlanController.uploadResolution,
);
router.get(
  '/work-plans/:schoolId/resolution/file',
  requireAuth,
  authorize(['work-plans:read']),
  workPlanController.downloadResolution,
);
router.get(
  '/work-plans/:schoolId/versions',
  requireAuth,
  authorize(['work-plans:read']),
  workPlanController.listVersions,
);
router.get(
  '/work-plans/:schoolId/versions/:revision/resolution/file',
  requireAuth,
  authorize(['work-plans:read']),
  workPlanController.downloadVersionResolution,
);

export default router;
