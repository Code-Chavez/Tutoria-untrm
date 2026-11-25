"""Genera el informe final de prácticas (Word) a partir de los capítulos y anexos en Markdown.

    python generar_informe_final.py            # escribe Informe_Final_Practicas_Brayni_Chavez.docx

Antes: `python herramientas/renderizar_diagramas.py` (figuras PNG en `figuras/`) y `python herramientas/preparar_anexos.py`.
Después: `herramientas/actualizar_word.ps1` (actualiza índices y campos en Word y exporta el PDF).

Convenciones del Markdown de cada archivo:
  # Título          Capítulo o anexo (Título 1, salto de página)       ## / ### / ####  Títulos 2 a 4
  [[tabla: Título]] Leyenda numerada de la tabla que sigue             ![texto](ruta)   Figura con leyenda numerada
  [[fuente: texto]] Línea «Fuente:» bajo una tabla o figura            [[salto]]        Salto de página
  [[referencias]]   Lo que sigue lleva sangría francesa (APA 7)       [[horizontal]] / [[vertical]]  Orientación de la hoja        [[incluir: ruta | desplazamiento]]  Inserta otro .md
"""
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / 'Informe_Final_Practicas_Brayni_Chavez.docx'
LOGO = AQUI / 'assets' / 'logo_untrm.png'
ESCUDO = AQUI / 'assets' / 'escudo_untrm.png'  # el del acta de visto bueno: va solo en la carátula
# Parámetros de maquetación. El modo --compacto (informe para empastar, con menos páginas) los cambia sin tocar el resto del código.
CONF = {
    'fuente': AQUI, 'salida': SALIDA,
    'interlineado': 1.5, 'espacio_post': 6, 'sangria': 0.4, 'interlineado_lista': 1.3, 'espacio_ref': 8,
    'margen_izq': 1.1, 'margen_der': 1.1, 'margen_sup': 1.0, 'margen_inf': 1.0,
    'tam_texto': 12, 'tam_tabla': 10, 'tam_tabla_ancha': 9,
    'ancho_vert': 6.3, 'alto_vert': 8.0, 'ancho_horiz': 9.0, 'alto_horiz': 5.9,
}
COMPACTO = {
    'fuente': AQUI / 'compacto', 'salida': AQUI / 'Informe_Final_Practicas_Brayni_Chavez_Compacto.docx',
    'interlineado': 1.2, 'espacio_post': 4, 'sangria': 0.3, 'interlineado_lista': 1.1, 'espacio_ref': 5,
    'margen_izq': 1.4, 'margen_der': 0.9, 'margen_sup': 1.0, 'margen_inf': 0.9,
    'tam_texto': 11.5, 'tam_tabla': 9, 'tam_tabla_ancha': 8.5,
    'ancho_vert': 5.9, 'alto_vert': 8.4, 'ancho_horiz': 8.6, 'alto_horiz': 5.9,
}

CARATULA = {
    'universidad': 'UNIVERSIDAD NACIONAL TORIBIO RODRÍGUEZ DE MENDOZA DE AMAZONAS',
    'facultad': 'FACULTAD DE INGENIERÍA DE SISTEMAS Y MECÁNICA ELÉCTRICA',
    'escuela': 'ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS',
    'tipo': 'INFORME DE PRÁCTICAS PREPROFESIONALES',
    'titulo': 'Sistema de información para la sistematización de los procesos de acompañamiento de tutoría universitaria de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica',
    'autor': 'Brayni Chavez Caruajulca',
    'asesor': 'Mg. Eder Nicanor Figueroa Piscoya',
    'lugar': 'Bagua, Amazonas, Perú',
    'anio': '2026',
    'nota': 'Versión final de trabajo · Software v1.0.0 · Corte del 25 de noviembre de 2026',
}

