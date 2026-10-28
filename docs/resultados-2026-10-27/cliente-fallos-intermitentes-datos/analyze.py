import csv, glob, json, os, re, statistics as st, sys
D = 'C:/tmp/runs/flaky/'
runs = [r for r in csv.reader(open(D + 'runs.csv', encoding='utf-8')) if r and r[0] != 'DONE']
SUSPECT = {
    'InterviewFormModal': 'recorre el flujo completo',
    'SessionFormModal': 'confirma con el enlace de videollamada',
    'CycleTutorsPage': 'si el docente ya tiene otro ciclo',
    'SemesterReportPage': 'guarda lo editado',
    'ReportFilters': 'muestra los cinco controles',
    'UserManagementPage': 'ante el 409',
}


def load(label):
    p = D + label + '.json'
    if not os.path.exists(p):
        return None
    try:
        return json.load(open(p, encoding='utf-8'))
    except Exception:
        return None


def group(label):
    return re.sub(r'-\d+$', '', re.sub(r'^(iso)-[A-Za-z]+', r'\1', label)) if label.startswith('iso-') else re.sub(r'-\d+$', '', label)


rows = []
for r in runs:
    label, s, e = r[0], r[1], r[2]
    d = load(label)
    if not d:
        continue
    fails, tests = [], 0
    dur = {}
    for tr in d['testResults']:
        f = os.path.basename(tr['name'])
        for a in tr['assertionResults']:
            tests += 1
            key = (f, a['title'])
            dur[key] = a.get('duration')
            if a['status'] == 'failed':
                msg = (a.get('failureMessages') or [''])[0]
                kind = 'timeout5s' if ('timed out' in msg.lower() or 'STACK_TRACE_ERROR' in msg and (a.get('duration') or 0) > 4900) else ('findBy/waitFor' if ('Unable to find' in msg or 'waitFor' in msg or 'Timed out in waitFor' in msg) else 'other')
                fails.append((f, a['title'], round(a.get('duration') or 0), kind, msg[:90].replace('\n', ' ')))
    rows.append((label, group(label), s, e, tests, fails, dur))

print('=== por corrida ===')
for label, g, s, e, tests, fails, dur in rows:
    print(label, '| tests', tests, '| fallos', len(fails))
    for f in fails:
        print('   ', f)

print('\n=== por grupo: corridas, corridas con fallos, fallos totales ===')
agg = {}
for label, g, s, e, tests, fails, dur in rows:
    a = agg.setdefault(g, [0, 0, 0])
    a[0] += 1
    a[1] += 1 if fails else 0
    a[2] += len(fails)
for g, a in agg.items():
    print(g, a)

print('\n=== fallos por prueba y configuracion ===')
tab = {}
for label, g, s, e, tests, fails, dur in rows:
    gg = 'iso' if label.startswith('iso-') else g
    for f in fails:
        tab.setdefault((f[0], f[1][:60]), {}).setdefault(gg, []).append((f[3], f[2]))
for k, v in tab.items():
    print(k)
    for gg, items in v.items():
        print('    ', gg, len(items), items)

print('\n=== duracion de las pruebas sospechosas por configuracion (ms): min / mediana / max ===')
for fname, frag in SUSPECT.items():
    print(fname)
    byg = {}
    for label, g, s, e, tests, fails, dur in rows:
        gg = 'iso' if label.startswith('iso-') else g
        for (f, t), du in dur.items():
            if f.startswith(fname) and frag in t and du is not None:
                byg.setdefault(gg, []).append(du)
    for gg, v in byg.items():
        print('    %-16s n=%d  %6.0f / %6.0f / %6.0f' % (gg, len(v), min(v), st.median(v), max(v)))

print('\n=== primera prueba del archivo vs resto (iso, mediana ms) ===')
first = {}
for label, g, s, e, tests, fails, dur in rows:
    if not label.startswith('iso-'):
        continue
    d = load(label)
    for tr in d['testResults']:
        f = os.path.basename(tr['name']).replace('.test.tsx', '')
        ars = tr['assertionResults']
        for i, a in enumerate(ars):
            first.setdefault(f, {'first': [], 'rest': []})['first' if i == 0 else 'rest'].append(a.get('duration') or 0)
for f, v in first.items():
    print('%-22s primera %6.0f | resto %6.0f' % (f, st.median(v['first']), st.median(v['rest'])))

print('\n=== tiempo de pared y fases (s) por corrida completa ===')
for label, g, s, e, tests, fails, dur in rows:
    if label.startswith('full'):
        from datetime import datetime
        t0 = datetime.fromisoformat(s.replace('Z', '+00:00'))
        t1 = datetime.fromisoformat(e.replace('Z', '+00:00'))
        print(label, round((t1 - t0).total_seconds()), 's', 'fallos', len(fails))
