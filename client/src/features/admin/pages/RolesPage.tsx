import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, EmptyState, ConfirmDialog, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useDraft } from '@shared/hooks/useDraft';
import { useUrlParams } from '@shared/hooks/useUrlParams';
import { removeDraft } from '@shared/utils/drafts';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useCreateRole, usePermissionCatalog, useRoleList, useSetRoleActive, useUpdateRole } from '../hooks/useRoles';
import type { Permission, Role } from '../services/roleService';
import { groupPermissions } from '../permissionGroups';
import styles from './RolesPage.module.css';

// Permisos que ningún rol creado aquí puede incluir (el servidor también lo rechaza): la administración del sistema no se delega.
const NON_DELEGABLE = ['admin:system'];

const roleCodes = (role: Role) => (role.permissions ?? []).map((p) => p.code).sort();
const sameCodes = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((code, i) => code === [...b].sort()[i]);
const toggled = (codes: string[], code: string) => (codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code]);

function PermissionChecklist({ catalog, checked, disabled, isBase, onToggle }: { catalog: Permission[]; checked: string[]; disabled: boolean; isBase: boolean; onToggle: (code: string) => void }) {
  const groups = useMemo(() => groupPermissions(catalog), [catalog]);
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <fieldset key={group.key} className={styles.group} disabled={disabled}>
          <legend>{group.title}</legend>
          {group.items.map((permission) => {
            const locked = NON_DELEGABLE.includes(permission.code) && !isBase;
            return (
              <label key={permission.code} className={styles.check}>
                <input type="checkbox" checked={checked.includes(permission.code)} disabled={locked} onChange={() => onToggle(permission.code)} />
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
}

interface NewRoleDraft {
  name: string;
  description: string;
  permissions: string[];
}

// Un rol nuevo (vacío o copiado de otro). Lo escrito se conserva como borrador de la pestaña: recargar no lo pierde.
function NewRoleForm({ catalog, template, ownerId, onCreated, onCancel, onError }: { catalog: Permission[]; template: Role | null; ownerId?: string; onCreated: (role: Role) => void; onCancel: () => void; onError: (message: string) => void }) {
  const create = useCreateRole();
  const initial = useMemo<NewRoleDraft>(
    () => ({ name: '', description: template?.description ?? '', permissions: template ? roleCodes(template).filter((c) => !NON_DELEGABLE.includes(c)) : [] }),
    [template],
  );
  const unchanged = useCallback((value: NewRoleDraft) => JSON.stringify(value) === JSON.stringify(initial), [initial]);
  const draftKey = `role-new.${template?.id ?? 'vacio'}`;
  const { value: form, setValue: setForm, restored, discard } = useDraft(ownerId, draftKey, initial, unchanged);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const role = await create.mutateAsync({ name: form.name.trim(), description: form.description.trim(), permissions: form.permissions });
      if (ownerId) removeDraft(ownerId, draftKey);
      onCreated(role);
    } catch (err) {
      onError(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <CardHeader title="Nuevo rol" description={template ? 'Parte de los permisos del rol copiado; ajústalos a lo que necesitas.' : 'Elige los permisos del catálogo.'} />
      <CardBody>
        <form onSubmit={submit} className={styles.form}>
          {restored && (
            <p role="status" className={styles.muted}>
              Recuperamos lo que estabas escribiendo.{' '}
              <button type="button" className={styles.link} onClick={discard}>
                Descartar
              </button>
            </p>
          )}
          <label htmlFor="role-name">Nombre del rol</label>
          <input id="role-name" className={styles.input} value={form.name} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <label htmlFor="role-description">Descripción</label>
          <textarea id="role-description" className={styles.input} rows={2} maxLength={300} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <h3 className={styles.sub}>Permisos ({form.permissions.length})</h3>
          <PermissionChecklist catalog={catalog} checked={form.permissions} disabled={false} isBase={false} onToggle={(code) => setForm((f) => ({ ...f, permissions: toggled(f.permissions, code) }))} />
          <div className={styles.actions}>
            <Button type="submit" loading={create.isPending} disabled={form.name.trim().length < 3 || form.description.trim().length < 3}>
              Crear rol
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardBody>
    </>
  );
}

interface EditDraft {
  description: string;
  permissions: string[];
}

// El detalle de un rol. Los cambios sin guardar se conservan como borrador de la pestaña (por rol).
function RoleEditor({ role, catalog, ownerId, onCopy, onAskDeactivate, onActivate, onSaved, onError }: { role: Role; catalog: Permission[]; ownerId?: string; onCopy: () => void; onAskDeactivate: () => void; onActivate: () => void; onSaved: (role: Role) => void; onError: (message: string) => void }) {
  const update = useUpdateRole();
  const readOnly = role.isBase === true;
  const users = role.userCount ?? 0;
  const initial = useMemo<EditDraft>(() => ({ description: role.description ?? '', permissions: roleCodes(role) }), [role]);
  const unchanged = useCallback((value: EditDraft) => value.description.trim() === initial.description && sameCodes(value.permissions, initial.permissions), [initial]);
  const { value: form, setValue: setForm, restored, discard } = useDraft(ownerId, `role-edit.${role.id}`, initial, unchanged);
  const dirty = !readOnly && !unchanged(form);

  const save = async () => {
    try {
      const saved = await update.mutateAsync({ id: role.id, description: form.description.trim(), permissions: form.permissions });
      if (ownerId) removeDraft(ownerId, `role-edit.${role.id}`);
      onSaved(saved);
    } catch (err) {
      onError(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <CardHeader title={role.name} description={role.isBase ? 'Rol base: se puede ver y copiar, no modificar.' : 'Rol personalizado'} />
      <CardBody>
        <div className={styles.form}>
          {restored && !readOnly && (
            <p role="status" className={styles.muted}>
              Recuperamos los cambios que no habías guardado.{' '}
              <button type="button" className={styles.link} onClick={discard}>
                Descartar
              </button>
            </p>
          )}
          <label htmlFor="role-edit-description">Descripción</label>
          <textarea id="role-edit-description" className={styles.input} rows={2} maxLength={300} value={form.description} disabled={readOnly} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <h3 className={styles.sub}>Permisos ({form.permissions.length})</h3>
          {role.isBase && <p className={styles.muted}>Los roles base no se modifican porque el sistema restablece sus permisos. Cópialo para crear uno parecido.</p>}
          <PermissionChecklist catalog={catalog} checked={form.permissions} disabled={readOnly} isBase={role.isBase === true} onToggle={(code) => setForm((f) => ({ ...f, permissions: toggled(f.permissions, code) }))} />
          <div className={styles.actions}>
            {role.isBase ? (
              <Button onClick={onCopy}>Crear a partir de este rol</Button>
            ) : (
              <>
                <Button onClick={save} loading={update.isPending} disabled={!dirty}>
                  Guardar cambios
                </Button>
                <Button variant="secondary" onClick={onCopy}>
                  Copiar
                </Button>
                {role.isActive === false ? (
                  <Button variant="secondary" onClick={onActivate}>
                    Activar
                  </Button>
                ) : (
                  <Button variant="ghost" disabled={users > 0} onClick={onAskDeactivate}>
                    Desactivar
                  </Button>
                )}
              </>
            )}
          </div>
          {!role.isBase && role.isActive !== false && users > 0 && <p className={styles.muted}>No se puede desactivar mientras {users} cuenta(s) lo tengan: cámbiales el rol primero.</p>}
        </div>
      </CardBody>
    </>
  );
}

// Roles configurables (LEV-R11): la DBU crea roles con permisos del catálogo, los edita y los desactiva. Los siete roles base se ven y
// se copian, pero no se modifican. A quién se asigna cada rol y hasta dónde llega se define en «Usuarios y roles».
// El rol elegido y la ventana abierta viven en la URL (?rol=<id>, ?nuevo=1&copiar=<id>, ?confirmar=1): recargar o compartir el enlace
// vuelve al mismo lugar.
export function RolesPage() {
  const rolesQuery = useRoleList();
  const catalogQuery = usePermissionCatalog();
  const setActive = useSetRoleActive();
  const url = useUrlParams();
  const { user: me } = useAuth();

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const selected = roles.find((r) => r.id === url.get('rol')) ?? null;
  const creating = url.get('nuevo') === '1';
  const template = roles.find((r) => r.id === url.get('copiar')) ?? null;
  const confirmOff = url.get('confirmar') === '1' && selected !== null;
  const ready = !rolesQuery.isLoading && !rolesQuery.isError;

  // Un enlace a un rol que ya no existe no deja la pantalla a medias: se limpia el parámetro.
  const staleIds = [url.get('rol'), url.get('copiar')].join('|');
  useEffect(() => {
    if (!ready) return;
    const gone: Record<string, null> = {};
    for (const key of ['rol', 'copiar']) {
      const id = url.get(key);
      if (id && !roles.some((r) => r.id === id)) gone[key] = null;
    }
    if (Object.keys(gone).length > 0) url.set(gone, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, roles, staleIds]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const select = (role: Role) => {
    url.set({ rol: role.id, nuevo: null, copiar: null, confirmar: null });
    clearMessages();
  };
  const startNew = (copyFrom?: Role) => {
    url.set({ nuevo: '1', copiar: copyFrom?.id ?? null, rol: null, confirmar: null });
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

  return (
    <div>
      <PageHeader
        title="Roles y permisos"
        subtitle="Crea roles con los permisos que necesites y desactívalos cuando ya no se usen. Quién tiene cada rol y hasta dónde llega se define en «Usuarios y roles»."
        icon={<SettingsIcon size={24} />}
        actions={<Button onClick={() => startNew()}>Nuevo rol</Button>}
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
                    <button type="button" className={styles.roleButton} aria-pressed={role.id === selected?.id} onClick={() => select(role)}>
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
            {creating ? (
              <NewRoleForm
                key={template?.id ?? 'vacio'}
                catalog={catalog}
                template={template}
                ownerId={me?.id}
                onError={setError}
                onCancel={() => url.set({ nuevo: null, copiar: null }, { replace: true })}
                onCreated={(role) => {
                  url.set({ nuevo: null, copiar: null, rol: role.id });
                  setNotice(`Rol «${role.name}» creado.`);
                }}
              />
            ) : selected ? (
              <RoleEditor
                key={selected.id}
                role={selected}
                catalog={catalog}
                ownerId={me?.id}
                onCopy={() => startNew(selected)}
                onAskDeactivate={() => url.set({ confirmar: '1' })}
                onActivate={() => run(() => setActive.mutateAsync({ id: selected.id, isActive: true }))}
                onError={setError}
                onSaved={(role) => {
                  clearMessages();
                  setNotice(`Cambios de «${role.name}» guardados. Rigen desde la siguiente acción de cada persona con este rol.`);
                }}
              />
            ) : (
              <CardBody>
                <p className={styles.muted}>Elige un rol de la lista para ver sus permisos, o crea uno nuevo.</p>
              </CardBody>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmOff}
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
            url.set({ confirmar: null }, { replace: true });
          }
        }}
        onCancel={() => url.set({ confirmar: null }, { replace: true })}
      />
    </div>
  );
}
