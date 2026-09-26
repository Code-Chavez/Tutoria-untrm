import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateReferralUseCase } from '@application/use-cases/referrals/CreateReferralUseCase';
import { GetReferralConstanciaUseCase } from '@application/use-cases/referrals/GetReferralConstanciaUseCase';
import { GetReferralsUseCase } from '@application/use-cases/referrals/GetReferralsUseCase';
import { GetReferralByIdUseCase } from '@application/use-cases/referrals/GetReferralByIdUseCase';
import { UpdateReferralStatusUseCase } from '@application/use-cases/referrals/UpdateReferralStatusUseCase';
import { ReferralConstanciaPdf } from '@infrastructure/parsers/ReferralConstanciaPdf';
import { ReferralNotFoundError } from '@application/use-cases/referrals/ReferralErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { createReferralSchema } from '../validators/referral.validators';

export class ReferralController {
  constructor(
    private readonly createReferralUseCase: CreateReferralUseCase,
    private readonly getReferralConstanciaUseCase: GetReferralConstanciaUseCase,
    private readonly getReferralsUseCase: GetReferralsUseCase,
    private readonly getReferralByIdUseCase: GetReferralByIdUseCase,
    private readonly updateReferralStatusUseCase: UpdateReferralStatusUseCase,
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
  // Obtiene las derivaciones según el rol (HU-30)
  getAll = async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.sub as string;
      const referrals = await this.getReferralsUseCase.execute(userId);
      res.status(200).json(referrals);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  };

  // Obtiene una derivación por ID validando visibilidad (HU-30)
  getById = async (req: Request, res: Response) => {
    try {
      const referralId = req.params.id as string;
      const userId = req.auth?.sub as string;
      const referral = await this.getReferralByIdUseCase.execute(referralId, userId);
      res.status(200).json(referral);
    } catch (error: any) {
      if (error instanceof ReferralNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'No autorizado para ver esta derivación') {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
      }
    }
  };

  // Actualiza el estado de una derivación (HU-31)
  updateStatus = async (req: Request, res: Response) => {
    try {
      const referralId = req.params.id as string;
      const userId = req.auth?.sub as string;
      const { status, notes } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // TODO: Aquí podría agregarse validación de que el usuario tenga rol de profesional de servicio
      // o que pertenezca al servicio destino de la derivación.

      const referral = await this.updateReferralStatusUseCase.execute(referralId, status, userId, notes);
      res.status(200).json({ message: 'Estado actualizado exitosamente', referral });
    } catch (error: any) {
      if (error.message === 'Referral not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Cannot update a closed referral') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
      }
    }
  };
}
