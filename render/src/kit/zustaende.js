// Sichtbare Zustände von Gebäuden (Warenhaus, Sporthaus, …): Overlays aus Geometrie + Schrift.
// Bildsprache Coffee Inc 2. Nur die Seiten +x/+z und das Dach werden dekoriert. Zufall nur über rng(seed).
//
// ─────────────────────────────────────────────────────────────── API
// zustandNormal(opt, quelle?) → Z
//   opt:    { status?, zusatz?: [Status…], untermieter?: [Name | { name, typ?, etage }], aktion?, rabatt? (0..1, Engine-Aktion), hartwig?, offpriceEtage?, seed? }
//   quelle: Fallbacks aus den Engine-Daten { status?, untermieter? }
//   Z:      { status, zusatz: [], aktion, untermieter: [{ name, typ, etage, bg, fg }], offpriceEtage, ohneMarke, hat(s) }
//   Alte Aufrufe mit opt.status = 'offen'|'umbau'|'raeumung'|'leer'|'geschlossen' und untermieter: [Namen] funktionieren weiter.
//
// zustandFlags(Z) → { eg: 'offen'|'leer'|'geschlossen'|'raeumung', zu, ohneLogo, geistHell, alt, verblichen }
//   Hinweise für den Gebäudegenerator (Schaufenster zukleben, Rollgitter, Logo ab, Patina …).
//
// eigeneMieterflaechen(Z, L, reihe = ['+z', '+x']) → EG-Teilflächen, die der Generator selbst als Laden baut (Discounter, Drogerie, Outlet …)
//   [{ name, typ, bg, fg, seite: '+z'|'+x', u0, u1 }]
//
// ladenInhalt(seite, a, b, y, t0, t1, typ, r) → Auslage eines Fremdmieters in einer Schaufensterachse (Laibung t0…t1).
//   seite braucht nur q(u0,u1,y0,y1,t0,t1,farbe) (lokaler Fassadenrahmen wie in warenhaus.js).
//
// merke(S, scene) → Marke (vor dem Bau des Gebäudes ziehen; für den Teilabriss nötig)
// abschneiden(S, scene, marke, R | xc) → entfernt alles nach der Marke im Rechteck R = { x0, z0, x1, z1 }
//
// zustandsDekor(S, scene, koerper, Z, opt?) → { hoehe, teile }
//   koerper = {
//     x, z, w, d,                 Grundriss des Hauptbaukörpers (ohne Anbauten)
//     hoehe,                      Oberkante Fassade (Wandhöhe)
//     egHoehe, geschossHoehe, n,  EG-Höhe, Regelgeschoss, Anzahl Geschosse ≥ 0
//     tRelief?,                   Tiefe des Fassadenreliefs (Planen/Banner sitzen davor)
//     raster?, fensterBand?: [dy0, dy1] | false   Fensterachsmaß und Fensterzone je Geschoss (relativ zur Geschossunterkante); false = keine Fenster
//     seiten: { '+z': { u1, logo? }, '+x': { u1, logo? } }   u1 = nutzbare Fassadenlänge (ohne Eckturm/Atrium);
//                                  logo = { u, y, hb, dach } Logozone (Banner hängen darunter)
//     eingaenge?: [{ seite, u, breite, t?, haupt? }],  fensterEG?: [{ seite, a, b, y0, y1, t }]
//     mieterEG?: [{ seite, ua, ub, name, typ, bg, fg }]   vom Generator gebaute EG-Mieter
//     dach?: { x0, z0, x1, z1, y }  freie Dachfläche,  terrasse?: { x0, z0, x1, z1, y } für Dachgastronomie
//     farbe?, baujahr?, jahr?, flaecheQm?, marke?, seed, marken?: { name, farbe }
//   }
//     seiten[s].sperren?: [{ u0, u1, y0, y1 }]   weitere Flächen, die kein Banner überdecken darf (z. B. Sport-Logos)
//     seiten[s].abbau?: { u, y, t }               Stelle der Hebebühne bei 'geschlossen' (Buchstaben werden abmontiert)
//     vorspruenge?: [{ seite, u0, u1, t }]        Risalite o. ä.: Abdeckungen von Fenstern sitzen dort weiter vorn
//     planeText?                                  Text der Gerüstplane bei 'umbau'
//   opt: { pylon?: false, passanten?: false (keine Menschen), abrissSeite?: '+x' | '+z' | 'ecke' (Standard nach Seed), logosAbdecken? }
//   Fassadenflächen werden vergeben: Logos, Mieterbänder, Gerüste, Banner und Bahnen überlappen nie. Reihenfolge = Priorität
//   (Mieter, Outlet, Umbau, Räumung, Geschlossen, Leerstand, Neueröffnung, Teilschließung, Aktion); was keinen Platz findet, entfällt.
//   Kombinationen: Hauptzustand Z.status + beliebige Z.zusatz (z. B. 'untermiete', 'aktion', 'offprice', 'teilschliessung', 'umbau').
//
// Zustände: offen · aktion (sale|jubilaeum|weihnachten|blackfriday) · untermiete · offprice · teilschliessung · umbau ·
//           raeumung · geschlossen · leer · verfall · neueroeffnung · abriss
import { THREE, rng, waehle, zw, heller, dunkler, textTextur, textMaterial } from './basis.js';

export const STATI = ['offen', 'aktion', 'untermiete', 'offprice', 'teilschliessung', 'umbau', 'raeumung', 'geschlossen', 'leer', 'verfall', 'neueroeffnung', 'abriss'];
export const AKTIONEN = ['sale', 'jubilaeum', 'weihnachten', 'blackfriday'];
export const STATUS_TITEL = {
  offen: 'Offen', aktion: 'Aktion', untermiete: 'Untermiete', offprice: 'Outlet', teilschliessung: 'Teilschließung', umbau: 'Umbau',
  raeumung: 'Räumungsverkauf', geschlossen: 'Geschlossen', leer: 'Leerstand', verfall: 'Verfall', neueroeffnung: 'Neueröffnung', abriss: 'Abriss',
};

const ROT = '#d23c32';
const KLEID = ['#d04a3f', '#2f63b5', '#e8e4dc', '#e0b23c', '#5b8f5a', '#8d5fbf', '#ef8b4c', '#2b2b2b', '#f2c6d2', '#7d97b8', '#1f3f6b', '#f1f1ee'];
const HOSE = ['#2b3a55', '#3a3a3a', '#6b5a48', '#20304a', '#5c6670', '#1f1f1f'];
const HAUT = ['#f1d3b8', '#e2b896', '#c99a76', '#8d5a3b', '#f4dcc6'];
const BETON = '#b9b5ac', BETON_D = '#9d9991', GELB = '#f2b705', STAHL = '#8f989f';
export const VERMIETER = ['Rheinkontor Immobilien', 'Nordwert Real Estate', 'Prisma Asset Management', 'Stadtwerk Grundbesitz', 'Atlas Retail Properties', 'Kontinental Immobilien KG'];

// ─────────────────────────────────────────────────────────────── Mieter (erfundene Namen aus daten.ts)
export const MIETER_DEF = {
  'Preisfuchs Markt': { typ: 'discounter', bg: '#e8751a', fg: '#ffffff' },
  'Preisfuchs': { typ: 'discounter', bg: '#e8751a', fg: '#ffffff' },
  'NettoPlus': { typ: 'discounter', bg: '#1f4f9c', fg: '#ffffff' },
  'Kaufgut': { typ: 'discounter', bg: '#2f8f4e', fg: '#ffffff' },
  'IronCity Fitness': { typ: 'fitness', bg: '#1b1b1b', fg: '#ff7a1a' },
  'Pulsraum': { typ: 'fitness', bg: '#c2187a', fg: '#ffffff' },
  'FitWerk 24': { typ: 'fitness', bg: '#1e2a36', fg: '#b9e43a' },
  'MVZ Stadtmitte': { typ: 'aerztehaus', bg: '#ffffff', fg: '#1f6fb5' },
  'Praxisgemeinschaft Zentrum': { typ: 'aerztehaus', bg: '#ffffff', fg: '#2a8c7a' },
  'MediCampus': { typ: 'aerztehaus', bg: '#1f8fa0', fg: '#ffffff' },
  'Bürgeramt': { typ: 'behoerde', bg: '#1f3f6b', fg: '#ffffff' },
  'Stadtbibliothek': { typ: 'behoerde', bg: '#2f5d50', fg: '#f3ead2' },
  'Volkshochschule': { typ: 'behoerde', bg: '#7a2e4a', fg: '#ffffff' },
  'Markthalle Kost': { typ: 'gastro', bg: '#3d5a3a', fg: '#f5e6c4' },
  'Café Fräulein': { typ: 'gastro', bg: '#f2c6d2', fg: '#7a2e4a' },
  'Burgerwerk': { typ: 'gastro', bg: '#2b2b2b', fg: '#f2b705' },
  'Deskhaus': { typ: 'coworking', bg: '#f4f1ea', fg: '#2b3a4a' },
  'WorkLoft': { typ: 'coworking', bg: '#2b3a4a', fg: '#7fe0c8' },
  'Raum & Ruhe': { typ: 'coworking', bg: '#8aa894', fg: '#ffffff' },
  'Rossberg Drogerie': { typ: 'drogerie', bg: '#ffffff', fg: '#d0306f' },
  'Drogerie Nachbar': { typ: 'drogerie', bg: '#1f6fb5', fg: '#ffffff' },
  'Pflegewelt': { typ: 'drogerie', bg: '#6fb8a8', fg: '#ffffff' },
  'Bücherinsel': { typ: 'behoerde', bg: '#2f5d50', fg: '#f3ead2' },
  'Kita Sonnenschein': { typ: 'kita', bg: '#f6c945', fg: '#b3402a' },
  'Lagerraum 24': { typ: 'lager', bg: '#4a4f8c', fg: '#ffffff' },
  'HARTWIG OUTLET': { typ: 'offprice', bg: '#f5b400', fg: '#1d1d1d' },
};
const TYP_STANDARD = { discounter: 'Preisfuchs Markt', fitness: 'FitWerk 24', aerztehaus: 'MVZ Stadtmitte', behoerde: 'Bürgeramt', gastro: 'Markthalle Kost', coworking: 'WorkLoft', drogerie: 'Drogerie Nachbar', kita: 'Kita Sonnenschein', lager: 'Lagerraum 24', offprice: 'HARTWIG OUTLET' };
const TYP_ETAGE = { discounter: 0, drogerie: 0, fitness: 3, aerztehaus: 2, behoerde: 1, gastro: 99, coworking: 3, kita: 1, lager: -1 };

export function mieterInfo(m, i = 0) {
  if (typeof m === 'string') m = { name: m, etage: i === 0 ? 0 : i + 1 };
  let name = m.name === 'dm-Nachbar' ? 'Drogerie Nachbar' : m.name;
  if (!name && m.typ) name = TYP_STANDARD[m.typ];
  const def = MIETER_DEF[name] ?? {};
  const typ = m.typ ?? def.typ ?? 'laden';
  return { name, typ, etage: m.etage ?? TYP_ETAGE[typ] ?? 1, bg: m.bg ?? def.bg ?? '#2f6f8f', fg: m.fg ?? def.fg ?? '#ffffff' };
}

// ─────────────────────────────────────────────────────────────── Normalisierung
export function zustandNormal(opt = {}, quelle = {}) {
  if (opt && opt.__zustand) return opt;
  let status = opt.status ?? quelle.status ?? 'offen';
  if (!STATI.includes(status)) status = 'offen';
  const zusatz = [...new Set((opt.zusatz ?? []).filter((s) => STATI.includes(s) && s !== status))];
  const hat = (s) => status === s || zusatz.includes(s);
  let unter = (opt.untermieter ?? quelle.untermieter ?? []).map((m, i) => mieterInfo(m, i));
  if (hat('untermiete') && !unter.length) {
    const r = rng(`${opt.seed ?? 'z'}/mieter`);
    unter = [mieterInfo({ typ: waehle(r, ['discounter', 'drogerie']), etage: 0 }), mieterInfo({ typ: waehle(r, ['aerztehaus', 'behoerde']), etage: 2 }), mieterInfo({ typ: 'fitness', etage: 3 })];
  }
  let aktion = opt.aktion ?? null;
  if (aktion && !AKTIONEN.includes(aktion)) aktion = 'sale';
  if (!aktion && hat('aktion')) aktion = 'sale';
  if (aktion && !hat('aktion')) zusatz.push('aktion');
  const rabatt = Number.isFinite(opt.rabatt) && opt.rabatt > 0 ? Math.round(opt.rabatt * 100) : null;   // Prozent der Engine-Aktion
  return { __zustand: true, status, zusatz, aktion, rabatt, untermieter: unter, offpriceEtage: opt.offpriceEtage ?? 0, ohneMarke: opt.hartwig === false, hat };
}

export function zustandFlags(Z) {
  const h = Z.hat;
  let eg = 'offen';
  if (h('leer') || h('verfall') || h('abriss')) eg = 'leer';
  else if (h('geschlossen')) eg = 'geschlossen';
  else if (h('raeumung')) eg = 'raeumung';
  const zu = eg === 'leer' || eg === 'geschlossen';
  return { eg, zu, ohneLogo: zu || Z.ohneMarke, geistHell: Z.status === 'geschlossen', alt: h('leer') || h('verfall') || h('abriss'), verblichen: h('verfall') };
}

/** EG-Teilflächen für eigene Läden (Untermieter mit eigenem Eingang, Outlet). L: { '+z': Länge, '+x': Länge } nutzbar. */
export function eigeneMieterflaechen(Z, L, reihe = ['+z', '+x']) {
  const aus = [];
  const belegt = { '+z': 0, '+x': 0 };
  const platz = (m, anteil, min, max) => {
    const seite = reihe.find((q) => belegt[q] === 0 && L[q] > 14) ?? null;
    if (!seite) return;
    const l = L[seite];
    const u0 = l * 0.03, u1 = u0 + Math.max(min, Math.min(max, l * anteil));
    belegt[seite] = u1;
    aus.push({ ...m, seite, u0, u1: Math.min(u1, l - 4), ua: u0 - 0.5, ub: Math.min(u1, l - 4) + 0.5 });
  };
  if (Z.hat('offprice') && Z.offpriceEtage === 0) platz(mieterInfo({ name: 'HARTWIG OUTLET', etage: 0 }), 0.8, 12, 60);
  // Fremdmieter im EG deutlich breit (aus Spielabstand als fremde Front erkennbar)
  for (const m of Z.untermieter) if (m.etage === 0 && m.typ !== 'gastro') platz(m, 0.45, 12, 30);
  return aus;
}

