// Q29: gemeinsame Bausteine der Home-, Beauty- und Spielwaren-Freisteller (nur für Q29-Zeichner).
// Produktfoto-Anmutung: Licht von links, weiche Standfläche, feine Kontur wie stoff.js flaeche().

import { hell, dunkel, mische, farbeVon, materialDefs } from './stoff.js';
export { hell, dunkel, mische, farbeVon, materialDefs };
export { glatt } from './model.js';
export { naht, linie } from './flatlay.js';
export { flaeche } from './stoff.js';

export const f = (n) => Math.round(n * 10) / 10;
export const E = 'ecke';
let zaehler = 0;
const uid = () => 'q' + (++zaehler).toString(36) + Math.random().toString(36).slice(2, 5);

// Zweitstoff/Zweitmaterial im selben Bild (Deckel, Griffe, Füllung)
export const stoff2 = (S, farbe, material = 'baumwolle', muster) => materialDefs(farbe, material, S.defs, muster);

// weiche Standfläche: Kernschatten und Halbschatten
export const boden = (cx, cy, rx, ry = 2.6) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * 1.08)}" ry="${f(ry * 1.5)}" fill="#000" opacity="0.05"/><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#000" opacity="0.09"/><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * 0.7)}" ry="${f(ry * 0.6)}" fill="#000" opacity="0.07"/>`;

