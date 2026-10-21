// Archetyp-Modul Ost: die sechs Stadttypen der ehemaligen DDR, ihre Flächen (Aufmarschplatz, Hafen, Brache,
// Plattenbaugebiet), Slot-Bauer (ostbauten.js) und das Stilprofil 'ost' für die normalen Stadthäuser.
// Registriert sich beim Import (siehe archetypen/README.md und die Dokumentation oben in stadtplan.js).
//
// Jeder Ost-Entwurf setzt E.ostArt(i, j) → 'magistrale' | 'zentrum' | 'altstadt' | 'barock' | 'messe' | 'gruenderzeit' | 'platte' | null
// und E.ostEinkauf ('zentrum' | 'messe' | 'altstadt'): wie die Blöcke der Einkaufslage um die Hartwig-Häuser bebaut werden.
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { registriereArchetyp, PLAN_HILFE as H } from '../stadtplan.js';
import { registriereSlots, registriereStilProfil } from '../bauer.js';
import { OST_SLOTS } from '../ostbauten.js';
import { rng, waehle, zw, FARBEN, fensterRaster, dachProfil } from '../basis.js';

const { nimm, fixiere, frei, zelleFrei, wasserSpalte, klemm, wahlGewichtet, neueParzelle, mergeRand, freiePosition, parzellenVon } = H;

// ====================================================================================
// Gemeinsame Einstellungen
// ====================================================================================
const OST_VIERTEL = { magistrale: 'zentrum', zentrum: 'zentrum', altstadt: 'altstadt', barock: 'barock', messe: 'messe', gruenderzeit: 'gruenderzeit', platte: 'rand' };
const OST_VERBOT = new Set(['slot:mall', 'slot:konkurrenz', 'slot:hochhaus', 'slot:parkhaus', 'slot:tankstelle']);
function ostGrund(E, art, unsaniert) {
  E.ost = art;
  E.viertel = (i, j) => OST_VIERTEL[E.ostArt(i, j)] ?? 'gruenderzeit';
  E.unsaniert = { altstadt: 0.15, gruenderzeit: 0.25, messe: 0.08, barock: 0, zentrum: 0, magistrale: 0, ...unsaniert };
  E.landmarkVerbot = OST_VERBOT;
  E.kleingaertenExtra = 1;
  E.bracheErlaubt = (i, j) => E.ostArt(i, j) !== 'magistrale';
}

// ====================================================================================
// Entwürfe
// ====================================================================================
/** Bezirksstadt: Magistrale (z-Linie) mit Aufmarschplatz, Altstadtrest mit Kirche, 70er-Zentrum, Plattenbaugürtel. */
function sozialistisch(E) {
  const { r, T } = E;
  const kM = klemm(Math.floor(E.nx / 2), 2, E.nx - 2);
  const jc = klemm(Math.floor(E.nz / 2) - 1 + (r() < 0.5 ? 0 : 1), 1, E.nz - 2);
  E.zTyp[kM] = 'magistrale'; fixiere(E, kM); E.tram.push('z' + kM);
  E.spalten[kM] = Math.max(E.spalten[kM], T.idx === 2 ? 96 : 118);
  E.reihen[jc] = Math.max(E.reihen[jc], T.idx === 2 ? 86 : 104);
  nimm(E, { art: 'aufmarsch', i0: kM, i1: kM, j0: jc, j1: jc, variante: 'kulturhaus', dominante: E.o.dominante ?? null, kultur: E.o.kultur ?? null, seiten: [] });
  for (const k of [kM, kM + 1]) fixiere(E, k, jc, jc);
  const altKern = (i, j) => i <= kM - 2 && i >= kM - 4 && Math.abs(j - jc) <= 1;
  if (kM - 2 >= 0) { const jk = jc - 1 + (r() < 0.5 ? 0 : 1); nimm(E, { art: 'kirche', i0: kM - 2, i1: kM - 2, j0: jk, j1: jk, seiten: ['-z', '-x'], kirchTyp: E.o.dom ? 'dom' : null }); E.landmarken.push('slot:kirche'); }
  E.versatz = (k, j) => (altKern(k - 0.5, j) ? 12 : 0);
  E.einschub = (i, j) => (altKern(i, j) ? 0.35 : 0);
  E.durchgang = 0.3;
  E.ostArt = (i, j) => {
    if ((i === kM - 1 || i === kM) && Math.abs(j - jc) <= 2) return 'magistrale';
    if (altKern(i, j)) return 'altstadt';
    const dd = wurzelSumme(i - kM - 0.8, (j - jc) * 1.1);
    return dd < 2.2 ? 'zentrum' : dd < 3.3 ? 'gruenderzeit' : 'platte';
  };
  ostGrund(E, 'sozialistisch');
  E.ostEinkauf = 'zentrum';
  E.magistraleVariante = r() < 0.5 ? 'berlin' : 'dresden';
  E.zentrum = { i: kM + 1, j: jc + 0.3 };
  E.brachen = 1;
  E.umriss = 'voll';
  E.marktVariante = 'keiner';
}

/** Berlin: West-City (Raster, Gründerzeit, Kaufhäuser) | Grünschneise | Ost-Zentrum (Fernsehturm, Magistrale, Platte). */
function ostberlin(E) {
  const { r } = E;
  const w = E.spalten[0], d = E.reihen[0];
  E.spalten = E.spalten.map(() => Math.round((w * zw(r, 0.92, 1.08)) / 2) * 2);
  E.reihen = E.reihen.map(() => Math.round((d * zw(r, 0.92, 1.08)) / 2) * 2);
  const kS = Math.floor(E.nx * 0.4);
  E.spalten[kS] = Math.round(zw(r, 54, 64));
  for (let a = 0; a < E.nz;) {
    const len = Math.min(E.nz - a, 1 + Math.floor(r() * 2.6));
    nimm(E, { art: 'gruenguertel', i0: kS, i1: kS, j0: a, j1: a + len - 1, achse: 'z' });
    a += len;
  }
  for (let k = 0; k <= E.nx; k++) fixiere(E, k);
  const lA = Math.floor(E.nz / 2);
  E.xTyp[lA] = 'boulevard';
  const iT = kS + 1, kM = kS + 3;
  E.spalten[iT] = Math.max(E.spalten[iT], 104); E.spalten[iT + 1] = Math.max(E.spalten[iT + 1], 96);
  E.reihen[lA] = Math.max(E.reihen[lA], 110);
  nimm(E, { art: 'aufmarsch', i0: iT, i1: iT + 1, j0: lA, j1: lA, variante: 'fernsehturm', seiten: [] });
  E.zTyp[kM] = 'magistrale'; E.tram.push('z' + kM);
  const ostKern = { i: kM + 1.5, j: lA - 0.5 }, westKern = { i: kS - 2, j: lA - 0.5 };
  E.ostArt = (i, j) => {
    if (i <= kS) return null;
    if ((i === kM - 1 || i === kM) && Math.abs(j - lA) <= 3) return 'magistrale';
    const dd = wurzelSumme(i - ostKern.i, j - ostKern.j);
    if (dd < 2.1 || (j === lA - 1 && i >= iT && i < kM)) return 'zentrum';
    return dd < 3.4 ? 'gruenderzeit' : 'platte';
  };
  ostGrund(E, 'ostberlin', { gruenderzeit: 0.22 });
  E.ostEinkauf = 'zentrum';
  E.magistraleVariante = 'berlin';
  const ostViertel = E.viertel;
  E.viertel = (i, j) => {
    if (i > kS) return ostViertel(i, j);
    const dd = wurzelSumme(i - westKern.i, j - westKern.j);
    return dd < 1.5 ? 'zentrum' : dd < 3 ? 'gruenderzeit' : 'nachkrieg';
  };
  E.landmarkVerbot = new Set(['slot:mall', 'slot:tankstelle']);
  E.zweiKerne = [ostKern, westKern];
  E.westTeil = (i) => i < kS;
  E.bracheErlaubt = (i, j) => i > kS && E.ostArt(i, j) !== 'magistrale';
  E.zentrum = ostKern;
  E.marktVariante = 'keiner';
  E.brachen = 1;
  E.umriss = 'voll';
}

