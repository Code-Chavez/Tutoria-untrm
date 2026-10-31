/** El alcance limita datos; nunca concede por sí mismo permisos para operar sobre ellos. */
export interface UserAccessPolicy {
  userId: string;
  roleId: string;
  kind: 'NONE' | 'OWN' | 'SCHOOLS' | 'FACULTIES' | 'INSTITUTION' | 'SERVICE';
  schoolIds: string[];
  facultyIds: string[];
  service: string | null;
  revision: number;
}
