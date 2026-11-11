export interface Faculty {
  id: string;
  name: string;
  isActive: boolean;
  requestEmail?: string | null;
  createdAt: Date;
}