/** Dresden: Hbf oben, Prager Straße (70er), Altmarkt mit Kulturpalast an der Magistrale, Barockinsel am Fluss, Neustadt. */
function barockWiederaufbau(E) {
  const { r } = E;
  const nz = E.nz, nx = E.nx;
  const jF = nz - 2, c = klemm(Math.floor(nx / 2) - 1, 1, nx - 3);
  E.reihen[jF] = Math.round(zw(r, 66, 80));
  nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: nx - 1, j0: jF, j1: jF, quer: true, brueckeP: 0.3, brueckenZahl: 3 });
  for (let k = 0; k <= nx; k++) fixiere(E, k, jF, jF);
  E.spalten[c - 1] = Math.max(E.spalten[c - 1], 64); E.spalten[c] = Math.max(E.spalten[c], 64);
  E.reihen[jF - 1] = Math.max(E.reihen[jF - 1], 74);
  nimm(E, { art: 'schloss', i0: c - 1, i1: c, j0: jF - 1, j1: jF - 1 });
  E.landmarken.push('slot:schloss', 'slot:kirche');
  nimm(E, { art: 'kirche', i0: c + 1, i1: c + 1, j0: jF - 2, j1: jF - 2, seiten: ['-z', '-x', '+x'], kirchStil: 'barock', kirchForm: 'kuppel' });
  nimm(E, { art: 'park', i0: c + 1, i1: c + 1, j0: jF - 1, j1: jF - 1, garten: true });
  const lM = jF - 2;
  E.xTyp[lM] = 'magistrale'; E.tram.push('x' + lM);
  const jAlt = lM - 1;
  E.reihen[jAlt] = Math.max(E.reihen[jAlt], 92);
  E.spalten[c] = Math.max(E.spalten[c], 100);
  nimm(E, { art: 'aufmarsch', i0: c, i1: c, j0: jAlt, j1: jAlt, variante: 'kulturpalast', seiten: [] });
  E.reihen[0] = Math.max(E.reihen[0], 116);
  nimm(E, { art: 'bahn', i0: Math.max(0, c - 1), i1: Math.min(nx - 1, c + 2), j0: 0, j1: 0, oben: true, gross: true, bahnhofLinie: c + 1 });
  E.landmarken.push('slot:bahnhof');
  for (let k = 0; k <= nx; k++) fixiere(E, k);
  const mitte = c + 0.5;
  E.ostArt = (i, j) => {
    if (j === nz - 1) return 'gruenderzeit';
    if (j >= jF - 2 && j < jF) return Math.abs(i - mitte) <= 2.1 ? 'barock' : 'zentrum';
    if (j === lM - 1 || j === lM) return Math.abs(i - mitte) <= 3 ? 'magistrale' : 'platte';
    return Math.abs(i - mitte - 0.5) < 1.6 ? 'zentrum' : 'platte';
  };
  ostGrund(E, 'barock_wiederaufbau', { gruenderzeit: 0.25 });
  E.ostEinkauf = 'prager';
  E.magistraleVariante = 'dresden';
  E.zentrum = { i: c + 1, j: Math.max(1, jAlt - 1) + 0.2 };
  E.brachen = 1;
  E.umriss = 'voll';
  E.marktVariante = 'keiner';
}

/** Leipzig: Ring mit Promenade, dichte Messehaus-Altstadt, Plattenzentrum am Ring, Augustusplatz mit Hochhaus, großer Hbf. */
function messestadt(E) {
  H.entwurf('ring', E);
  const { r } = E;
  const { gl, gr, gt, gb } = E.ringIdx;
  E.ringTor = false;
  const kern = E.kernZellen;
  E.reihen[0] = Math.max(E.reihen[0], 124);
  if (gt >= 1) { nimm(E, { art: 'bahn', i0: gl, i1: Math.min(E.spalten.length - 1, gr + 1), j0: 0, j1: 0, oben: true, gross: true }); E.landmarken.push('slot:bahnhof'); }
  const jm = Math.round((gt + gb) / 2);
  const iA = gr + 1;
  if (iA < E.spalten.length) {
    E.spalten[iA] = Math.max(E.spalten[iA], 104); E.reihen[jm] = Math.max(E.reihen[jm], 100);
    nimm(E, { art: 'aufmarsch', i0: iA, i1: iA, j0: jm, j1: jm, variante: 'augustus', seiten: [] });
  }
  const zc = { i: (gl + gr) / 2, j: (gt + gb) / 2 };
  E.ostArt = (i, j) => {
    if (kern(i, j)) return j === gt + 1 ? 'zentrum' : 'messe';
    if ((j === gb + 1 || j === gt - 1) && i > gl && i < gr) return 'zentrum';   // Plattenzentrum außen am Ring
    const dd = wurzelSumme(i - zc.i, j - zc.j);
    return dd < 4.3 ? 'gruenderzeit' : 'platte';
  };
  ostGrund(E, 'messestadt', { gruenderzeit: 0.32 });
  E.ostEinkauf = 'messe';
  E.einschub = (i, j) => (kern(i, j) ? 0.45 : 0);
  E.durchgang = 0.9;
  E.marktVariante = r() < 0.6 ? 'einer' : 'keiner';
  E.brachen = 1;
}

/** Erhaltene Altstadt (Fachwerk, Residenz oder Dom), teils unsaniert, Plattenbauränder. */
function ostAltstadt(E) {
  const basis = E.o.basis && ['altstadt', 'dom', 'residenz', 'ring', 'flussknick'].includes(E.o.basis) ? E.o.basis : 'altstadt';
  H.entwurf(basis, E);
  const v0 = E.viertel, zc = { ...E.zentrum };
  E.ostArt = (i, j) => {
    const dd = wurzelSumme(i - zc.i, j - zc.j);
    if (dd > (E.T.idx === 2 ? 2.3 : 3.0)) return 'platte';
    const v = v0(i, j);
    return v === 'altstadt' || v === 'barock' || v === 'zentrum' ? 'altstadt' : 'gruenderzeit';
  };
  ostGrund(E, 'ost_altstadt', { altstadt: 0.15, gruenderzeit: 0.28 });
  E.ostEinkauf = 'altstadt';
  E.viertel = (i, j) => { const a = E.ostArt(i, j); return a === 'platte' ? 'rand' : v0(i, j) === 'barock' ? 'barock' : a; };
  E.landmarkMax = 3;
  E.brachen = 1;
  E.ostFachwerk = basis === 'altstadt' || basis === 'dom';
}

/** Hansestadt: Hafenkante unten, Backsteinaltstadt mit Kirchen, Magistrale in Backstein, Plattenbaugebiete. */
function ostseeHanse(E) {
  const { r } = E;
  E.spalten = E.spalten.map((w) => Math.round((w * zw(r, 0.7, 1.15)) / 2) * 2);
  E.reihen = E.reihen.map((d) => Math.round((d * zw(r, 0.7, 1.1)) / 2) * 2);
  const nx = E.nx, jW = E.nz - 1;
  E.reihen[jW] = 48;   // Hafenbecken fest 48 m (Wasser im Nahausschnitt ≤ 15 %)
  nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: nx - 1, j0: jW, j1: jW, quer: true, keineBruecke: true });
  const zc = { i: (nx - 1) / 2 + zw(r, -0.4, 0.4), j: jW - 3.0 };   // Innenstadt drei Reihen über dem Hafen (Wasser nah ≤ 15 %)
  const kern = (i, j) => j < jW && wurzelSumme(i - zc.i, (j - zc.j) * 1.15) < 2.3;
  const iH = r() < 0.5 ? 0 : nx - 2;
  nimm(E, { art: 'hafen', i0: iH, i1: iH + 1, j0: jW - 1, j1: jW - 1 });
  E.landmarken.push('slot:kirche');
  const ci = Math.round(zc.i);
  for (const [i, j] of [[ci - 1, jW - 2], [ci + 1, jW - 3]]) if (zelleFrei(E, i, j)) nimm(E, { art: 'kirche', i0: i, i1: i, j0: j, j1: j, seiten: ['-z', '-x'], kirchStil: 'backsteingotik' });
  const lM = Math.max(1, jW - 3);
  E.xTyp[lM] = 'magistrale'; E.tram.push('x' + lM);
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 14 : 4);
  E.einschub = (i, j) => (kern(i, j) ? 0.4 : 0.08);
  E.durchgang = 0.35;
  for (const k of [0, nx]) fixiere(E, k);
  E.ostArt = (i, j) => {
    if ((j === lM - 1 || j === lM) && Math.abs(i - zc.i) <= 2.6) return 'magistrale';
    if (kern(i, j)) return 'altstadt';
    return wurzelSumme(i - zc.i, j - zc.j) < (E.T.idx === 2 ? 2.6 : 3.4) ? 'gruenderzeit' : 'platte';
  };
  ostGrund(E, 'ostsee_hanse', { altstadt: 0.15, gruenderzeit: 0.3 });
  E.ostEinkauf = 'altstadt';
  E.zentrum = { i: zc.i, j: jW - 2.2 };
  E.magistraleStil = 'backstein';
  E.magistraleVariante = 'rostock';
  E.umriss = 'voll';
  E.brachen = 1;
}

// ====================================================================================
// Parzellierung
// ====================================================================================
const SEITEN = ['+z', '+x', '-z', '-x'];
/** Seite des Blocks zur Einkaufsstraße (Fußgängerzone), sonst null. */
function einkaufSeite(ctx, b) {
  for (const s of ['+z', '+x', '-z', '-x']) { const sg = ctx.segVon(b.rand[s]?.seg); if (sg && (sg.typ === 'fussgaenger')) return s; }
  return null;
}

function parzellierung(ctx, E, b) {
  const { rb } = ctx;
  const oa = E.ostArt ? E.ostArt(b.i0, b.j0) : null;
  b.ostArt = oa;
  if (oa === null) return false;   // West-Berlin
  const wh = ctx.einkaufSlots[0] ?? null;
  // Einkaufslage: Blöcke mit Standorten, an den Einkaufsstraßen und (außer in Altstädten) im ganzen Rechteck der Lage
  const imRechteck = E.ostEinkauf !== 'altstadt' && (E.einkaufslagen ?? []).some((L) => b.i0 >= L.i0 && b.i0 <= L.i1 && b.j0 >= L.j0 && b.j0 <= L.j1);
  const einkauf = !!wh || !!E.einkaufKern?.(b.i0, b.j0) || imRechteck;
  ctx.ostEinkauf = einkauf ? E.ostEinkauf : null;
  ctx.magSeiten = oa === 'magistrale' || einkauf ? SEITEN.filter((s) => ctx.segVon(b.rand[s]?.seg)?.art === 'magistrale') : [];
  if (!wh && !einkauf && oa === 'platte' && b.w >= 40 && b.d >= 36) { ostPlatte(ctx, E, b); return true; }
  if (!wh && ctx.magSeiten.length && b.w >= 40 && b.d >= 36) { ostMagistrale(ctx, E, b, ctx.magSeiten); return true; }
  const zentrumArt = oa === 'zentrum' || (oa === 'magistrale' && !ctx.magSeiten.length) || ctx.ostEinkauf === 'zentrum' || ctx.ostEinkauf === 'prager';
  if (!wh && zentrumArt && b.w >= 44 && b.d >= 30 && (einkauf || rb() < 0.75)) { ostZentrum(ctx, E, b, einkauf ? einkaufSeite(ctx, b) : null); return true; }
  if (oa === 'messe' || ctx.ostEinkauf === 'messe') ctx.parz = [15, 30];
  else if (zentrumArt) ctx.parz = [12, 30];
  return false;
}

