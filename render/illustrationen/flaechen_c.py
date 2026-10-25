# Erzeugt die Bildflächen der Gruppe C (render/illustrationen/flaechen/c-*.png).
import os, math
from PIL import Image, ImageDraw, ImageFont
IL = '/home/claude/ruhrkauf/.claude/worktrees/agent-ac18abb4d164e14bb/render/illustrationen'
FONT = IL + '/../src/ui/schrift/figtree.ttf'
ROT, ROT_D, PETROL, PAPIER, CREME, WEISS, SCHWARZ = '#d23c32', '#a62a22', '#1f6f8b', '#f4f1ea', '#ece6dc', '#ffffff', '#2e3033'
TINTE = '#2b2f36'; GRAU = '#b9b4ab'; GRAU_H = '#d8d3ca'
KL = ['#2f5d7c', '#e9e4da', '#6d8f5e', '#c98a4b', '#9a6fa8', '#d8a7a0', '#2b2b2d']


def f(gr, w='Bold'):
    x = ImageFont.truetype(FONT, gr); x.set_variation_by_name(w); return x


def logo(d, x, y, s, fg=WEISS, bg=ROT):
    """Hartwig-H im abgerundeten Quadrat (links oben x/y, Kante s)."""
    d.rounded_rectangle([x, y, x + s, y + s], radius=s * 0.22, fill=bg)
    rr = s * 0.08; d.rounded_rectangle([x + s * 0.1, y + s * 0.1, x + s * 0.9, y + s * 0.9], radius=s * 0.16, outline=fg, width=max(1, int(s * 0.07)))
    b = s * 0.17
    d.rectangle([x + s * 0.27, y + s * 0.24, x + s * 0.27 + b, y + s * 0.76], fill=fg)
    d.rectangle([x + s * 0.73 - b, y + s * 0.24, x + s * 0.73, y + s * 0.76], fill=fg)
    d.rectangle([x + s * 0.27, y + s * 0.43, x + s * 0.73, y + s * 0.57], fill=fg)


def hemd(d, x, y, s, farbe, kragen=WEISS):
    """Hemd/Pullover-Silhouette (Mitte oben x/y, Breite s)."""
    w = s; h = s * 1.05
    d.polygon([(x - w * 0.22, y), (x - w * 0.5, y + h * 0.18), (x - w * 0.4, y + h * 0.42), (x - w * 0.3, y + h * 0.36), (x - w * 0.3, y + h),
               (x + w * 0.3, y + h), (x + w * 0.3, y + h * 0.36), (x + w * 0.4, y + h * 0.42), (x + w * 0.5, y + h * 0.18), (x + w * 0.22, y)], fill=farbe)
    d.polygon([(x - w * 0.22, y), (x, y + h * 0.16), (x + w * 0.22, y), (x + w * 0.12, y), (x, y + h * 0.08), (x - w * 0.12, y)], fill=kragen)


def kleid(d, x, y, s, farbe):
    w = s; h = s * 1.25
    d.polygon([(x - w * 0.16, y), (x + w * 0.16, y), (x + w * 0.2, y + h * 0.35), (x + w * 0.42, y + h), (x - w * 0.42, y + h), (x - w * 0.2, y + h * 0.35)], fill=farbe)
    d.rectangle([x - w * 0.2, y + h * 0.32, x + w * 0.2, y + h * 0.38], fill=TINTE)


def schuh(d, x, y, s, farbe):
    d.polygon([(x - s * 0.5, y + s * 0.1), (x - s * 0.15, y + s * 0.1), (x + s * 0.1, y + s * 0.3), (x + s * 0.5, y + s * 0.38), (x + s * 0.5, y + s * 0.5), (x - s * 0.5, y + s * 0.5)], fill=farbe)
    d.rectangle([x - s * 0.5, y + s * 0.5, x + s * 0.5, y + s * 0.58], fill=WEISS)


def tasche(d, x, y, s, farbe):
    d.arc([x - s * 0.25, y, x + s * 0.25, y + s * 0.5], 180, 360, fill=TINTE, width=max(2, int(s * 0.06)))
    d.rounded_rectangle([x - s * 0.45, y + s * 0.25, x + s * 0.45, y + s * 0.9], radius=s * 0.08, fill=farbe)