// ─────────────────────────────────────────────────────────────── Fassadenrahmen
function spiegeln(g) {
  for (const n of ['position', 'normal']) {
    const a = g.attributes[n]?.array;
    if (!a) continue;
    for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; }
    for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; }
  }
}
/** Lokaler Rahmen einer sichtbaren Seite: u entlang der Fassade (u = L ist die sichtbare Ecke), y Höhe, t nach außen. */
export class Seite {
  constructor(S, x0, z0, w, d, seite) {
    Object.assign(this, { S, x0, z0, w, d, seite });
    this.L = seite === '+z' ? w : d;
    this.ebene = seite === '+z' ? z0 + d : x0 + w;
    this.basis = seite === '+z' ? x0 : z0;
    this.lese = seite === '+z' ? 1 : -1;
  }
  q(u0, u1, y0, y1, t0, t1, f) {
    if (Math.abs(u1 - u0) < 1e-3 || Math.abs(y1 - y0) < 1e-3 || Math.abs(t1 - t0) < 1e-3) return;
    if (this.seite === '+z') this.S.quader(this.basis + u0, y0, this.ebene + t0, this.basis + u1, y1, this.ebene + t1, f);
    else this.S.quader(this.ebene + t0, y0, this.basis + u0, this.ebene + t1, y1, this.basis + u1, f);
  }
  welt(u, t) { return this.seite === '+z' ? [this.basis + u, this.ebene + t] : [this.ebene + t, this.basis + u]; }
  geo(g, f) {
    g = g.index ? g.toNonIndexed() : g;
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
    if (this.seite === '+x') spiegeln(g);
    const [x, z] = this.welt(0, 0);
    g.translate(x, 0, z);
    this.S.add(g, f);
  }
  kipp(bu, by, bt, u, y, t, f, rz = 0, rx = 0) {
    const g = new THREE.BoxGeometry(bu, by, bt);
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    g.translate(u, y, t);
    this.geo(g, f);
  }
  flaeche(mesh, u, y, t, rz = 0) {
    if (this.seite === '+z') { mesh.position.set(this.basis + u, y, this.ebene + t); mesh.rotation.set(0, 0, rz); }
    else { mesh.position.set(this.ebene + t, y, this.basis + u); mesh.rotation.set(0, Math.PI / 2, rz); }
  }
}

// ─────────────────────────────────────────────────────────────── Schrift
// Texturen und Materialien aus dem gemeinsamen Cache in basis.js
const tex = (text, fg, bg = null) => textTextur(text, fg, 120, bg);
const texMat = (text, fg, bg) => textMaterial(text, fg, { groesse: 120, hintergrund: bg ?? null, alphaTest: 0.45 }).mat;
const breiteVon = (text, ph) => tex(text, '#000', '#fff').seitenverhaeltnis * ph;
/** Schrift auf der Fassade. maxB begrenzt die Breite. Gibt { b, h } zurück. */
function plakat(Z, s, text, u, y, t, ph, fg, bg, maxB = Infinity, rz = 0) {
  const sv = tex(text, fg, bg).seitenverhaeltnis;
  ph = Math.min(ph, maxB / sv);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sv * ph, ph), texMat(text, fg, bg));
  s.flaeche(m, u, y, t, rz);
  Z.scene.add(m);
  return { b: sv * ph, h: ph };
}
/** Mehrzeilige Tafel: zeilen [{ text, h, fg?, bg? }], Hintergrundplatte in bg. Gibt Breite/Höhe zurück. */
function tafel(Z, s, zeilen, u, y, t, bg, o = {}) {
  const rand = o.rand ?? 0.35, maxB = o.maxB ?? Infinity;
  let sk = 1;
  const bMax = Math.max(...zeilen.map((z) => breiteVon(z.text, z.h)));
  if (bMax > maxB - 2 * rand) sk = (maxB - 2 * rand) / bMax;
  const hs = zeilen.map((z) => z.h * sk);
  const H = Math.max(o.H ?? 0, hs.reduce((a, b) => a + b, 0) + 2 * rand);
  const B = Math.max(o.B ?? 0, Math.min(maxB, bMax * sk + 2 * rand));
  s.q(u - B / 2, u + B / 2, y - H / 2, y + H / 2, t - 0.12, t - 0.02, bg);
  if (o.rahmen) s.q(u - B / 2 - 0.15, u + B / 2 + 0.15, y - H / 2 - 0.15, y + H / 2 + 0.15, t - 0.16, t - 0.1, o.rahmen);
  let yy = y + hs.reduce((a, b) => a + b, 0) / 2;
  zeilen.forEach((z, i) => { plakat(Z, s, z.text, u, yy - hs[i] / 2, t, hs[i], z.fg ?? '#ffffff', z.bg ?? bg); yy -= hs[i]; });
  return { b: B, h: H };
}

// ─────────────────────────────────────────────────────────────── Kleinteile
function zyl(S, x, y0, z, rad, h, f, seg = 8, oben = rad) {
  const g = new THREE.CylinderGeometry(oben, rad, h, seg);
  g.translate(x, y0 + h / 2, z);
  S.add(g, f);
}
function kugel(S, x, y, z, rad, f, det = 0) {
  const g = new THREE.IcosahedronGeometry(rad, det);
  g.translate(x, y, z);
  S.add(g, f);
}
/** Lokale Geometrie (x vorwärts) um die Hochachse drehen und an (x, y, z) setzen. */
function lokal(S, g, x, y, z, ry, f) {
  g = g.index ? g.toNonIndexed() : g;
  g.rotateY(ry); g.translate(x, y, z); S.add(g, f);
}
function lbox(S, w, h, d, lx, ly, lz, x, z, ry, f, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  g.translate(lx, ly, lz);
  lokal(S, g, x, 0, z, ry, f);
}

export function figur(S, x, z, r, sk = 1.1, oben = null) {
  const y = 0.3;
  S.box(0.42 * sk, 0.85 * sk, 0.3 * sk, x, y + 0.425 * sk, z, waehle(r, HOSE));
  S.box(0.54 * sk, 0.74 * sk, 0.34 * sk, x, y + 1.22 * sk, z, oben ?? waehle(r, KLEID));
  S.box(0.28 * sk, 0.3 * sk, 0.28 * sk, x, y + 1.75 * sk, z, waehle(r, HAUT));
}
/** Menschengruppe vor einer Fassade um (u, t). */
function menge(Z, s, u, t, anzahl, ru, rt, o = {}) {
  if (Z.leute === false) return;
  const r = Z.r;
  const tMin = o.tMin ?? 1.0, tMax = o.tMax ?? 5.2, uMin = o.uMin ?? -2, uMax = o.uMax ?? s.L + 3;
  const pos = [];
  for (let i = 0, v = 0; i < anzahl && v < anzahl * 8; v++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r());
    const uu = u + Math.cos(a) * ru * rr, tt = t + Math.sin(a) * rt * rr;
    if (tt < tMin || tt > tMax || uu < uMin || uu > uMax) continue;
    if (pos.some(([pu, pt]) => Math.hypot(pu - uu, pt - tt) < 0.62)) continue;
    pos.push([uu, tt]); i++;
    const [x, z] = s.welt(uu, tt);
    figur(Z.S, x, z, r, 1.1, o.farben ? waehle(r, o.farben) : null);
  }
}
/** Schlange entlang der Fassade. */
function schlange(Z, s, u0, u1, t) {
  if (Z.leute === false) return;
  const r = Z.r, schritt = 0.85, dir = u1 > u0 ? 1 : -1;
  for (let u = u0; dir * (u1 - u) > 0; u += dir * schritt * zw(r, 0.85, 1.25)) {
    const [x, z] = s.welt(u, t + zw(r, -0.2, 0.2));
    figur(Z.S, x, z, r);
  }
}
function ballons(Z, x, z, y, farben, n = 5, rad = 0.75) {
  const r = Z.r;
  for (let i = 0; i < n; i++) {
    const bx = x + zw(r, -0.9, 0.9), bz = z + zw(r, -0.9, 0.9), by = y + zw(r, -0.4, 1.0);
    kugel(Z.S, bx, by, bz, rad, waehle(r, farben), 1);
    Z.S.quader(bx - 0.02, 0.3, bz - 0.02, bx + 0.02, by - rad, bz + 0.02, '#e9e9e9');
  }
}
/** Ballonbogen über einer Stelle (u) der Fassade. */
function ballonbogen(Z, s, u, t, breite, hoehe, farben) {
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    const uu = u - Math.cos(a) * breite / 2, yy = 0.5 + Math.sin(a) * hoehe;
    const [x, z] = s.welt(uu, t);
    kugel(Z.S, x, yy, z, 0.55, farben[i % farben.length], 1);
  }
}
/** Beachflag (Segel). */
function beachflag(Z, x, z, farbe, h = 4.6, farbe2 = '#ffffff') {
  const S = Z.S;
  S.box(0.6, 0.12, 0.6, x, 0.36, z, '#3a3f44');
  S.box(0.07, h, 0.07, x, 0.3 + h / 2, z, '#d9dcde');
  const g = new THREE.BoxGeometry(0.95, h * 0.72, 0.05); g.translate(0.5, 0.3 + h * 0.6, 0); lokal(S, g, x, 0, z, Math.PI / 4, farbe);
  const g2 = new THREE.BoxGeometry(0.95, h * 0.1, 0.06); g2.translate(0.5, 0.3 + h * 0.5, 0.01); lokal(S, g2, x, 0, z, Math.PI / 4, farbe2);
}
/** Fahnenmast mit Hängefahne. */
function fahne(Z, x, z, farbe, h = 8, farbe2 = '#ffffff') {
  const S = Z.S;
  zyl(S, x, 0.3, z, 0.09, h, '#e6e8ea', 6);
  const g = new THREE.BoxGeometry(1.1, h * 0.45, 0.05); g.translate(0.62, 0.3 + h * 0.72, 0); lokal(S, g, x, 0, z, Math.PI / 4, farbe);
  const g2 = new THREE.BoxGeometry(1.12, h * 0.06, 0.06); g2.translate(0.62, 0.3 + h * 0.64, 0.01); lokal(S, g2, x, 0, z, Math.PI / 4, farbe2);
}
/** Wimpelkette entlang der Fassade zwischen u0 und u1 auf Höhe y mit Durchhang. */
function wimpel(Z, s, u0, u1, y, t, farben, durch = 1.2) {
  const n = Math.max(3, Math.floor(Math.abs(u1 - u0) / 1.1));
  const sh = new THREE.Shape(); sh.moveTo(-0.45, 0); sh.lineTo(0.45, 0); sh.lineTo(0, -1.05); sh.closePath();
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, u = u0 + (u1 - u0) * f, yy = y - durch * 4 * f * (1 - f);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
    g.translate(u, yy, t);
    s.geo(g, farben[i % farben.length]);
  }
  // Leine in drei Stücken
  for (let k = 0; k < 4; k++) {
    const fa = k / 4, fb = (k + 1) / 4;
    const ua = u0 + (u1 - u0) * fa, ub = u0 + (u1 - u0) * fb, ya = y - durch * 4 * fa * (1 - fa), yb = y - durch * 4 * fb * (1 - fb);
    s.kipp(Math.hypot(ub - ua, yb - ya), 0.05, 0.05, (ua + ub) / 2, (ya + yb) / 2, t + 0.02, '#4a4f55', Math.atan2(yb - ya, ub - ua));
  }
}
/** Kundenstopper/Aufsteller mit Schrift. */
function aufsteller(Z, s, u, t, text, fg, bg) {
  s.q(u - 0.55, u - 0.48, 0.3, 1.5, t - 0.3, t + 0.3, '#3a3f44');
  s.q(u + 0.48, u + 0.55, 0.3, 1.5, t - 0.3, t + 0.3, '#3a3f44');
  s.q(u - 0.5, u + 0.5, 0.4, 1.5, t, t + 0.06, bg);
  plakat(Z, s, text, u, 0.95, t + 0.08, 0.5, fg, bg, 0.95);
}
function bauzaun(Z, s, u0, u1, t, banner = null) {
  const n = Math.max(1, Math.round(Math.abs(u1 - u0) / 3.5)), du = (u1 - u0) / n;
  for (let i = 0; i < n; i++) {
    const a = u0 + i * du, b = a + du;
    s.q(a + 0.05, b - 0.05, 0.4, 2.3, t - 0.03, t + 0.03, '#dfe3e5');
    s.q(a, a + 0.08, 0.3, 2.4, t - 0.05, t + 0.05, '#9aa0a4');
    s.q(a - 0.3, a + 0.3, 0.3, 0.45, t - 0.25, t + 0.25, '#e04b3a');
  }
  if (banner) { const m = (u0 + u1) / 2; s.q(m - Math.abs(u1 - u0) * 0.35, m + Math.abs(u1 - u0) * 0.35, 0.8, 2.0, t + 0.04, t + 0.07, banner.bg); plakat(Z, s, banner.text, m, 1.4, t + 0.09, 0.9, banner.fg, banner.bg, Math.abs(u1 - u0) * 0.66); }
}
function container(Z, x, z, ry, farbe, y = 0.3) {
  const S = Z.S;
  lbox(S, 6, 2.6, 2.4, 0, y + 1.3, 0, x, z, ry, farbe);
  for (const lx of [-2.95, 2.95]) lbox(S, 0.15, 2.7, 2.5, lx, y + 1.35, 0, x, z, ry, '#e9ecee');
  lbox(S, 1.2, 0.8, 0.06, 1.2, y + 1.6, 1.22, x, z, ry, '#9fc0d0');
  lbox(S, 0.9, 2.0, 0.06, -1.6, y + 1.1, 1.22, x, z, ry, dunkler(farbe, 0.12));
}
/** Turmdrehkran: Fuß bei (x, z), Hakenhöhe H, Auslegerlänge L, Richtung ry. */
function kran(Z, x, z, H, L, ry) {
  const S = Z.S, m = 1.6, y0 = 0.9;
  S.box(4, 0.6, 4, x, 0.6, z, '#9aa0a4');
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) S.box(0.16, H, 0.16, x + dx * m / 2, y0 + H / 2, z + dz * m / 2, GELB);
  const hh = 2.4, dl = Math.hypot(m, hh), wink = Math.atan2(m, hh);
  for (let y = y0; y < y0 + H - 0.5; y += hh) {
    S.box(m, 0.1, 0.1, x, y, z + m / 2, GELB); S.box(0.1, 0.1, m, x + m / 2, y, z, GELB);
    const g = new THREE.BoxGeometry(0.08, dl, 0.08); g.rotateZ(wink); g.translate(x, y + hh / 2, z + m / 2); S.add(g, GELB);
    const g2 = new THREE.BoxGeometry(0.08, dl, 0.08); g2.rotateX(wink); g2.translate(x + m / 2, y + hh / 2, z); S.add(g2, GELB);
  }
  const yt = y0 + H;
  S.box(m + 0.6, 0.6, m + 0.6, x, yt + 0.3, z, '#4a4f55');
  // Ausleger (lokal +x), Gegenausleger (-x)
  lbox(S, L, 0.3, 0.14, L / 2, yt + 0.8, -0.55, x, z, ry, GELB);
  lbox(S, L, 0.3, 0.14, L / 2, yt + 0.8, 0.55, x, z, ry, GELB);
  lbox(S, L, 0.2, 0.14, L / 2, yt + 2.1, 0, x, z, ry, GELB);
  for (let u = 1.2; u < L; u += 2.4) lbox(S, 0.08, 1.6, 0.08, u, yt + 1.45, 0, x, z, ry, GELB, 0.6);
  const LG = L * 0.3;
  lbox(S, LG, 0.4, 1.2, -LG / 2, yt + 0.8, 0, x, z, ry, GELB);
  lbox(S, 2.4, 2.2, 1.6, -LG + 1.3, yt + 2.0, 0, x, z, ry, '#a7a39b');
  lbox(S, 0.3, 5.0, 0.3, 0, yt + 3.1, 0, x, z, ry, GELB);
  for (const [lx, l] of [[L * 0.4, L * 0.8], [-LG * 0.5, LG]]) {
    const a = Math.atan2(4.5, Math.abs(l)), lang = Math.hypot(l, 4.5);
    lbox(S, lang, 0.06, 0.06, lx / 2 + (lx > 0 ? l * 0.0 : 0), yt + 3.3, 0, x, z, ry, '#6c7277', lx > 0 ? -a : a);
  }
  lbox(S, 1.4, 1.5, 1.3, 0.6, yt - 0.4, 1.25, x, z, ry, '#e8e4dc');
  lbox(S, 1.0, 0.6, 1.32, 0.6, yt - 0.3, 1.26, x, z, ry, '#7d9fb2');
  // Katze + Seil + Last
  const lk = L * 0.62;
  lbox(S, 0.03, 9, 0.03, lk, yt - 3.8, 0, x, z, ry, '#3a3f44');
  lbox(S, 2.2, 0.5, 0.5, lk, yt - 8.5, 0, x, z, ry, '#b9875a');
  return yt + 5.6;
}
function bagger(Z, x, z, ry, y = 0.3, k = 1.7) {
  const S = Z.S;
  const L = (w, h, d, lx, ly, lz, f, rz = 0) => lbox(S, w * k, h * k, d * k, lx * k, y + ly * k, lz * k, x, z, ry, f, rz);
  for (const lz of [-1.25, 1.25]) L(4.6, 1.0, 0.9, 0, 0.5, lz, '#33373b');
  L(1.4, 0.5, 1.4, 0, 1.25, 0, '#4a4f55');
  L(3.6, 1.4, 2.7, -0.5, 2.2, 0, GELB);
  L(1.6, 1.8, 1.3, 0.6, 3.8, -0.6, GELB);
  L(1.4, 1.2, 1.32, 0.68, 3.9, -0.6, '#7d9fb2');
  L(1.2, 1.0, 2.6, -2.2, 2.0, 0, '#d9a300');
  L(5.2, 0.6, 0.6, 2.6, 4.3, 0.6, GELB, 0.75);
  L(4.0, 0.5, 0.5, 5.5, 4.1, 0.6, GELB, -1.0);
  L(1.2, 1.1, 1.3, 6.7, 2.3, 0.6, '#5a5f64', 0.4);
}
function schutt(Z, x0, z0, x1, z1, n, farben, hMax = 3) {
  const S = Z.S, r = Z.r;
  for (let i = 0; i < n; i++) {
    const g = new THREE.DodecahedronGeometry(1, 0);
    const s = zw(r, 0.8, 2.6);
    g.scale(s * zw(r, 1, 1.8), s * zw(r, 0.35, 0.8) * hMax / 3, s * zw(r, 1, 1.8));
    g.rotateY(r() * 3);
    g.translate(zw(r, x0, x1), 0.3 + s * 0.15, zw(r, z0, z1));
    S.add(g, waehle(r, farben));
  }
}
function pflanze(S, x, y, z, rad, f) { kugel(S, x, y + rad * 0.6, z, rad, f, 0); }
function taube(S, x, y, z, r) {
  const f = waehle(r, ['#8a9096', '#9aa1a8', '#6f767c']);
  S.box(0.38, 0.22, 0.24, x, y + 0.11, z, f);
  S.box(0.15, 0.15, 0.15, x + 0.2, y + 0.25, z, f);
}

