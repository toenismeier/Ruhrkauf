// Model-Bilder (O10, Ummo 27.10.2026): je Artikeltyp und Grundfigur eine ganze Zeichnung (Qwen-Image-Edit auf der Grundfigur mit dem Freisteller,
// Sitz geprüft gegen ein Referenz-Modelfoto). Erzeugt mit den Skripten im privaten Repo hartwig-ref-p01 (models/), nicht von Hand ändern.
// Daten je Schlüssel `${silhouette}__${geschlecht}_${zielgruppe}`: { w, h, bild (WebP base64), maske (Pfad der Produktfläche), grund, l }.
// Umfärben: Produktfläche (Maske aus Kleidungs-Segmentierung) über Helligkeit + Tonkurve auf die Zielfarbe, Musterfeld (Q37) darüber im Multiplizieren-Modus.
import { MODEL_BILDER } from './model-bilder-daten.js';
import { farbeVon, materialDefs } from './stoff.js';
import { musterFuellung, istMuster } from './q37-muster.js';

let zaehler = 0;
const rgb01 = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);

// Tonkurve je Kanal: bis zur Grundhelligkeit l linear auf die Zielfarbe, darüber leicht Richtung Weiß (Glanzlichter bleiben sichtbar)
function tonkurve(z, l) {
  const g = Math.max(0.03, Math.min(0.97, l)), n = 32, w = [];
  for (let i = 0; i <= n; i++) {
    const y = i / n;
    const t = y <= g ? z * y / g : z + (1 - z) * 0.6 * ((y - g) / (1 - g)) ** 2;
    w.push(Math.min(1, t).toFixed(3));
  }
  return w.join(' ');
}

export const hatModelBild = (id, g, zg) => !!MODEL_BILDER[`${id}__${g}_${zg}`];

export function modelBildSVG(id, g, zg, farbe, { groesse = 300, hintergrund = '#eef1f4', muster } = {}) {
  const D = MODEL_BILDER[`${id}__${g}_${zg}`];
  if (!D) return null;
  const uid = 'mb' + (++zaehler).toString(36);
  const c = farbe ? farbeVon(farbe) : D.grund;
  const ziel = rgb01(c);
  const L = '0.299 0.587 0.114 0 0';
  const m = `${L} ${L} ${L} 0 0 0 1 0`;   // erst Helligkeit
  const funcs = ['R', 'G', 'B'].map((ch, i) => `<feFunc${ch} type="table" tableValues="${tonkurve(ziel[i], D.l)}"/>`).join('');
  const src = 'data:image/webp;base64,' + D.bild;
  const defs = [`<filter id="${uid}f" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${m}"/><feComponentTransfer>${funcs}</feComponentTransfer></filter>`, `<clipPath id="${uid}c"><path d="${D.maske}" fill-rule="evenodd"/></clipPath>`];
  let musterSchicht = '';
  if (muster && muster !== 'uni' && istMuster(muster)) {
    const S = materialDefs(c, 'baumwolle', defs); const f = musterFuellung(S, muster);
    const s = D.h / 100;   // Muster sind auf 100er-Raster angelegt
    if (f) musterSchicht = `<g transform="scale(${s.toFixed(3)})" style="mix-blend-mode:multiply"><rect width="${(D.w / s).toFixed(1)}" height="100" fill="${f}" opacity="0.9"/></g>`;
  }
  const breite = Math.round(groesse * D.w / D.h);
  const hg = hintergrund ? `<rect width="${D.w}" height="${D.h}" fill="${hintergrund}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${D.w} ${D.h}" width="${breite}" height="${groesse}"><defs>${defs.join('')}</defs>${hg}`
    + `<image href="${src}" width="${D.w}" height="${D.h}" style="mix-blend-mode:multiply"/>`
    + `<g clip-path="url(#${uid}c)"><image href="${src}" width="${D.w}" height="${D.h}" filter="url(#${uid}f)"/>${musterSchicht}</g></svg>`;
}
