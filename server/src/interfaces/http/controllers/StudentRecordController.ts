import { Request, Response } from 'express';
import { GetStudentRecordUseCase } from '@application/use-cases/student-record/GetStudentRecordUseCase';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';

export class StudentRecordController {
  constructor(private readonly getStudentRecordUseCase: GetStudentRecordUseCase) {}

  get = async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id as string;
      const includeSupportContact = Boolean(req.permissions?.includes('support-contacts:read'));
      const record = await this.getStudentRecordUseCase.execute(studentId, includeSupportContact);
      res.status(200).json({ record });
    } catch (error) {
      if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
  };
}
