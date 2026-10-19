// Wettbewerber-Kaufhäuser und große Filialisten (alle Namen erfunden).
// export wettbewerber(S, scene, { x, z, w, d, seed, art?, name?, region?, passanten? }) → { hoehe, art, name, teile }
// region ('nord' | 'sued' | 'ost' | 'west' | 'mitte', auch 'Nord', 'Süd' …) färbt die Häute: Nord Backstein, Süd Putz und Naturstein,
// Ost Platte bzw. Wendebau (Betonplatten mit Fugen, farbiges Band). Premium bleibt unter 28 m.
// Arten: modehaus, offprice, textildiscounter, elektronik, premium, fastfashion, leer_ehemals
import { THREE, rng, waehle, zw, heller, dunkler, baum } from './basis.js';
import {
  seitenVon, Seite, zyl, prismaX, plakat, plakatBreite, passend, puppe, mensch, auto, busch, attika, lichtkuppeln, technik, solar,
  parkreihe, buchten, wand, clamp, GLAS, GLAS_D, GLAS_HELL, LICHT, RAHMEN, KIES, KLEID, BUNT,
} from './sporthelfer.js';

export const ARTEN = ['modehaus', 'offprice', 'textildiscounter', 'elektronik', 'premium', 'fastfashion', 'leer_ehemals'];
export const NAMEN = {
  // je Art sechs Namen; die ersten drei sind die Zufallsauswahl ohne Vorgabe, staedte.js rotiert durch alle sechs
  modehaus: ['Brandhoff Mode', 'Lindner & Söhne', 'Haus Weidenau', 'Modehaus Kersting', 'Gebr. Hallmann', 'Haus Rosenau'],
  offprice: ['KAUFKISTE', 'WÜHLWERK', 'RESTEPARADIES', 'SCHNÄPPCHENHOF', 'PREISSPRUNG', 'POSTENPALAST'],
  textildiscounter: ['SPARMODE', 'KLEIDKAUF', 'TEXTILECK', 'MODEPREIS', 'STOFFSPAR', 'KLEIDERKISTE'],
  elektronik: ['VOLTWERK', 'KABELKÖNIG', 'GERÄTEHALLE', 'STROMHAUS', 'DIGIMARKT', 'SCHALTWERK'],
  premium: ['Haus Ahlert', 'Feldmann & Cie.', 'Kaufhaus Morgenroth', 'Haus Bellmann', 'Wagner & Thiel', 'Kaufhaus Lindenhof'],
  fastfashion: ['NOVA', 'TRENDWERK', 'WIRBEL', 'STYLO', 'KOLLEKT', 'PULS'],
  leer_ehemals: ['KAUFHAUS STRAUB', 'BÖLLING', 'WESTKAUF', 'HAUS MERTENS', 'WARENHAUS ELSNER', 'KAUFHAUS DREWS'],
};
const SERIF = '"DejaVu Serif", Georgia, serif';
const MESSING = '#b8955a', BRONZE = '#6b5a45';
const EG = 5.0, OG = 4.0;
/** Regionale Häute je Art: Wandfarben, Akzent, Dach. */
const REGION = {
  nord: { stein: ['#a8664f', '#b4705a', '#9e5c47', '#b9785e'], hell: '#ece4d4', dach: '#7a4436', wand: '#a96a52', akzent: '#ece4d4' },
  sued: { stein: ['#ecd9b0', '#e8cfa4', '#f0e2c4', '#e2c9a0'], hell: '#f6efe0', dach: '#b4583f', wand: '#efe3c8', akzent: '#c9a36a' },
  ost: { stein: ['#d4d2ca', '#cfccc2', '#d9d6cc', '#c9c8c0'], hell: '#e6e4de', dach: '#5f6b70', wand: '#d2d0c8', akzent: '#e07a3a' },
};
function regionVon(p) {
  const t = String(p ?? '').toLowerCase().replace('ü', 'ue');
  return t === 'nord' || t === 'sued' || t === 'ost' ? t : null;
}
/** Regionale Wandhaut: Backsteinlagen (Nord), Plattenfugen + Wendebau-Band (Ost). Nur auf geschlossenen Wandflächen. */
function regionHaut(K, s, u0, u1, y0, y1, t, f) {
  const R = K.reg;
  if (R === 'nord') for (let y = y0 + 0.5; y < y1; y += 0.5) s.q(u0, u1, y - 0.025, y + 0.025, t, t + 0.02, dunkler(f, 0.06));
  if (R === 'ost') {
    for (let y = y0 + 2.9; y < y1 - 0.2; y += 2.9) s.q(u0, u1, y - 0.04, y + 0.04, t, t + 0.03, dunkler(f, 0.1));
    for (let u = u0 + 3.6; u < u1 - 0.2; u += 3.6) s.q(u - 0.04, u + 0.04, y0, y1, t, t + 0.03, dunkler(f, 0.1));
  }
}

// ---------------------------------------------------------------- Bausteine
function ware(K, s, a, b, y, tb, art) {
  const r = K.r, m = (a + b) / 2, br = b - a, tm = tb + 0.7;
  if (K.leer) return;
  switch (art) {
    case 'offprice': case 'textildiscounter': {
      for (const u of [a + br * 0.3, a + br * 0.72]) {
        s.q(u - 0.8, u + 0.8, y, y + 0.8, tm - 0.4, tm + 0.4, '#d9d2c4');
        for (let k = 0; k < 4; k++) s.q(u - 0.7 + k * 0.35, u - 0.4 + k * 0.35, y + 0.8, y + 0.95 + r() * 0.25, tm - 0.3, tm + 0.3, waehle(r, KLEID));
      }
      if (art === 'offprice') s.q(m - 0.5, m + 0.5, y + 1.6, y + 2.4, tb + 0.05, tb + 0.1, waehle(r, ['#f6d32d', '#e8336d', '#ffffff']));
      else puppe(s, b - 0.6, y, tm, waehle(r, KLEID), '#2b3a55');
      break;
    }
    case 'elektronik': {
      for (let i = 0; i < Math.floor(br / 1.3); i++) {
        const u = a + 0.75 + i * 1.3;
        s.q(u - 0.55, u + 0.55, y + 1.5, y + 2.2, tb, tb + 0.12, '#1f2328');
        s.q(u - 0.48, u + 0.48, y + 1.56, y + 2.14, tb + 0.12, tb + 0.15, waehle(r, ['#3a7bd5', '#4fb6c2', '#7cb342', '#e36b2c']));
      }
      s.q(a + 0.4, a + 1.2, y, y + 0.9, tm - 0.35, tm + 0.35, '#f1f1ee');
      s.q(a + 1.4, a + 2.2, y, y + 0.9, tm - 0.35, tm + 0.35, '#f1f1ee');
      const g = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 10); g.rotateX(Math.PI / 2); g.translate(a + 0.8, y + 0.5, tm + 0.38); s.geo(g, '#5d646a');
      break;
    }
    case 'premium': {
      s.q(m - 0.6, m + 0.6, y, y + 0.8, tm - 0.4, tm + 0.4, '#f1ece2');
      s.q(m - 0.25, m + 0.25, y + 0.8, y + 1.15, tm - 0.12, tm + 0.12, waehle(r, ['#7a2b2b', '#1f1f1f', '#b8955a']));
      puppe(s, a + 0.7, y, tm, waehle(r, ['#1f1f1f', '#e8e4dc', '#7a2b2b', '#2b3a55']), '#1f1f1f');
      s.q(a, b, y + 2.9, y + 3.0, tb + 0.1, tb + 0.5, '#f7e9c8');
      break;
    }
    default: { // Mode
      const nP = br > 3.5 ? 3 : 2;
      s.q(a + 0.3, b - 0.3, y, y + 0.2, tm - 0.35, tm + 0.35, '#e9e4da');
      for (let i = 0; i < nP; i++) puppe(s, a + br * (i + 0.5) / nP, y + 0.2, tm, waehle(r, art === 'fastfashion' ? ['#e8336d', '#f6d32d', '#1f1f1f', '#ffffff', '#4fb6c2'] : KLEID), waehle(r, ['#2b3a55', '#3a3a3a', '#e8e4dc']));
    }
  }
}

/**
 * Ladenzone im EG einer Seite: Pfeiler, zurückgesetzte Schaufenster mit Ware, Eingänge.
 * o: { u0, u1, h, gTop, D, raster, pb, pfeiler, sturz, sockel, glas, eingaenge(Set von Indizes), art, tuer }
 */