def textzeilen(d, x0, y0, x1, n, abst, dicke, farbe=GRAU, kurz_letzte=True):
    for i in range(n):
        xe = x1 if (i < n - 1 or not kurz_letzte) else x0 + (x1 - x0) * 0.6
        d.rectangle([x0, y0 + i * abst, xe, y0 + i * abst + dicke], fill=farbe)


def speichern(im, name):
    im.save(f'{IL}/flaechen/c-{name}.png'); print(name, im.size)


# Prospekt-Titelseite (hochkant)
def prospekt():
    W, H = 600, 820; im = Image.new('RGB', (W, H), PAPIER); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 150], fill=ROT); logo(d, 34, 30, 90, ROT, WEISS)
    d.text((145, 75), 'HARTWIG', font=f(78, 'ExtraBold'), fill=WEISS, anchor='lm')
    d.text((34, 205), 'Herbst-Angebote', font=f(58, 'ExtraBold'), fill=TINTE, anchor='lm')
    d.rectangle([34, 250, W - 34, 520], fill='#e6dccb'); hemd(d, 175, 285, 190, KL[0]); kleid(d, 425, 280, 170, ROT_D)
    d.ellipse([440, 420, 560, 540], fill=ROT); d.text((500, 480), '−30 %', font=f(36, 'ExtraBold'), fill=WEISS, anchor='mm')
    for i, (fn, c) in enumerate([(schuh, KL[3]), (tasche, KL[4]), (hemd, KL[2])]):
        x = 34 + i * 185; d.rectangle([x, 545, x + 162, 720], fill='#ebe6dc')
        fn(d, x + 81, 570, 110, c)
        d.text((x + 81, 752), ['39,99 €', '49,99 €', '19,99 €'][i], font=f(32, 'ExtraBold'), fill=ROT, anchor='mm')
    d.rectangle([0, H - 30, W, H], fill=ROT)
    speichern(im, 'prospekt')


# Zeitung aufgeschlagen: linke Seite Artikel, rechte Seite Anzeige
def zeitung_seiten():
    W, H = 520, 700
    l = Image.new('RGB', (W, H), '#f1ede4'); d = ImageDraw.Draw(l)
    d.text((30, 50), 'Der Handelsbote', font=f(44, 'ExtraBold'), fill=TINTE, anchor='lm')
    d.rectangle([30, 85, W - 30, 89], fill=TINTE)
    d.text((30, 130), 'Innenstädte im Wandel', font=f(36, 'Bold'), fill=TINTE, anchor='lm')
    d.rectangle([30, 165, 300, 330], fill='#c9c1b2'); d.polygon([(30, 330), (120, 240), (190, 300), (240, 260), (300, 330)], fill='#a39a89')
    textzeilen(d, 320, 170, W - 30, 10, 16, 6)
    for c in range(3):
        textzeilen(d, 30 + c * 157, 355, 30 + c * 157 + 140, 20, 16, 6)
    textzeilen(d, 30, 690 - 18, W - 30, 1, 16, 6)
    speichern(l, 'zeitung-links')
    r = Image.new('RGB', (W, H), '#f1ede4'); d = ImageDraw.Draw(r)
    textzeilen(d, 30, 40, 240, 12, 16, 6); textzeilen(d, 270, 40, W - 30, 12, 16, 6)
    # Anzeige
    d.rectangle([30, 250, W - 30, 670], fill=WEISS, outline=TINTE, width=3)
    d.rectangle([33, 253, W - 33, 340], fill=ROT); logo(d, 50, 266, 60, ROT, WEISS)
    d.text((125, 297), 'HARTWIG', font=f(52, 'ExtraBold'), fill=WEISS, anchor='lm')
    d.text((W / 2, 385), 'Herbst-Sale', font=f(50, 'ExtraBold'), fill=TINTE, anchor='mm')
    hemd(d, 150, 425, 150, KL[0]); kleid(d, 300, 420, 120, KL[3])
    d.ellipse([340, 470, 470, 600], fill=ROT); d.text((405, 535), '−30 %', font=f(36, 'ExtraBold'), fill=WEISS, anchor='mm')
    d.text((W / 2, 640), 'in allen Häusern', font=f(28, 'Bold'), fill=TINTE, anchor='mm')
    speichern(r, 'zeitung-rechts')


