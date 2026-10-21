// Q02: maßhaltige, flache Dachinstallationen auf Flachdächern.
// Geometrie ausschließlich über S; Zufall stammt ausschließlich vom übergebenen rng(seed).
import { dachPasst } from './q02-qualitaet.js';

const FARBEN = { lueftung: '#b8bec1', aufzug: '#c9c6bf', oberlicht: '#a4c4d0',
  solar: '#304e74', dachgarten: '#65885e' };

export function dachInstallationen(S, dach, r, o = {}) {
  if (!dach || dach.steil) return [];
  const width = dach.x1 - dach.x0, depth = dach.z1 - dach.z0;
  if (width < 8 || depth < 8) return [];
  const max = Math.min(5, o.max ?? 3, Math.max(1, Math.floor(width * depth / 220)));
  const moeglich = ['lueftung', 'aufzug', 'oberlicht', 'solar', 'dachgarten'];
  const erlaubte = [];
  // Bei jedem Dach höchstens drei Varianten und nie ein festes, wiederholtes Reihenmuster.
  while (erlaubte.length < 3) {
    const art = moeglich[Math.floor(r() * moeglich.length)];
    if (!erlaubte.includes(art)) erlaubte.push(art);
  }
  const gebaut = [];
  const schnitt = (x, z, w, d) => gebaut.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 0.6
    && Math.abs(q.z - z) < (q.d + d) / 2 + 0.6);
  const teile = {
    lueftung: [3.8, 2.5, 1.15], aufzug: [3.2, 3.4, 2.7],
    oberlicht: [3.6, 2.5, 0.5], solar: [4.6, 3.0, 0.5], dachgarten: [5.0, 3.5, 0.7],
  };
  for (let n = 0; n < max; n++) {
    const art = erlaubte[n % erlaubte.length];
    const [bw, bd, h] = teile[art];
    if (width < bw + 2 || depth < bd + 2) continue;
    let x, z;
    for (let versuch = 0; versuch < 12; versuch++) {
      x = dach.x0 + 1 + bw / 2 + r() * (width - bw - 2);
      z = dach.z0 + 1 + bd / 2 + r() * (depth - bd - 2);
      if (dachPasst(dach, x, z, bw, bd, 0.9) && !schnitt(x, z, bw, bd) && !(o.reserviert?.(x, z, Math.max(bw, bd) / 2))) break;
      x = null;
    }
    if (x === null) continue;
    const y = dach.y, f = o.farbe ?? FARBEN[art];
    if (art === 'lueftung') {
      S.box(bw, h, bd, x, y + h / 2, z, f);
      for (const v of [-0.8, -0.35, 0.1, 0.55]) S.box(bw - 0.4, 0.06, 0.06, x, y + h / 2 + v * h / 2, z + bd / 2 + 0.02, '#626b72');
    } else if (art === 'aufzug') {
      S.box(bw, h, bd, x, y + h / 2, z, f);
      S.box(bw + 0.08, 0.12, bd + 0.08, x, y + h + 0.06, z, '#92999a');
    } else if (art === 'oberlicht') {
      S.box(bw, 0.23, bd, x, y + 0.115, z, '#8c989b');
      S.box(bw - 0.4, 0.29, bd - 0.4, x, y + 0.38, z, '#8eafb9');
    } else if (art === 'solar') {
      // Flaches Solarfeld, vollständig aufgeständert. Kein schwebender schräger Körper.
      S.box(bw, 0.15, bd, x, y + 0.43, z, '#304e74');
      for (const v of [-1, 1]) S.box(0.16, 0.4, bd - 0.4, x + v * (bw / 2 - 0.3), y + 0.2, z, '#868e94');
      S.box(0.05, 0.04, bd - 0.18, x, y + 0.53, z, '#9bb1c4');
    } else {
      S.box(bw, 0.17, bd, x, y + 0.085, z, '#b9b3a2');
      for (const v of [-1, 0, 1]) {
        const xx = x + v * 1.3;
        S.box(1.05, 0.43, 1.4, xx, y + 0.38, z, '#b49f88');
        S.box(0.8, 0.4, 1.1, xx, y + 0.74, z, '#5c8b5a');
      }
    }
    const daten = { art, x, z, w: bw, d: bd, h, unten: y, dach };
    gebaut.push(daten);
    o.protokoll?.push(daten);
  }
  return gebaut;
}
