"""Anota las capturas del manual de usuario con marcadores numerados y las recorta, para el informe compacto.

Parte de `docs/manual/img/*.jpg` (capturas de 1280 x 800 con datos ficticios) y escribe PNG en `figuras/man-XX.png` (se regeneran; no se
versionan). Cada figura se define abajo: panel(es) con su imagen, el recorte (x0, y0, x1, y1 en píxeles de la captura original) y los
marcadores (número, x, y) en coordenadas de la captura original. Un marcador con `caja` dibuja además un recuadro.

    python herramientas/anotar_capturas.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
BASE = AQUI.parent
RAIZ = BASE.parents[2]
ORIGEN = RAIZ / 'docs' / 'manual' / 'img'
SALIDA = BASE / 'figuras'
ROJO = (200, 30, 40)
ANCHO_MAX = 980


def fuente(tam):
    for ruta in ('C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf'):
        if Path(ruta).exists():
            return ImageFont.truetype(ruta, tam)
    return ImageFont.load_default()


def marcador(dibujo, x, y, n, radio=14, caja=None):
    if caja:
        dibujo.rectangle(caja, outline=ROJO, width=3)
    dibujo.ellipse((x - radio - 2, y - radio - 2, x + radio + 2, y + radio + 2), fill='white')
    dibujo.ellipse((x - radio, y - radio, x + radio, y + radio), fill=ROJO)
    f = fuente(radio + 3)
    caja_texto = dibujo.textbbox((0, 0), str(n), font=f)
    ancho, alto = caja_texto[2] - caja_texto[0], caja_texto[3] - caja_texto[1]
    dibujo.text((x - ancho / 2 - caja_texto[0], y - alto / 2 - caja_texto[1]), str(n), fill='white', font=f)


def panel(imagen, recorte, marcadores):
    foto = Image.open(ORIGEN / f'{imagen}.jpg').convert('RGB')
    dibujo = ImageDraw.Draw(foto)
    for n, x, y, *resto in marcadores:
        marcador(dibujo, x, y, n, caja=resto[0] if resto else None)
    return foto.crop(recorte)


def figura(nombre, paneles, disposicion='h'):
    imagenes = [panel(*p) for p in paneles]
    if len(imagenes) == 1:
        hoja = imagenes[0]
    elif disposicion == 'h':
        alto = max(i.height for i in imagenes)
        hoja = Image.new('RGB', (sum(i.width for i in imagenes) + 12 * (len(imagenes) - 1), alto), 'white')
        x = 0
        for i in imagenes:
            hoja.paste(i, (x, 0))
            x += i.width + 12
    else:
        ancho = max(i.width for i in imagenes)
        hoja = Image.new('RGB', (ancho, sum(i.height for i in imagenes) + 12 * (len(imagenes) - 1)), 'white')
        y = 0
        for i in imagenes:
            hoja.paste(i, (0, y))
            y += i.height + 12
    if hoja.width > ANCHO_MAX * 1.6:
        hoja = hoja.resize((int(ANCHO_MAX * 1.6), int(hoja.height * ANCHO_MAX * 1.6 / hoja.width)), Image.LANCZOS)
    hoja.save(SALIDA / f'{nombre}.png', optimize=True)
    return hoja.size


# nombre: (paneles, disposición). Panel = (captura, recorte, marcadores). Cada marcador (n, x, y) va en la ESQUINA superior izquierda del
# elemento señalado, para no tapar su texto.
FIGURAS = {
    'man-01': ([('01-ingreso', (400, 90, 880, 700), [(1, 450, 330), (2, 450, 419), (3, 669, 484), (4, 450, 523)])], 'h'),
    'man-02': ([('03-inicio-tutorado', (0, 0, 1280, 560), [(1, 872, 11), (2, 14, 200), (3, 289, 303), (4, 1115, 11)])], 'h'),
    'man-03': ([('05-solicitar-tutoria', (440, 90, 1100, 800), [(1, 467, 475), (2, 467, 556), (3, 467, 668), (4, 467, 788)])], 'h'),
    'man-04': ([('06-evaluar-tutoria', (256, 60, 1280, 520), [(1, 410, 250), (2, 412, 424), (3, 410, 362)])], 'h'),
    'man-05': ([('08-tutorados', (0, 0, 1280, 760), [(1, 310, 389), (2, 630, 389), (3, 1080, 562), (4, 1122, 562), (5, 1164, 562), (6, 1099, 111), (7, 1020, 700)])], 'h'),
    'man-06a': ([('09-programar-sesion', (400, 115, 880, 690), [(1, 420, 220), (2, 648, 220), (3, 420, 305), (4, 420, 387), (5, 420, 468), (6, 708, 632)])], 'h'),
    'man-06b': ([('11-detalle-sesion', (380, 135, 900, 665), [(7, 400, 257), (8, 400, 433), (9, 400, 543), (10, 519, 609), (11, 670, 609)])], 'h'),
    'man-07': ([('13-ficha-derivacion', (330, 35, 950, 770), [(1, 350, 112), (2, 350, 162), (3, 813, 712), (4, 709, 712)])], 'h'),
    'man-08a': ([('14-solicitudes-bandeja', (256, 60, 1280, 400), [(1, 310, 192), (2, 976, 190), (3, 1060, 310), (4, 1160, 310)])], 'h'),
    'man-08b': ([('15-atender-solicitud', (360, 170, 920, 630), [(5, 380, 336), (6, 550, 336), (7, 380, 464), (8, 580, 568), (9, 756, 568)])], 'h'),
    'man-09': ([('12-expediente', (256, 60, 1280, 700), [(1, 286, 96), (2, 1180, 154), (3, 290, 230), (4, 928, 456), (5, 928, 494)])], 'h'),
    'man-10': ([('18-informe-semestral', (256, 60, 1280, 800), [(1, 290, 196), (2, 566, 290), (3, 566, 684)])], 'h'),
    'man-11': ([('20-asignacion', (256, 60, 1280, 800), [(1, 894, 222), (2, 914, 370), (3, 564, 496), (4, 578, 540), (5, 1080, 222)])], 'h'),
    'man-12': ([('21-plan-semestral', (256, 60, 1280, 800), [(1, 312, 220), (2, 320, 352), (3, 312, 430)])], 'h'),
    'man-13': ([('22-indicadores', (256, 60, 1280, 700), [(1, 566, 200), (2, 1076, 104), (3, 1176, 104), (4, 544, 392)])], 'h'),
    'man-14a': ([('24-bandeja-servicio', (256, 60, 1280, 440), [(1, 310, 188), (2, 310, 234), (3, 1136, 350)])], 'h'),
    'man-14b': ([('25-detalle-derivacion', (390, 40, 890, 760), [(4, 426, 178), (5, 426, 370), (6, 440, 526), (7, 440, 566)])], 'h'),
    'man-15a': ([('28-usuarios', (256, 60, 1280, 500), [(1, 530, 154), (2, 730, 154), (3, 550, 222), (4, 836, 222)])], 'h'),
    'man-15b': ([('29-usuario-nuevo-servicio', (410, 100, 870, 690), [(5, 430, 510), (6, 430, 584), (7, 760, 640)])], 'h'),
    'man-16': ([('33-evaluacion-habilitacion', (256, 60, 1280, 660), [(1, 524, 254), (2, 546, 354), (3, 1054, 422), (4, 1090, 582)])], 'h'),
    'man-17': ([('34-seguimiento-dbu', (256, 60, 1280, 560), [(1, 286, 144), (2, 286, 390)])], 'h'),
    'man-18': ([('35-bitacora', (256, 60, 1280, 700), [(1, 546, 180), (2, 544, 234), (3, 1140, 104)])], 'h'),
    'man-19': ([('26-informe-consolidado', (256, 60, 1280, 700), [(1, 560, 180), (2, 1016, 382)])], 'h'),
}


def main():
    SALIDA.mkdir(exist_ok=True)
    for nombre, (paneles, disposicion) in FIGURAS.items():
        ancho, alto = figura(nombre, paneles, disposicion)
        print(f'  {nombre}: {ancho}x{alto}')


if __name__ == '__main__':
    main()
