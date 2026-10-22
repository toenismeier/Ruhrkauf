// Q18 · Katalog sämtlicher Zeitungsillustrationen. Claude: node render-katalog.js handelsbote
// Eigenständiger SVG-Katalog: genau dieselbe Funktion wie in der Spieloberfläche.
import { ZEITUNGS_ARTEN, zeitungsBild } from '../kit/zeitung.js';

const spalten = 5, bw = 295, bildH = 183, kh = 226, kopf = 72;
const zeilen = Math.ceil(ZEITUNGS_ARTEN.length / spalten);
const blatt = document.createElement('canvas');
blatt.width = spalten * bw;
blatt.height = kopf + zeilen * kh;
const g = blatt.getContext('2d');
g.fillStyle = '#f1f0ed';
g.fillRect(0, 0, blatt.width, blatt.height);
g.fillStyle = '#242424';
g.font = 'bold 29px Georgia, serif';
g.fillText('Der Handelsbote · Illustrationen nach Artikelart', 20, 41);
g.font = '14px Arial, sans-serif';
g.fillText(ZEITUNGS_ARTEN.length + ' fiktive Motive, unverändert aus dem Spielmodul', 21, 61);
const lade = (svg) => new Promise((ok, fail) => {
  const bild = new Image();
  bild.onload = () => ok(bild);
  bild.onerror = fail;
  bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
});
window.fehler = [];
(async () => {
  for (let i = 0; i < ZEITUNGS_ARTEN.length; i++) {
    const art = ZEITUNGS_ARTEN[i], x = (i % spalten) * bw, y = kopf + Math.floor(i / spalten) * kh;
    g.fillStyle = '#ffffff';
    g.fillRect(x + 4, y + 4, bw - 8, kh - 8);
    try {
      const bild = await lade(zeitungsBild(art, 'haus', i + 1));
      g.drawImage(bild, x + 8, y + 8, bw - 16, bildH);
    } catch (e) {
      window.fehler.push(art + ': ' + e.message);
      g.fillStyle = '#a52d38';
      g.fillRect(x + 8, y + 8, bw - 16, bildH);
    }
    g.fillStyle = '#242424';
    g.font = 'bold 14px Arial, sans-serif';
    g.fillText(art, x + 13, y + 207, bw - 26);
    g.strokeStyle = '#dedbd4';
    g.strokeRect(x + 4.5, y + 4.5, bw - 9, kh - 9);
  }
  window.bild = blatt.toDataURL('image/png');
  window.fertig = true;
})();
