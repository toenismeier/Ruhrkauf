// Katalog Produktbilder: alle Artikeltypen in Standardfarbe und -material plus fünf weiteren Farben,
// Materialreihe (gleicher Typ in allen Materialien) und Typ-Kacheln.
import { produktbildSVG, typKachelSVG, ARTIKELTYPEN_BILD, FARBEN_PRODUKT, MATERIALIEN_BILD, STANDARD_MATERIAL, STANDARD_FARBE } from '../kit/produktbild.js';

const FARBREIHE = ['mintgrün', 'marine', 'bordeaux', 'sand', 'schwarz'];
const zeilen = [];
for (const typ of ARTIKELTYPEN_BILD) {
  zeilen.push({ titel: typ, unter: `${STANDARD_MATERIAL[typ]} · Standard ${STANDARD_FARBE[typ]}`, bilder: [STANDARD_FARBE[typ], ...FARBREIHE].map((f) => [produktbildSVG(typ, f, undefined, 150), f]) });
}
for (const typ of ['Kaschmirpullover', 'Hemd', 'Handtasche', 'Kleid']) {
  zeilen.push({ titel: `${typ}: Materialien`, unter: '', bilder: MATERIALIEN_BILD.map((m) => [produktbildSVG(typ, typ === 'Handtasche' ? 'cognac' : 'petrol', m, 150), m]) });
}
const typen = ARTIKELTYPEN_BILD.concat(['Unbekannt']);
for (let i = 0; i < typen.length; i += 10) zeilen.push({ titel: 'Typ-Kacheln', unter: '', bilder: typen.slice(i, i + 10).map((t) => [typKachelSVG(t, 150), t]) });
zeilen.push({ titel: 'Farbpalette', unter: Object.keys(FARBEN_PRODUKT).length + ' Farben', palette: true });

const B = 160, LINKS = 230, kopf = 70, ZH = 190;
const spalten = 10;
const blatt = document.createElement('canvas');
blatt.width = LINKS + spalten * B; blatt.height = kopf + zeilen.length * ZH + 120;
const g = blatt.getContext('2d');
g.fillStyle = '#1d262e'; g.fillRect(0, 0, blatt.width, blatt.height);
g.fillStyle = '#fff'; g.font = 'bold 34px "DejaVu Sans", Arial'; g.fillText('Produktbilder Eigenmarken: Typen, Farben, Materialien', 20, 48);
window.fehler = [];
const lade = (svg) => new Promise((ok, f) => { const im = new Image(); im.onload = () => ok(im); im.onerror = f; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
(async () => {
  for (let z = 0; z < zeilen.length; z++) {
    const Zl = zeilen[z], y = kopf + z * ZH;
    g.fillStyle = z % 2 ? '#202c35' : '#243340'; g.fillRect(0, y, blatt.width, ZH - 4);
    g.fillStyle = '#fff'; g.font = 'bold 18px "DejaVu Sans", Arial'; g.fillText(Zl.titel, 14, y + 40, LINKS - 20);
    g.fillStyle = '#8fa1ae'; g.font = '13px "DejaVu Sans", Arial'; g.fillText(Zl.unter, 14, y + 62, LINKS - 20);
    if (Zl.palette) {
      Object.entries(FARBEN_PRODUKT).forEach(([n, c], i) => {
        const x = LINKS + (i % 14) * 112, yy = y + 10 + Math.floor(i / 14) * 90;
        g.fillStyle = c; g.fillRect(x, yy, 60, 50); g.fillStyle = '#ddd'; g.font = '13px "DejaVu Sans", Arial'; g.fillText(n, x, yy + 68);
      });
      continue;
    }
    for (let i = 0; i < Zl.bilder.length; i++) {
      const [svg, name] = Zl.bilder[i], x = LINKS + i * B;
      try { g.drawImage(await lade(svg), x + 5, y + 6, 150, 150); } catch (err) { window.fehler.push(`${Zl.titel} ${name}: ${err}`); }
      g.fillStyle = '#c9d4db'; g.font = '13px "DejaVu Sans", Arial'; g.fillText(name, x + 10, y + 176, B - 14);
    }
  }
  window.bild = blatt.toDataURL('image/png'); window.fertig = true;
})();