function ladenzone(K, s, o) {
  const u0 = o.u0 ?? 0, u1 = o.u1 ?? s.L, D = o.D ?? 1.6, gTop = o.gTop ?? 4.0, h = o.h ?? EG, pb = o.pb ?? 0.6;
  const ax = buchten(u0, u1, o.raster ?? 5, pb);
  const ein = o.eingaenge ?? new Set([Math.floor(ax.length * (s.seite === '+z' ? 0.55 : 0.4))]);
  const res = [];
  ax.forEach(([a, b], i) => {
    s.q(a - pb, a, 0, h, -D, 0.12, o.pfeiler);
    if (i === ax.length - 1) s.q(b, b + pb, 0, h, -D, 0.12, o.pfeiler);
    s.q(a, b, gTop, h, -D, 0.04, o.sturz ?? o.pfeiler);
    const istEin = ein.has(i);
    res.push({ a, b, ein: istEin });
    if (istEin) {
      s.q(a, b, 0.3, gTop, -D - 0.1, -D, K.leer ? '#7c6a55' : GLAS_D);
      s.q(a, b, 0.3, 0.4, -D, 0.1, '#d6d0c4');
      if (!K.leer) for (let k = 1; k < 3; k++) s.q(a + (b - a) * k / 3 - 0.05, a + (b - a) * k / 3 + 0.05, 0.3, gTop, -D, -D + 0.06, RAHMEN);
      if (K.leer) brett(K, s, a, b, 0.3, gTop, -D * 0.4);
      return;
    }
    s.q(a, b, 0, 0.5, -D, 0.06, o.sockel ?? dunkler(o.pfeiler, 0.12));
    s.q(a, b, 0.5, gTop, -D - 0.1, -D, o.glas ?? GLAS);
    s.q(a, b, 0.5, 0.6, -D, 0, '#d6d0c4');
    if (K.leer) { brett(K, s, a, b, 0.5, gTop, -0.2); return; }
    s.q(a, b, gTop - 0.3, gTop - 0.16, -D, -D + 0.06, LICHT);
    ware(K, s, a, b, 0.6, -D, o.art);
  });
  return res;
}
/** Zugenagelte Öffnung mit Spanplatten, Graffiti-Streifen. */
function brett(K, s, a, b, y0, y1, t) {
  const r = K.r, nb = Math.max(1, Math.round((b - a) / 1.25));
  for (let i = 0; i < nb; i++) {
    const p = a + (i * (b - a)) / nb, q = a + ((i + 1) * (b - a)) / nb;
    s.q(p + 0.02, q - 0.02, y0, y1, t, t + 0.05, i % 2 ? '#c9a77a' : '#bf9c6e');
  }
  if (r() < 0.6) s.kipp((b - a) * 0.7, 0.35, 0.03, (a + b) / 2, y0 + zw(r, 0.6, 1.4), t + 0.08, waehle(r, ['#e8336d', '#3a7bd5', '#2b2b2b', '#4caf50']), zw(r, -0.15, 0.15));
}
/** Große Einzelbuchstaben-Kästen (Elektronik/Discounter): jedes Zeichen auf eigenem Kasten. */
export function kastenBreite(text, hb) { const z = [...text]; return z.reduce((a, c) => a + (c === ' ' ? hb * 0.4 : plakatBreite(c, hb) * 0.62), 0) + hb * 0.12 * (z.length - 1); }
function kastenSchrift(K, s, text, um, y, t, hb, fg, bg) {
  const z = [...text];
  const br = z.map((c) => (c === ' ' ? hb * 0.4 : plakatBreite(c, hb) * 0.62));
  const gap = hb * 0.12;
  const total = br.reduce((a, b) => a + b, 0) + gap * (z.length - 1);
  let acc = 0;
  z.forEach((c, i) => {
    const uc = um + s.lese * (-total / 2 + acc + br[i] / 2);
    acc += br[i] + gap;
    if (c === ' ') return;
    s.q(uc - br[i] / 2, uc + br[i] / 2, y - hb * 0.55, y + hb * 0.55, t, t + 0.45, bg);
    plakat(K.scene, s, c, uc, y, t + 0.47, hb * 1.05, fg);
  });
  return total;
}
function flachdach(K, x0, z0, w, d, y, o = {}) {
  const { S, r } = K;
  S.quader(x0, y, z0, x0 + w, y + 0.2, z0 + d, KIES);
  if (o.kuppeln !== false) lichtkuppeln(S, x0 + 1.5, z0 + 1.5, x0 + w * 0.45, z0 + d - 1.5, y + 0.2, 6, 6.5);
  if (o.solar) solar(S, x0 + w * 0.47, z0 + 1, x0 + w * 0.72, z0 + d - 1.5, y + 0.2);
  technik(S, r, x0 + (o.solar ? w * 0.74 : w * 0.48), z0 + 1, x0 + w - 1, z0 + d - 1, y + 0.2, { max: o.max ?? 5, farbe: o.farbe });
}
function stumpf(w, d, h, ein) {
  const a = [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2]];
  const b = a.map(([x, , z]) => [x - Math.sign(x) * ein, h, z - Math.sign(z) * ein]);
  const p = [];
  const quad = (A, B, C, D) => p.push(...A, ...B, ...C, ...A, ...C, ...D);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(a[i], b[i], b[j], a[j]); }
  quad(b[0], b[3], b[2], b[1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}
const geschosse = (K, min, max, faktor = 1) => clamp(Math.round((Math.sqrt(K.w * K.d) / 13) * faktor) + min - 1, min, max);

// ---------------------------------------------------------------- 1 Modehaus (gehoben, Naturstein, große Fenster)
function modehaus(K) {
  const { S, scene, x0, z0, w, d, r, v } = K;
  const n = geschosse(K, 3, 5);
  const H = EG + (n - 1) * OG, D = 1.6;
  const RG = REGION[K.reg];
  const stein = (RG?.stein ?? ['#dccaa8', '#e5dccb', '#d6c3a0', '#e2d5bd'])[v % 4], hell = RG?.hell ?? heller(stein, 0.05), dunk = dunkler(stein, 0.08);
  S.quader(x0, 0, z0, x0 + w - D, EG, z0 + d - D, '#5d5248');
  S.quader(x0, EG, z0, x0 + w, H, z0 + d, stein);
  for (const s of K.seiten) {
    ladenzone(K, s, { raster: 5.5, pb: 1.0, D, pfeiler: hell, sturz: stein, sockel: dunk, glas: '#4f5d62', art: 'mode', gTop: 4.2 });
    s.q(0, s.L, 4.25, 4.45, 0.12, 1.4, BRONZE); // feines Bronze-Vordach
    // Obergeschosse: Kolossal-Pilaster, über zwei Geschosse gehende Fenster
    const nb = Math.max(1, Math.round(s.L / 5.5)), bw = s.L / nb;
    s.q(0, s.L, EG - 0.1, EG + 0.45, 0, 0.4, hell);
    for (let i = 0; i <= nb; i++) s.q(i * bw - 0.55, i * bw + 0.55, EG + 0.45, H - 1.0, 0, 0.35, hell);
    for (let i = 0; i < nb; i++) {
      const a = i * bw + 0.55, b = (i + 1) * bw - 0.55;
      s.q(a + 0.2, b - 0.2, EG + 0.9, H - 1.6, -0.05, 0.02, GLAS);
      for (let k = 1; k < n - 1; k++) s.q(a + 0.2, b - 0.2, EG + k * OG - 0.5, EG + k * OG + 0.3, -0.03, 0.08, BRONZE);
      s.q((a + b) / 2 - 0.05, (a + b) / 2 + 0.05, EG + 0.9, H - 1.6, 0, 0.1, BRONZE);
      s.q(a, b, EG + 0.75, EG + 0.9, 0, 0.3, hell);
    }
    s.q(0, s.L, H - 1.0, H - 0.2, 0, 0.3, stein);
    s.q(0, s.L, H - 0.2, H + 0.4, -0.1, 0.6, hell);
    if (K.reg === 'ost') s.q(0, s.L, EG + 0.45, EG + 0.95, 0, 0.42, RG.akzent);
    if (K.reg === 'nord') for (let y = EG + 1.5; y < H - 1.2; y += 0.5) for (let i = 0; i < nb; i++) { s.q(i * bw + 0.55, i * bw + 0.75, y - 0.02, y + 0.02, 0, 0.03, dunkler(stein, 0.06)); s.q((i + 1) * bw - 0.75, (i + 1) * bw - 0.55, y - 0.02, y + 0.02, 0, 0.03, dunkler(stein, 0.06)); }
    // Schriftzug in Messing über dem EG-Vordach
    // Schriftzug groß genug für den Spielabstand: Bronzetafel 1,3 m hoch, Lettern 1,0 m
    const ph = passend(K.name, s.L * 0.55, 1.0, SERIF);
    const br = plakatBreite(K.name, ph, SERIF);
    s.q(s.L * 0.5 - br / 2 - 0.4, s.L * 0.5 + br / 2 + 0.4, EG - 1.2, EG + 0.1, 0.4, 0.46, BRONZE);
    plakat(scene, s, K.name, s.L * 0.5, EG - 0.55, 0.48, ph, '#ecd39b', null, { schrift: SERIF });
  }
  // Staffelgeschoss mit Metalldach und großer Schrift
  const sw = w - 3, sd = d - 3;
  S.quader(x0, H + 0.4, z0, x0 + sw, H + 3.6, z0 + sd, '#c9c4ba');
  for (const s of seitenVon(S, x0, z0, sw, sd)) {
    for (let u = 1.2; u < s.L - 0.6; u += 2.4) s.q(u - 0.9, u + 0.9, H + 1.0, H + 3.1, -0.03, 0.03, GLAS_HELL);
  }
  S.quader(x0 - 0.3, H + 3.6, z0 - 0.3, x0 + sw + 0.6, H + 3.95, z0 + sd + 0.6, '#6f7378');
  const sz = new Seite(S, x0, z0, w, d, '+z');
  const ph = passend(K.name, sw * 0.6, 1.8, SERIF);
  const brA = plakatBreite(K.name, ph, SERIF);
  sz.q(sw * 0.5 - brA / 2 - 0.4, sw * 0.5 + brA / 2 + 0.4, H + 1.0, H + 3.4, -2.95, -2.85, BRONZE);
  plakat(scene, sz, K.name, sw * 0.5, H + 2.2, -2.83, ph, '#ecd39b', null, { schrift: SERIF });
  flachdach(K, x0, z0, sw, sd, H + 3.95, { max: 3 });
  return H + 6;
}

// ---------------------------------------------------------------- 2 Offprice (grelle Box, Fundgruben-Charakter)
function offprice(K) {
  const { S, scene, x0, z0, w, d, r, v } = K;
  const n = geschosse(K, 1, 2, 0.6);
  const H = n === 1 ? 8.6 : EG + OG + 1.6, D = 1.5;
  const [haupt, akzent] = [['#e8336d', '#f6d32d'], ['#f28c1c', '#1f4fa0'], ['#8bc34a', '#6a2c91'], ['#f6d32d', '#e03b2f']][v % 4];
  S.quader(x0, 0, z0, x0 + w - D, EG, z0 + d - D, '#4a4f55');
  S.quader(x0, EG, z0, x0 + w, H, z0 + d, '#eeece6');
  for (const s of K.seiten) {
    ladenzone(K, s, { raster: 4.5, pb: 0.5, D, pfeiler: akzent, sturz: '#eeece6', art: 'offprice', gTop: 3.8 });
    // Streifenmarkise über den Fenstern
    for (let u = 0.5; u < s.L - 0.5; u += 1.0) s.kipp(1.0, 0.12, 1.6, u + 0.5, 4.25, 0.75, Math.round(u) % 2 ? '#ffffff' : haupt, 0, 0.42);
    // grelles Fassadenband mit Riesenschrift
    s.q(0, s.L, EG, H, 0, 0.2, haupt);
    s.q(0, s.L, EG, EG + 0.35, 0.2, 0.3, akzent);
    const hb = passend(K.name, s.L * 0.62, (H - EG) * 0.78);
    plakat(scene, s, K.name, s.L * 0.42, EG + (H - EG) * 0.55, 0.22, hb, '#ffffff');
    // Sternstörer
    const su = s.L * 0.86, sy = EG + (H - EG) * 0.5, sr = Math.min(1.8, (H - EG) * 0.4);
    for (let k = 0; k < 3; k++) s.kipp(sr * 1.6, sr * 1.6, 0.12, su, sy, 0.3 + k * 0.01, akzent, (k * Math.PI) / 6);
    s.q(su - sr * 0.62, su + sr * 0.62, sy - sr * 0.3, sy + sr * 0.3, 0.42, 0.44, '#ffffff');
    plakat(scene, s, '-70 %', su, sy, 0.46, sr * 0.5, '#c8102e');
    // Plakate in den Fenstern
  }
  for (const s of K.seiten) if (!K.leer) {
    const t = waehle(r, ['MARKEN BIS -70 %', 'NEUE WARE JEDEN TAG', 'SCHNÄPPCHEN!']);
    plakat(scene, s, t, s.L * 0.3, 2.9, 0.15, passend(t, 5, 0.5), akzent === '#f6d32d' ? '#1f1f1f' : '#ffffff', akzent);
  }
  // Einkaufswagen-Unterstand auf +x
  const sx = K.seiten[1];
  sx.q(sx.L * 0.15, sx.L * 0.15 + 5, 2.4, 2.55, 0.8, 3.2, '#d9dcde');
  for (const u of [sx.L * 0.15 + 0.2, sx.L * 0.15 + 4.8]) sx.q(u - 0.07, u + 0.07, 0.3, 2.4, 3.0, 3.14, '#7c848b');
  for (let i = 0; i < 6; i++) sx.q(sx.L * 0.15 + 0.6 + i * 0.7, sx.L * 0.15 + 1.1 + i * 0.7, 0.4, 1.3, 1.2, 2.7, '#a9b0b5');
  attika(S, x0, z0, w, d, H, 0.5, REGION[K.reg]?.wand ?? akzent, 0.3);
  flachdach(K, x0 + 0.3, z0 + 0.3, w - 0.6, d - 0.6, H, { max: 4 });
  return H + 2;
}

// ---------------------------------------------------------------- 3 Textildiscounter (billig, flach, große Beschriftung)
function textildiscounter(K) {
  const { S, scene, x0, z0, d, r, v } = K;
  const w = K.w;
  const park = d >= 34 ? 13 : 0, db = d - park;
  const H = 5.6, D = 1.3;
  const band = ['#1f63b5', '#d92b2b', '#ef7d00', '#2e8b57'][v % 4];
  S.quader(x0, 0, z0, x0 + w - D, H - 1.2, z0 + db - D, '#5a5f64');
  const wandF = REGION[K.reg]?.wand ?? '#e4e3df';
  S.quader(x0, H - 1.2, z0, x0 + w, H, z0 + db, wandF);
  const seiten = seitenVon(S, x0, z0, w, db);
  for (const s of seiten) {
    const ax = buchten(1, s.L - 1, 6, 0.5);
    const oe = [];
    ax.forEach(([a, b], i) => {
      const ein = s.seite === '+z' && i === Math.floor(ax.length * 0.7);
      const y1 = ein ? 3.3 : 2.9, y0 = ein ? 0.3 : 0.7;
      oe.push({ a, b, y0, y1 });
      s.q(a, b, y0, y1, -D - 0.1, -D, ein ? GLAS_D : GLAS);
      s.q(a, b, y0, y0 + 0.08, -D, 0, '#d6d0c4');
      if (K.leer) brett(K, s, a, b, y0, y1, -0.2);
      else if (!ein) {
        const t = waehle(r, ['T-SHIRTS 2,99 €', 'JEANS 9,99 €', 'ALLES FÜR KIDS', 'SOCKEN 5 PAAR']);
        plakat(scene, s, t, (a + b) / 2, (y0 + y1) / 2, -D + 0.02, passend(t, b - a - 0.6, 0.6), '#ffffff', band);
      }
    });
    wand(s, 0, s.L, 0, H - 1.2, -D, 0, oe, wandF);
    if (K.reg === 'nord') for (let y = 0.85; y < H - 1.7; y += 0.5) for (const [a, b] of [[0, oe[0]?.a ?? s.L], ...oe.map((g, i) => [g.b, oe[i + 1]?.a ?? s.L])]) s.q(a, b, y - 0.02, y + 0.02, 0, 0.02, dunkler(wandF, 0.06));
    s.q(0, s.L, 0, 0.35, 0, 0.12, '#8a8f93');
    s.q(0, s.L, H - 1.6, H + 1.4, 0, 0.3, band);
    // Lettern in das Band einpassen (Band 3,0 m hoch, Schrift höchstens 2,2 m)
    // Lettern in den sichtbaren Teil des Bandes einpassen (ein Glasvorbau davor verdeckt den unteren Teil)
    const yb0 = s.seite === '+z' && K.vorbauH ? Math.max(H - 1.6, K.vorbauH) : H - 1.6, yb1 = H + 1.4;
    // bleibt über dem Vorbau zu wenig Band sichtbar, trägt nur das Vordach den Namen (keine angeschnittenen Lettern)
    if (yb1 - yb0 >= 1.6) plakat(scene, s, K.name, s.L * 0.4, (yb0 + yb1) / 2, 0.32, passend(K.name, s.L * 0.55, Math.min(2.2, yb1 - yb0 - 0.4)), '#ffffff');
    if (yb1 - yb0 >= 1.6) { s.q(s.L * 0.82 - 1.2, s.L * 0.82 + 1.2, H - 1.5, H + 1.3, 0.3, 0.4, '#f6d32d'); plakat(scene, s, '%', s.L * 0.82, H - 0.1, 0.42, 2.2, band); }
  }
  const sz = seiten[0];
  if (!K.reg) for (const s of seiten) for (let u = 0.6; u < s.L; u += 1.2) s.q(u - 0.04, u + 0.04, 0.35, H - 1.6, 0, 0.05, '#d3d2cd');
  // Windfang mit Vordach am Eingang, Aufsteller, Kleiderständer vor der Tür
  const ax = buchten(1, sz.L - 1, 6, 0.5), e = ax[Math.floor(ax.length * 0.7)];
  if (e) {
    sz.q(e[0], e[1], 0.3, 3.3, 0, 2.0, GLAS_HELL);
    sz.q(e[0] + 0.15, e[1] - 0.15, 0.3, 2.6, 2.0, 2.06, K.leer ? '#8a8f93' : GLAS_D);
    sz.q(e[0] - 0.6, e[1] + 0.6, 3.3, 3.6, -0.2, 2.6, band);
    if (!K.leer) {
      for (const du of [-2.2, e[1] - e[0] + 2.2]) {
        const u = e[0] + du;
        sz.q(u - 0.9, u + 0.9, 1.7, 1.76, 1.6, 1.66, '#7c848b');
        sz.q(u - 0.9, u - 0.84, 0.3, 1.76, 1.6, 1.66, '#7c848b'); sz.q(u + 0.84, u + 0.9, 0.3, 1.76, 1.6, 1.66, '#7c848b');
        for (let k = 0; k < 5; k++) sz.q(u - 0.75 + k * 0.32, u - 0.5 + k * 0.32, 0.9, 1.68, 1.4, 1.86, waehle(r, KLEID));
      }
      sz.kipp(0.8, 1.1, 0.06, e[1] + 4.2, 0.85, 3.0, band, 0, 0.2);
      if (K.leute) for (let i = 0; i < 3; i++) mensch(S, r, x0 + zw(r, e[0] - 3, e[1] + 3), 0.3, z0 + db + zw(r, 1, 2.6));
    }
  }
  // Fahnen an der Fassade
  for (const s of seiten) for (let u = 3; u < s.L - 2; u += 9) { s.q(u - 0.05, u + 0.05, H - 1.6, H - 1.5, 0.3, 1.6, '#5f676e'); s.q(u - 0.03, u + 0.03, H - 4.0, H - 1.6, 1.0, 1.55, K.leer ? '#cfcac0' : '#f6d32d'); }
  S.quader(x0, H, z0, x0 + w, H + 0.15, z0 + db, KIES);
  technik(S, r, x0 + 2, z0 + 2, x0 + w - 2, z0 + db - 2, H + 0.15, { max: 3 });
  if (park) {
    const zp = z0 + db;
    S.quader(x0, 0.28, zp + 2.5, x0 + w, 0.33, z0 + d, '#868c93');
    parkreihe(S, r, x0 + 1, x0 + w - 1, zp + 7.5, 5, 0.33, K.leer ? 0.05 : 0.5);
    for (let x = x0 + 3; x < x0 + w - 1; x += 6) busch(S, r, x, 0.33, z0 + d - 0.6, 0.7);
    // Preis-Pylon an der Ecke
    const px = x0 + w - 2, pz = z0 + d - 2, ph = 8;
    S.box(1.6, ph, 0.7, px, ph / 2, pz, band);
    const sp = new Seite(S, px - 0.8, pz - 0.35, 1.6, 0.7, '+z');
    if (!K.leer) {
      const pn = passend(K.name, 1.4, 0.5);
      plakat(scene, sp, K.name, 0.8, ph - 0.7, 0.03, pn, '#ffffff');
      sp.q(0.1, 1.5, ph - 3.6, ph - 1.4, 0.0, 0.04, '#f6d32d');
      plakat(scene, sp, '%', 0.8, ph - 2.5, 0.06, 1.6, band);
    }
  }
  return H + 1;
}

// ---------------------------------------------------------------- 4 Elektronikmarkt (Kiste mit großen Lettern)
function elektronik(K) {
  const { S, scene, x0, z0, w, d, r, v } = K;
  const n = geschosse(K, 1, 2, 0.7);
  const H = n === 1 ? 8.0 : EG + OG + 2.0, D = 1.5;
  const [korpus, letter, lbg] = [['#2b2f35', '#ffffff', '#d92b2b'], ['#d92b2b', '#ffffff', '#1f1f1f'], ['#1e3a5f', '#f6d32d', '#1e3a5f'], ['#e9ebec', '#ffffff', '#ef7d00']][v % 4];
  S.quader(x0, 0, z0, x0 + w - D, 4.4, z0 + d - D, '#3d4248');
  S.quader(x0, 4.4, z0, x0 + w, H, z0 + d, korpus);
  const [sz, sx] = K.seiten;
  for (const s of K.seiten) {
    // Glasfront unten
    const oe = [];
    const ax = buchten(1, s.L - 1, 5, 0.3);
    ax.forEach(([a, b], i) => {
      const ein = s === sz && i === Math.floor(ax.length * 0.5);
      oe.push({ a, b, y0: 0.3, y1: 4.2 });
      if (K.leer) { s.q(a, b, 0.3, 4.2, -D - 0.1, -D, '#8a8f93'); brett(K, s, a, b, 0.3, 4.2, -0.2); return; }
      s.q(a, b, 0.3, 4.2, -D - 0.1, -D, ein ? GLAS_D : '#3c4a55');
      s.q(a, b, 0.3, 0.42, -D, 0, '#d6d0c4');
      if (!ein) ware(K, s, a, b, 0.42, -D, 'elektronik');
      s.q(a - 0.15, a, 0.3, 4.2, -D, 0.1, '#5f676e');
    });
    wand(s, 0, s.L, 0, 4.4, -D, 0, oe, REGION[K.reg]?.wand ?? korpus);
    if (K.reg) regionHaut(K, s, 0, s.L, 0.3, 4.2, 0.0, REGION[K.reg].wand);
    // Rippen am Korpus
    for (let u = 1; u < s.L; u += 2) s.q(u - 0.05, u + 0.05, 4.4, H, 0, 0.08, dunkler(korpus, 0.05));
    s.q(0, s.L, 4.2, 4.5, 0, 0.6, lbg);
    // Riesenlettern
    const wandAus = s === sx && !K.leer && s.L >= 30 ? s.L * 0.12 + Math.min(12, s.L * 0.35) + 0.8 : 0;
    // an der Ecke steht ggf. die Rotunde (K.ecke): Schrift nur auf dem freien Frontabschnitt daneben
    const frei = s.L - wandAus - (K.ecke ?? 0);
    const hb = Math.min((H - 4.5) * 0.55, (frei * 0.85) / kastenBreite(K.name, 1));
    kastenSchrift(K, s, K.name, wandAus + frei * 0.5, 4.5 + (H - 4.5) * 0.5, 0.1, hb, letter, lbg);
  }
  // Videowand auf +x
  if (!K.leer && sx.L >= 30) {
    const u0 = sx.L * 0.12, u1 = u0 + Math.min(12, sx.L * 0.35), y0 = 4.9, y1 = H - 0.6;
    sx.q(u0 - 0.3, u1 + 0.3, y0 - 0.3, y1 + 0.3, 0.1, 0.5, '#1f2328');
    const farben = ['#1f63b5', '#2f7fd0', '#4fb6c2', '#7cc4e4'];
    for (let k = 0; k < 4; k++) sx.q(u0, u1, y0 + (k * (y1 - y0)) / 4, y0 + ((k + 1) * (y1 - y0)) / 4, 0.5, 0.55, farben[k]);
    const t = 'TV-WOCHEN';
    plakat(scene, sx, t, (u0 + u1) / 2, (y0 + y1) / 2, 0.57, passend(t, (u1 - u0) * 0.8, (y1 - y0) * 0.4), '#ffffff');
  }
  // Dach: Antennen und Satellitenschüsseln
  flachdach(K, x0, z0, w, d, H, { max: 4, solar: w * d > 1500 });
  attika(S, x0, z0, w, d, H, 0.4, dunkler(korpus, 0.05), 0.3);
  for (let i = 0; i < 3; i++) {
    const px = x0 + 3 + i * 3.5, pz = z0 + d - 4;
    zyl(S, px, H + 0.2, pz, 0.08, 1.4, '#8a9096', 5);
    const g = new THREE.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 3); g.rotateX(-1.0); g.translate(px, H + 1.8, pz + 0.2); S.add(g, '#e8eaeb');
  }
  if (d >= 36 && !K.leer && K.leute) for (let i = 0; i < 3; i++) mensch(S, r, x0 + w * zw(r, 0.3, 0.7), 0.3, z0 + d + 1.5);
  return H + 3;
}

