// Hartwig-Zentrale (HQ) wie in Coffee Inc 2: Bürogebäude mieten, Etagen mieten, Abteilungen auf Etagen setzen.
//
// Eingabe ist ausschließlich das JSON aus hqFuerGrafik (Engine) bzw. render/hq-beispiel.json:
//   { sitz, gebaeude: [{ id, name, stadt, typ, etagen: [{ nr, qm, gemietet, abteilungen: [{ id, fte, stufe }] }] }],
//     angebote: [{ id, stadt, typ, etagen: [{ nr, qm }] }] }
//
// Export:
//   hqGebaeude(S, scene, g, opt)   Bürogebäude außen (Typ altbau | nachkrieg | buero70 | glas | loft | campus).
//                                   g: Gebäude oder Angebot aus dem JSON. opt: { x = 0, z = 0, seed }.
//                                   Gemietete Etagen leuchten, Hartwig-Zentrale-Schild am Eingang (und auf dem Dach,
//                                   wenn Hartwig mindestens die Hälfte der Etagen mietet), freie Etagen mit Banner,
//                                   freie Gebäude (Angebote) mit großem „Zu vermieten“-Banner. Rückgabe { hoehe, w, d }.
//   hqEtage(S, scene, g, nr, opt)  Etage als aufgeschnittenes Puppenhaus (Rückwände -x/-z, Front offen) wie
//                                   grundriss.js etage(): Kern mit Treppe, Aufzug, Teeküche (EG: Empfang), je Abteilung
//                                   eine Zone mit typischer Einrichtung nach Stufe 0 bis 3, Figuren nach FTE,
//                                   Leerfläche (gemietet, ohne Abteilung) mit abgedeckten Möbeln, freie Etage roh.
//                                   Rückgabe { box, anzahl, figuren, zonen }.
//   hqMasse(g)                      Grundfläche und Höhen: { w, d, eg, gh, n, H }.
//   hqEinplanen(plan, hq, stadt)    setzt HQ-Gebäude und Angebote nachträglich in einen fertigen Stadtplan (Plan sonst
//                                   unverändert), Ensemble gleicher Adresse mit Brücke. angebotMarker() Schlüssel-Pin.
//   ABTEILUNGEN                     Name und Farbe je Abteilung (inkl. 'produkt' Produktentwicklung).
//   hqEtage opt.vorstand            Vorstandsetage, siehe Ergänzung am Dateiende.
// Slot-Bauer 'slot:hq' wird über registriereSlots (bauer.js) angemeldet: p.standort.hq = Gebäude bzw. Angebot.
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, rng, waehle, zw, FARBEN, heller, dunkler, gesims, dachProfil, schild, textMaterial } from './basis.js';
import { lokal, vorbereiten, boden, rueckwand, stuetze, treppenhaus, aufzug, figur, wandschild, haengeschild, GLAS, puppe, PAL } from './innen.js';
import { registriereSlots } from './bauer.js';

const PI = Math.PI;
const ROT = FARBEN.marke;
const LICHT = ['#f4dc98', '#f1d58a', '#f6e2a8'];   // beleuchtete (gemietete) Etagen
const DUNKEL = '#4a5762';                           // freie Etagen

export const ABTEILUNGEN = {
  controlling: { name: 'Controlling', farbe: '#2f6fb3' },
  einkauf: { name: 'Einkauf', farbe: '#c0832f' },
  marketing: { name: 'Marketing', farbe: '#d0457a' },
  personal: { name: 'Personal', farbe: '#3f9a6a' },
  immobilien: { name: 'Immobilien', farbe: '#8a6440' },
  logistik: { name: 'Logistik', farbe: '#e07b2a' },
  ecommerce: { name: 'E-Commerce', farbe: '#7a4fc0' },
  recht: { name: 'Recht', farbe: '#8a2f3a' },
  vm: { name: 'Visual Merchandising', farbe: '#1f9aa8' },
  verwaltung: { name: 'Verwaltung', farbe: '#5f6b78' },
};

const TYP = {
  altbau: { tiefe: 16, eg: 5.0, gh: 3.9 },
  nachkrieg: { tiefe: 16, eg: 4.4, gh: 3.4 },
  buero70: { tiefe: 22, eg: 4.4, gh: 3.6 },
  glas: { tiefe: 22, eg: 6.0, gh: 3.8 },
  loft: { tiefe: 20, eg: 5.0, gh: 4.6 },
  campus: { tiefe: 30, eg: 4.8, gh: 3.8 },
};
const zahl = (n) => new Intl.NumberFormat('de-DE').format(n);
const hashText = (s) => [...String(s ?? 'hq')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// Verhältnis Breite zu Tiefe je Typ; Bruttofläche = Nutzfläche / 0,85
const PROPORTION = { altbau: 2.4, nachkrieg: 4.0, buero70: 2.0, glas: 1.4, loft: 2.2, campus: 2.0 };
const r25 = (v) => Math.round(v / 2.5) * 2.5;
function grundflaeche(typ, qm, n = 1) {
  // Hochhäuser (ab 9 Etagen) kompakter: höchstens 2,6 : 1
  const A = Math.max(200, qm) / 0.85, p = n >= 9 ? Math.min(2.6, PROPORTION[typ] ?? 2) : PROPORTION[typ] ?? 2;
  const d = Math.max(12, r25(Math.sqrt(A / p)));
  return { w: Math.max(d * 0.8, r25(A / d)), d };
}
/**
 * Grundfläche und Höhen aus den Etagen des JSON: w × d ≈ qm / 0,85 in der Proportion des Typs, Etagenzahl aus dem JSON.
 * Sind die unteren Etagen deutlich größer (ab 30 %) als die oberen, besteht das Gebäude aus zwei Baukörpern:
 * Flachbau (sockel: Anzahl Etagen, Fläche der größten Sockeletage) und Hochhaus darauf an der hinteren Ecke (turm).
 */
export function hqMasse(g) {
  const t = TYP[g.typ] ?? TYP.nachkrieg;
  const et = [...g.etagen].sort((a, b) => a.nr - b.nr);
  const n = et.length;
  let sockel = 0;
  for (let k = 1; k < n - 1; k++) {
    const unten = Math.min(...et.slice(0, k).map((e) => e.qm)), oben = Math.max(...et.slice(k).map((e) => e.qm));
    if (unten >= oben * 1.3 && n - k >= 2) { sockel = k; break; }
  }
  if (!sockel) {
    const f = grundflaeche(g.typ, Math.max(...et.map((e) => e.qm)), n);
    return { ...f, eg: t.eg, gh: t.gh, n, H: t.eg + (n - 1) * t.gh, sockel: 0 };
  }
  const tf = grundflaeche(g.typ, Math.max(...et.slice(sockel).map((e) => e.qm)), n - sockel);
  const qs = Math.max(...et.slice(0, sockel).map((e) => e.qm)) / 0.85;
  const sd = Math.max(tf.d + 7.5, r25(Math.sqrt(qs / 2))), sw = Math.max(tf.w + 7.5, r25(qs / sd));
  const sh = t.eg + (sockel - 1) * 4.0;
  const tn = n - sockel;
  return { w: sw, d: sd, eg: t.eg, gh: t.gh, n, sockel, sockelH: sh, H: sh + tn * t.gh, turm: { w: tf.w, d: tf.d, n: tn } };
}
/** Maße der Etage nr (Sockeletage oder Turmetage). */
export function hqEtagenMasse(g, nr) {
  const m = hqMasse(g);
  const k = [...g.etagen].sort((a, b) => a.nr - b.nr).findIndex((e) => e.nr === nr);
  if (m.sockel && k >= m.sockel) return { w: m.turm.w, d: m.turm.d, turm: true };
  return { w: m.w, d: m.d, turm: false };
}

// ====================================================================================
// Fassadenrahmen: lokales System je sichtbarer Seite. lx läuft entlang der Fassade (Mitte 0), lz nach außen.
// ====================================================================================
function fassade(S, scene, x, z, w, d, seite) {
  const pz = seite === '+z';
  const len = pz ? w : d;
  const L = pz ? lokal(S, x + w / 2, 0, z + d, 0) : lokal(S, x + w, 0, z + d / 2, PI / 2);
  L.len = len; L.seite = seite;
  /** Schild (Schriftfläche) mit Mittelpunkt u, y; t = Abstand vor der Fassade (schild() setzt selbst 0,35 m davor). */
  L.schild = (text, u, y, h, farbe, hg = null, t = 0) => {
    const fass = (pz ? z + d : x + w) + t - 0.3;
    const uw = pz ? x + w / 2 + u : z + d / 2 - u;
    return schild(scene, text, seite, uw, y + (S.y0 ?? 0), fass, h, farbe, hg);
  };
  return L;
}
// L.q mittig: L.box erwartet Mittelpunkt in lx/lz, Unterkante ly
function q(L, u0, u1, y0, y1, t0, t1, f) { L.box(Math.abs(u1 - u0), y1 - y0, Math.abs(t1 - t0), (u0 + u1) / 2, y0, (t0 + t1) / 2, f); }

/** Achsen gleichmäßig über [a, b] im Raster (Mittelpunkte). */
function achsen(a, b, raster) {
  const n = Math.max(1, Math.floor((b - a) / raster + 0.001));
  const rand = (b - a - n * raster) / 2;
  return Array.from({ length: n }, (_, i) => a + rand + raster * (i + 0.5));
}

/** Etagenliste mit Höhenlage und Belegung (Sockeletagen 4 m, Turmetagen gh über dem Sockel). */
function etagenInfo(g, m, angebot) {
  const sortiert = [...g.etagen].sort((a, b) => a.nr - b.nr);
  return sortiert.map((e, k) => {
    let y, h;
    if (m.sockel && k >= m.sockel) { y = m.sockelH + (k - m.sockel) * m.gh; h = m.gh; }
    else if (m.sockel) { y = k === 0 ? 0 : m.eg + (k - 1) * 4.0; h = k === 0 ? m.eg : 4.0; }
    else { y = k === 0 ? 0 : m.eg + (k - 1) * m.gh; h = k === 0 ? m.eg : m.gh; }
    return {
      nr: e.nr, qm: e.qm, k, y, h,
      miet: !angebot && !!e.gemietet,
      belegt: !angebot && !!e.gemietet && (e.abteilungen ?? []).length > 0,
    };
  });
}
/** Sammler mit Höhenversatz (Turm auf dem Flachbau). */
function versetzt(S, dy) {
  return {
    y0: dy, get anzahl() { return S.anzahl; },
    box(w, h, d, x, y, z, f, ry = 0) { S.box(w, h, d, x, y + dy, z, f, ry); },
    quader(x0, y0, z0, x1, y1, z1, f) { S.quader(x0, y0 + dy, z0, x1, y1 + dy, z1, f); },
    add(g, f) { g.translate(0, dy, 0); S.add(g, f); },
  };
}
const OHNE = { box() {}, geo() {}, kugel() {}, zyl() {}, len: 1e9 };

const glasVon = (E, r, hell = FARBEN.glas) => (E.miet ? waehle(r, LICHT) : hell);

// ====================================================================================
// Bürogebäude außen
// ====================================================================================
export function hqGebaeude(S, scene, g, opt = {}) {
  const m = hqMasse(g);
  const x = opt.x ?? 0, z = opt.z ?? 0, { w, d } = m;
  const angebot = opt.angebot ?? !('gemietet' in (g.etagen[0] ?? {}));
  const E = etagenInfo(g, m, angebot);
  const seed = opt.seed ?? hashText(g.id);
  const r = rng(seed);
  const bau = { altbau, nachkrieg, buero70, glas, loft, campus }[g.typ] ?? nachkrieg;
  const nMiet = E.filter((e) => e.miet).length;
  const ctxFuer = (S2, x0, z0, w0, d0, m0, E0, turm) => ({
    S: S2, scene, x: x0, z: z0, w: w0, d: d0, m: m0, E: E0, r, v: rng((seed ^ 0x5bd1e995) >>> 0), turm, y0: S2.y0 ?? 0,
    eingangU: Math.round(w0 * 0.14 / 2.5) * 2.5,
    F: [fassade(S2, scene, x0, z0, w0, d0, '+z'), fassade(S2, scene, x0, z0, w0, d0, '+x')],
  });
  let unten, oben, resU, resO, hoehe;
  if (!m.sockel) {
    unten = oben = ctxFuer(S, x, z, w, d, m, E, false);
    unten.Fe = unten.F[0];
    resU = resO = bau(unten);
    hoehe = resU.hoehe;
  } else {
    // Flachbau mit Eingang, darauf das Hochhaus an der hinteren Ecke
    const sE = E.slice(0, m.sockel);
    unten = ctxFuer(S, x, z, w, d, { ...m, H: m.sockelH, n: m.sockel }, sE, false);
    unten.Fe = unten.F[0];
    resU = flachbau(unten, g.typ);
    const S2 = versetzt(S, m.sockelH), T = m.turm;
    const tE = E.slice(m.sockel).map((e) => ({ ...e, k: e.k - m.sockel, y: e.y - m.sockelH }));
    const mt = { w: T.w, d: T.d, eg: m.gh, gh: m.gh, n: T.n, H: T.n * m.gh };
    oben = ctxFuer(S2, x + 2.5, z + 2.5, T.w, T.d, mt, tE, true);
    oben.Fe = OHNE;
    resO = bau(oben);
    hoehe = m.sockelH + resO.hoehe;
  }
  if (nMiet > 0) {
    zentraleEingang(unten, resU.eingang);
    if (nMiet >= Math.ceil(E.length / 2)) zentraleDach(oben, resO);
    for (const [c, res] of oben !== unten ? [[unten, resU], [oben, resO]] : [[unten, resU]])
      for (const e of c.E) if (!e.miet && e.k > 0) etagenBanner(c, e, res);
  } else gebaeudeBanner(oben, resO, E);
  return { hoehe, w, d, x, z };
}

/** Flachbau (Sockel unter einem Hochhaus) im Material des Typs: Bandfenster, Flachdach mit Kies und Pflanzkübeln. */
const SOCKEL_STIL = {
  altbau: { wand: '#e2d5bc', band: '#f0e8d8', glas: FARBEN.glas }, nachkrieg: { wand: '#eeebe3', band: '#8fb1c2', glas: '#6d8796' },
  buero70: { wand: '#b5a184', band: '#a99a80', glas: '#4e4a42' }, glas: { wand: '#eef1f2', band: '#d6dde1', glas: '#6d93a6' },
  loft: { wand: '#a8664f', band: '#d8c8ad', glas: '#5d6f78' }, campus: { wand: '#f4f3ef', band: '#b9895a', glas: '#7fa2b2' },
};
function flachbau(c, typ) {
  const { S, x, z, w, d, m, E, r } = c;
  const st = SOCKEL_STIL[typ] ?? SOCKEL_STIL.nachkrieg, H = m.H;
  S.quader(x, 0, z, x + w, H, z + d, st.wand);
  for (const F of c.F) {
    const L2 = F.len / 2;
    for (const e of E) {
      const y0 = e.y + (e.k === 0 ? 0.2 : 0.9), y1 = e.y + e.h - 0.35;
      q(F, -L2 + 0.6, L2 - 0.6, y0, y1, 0, 0.05, glasVon(e, r, st.glas));
      for (const u of achsen(-L2 + 0.6, L2 - 0.6, e.k === 0 ? 3.0 : 1.8)) q(F, u - 0.05, u + 0.05, y0, y1, 0.05, 0.12, st.band);
      q(F, -L2, L2, e.y + e.h - 0.35, e.y + e.h, 0, 0.25, st.band);
    }
  }
  gesims(S, x, z, w, d, H + 0.35, 0.7, 0.15, st.band);
  S.box(w - 0.8, 0.1, d - 0.8, x + w / 2, H + 0.75, z + d / 2, '#a9a49b');
  for (let u = x + 4; u < x + w - 2; u += 5) { S.box(1.0, 0.55, 1.0, u, H + 1.05, z + d - 1.4, '#8c8378'); S.add(new THREE.IcosahedronGeometry(0.65, 0).translate(u, H + 1.7, z + d - 1.4), FARBEN.baum[1]); }
  S.box(0.08, 1.0, d - 3, x + w - 0.9, H + 1.3, z + d / 2 - 1, '#9fb7c2');
  const Fz = c.F[0], u = c.eingangU;
  q(Fz, u - 4, u + 4, 3.8, 4.1, 0, 3.2, st.band);
  for (const s2 of [-3.6, 3.6]) q(Fz, u + s2 - 0.08, u + s2 + 0.08, 0, 3.8, 2.8, 2.95, '#c9cdd0');
  q(Fz, u - 1.6, u + 1.6, 0.1, 3.0, 0.05, 0.12, '#3d4b55');
  return { hoehe: H + 1, dachY: H + 0.8, vor: 0.3, eingang: { u, y: 4.8, t: 3.3, fahneT: 4.2 } };
}

/** „HARTWIG ZENTRALE“ über dem Eingang (+z-Seite) plus drei Fahnen. */
function zentraleEingang(ctx, ein) {
  const F = ctx.F[0];
  const u = ein.u, y = ein.y, t = ein.t ?? 0.4, sh = 0.85;
  const sb = sh * textMaterial('HARTWIG ZENTRALE', ROT, { groesse: 140 }).seitenverhaeltnis / 2 + 0.2;
  q(F, u - sb, u + sb, y - 0.62, y + 0.62, t - 0.1, t + 0.05, '#ffffff');
  q(F, u - sb, u + sb, y - 0.72, y - 0.62, t - 0.1, t + 0.08, ROT);
  F.schild('HARTWIG ZENTRALE', u, y, sh, ROT, null, t + 0.1);
  // Fahnen links vom Eingang
  for (let k = 0; k < 3; k++) {
    const fu = u - 6.5 - k * 1.8;
    if (fu < -F.len / 2 + 1) break;
    F.box(0.12, 7.5, 0.12, fu, 0, ein.fahneT ?? 2.6, '#c9cdd0');
    F.box(1.1, 2.2, 0.04, fu + 0.6, 5.1, ein.fahneT ?? 2.6, k === 1 ? '#ffffff' : ROT);
  }
}

/** Dachschild „HARTWIG“ auf Gestell an der Vorderkante (+z) und Logo-Würfel an der +x-Seite. */
function zentraleDach(ctx, res) {
  const { S, scene, x, z, w, d } = ctx;
  const y = res.dachY, y0 = ctx.y0 ?? 0, hoehe = Math.min(3.2, Math.max(1.8, w / 14));
  const { seitenverhaeltnis } = textMaterial('HARTWIG', '#ffffff', { groesse: 140 });
  const bw = hoehe * seitenverhaeltnis * 0.92;
  const uz = res.dachSchildU ?? 0, zz = z + d - (res.dachEinzug ?? 1.5);
  const cx = x + w / 2 + uz;
  for (const s of [-0.38, 0, 0.38]) S.box(0.15, 1.4, 0.15, cx + s * bw, y + 0.7, zz - 0.5, '#7c848c');
  S.box(bw, 0.12, 0.6, cx, y + 1.4, zz - 0.5, '#7c848c');
  S.box(bw + 0.4, hoehe + 0.3, 0.25, cx, y + 1.5 + hoehe / 2, zz - 0.2, ROT);
  schild(scene, 'HARTWIG', '+z', cx, y0 + y + 1.5 + hoehe / 2, zz - 0.3, hoehe, '#ffffff');
}

/** Banner „Zu vermieten“ vor einer freien Etage (beide sichtbaren Seiten). */
function etagenBanner(ctx, e, res) {
  for (const F of ctx.F) {
    if (F.len < 12) continue;
    const t = (F.seite === '+x' ? res.vorX ?? res.vor ?? 0.3 : res.vor ?? 0.3) + 0.12;
    const bw = Math.min(F.len * 0.55, 16), bh = Math.min(e.h * 0.66, 2.6);
    const u = F.seite === '+z' ? -F.len * 0.12 : F.len * 0.05;
    const y = e.y + e.h * 0.5;
    q(F, u - bw / 2, u + bw / 2, y - bh / 2, y + bh / 2, t, t + 0.08, ROT);
    q(F, u - bw / 2 + 0.2, u + bw / 2 - 0.2, y - bh / 2 + 0.18, y - bh / 2 + 0.26, t + 0.08, t + 0.1, '#ffffff');
    F.schild('ZU VERMIETEN', u, y + bh * 0.12, bh * 0.5, '#ffffff', null, t + 0.12);
    F.schild(`${zahl(e.qm)} m²`, u, y - bh * 0.27, bh * 0.25, '#ffffff', null, t + 0.12);
  }
}

/** Großes Banner für ein ganz freies Gebäude (Angebot) über zwei Etagen auf beiden Seiten. */
function gebaeudeBanner(ctx, res, alle = ctx.E) {
  const { E, m } = ctx;
  const qm = alle.reduce((a, e) => a + e.qm, 0);
  const oben = E[E.length - 1], unten = E[Math.max(1, E.length - 3)] ?? oben;
  const y0 = Math.max(m.eg + 0.4, unten.y + 0.3), y1 = oben.y + oben.h - 0.4;
  for (const F of ctx.F) {
    const t = (F.seite === '+x' ? res.vorX ?? res.vor ?? 0.3 : res.vor ?? 0.3) + 0.15;
    const bw = Math.min(F.len * 0.86, 30), bh = Math.min(y1 - y0 + 1.2, 9);
    const u = F.seite === '+z' ? -F.len * 0.04 : 0;
    const yc = (y0 + y1) / 2;
    q(F, u - bw / 2 - 0.35, u + bw / 2 + 0.35, yc - bh / 2 - 0.35, yc + bh / 2 + 0.35, t, t + 0.08, '#ffffff');
    q(F, u - bw / 2, u + bw / 2, yc - bh / 2, yc + bh / 2, t + 0.08, t + 0.16, ROT);
    for (const s2 of [-1, 1]) F.box(0.12, bh + 1.4, 0.12, u + s2 * (bw / 2 + 0.35), yc - bh / 2 - 0.7, t + 0.05, '#3a4048');
    q(F, u - bw / 2 + 0.4, u + bw / 2 - 0.4, yc - bh * 0.1, yc - bh * 0.1 + 0.14, t + 0.16, t + 0.18, '#ffffff');
    F.schild('ZU VERMIETEN', u, yc + bh * 0.2, bh * 0.36, '#ffffff', null, t + 0.2);
    F.schild(`${alle.length} Etagen · ${zahl(qm)} m²`, u, yc - bh * 0.3, bh * 0.2, '#ffffff', null, t + 0.2);
  }
}

// ------------------------------------------------------------------ 1. Altbau: Kontorhaus um 1905
function altbau(c) {
  const { S, x, z, w, d, m, E, r, v } = c;
  // Varianten: Material, Fensterraster, Dachform, Eckturm, Erker, Pilaster, Rustika
  const stein = waehle(v, ['#e6d9c0', '#dccdb2', '#e8d49e', '#b9785e', '#d3d0c8', '#e3c9b0']), hell = stein === '#b9785e' ? '#e8dcc8' : heller(stein, 0.05), tief = dunkler(stein, 0.1);
  const raster = waehle(v, [3.0, 3.3, 3.6]), dachArt = waehle(v, ['mansarde', 'mansarde', 'walm', 'attika']), eckArt = waehle(v, ['kuppel', 'spitz', 'keiner']);
  const mitErker = v() < 0.6, mitPilaster = v() < 0.65, mitRustika = v() < 0.7, dachF = waehle(v, ['#6c747c', '#5f666d', '#a24e38', '#7c848c']);
  const H = m.H;
  S.quader(x, 0, z, x + w, H, z + d, stein);
  gesims(S, x, z, w, d, m.eg, 0.45, 0.25, hell);
  S.box(w + 0.8, 0.5, d + 0.8, x + w / 2, H - 0.25, z + d / 2, hell);
  S.box(w + 0.5, 0.35, d + 0.5, x + w / 2, H - 0.9, z + d / 2, hell);
  for (const F of c.F) {
    const L2 = F.len / 2;
    // Rustika im EG
    if (mitRustika) for (let y = 0.6; y < m.eg - 0.4; y += 0.65) q(F, -L2, L2, y, y + 0.06, 0, 0.05, tief);
    q(F, -L2, L2, 0, 0.5, 0, 0.12, dunkler(stein, 0.16));
    const ax = achsen(-L2 + 1.2, L2 - 1.2, raster);
    const E0 = E[0];
    // EG: hohe Rundbogenfenster (Bogen als Schlussstein und Laibung)
    ax.forEach((u, i) => {
      if (F.seite === '+z' && Math.abs(u - c.eingangU) < 2.4) return;
      q(F, u - 0.95, u + 0.95, 0.9, m.eg - 1.0, 0.0, 0.08, glasVon(E0, r));
      q(F, u - 1.15, u + 1.15, m.eg - 1.05, m.eg - 0.75, 0, 0.14, hell);
      q(F, u - 0.25, u + 0.25, m.eg - 1.1, m.eg - 0.55, 0, 0.2, hell);
      q(F, u - 0.03, u + 0.03, 0.9, m.eg - 1.0, 0.08, 0.12, '#3b4046');
    });
    // Obergeschosse
    for (const e of E.slice(1)) {
      const fh = e.h * 0.58, y0 = e.y + e.h * 0.24;
      ax.forEach((u, i) => {
        q(F, u - 0.72, u + 0.72, y0, y0 + fh, 0, 0.08, glasVon(e, r));
        q(F, u - 0.9, u + 0.9, y0 - 0.18, y0, 0, 0.22, hell);
        q(F, u - 0.85, u + 0.85, y0 + fh, y0 + fh + 0.22, 0, 0.18, hell);
        if (e.k === 1) q(F, u - 1.0, u + 1.0, y0 + fh + 0.22, y0 + fh + 0.4, 0, 0.26, hell);
        q(F, u - 0.03, u + 0.03, y0, y0 + fh, 0.08, 0.11, '#f3efe6');
      });
      if (e.k < E.length - 1) q(F, -L2, L2, e.y + e.h - 0.1, e.y + e.h + 0.1, 0, 0.12, hell);
    }
    // Pilaster jede zweite Achse über die Obergeschosse
    for (let i = 0; mitPilaster && i <= ax.length; i += 2) {
      const u = i === 0 ? ax[0] - 1.65 : i >= ax.length ? ax[ax.length - 1] + 1.65 : (ax[i - 1] + ax[i]) / 2;
      q(F, u - 0.35, u + 0.35, m.eg, H - 1.1, 0, 0.28, hell);
    }
  }
  // Erker an der +x-Seite
  const Fx = c.F[1];
  if (mitErker && E.length >= 4 && Fx.len >= 14) {
    const y0 = E[1].y, y1 = E[E.length - 1].y;
    q(Fx, -2.4, 2.4, y0 - 0.4, y1, 0, 1.1, stein);
    q(Fx, -2.5, 2.5, y0 - 0.6, y0 - 0.4, 0, 1.2, hell);
    q(Fx, -2.6, 2.6, y1, y1 + 0.3, 0, 1.3, hell);
    for (const e of E.slice(1, -1)) { q(Fx, -1.6, 1.6, e.y + 0.8, e.y + e.h - 0.7, 1.1, 1.16, glasVon(e, r)); q(Fx, -0.03, 0.03, e.y + 0.8, e.y + e.h - 0.7, 1.16, 1.2, '#f3efe6'); }
  }
  // Portal (+z)
  const Fz = c.F[0], u = c.eingangU;
  q(c.Fe, u - 2.0, u + 2.0, 0, 3.6, 0, 0.1, '#3d3a36');
  q(c.Fe, u - 1.6, u + 1.6, 0.05, 3.3, 0.1, 0.16, '#5a4636');
  q(c.Fe, u - 0.03, u + 0.03, 0.05, 3.3, 0.16, 0.2, '#3d3a36');
  for (const s of [-1, 1]) { q(c.Fe, u + s * 2.3 - 0.35, u + s * 2.3 + 0.35, 0, 4.2, 0, 0.55, hell); q(c.Fe, u + s * 2.3 - 0.45, u + s * 2.3 + 0.45, 4.2, 4.5, 0, 0.62, hell); }
  q(c.Fe, u - 2.8, u + 2.8, 4.5, 4.9, 0, 0.7, hell);
  // Dach: Mansarde mit Gauben, Walmdach oder Attika mit Balustrade; Eckturm mit Kuppel oder Spitzhelm
  const dachH = dachArt === 'attika' ? 1.2 : dachArt === 'walm' ? 5.5 : 4.2;
  if (dachArt === 'mansarde') {
    const dg = dachProfil(w, d, dachH, d * 0.42, 'x'); dg.translate(x + w / 2, H, z + d / 2); S.add(dg, dachF);
    S.box(w - d * 0.58 + 0.2, 0.2, d * 0.42 + 0.2, x + w / 2, H + dachH + 0.1, z + d / 2, dunkler(dachF, 0.05));
  } else if (dachArt === 'walm') {
    const dg = dachProfil(w - d * 0.5, d, dachH, 0.4, 'x'); dg.translate(x + w / 2, H, z + d / 2); S.add(dg, dachF);
    for (const sx of [0, 1]) { const wg = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); wg.rotateY(PI / 4); wg.scale(d * 0.5, dachH, d); wg.translate(sx ? x + w - d * 0.25 - 0.01 : x + d * 0.25, H + dachH / 2, z + d / 2); S.add(wg, dachF); }
  } else {
    S.box(w - 0.6, 0.12, d - 0.6, x + w / 2, H + 0.06, z + d / 2, '#9a978f');
    for (const F of c.F) { q(F, -F.len / 2, F.len / 2, H, H + 0.15, -0.1, 0.25, hell); for (let u = -F.len / 2 + 0.4; u < F.len / 2; u += 0.5) q(F, u - 0.08, u + 0.08, H + 0.15, H + 0.85, 0, 0.12, hell); q(F, -F.len / 2, F.len / 2, H + 0.85, H + 1.05, -0.05, 0.2, hell); }
  }
  if (dachArt !== 'attika') for (const F of c.F) {
    for (const uu of achsen(-F.len / 2 + 2.5, F.len / 2 - 2.5, raster * 2)) {
      F.box(1.3, 1.6, 1.4, uu, H + 0.6, dachArt === 'walm' ? -2.4 : -1.6, stein);
      F.box(0.8, 1.0, 0.06, uu, H + 0.85, dachArt === 'walm' ? -1.68 : -0.88, glasVon(E[E.length - 1], r));
      const gb = dachProfil(1.6, 1.7, 0.7, 0.05, 'z'); F.geo(gb, uu, H + 2.2, dachArt === 'walm' ? -2.4 : -1.6, dunkler(dachF, 0.05));
    }
  }
  const ex = x + w - 2.6, ez = z + d - 2.6;
  if (eckArt !== 'keiner') {
    S.box(5.2, 3.0, 5.2, ex, H + 1.5, ez, stein);
    S.box(5.6, 0.35, 5.6, ex, H + 3.1, ez, hell);
    if (eckArt === 'kuppel') S.add(new THREE.SphereGeometry(2.5, 12, 6, 0, PI * 2, 0, PI / 2).scale(1, 1.2, 1).translate(ex, H + 3.25, ez), FARBEN.kupfer[0]);
    else { const hg = new THREE.ConeGeometry(2.9, 6.5, 4, 1); hg.rotateY(PI / 4); hg.translate(ex, H + 3.25 + 3.25, ez); S.add(hg, dachF === '#a24e38' ? FARBEN.kupfer[1] : '#5f666d'); }
    S.add(new THREE.CylinderGeometry(0.08, 0.15, 1.6, 6).translate(ex, H + (eckArt === 'kuppel' ? 6.5 : 10.2), ez), '#c9b16a');
  }
  for (let k = 0; dachArt !== 'attika' && k < 3; k++) S.box(0.8, 2.2, 0.8, x + 4 + k * (w - 8) / 2, H + 2.2, z + 3, dunkler(stein, 0.25));
  return { hoehe: H + (eckArt === 'spitz' ? 11 : 7.3), dachY: H + dachH + 0.2, dachEinzug: dachArt === 'attika' ? 1.5 : dachArt === 'walm' ? d * 0.45 : d * 0.29 + 0.5, vor: 0.3, vorX: 1.35, eingang: { u, y: 5.6, t: 0.75, fahneT: 2.4 } };
}

