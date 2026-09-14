export interface CreateStudentInput {
  studentCode: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  cycle: number;
  schoolId: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;