// ---------------------------------------------------------------- 5 Premium-Kaufhaus (Department Store, Messingschrift, Markisen)
function premium(K) {
  const { S, scene, x0, z0, w, d, r, v } = K;
  const n = geschosse(K, 4, 5, 1.1); // höchstens 5 Geschosse: Gesamthöhe mit Dach und Fahnen bleibt unter 28 m
  const H = EG + (n - 1) * OG, D = 1.6;
  const RG = REGION[K.reg];
  const stein = (RG?.stein ?? ['#efe7d6', '#e9e1d1', '#f1ebe0', '#e6dccb'])[v % 4], hell = RG?.hell ?? heller(stein, 0.04), dunk = dunkler(stein, 0.09);
  const mark = ['#1f4a3a', '#5a1f2b', '#1f2f4f', '#2a2a2a'][v % 4];
  const dachF = RG?.dach ?? (v % 2 ? '#5f6b70' : '#6f9a83');
  S.quader(x0, 0, z0, x0 + w - D, EG, z0 + d - D, '#4d4740');
  S.quader(x0, EG, z0, x0 + w, H, z0 + d, stein);
  for (const s of K.seiten) {
    const ax = ladenzone(K, s, { raster: 5.0, pb: 1.0, D, pfeiler: hell, sturz: stein, sockel: dunk, glas: '#44514f', art: 'premium', gTop: 3.9 });
    // Markisen über jedem Schaufenster, Portal mit Baldachin
    for (const a of ax) {
      if (a.ein) {
        s.q(a.a - 0.5, a.b + 0.5, 4.0, 4.35, 0, 3.4, mark);
        s.q(a.a - 0.5, a.b + 0.5, 4.35, 4.45, 0, 3.5, MESSING);
        for (const u of [a.a - 0.3, a.b + 0.3]) { const [x, z] = s.welt(u, 3.2); zyl(S, x, 0.3, z, 0.07, 3.7, MESSING, 6); }
        if (!K.leer && K.leute) puppe(s, a.b + 0.9, 0.3, 1.4, mark, '#1f1f1f'); // Portier
        const ph = passend(K.name, a.b - a.a + 0.8, 0.32, SERIF);
        plakat(scene, s, K.name, (a.a + a.b) / 2, 4.2, 3.42, ph, MESSING, null, { schrift: SERIF });
        continue;
      }
      if (K.leer) continue;
      s.kipp(a.b - a.a, 0.1, 1.5, (a.a + a.b) / 2, 4.15, 0.75, mark, 0, 0.45);
      s.q(a.a, a.b, 3.55, 3.8, 1.38, 1.46, mark);
    }
    // Obergeschosse: französische Fenster mit Gittern, Gesimse
    s.q(0, s.L, EG - 0.15, EG + 0.4, 0, 0.45, hell);
    if (K.reg === 'ost') s.q(0, s.L, EG + 0.4, EG + 0.6, 0, 0.45, RG.akzent);
    const nb = Math.max(1, Math.round(s.L / 3.4)), bw = s.L / nb;
    for (let k = 0; k < n - 1; k++) {
      const y0 = EG + k * OG;
      for (let i = 0; i < nb; i++) {
        const m = (i + 0.5) * bw;
        s.q(m - 0.75, m + 0.75, y0 + 0.6, y0 + 3.2, -0.04, 0.02, GLAS);
        s.q(m - 0.04, m + 0.04, y0 + 0.6, y0 + 3.2, 0, 0.08, '#f4f1ea');
        s.q(m - 0.95, m + 0.95, y0 + 3.2, y0 + 3.45, 0, 0.25, hell);
        if (k === 0 || k % 2 === 1) { s.q(m - 0.9, m + 0.9, y0 + 0.55, y0 + 0.65, 0, 0.5, dunk); s.q(m - 0.9, m + 0.9, y0 + 1.25, y0 + 1.3, 0.42, 0.5, '#2b2b2b'); for (let u = m - 0.8; u <= m + 0.81; u += 0.32) s.q(u - 0.02, u + 0.02, y0 + 0.65, y0 + 1.25, 0.44, 0.48, '#2b2b2b'); }
      }
      if (k > 0) s.q(0, s.L, y0 - 0.08, y0 + 0.08, 0, 0.12, dunk);
    }
    for (let i = 0; i <= nb; i++) s.q(i * bw - 0.12, i * bw + 0.12, EG + 0.4, H, 0, 0.1, hell);
    s.q(0, s.L, H - 0.2, H + 0.5, -0.1, 0.65, hell);
    // Gauben im Mansarddach
    for (let i = 0; i < nb; i++) {
      const m = (i + 0.5) * bw;
      s.q(m - 0.8, m + 0.8, H + 0.9, H + 2.6, -2.6, -0.9, hell);
      s.q(m - 0.5, m + 0.5, H + 1.1, H + 2.3, -0.9, -0.86, GLAS);
      s.q(m - 0.95, m + 0.95, H + 2.6, H + 2.85, -2.7, -0.75, dachF);
    }
  }
  // Mansarddach (Walm)
  const md = stumpf(w + 0.4, d + 0.4, 3.6, 2.8); md.translate(x0 + w / 2, H + 0.5, z0 + d / 2); S.add(md, dachF);
  S.quader(x0 + 2.6, H + 4.1, z0 + 2.6, x0 + w - 2.6, H + 4.15, z0 + d - 2.6, KIES);
  // flache Haustechnik (Höhengrenze 28 m)
  for (const [fx, fz, bw, bd] of [[0.3, 0.35, Math.min(6, w * 0.2), 3], [0.62, 0.55, 3, 2.4]]) if (w > 16 && d > 14) { S.box(bw, 1.2, bd, x0 + w * fx, H + 4.75, z0 + d * fz, '#c9c6bf'); S.box(bw + 0.2, 0.12, bd + 0.2, x0 + w * fx, H + 5.4, z0 + d * fz, '#d6d3cc'); }
  // Fahnen auf dem Dach
  for (let i = 0; i < 3; i++) {
    const fx = x0 + w * (0.25 + i * 0.25), fz = z0 + d - 3;
    zyl(S, fx, H + 4.1, fz, 0.07, 2.6, '#e8eaeb', 6);
    S.box(1.4, 0.8, 0.05, fx + 0.75, H + 6.2, fz, K.leer ? '#cfcac0' : mark);
  }
  // Name in Messing auf dem Gesims (klein)
  for (const s of K.seiten) {
    const ph = passend(K.name, s.L * 0.4, 0.55, SERIF);
    plakat(scene, s, K.name, s.L * 0.5, H - 0.6, 0.12, ph, MESSING, null, { schrift: SERIF });
  }
  return H + 7;
}

