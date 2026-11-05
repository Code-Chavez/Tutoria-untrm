#!/bin/bash
# Archivo de IMP-3 aislado bajo carga de CPU artificial (N procesos node en bucle). Uso: run_stress.sh <hilos> <repeticiones>
S="<carpeta-de-resultados>"
cd /c/Proyects/Proyects/Tutoria-untrm/client
COMMIT=$(git rev-parse --short HEAD)
FILE="src/features/pedidos/pages/DataRequestPage.test.tsx"
BURN="$1"; REPS="$2"
for i in $(seq 1 "$REPS"); do
  PIDS=()
  for b in $(seq 1 "$BURN"); do node -e "const t=Date.now();while(Date.now()-t<900000){}" & PIDS+=($!); done
  label="stress$BURN-$i"
  s=$(date -u +%FT%TZ)
  npx vitest run $FILE --reporter=default --reporter=json --outputFile.json="$S/$label.json" > "$S/$label.log" 2>&1
  rc=$?
  e=$(date -u +%FT%TZ)
  for p in "${PIDS[@]}"; do kill $p 2>/dev/null; done
  wait 2>/dev/null
  echo "$label,$s,$e,$rc,$COMMIT,\"vitest run $FILE --reporter=default --reporter=json ; carga artificial: $BURN procesos node en bucle (8 hilos lógicos)\"" >> "$S/runs.csv"
done
echo "DONE,$(date -u +%FT%TZ),0,$COMMIT,stress-$BURN" >> "$S/runs.csv"
