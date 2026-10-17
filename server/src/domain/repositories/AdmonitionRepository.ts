export interface Admonition {
  id: string;
  tutorId: string;
  issuedById: string;
  schoolId: string;
  facultyId: string;
  issuedOn: Date;
  reason: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  storageKey?: string | null;
  sha256?: string | null;
  createdAt: Date;
}

export type NewAdmonition = Omit<Admonition, 'id' | 'createdAt'>;

export interface AdmonitionFilters {
  facultyId?: string;
  schoolIds?: string[];
  tutorId?: string;
}

export interface AdmonitionRepository {
  create(data: NewAdmonition): Promise<Admonition>;
  findById(id: string): Promise<Admonition | null>;
  list(filters?: AdmonitionFilters): Promise<Admonition[]>;
}
