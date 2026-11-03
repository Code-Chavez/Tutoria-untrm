import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, EmptyState, ConfirmDialog, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useCreateRole, usePermissionCatalog, useRoleList, useSetRoleActive, useUpdateRole } from '../hooks/useRoles';
import type { Role } from '../services/roleService';
import { groupPermissions } from '../permissionGroups';
import styles from './RolesPage.module.css';

// Permisos que ningún rol creado aquí puede incluir (el servidor también lo rechaza): la administración del sistema no se delega.
const NON_DELEGABLE = ['admin:system'];


const roleCodes = (role: Role) => (role.permissions ?? []).map((p) => p.code);
const sameSet = (a: Set<string>, b: string[]) => a.size === b.length && b.every((code) => a.has(code));
const toggled = (set: Set<string>, code: string) => {
  const next = new Set(set);
  if (!next.delete(code)) next.add(code);
  return next;
};

interface Draft {
  name: string;
  description: string;
  permissions: Set<string>;
  copyFromRoleId?: string;
}

// Roles configurables (LEV-R11): la DBU crea roles con permisos del catálogo, los edita y los desactiva. Los siete roles base se ven y
// se copian, pero no se modifican. A quién se asigna cada rol y hasta dónde llega se define en «Usuarios y roles».
export function RolesPage() {
  const rolesQuery = useRoleList();
  const catalogQuery = usePermissionCatalog();
  const create = useCreateRole();
  const update = useUpdateRole();
  const setActive = useSetRoleActive();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editDescription, setEditDescription] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<Set<string> | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const selected = roles.find((r) => r.id === selectedId) ?? null;

  const groups = useMemo(() => groupPermissions(catalog), [catalog]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const select = (role: Role) => {
    setSelectedId(role.id);
    setDraft(null);
    setEditDescription(null);
    setEditPermissions(null);
    clearMessages();
  };

  const startCopy = (role: Role) => {
    setDraft({ name: '', description: role.description ?? '', permissions: new Set(roleCodes(role).filter((c) => !NON_DELEGABLE.includes(c))), copyFromRoleId: role.id });
    setSelectedId(null);
    clearMessages();
  };

  const startNew = () => {
    setDraft({ name: '', description: '', permissions: new Set() });
    setSelectedId(null);
    clearMessages();
  };

  const run = async (action: () => Promise<unknown>) => {
    clearMessages();
    try {
      await action();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const submitNew = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    void run(async () => {
      const role = await create.mutateAsync({ name: draft.name.trim(), description: draft.description.trim(), permissions: [...draft.permissions] });
      setDraft(null);
      setSelectedId(role.id);
      setNotice(`Rol «${role.name}» creado.`);
    });
  };

  const readOnly = !selected || selected.isBase === true;
  const description = selected ? (editDescription ?? selected.description ?? '') : '';
  const permissions = selected ? (editPermissions ?? new Set(roleCodes(selected))) : new Set<string>();
  const descriptionChanged = !!selected && editDescription !== null && editDescription.trim() !== (selected.description ?? '');
  const permissionsChanged = !!selected && editPermissions !== null && !sameSet(editPermissions, roleCodes(selected));
  const dirty = !readOnly && (descriptionChanged || permissionsChanged);

  const toggle = (code: string) => {
    if (draft) setDraft({ ...draft, permissions: toggled(draft.permissions, code) });
    else if (!readOnly) setEditPermissions(toggled(permissions, code));
  };

  const saveChanges = () =>
    run(async () => {
      if (!selected) return;
      const saved = await update.mutateAsync({ id: selected.id, description: description.trim(), permissions: [...permissions] });
      setEditDescription(null);
      setEditPermissions(null);
      setNotice(`Cambios de «${saved.name}» guardados. Rigen desde la siguiente acción de cada persona con este rol.`);
    });

  const renderPermissions = (checked: Set<string>, disabled: boolean) => (
    <div className={styles.groups}>
      {groups.map((group) => (
        <fieldset key={group.key} className={styles.group} disabled={disabled}>
          <legend>{group.title}</legend>
          {group.items.map((permission) => {
            const locked = NON_DELEGABLE.includes(permission.code) && !selected?.isBase;
            return (
              <label key={permission.code} className={styles.check}>
                <input type="checkbox" checked={checked.has(permission.code)} disabled={locked} onChange={() => toggle(permission.code)} />
                <span>
                  {permission.description}
                  <code className={styles.code}>{permission.code}</code>
                  {locked && <em className={styles.hint}>No se delega: solo los roles base la tienen.</em>}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );

  const users = selected?.userCount ?? 0;

  return (
    <div>
      <PageHeader
        title="Roles y permisos"
        subtitle="Crea roles con los permisos que necesites y desactívalos cuando ya no se usen. Quién tiene cada rol y hasta dónde llega se define en «Usuarios y roles»."
        icon={<SettingsIcon size={24} />}
        actions={<Button onClick={startNew}>Nuevo rol</Button>}
      />

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}

      {rolesQuery.isLoading || catalogQuery.isLoading ? (
        <TableSkeleton rows={5} columns={2} />
      ) : rolesQuery.isError || catalogQuery.isError ? (
        <EmptyState icon={<SettingsIcon size={26} />} title="No se pudieron cargar los roles" description="Vuelve a intentarlo en un momento." />
      ) : (
        <div className={styles.layout}>
          <Card>
            <CardHeader title="Roles" description={`${roles.length} en total`} />
            <CardBody>
              <ul className={styles.list}>
                {roles.map((role) => (
                  <li key={role.id}>
                    <button type="button" className={styles.roleButton} aria-pressed={role.id === selectedId} onClick={() => select(role)}>
                      <span className={styles.roleName}>{role.name}</span>
                      <span className={styles.meta}>
                        <Badge tone={role.isBase ? 'info' : 'neutral'}>{role.isBase ? 'Base' : 'Personalizado'}</Badge>
                        {role.isActive === false && <Badge tone="warning">Desactivado</Badge>}
                        <span>{role.userCount ?? 0} cuenta(s)</span>
                        <span>{role.permissions?.length ?? 0} permiso(s)</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            {draft ? (
              <>
                <CardHeader title="Nuevo rol" description={draft.copyFromRoleId ? 'Parte de los permisos del rol copiado; ajústalos a lo que necesitas.' : 'Elige los permisos del catálogo.'} />
                <CardBody>
                  <form onSubmit={submitNew} className={styles.form}>
                    <label htmlFor="role-name">Nombre del rol</label>
                    <input id="role-name" className={styles.input} value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    <label htmlFor="role-description">Descripción</label>
                    <textarea id="role-description" className={styles.input} rows={2} maxLength={300} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                    <h3 className={styles.sub}>Permisos ({draft.permissions.size})</h3>
                    {renderPermissions(draft.permissions, false)}
                    <div className={styles.actions}>
                      <Button type="submit" loading={create.isPending} disabled={draft.name.trim().length < 3 || draft.description.trim().length < 3}>
                        Crear rol
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </>
            ) : selected ? (
              <>
                <CardHeader title={selected.name} description={selected.isBase ? 'Rol base: se puede ver y copiar, no modificar.' : 'Rol personalizado'} />
                <CardBody>
                  <div className={styles.form}>
                    <label htmlFor="role-edit-description">Descripción</label>
                    <textarea id="role-edit-description" className={styles.input} rows={2} maxLength={300} value={description} disabled={readOnly} onChange={(e) => setEditDescription(e.target.value)} />
                    <h3 className={styles.sub}>Permisos ({permissions.size})</h3>
                    {selected.isBase && <p className={styles.muted}>Los roles base no se modifican porque el sistema restablece sus permisos. Cópialo para crear uno parecido.</p>}
                    {renderPermissions(permissions, readOnly)}
                    <div className={styles.actions}>
                      {selected.isBase ? (
                        <Button onClick={() => startCopy(selected)}>Crear a partir de este rol</Button>
                      ) : (
                        <>
                          <Button onClick={saveChanges} loading={update.isPending} disabled={!dirty}>
                            Guardar cambios
                          </Button>
                          <Button variant="secondary" onClick={() => startCopy(selected)}>
                            Copiar
                          </Button>
                          {selected.isActive === false ? (
                            <Button variant="secondary" onClick={() => run(() => setActive.mutateAsync({ id: selected.id, isActive: true }))}>
                              Activar
                            </Button>
                          ) : (
                            <Button variant="ghost" disabled={users > 0} onClick={() => setConfirmOff(true)}>
                              Desactivar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {!selected.isBase && selected.isActive !== false && users > 0 && (
                      <p className={styles.muted}>No se puede desactivar mientras {users} cuenta(s) lo tengan: cámbiales el rol primero.</p>
                    )}
                  </div>
                </CardBody>
              </>
            ) : (
              <CardBody>
                <p className={styles.muted}>Elige un rol de la lista para ver sus permisos, o crea uno nuevo.</p>
              </CardBody>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmOff && !!selected}
        title="Desactivar rol"
        message={`«${selected?.name ?? ''}» dejará de poder asignarse a cuentas y no concederá permisos. Podrás activarlo de nuevo.`}
        confirmLabel="Desactivar"
        tone="danger"
        loading={setActive.isPending}
        onConfirm={async () => {
          const id = selected?.id;
          try {
            if (id) await run(() => setActive.mutateAsync({ id, isActive: false }));
          } finally {
            setConfirmOff(false);
          }
        }}
        onCancel={() => setConfirmOff(false)}
      />
    </div>
  );
}
