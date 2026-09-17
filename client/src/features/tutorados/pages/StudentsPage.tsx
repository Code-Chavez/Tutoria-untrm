import React, { useMemo, useState } from 'react';
import styles from './StudentsPage.module.css';
import {
  Student,
  studentService,
  CreateStudentData,
  UpdateStudentData,
} from '../services/studentService';
import { StudentFormModal } from '../components/StudentFormModal';
import { TutoradoFilters, StudentFilterValues } from '../components/TutoradoFilters';
import { TutoradoTable } from '../components/TutoradoTable';
import { RiskModal } from '../components/RiskModal';
import { ReassignModal } from '../components/ReassignModal';
import { InterviewFormModal } from '@features/entrevistas/components/InterviewFormModal';
import { interviewService, CreateInterviewData } from '@features/entrevistas/services/interviewService';
import { supportContactService, UpsertSupportContactData } from '@features/entrevistas/services/supportContactService';
import { useStudents } from '../hooks/useStudents';
import { useAuth } from '@features/auth/hooks/useAuth';
import { assignmentService } from '@features/asignacion/services/assignmentService';
import { getApiErrorMessage } from '@shared/services/apiClient';
import {
  PageHeader,
  StatCard,
  Button,
  EmptyState,
  TableSkeleton,
  Pagination,
  ConfirmDialog,
} from '@shared/components/ui';
import {
  GraduationCapIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  BanIcon,
  SearchIcon,
  XCircleIcon,
} from '@shared/components/icons';

// Roles con permiso students:write (el resto solo puede consultar).
const WRITE_ROLES = ['Coordinador', 'Administrador DBU'];
// Roles con permiso interviews:write (quien realiza la entrevista, Art. 15.a).
const INTERVIEW_ROLES = ['Docente Tutor', 'Administrador DBU'];
const PAGE_SIZE = 10;

