"""Genera los anexos del informe que se derivan de otras fuentes (no se escriben a mano):

  anexos/A-fichas-asistencia.md   las 120 filas de control de asistencia (del mismo calendario de fichas-asistencia/generar_fichas.py)
  anexos/B-diagramas.md           casos de uso, entidad-relación, diccionario de datos y clases (figuras de renderizar_diagramas.py)
  anexos/F-evidencias-pruebas.md  listado de las suites de extremo a extremo (de e2e/tests) con la evidencia de CI del corte

    python herramientas/preparar_anexos.py
"""
import importlib.util
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BASE = AQUI.parent
RAIZ = BASE.parents[2]
ANEXOS = BASE / 'anexos'


def cargar_fichas():
    ruta = RAIZ / 'docs' / 'informe-practicas' / 'fichas-asistencia' / 'generar_fichas.py'
    especificacion = importlib.util.spec_from_file_location('generar_fichas', ruta)
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo


def anexo_a():
    fichas = cargar_fichas()
    fechas = fichas.dias_habiles()
    partes = [
        '# Anexo A. Fichas de control de asistencia de prácticas preprofesionales',
        '',
        f'Control de asistencia de las prácticas preprofesionales (formato de la FISME-Bagua) para los {len(fechas)} días hábiles del plan, de lunes a viernes, **del {fechas[0]:%d/%m/%Y} al {fechas[-1]:%d/%m/%Y}**, sin los feriados nacionales {", ".join(f"{d:%d/%m}" for d in sorted(fichas.FERIADOS))}. El horario programado es de 8:00 a 13:00 en el turno mañana y de 15:00 a 17:00 en el turno tarde. Las columnas de firma, las horas efectivas y las observaciones **se dejan en blanco**: las registra y las firma la persona encargada de la supervisión. Este anexo reproduce el formato; las fichas para imprimir y firmar son el archivo `Fichas_Asistencia_Brayni_Chavez_2026` (Word y PDF) de la carpeta `docs/informe-practicas/fichas-asistencia/`.',
        '',
        'Ninguna fila acredita asistencia: las horas efectivamente realizadas y la conformidad del supervisor siguen **pendientes de acreditar** (Anexo L).',
        '',
        '[[horizontal]]',
    ]
    por_hoja = 19
    for n in range(0, len(fechas), por_hoja):
        bloque = fechas[n:n + por_hoja]
        hoja = n // por_hoja + 1
        partes += [
            f'[[tabla: Hoja {hoja} de control de asistencia (días {n + 1} a {n + len(bloque)}, {bloque[0]:%d/%m/%Y} a {bloque[-1]:%d/%m/%Y})]]',
            '',
            '| N.° | Fecha | Mañana: ingreso | Firma | Mañana: salida | Firma | Tarde: ingreso | Firma | Tarde: salida | Firma | Observación |',
            '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
        ]
        for i, dia in enumerate(bloque, n + 1):
            partes.append(f'| {i} | {fichas.etiqueta(dia)} | 8:00 |  | 13:00 |  | 15:00 |  | 17:00 |  |  |')
        partes += [
            '',
            f'Total de días acumulados: {n + len(bloque)}. Visto bueno del encargado: nombre ____________________ cargo ____________________ firma ____________ sello ________',
            '',
        ]
    partes.append('[[vertical]]')
    (ANEXOS / 'A-fichas-asistencia.md').write_text('\n'.join(partes), encoding='utf-8')
    print(f'A: {len(fechas)} días, {-(-len(fechas) // por_hoja)} hojas')


