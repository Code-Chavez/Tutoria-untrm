"""Genera el diagrama entidad-relación (Mermaid) a partir de `server/prisma/schema.prisma`, dividido por módulo.

El esquema es la fuente: nada se dibuja a mano. Cada tabla muestra sus columnas con el nombre real de la base de datos
(`@map`), su tipo, la clave primaria (PK), las claves foráneas (FK) y las únicas (UK). Cada relación sale de un campo con
`@relation(fields: [...], references: [...])`; es opcional (`|o`) cuando la clave foránea admite nulo.

    python generar_er.py            # reescribe ER_POR_MODULO.md
"""
import re
import subprocess
from pathlib import Path

AQUI = Path(__file__).parent
ESQUEMA = AQUI.parent.parent.parent / 'server' / 'prisma' / 'schema.prisma'
SALIDA = AQUI / 'ER_POR_MODULO.md'

MODULOS = [
    ('Acceso, cuentas y auditoría', 'ER-01', ['User', 'Role', 'UserAccessPolicy', 'Permission', 'RolePermission', 'RefreshToken', 'PasswordResetToken', 'AuditLog']),
    ('Estructura académica y configuración', 'ER-02', ['Faculty', 'Campus', 'School', 'SchoolCampus', 'AcademicPeriod', 'PeriodEnrollment', 'CatalogItem', 'SystemParameter', 'BrandingSetting']),
    ('Estudiantes y acompañamiento del tutor', 'ER-03', ['Student', 'TutorAssignmentHistory', 'TutorInterview', 'TutorFollowUp', 'SupportContact', 'StudentPeriodSnapshot', 'CycleTutorAssignment', 'DeclineNoticeAttempt', 'Admonition']),
    ('Solicitudes y sesiones de tutoría', 'ER-04', ['TutoringRequest', 'Session', 'SessionParticipant', 'SessionAttendance', 'SessionChangeHistory', 'SessionEvidence']),
    ('Derivaciones, avisos y documentos', 'ER-05', ['StudentReferral', 'ReferralStatusHistory', 'Notification', 'EmailOutbox', 'SignedDocument']),
    ('Evaluación, planes, informes y pedidos de listas', 'ER-06', ['TutorEvaluation', 'EvaluationWindow', 'WorkPlan', 'WorkPlanVersion', 'TutorSemesterReport', 'DataRequest']),
    ('Certificación del docente tutor (demostración)', 'ER-07', ['Certificate', 'CertificateEvidence', 'CertificateSequence', 'CertificateTemplate', 'CommitteeResolution', 'CertificateVisualAsset', 'CertificateSchoolSettings']),
]
TIPOS = {'String': 'string', 'Int': 'int', 'Boolean': 'boolean', 'DateTime': 'datetime', 'Json': 'json', 'Float': 'float', 'Decimal': 'decimal', 'BigInt': 'bigint', 'Bytes': 'bytes'}


def leer(texto):
    modelos = {}
    for m in re.finditer(r'^model (\w+) \{(.*?)^\}', texto, flags=re.S | re.M):
        nombre, cuerpo = m.group(1), m.group(2)
        campos, tabla, pk_compuesta = [], None, []
        for linea in cuerpo.splitlines():
            linea = linea.split('//')[0].strip()
            if not linea:
                continue
            if linea.startswith('@@map'):
                tabla = re.search(r'"([^"]+)"', linea).group(1)
            elif linea.startswith('@@id'):
                pk_compuesta = re.findall(r'\w+', re.search(r'\[(.*?)\]', linea).group(1))
            elif linea.startswith('@@'):
                continue
            else:
                partes = linea.split(None, 2)
                if len(partes) < 2:
                    continue
                campos.append({'nombre': partes[0], 'tipo': partes[1], 'attrs': partes[2] if len(partes) > 2 else ''})
        modelos[nombre] = {'tabla': tabla or nombre, 'campos': campos, 'pk_compuesta': pk_compuesta}
    return modelos


def columna(campo):
    m = re.search(r'@map\("([^"]+)"\)', campo['attrs'])
    return m.group(1) if m else campo['nombre']


