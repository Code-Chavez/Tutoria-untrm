#!/bin/sh
# Genera un volcado comprimido de la base de datos y aplica retención.
set -eu

# El cron no hereda el entorno del contenedor; lo recuperamos desde el archivo
# que escribe el entrypoint al arrancar.
[ -f /etc/backup.env ] && . /etc/backup.env

STAMP=$(date +%Y%m%d_%H%M%S)
OUT="/backups/sit_db_${STAMP}.sql.gz"
KEEP="${BACKUP_KEEP:-7}"

echo "[backup] $(date '+%F %T') volcando ${PGDATABASE:-sit_db} -> ${OUT}"
pg_dump --no-owner --no-privileges | gzip -9 > "${OUT}"
echo "[backup] $(date '+%F %T') listo ($(du -h "${OUT}" | cut -f1))"

# Retención: conservar solo los últimos KEEP volcados.
ls -1t /backups/sit_db_*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "${old}"
  echo "[backup] purgado antiguo ${old}"
done