// Verläufe (einmal je Bild)
function verlauf(S, schluessel, inhalt) {
  S._v ??= {};
  if (!S._v[schluessel]) { const id = uid(); S.defs.push(inhalt(id)); S._v[schluessel] = `url(#${id})`; }
  return S._v[schluessel];
}
// Rundkörper: links Licht, rechts Eigenschatten
export const rund = (S) => verlauf(S, 'rund', (id) => `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.08"/><stop offset="0.2" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.42" stop-color="#fff" stop-opacity="0.04"/><stop offset="0.82" stop-color="#000" stop-opacity="0.14"/><stop offset="1" stop-color="#000" stop-opacity="0.26"/></linearGradient>`);
// flache Körper: diagonal von links oben
export const diag = (S) => verlauf(S, 'diag', (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/></linearGradient>`);
// Glanzkante (Glas, Lack, Metall)
export const glanz = (S) => verlauf(S, 'glanz', (id) => `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.16" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.86" stop-color="#fff" stop-opacity="0"/><stop offset="0.93" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
// Metall (Edelstahl, Messing über Farbe)
export const metall = (S) => verlauf(S, 'metall', (id) => `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="0.18" stop-color="#fff" stop-opacity="0.6"/><stop offset="0.34" stop-color="#000" stop-opacity="0.1"/><stop offset="0.62" stop-color="#fff" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>`);

// Fläche in fester Farbe mit Licht und Kontur
export function form(S, d, farbe, o = {}) {
  const c = farbe ?? S.c;
  const t = [`<path d="${d}" fill="${c}"${o.opacity != null ? ` opacity="${o.opacity}"` : ''}/>`];
  if (o.tex && S.tex) t.push(`<path d="${d}" fill="${S.tex}"/>`);
  t.push(`<path d="${d}" fill="${o.licht === 'rund' ? rund(S) : o.licht === 'metall' ? metall(S) : diag(S)}"/>`);
  if (o.glanz) t.push(`<path d="${d}" fill="${glanz(S)}"/>`);
  if (o.kontur !== false) t.push(`<path d="${d}" fill="none" stroke="${dunkel(c, 0.45)}" stroke-width="${o.kw ?? 0.5}" stroke-linejoin="round" opacity="${o.ko ?? 0.5}"/>`);
  return t.join('');
}

// Zylinder (Becher, Tiegel, Flasche): Mantel mit Rundlicht, Boden- und Deckelellipse
export function zylinder(S, cx, y0, y1, rx, ry, farbe, o = {}) {
  const c = farbe ?? S.c;
  const d = `M${f(cx - rx)} ${f(y0)} L${f(cx - rx)} ${f(y1)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(y1)} L${f(cx + rx)} ${f(y0)} Z`;
  const t = [form(S, d, c, { licht: o.metall ? 'metall' : 'rund', glanz: o.glanz, tex: o.tex, ko: o.ko })];
  if (o.deckel !== false) t.push(`<ellipse cx="${f(cx)}" cy="${f(y0)}" rx="${f(rx)}" ry="${f(ry)}" fill="${o.oben ?? hell(c, 0.14)}" stroke="${dunkel(c, 0.45)}" stroke-width="0.45" stroke-opacity="0.5"/>`);
  return t.join('');
}

// Glaskörper: Füllung durchscheinend, Kanten und Reflexe
export function glas(S, d, o = {}) {
  const ton = o.ton ?? '#dfeaee';
  return [`<path d="${d}" fill="${ton}" opacity="${o.deck ?? 0.42}"/>`, `<path d="${d}" fill="${glanz(S)}"/>`, `<path d="${d}" fill="none" stroke="${o.kante ?? '#7f949c'}" stroke-width="0.55" opacity="0.75" stroke-linejoin="round"/>`].join('');
}

// Etikett ohne Markennamen: Feld mit zwei Schriftbalken
export function etikett(x, y, w, h, grund = '#f7f3ea', schrift = '#5a5048', o = {}) {
  const t = [`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${o.r ?? 0.8}" fill="${grund}"/>`];
  const m = x + w / 2;
  t.push(`<path d="M${f(m - w * 0.32)} ${f(y + h * 0.42)} H${f(m + w * 0.32)}" stroke="${schrift}" stroke-width="${f(Math.max(0.6, h * 0.11))}"/>`);
  t.push(`<path d="M${f(m - w * 0.2)} ${f(y + h * 0.66)} H${f(m + w * 0.2)}" stroke="${schrift}" stroke-width="${f(Math.max(0.4, h * 0.06))}" opacity="0.6"/>`);
  return t.join('');
}

// Holzmaserung als Linien über einer Fläche (clipPath)
export function maserung(S, d, farbe, n = 6, x0 = 0, x1 = 100, y0 = 0, y1 = 100) {
  const id = uid();
  S.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
  const t = [`<g clip-path="url(#${id})">`];
  for (let i = 0; i < n; i++) {
    const y = y0 + (i + 0.5) * (y1 - y0) / n;
    t.push(`<path d="M${x0} ${f(y)} Q${f((x0 + x1) / 2)} ${f(y + (i % 2 ? 1.6 : -1.4))} ${x1} ${f(y + 0.6)}" stroke="${dunkel(farbe, 0.28)}" stroke-width="0.45" fill="none" opacity="0.45"/>`);
  }
  t.push('</g>');
  return t.join('');
}

// Muster, die stoff.js noch nicht kennt (Bedarf an Q27 gemeldet): punkte, print, satinstreifen
export function muster(S, art, farbe) {
  const id = uid();
  const c = farbe ?? (S.c && (parseInt(S.c.slice(1, 3), 16) > 160 ? dunkel(S.c, 0.35) : hell(S.c, 0.55)));
  if (art === 'punkte') S.defs.push(`<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.9" fill="${c}" opacity="0.8"/><circle cx="4.5" cy="4.5" r="0.9" fill="${c}" opacity="0.8"/></pattern>`);
  else if (art === 'print') S.defs.push(`<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M2 9 Q3.5 3 6 6 Q8.5 9 10 3" stroke="${c}" stroke-width="0.8" fill="none" opacity="0.75"/><path d="M5.5 5.6 q-1.6 -1.6 -0.4 -3" stroke="${c}" stroke-width="0.6" fill="none" opacity="0.6"/><circle cx="10" cy="10" r="0.8" fill="${c}" opacity="0.6"/></pattern>`);
  else if (art === 'satinstreifen') S.defs.push(`<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="4" fill="#fff" opacity="0.12"/></pattern>`);
  else if (art === 'nadelstreifen') S.defs.push(`<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M2.5 0 V5" stroke="${c}" stroke-width="0.45" opacity="0.7"/></pattern>`);
  else if (art === 'streifen') S.defs.push(`<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="2.6" height="7" fill="${c}" opacity="0.75"/></pattern>`);
  else if (art === 'karo') S.defs.push(`<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="3" fill="${c}" opacity="0.35"/><rect width="3" height="8" fill="${c}" opacity="0.35"/></pattern>`);
  else if (art === 'blumen') S.defs.push(`<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><g fill="${c}" opacity="0.75"><circle cx="3" cy="3" r="0.9"/><circle cx="4.4" cy="3" r="0.9"/><circle cx="3.7" cy="1.8" r="0.9"/><circle cx="3.7" cy="4.2" r="0.9"/></g><circle cx="3.7" cy="3" r="0.6" fill="#f1cf4a"/><path d="M7.6 7.6 q1 -1.4 2 0" stroke="${c}" stroke-width="0.5" fill="none" opacity="0.6"/></pattern>`);
  else return null;
  return `url(#${id})`;
}