/** Nach der Blockrandparzellierung: Einkaufslage, 70er-Zentrum, Magistralenfront, unsanierte Altbauten, Wendebauten, Brachen. */
function nachbearbeitung(ctx, E, b) {
  const { rb } = ctx;
  const oa = b.ostArt;
  if (oa === null || oa === undefined) return;
  const meine = () => parzellenVon(ctx);
  const magSeiten = ctx.magSeiten ?? [];
  let art = ctx.ostEinkauf === 'prager' ? 'zentrum' : ctx.ostEinkauf ?? oa;
  if (magSeiten.length) {
    const stil = E.magistraleStil ?? 'zuckerbaecker';
    for (let k = 0; k < 3; k++) if (!mergeRand(ctx, 'slot:magistrale', [40, 100], 0, magSeiten, { variante: E.magistraleVariante ?? 'berlin', geschosse: E.typ === 'metropole' ? 9 : 7, stil, landmarke: false })) break;
    if (art === 'magistrale') art = 'zentrum';
  }
  if (art === 'magistrale' || art === 'platte') art = 'zentrum';
  if (art === 'zentrum') {
    // 70er-Zentrum bzw. Einkaufslage Ost: Arkadenzeilen (in Dresden als Prager Scheiben), Pavillons, Wendebauten
    const prager = ctx.ostEinkauf === 'prager';
    const runden = ctx.ostEinkauf ? 9 : 6;
    for (let k = 0; k < runden; k++) {
      const hoch = prager ? rb() < 0.7 : rb() < (E.ost === 'ostberlin' ? 0.45 : 0.25);
      const g = hoch ? (prager ? 12 : E.typ === 'metropole' ? 14 : 10) : 5;
      if (!mergeRand(ctx, 'slot:platte_zentrum', ctx.ostEinkauf ? [24, 80] : [40, 80], 26, ['+z', '+x', '-z', '-x'], { variante: 'arkade', geschosse: g, zustand: rb() < 0.65 ? 'saniert' : 'unsaniert', landmarke: false })) break;
    }
    for (const p of meine()) if (p.typ === 'eck' && p.ecke === '+x+z' && p.w >= 20 && p.d >= 18 && rb() < (ctx.ostEinkauf ? 0.8 : 0.5)) Object.assign(p, { typ: 'slot:pavillon', sonder: 'pavillon', stil: null, variante: 'faltdach', geschosse: 1, landmarke: false });
    if (rb() < (ctx.ostEinkauf ? 0.5 : 0.22)) mergeRand(ctx, 'slot:wendebau', [26, 44], 24, ['+z', '+x'], { landmarke: false });
    // Reste der Reihe: Lückenbauten in Platte, sonst Ost-Zentrumshäuser (Stilprofil 'ost', Viertel ostzentrum)
    for (const p of meine()) {
      if (p.typ !== 'stadthaus' && p.typ !== 'eck') continue;
      const L = p.seite === '+z' || p.seite === '-z' ? p.w : p.d;
      if (p.typ === 'stadthaus' && L >= 12 && L <= 24 && rb() < (ctx.ostEinkauf ? 0.6 : 0.3)) Object.assign(p, { typ: 'slot:platte_zentrum', sonder: 'platte_zentrum', stil: null, variante: 'luecke', geschosse: rb() < 0.5 ? 5 : 6, zustand: rb() < 0.6 ? 'saniert' : 'unsaniert', landmarke: false });
      else p.viertel = 'ostzentrum';
    }
    return;
  }
  if (art === 'messe') {
    // Messehäuser: große, dichte Geschäftshäuser mit Passagen; im Hof Pflaster
    let n = 0;
    for (let k = 0; k < 5; k++) if (mergeRand(ctx, 'slot:messehaus', [18, 64], 22, ['+z', '+x', '-z', '-x'], { geschosse: 5 + Math.floor(rb() * 2.6), landmarke: false })) n++;
    for (const p of meine()) if (p.typ === 'eck' && p.w >= 16 && p.d >= 16 && rb() < 0.6) Object.assign(p, { typ: 'slot:messehaus', sonder: 'messehaus', stil: null, variante: 'eck', geschosse: 6, landmarke: false });
    if (n && b.hof) b.hof.art = 'pflaster';
    for (const p of meine()) if (p.typ === 'stadthaus' || p.typ === 'eck') p.viertel = 'messe';
    if (!ctx.ostEinkauf) unsaniert(ctx, E, b, 'messe');
    return;
  }
  unsaniert(ctx, E, b, art, ctx.ostEinkauf ? 1.6 : 1);
  if (ctx.ostEinkauf) {
    // Ost-Spuren in der Altstadt-Einkaufslage: Platte in der Lücke, Wendebau
    const l = meine().filter((p) => p.typ === 'stadthaus' && (p.seite === '+z' || p.seite === '+x') && (p.seite === '+z' ? p.w : p.d) >= 12);
    for (let k = 0; k < Math.min(2, l.length); k++) {
      const p = l.splice(Math.floor(rb() * l.length), 1)[0];
      Object.assign(p, { typ: 'slot:platte_zentrum', sonder: 'platte_zentrum', stil: null, variante: 'luecke', geschosse: p.geschosse && p.geschosse > 3 ? Math.min(6, p.geschosse + 1) : 5, zustand: rb() < 0.5 ? 'saniert' : 'unsaniert', landmarke: false });
    }
    if (rb() < 0.3) mergeRand(ctx, 'slot:wendebau', [26, 40], 24, ['+z', '+x'], { landmarke: false });
    return;
  }
  if (art === 'gruenderzeit' && rb() < 0.14) mergeRand(ctx, 'slot:wendebau', [26, 40], 24, ['+z', '+x'], { landmarke: false });
  if ((art === 'gruenderzeit' || art === 'altstadt') && rb() < 0.12 && H.bracheErlaubt(E)) {
    // Kriegs- oder Abrisslücke in der Reihe: Brandwand nur am tatsächlichen Nachbarn links
    const l = meine().filter((p) => p.typ === 'stadthaus' && (p.seite === '+z' || p.seite === '+x'));
    if (l.length) {
      const p = l[Math.floor(rb() * l.length)];
      const alle = meine();
      const links = alle.some((q) => q !== p && q.seite === p.seite && (p.seite === '+z' ? Math.abs(q.x + q.w - p.x) < 0.2 : Math.abs(q.z + q.d - p.z) < 0.2) && (q.typ === 'stadthaus' || q.typ === 'eck' || q.typ.startsWith('slot:altbau')));
      Object.assign(p, { typ: 'slot:brache', sonder: 'brache', stil: null, variante: waehle(rb, ['wiese', 'kiosk', 'bauzaun']), landmarke: false, brandwand: links, brandwandHinten: false });
      H.bracheZaehlen(E);
    }
  }
}
function unsaniert(ctx, E, b, art, faktor = 1) {
  const { rb } = ctx;
  const q = (E.unsaniert?.[art] ?? 0) * (rb() < 0.5 ? 0.3 : 1.7) * faktor;
  for (const p of parzellenVon(ctx)) if ((p.typ === 'stadthaus' || p.typ === 'eck') && rb() < q) {
    const variante = p.typ === 'eck' ? 'eck' : 'reihe';
    Object.assign(p, { typ: 'slot:altbau_unsaniert', sonder: 'altbau_unsaniert', zustand: 'unsaniert', variante, stilAlt: p.stil, stil: null, landmarke: false });
  }
}