def anexo_b():
    titulos_cu = dict(l.split('|', 1) for l in (BASE / 'figuras' / 'titulos_cu.txt').read_text(encoding='utf-8').splitlines())
    er = re.findall(r'^## (ER-\d+) · (.*)$', (RAIZ / 'docs' / 'diagramas' / 'entidad-relacion' / 'ER_POR_MODULO.md').read_text(encoding='utf-8'), flags=re.M)
    clases = {
        'cl-01': 'Acceso y auditoría', 'cl-02': 'Estructura académica y configuración', 'cl-03': 'Estudiantes y acompañamiento del tutor',
        'cl-04': 'Solicitudes y sesiones de tutoría', 'cl-05': 'Derivaciones, avisos y documentos', 'cl-06': 'Evaluación, planes e informes',
    }
    p = [
        '# Anexo B. Diagramas de diseño',
        '',
        'Este anexo reúne los diagramas que se generan desde las fuentes del proyecto: los casos de uso (de las fuentes PlantUML), el modelo entidad-relación y el diccionario de datos (del esquema de Prisma, 50 tablas) y las clases de dominio (de las entidades del servidor). Los demás diagramas de diseño (contexto, actividades, secuencia, estados, componentes y despliegue) están en el Capítulo V, junto al texto que los explica. Referencia: `develop` al 19/11/2026 (`v1.0.0-beta.4`). Estado: actual (implementado).',
        '',
        '## B.1 Diagramas de casos de uso',
        '',
        'Cada figura muestra los actores y los casos de uso de un grupo de funciones. El alcance de cada actor está restringido por rol, escuela, servicio y periodo. Los identificadores (por ejemplo AC01, PE04) son de la documentación de casos de uso y no son historias del Product Backlog.',
        '',
    ]
    for ident, titulo in titulos_cu.items():
        p += [f'![Casos de uso: {titulo}. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/{ident}.png)', '']
    p += [
        '[[horizontal]]',
        '## B.2 Modelo entidad-relación por módulo',
        '',
        'Cada figura muestra las tablas de un módulo con sus columnas de clave (PK clave primaria, FK clave foránea, UK única) y las relaciones entre ellas; una tabla de otro módulo aparece solo con su nombre. Todas las columnas están en el diccionario de datos (B.4). Las figuras se generan con un script a partir de `schema.prisma`, que falla si una tabla queda sin módulo.',
        '',
    ]
    for ident, titulo in er:
        p += [f'![Entidad-relación {ident}: {titulo}. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-{int(ident[3:]):02d}.png)', '']
    p += [
        '## B.3 Clases de dominio por módulo',
        '',
        'Las clases se generan desde las interfaces TypeScript de `server/src/domain/entities`; las asociaciones se infieren de los campos terminados en `Id` que apuntan a otra entidad del mismo diagrama. Muestran hasta 14 atributos por clase. No representan los módulos de certificación, pedidos de listas, asignación por ciclo ni amonestaciones, cuyos tipos viven junto a sus casos de uso; esos módulos se describen por su esquema de datos (B.2).',
        '',
    ]
    for ident, titulo in clases.items():
        p += [f'![Clases de dominio: {titulo}. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../figuras/{ident}.png)', '']
    p += ['[[vertical]]']
    p += ['[[incluir: ../../../diagramas/entidad-relacion/DICCIONARIO_DE_DATOS.md | 1 | B.4 Diccionario de datos]]']
    (ANEXOS / 'B-diagramas.md').write_text('\n'.join(p), encoding='utf-8')
    print(f'B: {len(titulos_cu)} casos de uso, {len(er)} ER, {len(clases)} clases')


DESCRIPCION_E2E = {
    '01': 'Acceso y menú por rol', '02': 'Solicitud de tutoría', '03': 'Sesiones y asistencia', '04': 'Derivación a un servicio',
    '05': 'Informes y exportaciones', '06': 'Plan semestral', '07': 'Evaluación de tutoría', '08': 'Administración',
    '09': 'Carga masiva y asignación', '10': 'Cierre de periodo', '11': 'Pedido de listas', '12': 'Tutor por ciclo y decano',
    '13': 'Carga de docentes', '14': 'De la solicitud a una sesión o derivación', '15': 'Correo institucional',
    '16': 'Borrador del estudiante', '17': 'Pendientes institucionales', '18': 'Accesibilidad', '19': 'Accesibilidad de la gestión',
    '20': 'Estados del docente', '21': 'Roles, permisos y alcance', '22': 'Estado en la URL y borradores', '23': 'Certificados: consulta',
    '24': 'Certificados: trámite', '25': 'Certificados: PDF', '26': 'Certificados: pantalla', '27': 'Certificados: calidad',
    '28': 'Docentes tutores', '29': 'Certificados: imágenes', '30': 'Volver a la vista anterior',
}


