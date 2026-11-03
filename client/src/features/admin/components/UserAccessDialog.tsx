import { useMemo, useState } from 'react';
import { Button } from '@shared/components/ui';
import { CloseIcon } from '@shared/components/icons';
import { useDialog } from '@shared/hooks/useDialog';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { roleDisplayName } from '@shared/utils/roleLabel';
import { useAuth } from '@features/auth/hooks/useAuth';
import type { School } from '@features/tutorados/services/schoolService';
import { REFERRAL_SERVICE_LABEL, type ReferralService } from '@features/derivaciones/services/referralService';
import { useSetUserAccess, useUserAccess } from '../hooks/useUserAccess';
import { groupPermissions } from '../permissionGroups';
import type { Role } from '../services/roleService';
import type { AccessKind, User, UserAccess } from '../services/userService';
import { describeScope, type ScopeDraft } from '../accessScope';
import styles from './UserAccessDialog.module.css';

const KIND_LABELS: Record<AccessKind, string> = {
  NONE: 'Ninguno: no ve datos de tutorados',
  OWN: 'Solo sus propios tutorados',
  SCHOOLS: 'Tutorados de escuelas elegidas',
  FACULTIES: 'Tutorados de facultades elegidas',
  INSTITUTION: 'Toda la institución',
  SERVICE: 'Derivaciones de un servicio',
};

const SERVICES = Object.keys(REFERRAL_SERVICE_LABEL) as ReferralService[];
const ADMIN_ROLE = 'Administrador DBU';
const STUDENT_ROLE = 'Tutorado';

interface Props {
  user: User;
  role: Role | undefined;
  schools: School[];
  faculties: { id: string; name: string }[];
  onClose: () => void;
}

type Draft = ScopeDraft;

const toggled = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

const initialDraft = (access: UserAccess): Draft => ({
  kind: access.policy?.kind ?? 'NONE',
  schoolIds: access.policy?.schoolIds ?? [],
  facultyIds: access.policy?.facultyIds ?? [],
  service: access.policy?.service ?? '',
});

