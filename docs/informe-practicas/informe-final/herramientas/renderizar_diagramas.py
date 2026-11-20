"""Renderiza a PNG todas las figuras del informe a partir de sus fuentes (nada se dibuja a mano aparte de los .md de diseño).

Requisitos: Node.js y Chrome. Instala una vez el renderizador fuera del repositorio:
    mkdir C:/tmp/mmdc && cd C:/tmp/mmdc && npm init -y && PUPPETEER_SKIP_DOWNLOAD=1 npm install @mermaid-js/mermaid-cli@11.4.2
y define MMDC_DIR (por omisión C:/tmp/mmdc) y CHROME (por omisión la ruta estándar de Chrome en Windows).

    python herramientas/renderizar_diagramas.py

Salida en `figuras/` (se regenera; no se versiona):
  cu-01..08.png  casos de uso (de docs/diagramas/casos-de-uso/*.puml)
  er-01..07.png  entidad-relación (de docs/diagramas/entidad-relacion/ER_POR_MODULO.md)
  cl-01..06.png  clases de dominio (de server/src/domain/entities/*.ts)
  dd-*.png       contexto, actividades, secuencias, estados, componentes y despliegue (de docs/diagramas/DIAGRAMAS_DISENO.md)
"""
import os
import re
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[3]
FIGURAS = AQUI.parent / 'figuras'
TMP = FIGURAS / '_mmd'
MMDC = Path(os.environ.get('MMDC_DIR', 'C:/tmp/mmdc'))
CHROME = os.environ.get('CHROME', 'C:/Program Files/Google/Chrome/Application/chrome.exe')

ENTIDADES = RAIZ / 'server' / 'src' / 'domain' / 'entities'
MODULOS_CLASES = [
    ('cl-01', 'Acceso y auditoría', ['User', 'Role', 'Permission', 'UserAccessPolicy', 'RefreshToken', 'PasswordResetToken', 'AuditLog']),
    ('cl-02', 'Estructura académica y configuración', ['Faculty', 'Campus', 'School', 'AcademicPeriod', 'SystemParameter', 'BrandingSettings']),
    ('cl-03', 'Estudiantes y acompañamiento del tutor', ['Student', 'TutorAssignmentHistory', 'TutorInterview', 'TutorFollowUp', 'SupportContact']),
    ('cl-04', 'Solicitudes y sesiones de tutoría', ['TutoringRequest', 'Session', 'SessionParticipant', 'SessionAttendance', 'SessionChangeHistory', 'SessionEvidence']),
    ('cl-05', 'Derivaciones, avisos y documentos', ['StudentReferral', 'ReferralStatusHistory', 'Notification', 'SignedDocument']),
    ('cl-06', 'Evaluación, planes e informes', ['TutorEvaluation', 'EvaluationWindow', 'WorkPlan', 'WorkPlanVersion', 'TutorSemesterReport']),
]
# Campos *Id que apuntan a otra entidad con otro nombre.
ALIAS_ID = {
    'userId': 'User', 'tutorId': 'User', 'createdById': 'User', 'requestedById': 'User', 'changedById': 'User', 'routedToId': 'User',
    'handledById': 'User', 'coordinatorId': 'User', 'reviewedById': 'User', 'uploadedById': 'User', 'conductedById': 'User',
    'periodId': 'AcademicPeriod', 'roleId': 'Role', 'permissionId': 'Permission',
}


def mmdc(origen: Path, destino: Path, escala=2, ancho=1800):
    configuracion = TMP / 'puppeteer.json'
    configuracion.write_text('{"executablePath": "%s", "args": ["--no-sandbox"]}' % CHROME, encoding='utf-8')
    comando = ['npx', 'mmdc', '-i', str(origen), '-o', str(destino), '-p', str(configuracion), '-s', str(escala), '-w', str(ancho), '-b', 'white']
    resultado = subprocess.run(comando, cwd=MMDC, capture_output=True, text=True, shell=(os.name == 'nt'))
    if resultado.returncode != 0 or not destino.exists():
        print(f'  ERROR en {destino.name}: {(resultado.stderr or resultado.stdout)[-300:]}', file=sys.stderr)
        return False
    return True


def renderizar(nombre: str, codigo: str, **kw):
    origen = TMP / f'{nombre}.mmd'
    origen.write_text(codigo, encoding='utf-8')
    ok = mmdc(origen, FIGURAS / f'{nombre}.png', **kw)
    print(f'  {"ok" if ok else "FALLÓ"}  {nombre}')
    return ok


# ── Casos de uso: .puml → flujo Mermaid ─────────────────────────────────────────────────────────────────────────────
def puml_a_mermaid(texto: str) -> str:
    titulo = re.search(r'^title (.*)$', texto, flags=re.M)
    actores, casos, enlaces = {}, {}, []
    for m in re.finditer(r'^\s*actor "([^"]+)" as (\w+)', texto, flags=re.M):
        actores[m.group(2)] = m.group(1)
    for m in re.finditer(r'^\s*usecase "([^"]+)" as (\w+)', texto, flags=re.M):
        casos[m.group(2)] = m.group(1).replace('\\n', ' · ')
    for m in re.finditer(r'^\s*(\w+)\s+--\s+(\w+)\s*$', texto, flags=re.M):
        enlaces.append((m.group(1), m.group(2)))
    lineas = ['flowchart LR']
    for clave, nombre in actores.items():
        lineas.append(f'    {clave}(["{nombre}"])')
    lineas.append('    subgraph sit["SIT UNTRM"]')
    lineas.append('        direction TB')
    for clave, nombre in casos.items():
        lineas.append(f'        {clave}["{nombre}"]')
    lineas.append('    end')
    for a_, c in enlaces:
        lineas.append(f'    {a_} --- {c}')
    lineas.append('    classDef caso fill:#eef3fb,stroke:#44546a')
    lineas.append(f'    class {",".join(casos)} caso')
    return '\n'.join(lineas)