def anexo_f():
    suites = sorted((RAIZ / 'e2e' / 'tests').glob('e2e-*.spec.ts'))
    filas = []
    for archivo in suites:
        numero = archivo.name.split('-')[1]
        filas.append(f'| E2E-{numero} | {DESCRIPCION_E2E.get(numero, archivo.stem)} | `{archivo.name}` |')
    p = [
        '# Anexo F. Evidencias de pruebas',
        '',
        '## F.1 Integración continua del corte',
        '',
        'Ejecución de la integración continua sobre el commit `21b04d3` de `main` (etiqueta `v1.0.0-beta.4`, 19/11/2026), con todos los trabajos satisfactorios.',
        '',
        '[[tabla: Trabajos de la integración continua en el corte v1.0.0-beta.4]]',
        '',
        '| Trabajo | Resultado |',
        '| --- | --- |',
        '| Servidor: estilo, compilación, auditoría y pruebas | Satisfactorio: 1 709 pruebas en 183 conjuntos; cobertura de sentencias 90,96 % |',
        '| Cliente: estilo, tipos y compilación, auditoría y pruebas | Satisfactorio: 775 pruebas en 102 archivos; cobertura de sentencias 78,99 % |',
        '| Extremo a extremo con Playwright en Chrome | Satisfactorio: 141 aprobadas y 1 omitida (6,2 minutos) |',
        '| Ensayo de respaldo y restauración | Satisfactorio |',
        '| Construcción de imágenes Docker y migraciones | Satisfactorio (corre en los empujes a `develop` y `main`) |',
        '',
        '## F.2 Suites de extremo a extremo',
        '',
        f'El repositorio mantiene {len(suites)} suites de extremo a extremo con Playwright, cada una sobre un recorrido de usuario. La integración continua ejecuta en Chrome una selección (`test:ci`); Firefox y WebKit ejecutan una selección menor en cada solicitud de integración y de forma programada. Las suites de plan semestral (E2E-06) y de administración (E2E-08) están fuera de la selección de Chrome en la integración continua.',
        '',
        '[[tabla: Suites de extremo a extremo del repositorio]]',
        '',
        '| Suite | Recorrido | Archivo |',
        '| --- | --- | --- |',
        *filas,
        '',
        '## F.3 Pruebas de integración',
        '',
        'Las pruebas de integración y de permisos del servidor se ejecutan contra una base de datos real y exclusiva, que se niega a correr sobre la de desarrollo. El siguiente documento describe su organización.',
        '',
        '[[incluir: ../../../PRUEBAS_DE_INTEGRACION.md | 1]]',
    ]
    (ANEXOS / 'F-evidencias-pruebas.md').write_text('\n'.join(p), encoding='utf-8')
    print(f'F: {len(suites)} suites')


# ── Versión compacta (informe para empastar) ──────────────────────────────────────────────────────────────────────────
def cargar_er():
    ruta = RAIZ / 'docs' / 'diagramas' / 'entidad-relacion' / 'generar_er.py'
    especificacion = importlib.util.spec_from_file_location('generar_er', ruta)
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo


