export interface School {
  id: string;
  name: string;
  facultyId: string;
  isActive: boolean;
  coordinatorId?: string | null;
  createdAt: Date;
}
