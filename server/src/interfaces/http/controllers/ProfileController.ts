import { type Request, type Response, type NextFunction } from 'express';
import { ZodError } from 'zod';
import { GetProfileUseCase } from '@application/use-cases/profile/GetProfileUseCase';
import { UpdateProfileUseCase } from '@application/use-cases/profile/UpdateProfileUseCase';
import { ChangePasswordUseCase } from '@application/use-cases/profile/ChangePasswordUseCase';
import {
  ProfileUserNotFoundError,
  IncorrectCurrentPasswordError,
  SamePasswordError,
} from '@application/use-cases/profile/ProfileErrors';
import { AppError } from '@infrastructure/middleware/errorHandler';
import {
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/profile.validators';

export class ProfileController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getProfileUseCase.execute(this.userId(req));
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(this.mapError(err));
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = updateProfileSchema.parse(req.body);
      const result = await this.updateProfileUseCase.execute(this.userId(req), {
        // Un campo vacío se interpreta como "borrar el dato".
        phone: body.phone === '' ? null : body.phone,
        photoUrl: body.photoUrl === '' ? null : body.photoUrl,
      });
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(this.mapError(err));
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = changePasswordSchema.parse(req.body);
      await this.changePasswordUseCase.execute({
        userId: this.userId(req),
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      res.status(200).json({ status: 'success' });
    } catch (err) {
      next(this.mapError(err));
    }
  };

  private userId(req: Request): string {
    // authenticate() garantiza req.auth; este guard es defensivo.
    if (!req.auth) {
      throw new AppError(401, 'No autenticado');
    }
    return req.auth.sub;
  }

  private mapError(err: unknown): Error {
    if (err instanceof ZodError) {
      return new AppError(400, err.errors[0]?.message ?? 'Datos inválidos');
    }
    if (err instanceof ProfileUserNotFoundError) {
      return new AppError(404, err.message);
    }
    // 400 (no 401): un 401 dispararía el cierre de sesión en el cliente.
    if (err instanceof IncorrectCurrentPasswordError || err instanceof SamePasswordError) {
      return new AppError(400, err.message);
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
