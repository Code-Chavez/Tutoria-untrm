import { Router, type IRouter } from 'express';
import multer from 'multer';
import { requireFileSignature } from '../middleware/fileSignature';
import { ProfileController } from '../controllers/ProfileController';
import { authenticate } from '../middleware/authenticate';
import { container } from '@infrastructure/container';

const controller = new ProfileController(
  container.useCases.getProfileUseCase,
  container.useCases.updateProfileUseCase,
  container.useCases.changePasswordUseCase,
  container.useCases.uploadProfilePhotoUseCase,
  container.useCases.removeProfilePhotoUseCase,
  container.useCases.getProfilePhotoFileUseCase,
);

// La foto se recibe en memoria (máx. 1 MB); el caso de uso valida el tipo y la ruta, su contenido real.
const uploadPhoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1 } });

const router: IRouter = Router();

// Todo el perfil opera sobre el usuario autenticado (req.auth.sub).
router.use('/profile', authenticate(container.services.tokenService));

router.get('/profile', controller.get);
router.put('/profile', controller.update);
router.get('/profile/photo', controller.photo);
router.put('/profile/photo', uploadPhoto.single('file'), requireFileSignature(['png', 'jpeg', 'webp']), controller.uploadPhoto);
router.delete('/profile/photo', controller.removePhoto);
router.post('/profile/change-password', controller.changePassword);

export default router;
