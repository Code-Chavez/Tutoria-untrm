#!/bin/sh
# Ensayo aislado del respaldo y la restauración (A10). Necesita un PostgreSQL accesible con las
# variables PG* (usuario con permiso para crear bases). Crea y borra sus propias bases y carpetas
# temporales; no toca la base configurada en PGDATABASE.
#
#   docker compose run --rm --no-deps -e PGDATABASE=postgres --entrypoint test-backup.sh backup
set -u

PASS=0
FAILED=0
check() { # check "descripción" comando...
  desc="$1"; shift
  if "$@" > /dev/null 2>&1; then PASS=$((PASS + 1)); echo "  ok   $desc"; else FAILED=$((FAILED + 1)); echo "  FALLA $desc"; fi
}

ROOT=$(mktemp -d)
SRC_DB="sit_drill_src_$$"
DST_DB="sit_drill_dst_$$"
export BACKUP_DIR="${ROOT}/backups"
export BACKUP_STORAGE_DIR="${ROOT}/storage"
export BACKUP_KEEP=2
OFFSITE="${ROOT}/offsite"
mkdir -p "${BACKUP_DIR}" "${BACKUP_STORAGE_DIR}/evidence" "${OFFSITE}"

cleanup() {
  PGDATABASE=postgres psql -q -c "DROP DATABASE IF EXISTS ${SRC_DB}" > /dev/null 2>&1
  PGDATABASE=postgres psql -q -c "DROP DATABASE IF EXISTS ${DST_DB}" > /dev/null 2>&1
  rm -rf "${ROOT}"
}
trap cleanup EXIT

echo "[drill] preparando datos de prueba"
PGDATABASE=postgres psql -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${SRC_DB}" -c "CREATE DATABASE ${DST_DB}" || exit 2
export PGDATABASE="${SRC_DB}"
psql -q -v ON_ERROR_STOP=1 -c "CREATE TABLE evidencias(id int primary key, archivo text); INSERT INTO evidencias VALUES (1,'resolucion-RD-123.pdf'),(2,'acta-sesion.png');" || exit 2
printf '%%PDF-1.4 resolucion de aprobacion\n' > "${BACKUP_STORAGE_DIR}/evidence/resolucion-RD-123.pdf"
head -c 4096 /dev/urandom > "${BACKUP_STORAGE_DIR}/evidence/acta-sesion.png"

echo "[drill] 1. respaldo normal"
BACKUP_OFFSITE_DIR="${OFFSITE}" /usr/local/bin/backup.sh
ARCHIVE=$(ls -1 "${BACKUP_DIR}"/sit_backup_*.tar 2> /dev/null | head -n 1)
check "se publicó un respaldo" test -n "${ARCHIVE}"
check "el estado quedó en OK" grep -q ' OK ' "${BACKUP_DIR}/last_status"
check "hay copia externa verificada" test -f "${OFFSITE}/$(basename "${ARCHIVE}")"
check "no quedan archivos temporales" sh -c "! ls ${BACKUP_DIR}/.work-* ${BACKUP_DIR}/*.partial"

echo "[drill] 2. fallo de conexión: debe terminar con error y no publicar ni purgar nada"
sleep 1
BEFORE=$(ls -1 "${BACKUP_DIR}"/sit_backup_*.tar | wc -l)
PGPORT=1 PGHOST=127.0.0.1 BACKUP_KEEP=1 /usr/local/bin/backup.sh
RC=$?
check "sale con código distinto de 0" test "${RC}" -ne 0
check "el estado quedó en FAIL" grep -q ' FAIL ' "${BACKUP_DIR}/last_status"
check "no se publicó otro respaldo ni se purgó el existente" test "$(ls -1 "${BACKUP_DIR}"/sit_backup_*.tar | wc -l)" -eq "${BEFORE}"
check "el respaldo válido sigue intacto" tar -tf "${ARCHIVE}"

echo "[drill] 3. falta la carpeta de adjuntos: tampoco aparenta éxito"
BACKUP_STORAGE_DIR="${ROOT}/no-existe" /usr/local/bin/backup.sh
check "sale con error si faltan los adjuntos" test $? -ne 0

echo "[drill] 4. destino de copia externa ausente: se informa el fallo"
BACKUP_OFFSITE_DIR="${ROOT}/volumen-no-montado" /usr/local/bin/backup.sh
check "sale con error si la copia externa no existe" test $? -ne 0

echo "[drill] 5. retención: con KEEP=2 solo quedan los dos últimos"
sleep 1; /usr/local/bin/backup.sh > /dev/null
sleep 1; /usr/local/bin/backup.sh > /dev/null
check "quedan 2 respaldos" test "$(ls -1 "${BACKUP_DIR}"/sit_backup_*.tar | wc -l)" -eq 2

echo "[drill] 6. restauración en una base nueva con adjuntos accesibles"
LATEST=$(ls -1t "${BACKUP_DIR}"/sit_backup_*.tar | head -n 1)
RESTORED="${ROOT}/restored-storage"
RESTORE_CONFIRM=yes PGDATABASE="${DST_DB}" /usr/local/bin/restore.sh "${LATEST}" "${RESTORED}" > /dev/null
check "la base restaurada tiene los mismos registros" test "$(PGDATABASE="${DST_DB}" psql -At -c 'SELECT count(*) FROM evidencias')" = "2"
check "la resolución PDF es idéntica" cmp "${BACKUP_STORAGE_DIR}/evidence/resolucion-RD-123.pdf" "${RESTORED}/evidence/resolucion-RD-123.pdf"
check "la evidencia es idéntica" cmp "${BACKUP_STORAGE_DIR}/evidence/acta-sesion.png" "${RESTORED}/evidence/acta-sesion.png"

echo "[drill] 7. un respaldo alterado se rechaza antes de tocar la base"
cp "${LATEST}" "${ROOT}/alterado.tar"
mkdir "${ROOT}/x" && tar -xf "${ROOT}/alterado.tar" -C "${ROOT}/x" && printf 'basura' >> "${ROOT}/x/files.tar.gz" &&
  tar -cf "${ROOT}/alterado.tar" -C "${ROOT}/x" db.sql.gz files.tar.gz MANIFEST.sha256 INFO
RESTORE_CONFIRM=yes PGDATABASE="${DST_DB}" /usr/local/bin/restore.sh "${ROOT}/alterado.tar" > /dev/null 2>&1
check "la restauración de un respaldo alterado falla" test $? -ne 0
check "la base no se tocó" test "$(PGDATABASE="${DST_DB}" psql -At -c 'SELECT count(*) FROM evidencias')" = "2"
RESTORE_CONFIRM= PGDATABASE="${DST_DB}" /usr/local/bin/restore.sh "${LATEST}" > /dev/null 2>&1
check "sin RESTORE_CONFIRM=yes no restaura" test $? -ne 0

echo
echo "[drill] ${PASS} correctas, ${FAILED} fallidas"
[ "${FAILED}" -eq 0 ]
