#!/bin/sh
# Restaura un respaldo completo (base de datos + adjuntos).
#
#   RESTORE_CONFIRM=yes restore.sh <sit_backup_AAAAMMDD_HHMMSS.tar> [carpeta_de_adjuntos]
#
# DESTRUCTIVO: reemplaza el esquema `public` de la base indicada por las variables PG* (PGHOST,
# PGDATABASE, ...). Antes de tocar nada verifica las sumas SHA-256 del respaldo. Para ensayar sin
# riesgo, apunte PGDATABASE a una base vacía y la carpeta de adjuntos a un directorio temporal.
set -eu

ARCHIVE="${1:-}"
FILES_DIR="${2:-}"

log() { echo "[restore] $(date '+%F %T') $*"; }
die() { log "ERROR: $*"; exit 1; }

[ -n "${ARCHIVE}" ] && [ -f "${ARCHIVE}" ] || die "uso: RESTORE_CONFIRM=yes restore.sh <respaldo.tar> [carpeta_de_adjuntos]"
[ "${RESTORE_CONFIRM:-}" = "yes" ] ||
  die "esto reemplaza la base ${PGDATABASE:-sit_db} en ${PGHOST:-localhost}; repita con RESTORE_CONFIRM=yes si es lo que desea"

WORK=$(mktemp -d)
trap 'rm -rf "${WORK}"' EXIT

tar -xf "${ARCHIVE}" -C "${WORK}" || die "no se pudo abrir el respaldo"
(cd "${WORK}" && sha256sum -c MANIFEST.sha256 > /dev/null 2>&1) || die "el respaldo está dañado o fue alterado (falla la verificación SHA-256)"
gzip -t "${WORK}/db.sql.gz" || die "el volcado de la base está dañado"
tar -tzf "${WORK}/files.tar.gz" > /dev/null || die "el paquete de adjuntos está dañado"
log "respaldo verificado ($(grep '^created=' "${WORK}/INFO" | cut -d= -f2))"

log "restaurando la base ${PGDATABASE:-sit_db} en ${PGHOST:-localhost}"
psql -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' > /dev/null ||
  die "no se pudo preparar el esquema"
gunzip -c "${WORK}/db.sql.gz" | psql -v ON_ERROR_STOP=1 -q --single-transaction > /dev/null ||
  die "la carga del volcado falló; la base quedó vacía, repita con otro respaldo"

if [ -n "${FILES_DIR}" ]; then
  mkdir -p "${FILES_DIR}" || die "no se pudo crear ${FILES_DIR}"
  tar -xzf "${WORK}/files.tar.gz" -C "${FILES_DIR}" || die "no se pudieron restaurar los adjuntos"
  log "adjuntos restaurados en ${FILES_DIR}"
else
  log "AVISO: no se indicó carpeta de adjuntos; solo se restauró la base"
fi
log "restauración terminada"
