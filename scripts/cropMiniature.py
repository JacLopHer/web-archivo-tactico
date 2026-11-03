"""Recorta una foto de miniatura y elimina el fondo azul de las holotarjetas.

Uso:
  python scripts/cropMiniature.py <origen> <salida.png> <x0> <y0> <x1> <y1> [--height 400] [--keep-bg]

Requiere: pip install pillow numpy scipy
El fondo se elimina por inundación desde los bordes del recorte (píxeles azulados),
de modo que los azules interiores de la figura no se pierden.
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage

parser = argparse.ArgumentParser()
parser.add_argument('source')
parser.add_argument('output')
parser.add_argument('box', nargs=4, type=int, metavar=('X0', 'Y0', 'X1', 'Y1'))
parser.add_argument('--height', type=int, default=400)
parser.add_argument('--keep-bg', action='store_true')
args = parser.parse_args()

source = Image.open(args.source)
has_alpha = 'A' in source.convert('RGBA').getbands() and source.convert('RGBA').getchannel('A').getextrema()[0] < 255
image = source.convert('RGBA').crop(tuple(args.box))
pixels = np.asarray(image.convert('RGB')).astype(int)

if has_alpha:
    alpha = np.asarray(image.getchannel('A'))
elif not args.keep_bg:
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    bluish = (blue - red > 35) & (blue >= green - 15)
    labels, _ = ndimage.label(bluish)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, border[border > 0])
    background = ndimage.binary_dilation(background, iterations=1)
    alpha = ndimage.gaussian_filter((~background).astype(float), 0.8)
    alpha = np.clip(alpha * 255, 0, 255).astype(np.uint8)
else:
    alpha = np.full(pixels.shape[:2], 255, dtype=np.uint8)

result = Image.fromarray(np.dstack([pixels.astype(np.uint8), alpha]), 'RGBA')
bounds = result.getchannel('A').point(lambda value: 255 if value > 8 else 0).getbbox()
if bounds:
    result = result.crop(bounds)
width = round(result.width * args.height / result.height)
result.resize((width, args.height), Image.LANCZOS).save(args.output, optimize=True)
print(f'{args.output}: {width}x{args.height}')
