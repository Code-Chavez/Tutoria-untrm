"""Genera las fichas de asistencia de prácticas (Control de asistencia de prácticas pre profesionales, FISME-Bagua).

Parte de `plantilla_control_asistencia.docx` (el formato de la escuela: 7 hojas, 120 filas) y solo cambia lo que debe cambiar:
las fechas de las 120 filas, la salida de la tarde (17:00), el nombre del estudiante y un pie con el periodo y el bloque de visto bueno del encargado.
No se escribe ninguna hora, firma ni observación: eso lo registra y lo firma quien supervisa.

Calendario: lunes a viernes desde el inicio del plan (08/06/2026), 120 días, **descontando los feriados nacionales ciertos**
(29/06, 28/07, 29/07 y 08/10). Si el calendario cambia, se edita FERIADOS y se vuelve a generar:

    python generar_fichas.py [salida.docx]
"""
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

AQUI = Path(__file__).parent
PLANTILLA = AQUI / 'plantilla_control_asistencia.docx'
ESTUDIANTE = 'Brayni Chavez Caruajulca'
INICIO = date(2026, 6, 8)
DIAS = 120
FERIADOS = {
    date(2026, 6, 29): 'San Pedro y San Pablo',
    date(2026, 7, 28): 'Fiestas Patrias',
    date(2026, 7, 29): 'Fiestas Patrias',
    date(2026, 10, 8): 'Combate de Angamos',
}
NOMBRE_DIA = ['lun', 'mar', 'mié', 'jue', 'vie']
SALIDA_ANTERIOR = '18:00'  # horario impreso en la plantilla
SALIDA_TARDE = '17:00'  # horario acordado: la tarde termina a las 17:00


def dias_habiles() -> list[date]:
    fechas, dia = [], INICIO
    while len(fechas) < DIAS:
        if dia.weekday() < 5 and dia not in FERIADOS:
            fechas.append(dia)
        dia += timedelta(days=1)
    return fechas


def etiqueta(dia: date) -> str:
    return f'{NOMBRE_DIA[dia.weekday()]} {dia:%d/%m/%y}'


def generar(salida: Path) -> list[date]:
    fechas = dias_habiles()
    documento = docx.Document(str(PLANTILLA))
    patron = re.compile(r'^(lun|mar|mi.|jue|vie) \d\d/\d\d/\d\d$')

    # Las 120 fechas, en el orden en que aparecen las filas (una por celda de la columna «FECHA»).
    celdas = []
    for tabla in documento.tables:
        for fila in tabla.rows:
            for celda in fila.cells[1:2]:
                if patron.match(celda.text.strip()):
                    celdas.append(celda)
    if len(celdas) != DIAS:
        raise SystemExit(f'La plantilla debía tener {DIAS} fechas y tiene {len(celdas)}')
    # Horario programado: la salida de la tarde pasa de 18:00 a 17:00 en todas las filas de días.
    for celda in celdas:
        for hermana in celda._tc.getparent().iterchildren():
            for texto in hermana.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                if texto.text and texto.text.strip() == SALIDA_ANTERIOR:
                    texto.text = SALIDA_TARDE
    for celda, dia in zip(celdas, fechas):
        corrida = next(r for p in celda.paragraphs for r in p.runs if r.text.strip())
        corrida.text = etiqueta(dia)
        for otra in [r for p in celda.paragraphs for r in p.runs if r._r is not corrida._r]:
            otra.text = ''

    # Nombre del estudiante en la línea de puntos de cada hoja.
    for parrafo in documento.paragraphs:
        if parrafo.text.startswith('NOMBRE Y APELLIDOS'):
            punteada = [r for r in parrafo.runs if set(r.text.strip()) == {'.'}]
            for corrida in punteada:
                corrida.text = ESTUDIANTE
                corrida.font.underline = True

    # Pie de cada hoja: periodo y visto bueno del encargado (en blanco).
    pie = documento.sections[0].footer
    pie.is_linked_to_previous = False
    texto = pie.paragraphs[0] if pie.paragraphs else pie.add_paragraph()
    for corrida in list(texto.runs):
        corrida.text = ''
    feriados = ', '.join(f'{d:%d/%m}' for d in sorted(FERIADOS))
    lineas = [
        (f'Periodo: {fechas[0]:%d/%m/%Y} al {fechas[-1]:%d/%m/%Y} · {DIAS} días hábiles de lunes a viernes, sin los feriados nacionales {feriados}.', False),
        ('Visto bueno del encargado:   Nombre ____________________________   Cargo ____________________   Firma ________________   Sello', True),
    ]
    for indice, (linea, destacada) in enumerate(lineas):
        parrafo = texto if indice == 0 else pie.add_paragraph()
        parrafo.alignment = WD_ALIGN_PARAGRAPH.LEFT
        corrida = parrafo.add_run(linea)
        corrida.font.name = 'Arial'
        corrida.font.size = Pt(8)
        corrida.bold = destacada
    documento.save(str(salida))
    return fechas


if __name__ == '__main__':
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / 'Fichas_Asistencia_Brayni_Chavez_2026.docx'
    dias = generar(destino)
    print(f'{destino.name}: {len(dias)} días, del {dias[0]:%d/%m/%Y} al {dias[-1]:%d/%m/%Y}')
