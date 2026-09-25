import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateReferralUseCase } from '@application/use-cases/referrals/CreateReferralUseCase';
import { GetReferralConstanciaUseCase } from '@application/use-cases/referrals/GetReferralConstanciaUseCase';
import { ReferralConstanciaPdf } from '@infrastructure/parsers/ReferralConstanciaPdf';
import { ReferralNotFoundError } from '@application/use-cases/referrals/ReferralErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { createReferralSchema } from '../validators/referral.validators';

export class ReferralController {
  constructor(
    private readonly createReferralUseCase: CreateReferralUseCase,
    private readonly getReferralConstanciaUseCase: GetReferralConstanciaUseCase,
    private readonly constanciaPdf: ReferralConstanciaPdf,
  ) {}

  // Registra la ficha de derivación de un tutorado (HU-28, Anexo N°6).
  create = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const data = createReferralSchema.parse(req.body);
      const referredById = req.auth?.sub as string;
      const referral = await this.createReferralUseCase.execute(studentId, referredById, data);
      res.status(201).json({ message: 'Derivación registrada exitosamente', referral });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
      } else if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };

  // Descarga la constancia de derivación en PDF (HU-28).
  downloadConstancia = async (req: Request, res: Response) => {
    try {
      const referralId = req.params.id as string;
      const data = await this.getReferralConstanciaUseCase.execute(referralId);
      const buffer = await this.constanciaPdf.build(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="constancia-derivacion.pdf"');
      res.status(200).send(buffer);
    } catch (error) {
      if (error instanceof ReferralNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