/** Magistralen-Block: Magistralenbauten mit Front zur Magistrale (gedreht), Hof mit Platte der 60er. */
function ostMagistrale(ctx, E, b, seiten) {
  const { rb } = ctx;
  const s = seiten.includes('+z') ? '+z' : seiten.includes('+x') ? '+x' : seiten[0];
  const variante = E.magistraleVariante ?? 'berlin';
  const g = E.typ === 'metropole' ? 9 : E.typ === 'mittelstadt' ? 5 : 7;
  const ex = { klasse: 5, variante, geschosse: g, landmarke: false };
  const stuecke = (L) => { const n = Math.max(1, Math.round(L / 80)); return Array.from({ length: n }, () => L / n); };
  let hof;
  if (s[1] === 'z') {
    const d = Math.min(30, b.d * 0.42), z = s === '+z' ? b.z + b.d - d : b.z;
    let u = b.x;
    for (const l of stuecke(b.w)) { neueParzelle(ctx, 'slot:magistrale', u, z, l, d, [s], s, { ...ex }); u += l; }
    hof = s === '+z' ? { x: b.x, z: b.z, w: b.w, d: b.d - d } : { x: b.x, z: b.z + d, w: b.w, d: b.d - d };
  } else {
    const w = Math.min(30, b.w * 0.42), x = s === '+x' ? b.x + b.w - w : b.x;
    let u = b.z;
    for (const l of stuecke(b.d)) { neueParzelle(ctx, 'slot:magistrale', x, u, w, l, [s], s, { ...ex }); u += l; }
    hof = s === '+x' ? { x: b.x, z: b.z, w: b.w - w, d: b.d } : { x: b.x + w, z: b.z, w: b.w - w, d: b.d };
  }
  // GESTALTUNG.md 1 (B1): im Zentrum schließt Plattenbau-Blockrand (Arkaden, fünf Geschosse) den Block an den übrigen
  // Straßenseiten; der Hof bleibt klein und gepflastert statt Rasen mit frei stehender Zeile
  const T = Math.min(22, Math.max(12, (Math.min(hof.w, hof.d) - 26) / 2));
  const rest = ['+z', '-z', '+x', '-x'].filter((q) => q !== s);
  const pl = (x, z, w, d, f) => { if (w >= 10 && d >= 10) neueParzelle(ctx, 'slot:platte_zentrum', x, z, w, d, [f], f, { klasse: 4, variante: 'arkade', geschosse: 5, zustand: rb() < 0.6 ? 'saniert' : 'unsaniert', landmarke: false }); };
  const zr = rest.filter((q) => q[1] === 'z'), xr = rest.filter((q) => q[1] === 'x');
  for (const q of zr) pl(hof.x, q === '-z' ? hof.z : hof.z + hof.d - T, hof.w, T, q);
  const z0 = hof.z + (zr.includes('-z') ? T : 0), z1 = hof.z + hof.d - (zr.includes('+z') ? T : 0);
  for (const q of xr) pl(q === '-x' ? hof.x : hof.x + hof.w - T, z0, T, z1 - z0, q);
  const ix0 = hof.x + (xr.includes('-x') ? T : 0), ix1 = hof.x + hof.w - (xr.includes('+x') ? T : 0);
  b.hof = { x: ix0, z: z0, w: Math.max(0, ix1 - ix0), d: Math.max(0, z1 - z0), art: rb() < 0.5 ? 'pflaster' : 'kies' };
  b.tiefen = { '+z': 0, '-z': 0, '+x': 0, '-x': 0 };
}

/** 70er-Zentrum: Wohnscheibe mit Ladenpavillon (prager), Punkthochhaus-Ensemble oder Arkadenzeilen, ab und zu ein Wendebau. */
function ostZentrum(ctx, E, b, frontSeite) {
  const { rb } = ctx;
  const z = (typ, x, zz, w, d, front, ex) => neueParzelle(ctx, typ, x, zz, w, d, front, 'frei', { klasse: 5, landmarke: false, zustand: rb() < 0.65 ? 'saniert' : 'unsaniert', ...ex });
  const x0 = b.x + 1, w = b.w - 2;
  const prager = E.ostEinkauf === 'prager' && frontSeite;
  if (frontSeite && frontSeite !== '+z') {
    // Front zur Einkaufsstraße an -z, -x oder +x: ganze Prager Zeile oder Hochhaus-Ensemble, zur Einkaufsstraße gedreht
    const quer = frontSeite[1] === 'x', lw = quer ? b.d - 2 : b.w - 2, ld = quer ? b.w - 2 : b.d - 2;
    const ganz = prager && lw >= 70 && ld >= 46 ? 'prager' : !prager && E.typ !== 'mittelstadt' && lw >= 52 && ld >= 50 && rb() < 0.35 ? 'ensemble' : null;
    if (ganz) {
      z('slot:platte_zentrum', b.x + 1, b.z + 1, b.w - 2, b.d - 2, [frontSeite], { variante: ganz });
      b.hof = { x: b.x + 1, z: b.z + 1, w: b.w - 2, d: b.d - 2, art: 'gruen' };
      return;
    }
    // sonst gedrehte Arkadenzeile an dieser Seite, dahinter Scheibe oder Ensemble zur +z-Straße
    const tief = 30;
    if (frontSeite === '-z') z('slot:platte_zentrum', x0, b.z + 1, w, tief, ['-z'], { variante: 'arkade', geschosse: prager ? 12 : 5 });
    else if (frontSeite === '+x') z('slot:platte_zentrum', b.x + b.w - tief - 1, b.z + 1, tief, b.d - 2, ['+x'], { variante: 'arkade', geschosse: prager ? 12 : 5 });
    else z('slot:platte_zentrum', b.x + 1, b.z + 1, tief, b.d - 2, ['-x'], { variante: 'arkade', geschosse: prager ? 12 : 5 });
    if (frontSeite === '-z') {
      const rest = b.d - tief - 3;
      if (rest >= 46 && w >= 70) z('slot:platte_zentrum', x0, b.z + tief + 2, w, rest, ['+z', '+x'], { variante: 'prager' });
      else if (rest >= 22) z('slot:platte_zentrum', x0, b.z + tief + 2, w, rest, ['+z'], { variante: 'arkade' });
      else if (rest >= 16) z('slot:pavillon', x0 + 2, b.z + tief + 2, Math.min(34, w - 4), rest, ['+z', '+x'], { geschosse: 1 });
    } else {
      const rw = b.w - tief - 3, rx = frontSeite === '+x' ? b.x + 1 : b.x + tief + 2;
      if (rw >= 30) z('slot:platte_zentrum', rx, b.z + 1, rw, Math.min(30, b.d - 2), ['+z'], { variante: 'arkade', geschosse: 5 });
      if (rw >= 24 && b.d - 34 >= 18) z('slot:pavillon', rx, b.z + 33, Math.min(34, rw), Math.min(30, b.d - 34), ['+z', '+x'], { geschosse: 1 });
    }
    b.hof = { x: b.x + 1, z: b.z + 1, w: b.w - 2, d: b.d - 2, art: rb() < 0.5 ? 'gruen' : 'spielplatz' };   // Restfläche: Grün zwischen den Bauten
    return;
  }
  let zEnde = b.z + b.d - 1;
  const vorn = b.w >= 72 && b.d >= 48 ? 'prager' : b.w >= 52 && b.d >= 50 && rb() < 0.6 ? 'ensemble' : 'arkade';
  const dv = { prager: Math.min(b.d - 2, 62), ensemble: Math.min(b.d - 2, 56), arkade: Math.min(b.d - 2, 30) }[vorn];
  z('slot:platte_zentrum', x0, zEnde - dv, w, dv, ['+z', '+x'], { variante: vorn });
  zEnde -= dv;
  const rest = zEnde - b.z - 1;
  if (rest >= 24) {
    // hinten zur Parallelstraße: Hochhaus-Ensemble mit Front -z, Wendebau oder Arkadenzeile
    if (rest >= 50 && w >= 52 && E.typ !== 'mittelstadt' && rb() < 0.3) z('slot:platte_zentrum', x0, b.z + 1, w, rest, ['-z'], { variante: 'ensemble' });
    else if (rb() < 0.25) z('slot:wendebau', x0, b.z + 1, Math.min(w, 56), Math.min(rest, 34), ['+z', '+x'], {});
    else z('slot:platte_zentrum', x0, b.z + 1, w, rest, ['-z'], { variante: 'arkade' });
  } else if (rest >= 16) z('slot:pavillon', x0 + 2, b.z + 1, Math.min(34, w - 4), rest, ['+z', '+x'], { geschosse: 1 });
  b.hof = { x: b.x + 1, z: b.z + 1, w: b.w - 2, d: b.d - 2, art: 'gruen' };
}

