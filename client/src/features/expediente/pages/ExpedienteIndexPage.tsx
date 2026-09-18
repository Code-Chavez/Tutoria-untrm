import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudents } from '@features/tutorados/hooks/useStudents';
import { PageHeader, Card, SearchField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { FolderIcon, SearchIcon, ChevronRightIcon } from '@shared/components/icons';
import table from '@shared/components/ui/DataTable.module.css';
import styles from './ExpedienteIndexPage.module.css';

export const ExpedienteIndexPage: React.FC = () => {
  const { students, schools, loading } = useStudents();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const schoolName = (schoolId: string) =>
    schools.find((s) => s.id === schoolId)?.name ?? 'Sin escuela';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      `${s.studentCode} ${s.firstName} ${s.lastName}`.toLowerCase().includes(term),
    );
  }, [students, search]);

  return (
    <div>
      <PageHeader
        title="Expediente del tutorado"
        subtitle="Busca a un estudiante para ver su línea de tiempo de acompañamiento"
        icon={<FolderIcon size={24} />}
      />

      <Card>
        <div className={styles.search}>
          <SearchField
            placeholder="Buscar por código, nombre o apellido…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar tutorado"
            autoFocus
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} columns={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title="Sin resultados"
            description="No se encontró ningún tutorado con ese criterio."
          />
        ) : (
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Estudiante</th>
                  <th>Escuela profesional</th>
                  <th className={table.right}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((student) => (
                  <tr
                    key={student.id}
                    className={styles.row}
                    onClick={() => navigate(`/expediente/${student.id}`)}
                  >
                    <td>
                      <span className={table.primary}>{student.studentCode}</span>
                    </td>
                    <td className={table.name}>
                      {student.firstName} {student.lastName}
                    </td>
                    <td>{schoolName(student.schoolId)}</td>
                    <td className={table.right}>
                      <ChevronRightIcon size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
