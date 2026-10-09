# Respaldo y restauración

El servicio `backup` guarda, **en un único paquete consistente**, la base de datos y los archivos adjuntos
(evidencias de sesión y resoluciones PDF de `server/storage`). Cada corrida:

1. vuelca la base con `pg_dump` a un archivo y comprueba que está completo (marca final) y que comprime bien;
2. empaqueta los adjuntos justo después, en la misma corrida;
3. escribe un manifiesto con sumas SHA-256 y valida el paquete;
4. lo **publica de forma atómica** como `sit_backup_AAAAMMDD_HHMMSS.tar`;
5. solo entonces aplica la retención (`BACKUP_KEEP`, por defecto 7) y la copia fuera del equipo.

Si cualquier etapa falla, el script **termina con error**, no publica un respaldo a medias, no purga los
existentes y deja `FAIL` en `/backups/last_status`. El contenedor es `unhealthy` si el último respaldo falló o
tiene más de 26 horas (`docker ps`).

## Copia fuera del equipo (obligatoria en producción)

Un respaldo en el mismo servidor no protege de perder el servidor. Configure al menos una:

| Variable | Qué hace |
|---|---|
| `BACKUP_OFFSITE_DIR` | Carpeta montada de otro disco o servidor (NFS, SMB, disco externo, carpeta sincronizada). Se copia y se **verifica la suma** del archivo copiado. |
| `BACKUP_UPLOAD_CMD` | Comando propio que recibe la ruta en `$BACKUP_FILE`, p. ej. `rclone copy "$BACKUP_FILE" remoto:sit` o `scp "$BACKUP_FILE" usuario@host:/respaldos/`. |

Si no hay ninguna, el respaldo avisa en el registro que es solo local. Si el destino no existe (volumen no
montado) o el comando falla, la corrida termina con error aunque el respaldo local ya esté publicado.

## Restaurar

```sh
# DESTRUCTIVO: reemplaza el esquema public de la base indicada por las variables PG*.
docker compose exec backup sh -c \
  'RESTORE_CONFIRM=yes restore.sh /backups/sit_backup_AAAAMMDD_HHMMSS.tar /data/restore'
```

`restore.sh` verifica las sumas SHA-256 y que los archivos no estén dañados **antes** de tocar la base; sin
`RESTORE_CONFIRM=yes` no hace nada. Los adjuntos se extraen en la carpeta indicada (cópielos a
`server/storage`, o monte esa carpeta en el servidor). Si omite la carpeta, solo restaura la base.

Para **ensayar** sin riesgo, apunte `PGDATABASE` a una base vacía y la carpeta de adjuntos a un directorio
temporal.

## Ensayo automático

`test-backup.sh` crea bases y carpetas temporales y comprueba: respaldo normal con copia externa verificada,
fallo de conexión (sale con error, no publica ni purga), carpeta de adjuntos o destino externo ausentes,
retención, restauración con la resolución PDF y la evidencia idénticas byte a byte, y rechazo de un respaldo
alterado. Se ejecuta en CI (job *Backup — Restore drill*) y a mano con:

```sh
docker compose run --rm --no-deps -e PGDATABASE=postgres --entrypoint /usr/local/bin/test-backup.sh backup
```

## Notas

- Los volcados anteriores `sit_db_*.sql.gz` (formato antiguo, solo base) no los gestiona la retención nueva;
  puede borrarlos a mano cuando ya tenga respaldos completos.
- Los valores de `BACKUP_UPLOAD_CMD` con comillas o `$` llegan intactos al cron; evite saltos de línea.
- Haga un ensayo de restauración completo (en otra máquina) antes de poner datos reales.