// ─────────────────────────────────────────────────────────────── Läden im EG (Laibung der Schaufenster)
export function ladenInhalt(s, a, b, y, t0, t1, typ, r) {
  const br = b - a, tm = (t0 + t1) / 2;
  const bunt = ['#e04b3a', '#f2c14e', '#3a7bd5', '#4caf50', '#ff8c42', '#8d5fbf', '#ffffff'];
  if (typ === 'offprice') { // Wühltische
    for (const [ua, ub] of [[a + 0.3, a + br * 0.48], [a + br * 0.52, b - 0.3]]) {
      s.q(ua, ub, y, y + 0.75, t0 + 0.08, t1 - 0.12, '#c9b48a');
      for (let k = 0; k < 4; k++) { const u = ua + (ub - ua) * (k + 0.5) / 4; s.q(u - 0.3, u + 0.3, y + 0.75, y + 0.95 + r() * 0.3, t0 + 0.1, t1 - 0.15, bunt[Math.floor(r() * bunt.length)]); }
    }
    s.q(a + 0.4, b - 0.4, y + 2.3, y + 3.0, t1 - 0.12, t1 - 0.08, '#f5b400');
    s.q(a + br * 0.3, b - br * 0.3, y + 2.4, y + 2.9, t1 - 0.08, t1 - 0.05, '#c8102e');
    return;
  }
  if (typ === 'discounter' || typ === 'drogerie' || typ === 'laden' || typ === 'lager') { // Regale mit Ware
    const pal = typ === 'drogerie' ? ['#f2c6d2', '#ffffff', '#7fb7e0', '#d0306f', '#c9e3f2'] : bunt;
    s.q(a + 0.2, b - 0.2, y, y + 2.6, t0 + 0.02, t0 + 0.2, typ === 'drogerie' ? '#f4f1ea' : '#d9d6cf');
    for (let k = 0; k < 4; k++) {
      const yy = y + 0.3 + k * 0.6;
      s.q(a + 0.25, b - 0.25, yy - 0.05, yy, t0 + 0.2, t0 + 0.5, '#9aa0a4');
      for (let u = a + 0.35; u < b - 0.5; u += 0.55) s.q(u, u + 0.42, yy, yy + 0.38, t0 + 0.22, t0 + 0.45, pal[Math.floor(r() * pal.length)]);
    }
    return;
  }
  if (typ === 'gastro') {
    for (let k = 0; k < 2; k++) { const u = a + br * (0.3 + k * 0.4); s.q(u - 0.4, u + 0.4, y + 0.7, y + 0.78, t0 + 0.1, t1 - 0.1, '#b9875a'); s.q(u - 0.05, u + 0.05, y, y + 0.7, tm - 0.05, tm + 0.05, '#4a4f55'); }
    s.q(a + 0.3, b - 0.3, y + 2.6, y + 2.75, t0 + 0.05, t0 + 0.12, '#f7e9c8');
    return;
  }
  if (typ === 'fitness') { s.q(a + 0.3, b - 0.3, y, y + 0.9, t0 + 0.1, t1 - 0.1, '#2b2b2b'); return; }
  s.q(a + 0.4, b - 0.4, y, y + 1.0, t0 + 0.1, t1 - 0.1, '#e9e4da');
}

// ─────────────────────────────────────────────────────────────── Snapshot + Abriss-Schnitt
export function merke(S, scene) {
  return { teile: new Map([...S.teile].map(([k, a]) => [k, a.length])), kinder: scene.children.length };
}
/**
 * Entfernt alles, was nach der Marke gebaut wurde und im Rechteck R = { x0, z0, x1, z1 } liegt (Abrissbereich).
 * Quader am Rand werden gekürzt; Teile, die über eine innere Ecke reichen, werden in zwei Stücke geteilt.
 * Alte Aufrufe mit einer Zahl xc schneiden wie bisher bei x = xc.
 */
export function abschneiden(S, scene, marke, R) {
  if (typeof R === 'number') R = { x0: R, z0: -Infinity, x1: Infinity, z1: Infinity };
  const e = 0.02;
  for (const [k, arr] of [...S.teile]) {
    const ab = marke.teile.get(k) ?? 0;
    const neu = [];
    arr.forEach((g, i) => {
      if (i < ab) { neu.push(g); return; }
      const p = g.attributes.position.array;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let j = 0; j < p.length; j += 3) { x0 = Math.min(x0, p[j]); x1 = Math.max(x1, p[j]); z0 = Math.min(z0, p[j + 2]); z1 = Math.max(z1, p[j + 2]); }
      if (x1 <= R.x0 + e || z1 <= R.z0 + e) { neu.push(g); return; }       // liegt außerhalb
      if (x0 >= R.x0 - e && z0 >= R.z0 - e) { S.anzahl--; return; }        // ganz im Abrissbereich
      const klemme = (geo, fx, fz) => { const a = geo.attributes.position.array; for (let j = 0; j < a.length; j += 3) { a[j] = fx(a[j]); a[j + 2] = fz(a[j + 2], a[j]); } geo.attributes.position.needsUpdate = true; return geo; };
      if (z0 >= R.z0 - e) { neu.push(klemme(g, (x) => Math.min(x, R.x0), (z) => z)); return; }
      if (x0 >= R.x0 - e) { neu.push(klemme(g, (x) => x, (z) => Math.min(z, R.z0))); return; }
      // reicht über die innere Ecke: Teil links des Schnitts + Teil vor dem Schnitt
      const g2 = g.clone();
      neu.push(klemme(g, (x) => Math.min(x, R.x0), (z) => z));
      neu.push(klemme(g2, (x) => Math.max(x, R.x0), (z) => Math.min(z, R.z0)));
      S.anzahl++;
    });
    if (neu.length) S.teile.set(k, neu); else S.teile.delete(k);
  }
  for (const o of scene.children.slice(marke.kinder)) if (o.isMesh && o.position.x > R.x0 - 0.3 && o.position.z > R.z0 - 0.3 && o.position.x < R.x1 + 1 && o.position.z < R.z1 + 1) scene.remove(o);
}

// ─────────────────────────────────────────────────────────────── Bausteine der Zustände
function etagenY(k, e) { return k.egHoehe + (e - 1) * k.geschossHoehe; }
function tFront(k) { return (k.tRelief ?? 0.5) + 0.08; }

/** Vorsprung (Risalit o. ä.) an der Stelle u einer Seite: zusätzliche Tiefe für Abdeckungen. */
function vorsprung(k, s, u) {
  let t = 0;
  for (const v of k.vorspruenge ?? []) if (v.seite === s.seite && u > v.u0 && u < v.u1) t = Math.max(t, v.t);
  return t;
}
/** Fenster eines Obergeschosses abdecken. art: 'papier' | 'dunkel' | 'rollladen' | 'verfall' | 'licht' */
function fensterZu(Z, s, e, art, u0 = 0.3, u1 = null) {
  const k = Z.k, r = Z.r;
  if (k.fensterBand === false) return; // geschlossene Fassade ohne Fenster (z. B. Aluwabe)
  u1 = u1 ?? (Z.nutz(s) - 0.3);
  if (u1 - u0 < 1) return;
  const [f0, f1] = k.fensterBand ?? [1.0, k.geschossHoehe - 0.6];
  const y0 = etagenY(k, e) + f0, y1 = etagenY(k, e) + Math.min(f1, k.geschossHoehe - 0.25);
  const ra = k.raster ?? 3.2, n = Math.max(1, Math.floor((u1 - u0) / ra)), du = (u1 - u0) / n;
  for (let i = 0; i < n; i++) {
    const a = u0 + i * du + du * 0.12, b = a + du * 0.76;
    const t = tFront(k) + vorsprung(k, s, (a + b) / 2);
    let f;
    if (art === 'licht') { s.q(a, b, y1 - 0.45, y1 - 0.15, t, t + 0.05, '#ffe9b0'); s.q(a, b, y0 + 0.1, y0 + 0.3, t, t + 0.05, '#f7e2a8'); continue; }
    if (art === 'rollladen') { // heruntergelassene Rollläden: dunkle Fläche mit Lamellen
      s.q(a, b, y0, y1, t, t + 0.05, '#4a5057');
      for (let y = y0 + 0.35; y < y1 - 0.1; y += 0.45) s.q(a, b, y, y + 0.06, t + 0.05, t + 0.08, '#363b40');
      continue;
    }
    if (art === 'dunkel') f = r() < 0.12 ? '#3a4046' : '#1c2024';
    else if (art === 'weiss') f = r() < 0.15 ? '#e9e4d6' : '#f6f3ea';
    else if (art === 'papier') { if (r() < 0.12) continue; f = waehle(r, ['#f6f3ea', '#efe9da', '#f6f3ea', '#c9a67a', '#b89466']); }
    else { const x = r(); if (x < 0.2) continue; f = x < 0.62 ? '#1f2428' : waehle(r, ['#d6cbb0', '#b89466', '#8e8a82']); }
    s.q(a, b, y0, y1, t, t + 0.05, f);
    if (art === 'verfall' && f === '#1f2428') { // Scherbenzacken
      s.kipp((b - a) * 0.5, 0.5, 0.04, a + (b - a) * 0.3, y1 - 0.3, t + 0.07, '#7d9fb2', 0.6);
      s.kipp((b - a) * 0.4, 0.4, 0.04, b - (b - a) * 0.25, y0 + 0.3, t + 0.07, '#7d9fb2', -0.5);
    }
  }
}

