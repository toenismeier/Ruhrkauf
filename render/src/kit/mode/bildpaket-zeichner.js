// Wurf 4, Bildpakete B02–B30: gemeinsamer Zeichner für Fassung B + vtracer (gleicher Aufbau wie b01-bilder.js:
// Kontur, Bodenschatten, Licht von links). Die Daten je Paket stehen in <paket>-bilder.js (erzeugt, nicht von Hand ändern).
// Flächen:
//   ['t', zone, f, d]  Stoffton (umfärbbar: Stoff, Leder, Steine; f < 0 dunkler, f > 0 heller als die Zonenfarbe)
//   ['u', zone, f, d]  Musterdetail einer Zone (bleibt im Bild; entfällt, wenn das Q37-Musterfeld die Zone füllt)
//   ['m', f, d]        Metall in fester Farbe (Gold oder Silber, p.metall), nur Helligkeit aus dem Bild
//   ['k', d]           Kontur
//   ['f', hex, d]      feste Farbe
// Zone 0 = Hauptstoff (Farbe, Material, Musterfeld aus dem Artikeltyp), weitere Zonen über p.farben / p.materialien.
import { materialDefs, hell, dunkel, FARBEN } from './stoff.js';
import { musterFuellung, istMuster } from './q37-muster.js';

const KONTUR = '#1d1b1a';
export const METALL = { gold: FARBEN.gold, silber: FARBEN.silber };
const ton = (c, f) => (f > 0 ? hell(c, f) : f < 0 ? dunkel(c, -f) : c);

export function bildpaketZeichner(D, S, t, p) {
  if (!D) return;
  // Musterfeld (Q37): aus produktSVG (p.musterfeld) oder aus der Silhouette (p.muster)
  const feld = p.musterfeld ?? (p.muster && p.muster !== 'uni' && istMuster(p.muster) ? p.muster : null);
  if (feld && !p.musterfeld && !S.tex) S.tex = musterFuellung(S, feld);
  const K = [S];
  const n = 1 + Math.max(0, ...D.regionen.filter((r) => r[0] === 't' || r[0] === 'u').map((r) => r[1]));
  for (let i = 1; i < n; i++) K.push(materialDefs(p.farben?.[i - 1] ?? 'grau', p.materialien?.[i - 1] ?? 'baumwolle', S.defs));
  const met = METALL[p.metall ?? D.metall] ?? METALL.silber;
  const clip = S.id + 'bp';
  S.defs.push(`<clipPath id="${clip}"><path d="${D.kontur}" fill-rule="evenodd"/></clipPath>`);
  // Sets aus gleichen Teilen (z. B. Broschen-Set): ein Teil gezeichnet, D.kopien = [[cx, cy, drehung, skala], …] im Bildraum
  const boden = D.kopien ? Math.max(...D.kopien.map(([, cy, , sk]) => cy + (D.boden - 50) * sk)) : D.boden;
  const breite = D.kopien ? 84 : D.breite;
  if (!p.ohneSchatten) t.push(`<ellipse cx="50" cy="${(boden + 1.8).toFixed(1)}" rx="${Math.min(32, breite * 0.45).toFixed(1)}" ry="2.4" fill="#000" opacity="0.08"/>`);
  // Variante 1 (Sets aus zwei Designs, z. B. Broschen): Nebensteine dunkel, Hauptstein hell
  const zeichne = (variante) => {
    const KK = variante ? K.map((k, i) => ({ ...k, c: i === 0 ? hell(k.c, 0.45) : dunkel(k.c, 0.6) })) : K;
    const u = [];
    u.push(`<g clip-path="url(#${clip})">`);
    for (const r of D.regionen) {
      const d = r[r.length - 1];
      if (r[0] === 'k') u.push(`<path d="${d}" fill="${KONTUR}"/>`);
      else if (r[0] === 'f') u.push(`<path d="${d}" fill="${r[1]}"/>`);
      else if (r[0] === 'm') u.push(`<path d="${d}" fill="${ton(met, r[1])}"/>`);
      else if (r[0] === 'u') { if (!feld || r[1] > 0) u.push(`<path d="${d}" fill="${ton(KK[r[1]].c, r[2])}"/>`); }
      else { const k = KK[r[1]]; u.push(`<path d="${d}" fill="${ton(k.c, r[2])}"/>`); if (k.tex) u.push(`<path d="${d}" fill="${k.tex}"/>`); }
    }
    // Licht von links wie alle Stoffe (stoff.js)
    u.push(`<path d="${D.kontur}" fill="url(#${S.id}l)" fill-rule="evenodd"/>`);
    u.push('</g>');
    return u.join('');
  };
  const inhalt = zeichne(0);
  if (!D.kopien) t.push(inhalt);
  else { const v1 = D.kopien.some((q) => q[4]) ? zeichne(1) : ''; for (const [cx, cy, r, sk, v] of D.kopien) t.push(`<g transform="translate(${cx} ${cy}) rotate(${r}) scale(${sk}) translate(-50 -50)">${v ? v1 : inhalt}</g>`); }
}
