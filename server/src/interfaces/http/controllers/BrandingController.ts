import { Request, Response } from 'express';
import { z } from 'zod';
import {
  BrandingLogoNotFoundError,
  BrandingValidationError,
  GetBrandingLogoFileUseCase,
  GetBrandingUseCase,
  RemoveBrandingLogoUseCase,
  ResetBrandingUseCase,
  UpdateBrandingUseCase,
  UploadBrandingLogoUseCase,
} from '@application/use-cases/branding/BrandingUseCases';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Usa el formato #RRGGBB');

const updateSchema = z.object({
  institutionName: z.string().trim().min(3, 'Indica el nombre de la institución').max(150),
  shortName: z.string().trim().min(2, 'Indica el nombre corto').max(30),
  primaryColor: hex,
  accentColor: hex,
});

export class BrandingController {
  constructor(
    private readonly getBrandingUseCase: GetBrandingUseCase,
    private readonly updateBrandingUseCase: UpdateBrandingUseCase,
    private readonly uploadBrandingLogoUseCase: UploadBrandingLogoUseCase,
    private readonly removeBrandingLogoUseCase: RemoveBrandingLogoUseCase,
    private readonly resetBrandingUseCase: ResetBrandingUseCase,
    private readonly getBrandingLogoFileUseCase: GetBrandingLogoFileUseCase,
  ) {}

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof BrandingValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof BrandingLogoNotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Identidad visual institucional (HU-50). La lectura es pública: la necesita la pantalla de login.
  get = async (_req: Request, res: Response) => {
    try {
      res.status(200).json({ branding: await this.getBrandingUseCase.execute() });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  logo = async (_req: Request, res: Response) => {
    try {
      const { absolutePath, mimeType } = await this.getBrandingLogoFileUseCase.execute();
      // El cliente puede servirse desde otro origen que la API; helmet bloquearía la imagen.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.sendFile(absolutePath);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const input = updateSchema.parse(req.body);
      res.status(200).json({ message: 'Identidad visual actualizada', branding: await this.updateBrandingUseCase.execute(req.auth?.sub as string, input) });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  uploadLogo = async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Debe adjuntar una imagen PNG, JPEG o WebP en el campo «file»' });
        return;
      }
      const branding = await this.uploadBrandingLogoUseCase.execute(req.auth?.sub as string, {
        buffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
      });
      res.status(200).json({ message: 'Logotipo actualizado', branding });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  removeLogo = async (req: Request, res: Response) => {
    try {
      await this.removeBrandingLogoUseCase.execute(req.auth?.sub as string);
      res.status(200).json({ message: 'Logotipo restablecido', branding: await this.getBrandingUseCase.execute() });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  reset = async (req: Request, res: Response) => {
    try {
      res.status(200).json({ message: 'Identidad visual restablecida', branding: await this.resetBrandingUseCase.execute(req.auth?.sub as string) });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