def casos_de_uso():
    print('Casos de uso')
    titulos = {}
    for i, archivo in enumerate(sorted((RAIZ / 'docs' / 'diagramas' / 'casos-de-uso').glob('*.puml')), 1):
        texto = archivo.read_text(encoding='utf-8')
        renderizar(f'cu-{i:02d}', puml_a_mermaid(texto), ancho=2200)
        titulos[f'cu-{i:02d}'] = re.search(r'^title (.*)$', texto, flags=re.M).group(1)
    (FIGURAS / 'titulos_cu.txt').write_text('\n'.join(f'{k}|{v}' for k, v in titulos.items()), encoding='utf-8')


# ── Entidad-relación ────────────────────────────────────────────────────────────────────────────────────────────────
def compactar(bloque: str) -> str:
    """En la figura solo van las columnas de clave (PK, FK, UK); todas las columnas están en el diccionario de datos."""
    salida = []
    dentro = False
    for linea in bloque.splitlines():
        if linea.rstrip().endswith('{'):
            dentro = True
        elif linea.strip() == '}':
            dentro = False
        elif dentro and not re.search(r'\b(PK|FK|UK)\b', linea):
            continue
        salida.append(linea)
    return '\n'.join(salida)


def entidad_relacion():
    print('Entidad-relación')
    texto = (RAIZ / 'docs' / 'diagramas' / 'entidad-relacion' / 'ER_POR_MODULO.md').read_text(encoding='utf-8')
    for i, bloque in enumerate(re.findall(r'```mermaid\n(.*?)\n```', texto, flags=re.S), 1):
        renderizar(f'er-{i:02d}', compactar(bloque), ancho=2400)


# ── Clases de dominio: interfaces TypeScript → classDiagram ─────────────────────────────────────────────────────────
def leer_interfaces():
    interfaces = {}
    for archivo in sorted(ENTIDADES.glob('*.ts')):
        texto = archivo.read_text(encoding='utf-8')
        for m in re.finditer(r'export interface (\w+)(?: extends ([\w, <>\']+))? \{(.*?)^\}', texto, flags=re.S | re.M):
            campos = []
            for linea in m.group(3).splitlines():
                linea = linea.split('//')[0].strip()
                campo = re.match(r'^(\w+)(\?)?:\s*(.+?);?$', linea)
                if campo:
                    campos.append((campo.group(1), campo.group(3).rstrip(';').strip(), bool(campo.group(2))))
            interfaces[m.group(1)] = campos
    return interfaces


def tipo_corto(tipo: str) -> str:
    if "'" in tipo:
        return 'enum'
    tipo = re.sub(r'\s+', ' ', tipo).replace('|', '/').replace('<', '~').replace('>', '~').replace('"', '')
    tipo = tipo.replace(' / null', '?').replace('null / ', '?')
    return tipo[:34]


def clases():
    print('Clases de dominio')
    interfaces = leer_interfaces()
    for ident, titulo, nombres in MODULOS_CLASES:
        lineas = ['classDiagram']
        presentes = [n for n in nombres if n in interfaces]
        for nombre in presentes:
            lineas.append(f'    class {nombre} {{')
            for campo, tipo, opcional in interfaces[nombre][:14]:
                lineas.append(f'        +{tipo_corto(tipo)}{"?" if opcional and not tipo_corto(tipo).endswith("?") else ""} {campo}')
            if len(interfaces[nombre]) > 14:
                lineas.append(f'        +… {len(interfaces[nombre]) - 14} atributos más')
            lineas.append('    }')
        relaciones = set()
        for nombre in presentes:
            for campo, _, _ in interfaces[nombre]:
                if not campo.endswith('Id') or campo == 'id':
                    continue
                destino = ALIAS_ID.get(campo) or campo[:-2][:1].upper() + campo[:-2][1:]
                if destino in presentes and destino != nombre:
                    relaciones.add((nombre, destino, campo))
        for origen, destino, campo in sorted(relaciones):
            lineas.append(f'    {origen} --> {destino} : {campo}')
        renderizar(ident, '\n'.join(lineas), ancho=2200)
    cubiertas = {n for _, _, ns in MODULOS_CLASES for n in ns}
    otras = sorted(set(interfaces) - cubiertas)
    (FIGURAS / 'clases_no_dibujadas.txt').write_text('\n'.join(otras), encoding='utf-8')


# ── Diagramas de diseño dibujados a mano (DIAGRAMAS_DISENO.md) ──────────────────────────────────────────────────────
def diseno():
    print('Diseño')
    texto = (RAIZ / 'docs' / 'diagramas' / 'DIAGRAMAS_DISENO.md').read_text(encoding='utf-8')
    for m in re.finditer(r'^## (DOC-D\d+\w*) · (.*?)\n(.*?)```mermaid\n(.*?)\n```', texto, flags=re.S | re.M):
        ident = m.group(1).lower().replace('doc-', 'dd-')
        renderizar(ident, m.group(4), ancho=1800 if 'sequence' in m.group(4)[:20] else 1600)


def main():
    FIGURAS.mkdir(exist_ok=True)
    TMP.mkdir(exist_ok=True)
    if not (MMDC / 'node_modules').exists():
        raise SystemExit(f'Falta instalar mermaid-cli en {MMDC} (ver el encabezado de este archivo)')
    casos_de_uso()
    entidad_relacion()
    clases()
    diseno()


if __name__ == '__main__':
    main()