// ---------------------------------------------------------------- 6 Fast Fashion (Glasfassade, Großbildwerbung)
function fastfashion(K) {
  const { S, scene, x0, z0, w, d, r, v } = K;
  const n = geschosse(K, 3, 4, 0.9);
  const H = EG + (n - 1) * OG + 0.5, D = 1.8;
  const bild = [['#e8336d', '#f6d32d'], ['#1f1f1f', '#e8e4dc'], ['#4fb6c2', '#ffffff'], ['#f28c1c', '#1f1f1f']][v % 4];
  S.quader(x0, 0, z0, x0 + w - D, H, z0 + d - D, '#3a4148');
  const [sz, sx] = K.seiten;
  for (const s of K.seiten) {
    // Glas über alle Geschosse, weiße Finnen
    for (let e = 0; e < n; e++) {
      const y0 = e === 0 ? 0.3 : EG + (e - 1) * OG, y1 = e === 0 ? EG : EG + e * OG;
      s.q(0, s.L, y0, y0 + 0.12, -D, 0, '#e3e0d9');
      s.q(0, s.L, y0, y1, -D - 0.1, -D, e === 0 ? '#d9d4ca' : '#ece8e0');
      if (e > 0) s.q(0, s.L, y1 - 0.5, y1 - 0.42, -0.05, 0.05, '#cfd6da');
      s.q(0, s.L, y1 - 0.3, y1 - 0.18, -D, -D + 0.06, LICHT);
      if (!K.leer) for (const [a, b] of buchten(0.5, s.L - 0.5, 4.2, 0.2)) if (r() < (e === 0 ? 1 : 0.6)) ware(K, s, a, b, y0 + 0.12, -D, 'fastfashion');
      if (e > 0) s.q(0, s.L, y0 - 0.2, y0 + 0.25, -0.1, 0.1, '#f4f4f2');
    }
    for (let u = 0; u <= s.L + 0.01; u += s.L / Math.max(1, Math.round(s.L / 3.2))) s.q(u - 0.09, u + 0.09, 0.3, H, -0.2, 0.5, '#f4f4f2');
    s.q(0, s.L, H, H + 1.0, -0.2, 0.5, REGION[K.reg]?.hell ?? '#f4f4f2');
    if (K.leer) for (const [a, b] of buchten(0.5, s.L - 0.5, 4.2, 0.3)) brett(K, s, a, b, 0.4, 4.0, 0.3);
  }
  // Großbildwerbung auf +z (über OG) mit Modell-Silhouette
  {
    const s = sz, u0 = s.L * 0.08, u1 = Math.min(s.L * 0.08 + Math.max(10, s.L * 0.45), s.L - 4), y0 = EG + 0.3, y1 = H + 0.8;
    s.q(u0 - 0.2, u1 + 0.2, y0 - 0.2, y1 + 0.2, 0.5, 0.7, '#d9dcde');
    s.q(u0, u1, y0, y1, 0.7, 0.8, K.leer ? '#cfcac0' : bild[0]);
    if (!K.leer) {
      const fu = u0 + (u1 - u0) * 0.7, hh = y1 - y0, sk = hh / 6.5;
      s.q(fu - 0.5 * sk, fu + 0.5 * sk, y0 + 0.2, y0 + 3.0 * sk, 0.82, 0.86, '#1f1f1f');
      s.q(fu - 0.9 * sk, fu + 0.9 * sk, y0 + 3.0 * sk, y0 + 5.0 * sk, 0.82, 0.86, bild[1]);
      s.q(fu - 0.35 * sk, fu + 0.35 * sk, y0 + 5.05 * sk, y0 + 5.9 * sk, 0.82, 0.86, '#e8cfb4');
      s.q(fu - 0.45 * sk, fu + 0.45 * sk, y0 + 5.6 * sk, y0 + 6.2 * sk, 0.86, 0.88, '#3a2a20');
      // Texte nur links vom Motiv (Figur ab fu - 0,9 × sk), damit nichts angeschnitten wird
      const t = 'JETZT NEU', ta = u0 + 0.5, tb = fu - 0.9 * sk - 0.6, tm = (ta + tb) / 2, tw = Math.max(1, tb - ta);
      plakat(scene, s, t, tm, y0 + hh * 0.55, 0.88, passend(t, tw * 0.92, hh * 0.25), bild[1] === '#1f1f1f' ? '#ffffff' : bild[1]);
      plakat(scene, s, K.name, tm, y0 + hh * 0.3, 0.88, passend(K.name, tw * 0.8, hh * 0.14), '#ffffff');
    }
  }
  // Name als Leuchtkasten auf dem Dachband
  for (const s of K.seiten) {
    const uu = s === sz ? (K.ecke ? (s.L - K.ecke) * 0.7 : s.L * 0.8) : K.ecke ? (s.L - K.ecke) * 0.5 : s.L * 0.5;
    const ph = passend(K.name, (K.ecke ? Math.min(s.L * 0.4, (s.L - K.ecke) * 0.5) : s.L * 0.4), 1.9);
    const br = plakatBreite(K.name, ph);
    s.q(uu - br / 2 - 0.3, uu + br / 2 + 0.3, H - 0.4, H + 2.0, 0.5, 0.62, K.leer ? '#e2e0d8' : '#1f1f1f');
    if (!K.leer) plakat(scene, s, K.name, uu, H + 0.8, 0.64, ph * 0.85, '#ffffff');
  }
  flachdach(K, x0, z0, w - D, d - D, H, { max: 4, kuppeln: false });
  S.quader(x0 + w - D, H + 0.9, z0, x0 + w + 0.5, H + 1.0, z0 + d + 0.5, '#f4f4f2');
  S.quader(x0, H + 0.9, z0 + d - D, x0 + w + 0.5, H + 1.0, z0 + d + 0.5, '#f4f4f2');
  return H + 2;
}