# Orden del documento: (tipo, ruta relativa a esta carpeta). `incluir` toma un .md de fuera y desplaza sus títulos.
PARTES = [
    ('preliminar', 'capitulos/00-resumen.md'),
    ('indices', None),
    ('cuerpo', 'capitulos/01-introduccion.md'),
    ('cuerpo', 'capitulos/02-marco-teorico.md'),
    ('cuerpo', 'capitulos/03-diagnostico.md'),
    ('cuerpo', 'capitulos/04-metodologia.md'),
    ('cuerpo', 'capitulos/05-desarrollo.md'),
    ('cuerpo', 'capitulos/06-pruebas-resultados.md'),
    ('cuerpo', 'capitulos/07-conclusiones.md'),
    ('cuerpo', 'capitulos/08-referencias.md'),
    ('cuerpo', 'anexos/A-fichas-asistencia.md'),
    ('cuerpo', 'anexos/B-diagramas.md'),
    ('cuerpo', 'anexos/C-trazabilidad.md'),
    ('cuerpo', 'anexos/D-manual-usuario.md'),
    ('cuerpo', 'anexos/E-manual-sistema.md'),
    ('cuerpo', 'anexos/F-evidencias-pruebas.md'),
    ('cuerpo', 'anexos/G-capturas.md'),
    ('cuerpo', 'anexos/H-ensayo-piloto.md'),
    ('cuerpo', 'anexos/I-seguridad-auditoria.md'),
    ('cuerpo', 'anexos/J-versiones.md'),
    ('cuerpo', 'anexos/K-glosario.md'),
    ('cuerpo', 'anexos/L-pendientes.md'),
]

documento = Document()
contador = {'Tabla': 0, 'Figura': 0}
estado = {'sangria_francesa': False, 'leyenda_tabla': None, 'ancho': 6.3, 'alto': 8.0}  # ancho y alto se fijan en main()


# ── Estilos y utilidades de bajo nivel ──────────────────────────────────────────────────────────────────────────────
def configurar_estilos():
    normal = documento.styles['Normal']
    normal.font.name = 'Times New Roman'
    normal.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    normal.font.size = Pt(CONF['tam_texto'])
    normal.paragraph_format.space_after = Pt(CONF['espacio_post'])
    normal.paragraph_format.line_spacing = CONF['interlineado']
    for nombre, tam, antes in [('Heading 1', 16, 0), ('Heading 2', 14, 14), ('Heading 3', 12, 12), ('Heading 4', 12, 10)]:
        estilo = documento.styles[nombre]
        estilo.font.name = 'Times New Roman'
        estilo.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
        estilo.element.rPr.rFonts.set(qn('w:ascii'), 'Times New Roman')
        estilo.element.rPr.rFonts.set(qn('w:hAnsi'), 'Times New Roman')
        for atributo in ('w:asciiTheme', 'w:hAnsiTheme', 'w:eastAsiaTheme', 'w:cstheme'):
            estilo.element.rPr.rFonts.attrib.pop(qn(atributo), None)
        estilo.font.size = Pt(tam)
        estilo.font.bold = True
        estilo.font.italic = nombre == 'Heading 4'
        estilo.font.color.rgb = RGBColor(0, 0, 0)
        estilo.paragraph_format.space_before = Pt(antes)
        estilo.paragraph_format.space_after = Pt(8)
        estilo.paragraph_format.keep_with_next = True
        estilo.paragraph_format.line_spacing = 1.15
    for nombre in ['List Bullet', 'List Bullet 2']:
        documento.styles[nombre].font.name = 'Times New Roman'
        documento.styles[nombre].paragraph_format.line_spacing = CONF['interlineado_lista']
    caption = documento.styles['Caption']
    caption.font.name = 'Times New Roman'
    caption.font.size = Pt(11)
    caption.font.bold = True
    caption.font.italic = False
    caption.font.color.rgb = RGBColor(0, 0, 0)
    caption.paragraph_format.space_before = Pt(6)
    caption.paragraph_format.space_after = Pt(4)
    caption.paragraph_format.keep_with_next = True
    caption.paragraph_format.line_spacing = 1.0


