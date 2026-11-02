#!/bin/bash
# Corridas para IMP-3. Cada corrida guarda registro completo (.log), reporte JSON (.json) y una línea en runs.csv.
S="<carpeta-de-resultados>"
cd /c/Proyects/Proyects/Tutoria-untrm/client
COMMIT=$(git rev-parse --short HEAD)
GROUP="src/shared/components/ui src/shared/hooks src/features/pedidos src/features/pendientes src/features/admin src/features/catalogos src/features/identidad src/features/periodo src/features/planificacion src/features/tutorados/pages"
FILE="src/features/pedidos/pages/DataRequestPage.test.tsx"
run() { # label, paths, extra args
  local label="$1" paths="$2"; shift 2
  local s=$(date -u +%FT%TZ)
  npx vitest run $paths "$@" --reporter=default --reporter=json --outputFile.json="$S/$label.json" > "$S/$label.log" 2>&1
  local rc=$?
  local e=$(date -u +%FT%TZ)
  echo "$label,$s,$e,$rc,$COMMIT,\"vitest run $paths $* --reporter=default --reporter=json\"" >> "$S/runs.csv"
}
for spec in "$@"; do
  kind="${spec%%:*}"; n="${spec##*:}"
  for i in $(seq 1 "$n"); do
    case "$kind" in
      iso)    run "iso-$i" "$FILE" ;;
      group)  run "group-$i" "$GROUP" ;;
      group2) run "group-w2-$i" "$GROUP" --maxWorkers=2 ;;
    esac
  done
done
echo "DONE,$(date -u +%FT%TZ),0,$COMMIT,batch" >> "$S/runs.csv"