// ------------------------------------------------------------------------------------
// Plattenbaugebiet (WBS 70): Zeilen in beiden Richtungen, Höfe aus Zeilen, Winkel, Punkthäuser,
// Abstandsgrün, Wohnwege, Parkplätze, Spielplätze, Kaufhalle, Schule und Kita im Gebiet
// ------------------------------------------------------------------------------------
const AUSSTATTUNG = ['kaufhalle', 'schule', 'kita', null, 'kaufhalle', null, 'kita', null];
function ostPlatte(ctx, E, b) {
  const { rb } = ctx;
  b.art = 'platte'; b.hof = null;
  b.wege = []; b.parkplaetze = []; b.spiel = [];
  const metro = E.typ === 'metropole', klein = E.typ === 'mittelstadt';
  const zustand = () => (rb() < (E.saniert ?? 0.55) ? 'saniert' : 'unsaniert');
  const belegt = [];
  const setze = (typ, x, z, w, d, front, ex) => { const p = neueParzelle(ctx, typ, x, z, w, d, Array.isArray(front) ? front : [front], 'frei', { klasse: 4, landmarke: false, ...ex }); belegt.push(p); return p; };
  const gewichte = [['wbs70_6', 3], ['p2', 1.4], ['q3a', klein ? 1.6 : 0.6], ['wbs70_11', metro ? 2 : klein ? 0.2 : 0.9], ['scheibe', metro ? 1.0 : 0.25]];
  const geschosse = (v) => (/11|scheibe/.test(v) ? 11 : v === 'q3a' ? 5 : 6);
  /** Zeile: entlang x (front ±z) oder entlang z (front ±x); lange Zeilen werden geteilt (Durchgang 10 m). */
  const zeile = (x, z, w, d, front, vWunsch) => {
    const entlangX = front[1] === 'z', L = entlangX ? w : d;
    if (L < 26) return;
    const v = vWunsch ?? wahlGewichtet(rb, gewichte.filter(([q]) => q !== 'scheibe' || L >= 60));
    const n = Math.max(1, Math.ceil(L / 92)), gap = n > 1 ? 10 : 0, Ls = (L - gap * (n - 1)) / n;
    for (let k = 0; k < n; k++) {
      const vv = k && rb() < 0.4 ? wahlGewichtet(rb, gewichte.filter(([q]) => q !== 'scheibe' || Ls >= 60)) : v;
      const o = k * (Ls + gap);
      if (entlangX) setze('slot:platte_wohn', x + o, z, Ls, d, front, { variante: vv, zustand: zustand(), geschosse: geschosse(vv) });
      else setze('slot:platte_wohn', x, z + o, w, Ls, front, { variante: vv, zustand: zustand(), geschosse: geschosse(vv) });
      if (k > 0) b.wege.push(entlangX ? { x: x + o - gap + 2, z, w: gap - 4, d } : { x, z: z + o - gap + 2, w, d: gap - 4 });
    }
  };
  let X0 = b.x + 2, Z0 = b.z + 2, X1 = b.x + b.w - 2, Z1 = b.z + b.d - 2;
  const TD = 20;   // Zeilengrundstück: 12 m Bau, 5 m Vorzone mit Parkreihe, 3 m Grün
  // Ausstattung des Gebiets an der sichtbaren +z-Kante (Kaufhalle, Schule, Kita)
  E.plattenNr = (E.plattenNr ?? 0) + 1;
  const aus = AUSSTATTUNG[(E.plattenNr - 1) % AUSSTATTUNG.length];
  const MA = { kaufhalle: ['slot:kaufhalle', 44, 38, undefined, 1], schule: ['slot:schule', 82, 54, 'erfurt', 4], kita: ['slot:schule', 56, 48, 'kita', 2] }[aus];
  if (MA && MA[1] <= X1 - X0 && MA[2] + 40 <= Z1 - Z0) {
    const [typ, aw, ad, variante, g] = MA;
    setze(typ, X1 - aw, Z1 - ad, aw, ad, ['+z', '+x'], { variante, geschosse: g });
    const rw = X1 - X0 - aw - 4;
    if (rw >= 30) zeile(X0, Z1 - TD, rw, TD, '+z');
    else if (rw >= 14) b.spiel.push({ x: X0, z: Z1 - ad, w: rw, d: ad });
    b.wege.push({ x: X0, z: Z1 - ad - 4, w: X1 - X0, d: 2.4 });
    Z1 = Z1 - ad - 5;
  }
  const W = X1 - X0, D = Z1 - Z0;
  if (D < TD) return;
  const lay = (() => {
    const l = [];
    if (W >= 2 * TD + 26 && D >= 2 * TD + 26) l.push(['hof', 3]);
    if (W >= 2 * TD + 14 && D >= 40) l.push(['quer', 2.2]);
    if (D >= 2 * TD + 14 && W >= 40) l.push(['laengs', 1.6]);
    if (W >= TD + 34 && D >= TD + 30) l.push(['winkel', 2]);
    if (W >= 60 && D >= TD + 40 && !klein) l.push(['punkt', metro ? 1.6 : 0.8]);
    if (W >= 112 && D >= 50) l.push(['doppelwinkel', 1.3]);
    if ((W >= 78 && D >= 50) || (D >= 78 && W >= 50)) l.push(['kurve', 0.7]);
    return l.length ? wahlGewichtet(rb, l) : 'eine';
  })();
  b.layout = lay;
  if (lay === 'hof') {
    // Hof aus vier Zeilen: Fronten zur Straße, Loggien zum gemeinsamen Hof, Ecken offen für Wege
    zeile(X0, Z0, W, TD, '-z');
    zeile(X0, Z1 - TD, W, TD, '+z');
    const zi0 = Z0 + TD + 5, zi1 = Z1 - TD - 5;
    zeile(X0, zi0, TD, zi1 - zi0, '-x');
    zeile(X1 - TD, zi0, TD, zi1 - zi0, '+x');
    const hof = { x: X0 + TD + 2, z: Z0 + TD + 2, w: W - 2 * TD - 4, d: D - 2 * TD - 4 };
    b.spiel.push({ x: hof.x + hof.w * 0.3, z: hof.z + hof.d * 0.3, w: Math.min(16, hof.w * 0.4), d: Math.min(12, hof.d * 0.4) });
    b.wege.push({ x: X0, z: Z0 + TD + 1, w: W, d: 2.4 }, { x: X0 + TD + 1, z: Z0, w: 2.4, d: D });
  } else if (lay === 'quer') {
    // Zeilen parallel zu z, paarweise mit den Eingängen zum gemeinsamen Wohnweg mit Parkplatz
    const A1 = 18, A2 = 16;
    let x = X0, k = 0;
    while (X1 - x >= TD) {
      const front = k % 2 === 0 ? '+x' : '-x';
      zeile(x, Z0, TD, D, front);
      x += TD;
      if (k % 2 === 0 && X1 - x >= A2 + TD) { b.parkplaetze.push({ x: x + 2, z: Z0 + 4, w: A2 - 4, d: Math.min(D - 8, 60) }); b.wege.push({ x: x + 1, z: Z0, w: A2 - 2, d: 2.4 }); x += A2; }
      else if (X1 - x >= A1 + TD) { b.spiel.push({ x: x + 3, z: Z0 + D * 0.4, w: A1 - 6, d: Math.min(12, D * 0.3) }); x += A1; }
      else break;
      k++;
    }
  } else if (lay === 'laengs') {
    const A1 = 18, A2 = 16;
    let z = Z1, k = 0;
    while (z - Z0 >= TD) {
      const front = k % 2 === 0 ? '+z' : '-z';
      zeile(X0, z - TD, W, TD, front);
      z -= TD;
      if (k % 2 === 0 && z - Z0 >= A2 + TD) { b.parkplaetze.push({ x: X0 + 4, z: z - A2 + 2, w: Math.min(W - 8, 70), d: A2 - 4 }); z -= A2; }
      else if (z - Z0 >= A1 + TD) { b.spiel.push({ x: X0 + W * 0.4, z: z - A1 + 3, w: Math.min(14, W * 0.3), d: A1 - 6 }); b.wege.push({ x: X0, z: z - A1 / 2 - 1, w: W, d: 2.4 }); z -= A1; }
      else break;
      k++;
    }
  } else if (lay === 'winkel') {
    // Winkel aus zwei Zeilen an der sichtbaren Ecke, im Innenwinkel Spielplatz, Parkplatz und ein Punkthaus
    zeile(X0, Z1 - TD, W, TD, '+z');
    zeile(X1 - TD, Z0, TD, D - TD - 4, '+x');
    const iw = W - TD - 4, id = D - TD - 4;
    b.wege.push({ x: X0, z: Z1 - TD - 3.4, w: W - TD, d: 2.4 });
    // Punkthaus im Innenwinkel an der hinteren Straße: Front -z, zur Kamera zeigen Hof- und Giebelseite
    if (iw >= 36 && id >= 34 && rb() < 0.6) setze('slot:platte_wohn', X0, Z0, Math.min(36, iw), Math.min(34, id), ['-z'], { variante: metro ? 'ph16' : 'wuerfel', zustand: zustand(), geschosse: metro ? 16 : 6 });
    else if (id >= 26) zeile(X0, Z0, iw, TD, '-z');
    b.parkplaetze.push({ x: X0 + Math.min(40, iw * 0.55), z: Z0 + 2, w: Math.max(10, iw - Math.min(40, iw * 0.55) - 2), d: Math.min(16, id - 4) });
    b.spiel.push({ x: X0 + iw * 0.35, z: Z0 + id * 0.6, w: Math.min(14, iw * 0.3), d: Math.min(10, id * 0.3) });
  } else if (lay === 'punkt') {
    const vp = metro ? 'ph16' : 'wuerfel', gp = metro ? 16 : 6;
    if (D > W * 1.25 && W >= TD + 40) {
      // hohes Gebiet: Punkthochhäuser an der +x-Straße (Front +x), lange Zeile an der -x-Straße
      const n = Math.max(1, Math.floor((D + 10) / 40));
      for (let k = 0; k < n; k++) setze('slot:platte_wohn', X1 - 34, Z0 + k * (D / n), 34, Math.min(34, D / n - 4), ['+x'], { variante: vp, zustand: zustand(), geschosse: gp });
      zeile(X0, Z0, TD, D, '-x', metro ? 'wbs70_11' : undefined);
      b.parkplaetze.push({ x: X0 + TD + 3, z: Z0 + 4, w: Math.max(6, Math.min(14, W - TD - 40)), d: Math.min(D - 8, 60) });
    } else {
      // Punkthochhäuser an der Straße, lange Elfgeschosser dahinter
      const n = Math.max(1, Math.floor((W + 10) / 40));
      for (let k = 0; k < n; k++) setze('slot:platte_wohn', X0 + k * (W / n), Z1 - 34, Math.min(34, W / n - 4), 34, ['+z'], { variante: vp, zustand: zustand(), geschosse: gp });
      zeile(X0, Z0, W, TD, '-z', metro ? 'wbs70_11' : undefined);
      b.parkplaetze.push({ x: X0 + 4, z: Z0 + TD + 3, w: Math.min(W - 8, 60), d: Math.max(6, Math.min(14, D - TD - 40)) });
    }
  } else if (lay === 'doppelwinkel') {
    // Zwei Winkelbauten als Windmühle: einer an der +x+z-Ecke (Front +z), einer an der -x-z-Ecke (Front -z, Hofseiten zur Kamera)
    const Xm = X0 + Math.round(W / 2);
    setze('slot:platte_wohn', Xm + 1, Z0, X1 - Xm - 1, D, ['+z'], { variante: 'winkel', zustand: zustand() });
    setze('slot:platte_wohn', X0, Z0, Xm - X0 - 1, D, ['-z'], { variante: 'winkel', zustand: zustand() });
    b.spiel.push({ x: Xm - 8, z: Z0 + D * 0.42, w: 16, d: Math.min(12, D * 0.2) });
  } else if (lay === 'kurve') {
    // Gekrümmte Zeile (WBS 70 im Bogen) zur längeren Straße, dahinter Abstandsgrün
    const f = D > W ? (rb() < 0.5 ? '+x' : '-x') : (rb() < 0.6 ? '+z' : '-z');
    const quer = f[1] === 'x', tiefe = quer ? W : D, Dk = Math.min(tiefe, 62), rest = tiefe - Dk;
    // Bogen an der Frontstraße, bei tiefen Blöcken an der Gegenseite eine gerade Zeile
    if (f === '+z') setze('slot:platte_wohn', X0, Z1 - Dk, W, Dk, [f], { variante: 'kurve', zustand: zustand() });
    else if (f === '-z') setze('slot:platte_wohn', X0, Z0, W, Dk, [f], { variante: 'kurve', zustand: zustand() });
    else if (f === '+x') setze('slot:platte_wohn', X1 - Dk, Z0, Dk, D, [f], { variante: 'kurve', zustand: zustand() });
    else setze('slot:platte_wohn', X0, Z0, Dk, D, [f], { variante: 'kurve', zustand: zustand() });
    if (rest >= TD + 6) {
      if (f === '+z') zeile(X0, Z0, W, TD, '-z'); else if (f === '-z') zeile(X0, Z1 - TD, W, TD, '+z');
      else if (f === '+x') zeile(X0, Z0, TD, D, '-x'); else zeile(X1 - TD, Z0, TD, D, '+x');
    }
  } else {
    zeile(X0, Z1 - TD, W, TD, '+z');
    if (D >= 2 * TD + 10) zeile(X0, Z0, W, TD, '-z');
    else if (D - TD >= 12) { b.parkplaetze.push({ x: X0 + 2, z: Z0 + 1, w: Math.min(W * 0.55, 50), d: Math.min(14, D - TD - 3) }); if (W > 60) b.spiel.push({ x: X0 + W * 0.68, z: Z0 + 2, w: Math.min(14, W * 0.25), d: Math.min(10, D - TD - 4) }); }
  }
  void belegt;
}

