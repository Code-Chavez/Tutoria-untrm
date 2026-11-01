#!/bin/bash
D=/c/tmp/runs/drp
F=src/features/pedidos/pages/DataRequestPage.test.tsx
for i in 1 2 3 4 5; do $D/run.sh iso-$i $F; done
G="src/shared/components/ui src/shared/hooks src/features/pedidos src/features/pendientes src/features/admin src/features/catalogos src/features/identidad src/features/periodo src/features/planificacion src/features/tutorados/pages"
for i in 1 2 3; do $D/run.sh group-$i $G; done
for i in 1 2; do $D/run.sh full-$i; done
echo DONE >> $D/runs.csv
