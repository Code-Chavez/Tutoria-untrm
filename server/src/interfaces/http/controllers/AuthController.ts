import { type Request, type Response, type NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  LoginUseCase,
  InvalidCredentialsError,
  AccountLockedError,
  AccountInactiveError,
} from '@application/use-cases/auth/LoginUseCase';
import { RequestPasswordResetUseCase } from '@application/use-cases/auth/RequestPasswordResetUseCase';
import { ResetPasswordUseCase, InvalidTokenError } from '@application/use-cases/auth/ResetPasswordUseCase';
import { AppError } from '@infrastructure/middleware/errorHandler';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validators';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = loginSchema.parse(req.body);

      const result = await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
        ipAddress: req.ip,
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(this.mapError(err));
    }
  };

  requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      
      await this.requestPasswordResetUseCase.execute(body.email);

      // Siempre devolvemos éxito para evitar enumeración de usuarios
      res.status(200).json({ 
        status: 'success', 
        message: 'Si el correo existe, se han enviado las instrucciones.' 
      });
    } catch (err) {
      next(this.mapError(err));
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = resetPasswordSchema.parse(req.body);

      await this.resetPasswordUseCase.execute({
        token: body.token,
        newPassword: body.newPassword,
      });

      res.status(200).json({ 
        status: 'success', 
        message: 'Contraseña actualizada correctamente.' 
      });
    } catch (err) {
      next(this.mapError(err));
    }
  };

  private mapError(err: unknown): Error {
    if (err instanceof ZodError) {
      return new AppError(400, err.errors[0]?.message ?? 'Datos inválidos');
    }
    if (err instanceof InvalidCredentialsError) {
      return new AppError(401, err.message);
    }
    if (err instanceof AccountLockedError) {
      return new AppError(423, err.message);
    }
    if (err instanceof AccountInactiveError) {
      return new AppError(403, err.message);
    }
    if (err instanceof InvalidTokenError) {
      return new AppError(400, err.message);
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