// ------------------------------------------------------------------ 2. Nachkrieg: Verwaltungsscheibe der 1960er
function nachkrieg(c) {
  const { S, x, z, w, d, m, E, r } = c;
  const v = c.v;
  // Varianten: Brüstungsfarbe, Fensterraster, EG auf Stützen oder geschlossen, Stirnseite, Dachaufbau
  const weiss = waehle(v, ['#eeebe3', '#ebe8e1', '#e6e0d2', '#dfe2e3']), paneel = waehle(v, ['#8fb1c2', '#94b4a6', '#a7b8c4', '#c9a36b', '#b5675a', '#d9c36a']), alu = '#c9cfd3';
  const H = m.H, sprosse = waehle(v, [1.25, 1.25, 2.5]), stelzen = v() < 0.6, stirn = waehle(v, ['glasstein', 'mosaik', 'fenster']), flugdach = v() < 0.65;
  // EG zurückgesetzt hinter Stützen (oder bündig verglast)
  const ein = stelzen ? 1.8 : 0.2;
  S.quader(x, 0, z, x + w - ein, m.eg, z + d - ein, '#5f6d78');
  for (const F of c.F) {
    const L2 = F.len / 2;
    // Glas im zurückgesetzten EG
    const t0 = -ein;
    q(F, -L2, L2 - ein, 0.15, m.eg - 0.4, t0, t0 + 0.08, glasVon(E[0], r, '#6f8a99'));
    for (const u of achsen(-L2, L2 - ein, 2.5)) q(F, u - 0.04, u + 0.04, 0.15, m.eg - 0.4, t0 + 0.08, t0 + 0.14, alu);
    // Stützen in der Flucht
    if (stelzen) for (const u of achsen(-L2, L2, 5)) q(F, u - 0.3, u + 0.3, 0, m.eg, -0.6, 0, '#e2ded5');
    else q(F, -L2, L2, m.eg - 0.6, m.eg, 0, 0.3, paneel);
  }
  S.quader(x, m.eg, z, x + w, H, z + d, weiss);
  S.box(w + 0.3, 0.4, d + 0.3, x + w / 2, m.eg + 0.2, z + d / 2, '#f6f4ef');
  // Rasterfassade +z: Brüstungsbänder, Fensterbänder, Alusprossen
  const Fz = c.F[0], L2 = Fz.len / 2;
  for (const e of E.slice(1)) {
    q(Fz, -L2 + 0.9, L2 - 0.9, e.y + 0.15, e.y + 1.1, 0, 0.05, paneel);
    q(Fz, -L2 + 0.9, L2 - 0.9, e.y + 1.1, e.y + e.h - 0.2, 0, 0.04, glasVon(e, r, '#6d8796'));
    for (const u of achsen(-L2 + 0.9, L2 - 0.9, sprosse)) q(Fz, u - 0.05, u + 0.05, e.y + 0.15, e.y + e.h - 0.2, 0.04, 0.14, alu);
    q(Fz, -L2, L2, e.y + e.h - 0.2, e.y + e.h + 0.05, 0, 0.16, '#f6f4ef');
  }
  q(Fz, -L2, -L2 + 0.9, m.eg, H, 0, 0.3, '#f6f4ef');
  q(Fz, L2 - 0.9, L2, m.eg, H, 0, 0.3, '#f6f4ef');
  // Stirnseite +x: geschlossene Giebelwand mit Glasbaustein-Streifen (Treppenhaus) und kleinen Fenstern
  const Fx = c.F[1], K2 = Fx.len / 2;
  q(Fx, -K2, K2, m.eg, H, 0, 0.06, heller(weiss, 0.02));
  if (stirn === 'glasstein') for (let y = m.eg + 0.6; y < H - 0.6; y += 0.5) for (let u = -1.2; u < 1.21; u += 0.6) q(Fx, u - 0.24, u + 0.24, y, y + 0.44, 0.06, 0.1, '#b9d2dc');
  if (stirn === 'mosaik') for (let y = m.eg + 0.5; y < H - 1; y += 1.2) for (let u = -K2 + 4.2; u < K2 - 4; u += 1.2) q(Fx, u - 0.55, u + 0.55, y, y + 1.1, 0.06, 0.1, waehle(v, ['#2f6f8f', '#d9c36a', '#b5675a', '#eeebe3', '#3f7d56']));
  if (stirn === 'fenster') for (const e of E.slice(1)) for (const u of achsen(-K2 + 4, K2 - 4, 2.5)) q(Fx, u - 0.8, u + 0.8, e.y + 1.0, e.y + e.h - 0.6, 0.06, 0.12, glasVon(e, r, '#6d8796'));
  for (const e of E.slice(1)) for (const u of [-K2 + 2.4, K2 - 2.4]) q(Fx, u - 0.8, u + 0.8, e.y + 1.0, e.y + e.h - 0.6, 0.06, 0.12, glasVon(e, r, '#6d8796'));
  // Dach: Attika, Technikaufbau mit Flugdach, Antenne
  gesims(S, x, z, w, d, H, 0.5, 0.2, '#f6f4ef');
  S.box(w - 0.6, 0.12, d - 0.6, x + w / 2, H + 0.3, z + d / 2, '#9a978f');
  const px0 = x + w * (flugdach ? 0.2 : 0.5), px1 = x + w * (flugdach ? 0.62 : 0.7);
  S.quader(px0, H, z + 2.5, px1, H + 3.0, z + d - 4.5, '#dcd8cf');
  for (const u of achsen(px0, px1, 2.5)) S.box(1.6, 1.2, 0.06, u, H + 1.6, z + d - 4.47, '#6d8796');
  if (flugdach) S.box(px1 - px0 + 2.4, 0.3, d - 5, (px0 + px1) / 2, H + 3.15, z + (d - 2) / 2, '#f6f4ef');
  else for (let k = 0; k < 4; k++) S.box(1.6, 1.0, 1.6, x + w * 0.12 + k * 2.4, H + 0.8, z + d * 0.4, '#c3c0b9');
  S.box(0.1, 5, 0.1, x + w * 0.75, H + 2.5, z + 4, '#7c848c');
  // Vordach am Eingang
  const u = c.eingangU;
  q(c.Fe, u - 3.5, u + 3.5, 3.6, 3.85, -ein, 2.8, '#f6f4ef');
  for (const s of [-3.1, 3.1]) q(c.Fe, u + s - 0.07, u + s + 0.07, 0, 3.6, 2.4, 2.55, alu);
  q(c.Fe, u - 1.6, u + 1.6, 0.1, 2.8, -ein + 0.08, -ein + 0.14, '#3d4b55');
  return { hoehe: H + 5, dachY: H + 0.4, dachEinzug: 2.2, vor: 0.3, eingang: { u, y: 4.5, t: 2.9, fahneT: 3.4 } };
}

// ------------------------------------------------------------------ 3. Büro 70er: Waschbeton mit Brüstungsbändern
function buero70(c) {
  const { S, x, z, w, d, m, E, r } = c;
  const v = c.v;
  // Varianten: Betonfarbe, Glas, Markisenfarbe, Treppentürme (zwei, einer, keiner), Staffelgeschoss, Raster
  const beton = waehle(v, ['#b5a184', '#ab9a80', '#c9c3b5', '#9d8c75', '#c4b49a']), dunkelB = dunkler(beton, 0.12), bronze = waehle(v, ['#4e4a42', '#3f5048', '#4a4f57']), rahmen = waehle(v, ['#5a4130', '#2f3438', '#6b6f72']);
  const H = m.H, markF = waehle(v, ['#e07a2a', '#3f7d56', '#8c3b3b', '#d39a2b']), tuerme = waehle(v, [2, 1, 0]), ras70 = waehle(v, [1.8, 2.4]);
  const staffel = E.length >= 4 && v() < 0.75;   // oberstes Geschoss zurückgesetzt
  const yTop = staffel ? E[E.length - 1].y : H;
  S.quader(x, 0, z, x + w, yTop, z + d, dunkelB);
  for (const F of c.F) {
    const L2 = F.len / 2;
    // EG: dunkles Glas zwischen Betonstützen
    q(F, -L2, L2, 0.1, m.eg - 0.5, 0, 0.06, glasVon(E[0], r, bronze));
    for (const u of achsen(-L2, L2, 3.6)) q(F, u - 0.35, u + 0.35, 0, m.eg - 0.5, 0, 0.35, beton);
    // Obergeschosse: auskragende Brüstungsbänder, Fensterband mit Rahmen, Markisen
    for (const e of E.slice(1)) {
      if (staffel && e.k === E.length - 1) continue;
      q(F, -L2 - 0.6, L2 + (F.seite === '+z' ? 0.6 : 0), e.y - 0.5, e.y + 1.1, 0, 0.65, beton);
      q(F, -L2 - 0.6, L2 + (F.seite === '+z' ? 0.6 : 0), e.y + 1.1, e.y + 1.18, 0, 0.7, heller(beton, 0.06));
      q(F, -L2, L2, e.y + 1.1, e.y + e.h - 0.5, 0, 0.06, glasVon(e, r, bronze));
      for (const u of achsen(-L2, L2, ras70)) q(F, u - 0.06, u + 0.06, e.y + 1.1, e.y + e.h - 0.5, 0.06, 0.14, rahmen);
      if (e.miet) for (const u of achsen(-L2, L2, ras70)) if (r() < 0.35) { const g = new THREE.BoxGeometry(ras70 - 0.2, 0.06, 1.1); g.rotateX(0.5); F.geo(g, u, e.y + e.h - 0.75, 0.6, markF); }
    }
    q(F, -L2 - 0.6, L2 + (F.seite === '+z' ? 0.6 : 0), m.eg - 0.5, m.eg + 0.4, 0, 0.65, beton);
  }
  // Treppentürme an beiden Enden der +z-Seite (vorspringend, über das Dach)
  const Fz = c.F[0], L2 = Fz.len / 2;
  for (const s of [-1, 1].slice(0, tuerme)) {
    const u = s * (L2 - 3.2);
    q(Fz, u - 2.2, u + 2.2, 0, H + 2.2, 0, 1.6, beton);
    for (let y = m.eg; y < H; y += m.gh) q(Fz, u - 0.25, u + 0.25, y + 0.6, y + m.gh - 0.4, 1.6, 1.66, bronze);
    q(Fz, u - 2.3, u + 2.3, H + 2.2, H + 2.5, 0, 1.7, dunkelB);
  }
  // Staffelgeschoss mit Pergola
  if (staffel) {
    const e = E[E.length - 1];
    S.quader(x, e.y, z, x + w - 2.6, H, z + d - 2.6, beton);
    const Fs = [fassade(S, c.scene, x, z, w - 2.6, d - 2.6, '+z'), fassade(S, c.scene, x, z, w - 2.6, d - 2.6, '+x')];
    for (const F of Fs) { q(F, -F.len / 2, F.len / 2, e.y + 0.4, e.y + e.h - 0.5, 0, 0.06, glasVon(e, r, bronze)); for (const u of achsen(-F.len / 2, F.len / 2, 1.8)) q(F, u - 0.06, u + 0.06, e.y + 0.4, e.y + e.h - 0.5, 0.06, 0.14, rahmen); }
    S.box(w - 1.5, 0.12, d - 1.5, x + (w - 1.5) / 2, e.y + 0.06, z + (d - 1.5) / 2, '#9c8f7c');
    for (let u = x + 4; u < x + w - 4; u += 3) S.box(0.15, 0.15, 2.4, u, H - 0.2, z + d - 1.4, rahmen);
    for (let u = z + 4; u < z + d - 4; u += 3) S.box(2.4, 0.15, 0.15, x + w - 1.4, H - 0.2, u, rahmen);
    for (let k = 0; k < 4; k++) { S.box(0.9, 0.6, 0.9, x + 6 + k * (w - 12) / 3, e.y + 0.35, z + d - 1.6, '#8c7b66'); S.add(new THREE.IcosahedronGeometry(0.6, 0).translate(x + 6 + k * (w - 12) / 3, e.y + 1.0, z + d - 1.6), FARBEN.baum[1]); }
  }
  gesims(S, x, z, w - (staffel ? 2.6 : 0), d - (staffel ? 2.6 : 0), H, 0.6, 0.3, beton);
  S.box(6, 2.2, 5, x + w * 0.35, H + 1.1, z + d * 0.4, '#c3bcb0');
  S.box(3, 1.4, 3, x + w * 0.6, H + 0.7, z + d * 0.35, '#c3bcb0');
  const u = c.eingangU;
  q(c.Fe, u - 4, u + 4, 3.6, 4.4, -0.2, 3.2, beton);
  q(c.Fe, u - 1.8, u + 1.8, 0.1, 3.0, 0.06, 0.12, '#2f2b26');
  return { hoehe: H + 2.6, dachY: H + 0.3, dachEinzug: (staffel ? 2.6 : 0) + 1.5, vor: 0.75, eingang: { u, y: 5.0, t: 3.3, fahneT: 4.2 } };
}

// ------------------------------------------------------------------ 4. Glas: Büroturm mit Vorhangfassade
function glas(c) {
  const { S, x, z, w, d, m, E, r } = c;
  const v = c.v;
  // Varianten: Glasfarbe, Pfostenraster und -farbe, Eckschwert oder senkrechte Lisenen, Krone (Lamellen, Staffel, flach)
  const scheibe = waehle(v, ['#6d93a6', '#5f8a7e', '#8a9096', '#7a6f5f', '#4f6f8f']), pfosten = waehle(v, ['#d6dde1', '#d6dde1', '#3a4048']), platte = '#eef1f2';
  const H = m.H, gr = waehle(v, [1.2, 1.5, 2.0]), schwert = v() < 0.5, krone = waehle(v, ['lamellen', 'staffel', 'flach']);
  S.quader(x + 0.3, 0, z + 0.3, x + w - 0.3, H, z + d - 0.3, '#5f7c8b');
  for (const F of c.F) {
    const L2 = F.len / 2;
    // Lobby über das EG: hohe Scheiben mit Glasschwertern
    q(F, -L2, L2, 0.1, m.eg - 0.3, -0.3, -0.24, glasVon(E[0], r, '#86a9b8'));
    for (const u of achsen(-L2, L2, 2.4)) q(F, u - 0.04, u + 0.04, 0.1, m.eg - 0.3, -0.24, 0.12, pfosten);
    for (const e of E.slice(1)) {
      q(F, -L2, L2, e.y, e.y + 0.35, -0.3, 0.05, platte);
      q(F, -L2 + 0.2, L2 - 0.2, e.y + 0.35, e.y + e.h, -0.3, 0.0, glasVon(e, r, scheibe));
      if (e.miet) q(F, -L2 + 0.4, L2 - 0.4, e.y + e.h - 0.45, e.y + e.h - 0.35, 0.0, 0.02, '#fff6d8');
      for (const u of achsen(-L2, L2, gr)) q(F, u - 0.035, u + 0.035, e.y + 0.35, e.y + e.h, 0, 0.1, pfosten);
      if (!schwert) for (const u of achsen(-L2, L2, 6)) q(F, u - 0.25, u + 0.25, e.y, e.y + e.h, 0, 0.5, platte);
    }
  }
  // senkrechtes Schwert an der Ecke und Krone
  if (schwert) { S.box(0.6, H + 4.5, 2.4, x + w + 0.3, (H + 4.5) / 2, z + d - 1.2, platte); S.box(2.4, H + 4.5, 0.6, x + w - 1.2, (H + 4.5) / 2, z + d + 0.3, platte); }
  if (krone === 'lamellen') {
    for (const F of c.F) for (let u = -F.len / 2 + 0.6; u < F.len / 2 - 2.4; u += 0.7) q(F, u - 0.06, u + 0.06, H, H + 3.6, -0.3, 0.05, '#c9d1d6');
    S.quader(x + 0.5, H, z + 0.5, x + w - 0.5, H + 3.5, z + d - 0.5, '#9fa9b0');
    S.box(w + 0.2, 0.35, d + 0.2, x + w / 2, H + 3.6, z + d / 2, platte);
  } else if (krone === 'staffel') {
    const e1 = 3.5, e2 = 7;
    S.quader(x + e1, H, z + e1, x + w - e1, H + m.gh, z + d - e1, glasVon({ miet: E[E.length - 1].miet }, r, scheibe));
    S.box(w - 2 * e1 + 0.4, 0.35, d - 2 * e1 + 0.4, x + w / 2, H + m.gh, z + d / 2, platte);
    S.quader(x + e2, H + m.gh, z + e2, x + w - e2, H + 2 * m.gh - 0.4, z + d - e2, glasVon({ miet: E[E.length - 1].miet }, r, scheibe));
    S.box(w - 2 * e2 + 0.4, 0.35, d - 2 * e2 + 0.4, x + w / 2, H + 2 * m.gh - 0.4, z + d / 2, platte);
    S.box(w + 0.2, 0.3, d + 0.2, x + w / 2, H + 0.1, z + d / 2, platte);
  } else {
    S.box(w + 0.6, 0.6, d + 0.6, x + w / 2, H + 0.3, z + d / 2, platte);
    S.box(w * 0.3, 2.4, d * 0.3, x + w * 0.35, H + 1.8, z + d * 0.35, '#b9c1c6');
  }
  if (krone === 'lamellen') S.box(w * 0.4, 1.8, d * 0.35, x + w * 0.4, H + 4.6, z + d * 0.4, '#b9c1c6');
  // Vordach
  const Fz = c.F[0], u = c.eingangU;
  q(c.Fe, u - 4.5, u + 4.5, 4.4, 4.7, -0.3, 3.4, platte);
  q(c.Fe, u - 1.4, u + 1.4, 0.1, 3.0, -0.24, -0.16, '#3d4b55');
  if (!c.turm) S.add(new THREE.CylinderGeometry(1.3, 1.3, 2.8, 12).translate(x + w / 2 + u, 1.5, z + d - 0.1), '#9fbccb');
  return { hoehe: H + (krone === 'staffel' ? 2 * m.gh : 5.5), dachY: krone === 'staffel' ? H + 2 * m.gh - 0.2 : krone === 'flach' ? H + 0.6 : H + 3.8, dachEinzug: krone === 'staffel' ? 7.5 : 1.4, vor: 0.15, eingang: { u, y: 5.4, t: 3.5, fahneT: 4.6 } };
}

