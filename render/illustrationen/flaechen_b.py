# Bildflächen der Gruppe B (b-*.png), Schrift Figtree.
import os, math
from PIL import Image, ImageDraw, ImageFont
HIER = '/home/claude/ruhrkauf/.claude/worktrees/agent-a9def7a38c06396eb/render/illustrationen'
os.chdir(HIER)
SCHRIFT = '../src/ui/schrift/figtree.ttf'
def font(px, w='Bold'):
    f = ImageFont.truetype(SCHRIFT, px)
    try: f.set_variation_by_name(w)
    except Exception: pass
    return f
ROT, ROT_D, PETROL, PAPIER, WEISS, SCHWARZ = '#d23c32', '#a62a22', '#1f6f8b', '#f4f1ea', '#eef0f2', '#2e3033'
def speichern(im, n): im.save(f'flaechen/b-{n}.png'); print(n, im.size)

def h_logo(d, cx, cy, s, rand='#ffffff', grund=ROT):
    # Hartwig-Logo wie schirm-hartwig: weißes Quadrat mit Rundung, rotes H
    r = s / 2
    d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], radius=s * 0.17, fill=rand)
    w = s * 0.2; i = s * 0.12
    d.rectangle([cx - r + i, cy - r + i * 0.6, cx - r + i + w, cy + r - i * 0.6], fill=grund)
    d.rectangle([cx + r - i - w, cy - r + i * 0.6, cx + r - i, cy + r - i * 0.6], fill=grund)
    d.rectangle([cx - r + i, cy - s * 0.09, cx + r - i, cy + s * 0.09], fill=grund)

# Schild am Hochhaus: rot, weißes H-Logo, Schriftzug
im = Image.new('RGB', (1200, 360), ROT); d = ImageDraw.Draw(im)
h_logo(d, 190, 180, 250)
d.text((350, 180), 'Hartwig', font=font(196, 'ExtraBold'), fill='#ffffff', anchor='lm')
speichern(im, 'schild')
# Quadratisches Logo (Lieferwagen, Dachaufbau)
im = Image.new('RGB', (400, 400), ROT); d = ImageDraw.Draw(im); h_logo(d, 200, 200, 300); speichern(im, 'logo')

# Monitor: Balkendiagramm
im = Image.new('RGB', (1000, 620), '#f7f8fa'); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 1000, 90], fill='#e3e7ea'); d.text((40, 45), 'Umsatz je Woche', font=font(48, 'Bold'), fill=SCHWARZ, anchor='lm')
d.rounded_rectangle([820, 25, 960, 65], radius=20, fill=ROT)
for k in range(5): d.line([(70, 540 - k * 100), (960, 540 - k * 100)], fill='#d5dade', width=4)
werte = [0.45, 0.62, 0.55, 0.78, 0.7, 0.92]
for k, v in enumerate(werte):
    x = 110 + k * 142; hgt = v * 400
    d.rectangle([x, 540 - hgt, x + 90, 540], fill=ROT if k == len(werte) - 1 else PETROL)
d.line([(70, 540), (960, 540)], fill=SCHWARZ, width=6)
speichern(im, 'balken')

# Banknote (Draufsicht), blau wie ein 20er, ohne echte Motive
im = Image.new('RGB', (760, 400), '#7fa3c8'); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 759, 399], outline='#56789c', width=18)
d.rectangle([40, 40, 300, 360], fill='#a9c3dc')
d.ellipse([90, 120, 250, 280], fill='#5d82aa')
d.text((560, 140), '20', font=font(170, 'ExtraBold'), fill='#2f4f72', anchor='mm')
d.text((560, 290), 'EURO', font=font(70, 'Bold'), fill='#2f4f72', anchor='mm')
speichern(im, 'schein')
# Banderole
im = Image.new('RGB', (300, 400), '#f1e3c6'); d = ImageDraw.Draw(im)
d.text((150, 200), '1000', font=font(90, 'Bold'), fill='#8a5a2b', anchor='mm'); speichern(im, 'banderole')
# Zählmaschine: Anzeige mit Tasten
im = Image.new('RGB', (900, 300), '#2d3a46'); d = ImageDraw.Draw(im)
d.rounded_rectangle([30, 30, 520, 270], radius=20, fill='#8fd0e6')
d.text((490, 150), '1.250 €', font=font(120, 'Bold'), fill='#16384a', anchor='rm')
for i, c in enumerate(['#e9ecef', '#e9ecef', ROT, '#f2c14e']):
    x = 570 + (i % 2) * 150; y = 50 + (i // 2) * 110
    d.rounded_rectangle([x, y, x + 120, y + 80], radius=16, fill=c)
speichern(im, 'zaehler')

# Flipchart: Linie mit Prognose
im = Image.new('RGB', (700, 900), '#fbfaf6'); d = ImageDraw.Draw(im)
d.text((60, 150), 'Forecast', font=font(90, 'Bold'), fill=SCHWARZ, anchor='lm')
d.line([(60, 225), (420, 225)], fill=ROT, width=10)
d.line([(80, 300), (80, 820), (650, 820)], fill=SCHWARZ, width=10)
pts = [(110, 720), (200, 650), (290, 690), (380, 560), (460, 520)]
d.line(pts, fill=PETROL, width=20, joint='curve')
for p in pts: d.ellipse([p[0] - 16, p[1] - 16, p[0] + 16, p[1] + 16], fill=PETROL)
# gestrichelte Prognose
a = pts[-1]; b = (630, 340)
for t in range(0, 10, 2):
    p0 = (a[0] + (b[0] - a[0]) * t / 10, a[1] + (b[1] - a[1]) * t / 10); p1 = (a[0] + (b[0] - a[0]) * (t + 1) / 10, a[1] + (b[1] - a[1]) * (t + 1) / 10)
    d.line([p0, p1], fill=ROT, width=20)
d.polygon([(630, 300), (660, 370), (595, 360)], fill=ROT)
speichern(im, 'flipchart')

# Bestellschein mit rotem Stempelabdruck (liegt flach)
im = Image.new('RGB', (600, 820), '#fbfaf6'); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 600, 110], fill='#e4e8eb'); d.text((40, 58), 'Bestellschein', font=font(64, 'Bold'), fill=SCHWARZ, anchor='lm')
for k in range(8):
    y = 170 + k * 62; d.line([(40, y), (560, y)], fill='#c9cfd4', width=5)
    d.rectangle([40, y + 14, 40 + 140 + (k * 53 % 160), y + 34], fill='#9aa3aa')
    d.rectangle([470, y + 14, 560, y + 34], fill='#9aa3aa')
