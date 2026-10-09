#!/bin/sh
# Prepara el cron con el entorno del contenedor y ejecuta un respaldo inicial.
set -eu

# Persistir las variables PG*/BACKUP* para que el cron (que no hereda el entorno) pueda usarlas
# desde backup.sh. Los valores se escapan para que comillas y `$` (p. ej. $BACKUP_FILE en
# BACKUP_UPLOAD_CMD) lleguen intactos al script.
printenv | grep -E '^(PG|BACKUP)' | while IFS= read -r line; do
  name=${line%%=*}
  value=${line#*=}
  escaped=$(printf '%s' "$value" | sed 's/[\\"$`]/\&/g')
  printf 'export %s="%s"\n' "$name" "$escaped"
done > /etc/backup.env

CRON="${BACKUP_CRON:-0 2 * * *}"
echo "${CRON} /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
echo "[backup] programado con la expresión cron: ${CRON}"

# Un respaldo inicial deja evidencia inmediata de que el servicio funciona.
/usr/local/bin/backup.sh || echo "[backup] el respaldo inicial falló (¿la base ya está lista?)"

# crond en primer plano para mantener vivo el contenedor.
exec crond -f -l 2
