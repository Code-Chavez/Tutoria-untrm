import React from 'react';
import { Badge, IconButton } from '@shared/components/ui';
import { PencilIcon, AlertTriangleIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import table from '@shared/components/ui/DataTable.module.css';

interface TutoradoTableProps {
  students: Student[];
  schoolName: (schoolId: string) => string;
  canWrite: boolean;
  onEdit: (student: Student) => void;
}

export const TutoradoTable: React.FC<TutoradoTableProps> = ({
  students,
  schoolName,
  canWrite,
  onEdit,
}) => (
  <div className={table.scroll}>
    <table className={table.table}>
      <thead>
        <tr>
          <th>Código</th>
          <th>Estudiante</th>
          <th>Escuela profesional</th>
          <th>Ciclo</th>
          <th>Estado</th>
          {canWrite && <th className={table.right}>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
            <td>
              <span className={table.primary}>{student.studentCode}</span>
            </td>
            <td>
              <div className={table.stack}>
                <span className={table.name}>
                  {student.firstName} {student.lastName}
                </span>
                {student.email && <span className={table.sub}>{student.email}</span>}
              </div>
            </td>
            <td>{schoolName(student.schoolId)}</td>
            <td>
              <Badge tone="info">Ciclo {student.cycle}</Badge>
            </td>
            <td>
              {student.isAtRisk ? (
                <Badge tone="danger" icon={<AlertTriangleIcon size={12} />}>
                  En riesgo
                </Badge>
              ) : student.isActive ? (
                <Badge tone="success">Activo</Badge>
              ) : (
                <Badge tone="neutral">Inactivo</Badge>
              )}
            </td>
            {canWrite && (
              <td>
                <div className={table.actions}>
                  <IconButton
                    label="Editar tutorado"
                    onClick={() => onEdit(student)}
                  >
                    <PencilIcon size={16} />
                  </IconButton>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