// ------------------------------------------------------------------ 5. Loft: umgenutzte Backsteinfabrik
function loft(c) {
  const { S, x, z, w, d, m, E, r } = c;
  const v = c.v;
  // Varianten: Klinkerfarbe, Achsabstand, Dach (Shed oder flach mit Wasserturm), Schornstein, Fensterfarbe
  const stein = waehle(v, ['#a8664f', '#9e5c47', '#c9a46b', '#7d4a3a', '#b9785e']), lisene = dunkler(stein, 0.06), band = stein === '#c9a46b' ? '#8a6440' : '#d8c8ad', stahl = waehle(v, ['#2f3438', '#2f4a3e', '#5a2f2f']);
  const H = m.H, achsLoft = waehle(v, [4.5, 3.6, 5.4]), shed = v() < 0.6, schlot = v() < 0.7;
  S.quader(x, 0, z, x + w, H, z + d, stein);
  for (const F of c.F) {
    const L2 = F.len / 2;
    q(F, -L2, L2, 0, 0.7, 0, 0.12, '#6f6a64');
    const ax = achsen(-L2 + 0.4, L2 - 0.4, achsLoft);
    for (const e of E) {
      ax.forEach((u, i) => {
        if (e.k === 0 && F.seite === '+z' && Math.abs(u - c.eingangU) < 3) return;
        const y0 = e.y + (e.k === 0 ? 0.9 : 0.7), y1 = e.y + e.h - 0.9, fw = achsLoft - 1.4;
        q(F, u - fw / 2, u + fw / 2, y0, y1, 0, 0.06, glasVon(e, r, '#5d6f78'));
        for (let k = 1; k < 4; k++) q(F, u - fw / 2 + (k * fw) / 4 - 0.04, u - fw / 2 + (k * fw) / 4 + 0.04, y0, y1, 0.06, 0.1, stahl);
        for (const yy of [y0 + (y1 - y0) * 0.4, y0 + (y1 - y0) * 0.75]) q(F, u - fw / 2, u + fw / 2, yy - 0.04, yy + 0.04, 0.06, 0.1, stahl);
        // Stichbogen-Sturz aus hellem Stein, Sohlbank
        q(F, u - fw / 2 - 0.25, u + fw / 2 + 0.25, y1, y1 + 0.4, 0, 0.12, band);
        q(F, u - 0.25, u + 0.25, y1 + 0.05, y1 + 0.55, 0, 0.16, band);
        q(F, u - fw / 2 - 0.1, u + fw / 2 + 0.1, y0 - 0.16, y0, 0, 0.18, band);
      });
      if (e.k > 0) q(F, -L2, L2, e.y - 0.12, e.y + 0.12, 0, 0.1, band);
    }
    // Lisenen zwischen den Achsen
    for (let i = 0; i <= ax.length; i++) {
      const u = i === 0 ? ax[0] - achsLoft / 2 : i === ax.length ? ax[i - 1] + achsLoft / 2 : (ax[i - 1] + ax[i]) / 2;
      q(F, u - 0.4, u + 0.4, 0.7, H - 0.4, 0, 0.32, lisene);
    }
    // Zahnfries unter der Traufe
    for (let u = -L2 + 0.3; u < L2 - 0.2; u += 0.6) q(F, u - 0.15, u + 0.15, H - 1.0, H - 0.75, 0, 0.22, lisene);
    q(F, -L2, L2, H - 0.75, H - 0.55, 0, 0.3, band);
  }
  gesims(S, x, z, w, d, H, 0.5, 0.35, lisene);
  // Sheddach (Zähne entlang x, Glasflanke nach +x) oder Flachdach mit Wasserturm
  if (shed) {
    const n = Math.max(2, Math.round(w / 7)), zb = w / n;
    for (let k = 0; k < n; k++) {
      const s2 = new THREE.Shape(); s2.moveTo(0, 0); s2.lineTo(zb - 0.6, 0); s2.lineTo(zb - 0.6, 2.6); s2.closePath();
      const g = new THREE.ExtrudeGeometry(s2, { depth: d - 2, bevelEnabled: false }); g.translate(x + k * zb + 0.3, H + 0.25, z + 1);
      S.add(g, '#6b6f72');
      S.box(0.08, 2.3, d - 2.2, x + (k + 1) * zb - 0.27, H + 1.4, z + d / 2, '#9fc0cc');
    }
  } else {
    S.box(w - 0.8, 0.12, d - 0.8, x + w / 2, H + 0.3, z + d / 2, '#8c8984');
    const tx = x + w * 0.7, tz = z + d * 0.45;
    for (const a of [-1, 1]) for (const b of [-1, 1]) S.box(0.25, 5, 0.25, tx + a * 1.6, H + 2.8, tz + b * 1.6, stahl);
    S.add(new THREE.CylinderGeometry(2.2, 2.2, 3.2, 12).translate(tx, H + 6.9, tz), '#8a6a4a');
    S.add(new THREE.ConeGeometry(2.4, 1.4, 12).translate(tx, H + 9.2, tz), '#5f666d');
    for (let k = 0; k < 4; k++) S.box(2.0, 0.8, 1.2, x + 4 + k * 3, H + 0.75, z + d - 3, '#9fc0cc');
  }
  // Schornstein an der hinteren Ecke
  if (schlot) {
    S.add(new THREE.CylinderGeometry(0.9, 1.3, H + 15, 10).translate(x + 3, (H + 15) / 2, z + 3), stein);
    for (const y of [H + 6, H + 12, H + 14.6]) S.add(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 10).translate(x + 3, y, z + 3), band);
  }
  // Tor und Stahlvordach am Eingang
  const Fz = c.F[0], u = c.eingangU;
  q(c.Fe, u - 2.2, u + 2.2, 0, 3.8, 0, 0.08, '#2f4a3e');
  for (let k = -1; k <= 1; k++) q(c.Fe, u + k * 1.4 - 0.03, u + k * 1.4 + 0.03, 0.1, 3.7, 0.08, 0.12, '#24392f');
  q(c.Fe, u - 3.2, u + 3.2, 4.1, 4.3, 0, 2.6, stahl);
  for (const s of [-2.8, 2.8]) c.Fe.geo(new THREE.BoxGeometry(0.08, 0.08, 3.4).rotateX(-0.6), u + s, 5.0, 1.3, stahl);
  return { hoehe: H + (schlot ? 15 : shed ? 3 : 10), dachY: H + (shed ? 2.9 : 0.4), dachEinzug: 1.6, vor: 0.4, eingang: { u, y: 4.9, t: 2.7, fahneT: 3.4 } };
}

// ------------------------------------------------------------------ 6. Campus: flacher, breiter Neubau mit Holzlamellen
function campus(c) {
  const { S, x, z, w, d, m, E, r } = c;
  const v = c.v;
  // Varianten: Lamellen (Holz, weiß, Terrakotta, grün), Teilung der Baukörper, Rücksprung, Glasfarbe
  const weiss = waehle(v, ['#f4f3ef', '#e9e6df', '#dfe3e4']), holz = waehle(v, ['#b9895a', '#a97c50', '#f6f5f2', '#c46a4a', '#7a9a6a']), scheibe = waehle(v, ['#7fa2b2', '#6f8f86', '#8a9aa6']);
  const H = m.H, ruck = waehle(v, [3, 5, 1.5]);
  // zwei Baukörper: rechter Teil (+x) springt zurück, Fuge mit Atrium
  const fuge = x + Math.round(w * waehle(v, [0.45, 0.55, 0.62]) / 2.5) * 2.5;
  c.eingangU = fuge - x - w / 2;
  const teile = [{ x0: x, x1: fuge - 1.5, z1: z + d }, { x0: fuge + 1.5, x1: x + w, z1: z + d - ruck }];
  for (const T of teile) {
    const tw = T.x1 - T.x0, td = T.z1 - z;
    S.quader(T.x0, 0, z, T.x1, H, T.z1, '#d9dcdc');
    const Fs = [fassade(S, c.scene, T.x0, z, tw, td, '+z'), fassade(S, c.scene, T.x0, z, tw, td, '+x')];
    for (const F of Fs) {
      const L2 = F.len / 2;
      for (const e of E) {
        q(F, -L2 - 0.2, L2 + 0.2, e.y - 0.05, e.y + 0.55, 0, 0.6, weiss);
        q(F, -L2, L2, e.y + 0.55, e.y + e.h - 0.05, 0, 0.04, glasVon(e, r, scheibe));
        const dicht = e.k % 2 ? 0.9 : 1.35;
        for (let u = -L2 + 0.5; u < L2 - 0.3; u += dicht) q(F, u - 0.07, u + 0.07, e.y + 0.55, e.y + e.h - 0.05, 0.3, 0.55, holz);
      }
      q(F, -L2 - 0.2, L2 + 0.2, H - 0.05, H + 0.7, 0, 0.6, weiss);
    }
    // Dachterrasse: Holzdeck, Pflanzkübel, Solarfelder
    S.box(tw - 1, 0.12, td - 1, (T.x0 + T.x1) / 2, H + 0.06, z + td / 2, '#b8b2a6');
    for (let u = T.x0 + 2; u < T.x1 - 3; u += 3.2) S.add(new THREE.BoxGeometry(2.6, 0.12, 1.6).rotateX(-0.35).translate(u + 1.3, H + 0.7, z + 3), '#2f4a6e');
    for (let u = T.x0 + 2; u < T.x1 - 2; u += 4.5) { S.box(1.2, 0.6, 1.2, u, H + 0.42, T.z1 - 1.6, '#8c8378'); S.add(new THREE.IcosahedronGeometry(0.75, 0).translate(u, H + 1.25, T.z1 - 1.6), FARBEN.baum[0]); }
    S.box(tw - 2, 0.1, 0.06, (T.x0 + T.x1) / 2, H + 1.6, T.z1 - 0.5, '#9fb7c2');
  }
  // Atriumfuge: Glas über die ganze Höhe
  S.quader(fuge - 1.5, 0, z + 1, fuge + 1.5, H + 1.2, z + d - 1.2, '#9fbccb');
  for (let y = m.eg; y < H; y += m.gh) S.box(3.0, 0.2, 0.3, fuge, y, z + d - 1.1, weiss);
  // Eingang mit großem Vordach an der Fuge
  const Fz = c.F[0], u = c.eingangU;
  q(c.Fe, u - 5, u + 5, 4.6, 5.0, -1.4, 3.6, weiss);
  for (const s of [-4.4, 4.4]) q(c.Fe, u + s - 0.12, u + s + 0.12, 0, 4.6, 3.1, 3.35, '#c9cdd0');
  for (const s of [-8, 8]) if (Math.abs(u + s) < Fz.len / 2 - 1) { c.Fe.box(1.4, 0.7, 1.4, u + s, 0, 2.2, '#8c8378'); c.Fe.kugel(1.1, u + s, 2.3, 2.2, FARBEN.baum[2]); c.Fe.box(0.25, 1.4, 0.25, u + s, 0.7, 2.2, FARBEN.stamm); }
  return { hoehe: H + 2, dachY: H + 0.7, dachEinzug: 2.0, dachSchildU: -(w / 2) + (fuge - x) / 2, vor: 0.7, eingang: { u, y: 5.9, t: 3.7, fahneT: 4.8 } };
}

// ====================================================================================
// Einplanen in eine fertige Stadt: Der Stadtplan bleibt unverändert (gleicher Zufall, gleiche Bebauung). HQ-Gebäude und
// Angebote ersetzen nachträglich Blockrand-Parzellen an der +z-Ecke eines passenden Blocks (eigener Zufallsstrom).
// Gebäude derselben Adresse (letztes Wort im Namen, z. B. „Brehmstraße“) stehen als Ensemble an benachbarten Blöcken
// derselben Straßenseite einander gegenüber, verbunden durch eine verglaste Brücke über die Querstraße.
// Ein Umzug tauscht also nur die Gebäude, nicht die Stadt.
// ====================================================================================
const ERSETZBAR = new Set(['stadthaus', 'eck', 'hofhaus', 'slot:ruhr_innenstadt60', 'slot:rhein_wiederaufbau', 'slot:west_nachkrieg', 'slot:nord_kontorhaus']);
const adresse = (g) => (g.name ?? '').trim().split(/\s+/).pop() || g.id;

/**
 * Setzt die HQ-Gebäude und Angebote einer Stadt in den Plan (verändert plan.parzellen, plan.standorte, Blöcke).
 * Rückgabe: Liste der gesetzten Standorte { id, parzelle, angebot }.
 */
export function hqEinplanen(plan, hq, stadt) {
  const r = rng(hashText('hq:' + stadt) ^ (plan.seed >>> 0));
  const pz = new Map(plan.parzellen.map((p) => [p.id, p]));
  const imBlock = (b) => plan.parzellen.filter((p) => p.block === b.id);
  const L = plan.einkaufslage, mx = L ? L.xF : plan.breite / 2, mz = L ? L.zF : plan.tiefe / 2;
  const benutzt = new Set();
  const frei = plan.bloecke.filter((b) => b.art === 'bebaut' && imBlock(b).length > 4 && imBlock(b).every((p) => ERSETZBAR.has(p.typ) && !p.standort && !p.leer));
  const punkte = (b, W, D) => { if (benutzt.has(b.id) || b.w < W + 12 || b.d < D + 10) return Infinity; const dd = wurzelSumme(b.x + b.w / 2 - mx, b.z + b.d / 2 - mz); return Math.abs(dd - 150) + r() * 60; };
  // Gruppen: Gebäude gleicher Adresse zusammen, Angebote einzeln
  const gruppen = new Map();
  for (const g of hq.gebaeude ?? []) if (g.stadt === stadt) { const k = adresse(g); if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push({ g, angebot: false }); }
  for (const a of hq.angebote ?? []) if (a.stadt === stadt) gruppen.set('angebot:' + a.id, [{ g: a, angebot: true }]);
  const gesetzt = [];
  const setze = (b, eintrag, ecke, extra = {}) => {
    const m = hqMasse(eintrag.g);
    const R = { x: ecke.includes('+x') ? b.x + b.w - m.w : b.x, z: b.z + b.d - m.d, w: m.w, d: m.d };
    const vorlage = imBlock(b)[0];
    for (const p of imBlock(b)) {
      if (!(p.x < R.x + R.w - 0.01 && p.x + p.w > R.x + 0.01 && p.z < R.z + R.d - 0.01 && p.z + p.d > R.z + 0.01)) continue;
      const stuecke = [
        { x: p.x, z: p.z, w: R.x - p.x, d: p.d }, { x: R.x + R.w, z: p.z, w: p.x + p.w - R.x - R.w, d: p.d },
        { x: p.x, z: p.z, w: p.w, d: R.z - p.z },
      ].filter((q) => q.w >= 5 && q.d >= 5).sort((a, c) => c.w * c.d - a.w * a.d);
      if (stuecke.length) Object.assign(p, stuecke[0]);
      else { plan.parzellen.splice(plan.parzellen.indexOf(p), 1); b.parzellen = (b.parzellen ?? []).filter((id) => id !== p.id); pz.delete(p.id); }
    }
    const id = 'hq-' + eintrag.g.id;
    const standort = { id: eintrag.g.id, rolle: 'hq', art: 'hq', lage: 'b', w: m.w, d: m.d, hq: eintrag.g, angebot: eintrag.angebot, ...extra };
    const p = { id, typ: 'slot:hq', block: b.id, x: R.x, z: R.z, w: R.w, d: R.d, seed: hashText(id), front: ecke.match(/[+-][xz]/g), seite: 'ecke', strasse: [], ecke,
      region: vorlage?.region, cluster: vorlage?.cluster, viertel: vorlage?.viertel, sonder: 'hq', standort, lage: 'b', nachbar: null };
    plan.parzellen.push(p); b.parzellen = [...(b.parzellen ?? []), id];
    plan.standorte.push({ ...standort, parzelle: id, typ: 'slot:hq', block: b.id });
    benutzt.add(b.id);
    gesetzt.push({ id: eintrag.g.id, parzelle: id, angebot: eintrag.angebot });
    return p;
  };
  for (const [, liste] of gruppen) {
    if (liste.length >= 2) {
      // Ensemble: Block A (+x+z-Ecke) und rechter Nachbarblock B (-x+z-Ecke) derselben Reihe
      const [eA, eB] = liste, mA = hqMasse(eA.g), mB = hqMasse(eB.g);
      let best = null;
      for (const a of frei) {
        const sA = punkte(a, mA.w, mA.d); if (sA === Infinity) continue;
        for (const b of frei) {
          if (b === a || Math.abs(b.z + b.d - (a.z + a.d)) > 1 || b.x < a.x + a.w || b.x - (a.x + a.w) > 40) continue;
          const sB = punkte(b, mB.w, mB.d); if (sB === Infinity) continue;
          if (!best || sA + sB < best.s) best = { s: sA + sB, a, b };
        }
      }
      if (best) {
        const zz = best.a.z + best.a.d, tief = Math.min(mA.d, mB.d);
        setze(best.a, eA, '+x+z', { bruecke: { x0: best.a.x + best.a.w, x1: best.b.x, z0: zz - tief + 4, z1: zz - 4, y0: Math.min(mA.eg, mB.eg) + 3.4 } });
        setze(best.b, eB, '-x+z');
        for (const e of liste.slice(2)) { const b = frei.map((q) => [q, punkte(q, hqMasse(e.g).w, hqMasse(e.g).d)]).filter((q) => q[1] < Infinity).sort((p1, p2) => p1[1] - p2[1])[0]?.[0]; if (b) setze(b, e, '+x+z'); }
        continue;
      }
    }
    for (const e of liste) {
      const m = hqMasse(e.g);
      const b = frei.map((q) => [q, punkte(q, m.w, m.d)]).filter((q) => q[1] < Infinity).sort((p1, p2) => p1[1] - p2[1])[0]?.[0];
      if (b) setze(b, e, '+x+z');
    }
  }
  return gesetzt;
}

/** Kartenmarker für Angebote: gelber Pin mit Schlüssel (fällt neben den roten H/Z-Pins auf). */
let _schluessel = null;
export function angebotMarker(scene, x, y, z, groesse = 10) {
  if (!_schluessel) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 320;
    const k = c.getContext('2d');
    k.fillStyle = 'rgba(0,0,0,0.25)'; k.beginPath(); k.ellipse(128, 306, 40, 10, 0, 0, PI * 2); k.fill();
    k.fillStyle = '#e8a317'; k.beginPath(); k.moveTo(128, 300); k.lineTo(70, 190); k.arc(128, 128, 100, PI * 0.82, PI * 0.18); k.closePath(); k.fill();
    k.fillStyle = '#ffffff'; k.beginPath(); k.arc(128, 128, 74, 0, PI * 2); k.fill();
    // Schlüssel: Ring, Bart
    k.strokeStyle = '#d23c32'; k.lineWidth = 16; k.beginPath(); k.arc(95, 128, 26, 0, PI * 2); k.stroke();
    k.fillStyle = '#d23c32'; k.fillRect(118, 120, 78, 16); k.fillRect(170, 136, 14, 22); k.fillRect(148, 136, 12, 16);
    _schluessel = new THREE.CanvasTexture(c); _schluessel.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _schluessel, depthTest: false }));
  sp.center.set(0.5, 0); sp.scale.set(groesse * 0.8, groesse, 1); sp.position.set(x, y, z); sp.renderOrder = 20;
  scene.add(sp);
  return sp; // Referenz für klickbare Angebotsmarker im Posteingang
}

// ====================================================================================
// Slot im Stadtplan: 'slot:hq' (p.standort.hq = Gebäude oder Angebot aus dem JSON)
// ====================================================================================
registriereSlots({
  'slot:hq': (S, scene, p) => {
    const g = p.standort?.hq;
    if (!g) return { hoehe: 0 };
    const m = hqMasse(g);
    const ecke = p.ecke ?? '+x+z';
    const x = ecke === 'block' ? p.x + (p.w - m.w) / 2 : ecke.includes('+x') ? p.x + p.w - m.w : p.x;
    const z = ecke === 'block' ? p.z + (p.d - m.d) / 2 : ecke.includes('+z') ? p.z + p.d - m.d : p.z;
    const e = hqGebaeude(S, scene, g, { x, z, angebot: !!p.standort.angebot });
    // Verbindungsbrücke zum Ensemble-Partner über die Querstraße (Glas, zwei Geschosse, Stahlrahmen)
    const br = p.standort.bruecke;
    if (br) {
      const h = 6.4, len = br.x1 - br.x0 + 1;
      S.box(len, 0.5, br.z1 - br.z0, (br.x0 + br.x1) / 2, br.y0, (br.z0 + br.z1) / 2, '#eef1f2');
      S.box(len, h - 0.6, br.z1 - br.z0 - 0.4, (br.x0 + br.x1) / 2, br.y0 + h / 2, (br.z0 + br.z1) / 2, '#9fbccb');
      S.box(len, 0.5, br.z1 - br.z0, (br.x0 + br.x1) / 2, br.y0 + h, (br.z0 + br.z1) / 2, '#eef1f2');
      for (let u = br.x0; u <= br.x1 + 0.01; u += (br.x1 - br.x0) / 4) S.box(0.18, h, 0.2, u, br.y0 + h / 2, br.z1 - 0.1, '#3a4048');
      S.box(len, 0.12, 0.2, (br.x0 + br.x1) / 2, br.y0 + h / 2, br.z1 - 0.1, '#3a4048');
      schild(scene, 'HARTWIG', '+z', (br.x0 + br.x1) / 2, br.y0 + h - 1.0, br.z1 - 0.3, 1.0, ROT);
    }
    return { hoehe: e.hoehe, w: m.w, d: m.d };
  },
});

// ====================================================================================
// Etagenschnitt (Puppenhaus-Ansicht): Rückwände -x/-z stehen, Front +x/+z offen
// ====================================================================================
const WH = 3.4;   // lichte Raumhöhe Büro
const BELAG = [
  { a: '#b9b7a6', b: '#aeac9b', m: 'fliese' },                 // Stufe 0: altes Linoleum
  { a: '#9ea5aa', b: '#949ba0', m: 'teppich' },                // Stufe 1: Nadelfilz grau
  { a: '#d9bf98', b: '#cfb48c', m: 'dielen' },                 // Stufe 2: Holzdielen
  { a: '#e4cca4', b: '#d8bf95', c: '#c9ad83', m: 'parkett' },  // Stufe 3: Parkett
];
const BELAG_LEER = { a: '#8f9296', b: '#878a8e', m: 'teppich' };
const BELAG_ROH = { a: '#a7a49d', b: '#9d9a93', m: 'beton' };
const WAND = {
  altbau: { putz: '#efe6d6', pilaster: '#e2d6c2', fenster: 'hoch' }, nachkrieg: { putz: '#eeebe4', pilaster: '#e1ddd4', fenster: 'band' },
  buero70: { putz: '#e6dccb', pilaster: '#cbbda6', fenster: 'band' }, glas: { putz: '#f2f3f3', pilaster: '#dfe3e6', fenster: 'glas' },
  loft: { putz: '#a8664f', pilaster: '#98594a', fenster: 'stahl' }, campus: { putz: '#f4f3ef', pilaster: '#c29467', fenster: 'glas' },
};
const FRONT = { altbau: '#e6d9c0', nachkrieg: '#eeebe3', buero70: '#b5a184', glas: '#eef1f2', loft: '#a8664f', campus: '#f4f3ef' };
const SCHEIBE = '#bcd6e0';

/** Belegungsraster 0,5 m für die Möbelplatzierung. */
class Raster {
  constructor(B, T) { this.q = 0.5; this.nx = Math.ceil(B / 0.5); this.nz = Math.ceil(T / 0.5); this.v = new Uint8Array(this.nx * this.nz); }
  idx(x0, z0, x1, z1) { const q = this.q; return [Math.max(0, Math.floor(x0 / q + 1e-6)), Math.max(0, Math.floor(z0 / q + 1e-6)), Math.min(this.nx, Math.ceil(x1 / q - 1e-6)), Math.min(this.nz, Math.ceil(z1 / q - 1e-6))]; }
  frei(x0, z0, x1, z1) { const [a, b, c, d] = this.idx(x0, z0, x1, z1); for (let i = a; i < c; i++) for (let j = b; j < d; j++) if (this.v[i * this.nz + j]) return false; return true; }
  setze(x0, z0, x1, z1) { const [a, b, c, d] = this.idx(x0, z0, x1, z1); for (let i = a; i < c; i++) for (let j = b; j < d; j++) this.v[i * this.nz + j] = 1; }
  /** Erste freie Stelle für w × d im Bereich (Reihen von hinten nach vorn), Rand m ringsum mitbelegt. */
  suche(Z, w, d, m = 0.5, o = {}) {
    const zs = o.nurHinten ? [Z.z0] : null;
    for (let z = Z.z0; z + d <= Z.z1 + 1e-6; z += 0.5) {
      if (zs && z > Z.z0) break;
      for (let x = Z.x0; x + w <= Z.x1 + 1e-6; x += 0.5) {
        if (this.frei(x - m, z - (z <= Z.z0 ? 0 : m), x + w + m, z + d + m)) { this.setze(x - m, z - m, x + w + m, z + d + m); return { x, z }; }
      }
    }
    return null;
  }
}

