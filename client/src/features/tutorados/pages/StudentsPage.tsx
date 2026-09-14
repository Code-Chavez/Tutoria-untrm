import React, { useEffect, useState } from 'react';
import styles from './StudentsPage.module.css';
import {
  Student,
  studentService,
  CreateStudentData,
  UpdateStudentData,
} from '../services/studentService';
import { School, schoolService } from '../services/schoolService';
import { StudentFormModal } from '../components/StudentFormModal';
import { useAuth } from '@features/auth/hooks/useAuth';
import { GraduationCapIcon, PlusIcon, PencilIcon, AlertTriangleIcon } from '@shared/components/icons';

// Roles con permiso students:write (el resto solo puede consultar).
const WRITE_ROLES = ['Coordinador', 'Administrador DBU'];

export const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const canWrite = user ? WRITE_ROLES.includes(user.role) : false;

  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // Se incrementa para forzar una recarga tras crear/editar.
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshStudents = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setSchools(await schoolService.getSchools());
      } catch (error) {
        console.error('Error fetching schools', error);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const data = await studentService.getStudents({
          search: search.trim() || undefined,
          schoolId: filterSchool || undefined,
          isActive:
            filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
        });
        if (!ignore) setStudents(data);
      } catch (error) {
        console.error('Error fetching students', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250); // pequeño debounce para la búsqueda

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search, filterSchool, filterStatus, refreshKey]);

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
    refreshStudents();
  };

  const getSchoolName = (schoolId: string) =>
    schools.find((s) => s.id === schoolId)?.name ?? 'Sin escuela';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleWrap}>
            <span className={styles.titleIcon}>
              <GraduationCapIcon size={22} />
            </span>
            <h1 className={styles.title}>Tutorados</h1>
          </div>
          <p className={styles.subtitle}>Registro y edición individual de estudiantes</p>
        </div>
        {canWrite && (
          <button className={styles.addButton} onClick={() => handleOpenModal()}>
            <PlusIcon size={15} />
            Nuevo tutorado
          </button>
        )}
      </div>

      <section className={styles.panel}>
        <div className={styles.filters}>
          <input
            className={styles.search}
            type="search"
            placeholder="Buscar por código, nombre o apellido…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
          >
            <option value="">Todas las escuelas</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.stateMsg}>Cargando tutorados…</div>
          ) : students.length === 0 ? (
            <div className={styles.stateMsg}>No se encontraron tutorados</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Estudiante</th>
                  <th>Escuela</th>
                  <th>Ciclo</th>
                  <th>Estado</th>
                  {canWrite && <th className={styles.actionsHead}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <span className={styles.code}>{student.studentCode}</span>
                    </td>
                    <td className={styles.nameCell}>
                      <span className={styles.name}>
                        {student.firstName} {student.lastName}
                      </span>
                      {student.email && <span className={styles.email}>{student.email}</span>}
                    </td>
                    <td>{getSchoolName(student.schoolId)}</td>
                    <td>
                      <span className={styles.pill}>Ciclo {student.cycle}</span>
                    </td>
                    <td>
                      {student.isAtRisk ? (
                        <span className={styles.riskBadge}>
                          <AlertTriangleIcon size={12} />
                          En riesgo
                        </span>
                      ) : (
                        <span
                          className={`${styles.statusBadge} ${student.isActive ? styles.statusActive : styles.statusInactive}`}
                        >
                          {student.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    {canWrite && (
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleOpenModal(student)}
                            title="Editar"
                            aria-label={`Editar a ${student.firstName} ${student.lastName}`}
                          >
                            <PencilIcon size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {isModalOpen && (
        <StudentFormModal
          key={studentToEdit?.id ?? 'new'}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          studentToEdit={studentToEdit}
          schools={schools}
        />
      )}
    </div>
  );
};
