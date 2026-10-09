#!/bin/sh
# Respaldo consistente de la base de datos y de los archivos adjuntos (evidencias y resoluciones).
#
# Cada etapa se comprueba por separado y el archivo final solo se publica tras validarlo:
#   1. pg_dump a un archivo (sin tuberías: un fallo de pg_dump no se esconde detrás de gzip)
#   2. el volcado debe estar completo (marca final de pg_dump) y comprimirse bien
#   3. los adjuntos se empaquetan justo después, en la misma corrida
#   4. se escribe un manifiesto con sumas SHA-256 y se valida el paquete
#   5. publicación atómica y, solo entonces, retención y copia fuera del host
# Si algo falla, sale con código distinto de 0, no publica nada y no purga respaldos válidos.
set -eu

# El cron no hereda el entorno del contenedor; lo recuperamos desde el archivo
# que escribe el entrypoint al arrancar.
[ -f /etc/backup.env ] && . /etc/backup.env

BACKUP_DIR="${BACKUP_DIR:-/backups}"
STORAGE_DIR="${BACKUP_STORAGE_DIR:-}"
KEEP="${BACKUP_KEEP:-7}"
case "${KEEP}" in '' | *[!0-9]* | 0) KEEP=7 ;; esac

STAMP=$(date +%Y%m%d_%H%M%S)
WORK="${BACKUP_DIR}/.work-${STAMP}"
FINAL="${BACKUP_DIR}/sit_backup_${STAMP}.tar"

log() { echo "[backup] $(date '+%F %T') $*"; }

# Estado de la última corrida (lo lee el healthcheck del contenedor): <epoch> <OK|FAIL> <detalle>
write_status() { printf '%s %s %s\n' "$(date +%s)" "$1" "$2" > "${BACKUP_DIR}/last_status"; }

fail() {
  log "ERROR: $*"
  rm -rf "${WORK}" "${FINAL}.partial"
  write_status FAIL "$*"
  exit 1
}

mkdir -p "${BACKUP_DIR}" "${WORK}" || fail "no se pudo preparar ${BACKUP_DIR}"

# ── 1-2. Base de datos ───────────────────────────────────────────
log "volcando ${PGDATABASE:-sit_db} en ${PGHOST:-localhost}"
pg_dump --no-owner --no-privileges > "${WORK}/db.sql" 2> "${WORK}/pg_dump.err" ||
  fail "pg_dump falló: $(tr '\n' ' ' < "${WORK}/pg_dump.err")"
[ -s "${WORK}/db.sql" ] || fail "el volcado quedó vacío"
tail -n 5 "${WORK}/db.sql" | grep -q 'PostgreSQL database dump complete' ||
  fail "el volcado está incompleto (falta la marca final de pg_dump)"
gzip -9 "${WORK}/db.sql" || fail "no se pudo comprimir el volcado"
gzip -t "${WORK}/db.sql.gz" || fail "el volcado comprimido está dañado"

# ── 3. Archivos adjuntos ─────────────────────────────────────────
if [ -n "${STORAGE_DIR}" ]; then
  [ -d "${STORAGE_DIR}" ] || fail "no existe la carpeta de adjuntos ${STORAGE_DIR}"
  tar -czf "${WORK}/files.tar.gz" -C "${STORAGE_DIR}" . || fail "no se pudieron empaquetar los adjuntos"
else
  log "AVISO: BACKUP_STORAGE_DIR no está definido; el respaldo NO incluye evidencias ni resoluciones"
  mkdir "${WORK}/empty"
  tar -czf "${WORK}/files.tar.gz" -C "${WORK}/empty" . || fail "no se pudo crear el paquete de adjuntos vacío"
  rmdir "${WORK}/empty"
fi
tar -tzf "${WORK}/files.tar.gz" > /dev/null || fail "el paquete de adjuntos está dañado"

# ── 4. Manifiesto y paquete único ────────────────────────────────
(cd "${WORK}" && sha256sum db.sql.gz files.tar.gz > MANIFEST.sha256) || fail "no se pudo escribir el manifiesto"
printf 'created=%s\ndatabase=%s\nhost=%s\nstorage=%s\n' \
  "${STAMP}" "${PGDATABASE:-sit_db}" "${PGHOST:-localhost}" "${STORAGE_DIR:-ninguno}" > "${WORK}/INFO"
tar -cf "${FINAL}.partial" -C "${WORK}" db.sql.gz files.tar.gz MANIFEST.sha256 INFO || fail "no se pudo crear el paquete"
tar -tf "${FINAL}.partial" > /dev/null || fail "el paquete final está dañado"

# ── 5. Publicación atómica, retención y copia fuera del host ─────
mv "${FINAL}.partial" "${FINAL}" || fail "no se pudo publicar el respaldo"
rm -rf "${WORK}"
log "listo ${FINAL} ($(du -h "${FINAL}" | cut -f1))"

# Retención: solo tras un respaldo nuevo y válido; un fallo nunca purga los existentes.
ls -1t "${BACKUP_DIR}"/sit_backup_*.tar 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "${old}"
  log "purgado antiguo ${old}"
done
# Restos de corridas interrumpidas.
find "${BACKUP_DIR}" -maxdepth 1 \( -name '.work-*' -o -name '*.partial' \) -mmin +1440 -exec rm -rf {} + 2>/dev/null || true

OFFSITE="local"
if [ -n "${BACKUP_OFFSITE_DIR:-}" ]; then
  [ -d "${BACKUP_OFFSITE_DIR}" ] || fail "la carpeta de copia externa ${BACKUP_OFFSITE_DIR} no existe (¿volumen no montado?)"
  cp "${FINAL}" "${BACKUP_OFFSITE_DIR}/" || fail "no se pudo copiar a ${BACKUP_OFFSITE_DIR}"
  [ "$(sha256sum < "${FINAL}")" = "$(sha256sum < "${BACKUP_OFFSITE_DIR}/$(basename "${FINAL}")")" ] ||
    fail "la copia en ${BACKUP_OFFSITE_DIR} no coincide con el original"
  log "copia externa verificada en ${BACKUP_OFFSITE_DIR}"
  OFFSITE="carpeta externa"
fi
if [ -n "${BACKUP_UPLOAD_CMD:-}" ]; then
  # Comando propio (rclone, scp, aws s3 cp…) que recibe la ruta del respaldo en $BACKUP_FILE.
  BACKUP_FILE="${FINAL}" sh -c "${BACKUP_UPLOAD_CMD}" || fail "el comando de copia externa falló"
  log "copia externa enviada con BACKUP_UPLOAD_CMD"
  OFFSITE="comando externo"
fi
if [ "${OFFSITE}" = "local" ]; then
  log "AVISO: no hay copia fuera de este equipo (defina BACKUP_OFFSITE_DIR o BACKUP_UPLOAD_CMD)"
fi

write_status OK "$(basename "${FINAL}") copia=${OFFSITE}"