// ─────────────────────────────────────────────────────────────── Fassadenzonen
// Jede Seite führt eine Liste belegter Rechtecke (u0, u1, y0, y1): Logos, Mieterbänder, Gerüste, Banner, Bahnen.
// Banner suchen sich die größte freie Stelle; was keinen Platz mehr findet, entfällt (Priorität = Reihenfolge des Baus).
function sperre(Z, s, u0, u1, y0, y1, art = '') {
  Z.belegt[s.seite].push({ u0: Math.min(u0, u1), u1: Math.max(u0, u1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), art });
}
function freieStuecke(Z, s, a, b, y0, y1, m = 0.3) {
  let st = [[a, b]];
  for (const q of Z.belegt[s.seite]) {
    if (!(y0 < q.y1 + m && y1 > q.y0 - m)) continue;
    const neu = [];
    for (const [p0, p1] of st) {
      if (q.u1 + m <= p0 || q.u0 - m >= p1) { neu.push([p0, p1]); continue; }
      if (q.u0 - m > p0) neu.push([p0, q.u0 - m]);
      if (q.u1 + m < p1) neu.push([q.u1 + m, p1]);
    }
    st = neu;
  }
  return st;
}
/** Längstes freies Höhenstück in der Spalte [u0, u1] zwischen y0 und y1. */
function freieHoehe(Z, s, u0, u1, y0, y1, m = 0.3) {
  const b = Z.belegt[s.seite].filter((q) => u0 < q.u1 + m && u1 > q.u0 - m).map((q) => [q.y0 - m, q.y1 + m]).sort((p, q) => p[0] - q[0]);
  let best = [y0, y0], c = y0;
  for (const [p0, p1] of b) {
    if (p0 > c && Math.min(p0, y1) - c > best[1] - best[0]) best = [c, Math.min(p0, y1)];
    c = Math.max(c, p1);
  }
  if (y1 - c > best[1] - best[0]) best = [c, y1];
  return best;
}
/** Absperrband: rot-weiße Segmente zwischen u0 und u1 auf Höhe y. */
function streifenband(Z, s, u0, u1, y, h, t) {
  const n = Math.max(2, Math.round((u1 - u0) / 0.9)), du = (u1 - u0) / n;
  for (let i = 0; i < n; i++) s.q(u0 + i * du, u0 + (i + 1) * du, y - h / 2, y + h / 2, t, t + 0.06, i % 2 ? '#ffffff' : '#c8102e');
}

/**
 * Großes Fassadenbanner an der größten freien Stelle (nie über Logo, Mieterband, Gerüst oder einem anderen Banner).
 * o: { zielH, anteil|maxB, u, y (Wunschlage), lo, hi (Höhenbereich), modus: 'mitte', rahmen, fuellen, streifen, minSchrift }
 * Gibt null zurück, wenn kein Platz mit lesbarer Schrift frei ist.
 */
function fassadenBanner(Z, s, zeilen, bg, o = {}) {
  const k = Z.k, sd = k.seiten?.[s.seite] ?? {}, L = Z.nutz(s), EG = k.egHoehe;
  const logo = sd.logo && !sd.logo.dach ? sd.logo : null;
  const maxB0 = Math.min(o.maxB ?? L * (o.anteil ?? 0.8), L - 0.6);
  const t = (k.tBanner ?? tFront(k)) + 0.25;
  const natur = zeilen.reduce((a, z) => a + z.h, 0);
  const breit = Math.max(...zeilen.map((z) => breiteVon(z.text, z.h)));
  const dach = k.n <= 1 || o.dach;
  const rand = o.streifen ? 0.55 : 0;
  const lo = dach ? k.hoehe + 0.8 : Math.max(o.lo ?? EG + 0.6, EG + 0.3) + rand;
  const hi = dach ? k.hoehe + 0.8 + Math.min(o.zielH ?? 4, 4.2) * 2.5 : Math.min(o.hi ?? k.hoehe - 0.5, k.hoehe - 0.3) - rand;
  const frei = hi - lo;
  if (frei < 1.8 || maxB0 < 3.5) return null;
  const zielH = Math.min(o.zielH ?? natur + 0.7, dach ? 4.2 : frei);
  const skala = (H, W) => Math.min((H - 0.7) / natur, (W - 0.7) / breit);
  const uPref = o.u ?? (o.modus === 'mitte' || !logo ? L / 2 : logo.u);
  const yPref = o.y ?? (dach ? lo + zielH / 2 : (lo + hi) / 2 + (frei > zielH + 2 ? (frei - zielH) * 0.2 : 0));
  let best = null;
  for (const H of [zielH, zielH * 0.8, zielH * 0.62]) {
    if (H < 1.8 || H > frei + 1e-6) continue;
    for (let y = lo + H / 2; y <= hi - H / 2 + 1e-6; y += 0.4) {
      for (const [a, b] of freieStuecke(Z, s, 0.3, L - 0.3, y - H / 2 - rand, y + H / 2 + rand)) {
        const W = Math.min(maxB0, b - a);
        if (W < 3.5) continue;
        const f = skala(H, W);
        if (f <= 0) continue;
        const B = o.fuellen ? W : Math.min(W, breit * f + 0.7);
        const u = Math.max(a + B / 2, Math.min(b - B / 2, uPref));
        const wert = f * (1 - 0.3 * Math.abs(y - yPref) / Math.max(frei, 1)) * (1 - 0.2 * Math.abs(u - uPref) / L) * (o.fuellen ? 0.75 + 0.25 * W / maxB0 : 1);
        if (!best || wert > best.wert) best = { wert, f, H, W, B, u, y };
      }
    }
  }
  const fMin = (o.minSchrift ?? 0.75) / Math.max(...zeilen.map((z) => z.h));
  if (!best || best.f < fMin) return null;
  const f = best.f * 0.98;
  const zz = zeilen.map((z) => ({ ...z, h: z.h * f }));
  const erg = tafel(Z, s, zz, best.u, best.y, t, bg, { maxB: best.W, rahmen: o.rahmen, B: o.fuellen ? best.W : 0, H: o.fuellen ? best.H : 0 });
  if (dach) for (const du of [-erg.b * 0.35, erg.b * 0.35]) s.q(best.u + du - 0.1, best.u + du + 0.1, k.hoehe, best.y - erg.h / 2, t - 0.5, t - 0.3, '#5f676e');
  if (o.streifen) for (const yy of [best.y + erg.h / 2 + 0.3, best.y - erg.h / 2 - 0.3]) streifenband(Z, s, best.u - erg.b / 2, best.u + erg.b / 2, yy, 0.4, t - 0.08);
  // deutlicher Abstand zum nächsten Banner (im Bild stoßen sonst die Kanten scheinbar aneinander)
  sperre(Z, s, best.u - erg.b / 2 - 0.9, best.u + erg.b / 2 + 0.9, best.y - erg.h / 2 - 1.4 - rand, best.y + erg.h / 2 + 1.4 + rand, 'banner');
  Z.top = Math.max(Z.top, best.y + erg.h / 2 + rand);
  return { ...erg, y: best.y, u: best.u };
}

/** Senkrechte Bahnen (Fahnenbanner); jede Bahn nutzt nur den freien Teil ihrer Spalte. */
function bahnen(Z, s, us, text, fg, bg, o = {}) {
  const k = Z.k, t = (k.tBanner ?? tFront(k)) + 0.2;
  const Y1 = o.y1 ?? k.hoehe - 0.6, Y0 = o.y0 ?? k.egHoehe + 0.5;
  us.forEach((u, i) => {
    const [y0, y1] = freieHoehe(Z, s, u - 1.2, u + 1.2, Y0, Y1);
    if (y1 - y0 < 3.5) return;
    const c = Array.isArray(bg) ? bg[i % bg.length] : bg, cf = Array.isArray(fg) ? fg[i % fg.length] : fg;
    s.q(u - 1.1, u + 1.1, y0, y1, t - 0.08, t - 0.02, c);
    s.q(u - 1.2, u + 1.2, y1 - 0.15, y1 + 0.1, t - 0.12, t + 0.05, '#4a4f55');
    plakat(Z, s, text, u, (y0 + y1) / 2, t, 1.5, cf, c, y1 - y0 - 0.8, Math.PI / 2 * s.lese);
    sperre(Z, s, u - 1.2, u + 1.2, y0, y1 + 0.1, 'bahn');
  });
}

/** Teleskop-Hebebühne auf dem Gehweg, Korb mit Monteur an (u, yZiel); daneben eine Palette mit abmontierten Buchstaben. */
function hebebuehne(Z, s, u, yZiel, tZiel, buchstaben = ['R', 'T', 'W']) {
  const S = Z.S, OR = '#e8751a', GE = '#f2b705';
  const tb = 3.6, ub = u;
  s.q(ub - 2.9, ub + 2.9, 0.6, 1.6, tb - 1.1, tb + 1.1, OR);          // Fahrgestell
  s.q(ub + 1.6, ub + 2.9, 1.6, 3.0, tb - 1.05, tb + 1.05, '#f4f1ea');  // Kabine
  s.q(ub + 1.62, ub + 2.88, 2.2, 2.9, tb + 1.05, tb + 1.1, '#7d9fb2');
  for (const du of [-2.0, 1.8]) for (const dt of [-1.1, 1.1]) { const [x, z] = s.welt(ub + du, tb + dt); S.box(0.6, 0.9, 0.6, x, 0.75, z, '#2b2b2b'); }
  for (const du of [-2.6, 2.6]) for (const dt of [-1.6, 1.6]) s.q(ub + du - 0.15, ub + du + 0.15, 0.3, 0.9, tb + dt - 0.2, tb + dt + 0.2, '#5f676e'); // Stützen
  s.q(ub - 0.9, ub + 0.9, 1.6, 2.4, tb - 0.8, tb + 0.8, '#4a4f55');    // Drehkranz
  const yK = Math.max(4, yZiel - 1.6), tK = tZiel + 1.1;
  const dy = yK - 2.2, dt = tK - tb, l = Math.hypot(dy, dt), a = Math.atan2(dt, dy);
  s.kipp(0.55, l, 0.55, ub, 2.2 + dy / 2, tb + dt / 2, GE, 0, a);
  s.kipp(0.35, l * 0.55, 0.35, ub, 2.2 + dy * 0.75, tb + dt * 0.75, '#e0e0dc', 0, a);
  s.q(ub - 1.1, ub + 1.1, yK - 0.1, yK + 0.15, tK - 0.7, tK + 0.7, '#4a4f55'); // Korb
  s.q(ub - 1.1, ub + 1.1, yK + 0.15, yK + 1.1, tK + 0.62, tK + 0.7, OR);
  s.q(ub - 1.1, ub - 1.02, yK + 0.15, yK + 1.1, tK - 0.7, tK + 0.7, OR); s.q(ub + 1.02, ub + 1.1, yK + 0.15, yK + 1.1, tK - 0.7, tK + 0.7, OR);
  s.q(ub - 0.25, ub + 0.25, yK + 0.15, yK + 1.0, tK - 0.15, tK + 0.15, '#2b3a55'); // Monteur
  s.q(ub - 0.3, ub + 0.3, yK + 1.0, yK + 1.7, tK - 0.17, tK + 0.17, '#f26b1d');
  s.q(ub - 0.15, ub + 0.15, yK + 1.7, yK + 2.0, tK - 0.14, tK + 0.14, '#f2c14e');
  // Palette mit Buchstaben
  const up = u - 5.5, tp = 2.6;
  s.q(up - 1.6, up + 1.6, 0.3, 0.55, tp - 0.7, tp + 0.7, '#b9875a');
  buchstaben.forEach((c, i) => {
    plakat(Z, s, c, up - 1.0 + i * 1.0, 1.35, tp - 0.4 + i * 0.3, 1.7, ROT, null, 2, 0.12 * (i - 1));
  });
  Z.top = Math.max(Z.top, yK + 2.2);
}

function hauptEingang(Z) {
  const e = Z.k.eingaenge ?? [];
  return e.find((x) => x.haupt) ?? e.find((x) => x.seite === '+z') ?? e[0] ?? { seite: '+z', u: Z.k.w * 0.45, breite: 4 };
}

/** Gerüst mit Netz und optionaler Werbeplane. */
function geruest(Z, s, u0, u1, yTop, plane = null) {
  const rohr = '#9ca3a8', brett = '#c79a5a', t1 = tFront(Z.k) + 0.5, t2 = t1 + 1.1;
  const nU = Math.max(2, Math.round((u1 - u0) / 2.6)), du = (u1 - u0) / nU;
  for (let i = 0; i <= nU; i++) { const u = u0 + i * du; s.q(u - 0.06, u + 0.06, 0.3, yTop, t1 - 0.06, t1 + 0.06, rohr); s.q(u - 0.06, u + 0.06, 0.3, yTop + 1, t2 - 0.06, t2 + 0.06, rohr); }
  for (let y = 2.2; y < Math.min(yTop, 7); y += 2.0) { s.q(u0, u1, y - 0.05, y + 0.05, t1 - 0.05, t2 + 0.05, brett); s.q(u0, u1, y + 1.0, y + 1.08, t2 - 0.05, t2 + 0.05, rohr); }
  const p0 = Math.min(yTop - 2, Z.k.egHoehe + 0.8);
  const nb = Math.max(1, Math.round((u1 - u0) / 3.0));
  for (let i = 0; i < nb; i++) { // Netzbahnen
    const a = u0 + (i * (u1 - u0)) / nb + 0.04, b = u0 + ((i + 1) * (u1 - u0)) / nb - 0.04;
    s.q(a, b, p0, yTop + 0.9, t2 + 0.1, t2 + 0.15, i % 2 ? '#c9d8cf' : '#d8e3dc');
  }
  for (let y = p0 + 2; y < yTop; y += 2) s.q(u0, u1, y - 0.04, y + 0.04, t2 + 0.15, t2 + 0.18, '#aab9b0');
  if (plane && yTop - p0 > 6) {
    const pu0 = u0 + (u1 - u0) * 0.08, pu1 = u1 - (u1 - u0) * 0.08, py0 = p0 + 1.2, py1 = yTop - 0.4;
    s.q(pu0, pu1, py0, py1, t2 + 0.2, t2 + 0.26, plane.bg);
    const hz = Math.min(2.4, (py1 - py0) * 0.28);
    tafel(Z, s, [{ text: plane.oben, h: hz * 0.6, fg: plane.fg2 ?? plane.fg }, { text: plane.text, h: hz, fg: plane.fg }], (pu0 + pu1) / 2, (py0 + py1) / 2 + hz * 0.3, t2 + 0.38, plane.bg, { maxB: (pu1 - pu0) * 0.92 });
    // angedeutetes Visualisierungsbild: Gebäude-Silhouette
    const by = py0 + 0.5, bh = (py1 - py0) * 0.25;
    for (let i = 0; i < 5; i++) { const a = pu0 + (pu1 - pu0) * (0.1 + i * 0.17); s.q(a, a + (pu1 - pu0) * 0.12, by, by + bh * (0.6 + (i % 3) * 0.25), t2 + 0.27, t2 + 0.3, i % 2 ? '#ffffff' : heller(plane.bg, 0.15)); }
  }
}