def campo(parrafo, instruccion, texto_provisional=''):
    """Inserta un campo de Word (PAGE, SEQ, TOC…) que Word recalcula al actualizar."""
    for tipo, texto in [('begin', None), (None, instruccion), ('separate', None), (None, texto_provisional), ('end', None)]:
        corrida = parrafo.add_run()
        if tipo:
            marca = OxmlElement('w:fldChar')
            marca.set(qn('w:fldCharType'), tipo)
            corrida._r.append(marca)
        elif texto == instruccion:
            nodo = OxmlElement('w:instrText')
            nodo.set(qn('xml:space'), 'preserve')
            nodo.text = f' {instruccion} '
            corrida._r.append(nodo)
        else:
            corrida.text = texto
    return parrafo


def numero_de_pagina(seccion, formato, inicio=None):
    seccion.footer.is_linked_to_previous = False
    pie = seccion.footer.paragraphs[0]
    for corrida in list(pie.runs):
        corrida._r.getparent().remove(corrida._r)
    pie.alignment = WD_ALIGN_PARAGRAPH.CENTER
    campo(pie, 'PAGE', '1')
    for corrida in pie.runs:
        corrida.font.size = Pt(10)
        corrida.font.name = 'Times New Roman'
    propiedades = seccion._sectPr
    for previo in propiedades.findall(qn('w:pgNumType')):
        propiedades.remove(previo)
    numeracion = OxmlElement('w:pgNumType')
    numeracion.set(qn('w:fmt'), formato)
    if inicio is not None:
        numeracion.set(qn('w:start'), str(inicio))
    propiedades.append(numeracion)


def sin_numero(seccion):
    seccion.footer.is_linked_to_previous = False
    for corrida in list(seccion.footer.paragraphs[0].runs):
        corrida._r.getparent().remove(corrida._r)


def sombrear(celda, color):
    propiedades = celda._tc.get_or_add_tcPr()
    sombra = OxmlElement('w:shd')
    sombra.set(qn('w:val'), 'clear')
    sombra.set(qn('w:color'), 'auto')
    sombra.set(qn('w:fill'), color)
    propiedades.append(sombra)


def repetir_encabezado(fila):
    propiedades = fila._tr.get_or_add_trPr()
    marca = OxmlElement('w:tblHeader')
    marca.set(qn('w:val'), 'true')
    propiedades.append(marca)
    cortar = OxmlElement('w:cantSplit')
    propiedades.append(cortar)


# ── Texto en línea ──────────────────────────────────────────────────────────────────────────────────────────────────
PATRON = re.compile(r'(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))')


def limpiar_enlace(coincidencia):
    texto, destino = re.match(r'\[([^\]]+)\]\(([^)]+)\)', coincidencia).groups()
    return texto if not destino.startswith('http') else f'{texto} ({destino})'


def escribir(parrafo, texto, tam=None, cursiva=False, negrita=False):
    for trozo in PATRON.split(texto):
        if not trozo:
            continue
        if trozo.startswith('**') and trozo.endswith('**') and len(trozo) > 4:
            corrida = parrafo.add_run(trozo[2:-2]); corrida.bold = True
        elif trozo.startswith('`') and trozo.endswith('`'):
            corrida = parrafo.add_run(trozo[1:-1]); corrida.font.name = 'Consolas'; corrida.font.size = Pt((tam or 12) - 1.5)
        elif trozo.startswith('*') and trozo.endswith('*') and len(trozo) > 2:
            corrida = parrafo.add_run(trozo[1:-1]); corrida.italic = True
        elif re.fullmatch(r'\[[^\]]+\]\([^)]+\)', trozo):
            corrida = parrafo.add_run(limpiar_enlace(trozo))
        else:
            corrida = parrafo.add_run(trozo)
        if tam and corrida.font.size is None:
            corrida.font.size = Pt(tam)
        if cursiva:
            corrida.italic = True
        if negrita:
            corrida.bold = True
    return parrafo