def relaciones(modelos):
    salida = []
    for nombre, modelo in modelos.items():
        for campo in modelo['campos']:
            tipo = campo['tipo'].rstrip('?')
            if tipo not in modelos or '@relation' not in campo['attrs'] or 'fields:' not in campo['attrs']:
                continue
            fks = re.findall(r'\w+', re.search(r'fields:\s*\[(.*?)\]', campo['attrs']).group(1))
            opcional = campo['tipo'].endswith('?')
            salida.append({'hijo': nombre, 'padre': tipo, 'campo': campo['nombre'], 'fks': fks, 'opcional': opcional})
    return salida


def bloque(nombres, modelos, rels):
    lineas = ['erDiagram']
    fks_por_modelo = {n: {fk for r in rels if r['hijo'] == n for fk in r['fks']} for n in modelos}
    for nombre in nombres:
        modelo = modelos[nombre]
        lineas.append(f'    {nombre} {{')
        for campo in modelo['campos']:
            tipo = campo['tipo'].rstrip('?')
            base = tipo[:-2] if tipo.endswith('[]') else tipo
            if base in modelos:
                continue  # campo de relación, no una columna
            escalar = TIPOS.get(base, base)
            if tipo.endswith('[]'):
                escalar += '_arr'
            marcas = []
            if '@id' in campo['attrs'] or campo['nombre'] in modelo['pk_compuesta']:
                marcas.append('PK')
            if campo['nombre'] in fks_por_modelo[nombre]:
                marcas.append('FK')
            if '@unique' in campo['attrs']:
                marcas.append('UK')
            nulo = ' "nulo"' if campo['tipo'].endswith('?') else ''
            lineas.append(f'        {escalar} {columna(campo)}{(" " + ", ".join(marcas)) if marcas else ""}{nulo}')
        lineas.append('    }')
    enlaces = set()
    for r in rels:
        if r['hijo'] in nombres:
            enlaces.add((r['padre'], r['hijo'], r['campo'], r['opcional']))
    for padre, hijo, campo, opcional in sorted(enlaces):
        simbolo = '|o--o{' if opcional else '||--o{'
        lineas.append(f'    {padre} {simbolo} {hijo} : "{campo}"')
    return '\n'.join(lineas)


def commit_actual():
    try:
        return subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=AQUI, text=True).strip()
    except Exception:
        return 'desconocido'


def main():
    modelos = leer(ESQUEMA.read_text(encoding='utf-8'))
    cubiertos = [n for _, _, ns in MODULOS for n in ns]
    faltan = sorted(set(modelos) - set(cubiertos))
    sobran = sorted(set(cubiertos) - set(modelos))
    if faltan or sobran:
        raise SystemExit(f'Los módulos no cubren el esquema: faltan {faltan}, sobran {sobran}')
    rels = relaciones(modelos)
    partes = [
        '# Diagramas entidad-relación por módulo',
        '',
        f'**Fuente:** `server/prisma/schema.prisma` ({len(modelos)} tablas, {len(rels)} relaciones). **Referencia:** commit `{commit_actual()}`. **Estado:** actual (implementado). Generado con `generar_er.py`; no se edita a mano.',
        '',
        '**Cómo leerlos.** Cada recuadro es una tabla con sus columnas reales; `PK` es la clave primaria, `FK` una clave foránea, `UK` una columna única y `"nulo"` una columna que admite nulo. `||--o{` es «uno a muchos» obligatorio; `|o--o{` es «uno a muchos» donde la clave foránea puede ser nula. Una tabla de otro módulo aparece solo con el nombre cuando una relación la cruza.',
        '',
        '**Qué no es.** No es el diagrama de clases del dominio (ese se elabora aparte, por módulo). Tampoco muestra restricciones únicas compuestas ni índices.',
        '',
        '| ID | Módulo | Tablas |',
        '| --- | --- | --- |',
    ]
    for titulo, ident, nombres in MODULOS:
        partes.append(f'| {ident} | {titulo} | {len(nombres)} |')
    partes.append('')
    for titulo, ident, nombres in MODULOS:
        partes += [f'## {ident} · {titulo}', '', '| Modelo | Tabla |', '| --- | --- |']
        partes += [f'| `{n}` | `{modelos[n]["tabla"]}` |' for n in nombres]
        partes += ['', '```mermaid', bloque(nombres, modelos, rels), '```', '']
    SALIDA.write_text('\n'.join(partes), encoding='utf-8')
    print(f'{SALIDA.name}: {len(modelos)} tablas, {len(rels)} relaciones, {len(MODULOS)} diagramas')


if __name__ == '__main__':
    main()