const EMPTY_FILTERS: StudentFilterValues = { search: '', schoolId: '', cycle: '', status: '' };

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const canWrite = user ? WRITE_ROLES.includes(user.role) : false;
  const canConductInterview = user ? INTERVIEW_ROLES.includes(user.role) : false;

  const { students, schools, tutors, loading, error, refresh } = useStudents();

  const [filters, setFilters] = useState<StudentFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // Marcado de riesgo (HU-11).
  const [studentToMark, setStudentToMark] = useState<Student | null>(null);
  const [studentToUnmark, setStudentToUnmark] = useState<Student | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  // Reasignación individual (HU-13).
  const [studentToReassign, setStudentToReassign] = useState<Student | null>(null);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState('');

  // Entrevista inicial tutorial (HU-14).
  const [studentForInterview, setStudentForInterview] = useState<Student | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState('');

  const schoolName = (schoolId: string) =>
    schools.find((s) => s.id === schoolId)?.name ?? 'Sin escuela';

  const tutorName = (tutorId?: string | null): string | null => {
    if (!tutorId) return null;
    return tutors.find((t) => t.tutorId === tutorId)?.fullName ?? 'Asignado';
  };

  const cycles = useMemo(
    () => Array.from(new Set(students.map((s) => s.cycle))).sort((a, b) => a - b),
    [students],
  );

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return students.filter((s) => {
      if (filters.schoolId && s.schoolId !== filters.schoolId) return false;
      if (filters.cycle && String(s.cycle) !== filters.cycle) return false;
      if (filters.status === 'active' && !s.isActive) return false;
      if (filters.status === 'inactive' && s.isActive) return false;
      if (filters.status === 'risk' && !s.isAtRisk) return false;
      if (term) {
        const haystack = `${s.studentCode} ${s.firstName} ${s.lastName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [students, filters]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reinicia la página cuando cambian los filtros.
  const handleFilters = (next: StudentFilterValues) => {
    setFilters(next);
    setPage(1);
  };

  const handleOpenModal = (student?: Student) => {
    setStudentToEdit(student || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setStudentToEdit(null);
  };

  const handleSubmit = async (data: CreateStudentData | UpdateStudentData) => {
    if (studentToEdit) {
      await studentService.updateStudent(studentToEdit.id, data as UpdateStudentData);
    } else {
      await studentService.createStudent(data as CreateStudentData);
    }
    refresh();
  };

  const confirmMarkRisk = async (reason: string) => {
    if (!studentToMark) return;
    setRiskLoading(true);
    try {
      await studentService.markRisk(studentToMark.id, true, reason);
      setStudentToMark(null);
      refresh();
    } catch (err) {
      console.error('Error marking risk', err);
    } finally {
      setRiskLoading(false);
    }
  };

  const confirmUnmarkRisk = async () => {
    if (!studentToUnmark) return;
    setRiskLoading(true);
    try {
      await studentService.markRisk(studentToUnmark.id, false);
      setStudentToUnmark(null);
      refresh();
    } catch (err) {
      console.error('Error unmarking risk', err);
    } finally {
      setRiskLoading(false);
    }
  };

  const confirmReassign = async (newTutorId: string, reason: string) => {
    if (!studentToReassign) return;
    setReassignLoading(true);
    setReassignError('');
    try {
      await assignmentService.reassignStudent(studentToReassign.id, newTutorId, reason);
      setStudentToReassign(null);
      refresh();
    } catch (err) {
      setReassignError(getApiErrorMessage(err));
    } finally {
      setReassignLoading(false);
    }
  };

  const confirmInterview = async (
    data: CreateInterviewData,
    supportContact?: UpsertSupportContactData,
  ) => {
    if (!studentForInterview) return;
    setInterviewLoading(true);
    setInterviewError('');
    try {
      if (supportContact) {
        await supportContactService.upsertSupportContact(studentForInterview.id, supportContact);
      }
      await interviewService.createInterview(studentForInterview.id, data);
      setStudentForInterview(null);
    } catch (err) {
      setInterviewError(getApiErrorMessage(err));
    } finally {
      setInterviewLoading(false);
    }
  };

  const total = students.length;
  const active = students.filter((s) => s.isActive).length;
  const atRisk = students.filter((s) => s.isAtRisk).length;
  const inactive = total - active;

  return (
    <div>
      <PageHeader
        title="Tutorados"
        subtitle="Gestión de estudiantes en el programa de tutoría"
        icon={<GraduationCapIcon size={24} />}
        actions={
          canWrite && (
            <Button icon={<PlusIcon size={17} />} onClick={() => handleOpenModal()}>
              Nuevo tutorado
            </Button>
          )
        }
      />

      <div className={styles.kpis}>
        <StatCard icon={<GraduationCapIcon size={22} />} value={String(total)} label="Total de tutorados" hint="Registrados en el sistema" tone="info" loading={loading} />
        <StatCard icon={<CheckCircleIcon size={22} />} value={String(active)} label="Tutorados activos" hint="Con matrícula vigente" tone="success" loading={loading} />
        <StatCard icon={<AlertTriangleIcon size={22} />} value={String(atRisk)} label="En riesgo académico" hint="Requieren seguimiento" tone="warning" loading={loading} />
        <StatCard icon={<BanIcon size={22} />} value={String(inactive)} label="Inactivos" hint="Sin matrícula vigente" tone="neutral" loading={loading} />
      </div>

      <div className={styles.tableCard}>
        <TutoradoFilters
          values={filters}
          schools={schools}
          cycles={cycles}
          onChange={handleFilters}
          onClear={() => handleFilters(EMPTY_FILTERS)}
        />

        {loading ? (
          <TableSkeleton rows={6} columns={canWrite || canConductInterview ? 7 : 6} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<XCircleIcon size={26} />}
            title="No se pudieron cargar los tutorados"
            description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
            action={<Button variant="secondary" onClick={refresh}>Reintentar</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title={total === 0 ? 'Aún no hay tutorados registrados' : 'Sin resultados'}
            description={
              total === 0
                ? 'Registra un tutorado o utiliza la carga masiva para importarlos desde Excel.'
                : 'No se encontraron tutorados con los filtros aplicados. Prueba ajustarlos.'
            }
            action={
              total === 0 && canWrite ? (
                <Button icon={<PlusIcon size={16} />} onClick={() => handleOpenModal()}>
                  Nuevo tutorado
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <TutoradoTable
              students={pageItems}
              schoolName={schoolName}
              tutorName={tutorName}
              canWrite={canWrite}
              canConductInterview={canConductInterview}
              onEdit={handleOpenModal}
              onMarkRisk={setStudentToMark}
              onUnmarkRisk={setStudentToUnmark}
              onReassign={(student) => {
                setReassignError('');
                setStudentToReassign(student);
              }}
              onRegisterInterview={(student) => {
                setInterviewError('');
                setStudentForInterview(student);
              }}
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {isModalOpen && (
        <StudentFormModal
          key={studentToEdit?.id ?? 'new'}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          studentToEdit={studentToEdit}
          schools={schools}
        />
      )}

      {studentToMark && (
        <RiskModal
          student={studentToMark}
          loading={riskLoading}
          onConfirm={confirmMarkRisk}
          onCancel={() => setStudentToMark(null)}
        />
      )}

      {studentToReassign && (
        <ReassignModal
          student={studentToReassign}
          tutors={tutors}
          currentTutorName={tutorName(studentToReassign.tutorId)}
          loading={reassignLoading}
          serverError={reassignError}
          onConfirm={confirmReassign}
          onCancel={() => setStudentToReassign(null)}
        />
      )}

      {studentForInterview && (
        <InterviewFormModal
          key={studentForInterview.id}
          student={studentForInterview}
          schoolName={schoolName(studentForInterview.schoolId)}
          loading={interviewLoading}
          serverError={interviewError}
          onSubmit={confirmInterview}
          onCancel={() => setStudentForInterview(null)}
        />
      )}

      <ConfirmDialog
        open={studentToUnmark !== null}
        title="Quitar marca de riesgo"
        message={
          studentToUnmark
            ? `¿Confirmas quitar la marca de riesgo académico de ${studentToUnmark.firstName} ${studentToUnmark.lastName}?`
            : ''
        }
        confirmLabel="Quitar riesgo"
        loading={riskLoading}
        onConfirm={confirmUnmarkRisk}
        onCancel={() => setStudentToUnmark(null)}
      />
    </div>
  );
};