function AccessForm({ user, role, schools, faculties, access, onClose }: Props & { access: UserAccess }) {
  const { user: me } = useAuth();
  const save = useSetUserAccess(user.id);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(access));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  // Sin alcance configurado, lo que muestra el selector no es lo vigente (rige el comportamiento del rol): hasta que se toque, no hay nada que guardar.
  const [touched, setTouched] = useState(access.source !== 'DEFAULT');
  const change = (next: Draft) => {
    setTouched(true);
    setDraft(next);
  };

  const groups = useMemo(() => groupPermissions(role?.permissions ?? []), [role]);
  const isSelf = me?.id === user.id;
  const isAdminRole = access.role.name === ADMIN_ROLE;
  const editable = access.configurable && !isSelf && !isAdminRole;
  const complete = draft.kind === 'SCHOOLS' ? draft.schoolIds.length > 0 : draft.kind === 'FACULTIES' ? draft.facultyIds.length > 0 : draft.kind === 'SERVICE' ? draft.service !== '' : true;

  const reason = isSelf
    ? 'No puede cambiar su propio alcance: pídalo a otra persona con administración.'
    : access.role.name === STUDENT_ROLE
      ? 'El alcance del estudiante no se amplía: solo ve lo suyo desde su portal.'
      : isAdminRole
        ? 'La administración del sistema conserva el alcance de toda la institución.'
        : '';

  const submit = async () => {
    setError('');
    setSaved(false);
    try {
      await save.mutateAsync({
        kind: draft.kind,
        schoolIds: draft.kind === 'SCHOOLS' ? draft.schoolIds : undefined,
        facultyIds: draft.kind === 'FACULTIES' ? draft.facultyIds : undefined,
        service: draft.kind === 'SERVICE' ? draft.service : undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className={styles.body}>
      <section aria-labelledby="access-can">
        <h3 id="access-can">Qué puede hacer</h3>
        <p className={styles.muted}>
          Rol: <strong>{roleDisplayName(access.role.name)}</strong>. Los permisos los da el rol y se editan en «Roles y permisos».
        </p>
        {groups.length === 0 ? (
          <p className={styles.muted}>Este rol no tiene permisos.</p>
        ) : (
          <ul className={styles.perms}>
            {groups.map((group) => (
              <li key={group.key}>
                <strong>{group.title}:</strong> {group.items.map((p) => p.description).join(' · ')}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="access-scope">
        <h3 id="access-scope">Hasta dónde llega</h3>
        {access.source === 'DEFAULT' && <p className={styles.muted}>Sin alcance definido: rige el comportamiento por defecto de su rol. Al guardar uno, este pasa a valer.</p>}
        {access.source === 'STORED' && access.policy?.kind === 'NONE' && editable && (
          <p className={styles.warning}>Tiene alcance «ninguno» (por ejemplo, tras cambiar de rol): no verá datos de tutorados hasta que lo defina.</p>
        )}
        {reason && <p className={styles.muted}>{reason}</p>}

        <label htmlFor="access-kind">Alcance</label>
        <select id="access-kind" className={styles.select} value={draft.kind} disabled={!editable} onChange={(e) => change({ ...draft, kind: e.target.value as AccessKind })}>
          {(Object.keys(KIND_LABELS) as AccessKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>

        {draft.kind === 'SCHOOLS' && (
          <fieldset className={styles.choices} disabled={!editable}>
            <legend>Escuelas</legend>
            {schools.map((school) => (
              <label key={school.id}>
                <input type="checkbox" checked={draft.schoolIds.includes(school.id)} onChange={() => change({ ...draft, schoolIds: toggled(draft.schoolIds, school.id) })} /> {school.name}
              </label>
            ))}
          </fieldset>
        )}
        {draft.kind === 'FACULTIES' && (
          <fieldset className={styles.choices} disabled={!editable}>
            <legend>Facultades</legend>
            {faculties.map((faculty) => (
              <label key={faculty.id}>
                <input type="checkbox" checked={draft.facultyIds.includes(faculty.id)} onChange={() => change({ ...draft, facultyIds: toggled(draft.facultyIds, faculty.id) })} /> {faculty.name}
              </label>
            ))}
          </fieldset>
        )}
        {draft.kind === 'SERVICE' && (
          <>
            <label htmlFor="access-service">Servicio</label>
            <select id="access-service" className={styles.select} value={draft.service} disabled={!editable} onChange={(e) => change({ ...draft, service: e.target.value })}>
              <option value="">Seleccione un servicio...</option>
              {SERVICES.map((service) => (
                <option key={service} value={service}>
                  {REFERRAL_SERVICE_LABEL[service]}
                </option>
              ))}
            </select>
          </>
        )}

        <p className={styles.summary} aria-live="polite">
          {touched ? (
            <>
              <strong>Con esto:</strong> {describeScope(draft, schools, faculties)}
            </>
          ) : (
            'Rige el comportamiento por defecto de su rol. Elija un alcance para definirlo.'
          )}
        </p>
        <p className={styles.muted}>El alcance solo limita los datos que ve; no concede permisos. Rige desde su siguiente acción.</p>
      </section>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className={styles.ok}>
          Alcance guardado.
        </p>
      )}
      <div className={styles.actions}>
        {editable && (
          <Button onClick={submit} loading={save.isPending} disabled={!complete || !touched}>
            Guardar alcance
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

// Ventana «Rol y alcance» de una persona: resume lo que puede hacer (permisos de su rol) y define hasta dónde llega.
export function UserAccessDialog(props: Props) {
  const { user, onClose } = props;
  const dialogRef = useDialog(onClose);
  const query = useUserAccess(user.id);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="user-access-title" ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="user-access-title">
            Rol y alcance de {user.firstName} {user.lastName}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>
        {query.isLoading ? (
          <p className={styles.muted}>Cargando…</p>
        ) : query.isError || !query.data ? (
          <p role="alert" className={styles.error}>
            No se pudo cargar el alcance. {query.error ? getApiErrorMessage(query.error) : ''}
          </p>
        ) : (
          <AccessForm {...props} access={query.data} />
        )}
      </div>
    </div>
  );
}
