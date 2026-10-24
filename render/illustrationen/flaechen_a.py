# Erzeugt die Bildflächen der Gruppe A: render/illustrationen/flaechen/a-*.png
import os, math, random
from PIL import Image, ImageDraw, ImageFont
IL = '/home/claude/ruhrkauf/.claude/worktrees/agent-a876893aff61e08b1/render/illustrationen'
FONT = IL + '/../src/ui/schrift/figtree.ttf'
ROT, ROT_D, PETROL, CREME, PAPIER, WEISS, SCHWARZ = '#d23c32', '#a62a22', '#1f6f8b', '#ece6dc', '#f4f1ea', '#eef0f2', '#2e3033'
def font(px, w='Bold'):
    f = ImageFont.truetype(FONT, px); f.set_variation_by_name(w); return f
def neu(b, h, farbe): im = Image.new('RGB', (b, h), farbe); return im, ImageDraw.Draw(im)
def logo(d, x, y, s, grund=ROT, rand='#ffffff'):
    """H-Logo wie schirm-hartwig: weißes abgerundetes Quadrat, rotes H. (x,y) links oben, Kantenlänge s."""
    d.rounded_rectangle([x, y, x + s, y + s], radius=s * 0.17, fill=rand)
    m = s * 0.11; st = s * 0.2
    d.rectangle([x + m, y + m, x + m + st, y + s - m], fill=grund)
    d.rectangle([x + s - m - st, y + m, x + s - m, y + s - m], fill=grund)
    d.rectangle([x + m, y + s * 0.4, x + s - m, y + s * 0.6], fill=grund)
def speichern(im, n): im.save(f'{IL}/flaechen/a-{n}.png'); print(n, im.size)

# Fassadenband Hartwig (Front): rot, Logo + Schriftzug
im, d = neu(1600, 260, ROT)
logo(d, 70, 45, 170); d.text((290, 130), 'Hartwig', font=font(170, 'Bold'), fill='#ffffff', anchor='lm')
speichern(im, 'band')
# Logo quadratisch auf Rot (Seiten, Laptop, Siegel)
im, d = neu(400, 400, ROT); logo(d, 60, 60, 280); speichern(im, 'logo')
# Wettbewerber-Band blau
im, d = neu(1600, 260, '#2d5c9e')
d.ellipse([60, 40, 240, 220], fill='#ffffff'); d.polygon([(100, 85), (150, 185), (200, 85), (178, 85), (150, 145), (122, 85)], fill='#2d5c9e')
d.text((290, 130), 'Volkskauf', font=font(165, 'Bold'), fill='#ffffff', anchor='lm')
speichern(im, 'volkskauf')
# Liste auf dem Klemmbrett
im, d = neu(600, 800, PAPIER)
d.text((50, 60), 'Erledigen', font=font(62, 'Bold'), fill=SCHWARZ)
d.rectangle([50, 140, 550, 146], fill=ROT)
for k in range(6):
    y = 200 + k * 95
    d.rounded_rectangle([50, y, 100, y + 50], radius=8, outline='#5a5d61', width=6)
    if k < 3:
        d.line([(58, y + 26), (72, y + 42), (96, y + 6)], fill=PETROL, width=10)
    d.rounded_rectangle([130, y + 14, 130 + [380, 300, 340, 260, 360, 220][k], y + 36], radius=10, fill='#9aa0a6' if k < 3 else '#5a5d61')
speichern(im, 'liste')
# Briefumschlag (Vorderseite)
im, d = neu(700, 440, '#f2ece0')
d.rectangle([520, 40, 640, 170], fill=PETROL); d.rectangle([535, 55, 625, 155], outline='#ffffff', width=5)
for k, w in enumerate([300, 240, 270]): d.rounded_rectangle([200, 230 + k * 55, 200 + w, 252 + k * 55], radius=10, fill='#7b7f84')
speichern(im, 'umschlag')
# Umschlag Rückseite mit Klappe
im, d = neu(700, 440, '#ebe3d4')
d.polygon([(0, 0), (700, 0), (350, 250)], fill='#e2d8c6'); d.line([(0, 0), (350, 250), (700, 0)], fill='#cbbfa9', width=6)
d.line([(0, 440), (300, 215)], fill='#d6cbb7', width=5); d.line([(700, 440), (400, 215)], fill='#d6cbb7', width=5)
speichern(im, 'umschlag-hinten')
# Namensschild Filialleitung
im, d = neu(800, 220, '#2e3033')
logo(d, 40, 40, 140, grund='#2e3033', rand=ROT)
d.text((210, 78), 'Filialleitung', font=font(84, 'Bold'), fill='#ffffff', anchor='lm')
d.text((212, 160), 'A. Hartwig', font=font(56, 'Medium'), fill='#c9ccd0', anchor='lm')
speichern(im, 'namensschild')
# Mitarbeiter-Namensschilder
for k, n in enumerate(['Anna', 'Murat', 'Jens']):
    im, d = neu(400, 220, '#ffffff'); d.rectangle([0, 0, 400, 70], fill=ROT); logo(d, 14, 8, 54)
    d.text((80, 37), 'Hartwig', font=font(44, 'Bold'), fill='#ffffff', anchor='lm')
    d.text((200, 145), n, font=font(84, 'Bold'), fill=SCHWARZ, anchor='mm')
    speichern(im, f'badge-{k + 1}')
