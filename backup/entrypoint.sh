#!/bin/sh
# Prepara el cron con el entorno del contenedor y ejecuta un volcado inicial.
set -eu

# Persistir las variables PG*/BACKUP* para que el cron (que no hereda el
# entorno) pueda usarlas desde backup.sh.
printenv | grep -E '^(PG|BACKUP)' | sed 's/^\([^=]*\)=\(.*\)$/export \1="\2"/' > /etc/backup.env

CRON="${BACKUP_CRON:-0 2 * * *}"
echo "${CRON} /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
echo "[backup] programado con la expresión cron: ${CRON}"

# Un volcado inicial deja evidencia inmediata de que el servicio funciona.
/usr/local/bin/backup.sh || echo "[backup] el volcado inicial falló (¿la base ya está lista?)"

# crond en primer plano para mantener vivo el contenedor.
exec crond -f -l 2
