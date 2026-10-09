# Evidencia — sección 7 del guion de aceptación (operación)

**Fecha:** 09/10/2026 · **Código:** `develop` en `5affd90` (contenido de `v0.4.0`) · **Entorno:** Docker local, base de desarrollo
y bases de ensayo desechables (ya eliminadas). Ninguna prueba tocó datos reales.

## Resultado

| # | Paso | Resultado |
|---|---|---|
| 7.1 | Respaldo de la base y de los adjuntos | **OK.** Paquete `sit_backup_*.tar` con `db.sql.gz`, `files.tar.gz`, `MANIFEST.sha256` e `INFO`; `/backups/last_status` en `OK`; el paquete incluye el PDF de `evidence/`. |
| 7.2 | Restaurar en otra base con adjuntos | **OK.** Restauración en una base nueva: 13 usuarios, 12 estudiantes, 1 derivación, 2 solicitudes y 246 registros de bitácora, iguales al origen. El PDF restaurado tiene la **misma huella SHA-256** que el original (`e9e6c9b2…85f48`). |
| 7.3 | Fallo de conexión del respaldo | **OK.** `pg_dump` contra un servidor inexistente: salida con código **1**, estado `FAIL` con el motivo, **sin respaldo nuevo** y los 6 existentes intactos; la siguiente corrida normal vuelve a `OK`. |
| 7.4 | Copia fuera del equipo | **OK (mecanismo).** Con `BACKUP_OFFSITE_DIR` la copia se verifica por SHA-256 (idéntica); con un destino no montado la corrida **falla** y queda `FAIL`. **Falta definir el destino real** (carpeta de red, `rclone`, `scp`). |
| 7.5 | Migración desde datos de v0.3.0 | **OK.** Ver detalle abajo. |
| 7.6 | Arranque de producción sobre base vacía | **OK.** La imagen de producción, con secretos de prueba: migra las 35 migraciones, crea **1 usuario** (el administrador indicado), 0 estudiantes, 0 escuelas y los 6 roles; corre como usuario no root; salud 200; el administrador de desarrollo (`Admin2026!`) recibe **401** y el nuevo, **200**. Con secretos de ejemplo no arranca y lista los problemas. |
| 7.7 | Reversión | **OK (ensayo).** Ver procedimiento en `deploy/README.md`. |

## 7.5 — Migración desde una copia con datos de v0.3.0

1. Base nueva con el esquema **exacto** de v0.3.0 (sus 21 migraciones, aplicadas desde el árbol del tag).
2. Datos de ensayo con el esquema antiguo: 2 usuarios, 2 estudiantes, 8 sesiones con 8 asistencias numeradas 1-8 sobre todo el
   historial, 2 sesiones abiertas (*refresh tokens* en texto plano), 1 enlace de recuperación pendiente, 2 solicitudes,
   1 derivación y 3 avisos (uno apuntando a una derivación inexistente).
3. Respaldo previo a la migración, y luego `prisma migrate deploy` con las 35 migraciones actuales.

| Qué | Antes (v0.3.0) | Después (v0.4.0) |
|---|---|---|
| Migraciones aplicadas | 21 | **35**, sin errores |
| Usuarios / estudiantes / sesiones / asistencias | 2 / 2 / 8 / 8 | 2 / 2 / 8 / 8 (**conservados**) |
| Numeración de asistencias | `1,2,3,4,5,6,7,8` | semestre 2026-I: `1,2,3,4,5` · 2026-II: `1,2` · fuera de periodo: `8` (conserva su número) |
| *Refresh tokens* | 2 (texto plano) | 0: todos vuelven a iniciar sesión (esperado) |
| Enlaces de recuperación | 1 | 0 (esperado) |
| Solicitudes de tutoría | 2 | 2, ambas `PENDIENTE` |
| Avisos | 3 | 2: se eliminó el que apuntaba a una derivación inexistente |
| Corte de matrícula | — | semestre cerrado 2026-I: 2 estudiantes; semestre vigente: sin corte (vive de los datos actuales) |

## 7.7 — Ensayo de reversión

Se restauró el respaldo **previo a la migración** en una base nueva: quedó con 21 migraciones, 2 *refresh tokens*, 1 enlace de
recuperación, 3 avisos y la numeración `1…8` original, y `prisma migrate status` con las migraciones de v0.3.0 respondió
**«Database schema is up to date!»**: es decir, el estado previo se recupera completo y es compatible con el código de v0.3.0.

## Observaciones

- Con `docker compose exec backup …` no se puede anular `PGHOST` por variable: el script recarga `/etc/backup.env`. Para
  simular fallos se usa un contenedor aparte con la misma imagen (como hace el ensayo automático del CI).
- Estas pruebas se hicieron sobre el estado local: **no sustituyen** el ensayo en el servidor real ni con los datos reales de
  la v0.3.0 si ya existiesen.
