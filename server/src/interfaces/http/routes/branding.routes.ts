import { Router, type IRouter } from 'express';
import multer from 'multer';
import { container } from '../../../infrastructure/container';
import { BrandingController } from '../controllers/BrandingController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const controller = new BrandingController(
  container.useCases.getBrandingUseCase,
  container.useCases.updateBrandingUseCase,
  container.useCases.uploadBrandingLogoUseCase,
  container.useCases.removeBrandingLogoUseCase,
  container.useCases.resetBrandingUseCase,
  container.useCases.getBrandingLogoFileUseCase,
);

// El logotipo se recibe en memoria (máx. 1 MB); el caso de uso valida tipo y firma.
const uploadLogo = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1 } });

const requireAuth = authenticate(container.services.tokenService);
const canManage = authorize(['branding:manage']);

// Identidad visual (HU-50): la lectura es pública (login); los cambios requieren branding:manage.
router.get('/branding', controller.get);
router.get('/branding/logo', controller.logo);
router.put('/branding', requireAuth, canManage, controller.update);
router.post('/branding/logo', requireAuth, canManage, uploadLogo.single('file'), controller.uploadLogo);
router.delete('/branding/logo', requireAuth, canManage, controller.removeLogo);
router.post('/branding/reset', requireAuth, canManage, controller.reset);

export default router;