def plakat():
    W, H = 1000, 460; im = Image.new('RGB', (W, H), '#f6f1e6'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 330, H], fill=ROT); logo(d, 85, 70, 160, ROT, WEISS)
    d.text((165, 305), 'HARTWIG', font=f(56, 'ExtraBold'), fill=WEISS, anchor='mm')
    d.text((165, 365), 'Ihr Warenhaus', font=f(32, 'Medium'), fill=WEISS, anchor='mm')
    d.text((380, 120), 'Herbst-Sale', font=f(82, 'ExtraBold'), fill=TINTE, anchor='lm')
    d.text((380, 250), '−30 %', font=f(140, 'Black'), fill=ROT, anchor='lm')
    d.text((380, 375), 'auf Mode und Schuhe', font=f(42, 'Bold'), fill=TINTE, anchor='lm')
    hemd(d, 890, 250, 150, KL[0])
    speichern(im, 'plakat')


def werbetafel():
    # Symbol: wenige große Formen, bei 34 px lesbar
    W, H = 600, 300; im = Image.new('RGB', (W, H), '#f6f1e6'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 200, H], fill=ROT); logo(d, 30, 80, 140, ROT, WEISS)
    d.text((400, 100), 'SALE', font=f(118, 'Black'), fill=TINTE, anchor='mm')
    d.text((400, 220), '−30 %', font=f(96, 'Black'), fill=ROT, anchor='mm')
    speichern(im, 'werbetafel')


def shop():
    W, H = 900, 560; im = Image.new('RGB', (W, H), '#f7f6f3'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 30], fill='#dcdde0')
    for i, c in enumerate(['#e0574d', '#e6b84a', '#6dbb6a']): d.ellipse([14 + i * 22, 9, 26 + i * 22, 21], fill=c)
    d.rounded_rectangle([110, 6, 600, 24], radius=9, fill=WEISS); d.text((125, 15), 'hartwig.de', font=f(15, 'Medium'), fill='#666', anchor='lm')
    d.rectangle([0, 30, W, 100], fill=ROT); logo(d, 22, 40, 50, ROT, WEISS)
    d.text((88, 65), 'hartwig.de', font=f(40, 'ExtraBold'), fill=WEISS, anchor='lm')
    for i, t in enumerate(['Damen', 'Herren', 'Kinder', 'Wohnen']): d.text((400 + i * 105, 65), t, font=f(24, 'Bold'), fill=WEISS, anchor='lm')
    d.rectangle([30, 120, W - 30, 250], fill='#e6dccb')
    d.text((60, 165), 'Neue Herbstmode', font=f(44, 'ExtraBold'), fill=TINTE, anchor='lm')
    d.rounded_rectangle([60, 200, 260, 238], radius=19, fill=PETROL); d.text((160, 219), 'Jetzt shoppen', font=f(22, 'Bold'), fill=WEISS, anchor='mm')
    hemd(d, 640, 128, 105, KL[0]); kleid(d, 770, 128, 90, ROT_D)
    fns = [(hemd, KL[2]), (kleid, KL[4]), (schuh, KL[3]), (tasche, '#2b2b2d')]
    for i, (fn, c) in enumerate(fns):
        x = 30 + i * 215; d.rectangle([x, 270, x + 195, 440], fill='#ece8e0')
        fn(d, x + 97, 295, 100, c)
        d.text((x + 8, 468), ['Pullover', 'Kleid', 'Sneaker', 'Tasche'][i], font=f(24, 'Bold'), fill=TINTE, anchor='lm')
        d.text((x + 8, 500), ['39,99 €', '59,99 €', '79,99 €', '49,99 €'][i], font=f(24, 'ExtraBold'), fill=ROT, anchor='lm')
        d.rounded_rectangle([x + 140, 485, x + 190, 515], radius=8, fill=PETROL); d.text((x + 165, 500), '+', font=f(28, 'Bold'), fill=WEISS, anchor='mm')
    speichern(im, 'shop')