# Kartenebenen
random.seed(4)
im, d = neu(800, 800, '#e6dfd2')  # unten: Straßen und Fluss
d.line([(0, 560), (200, 520), (380, 600), (560, 470), (800, 520)], fill='#8fb6cf', width=56, joint='curve')
for k in range(1, 8):
    d.line([(k * 100 + 10, 0), (k * 100 - 30, 800)], fill='#ffffff', width=14 if k % 3 else 24)
    d.line([(0, k * 100), (800, k * 100 + 30)], fill='#ffffff', width=14 if k % 3 else 24)
d.rectangle([110, 120, 280, 280], fill='#c9d3b6'); d.rectangle([520, 620, 700, 760], fill='#c9d3b6')
speichern(im, 'karte1')
im, d = neu(800, 800, '#f1ede6')  # Mitte: Bezirke eingefärbt
farben = ['#c7d7e2', '#e8c9b4', '#d7d0e6', '#e6dcb8', '#bcd6d0', '#e9c5c5']
pts = [(0, 0), (300, 0), (520, 0), (800, 0), (0, 260), (260, 330), (560, 240), (800, 300), (0, 560), (300, 600), (540, 520), (800, 580), (0, 800), (260, 800), (560, 800), (800, 800)]
for r in range(3):
    for c in range(3):
        a, b, cc, dd = pts[r * 4 + c], pts[r * 4 + c + 1], pts[r * 4 + c + 5], pts[r * 4 + c + 4]
        d.polygon([a, b, cc, dd], fill=farben[(r * 3 + c) % 6], outline='#ffffff', width=10)
speichern(im, 'karte2')
im, d = neu(800, 800, '#f7f5f0')  # oben: Standorte mit Einzugsringen
d.rectangle([0, 0, 799, 799], outline='#d8d2c6', width=10)
for (x, y, r, f) in [(250, 300, 150, ROT), (560, 520, 120, ROT), (600, 200, 90, PETROL)]:
    d.ellipse([x - r, y - r, x + r, y + r], fill=None, outline=f, width=12)
    d.ellipse([x - r * 0.55, y - r * 0.55, x + r * 0.55, y + r * 0.55], outline=f, width=8)
    d.ellipse([x - 28, y - 28, x + 28, y + 28], fill=f)
speichern(im, 'karte3')
# Konzessionsschild
im, d = neu(900, 220, '#2b2b2d'); d.text((450, 112), 'FUNDUS', font=font(150, 'Black'), fill='#f0e2c4', anchor='mm'); speichern(im, 'fundus')
# Bon
im, d = neu(200, 500, '#fbfaf7')
d.text((100, 40), 'Hartwig', font=font(34, 'Bold'), fill=SCHWARZ, anchor='mm')
for k in range(7):
    y = 90 + k * 40; d.rectangle([20, y, 20 + [110, 90, 120, 80, 100, 70, 115][k], y + 12], fill='#8d9399'); d.rectangle([150, y, 180, y + 12], fill='#8d9399')
d.rectangle([20, 380, 180, 384], fill=SCHWARZ); d.rectangle([20, 400, 90, 418], fill=SCHWARZ); d.rectangle([130, 400, 180, 418], fill=SCHWARZ)
for x in range(20, 180, 9): d.rectangle([x, 450, x + (3 if x % 2 else 5), 485], fill=SCHWARZ)
speichern(im, 'bon')
# Kassenbildschirm
im, d = neu(640, 420, '#1d2b33')
d.rectangle([0, 0, 640, 50], fill=ROT); d.text((20, 25), 'Kasse 1', font=font(32, 'Bold'), fill='#fff', anchor='lm')
for k in range(4):
    y = 75 + k * 52; d.rounded_rectangle([20, y, 380, y + 34], radius=6, fill='#2f444f'); d.rectangle([300, y + 10, 360, y + 24], fill='#9dc2dc')
