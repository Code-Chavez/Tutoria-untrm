export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  /** Rol base (sembrado): protegido. Ausente = no base. */
  isBase?: boolean;
  /** Ausente = activo. Un rol inactivo no concede permisos ni se asigna. */
  isActive?: boolean;
  /** Cuentas con este rol (solo en listados). */
  userCount?: number;
}

export interface Permission {
  id: string;
  code: string;
  description: string;
}
