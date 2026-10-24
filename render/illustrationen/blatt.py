# Kontaktbogen der gerenderten Motive zum Ansehen: python3 blatt.py <ausgabe.png> [motiv ...]
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
os.chdir(os.path.dirname(os.path.abspath(__file__)))
aus = sys.argv[1]; namen = sys.argv[2:] or sorted(os.path.basename(p)[:-4] for p in glob.glob('ausgabe/*.png'))
T = 220; sp = 6; F = ImageFont.truetype('../src/ui/schrift/figtree.ttf', 18)
zeilen = (len(namen) + sp - 1) // sp
out = Image.new('RGB', (T * sp, (T + 28) * zeilen), '#120f0d'); d = ImageDraw.Draw(out)
for k, n in enumerate(namen):
    im = Image.open(f'ausgabe/{n}.png').convert('RGBA'); bb = im.getbbox(); im = im.crop(bb) if bb else im; im.thumbnail((T - 24, T - 24))
    X, Y = (k % sp) * T, (k // sp) * (T + 28); out.paste(im, (X + (T - im.width) // 2, Y + (T - im.height) // 2), im)
    d.text((X + T // 2, Y + T + 10), n, font=F, fill='#ddd', anchor='mm')
out.save(aus); print(aus)
