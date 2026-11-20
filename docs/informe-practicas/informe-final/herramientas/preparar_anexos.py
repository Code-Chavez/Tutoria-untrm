"""Genera los anexos del informe que se derivan de otras fuentes (no se escriben a mano):

  anexos/A-fichas-asistencia.md   las 120 filas de control de asistencia (del mismo calendario de fichas-asistencia/generar_fichas.py)
  anexos/B-diagramas.md           casos de uso, entidad-relación, diccionario de datos y clases (figuras de renderizar_diagramas.py)
  anexos/F-evidencias-pruebas.md  listado de las suites de extremo a extremo (de e2e/tests) con la evidencia de CI del corte

    python herramientas/preparar_anexos.py
"""
import importlib.util
import re
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


def main():
    ANEXOS.mkdir(exist_ok=True)
    anexo_a()
    anexo_b()
    anexo_f()


if __name__ == '__main__':
    main()
