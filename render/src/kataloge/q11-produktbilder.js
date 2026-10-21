// Q11-Abnahmebild: jedes bekannte Produkt exakt einmal, nach Artikeltyp (ohne gemeinsame Fallbacks).
// cd render && node render-katalog.js q11-produktbilder
import { ARTIKELTYPEN_BILD, STANDARD_FARBE, STANDARD_MATERIAL, produktbildSVG } from '../kit/produktbild.js';

const SPALTEN = 8, BREITE = 170, HOEHE = 177, KOPF = 94;
const ZEILEN = Math.ceil(ARTIKELTYPEN_BILD.length / SPALTEN);
const blatt = document.createElement('canvas');
blatt.width = SPALTEN * BREITE;
blatt.height = KOPF + ZEILEN * HOEHE + 34;
const ctx = blatt.getContext('2d');
ctx.fillStyle = '#1c2732'; ctx.fillRect(0, 0, blatt.width, blatt.height);
ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Arial';
ctx.fillText('Q11 · Alle Artikeltypen mit eigener Silhouette', 20, 39);
ctx.font = '15px Arial'; ctx.fillStyle = '#afbeca';
ctx.fillText(ARTIKELTYPEN_BILD.length + ' Typen · Standardfarbe · gleiche Größe · keine gemeinsamen Bildvorlagen', 20, 67);

window.fehler = [];
const lade = (svg) => new Promise((ok, nein) => {
  const img = new Image(); img.onload = () => ok(img); img.onerror = nein;
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
});
const fingerprints = new Map();
(async () => {
  for (let i = 0; i < ARTIKELTYPEN_BILD.length; i++) {
    const typ = ARTIKELTYPEN_BILD[i], x = (i % SPALTEN) * BREITE, y = KOPF + Math.floor(i / SPALTEN) * HOEHE;
    ctx.fillStyle = i % 2 ? '#273747' : '#304153'; ctx.fillRect(x + 2, y + 2, BREITE - 4, HOEHE - 4);
    const svg = produktbildSVG(typ, STANDARD_FARBE[typ], STANDARD_MATERIAL[typ], 130);
    // Sichtbare primäre Kontur prüfen, nicht nur unterschiedliche SVG-Gradient-IDs.
    const kontur = svg.split('</defs>')[1]?.match(/<path d="([^"]+)"/)?.[1];
    if (!kontur) window.fehler.push(typ + ': Kontur fehlt');
    else if (fingerprints.has(kontur)) window.fehler.push(typ + ': gleiche Kontur wie ' + fingerprints.get(kontur));
    else fingerprints.set(kontur, typ);
    try { ctx.drawImage(await lade(svg), x + 20, y + 8, 130, 130); }
    catch (err) { window.fehler.push(typ + ': Bild konnte nicht geladen werden ' + err); }
    ctx.fillStyle = '#f4f5f6'; ctx.font = 'bold 12px Arial';
    const text = typ.length > 23 ? typ.slice(0, 22) + '…' : typ;
    ctx.fillText(text, x + 7, y + 157, BREITE - 12);
  }
  window.bild = blatt.toDataURL('image/png');
  window.fertig = true;
})();