// ─────────────────────────────────────────────────────────────── Untermieter in Obergeschossen
function mieterBand(Z, s, mi, e, u0, u1) {
  const k = Z.k, r = Z.r, GH = k.geschossHoehe;
  const y0 = etagenY(k, e) + 0.25, y1 = etagenY(k, e) + GH - 0.25, t = tFront(k) + 0.05;
  const rahmen = mi.bg === '#ffffff' || mi.bg === '#f4f1ea' ? mi.fg : mi.bg;
  // eigene Fassadenschicht des Mieters
  const hellBg = mi.bg === '#ffffff' || mi.bg === '#f4f1ea';
  s.q(u0, u1, y0, y1, t, t + 0.1, hellBg ? '#' + new THREE.Color(mi.fg).lerp(new THREE.Color('#ffffff'), 0.72).getHexString() : mi.bg);
  if (hellBg) { s.q(u0, u1, y1 - 0.35, y1, t, t + 0.2, mi.fg); s.q(u0, u0 + 0.35, y0, y1, t, t + 0.2, mi.fg); s.q(u1 - 0.35, u1, y0, y1, t, t + 0.2, mi.fg); }
  s.q(u0, u1, y0 - 0.12, y0, t, t + 0.18, rahmen);
  const glas = mi.typ === 'fitness' ? '#a9c9d8' : mi.typ === 'coworking' ? '#bcd6df' : '#6f8fa2';
  const wy0 = y0 + 0.45, wy1 = y1 - (mi.typ === 'aerztehaus' || mi.typ === 'behoerde' ? 0.4 : 0.25);
  const L = u1 - u0;
  const schildB = Math.min(L * 0.42, 14);
  const fu0 = u0 + schildB + 0.6;
  if (mi.typ === 'fitness') { // großes Fensterband mit Laufbändern
    s.q(fu0, u1 - 0.4, wy0, wy1, t + 0.1, t + 0.14, glas);
    for (let u = fu0 + 1.2; u < u1 - 1; u += 1.9) {
      s.q(u - 0.6, u + 0.6, wy0, wy0 + 0.35, t + 0.14, t + 0.24, '#2b2b2b');
      s.q(u + 0.45, u + 0.55, wy0 + 0.35, wy0 + 1.3, t + 0.14, t + 0.24, '#2b2b2b');
      s.q(u - 0.15, u + 0.1, wy0 + 0.35, wy0 + 1.25, t + 0.24, t + 0.28, waehle(r, HOSE));
      s.q(u - 0.22, u + 0.17, wy0 + 1.25, wy0 + 1.95, t + 0.24, t + 0.28, waehle(r, ['#d04a3f', '#2f63b5', '#e0b23c', '#f1f1ee']));
      s.q(u - 0.12, u + 0.07, wy0 + 1.95, wy0 + 2.25, t + 0.24, t + 0.28, waehle(r, HAUT));
    }
    for (let u = fu0; u <= u1 - 0.3; u += 3.8) s.q(u - 0.08, u + 0.08, wy0, wy1, t + 0.1, t + 0.2, rahmen);
    s.q(fu0, u1 - 0.4, wy1 - 0.25, wy1, t + 0.14, t + 0.18, mi.fg);
  } else if (mi.typ === 'coworking') {
    s.q(fu0, u1 - 0.4, wy0, wy1, t + 0.1, t + 0.14, glas);
    for (let u = fu0 + 1.2; u < u1 - 1; u += 2.6) { s.q(u - 0.8, u + 0.8, wy0 + 0.7, wy0 + 0.8, t + 0.14, t + 0.24, '#f4f1ea'); s.q(u - 0.3, u + 0.3, wy0 + 0.8, wy0 + 1.2, t + 0.14, t + 0.2, '#2b3a4a'); }
    for (let u = fu0 + 2.5; u < u1 - 1; u += 5.2) pflanzeFassade(Z, s, u, wy0, t + 0.2);
    for (let u = fu0; u <= u1 - 0.3; u += 2.6) s.q(u - 0.05, u + 0.05, wy0, wy1, t + 0.1, t + 0.18, '#2b3a4a');
  } else { // Ärztehaus / Behörde / sonst: Lochfenster
    for (let u = fu0 + 0.9; u < u1 - 1; u += 2.4) s.q(u - 0.75, u + 0.75, wy0 + 0.3, wy1, t + 0.1, t + 0.14, glas);
    if (mi.typ === 'aerztehaus') s.q(fu0, u1 - 0.4, y0 + 0.25, y0 + 0.4, t + 0.1, t + 0.16, mi.fg);
    if (mi.typ === 'behoerde') s.q(fu0, u1 - 0.4, wy1 + 0.1, wy1 + 0.3, t + 0.1, t + 0.16, mi.fg);
  }
  // Mieterschild
  const sy = (y0 + y1) / 2;
  const sbg = mi.bg, sfg = mi.fg;
  if (mi.typ === 'aerztehaus') { // Kreuz
    const cu = u0 + 1.4;
    s.q(cu - 0.85, cu + 0.85, sy - 0.28, sy + 0.28, t + 0.12, t + 0.2, sfg);
    s.q(cu - 0.28, cu + 0.28, sy - 0.85, sy + 0.85, t + 0.12, t + 0.2, sfg);
    plakat(Z, s, mi.name, u0 + 2.6 + (schildB - 2.6) / 2, sy, t + 0.22, 1.6, sfg, sbg, schildB - 2.8);
  } else plakat(Z, s, mi.name, u0 + schildB / 2 + 0.3, sy, t + 0.16, 1.9, sfg, sbg, schildB - 0.4);
}
function pflanzeFassade(Z, s, u, y, t) { const g = new THREE.IcosahedronGeometry(0.6, 0); g.translate(u, y + 0.7, t); s.geo(g, '#5f9a56'); }

/** Eingang für einen Mieter im UG: Treppenabgang auf dem Gehweg. */
function ugEingang(Z, s, mi, u) {
  const t = 2.2;
  s.q(u - 2.0, u + 2.0, 0.3, 1.2, t - 0.1, t + 0.1, '#c9ced2');
  s.q(u - 2.0, u + 2.0, 1.2, 1.3, t - 0.15, t + 1.6, '#8f989f');
  s.q(u - 1.8, u + 1.8, 0.29, 0.31, t, t + 1.5, '#4a4f55');
  s.q(u + 1.9, u + 2.05, 0.3, 3.8, t + 1.4, t + 1.6, '#4a4f55');
  const b = plakat(Z, s, mi.name, u, 4.0, t + 1.75, 0.65, mi.fg, mi.bg, 5);
  s.q(u - b.b / 2 - 0.15, u + b.b / 2 + 0.15, 3.55, 4.45, t + 1.6, t + 1.7, mi.bg);
  plakat(Z, s, 'UG ↓', u, 3.15, t + 1.75, 0.5, '#ffffff', '#3a3f44');
}

/** Hinweispylon mit allen Mietern. */
function pylon(Z, s, liste, u, t) {
  const n = liste.length, ph = 0.7, H = 1.6 + n * (ph + 0.18) + 0.8;
  s.q(u - 1.0, u + 1.0, 0.3, H, t - 0.35, t + 0.35, '#2b3a4a');
  s.q(u - 1.1, u + 1.1, H, H + 0.15, t - 0.4, t + 0.4, '#1f2a36');
  plakat(Z, s, 'HIER FINDEN SIE', u, H - 0.45, t + 0.37, 0.32, '#ffffff', '#2b3a4a', 1.8);
  liste.forEach((mi, i) => {
    const y = H - 1.0 - i * (ph + 0.18) - ph / 2;
    s.q(u - 0.9, u + 0.9, y - ph / 2, y + ph / 2, t + 0.35, t + 0.38, mi.bg);
    plakat(Z, s, mi.name, u, y, t + 0.4, ph * 0.62, mi.fg, mi.bg, 1.7);
  });
  return H;
}

/** Dachgastronomie: Holzdeck, Schirme, Pflanzkübel, Schild an der Kante. */
function dachGastro(Z, mi, rect) {
  const S = Z.S, r = Z.r, { x0, z0, x1, z1, y } = rect;
  S.quader(x0, y, z0, x1, y + 0.35, z1, '#b9875a');
  S.quader(x0, y + 0.35, z1 - 0.1, x1, y + 1.4, z1, '#cfe0e6');
  S.quader(x1 - 0.1, y + 0.35, z0, x1, y + 1.4, z1, '#cfe0e6');
  const farbe = mi.bg === '#2b2b2b' ? '#f2b705' : mi.bg;
  for (let x = x0 + 2.2; x < x1 - 1.5; x += 4.2) for (let z = z0 + 2.2; z < z1 - 1.5; z += 4.2) {
    S.box(1.2, 0.08, 1.2, x, y + 1.15, z, '#f4f1ea');
    S.box(0.1, 2.6, 0.1, x, y + 1.6, z, '#4a4f55');
    const g = new THREE.ConeGeometry(1.9, 0.9, 6); g.translate(x, y + 3.2, z); S.add(g, r() < 0.5 ? farbe : '#f4f1ea');
  }
  for (let x = x0 + 1; x < x1; x += 3.5) { S.box(0.8, 0.7, 0.8, x, y + 0.7, z1 - 0.7, '#9a8f80'); kugel(S, x, y + 1.5, z1 - 0.7, 0.6, '#5f9a56'); }
  // Lichterkette
  for (let x = x0 + 0.5; x < x1; x += 1.0) S.box(0.18, 0.18, 0.18, x, y + 3.9 - 0.4 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI * 3) ** 2, z1 - 0.2, '#ffe58a');
  // Schild an der Dachkante
  const s = new Seite(S, x0, z0, x1 - x0, z1 - z0, '+z');
  const b = plakat(Z, s, mi.name, (x1 - x0) * 0.5, y + 5.6, 0.1, 1.6, mi.fg, mi.bg, (x1 - x0) * 0.9);
  s.q((x1 - x0) * 0.5 - b.b / 2 - 0.2, (x1 - x0) * 0.5 + b.b / 2 + 0.2, y + 4.6, y + 6.6, -0.12, 0.06, mi.bg);
  for (const du of [-b.b * 0.35, b.b * 0.35]) s.q((x1 - x0) * 0.5 + du - 0.08, (x1 - x0) * 0.5 + du + 0.08, y + 0.35, y + 4.6, -0.2, -0.05, '#4a4f55');
  return y + 6.6;
}

// ─────────────────────────────────────────────────────────────── Hauptfunktion
/**
 * opt: { pylon?: false, passanten?: false (keine Menschen), abrissSeite?: '+x' | '+z' | 'ecke', logosAbdecken?: bool }
 * Reihenfolge = Priorität der Fassadenflächen: Mieter > Outlet > Umbau > Räumung > Geschlossen > Leerstand > Neueröffnung > Teilschließung > Aktion.
 */
