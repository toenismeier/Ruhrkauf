// Bildpakete Wurf 4 (B17 ff.): gemeinsamer Zeichner für Fassung B + vtracer, gleicher Aufbau wie b01-bilder.js
// (gleiche Kontur, gleicher Bodenschatten, Licht von links aus stoff.js), dazu Metall, Musterfeld-Zone, Sets und Model-Plätze für Zubehör.
// Flächen: ['t', zone, f] Stoffton, ['k'] Kontur, ['f', hex] feste Farbe, ['r', zone, f] Rippe,
//   ['g', f] Metall (Gold oder Silber, nicht umfärbbar), ['m', zone, f] Musterteil der Zone (entfällt, wenn das Q37-Musterfeld gesetzt ist).
// Daten je Bild: { kontur, boden, breite, bbox: [x0, y0, x1, y1], regionen, metall?, musterzone?, kopien? }  (Bildraum 0..100)
// Zone 0 = Hauptstoff (Farbe, Material, Musterfeld aus dem Artikeltyp), weitere Zonen über p.farben / p.materialien.
import { materialDefs, hell, dunkel, FARBEN } from './stoff.js';
import { musterFuellung, istMuster } from './q37-muster.js';

const KONTUR = '#1d1b1a';
const METALL = { gold: '#c9a24a', silber: '#c9ced3' };
const ton = (c, f) => (f > 0 ? hell(c, f) : f < 0 ? dunkel(c, -f) : c);

/** Metall des Bildes: p.metall, sonst die Artikelfarbe, wenn sie Gold oder Silber ist, sonst das Metall aus dem B-Bild. */
export function metallVon(p, S, D) {
  if (p.metall === 'gold' || p.metall === 'silber') return p.metall;
  if (S.c === FARBEN.silber) return 'silber';
  if (S.c === FARBEN.gold) return 'gold';
  return D.metall ?? 'gold';
}

/** Zeichner für ein Bildpaket: DATEN[p.b] → Flächen. opt.ohneSchatten für das Model. */
export function bZeichner(DATEN) {
  return function zeichner(S, t, p, opt = {}) {
    const D = DATEN[p.b];
    if (!D) return;
    const mf = p.musterfeld ?? (p.dessin === '' ? 'uni' : null);   // Q37-Musterfeld gesetzt (auch „uni“)
    const mz = D.musterzone ?? 0;
    if (!S.tex && !mf && p.muster && p.muster !== 'uni' && istMuster(p.muster)) S.tex = musterFuellung(S, p.muster);
    const K = [S];
    const n = 1 + Math.max(0, ...D.regionen.filter((r) => 'trm'.includes(r[0]) && typeof r[1] === 'number').map((r) => r[1]));
    for (let i = 1; i < n; i++) K.push(materialDefs(p.farben?.[i - 1] ?? D.zonenfarben?.[i - 1] ?? 'grau', p.materialien?.[i - 1] ?? D.zonenmaterial?.[i - 1] ?? 'baumwolle', S.defs));
    // Musterfeld in einer Nebenzone (z. B. Shirt am Plüschtier): Muster dorthin, Zone 0 ohne Muster
    if (mf && mz > 0) {
      const S0 = materialDefs(S.c, S.m, S.defs);
      K[0] = { ...S, tex: S0.tex };
      K[mz].tex = mf !== 'uni' ? musterFuellung(K[mz], mf) ?? K[mz].tex : K[mz].tex;
    }
    if (p.glatt) K.forEach((k) => { if (k.m === 'strick' || k.m === 'kaschmir' || k.m === 'merino') k.tex = null; });
    const met = METALL[metallVon(p, S, D)];
    let rip = null;
    if (D.regionen.some((r) => r[0] === 'r')) { rip = S.id + 'rp'; S.defs.push(`<pattern id="${rip}" width="1.15" height="4" patternUnits="userSpaceOnUse"><rect width="0.45" height="4" fill="#000" opacity="0.28"/><rect x="0.5" width="0.25" height="4" fill="#fff" opacity="0.08"/></pattern>`); }
    const clip = S.id + 'bp';
    S.defs.push(`<clipPath id="${clip}"><path d="${D.kontur}" fill-rule="evenodd"/></clipPath>`);
    if (!opt.ohneSchatten) t.push(`<ellipse cx="${D.mitte ?? 50}" cy="${(D.boden + 1.8).toFixed(1)}" rx="${Math.min(32, D.breite * 0.45).toFixed(1)}" ry="2.4" fill="#000" opacity="0.08"/>`);
    const teil = [`<g clip-path="url(#${clip})">`];
    for (const r of D.regionen) {
      const d = r[r.length - 1];
      if (r[0] === 'k') teil.push(`<path d="${d}" fill="${KONTUR}"/>`);
      else if (r[0] === 'f') teil.push(`<path d="${d}" fill="${r[1]}"/>`);
      else if (r[0] === 'g') teil.push(`<path d="${d}" fill="${ton(met, r[1])}"/>`);
      else {
        // Musterteile: bei gesetztem Musterfeld Grundton der Musterzone
        const k = r[0] === 'm' && mf ? K[mz] : K[r[1]];
        const f = r[0] === 'm' && mf ? 0 : r[2];
        teil.push(`<path d="${d}" fill="${ton(k.c, f)}"/>`);
        if (k.tex) teil.push(`<path d="${d}" fill="${k.tex}"/>`);
        if (r[0] === 'r') teil.push(`<path d="${d}" fill="url(#${rip})"/>`);
      }
    }
    // Licht von links wie alle Stoffe (stoff.js); Glanzlichter stecken schon in den Tonflächen
    teil.push(`<path d="${D.kontur}" fill="url(#${S.id}l)" fill-rule="evenodd"/>`, '</g>');
    const g = teil.join('');
    // Sets: weitere Teile als Kopien (Transform im Bildraum)
    for (const tr of D.kopien ?? []) t.push(`<g transform="${tr}">${g}</g>`);
    t.push(g);
  };
}