/** Glasraum mit Rahmen, Tür an der +z-Seite. inhalt(L, w, d) baut die Einrichtung (L in der Raummitte). */
function glasraum(S, scene, x, z, w, d, rahmen, inhalt, o = {}) {
  const h = o.h ?? 2.7;
  const kante = (x0, z0, x1, z1, tuer) => {
    const lx = x1 - x0, lz = z1 - z0, langX = lx > lz;
    const L = langX ? lx : lz;
    const teile = tuer ? [[0, L * 0.55], [L * 0.55 + 1.0, L]] : [[0, L]];
    for (const [a, b] of teile) {
      if (b - a < 0.2) continue;
      if (langX) S.box(b - a, h - 0.1, 0.05, x0 + (a + b) / 2, 0.06 + (h - 0.1) / 2, z0, GLAS); else S.box(0.05, h - 0.1, b - a, x0, 0.06 + (h - 0.1) / 2, z0 + (a + b) / 2, GLAS);
    }
    if (langX) S.box(lx, 0.1, 0.1, x0 + lx / 2, h, z0, rahmen); else S.box(0.1, 0.1, lz, x0, h, z0 + lz / 2, rahmen);
  };
  if (!o.ohneHinten) { kante(x, z, x + w, z, false); }
  if (!o.ohneLinks) kante(x, z, x, z + d, false);
  kante(x, z + d, x + w, z + d, true);
  kante(x + w, z, x + w, z + d, false);
  for (const [a, b] of [[x, z], [x + w, z], [x, z + d], [x + w, z + d]]) S.box(0.1, h, 0.1, a, h / 2, b, rahmen);
  if (o.name && scene) {
    const { mat, seitenverhaeltnis } = textMaterial(o.name, '#ffffff', { groesse: 100, hintergrund: o.farbe ?? '#3a4048', versatz: -2 });
    const hh = 0.32, m = new THREE.Mesh(new THREE.PlaneGeometry(hh * seitenverhaeltnis, hh), mat);
    m.position.set(x + w * 0.3, h - 0.35, z + d + 0.04); scene.add(m);
  }
  inhalt(lokal(S, x + w / 2, 0.06, z + d / 2, 0), w, d);
}

/** Bürostuhl (Stufe 0 Holz, 1 grau, 2 schwarz, 3 in Abteilungsfarbe). ry dreht die Sitzrichtung (Front lokal +z). */
function buerostuhl(L, lx, lz, ry, st, farbe) {
  const P = L.sub(lx, lz, ry);
  const f = st === 0 ? '#7b5a40' : st === 1 ? '#4a525a' : st === 2 ? '#2a2d31' : farbe;
  if (st === 0) { P.box(0.42, 0.05, 0.42, 0, 0.42, 0, f); P.box(0.42, 0.42, 0.05, 0, 0.47, -0.19, f); for (const s of [-0.18, 0.18]) for (const t of [-0.18, 0.18]) P.box(0.04, 0.42, 0.04, s, 0, t, '#3a3a3a'); return; }
  P.box(0.5, 0.04, 0.5, 0, 0.02, 0, '#2a2d31');
  P.box(0.06, 0.4, 0.06, 0, 0.02, 0, '#5a636b');
  P.box(0.48, 0.08, 0.46, 0, 0.42, 0, f);
  P.box(0.46, st === 3 ? 0.7 : 0.55, 0.07, 0, 0.5, -0.22, f);
}
/** Monitor: Stufe 0 Röhrengerät, sonst Flachbildschirm mit hellem Bild; zwei ab Stufe 2. Rückseite nach -z. */
function monitor(L, lx, lz, st, r, inhalt = null) {
  if (st === 0) { L.box(0.42, 0.38, 0.42, lx, 0.75, lz, '#d8d2c0'); L.box(0.32, 0.26, 0.02, lx, 0.81, lz + 0.21, '#3d5a52'); return; }
  const n = st >= 2 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const u = lx + (n === 2 ? (k - 0.5) * 0.56 : 0);
    L.box(0.06, 0.25, 0.06, u, 0.75, lz - 0.05, '#2a2d31');
    L.box(0.54, 0.34, 0.04, u, 0.95, lz, '#22272c');
    L.box(0.48, 0.28, 0.01, u, 0.98, lz + 0.025, inhalt ?? waehle(r, ['#9cc9e0', '#cfe3ec', '#b7d7c4', '#e6edf1']));
  }
}
/** Schreibtischinsel mit n Plätzen je Seite (Stufe 0: Reihe, alle nach +z). Rückgabe: Stuhlplätze [x, z, ry]. */
function insel(S, x, z, n, st, r, farbe, chartBild) {
  const L = lokal(S, x, 0.06, z, 0);
  const tisch = ['#b7b09d', '#d9d6cf', '#f2f0ea', '#efe4cf'][st], bein = st === 0 ? '#6b6f72' : '#9aa3aa';
  const plaetze = [];
  const breit = 1.4;
  const reihen = st === 0 ? [1] : [-1, 1];
  for (const s of reihen) {
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) * breit, tz = s * 0.4;
      L.box(breit - 0.06, 0.04, 0.78, u, 0.72, tz, tisch);
      L.box(0.05, 0.72, 0.7, u - breit / 2 + 0.06, 0, tz, bein); 
      if (i === n - 1) L.box(0.05, 0.72, 0.7, u + breit / 2 - 0.06, 0, tz, bein);
      // Monitor auf der Mittellinie, Bild zur Person
      const ml = lokal(S, x + u, 0.06, z + tz - s * 0.22, s > 0 ? 0 : PI);
      monitor(ml, 0, 0, st, r, chartBild ? chartBild(r) : null);
      L.box(0.45, 0.02, 0.15, u, 0.76, tz + s * 0.12, '#3a3f45');
      if (st >= 1 && r() < 0.5) L.box(0.22, 0.12, 0.3, u + 0.45, 0.76, tz, waehle(r, ['#f4f2ee', '#e9c46a', '#cfd6dc']));
      if (st === 0 && r() < 0.6) L.box(0.3, 0.25, 0.22, u + 0.45, 0.76, tz - 0.15, waehle(r, ['#2f5f8a', '#8a2f3a', '#3f6b3a']));
      const sz = z + tz + s * 0.85;
      buerostuhl(lokal(S, x + u, 0.06, sz, 0), 0, 0, s > 0 ? PI : 0, st, farbe);
      plaetze.push([x + u, sz, s > 0 ? PI : 0]);
    }
  }
  // Mittelteiler: Stufe 1 Stellwand, ab Stufe 2 Pflanzkasten (wie Coffee Inc), Stufe 3 mit Abteilungsfarbe
  const lang = n * breit;
  if (st === 1) L.box(lang - 0.2, 0.42, 0.05, 0, 0.76, 0, '#7f8a92');
  if (st >= 2) {
    L.box(lang - 0.2, 0.28, 0.3, 0, 0.76, 0, st === 3 ? farbe : '#6b5a48');
    for (let u = -lang / 2 + 0.35; u < lang / 2 - 0.2; u += 0.42) L.kugel(0.2, u, 1.12, 0, waehle(r, FARBEN.baum));
  }
  return plaetze;
}
function pflanze(L, lx, lz, r, gross = false) {
  L.box(0.5, 0.5, 0.5, lx, 0, lz, '#e9e4da');
  L.kugel(gross ? 0.6 : 0.42, lx, gross ? 1.05 : 0.85, lz, waehle(r, FARBEN.baum));
  if (gross) L.kugel(0.4, lx + 0.1, 1.6, lz - 0.05, waehle(r, FARBEN.baum));
}
function text(L, t, lx, ly, lz, h, farbe, hg = null) {
  const scene = L.S.szene; if (!scene) return;
  const { mat, seitenverhaeltnis } = textMaterial(t, farbe, { groesse: 100, hintergrund: hg, versatz: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * seitenverhaeltnis, h), mat);
  const [X, Z] = L.P(lx, lz); m.position.set(X, L.oy + ly, Z); m.rotation.y = L.rot; scene.add(m);
}
/** Balkendiagramm auf einer Fläche (lokal, Fläche bei lz zeigt nach +z). */
function balken(L, lx, ly, lz, w, h, r, farben = ['#2f6fb3', '#3ab27a', '#e9b44c', '#d65a6f']) {
  const n = 6, s = w / n;
  for (let i = 0; i < n; i++) { const hh = h * zw(r, 0.25, 0.95); L.box(s * 0.6, hh, 0.02, lx - w / 2 + s * (i + 0.5), ly, lz, farben[i % farben.length]); }
}
/** Liniendiagramm aus schrägen Strichen. */
function linie(L, lx, ly, lz, w, h, r, farbe = '#d23c32') {
  let y0 = ly + h * zw(r, 0.2, 0.5);
  const n = 5, s = w / n;
  for (let i = 0; i < n; i++) {
    const y1 = ly + h * zw(r, 0.15, 0.95), dx = s, dy = y1 - y0, l = wurzelSumme(dx, dy);
    L.geo(new THREE.BoxGeometry(l, 0.04, 0.02).rotateZ(Math.atan2(dy, dx)), lx - w / 2 + s * (i + 0.5), (y0 + y1) / 2 - 0.02, lz, farbe);
    y0 = y1;
  }
}
function regal(L, lx, lz, w, h, korpus, fuell, r, tiefe = 0.45, boeden = 4) {
  L.box(w, h, 0.04, lx, 0, lz - tiefe / 2 + 0.02, korpus);
  for (const s of [-1, 1]) L.box(0.04, h, tiefe, lx + s * (w / 2 - 0.02), 0, lz, dunkler(korpus, 0.05));
  for (let k = 0; k <= boeden; k++) L.box(w, 0.03, tiefe, lx, (k * (h - 0.05)) / boeden, lz, korpus);
  for (let k = 0; k < boeden; k++) fuell(lx, (k * (h - 0.05)) / boeden + 0.03, lz, w - 0.1, (h - 0.05) / boeden - 0.06, k);
}
function ordner(L, r, pal) {
  return (lx, y, lz, w, h) => { let u = lx - w / 2; while (u < lx + w / 2 - 0.08) { const b = zw(r, 0.07, 0.09); if (r() < 0.9) L.box(b - 0.01, h * 0.82, 0.3, u + b / 2, y, lz, waehle(r, pal)); u += b; } };
}