// ---------------------------------------------------------------- 7 Leerstehendes Ex-Kaufhaus eines Konkurrenten
function leer_ehemals(K) {
  const { S, scene, x0, z0, w, d, r, v } = K;
  K.leer = true;
  const n = geschosse(K, 3, 5);
  const H = EG + (n - 1) * OG, D = 1.6;
  const kachel = (REGION[K.reg]?.stein ?? ['#d9d1bf', '#cfc7b6', '#d4cfc4', '#c9bfab'])[v % 4];
  const schmutz = dunkler(kachel, 0.08);
  S.quader(x0, 0, z0, x0 + w - D, EG, z0 + d - D, '#4a4540');
  S.quader(x0, EG, z0, x0 + w, H, z0 + d, kachel);
  for (const s of K.seiten) {
    ladenzone(K, s, { raster: 5, pb: 0.8, D, pfeiler: dunkler(kachel, 0.05), sturz: kachel, art: 'mode', gTop: 4.0 });
    s.q(0, s.L, 4.2, 4.6, 0, 2.4, '#8f8a82'); // altes Vordach
    s.q(0, s.L, 4.6, 4.75, 2.3, 2.4, '#7a2b2b');
    // geschlossene Kachelfassade mit Kachelraster, Rostfahnen
    if (K.reg) regionHaut(K, s, 0, s.L, EG, H, 0, kachel);
    if (!K.reg || K.reg === 'sued') {
      for (let u = 1.2; u < s.L; u += 1.2) s.q(u - 0.03, u + 0.03, EG, H, 0, 0.05, schmutz);
      for (let y = EG + 1.2; y < H; y += 1.2) s.q(0, s.L, y - 0.03, y + 0.03, 0, 0.05, schmutz);
    }
    for (let i = 0; i < 9; i++) { const u = zw(r, 0, s.L - 1); s.q(u, u + zw(r, 0.3, 1.0), Math.max(EG, H - zw(r, 3, 10)), H, 0.05, 0.07, dunkler(kachel, zw(r, 0.1, 0.18))); }
    // ein Fensterband, teilweise eingeschlagen
    if (n >= 3) {
      const y0 = EG + OG * 0.4;
      for (const [a, b] of buchten(1, s.L - 1, 2.4, 0.4)) s.q(a, b, y0, y0 + 1.6, -0.05, 0.03, r() < 0.2 ? '#1c2228' : (r() < 0.5 ? '#6a767e' : GLAS));
    }
    s.q(0, s.L, H - 0.1, H + 0.6, 0, 0.3, dunkler(kachel, 0.04));
    // Schattenkontur des alten Logos
    const yL = EG + (H - EG) * (n >= 3 ? 0.68 : 0.5);
    const ph = passend(K.name, s.L * 0.7, Math.min(3.2, (H - EG) * 0.4));
    plakat(scene, s, K.name, s.L * 0.5, yL, 0.07, ph, dunkler(kachel, 0.2), null, { lit: true });
    for (let k = 0; k < 6; k++) s.q(s.L * 0.5 - plakatBreite(K.name, ph) * 0.42 + k * plakatBreite(K.name, ph) * 0.17, s.L * 0.5 - plakatBreite(K.name, ph) * 0.42 + k * plakatBreite(K.name, ph) * 0.17 + 0.12, yL - ph * 0.3, yL - ph * 0.2, 0.05, 0.25, '#6c6c6c');
  }
  // Banner ZU VERMIETEN auf +x
  {
    const s = K.seiten[1], t = 'ZU VERMIETEN';
    const ph = passend(t, s.L * 0.5, 1.6);
    const br = plakat(scene, s, t, s.L * 0.5, EG + 1.4, 0.5, ph, '#3b4248', '#ffffff');
    s.q(s.L * 0.5 - br / 2 - 0.1, s.L * 0.5 + br / 2 + 0.1, EG + 1.4 - ph / 2 - 0.1, EG + 1.4 + ph / 2 + 0.1, 0.35, 0.45, '#cfd3d6');
    const t2 = '0800 / 12 34 56';
    plakat(scene, s, t2, s.L * 0.5, EG + 1.4 - ph * 0.85, 0.5, ph * 0.4, '#3b4248', '#ffffff');
  }
  // Unkraut am Sockel, Tauben aufs Dach
  for (const s of K.seiten) for (let u = 1; u < s.L; u += zw(r, 3, 7)) { const [x, z] = s.welt(u, 0.4); busch(S, r, x, 0.3, z, 0.35); }
  S.quader(x0, H, z0, x0 + w, H + 0.2, z0 + d, '#a9a69e');
  technik(S, r, x0 + 2, z0 + 2, x0 + w - 2, z0 + d - 2, H + 0.2, { max: 3, farbe: '#b8b4ac' });
  for (let i = 0; i < 5; i++) busch(S, r, x0 + zw(r, 2, w - 2), H + 0.2, z0 + zw(r, 2, d - 2), 0.4);
  return H + 3;
}