def leyenda(tipo, titulo, antes_de_tabla=False):
    contador[tipo] += 1
    parrafo = documento.add_paragraph(style='Caption')
    parrafo.paragraph_format.keep_with_next = antes_de_tabla
    parrafo.add_run(f'{tipo} ')
    campo(parrafo, f'SEQ {tipo} \\* ARABIC', str(contador[tipo]))
    parrafo.add_run('. ' + titulo)
    return parrafo


def nota_fuente(texto):
    parrafo = documento.add_paragraph()
    parrafo.paragraph_format.line_spacing = 1.0
    parrafo.paragraph_format.space_after = Pt(10)
    escribir(parrafo, 'Fuente: ' + texto, tam=10, cursiva=True)


# ── Elementos del Markdown ──────────────────────────────────────────────────────────────────────────────────────────
def agregar_tabla(filas):
    celdas = [[c.strip() for c in f.strip().strip('|').split('|')] for f in filas if not re.match(r'^\s*\|[\s:\-|]+\|\s*$', f)]
    columnas = max(len(f) for f in celdas)
    tabla = documento.add_table(rows=len(celdas), cols=columnas)
    tabla.style = 'Table Grid'
    tabla.alignment = WD_TABLE_ALIGNMENT.CENTER
    propiedades = tabla._tbl.tblPr
    for ancho_previo in propiedades.findall(qn('w:tblW')):
        propiedades.remove(ancho_previo)
    ancho_tabla = OxmlElement('w:tblW')
    ancho_tabla.set(qn('w:w'), '5000')
    ancho_tabla.set(qn('w:type'), 'pct')
    propiedades.append(ancho_tabla)
    tam = CONF['tam_tabla_ancha'] if columnas >= 4 else CONF['tam_tabla']
    for i, fila in enumerate(celdas):
        for j in range(columnas):
            celda = tabla.cell(i, j)
            texto = fila[j] if j < len(fila) else ''
            parrafo = celda.paragraphs[0]
            parrafo.paragraph_format.line_spacing = 1.0
            parrafo.paragraph_format.space_after = Pt(2)
            escribir(parrafo, texto.replace('<br>', '\n'), tam=tam, negrita=(i == 0))
            if i == 0:
                sombrear(celda, 'D9E2F3')
                parrafo.paragraph_format.keep_with_next = True
        if i == 0:
            repetir_encabezado(tabla.rows[0])
    documento.add_paragraph().paragraph_format.space_after = Pt(2)


def agregar_imagen(ruta: Path, texto: str, ancho_tope=None):
    if not ruta.exists():
        parrafo = documento.add_paragraph()
        escribir(parrafo, f'[Falta la imagen: {ruta.name}]', negrita=True)
        return
    parrafo = documento.add_paragraph()
    parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    parrafo.paragraph_format.keep_with_next = True
    parrafo.paragraph_format.line_spacing = 1.0
    figura = parrafo.add_run().add_picture(str(ruta))
    ancho_max, alto_max = Inches(min(estado['ancho'], ancho_tope) if ancho_tope else estado['ancho']), Inches(estado['alto'])
    if figura.width > ancho_max:
        factor = ancho_max / figura.width
        figura.width, figura.height = int(figura.width * factor), int(figura.height * factor)
    if figura.height > alto_max:
        factor = alto_max / figura.height
        figura.width, figura.height = int(figura.width * factor), int(figura.height * factor)
    titulo, _, fuente = texto.partition(' Fuente:')
    leyenda('Figura', titulo.rstrip('.') + '.' if fuente else titulo)
    if fuente:
        nota_fuente(fuente.strip().rstrip('.') + '.')


def cambiar_orientacion(horizontal: bool):
    """Abre una sección nueva en hoja horizontal (diagramas anchos) o vertical; la numeración continúa."""
    seccion = documento.add_section(WD_SECTION.NEW_PAGE)
    for numeracion in seccion._sectPr.findall(qn('w:pgNumType')):
        if numeracion.get(qn('w:start')) is not None:
            del numeracion.attrib[qn('w:start')]
    if horizontal:
        seccion.orientation = WD_ORIENT.LANDSCAPE
        seccion.page_width, seccion.page_height = Inches(11), Inches(8.5)
        estado['ancho'], estado['alto'] = CONF['ancho_horiz'], CONF['alto_horiz']
    else:
        seccion.orientation = WD_ORIENT.PORTRAIT
        seccion.page_width, seccion.page_height = Inches(8.5), Inches(11)
        estado['ancho'], estado['alto'] = CONF['ancho_vert'], CONF['alto_vert']