/** Großer Platz: Kulturhaus und Dominante (Bezirksstadt), Fernsehturm (Berlin), Kulturpalast (Dresden), Oper und Uni-Hochhaus (Leipzig). */
function ostAufmarsch(ctx, E, b) {
  const { rb } = ctx;
  const v = b.variante ?? 'kulturhaus';
  const m = 6;
  const P = { x: b.x + m, z: b.z + m, w: b.w - 2 * m, d: b.d - 2 * m };
  b.platz = { x: b.x + 1, z: b.z + 1, w: b.w - 2, d: b.d - 2 };
  const fr = (typ, x, z, w, d, ex) => neueParzelle(ctx, typ, x, z, w, d, ['+z', '+x'], 'frei', { klasse: 5, landmarke: false, ...ex });
  if (v === 'fernsehturm') {
    const s = Math.min(48, P.w * 0.28, P.d * 0.42);
    fr('slot:dominante', P.x + P.w * 0.36 - s / 2, P.z + P.d * 0.34 - s / 2, s, s, { variante: 'fernsehturm', geschosse: 60 });
    b.brunnen = { x: P.x + P.w * 0.72, z: P.z + P.d * 0.66 };
    const pw = Math.min(32, P.w * 0.22), pd = 26;
    fr('slot:pavillon', P.x + P.w - pw, P.z, pw, pd, { variante: 'hp', geschosse: 1 });
    fr('slot:pavillon', P.x, P.z + P.d - pd, pw, pd, { variante: 'eisbar', geschosse: 1 });
    return;
  }
  // Slots so groß, wie die Bauten wirklich sind (keine verlorenen Mini-Bauten), Rest bleibt Platz mit Brunnen
  const kw = Math.min(v === 'kulturpalast' ? 86 : 74, P.w * 0.58), kd = Math.min(v === 'kulturpalast' ? 62 : 54, P.d * 0.5);
  fr('slot:kulturhaus', P.x, P.z, kw, kd, { variante: v === 'kulturpalast' ? 'palast' : v === 'augustus' ? 'stadthalle' : b.kultur ?? waehle(rb, ['kulturhaus50', 'kulturhaus50', 'stadthalle']) });
  if (v !== 'kulturpalast') {
    const dw = Math.min(58, P.w - kw - 8), dd = Math.min(46, P.d * 0.42);
    const dv = v === 'augustus' ? 'uni' : b.dominante ?? (dw >= 54 ? waehle(rb, ['interhotel', 'uni', 'kanzel']) : waehle(rb, ['uni', 'kanzel', 'uni']));
    // Wunschdominante nur, wenn sie annähernd in voller Größe passt (sonst wirkt sie als Miniatur), sonst die nächstschmalere
    const NAT = { uni: [62, 46], kanzel: [36, 34], interhotel: [72, 46], rund: [56, 46] };
    const passt = (q) => (NAT[q] ?? [56, 46])[0] <= dw * 1.2;
    const dvP = passt(dv) ? dv : ['rund', 'uni', 'kanzel'].find((q) => q !== dv && passt(q)) ?? 'kanzel';
    const nat = NAT[dvP] ?? [56, 46];
    if (dw >= 24) fr('slot:dominante', P.x + P.w - Math.min(dw, nat[0]), P.z, Math.min(dw, nat[0]), Math.min(dd, nat[1]), { variante: dvP, geschosse: v === 'augustus' ? 30 : 18 });
  } else if (P.w - kw > 40) fr('slot:pavillon', P.x + P.w - 34, P.z + 4, 34, 30, { variante: 'brunnen', geschosse: 1 });
  if (P.d - kd > 44) fr('slot:pavillon', P.x + P.w - 30, P.z + P.d - 28, 30, 28, { variante: waehle(rb, ['hp', 'faltdach', 'brunnen']), geschosse: 1 });
  b.brunnen = { x: P.x + P.w * 0.42, z: P.z + kd + (P.d - kd) * 0.55 };
}

/** Ein Heizkraftwerk am äußersten Plattenbaugebiet. */
function nachPlan(E, _H, g) {
  const { bloecke, parzellen, T, typ } = g;
  const dist = (b) => wurzelSumme((b.i0 + b.i1) / 2 - E.zentrum.i, (b.j0 + b.j1) / 2 - E.zentrum.j);
  const pl = bloecke.filter((b) => b.art === 'platte').sort((a, c) => dist(c) - dist(a));
  for (const b of pl.slice(0, 6)) {
    const rects = b.parzellen.map((id) => parzellen.find((p) => p.id === id)).filter(Boolean);
    const rb = rng(b.seed + 4242);
    const q = freiePosition({ x: b.x + 3, z: b.z + 3, w: b.w - 6, d: b.d - 6 }, rects, 50, 40, 2, rb, false);
    if (!q) continue;
    neueParzelle({ T, rb, b, parzellen, region: E.region, typ }, 'slot:heizwerk', q.x, q.z, q.w, q.d, ['+z', '+x'], 'frei', { klasse: 2, landmarke: false, variante: 'gas' });
    b.parkplaetze = (b.parkplaetze ?? []).filter((P) => !H.ueberlappt(P, q, 1));
    b.spiel = (b.spiel ?? []).filter((P) => !H.ueberlappt(P, q, 1));
    return;
  }
  const b = pl[0];
  if (!b) return;
  const p = b.parzellen.map((id) => parzellen.find((q) => q.id === id)).find((q) => q && q.typ === 'slot:platte_wohn');
  if (p) Object.assign(p, { typ: 'slot:heizwerk', sonder: 'heizwerk', variante: p.w >= 60 && p.d >= 48 ? 'kohle' : p.w >= 50 && p.d >= 40 ? 'gas' : 'umformer', zustand: undefined, front: ['+z', '+x'] });
}

// ====================================================================================
// Flächen: Parzellierung und Boden (B = Hilfen aus stadt.js)
// ====================================================================================
function bracheParzelle(ctx, E, b) {
  // Große Fläche: Brache nur an der Straßenecke (+x, +z, höchstens 64 × 46 m), der Rest bleibt Plattenbauquartier.
  // Sonst entsteht eine leere Fläche über einen ganzen Block (Dresden 216 × 112 m).
  if (b.w > 90 || b.d > 70) {
    ostPlatte(ctx, E, b);
    const W = Math.min(64, b.w * 0.45), D = Math.min(46, b.d * 0.5), R = { x: b.x + b.w - W, z: b.z + b.d - D, w: W, d: D };
    const ueber = (p) => p.x < R.x + R.w && p.x + p.w > R.x && p.z < R.z + R.d && p.z + p.d > R.z;
    const weg = new Set(b.parzellen.filter((id) => { const p = ctx.parzellen.find((q) => q.id === id); return p && ueber(p); }));
    for (let k = ctx.parzellen.length - 1; k >= 0; k--) if (weg.has(ctx.parzellen[k].id)) ctx.parzellen.splice(k, 1);
    b.parzellen = b.parzellen.filter((id) => !weg.has(id));
    for (const L of ['wege', 'parkplaetze', 'spiel']) if (b[L]) b[L] = b[L].filter((p) => !ueber(p));
    neueParzelle(ctx, 'slot:brache', R.x + 2, R.z + 2, R.w - 4, R.d - 4, ['+z', '+x'], 'block', { klasse: 1, variante: waehle(ctx.rb, ['wiese', 'parkplatz', 'bauzaun', 'kiosk']), brandwand: false, brandwandHinten: false });
    return;
  }
  // Ganze Fläche als Brache: frei stehend, also keine Brandwände (kein Nachbarhaus auf der Fläche)
  neueParzelle(ctx, 'slot:brache', b.x + 2, b.z + 2, b.w - 4, b.d - 4, ['+z', '+x'], 'block', { klasse: 1, variante: waehle(ctx.rb, ['wiese', 'wiese', 'parkplatz', 'bauzaun', 'kiosk']), brandwand: false, brandwandHinten: false });
}