const BAU = { modehaus, offprice, textildiscounter, elektronik, premium, fastfashion, leer_ehemals };
/** Einheitliche Zustandsüberlagerung: alle Bauformen behalten ihren eigenen Körper. */
export const WETTBEWERBER_FARBEN = {
  modehaus: '#795846', fastfashion: '#292b39', premium: '#9e773e',
  offprice: '#d62867', textildiscounter: '#2565b5', elektronik: '#d34532',
  leer_ehemals: '#777d80',
};
function dekorZustand(S, scene, p, art, hoehe) {
  const z = p.zustand ?? {}, status = z.status ?? p.status ?? 'offen';
  const rabatt = Math.max(0, Math.min(1, z.rabatt ?? p.rabatt ?? 0));
  if (status === 'offen' && !rabatt) return hoehe;
  const w = Math.max(16, Math.min(90, p.w ?? 40)), d = Math.max(16, Math.min(70, p.d ?? 30));
  const x = p.x ?? 0, zz = p.z ?? 0;
  const farbe = WETTBEWERBER_FARBEN[art] ?? '#51677a';
  const seiten = seitenVon(S, x, zz, w, d);
  const banner = (s, t, y, breite = 0.75, h = 1.4, bg = farbe) => {
    s.q(s.L * (1 - breite) / 2, s.L * (1 + breite) / 2, y - h * 0.65, y + h * 0.65, 0.6, 0.86, bg);
    plakat(scene, s, t, s.L / 2, y, 1.02, passend(t, s.L * breite * 0.88, h), '#ffffff');
  };
  if (status === 'eroeffnung') {
    banner(seiten[0], 'NEUERÖFFNUNG', EG + 2.0, 0.78, 1.65);
    S.quader(x + w * 0.37, 0.02, zz + d, x + w * 0.63, 0.09, zz + d + 4.5, '#b5292c');
    const r = rng('eroeffnung:' + (p.seed ?? 0));
    for (let i = 0; i < 10; i++) {
      const xx = x + 2 + i * (w - 4) / 9;
      const farb = i % 3 === 0 ? '#f1c84a' : i % 2 ? farbe : '#f0f0e7';
      S.box(0.05, 1.9, 0.05, xx, EG + 4.1, zz + d + 0.8, '#f1f0e8');
      zyl(S, xx, EG + 5.0, zz + d + 0.8, 0.38, 0.6, farb, 8);
    }
    // Warteschlange auf dem Vorplatz und doppelte Passantenfrequenz.
    for (let i = 0; i < 16; i++) mensch(S, r, x + w * (0.39 + r() * 0.22), 0.15, zz + d + 1 + i * 0.32);
    for (let i = 0; i < 12; i++) mensch(S, r, x + r() * w, 0.15, zz + d + 1 + r() * 5);
    hoehe = Math.max(hoehe, EG + 6);
  }
  if (rabatt && status !== 'raeumung' && status !== 'geschlossen') {
    const t = Math.round(rabatt * 100) + ' %';
    for (const s of seiten) banner(s, t, EG + 1.9, 0.28, 1.6);
    if (art === 'offprice') {
      S.box(4.0, 2.0, 0.3, x + 4, 1.2, zz + d + 2.3, farbe);
      banner(seiten[0], 'AKTION', EG + 4.3, 0.38, 1.0);
    }
  }
  if (status === 'raeumung') {
    for (const s of seiten) {
      banner(s, 'ALLES MUSS RAUS', EG + 2, 0.87, 1.6, '#bf302c');
      banner(s, 'WIR SCHLIESSEN', EG + 4.3, 0.60, 1.05, '#7c2525');
      banner(s, 'BIS 70 %', EG + 0.55, 0.37, 0.9, '#bf302c');
      for (let i = 0; i < 4; i++) s.q(1 + i * (s.L - 2) / 4, 1.7 + i * (s.L - 2) / 4, 0.5, 3.4, 0.1, 0.2, '#a9adb0');
    }
  }
  if (status === 'geschlossen' || art === 'leer_ehemals') {
    for (const s of seiten) {
      banner(s, 'ZU VERMIETEN', EG + 1.7, 0.72, 1.35, '#596066');
      if (p.name) plakat(scene, s, p.name, s.L / 2, Math.min(hoehe - 2, EG + 5), 0.35, passend(p.name, s.L * 0.5, 1.0), '#a3a3a3');
    }
  }
  return hoehe;
}