d.line([(40, 690), (260, 690)], fill=SCHWARZ, width=5)
sx, sy = 330, 690
st = Image.new('RGBA', (430, 160), (0, 0, 0, 0)); sd = ImageDraw.Draw(st)
sd.rounded_rectangle([8, 8, 422, 152], radius=22, outline=ROT, width=14)
sd.text((215, 80), 'FREIGEGEBEN', font=font(50, 'ExtraBold'), fill=ROT, anchor='mm')
st = st.rotate(12, expand=True, resample=Image.BICUBIC)
im.paste(st, (sx - st.width // 2, sy - st.height // 2), st)
speichern(im, 'bestellschein')

# Preisschild −30 %
im = Image.new('RGB', (600, 900), '#ffffff'); d = ImageDraw.Draw(im)
d.ellipse([255, 55, 345, 145], fill='#bfc4c8')
d.rectangle([0, 230, 600, 560], fill=ROT)
d.text((300, 395), '−30 %', font=font(170, 'ExtraBold'), fill='#ffffff', anchor='mm')
d.text((300, 660), '79,95', font=font(100, 'Bold'), fill='#8d9399', anchor='mm')
d.line([(150, 660), (450, 660)], fill='#8d9399', width=12)
d.text((300, 800), '55,95 €', font=font(110, 'ExtraBold'), fill=SCHWARZ, anchor='mm')
speichern(im, 'preis')

# Markenetikett (gewebtes Etikett am Kleidersack)
im = Image.new('RGB', (600, 300), '#2b2b2d'); d = ImageDraw.Draw(im)
d.rectangle([14, 14, 585, 285], outline='#c9a45c', width=8)
d.text((300, 125), 'ATELIER', font=font(110, 'Bold'), fill='#e2c27f', anchor='mm')
d.text((300, 220), 'HARTWIG', font=font(56, 'SemiBold'), fill='#e2c27f', anchor='mm')
speichern(im, 'etikett')

# Planungstafel: Raster mit Wochen
im = Image.new('RGB', (1200, 800), '#fbfbfa'); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 1200, 110], fill='#e4e8eb')
for k, t in enumerate(['KW 41', 'KW 42', 'KW 43', 'KW 44', 'KW 45']):
    d.text((250 + k * 190, 55), t, font=font(48, 'Bold'), fill=SCHWARZ, anchor='mm')
for k in range(6): d.line([(160 + k * 190, 0), (160 + k * 190, 800)], fill='#c9cfd4', width=5)
for k in range(4): d.line([(0, 110 + k * 172), (1200, 110 + k * 172)], fill='#c9cfd4', width=5)
for k, c in enumerate([ROT, PETROL, '#6d8f5e', '#c98a4b']):
    d.ellipse([50, 165 + k * 172, 110, 225 + k * 172], fill=c)
speichern(im, 'planung')

# Kanbantafel (hochkant): Spaltenköpfe
im = Image.new('RGB', (900, 1100), '#fbfbfa'); d = ImageDraw.Draw(im)
for k, t in enumerate(['Offen', 'In Arbeit', 'Fertig']):
    x = k * 300; d.rectangle([x + 14, 16, x + 286, 106], fill='#dfe4e8')
    d.text((x + 150, 61), t, font=font(48, 'Bold'), fill=SCHWARZ, anchor='mm')
    if k: d.line([(x, 0), (x, 1100)], fill='#c9cfd4', width=7)