export function zustandsDekor(S, scene, k, Zin, opt = {}) {
  const Z = { S, scene, k, r: rng(`${k.seed ?? 'z'}/zustand`), ...opt, leute: opt.passanten !== false, belegt: { '+z': [], '+x': [] }, top: k.hoehe };
  const st = zustandNormal(Zin);
  const hat = st.hat;
  const start = S.anzahl;
  const seiten = { '+z': new Seite(S, k.x, k.z, k.w, k.d, '+z'), '+x': new Seite(S, k.x, k.z, k.w, k.d, '+x') };
  const sz = seiten['+z'], sx = seiten['+x'];
  Z.nutz = (s) => k.seiten?.[s.seite]?.u1 ?? s.L;
  const n = k.n, GH = k.geschossHoehe, EG = k.egHoehe;
  const jahr = k.jahr ?? 2026;
  let mieterEG = k.mieterEG ?? [];
  const r = Z.r;
  const GROSS = Math.min(10, Math.max(3.5, (k.hoehe - EG) * 0.55));
  // Logos und weitere Sperrflächen des Generators eintragen
  for (const s of [sz, sx]) {
    const sd = k.seiten?.[s.seite] ?? {};
    const lg = sd.logo;
    // Leuchtlettern: Ebene ist 2,05 × hb hoch, die Lettern füllen fast die ganze Ebene; dazu Abstand, damit nichts an die Schrift stößt
    if (lg) { const b = (lg.breite ?? lg.hb * 6) / 2 + 1.0, hy = lg.hb * 1.05 + 1.2; sperre(Z, s, lg.u - b, lg.u + b, lg.y - hy, lg.y + hy, 'logo'); }
    // Vorsprünge (Treppenhaus, Risalit), die vor der Bannerebene liegen: Banner dürfen nicht dahinter verschwinden
    const tB = (k.tBanner ?? tFront(k)) + 0.25;
    for (const v of k.vorspruenge ?? []) if (v.seite === s.seite && (v.voll || v.t > tB - 0.15)) sperre(Z, s, v.u0, v.u1, 0, k.hoehe + 6, 'risalit');
    for (const q of sd.sperren ?? []) sperre(Z, s, q.u0, q.u1, q.y0, q.y1, q.art ?? 'logo');
  }
  // Fensterbereiche je Seite (nach einem Teilabriss nur der stehende Rest)
  const rest = { '+z': [0.3, Z.nutz(sz) - 0.3], '+x': [0.3, Z.nutz(sx) - 0.3] };
  let eingaenge = k.eingaenge ?? [], fensterEG = k.fensterEG ?? [];

  // ---------- Abriss: Teil des Baukörpers wegschneiden, Ruine + Baustelle
  if (hat('abriss')) {
    const art = ['+x', '+z', 'ecke'].includes(opt.abrissSeite) ? opt.abrissSeite : waehle(rng(`${k.seed ?? 'z'}/abrissseite`), ['+x', '+z', 'ecke']);
    const xc = k.x + k.w * 0.56, zc = k.z + k.d * 0.5;
    const R = { x0: art === '+z' ? k.x : xc, z0: art === '+x' ? k.z : zc, x1: k.x + k.w, z1: k.z + k.d };
    // Schnittbereich mit Zugabe für Gesimsüberstände an der durchgehenden Seite
    if (k.marke) abschneiden(S, scene, k.marke, { ...R, x0: art === '+z' ? k.x - 1.2 : R.x0, z0: art === '+x' ? k.z - 1.2 : R.z0 });
    const farbe = k.farbe ?? '#d9d3c7';
    rest['+z'] = art === '+z' ? null : [0.3, xc - k.x - 0.4];
    rest['+x'] = art === '+x' ? null : [0.3, zc - k.z - 0.4];
    const drin = (s, u) => { const [x, z] = s.welt(u, 0); return x > R.x0 - 0.5 && z > R.z0 - 0.5; };
    eingaenge = eingaenge.filter((e) => !drin(seiten[e.seite], e.u));
    fensterEG = fensterEG.filter((f) => !drin(seiten[f.seite], (f.a + f.b) / 2));
    mieterEG = mieterEG.filter((m) => !drin(seiten[m.seite], (m.ua + m.ub) / 2));
    // freigelegte Schnittflächen: Decken, Räume, Stützen
    const flaechen = [];
    if (art !== '+z') flaechen.push(new Seite(S, R.x0 - 1, R.z0, 1, k.z + k.d - R.z0, '+x'));
    if (art !== '+x') flaechen.push(new Seite(S, R.x0, R.z0 - 1, k.x + k.w - R.x0, 1, '+z'));
    for (const fs of flaechen) {
      const seg = Math.max(2, Math.round(fs.L / 7)), du = fs.L / seg;
      for (let e = 0; e <= n; e++) {
        const y = e === 0 ? 0.3 : etagenY(k, e);
        for (let j = 0; j < seg; j++) {
          const ua = j * du, ub = ua + du;
          const len = e === 0 ? zw(r, 2, 5) : zw(r, 0.4, 3.2);
          if (e > 0 && r() < 0.25) continue;
          fs.q(ua + 0.1, ub - 0.1, y - 0.45, y, 0, len, BETON);
          if (r() < 0.6) for (let q = 0; q < 3; q++) fs.q(ua + 0.6 + q * du * 0.3, ua + 0.64 + q * du * 0.3, y - 0.3 + q * 0.1, y - 0.27 + q * 0.1, len, len + 0.8, '#5a4a3f');
          if (e < n) {
            const yH = e === 0 ? EG : etagenY(k, e + 1) - 0.45;
            fs.q(ua + 0.15, ub - 0.15, y, yH, 0, 0.06, waehle(r, ['#5d5a55', '#6b6762', '#c9b18a', '#9fb3a8', '#d8cfc0', '#b78f7a']));
          }
        }
        if (e > 0) for (let j = 0; j <= seg; j++) fs.q(j * du - 0.3, j * du + 0.3, y, y + (e < n ? GH - 0.45 : 0.6), 0, 0.6, BETON_D);
      }
    }
    // Stümpfe der Außenwände im Abrissbereich, gezackt, zur Schnittkante hin höher
    const hMax = EG + GH;
    const abstand = (x, z) => Math.min(art === '+z' ? Infinity : x - R.x0, art === '+x' ? Infinity : z - R.z0);
    const tief = Math.max(k.w - (R.x0 - k.x), k.d - (Math.max(k.z, R.z0) - k.z));
    for (let x = R.x0; x < k.x + k.w - 2; x += zw(r, 2.5, 4.5)) {
      const h = Math.max(1.2, hMax * (1 - abstand(x, k.z + k.d) / tief) * zw(r, 0.5, 1.1));
      S.quader(x, 0, k.z + k.d - 0.6, x + zw(r, 1.5, 3), h, k.z + k.d, farbe);
    }
    for (let z = Math.max(k.z, R.z0); z < k.z + k.d - 2; z += zw(r, 2.5, 4.5)) {
      const h = Math.max(1.2, hMax * 0.8 * (1 - abstand(k.x + k.w, z) / tief) * zw(r, 0.4, 1.0));
      S.quader(k.x + k.w - 0.6, 0, z, k.x + k.w, h, z + zw(r, 1.5, 3), farbe);
    }
    const rz0 = Math.max(k.z, R.z0);
    schutt(Z, R.x0 + 1, rz0 + 1, R.x1 - 1, R.z1 - 1, 26, [BETON, BETON_D, farbe, '#b9785e', '#8e8a82'], 4);
    schutt(Z, R.x0 + (R.x1 - R.x0) * 0.2, rz0 + (R.z1 - rz0) * 0.2, R.x1 - (R.x1 - R.x0) * 0.2, R.z1 - (R.z1 - rz0) * 0.2, 6, [BETON, farbe], 9);
    bagger(Z, R.x0 + (R.x1 - R.x0) * 0.55, rz0 + (R.z1 - rz0) * 0.55, Math.PI * 0.75, 1.0);
    // Absperrung entlang der Straßenkanten des Abrissbereichs
    bauzaun(Z, sz, R.x0 - k.x - 1, sz.L + 2, 3.6);
    bauzaun(Z, sx, rz0 - k.z - 1, sx.L + 2, 3.6);
    // Bauschild am stehenden Rest
    const inv = waehle(r, VERMIETER);
    const sB = art === '+z' ? sx : sz, uc = art === '+z' ? zc - k.z : xc - k.x;
    const bu = Math.max(6, uc * 0.45), bt = 4.2;
    for (const du of [-3, 3]) sB.q(bu + du - 0.12, bu + du + 0.12, 0.3, 4.2, bt - 0.12, bt + 0.12, '#4a4f55');
    tafel(Z, sB, [{ text: 'HIER ENTSTEHT', h: 0.7 }, { text: 'QUARTIER AM MARKT', h: 1.1 }, { text: 'Wohnen · Büro · Handel', h: 0.6, fg: '#d9e2ea' }, { text: inv, h: 0.55, fg: GELB }], bu, 6.2, bt + 0.25, '#1f3f6b', { maxB: 9, rahmen: '#ffffff' });
    Z.top = Math.max(Z.top, 8);
  }
  const haupt = () => eingaenge.find((x) => x.haupt) ?? eingaenge.find((x) => x.seite === '+z') ?? eingaenge[0] ?? { seite: rest['+z'] ? '+z' : '+x', u: (rest['+z'] ?? rest['+x'])[1] * 0.45, breite: 4 };

  // ---------- Fenster in Obergeschossen
  const geschl = st.status === 'geschlossen';
  const tsAb = n >= 3 ? 2 : 1; // Teilschließung ab diesem Geschoss
  for (const s of [sz, sx]) {
    const rs = rest[s.seite];
    if (!rs) continue;
    for (let e = 1; e < n; e++) {
      if (hat('verfall')) fensterZu(Z, s, e, 'verfall', rs[0], rs[1]);
      else if (hat('leer')) fensterZu(Z, s, e, 'weiss', rs[0], rs[1]);
      else if (hat('abriss')) fensterZu(Z, s, e, 'papier', rs[0], rs[1]);
      else if (geschl) fensterZu(Z, s, e, 'rollladen', rs[0], rs[1]);
      else if (hat('teilschliessung')) fensterZu(Z, s, e, e >= tsAb ? 'dunkel' : 'licht', rs[0], rs[1]);
    }
  }

  // ---------- Untermieter in Obergeschossen
  const oben = st.untermieter.filter((m) => m.etage !== 0);
  const belegt = new Map();
  for (const mi of oben) {
    if (mi.etage < 0) { ugEingang(Z, sx, mi, Math.min(sx.L - 6, Z.nutz(sx) * 0.75)); continue; }
    if (mi.typ === 'gastro' && (mi.etage >= n || mi.etage > 3)) {
      const rect = k.terrasse ?? (k.dach && { x0: k.dach.x1 - Math.min(16, (k.dach.x1 - k.dach.x0) * 0.45), z0: k.dach.z1 - Math.min(11, (k.dach.z1 - k.dach.z0) * 0.5), x1: k.dach.x1, z1: k.dach.z1, y: k.dach.y });
      if (rect) Z.top = Math.max(Z.top, dachGastro(Z, mi, rect));
      continue;
    }
    if (n < 2) continue;
    // beste Kombination aus Seite und Geschoss: lange freie Strecke, nahe am Wunschgeschoss, Seiten abwechselnd
    let best = null;
    for (const s of [sx, sz]) {
      if (!rest[s.seite]) continue;
      const L = Math.min(Z.nutz(s), rest[s.seite][1] + 0.3), anz = [...belegt.keys()].filter((q) => q.startsWith(s.seite)).length;
      for (let e = 1; e < n; e++) {
        if (belegt.has(`${s.seite}${e}`)) continue;
        const ya = etagenY(k, e);
        for (const [a, b] of freieStuecke(Z, s, L * 0.04, L - 0.4, ya + 0.15, ya + GH - 0.15, 0.4)) {
          const w = Math.min(b - a, L * (s === sz ? 0.62 : 0.72));
          if (w < Math.max(8, Math.min(14, L * 0.3))) continue;
          const wert = (w / L) * 10 - 3 * Math.abs(e - Math.max(1, Math.min(mi.etage, n - 1))) - 1.5 * anz + (s === sx ? 0.3 : 0);
          if (!best || wert > best.wert) best = { wert, s, e, b0: a, b1: a + w };
        }
      }
    }
    if (!best) continue;
    belegt.set(`${best.s.seite}${best.e}`, mi);
    mieterBand(Z, best.s, mi, best.e, best.b0, best.b1);
    sperre(Z, best.s, best.b0, best.b1, etagenY(k, best.e), etagenY(k, best.e) + GH, 'mieter');
  }
  if (hat('offprice') && st.offpriceEtage > 0 && n >= 2) {
    const e = Math.min(st.offpriceEtage, n - 1), L = Z.nutz(sz);
    const out = mieterInfo({ name: 'HARTWIG OUTLET', etage: e });
    const y0 = etagenY(k, e) + 0.2, y1 = y0 + GH - 0.4, t = tFront(k) + 0.05;
    sz.q(L * 0.04, L * 0.8, y0, y1, t, t + 0.1, '#f5b400');
    sz.q(L * 0.32, L * 0.78, y0 + 0.5, y1 - 0.4, t + 0.1, t + 0.14, '#8fa8b5');
    for (let u = L * 0.34; u < L * 0.76; u += 2.6) { sz.q(u, u + 2, y0 + 0.5, y0 + 1.3, t + 0.14, t + 0.24, '#c9b48a'); for (let q = 0; q < 3; q++) sz.q(u + 0.2 + q * 0.6, u + 0.6 + q * 0.6, y0 + 1.3, y0 + 1.6, t + 0.14, t + 0.22, waehle(r, ['#e04b3a', '#3a7bd5', '#4caf50', '#ffffff'])); }
    plakat(Z, sz, out.name, L * 0.18, (y0 + y1) / 2, t + 0.16, 2.0, out.fg, out.bg, L * 0.26);
    sperre(Z, sz, L * 0.04, L * 0.8, y0, y1, 'mieter');
  }
  const alleMieter = [...mieterEG.filter((m) => m.typ !== 'offprice'), ...st.untermieter.filter((m) => m.etage !== 0)];
  if (alleMieter.length >= 2 && opt.pylon !== false) {
    const he = haupt(), s = seiten[he.seite];
    const u = Math.min(s.L - 2, he.u + (he.breite ?? 4) / 2 + 3.2);
    pylon(Z, s, alleMieter.slice(0, 6), u, 3.6);
  }
  // EG-Mieter: Einkaufswagen / Außengastro / Outlet
  for (const m of mieterEG) {
    const s = seiten[m.seite];
    // Fremdmieter: durchgehende Blende in Mieterfarbe über die ganze Ladenbreite mit großem Namen
    if (m.typ !== 'offprice' && m.ub - m.ua > 6) {
      const t = tFront(k) + 0.14, y0 = EG - 1.45, y1 = EG - 0.1;
      s.q(m.ua, m.ub, y0, y1, t, t + 0.2, m.bg);
      s.q(m.ua, m.ub, y0 - 0.12, y0, t, t + 0.24, m.fg);
      plakat(Z, s, m.name, (m.ua + m.ub) / 2, (y0 + y1) / 2, t + 0.22, 1.0, m.fg, m.bg, (m.ub - m.ua) * 0.9);
      sperre(Z, s, m.ua, m.ub, y0, y1, 'mieter');
      // dazu ein großes Mieterbanner über dem eigenen Ladenteil im 1. OG
      if (n >= 2) fassadenBanner(Z, s, [{ text: m.name, h: 1.6, fg: m.fg }], m.bg, { u: (m.ua + m.ub) / 2, maxB: (m.ub - m.ua) * 0.95, zielH: Math.min(GH * 0.9, 3.4), lo: EG + 0.3, y: EG + 0.3 + Math.min(GH * 0.9, 3.4) / 2, rahmen: m.fg, minSchrift: 0.6 });
    }
    if (m.typ === 'discounter') for (let i = 0; i < 4; i++) { const [x, zz] = s.welt(m.ua + 1.2 + i * 0.55, 2.0); S.box(0.5, 0.75, 0.9, x, 0.75, zz, '#aab3ba'); }
    if (m.typ === 'gastro') for (let i = 0; i < 2; i++) { const [x, zz] = s.welt(m.ua + 2 + i * 3.4, 3.2); S.box(0.9, 0.08, 0.9, x, 1.05, zz, '#f4f1ea'); S.box(0.08, 2.4, 0.08, x, 1.5, zz, '#4a4f55'); const g = new THREE.ConeGeometry(1.5, 0.7, 6); g.translate(x, 2.9, zz); S.add(g, m.bg); }
    if (m.typ === 'offprice') {
      aufsteller(Z, s, m.ua + 2, 2.6, 'ALLES -50 %', '#1d1d1d', '#f5b400');
      const hO = Math.min(GH * 1.15, Math.max(3, k.hoehe - EG - 1));
      fassadenBanner(Z, s, [{ text: 'HARTWIG OUTLET', h: 2.6, fg: '#1d1d1d' }, { text: 'Marken bis -70 %', h: 1.1, fg: '#c8102e' }], '#f5b400', { u: (m.ua + m.ub) / 2, maxB: (m.ub - m.ua) * 0.98, zielH: hO, y: n <= 1 ? undefined : EG + 0.35 + hO / 2, rahmen: '#1d1d1d', fuellen: true });
      if (n >= 2) bahnen(Z, s, [m.ua + 1.6, m.ub - 1.6], 'OUTLET', '#1d1d1d', '#f5b400', { y0: EG + 0.6 });
      for (let i = 0; i < 3; i++) { const [x, zz] = s.welt(m.ua + 3 + i * 3, 3.0); S.box(1.8, 0.8, 0.9, x, 0.7, zz, '#f5b400'); for (let q = 0; q < 3; q++) S.box(0.5, 0.3, 0.7, x - 0.6 + q * 0.6, 1.25, zz, waehle(r, ['#e04b3a', '#3a7bd5', '#4caf50', '#ffffff', '#2b2b2b'])); }
    }
  }

  // ---------- Umbau
  if (hat('umbau')) {
    const Lz = Z.nutz(sz), Lx = Z.nutz(sx);
    const a = Lz * 0.04, b = a + Math.max(14, Lz * 0.55);
    const yA = k.hoehe + 0.5, yB = k.hoehe - GH * Math.min(1, n - 1) + 0.5;
    if (opt.logosAbdecken) for (const s of [sz, sx]) for (const q of Z.belegt[s.seite].filter((p) => p.art === 'logo')) {
      const t = (k.tLogo ?? tFront(k)) + 0.5;
      s.q(q.u0 - 0.2, q.u1 + 0.2, q.y0 - 0.2, q.y1 + 0.2, t, t + 0.06, '#d8e3dc');
      for (const f of [0.25, 0.75]) s.q(q.u0 + (q.u1 - q.u0) * f - 0.12, q.u0 + (q.u1 - q.u0) * f + 0.12, q.y0 - 0.25, q.y1 + 0.25, t + 0.06, t + 0.1, '#5f676e');
      if (q.u1 - q.u0 > 4 && q.y1 - q.y0 > 1.2) plakat(Z, s, 'BALD NEU', (q.u0 + q.u1) / 2, (q.y0 + q.y1) / 2, t + 0.12, Math.min(1.2, (q.y1 - q.y0) * 0.5), ROT, null, (q.u1 - q.u0) * 0.4);
    }
    // Gerüst mit Plane: liegt nie halb über dem Schriftzug. Entweder daneben (freies Stück ab 14 m) oder es deckt ihn ganz ab.
    const lage = (s, a0, b0, yTop, L) => {
      // das Gerüst steht bis 1,6 m vor der Fassade und verdeckt im Bild daher bis rund 2 m über seiner Oberkante
      const lg = Z.belegt[s.seite].filter((q) => q.art === 'logo' && q.y0 < yTop + 3 && q.u1 > a0 - 2 && q.u0 < b0);
      if (!lg.length) return [a0, b0];
      const u0 = Math.min(...lg.map((q) => q.u0)), u1 = Math.max(...lg.map((q) => q.u1));
      const links = [Math.max(0.6, a0), u0 - 0.6], rechts = [u1 + 0.6, Math.min(L - 0.6, Math.max(b0, u1 + 0.6 + (b0 - a0)))];
      if (links[1] - links[0] >= Math.min(14, b0 - a0)) return links;
      if (rechts[1] - rechts[0] >= Math.min(14, b0 - a0)) return rechts;
      return [Math.max(0.6, Math.min(a0, u0 - 0.6)), Math.min(L - 0.6, Math.max(b0, u1 + 0.6))];
    };
    const [ga, gb] = lage(sz, a, b, yA, Lz), [xa, xb] = lage(sx, Lx * 0.5, Lx * 0.92, yB, Lx);
    geruest(Z, sz, ga, gb, yA, { oben: 'HIER ENTSTEHT', text: k.planeText ?? 'DAS NEUE HARTWIG', bg: ROT, fg: '#ffffff', fg2: '#ffe2dc' });
    sperre(Z, sz, ga - 0.3, gb + 0.3, 0, yA + 1.2, 'geruest');
    geruest(Z, sx, xa, xb, yB);
    sperre(Z, sx, xa - 0.3, xb + 0.3, 0, yB + 1.2, 'geruest');
    bauzaun(Z, sz, ga, gb, 4.2, { text: 'Wir haben geöffnet', fg: '#ffffff', bg: ROT });
    const [cx, cz] = sx.welt(Lx * 0.2, 3.3);
    container(Z, cx, cz, Math.PI / 2, '#2f6f8f');
    container(Z, cx, cz, Math.PI / 2, '#e8e4dc', 2.9);
    const [cx2, cz2] = sx.welt(Lx * 0.2 + 6.4, 3.3);
    container(Z, cx2, cz2, Math.PI / 2, '#5b8f5a');
    // Kran am Gerüst, nicht vor dem Schriftzug
    // Kran am hinteren Ende der +x-Front: dort verdeckt sein Mast im Bild weder Schrift noch Fassade
    const ku = Math.min(4, sx.L / 2);
    const [kx, kz] = sx.welt(ku, 3.2);
    Z.top = Math.max(Z.top, kran(Z, kx, kz, k.hoehe + 9, Math.min(32, k.w * 0.6), Math.PI * 0.92));
    const he = haupt(), s = seiten[he.seite];
    aufsteller(Z, s, he.u + (he.breite ?? 4) / 2 + 1.0, 2.2, 'Geöffnet', '#ffffff', '#3f7d56');
  }

  // ---------- Räumungsverkauf
  if (hat('raeumung')) {
    fassadenBanner(Z, sz, [{ text: 'ALLES MUSS RAUS', h: 2.4, fg: '#c8102e' }, { text: 'RÄUMUNGSVERKAUF', h: 1.0, fg: '#1d1d1d' }], '#f6d32d', { anteil: 0.8, rahmen: '#c8102e', zielH: GROSS, modus: 'mitte', fuellen: true });
    fassadenBanner(Z, sx, [{ text: '-70 %', h: 3.2, fg: '#ffffff' }, { text: 'LETZTE TAGE', h: 0.9, fg: '#f6d32d' }], '#c8102e', { anteil: 0.5, zielH: GROSS * 0.9, modus: 'mitte' });
    const Lz = Z.nutz(sz), Lx = Z.nutz(sx);
    bahnen(Z, sz, [Lz * 0.06, Lz * 0.94], 'RÄUMUNG', ['#c8102e', '#1d1d1d'], ['#f6d32d', '#c8102e'], { y1: k.hoehe - 0.8 });
    bahnen(Z, sx, [Lx * 0.12, Lx * 0.88], 'ALLES -70 %', ['#ffffff', '#c8102e'], ['#c8102e', '#f6d32d']);
    for (const f of fensterEG) {
      const s = seiten[f.seite], m = (f.a + f.b) / 2;
      const txt = waehle(r, ['-70 %', '-50 %', 'ALLES MUSS RAUS', '-60 %']);
      plakat(Z, s, txt, m, (f.y0 + f.y1) / 2 + 0.3, f.t + 0.12, 1.1, txt.startsWith('A') ? '#c8102e' : '#ffffff', txt.startsWith('A') ? '#f6d32d' : '#c8102e', f.b - f.a - 0.3);
    }
    const he = haupt(), s = seiten[he.seite];
    menge(Z, s, he.u, 3.2, 34, 7, 3.0, { tMin: (he.t ?? 0) + 0.8 });
    schlange(Z, s, he.u + 4, Math.min(s.L - 1, he.u + 18), 1.6);
    aufsteller(Z, s, he.u - 5, 3.8, '-70 %', '#ffffff', '#c8102e');
  }

  // ---------- Geschlossen: dunkle Rollgitter, Rollläden, schwarz-rotes Schild, Hebebühne baut die Buchstaben ab, Absperrgitter
  if (geschl) {
    for (const f of fensterEG) {
      const s = seiten[f.seite];
      s.q(f.a, f.b, f.y0 - 0.3, f.y1, f.t + 0.1, f.t + 0.14, '#3e444a');
      for (let y = f.y0; y < f.y1 - 0.1; y += 0.34) s.q(f.a, f.b, y, y + 0.06, f.t + 0.14, f.t + 0.17, '#2b3035');
      s.q(f.a - 0.05, f.b + 0.05, f.y1, f.y1 + 0.4, f.t + 0.05, f.t + 0.3, '#2b3035');
    }
    for (const e of eingaenge) {
      const s = seiten[e.seite], b = (e.breite ?? 4) / 2, t = (e.t ?? 0) + 0.12;
      s.q(e.u - b, e.u + b, 0.3, 3.9, t, t + 0.04, '#3e444a');
      for (let y = 0.5; y < 3.8; y += 0.34) s.q(e.u - b, e.u + b, y, y + 0.06, t + 0.04, t + 0.07, '#2b3035');
      s.q(e.u - 0.6, e.u + 0.6, 1.4, 2.6, t + 0.07, t + 0.1, '#ffffff');
      plakat(Z, s, 'GESCHLOSSEN', e.u, 2.0, t + 0.12, 0.35, '#c8102e', '#ffffff', 1.1);
      bauzaun(Z, s, e.u - b - 1.5, e.u + b + 1.5, (e.t ?? 0) + 2.6, { text: 'GESCHLOSSEN', fg: '#ffffff', bg: '#c8102e' });
    }
    const jahre = k.baujahr ? jahr - k.baujahr : null;
    // Hebebühne zuerst festlegen und ihren Bildbereich sperren (Ausleger steht vor der Fassade), Banner weichen ihr aus
    const kand = ['+z', '+x'].map((q) => k.seiten?.[q]?.abbau ? { s: seiten[q], ...k.seiten[q].abbau } : null).filter(Boolean);
    const ab = kand[0] ?? { s: rest['+z'] ? sz : sx, u: Z.nutz(rest['+z'] ? sz : sx) * 0.6, y: Math.max(EG + 2, k.hoehe - 2), t: tFront(k) };
    const mitBuehne = ab.u > 7 && ab.u < ab.s.L - 3;
    if (mitBuehne) sperre(Z, ab.s, ab.u - 5.5, ab.u + 2, 0, ab.y + 1.5, 'hebebuehne');
    for (const s of [sz, sx]) {
      if (!rest[s.seite]) continue;
      if (s === sz || !rest['+z']) fassadenBanner(Z, s, [{ text: 'GESCHLOSSEN', h: 2.6, fg: '#ffffff' }, { text: 'Diese Filiale ist dauerhaft geschlossen', h: 0.7, fg: '#ffb3a8' }], '#1d2125', { anteil: 0.86, zielH: GROSS, rahmen: '#c8102e', modus: 'mitte', fuellen: true, streifen: true, minSchrift: 0.6 });
      else fassadenBanner(Z, s, [{ text: jahre ? `DANKE FÜR ${jahre} JAHRE` : 'DANKE FÜR ALLES', h: 1.5, fg: '#1d2125' }, { text: 'Ihr Hartwig-Team', h: 0.7, fg: '#5c6670' }], '#ffffff', { anteil: 0.8, zielH: GROSS * 0.8, rahmen: '#1d2125', modus: 'mitte', fuellen: true, minSchrift: 0.6 });
    }
    // Hebebühne am Schriftzug
    if (mitBuehne) hebebuehne(Z, ab.s, ab.u, ab.y, ab.t ?? tFront(k));
  }

  // ---------- Leerstand
  if (hat('leer')) {
    // Schaufenster ganzflächig weiß abgeklebt (eindeutiges Signal gegenüber den dunklen Rollgittern von 'geschlossen')
    for (const f of fensterEG) seiten[f.seite].q(f.a, f.b, f.y0, f.y1, f.t + 0.06, f.t + 0.1, '#f6f3ea');
    for (const e of eingaenge) { const s = seiten[e.seite], b = (e.breite ?? 4) / 2, t = (e.t ?? 0) + 0.08; s.q(e.u - b, e.u + b, 0.3, 3.6, t, t + 0.04, '#f6f3ea'); }
    const ag = waehle(r, VERMIETER);
    const qm = k.flaecheQm ? Math.round(k.flaecheQm / 500) * 500 : Math.round((k.w * k.d * Math.max(1, n)) / 500) * 500;
    const qmT = String(qm).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const tel = `Tel. 0800 / ${String(100 + Math.floor(r() * 899))} ${String(10 + Math.floor(r() * 89))} ${String(10 + Math.floor(r() * 89))}`;
    for (const s of [sz, sx]) {
      if (!rest[s.seite]) continue;
      fassadenBanner(Z, s, [{ text: 'ZU VERMIETEN', h: 2.0, fg: '#ffffff' }, { text: `ca. ${qmT} m² · teilbar`, h: 0.8, fg: '#ffffff' }, { text: ag, h: 0.75, fg: '#ffd84a' }, { text: tel, h: 0.75, fg: '#ffffff' }], '#2a6b8f', { anteil: s === sz ? 0.55 : 0.7, rahmen: '#ffffff', zielH: GROSS * 0.95, modus: 'mitte', fuellen: true, minSchrift: 0.6 });
    }
  }

  // ---------- Leerstand + Verfall: wilde Plakate, Graffiti, Tauben, Pflanzen
  if (hat('leer') || hat('verfall')) {
    for (const f of fensterEG) {
      const s = seiten[f.seite];
      if (r() < 0.55) for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
        const u = zw(r, f.a + 0.4, f.b - 0.4), y = zw(r, f.y0 + 0.8, f.y1 - 0.6);
        s.kipp(0.7, 1.0, 0.03, u, y, f.t + 0.12 + i * 0.01, waehle(r, ['#e04b3a', '#f2c14e', '#3a7bd5', '#ffffff', '#4caf50', '#1d1d1d']), zw(r, -0.15, 0.15));
      }
    }
  }
  if (hat('verfall')) {
    const tags = ['WARUM?', 'HIER WAR MAL WAS', 'TSCHÜSS', 'ZK 26', 'NIE WIEDER', 'KAUFT LOKAL', 'EGAL'];
    const gfarb = ['#e04b3a', '#2f9be0', '#9a3fd0', '#3fbf5f', '#f2b705', '#ff5fa2', '#1d1d1d'];
    for (const s of [sz, sx]) {
      if (!rest[s.seite]) continue;
      const L = Math.min(Z.nutz(s), rest[s.seite][1] + 0.3);
      for (let i = 0; i < 4; i++) { const u = zw(r, 1, L - 5), w = zw(r, 2.5, 6); s.kipp(w, zw(r, 1.0, 1.8), 0.03, u + w / 2, zw(r, 1.2, 3.2), 0.3, waehle(r, gfarb), zw(r, -0.2, 0.2)); }
      for (let i = 0; i < 4; i++) plakat(Z, s, waehle(r, tags), zw(r, 3, L - 3), zw(r, 1.4, 3.6), 0.4 + i * 0.01, zw(r, 0.9, 1.4), waehle(r, gfarb), null, 8, zw(r, -0.15, 0.15));
      for (let i = 0; i < 4; i++) {
        const u = zw(r, 1, L - 2), h = zw(r, 3, Math.max(4, k.hoehe * 0.6)), y0 = r() < 0.5 ? 0.3 : k.hoehe - h;
        for (let y = y0; y < y0 + h; y += 0.9) s.q(u + zw(r, -0.6, 0.6) - 0.5, u + zw(r, -0.6, 0.6) + 0.5, y, y + 1.0, tFront(k), tFront(k) + 0.25, waehle(r, ['#5f9a56', '#4f8a4a', '#6fa860']));
      }
      for (let i = 0; i < 6; i++) { const [x, zz] = s.welt(zw(r, 1, L - 1), tFront(k) + 0.15); taube(S, x, k.hoehe + 0.3, zz, r); }
      for (let i = 0; i < 4; i++) { const [x, zz] = s.welt(zw(r, 1, L - 1), 2.5); taube(S, x, 0.3, zz, r); }
    }
    const dch = k.dach ?? { x0: k.x + 2, z0: k.z + 2, x1: k.x + k.w - 2, z1: k.z + k.d - 2, y: k.hoehe + 0.3 };
    for (let i = 0; i < 20; i++) pflanze(S, zw(r, dch.x0 + 1, dch.x1 - 1), dch.y, i < 9 ? dch.z1 - zw(r, 0.5, 3) : zw(r, dch.z0 + 1, dch.z1 - 1), zw(r, 1.0, 2.2), waehle(r, ['#6fa860', '#5f9a56', '#8bb36a', '#9aa85a']));
    for (let i = 0; i < 2; i++) {
      const bx = zw(r, dch.x0 + 3, dch.x1 - 3), bz = dch.z1 - zw(r, 2, 5);
      S.box(0.3, 4.5, 0.3, bx, dch.y + 2.25, bz, '#eeeeea');
      kugel(S, bx, dch.y + 5.2, bz, 2.3, '#8bb36a', 0);
    }
    const he = haupt(), s = seiten[he.seite];
    s.q(he.u - 3, he.u + 3, 1.0, 1.12, 2.4, 2.45, '#e04b3a');
    for (const du of [-3, 3]) s.q(he.u + du - 0.1, he.u + du + 0.1, 0.3, 1.2, 2.3, 2.5, '#f4f1ea');
  }

  // ---------- Neueröffnung
  if (hat('neueroeffnung')) {
    const he = haupt(), s = seiten[he.seite], u = he.u, t0 = (he.t ?? 0) + 0.2;
    s.q(u - 1.3, u + 1.3, 0.3, 0.34, t0, 5.4, '#c8102e');
    for (let t = t0 + 0.8; t < 5.2; t += 1.4) for (const du of [-1.7, 1.7]) { const [x, zz] = s.welt(u + du, t); zyl(S, x, 0.3, zz, 0.07, 1.0, '#d4a017', 6); }
    for (const du of [-1.7, 1.7]) s.q(u + du - 0.03, u + du + 0.03, 1.15, 1.22, t0 + 0.8, 5.0, '#c8102e');
    ballonbogen(Z, s, u, Math.min(5, t0 + 3.2), 7, 5.2, [ROT, '#ffffff', '#d4a017']);
    for (let i = -3; i <= 3; i++) { if (i === 0) continue; const [x, zz] = s.welt(u + i * 3.2, 4.6); fahne(Z, x, zz, i % 2 ? ROT : '#ffffff', 8.5, i % 2 ? '#ffffff' : ROT); }
    schlange(Z, s, u - 2.5, Math.max(1, u - 22), 1.7);
    schlange(Z, s, u + 3, Math.min(s.L - 1, u + 10), 1.7);
    fassadenBanner(Z, sz, [{ text: 'NEUERÖFFNUNG', h: 2.4, fg: ROT }, { text: 'Wir sind wieder da!', h: 1.0, fg: '#2b3a4a' }], '#ffffff', { anteil: 0.75, rahmen: '#d4a017', zielH: GROSS });
    fassadenBanner(Z, sx, [{ text: 'NEU', h: 2.6, fg: '#ffffff' }, { text: 'ab heute geöffnet', h: 0.9, fg: '#ffffff' }], ROT, { anteil: 0.45, rahmen: '#d4a017', zielH: GROSS * 0.75 });
    for (const s2 of [sz, sx]) { const L = Z.nutz(s2); bahnen(Z, s2, [L * 0.04 + 1.2, L * 0.96 - 1.2], 'NEU', ['#ffffff', ROT], [ROT, '#ffffff']); }
    const [bx, bz] = s.welt(u - 3, 3.6); ballons(Z, bx, bz, 4, [ROT, '#ffffff', '#d4a017'], 6);
    const [bx2, bz2] = s.welt(u + 3, 3.6); ballons(Z, bx2, bz2, 4, [ROT, '#ffffff', '#d4a017'], 6);
  }

  // ---------- Teilschließung: dunkle obere Etagen, Absperrband an der Grenze, Hinweisschilder
  if (hat('teilschliessung')) {
    const he = haupt(), s0 = seiten[he.seite];
    const offen = n >= 3 ? 'EG + 1. OG geöffnet' : 'Nur EG geöffnet';
    aufsteller(Z, s0, he.u - (he.breite ?? 4) / 2 - 1.2, 2.4, offen, '#ffffff', '#3b4248');
    if (n >= 2) {
      const yG = etagenY(k, tsAb);
      for (const s of [sz, sx]) {
        if (!rest[s.seite]) continue;
        const L = Z.nutz(s);
        for (const [a, b] of freieStuecke(Z, s, 0.2, L - 0.2, yG - 0.4, yG + 0.4, 0.05)) streifenband(Z, s, a, b, yG + 0.05, 0.55, (k.tBanner ?? tFront(k)) + 0.12);
        sperre(Z, s, 0.2, L - 0.2, yG - 0.3, yG + 0.4, 'band');
      }
      const txt = n >= 3 ? 'Ab sofort nur noch EG und 1. OG' : 'Ab sofort nur noch im EG';
      const zH = Math.min(GH * 1.4, 6.2, k.hoehe - yG - 1);
      fassadenBanner(Z, sz, [{ text: 'TEILSCHLIESSUNG', h: 1.7, fg: '#ffffff' }, { text: txt, h: 0.8, fg: '#ffd0c8' }], '#2b3035', { lo: yG + 0.5, y: yG + 0.6 + zH / 2, anteil: 0.75, zielH: zH, rahmen: '#c8102e', minSchrift: 0.55 });
      fassadenBanner(Z, sx, [{ text: 'OBERE ETAGEN GESCHLOSSEN', h: 1.4, fg: '#ffffff' }, { text: txt, h: 0.8, fg: '#ffd0c8' }], '#2b3035', { lo: yG + 0.5, y: yG + 0.6 + zH / 2, anteil: 0.8, zielH: zH, rahmen: '#c8102e', minSchrift: 0.55 });
    } else { // eingeschossig: hintere Hälfte der Schaufenster mit Folie zu, Schild auf dem Dach
      for (const f of fensterEG) {
        const s = seiten[f.seite];
        if (!(f.seite === '+x' ? (f.a + f.b) / 2 < Z.nutz(s) * 0.6 : (f.a + f.b) / 2 < Z.nutz(s) * 0.5)) continue;
        const m = (f.a + f.b) / 2, ym = (f.y0 + f.y1) / 2, l = Math.hypot(f.b - f.a, f.y1 - f.y0) * 0.92, w = Math.atan2(f.y1 - f.y0, f.b - f.a);
        s.q(f.a, f.b, f.y0, f.y1, f.t + 0.1, f.t + 0.14, '#f2f0ea');
        s.kipp(l, 0.35, 0.03, m, ym, f.t + 0.16, '#c8102e', w); s.kipp(l, 0.35, 0.03, m, ym, f.t + 0.19, '#c8102e', -w);
      }
      fassadenBanner(Z, sx, [{ text: 'TEILFLÄCHE GESCHLOSSEN', h: 1.1, fg: '#ffffff' }], '#3b4248', { anteil: 0.6, zielH: 2.4, rahmen: '#c8102e', minSchrift: 0.5 });
    }
  }

  // ---------- Marketingaktion
  if (st.aktion) {
    const a = st.aktion;
    // Rabatt der Engine-Aktion (st.rabatt in Prozent); ohne Angabe die bisherigen Werbewerte
    const rb = st.rabatt, pr = (x) => `-${rb ?? x} %`;
    const P = {
      sale: { bg: '#d8102e', fg: '#ffffff', z: [{ text: 'SALE', h: 3.4, fg: '#ffffff' }, { text: rb ? `jetzt ${pr(50)}` : 'bis zu -50 %', h: 1.1, fg: '#ffe066' }], x: [{ text: pr(50), h: 3.0, fg: '#ffffff' }], wimpel: ['#d8102e', '#ffffff'], ballon: ['#d8102e', '#ffffff'], fenster: rb ? [pr(50), 'SALE'] : ['-30 %', '-50 %', 'SALE'], stopper: 'SALE', bahn: 'SALE %' },
      jubilaeum: { bg: '#1f3f6b', fg: '#e8c25a', z: [{ text: k.baujahr ? `${jahr - k.baujahr} JAHRE HARTWIG` : 'JUBILÄUM', h: 2.2, fg: '#e8c25a' }, { text: 'Danke für Ihre Treue', h: 0.9, fg: '#ffffff' }], x: [{ text: 'JUBILÄUM', h: 1.9, fg: '#e8c25a' }, { text: k.baujahr ? `seit ${k.baujahr}` : 'seit jeher', h: 0.9, fg: '#ffffff' }], wimpel: ['#e8c25a', '#1f3f6b', ROT], ballon: ['#e8c25a', ROT, '#1f3f6b'], fenster: ['JUBILÄUM', pr(20)], stopper: 'Jubelpreise', bahn: 'JUBILÄUM' },
      weihnachten: { bg: '#1f5a3a', fg: '#ffffff', z: [{ text: 'WEIHNACHTSZAUBER', h: 2.0, fg: '#ffffff' }, { text: 'Geschenke für alle', h: 0.9, fg: '#f2d27a' }], x: [{ text: 'FROHES FEST', h: 1.8, fg: '#f2d27a' }], wimpel: ['#c8102e', '#f2d27a', '#1f5a3a'], ballon: null, fenster: ['GESCHENKE', '★'], stopper: 'Geschenkideen' },
      blackfriday: { bg: '#121212', fg: '#ffd400', z: [{ text: 'BLACK FRIDAY', h: 2.8, fg: '#ffffff' }, { text: rb ? `jetzt ${pr(60)}` : 'bis zu -60 %', h: 1.1, fg: '#ffd400' }], x: [{ text: pr(60), h: 3.0, fg: '#ffd400' }], wimpel: ['#121212', '#ffd400'], ballon: ['#121212', '#ffd400'], fenster: [pr(60), 'BLACK FRIDAY'], stopper: pr(60), bahn: 'BLACK FRIDAY' },
    }[a];
    fassadenBanner(Z, sz, P.z, P.bg, { anteil: 0.8, zielH: GROSS * 0.85, rahmen: '#ffffff' });
    fassadenBanner(Z, sx, P.x, P.bg, { anteil: 0.5, zielH: GROSS * 0.75, rahmen: '#ffffff' });
    if (P.bahn) for (const s2 of [sz, sx]) { const L = Z.nutz(s2); bahnen(Z, s2, [Math.min(2.2, L * 0.04) + 0.5, L - Math.min(2.2, L * 0.04) - 0.5], P.bahn, P.bg === '#121212' ? '#ffd400' : '#ffffff', P.bg); }
    for (const s of [sz, sx]) {
      if (!rest[s.seite]) continue;
      const L = Z.nutz(s), t = tFront(k) + 0.6;
      const yW = Math.min(k.hoehe - 0.4, EG + (n >= 2 ? GH * 0.9 : 1.2));
      const st2 = Math.max(2, Math.round(L / 11));
      for (let i = 0; i < st2; i++) wimpel(Z, s, L * i / st2, L * (i + 1) / st2, EG + 0.2, t + 0.6, P.wimpel, 0.9);
      if (n >= 2) for (let i = 0; i < st2; i++) { const ua = L * i / st2, ub = L * (i + 1) / st2; if (freieStuecke(Z, s, ua, ub, yW - 1.5, yW).some(([p, q]) => q - p > ub - ua - 0.1)) wimpel(Z, s, ua, ub, yW, t, P.wimpel, 1.4); }
    }
    for (const f of fensterEG) {
      const s = seiten[f.seite], txt = waehle(r, P.fenster);
      plakat(Z, s, txt, (f.a + f.b) / 2, f.y1 - 0.9, f.t + 0.12, 0.85, P.bg === '#121212' ? '#ffd400' : '#ffffff', P.bg, f.b - f.a - 0.4);
    }
    const he = haupt(), s = seiten[he.seite];
    aufsteller(Z, s, he.u - (he.breite ?? 4) / 2 - 1.4, 2.6, P.stopper, '#ffffff', P.bg);
    aufsteller(Z, sx, Z.nutz(sx) * 0.3, 2.6, P.stopper, '#ffffff', P.bg);
    // Beachflags nur vor Fassadenstücken ohne Banner und Schrift (sie verdecken im Bild die Fassade bis etwa 9 m Höhe)
    for (const s2 of [sz, sx]) {
      const L = Z.nutz(s2), frei = (u) => freieStuecke(Z, s2, u - 2.2, u + 2.2, 0.3, 9.5, 0).some(([p0, p1]) => p0 <= u - 2.2 + 1e-6 && p1 >= u + 2.2 - 1e-6);
      const us = [0.12, 0.88, 0.05, 0.95, 0.3, 0.7, 0.5].map((f) => L * f).filter(frei).slice(0, 2);
      for (const u of us) { const [x, zz] = s2.welt(u, 4.4); beachflag(Z, x, zz, P.bg, 4.8, a === 'blackfriday' ? '#ffd400' : '#ffffff'); }
    }
    if (P.ballon) for (const du of [-(he.breite ?? 4) / 2 - 0.6, (he.breite ?? 4) / 2 + 0.6]) { const [x, zz] = s.welt(he.u + du, (he.t ?? 0) + 1.4); ballons(Z, x, zz, 4.2, P.ballon, 7); }
    if (a === 'weihnachten') {
      const [x, zz] = s.welt(he.u + (he.breite ?? 4) / 2 + 3.4, 3.4);
      for (let i = 0; i < 3; i++) { const g = new THREE.ConeGeometry(2.4 - i * 0.6, 2.6, 8); g.translate(x, 1.6 + i * 1.6, zz); S.add(g, '#2f7a45'); }
      kugel(S, x, 6.8, zz, 0.45, '#f2d27a');
      for (let i = 0; i < 10; i++) kugel(S, x + zw(r, -1.6, 1.6) * (1 - i / 14), 1.4 + i * 0.5, zz + zw(r, -1.6, 1.6) * (1 - i / 14), 0.18, i % 2 ? '#c8102e' : '#f2d27a');
      for (const s2 of [sz, sx]) { const L = Z.nutz(s2); for (let u = 0.5; u < L; u += 1.0) s2.q(u - 0.1, u + 0.1, k.hoehe - 0.3 - 0.35 * Math.sin(u * 0.7) ** 2, k.hoehe - 0.1 - 0.35 * Math.sin(u * 0.7) ** 2, tFront(k) + 0.1, tFront(k) + 0.3, '#ffe58a'); }
      for (let i = 0; i < 4; i++) { const [gx, gz] = s.welt(he.u - (he.breite ?? 4) / 2 - 2.6 - i * 1.1, 1.6); const g = 0.6 + r() * 0.4; S.box(g, g, g, gx, 0.3 + g / 2, gz, i % 2 ? '#c8102e' : '#f2d27a'); }
    }
    if (a === 'blackfriday') menge(Z, s, he.u, 3.0, 24, 6, 2.6, { tMin: (he.t ?? 0) + 0.8 });
  }

  // ---------- Passanten im Normalbetrieb
  const belebt = !hat('geschlossen') && !hat('leer') && !hat('verfall') && !hat('abriss') && !hat('raeumung');
  if (belebt && Z.leute) {
    for (const e of eingaenge) {
      const s = seiten[e.seite];
      menge(Z, s, e.u, (e.t ?? 0) + 2.3, e.haupt ? 7 : 4, 3.5, 1.6, { tMin: (e.t ?? 0) + 0.8 });
    }
    for (const s of [sz, sx]) for (let i = 0; i < 4; i++) { const [x, zz] = s.welt(zw(r, 1, s.L - 1), zw(r, 2.5, 4.8)); figur(S, x, zz, r); }
  }
  return { hoehe: Z.top, teile: S.anzahl - start };
}