/**
 * Baut einen Wettbewerber auf [x, x+w] × [z, z+d].
 * p: { x, z, w, d, seed, art?, name?, region? } → { hoehe, art, name, teile }
 */
export function wettbewerber(S, scene, p) {
  const start = S.anzahl;
  const r0 = rng(`wb:${p.seed ?? 1}:${p.region ?? ''}`);
  const artOriginal = BAU[p.art] ? p.art : ARTEN[Math.floor(r0() * ARTEN.length)];
  const art = p.zustand?.status === 'geschlossen' ? 'leer_ehemals' : artOriginal;
  const name = p.name ?? NAMEN[art][Math.floor(r0() * 3)];
  const w = clamp(p.w ?? 40, 16, 90), d = clamp(p.d ?? 30, 16, 70);
  const K = {
    S, scene, art, name, r: rng(`wb:${p.seed}:${art}`), v: Math.floor(r0() * 8),
    x0: p.x ?? 0, z0: p.z ?? 0, w, d, leer: art === 'leer_ehemals', reg: regionVon(p.region), leute: p.passanten !== false,
  };
  // Bauform (p.form 0 bis 4, sonst aus dem Seed 0 bis 2): 0 Block, 1 Kopfturm rechts, 2 Rotunde mit Glasvorbau, 3 Kopfturm
  // links, 4 Kopfturm mit Glasvorbau (ohne Rotunde; der Zylinder bleibt Bauform 2 vorbehalten). Die Art baut ihren Körper auf der Restfläche; so hat jede Art fünf verschiedene Silhouetten.
  let form = Number.isInteger(p.form) ? ((p.form % 5) + 5) % 5 : Math.floor(r0() * 3);
  // Die Rotunde ist auffällig und wirkt bei Wiederholung kopiert: nur in etwa jedem vierten Fall
  if (form === 2 && (Math.imul((p.seed ?? 1) >>> 0, 2654435761) >>> 0) % 4 !== 0) form = [0, 1, 3][(p.seed ?? 1) % 3];
  let hoehe;
  if (form === 3 && w >= 30) {
    // Kopfturm an der −x-Ecke (Turm links, Haupthaus rechts daneben)
    const w2 = Math.round(w * 0.34);
    const K1 = { ...K, x0: K.x0 + w2, w: w - w2 }; K1.seiten = seitenVon(S, K1.x0, K.z0, K1.w, d);
    const h1 = BAU[art](K1);
    hoehe = kopfturm(K, K.x0, K.z0, w2, d, h1);
  } else if (form === 4 && w >= 30 && d >= 26) {
    // Kopfturm rechts und Glasvorbau mit Rotunde davor
    const w1 = Math.round(w * 0.7), d1 = Math.round(d * 0.76);
    const K1 = { ...K, w: w1, d: d1, vorbauH: EG + 0.85 }; K1.seiten = seitenVon(S, K.x0, K.z0, w1, d1);
    const h1 = BAU[art](K1);
    const ht = kopfturm(K, K.x0 + w1, K.z0, w - w1, d1, h1);
    hoehe = Math.max(ht, rotunde(K, d1, h1, false));
  } else if (form === 1 && w >= 30) {
    const w1 = Math.round(w * 0.66);
    const K1 = { ...K, w: w1 }; K1.seiten = seitenVon(S, K.x0, K.z0, w1, d);
    const h1 = BAU[art](K1);
    hoehe = kopfturm(K, K.x0 + w1, K.z0, w - w1, d, h1);
  } else if (form === 2 && d >= 26) {
    const d1 = Math.round(d * 0.76);
    // Bildbreite, die die Rotunde vor der Hauptfront verdeckt (Silhouette des Zylinders unter 45°): d − d1 + √2·R + Rand
    const K1 = { ...K, d: d1, vorbauH: EG + 0.85, ecke: d - d1 + 1.5 * clamp(Math.min(w, d) * 0.2, 4, 9) + 1.5 }; K1.seiten = seitenVon(S, K.x0, K.z0, w, d1);
    const h1 = BAU[art](K1);
    hoehe = rotunde(K, d1, h1);
  } else {
    K.seiten = seitenVon(S, K.x0, K.z0, w, d);
    hoehe = BAU[art](K);
  }
  hoehe = dekorZustand(S, scene, p, art, hoehe);
  return { hoehe, art, name, form, teile: S.anzahl - start };
}