def social():
    W, H = 400, 820; im = Image.new('RGB', (W, H), WEISS); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 40], fill=WEISS); d.text((24, 22), '9:41', font=f(20, 'Bold'), fill=TINTE, anchor='lm')
    d.rectangle([330, 14, 370, 28], outline=TINTE, width=2); d.rectangle([333, 17, 360, 25], fill=TINTE)
    logo(d, 20, 55, 62, WEISS, ROT); d.text((95, 75), 'hartwig', font=f(28, 'ExtraBold'), fill=TINTE, anchor='lm')
    d.text((95, 104), 'Gesponsert', font=f(18, 'Medium'), fill='#888', anchor='lm')
    d.rectangle([0, 135, W, 545], fill='#e7ddcc')
    d.ellipse([140, 165, 260, 285], fill='#e2b897')  # Kopf
    d.pieslice([118, 150, 282, 280], 180, 360, fill='#5a3a28')
    hemd(d, 200, 275, 300, KL[0]); d.rectangle([100, 470, 300, 545], fill='#2b2f36')
    d.rounded_rectangle([20, 490, 190, 530], radius=20, fill=WEISS); d.text((105, 510), 'Neu im Shop', font=f(20, 'Bold'), fill=TINTE, anchor='mm')
    # Herz, Kommentar, Teilen
    def herz(x, y, s, c):
        d.ellipse([x, y, x + s / 2, y + s / 2], fill=c); d.ellipse([x + s / 2, y, x + s, y + s / 2], fill=c)
        d.polygon([(x + 2, y + s * 0.34), (x + s - 2, y + s * 0.34), (x + s / 2, y + s * 0.95)], fill=c)
    herz(24, 565, 44, ROT)
    d.ellipse([88, 565, 132, 605], outline=TINTE, width=5); d.polygon([(95, 595), (92, 612), (108, 602)], fill=TINTE)
    d.polygon([(152, 590), (196, 566), (182, 610)], outline=TINTE, width=5)
    d.text((24, 645), '12.408 Mal gefällt das', font=f(22, 'Bold'), fill=TINTE, anchor='lm')
    d.text((24, 680), 'hartwig Die Herbstmode ist da!', font=f(20, 'Medium'), fill=TINTE, anchor='lm')
    textzeilen(d, 24, 705, 330, 2, 22, 8, GRAU_H)
    d.rounded_rectangle([20, 762, W - 20, 806], radius=12, fill=PETROL); d.text((W / 2, 784), 'Jetzt ansehen', font=f(22, 'Bold'), fill=WEISS, anchor='mm')
    speichern(im, 'social')


def mailing():
    # Briefumschlag Vorderseite
    W, H = 640, 400; im = Image.new('RGB', (W, H), '#f7f3ea'); d = ImageDraw.Draw(im)
    logo(d, 30, 30, 70, ROT, WEISS); d.rounded_rectangle([30, 30, 100, 100], radius=15, fill=ROT); logo(d, 30, 30, 70)
    d.text((115, 50), 'HARTWIG', font=f(34, 'ExtraBold'), fill=ROT, anchor='lm'); d.text((115, 84), 'Ihr Warenhaus', font=f(20, 'Medium'), fill=TINTE, anchor='lm')
    d.rectangle([505, 30, 610, 140], fill='#e7dccb', outline='#b9ab95', width=3); d.rectangle([520, 45, 595, 125], fill=PETROL)
    d.ellipse([538, 62, 578, 102], fill='#f7f3ea')
    textzeilen(d, 300, 220, 560, 3, 34, 12, '#7c7a76', True)
    d.rectangle([30, 300, 240, 370], fill=ROT); d.text((135, 335), 'Gutschein', font=f(34, 'ExtraBold'), fill=WEISS, anchor='mm')
    speichern(im, 'mailing')