// ------------------------------------------------------------------ Sondermöbel je Abteilung
// Jede Abteilung hat vier typische Einrichtungen (art: 'wand' an der Rückwand, 'frei' im Raum, 'raum' Glasraum).
// Sichtbar nach Stufe: 0 → 1, 1 → 2, 2 → 3, 3 → alle vier. bau(S, scene, x, z, w, d, st, r, farbe), Rechteck in Weltmaßen.
const SPEZIAL = {
  controlling: [
    { art: 'wand', w: 4.6, d: 0.6, bau(S, sc, x, z, w, d, st, r) {
      const L = lokal(S, x + w / 2, 0.06, z + 0.15, 0);
      L.box(w, 2.0, 0.12, 0, 0.6, 0, '#22272c');
      for (let k = 0; k < 3; k++) { const u = (k - 1) * (w / 3); L.box(w / 3 - 0.12, 1.8, 0.02, u, 0.7, 0.07, '#f4f6f8'); if (k === 1) linie(L, u, 0.9, 0.09, w / 3 - 0.5, 1.3, r); else balken(L, u, 0.85, 0.09, w / 3 - 0.5, 1.4, r); }
      text(L, 'KPI Woche', 0, 2.75, 0.08, 0.28, '#ffffff', '#2f6fb3');
      L.box(0.5, 0.7, 0.4, -w / 2 + 0.4, 0, 0.3, '#3a3f45');
    } },
    { art: 'frei', w: 4.2, d: 2.6, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Reporting-Pult: lange Tischreihe mit je drei Bildschirmen voller Diagramme
      const L = lokal(S, x + w / 2, 0.06, z + 0.9, 0);
      L.box(w, 0.04, 0.9, 0, 0.72, 0, '#e9e6df'); for (const s of [-1, 1]) L.box(0.05, 0.72, 0.8, s * (w / 2 - 0.1), 0, 0, '#9aa3aa');
      for (let k = 0; k < 6; k++) { const u = -w / 2 + 0.35 + k * ((w - 0.7) / 5); L.box(0.5, 0.36, 0.04, u, 0.95, -0.3, '#22272c'); balken(L, u, 0.99, -0.27, 0.4, 0.26, r); L.box(0.06, 0.2, 0.06, u, 0.76, -0.33, '#2a2d31'); }
      for (let k = 0; k < 3; k++) buerostuhl(L, -w / 3 + k * (w / 3), 0.85, PI, Math.max(1, st), farbe);
    } },
    { art: 'raum', w: 5.0, d: 4.0, name: 'Forecast-Runde', bau(S, sc, x, z, w, d, st, r, farbe) {
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        L.box(2.8, 0.05, 1.2, 0, 0.72, 0.2, '#f4f2ee'); L.box(0.2, 0.72, 0.8, 0, 0, 0.2, '#9aa3aa');
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) buerostuhl(L, (k - 1) * 0.9, 0.2 + s * 0.95, s > 0 ? PI : 0, 2, farbe);
        L.box(2.2, 1.3, 0.08, 0, 1.0, -d / 2 + 0.15, '#22272c'); L.box(2.0, 1.1, 0.02, 0, 1.1, -d / 2 + 0.2, '#f4f6f8'); balken(L, -0.5, 1.2, -d / 2 + 0.22, 0.9, 0.8, r); linie(L, 0.5, 1.2, -d / 2 + 0.22, 0.8, 0.8, r);
      }, { name: 'Forecast-Runde', farbe });
    } },
    { art: 'frei', w: 1.4, d: 1.2, bau(S, sc, x, z, w, d, st, r) {
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(0.6, 0.05, 0.5, 0, 0, 0, '#2a2d31'); L.box(0.1, 1.2, 0.1, 0, 0.05, 0, '#5a636b');
      L.box(1.2, 0.75, 0.06, 0, 1.25, 0, '#22272c'); L.box(1.1, 0.65, 0.01, 0, 1.3, 0.035, '#f4f6f8'); linie(L, 0, 1.38, 0.045, 0.9, 0.45, r, '#3ab27a');
    } },
  ],
  einkauf: [
    { art: 'wand', w: 4.8, d: 0.6, bau(S, sc, x, z, w, d, st, r) {
      // Musterregal mit gefalteter Ware und Schuhkartons
      const L = lokal(S, x + w / 2, 0.06, z + 0.3, 0);
      regal(L, 0, 0, w, 2.2, '#f2efe8', (lx, y, lz, ww, hh, k) => { for (let u = lx - ww / 2 + 0.2; u < lx + ww / 2 - 0.1; u += 0.38) L.box(0.32, k === 3 ? 0.18 : 0.08 + r() * 0.12, 0.32, u, y, lz, k === 3 ? '#c9a26b' : waehle(r, PAL.damen.concat(PAL.herren))); }, r);
      text(L, 'Muster Herbst/Winter', 0, 2.5, 0.05, 0.24, '#ffffff', '#c0832f');
    } },
    { art: 'frei', w: 3.2, d: 2.6, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Stoffprobentisch: großer Tisch mit Stofffächern und Musterbüchern
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(2.8, 0.06, 1.3, 0, 0.84, 0, '#d8bf98'); for (const s of [-1.2, 1.2]) L.box(0.08, 0.84, 1.1, s, 0, 0, '#7b5a40');
      for (let k = 0; k < 12; k++) L.box(zw(r, 0.25, 0.45), 0.02, zw(r, 0.18, 0.3), zw(r, -1.2, 1.2), 0.9 + (k % 3) * 0.015, zw(r, -0.5, 0.5), waehle(r, PAL.damen.concat(PAL.waesche)), zw(r, -0.8, 0.8));
      for (let k = 0; k < 3; k++) { L.box(0.3, 0.08, 0.4, -0.9 + k * 0.9, 0.9, -0.35, waehle(r, ['#2b3a55', '#6b2737', '#3f6b3a'])); }
      for (const s of [-1, 1]) buerostuhl(L, s * 0.7, 1.15, PI, Math.max(1, st), farbe);
    } },
    { art: 'frei', w: 3.0, d: 1.2, bau(S, sc, x, z, w, d, st, r) {
      // Rollständer mit Musterteilen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      for (const s of [-1, 1]) { L.box(0.06, 1.7, 0.06, s * 1.3, 0, 0, '#9aa3aa'); L.box(0.5, 0.04, 0.5, s * 1.3, 0, 0, '#5a636b'); }
      L.box(2.7, 0.04, 0.04, 0, 1.7, 0, '#9aa3aa');
      for (let u = -1.2; u < 1.2; u += 0.16) L.box(0.05, zw(r, 0.7, 1.0), 0.42, u, 1.66 - 0.85, 0, waehle(r, PAL.damen.concat(PAL.herren)));
    } },
    { art: 'raum', w: 5.0, d: 4.0, bau(S, sc, x, z, w, d, st, r, farbe) {
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        L.box(2.4, 0.05, 1.1, 0, 0.72, 0.4, '#f4f2ee'); L.box(0.2, 0.72, 0.8, 0, 0, 0.4, '#9aa3aa');
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) buerostuhl(L, (k - 0.5) * 1.1, 0.4 + s * 0.9, s > 0 ? PI : 0, 2, farbe);
        L.box(3.0, 0.04, 0.04, 0, 1.75, -d / 2 + 0.6, '#9aa3aa');
        for (let u = -1.4; u < 1.4; u += 0.18) L.box(0.05, zw(r, 0.7, 1.0), 0.4, u, 0.85, -d / 2 + 0.6, waehle(r, PAL.damen));
      }, { name: 'Lieferantengespräch', farbe });
    } },
  ],
  marketing: [
    { art: 'frei', w: 5.0, d: 4.0, bau(S, sc, x, z, w, d, st, r) {
      // Fotostudio: Papierhintergrund, Softboxen, Kamera auf Stativ, Model
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(3.4, 2.8, 0.06, 0, 0, -d / 2 + 0.2, '#f6f6f2'); L.box(3.4, 0.02, 1.8, 0, 0, -d / 2 + 1.1, '#f6f6f2');
      L.box(3.6, 0.12, 0.12, 0, 2.85, -d / 2 + 0.2, '#2a2d31');
      for (const s of [-1, 1]) { L.box(0.04, 1.8, 0.04, s * 1.9, 0, 0.2, '#2a2d31'); L.geo(new THREE.BoxGeometry(0.8, 0.8, 0.25).rotateY(s * 0.6), s * 1.9, 1.9, 0.2, '#ffffff'); }
      L.box(0.04, 1.3, 0.04, 0, 0, 1.5, '#2a2d31'); L.box(0.25, 0.18, 0.3, 0, 1.3, 1.5, '#1e2328');
      puppe(L, 0, -d / 2 + 1.0, r, 'damen', PAL.damen, 0);
      figur(L.S, x + w / 2 + 0.6, z + d / 2 + 1.7, 101, 'kunde', { ry: PI, pose: 'schauen' });
    } },
    { art: 'wand', w: 5.0, d: 0.4, bau(S, sc, x, z, w, d, st, r) {
      // Plakatwand mit Kampagnenmotiven
      const L = lokal(S, x + w / 2, 0.06, z + 0.1, 0);
      const motive = [['SALE', '#d23c32'], ['NEU', '#2f6fb3'], ['−30 %', '#e9b44c'], ['Herbst', '#3f7d56']];
      motive.forEach(([t, f], k) => { const u = -w / 2 + 0.65 + k * 1.25; L.box(1.1, 1.6, 0.04, u, 0.9, 0, '#f8f6f2'); L.box(1.0, 1.0, 0.02, u, 1.4, 0.03, f); L.box(0.6, 0.12, 0.02, u, 1.05, 0.03, '#2a2d31'); text(L, t, u, 1.9, 0.05, 0.26, '#ffffff'); });
    } },
    { art: 'frei', w: 3.4, d: 2.4, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Kreativtisch mit Layouts und Moodboard
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(2.6, 0.05, 1.2, 0, 0.9, 0, '#f4f2ee'); for (const s of [-1.2, 1.2]) L.box(0.06, 0.9, 1.1, s, 0, 0, '#2a2d31');
      for (let k = 0; k < 8; k++) L.box(0.3, 0.01, 0.4, zw(r, -1.1, 1.1), 0.96, zw(r, -0.4, 0.4), waehle(r, ['#ffffff', '#f2c6d2', '#bcd3df', '#e9b44c']), zw(r, -0.5, 0.5));
      L.box(1.6, 1.2, 0.05, -0.4, 0.7, -1.0, '#c9a26b');
      for (let k = 0; k < 9; k++) L.box(0.3, 0.25, 0.02, -1.0 + (k % 3) * 0.55, 0.95 + Math.floor(k / 3) * 0.35, -0.97, waehle(r, PAL.damen));
      for (const s of [-1, 1]) L.box(0.45, 0.75, 0.45, s * 0.7, 0, 0.85, farbe);
    } },
    { art: 'raum', w: 4.6, d: 4.0, bau(S, sc, x, z, w, d, st, r, farbe) {
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        for (let k = 0; k < 4; k++) L.kugel(0.45, -1.2 + k * 0.8, 0.3, 0.3 + (k % 2) * 0.6, waehle(r, ['#e9b44c', '#d65a6f', '#5bc0eb', '#9bc53d']));
        L.box(1.8, 1.2, 0.05, 0, 0.8, -d / 2 + 0.3, '#ffffff'); for (let k = 0; k < 6; k++) L.box(0.3, 0.2, 0.02, -0.6 + (k % 3) * 0.6, 1.2 + Math.floor(k / 3) * 0.4, -d / 2 + 0.34, waehle(r, ['#f2c14e', '#f78fb3', '#9bc53d']));
      }, { name: 'Ideenraum', farbe });
    } },
  ],
  personal: [
    { art: 'raum', w: 4.4, d: 3.6, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Bewerbungsraum: kleiner runder Tisch, zwei Stühle gegenüber, Bewerbungsmappe
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        L.zyl(0.5, 0.5, 0.04, 0, 0.72, 0, '#f4f2ee', 16); L.zyl(0.06, 0.06, 0.72, 0, 0, 0, '#5a636b');
        buerostuhl(L, 0, -0.8, 0, 2, farbe); buerostuhl(L, 0, 0.8, PI, 2, farbe);
        L.box(0.3, 0.03, 0.22, 0, 0.77, 0, '#3f9a6a');
        figur(S, x + w / 2, z + d / 2 - 0.8, 401, 'leitung', { pose: 'sitzen', ry: 0 });
        figur(S, x + w / 2, z + d / 2 + 0.8, 402, 'kunde', { pose: 'sitzen', ry: PI });
        pflanze(L, w / 2 - 0.5, -d / 2 + 0.5, r, true);
      }, { name: 'Bewerbung', farbe });
    } },
    { art: 'wand', w: 4.0, d: 0.6, bau(S, sc, x, z, w, d, st, r) {
      // Personalakten in verschließbaren Schränken
      const L = lokal(S, x + w / 2, 0.06, z + 0.3, 0);
      for (let k = 0; k < 4; k++) { const u = -w / 2 + 0.5 + k; L.box(0.95, 1.9, 0.5, u, 0, 0, '#c9cdd0'); L.box(0.02, 1.8, 0.02, u, 0.05, 0.26, '#8c959b'); L.box(0.06, 0.12, 0.03, u + 0.1, 1.0, 0.26, '#3a3f45'); }
      text(L, 'Personalakten', 0, 2.15, 0.27, 0.22, '#ffffff', '#3f9a6a');
    } },
    { art: 'frei', w: 3.6, d: 3.0, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Schulungsecke: Flipchart, zwei Stuhlreihen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(0.04, 1.6, 0.04, -0.3, 0, -1.2, '#5a636b'); L.box(0.04, 1.6, 0.04, 0.3, 0, -1.2, '#5a636b'); L.box(0.8, 1.0, 0.03, 0, 1.0, -1.15, '#ffffff');
      text(L, 'Willkommen', 0, 1.7, -1.13, 0.12, '#3f9a6a'); L.box(0.5, 0.03, 0.01, 0, 1.35, -1.13, '#2f6fb3');
      for (let k = 0; k < 6; k++) { const u = -1.2 + (k % 3) * 1.2, v = Math.floor(k / 3) * 1.0; L.box(0.42, 0.05, 0.42, u, 0.44, v, farbe); L.box(0.42, 0.45, 0.05, u, 0.49, v + 0.2, farbe); L.box(0.04, 0.44, 0.04, u, 0, v, '#2a2d31'); }
    } },
    { art: 'wand', w: 2.4, d: 0.3, bau(S, sc, x, z, w, d, st, r) {
      const L = lokal(S, x + w / 2, 0.06, z + 0.06, 0);
      L.box(2.2, 1.2, 0.04, 0, 0.9, 0, '#c9a26b');
      for (let k = 0; k < 10; k++) L.box(0.32, 0.22, 0.02, -0.85 + (k % 5) * 0.42, 1.0 + Math.floor(k / 5) * 0.5, 0.03, waehle(r, ['#ffffff', '#f2c14e', '#9bc53d', '#bcd3df']));
      text(L, 'Wir suchen dich', 0, 2.3, 0.04, 0.2, '#ffffff', '#3f9a6a');
    } },
  ],
  immobilien: [
    { art: 'wand', w: 4.6, d: 0.4, bau(S, sc, x, z, w, d, st, r) {
      // Grundrisspläne an der Wand
      const L = lokal(S, x + w / 2, 0.06, z + 0.1, 0);
      for (let k = 0; k < 3; k++) {
        const u = -w / 2 + 0.8 + k * 1.5;
        L.box(1.3, 0.95, 0.03, u, 1.1, 0, '#ffffff');
        for (let i = 0; i < 4; i++) L.box(1.1, 0.02, 0.01, u, 1.2 + i * 0.22, 0.02, '#2f5f8a');
        for (let i = 0; i < 4; i++) L.box(0.02, 0.75, 0.01, u - 0.5 + i * 0.33, 1.2, 0.02, '#2f5f8a');
        L.box(0.3, 0.2, 0.01, u + 0.25, 1.45, 0.025, '#d23c32');
      }
      text(L, 'Standortplanung', 0, 2.35, 0.04, 0.22, '#ffffff', '#8a6440');
    } },
    { art: 'frei', w: 3.0, d: 2.4, bau(S, sc, x, z, w, d, st, r) {
      // Architekturmodell unter Glashaube, rotes Hartwig-Haus in der Mitte
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(2.2, 0.85, 1.5, 0, 0, 0, '#e9e4da'); L.box(2.1, 0.03, 1.4, 0, 0.85, 0, '#cfd6c9');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const mitte = i === 1 && j === 1; L.box(0.32, mitte ? 0.32 : zw(r, 0.12, 0.42), 0.28, -0.75 + i * 0.5, 0.88, -0.42 + j * 0.42, mitte ? '#d23c32' : '#ffffff'); }
      L.box(2.15, 0.6, 1.45, 0, 0.88, 0, GLAS);
      figur(S, x + w / 2 + 0.9, z + d / 2 + 1.1, 501, 'leitung', { ry: PI + 0.5, pose: 'schauen' });
    } },
    { art: 'frei', w: 2.2, d: 1.3, bau(S, sc, x, z, w, d, st, r) {
      // Planschrank mit flachen Schubladen und Planrollen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(1.8, 0.9, 1.0, 0, 0, 0, '#8c959b');
      for (let k = 0; k < 5; k++) L.box(1.7, 0.02, 0.02, 0, 0.15 + k * 0.16, 0.51, '#5a636b');
      for (let k = 0; k < 5; k++) L.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6).rotateZ(PI / 2), -0.5 + k * 0.05, 0.98 + (k % 2) * 0.08, -0.2 + k * 0.1, waehle(r, ['#ffffff', '#e8e4dc', '#bcd3df']));
    } },
    { art: 'raum', w: 4.8, d: 4.0, bau(S, sc, x, z, w, d, st, r, farbe) {
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        L.box(2.6, 0.05, 1.1, 0, 0.72, 0.2, '#7b5a40'); L.box(0.2, 0.72, 0.8, 0, 0, 0.2, '#2a2d31');
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) buerostuhl(L, (k - 0.5) * 1.2, 0.2 + s * 0.9, s > 0 ? PI : 0, 2, farbe);
        L.box(1.0, 0.02, 0.7, 0.2, 0.78, 0.2, '#ffffff');
      }, { name: 'Mietverhandlung', farbe });
    } },
  ],
  logistik: [
    { art: 'wand', w: 5.2, d: 0.4, bau(S, sc, x, z, w, d, st, r) {
      // Leitstand-Karte: Landkarte mit Filialen und Touren
      const L = lokal(S, x + w / 2, 0.06, z + 0.1, 0);
      L.box(w, 2.2, 0.06, 0, 0.6, 0, '#22272c');
      L.box(w - 0.2, 2.0, 0.02, 0, 0.7, 0.04, '#cfe0d2');
      const umriss = [[-0.6, 0.6], [0.2, 0.8], [0.7, 0.3], [0.5, -0.4], [0.9, -0.8], [-0.2, -0.85], [-0.8, -0.3]];
      for (const [a, b] of umriss) L.box(0.7, 0.55, 0.01, a, 1.7 + b * 0.8, 0.055, '#b5d1b9');
      const pkt = Array.from({ length: 14 }, () => [zw(r, -1.8, 1.8), zw(r, 0.9, 2.5)]);
      for (const [a, b] of pkt) L.box(0.08, 0.08, 0.01, a, b, 0.065, '#d23c32');
      for (let k = 0; k < 6; k++) { const [a1, b1] = pkt[k], [a2, b2] = pkt[k + 6]; const l = wurzelSumme(a2 - a1, b2 - b1); L.geo(new THREE.BoxGeometry(l, 0.025, 0.01).rotateZ(Math.atan2(b2 - b1, a2 - a1)), (a1 + a2) / 2, (b1 + b2) / 2, 0.06, '#e07b2a'); }
      text(L, 'Leitstand Filialbelieferung', 0, 2.95, 0.07, 0.22, '#ffffff', '#e07b2a');
    } },
    { art: 'frei', w: 4.6, d: 2.6, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Leitstand-Pult: Tischbogen mit vielen Bildschirmen
      const L = lokal(S, x + w / 2, 0.06, z + 1.0, 0);
      for (let k = -2; k <= 2; k++) {
        const P = L.sub(k * 0.95, Math.abs(k) * 0.25, -k * 0.22);
        P.box(0.95, 0.05, 0.8, 0, 0.72, 0, '#d9d6cf'); P.box(0.9, 0.7, 0.05, 0, 0, -0.35, '#7f8a92');
        for (let m2 = 0; m2 < 2; m2++) { P.box(0.42, 0.3, 0.04, (m2 - 0.5) * 0.45, 0.95 + 0 * m2, -0.25, '#22272c'); P.box(0.38, 0.25, 0.01, (m2 - 0.5) * 0.45, 0.97, -0.225, m2 ? '#b7d7c4' : '#f2d29a'); }
        P.box(0.85, 0.3, 0.04, 0, 1.3, -0.3, '#22272c'); P.box(0.8, 0.25, 0.01, 0, 1.32, -0.275, '#9cc9e0');
        if (k % 2 === 0) buerostuhl(P, 0, 0.75, PI, Math.max(1, st), farbe);
      }
    } },
    { art: 'frei', w: 2.6, d: 1.6, bau(S, sc, x, z, w, d, st, r) {
      // Musterpalette mit Kartons und Rollcontainer
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(1.2, 0.14, 0.8, -0.6, 0, 0, '#c9a26b');
      for (let k = 0; k < 6; k++) L.box(0.38, 0.32, 0.36, -0.95 + (k % 3) * 0.4, 0.14 + Math.floor(k / 3) * 0.33, 0, waehle(r, ['#c9a26b', '#b8925e', '#d6b27c']));
      L.box(0.7, 1.5, 0.7, 0.75, 0.1, 0, '#c9d2d8'); for (let k = 0; k < 3; k++) L.box(0.6, 0.3, 0.6, 0.75, 0.2 + k * 0.45, 0, waehle(r, PAL.waren));
    } },
    { art: 'wand', w: 2.6, d: 0.3, bau(S, sc, x, z, w, d, st, r) {
      const L = lokal(S, x + w / 2, 0.06, z + 0.06, 0);
      L.box(2.4, 1.3, 0.04, 0, 0.8, 0, '#ffffff');
      for (let i = 0; i < 5; i++) { L.box(2.2, 0.02, 0.01, 0, 0.95 + i * 0.22, 0.03, '#c9cdd0'); for (let k = 0; k < 4; k++) if (r() < 0.7) L.box(0.25, 0.12, 0.02, -0.9 + k * 0.55 + zw(r, 0, 0.2), 1.0 + i * 0.22, 0.035, waehle(r, ['#e07b2a', '#2f6fb3', '#3ab27a', '#d23c32'])); }
      text(L, 'Tourenplan', 0, 2.25, 0.04, 0.2, '#ffffff', '#e07b2a');
    } },
  ],
  ecommerce: [
    { art: 'frei', w: 3.6, d: 3.0, bau(S, sc, x, z, w, d, st, r) {
      // Fotoplatz: Lichtzelt, zwei Leuchten, Kamera, Produkte
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(1.6, 0.8, 1.0, 0, 0, -0.5, '#e9e6df'); L.box(1.3, 1.0, 0.9, 0, 0.8, -0.5, '#ffffff');
      L.box(1.1, 0.8, 0.02, 0, 0.9, -0.04, '#f6f6f2');
      L.box(0.3, 0.3, 0.3, -0.2, 0.82, -0.5, '#d23c32'); L.box(0.2, 0.4, 0.2, 0.25, 0.82, -0.5, '#2f6fb3');
      for (const s of [-1, 1]) { L.box(0.04, 1.7, 0.04, s * 1.3, 0, 0.2, '#2a2d31'); L.geo(new THREE.BoxGeometry(0.6, 0.6, 0.2).rotateY(s * 0.7), s * 1.3, 1.8, 0.2, '#ffffff'); }
      L.box(0.04, 1.2, 0.04, 0, 0, 1.2, '#2a2d31'); L.box(0.25, 0.18, 0.3, 0, 1.2, 1.2, '#1e2328');
      text(L, 'Produktfotos', 0, 2.2, -0.95, 0.2, '#ffffff', '#7a4fc0');
    } },
    { art: 'frei', w: 4.0, d: 2.4, bau(S, sc, x, z, w, d, st, r) {
      // Packtische mit Kartons, Klebeband, Waage, Paketregal
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      for (const s of [-1, 1]) {
        const u = s * 1.0;
        L.box(1.8, 0.05, 0.9, u, 0.88, 0, '#d9d6cf'); L.box(1.7, 0.88, 0.05, u, 0, -0.4, '#9aa3aa');
        L.box(0.5, 0.35, 0.4, u - 0.4, 0.93, 0.05, '#c9a26b'); L.box(0.4, 0.25, 0.3, u + 0.4, 0.93, 0.1, '#b8925e');
        L.zyl(0.08, 0.08, 0.05, u + 0.05, 0.93, -0.25, '#a9b2b8', 8);
        L.box(1.6, 0.05, 0.3, u, 1.5, -0.3, '#d9d6cf'); L.box(1.6, 0.6, 0.02, u, 0.93, -0.44, '#9aa3aa');
        for (let k = 0; k < 4; k++) L.box(0.3, 0.2, 0.25, u - 0.6 + k * 0.4, 1.55, -0.3, waehle(r, ['#c9a26b', '#d6b27c', '#f4f2ee']));
      }
      figur(S, x + w / 2 - 1.0, z + d / 2 + 0.75, 601, 'lager', { ry: PI, pose: 'stehen' });
    } },
    { art: 'wand', w: 3.2, d: 1.0, bau(S, sc, x, z, w, d, st, r) {
      // Serverschränke mit Leuchtdioden und Live-Bildschirm Bestellungen
      const L = lokal(S, x + w / 2, 0.06, z + 0.5, 0);
      for (const s of [-1, 1]) { L.box(0.7, 2.1, 0.9, s * 1.0, 0, 0, '#1e2328'); for (let k = 0; k < 8; k++) L.box(0.5, 0.03, 0.01, s * 1.0, 0.3 + k * 0.22, 0.46, k % 3 ? '#3ab27a' : '#5bc0eb'); }
      L.box(1.1, 0.7, 0.05, 0, 1.2, -0.3, '#22272c'); L.box(1.0, 0.6, 0.01, 0, 1.25, -0.27, '#f4f6f8'); linie(L, 0, 1.3, -0.26, 0.8, 0.45, r, '#7a4fc0');
      text(L, 'Bestellungen live', 0, 2.05, -0.27, 0.15, '#ffffff', '#7a4fc0');
    } },
    { art: 'wand', w: 3.0, d: 0.7, bau(S, sc, x, z, w, d, st, r) {
      const L = lokal(S, x + w / 2, 0.06, z + 0.35, 0);
      regal(L, 0, 0, w, 2.0, '#9aa3aa', (lx, y, lz, ww) => { for (let u = lx - ww / 2 + 0.25; u < lx + ww / 2 - 0.15; u += 0.45) L.box(0.4, zw(r, 0.2, 0.35), 0.4, u, y, lz, waehle(r, ['#c9a26b', '#d6b27c', '#b8925e', '#f4f2ee'])); }, r, 0.6);
      text(L, 'Retouren', 0, 2.2, 0.32, 0.2, '#ffffff', '#7a4fc0');
    } },
  ],
  recht: [
    { art: 'wand', w: 5.4, d: 0.5, bau(S, sc, x, z, w, d, st, r) {
      // Aktenregale bis unter die Decke
      const L = lokal(S, x + w / 2, 0.06, z + 0.25, 0);
      regal(L, 0, 0, w, 2.6, '#7b5a40', ordner(L, r, ['#8a2f3a', '#2b3a55', '#3a3f47', '#6b5a48', '#e8e4dc']), r, 0.45, 6);
      text(L, 'Verträge', 0, 2.85, 0.24, 0.22, '#ffffff', '#8a2f3a');
    } },
    { art: 'frei', w: 4.2, d: 2.6, bau(S, sc, x, z, w, d, st, r) {
      // freistehende Archivregale (zwei Reihen)
      for (let k = 0; k < 2; k++) { const L = lokal(S, x + w / 2, 0.06, z + 0.4 + k * 1.6, 0); regal(L, 0, 0, w - 0.4, 2.0, '#c9cdd0', ordner(L, r, ['#8a2f3a', '#2b3a55', '#c9b48f', '#e8e4dc']), r, 0.5, 5); }
    } },
    { art: 'raum', w: 5.0, d: 4.0, bau(S, sc, x, z, w, d, st, r, farbe) {
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        L.box(2.6, 0.06, 1.2, 0, 0.72, 0.3, '#5a3b22'); L.box(0.25, 0.72, 0.9, 0, 0, 0.3, '#3a2a20');
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) buerostuhl(L, (k - 0.5) * 1.2, 0.3 + s * 0.95, s > 0 ? PI : 0, 2, '#3a2a20');
        for (const s of [-0.6, 0.6]) { L.box(0.04, 0.3, 0.04, s, 0.78, 0.3, '#c9b16a'); L.box(0.25, 0.08, 0.15, s, 1.06, 0.3, '#2f6f4f'); }
        regal(L, 0, -d / 2 + 0.35, w - 0.8, 2.2, '#5a3b22', ordner(L, r, ['#6b2737', '#2b3a55', '#3a2a20']), r, 0.4, 5);
      }, { name: 'Rechtsabteilung', farbe });
    } },
    { art: 'frei', w: 1.6, d: 1.2, bau(S, sc, x, z, w, d, st, r) {
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(0.9, 1.2, 0.8, -0.2, 0, 0, '#5a636b'); L.zyl(0.15, 0.15, 0.05, -0.2, 0.7, 0.4, '#c9d2d8', 10);
      L.box(0.6, 0.6, 0.5, 0.55, 0.15, 0.1, '#8c959b'); for (let k = 0; k < 4; k++) L.box(0.08, 0.3, 0.4, 0.35 + k * 0.12, 0.75, 0.1, waehle(r, ['#8a2f3a', '#2b3a55']));
    } },
  ],
  vm: [
    { art: 'frei', w: 3.6, d: 2.4, bau(S, sc, x, z, w, d, st, r) {
      // Dekowerkstatt: Werkbank mit Werkzeug, Farbdosen, Stoffbahnen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(2.8, 0.08, 1.0, 0, 0.88, -0.3, '#b98d61'); for (const s of [-1.3, 1.3]) L.box(0.1, 0.88, 0.9, s, 0, -0.3, '#7b5a40');
      L.box(2.8, 1.2, 0.05, 0, 0.96, -0.82, '#c9a26b'); for (let k = 0; k < 8; k++) L.box(0.06, zw(r, 0.2, 0.4), 0.04, -1.2 + k * 0.33, 1.5, -0.78, waehle(r, ['#5a636b', '#d23c32', '#e9b44c']));
      for (let k = 0; k < 4; k++) L.zyl(0.12, 0.12, 0.2, -1.0 + k * 0.3, 0.96, -0.2, waehle(r, ['#1f9aa8', '#d65a6f', '#f2c14e', '#ffffff']), 8);
      L.box(0.9, 0.04, 0.6, 0.6, 0.96, -0.25, '#f2c6d2', 0.3);
      L.geo(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8).rotateZ(PI / 2), 0, 0.15, 0.6, '#1f9aa8');
      figur(S, x + w / 2 + 0.3, z + d / 2 + 0.6, 701, 'handwerker', { ry: PI, pose: 'stehen' });
    } },
    { art: 'frei', w: 3.4, d: 1.8, bau(S, sc, x, z, w, d, st, r) {
      // Figurinengruppe auf Podest
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(3.0, 0.2, 1.2, 0, 0, 0, '#ffffff');
      for (let k = 0; k < 4; k++) puppe(L.hoch(0.2), -1.1 + k * 0.73, (k % 2) * 0.2 - 0.1, r, k % 2 ? 'herren' : 'damen', k % 2 ? PAL.herren : PAL.damen, zw(r, -0.4, 0.4));
    } },
    { art: 'wand', w: 4.0, d: 0.6, bau(S, sc, x, z, w, d, st, r) {
      // Dekomaterial: Regal mit Kisten, Kugeln, Girlanden
      const L = lokal(S, x + w / 2, 0.06, z + 0.3, 0);
      regal(L, 0, 0, w, 2.2, '#f2efe8', (lx, y, lz, ww, hh, k) => { for (let u = lx - ww / 2 + 0.25; u < lx + ww / 2 - 0.15; u += 0.45) if (k % 2) L.kugel(0.15, u, y + 0.15, lz, waehle(r, ['#d23c32', '#e9b44c', '#1f9aa8', '#ffffff'])); else L.box(0.4, 0.28, 0.38, u, y, lz, waehle(r, ['#1f9aa8', '#e9e4da', '#d65a6f'])); }, r);
      text(L, 'Deko Saison', 0, 2.45, 0.32, 0.22, '#ffffff', '#1f9aa8');
    } },
    { art: 'frei', w: 3.6, d: 2.2, bau(S, sc, x, z, w, d, st, r) {
      // Schaufenster-Probeaufbau: Rahmen, Rückwand, zwei Figurinen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(3.2, 0.25, 1.6, 0, 0, 0, '#e9e4da'); L.box(3.2, 2.4, 0.06, 0, 0, -0.8, '#1f9aa8');
      for (const s of [-1, 1]) L.box(0.15, 2.6, 0.15, s * 1.6, 0, 0.8, '#3a4048'); L.box(3.35, 0.15, 0.15, 0, 2.6, 0.8, '#3a4048');
      for (const s of [-0.6, 0.6]) puppe(L.hoch(0.25), s, -0.1, r, 'damen', PAL.damen, s * 0.4);
      text(L, 'Probeaufbau', 0, 2.0, -0.76, 0.24, '#ffffff');
    } },
  ],
  verwaltung: [
    { art: 'wand', w: 5.0, d: 0.5, bau(S, sc, x, z, w, d, st, r) {
      // Ordnerwand der Buchhaltung
      const L = lokal(S, x + w / 2, 0.06, z + 0.25, 0);
      regal(L, 0, 0, w, 2.2, '#c9cdd0', ordner(L, r, ['#2f5f8a', '#5f6b78', '#9aa3aa', '#2b3a55']), r, 0.45, 5);
      text(L, 'Buchhaltung', 0, 2.45, 0.24, 0.22, '#ffffff', '#5f6b78');
    } },
    { art: 'frei', w: 3.0, d: 1.8, bau(S, sc, x, z, w, d, st, r) {
      // Poststelle: Fächerregal und Postwagen
      const L = lokal(S, x + w / 2, 0.06, z + 0.4, 0);
      L.box(2.4, 1.6, 0.45, 0, 0, 0, '#d8bf98');
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { L.box(0.36, 0.32, 0.02, -1.0 + i * 0.4, 0.15 + j * 0.37, 0.23, '#b98d61'); if (r() < 0.6) L.box(0.28, 0.06, 0.2, -1.0 + i * 0.4, 0.2 + j * 0.37, 0.15, '#ffffff'); }
      text(L, 'Poststelle', 0, 1.8, 0.24, 0.2, '#ffffff', '#5f6b78');
      const W = L.sub(0.6, 1.0, 0); W.box(0.9, 0.6, 0.6, 0, 0.2, 0, '#9aa3aa'); W.box(0.8, 0.3, 0.5, 0, 0.8, 0, '#f2c14e'); for (const s of [-0.35, 0.35]) W.zyl(0.08, 0.08, 0.06, s, 0, 0.25, '#2a2d31', 6);
    } },
    { art: 'frei', w: 2.4, d: 1.6, bau(S, sc, x, z, w, d, st, r) {
      // Kopierer und Papierstapel
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(1.1, 1.0, 0.8, -0.4, 0, 0, '#e9e6df'); L.box(1.1, 0.12, 0.8, -0.4, 1.0, 0, '#9aa3aa'); L.box(0.3, 0.15, 0.04, -0.6, 0.95, 0.41, '#3a3f45');
      for (let k = 0; k < 4; k++) L.box(0.32, 0.12, 0.45, 0.6, k * 0.13, 0, '#ffffff');
    } },
    { art: 'raum', w: 4.4, d: 3.6, bau(S, sc, x, z, w, d, st, r, farbe) {
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        L.box(1.8, 0.05, 0.8, 0, 0.72, 0.1, '#f2f0ea'); L.box(1.7, 0.72, 0.05, 0, 0, -0.25, '#9aa3aa');
        monitor(L.sub(0, -0.1), 0, 0, 2, r); buerostuhl(L, 0, 0.8, PI, 2, farbe);
        L.box(0.5, 1.2, 0.5, -1.6, 0, -1.3, '#5a636b'); L.zyl(0.1, 0.1, 0.04, -1.6, 0.8, -1.05, '#c9d2d8', 8);
        figur(S, x + w / 2, z + d / 2 + 0.8, 801, 'leitung', { pose: 'sitzen', ry: PI });
      }, { name: 'Kasse und Tresor', farbe });
    } },
  ],
};

// ------------------------------------------------------------------ allgemeine Räume
function leitungsbuero(S, sc, x, z, w, d, st, r, farbe) {
  glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
    L.box(1.8, 0.05, 0.85, 0, 0.72, -0.2, st === 3 ? '#7b5a40' : '#f2f0ea'); L.box(1.7, 0.72, 0.05, 0, 0, -0.6, '#9aa3aa');
    monitor(L.sub(0, -0.45), 0, 0, st, r); buerostuhl(L, 0, 0.4, PI, st, farbe);
    for (const s of [-0.5, 0.5]) buerostuhl(L, s, -1.25, 0, 1, farbe);
    pflanze(L, w / 2 - 0.45, d / 2 - 0.45, r, true);
    if (st === 3) { L.box(1.6, 0.4, 0.7, -w / 2 + 1.0, 0, d / 2 - 0.5, '#5f7f8c'); }
    figur(S, x + w / 2, z + d / 2 + 0.4, Math.floor(r() * 1e4), 'leitung', { pose: 'sitzen', ry: PI });
  }, { name: 'Leitung', farbe });
}
function besprechung(S, sc, x, z, w, d, st, r, farbe) {
  glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
    const n = Math.max(2, Math.floor((w - 1.2) / 0.85));
    L.box(n * 0.85, 0.05, 1.1, 0, 0.72, 0.1, st >= 2 ? '#d8bf98' : '#e9e6df'); L.box(0.2, 0.72, 0.8, 0, 0, 0.1, '#9aa3aa');
    for (const s of [-1, 1]) for (let k = 0; k < n; k++) buerostuhl(L, (k - (n - 1) / 2) * 0.85, 0.1 + s * 0.9, s > 0 ? PI : 0, Math.max(1, st), farbe);
    L.box(1.6, 0.95, 0.06, 0, 1.0, -d / 2 + 0.12, '#22272c'); L.box(1.5, 0.85, 0.01, 0, 1.05, -d / 2 + 0.16, '#cfe3ec');
    for (let k = 0; k < Math.min(3, n); k++) figur(S, x + w / 2 + (k - 1) * 0.85, z + d / 2 + 0.1 + (k % 2 ? 0.9 : -0.9), Math.floor(r() * 1e4), 'kunde', { pose: 'sitzen', ry: k % 2 ? PI : 0 });
  }, { name: 'Besprechung', farbe });
}
function telefonboxen(S, sc, x, z, w, d, st, r, farbe) {
  for (let k = 0; k < 2; k++) {
    const L = lokal(S, x + 0.65 + k * 1.3, 0.06, z + d / 2, 0);
    L.box(1.2, 2.3, 0.08, 0, 0, -0.55, farbe); for (const s of [-1, 1]) L.box(0.08, 2.3, 1.1, s * 0.56, 0, 0, dunkler(farbe, 0.08));
    L.box(1.2, 0.1, 1.2, 0, 2.3, 0, dunkler(farbe, 0.1)); L.box(1.04, 2.2, 0.04, 0, 0.05, 0.56, GLAS);
    L.box(0.9, 0.45, 0.45, 0, 0, -0.25, '#e9e4da'); L.box(0.5, 0.04, 0.3, 0, 0.75, 0.15, '#f2f0ea');
  }
}
function lounge(S, sc, x, z, w, d, st, r, farbe) {
  const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
  L.box(w - 0.4, 0.02, d - 0.4, 0, 0, 0, '#e2c9b8');
  L.box(2.4, 0.42, 0.9, 0, 0, -d / 2 + 0.7, '#5f7f8c'); L.box(2.4, 0.45, 0.25, 0, 0.42, -d / 2 + 0.35, '#536f7a');
  L.box(0.9, 0.42, 0.9, -1.4, 0, 0.3, farbe); L.zyl(0.45, 0.45, 0.4, 0.2, 0, 0.3, '#d8bf98', 12);
  pflanze(L, w / 2 - 0.5, -d / 2 + 0.5, r, true);
  figur(S, x + w / 2 - 0.4, z + 0.85, Math.floor(r() * 1e4), 'kunde', { pose: 'sitzen', ry: 0 });
}
function druckerecke(L, r) {
  L.box(1.4, 0.75, 0.6, 0, 0, 0, '#d9d6cf');
  L.box(0.6, 0.35, 0.5, -0.3, 0.75, 0, '#e9e6df'); L.box(0.5, 0.08, 0.3, -0.3, 1.1, 0.05, '#5a636b');
  for (let k = 0; k < 3; k++) L.box(0.3, 0.06, 0.42, 0.4, 0.75 + k * 0.07, 0, '#ffffff');
  L.box(0.35, 0.5, 0.35, 0.95, 0, 0.1, '#3a6fb3');
}