def anexo_a_compacto(destino):
    fichas = cargar_fichas()
    fechas = fichas.dias_habiles()
    por_hoja = 19
    p = [
        '# Anexo A. Fichas de control de asistencia de prácticas preprofesionales',
        '',
        f'Control de asistencia (formato de la FISME-Bagua) para los {len(fechas)} días hábiles del plan, de lunes a viernes, **del {fechas[0]:%d/%m/%Y} al {fechas[-1]:%d/%m/%Y}**, sin los feriados nacionales {", ".join(f"{d:%d/%m}" for d in sorted(fichas.FERIADOS))}. El horario programado es de 8:00 a 13:00 y de 15:00 a 17:00. Las columnas de firma, las horas efectivas y las observaciones **se dejan en blanco**: las registra y las firma la persona encargada. Este anexo reproduce el formato con la primera hoja y resume las siete; las fichas completas para imprimir y firmar son `Fichas_Asistencia_Brayni_Chavez_2026` (Word y PDF, `docs/informe-practicas/fichas-asistencia/`), cuyas copias firmadas se anexarán cuando existan. Ninguna fila acredita asistencia: las horas efectivas y la conformidad del supervisor siguen **pendientes de acreditar** (Anexo L).',
        '',
        '[[tabla: Las siete hojas de control de asistencia]]',
        '',
        '| Hoja | Días | Desde | Hasta |',
        '| --- | --- | --- | --- |',
    ]
    for n in range(0, len(fechas), por_hoja):
        bloque = fechas[n:n + por_hoja]
        p.append(f'| {n // por_hoja + 1} | {n + 1} a {n + len(bloque)} | {fichas.etiqueta(bloque[0])} | {fichas.etiqueta(bloque[-1])} |')
    bloque = fechas[:por_hoja]
    p += ['', '[[horizontal]]', f'[[tabla: Hoja 1 de control de asistencia (días 1 a {len(bloque)}); las demás tienen el mismo formato]]', '',
          '| N.° | Fecha | Mañana: ingreso | Firma | Mañana: salida | Firma | Tarde: ingreso | Firma | Tarde: salida | Firma | Observación |',
          '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for i, dia in enumerate(bloque, 1):
        p.append(f'| {i} | {fichas.etiqueta(dia)} | 8:00 |  | 13:00 |  | 15:00 |  | 17:00 |  |  |')
    p += ['', f'Total de días acumulados: {len(bloque)}. Visto bueno del encargado: nombre ____________________ cargo ____________________ firma ____________ sello ________', '', '[[vertical]]']
    (destino / 'A-fichas-asistencia.md').write_text('\n'.join(p), encoding='utf-8')


def abreviar(tipo):
    return {'string': 'str', 'boolean': 'bool', 'datetime': 'dt', 'int': 'int', 'float': 'float', 'json': 'json'}.get(tipo, tipo)


def anexo_b_compacto(destino):
    er = cargar_er()
    modelos = er.leer(er.ESQUEMA.read_text(encoding='utf-8'))
    rels = er.relaciones(modelos)
    fks = {n: {fk for r in rels if r['hijo'] == n for fk in r['fks']} for n in modelos}
    p = [
        '# Anexo B. Diagramas de diseño',
        '',
        'Casos de uso, modelo entidad-relación, clases de dominio y diccionario de datos del sistema, generados desde sus fuentes (fuentes PlantUML de los casos de uso, `schema.prisma` y las entidades del servidor). Los diagramas de contexto, actividades, secuencia, estados, componentes y despliegue están en el Capítulo V. Referencia: `develop` al 19/11/2026 (`v1.0.0-beta.4`). Estado: actual (implementado).',
        '',
        '## B.1 Casos de uso',
        '',
        'El detalle de cada grupo de funciones se presenta como matriz de actores y casos (● indica que el actor participa) y, al final, la vista general en un diagrama. Los identificadores (por ejemplo AC01, PE04) son de la documentación de casos de uso, no del Product Backlog. El alcance de cada actor está restringido por rol, escuela, servicio y periodo.',
        '',
    ]
    for i, archivo in enumerate(sorted((RAIZ / 'docs' / 'diagramas' / 'casos-de-uso').glob('*.puml')), 1):
        if i == 1:
            continue
        texto = archivo.read_text(encoding='utf-8')
        titulo = re.search(r'^title (.*)$', texto, flags=re.M).group(1)
        actores = {m.group(2): m.group(1) for m in re.finditer(r'^\s*actor "([^"]+)" as (\w+)', texto, flags=re.M)}
        casos = {m.group(2): m.group(1).replace('\\n', ' ') for m in re.finditer(r'^\s*usecase "([^"]+)" as (\w+)', texto, flags=re.M)}
        enlaces = {(m.group(1), m.group(2)) for m in re.finditer(r'^\s*(\w+)\s+--\s+(\w+)\s*$', texto, flags=re.M)}
        p += [f'[[tabla: Casos de uso: {titulo}]]', '', '| Caso de uso | ' + ' | '.join(actores.values()) + ' |', '| --- | ' + ' | '.join('---' for _ in actores) + ' |']
        for clave, nombre in casos.items():
            marcas = ['●' if (a, clave) in enlaces else '' for a in actores]
            p.append(f'| {nombre} | ' + ' | '.join(marcas) + ' |')
        p.append('')
    p += ['![Casos de uso: vista general. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../../figuras/cu-01.png){w=3.3}', '']
    anchos = {'er-01': 8.2, 'er-02': 7.4, 'er-03': 7.8, 'er-04': 8.0, 'er-05': 7.2, 'er-06': 8.4, 'er-07': 8.6}
    titulos_er = re.findall(r'^## (ER-\d+) · (.*)$', (RAIZ / 'docs' / 'diagramas' / 'entidad-relacion' / 'ER_POR_MODULO.md').read_text(encoding='utf-8'), flags=re.M)
    p += ['[[horizontal]]', '## B.2 Modelo entidad-relación por módulo', '',
          'Cada figura muestra las tablas de un módulo con sus columnas de clave (PK primaria, FK foránea, UK única) y sus relaciones; las demás columnas están en el diccionario (B.4). Se generan con un script desde `schema.prisma`, que falla si una tabla queda sin módulo (50 tablas y 92 relaciones).', '']
    for ident, titulo in titulos_er:
        n = int(ident[3:])
        ancho = anchos.get(f'er-{n:02d}', 8.4)
        p += [f'![Entidad-relación {ident}: {titulo}. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../../figuras/er-{n:02d}.png){{w={ancho}}}', '']
    clases = [('cl-01', 'Acceso y auditoría', 5.4), ('cl-03', 'Estudiantes y acompañamiento del tutor', 6.4), ('cl-02', 'Estructura académica y configuración', 5.6),
              ('cl-05', 'Derivaciones, avisos y documentos', 8.2), ('cl-04', 'Solicitudes y sesiones de tutoría', 8.4), ('cl-06', 'Evaluación, planes e informes', 7.0)]
    p += ['## B.3 Clases de dominio por módulo', '',
          'Generadas desde las interfaces de `server/src/domain/entities`; las asociaciones se infieren de los campos terminados en `Id` que apuntan a otra entidad del diagrama y se muestran hasta 14 atributos por clase. No incluyen certificación, pedidos de listas, asignación por ciclo ni amonestaciones, cuyos tipos viven junto a sus casos de uso (ver B.2).', '']
    for ident, titulo, ancho in clases:
        p += [f'![Clases de dominio: {titulo}. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../../figuras/{ident}.png){{w={ancho}}}', '']
    p += ['[[vertical]]', '## B.4 Diccionario de datos', '',
          'Las 50 tablas con sus columnas reales: `nombre tipo` (str texto, int entero, bool lógico, dt fecha y hora), `[PK]` clave primaria, `[FK]` foránea, `[UK]` única y `?` si admite nulo. Valores por defecto y restricciones: en `schema.prisma`. Generado con `generar_er.py` desde el esquema.', '',
          '[[tabla: Diccionario de datos por tabla]]', '', '| Tabla | Columnas |', '| --- | --- |']
    for titulo, ident, nombres in er.MODULOS:
        for nombre in nombres:
            modelo = modelos[nombre]
            columnas = []
            for campo in modelo['campos']:
                tipo = campo['tipo'].rstrip('?')
                base = tipo[:-2] if tipo.endswith('[]') else tipo
                if base in modelos:
                    continue
                marcas = ''
                if '@id' in campo['attrs'] or campo['nombre'] in modelo['pk_compuesta']:
                    marcas += '[PK]'
                if campo['nombre'] in fks[nombre]:
                    marcas += '[FK]'
                if '@unique' in campo['attrs']:
                    marcas += '[UK]'
                legible = abreviar(er.TIPOS.get(base, base)) + ('[]' if tipo.endswith('[]') else '')
                columnas.append(f'{er.columna(campo)} {legible}{marcas}{"?" if campo["tipo"].endswith("?") else ""}')
            p.append(f'| **{modelo["tabla"]}** ({ident}) | ' + ', '.join(columnas) + ' |')
    (destino / 'B-diagramas.md').write_text('\n'.join(p), encoding='utf-8')


def anexo_f_compacto(destino):
    suites = sorted((RAIZ / 'e2e' / 'tests').glob('e2e-*.spec.ts'))
    filas = []
    mitad = (len(suites) + 1) // 2
    for k in range(mitad):
        izq = suites[k]
        der = suites[k + mitad] if k + mitad < len(suites) else None
        n1 = izq.name.split('-')[1]
        n2 = der.name.split('-')[1] if der else ''
        filas.append(f'| E2E-{n1} | {DESCRIPCION_E2E.get(n1, izq.stem)} | ' + (f'E2E-{n2} | {DESCRIPCION_E2E.get(n2, der.stem)} |' if der else ' |  |'))
    p = [
        '# Anexo F. Evidencias de pruebas',
        '',
        '## F.1 Integración continua del corte',
        '',
        'Ejecución sobre el commit `21b04d3` de `main` (etiqueta `v1.0.0-beta.4`, 19/11/2026), con todos los trabajos satisfactorios, y cifras de las versiones anteriores para comparar.',
        '',
        '[[tabla: Resultados de la integración continua por versión]]',
        '',
        '| Verificación | v1.0.0-beta.4 (19/11/2026) | v1.0.0-beta.3 (16/11/2026) | Informe anterior (11/10/2026) |',
        '| --- | --- | --- | --- |',
        '| Servidor: pruebas | 1 709 en 183 conjuntos; cobertura de sentencias 90,96 % | 1 704 en 183 conjuntos; 90,95 % | 689 |',
        '| Cliente: pruebas | 775 en 102 archivos; 78,99 % | 766 en 102 archivos; 78,75 % | 299 |',
        '| Extremo a extremo en Chrome | 141 aprobadas, 1 omitida (6,2 min) | 141 aprobadas, 1 omitida | 8 recorridos manuales |',
        '| Estilo, tipos y compilación | Satisfactorio | Satisfactorio | — |',
        '| Auditoría de dependencias | Cliente sin avisos; servidor con una advertencia moderada ignorada | Igual | — |',
        '| Ensayo de respaldo y restauración | Satisfactorio | Satisfactorio | — |',
        '| Imágenes Docker y migraciones | Satisfactorio (solo en `push` a `develop` y `main`) | Satisfactorio | — |',
        '',
        '## F.2 Suites de extremo a extremo',
        '',
        f'El repositorio mantiene {len(suites)} suites de extremo a extremo con Playwright, una por recorrido de usuario. La integración continua ejecuta en Chrome una selección (`test:ci`); Firefox y WebKit ejecutan una selección menor en cada solicitud de integración y de forma programada. Las suites de plan semestral (E2E-06) y de administración (E2E-08) están fuera de la selección de Chrome.',
        '',
        '[[tabla: Suites de extremo a extremo del repositorio]]',
        '',
        '| Suite | Recorrido | Suite | Recorrido |',
        '| --- | --- | --- | --- |',
        *filas,
        '',
        '## F.3 Pruebas de integración y de permisos',
        '',
        'Las pruebas de integración del servidor usan HTTP y una base de datos real y **exclusiva**: se niegan a correr si la base no termina en `_test`, nunca tocan la de desarrollo y cada corrida registra el origen de las filas que escribe y borra solo lo que creó; al terminar, una verificación final hace fallar la corrida si quedó algún resto. La matriz de acceso por rol (`accessMatrix`) y el recorrido de todas las rutas registradas exigiendo sesión (`routeProtection`) forman parte de esa suite. Procedimiento completo: `docs/PRUEBAS_DE_INTEGRACION.md`.',
    ]
    (destino / 'F-evidencias-pruebas.md').write_text('\n'.join(p), encoding='utf-8')


def main():
    if '--compacto' in sys.argv:
        destino = BASE / 'compacto' / 'anexos'
        destino.mkdir(parents=True, exist_ok=True)
        anexo_a_compacto(destino)
        anexo_b_compacto(destino)
        anexo_f_compacto(destino)
        print('anexos compactos A, B y F generados')
        return
    ANEXOS.mkdir(exist_ok=True)
    anexo_a()
    anexo_b()
    anexo_f()


if __name__ == '__main__':
    main()
