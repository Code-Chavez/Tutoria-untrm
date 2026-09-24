// Persona de red de apoyo (Anexo N° 3, sección II, HU-15). Un contacto por
// estudiante; registrarlo de nuevo actualiza el existente.
export interface SupportContact {
  id: string;
  studentId: string;
  fullName: string;
  relationship: string;
  age?: number | null;
  occupation?: string | null;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}