// ------------------------------------------------------------------ Etage
export function hqEtage(S, scene, g, nr, opt = {}) {
  vorbereiten(S, scene);
  const n0 = S.anzahl;
  const em = hqEtagenMasse(g, nr), B = em.w, T = em.d;
  const et = g.etagen.find((e) => e.nr === nr) ?? g.etagen[0];
  const angebot = !('gemietet' in et);
  const miet = !angebot && !!et.gemietet;
  const abt = (miet ? et.abteilungen ?? [] : []).map((a) => ({ ...a, stufe: opt.stufe ?? a.stufe }));
  const r = rng(hashText(g.id) + nr * 101 + (opt.stufe ?? 0) * 7);
  const wand = WAND[g.typ] ?? WAND.nachkrieg, front = FRONT[g.typ] ?? '#eeebe3';
  const G = new Raster(B, T);
  const figuren = { n: 0 };

  // Bodenplatte, Kante zur Etage darunter (Fassadenband)
  S.box(B + 0.6, 0.45, T + 0.6, B / 2 - 0.3, -0.225, T / 2 - 0.3, '#59626a');
  S.box(B + 0.3, 1.3, 0.3, B / 2, -1.1, T + 0.15, front);
  S.box(0.3, 1.3, T + 0.3, B + 0.15, -1.1, T / 2, dunkler(front, 0.04));
  S.box(B + 0.4, 0.12, 0.4, B / 2, -0.04, T + 0.2, heller(front, 0.04));
  S.box(0.4, 0.12, T + 0.4, B + 0.2, -0.04, T / 2, heller(front, 0.03));
  for (let u = 1.25; u < B; u += 2.5) S.box(1.6, 0.8, 0.05, u, -1.0, T + 0.31, SCHEIBE);
  for (let u = 1.25; u < T; u += 2.5) S.box(0.05, 0.8, 1.6, B + 0.31, -1.0, u, SCHEIBE);

  // Rückwände mit Fenstern (je Gebäudetyp)
  rueckwand(S, 'x', 0, B, 0, 0, WH, { putz: wand.putz, pilaster: wand.pilaster, pilasterAbstand: 7.5, pilasterVersatz: 0 });
  rueckwand(S, 'z', 0, T, 0, 0, WH, { putz: dunkler(wand.putz, 0.02), pilaster: wand.pilaster, pilasterAbstand: 7.5, pilasterVersatz: 0 });
  const fenster = (achse, a, b) => {
    for (let u = a + 1.25; u < b - 0.6; u += 2.5) {
      const voll = wand.fenster === 'glas', hoch = wand.fenster === 'hoch', stahl = wand.fenster === 'stahl';
      const y0 = voll ? 0.15 : hoch ? 0.75 : stahl ? 0.6 : 1.0, y1 = voll ? WH - 0.25 : hoch ? WH - 0.35 : stahl ? WH - 0.3 : WH - 0.5, fw = voll ? 2.3 : hoch ? 1.3 : stahl ? 2.1 : 2.2;
      if (achse === 'x') S.box(fw, y1 - y0, 0.04, u, (y0 + y1) / 2, 0.24, SCHEIBE); else S.box(0.04, y1 - y0, fw, 0.24, (y0 + y1) / 2, u, SCHEIBE);
      if (stahl) for (const t of [-0.35, 0.35]) { if (achse === 'x') S.box(0.05, y1 - y0, 0.05, u + t * fw, (y0 + y1) / 2, 0.27, '#2f3438'); else S.box(0.05, y1 - y0, 0.05, 0.27, (y0 + y1) / 2, u + t * fw, '#2f3438'); }
    }
  };
  // Kern an der -x-Seite: Treppenhaus, Aufzug, WC; davor Teeküche bzw. Empfang (EG)
  const K = 8, tt = Math.min(10, T - 6);
  fenster('x', K, B);
  fenster('z', tt, T);
  treppenhaus(S, 0, 0, 5, tt, 0, WH, {});
  aufzug(S, 5.2, 0.3, 0, WH);
  S.box(2.6, WH, 0.15, 6.5, WH / 2, 3.4, '#e6e0d6'); S.box(0.15, WH, tt - 3.4, 7.9, WH / 2, 3.4 + (tt - 3.4) / 2, '#ddd6ca');
  S.box(0.9, 2.1, 0.05, 6.6, 1.1, 3.5, '#9aa3aa');
  if (scene) wandschild(S, scene, 'WC', 'x', 7.4, 2.5, 3.5, { farbe: '#3a4048', hoehe: 0.3 });
  G.setze(0, 0, K, tt + 0.5);
  const geschoss = nr === 0 ? 'EG' : `${nr}. OG`;
  if (scene) wandschild(S, scene, geschoss, 'z', tt + 1.6, 2.7, 0.3, { farbe: '#3a4048', hoehe: 0.45 });
  const stufeMax = abt.length ? Math.max(...abt.map((a) => a.stufe)) : 1;
  if (miet && nr === 0) empfang(S, scene, K, tt, T, r, G);
  else if (miet) teekueche(S, scene, K, tt, T, stufeMax, r, G);

  // Zonen: Breite je Abteilung aus FTE × 14 m², Rest Leerfläche (gemietet) bzw. roh (frei)
  const vs = opt.vorstand;
  const vorstandHier = !!vs && miet && (vs.immer || (vs.etage && vs.etage.gebaeudeId === g.id && vs.etage.nr === nr));
  let x0 = K + 0.3, nutz = B - x0, vorstandB = 0;
  if (vorstandHier) {
    const abtB = abt.reduce((q, a) => q + Math.max(5, (a.fte * 14) / T), 0);
    vorstandB = Math.max(Math.min(22, nutz), Math.min(26, nutz - abtB));
    x0 += vorstandB; nutz -= vorstandB;
  }
  const archivStart = x0;
  const archivBreite = miet && et.archiv ? Math.min(10, Math.max(5, 90 / T)) : 0;
  x0 += archivBreite; nutz -= archivBreite;
  let breiten = abt.map((a) => (a.fte * 14) / T);
  const summe = breiten.reduce((a, b) => a + b, 0);
  if (summe > nutz) breiten = breiten.map((b) => (b * nutz) / summe);
  breiten = breiten.map((b) => Math.max(5, Math.round(b * 2) / 2));
  const zonen = [];
  if (vorstandHier) zonen.push({ art: 'vorstand', x0: K + 0.3, x1: archivStart });
  if (archivBreite) zonen.push({ art: 'archiv', x0: archivStart, x1: x0 });
  let xa = x0;
  abt.forEach((a, i) => { const xb = i === abt.length - 1 && nutz - (xa - x0) - breiten[i] < 3 ? B : Math.min(B, xa + breiten[i]); zonen.push({ art: 'abt', a, x0: xa, x1: xb }); xa = xb; });
  if (B - xa >= 0.5) zonen.push({ art: miet ? 'leer' : 'frei', x0: xa, x1: B });
  for (const [k, Z] of zonen.entries()) {
    if (k > 0) trennwand(S, Z.x0, T);
    if (Z.art === 'vorstand') vorstandZone(S, scene, Z, T, G, r, figuren, vs.ressorts ?? []);
    else if (Z.art === 'archiv') archivZone(S, scene, Z, T);
    else if (Z.art === 'abt') abteilungsZone(S, scene, Z, T, G, r, figuren, g);
    else if (Z.art === 'leer') leerZone(S, scene, Z, T, r);
    else rohZone(S, scene, Z, T, r);
  }
  if (!miet) { boden(S, 0, tt, K, T - tt, 0, BELAG_ROH, 1); if (scene) wandschild(S, scene, 'ZU VERMIETEN', 'z', tt + (T - tt) / 2 + 0.3, 1.9, 0.3, { farbe: ROT, hoehe: 0.55 }); }
  let box = new THREE.Box3(new THREE.Vector3(-0.6, -1.8, -0.6), new THREE.Vector3(B + 0.4, WH, T + 0.4));
  // Ausschnitt auf eine Abteilung (opt.zone = Abteilungs-Id oder true für die erste)
  const zz = opt.zone && zonen.find((q) => (opt.zone === 'vorstand' ? q.art === 'vorstand' : q.art === 'abt' && (opt.zone === true || q.a.id === opt.zone)));
  if (zz) box = new THREE.Box3(new THREE.Vector3(zz.x0 - 1, -1.8, -0.6), new THREE.Vector3(zz.x1 + 0.4, WH, T + 0.4));
  return { box, anzahl: S.anzahl - n0, figuren: figuren.n, zonen: zonen.map((z) => ({ art: z.art, id: z.a?.id, breite: z.x1 - z.x0 })), breite: B, tiefe: T };
}

/** Eine kleine, reine Schauabteilung mit alten Schildern, Tüten und Aktenvitrinen. */
function archivZone(S, scene, Z, T) {
  const x = Z.x0, w = Z.x1 - Z.x0;
  boden(S, x, 0, w, T, 0, '#9d8062', 1);
  const X = x + w / 2;
  if (scene) wandschild(S, scene, 'ARCHIV', 'z', X, 2.65, 0.35, { farbe: '#783b31', hoehe: 0.48 });
  for (let i = 0; i < 3; i++) {
    const z = 2.4 + i * Math.max(2.4, (T - 6) / 3);
    // Regalwände mit Buchrücken, Akten und Kartons.
    S.box(w - 1.5, 2.4, 0.42, X, 1.25, z, '#68472f');
    for (let k = 0; k < 11; k++) {
      const px = x + 1.1 + (k + 0.5) * (w - 2.2) / 11;
      S.box((w - 2.2) / 14, 0.55 + (k % 3) * 0.14, 0.06, px, 0.68, z + 0.26, ['#a66d46', '#5b6575', '#c8b78b'][k % 3]);
    }
  }
  // Glasvitrinen mit rot-weißen Tragetaschen und historischen Schriftzügen.
  for (const z of [T * 0.38, T * 0.67]) {
    const p = lokal(S, X, 0.07, z, 0);
    p.box(Math.min(3.6, w - 1), 1.45, 1.25, 0, 0.74, 0, '#c5d5d8');
    p.box(Math.min(3.8, w - 0.8), 0.12, 1.35, 0, 1.51, 0, '#765e45');
    for (let k = -1; k <= 1; k++) {
      p.box(0.58, 0.7, 0.18, k * 0.85, 0.75, 0.15, k ? '#f1e8d6' : '#b63d35');
      p.box(0.4, 0.05, 0.03, k * 0.85, 1.05, 0.26, '#7d352f');
    }
  }
}

function trennwand(S, x, T) {
  // Glaswand mit Durchgang zwischen zwei Zonen
  const tuer0 = T * 0.62, tuer1 = tuer0 + 1.6;
  for (const [a, b] of [[0.6, tuer0], [tuer1, T - 0.2]]) S.box(0.05, WH - 0.5, b - a, x, 0.06 + (WH - 0.5) / 2, (a + b) / 2, GLAS);
  S.box(0.1, 0.12, T - 0.8, x, WH - 0.4, T / 2 + 0.2, '#3a4048');
  for (const z of [0.6, tuer0, tuer1, T - 0.2]) S.box(0.1, WH - 0.4, 0.1, x, (WH - 0.4) / 2, z, '#3a4048');
}

function teekueche(S, scene, K, tt, T, st, r, G) {
  const L = lokal(S, 0.6, 0.06, tt + 0.6, 0);
  boden(S, 0, tt, K, T - tt, 0, BELAG[Math.min(3, st)], 1);
  const lang = Math.min(4.2, T - tt - 1.6);
  // Zeile an der -x-Wand
  const Z = lokal(S, 0.6, 0.06, tt + 0.5 + lang / 2, PI / 2);
  Z.box(lang, 0.88, 0.62, 0, 0, 0, st >= 2 ? '#f2f0ea' : '#d9d6cf'); Z.box(lang, 0.05, 0.66, 0, 0.88, 0, st >= 2 ? '#7b5a40' : '#9aa3aa');
  Z.box(0.6, 0.04, 0.4, -lang / 2 + 1.0, 0.9, 0, '#c9d2d8');
  Z.box(0.4, 0.45, 0.35, lang / 2 - 0.8, 0.93, -0.05, '#2a2d31'); Z.box(0.15, 0.1, 0.05, lang / 2 - 0.8, 1.15, 0.13, '#d23c32');
  Z.box(0.7, 2.0, 0.65, lang / 2 + 0.4, 0, 0, '#e9e6df');
  Z.box(lang, 0.6, 0.35, 0, 1.6, -0.15, st >= 2 ? '#f2f0ea' : '#c9cdd0');
  // Stehtisch oder Tisch mit Stühlen
  const tx = 4.6, tz = tt + 2.4;
  const P = lokal(S, tx, 0.06, tz, 0);
  P.zyl(0.55, 0.55, 0.04, 0, 0.74, 0, '#f4f2ee', 14); P.zyl(0.06, 0.06, 0.74, 0, 0, 0, '#5a636b');
  for (let k = 0; k < 3; k++) { const a = k * 2.1; P.box(0.42, 0.05, 0.42, Math.sin(a) * 0.85, 0.44, Math.cos(a) * 0.85, st >= 2 ? '#d23c32' : '#6b7785'); P.box(0.04, 0.44, 0.04, Math.sin(a) * 0.85, 0, Math.cos(a) * 0.85, '#2a2d31'); }
  figur(S, tx + 0.8, tz + 0.9, Math.floor(r() * 1e4), 'kunde', { ry: PI + 0.6, pose: 'stehen' });
  figur(S, 1.5, tt + 1.6, Math.floor(r() * 1e4), 'kunde', { ry: -PI / 2, pose: 'telefon' });
  if (scene) wandschild(S, scene, 'Teeküche', 'z', tt + 0.5 + lang / 2, 2.6, 0.25, { farbe: '#3a4048', hoehe: 0.3 });
  if (st >= 2) pflanze(lokal(S, K - 0.7, 0.06, T - 1.2, 0), 0, 0, r, true);
}

function empfang(S, scene, K, tt, T, r, G) {
  boden(S, 0, tt, K, T - tt, 0, { a: '#e8e1d4', b: '#d6cdbd', c: '#c4b8a4', m: 'platten' }, 1);
  const L = lokal(S, 3.6, 0.06, tt + 2.4, 0);
  L.box(3.4, 1.1, 0.7, 0, 0, 0, '#f4f2ee'); L.box(3.5, 0.06, 0.8, 0, 1.1, 0, '#3a4048'); L.box(3.4, 0.25, 0.04, 0, 0.75, 0.37, ROT);
  for (const s of [-1, 1]) L.box(0.7, 1.1, 1.4, s * 1.7, 0, -0.35, '#f4f2ee');
  monitor(lokal(S, 3.0, 0.06, tt + 2.2, PI), 0, 0, 1, r);
  figur(S, 3.2, tt + 1.6, 9001, 'info', { pose: 'stehen', ry: 0 });
  if (scene) wandschild(S, scene, 'HARTWIG', 'z', tt + 2.4, 2.4, 0.3, { schrift: ROT, hoehe: 0.8 });
  const P = lokal(S, 1.4, 0.06, T - 1.8, 0);
  P.box(2.2, 0.42, 0.8, 0, 0, 0, '#5f7f8c'); P.box(2.2, 0.4, 0.2, 0, 0.42, -0.3, '#536f7a');
  figur(S, 1.0, T - 1.8, 9002, 'kunde', { pose: 'sitzen', ry: PI });
  for (const s of [5.6, 7.0]) figur(S, s, T - 1.0, 9003 + s, 'kunde', { pose: 'gehen', ry: PI / 2 });
  pflanze(lokal(S, K - 0.6, 0.06, T - 0.8, 0), 0, 0, r, true);
}

function leerZone(S, scene, Z, T, r) {
  boden(S, Z.x0, 0, Z.x1 - Z.x0, T, 0, BELAG_LEER, 1);
  const L = lokal(S, 0, 0.06, 0, 0);
  // abgedeckte Tischinseln, gestapelte Stühle, Umzugskartons
  for (let x = Z.x0 + 1.2; x + 3 < Z.x1; x += 5) for (let z = 1.8; z + 2.6 < T - 1; z += 4.5) {
    L.box(2.8, 0.78, 1.5, x + 1.4, 0, z + 0.8, '#e6e3dc'); L.box(2.9, 0.1, 1.6, x + 1.4, 0, z + 0.8, '#d9d5cc');
    L.geo(new THREE.BoxGeometry(1.8, 0.14, 1.0).rotateZ(0.08), x + 1.4, 0.78, z + 0.8, '#ebe8e2');
    if (r() < 0.6) for (let k = 0; k < 4; k++) L.box(0.45, 0.06, 0.45, x + 3.4, 0.45 + k * 0.12, z + 0.5, '#4a525a');
    if (r() < 0.5) for (let k = 0; k < 3; k++) L.box(0.6, 0.45, 0.45, x + 0.2 + k * 0.65, 0, z + 2.1, waehle(r, ['#c9a26b', '#b8925e', '#d6b27c']));
  }
  if (scene && Z.x1 - Z.x0 > 4) wandschild(S, scene, 'Leerfläche', 'x', (Z.x0 + Z.x1) / 2, 2.6, 0.3, { farbe: '#6b7785', hoehe: 0.4 });
}
function rohZone(S, scene, Z, T, r) {
  boden(S, Z.x0, 0, Z.x1 - Z.x0, T, 0, BELAG_ROH, 1);
  const L = lokal(S, 0, 0.06, 0, 0);
  for (let x = Z.x0 + 3; x < Z.x1 - 1; x += 7.5) for (let z = 4; z < T - 1; z += 6) { L.box(0.6, 0.02, 0.6, x, 0, z, '#8f8b84'); }
  for (let x = Z.x0 + 2.5; x < Z.x1; x += 2.5) L.box(0.08, 0.08, T - 1, x, WH - 0.15, T / 2, '#c9cdd0');
  if (Z.x1 - Z.x0 > 6) { L.geo(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 10).rotateX(PI / 2), Z.x0 + 2.5, 0.35, T - 3, '#7b5a40'); }
  if (scene && Z.x1 - Z.x0 > 4) wandschild(S, scene, 'ZU VERMIETEN', 'x', (Z.x0 + Z.x1) / 2, 2.2, 0.3, { farbe: ROT, hoehe: 0.6 });
}

/** Zone einer Abteilung: Belag nach Stufe, Schilder, Räume, Sondermöbel, Tischinseln, Figuren nach FTE. */
function abteilungsZone(S, scene, Z, T, G, r, figuren, g) {
  const { a } = Z, st = Math.max(0, Math.min(3, a.stufe ?? 1));
  const info = ABTEILUNGEN[a.id] ?? { name: a.id, farbe: '#5f6b78' }, farbe = info.farbe;
  const w = Z.x1 - Z.x0;
  boden(S, Z.x0, 0, w, T, 0, BELAG[st], 1);
  if (st === 3) S.box(Math.min(w - 2, 6), 0.02, 3.2, Z.x0 + w * 0.6, 0.08, T - 2.6, '#e2c9b8');
  // Abteilungsfarbe: Band an der Rückwand, Wandschild und Hängeschild
  S.box(w - 0.4, 0.35, 0.06, Z.x0 + w / 2, WH - 0.55, 0.28, farbe);
  if (scene) {
    wandschild(S, scene, info.name, 'x', Z.x0 + w / 2, WH - 0.55, 0.31, { schrift: '#ffffff', hoehe: 0.32 });
    haengeschild(S, scene, info.name, Z.x0 + w / 2, WH - 0.8, T * 0.55, { farbe, hoehe: 0.75 });
    const sterne = '★'.repeat(st) + '☆'.repeat(3 - st);
    haengeschild(S, scene, `Stufe ${st} ${sterne}`, Z.x0 + w / 2, WH - 1.55, T * 0.55, { farbe: '#2a3540', hoehe: 0.42, seile: false });
  }
  const B = { x0: Z.x0 + 0.5, x1: Z.x1 - 0.4, z0: 0.6, z1: T - 1.6 };
  const sp = SPEZIAL[a.id] ?? [];
  // Signaturbereich (vorn rechts, gut ein Drittel der Zone): Teppich in Abteilungsfarbe, gefüllt mit Signaturmöbeln
  const Rx0 = w < 12 ? B.x0 : Z.x0 + Math.round(w * 0.4 * 2) / 2, Rz0 = B.z0 + Math.round((B.z1 - B.z0) * 0.3 * 2) / 2;
  const R = { x0: Rx0 + 0.3, x1: B.x1, z0: Rz0 + 0.4, z1: B.z1 };
  S.box(R.x1 - R.x0 + 0.8, 0.02, R.z1 - R.z0 + 1.2, (R.x0 + R.x1) / 2, 0.08, (R.z0 + R.z1) / 2 + 0.2, '#' + new THREE.Color(farbe).lerp(new THREE.Color('#e6e2da'), st === 0 ? 0.72 : 0.62).getHexString());
  S.box(R.x1 - R.x0 + 0.8, 0.025, 0.15, (R.x0 + R.x1) / 2, 0.085, R.z0 - 0.35, farbe);
  S.box(0.15, 0.025, R.z1 - R.z0 + 1.2, R.x0 - 0.4, 0.085, (R.z0 + R.z1) / 2 + 0.2, farbe);
  const pool = [...(SIGNATUR[a.id] ?? []), ...sp.filter((q) => q.art === 'frei')];
  const nTypen = Math.min(pool.length, [2, 3, 4, 99][st]);
  const flR = (R.x1 - R.x0) * (R.z1 - R.z0);
  let belegtR = 0;
  for (let runde = 0, fehl = 0; fehl < nTypen && belegtR < flR * 0.85 && runde < 40; runde++) {
    const s2 = pool[runde % nTypen];
    if (s2.einmal && s2._zone === Z) { fehl++; continue; }
    const pos = G.suche(R, s2.w, s2.d, 0.5);
    if (!pos) { fehl++; continue; }
    fehl = 0; belegtR += s2.w * s2.d;
    s2.bau(S, scene, pos.x, pos.z, s2.w, s2.d, st, r, farbe);
    if (s2.einmal) s2._zone = Z;
  }
  G.setze(R.x0 - 0.4, R.z0 - 0.4, R.x1, R.z1);
  const liste = [];
  const n = [1, 2, 3, 4][st];
  // allgemeine Räume nach Stufe, Wandmöbel und Glasräume der Abteilung hinten
  if (st >= 2) liste.push({ art: 'raum', w: 4.0, d: 3.6, bau: leitungsbuero });
  if (st >= 1 && w >= 11) liste.push({ art: 'raum', w: 5.0, d: 3.8, bau: besprechung });
  for (const s of sp.filter((q) => q.art !== 'frei').slice(0, Math.max(1, n - 1))) liste.push(s);
  if (st === 3) { liste.push({ art: 'frei', w: 2.6, d: 1.3, bau: telefonboxen }); liste.push({ art: 'frei', w: 4.2, d: 3.0, bau: lounge }); }
  const rang = { raum: 0, wand: 1, frei: 2 };
  liste.sort((p, q) => rang[p.art] - rang[q.art] || (q.vorrang ? 1 : 0) - (p.vorrang ? 1 : 0));
  for (const s of liste) {
    const pos = G.suche(B, s.w, s.d, s.art === 'wand' ? 0.3 : 0.6, { nurHinten: s.art === 'wand' });
    if (!pos) continue;
    s.bau(S, scene, pos.x, pos.z, s.w, s.d, st, r, farbe);
  }
  // Tischinseln bis alle FTE einen Platz haben
  const proSeite = 3, iw = proSeite * 1.4, id = st === 0 ? 1.9 : 3.3;
  let platz = [];
  const chart = a.id === 'controlling' ? () => waehle(r, ['#cfe3ec', '#e6edf1']) : null;
  const noetig = Math.ceil(a.fte / (st === 0 ? proSeite : proSeite * 2));
  // Raster möglicher Inselplätze über die ganze Zonentiefe, gleichmäßig verteilt ausgewählt
  const gx = iw + (st === 0 ? 1.0 : 1.3), gz = id + (st === 0 ? 0.9 : 1.3);
  const kand = [];
  for (let z = B.z0 + 0.3; z + id <= B.z1; z += gz) for (let x = B.x0 + 0.2; x + iw <= B.x1; x += gx) if (G.frei(x - 0.3, z - 0.3, x + iw + 0.3, z + id + 0.3)) kand.push({ x, z });
  const schritt = Math.max(1, kand.length / Math.max(1, noetig));
  for (let k = 0; k < noetig && k * schritt < kand.length; k++) {
    const pos = kand[Math.floor(k * schritt)];
    G.setze(pos.x - 0.3, pos.z - 0.3, pos.x + iw + 0.3, pos.z + id + 0.3);
    platz = platz.concat(insel(S, pos.x + iw / 2, pos.z + (st === 0 ? 0.6 : id / 2), proSeite, st, r, farbe, chart));
  }
  while (platz.length < a.fte) {
    const pos = G.suche(B, iw, id, 0.5);
    if (!pos) break;
    platz = platz.concat(insel(S, pos.x + iw / 2, pos.z + (st === 0 ? 0.6 : id / 2), proSeite, st, r, farbe, chart));
  }
  // Druckerecke und Pflanzen in Lücken
  const dr = G.suche(B, 1.6, 0.8, 0.3);
  if (dr) druckerecke(lokal(S, dr.x + 0.8, 0.06, dr.z + 0.4, 0), r);
  for (let k = 0; k < [0, 1, 3, 5][st]; k++) { const p = G.suche(B, 0.6, 0.6, 0.4); if (p) pflanze(lokal(S, p.x + 0.3, 0.06, p.z + 0.3, 0), 0, 0, r, st >= 2); }
  // Figuren: gut die Hälfte der FTE sitzt am Platz, einige stehen im Gang
  const sitzend = Math.min(platz.length, Math.round(a.fte * 0.55));
  for (let k = 0; k < sitzend; k++) {
    const i = Math.floor(r() * platz.length);
    const [fx, fz, ry] = platz.splice(i, 1)[0];
    figur(S, fx, fz, Math.floor(r() * 1e5), 'kunde', { pose: 'sitzen', ry: ry === 0 ? 0 : PI });
    figuren.n++;
  }
  const stehend = Math.round(a.fte * 0.08);
  for (let k = 0; k < stehend; k++) {
    const p = G.suche({ x0: B.x0, x1: B.x1, z0: T - 2.6, z1: T - 0.4 }, 0.6, 0.6, 0.6) ?? G.suche(B, 0.6, 0.6, 0.6);
    if (!p) break;
    figur(S, p.x + 0.3, p.z + 0.3, Math.floor(r() * 1e5), 'kunde', { pose: waehle(r, ['gehen', 'stehen', 'telefon', 'schauen']), ry: r() * PI * 2 });
    figuren.n++;
  }
}

