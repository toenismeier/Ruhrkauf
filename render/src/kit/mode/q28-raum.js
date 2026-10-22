// Q28: kleine Raum-Hilfe für Dreiviertelansichten (Schuhe, Taschen) im Stil der Bibliothek.
// Körper werden als Netz aus Vierecken beschrieben, projiziert, als eine Fläche (Vereinigung) gefüllt und
// mit wenigen Helligkeitsstufen schattiert (Licht von links oben). Ergebnis bleibt flaches SVG wie stoff.js.

import { hell, dunkel } from './stoff.js';

const f = (n) => Math.round(n * 100) / 100;
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const kreuz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punkt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Kamera: az = Drehung um die Hochachse (0 = genau von vorn auf die Spitze), el = Blick von oben.
export function kamera({ az = 38, el = 26, mass = 60, x0 = 50, y0 = 60 } = {}) {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
  const blick = [ce * ca, ce * sa, se];
  const licht = norm([0.55 * sa + 0.35 * blick[0], -0.55 * ca + 0.35 * blick[1], 0.75 + 0.35 * blick[2]]);
  const P = ([x, y, z]) => {
    const xr = x * ca + y * sa, yr = -x * sa + y * ca;
    return [x0 + yr * mass, y0 + (-z * ce + xr * se) * mass];
  };
  const tiefe = ([x, y, z]) => (x * ca + y * sa) * ce + z * se;
  return { P, blick, licht, tiefe, mass };
}

// Netz aus Ringen (gleiche Punktzahl je Ring): Vierecke zwischen Ring i und i+1.
// innen: Punkt im Körperinneren je Viereck (Funktion) für die Ausrichtung der Normalen.
export function netz(ringe, { zu = false, innen } = {}) {
  const q = [];
  for (let i = 0; i < ringe.length - 1; i++) {
    const A = ringe[i], B = ringe[i + 1], n = A.length;
    const ende = zu ? n : n - 1;
    for (let j = 0; j < ende; j++) {
      const k = (j + 1) % n;
      q.push({ p: [A[j], A[k], B[k], B[j]], i, j, innen: innen ? innen(i, j) : null });
    }
  }
  return q;
}

function flaecheZu(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}
const pfad = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L') + ' Z';

// Vierecke → { d (Vereinigung), stufen: [[d, farbe, deckkraft]] }
export function projiziere(K, vierecke, { stufen = true, nurSichtbar = false, kontrast = 1 } = {}) {
  const alle = [], bins = [[], [], [], [], [], []];
  for (const v of vierecke) {
    const m = v.p.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0]);
    let n = norm(kreuz(sub(v.p[1], v.p[0]), sub(v.p[3], v.p[0])));
    if (Math.hypot(...n) < 0.5) n = norm(kreuz(sub(v.p[2], v.p[1]), sub(v.p[0], v.p[1])));
    if (v.innen && punkt(n, sub(m, v.innen)) < 0) n = n.map((x) => -x);
    const sicht = punkt(n, K.blick) > 0;
    let q = v.p.map(K.P);
    if (Math.abs(flaecheZu(q)) < 1e-4) continue;
    if (flaecheZu(q) < 0) q = q.reverse();
    if (!nurSichtbar || sicht) alle.push(pfad(q));
    if (stufen && sicht) {
      const l = punkt(n, K.licht) * kontrast;
      const b = l > 0.72 ? 0 : l > 0.45 ? 1 : l > 0.15 ? 2 : l > -0.15 ? 3 : l > -0.45 ? 4 : 5;
      bins[b].push(pfad(q));
    }
  }
  const ton = [['#fff', 0.13], ['#fff', 0.05], null, ['#000', 0.08], ['#000', 0.16], ['#000', 0.24]];
  return { d: alle.join(''), stufen: bins.map((b, i) => (b.length && ton[i] ? [b.join(''), ...ton[i]] : null)).filter(Boolean) };
}

// Ein Körper im Stoffstil: Kontur (nur außen sichtbar), Grundfarbe, Struktur, Licht, Glanz.
let laufend = 0;
export function koerper(S, g, o = {}) {
  if (!g.d) return '';
  const c = o.farbe ?? (o.ton ? (o.ton > 0 ? hell(S.c, o.ton) : dunkel(S.c, -o.ton)) : S.c);
  const t = [`<path d="${g.d}" fill="none" stroke="${o.kontur ?? S.cK}" stroke-width="${o.kw ?? 1.2}" stroke-linejoin="round" opacity="0.6"/>`];
  t.push(`<path d="${g.d}" fill="${c}"/>`);
  if (S.tex && o.tex !== false) t.push(`<path d="${g.d}" fill="${S.tex}"/>`);
  if (g.stufen.length) {
    // Schattierung weich: Stufen leicht verwischt, auf den Körper beschnitten
    const id = S.id + 'k' + (++laufend).toString(36);
    if (S.defs) S.defs.push(`<clipPath id="${id}c"><path d="${g.d}"/></clipPath><filter id="${id}b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${o.weich ?? 0.9}"/></filter>`);
    t.push(`<g clip-path="url(#${id}c)"><g filter="url(#${id}b)">${g.stufen.map(([d, farbe, op]) => `<path d="${d}" fill="${farbe}" opacity="${op}"/>`).join('')}</g></g>`);
  }
  if (S.glanz && o.glanz !== false) t.push(`<path d="${g.d}" fill="url(#${S.id}g)"/>`);
  return t.join('');
}

// Linie über projizierte Punkte
export function polylinie(K, pts, farbe, w = 0.6, o = {}) {
  const q = pts.map(K.P);
  return `<path d="M${q.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')}${o.zu ? ' Z' : ''}" fill="${o.fill ?? 'none'}" stroke="${farbe}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}/>`;
}
export function flaecheP(K, pts, fill, o = {}) {
  const q = pts.map(K.P);
  return `<path d="${pfad(q)}" fill="${fill}"${o.op != null ? ` opacity="${o.op}"` : ''}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.w ?? 0.5}" stroke-linejoin="round"` : ''}/>`;
}
export const glatt3 = (pts, n = 3) => {
  // Chaikin-Glättung für 3D-Polylinien (offen)
  let p = pts;
  for (let k = 0; k < n; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push(a.map((v, j) => v * 0.75 + b[j] * 0.25), a.map((v, j) => v * 0.25 + b[j] * 0.75));
    }
    q.push(p.at(-1));
    p = q;
  }
  return p;
};
export const bodenschatten = (cx, cy, rx, ry = 3, op = 0.1) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#000" opacity="${op}"/>`;
