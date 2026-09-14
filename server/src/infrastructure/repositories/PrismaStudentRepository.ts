import { PrismaClient, Prisma } from '@prisma/client';
import { Student } from '@domain/entities/Student';
import { StudentRepository, StudentFilters } from '@domain/repositories/StudentRepository';

export class PrismaStudentRepository implements StudentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { id } });
  }

  findByCode(studentCode: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { studentCode } });
  }

  findAll(filters?: StudentFilters): Promise<Student[]> {
    const where: Prisma.StudentWhereInput = {
      ...(filters?.schoolId && { schoolId: filters.schoolId }),
      ...(filters?.cycle !== undefined && { cycle: filters.cycle }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.isAtRisk !== undefined && { isAtRisk: filters.isAtRisk }),
      ...(filters?.search && {
        OR: [
          { studentCode: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.student.findMany({ where, orderBy: { lastName: 'asc' } });
  }

  create(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  update(id: string, data: Partial<Student>): Promise<Student> {
    return this.prisma.student.update({ where: { id }, data });
  }
}