def handy_mail():
    W, H = 400, 820; im = Image.new('RGB', (W, H), '#f3f4f6'); d = ImageDraw.Draw(im)
    d.text((24, 22), '9:41', font=f(20, 'Bold'), fill=TINTE, anchor='lm')
    d.rounded_rectangle([18, 70, W - 18, 250], radius=24, fill=WEISS)
    logo(d, 36, 90, 54); d.text((104, 104), 'HARTWIG', font=f(24, 'ExtraBold'), fill=TINTE, anchor='lm'); d.text((104, 132), 'jetzt', font=f(18, 'Medium'), fill='#888', anchor='lm')
    d.text((36, 180), 'Ihr Gutschein: −10 %', font=f(28, 'ExtraBold'), fill=ROT, anchor='lm')
    textzeilen(d, 36, 210, 340, 2, 20, 8, GRAU_H)
    d.rounded_rectangle([18, 270, W - 18, 400], radius=24, fill=WEISS); textzeilen(d, 36, 300, 340, 4, 24, 9, GRAU_H)
    d.rounded_rectangle([18, 420, W - 18, 550], radius=24, fill=WEISS); textzeilen(d, 36, 450, 340, 4, 24, 9, GRAU_H)
    speichern(im, 'handy-mail')


def kundenkarte():
    W, H = 856, 540; im = Image.new('RGB', (W, H), ROT); d = ImageDraw.Draw(im)
    d.polygon([(W * 0.55, 0), (W, 0), (W, H), (W * 0.3, H)], fill='#c8352c')
    logo(d, 50, 50, 130, WEISS, ROT)
    d.rounded_rectangle([50, 50, 180, 180], radius=29, fill=WEISS); logo(d, 50, 50, 130, ROT, WEISS)
    d.text((210, 115), 'HARTWIG', font=f(92, 'ExtraBold'), fill=WEISS, anchor='lm')
    d.rounded_rectangle([60, 250, 190, 340], radius=14, fill='#e2c26a'); d.line([60, 295, 190, 295], fill='#b8963e', width=4); d.line([125, 250, 125, 340], fill='#b8963e', width=4)
    d.text((60, 420), '4711  0815  2026', font=f(52, 'SemiBold'), fill=WEISS, anchor='lm')
    d.text((60, 485), 'Kundenkarte', font=f(36, 'Bold'), fill=WEISS, anchor='lm')
    speichern(im, 'kundenkarte')


def leser():
    W, H = 300, 200; im = Image.new('RGB', (W, H), '#cfe3d7'); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, H], fill='#d9ece3')
    d.text((W / 2, 70), '+120', font=f(78, 'ExtraBold'), fill='#1f4d3a', anchor='mm'); d.text((W / 2, 150), 'Punkte', font=f(44, 'Bold'), fill='#1f4d3a', anchor='mm')
    speichern(im, 'leser')


def kalender():
    W, H = 600, 640; im = Image.new('RGB', (W, H), WEISS); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 130], fill=ROT); d.text((W / 2, 68), 'Oktober', font=f(78, 'ExtraBold'), fill=WEISS, anchor='mm')
    tage = 'MDMDFSS'
    for i, t in enumerate(tage): d.text((52 + i * 82, 168), t, font=f(30, 'Bold'), fill='#8a8580', anchor='mm')
    n = 1
    for r in range(5):
        for c in range(7):
            if r == 0 and c < 3: continue
            if n > 31: break
            x, y = 52 + c * 82, 235 + r * 88
            if n in (9, 10, 11): d.rounded_rectangle([x - 38, y - 34, x + 38, y + 34], radius=12, fill='#cfe1ea')
            if n == 24: d.ellipse([x - 36, y - 36, x + 36, y + 36], outline=ROT, width=7)
            if n == 17: d.rounded_rectangle([x - 36, y - 34, x + 36, y + 34], radius=12, fill='#f2d38a')
            d.text((x, y), str(n), font=f(38, 'Bold'), fill=TINTE if c < 6 else ROT, anchor='mm'); n += 1
    speichern(im, 'kalender')


def paket():
    W, H = 400, 300; im = Image.new('RGB', (W, H), WEISS); d = ImageDraw.Draw(im)
    logo(d, 20, 20, 64); d.text((100, 52), 'hartwig.de', font=f(38, 'ExtraBold'), fill=TINTE, anchor='lm')
    textzeilen(d, 22, 110, 260, 3, 26, 10, '#8a8580')
    for i in range(36):
        w = [3, 6, 3, 9, 3, 3, 6][i % 7]; x = 22 + i * 10
        if x + w < W - 20: d.rectangle([x, 210, x + w, 280], fill=TINTE)
    speichern(im, 'paket')