// ------------------------------------------------------------------ Signaturmöbel (nur im Signaturbereich der Zone)
function rolle(L, lx, ly, lz, len, rad, farbe) { L.geo(new THREE.CylinderGeometry(rad, rad, len, 10).rotateZ(PI / 2), lx, ly, lz, farbe); }
function tafel(L, lx, lz, w, h, titel, farbe, r, inhalt) {
  for (const s of [-1, 1]) { L.box(0.06, h + 0.5, 0.06, lx + s * (w / 2 - 0.05), 0, lz, '#9aa3aa'); L.box(0.5, 0.04, 0.4, lx + s * (w / 2 - 0.05), 0, lz, '#5a636b'); }
  L.box(w, h, 0.06, lx, 0.5, lz, '#f8f8f6'); L.box(w, 0.05, 0.08, lx, 0.5 + h, lz, '#9aa3aa');
  if (titel) text(L, titel, lx, 0.5 + h - 0.2, lz + 0.04, 0.22, '#ffffff', farbe);
  inhalt?.(lx, 0.5, lz + 0.04, w, h);
}
const SIGNATUR = {
  controlling: [
    { w: 4.4, d: 2.4, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Leitstand: drei große Bildschirme mit Kurven auf Stelen, Pult davor
      const L = lokal(S, x + w / 2, 0.06, z + 0.5, 0);
      for (let k = -1; k <= 1; k++) { const P = L.sub(k * 1.45, Math.abs(k) * 0.25, -k * 0.3); P.box(0.12, 1.1, 0.12, 0, 0, 0, '#3a3f45'); P.box(1.4, 0.85, 0.08, 0, 1.1, 0, '#22272c'); P.box(1.3, 0.75, 0.01, 0, 1.15, 0.045, '#10161c'); linie(P, -0.05, 1.25, 0.055, 1.1, 0.55, r, k ? '#3ab27a' : '#e9b44c'); linie(P, 0.05, 1.2, 0.056, 1.1, 0.5, r, '#5bc0eb'); }
      const T2 = L.sub(0, 1.3); T2.box(3.4, 0.05, 0.8, 0, 0.72, 0, '#2a2d31'); T2.box(3.2, 0.72, 0.05, 0, 0, -0.35, '#3a3f45');
      for (let k = -1; k <= 1; k++) { monitor(T2.sub(k * 1.1, -0.15), 0, 0, 2, r, '#f2d29a'); buerostuhl(T2, k * 1.1, 0.7, PI, Math.max(1, st), farbe); }
    } },
    { w: 3.6, d: 1.4, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Monatsabschluss-Board: Spalten mit Karten, Haken
      const L = lokal(S, x + w / 2, 0.06, z + 0.4, 0);
      tafel(L, 0, 0, 3.2, 1.6, 'Monatsabschluss', farbe, r, (lx, y, lz, ww, hh) => {
        for (let c = 0; c < 4; c++) { L.box(0.02, hh - 0.45, 0.01, lx - ww / 2 + (c + 1) * (ww / 4), y + 0.08, lz, '#c9cdd0'); for (let k = 0; k < 4; k++) if (r() < 0.8 - c * 0.12) L.box(0.6, 0.22, 0.015, lx - ww / 2 + (c + 0.5) * (ww / 4), y + 0.15 + k * 0.28, lz + 0.01, c === 3 ? '#3ab27a' : waehle(r, ['#f2c14e', '#9cc9e0', '#f78fb3'])); }
      });
      figur(S, x + w / 2 + 1.0, z + 1.2, Math.floor(r() * 1e4), 'kunde', { ry: PI, pose: 'schauen' });
    } },
  ],
  einkauf: [
    { w: 3.4, d: 1.6, bau(S, sc, x, z, w, d, st, r) {
      // Stoffballen im Gestell
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      for (const s of [-1, 1]) L.box(0.08, 1.9, 1.0, s * 1.5, 0, 0, '#7b5a40');
      for (let k = 0; k < 4; k++) L.box(3.0, 0.05, 1.0, 0, 0.1 + k * 0.48, 0, '#9c7650');
      for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) rolle(L, 0, 0.32 + k * 0.48, -0.25 + j * 0.5, 2.8, 0.2, waehle(r, PAL.damen.concat(PAL.herren, PAL.waesche)));
    } },
    { w: 3.8, d: 2.2, bau(S, sc, x, z, w, d, st, r) {
      // Mustertisch mit gefalteter Ware und Figurinen in Musterteilen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(2.2, 0.8, 1.0, -0.6, 0, 0.2, '#f4f2ee');
      for (let k = 0; k < 10; k++) L.box(0.36, 0.06 + (k % 3) * 0.05, 0.3, -1.5 + (k % 5) * 0.45, 0.8, 0.0 + Math.floor(k / 5) * 0.4, waehle(r, PAL.damen.concat(PAL.herren)));
      for (let k = 0; k < 3; k++) puppe(L, 1.0 + (k % 2) * 0.55, -0.5 + k * 0.5, r, k === 1 ? 'herren' : 'damen', k === 1 ? PAL.herren : PAL.damen, -0.4);
      figur(S, x + w / 2 - 0.6, z + d / 2 + 1.0, Math.floor(r() * 1e4), 'kunde', { ry: PI, pose: 'schauen' });
    } },
  ],
  marketing: [
    { w: 3.2, d: 1.4, bau(S, sc, x, z, w, d, st, r) {
      // Aufsteller mit Kampagnenplakaten
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      [['SALE', '#d23c32'], ['NEU', '#2f6fb3'], ['Herbst', '#3f7d56']].forEach(([t, f], k) => { const P = L.sub(-1.1 + k * 1.1, 0, (k - 1) * 0.3); P.geo(new THREE.BoxGeometry(0.9, 1.6, 0.05).rotateX(-0.12), 0, 0.8, 0.1, f); P.geo(new THREE.BoxGeometry(0.9, 1.6, 0.05).rotateX(0.12), 0, 0.8, -0.1, '#f8f6f2'); text(P, t, 0, 1.15, 0.24, 0.25, '#ffffff'); });
    } },
  ],
  personal: [
    { w: 6.0, d: 4.6, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Schulungsraum mit Stuhlreihen und Beamer
      glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
        L.box(2.6, 1.5, 0.04, 0, 0.8, -d / 2 + 0.2, '#ffffff'); L.box(2.4, 1.3, 0.01, 0, 0.9, -d / 2 + 0.23, '#cfe3ec'); balken(L, 0, 1.05, -d / 2 + 0.25, 1.4, 0.8, r, [farbe, '#e9b44c']);
        L.box(0.4, 0.15, 0.35, 0, 2.5, 0.4, '#2a2d31'); L.box(0.04, 0.4, 0.04, 0, 2.65, 0.4, '#5a636b');
        for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) { const u = -1.5 + k * 1.0, v = -0.4 + i * 1.0; L.box(0.42, 0.05, 0.42, u, 0.44, v, farbe); L.box(0.42, 0.42, 0.05, u, 0.49, v + 0.2, farbe); L.box(0.04, 0.44, 0.04, u, 0, v, '#2a2d31'); if (r() < 0.5) figur(S, x + w / 2 + u, z + d / 2 + v, Math.floor(r() * 1e4), 'kunde', { pose: 'sitzen', ry: PI }); }
        figur(S, x + w / 2 + 1.6, z + 0.9, Math.floor(r() * 1e4), 'leitung', { ry: 0.3, pose: 'schauen' });
      }, { name: 'Schulung', farbe });
    } },
    { w: 3.8, d: 3.2, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Gesprächsecke: zwei Sofas, Tisch, Teppich, Pflanze
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(3.4, 0.02, 2.8, 0, 0, 0, heller(farbe, 0.35));
      for (const s of [-1, 1]) { L.box(2.0, 0.42, 0.8, 0, 0, s * 1.0, '#5f7f8c'); L.box(2.0, 0.4, 0.22, 0, 0.42, s * 1.3, '#536f7a'); }
      L.box(1.1, 0.4, 0.6, 0, 0, 0, '#d8bf98'); pflanze(L, 1.4, -1.1, r, true);
      figur(S, x + w / 2 - 0.4, z + d / 2 - 1.0, Math.floor(r() * 1e4), 'leitung', { pose: 'sitzen', ry: 0 });
      figur(S, x + w / 2 + 0.3, z + d / 2 + 1.0, Math.floor(r() * 1e4), 'kunde', { pose: 'sitzen', ry: PI });
    } },
  ],
  immobilien: [
    { w: 5.0, d: 3.4, bau(S, sc, x, z, w, d, st, r) {
      // großes Stadtmodell: Straßenraster, Blöcke, Hartwig-Haus rot, Bäume
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(4.2, 0.85, 2.6, 0, 0, 0, '#e9e4da'); L.box(4.1, 0.03, 2.5, 0, 0.85, 0, '#b9b4aa');
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
        const u = -1.75 + i * 0.7, v = -0.9 + j * 0.6, rotH = i === 2 && j === 1;
        if (i === 4 && j === 2) { L.box(0.55, 0.02, 0.45, u, 0.88, v, '#94c486'); L.kugel(0.1, u, 0.95, v, '#5f9a56'); continue; }
        L.box(0.55, rotH ? 0.25 : zw(r, 0.08, 0.35), 0.45, u, 0.88, v, rotH ? '#d23c32' : '#ffffff');
      }
      for (const s of [-1, 1]) figur(S, x + w / 2 + s * 1.6, z + d / 2 + 1.7, Math.floor(r() * 1e4), s > 0 ? 'leitung' : 'kunde', { ry: PI, pose: 'schauen' });
    } },
    { w: 3.6, d: 2.0, bau(S, sc, x, z, w, d, st, r) {
      // Plantisch mit ausgebreiteten Grundrissen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.geo(new THREE.BoxGeometry(3.0, 0.05, 1.3).rotateX(0.15), 0, 0.95, 0, '#e9e6df'); for (const s of [-1.3, 1.3]) L.box(0.08, 0.92, 1.0, s, 0, 0, '#5a636b');
      for (let k = 0; k < 3; k++) { L.geo(new THREE.BoxGeometry(0.85, 0.01, 0.6).rotateX(0.15), -0.95 + k * 0.95, 1.0, 0, '#ffffff'); for (let i = 0; i < 3; i++) L.geo(new THREE.BoxGeometry(0.7, 0.012, 0.02).rotateX(0.15), -0.95 + k * 0.95, 1.01, -0.2 + i * 0.2, '#2f5f8a'); }
    } },
  ],
  logistik: [
    { w: 4.2, d: 1.6, bau(S, sc, x, z, w, d, st, r) {
      // Kartonmuster im Schwerlastregal, zwei Paletten davor
      const L = lokal(S, x + w / 2, 0.06, z + 0.5, 0);
      for (const s of [-1, 0, 1]) L.box(0.1, 2.4, 0.9, s * 1.9, 0, 0, '#e07b2a');
      for (let k = 0; k < 3; k++) L.box(3.9, 0.1, 0.9, 0, 0.3 + k * 0.8, 0, '#2f5f8a');
      for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) L.box(0.55, zw(r, 0.35, 0.6), 0.7, -1.6 + i * 0.64, 0.4 + k * 0.8, 0, waehle(r, ['#c9a26b', '#b8925e', '#d6b27c']));
      for (const s of [-1, 1]) { L.box(1.2, 0.14, 0.8, s * 1.0, 0, 1.0, '#c9a26b'); L.box(1.0, 0.5, 0.7, s * 1.0, 0.14, 1.0, '#e8e4dc'); }
    } },
  ],
  ecommerce: [
    { w: 5.0, d: 2.6, bau(S, sc, x, z, w, d, st, r) {
      // Fotostraße: Kleiderstangen, zwei Aufnahmeplätze mit Hohlkehle
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      for (const s of [-1, 1]) { const P = L.sub(s * 1.4, -0.3); P.box(1.8, 2.2, 0.05, 0, 0, -0.8, '#ffffff'); P.box(1.8, 0.02, 1.2, 0, 0, -0.2, '#ffffff'); puppe(P, 0, -0.3, r, s > 0 ? 'herren' : 'damen', s > 0 ? PAL.herren : PAL.damen, 0); P.box(0.04, 1.3, 0.04, 0.7, 0, 0.8, '#2a2d31'); P.box(0.22, 0.16, 0.26, 0.7, 1.3, 0.8, '#1e2328'); }
      L.box(0.05, 1.7, 0.05, 0, 0, -0.6, '#9aa3aa'); L.box(0.05, 1.7, 0.05, 0, 0, 0.9, '#9aa3aa'); L.box(0.05, 0.05, 1.5, 0, 1.7, 0.15, '#9aa3aa');
      for (let v = -0.5; v < 0.85; v += 0.15) L.box(0.42, zw(r, 0.6, 0.95), 0.05, 0, 1.67 - 0.8, v, waehle(r, PAL.damen.concat(PAL.herren)));
    } },
  ],
  recht: [
    { w: 5.2, d: 3.6, bau(S, sc, x, z, w, d, st, r) {
      // Bibliothek: Regalreihen und Lesetisch mit grünen Lampen
      for (let k = 0; k < 2; k++) { const L = lokal(S, x + 1.4 + k * 2.4, 0.06, z + 1.0, 0); regal(L, 0, 0, 2.2, 2.3, '#5a3b22', ordner(L, r, ['#6b2737', '#2b3a55', '#3a2a20', '#c9b48f', '#2f6f4f']), r, 0.5, 6); }
      const L = lokal(S, x + w / 2, 0.06, z + d - 0.9, 0);
      L.box(3.0, 0.05, 1.0, 0, 0.74, 0, '#5a3b22'); for (const s of [-1.3, 1.3]) L.box(0.1, 0.74, 0.8, s, 0, 0, '#3a2a20');
      for (const s of [-0.8, 0.8]) { L.box(0.04, 0.3, 0.04, s, 0.79, 0, '#c9b16a'); L.box(0.3, 0.1, 0.18, s, 1.08, 0, '#2f6f4f'); }
      figur(S, x + w / 2 - 0.3, z + d - 0.2, Math.floor(r() * 1e4), 'leitung', { pose: 'sitzen', ry: PI });
    } },
    { w: 3.6, d: 2.6, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Besprechungstisch mit Aktenstapeln
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(2.6, 0.05, 1.1, 0, 0.72, 0, '#7b5a40'); L.box(0.25, 0.72, 0.8, 0, 0, 0, '#3a2a20');
      for (let k = 0; k < 5; k++) for (let h = 0; h < 3; h++) L.box(0.3, 0.06, 0.24, -1.0 + k * 0.5, 0.77 + h * 0.065, zw(r, -0.2, 0.2), waehle(r, ['#e8e4dc', '#c9b48f', '#8a2f3a']));
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) buerostuhl(L, (k - 1) * 0.85, s * 0.9, s > 0 ? PI : 0, 2, '#3a2a20');
    } },
  ],
  vm: [
    { w: 2.8, d: 1.8, bau(S, sc, x, z, w, d, st, r) {
      // Dekoteile: große Kugeln, Geschenkpakete, Kunstpalme, Farbdosen
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      for (let k = 0; k < 3; k++) L.kugel(0.35, -1.0 + k * 0.5, 0.35, -0.4 + (k % 2) * 0.3, waehle(r, ['#d23c32', '#e9b44c', '#ffffff']), 1);
      for (let k = 0; k < 3; k++) { const f = waehle(r, ['#1f9aa8', '#d65a6f', '#e9b44c']); L.box(0.5, 0.45, 0.5, 0.4 + (k % 2) * 0.55, (k > 1) * 0.45, 0.3, f); L.box(0.08, 0.46, 0.52, 0.4 + (k % 2) * 0.55, (k > 1) * 0.45, 0.3, '#ffffff'); }
      L.box(0.12, 1.4, 0.12, 1.2, 0, -0.5, FARBEN.stamm); for (let k = 0; k < 5; k++) L.geo(new THREE.BoxGeometry(0.9, 0.05, 0.25).rotateY(k * 1.25).rotateZ(0.4), 1.2, 1.4, -0.5, '#5f9a56');
      for (let k = 0; k < 4; k++) L.zyl(0.13, 0.13, 0.22, -1.1 + k * 0.3, 0, 0.6, waehle(r, ['#1f9aa8', '#d65a6f', '#f2c14e', '#ffffff']), 8);
    } },
  ],
  verwaltung: [
    { w: 3.4, d: 2.0, bau(S, sc, x, z, w, d, st, r, farbe) {
      // Empfang der Verwaltung
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      L.box(2.6, 1.1, 0.7, 0, 0, 0.2, '#f4f2ee'); L.box(2.7, 0.06, 0.8, 0, 1.1, 0.2, '#3a4048'); L.box(2.6, 0.22, 0.04, 0, 0.8, 0.57, farbe);
      text(L, 'Empfang Verwaltung', 0, 0.45, 0.58, 0.22, '#3a4048');
      monitor(L.sub(-0.5, 0.1, PI), 0, 0, 1, r);
      figur(S, x + w / 2 - 0.4, z + d / 2 - 0.5, Math.floor(r() * 1e4), 'info', { ry: 0, pose: 'stehen' });
    } },
    { w: 4.2, d: 1.4, bau(S, sc, x, z, w, d, st, r) {
      // Aktenschrankblock (Rücken an Rücken)
      const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { const u = -1.5 + k; L.box(0.95, 1.8, 0.5, u, 0, s * 0.26, '#c9cdd0'); L.box(0.85, 0.02, 0.02, u, 0.6, s * 0.52, '#8c959b'); L.box(0.85, 0.02, 0.02, u, 1.2, s * 0.52, '#8c959b'); L.box(0.1, 0.06, 0.02, u, 1.5, s * 0.52, waehle(r, ['#2f5f8a', '#5f6b78'])); }
    } },
  ],
};

// ====================================================================================
// Ergänzung Vorstand und Produktentwicklung
// ====================================================================================
// Vorstandsetage: hqEtage(S, scene, g, nr, { vorstand }) mit vorstand = hqFuerGrafik().vorstand
//   ({ etage: { gebaeudeId, nr }, ressorts: [{ id, kurz, titel, name?, portraet? }] }). Liegt die Vorstandsetage auf dieser
//   Etage (oder vorstand.immer), belegt eine Vorstandszone den Bereich direkt hinter dem Kern: Büros mit Namensschild je
//   Ressort (unbesetzt: leeres Büro), Büro CEO, Sitzungssaal, Empfang Vorstand mit Wartebereich. Die Abteilungen der Etage
//   rücken dahinter. Kleidungsfarbe der Figur aus den Porträt-Merkmalen.
// Produktentwicklung (Abteilung 'produkt'): Designstudio mit Schneiderpuppen, Stoffmusterwand, Farbkarten,
//   Musterkollektion an Stangen, Zuschnitttischen und Anprobe.
// Marketing: CRM-Leitstand (Videowand mit Kundenkarte, Segmenten, Kampagnen) als erstes Signaturmöbel.
ABTEILUNGEN.produkt = { name: 'Produktentwicklung', farbe: '#b0568f' };
const VORSTAND_FARBE = '#24344d';
const RESSORTS_STANDARD = [
  { id: 'cfo', kurz: 'CFO' }, { id: 'coo', kurz: 'COO' }, { id: 'cso', kurz: 'CSO' }, { id: 'cpo', kurz: 'CPO' },
  { id: 'cmo', kurz: 'CMO' }, { id: 'chro', kurz: 'CHRO' }, { id: 'cro', kurz: 'CRO' }, { id: 'cdo', kurz: 'CDO' },
];
const KLEID_HEX = {
  marine: '#2a3558', anthrazit: '#3c4148', grau: '#8a9097', schwarz: '#22252a', bordeaux: '#7a2836', petrol: '#1f6470',
  olive: '#6d7442', camel: '#b98a52', beige: '#d9c8aa', hellblau: '#b9d3ec', 'weiß': '#eef4f8', senf: '#c9a13a',
  rosa: '#f4c9e6', 'mintgrün': '#a8dcc4', 'grün': '#6fae6a', rot: '#b8423a',
};
const kleidFarbe = (p) => KLEID_HEX[p?.kleidungFarbe] ?? (/^#/.test(String(p?.kleidungFarbe ?? '')) ? p.kleidungFarbe : '#2a3558');

/** Schild auf der Glasfront, Breite begrenzt (Schrift wird kleiner statt breiter). */
function namensschild(scene, t, x, y, z, maxB, hg, fg = '#ffffff', hMax = 0.4) {
  if (!scene) return;
  const { mat, seitenverhaeltnis } = textMaterial(t, fg, { groesse: 100, hintergrund: hg, versatz: -2 });
  const h = Math.min(hMax, maxB / seitenverhaeltnis);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * seitenverhaeltnis, h), mat);
  m.position.set(x, y, z); scene.add(m);
}
const nachname = (n) => String(n ?? '').trim().split(/\s+/).slice(-1)[0];

function vorstandsBuero(S, sc, x, z, w, d, r, R, ceo = false) {
  const besetzt = ceo || !!R.name;
  const rahmen = '#2a3442';
  glasraum(S, sc, x, z, w, d, rahmen, (L) => {
    // Teppich, Schreibtisch aus Holz, Ledersessel, Sideboard, Bild, Pflanze
    L.box(w - 0.5, 0.02, d - 0.6, 0, 0, 0, besetzt ? '#b9a58c' : '#a7a49d');
    L.box(1.9, 0.06, 0.85, 0, 0.72, -0.35, '#6b4a32'); L.box(1.9, 0.6, 0.06, 0, 0.12, 0.05, '#5a3b26');
    for (const s of [-1, 1]) L.box(0.06, 0.72, 0.8, s * 0.9, 0, -0.35, '#5a3b26');
    L.box(w - 0.8, 0.7, 0.42, 0, 0, -d / 2 + 0.3, '#3a2a20');
    L.box(1.0, 0.7, 0.04, -0.4, 1.4, -d / 2 + 0.12, '#f4f0e6'); L.box(0.9, 0.6, 0.02, -0.4, 1.45, -d / 2 + 0.15, waehle(r, ['#3f7d9a', '#c9853f', '#6d8f5a', '#8a3f5a']));
    pflanze(L, w / 2 - 0.45, -d / 2 + 0.5, r, true);
    for (const s of [-0.5, 0.5]) buerostuhl(L, s, 0.55, PI, 1, '#5a3b26');
    if (besetzt) {
      monitor(L.sub(0.55, -0.45, PI), 0, 0, 1, r);
      L.box(0.32, 0.03, 0.24, -0.5, 0.78, -0.3, '#f4f2ee'); L.box(0.07, 0.12, 0.07, -0.75, 0.78, -0.45, '#d8d2c0');
      buerostuhl(L, 0, -1.15, 0, 3, '#2a2d31');
      figur(S, x + w / 2, z + d / 2 - 1.15, hashText(R.name ?? R.kurz) % 100000, 'fremd', { pose: 'sitzen', ry: 0, farbe: kleidFarbe(R.portraet) });
    } else {
      buerostuhl(L, 0, -1.0, 0, 2, '#2a2d31');
      L.box(0.6, 0.42, 0.45, w / 2 - 0.6, 0, 0.6, '#c9a26b'); L.box(0.6, 0.02, 0.45, w / 2 - 0.6, 0.42, 0.6, '#b8925e');
    }
  }, {});
  const titel = ceo ? 'CEO · Vorstandsvorsitz' : besetzt ? `${R.kurz} · ${nachname(R.name)}` : `${R.kurz} · unbesetzt`;
  namensschild(sc, titel, x + w / 2, 2.35, z + d + 0.05, w - 0.5, besetzt ? VORSTAND_FARBE : '#7b838b');
}

