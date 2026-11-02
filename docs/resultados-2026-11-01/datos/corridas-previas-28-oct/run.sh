#!/bin/bash
# uso: run.sh <etiqueta> <args de vitest...>   (se ejecuta en client/)
cd /c/Proyects/Proyects/Tutoria-untrm/client
label=$1; shift
s=$(date -u +%FT%TZ)
npx vitest run "$@" --reporter=default --reporter=json --outputFile.json=/c/tmp/runs/drp/$label.json > /c/tmp/runs/drp/$label.log 2>&1
code=$?
e=$(date -u +%FT%TZ)
echo "$label,$s,$e,$code,$(git rev-parse --short HEAD),npx vitest run $*" >> /c/tmp/runs/drp/runs.csv
