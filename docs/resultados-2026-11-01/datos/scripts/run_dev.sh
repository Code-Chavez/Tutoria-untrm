#!/bin/bash
# Corridas sobre develop (12853b2) en un worktree. Uso: run_dev.sh <iso|stress4> <n>. Mata los procesos de carga por línea de comandos tras cada corrida.
S="<carpeta-de-resultados>"
cd /c/tmp/wt-imp3-docs/client
COMMIT=$(git rev-parse --short HEAD)
FILE="src/features/pedidos/pages/DataRequestPage.test.tsx"
KILL='Get-CimInstance Win32_Process -Filter "Name=''node.exe''" | Where-Object { $_.CommandLine -match ''while\(Date.now'' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }'
kind="$1"; n="$2"
for i in $(seq 1 "$n"); do
  powershell -NoProfile -Command "$KILL"
  if [ "$kind" = "stress4" ]; then for b in 1 2 3 4; do node -e "const t=Date.now();while(Date.now()-t<600000){}" & done; fi
  label="dev-$kind-$i"; s=$(date -u +%FT%TZ)
  npx vitest run $FILE --reporter=default --reporter=json --outputFile.json="$S/$label.json" > "$S/$label.log" 2>&1
  rc=$?; e=$(date -u +%FT%TZ)
  powershell -NoProfile -Command "$KILL"
  echo "$label,$s,$e,$rc,$COMMIT,\"vitest run $FILE --reporter=default --reporter=json ; carga: $([ "$kind" = stress4 ] && echo '4 procesos node en bucle (8 hilos lógicos), muertos tras cada corrida' || echo ninguna)\"" >> "$S/runs.csv"
done
echo "DONE,$(date -u +%FT%TZ),0,$COMMIT,dev-$kind" >> "$S/runs.csv"
