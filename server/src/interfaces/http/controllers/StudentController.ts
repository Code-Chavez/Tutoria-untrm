import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateStudentUseCase } from '@application/use-cases/students/CreateStudentUseCase';
import { UpdateStudentUseCase } from '@application/use-cases/students/UpdateStudentUseCase';
import { ListStudentsUseCase } from '@application/use-cases/students/ListStudentsUseCase';
import { StudentFilters } from '@domain/repositories/StudentRepository';
import {
  DuplicateStudentCodeError,
  StudentNotFoundError,
  SchoolNotFoundError,
} from '@application/use-cases/students/StudentErrors';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validators';
import { CreateStudentInput, UpdateStudentInput } from '@application/dtos/student.dto';

// Normaliza los campos opcionales que llegan como cadena vacía a null/undefined.
function cleanOptional(value?: string): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export class StudentController {
  constructor(
    private readonly createStudentUseCase: CreateStudentUseCase,
    private readonly updateStudentUseCase: UpdateStudentUseCase,
    private readonly listStudentsUseCase: ListStudentsUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    try {
      const { schoolId, cycle, isActive, isAtRisk, search } = req.query;
      const filters: StudentFilters = {};

      if (typeof schoolId === 'string') filters.schoolId = schoolId;
      if (typeof search === 'string' && search.trim() !== '') filters.search = search.trim();
      if (typeof cycle === 'string' && cycle !== '') {
        const parsed = Number(cycle);
        if (!Number.isNaN(parsed)) filters.cycle = parsed;
      }
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isAtRisk !== undefined) filters.isAtRisk = isAtRisk === 'true';

      const students = await this.listStudentsUseCase.execute(filters);
      res.status(200).json({ students });
    } catch {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const body = createStudentSchema.parse(req.body);
      const input: CreateStudentInput = {
        studentCode: body.studentCode,
        firstName: body.firstName,
        lastName: body.lastName,
        email: cleanOptional(body.email),
        phone: cleanOptional(body.phone),
        cycle: body.cycle,
        schoolId: body.schoolId,
      };
      const student = await this.createStudentUseCase.execute(input);
      res.status(201).json({ message: 'Estudiante registrado exitosamente', student });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const body = updateStudentSchema.parse(req.body);
      const input: UpdateStudentInput = {
        ...(body.studentCode !== undefined && { studentCode: body.studentCode }),
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.email !== undefined && { email: cleanOptional(body.email) }),
        ...(body.phone !== undefined && { phone: cleanOptional(body.phone) }),
        ...(body.cycle !== undefined && { cycle: body.cycle }),
        ...(body.schoolId !== undefined && { schoolId: body.schoolId }),
      };
      const student = await this.updateStudentUseCase.execute(id, input);
      res.status(200).json({ message: 'Estudiante actualizado exitosamente', student });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos de entrada inválidos', details: error.errors });
    } else if (error instanceof DuplicateStudentCodeError) {
      res.status(409).json({ error: error.message });
    } else if (error instanceof SchoolNotFoundError || error instanceof StudentNotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