// ─────────────────────────────────────────── Model-Plätze für Zubehör
// Ein Platz liefert je Teil: Zielpunkt (x, y), Breite w (oder Höhe h) und Ankerpunkt im Bild (ax, ay als Anteil der bbox).
// paar: linke Bildhälfte an die rechte Körperseite im Bild (x < 100), rechte Hälfte gegenüber.
const PLAETZE = {
  kopf: (K, o) => [{ x: K.kopf.x, y: K.kopf.y - K.kopf.ry * (o.y ?? 0.12), w: K.kopf.rx * (o.w ?? 2.4), ...(o.h ? { h: K.kopf.ry * o.h } : {}), ax: 0.5, ay: 1 }],
  kopfganz: (K, o) => [{ x: K.kopf.x, y: K.kopf.y - K.kopf.ry * (o.y ?? 1.16), w: K.kopf.rx * (o.w ?? 2.5), ax: 0.5, ay: 0 }],
  stirn: (K, o) => [{ x: K.kopf.x, y: K.kopf.y - K.kopf.ry * (o.y ?? 0.72), w: K.kopf.rx * (o.w ?? 2.2), ax: 0.5, ay: 0.5, haelfte: o.stueck ?? 0, rot: o.rot }],
  haar: (K, o) => [{ x: K.kopf.x + K.kopf.rx * 0.9, y: K.kopf.y - K.kopf.ry * (o.y ?? 0.5), w: K.kopf.rx * (o.w ?? 0.9), ax: 0.5, ay: 0.5 }],
  ohren: (K, o) => [{ x: K.kopf.x, y: K.kopf.y + K.kopf.ry * (o.y ?? 0.12), w: K.kopf.rx * (o.w ?? 2.55), ax: 0.5, ay: o.ay ?? 0.72 }],
  ohr: (K, o) => [-1, 1].map((s) => ({ x: K.kopf.x + s * K.kopf.rx * 0.97, y: K.kopf.y + K.kopf.ry * 0.12, w: K.kopf.rx * (o.w ?? 0.55), ax: 0.5, ay: 0, haelfte: s })),
  hals: (K, o) => [{ x: 100, y: K.hals.y1 - (o.y ?? 5), w: K.hals.b * (o.w ?? 5), ax: 0.5, ay: 0 }],
  taille: (K, o) => [{ x: 100, y: K.m.taille + (o.y ?? 0), w: 2 * K.breite(K.m.taille) + (o.w ?? 5), ax: 0.5, ay: o.ay ?? 0.5 }],
  huefte: (K, o) => [{ x: 100, y: K.m.huefte - (o.y ?? 6), w: 2 * K.breite(K.m.huefte - 6) + (o.w ?? 5), ...(o.h ? { h: o.h } : {}), ax: 0.5, ay: o.ay ?? 0.5 }],
  wickel: (K, o) => [{ x: 100, y: K.m.huefte - 8, w: 2 * K.breite(K.m.huefte) + 7, h: (K.m.knie + (o.h ?? 14)) - (K.m.huefte - 8), ax: 0.5, ay: 0 }],
  unterarm: (K, o) => [-1, 1].map((s) => { const y = K.m.handgelenk + (o.y ?? 2), x = s > 0 ? (K.armAX(y) + K.armIX(y)) / 2 : 200 - (K.armAX(y) + K.armIX(y)) / 2; return { x, y, h: (o.h ?? 1) * (K.m.handgelenk - K.m.ellbogen + 8), ax: 0.5, ay: 1, haelfte: s }; }),
  handgelenk: (K, o) => (o.paar ? [-1, 1] : [1]).map((s) => { const y = K.m.handgelenk - (o.y ?? 1); const x = (K.armAX(y) + K.armIX(y)) / 2; return { x: s > 0 ? x : 200 - x, y, w: o.w ?? 8.5, ax: 0.5, ay: 0.5, haelfte: o.paar ? s : 0 }; }),
  hand: (K, o) => [-1, 1].map((s) => ({ x: s > 0 ? K.hand[0] : 200 - K.hand[0], y: K.hand[1] + (o.y ?? 4), w: o.w ?? 11, ax: 0.5, ay: 0.45, haelfte: s })),
  halten: (K, o) => [{ x: K.hand[0] + (o.x ?? 1), y: K.hand[1] + (o.y ?? 3), w: o.w ?? 12, ax: 0.5, ay: o.ay ?? 0 }],
};
const OBEN = new Set(['kopf', 'kopfganz', 'stirn', 'haar', 'ohren', 'ohr']);
const AN_HAND = new Set(['hand', 'halten', 'handgelenk', 'unterarm']);
const f2 = (v) => +v.toFixed(2);

