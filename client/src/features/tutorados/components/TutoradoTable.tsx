import React from 'react';
import { ActionMenu, Badge, Button, IconButton, type ActionMenuItem } from '@shared/components/ui';
import {
  PencilIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SwitchIcon,
  ClipboardIcon,
  FolderIcon,
  SendIcon,
  CalendarIcon,
  LinkIcon,
  ActivityIcon,
} from '@shared/components/icons';
import { Student } from '../services/studentService';
import table from '@shared/components/ui/DataTable.module.css';

interface TutoradoTableProps {
  students: Student[];
  schoolName: (schoolId: string) => string;
  tutorName: (tutorId?: string | null) => string | null;
  canWrite: boolean;
  canConductInterview: boolean;
  /** Modo «elegir tutorado» (accesos del menú): muestra este botón por fila y lo dirige a onPick. */
  pickLabel?: string;
  onPick?: (student: Student) => void;
  onEdit: (student: Student) => void;
  onMarkRisk: (student: Student) => void;
  onUnmarkRisk: (student: Student) => void;
  onReassign: (student: Student) => void;
  onRegisterInterview: (student: Student) => void;
  onViewRecord: (student: Student) => void;
  onRequestTutoring: (student: Student) => void;
  onScheduleSession: (student: Student) => void;
  onLinkAccount: (student: Student) => void;
  onRegisterFollowUp: (student: Student) => void;
  onDeriveCase: (student: Student) => void;
}

export const TutoradoTable: React.FC<TutoradoTableProps> = ({
  students,
  schoolName,
  tutorName,
  canWrite,
  canConductInterview,
  pickLabel,
  onPick,
  onEdit,
  onMarkRisk,
  onUnmarkRisk,
  onReassign,
  onRegisterInterview,
  onViewRecord,
  onRequestTutoring,
  onScheduleSession,
  onLinkAccount,
  onRegisterFollowUp,
  onDeriveCase,
}) => {
  // El expediente solo requiere students:read, así que se muestra a
  // cualquier rol que pueda ver esta tabla.
  const showActions = true;

  // sessions:write, followups:write, interviews:write y referrals:write son del tutor (y la DBU);
  // reasignar, vincular cuenta, riesgo y editar son de coordinación y DBU (students:write).
  const menuItems = (student: Student): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      { group: 'Acompañamiento', label: 'Solicitar tutoría', icon: <SendIcon size={16} />, onSelect: () => onRequestTutoring(student) },
    ];
    if (canConductInterview) {
      items.push(
        { group: 'Acompañamiento', label: 'Registrar entrevista inicial', icon: <ClipboardIcon size={16} />, onSelect: () => onRegisterInterview(student) },
        { group: 'Acompañamiento', label: 'Registrar seguimiento', icon: <ActivityIcon size={16} />, onSelect: () => onRegisterFollowUp(student) },
        { group: 'Acompañamiento', label: 'Derivar caso', icon: <SendIcon size={16} />, onSelect: () => onDeriveCase(student) },
      );
    }
    if (canWrite) {
      // El tutor ya tiene «Programar sesión» a la vista; quien edita (coordinación/DBU) puede ser también tutor.
      if (canConductInterview) {
        items.push({ group: 'Gestión', label: 'Editar tutorado', icon: <PencilIcon size={16} />, onSelect: () => onEdit(student) });
      }
      if (student.tutorId) {
        items.push({ group: 'Gestión', label: 'Reasignar tutor', icon: <SwitchIcon size={16} />, onSelect: () => onReassign(student) });
      }
      items.push({
        group: 'Gestión',
        label: student.userId ? 'Cambiar cuenta de portal' : 'Vincular cuenta',
        icon: <LinkIcon size={16} />,
        onSelect: () => onLinkAccount(student),
      });
      items.push(
        student.isAtRisk
          ? { group: 'Gestión', label: 'Quitar riesgo', tone: 'success', icon: <CheckCircleIcon size={16} />, onSelect: () => onUnmarkRisk(student) }
          : { group: 'Gestión', label: 'Marcar en riesgo', tone: 'danger', icon: <AlertTriangleIcon size={16} />, onSelect: () => onMarkRisk(student) },
      );
    }
    return items;
  };

  return (
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
            {showActions && <th className={table.right}>Acciones</th>}
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
                {showActions && (
                  <td>
                    <div className={table.actions}>
                      {onPick && pickLabel && (
                        <Button size="sm" onClick={() => onPick(student)} aria-label={`${pickLabel}: ${student.firstName} ${student.lastName}`}>
                          {pickLabel}
                        </Button>
                      )}
                      {/* Las dos acciones más frecuentes quedan a la vista; el resto, con etiqueta, en «Más». */}
                      <IconButton label="Ver expediente" onClick={() => onViewRecord(student)}>
                        <FolderIcon size={16} />
                      </IconButton>
                      {canConductInterview ? (
                        <IconButton label="Programar sesión" onClick={() => onScheduleSession(student)}>
                          <CalendarIcon size={16} />
                        </IconButton>
                      ) : (
                        canWrite && (
                          <IconButton label="Editar tutorado" onClick={() => onEdit(student)}>
                            <PencilIcon size={16} />
                          </IconButton>
                        )
                      )}
                      <ActionMenu
                        label={`Más acciones de ${student.firstName} ${student.lastName}`}
                        items={menuItems(student)}
                      />
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
};