/** Farben der Zusatzbauten je Art: [Wand, Akzent, Glas]. */
const FORM_FARBEN = {
  modehaus: ['#d8cbb0', BRONZE, GLAS], premium: ['#e9e1d2', MESSING, GLAS], offprice: ['#eeece6', '#e8336d', GLAS_HELL],
  textildiscounter: ['#e4e3df', '#1f63b5', GLAS_HELL], elektronik: ['#3a3f45', '#e03b2f', GLAS_D], fastfashion: ['#f2f1ee', '#1f1f1f', GLAS_D],
  leer_ehemals: ['#c9c6bf', '#8a8f94', GLAS_D],
};
/** Bauform 1: Kopfbau als schlanker Turm an der +x-Ecke, zwei Geschosse über dem Haupthaus, Name oben an der Front. */
function kopfturm(K, x, z, w, d, h1) {
  const { S, scene, art, name, r } = K;
  const [wand, akzent, glas] = FORM_FARBEN[art] ?? FORM_FARBEN.modehaus;
  const H = clamp(h1 + 7, 14, 30);
  S.quader(x, 0, z, x + w, EG, z + d, '#4f565c');
  S.quader(x, EG, z, x + w, H, z + d, wand);
  for (const s of seitenVon(S, x, z, w, d)) {
    s.q(0.3, s.L - 0.3, 0.3, EG - 0.6, -0.02, 0.05, glas);
    for (let y = EG + 0.9; y < H - 2.4; y += OG) for (let u = 1.2; u < s.L - 1; u += 2.4) s.q(u, u + 1.4, y, y + 2.2, -0.02, 0.06, glas);
    s.q(0, s.L, EG - 0.3, EG + 0.15, 0, 0.5, akzent);
    s.q(s.L - 0.8, s.L, EG, H, 0, 0.25, akzent);
    s.q(0, s.L, H - 0.3, H + 0.3, -0.1, 0.35, dunkler(wand, 0.12));
  }
  const sz = new Seite(S, x, z, w, d, '+z');
  // Name auf einer Tafel in Akzentfarbe unter dem Turmabschluss, groß genug für den Spielabstand
  const ph = passend(name, w * 0.8, 2.2);
  const metall = akzent === BRONZE || akzent === MESSING;
  sz.q(w / 2 - plakatBreite(name, ph) / 2 - 0.5, w / 2 + plakatBreite(name, ph) / 2 + 0.5, H - 2.9 - ph / 2, H - 2.9 + ph / 2 + 0.3, 0.06, 0.12, metall ? '#3b3226' : akzent);
  plakat(scene, sz, name, w / 2, H - 2.75, 0.14, ph, metall ? '#ecd39b' : '#ffffff');
  S.quader(x + 0.4, H, z + 0.4, x + w - 0.4, H + 0.2, z + d - 0.4, KIES);
  technik(S, r, x + 1, z + 1, x + w - 1, z + d - 1, H + 0.2, { max: 2 });
  return Math.max(h1, H + 2);
}
/** Bauform 2: verglaster Ladenvorbau entlang der Front, an der +x+z-Ecke eine Rotunde mit Glasbändern (mitRotunde = false: nur Vorbau). */
function rotunde(K, d1, h1, mitRotunde = true) {
  const { S, scene, art, name, x0, z0, w, d } = K;
  const [wand, akzent, glas] = FORM_FARBEN[art] ?? FORM_FARBEN.modehaus;
  const tv = d - d1, Hv = EG + 0.6;
  // Vorbau
  S.quader(x0, 0, z0 + d1, x0 + w, Hv, z0 + d, '#5a6168');
  const sv = new Seite(S, x0, z0 + d1, w, tv, '+z');
  sv.q(0.3, w - 0.3, 0.3, Hv - 1.6, -0.02, 0.06, glas);
  for (let u = 2; u < w - 1; u += 3) sv.q(u - 0.1, u + 0.1, 0.3, Hv - 1.6, 0, 0.12, '#d9dcde');
  sv.q(-0.2, w + 0.2, Hv - 1.6, Hv + 0.2, 0, 0.9, akzent);
  S.quader(x0 + 0.3, Hv, z0 + d1, x0 + w - 0.3, Hv + 0.15, z0 + d - 0.3, KIES);
  // Name auf der Vordachblende (1,8 m hoch), Lettern 1,3 m, links vor der Rotunde
  const ph = passend(name, (mitRotunde ? w - (d - d1) - 2 * clamp(Math.min(w, d) * 0.2, 4, 9) : w) * 0.6, 1.3);
  plakat(scene, sv, name, (mitRotunde ? w - (d - d1) - 2 * clamp(Math.min(w, d) * 0.2, 4, 9) : w) * 0.45, Hv - 0.7, 0.92, ph, akzent === BRONZE || akzent === MESSING ? '#3b3226' : '#ffffff');
  if (!mitRotunde) return Math.max(h1, Hv + 0.2);
  // Rotunde an der Ecke
  const R = clamp(Math.min(w, d) * 0.2, 4, 9), H = clamp(h1 + 3, 10, 28);
  const cx = x0 + w - R + 0.6, cz = z0 + d - R + 0.6;
  const zylinder = (rad, y0, y1, f) => { const g = new THREE.CylinderGeometry(rad, rad, y1 - y0, 24); g.translate(cx, (y0 + y1) / 2, cz); S.add(g, f); };
  zylinder(R, 0, H, wand);
  for (let y = EG; y < H - 2; y += OG) zylinder(R + 0.05, y + 0.8, y + 3.0, glas);
  zylinder(R + 0.25, H - 0.2, H + 0.4, akzent);
  // Dachkopf in Kiesgrau mit Technikring (nie aus der Wandfarbe abgedunkelt: bei dunklen Häuten sonst ein schwarzes Loch)
  zylinder(R + 0.05, H - 0.15, H + 0.3, KIES);
  zylinder(R * 0.6, H + 0.4, H + 1.6, '#c9cbcc');
  zylinder(R * 0.62, H + 1.6, H + 1.75, '#9ea2a5');
  return Math.max(h1, H + 1.6);
}