/** Model-Teil für ein Zubehör (s.modelTeile): zeichnet das Produktbild am Platz o.platz. */
export function zubehoerTeil(zeichner, D, platz, popt = {}) {
  return (p, farbe, material) => ({
    teil: 'zubehoer', farbe, material, muster: p.muster, oben: OBEN.has(platz),
    zeichne: (K, S, o) => {
      const q = { ...p, ...(o.muster37 ? { musterfeld: o.muster37, dessin: '' } : {}) };
      const roh = []; zeichner(S, roh, q, { ohneSchatten: true });
      const inhalt = roh.join('');
      const [x0, y0, x1, y1] = D.bbox;
      const teile = PLAETZE[platz](K, popt).map((z) => {
        // Hälften eines Paars: Bildhälfte ausschneiden und eigene bbox nehmen
        let bx0 = x0, bx1 = x1, ex = '';
        if (z.haelfte) {
          const mitte = D.mitte ?? 50;
          if (z.haelfte < 0) bx1 = mitte; else bx0 = mitte;
          const id = S.id + 'h' + (z.haelfte < 0 ? 'l' : 'r') + platz;
          S.defs.push(`<clipPath id="${id}"><rect x="${f2(bx0)}" y="${f2(y0 - 2)}" width="${f2(bx1 - bx0)}" height="${f2(y1 - y0 + 4)}"/></clipPath>`);
          ex = ` clip-path="url(#${id})"`;
          // eigene Breite der Hälfte (ohne Leerraum zur Mitte)
          bx0 = D.haelften?.[z.haelfte < 0 ? 0 : 1]?.[0] ?? bx0; bx1 = D.haelften?.[z.haelfte < 0 ? 0 : 1]?.[1] ?? bx1;
        }
        const bw = Math.max(1, bx1 - bx0), bh = Math.max(1, y1 - y0);
        const sx = z.h && z.w ? z.w / bw : z.h ? z.h / bh : z.w / bw;
        const sy = z.h ? z.h / bh : sx;
        const ax = bx0 + bw * z.ax, ay = y0 + bh * z.ay;
        // gedreht (z. B. Stirnband quer über die Stirn): Breite gilt für die gedrehte Länge
        const s2 = z.rot ? z.w / bh : null;
        const tr = z.rot ? `translate(${f2(z.x)} ${f2(z.y)}) rotate(${z.rot}) scale(${f2(s2)}) translate(${f2(-ax)} ${f2(-ay)})` : `translate(${f2(z.x)} ${f2(z.y)}) scale(${f2(sx)} ${f2(sy)}) translate(${f2(-ax)} ${f2(-ay)})`;
        return `<g transform="${tr}"><g${ex}>${inhalt}</g></g>`;
      });
      // Gesicht frei (Balaclava): Ausschnitt in Gesichtsform
      if (popt.gesicht) {
        const { x, y, rx, ry } = K.kopf, id = S.id + 'gs';
        S.defs.push(`<clipPath id="${id}"><path fill-rule="evenodd" d="M0 0H200V420H0Z M${f2(x)} ${f2(y - ry * 0.62)} a${f2(rx * 0.68)} ${f2(ry * 0.78)} 0 1 0 0.01 0Z"/></clipPath>`);
        return `<g clip-path="url(#${id})">${teile.join('')}</g>`;
      }
      return (AN_HAND.has(platz) ? '<!--tasche-->' : '') + teile.join('');
    },
  });
}