def handelsbote():
    W, H = 600, 780; im = Image.new('RGB', (W, H), '#f1ede4'); d = ImageDraw.Draw(im)
    d.text((W / 2, 70), 'Der Handelsbote', font=f(70, 'ExtraBold'), fill=TINTE, anchor='mm')
    d.rectangle([30, 118, W - 30, 124], fill=TINTE); d.rectangle([30, 132, W - 30, 134], fill=TINTE)
    d.text((30, 190), 'Hartwig eröffnet', font=f(58, 'ExtraBold'), fill=TINTE, anchor='lm')
    d.text((30, 252), 'neues Haus', font=f(58, 'ExtraBold'), fill=TINTE, anchor='lm')
    d.rectangle([30, 300, 360, 560], fill='#cbbfa9')
    d.rectangle([60, 360, 330, 560], fill='#e9e1d2'); d.rectangle([60, 360, 330, 395], fill=ROT)
    for i in range(3): d.rectangle([80 + i * 85, 420, 140 + i * 85, 500], fill='#9dc2dc')
    textzeilen(d, 385, 305, W - 30, 15, 17, 7)
    for c in range(3): textzeilen(d, 30 + c * 185, 590, 30 + c * 185 + 165, 10, 17, 7)
    speichern(im, 'handelsbote')


def buch():
    W, H = 500, 680
    for seite in ('links', 'rechts'):
        im = Image.new('RGB', (W, H), '#f6efdd'); d = ImageDraw.Draw(im)
        if seite == 'links':
            d.text((50, 80), '1928', font=f(64, 'ExtraBold'), fill=ROT_D, anchor='lm')
            d.rectangle([50, 130, W - 50, 400], fill='#b9a07b'); d.rectangle([70, 150, W - 70, 380], fill='#cdb894')
            d.rectangle([110, 220, W - 110, 380], fill='#a88b62'); d.rectangle([110, 220, W - 110, 245], fill='#7a5f3e')
            for i in range(4): d.rectangle([130 + i * 65, 270, 165 + i * 65, 330], fill='#e6d8b8')
            textzeilen(d, 50, 440, W - 50, 9, 24, 9, '#a69a85')
        else:
            textzeilen(d, 50, 70, W - 50, 10, 24, 9, '#a69a85')
            d.text((50, 360), '1975', font=f(64, 'ExtraBold'), fill=ROT_D, anchor='lm')
            textzeilen(d, 50, 410, W - 50, 9, 24, 9, '#a69a85')
        speichern(im, f'buch-{seite}')


def podest():
    for n in (1, 2, 3):
        im = Image.new('RGB', (300, 300), WEISS); d = ImageDraw.Draw(im)
        d.text((150, 150), str(n), font=f(220, 'Black'), fill=TINTE, anchor='mm')
        speichern(im, f'platz-{n}')


def info():
    W, H = 500, 600; im = Image.new('RGB', (W, H), PETROL); d = ImageDraw.Draw(im)
    d.ellipse([90, 60, 410, 380], fill=WEISS)
    d.text((W / 2, 225), '?', font=f(260, 'Black'), fill=PETROL, anchor='mm')
    d.text((W / 2, 470), 'Einführung', font=f(64, 'ExtraBold'), fill=WEISS, anchor='mm')
    speichern(im, 'info')


def ziffernblatt():
    S = 600; im = Image.new('RGB', (S, S), '#f7f5f0'); d = ImageDraw.Draw(im); c = S / 2
    for i in range(60):
        w = math.radians(i * 6 - 90); l = 46 if i % 5 == 0 else 24; b = 9 if i % 5 == 0 else 4
        r1, r2 = c - 28, c - 28 - l
        d.line([c + r1 * math.cos(w), c + r1 * math.sin(w), c + r2 * math.cos(w), c + r2 * math.sin(w)], fill=TINTE, width=b)
    d.pieslice([100, 100, S - 100, S - 100], -90, 30, fill='#f3cfc9')
    for i, t in enumerate(['60', '15', '30', '45']):
        w = math.radians(i * 90 - 90); r = c - 135
        d.text((c + r * math.cos(w), c + r * math.sin(w)), t, font=f(54, 'ExtraBold'), fill=TINTE, anchor='mm')
    w = math.radians(30); d.line([c, c, c + 220 * math.cos(w), c + 220 * math.sin(w)], fill=ROT, width=12)
    d.ellipse([c - 22, c - 22, c + 22, c + 22], fill=ROT)
    # Kreisform ausschneiden (Rand transparent wird nicht genutzt; die Fläche liegt auf einer Scheibe)
    speichern(im, 'ziffernblatt')