/** Abstandsgrün mit Wohnwegen, Parkplätzen, Spielplätzen, Bäumen, Wäschespinnen (Vorzonen baut ostbauten selbst). */
function bodenPlatte(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.36;
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, B.F.rasen);
  const hinder = [...teile, ...(b.parkplaetze ?? []), ...(b.spiel ?? [])];
  const frei = (x, z, rad, auch = []) => ![...hinder, ...auch].some((p) => B.imRechteck(x, z, p, rad)) && x > b.x + 1 && x < b.x + b.w - 1 && z > b.z + 1 && z < b.z + b.d - 1;
  for (const P of b.wege ?? []) S.quader(P.x, y, P.z, P.x + P.w, y + 0.05, P.z + P.d, '#ddd5c3');
  for (const P of b.parkplaetze ?? []) {
    if (P.w < 6 || P.d < 6) continue;
    S.quader(P.x, y, P.z, P.x + P.w, y + 0.03, P.z + P.d, '#9a9fa4');
    B.baueParkplatz(ctx, { x: P.x + 0.5, z: P.z + 0.5, w: P.w - 1, d: P.d - 1 }, y + 0.03, r);
  }
  for (const P of b.spiel ?? []) {
    if (P.w < 6 || P.d < 5) continue;
    const cx = P.x + P.w / 2, cz = P.z + P.d / 2;
    S.quader(P.x, y, P.z, P.x + P.w, y + 0.08, P.z + P.d, '#ead8a6');
    S.quader(P.x - 0.2, y, P.z - 0.2, P.x + P.w + 0.2, y + 0.3, P.z + 0.1, '#bdb7aa');
    S.box(2.8, 0.14, 0.14, cx + 1.4, y + 2.1, cz + 1, '#d04a3f'); S.box(0.14, 2.1, 0.14, cx, y + 1.05, cz + 1, '#d04a3f'); S.box(0.14, 2.1, 0.14, cx + 2.8, y + 1.05, cz + 1, '#d04a3f');
    S.box(1.8, 1.0, 1.8, cx - 2.2, y + 0.5, cz - 1.2, '#e0b23c');
    if (P.w > 10) { S.box(0.6, 1.6, 0.6, P.x + 1.5, y + 0.8, P.z + P.d - 1.5, '#2f6fa8'); S.box(0.5, 0.12, 2.6, P.x + 1.5, y + 1.0, P.z + P.d - 3.0, '#e9e5dc'); }
    for (let k = 0; k < 4 * ctx.dichte; k++) B.figur(I, B.zw(r, P.x + 1, P.x + P.w - 1), y, B.zw(r, P.z + 1, P.z + P.d - 1), r);
  }
  const n = Math.round((b.w * b.d) / 150);
  for (let i = 0; i < n; i++) {
    const x = B.zw(r, b.x + 3, b.x + b.w - 3), z = B.zw(r, b.z + 3, b.z + b.d - 3);
    if (!frei(x, z, 3.2, b.wege ?? [])) continue;
    B.baumSetzen(I, waehle(r, ['birke', 'birke', 'pappel', 'linde', 'kugel', 'nadel']), x, y, z, r, B.zw(r, 0.75, 1.05));
  }
  for (let k = 0; k < 4; k++) {
    const x = B.zw(r, b.x + 5, b.x + b.w - 5), z = B.zw(r, b.z + 5, b.z + b.d - 5);
    if (!frei(x, z, 2.5, b.wege ?? [])) continue;
    S.box(0.1, 1.8, 0.1, x, y + 0.9, z, B.F.metall);
    S.box(2.6, 0.05, 0.05, x, y + 1.75, z, B.F.metall); S.box(0.05, 0.05, 2.6, x, y + 1.75, z, B.F.metall);
    if (r() < 0.6) S.box(1.0, 0.6, 0.04, x + 0.6, y + 1.45, z, waehle(r, ['#f1f1ee', '#e9c9c9', '#c9d9e9']));
  }
  for (const P of b.wege ?? []) for (let i = 0, nf = Math.round((P.w + P.d) / 14 * ctx.dichte); i < nf; i++) B.figur(I, B.zw(r, P.x + 0.4, P.x + P.w - 0.4), y + 0.05, B.zw(r, P.z + 0.4, P.z + P.d - 0.4), r);
}

/** Großer Platz: Granitplatten, Fahnenmasten, Brunnen, Rasenkanten mit Bäumen, Doppelleuchten, viele Leute. */
function bodenAufmarsch(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const P = b.platz ?? b, y = 0.34;
  B.pflasterFlaeche(ctx, P, y, '#dcd6ca', 6);
  const frei = (x, z, rad) => !teile.some((p) => B.imRechteck(x, z, p, rad));
  for (const [x0, z0, x1, z1, entlangX] of [[P.x + 1, P.z + P.d - 6, P.x + P.w - 1, P.z + P.d - 1.5, true], [P.x + P.w - 6, P.z + 1, P.x + P.w - 1.5, P.z + P.d - 1, false]]) {
    S.quader(x0, y, z0, x1, y + 0.05, z1, B.F.rasen);
    if (entlangX) { for (let x = x0 + 4; x < x1 - 3; x += 9) if (frei(x, (z0 + z1) / 2, 3)) B.baumSetzen(I, 'linde', x, y + 0.05, (z0 + z1) / 2, r, 0.85); }
    else for (let z = z0 + 4; z < z1 - 3; z += 9) if (frei((x0 + x1) / 2, z, 3)) B.baumSetzen(I, 'linde', (x0 + x1) / 2, y + 0.05, z, r, 0.85);
  }
  if (b.brunnen && frei(b.brunnen.x, b.brunnen.z, 7)) {
    B.brunnen(S, b.brunnen.x, b.brunnen.z, y, 1.5);
    for (const [dx, dz, ry] of [[-9, 0, Math.PI / 2], [9, 0, -Math.PI / 2], [0, 9, Math.PI], [0, -9, 0]]) I.setze('bank', b.brunnen.x + dx, y, b.brunnen.z + dz, ry);
  }
  const zF = P.z + P.d - 9;
  for (let x = P.x + P.w * 0.3; x < P.x + P.w * 0.75; x += 5) {
    if (!frei(x, zF, 1)) continue;
    S.box(0.18, 11, 0.18, x, y + 5.5, zF, '#e9e7e2');
    S.box(0.06, 1.8, 2.8, x, y + 9.9, zF + 1.4, waehle(r, ['#2f63b5', '#d23c32', '#e0b23c', '#f1f1ee']));
  }
  for (const [x, z] of [[P.x + 3, P.z + 3], [P.x + P.w - 3, P.z + 3], [P.x + 3, P.z + P.d - 8], [P.x + P.w - 8, P.z + P.d - 8], [P.x + P.w / 2, P.z + P.d / 2]]) if (frei(x, z, 1)) I.setze('doppellaterne', x, y, z, 0);
  const n = Math.round((P.w * P.d) / 34 * ctx.dichte);
  for (let i = 0; i < n; i++) { const x = B.zw(r, P.x + 1, P.x + P.w - 1), z = B.zw(r, P.z + 1, P.z + P.d - 1); if (frei(x, z, 0.5) && (!b.brunnen || wurzelSumme(x - b.brunnen.x, z - b.brunnen.z) > 7)) B.figur(I, x, y, z, r); }
}