def sangria_francesa(parrafo):
    formato = parrafo.paragraph_format
    formato.left_indent = Inches(0.5)
    formato.first_line_indent = Inches(-0.5)
    formato.line_spacing = 1.15
    formato.space_after = Pt(CONF['espacio_ref'])


def procesar(ruta: Path, desplazamiento=0, titulo=None):
    lineas = ruta.read_text(encoding='utf-8').splitlines()
    if titulo:
        for k, texto in enumerate(lineas):
            if texto.startswith('# '):
                lineas[k] = '# ' + titulo
                break
    base = ruta.parent
    i = 0
    en_codigo = False
    while i < len(lineas):
        linea = lineas[i]
        suelta = linea.strip()
        if suelta.startswith('```'):
            en_codigo = not en_codigo
            i += 1
            continue
        if en_codigo:
            parrafo = documento.add_paragraph()
            parrafo.paragraph_format.line_spacing = 1.0
            parrafo.paragraph_format.space_after = Pt(0)
            corrida = parrafo.add_run(linea)
            corrida.font.name = 'Consolas'
            corrida.font.size = Pt(9)
            i += 1
            continue
        if not suelta or suelta == '---' or suelta.startswith('<!--'):
            i += 1
            continue
        directiva = re.match(r'^\[\[(\w+)(?::\s*(.*?))?\]\]$', suelta)
        if directiva:
            nombre, valor = directiva.group(1), directiva.group(2)
            if nombre == 'tabla':
                estado['leyenda_tabla'] = valor
                leyenda('Tabla', valor, antes_de_tabla=True)
            elif nombre == 'fuente':
                nota_fuente(valor)
            elif nombre in ('horizontal', 'vertical'):
                cambiar_orientacion(nombre == 'horizontal')
            elif nombre == 'salto':
                documento.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
            elif nombre == 'referencias':
                estado['sangria_francesa'] = True
            elif nombre == 'incluir':
                trozos = [p.strip() for p in valor.split('|')]
                procesar((base / trozos[0]).resolve(), int(trozos[1]) if len(trozos) > 1 else 0, trozos[2] if len(trozos) > 2 else None)
            i += 1
            continue
        titulo = re.match(r'^(#{1,4})\s+(.*)$', suelta)
        if titulo:
            nivel = len(titulo.group(1)) + desplazamiento
            texto = titulo.group(2)
            if nivel <= 1:
                parrafo = documento.add_heading(level=1)
                parrafo.paragraph_format.page_break_before = True
                estado['sangria_francesa'] = False
            else:
                parrafo = documento.add_heading(level=min(nivel, 4))
            escribir(parrafo, texto)
            i += 1
            continue
        imagen = re.match(r'^!\[(.*?)\]\((.*?)\)(?:\{w=([\d.]+)\})?$', suelta)
        if imagen:
            agregar_imagen((base / imagen.group(2)).resolve(), imagen.group(1) or 'Figura', float(imagen.group(3)) if imagen.group(3) else None)
            i += 1
            continue
        if suelta.startswith('|'):
            bloque = []
            while i < len(lineas) and lineas[i].strip().startswith('|'):
                bloque.append(lineas[i])
                i += 1
            agregar_tabla(bloque)
            continue
        viñeta = re.match(r'^(\s*)[-*]\s+(.*)$', linea)
        if viñeta:
            profundidad = 1 if len(viñeta.group(1)) >= 2 else 0
            parrafo = documento.add_paragraph(style='List Bullet 2' if profundidad else 'List Bullet')
            escribir(parrafo, viñeta.group(2))
            i += 1
            continue
        numerada = re.match(r'^(\s*)(\d+)[.)]\s+(.*)$', linea)
        if numerada:
            parrafo = documento.add_paragraph()
            parrafo.paragraph_format.left_indent = Inches(0.5)
            parrafo.paragraph_format.first_line_indent = Inches(-0.25)
            parrafo.paragraph_format.line_spacing = CONF['interlineado_lista']
            escribir(parrafo, f'{numerada.group(2)}. {numerada.group(3)}')
            i += 1
            continue
        if suelta.startswith('>'):
            parrafo = documento.add_paragraph()
            parrafo.paragraph_format.left_indent = Inches(0.5)
            parrafo.paragraph_format.line_spacing = 1.2
            escribir(parrafo, suelta.lstrip('> ').strip(), cursiva=True)
            i += 1
            continue
        # Párrafo: junta las líneas consecutivas.
        partes = [suelta]
        i += 1
        while i < len(lineas) and lineas[i].strip() and not re.match(r'^(#{1,4}\s|\||!\[|\[\[|[-*]\s|\d+[.)]\s|>|```)', lineas[i].strip()):
            partes.append(lineas[i].strip())
            i += 1
        parrafo = documento.add_paragraph()
        if estado['sangria_francesa']:
            sangria_francesa(parrafo)
        else:
            parrafo.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            parrafo.paragraph_format.first_line_indent = Inches(CONF['sangria'])
        escribir(parrafo, ' '.join(partes))


