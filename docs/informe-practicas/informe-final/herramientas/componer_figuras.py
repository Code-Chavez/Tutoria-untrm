"""Compone figuras del informe compacto a partir de las ya renderizadas (figuras/*.png): varias en una fila, a la misma altura.

    python herramientas/componer_figuras.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FIGURAS = Path(__file__).resolve().parent.parent / 'figuras'
COMPOSICIONES = {
    # Estados simples (solicitud, derivación y periodo) en una sola figura.
    'c-estados': (['dd-d07a', 'dd-d07b', 'dd-d07d'], 800),
}


def componer(nombre, partes, alto, hueco=40):
    imagenes = []
    for parte in partes:
        im = Image.open(FIGURAS / f'{parte}.png').convert('RGB')
        imagenes.append(im.resize((int(im.width * alto / im.height), alto), Image.LANCZOS))
    ancho = sum(i.width for i in imagenes) + hueco * (len(imagenes) - 1)
    hoja = Image.new('RGB', (ancho, alto), 'white')
    x = 0
    for im in imagenes:
        hoja.paste(im, (x, 0))
        x += im.width + hueco
    hoja.save(FIGURAS / f'{nombre}.png', optimize=True)
    return hoja.size


ENSAYO = Path(__file__).resolve().parent.parent / 'assets' / 'ensayo'
# (archivo, recorte, rótulo): capturas del ensayo que no están en el manual, recortadas y en cuadrícula de 2 x 2.
EVIDENCIA = [
    ('H6-verificado-sin-motivo', (330, 30, 950, 690), '(a) H6: aviso de validación junto a «Derivar caso»'),
    ('H7-verificado-b-respuesta-sin-recargar', (440, 440, 1100, 720), '(b) H7: respuesta visible sin recargar'),
    ('H12-c-vigente-2027-I', (256, 60, 1280, 420), '(c) H12: periodo vigente 2027-I'),
    ('H12-d-cerrado-2026-II', (256, 60, 1280, 420), '(d) H12: semestre cerrado 2026-II'),
]


def evidencia(nombre='g-evidencia', ancho_celda=900):
    celdas = []
    for archivo, recorte, rotulo in EVIDENCIA:
        im = Image.open(ENSAYO / f'{archivo}.png').convert('RGB').crop(recorte)
        im = im.resize((ancho_celda, int(im.height * ancho_celda / im.width)), Image.LANCZOS)
        dibujo = ImageDraw.Draw(im)
        fuente = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)
        caja = dibujo.textbbox((8, 8), rotulo, font=fuente)
        dibujo.rectangle((caja[0] - 6, caja[1] - 4, caja[2] + 6, caja[3] + 4), fill='white', outline=(60, 60, 60))
        dibujo.text((8, 8), rotulo, fill='black', font=fuente)
        celdas.append(im)
    filas = [celdas[0:2], celdas[2:4]]
    altos = [max(c.height for c in fila) for fila in filas]
    hoja = Image.new('RGB', (ancho_celda * 2 + 16, sum(altos) + 16), 'white')
    y = 0
    for fila, alto in zip(filas, altos):
        x = 0
        for celda in fila:
            hoja.paste(celda, (x, y))
            x += ancho_celda + 16
        y += alto + 16
    hoja.save(FIGURAS / f'{nombre}.png', optimize=True)
    return hoja.size


if __name__ == '__main__':
    for nombre, (partes, alto) in COMPOSICIONES.items():
        print(nombre, componer(nombre, partes, alto))
    print('g-evidencia', evidencia())