/** Hafenkante: Kaimauer, Pflaster, Speicher aus Backstein, Portalkräne, Poller. */
function bodenHafen(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.34;
  B.pflasterFlaeche(ctx, b, y, '#cfc6b4', 5);
  const n = Math.max(1, Math.floor((b.w - 10) / 30));
  for (let k = 0; k < n; k++) {
    const w = B.zw(r, 18, 24), d = B.zw(r, 14, 18), x = b.x + 5 + k * 30, z = b.z + 4;
    const Hh = B.zw(r, 16, 22), f = waehle(r, ['#a8583f', '#b06a52', '#9e5c47']);
    S.quader(x, y, z, x + w, y + Hh, z + d, f);
    fensterRaster(S, x, z, w, d, '+z', { y0: y + 1.5, geschosse: Math.floor(Hh / 3.2) - 1, gh: 3.2, raster: 2.6, fw: 1.0, fh: 1.5, farbe: '#3a4248' });
    fensterRaster(S, x, z, w, d, '+x', { y0: y + 1.5, geschosse: Math.floor(Hh / 3.2) - 1, gh: 3.2, raster: 2.6, fw: 1.0, fh: 1.5, farbe: '#3a4248' });
    S.add(dachProfil(w, d, 6, 0.2, 'x').translate(x + w / 2, y + Hh, z + d / 2), '#5d4a40');
    S.box(2.4, 6, 0.3, x + w / 2, y + Hh + 1, z + d + 0.1, f);
  }
  for (let k = 0; k < 2; k++) {
    const x = b.x + b.w * (0.3 + 0.4 * k), z = b.z + b.d - 6;
    const f = waehle(r, ['#c8322b', '#2f6f8f', '#e0b23c']);
    for (const dx of [-2.6, 2.6]) for (const dz of [-2.6, 2.6]) S.box(0.5, 12, 0.5, x + dx, y + 6, z + dz, f);
    S.box(6.4, 3, 6.4, x, y + 13.5, z, f);
    S.box(0.8, 0.8, 26, x, y + 15.4, z + 6, f, 0);
    S.box(1.6, 1.6, 2.6, x, y + 16.2, z - 3, '#e9e5dc');
  }
  for (let x = b.x + 8; x < b.x + b.w - 10; x += 7) {
    if (r() < 0.35) continue;
    const xx = b.x + b.w * 0.3, xk = b.x + b.w * 0.7;
    if (Math.abs(x - xx) < 6 || Math.abs(x - xk) < 6) continue;
    for (let q = 0; q < 2; q++) {
      const zc = b.z + 26 + q * 3;
      const lagen = 1 + Math.floor(r() * 2.2);
      for (let k = 0; k < lagen; k++) S.box(6, 2.5, 2.4, x, y + 1.25 + k * 2.55, zc, waehle(r, ['#b5523f', '#2f6f8f', '#3f7d56', '#d9a33a', '#8c9aa6', '#e9e5dc']));
    }
  }
  for (let x = b.x + 3; x < b.x + b.w - 2; x += 8) I.setze('poller', x, y, b.z + b.d - 1, 0);
  for (let i = 0, nf = Math.round(b.w / 5 * ctx.dichte); i < nf; i++) B.figur(I, B.zw(r, b.x + 2, b.x + b.w - 2), y, B.zw(r, b.z + b.d - 12, b.z + b.d - 2), r);
  void teile; void FARBEN;
}

function bodenBrache(ctx, b, r, teile, B) { ctx.S.quader(b.x, 0, b.z, b.x + b.w, 0.3, b.z + b.d, '#a9b48e'); void r; void teile; void B; }

// ====================================================================================
// Stilprofil der normalen Stadthäuser in Ost-Städten (stadthaeuser.js bleibt unverändert)
// ====================================================================================
const OST_STILE = {
  altstadt: { gruenderzeit: 2.2, barock: 1.4, jugendstil: 1.1, fachwerk: 0.6, wiederaufbau: 0.9, ddr_platte: 0.35, neubau: 0.3 },
  barock: { barock: 4, gruenderzeit: 0.9, wiederaufbau: 0.6, neubau: 0.2 },
  zentrum: { ddr_platte: 3.2, wiederaufbau: 1.4, siebziger: 0.9, neubau: 0.9, gruenderzeit: 0.6, bauhaus: 0.3 },
  ostzentrum: { ddr_platte: 4, wiederaufbau: 1.8, siebziger: 0.5, bauhaus: 0.3 },   // Einkaufslage Ost: kein westliches Stadthaus
  gruenderzeit: { gruenderzeit: 3.6, jugendstil: 1.3, ddr_platte: 0.9, wiederaufbau: 0.5, neubau: 0.4 },
  messe: { gruenderzeit: 2.6, jugendstil: 2.0, bauhaus: 0.8, ddr_platte: 0.4, wiederaufbau: 0.3, neubau: 0.2 },
  rand: { ddr_platte: 3, gruenderzeit: 1.2, wiederaufbau: 1, neubau: 0.6, siebziger: 0.4 },
};
const OST_GESCHOSSE = {
  gruenderzeit: [3, 5], jugendstil: [3, 5], backstein: [3, 5], fachwerk: [2, 3], fuenfziger: [3, 6], siebziger: [4, 7], neubau: [4, 6],
  barock: [3, 4], ddr_platte: [4, 6], bauhaus: [3, 5], wiederaufbau: [3, 4],
};
function ostStil(p, nachbar) {
  const r = rng(((p.seed ?? 1) * 2654435761 + 977) >>> 0);
  const v = OST_STILE[p.viertel] ? p.viertel : 'gruenderzeit';
  const basis = { ...OST_STILE[v] };
  if (p.region === 'nord' && v !== 'ostzentrum') { basis.backstein = (v === 'zentrum' ? 1.2 : 2.6); basis.barock = (basis.barock ?? 0) * 0.3; }
  if (p.ostFachwerk && v === 'altstadt') basis.fachwerk = 2.4;
  if (p.ostTyp === 'barock_wiederaufbau' && v === 'altstadt') basis.barock = 2.5;
  const liste = Object.entries(basis).map(([st, g]) => {
    let w = g;
    if (nachbar?.stil === st) w *= 0.25;
    if (st === 'fachwerk' && p.w > 18) w *= 0.3;
    if (st === 'ddr_platte' && p.w < 14 && v !== 'ostzentrum') w *= 0.3;
    if (st === 'barock' && p.w > 22) w *= 0.4;
    return [st, w];
  });
  const stil = wahlGewichtet(r, liste);
  let [a, b] = OST_GESCHOSSE[stil];
  if (v === 'messe') { a += 1; b += 2; }
  if (p.cluster === 'metropole') { a += 1; b += 1; } else if (p.cluster === 'mittelstadt') b -= 1;
  let g = Math.round(a + (b - a) * r());
  if (nachbar?.geschosse && r() < 0.35) g = nachbar.geschosse + waehle(r, [-1, 1]);
  const geschosse = Math.max(2, Math.min(7, Math.max(a - 1, Math.min(b, g))));
  // Ost-Paletten (Ocker, Sandstein, Grau) auch für Rostock, Stralsund, Schwerin
  const region = p.region === 'nord' ? (stil === 'backstein' ? 'Nord' : 'Ost') : 'Ost';
  return { stil, geschosse, region };
}
registriereStilProfil('ost', (p, nachbar) => ostStil(p, nachbar));
registriereStilProfil('west_berlin', (p, nachbar, B) => ({ bau: (S, scene, q) => B.zufallsStadthaus(S, scene, { ...q, region: 'West' }) }));

function parzelleMarkieren(p, bl, E) {
  if (E.westTeil && bl && E.westTeil(bl.i0, bl.j0)) { p.westBerlin = true; p.stilProfil = 'west_berlin'; return; }
  p.ddr = true; p.ostTyp = E.ost ?? null; p.stilProfil = 'ost';
  if (E.ostFachwerk) p.ostFachwerk = true;
}

// ====================================================================================
// Registrierung
// ====================================================================================
registriereSlots(OST_SLOTS);

const GEMEINSAM = {
  gewicht: [0, 0, 0], ddr: true, parzellierung, nachbearbeitung, nachPlan, parzelleMarkieren,
  viertel: { messe: { dk: 1.3, var: 0.4, stile: [['gruenderzeit', 0.7], ['modern', 0.3]], fachwerk: 0 } },
  flaechen: {
    aufmarsch: { parzelliere: ostAufmarsch, boden: bodenAufmarsch },
    hafen: { boden: bodenHafen },
    brache: { parzelliere: bracheParzelle, boden: bodenBrache },
    platte: { boden: bodenPlatte },
  },
};
registriereArchetyp('sozialistisch', { ...GEMEINSAM, name: 'Sozialistische Bezirksstadt', entwurf: sozialistisch,
  // Je Stadt eigene Dominante und eigenes Kulturhaus, damit die Bezirksstädte nicht gleich aussehen
  staedte: { Magdeburg: { dom: true }, Chemnitz: { dominante: 'interhotel', kultur: 'stadthalle' }, Halle: { dominante: 'uni', kultur: 'kulturhaus50' }, Cottbus: { dominante: 'kanzel', kultur: 'stadthalle' },
    Gera: { dominante: 'interhotel', kultur: 'stadthalle' }, Zwickau: { dominante: 'uni', kultur: 'kulturhaus50' }, Dessau: { dominante: 'kanzel', kultur: 'kulturhaus50' }, Jena: { dominante: 'rund', kultur: 'stadthalle' } } });
registriereArchetyp('ostberlin', { ...GEMEINSAM, name: 'Geteilte Hauptstadt', entwurf: ostberlin, staedte: { Berlin: { umland: 'see', seeArt: 'binnen' } } });
registriereArchetyp('barock_wiederaufbau', { ...GEMEINSAM, name: 'Barock und Wiederaufbau', entwurf: barockWiederaufbau, staedte: { Dresden: {} } });
registriereArchetyp('messestadt', { ...GEMEINSAM, name: 'Messestadt', entwurf: messestadt, staedte: { Leipzig: {} } });
registriereArchetyp('ost_altstadt', { ...GEMEINSAM, name: 'Altstadt Ost', entwurf: ostAltstadt,
  staedte: { Erfurt: { basis: 'dom' }, Weimar: { basis: 'residenz' }, 'Görlitz': { basis: 'altstadt' }, Potsdam: { basis: 'residenz', umland: 'see', seeArt: 'binnen' }, Schwerin: { basis: 'residenz', umland: 'see', seeArt: 'binnen' } } });
registriereArchetyp('ostsee_hanse', { ...GEMEINSAM, name: 'Hansestadt Ost', entwurf: ostseeHanse, staedte: { Rostock: { umland: 'see' }, Stralsund: { umland: 'see' } } });