# ── Carátula e índices ──────────────────────────────────────────────────────────────────────────────────────────────
def centrado(texto, tam=12, negrita=False, antes=0, despues=6, cursiva=False):
    parrafo = documento.add_paragraph()
    parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    parrafo.paragraph_format.space_before = Pt(antes)
    parrafo.paragraph_format.space_after = Pt(despues)
    parrafo.paragraph_format.line_spacing = 1.15
    corrida = parrafo.add_run(texto)
    corrida.font.size = Pt(tam)
    corrida.bold = negrita
    corrida.italic = cursiva
    return parrafo


def encabezado(seccion):
    """Encabezado de página como el del control de asistencia: logotipo institucional a la izquierda y la facultad a la derecha."""
    ancho = seccion.page_width - seccion.left_margin - seccion.right_margin
    cabecera = seccion.header
    cabecera.is_linked_to_previous = False
    seccion.header_distance = Inches(0.3)
    resto = cabecera.paragraphs[0]
    for corrida in list(resto.runs):
        corrida._r.getparent().remove(corrida._r)
    tabla = cabecera.add_table(1, 2, ancho)
    tabla.alignment = WD_TABLE_ALIGNMENT.CENTER
    tabla.autofit = False
    mitad = int(ancho * 0.55)
    for celda, medida in zip(tabla.rows[0].cells, (mitad, ancho - mitad)):
        celda.width = medida
    izquierda, derecha = tabla.rows[0].cells
    izquierda.paragraphs[0].add_run().add_picture(str(LOGO), height=Inches(0.42))
    derecha.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    corrida = derecha.paragraphs[0].add_run('Facultad de Ingeniería de Sistemas y\nMecánica Eléctrica-FISME-Bagua')
    corrida.font.size = Pt(8)
    corrida.font.name = 'Arial'
    for celda in (izquierda, derecha):
        celda.paragraphs[0].paragraph_format.space_after = Pt(0)
    # La tabla va antes del párrafo final obligatorio, que queda mínimo y con una línea fina sobre él (separa el encabezado del texto).
    resto._p.addprevious(tabla._tbl)
    resto.paragraph_format.space_before = Pt(2)
    resto.paragraph_format.space_after = Pt(0)
    propiedades = resto._p.get_or_add_pPr()
    borde = OxmlElement('w:pBdr')
    linea = OxmlElement('w:top')
    for atributo, valor in (('w:val', 'single'), ('w:sz', '4'), ('w:space', '1'), ('w:color', '808080')):
        linea.set(qn(atributo), valor)
    borde.append(linea)
    propiedades.append(borde)
    pequeno = resto.add_run('')
    pequeno.font.size = Pt(2)


