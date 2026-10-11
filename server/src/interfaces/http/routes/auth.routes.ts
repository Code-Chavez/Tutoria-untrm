import { Router, type IRouter } from 'express';
import { AuthController } from '../controllers/AuthController';
import { container } from '@infrastructure/container';
import { rateLimit } from '../middleware/rateLimit';

const controller = new AuthController(
  container.useCases.loginUseCase,
  container.useCases.requestPasswordResetUseCase,
  container.useCases.resetPasswordUseCase,
  container.useCases.refreshSessionUseCase,
  container.useCases.logoutUseCase,
);

const router: IRouter = Router();

// Inicio de sesión: además del bloqueo por cuenta, un tope por IP frena la prueba masiva de contraseñas
// y el bloqueo deliberado de cuentas ajenas con intentos fallidos. Holgado para uso normal (una oficina tras un mismo NAT).
const loginLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 100,
  message: 'Demasiados intentos de inicio de sesión desde esta red. Espera unos minutos e inténtalo de nuevo.',
});
router.post('/auth/login', loginLimiter, controller.login);
router.post('/auth/refresh', controller.refresh);
router.post('/auth/logout', controller.logout);
// Recuperación de contraseña (A09): se limita por IP para que no sirva de disparador de correos ni de sondeo de enlaces.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Demasiadas solicitudes de recuperación. Espera unos minutos e inténtalo de nuevo.',
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
});
router.post('/auth/forgot-password', forgotLimiter, controller.requestPasswordReset);
router.post('/auth/reset-password', resetLimiter, controller.resetPassword);

export default router;