def streifen():
    im = Image.new('RGB', (400, 600), WEISS); d = ImageDraw.Draw(im)
    for i in range(0, 400, 80): d.rectangle([i, 0, i + 40, 600], fill=PETROL)
    speichern(im, 'streifen')


def ruecken():
    # Ordnerrücken: Etikett mit Jahreszahl und Griffloch
    for i, (farbe, txt) in enumerate([('#2f5d7c', '2024'), ('#6d8f5e', '2025'), (ROT, '2026'), ('#c98a4b', '2027')]):
        im = Image.new('RGB', (160, 600), farbe); d = ImageDraw.Draw(im)
        d.rounded_rectangle([22, 60, 138, 300], radius=8, fill=WEISS)
        d.text((80, 130), txt[:2], font=f(52, 'ExtraBold'), fill=TINTE, anchor='mm'); d.text((80, 200), txt[2:], font=f(52, 'ExtraBold'), fill=TINTE, anchor='mm')
        textzeilen(d, 40, 245, 120, 2, 18, 6, GRAU)
        d.ellipse([50, 420, 110, 480], fill='#1d1f22'); d.ellipse([50, 420, 110, 480], outline='#d9d6cf', width=6)
        speichern(im, f'ordner-{i + 1}')


def schublade():
    im = Image.new('RGB', (300, 120), '#d8d3ca'); d = ImageDraw.Draw(im)
    d.rectangle([10, 10, 290, 110], fill=WEISS, outline='#8a8580', width=6)
    d.text((150, 60), 'Spielstand', font=f(48, 'ExtraBold'), fill=TINTE, anchor='mm')
    speichern(im, 'schild')


def schaufenster():
    W, H = 1000, 160; im = Image.new('RGB', (W, H), ROT); d = ImageDraw.Draw(im)
    logo(d, 330, 22, 116, ROT, WEISS)
    d.text((470, 80), 'HARTWIG', font=f(104, 'ExtraBold'), fill=WEISS, anchor='lm')
    speichern(im, 'band')
    im = Image.new('RGB', (600, 200), ROT); d = ImageDraw.Draw(im)
    d.text((300, 100), 'SALE −30 %', font=f(104, 'Black'), fill=WEISS, anchor='mm')
    speichern(im, 'fensterschrift')


def menue_blatt():
    W, H = 600, 800; im = Image.new('RGB', (W, H), WEISS); d = ImageDraw.Draw(im)
    logo(d, 40, 40, 80); d.text((140, 80), 'Hartwig', font=f(50, 'ExtraBold'), fill=TINTE, anchor='lm')
    textzeilen(d, 40, 170, 560, 12, 40, 14, GRAU_H)
    speichern(im, 'blatt')


def logo_flaechen():
    im = Image.new('RGB', (300, 300), ROT); d = ImageDraw.Draw(im); logo(d, 0, 0, 300); speichern(im, 'logo')
    W, H = 400, 500; im = Image.new('RGB', (W, H), '#f4f1ea'); d = ImageDraw.Draw(im)
    logo(d, 110, 120, 180); d.text((W / 2, 370), 'HARTWIG', font=f(64, 'ExtraBold'), fill=ROT, anchor='mm')
    speichern(im, 'tuete')


if __name__ == '__main__':
    logo_flaechen()
    prospekt(); zeitung_seiten(); plakat(); werbetafel(); shop(); social(); mailing(); handy_mail(); kundenkarte(); leser()
    kalender(); paket(); handelsbote(); buch(); podest(); info(); ziffernblatt(); streifen(); ruecken(); schublade(); schaufenster(); menue_blatt()