d.rounded_rectangle([20, 300, 380, 395], radius=10, fill=PETROL); d.text((200, 348), '49,90 €', font=font(48, 'Bold'), fill='#fff', anchor='mm')
for r in range(4):
    for c in range(3): d.rounded_rectangle([400 + c * 78, 75 + r * 82, 466 + c * 78, 145 + r * 82], radius=8, fill='#3d5560')
speichern(im, 'kasse')
# Kartenterminal Oberseite (Bildschirm + Tasten), Hochformat
im, d = neu(300, 520, '#2a2b2e')
d.rounded_rectangle([30, 30, 270, 200], radius=12, fill='#9dc2dc'); d.text((150, 85), 'Bitte', font=font(40, 'Bold'), fill='#1d2b33', anchor='mm'); d.text((150, 140), 'Karte', font=font(40, 'Bold'), fill='#1d2b33', anchor='mm')
for r in range(4):
    for c in range(3):
        f = '#5a5d61'
        if r == 3: f = ['#d23c32', '#e0b23a', '#3f9b5c'][c]
        d.rounded_rectangle([40 + c * 78, 230 + r * 70, 100 + c * 78, 280 + r * 70], radius=10, fill=f)
speichern(im, 'terminal')
# Ordnerrücken-Schild
im, d = neu(160, 400, '#ffffff')
d.rectangle([0, 0, 160, 60], fill='#ffffff'); d.text((80, 120), '2026', font=font(44, 'Bold'), fill=SCHWARZ, anchor='mm')
for k in range(4): d.rectangle([25, 180 + k * 45, 135, 196 + k * 45], fill='#9aa0a6')
speichern(im, 'ruecken')
# Kartonetikett
im, d = neu(400, 260, '#ffffff'); d.rectangle([0, 0, 400, 64], fill=ROT); logo(d, 12, 6, 52)
d.text((80, 34), 'Hartwig', font=font(42, 'Bold'), fill='#fff', anchor='lm')
for k in range(3): d.rectangle([24, 96 + k * 44, [330, 250, 290][k], 116 + k * 44], fill='#6b6e72')
for x in range(250, 380, 11): d.rectangle([x, 210, x + (4 if x % 2 else 7), 248], fill=SCHWARZ)
speichern(im, 'etikett')
# Karton-Pfeile (nach oben)
im, d = neu(300, 300, '#c69a62')
for x in (70, 170):
    d.polygon([(x, 90), (x + 40, 150), (x + 18, 150), (x + 18, 220), (x - 18, 220), (x - 18, 150), (x - 40, 150)], fill='#3a2a1a')
d.rectangle([40, 240, 260, 252], fill='#3a2a1a')
speichern(im, 'pfeile')
# Laptop-Bildschirm (Umsatzkurve)
im, d = neu(640, 420, '#f4f6f8')
d.rectangle([0, 0, 640, 46], fill=PETROL); d.text((20, 23), 'Wochenbericht', font=font(28, 'Bold'), fill='#fff', anchor='lm')
for k, h in enumerate([140, 190, 160, 230, 260, 300]):
    d.rounded_rectangle([40 + k * 95, 390 - h, 100 + k * 95, 390], radius=6, fill=PETROL if k < 5 else ROT)
speichern(im, 'laptop')
# Bauplane am Gerüst
im, d = neu(900, 420, '#ffffff')
d.rectangle([0, 0, 900, 110], fill=ROT); logo(d, 30, 14, 82); d.text((140, 56), 'Hartwig', font=font(70, 'Bold'), fill='#fff', anchor='lm')
d.text((450, 205), 'Wir bauen', font=font(96, 'Bold'), fill=SCHWARZ, anchor='mm'); d.text((450, 320), 'für Sie um', font=font(96, 'Bold'), fill=SCHWARZ, anchor='mm')
speichern(im, 'plane')
# Schild über der Drehtür
im, d = neu(900, 200, ROT); logo(d, 40, 30, 140); d.text((210, 100), 'Eingang', font=font(110, 'Bold'), fill='#fff', anchor='lm'); speichern(im, 'eingang')
# Tafel am Kartentisch
im, d = neu(600, 160, '#2e3033'); d.text((300, 80), 'Filialnetz', font=font(80, 'Bold'), fill='#f0e2c4', anchor='mm'); speichern(im, 'netz')