def caratula():
    if ESCUDO.exists():
        parrafo = documento.add_paragraph()
        parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        parrafo.add_run().add_picture(str(ESCUDO), height=Inches(1.4))
    centrado(CARATULA['universidad'], 14, True, 6)
    centrado(CARATULA['facultad'], 12, True)
    centrado(CARATULA['escuela'], 12, True, 0, 40)
    centrado(CARATULA['tipo'], 16, True, 20, 24)
    centrado(CARATULA['titulo'], 14, True, 0, 50)
    centrado('Autor', 11, False, 0, 0, True)
    centrado(CARATULA['autor'], 13, True, 0, 14)
    centrado('Asesor', 11, False, 0, 0, True)
    centrado(CARATULA['asesor'], 13, True, 0, 40)
    centrado(CARATULA['lugar'], 12, False, 20, 0)
    centrado(CARATULA['anio'], 12, True, 0, 18)
    centrado(CARATULA['nota'], 9, False, 10, 0, True)


def indices():
    for titulo, instruccion in [
        ('Índice general', 'TOC \\o "1-3" \\h \\z \\u'),
        ('Índice de tablas', 'TOC \\h \\z \\c "Tabla"'),
        ('Índice de figuras', 'TOC \\h \\z \\c "Figura"'),
    ]:
        parrafo = documento.add_paragraph()
        parrafo.paragraph_format.page_break_before = True
        corrida = parrafo.add_run(titulo)
        corrida.bold = True
        corrida.font.size = Pt(16)
        parrafo.paragraph_format.space_after = Pt(12)
        campo(documento.add_paragraph(), instruccion, '(Actualice los campos en Word para generar este índice)')


def main():
    if '--compacto' in sys.argv:
        CONF.update(COMPACTO)
    for argumento in sys.argv[1:]:
        if argumento.startswith('--fuente='):
            CONF['fuente'] = (AQUI / argumento.split('=', 1)[1]).resolve()
        elif argumento.startswith('--salida='):
            CONF['salida'] = AQUI / argumento.split('=', 1)[1]
    configurar_estilos()
    documento.core_properties.title = CARATULA['tipo'].capitalize()
    documento.core_properties.author = CARATULA['autor']
    documento.core_properties.subject = 'Sistema de acompañamiento tutorial FISME UNTRM'
    seccion = documento.sections[0]
    seccion.page_width, seccion.page_height = Inches(8.5), Inches(11)
    seccion.left_margin, seccion.right_margin = Inches(CONF['margen_izq']), Inches(CONF['margen_der'])
    seccion.top_margin, seccion.bottom_margin = Inches(CONF['margen_sup']), Inches(CONF['margen_inf'])
    estado['ancho'], estado['alto'] = CONF['ancho_vert'], CONF['alto_vert']
    sin_numero(seccion)
    caratula()

    actual = 'caratula'
    for tipo, ruta in PARTES:
        if tipo in ('preliminar', 'indices') and actual == 'caratula':
            seccion = documento.add_section(WD_SECTION.NEW_PAGE)
            numero_de_pagina(seccion, 'lowerRoman', 1)
            actual = 'preliminar'
        if tipo == 'cuerpo' and actual != 'cuerpo':
            seccion = documento.add_section(WD_SECTION.NEW_PAGE)
            numero_de_pagina(seccion, 'decimal', 1)
            actual = 'cuerpo'
        if tipo == 'indices':
            indices()
            continue
        archivo = CONF['fuente'] / ruta
        if not archivo.exists():
            print(f'AVISO: falta {ruta}', file=sys.stderr)
            continue
        procesar(archivo)
    # Encabezado en todas las secciones menos la carátula (cada una con el ancho útil de su orientación).
    for indice, seccion in enumerate(documento.sections):
        if indice > 0:
            encabezado(seccion)
    documento.save(str(CONF['salida']))
    print(f'{CONF["salida"].name}: {contador["Tabla"]} tablas, {contador["Figura"]} figuras')


if __name__ == '__main__':
    main()
