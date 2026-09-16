import React from 'react';
import { Badge, IconButton } from '@shared/components/ui';
import { PencilIcon, AlertTriangleIcon, CheckCircleIcon, SwitchIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import table from '@shared/components/ui/DataTable.module.css';

interface TutoradoTableProps {
  students: Student[];
  schoolName: (schoolId: string) => string;
  tutorName: (tutorId?: string | null) => string | null;
  canWrite: boolean;
  onEdit: (student: Student) => void;
  onMarkRisk: (student: Student) => void;
  onUnmarkRisk: (student: Student) => void;
  onReassign: (student: Student) => void;
}

export const TutoradoTable: React.FC<TutoradoTableProps> = ({
  students,
  schoolName,
  tutorName,
  canWrite,
  onEdit,
  onMarkRisk,
  onUnmarkRisk,
  onReassign,
}) => (
  <div className={table.scroll}>
    <table className={table.table}>
      <thead>
        <tr>
          <th>Código</th>
          <th>Estudiante</th>
          <th>Escuela profesional</th>
          <th>Ciclo</th>
          <th>Tutor</th>
          <th>Estado</th>
          {canWrite && <th className={table.right}>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {students.map((student) => {
          const currentTutor = tutorName(student.tutorId);
          return (
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
                {currentTutor ? (
                  <span className={table.sub}>{currentTutor}</span>
                ) : (
                  <Badge tone="warning">Sin asignar</Badge>
                )}
              </td>
              <td>
                {student.isAtRisk ? (
                  <span title={student.riskReason ?? undefined}>
                    <Badge tone="danger" icon={<AlertTriangleIcon size={12} />}>
                      En riesgo
                    </Badge>
                  </span>
                ) : student.isActive ? (
                  <Badge tone="success">Activo</Badge>
                ) : (
                  <Badge tone="neutral">Inactivo</Badge>
                )}
              </td>
              {canWrite && (
                <td>
                  <div className={table.actions}>
                    {student.tutorId && (
                      <IconButton label="Reasignar tutor" onClick={() => onReassign(student)}>
                        <SwitchIcon size={16} />
                      </IconButton>
                    )}
                    {student.isAtRisk ? (
                      <IconButton
                        label="Quitar riesgo"
                        tone="success"
                        onClick={() => onUnmarkRisk(student)}
                      >
                        <CheckCircleIcon size={16} />
                      </IconButton>
                    ) : (
                      <IconButton
                        label="Marcar en riesgo"
                        tone="danger"
                        onClick={() => onMarkRisk(student)}
                      >
                        <AlertTriangleIcon size={16} />
                      </IconButton>
                    )}
                    <IconButton label="Editar tutorado" onClick={() => onEdit(student)}>
                      <PencilIcon size={16} />
                    </IconButton>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
