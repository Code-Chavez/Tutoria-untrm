#!/bin/sh
# Sano si el último respaldo terminó bien y tiene menos de 26 horas.
set -eu
STATUS="${BACKUP_DIR:-/backups}/last_status"
[ -f "${STATUS}" ] || exit 1
read -r ts state _ < "${STATUS}"
[ "${state}" = "OK" ] || exit 1
[ $(( $(date +%s) - ts )) -lt 93600 ] || exit 1
