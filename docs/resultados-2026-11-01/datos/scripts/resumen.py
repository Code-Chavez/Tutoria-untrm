# Resumen de las corridas de IMP-3. Uso: python -I resumen.py (desde la carpeta datos/)
import csv, glob, json, os, re, statistics as st
TARGET = 'envía el pedido con los ciclos marcados'
def resumen(carpeta, prefijos=None):
    filas = []
    for p in sorted(glob.glob(os.path.join(carpeta, '*.json'))):
        lab = os.path.basename(p)[:-5]
        if not re.match(r'^(iso|group|full|stress\d+|dev-\w+)-\d+$', lab):
            continue
        d = json.load(open(p, encoding='utf-8'))
        archivos = d['testResults']
        drp = [t for t in archivos if os.path.basename(t['name']).startswith('DataRequestPage')]
        fallas, objetivo, suma = [], None, None
        for t in archivos:
            f = os.path.basename(t['name']).replace('.test.tsx', '')
            for a in t['assertionResults']:
                if a['status'] == 'failed':
                    fallas.append((f, a['title'][:40], round(a['duration'] or 0)))
        if drp:
            at = drp[0]['assertionResults']
            suma = round(sum(a['duration'] or 0 for a in at) / 1000, 1)
            o = [a for a in at if TARGET in a['title']]
            objetivo = round(o[0]['duration']) if o else None
        filas.append((lab, len(archivos), d['numTotalTests'], d['numFailedTests'], objetivo, suma, fallas))
    return filas
for carpeta in ('corridas-de-esta-investigacion', 'corridas-previas-28-oct'):
    print('==', carpeta)
    print('%-14s %5s %6s %6s %9s %8s  fallas' % ('corrida', 'arch', 'pruebas', 'fallo', 'objetivo', 'suma_s'))
    for lab, na, nt, nf, o, s, f in resumen(carpeta):
        print('%-14s %5d %6d %6d %9s %8s  %s' % (lab, na, nt, nf, o, s, f if f else ''))
