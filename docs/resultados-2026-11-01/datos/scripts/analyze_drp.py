import csv, json, os, sys, statistics as st
D = os.path.dirname(os.path.abspath(__file__)) + '/runs/'
TARGET = 'envía el pedido con los ciclos marcados'
rows = [r for r in csv.reader(open(D + 'runs.csv', encoding='utf-8')) if r and r[0] != 'DONE']
print('label | exit | files | tests | failed | target duration ms | failures')
agg = {}
dur = {}
for r in rows:
    label = r[0]
    p = D + label + '.json'
    if not os.path.exists(p):
        print(label, 'sin json'); continue
    d = json.load(open(p, encoding='utf-8'))
    fails = []
    tdur = None
    nfile = len(d['testResults'])
    for tr in d['testResults']:
        f = os.path.basename(tr['name'])
        for a in tr['assertionResults']:
            if TARGET in a['title'] and f.startswith('DataRequestPage'):
                tdur = a.get('duration')
            if a['status'] == 'failed':
                msg = (a.get('failureMessages') or [''])[0]
                fails.append((f, a['title'][:60], round(a.get('duration') or 0), msg[:110].replace('\n', ' ')))
        if tr['status'] == 'failed' and not any(True for a in tr['assertionResults'] if a['status'] == 'failed'):
            fails.append((f, 'ARCHIVO FALLIDO', 0, (tr.get('message') or '')[:110].replace('\n', ' ')))
    kind = label.rsplit('-', 1)[0]
    agg.setdefault(kind, [0, 0, 0])
    agg[kind][0] += 1
    agg[kind][1] += 1 if fails else 0
    agg[kind][2] += len(fails)
    if tdur is not None:
        dur.setdefault(kind, []).append(round(tdur))
    print(label, '|', r[3], '|', nfile, '|', d['numTotalTests'], '|', d['numFailedTests'], '|', tdur and round(tdur), '|', fails)
print('\nconfig: corridas, con fallos, fallos totales'); [print(' ', k, v) for k, v in agg.items()]
print('\nduración de la prueba objetivo por configuración (ms):')
for k, v in dur.items():
    print(' ', k, 'n=%d min=%d med=%d max=%d' % (len(v), min(v), st.median(v), max(v)), v)