speichern(im, 'kanban')

# Kollektionstafel: Kopf
im = Image.new('RGB', (1200, 220), '#2b2b2d'); d = ImageDraw.Draw(im)
d.text((600, 110), 'Herbst / Winter', font=font(120, 'Bold'), fill='#f4f1ea', anchor='mm')
speichern(im, 'kollektion')

# Kassen-PC: Kassenoberfläche
im = Image.new('RGB', (1000, 700), '#f4f6f8'); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 1000, 100], fill=ROT); h_logo(d, 60, 50, 64); d.text((120, 50), 'Kasse 3', font=font(54, 'Bold'), fill='#ffffff', anchor='lm')
for k in range(4):
    y = 140 + k * 70; d.rectangle([40, y, 440 - (k * 37 % 120), y + 30], fill='#9aa3aa'); d.rectangle([500, y, 600, y + 30], fill='#9aa3aa')
d.line([(40, 440), (600, 440)], fill=SCHWARZ, width=5)
d.text((600, 500), '84,90 €', font=font(76, 'ExtraBold'), fill=SCHWARZ, anchor='rm')
for i in range(6):
    x = 660 + (i % 2) * 160; y = 140 + (i // 2) * 170
    d.rounded_rectangle([x, y, x + 140, y + 150], radius=16, fill=[PETROL, '#6d8f5e', '#c98a4b', '#9a6fa8', '#2f5d7c', ROT][i])
speichern(im, 'kasse')

# Skizze auf dem Zeichentisch: Kleid
im = Image.new('RGB', (900, 640), '#fbfaf6'); d = ImageDraw.Draw(im)
k = SCHWARZ
d.ellipse([290, 60, 350, 120], outline=k, width=7)
d.line([(320, 120), (320, 150)], fill=k, width=7)
d.polygon([(270, 150), (370, 150), (355, 300), (420, 560), (220, 560), (285, 300)], outline=k, width=7)
d.line([(270, 150), (240, 330)], fill=k, width=7); d.line([(370, 150), (400, 330)], fill=k, width=7)
d.line([(285, 300), (355, 300)], fill=ROT, width=8)
for i, c in enumerate([ROT, PETROL, '#c98a4b']):
    d.rectangle([560, 110 + i * 150, 680, 210 + i * 150], fill=c)
    d.line([(700, 160 + i * 150), (840, 160 + i * 150)], fill='#9aa3aa', width=10)
speichern(im, 'skizze')

# Umschlag mit Siegel (Boni)
im = Image.new('RGB', (620, 420), '#fbfaf6'); d = ImageDraw.Draw(im)
d.polygon([(0, 0), (620, 0), (310, 230)], fill='#efebe2')
d.line([(0, 0), (310, 230), (620, 0)], fill='#c9c3b6', width=8)
d.line([(0, 420), (250, 230)], fill='#e0dbd0', width=6); d.line([(620, 420), (370, 230)], fill='#e0dbd0', width=6)
d.ellipse([255, 175, 365, 285], fill=ROT); h_logo(d, 310, 230, 60, grund=ROT)
d.text((310, 345), 'Bonus', font=font(64, 'Bold'), fill='#5a5d61', anchor='mm')
speichern(im, 'umschlag')

# Schnittmuster (Papier mit Schnittlinien)
im = Image.new('RGB', (800, 620), '#efe6cf'); d = ImageDraw.Draw(im)
L = '#8a5a2b'
# Vorderteil: Schulter, Armloch, Seitennaht, Saum, vordere Mitte mit Halsausschnitt
vt = [(60, 120), (150, 90), (250, 70), (285, 100), (300, 160), (330, 220), (350, 250), (350, 560), (60, 560), (60, 200), (110, 170), (60, 140)]
d.polygon(vt, fill='#f6efdc', outline=L, width=7)
d.line([(200, 230), (200, 500)], fill=L, width=5); d.polygon([(200, 215), (188, 245), (212, 245)], fill=L); d.polygon([(200, 515), (188, 485), (212, 485)], fill=L)
for y in range(140, 540, 60): d.ellipse([90, y, 104, y + 14], outline=L, width=3)
# Ärmel
ae = [(430, 250), (500, 140), (610, 110), (720, 140), (790, 250), (740, 560), (480, 560)]
d.polygon(ae, fill='#f6efdc', outline=L, width=7)
d.line([(610, 210), (610, 500)], fill=L, width=5); d.polygon([(610, 195), (598, 225), (622, 225)], fill=L)
for x in range(500, 740, 30): d.line([(x, 590), (x + 15, 590)], fill=L, width=4)
d.text((610, 360), 'Ärmel', font=font(40, 'SemiBold'), fill=L, anchor='mm')
d.text((205, 380), 'VT', font=font(40, 'SemiBold'), fill=L, anchor='mm')
speichern(im, 'schnitt')