function sitzungssaal(S, sc, x, z, w, d, r, n) {
  glasraum(S, sc, x, z, w, d, '#2a3442', (L) => {
    L.box(w - 0.6, 0.02, d - 0.6, 0, 0, 0, '#9c8a76');
    const lang = Math.min(w - 2.4, 0.95 * Math.ceil(n / 2) + 0.6);
    L.box(lang, 0.07, 1.5, 0, 0.72, 0.2, '#5a3b26'); for (const s of [-1, 1]) L.box(0.3, 0.72, 0.9, s * (lang / 2 - 0.6), 0, 0.2, '#3a2a20');
    const proSeite = Math.ceil(n / 2);
    for (const s of [-1, 1]) for (let k = 0; k < proSeite; k++) {
      const u = (k - (proSeite - 1) / 2) * 0.95;
      buerostuhl(L, u, 0.2 + s * 1.05, s > 0 ? PI : 0, 3, '#2a2d31');
      L.box(0.3, 0.02, 0.22, u, 0.79, 0.2 + s * 0.45, '#f4f2ee');
    }
    buerostuhl(L, lang / 2 + 0.55, 0.2, -PI / 2, 3, VORSTAND_FARBE);
    L.box(2.6, 1.5, 0.08, 0, 0.9, -d / 2 + 0.15, '#22272c'); L.box(2.4, 1.3, 0.02, 0, 1.0, -d / 2 + 0.2, '#f4f6f8');
    balken(L, -0.6, 1.15, -d / 2 + 0.22, 1.0, 0.9, r); linie(L, 0.6, 1.15, -d / 2 + 0.22, 1.0, 0.9, r);
    text(L, 'Vorstandssitzung', 0, 2.05, -d / 2 + 0.23, 0.2, '#ffffff', VORSTAND_FARBE);
    for (const s of [-1, 1]) pflanze(L, s * (w / 2 - 0.5), -d / 2 + 0.5, r, true);
    for (let k = 0; k < Math.min(4, n); k++) {
      const u = (k - 1.5) * 0.95 * (proSeite > 2 ? 1 : 0.6);
      figur(S, x + w / 2 + u, z + d / 2 + 0.2 + (k % 2 ? 1.05 : -1.05), 7100 + k, 'leitung', { pose: 'sitzen', ry: k % 2 ? PI : 0 });
    }
  }, {});
  namensschild(sc, 'Sitzungssaal', x + w * 0.3, 2.35, z + d + 0.05, 3, VORSTAND_FARBE);
}

function vorstandEmpfang(S, sc, x, z, w, d, r) {
  const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
  L.box(w - 0.2, 0.02, d - 0.2, 0, 0, 0, '#d9cdb8');
  // Empfangstresen mit Logo-Band, Assistenz, Wartesofa, Pflanze
  L.box(2.8, 1.1, 0.7, 0, 0, -0.6, '#f4f2ee'); L.box(2.9, 0.06, 0.8, 0, 1.1, -0.6, '#3a2a20'); L.box(2.8, 0.22, 0.04, 0, 0.8, -0.23, VORSTAND_FARBE);
  text(L, 'Vorstand', 0, 0.42, -0.22, 0.24, '#3a4048');
  monitor(L.sub(-0.6, -0.75, PI), 0, 0, 2, r);
  figur(S, x + w / 2 - 0.2, z + d / 2 - 1.35, 7201, 'info', { pose: 'stehen', ry: 0 });
  L.box(2.0, 0.42, 0.8, 0, 0, d / 2 - 0.7, '#5f6f7c'); L.box(2.0, 0.4, 0.22, 0, 0.42, d / 2 - 0.35, '#4f5d68');
  L.box(0.7, 0.38, 0.5, 1.6, 0, d / 2 - 0.9, '#d8bf98');
  figur(S, x + w / 2 + 0.4, z + d - 0.75, 7202, 'kunde', { pose: 'sitzen', ry: PI });
  pflanze(L, -w / 2 + 0.5, d / 2 - 0.6, r, true);
}

/** Vorstandszone ab x0 (Breite W): Büroreihen hinten, Sitzungssaal und Empfang vorn. */
function vorstandZone(S, scene, Z, T, G, r, figuren, ressorts) {
  const W = Z.x1 - Z.x0;
  boden(S, Z.x0, 0, W, T, 0, BELAG[3], 1);
  S.box(W - 1.0, 0.02, 1.8, Z.x0 + W / 2, 0.08, T - 1.4, '#7f6a58');
  S.box(W - 0.4, 0.35, 0.06, Z.x0 + W / 2, WH - 0.55, 0.28, VORSTAND_FARBE);
  if (scene) {
    wandschild(S, scene, 'Vorstand', 'x', Z.x0 + W / 2, WH - 0.55, 0.31, { schrift: '#ffffff', hoehe: 0.32 });
    haengeschild(S, scene, 'Vorstandsetage', Z.x0 + W / 2, WH - 0.8, T * 0.62, { farbe: VORSTAND_FARBE, hoehe: 0.75 });
  }
  const liste = ressorts.length ? ressorts : RESSORTS_STANDARD;
  const ceoW = 5.4, od = 4.2;
  const proReihe = Math.max(3, Math.min(liste.length, Math.floor((W - ceoW - 0.8) / 3.6)));
  const reihen = Math.ceil(liste.length / proReihe);
  const ow = (W - ceoW - 0.8) / proReihe;
  liste.forEach((R, i) => {
    const reihe = Math.floor(i / proReihe), k = i % proReihe;
    vorstandsBuero(S, scene, Z.x0 + 0.4 + k * ow, 0.6 + reihe * (od + 1.6), ow - 0.15, od, r, R);
    if (R.name) figuren.n++;
  });
  vorstandsBuero(S, scene, Z.x1 - ceoW - 0.2, 0.6, ceoW, od + 1.2, r, { kurz: 'CEO' }, true);
  figuren.n++;
  if (reihen > 1 && T - (0.6 + od + 1.6) > od + 7) lounge(S, scene, Z.x1 - ceoW - 0.2, 0.6 + od + 2.4, ceoW, od - 0.6, 2, r, VORSTAND_FARBE);
  const zv = 0.6 + reihen * (od + 1.6);
  const rest = T - zv - 1.0;
  const sw = Math.min(W - 9, 12), sd = Math.max(4.4, Math.min(6.2, rest));
  if (rest >= 4.4) sitzungssaal(S, scene, Z.x0 + W - sw - 0.4, zv, sw, sd, r, liste.length + 1);
  const ew = Math.min(7, W - sw - 1.2);
  if (ew >= 4.5 && rest >= 3.6) vorstandEmpfang(S, scene, Z.x0 + 0.4, zv + 0.4, ew, Math.min(rest, 5), r);
  figuren.n += 2;
  G.setze(Z.x0, 0, Z.x1, T);
}

// ------------------------------------------------------------------ Produktentwicklung
function schneiderpuppe(L, lx, lz, r, stoff, ry = 0) {
  const P = L.sub(lx, lz, ry);
  P.zyl(0.22, 0.26, 0.04, 0, 0, 0, '#3a2a20', 10); P.zyl(0.025, 0.025, 0.9, 0, 0.04, 0, '#8f6f2a', 6);
  P.zyl(0.17, 0.2, 0.32, 0, 0.94, 0, '#e8dcc4', 12); P.zyl(0.14, 0.17, 0.12, 0, 1.26, 0, '#e8dcc4', 12);
  P.zyl(0.2, 0.14, 0.26, 0, 1.38, 0, '#e8dcc4', 12); P.zyl(0.05, 0.05, 0.1, 0, 1.64, 0, '#8f6f2a', 6); P.kugel(0.05, 0, 1.76, 0, '#3a2a20');
  if (stoff) { P.geo(new THREE.CylinderGeometry(0.205, 0.3, 0.55, 12, 1, true, -0.6, PI * 1.3), 0, 0.68, 0, stoff); P.box(0.04, 0.5, 0.02, 0.16, 1.1, 0.12, dunkler(stoff, 0.15)); }
  P.box(0.3, 0.03, 0.02, 0, 1.3, 0.17, '#e9c46a');
}
const STOFFE = ['#a8dcc4', '#26355e', '#76263a', '#d8c39c', '#cc9f2e', '#ec7a6a', '#9fb393', '#c4b0dc', '#b8864e', '#4a6f9e', '#f3f2ee', '#2c5a40'];
SPEZIAL.produkt = [
  { art: 'wand', w: 4.8, d: 0.4, bau(S, sc, x, z, w, d, st, r) {
    // Stoffmusterwand: Pinnwand mit Stoffproben im Raster
    const L = lokal(S, x + w / 2, 0.06, z + 0.12, 0);
    L.box(w, 1.9, 0.06, 0, 0.55, 0, '#d8c6a4');
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) L.box(0.42, 0.34, 0.02, -w / 2 + 0.38 + i * 0.5, 0.68 + j * 0.42, 0.04, waehle(r, STOFFE));
    text(L, 'Stoffmuster', 0, 2.6, 0.05, 0.24, '#ffffff', ABTEILUNGEN.produkt.farbe);
  } },
  { art: 'frei', w: 3.8, d: 2.4, bau(S, sc, x, z, w, d, st, r, farbe) {
    // Zuschnitttisch: Schneidematte, ausgerollter Stoff mit Ballen, Schnittmuster aus Papier, Schere, Hocker
    const L = lokal(S, x + w / 2, 0.06, z + d / 2 - 0.2, 0);
    L.box(3.4, 0.06, 1.4, 0, 0.88, 0, '#e9e6df'); for (const s of [-1.55, 1.55]) L.box(0.1, 0.88, 1.2, s, 0, 0, '#5a636b');
    L.box(3.2, 0.01, 1.25, 0, 0.94, 0, '#3f7a5a');
    const stoff = waehle(r, STOFFE);
    L.box(2.0, 0.015, 1.0, -0.3, 0.95, 0, stoff);
    L.geo(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 10).rotateX(PI / 2), 0.85, 1.05, 0, dunkler(stoff, 0.1));
    for (let k = 0; k < 3; k++) L.geo(new THREE.BoxGeometry(0.5, 0.008, 0.36).rotateY(zw(r, -0.4, 0.4)), -0.9 + k * 0.45, 0.965, zw(r, -0.25, 0.25), '#fbf8ef');
    L.box(0.22, 0.02, 0.06, 1.25, 0.95, 0.4, '#9aa3aa'); L.box(0.08, 0.02, 0.08, 1.38, 0.95, 0.42, '#d23c32');
    L.box(1.2, 0.01, 0.04, -0.3, 0.955, -0.55, '#e9c46a');
    L.zyl(0.2, 0.2, 0.05, -0.8, 0.62, 1.05, farbe, 10); L.zyl(0.03, 0.03, 0.62, -0.8, 0, 1.05, '#5a636b', 6);
    figur(S, x + w / 2 + 0.2, z + d / 2 + 0.75, Math.floor(r() * 1e4), 'kunde', { ry: PI, pose: 'schauen' });
  } },
  { art: 'raum', w: 4.2, d: 3.4, vorrang: true, bau(S, sc, x, z, w, d, st, r, farbe) {
    // Anprobe: Schneiderpuppen in Prototypen, Spiegel, Stange mit Mustern
    glasraum(S, sc, x, z, w, d, '#3a4048', (L) => {
      L.box(w - 0.6, 0.02, d - 0.6, 0, 0, 0, '#e6dccb');
      for (let k = 0; k < 3; k++) schneiderpuppe(L, -1.2 + k * 0.95, -0.2, r, waehle(r, STOFFE), 0.2);
      L.box(0.9, 1.9, 0.06, w / 2 - 0.7, 0.1, -d / 2 + 0.35, '#c9d9e0'); L.box(1.0, 2.0, 0.04, w / 2 - 0.7, 0.05, -d / 2 + 0.3, '#3a2a20');
      L.box(2.4, 0.04, 0.04, -0.4, 1.7, -d / 2 + 0.45, '#9aa3aa');
      for (let u = -1.5; u < 0.7; u += 0.16) L.box(0.05, zw(r, 0.6, 0.95), 0.36, u, 1.66 - 0.8, -d / 2 + 0.45, waehle(r, STOFFE));
      figur(S, x + w / 2 + 0.8, z + d / 2 + 0.8, Math.floor(r() * 1e4), 'kunde', { ry: PI + 0.4, pose: 'schauen' });
    }, { name: 'Anprobe', farbe });
  } },
  { art: 'wand', w: 3.0, d: 0.4, vorrang: true, bau(S, sc, x, z, w, d, st, r) {
    // Farbkarten der Saison: Spalten von hell nach dunkel
    const L = lokal(S, x + w / 2, 0.06, z + 0.12, 0);
    L.box(w, 1.8, 0.05, 0, 0.6, 0, '#f6f4ef');
    const basis = ['#a8dcc4', '#26355e', '#76263a', '#d8c39c', '#cc9f2e', '#ec7a6a', '#c4b0dc'];
    basis.forEach((c, i) => { for (let j = 0; j < 6; j++) L.box(0.34, 0.22, 0.02, -w / 2 + 0.3 + i * 0.4, 0.72 + j * 0.27, 0.035, j < 3 ? heller(c, (3 - j) * 0.12) : dunkler(c, (j - 3) * 0.12)); });
    text(L, 'Farbkarten Saison', 0, 2.55, 0.05, 0.22, '#ffffff', ABTEILUNGEN.produkt.farbe);
  } },
];
SIGNATUR.produkt = [
  { w: 3.2, d: 1.6, bau(S, sc, x, z, w, d, st, r) {
    // Schneiderpuppen mit Prototypen, eine Figur steckt ab
    const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
    for (let k = 0; k < 3; k++) schneiderpuppe(L, -1.0 + k * 1.0, (k % 2) * 0.25, r, k === 1 ? null : waehle(r, STOFFE), -0.3);
    figur(S, x + w / 2 + 0.5, z + d / 2 + 0.6, Math.floor(r() * 1e4), 'kunde', { ry: PI + 0.5, pose: 'schauen' });
  } },
  { w: 4.4, d: 1.6, bau(S, sc, x, z, w, d, st, r, farbe) {
    // Musterkollektion an zwei Rollstangen mit Anhängern
    const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
    for (const s of [-1, 1]) {
      const P = L.sub(s * 1.1, 0);
      for (const t of [-1, 1]) { P.box(0.05, 1.75, 0.05, t * 0.95, 0.08, 0, '#c9ced3'); P.box(0.5, 0.04, 0.05, t * 0.95, 0.06, 0, '#5a636b'); P.zyl(0.05, 0.05, 0.06, t * 0.95, 0, 0.2, '#2a2d31', 6); }
      P.box(2.0, 0.04, 0.04, 0, 1.8, 0, '#c9ced3');
      for (let u = -0.85; u < 0.85; u += 0.13) { const f = waehle(r, STOFFE); P.box(0.05, zw(r, 0.7, 1.05), 0.44, u, 1.76 - 0.95, 0, f); if (r() < 0.4) P.box(0.02, 0.1, 0.07, u + 0.04, 1.55, 0.24, '#ffffff'); }
    }
    text(L, 'Musterkollektion', 0, 2.15, 0.03, 0.2, '#ffffff', farbe);
  } },
  { w: 3.2, d: 2.4, bau(S, sc, x, z, w, d, st, r, farbe) {
    // Farbkartentisch: Farbfächer, Stoffproben, zwei Stühle
    const L = lokal(S, x + w / 2, 0.06, z + d / 2, 0);
    L.box(2.6, 0.05, 1.2, 0, 0.74, 0, '#f2f0ea'); for (const s of [-1.2, 1.2]) L.box(0.06, 0.74, 1.0, s, 0, 0, '#2a2d31');
    for (let k = 0; k < 7; k++) L.geo(new THREE.BoxGeometry(0.42, 0.01, 0.08).translate(0.2, 0, 0).rotateY(-0.9 + k * 0.3), -0.6, 0.8 + k * 0.004, 0.1, STOFFE[k]);
    for (let k = 0; k < 6; k++) L.box(0.22, 0.012, 0.22, 0.2 + (k % 3) * 0.3, 0.8, -0.25 + Math.floor(k / 3) * 0.32, waehle(r, STOFFE), zw(r, -0.3, 0.3));
    for (const s of [-1, 1]) buerostuhl(L, s * 0.6, 0.95, PI, Math.max(1, st), farbe);
    figur(S, x + w / 2 - 0.6, z + d / 2 + 0.95, Math.floor(r() * 1e4), 'kunde', { pose: 'sitzen', ry: PI });
  } },
];
// CRM-Leitstand im Marketing: Videowand mit Kennzahlen der Hartwig Karte, Pult mit drei Plätzen
SIGNATUR.marketing.unshift({ w: 5.0, d: 2.8, einmal: true, bau(S, sc, x, z, w, d, st, r, farbe) {
  const L = lokal(S, x + w / 2, 0.06, z + 0.4, 0);
  L.box(4.8, 0.08, 0.3, 0, 0, 0, '#2a2d31');
  const kacheln = [['Hartwig Karte', '#d23c32'], ['Öffnungen', '#2f6fb3'], ['Einlösungen', '#3ab27a'], ['Segmente', '#e9b44c'], ['App aktiv', '#7a4fc0'], ['Push', '#d0457a']];
  kacheln.forEach(([t, f], i) => {
    const u = -1.6 + (i % 3) * 1.6, y = 0.95 + Math.floor(i / 3) * 0.95;
    L.box(1.55, 0.9, 0.08, u, y, 0, '#1b2026'); L.box(1.45, 0.8, 0.01, u, y + 0.05, 0.045, '#10161c');
    text(L, t, u, y + 0.72, 0.056, 0.13, '#ffffff', f);
    if (i === 3) { for (let k = 0; k < 5; k++) L.box(0.22, 0.22, 0.01, u - 0.5 + k * 0.25, y + 0.25, 0.055, waehle(r, ['#e9b44c', '#d65a6f', '#5bc0eb', '#9bc53d', '#f2f2f2'])); }
    else if (i % 2) balken(L, u, y + 0.1, 0.055, 1.2, 0.45, r, [f, '#f2f2f2']);
    else linie(L, u, y + 0.12, 0.055, 1.2, 0.45, r, f);
  });
  L.box(0.3, 2.9, 0.3, -2.45, 0, 0, '#2a2d31'); L.box(0.3, 2.9, 0.3, 2.45, 0, 0, '#2a2d31');
  const T2 = L.sub(0, 1.5); T2.box(4.0, 0.05, 0.8, 0, 0.72, 0, '#2a2d31'); T2.box(3.8, 0.72, 0.05, 0, 0, -0.35, '#3a3f45');
  for (let k = -1; k <= 1; k++) { monitor(T2.sub(k * 1.25, -0.15), 0, 0, 2, r, '#f2c6d2'); buerostuhl(T2, k * 1.25, 0.7, PI, Math.max(1, st), farbe); }
  for (let k = -1; k <= 1; k += 2) figur(S, x + w / 2 + k * 1.25, z + 0.4 + 1.5 + 0.7, Math.floor(r() * 1e4), 'kunde', { pose: 'sitzen', ry: PI });
  L.box(4.6, 0.36, 0.08, 0, 2.86, 0, farbe); text(L, 'CRM-Leitstand', 0, 2.88, 0.05, 0.26, '#ffffff', farbe);
} });

// ------------------------------------------------------------------ Sitzungssaal (Kopfbild Vorstand, Coffee „Board Meeting“)
/** Eigenständiger Raum: zwei holzvertäfelte Wände mit Bücherregalen und Bildschirm, weiße Deckenkante, langer Tisch mit
 *  dunklem Mittelband, Mikrofonen und Blumen, Vorstand sitzend (Kleidungsfarbe aus dem Porträt, unbesetzt leerer Stuhl).
 *  opt.ressorts: [{ kurz, name?, portraet? }]. Rückgabe { box } für die Kamera. */
export function hqSitzungssaal(S, scene, opt = {}) {
  vorbereiten(S, scene);
  const r = rng(4711);
  const B = 12, T = 8.6, H = 3.3, HOLZ = '#c4743f', HOLZ_D = '#a85f32', FUGE = '#8f4f2a', WEISS = '#f2f4f4';
  // Boden: helles Parkett in Dielen
  S.box(B, 0.2, T, B / 2, -0.1, T / 2, '#b78b66');
  for (let i = 0; i < 24; i++) S.box(B / 24 - 0.02, 0.02, T, (i + 0.5) * (B / 24), 0.0, T / 2, i % 2 ? '#e8b48c' : '#e2ab83');
  // Rückwand (z = 0) und linke Wand (x = 0): Vertäfelung in Feldern, Sockel, weiße Deckenkante
  const wandX = (x0, x1) => { S.box(x1 - x0, H, 0.2, (x0 + x1) / 2, H / 2, 0.1, HOLZ); };
  const wandZ = (z0, z1) => { S.box(0.2, H, z1 - z0, 0.1, H / 2, (z0 + z1) / 2, HOLZ_D); };
  wandX(0, B); wandZ(0, T);
  S.box(B + 0.3, 0.35, 0.7, B / 2 - 0.15, H, 0.25, WEISS); S.box(0.7, 0.35, T, 0.25, H, T / 2, '#e3e7e8');
  S.box(B, 0.16, 0.05, B / 2, 0.02, 0.22, FUGE); S.box(0.05, 0.16, T, 0.22, 0.02, T / 2, FUGE);
  for (let u = 1.5; u < B; u += 1.5) S.box(0.06, H - 0.4, 0.04, u, 0.2, 0.22, FUGE);
  for (let u = 1.7; u < T; u += 1.7) S.box(0.04, H - 0.4, 0.06, 0.22, 0.2, u, FUGE);
  S.box(B, 0.05, 0.04, B / 2, 1.05, 0.22, FUGE); S.box(0.04, 0.05, T, 0.22, 1.05, T / 2, FUGE);
  // Wandleuchten (heller Fleck über den Feldern der linken Wand)
  for (let u = 2.55; u < T - 0.5; u += 1.7) S.box(0.03, 0.9, 0.5, 0.24, 2.0, u, '#e9b98f');
  // Bücherregale links und rechts des Bildschirms an der Rückwand
  const buecher = (lx, y, lz, w, h) => { let u = lx - w / 2; while (u < lx + w / 2 - 0.08) { const b = zw(r, 0.06, 0.1); if (r() < 0.85) L0.box(b - 0.01, h * zw(r, 0.6, 0.9), 0.26, u + b / 2, y, lz, waehle(r, ['#2b3a55', '#3d5d7a', '#7a2836', '#2f6b5f', '#d8d0bf', '#5a3b26', '#1f6470'])); u += b; } };
  const L0 = lokal(S, 0, 0.0, 0, 0);
  for (const cx of [1.9, B - 1.9]) regal(lokal(S, cx, 0.0, 0.45, 0), 0, 0, 2.6, H - 0.35, '#4a2f1f', (lx, y, lz, w, h) => buecher(lx + cx, y, lz + 0.45, w, h), r, 0.5, 4);
  // Bildschirm mit Präsentation
  S.box(3.6, 2.0, 0.1, B / 2, 0.95, 0.26, '#1c2024'); S.box(3.4, 1.8, 0.02, B / 2, 1.05, 0.32, '#2c3a44');
  const LB = lokal(S, B / 2, 0.0, 0.34, 0);
  balken(LB, -0.7, 1.3, 0, 1.4, 1.1, r, ['#e6edf1', '#66bb6a']); linie(LB, 0.8, 1.35, 0, 1.3, 1.0, r, '#e9b44c');
  // Konferenztisch: Holzplatte, dunkles Mittelband, Wangen
  const tx = B / 2 + 0.3, tz = T / 2 + 0.6, lang = 7.4, tief = 2.3;
  const L = lokal(S, tx, 0.0, tz, 0);
  L.box(lang, 0.08, tief, 0, 0.74, 0, '#9a5a35'); L.box(lang - 0.6, 0.02, 0.62, 0, 0.82, 0, '#1d1f22');
  L.box(lang - 0.6, 0.6, 0.5, 0, 0.14, 0, '#1d1f22');
  for (const s of [-1, 1]) L.box(0.12, 0.74, tief - 0.4, s * (lang / 2 - 0.5), 0, 0, '#26292d');
  // Plätze: vier je Längsseite, einer am Kopf
  const ressorts = opt.ressorts?.length ? opt.ressorts : RESSORTS_STANDARD;
  const plaetze = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) plaetze.push({ u: (k - 1.5) * 1.6, v: s * (tief / 2 + 0.35), ry: s > 0 ? PI : 0 });
  plaetze.push({ u: lang / 2 + 0.45, v: 0, ry: -PI / 2 });
  const sitzende = [{ kurz: 'CEO', name: 'CEO', ceo: true }, ...ressorts];
  plaetze.forEach((p, i) => {
    const R = sitzende[i];
    buerostuhl(L, p.u, p.v, p.ry, 2, '#1d1f22');
    // Mikrofon, Mappe und Blumen vor jedem zweiten Platz
    const mu = p.u - (p.ry === -PI / 2 ? 0.75 : 0), mv = p.ry === -PI / 2 ? 0 : p.v * 0.55;
    L.box(0.32, 0.02, 0.24, mu, 0.83, mv, '#f4f2ee');
    L.box(0.02, 0.28, 0.02, mu + 0.22, 0.83, mv * 0.82, '#2a2d31'); L.kugel(0.035, mu + 0.22, 1.12, mv * 0.82, '#2a2d31');
    if (R && (R.ceo || R.name)) {
      const [X, Z] = L.P(p.u, p.v);
      figur(S, X, Z, hashText(R.name ?? R.kurz) % 100000, R.ceo ? 'leitung' : 'fremd', { pose: 'sitzen', ry: p.ry, farbe: R.ceo ? '#3c4148' : kleidFarbe(R.portraet) });
    }
  });
  for (let k = 0; k < 4; k++) { const u = (k - 1.5) * 1.6 + 0.8; L.zyl(0.05, 0.06, 0.14, u, 0.84, 0, '#8a2232', 8); L.kugel(0.08, u, 1.04, 0, '#f2f2ee'); L.zyl(0.008, 0.008, 0.14, u, 0.9, 0, '#3f6b3a', 4); }
  return { box: new THREE.Box3(new THREE.Vector3(-0.2, -0.2, -0.2), new THREE.Vector3(B + 0.4, H + 0.4, T + 0.2)) };
}
