// Etage eines Hartwig-Sporthauses als aufgeschnittenes Puppenhaus (Rückwände -x/-z stehen, Front +x/+z offen).
// Eigene Innenlogik je Außenfamilie aus sporthaus.js (familieSport), Maße wie der Außenbau (masseSport bw × bd):
//   1 Glas-Kubus:      offene Fläche, Glasfront mit roter Eckfinne, Kletterwand im Luftraum über zwei Geschosse
//                      (eingeschossig: Radwand), kompakte Rolltreppe, Laufband-Teststrecke hinter der Glasfront.
//   2 Geschäftshaus:   kompakt, Treppenhaus und offene Treppe, blaue Ladenfront mit Schaufenstern, OG Brüstungsbänder.
//   3 Fachmarkt-Box:   eine Halle mit Regalgassen (Schwerlastregale für Rad und Outdoor), Kassenzone mit Wagen am Eingang,
//                      Werkstatt (Rad- und Skiservice) und Lager an der Rückwand, Parkplatz vor der Front.
//   4 Mall-Front:      Ladenlokal mit Glasfront zur Mall-Passage (Center), OG zur Galerie mit Luftraum.
//   5 Outdoor-Flagship: Holz und Stein, Zelt- und Kanuinszenierung hinter dem Portalfenster, Kletterturm, Holztreppe.
//   6 Postmoderne 90er: Zylinderecke innen als Rundbühne.
// Center-Häuser (lage 'center') liegen immer an der Mall-Passage, auch als Großfläche (Familie 3).
// Abteilungen aus sportabteilung.js über flaeche() bzw. Regalgassen (gassen()).
import { THREE, rng, zw, waehle, Sammler, dunkler, heller, baum } from './basis.js';
import {
  RASTER, WANDHOEHE, GLAS, vorbereiten, lokal, rueckwand, stuetze, rolltreppe, aufzug, treppenhaus, lager, haengeschild,
  wandschild, figur, boden, puppe,
} from './innen.js';
import * as I from './innen.js';
import { flaeche, fremdflaeche, abteilungsArt } from './abteilung.js';
import * as SA from './sportabteilung.js';
import { familieSport, masseSport, sportGefuehl, HS_ROT, HS_BLAU } from './sporthaus.js';
import { westAuto } from './westbauten.js';

const R = RASTER, WH = WANDHOEHE, PI = Math.PI;
const HUB = 4.2 + 0.4; // Geschosshöhe innen (wie WANDHOEHE)
const PRIO = { sportschuhe: 0, sporttextil: 1, wintersport: 2, outdoor: 3, teamsport: 4, rad: 5 };
const F2PAL = [['#c9b79c', '#6b4a33'], ['#e07b39', '#3a3a3a'], ['#d9d4c7', '#8a6a3a'], ['#9fb4a5', '#3f4a4f'], ['#b9bec2', '#2f3b46'], ['#e2c35a', '#4a3b2a'], ['#c97f5f', '#40352d'], ['#d6cfbf', '#55524c']];
const F6AKZ = ['#2f7f86', HS_ROT, '#2f6f8f', '#5c8f6a', '#2f7f86', '#8c5a8f', '#2f6f8f', '#c9883a'];
const STIL = {
  1: { wand: '#eceff1', pilaster: '#dfe3e6', gang: { a: '#e3e6e8', b: '#d3d7da', m: 'fliese' }, stuetze: '#e6e9eb' },
  2: { wand: '#ece4d8', pilaster: '#ddd2c2', gang: { a: '#efebe4', b: '#e2ddd3', m: 'fliese' }, stuetze: '#e6e0d6' },
  3: { wand: '#dfe3e6', pilaster: '#b9c0c6', gang: { a: '#cdd0d2', b: '#c1c4c6', m: 'fliese' }, stuetze: '#2f5f8a' },
  4: { wand: '#ece8e1', pilaster: '#ddd8cf', gang: { a: '#f2f1ee', b: '#e3e1dc', m: 'fliese' }, stuetze: '#e9e6e0' },
  5: { wand: '#bdb5a7', pilaster: '#7b5a40', gang: { a: '#cdb48d', b: '#c2a880', m: 'dielen' }, stuetze: '#8a6a4a' },
  6: { wand: '#efe8dc', pilaster: '#dccfbb', gang: { a: '#ece6db', b: '#ddd5c7', c: '#c9bba5', m: 'platten' }, stuetze: '#e8e0d2' },
};
const NAME_ETAGE = (e) => (e === 0 ? 'EG' : `${e}. OG`);

/** Reserviert in großen 1a-Häusern eine sichtbare Erlebniszone, ohne Wege zu blockieren. */
function rasterGefuehl(ra, haus, e, o = {}) {
  const g = sportGefuehl(haus, o.zustand ?? o);
  ra.abverkauf = e > 0 && e === g.obereEtage && g.abverkauf;
  ra.erlebnis = e === 0 ? g.erlebnis : null;
  if (!ra.erlebnis || ra.nx < 5 || ra.nz < 3) return ra;
  const gueltig = new Set([null, 'lauf', 'aktion']);
  const kandidaten = [];
  for (let i = 1; i < ra.nx - 2; i++)
    if (gueltig.has(ra.typ[i][ra.nz - 1]) && gueltig.has(ra.typ[i + 1][ra.nz - 1])) kandidaten.push(i);
  if (!kandidaten.length) { ra.erlebnis = null; return ra; }
  const ziel = ra.gx + (ra.gx < ra.nx / 2 ? 3 : -4);
  const i = kandidaten.sort((a, b) => Math.abs(a - ziel) - Math.abs(b - ziel))[0];
  ra.typ[i][ra.nz - 1] = 'erlebnis';
  ra.typ[i + 1][ra.nz - 1] = 'erlebnis';
  ra.erlebnisZelle = [i, ra.nz - 1];
  return ra;
}

// ================================================================ Raster
/** Grundriss: Belegung im 5-m-Raster mit Gängen, Sonderzonen und Nebenräumen, dazu Blöcke für die Abteilungen. */
export function sportRaster(haus, e, o = {}) {
  const fam = familieSport(haus);
  const m = masseSport(haus, fam);
  const B = m.bw, T = m.bd, nx = B / R, nz = T / R;
  const v = ((haus.fassade ?? 0) % 8 + 8) % 8;
  const mall = haus.lage === 'center';
  const n = haus.etagen.filter((x) => x >= 0).length;
  const oben = haus.etagen.includes(e + 1), unten = haus.etagen.includes(e - 1);
  const typ = Array.from({ length: nx }, () => Array(nz).fill(null));
  const ok = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz;
  const setz = (i, j, t) => { if (ok(i, j) && !typ[i][j]) typ[i][j] = t; };
  const frei = (i, j) => ok(i, j) && !typ[i][j];
  const box = fam === 3;
  const ra = { fam, v, mall, B, T, nx, nz, n, oben, unten, typ, box, eg: e === 0, e, sonder: [] };
  const rtTyp = fam === 2 ? 'treppe_offen' : fam === 5 ? 'treppe_holz' : 'rt';
  if (box) {
    const gx = Math.max(2, Math.min(nx - 4, Math.round(nx * 0.58)));
    ra.gx = gx; ra.gz = nz - 2;
    for (let i = 0; i < nx; i++) typ[i][nz - 2] = 'gang';
    ra.gangReihen = [nz - 2];
    if (nz >= 10) { const jm = Math.floor((nz - 2) / 2); for (let i = 0; i < nx; i++) typ[i][jm] = 'gang'; ra.gangReihen.push(jm); }
    // Rückwand: Treppenhaus, Lager, Werkstatt
    if (nz >= 4 && (n >= 2 || nx >= 10)) { setz(0, 0, 'treppe'); setz(0, 1, 'treppe2'); }
    const wk = e === 0 && nx >= 8;
    for (let i = 1; i < nx - (wk ? 3 : 1); i++) setz(i, 0, 'lager');
    if (wk) { setz(nx - 3, 0, 'werkstatt'); setz(nx - 2, 0, 'werkstatt2'); }
    setz(nx - 1, 0, 'wc');
    if (e === 0) {
      setz(gx, nz - 1, 'eingang');
      setz(gx - 1, nz - 1, 'kasse'); if (nx >= 12) setz(gx - 2, nz - 1, 'kasse');
      setz(gx + 1, nz - 1, 'wagen');
      if (nx >= 12) setz(gx + 2, nz - 1, 'aktion');
    }
    if (n >= 2 && (oben || unten)) { const i0 = Math.max(1, gx - 3); if (frei(i0, nz - 3) && frei(i0 + 1, nz - 3)) { typ[i0][nz - 3] = rtTyp; typ[i0 + 1][nz - 3] = rtTyp + '2'; ra.rt = [i0, nz - 3]; } }
    // Blöcke: Hallenstreifen zwischen den Gängen, rechts vom Eingang zuerst
    const reihen = [...ra.gangReihen].sort((a, b) => a - b);
    const bereiche = []; let j0 = 1;
    for (const g of reihen) { if (g > j0) bereiche.push([j0, g]); j0 = g + 1; }
    if (nz - 1 > j0 - 1) bereiche.push([nz - 1, nz]);
    ra.bloecke = [];
    for (const [a, b] of bereiche.reverse()) { ra.bloecke.push([gx, nx, a, b, 1]); ra.bloecke.push([0, gx, a, b, -1]); }
    return rasterGefuehl(ra, haus, e, o);
  }
  // ---- offene Grundrisse
  const gx = fam === 4 ? Math.max(1, Math.min(nx - 2, Math.round(nx * 0.42))) : fam === 1 ? Math.max(1, Math.min(nx - 3, Math.round(nx * 0.6))) : Math.max(1, Math.min(nx - 3, Math.round(nx * 0.52)));
  const gz = nz >= 6 ? Math.floor(nz * 0.45) : -1;
  ra.gx = gx; ra.gz = gz;
  if (gz >= 0) for (let i = 0; i < nx; i++) setz(i, gz, 'gang');
  for (let j = gz + 1; j < nz; j++) setz(gx, j, 'gang');
  // Sonderzonen
  if (fam === 6 && nx >= 5 && nz >= 4) { ra.zylR = Math.max(4, Math.min(7, Math.min(B, T) * 0.2)); for (const [i, j] of [[nx - 1, nz - 1], [nx - 2, nz - 1], [nx - 1, nz - 2], [nx - 2, nz - 2]]) if (ok(i, j) && typ[i][j] !== 'gang') typ[i][j] = 'buehne'; ra.sonder.push('buehne'); }
  if (fam === 1 && n >= 2 && nx >= 8 && nz >= 5) { const i0 = nx - 3; for (const [i, j] of [[i0, 0], [i0 + 1, 0], [i0, 1], [i0 + 1, 1]]) typ[i][j] = 'luft'; ra.luft = [i0, 0]; }
  if (fam === 1 && n === 1 && nx >= 8) { const i0 = nx - 4; typ[i0][0] = 'radbuehne'; typ[i0 + 1][0] = 'radbuehne2'; ra.radbuehne = [i0, 0]; }
  if (fam === 1 && e === 0 && nz >= 5 && nx >= 7) {
    // Teststrecke hinter der Glasfront rechts vom Eingang (sonst links)
    const rechts = nx - 2 - gx >= 3;
    const is = rechts ? [gx + 1, gx + 2, gx + 3, gx + 4].filter((i) => i < nx - 1) : [gx - 1, gx - 2, gx - 3].filter((i) => i >= 0);
    if (is.length >= 3) { for (const i of is) typ[i][nz - 1] = 'lauf'; ra.lauf = [Math.min(...is), Math.max(...is) + 1]; }
  }
  if (fam === 5 && e === 0 && nz >= 6 && gx >= 3) { for (let i = Math.max(0, gx - 3); i < gx; i++) for (const j of [nz - 2, nz - 1]) if (frei(i, j)) typ[i][j] = 'szene'; ra.szene = true; }
  if (fam === 5 && e === 0 && gz >= 2) { setz(nx - 2, gz - 1, 'turm'); }
  // Nebenräume an der Rückwand
  if (nz >= 4 && (n >= 2 || nx >= 9)) { setz(0, 0, 'treppe'); setz(0, 1, 'treppe2'); }
  const lw = Math.max(1, Math.min(3, Math.round(nx * 0.15)));
  for (let i = 1; i <= lw; i++) setz(i, 0, 'lager');
  if (nx >= 12 && nz >= 4) { setz(nx - 1, 0, 'treppe'); setz(nx - 1, 1, 'treppe2'); }
  if (nx >= 9) setz(lw + 1, 0, 'wc');
  if (n >= 2 && nz >= 4) setz(0, 2, 'aufzug');
  // Treppe bzw. Rolltreppe zwischen den Geschossen (keine Lichthofhalle)
  if (n >= 2) {
    const kand = gz >= 1 ? [[gx - 2, gz - 1], [gx + 1, gz - 1], [gx - 2, gz + 1], [gx + 1, gz + 1]] : [[gx + 1, 0], [gx - 2, 0], [gx + 1, 1], [gx - 2, 1]];
    for (const [i, j] of kand) if (frei(i, j) && frei(i + 1, j)) { typ[i][j] = rtTyp; typ[i + 1][j] = rtTyp + '2'; ra.rt = [i, j]; break; }
  }
  ra.bloecke = gz >= 0
    ? [[gx + 1, nx, gz + 1, nz, 1], [gx, nx, 0, gz, -1], [0, gx, 0, gz, -1], [0, gx, gz + 1, nz, 1]]
    : [[gx + 1, nx, 0, nz, 1], [0, gx, 0, nz, -1]];
  // Nebengänge in breiten Blöcken
  for (const [a, b, c, d] of ra.bloecke) {
    const w = b - a;
    if (w < 7 || w * (d - c) < 20) continue;
    const k = Math.round(w / 4.5);
    for (let q = 1; q < k; q++) { const i = a + Math.round((q * w) / k); for (let j = c; j < d; j++) setz(i, j, 'neben'); }
  }
  return rasterGefuehl(ra, haus, e, o);
}

/** Abteilungen als Spurenbündel im Umlauf ab dem Eingang, Größe nach m² (wie Warenhaus). */
export function sportZonen(haus, e, ra) {
  const { nx, nz, typ } = ra;
  let fl = haus.flaechen.filter((f) => f.etage === e && f.qm >= 10).map((f) => ({ ...f, art: abteilungsArt(f) }));
  fl.sort((a, b) => (PRIO[a.art] ?? 9) - (PRIO[b.art] ?? 9));
  const vergeben = Array.from({ length: nx }, () => Array(nz).fill(false));
  const spuren = [];
  for (const [a, b, c, d, dir] of ra.bloecke) {
    const is = []; for (let i = a; i < b; i++) is.push(i);
    if (dir < 0) is.reverse();
    for (const i of is) {
      const zellen = [];
      for (let j = c; j < d; j++) if (i >= 0 && i < nx && !typ[i][j] && !vergeben[i][j]) { zellen.push({ i, j }); vergeben[i][j] = true; }
      if (zellen.length) spuren.push(zellen);
    }
  }
  const gesamt = spuren.reduce((s, z) => s + z.length, 0);
  if (!fl.length || !gesamt) return [];
  const mittel = gesamt / Math.max(1, spuren.length);
  for (;;) {
    const summe = fl.reduce((s, f) => s + f.qm, 0);
    const klein = fl.filter((f) => (f.qm / summe) * gesamt < Math.min(1.5, mittel * 0.5));
    if (!klein.length || fl.length <= 1) break;
    fl = fl.filter((f) => f !== klein[0]);
  }
  while (spuren.length < fl.length) {
    const k = spuren.reduce((b, s, q) => (s.length > spuren[b].length ? q : b), 0);
    const s = spuren[k]; if (s.length < 2) break;
    const h = Math.ceil(s.length / 2);
    spuren.splice(k, 1, s.slice(0, h), s.slice(h));
  }
  fl = fl.slice(0, spuren.length);
  const summe = fl.reduce((s, f) => s + f.qm, 0) || 1;
  const zz = [];
  let li = 0, kum = 0, ziel = 0;
  fl.forEach((f, k) => {
    ziel += (f.qm / summe) * gesamt;
    const rest = fl.length - k - 1;
    const zellen = [];
    if (k === fl.length - 1) { while (li < spuren.length) { zellen.push(...spuren[li]); kum += spuren[li].length; li++; } }
    else do { zellen.push(...spuren[li]); kum += spuren[li].length; li++; } while (li < spuren.length - rest && kum + spuren[li].length / 2 <= ziel);
    zz.push({ flaeche: f, art: f.art, zellen });
  });
  return zz;
}

// ================================================================ Etage
/**
 * Baut Etage etageNr eines Sporthauses. o wie etage() in grundriss.js: { ausschnitt, budget (20000 bzw. 8000), dichte, kunden }.
 */
export function sportEtage(S, scene, haus, etageNr, o = {}) {
  vorbereiten(S, scene);
  const ra = sportRaster(haus, etageNr, o);
  const zn = sportZonen(haus, etageNr, ra);
  const { B, T, nx, nz } = ra;
  let ax0 = 0, az0 = 0, ax1 = B, az1 = T;
  if (o.ausschnitt) {
    const a = o.ausschnitt === true ? {} : o.ausschnitt;
    const w = Math.min(B, a.w ?? 30), d = Math.min(T, a.d ?? 25);
    const anker = a.anker ?? 'eingang';
    const vx = anker === 'ecke' || ra.zylR ? B - w : ra.szene ? (ra.gx - 3) * R : ra.gx * R - 10;
    ax0 = Math.max(0, Math.min(B - w, Math.round((a.x ?? vx) / R) * R));
    az0 = Math.max(0, Math.min(T - d, Math.round((a.z ?? T - d) / R) * R));
    ax1 = ax0 + w; az1 = az0 + d;
  }
  const drin = (i, j) => i * R >= ax0 && (i + 1) * R <= ax1 && j * R >= az0 && (j + 1) * R <= az1;
  const budget = o.budget ?? (o.ausschnitt ? 8000 : 20000);
  const k = haus.kpi ?? {};
  const zellenImBild = zn.reduce((s, z) => s + z.zellen.filter((c) => drin(c.i, c.j)).length, 0);
  const jeZelle = Math.max(0.4, Math.min(1.6, (k.umsatz ?? 60000) / 700 / Math.max(1, zn.reduce((s, z) => s + z.zellen.length, 0))));
  let kunden = o.kunden ?? Math.round(jeZelle * (zellenImBild + 3) * (etageNr === 0 ? 0.75 : 0.65));
  let d = o.dichte ?? 1;
  let tmp, gruppe, versuch = 0, kk;
  for (;;) {
    tmp = new Sammler(); gruppe = new THREE.Group(); tmp.szene = gruppe; vorbereiten(tmp, gruppe);
    kk = { ax0, az0, ax1, az1, drin, d, kunden, o };
    bauen(tmp, gruppe, haus, etageNr, ra, zn, kk);
    if (tmp.anzahl <= budget || versuch > 8) break;
    versuch++;
    const f = Math.max(0.5, Math.min(0.92, (budget * 0.97) / tmp.anzahl));
    if (d > 0.3) d = Math.max(0.3, d * f); else kunden = Math.floor(kunden * 0.75);
    gruppe.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  }
  for (const [kz, gs] of tmp.teile) { if (!S.teile.has(kz)) S.teile.set(kz, []); S.teile.get(kz).push(...gs); }
  S.anzahl += tmp.anzahl;
  while (gruppe.children.length) scene.add(gruppe.children[0]);
  const eg = etageNr === 0;
  const aussen = eg ? (ra.mall ? 9.5 : ra.box ? 19 : 7) : ra.mall ? 9.5 : 0.4;
  const box = new THREE.Box3(new THREE.Vector3(ax0 - (ra.mall && eg && ax0 === 0 ? 7.6 : 0.6), eg ? -0.3 : ra.mall ? -4.8 : -2.2, az0 - (ra.mall && eg && az0 === 0 ? 7.6 : 0.6)), new THREE.Vector3(ax1 + (ra.mall ? 9.5 : eg ? 7 : 0.4), WH + (ra.hochpunkt ?? 0), az1 + aussen));
  return { box, breite: B, tiefe: T, zonen: zn, anzahl: tmp.anzahl, dichte: d, kunden, leer: kk.leer, familie: ra.fam };
}

function bauen(S, scene, haus, e, ra, zn, k) {
  const { B, T, nx, nz, typ, fam } = ra;
  const { ax0, az0, ax1, az1, drin, d } = k;
  const hid = (haus.id ?? 'S').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const r = rng(hid + e * 101);
  const eg = e === 0;
  const stil = STIL[fam];
  const zoneVon = Array.from({ length: nx }, () => Array(nz).fill(-1));
  zn.forEach((z, zi) => z.zellen.forEach((c) => (zoneVon[c.i][c.j] = zi)));
  const sicht = (x, z) => x >= ax0 - 0.01 && x <= ax1 + 0.01 && z >= az0 - 0.01 && z <= az1 + 0.01;
  const frei = [], belegt = [];
  ra.belegt = belegt; ra.ausschnitt = [ax0, az0, ax1, az1]; ra.drin = drin;
  ra.artAn = (i, j) => { const q = zoneVon[i]?.[j]; return q >= 0 ? zn[q].art : null; };
  ra.hochpunkt = 0;
  const ctx = { S, scene, r, d, zaehler: { wand: 0, insel: 0 }, basisSeed: hid % 7 };

  // ---- Bodenplatte mit Aussparungen (Rolltreppe von unten, Luftraum)
  const loecher = [];
  if (ra.rt && ra.unten) { const [i, j] = ra.rt; loecher.push([i * R + 0.8, j * R + 2.5, i * R + 9.4, j * R + 4.7]); }
  if (ra.luft && ra.unten) { const [i, j] = ra.luft; loecher.push([i * R + 0.3, j * R + 1.0, i * R + 9.7, j * R + 9.7]); }
  platte(S, ax0, az0, ax1, az1, loecher);
  if (!eg) unterkante(S, ax0, az0, ax1, az1, ra, haus);

  // ---- Abteilungen
  const kante = (i, j, di, dj) => {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0) return 'wand';
    if (ni >= nx || nj >= nz) return 'front';
    const t = typ[ni][nj];
    const offen = ['gang', 'neben', 'lauf', 'erlebnis', 'luft', 'buehne', 'szene', 'turm', 'rt', 'rt2', 'treppe_offen', 'treppe_offen2', 'treppe_holz', 'treppe_holz2', 'kasse', 'wagen', 'eingang', 'aktion', 'radbuehne', 'radbuehne2'];
    if (offen.includes(t)) return (di < 0 || dj < 0) && !drin(ni, nj) ? 'wand' : 'gang';
    if (t) return 'wand';
    if ((di < 0 || dj < 0) && !drin(ni, nj)) return 'wand';
    return 'nachbar';
  };
  const egFront = eg && [2, 3, 5, 6].includes(fam) && !ra.mall;
  zn.forEach((z, zi) => {
    if (!z.zellen.some((c) => drin(c.i, c.j))) return;
    const f = z.flaeche, art = z.art;
    const Z = { alle: z.zellen.filter((c) => drin(c.i, c.j)), kante, sicht, y: 0, bereich: [ax0, az0, ax1, az1] };
    const opt = { seed: hid % 1000 + zi * 37 + e * 11 + 1, dichte: d, eg: egFront, basis: f.gruppe };
    let res;
    if (ra.abverkauf && !['leer', 'umbau', 'konzession', 'untermiete'].includes(art)) {
      // Im obersten OG tritt Abverkaufsware an die Stelle der Markeninszenierung.
      const zellen = z.zellen.filter((c) => drin(c.i, c.j));
      zellen.forEach(({ i, j }, k0) => {
        const L = lokal(S, i * R + R / 2, 0, j * R + R / 2, 0);
        SA.sportAbverkauf(L, r, d, i + j + k0);
        if (scene && k0 % 5 === 0) haengeschild(S, scene, 'REDUZIERT', i * R + R / 2, 3.5, j * R + R / 2, { farbe: '#c52f35', hoehe: 0.55 });
        if (k0 % 2 === 0) frei.push([i * R + 0.65, j * R + 4.3]);
        belegt.push([i * R + 0.9, j * R + 0.8, i * R + 4.1, j * R + 3.6]);
      });
      return;
    }
    if (art === 'konzession' || art === 'untermiete') res = fremdflaeche(S, scene, art, Z, { ...opt, mieter: f.mieter ?? 'fitness', marke: I.MARKEN[2], seed: hid + zi });
    else if (ra.box && GASSE[art]) res = gassen(S, scene, art, Z, { ...opt, ra });
    else res = flaeche(S, scene, art, Z, opt);
    if (!['leer', 'umbau'].includes(art)) frei.push(...res.frei);
    belegt.push(...res.belegt);
  });

  // ---- Infrastruktur und Sonderzonen
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (!drin(i, j)) continue;
    const t = typ[i][j], x = i * R, z = j * R, sd = (i * 131 + j * 17 + e * 7 + 1) * 3, rr = rng(sd);
    const zu = (x0, z0, x1, z1) => belegt.push([x0, z0, x1, z1]);
    switch (t) {
      case 'gang': gangZelle(S, scene, i, j, ra, d, frei, rr, stil); break;
      case 'neben': nebenZelle(S, scene, i, j, ra, d, frei, rr, stil); break;
      case 'treppe': if (drin(i, j + 1)) treppenhaus(S, x, z, R, 2 * R, 0, WH, { wandNX: i > 0, wandNZ: j > 0 }); else boden(S, x, z, R, R, 0, 'lager', d); zu(x, z, x + R, z + R); break;
      case 'treppe2': if (!drin(i, j - 1)) boden(S, x, z, R, R, 0, stil.gang, d); zu(x, z, x + R, z + R); break;
      case 'lager': if (i === 0 || !drin(i - 1, j) || typ[i - 1][j] !== 'lager') { let w = 1; while (i + w < nx && typ[i + w][j] === 'lager' && drin(i + w, j)) w++; lager(S, x, z, w * R, R, 0, sd, WH, d); } zu(x, z, x + R, z + R); break;
      case 'wc': nebenraum(S, scene, x, z, d, stil); frei.push([x + 2.5, z + 4.3]); zu(x, z, x + R, z + 3); break;
      case 'aufzug': boden(S, x, z, R, R, 0, stil.gang, d); aufzug(S, x + 1.2, z + 0.6); zu(x + 1, z + 0.4, x + 4, z + 3.4); frei.push([x + 2.5, z + 4.3]); break;
      case 'rt': case 'treppe_offen': case 'treppe_holz': if (drin(i + 1, j)) verbindung(S, scene, x, z, t, ra, d, rr, frei); else boden(S, x, z, R, R, 0, stil.gang, d); zu(x, z, x + 2 * R, z + R); break;
      case 'rt2': case 'treppe_offen2': case 'treppe_holz2': if (!drin(i - 1, j)) boden(S, x, z, R, R, 0, stil.gang, d); break;
      case 'luft': if (ra.luft[0] === i && ra.luft[1] === j && drin(i + 1, j + 1)) kletterwand(S, scene, x, z, ra, d, rr, frei); else if (!(drin(ra.luft[0], ra.luft[1]) && drin(ra.luft[0] + 1, ra.luft[1] + 1))) boden(S, x, z, R, R, 0, stil.gang, d); zu(x, z, x + R, z + R); break;
      case 'radbuehne': if (drin(i + 1, j)) radbuehne(S, scene, x, z, d, rr, frei, ctx); zu(x, z, x + 2 * R, z + R); break;
      case 'radbuehne2': if (!drin(i - 1, j)) boden(S, x, z, R, R, 0, stil.gang, d); break;
      case 'lauf': teststrecke(S, scene, i, j, ra, d, rr, frei); break;
      case 'erlebnis': {
        boden(S, x, z, R, R, 0, stil.gang, d);
        if (ra.erlebnisZelle?.[0] === i && ra.erlebnisZelle?.[1] === j) {
          const L = lokal(S, x + R / 2, 0.06, z + R / 2, 0);
          SA.sportErlebnis(L, rr, d, ra.erlebnis, { S, scene, r: rr, d, basisSeed: hid % 7, zaehler: { wand: 0, insel: 0 } });
        }
        zu(x + 0.5, z + 0.5, x + R - 0.5, z + R - 0.5);
        break;
      }
      case 'buehne': break;
      case 'szene': break;
      case 'turm': kletterturm(S, scene, x, z, ra, d, rr, frei); zu(x, z, x + R, z + R); break;
      case 'kasse': kassenZelle(S, scene, x, z, d, rr, frei, i === ra.gx - 1); zu(x, z + 0.5, x + R, z + 4.5); break;
      case 'wagen': wagenZelle(S, scene, x, z, d, rr, frei); zu(x, z + 0.5, x + R, z + 4.5); break;
      case 'eingang': boden(S, x, z, R, R, 0, stil.gang, d); for (const s of [0.9, 4.1]) { S.box(0.25, 1.1, 0.25, x + s, 0.6, z + 3.2, '#c9d2d8'); } for (let q = 0; q < 4; q++) frei.push([x + zw(rr, 1.5, 3.5), z + zw(rr, 0.5, 4.5)]); break;
      case 'aktion': aktionsZelle(S, scene, x, z, d, rr, frei); zu(x + 0.5, z + 0.8, x + 4.5, z + 4.2); break;
      case 'werkstatt': werkstattZelle(S, scene, x, z, d, rr, frei, ctx, 'rad'); zu(x, z, x + R, z + R); break;
      case 'werkstatt2': werkstattZelle(S, scene, x, z, d, rr, frei, ctx, 'ski'); zu(x, z, x + R, z + R); break;
    }
  }
  if (ra.sonder.includes('buehne')) rundbuehne(S, scene, ra, d, r, frei, drin);
  if (ra.szene) inszenierung(S, scene, ra, d, r, frei, drin);

  // ---- Stützen im 10-m-Raster
  const ohne = new Set(['lager', 'treppe', 'treppe2', 'aufzug', 'wc', 'luft', 'rt', 'rt2', 'treppe_offen', 'treppe_offen2', 'treppe_holz', 'treppe_holz2', 'lauf', 'buehne', 'szene', 'turm', 'werkstatt', 'werkstatt2', 'radbuehne', 'radbuehne2', 'kasse', 'wagen']);
  for (let i = 2; i < nx; i += 2) for (let j = 2; j < nz; j += 2) {
    const x = i * R, z = j * R;
    if (x < ax0 + 1 || x > ax1 - 1 || z < az0 + 1 || z > az1 - 1) continue;
    const um = [typ[i - 1]?.[j - 1], typ[i]?.[j - 1], typ[i - 1]?.[j], typ[i]?.[j]];
    if (um.some((t) => ohne.has(t))) continue;
    if (belegt.some((b) => x > b[0] - 0.45 && x < b[2] + 0.45 && z > b[1] - 0.45 && z < b[3] + 0.45)) continue;
    stuetze(S, x, z, 0, WH, stil.stuetze);
  }

  // ---- Rückwände und Firmenschild
  rueckwand(S, 'x', ax0, ax1, az0, 0, WH, { pilasterVersatz: 0, putz: stil.wand, pilaster: stil.pilaster });
  rueckwand(S, 'z', az0, az1, ax0, 0, WH, { pilasterVersatz: 0, putz: heller(stil.wand, 0.02), pilaster: stil.pilaster });
  if (scene && az0 === 0 && ax1 - ax0 > 14) {
    const lx = Math.min(ax1 - 8, Math.max(ax0 + 8, (ra.gx + 0.5) * R));
    if (typ[Math.floor(lx / R)]?.[0] !== 'luft') { S.box(7.6, 0.95, 0.12, lx, 4.08, 0.08, HS_BLAU); S.box(1.1, 1.1, 0.14, lx - 3.3, 4.08, 0.1, HS_ROT); wandschild(S, scene, 'H', 'x', lx - 3.3, 4.08, 0.18, { schrift: '#ffffff', hoehe: 0.8 }); wandschild(S, scene, 'HARTWIG SPORT', 'x', lx + 0.5, 4.08, 0.15, { schrift: '#ffffff', hoehe: 0.55 }); }
  }

  // ---- Fronten und Außenraum
  front(S, scene, 'z', ax0, ax1, az1, ra, r, d, k);
  front(S, scene, 'x', az0, az1, ax1, ra, r, d, k);
  if (eg) {
    if (ra.mall) passage(S, scene, ax0, az0, ax1, az1, ra, r, d, false);
    else if (ra.box) parkplatz(S, scene, ax0, az0, ax1, az1, ra, r, d);
    else strasse(S, ax0, az0, ax1, az1, ra, r, d);
    belegt.push([0, T - 1.9, B, T], [B - 1.9, 0, B, T]);
  } else if (ra.mall) passage(S, scene, ax0, az0, ax1, az1, ra, r, d, true);

  // ---- Leerflächen-Prüfung (größtes freies Quadrat im Bild)
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const t = typ[i][j], zi = zoneVon[i][j];
    if (['lager', 'treppe', 'treppe2', 'wc', 'aufzug', 'luft', 'buehne', 'szene', 'werkstatt', 'werkstatt2'].includes(t) || (zi >= 0 && ['leer', 'umbau', 'untermiete', 'konzession'].includes(zn[zi].art))) belegt.push([i * R, j * R, (i + 1) * R, (j + 1) * R]);
  }
  const quadrat = () => {
    const q = 0.5, gw = Math.round((ax1 - ax0) / q), gh = Math.round((az1 - az0) / q);
    const voll = Array.from({ length: gw }, () => new Uint8Array(gh));
    for (const b of belegt) {
      const i0 = Math.max(0, Math.floor((b[0] - ax0) / q)), i1 = Math.min(gw, Math.ceil((b[2] - ax0) / q)), j0 = Math.max(0, Math.floor((b[1] - az0) / q)), j1 = Math.min(gh, Math.ceil((b[3] - az0) / q));
      for (let a2 = i0; a2 < i1; a2++) for (let c = j0; c < j1; c++) voll[a2][c] = 1;
    }
    let best = 0, wo = null; const dp = Array.from({ length: gw }, () => new Uint16Array(gh));
    for (let a2 = 0; a2 < gw; a2++) for (let c = 0; c < gh; c++) {
      if (voll[a2][c]) continue;
      dp[a2][c] = a2 && c ? 1 + Math.min(dp[a2 - 1][c], dp[a2][c - 1], dp[a2 - 1][c - 1]) : 1;
      if (dp[a2][c] > best) { best = dp[a2][c]; wo = [ax0 + (a2 + 1 - best) * q, az0 + (c + 1 - best) * q]; }
    }
    return { m: best * q, wo };
  };
  // Restflächen über 5,5 m bekommen eine Aktionsinsel passend zur Abteilung (höchstens vier)
  let lf = quadrat();
  for (let n = 0; n < 4 && lf.m > 5.5; n++) {
    const cx = lf.wo[0] + lf.m / 2, cz = lf.wo[1] + lf.m / 2;
    aktionsinsel(S, scene, cx, cz, ra.artAn(Math.floor(cx / R), Math.floor(cz / R)), rng(n * 31 + e), d, frei);
    belegt.push([cx - 1.7, cz - 1.7, cx + 1.7, cz + 1.7]);
    lf = quadrat();
  }
  k.leer = lf;

  // ---- Kundschaft
  const n = Math.min(k.kunden, frei.length);
  for (let q = 0; q < n; q++) {
    const [fx, fz] = frei.splice(Math.floor(r() * frei.length), 1)[0];
    figur(S, fx + zw(r, -0.2, 0.2), fz + zw(r, -0.2, 0.2), q * 7 + e * 1000 + 3, r() < 0.1 ? 'kind' : 'kunde', { ry: r() * PI * 2 });
  }
}

// ================================================================ Bauteile
/** Freistehende Aktionsinsel 3,4 × 3,4 m: Podest mit Puppen, Warentisch und Saisonschild, passend zur Abteilung. */
function aktionsinsel(S, scene, cx, cz, art, r, d, frei) {
  const L = lokal(S, cx, 0.06, cz, 0);
  const pal = { wintersport: SA.WINTER, outdoor: SA.OUT, teamsport: SA.VEREINE.map((v) => v[0]), sportschuhe: SA.SCHUH, rad: SA.RADF }[art] ?? I.PAL.sport;
  L.box(3.0, 0.22, 1.2, 0, 0, -0.8, '#ffffff'); L.box(3.04, 0.03, 1.24, 0, 0.22, -0.8, HS_ROT);
  if (art === 'rad') { I.fahrrad(L, -0.7, -0.8, r, 0, 0.25); I.fahrrad(L, 0.7, -0.8, r, 0, 0.25); }
  else for (let q = 0; q < 3; q++) puppe(L.hoch(0.25), -1.0 + q * 1.0, -0.8, r, art === 'outdoor' ? 'herren' : 'sport', pal, zw(r, -0.4, 0.4));
  L.box(2.6, 0.7, 0.9, 0, 0, 0.8, art === 'outdoor' ? '#7b5a40' : '#2a2d31'); L.box(2.66, 0.05, 0.96, 0, 0.7, 0.8, HS_ROT);
  if (art === 'sportschuhe') for (let q = 0; q < 5; q++) SA.paar(L, -1.0 + q * 0.5, 0.75, 0.8, SA.SCHUH[q * 2], d); else I.stapel(L, 0, 0.8, 2.4, 0.7, 0.75, pal, r, d);
  I.preisschild(L, 1.5, 1.4, waehle(r, ['−20 %', 'Neu', '−30 %']), 1.6);
  frei.push([cx + 2.1, cz], [cx, cz + 2.1]);
}
function platte(S, x0, z0, x1, z1, loecher) {
  const f = '#59626a';
  const teil = (a, b, c, e) => { if (b - a > 0.01 && e - c > 0.01) S.box(b - a, 0.5, e - c, (a + b) / 2, -0.25, (c + e) / 2, f); };
  if (!loecher.length) { teil(x0, x1, z0, z1); return; }
  // Streifen in z an den Lochkanten, darin Teile in x
  const zs = [z0, z1, ...loecher.flatMap((l) => [l[1], l[3]])].filter((z) => z >= z0 && z <= z1).sort((a, b) => a - b);
  for (let q = 0; q < zs.length - 1; q++) {
    const c = zs[q], e = zs[q + 1]; if (e - c < 0.01) continue;
    const m = (c + e) / 2;
    const imStreifen = loecher.filter((l) => m > l[1] && m < l[3]).sort((a, b) => a[0] - b[0]);
    let a = x0;
    for (const l of imStreifen) { teil(a, Math.max(a, Math.min(x1, l[0])), c, e); a = Math.max(a, l[2]); }
    teil(a, x1, c, e);
  }
}
/** Fassadenband unter der Etage (OG). */
function unterkante(S, ax0, az0, ax1, az1, ra, haus) {
  if (ra.mall) return;
  const f = { 1: '#e3e8ea', 2: F2PAL[ra.v][0], 3: '#e4e6e7', 5: '#a87549', 6: '#efe8dc' }[ra.fam] ?? '#e3e8ea';
  S.box(ax1 - ax0 + 0.3, 1.7, 0.3, (ax0 + ax1) / 2, -1.35, az1 + 0.15, f);
  S.box(0.3, 1.7, az1 - az0 + 0.3, ax1 + 0.15, -1.35, (az0 + az1) / 2, dunkler(f, 0.04));
  const glas = ra.fam === 1 ? '#7d9fb2' : '#55636f';
  if (ra.fam === 1) { S.box(ax1 - ax0, 1.2, 0.08, (ax0 + ax1) / 2, -1.3, az1 + 0.32, glas); S.box(0.08, 1.2, az1 - az0, ax1 + 0.32, -1.3, (az0 + az1) / 2, glas); }
  else if (ra.fam === 2) { for (let x = ax0 + 0.6; x < ax1; x += 1.25) S.box(0.05, 1.6, 0.05, x, -1.35, az1 + 0.32, dunkler(f, 0.08)); for (let z = az0 + 0.6; z < az1; z += 1.25) S.box(0.05, 1.6, 0.05, ax1 + 0.32, -1.35, z, dunkler(f, 0.08)); }
  else if (ra.fam === 5) { for (let x = ax0 + 0.2; x < ax1; x += 0.42) S.box(0.26, 1.7, 0.1, x, -1.35, az1 + 0.33, dunkler(f, (x * 7) % 2 > 1 ? 0.05 : 0)); for (let z = az0 + 0.2; z < az1; z += 0.42) S.box(0.1, 1.7, 0.26, ax1 + 0.33, -1.35, z, dunkler(f, (z * 7) % 2 > 1 ? 0.05 : 0)); }
  else { for (let x = ax0 + 1.25; x < ax1; x += 2.5) S.box(1.4, 1.0, 0.1, x, -1.2, az1 + 0.31, glas); for (let z = az0 + 1.25; z < az1; z += 2.5) S.box(0.1, 1.0, 1.4, ax1 + 0.31, -1.2, z, glas); }
}

/** Ware am Gangrand (lokal entlang x): Aktionstisch, Puppenpodest, Ballkorb oder Bank mit Pflanze. */
function randSport(S, scene, L, art, r, d, kk) {
  const fremd = !art || !SA.SPORT_ARTEN.includes(art);
  if (fremd || kk % 5 === 3) { SA.bank(L, -0.5, 0, 1.8, 0, '#b98d61', '#9c7650'); SA.pflanze(L, 1.0, 0, 1.1); return; }
  if (kk % 5 === 0) {
    L.box(2.6, 0.22, 0.75, 0, 0, 0, '#ffffff'); L.box(2.64, 0.03, 0.79, 0, 0.22, 0, HS_ROT);
    const pal = { wintersport: SA.WINTER, outdoor: SA.OUT, teamsport: SA.VEREINE.map((v) => v[0]) }[art] ?? I.PAL.sport;
    for (let q = 0; q < 3; q++) puppe(L.hoch(0.22), -0.85 + q * 0.85, 0, r, art === 'outdoor' ? 'herren' : 'sport', pal, zw(r, -0.4, 0.4));
    return;
  }
  if (art === 'teamsport' || (art === 'sportschuhe' && kk % 2)) { I.ballkorb(L, -0.7, 0, r, d); I.preisschild(L, 0.6, 0, '−20 %', 1.4); return; }
  const pal = { sportschuhe: SA.SCHUH, wintersport: SA.WINTER, outdoor: SA.OUT, rad: SA.RADF }[art] ?? I.PAL.sport;
  L.box(2.8, 0.66, 0.8, 0, 0, 0, art === 'outdoor' ? '#7b5a40' : '#2a2d31'); L.box(2.86, 0.05, 0.86, 0, 0.66, 0, HS_ROT);
  if (art === 'sportschuhe') for (let q = 0; q < 6; q++) SA.schuh(L, -1.1 + q * 0.44, 0.71, (q % 2) * 0.2 - 0.1, SA.SCHUH[(q * 3 + kk) % SA.SCHUH.length]);
  else if (art === 'rad') for (let q = 0; q < 4; q++) SA.helm(L, -1.0 + q * 0.66, 0.71, 0, pal[(q + kk) % pal.length]);
  else I.stapel(L, 0, 0, 2.6, 0.65, 0.71, pal, r, d);
  if (kk % 4 === 1 && scene) { L.box(0.04, 0.9, 0.04, 1.2, 0.71, 0, '#9aa3aa'); L.box(0.7, 0.36, 0.04, 1.2, 1.61, 0, HS_ROT); I.schrift(L, 'Aktion', 1.2, 1.79, 0.03, 0.24, '#ffffff'); }
}
/** Kampagnenwand Hartwig Sport an einer Rückwand (lokal, Rücken z = 0). */
function kampagnenwand(S, scene, L, r, saison = 0) {
  const [txt, bg] = [['WINTER KOMMT', '#1f6fd1'], ['LAUF LOS.', HS_ROT], ['BERG RUFT.', '#3f6b3a'], ['DEIN SPIEL.', '#38b86b']][saison % 4];
  L.box(4.6, 3.6, 0.08, 0, 0.3, 0.05, bg);
  L.box(3.9, 2.2, 0.04, 0, 0.7, 0.1, '#f8f6f2'); L.box(3.7, 2.0, 0.03, 0, 0.8, 0.12, waehle(r, ['#bcd3df', '#e9c9b5', '#c9dcc4']));
  L.box(0.5, 1.5, 0.03, -0.8, 0.9, 0.14, '#1f1f1f'); L.box(0.22, 0.22, 0.03, -0.8, 2.45, 0.14, '#d9a77f');
  L.geo(new THREE.ConeGeometry(1.2, 1.3, 3).rotateX(PI / 2).rotateZ(PI / 2).scale(1, 1, 0.02), 0.9, 1.35, 0.13, '#ffffff');
  if (scene) I.schrift(L, txt, 0, 3.45, 0.11, 0.5, '#ffffff');
}
function gangZelle(S, scene, i, j, ra, d, frei, r, stil) {
  const { nx, nz, gx, gz } = ra, x = i * R, z = j * R;
  boden(S, x, z, R, R, 0, stil.gang, d);
  if (ra.box) { S.box(R, 0.012, 0.12, x + 2.5, 0.07, z + 0.35, '#e8c23a'); S.box(R, 0.012, 0.12, x + 2.5, 0.07, z + 4.65, '#e8c23a'); }
  for (let q = 0; q < 5; q++) frei.push([x + zw(r, 0.6, 4.4), z + zw(r, 0.6, 4.4)]);
  const [ax0, az0] = ra.ausschnitt;
  const quer = j === gz || (ra.gangReihen ?? []).includes(j), laengs = i === gx && j > gz && !ra.box;
  const kreuz = i === gx && j === gz;
  if (z === az0 && !quer) { kampagnenwand(S, scene, lokal(S, x + 2.5, 0.06, z + 0.02, 0), r, i + j); ra.belegt.push([x, z, x + R, z + 0.9]); }
  if (z === az0 && quer && !ra.box) {
    // Gang an der Schnittwand des Ausschnitts: Warenwand bzw. Kampagnenwand statt kahler Wand
    const L = lokal(S, x + 2.5, 0.06, z + 0.02, 0);
    if ((i + ra.e) % 2) kampagnenwand(S, scene, L, r, i);
    else { const nb = ra.artAn(i, j + 1); const pal = { wintersport: SA.WINTER, outdoor: SA.OUT, teamsport: SA.VEREINE.map((v) => v[0]), sportschuhe: SA.SCHUH, rad: SA.RADF }[nb] ?? I.PAL.sport; I.wandRegal(L, 4.8, 2.6, 4, '#2a2d31', I.prodGefaltet(pal), r, d, 0.45); L.box(4.8, 0.9, 0.14, 0, 2.9, 0.08, HS_ROT); if (scene) I.schrift(L, 'Angebote der Woche', 0, 3.35, 0.16, 0.34, '#ffffff'); }
    ra.belegt.push([x, z, x + R, z + 0.9]);
  }
  if (x === ax0 && quer) { kampagnenwand(S, scene, lokal(S, x + 0.02, 0.06, z + 2.5, PI / 2), r, ra.e + 1); ra.belegt.push([x, z, x + 0.9, z + R]); return; }
  if (kreuz && !ra.box) {
    // Saisonfläche an der Kreuzung: rundes Podest mit Skipuppen und Schild
    const L = lokal(S, x + 2.5, 0.06, z + 2.5, 0);
    L.zyl(1.7, 1.7, 0.25, 0, 0, 0, '#ffffff', 16); L.zyl(1.74, 1.74, 0.04, 0, 0.25, 0, '#1f6fd1', 16);
    for (let q = 0; q < 3; q++) { const a = q * 2.1 + 0.3; puppe(L.hoch(0.29), Math.cos(a) * 0.9, Math.sin(a) * 0.8, r, 'sport', SA.WINTER, -a); }
    if (d > 0.4) for (let q = 0; q < 5; q++) L.box(0.1, 1.7, 0.03, -0.5 + q * 0.25, 0.29, -0.2, SA.WINTER[q % SA.WINTER.length]);
    L.box(0.06, 2.8, 0.06, 0, 0.29, 0.9, '#9aa3aa'); L.box(1.9, 0.6, 0.06, 0, 2.7, 0.9, '#1f6fd1');
    if (scene) I.schrift(L, 'Neue Wintersaison', 0, 3.0, 0.94, 0.26, '#ffffff');
    ra.belegt.push([x + 0.7, z + 0.7, x + 4.3, z + 4.3]);
    return;
  }
  const eingang = (laengs && j === nz - 1) || (ra.box && false);
  if (ra.box && quer) {
    if ((i + j) % 2 === 0 && d > 0.3 && x > ax0 + 1) {
      const L = lokal(S, x + 2.5, 0.06, z + 2.5, 0), f = waehle(r, ['#e8403a', '#1f6fd1', '#ffcc00', '#38b86b', '#ff6a2b']);
      L.box(1.3, 0.14, 1.1, -0.2, 0, 0, '#c9a26b');
      for (let q = 0; q < 2; q++) L.box(1.2, 0.42, 1.0, -0.2, 0.14 + q * 0.43, 0, q ? f : dunkler(f, 0.06));
      if (d > 0.5) for (let q = 0; q < 4; q++) L.box(0.28, 0.2, 0.22, -0.6 + q * 0.27, 1.0, 0, '#ffffff');
      I.preisschild(L, 0.7, 0.3, waehle(r, ['9,99 €', '−30 %', 'ab 5 €', '19,99 €']), 1.6);
      ra.belegt.push([x + 1.6, z + 1.7, x + 3.3, z + 3.3]);
    }
    return;
  }
  if (d > 0.3 && (quer || laengs) && !eingang) {
    let kk = i * 3 + j;
    for (const s of [-1, 1]) {
      const nb = quer ? ra.artAn(i, j + s) : ra.artAn(i + s, j);
      const nt = quer ? ra.typ[i]?.[j + s] : ra.typ[i + s]?.[j];
      if (nt && nt !== 'neben') continue;
      if (ra.box && (nb === 'rad' || nb === 'outdoor')) continue;
      if (quer && s < 0 && z === az0) continue;
      const L = quer ? lokal(S, x + 2.5, 0.06, z + 2.5 + s * 1.95, 0) : lokal(S, x + 2.5 + s * 1.95, 0.06, z + 2.5, PI / 2);
      randSport(S, scene, L, nb, r, d, kk++);
      ra.belegt.push(quer ? [x + 0.6, z + 2.5 + s * 1.95 - 0.45, x + 4.4, z + 2.5 + s * 1.95 + 0.45] : [x + 2.5 + s * 1.95 - 0.45, z + 0.6, x + 2.5 + s * 1.95 + 0.45, z + 4.4]);
    }
    frei.length = Math.max(0, frei.length - 2);
  }
  if (eingang && scene && ra.e === 0) {
    const L = lokal(S, x + 2.5, 0.065, z + 3.2, 0);
    L.box(3.6, 0.02, 2.2, 0, 0, 0, '#3a3f45');
    I.schrift(L, 'HARTWIG SPORT', 0, 0.03, 0, 0.42, '#ffffff', null, true);
  }
}
function nebenZelle(S, scene, i, j, ra, d, frei, r, stil) {
  const x = i * R, z = j * R;
  boden(S, x, z, R, R, 0, stil.gang, d);
  for (let q = 0; q < 3; q++) frei.push([x + zw(r, 1.8, 3.2), z + zw(r, 0.5, 4.5)]);
  const [, az0] = ra.ausschnitt;
  if (z === az0) { kampagnenwand(S, scene, lokal(S, x + 2.5, 0.06, z + 0.02, 0), r, i); ra.belegt.push([x, z, x + R, z + 0.9]); return; }
  if (d < 0.3) return;
  for (const s of [-1, 1]) {
    const L = lokal(S, x + 2.5 + s * 1.95, 0.06, z + 2.5, PI / 2);
    randSport(S, scene, L, ra.artAn(i + s, j), r, d, i + j * 3 + (s > 0 ? 1 : 0));
    ra.belegt.push([x + 2.5 + s * 1.95 - 0.45, z + 0.8, x + 2.5 + s * 1.95 + 0.45, z + 4.2]);
  }
}
function nebenraum(S, scene, x, z, d, stil) {
  boden(S, x, z, R, R, 0, stil.gang, d);
  const t = 2.8;
  S.box(R, WH, t, x + R / 2, WH / 2, z + t / 2, stil.wand);
  S.box(R, 0.25, 0.06, x + R / 2, 0.125, z + t + 0.03, '#cfc5b6');
  for (const [u, f, txt] of [[1.4, '#5a6f7f', 'WC'], [3.6, '#8a8f94', 'Personal']]) {
    S.box(1.0, 2.2, 0.06, x + u, 1.16, z + t + 0.03, f);
    if (scene) { S.box(txt === 'WC' ? 0.7 : 1.1, 0.4, 0.04, x + u, 2.65, z + t + 0.05, txt === 'WC' ? '#2f6f8f' : '#5a636b'); wandschild(S, scene, txt, 'x', x + u, 2.65, z + t + 0.06, { schrift: '#ffffff', hoehe: 0.3 }); }
  }
}

/** Kompakte Rolltreppe oder offene Treppe auf 10 × 5 m: aufwärts (hinten), von unten aus der Aussparung (vorne). */
function verbindung(S, scene, x, z, t, ra, d, r, frei) {
  const fl = ra.fam === 5 ? { a: '#cdb48d', b: '#c2a880', m: 'dielen' } : { a: '#ece8e1', b: '#dcd6cc', m: 'fliese' };
  const auf = ra.oben, ab = ra.unten;
  const lx0 = x + 0.8, lx1 = x + 9.4, lz0 = z + 2.5, lz1 = z + 4.7;
  if (ab) { boden(S, x, z, 10, lz0 - z, 0, fl, 0.3); boden(S, x, lz1, 10, z + 5 - lz1, 0, fl, 0.3); boden(S, x, lz0, lx0 - x, lz1 - lz0, 0, fl, 0.3); boden(S, lx1, lz0, x + 10 - lx1, lz1 - lz0, 0, fl, 0.3); }
  else boden(S, x, z, 10, 5, 0, fl, 0.3);
  const lang = HUB / Math.tan(0.52);
  const holz = t === 'treppe_holz', treppe = t !== 'rt';
  const stufeF = holz ? '#a87549' : '#cfc8bc', wangeF = holz ? '#7b5a40' : '#9aa3aa';
  const treppeLauf = (zz, y0, lauf, hoch, von) => {
    const nSt = d < 0.5 ? 10 : 18;
    for (let q = 0; q < nSt; q++) { const tt = (q + 0.5) / nSt; const hh = von + hoch * (q + 1) / nSt; S.box(lauf / nSt + 0.02, 0.18, 1.4, x + 9.2 - tt * lauf, y0 + hh - 0.09, zz, stufeF); }
    const g = new THREE.BoxGeometry(Math.hypot(lauf, hoch), 0.35, 0.08); g.rotateZ(Math.atan2(hoch, lauf)); g.translate(x + 9.2 - lauf / 2, y0 + von + hoch / 2 + 0.2, zz - 0.74); S.add(g, wangeF);
    const g2 = new THREE.BoxGeometry(Math.hypot(lauf, hoch), 0.9, 0.04); g2.rotateZ(Math.atan2(hoch, lauf)); g2.translate(x + 9.2 - lauf / 2, y0 + von + hoch / 2 + 0.8, zz + 0.74); S.add(g2, GLAS);
  };
  if (ab) {
    const tief = 1.8;
    S.box(lx1 - lx0, 0.1, lz1 - lz0, (lx0 + lx1) / 2, -tief, (lz0 + lz1) / 2, '#4d565e');
    S.box(0.1, tief, lz1 - lz0, lx0, -tief / 2, (lz0 + lz1) / 2, '#3a424a');
    S.box(lx1 - lx0, tief, 0.1, (lx0 + lx1) / 2, -tief / 2, lz0, '#444d55');
    S.box(lx1 - lx0 + 0.2, 0.5, 0.25, (lx0 + lx1) / 2, -0.25, lz1, '#d5dbdf');
    S.box(0.25, 0.5, lz1 - lz0, lx1, -0.25, (lz0 + lz1) / 2, '#d5dbdf');
    if (treppe) treppeLauf((lz0 + lz1) / 2, -HUB, Math.min(lang, 8.2), HUB, 0);
    else rolltreppe(S, lx0 + 0.15 + lang, (lz0 + lz1) / 2, lang, HUB, -HUB + 0.06, d, 1 - (tief - 0.2) / HUB);
    const gl = (w, tt, cx, cz) => { S.box(w, 1.05, tt, cx, 0.6, cz, GLAS); S.box(w + 0.04, 0.07, tt + 0.08, cx, 1.15, cz, '#c9d2d8'); };
    gl(lx1 - lx0 - 1.4, 0.04, (lx0 + lx1) / 2 + 0.7, lz0); gl(lx1 - lx0 - 1.4, 0.04, (lx0 + lx1) / 2 + 0.7, lz1); gl(0.04, lz1 - lz0, lx1, (lz0 + lz1) / 2);
  }
  if (auf) {
    if (treppe) treppeLauf(z + 1.3, 0.06, Math.min(lang, 8.2), HUB, 0);
    else rolltreppe(S, x + 9.3, z + 1.3, lang, HUB, 0.06, d);
  }
  if (scene) {
    const ziel = auf ? NAME_ETAGE(ra.e + 1) : NAME_ETAGE(ra.e - 1);
    haengeschild(S, scene, (auf ? '▲ ' : '▼ ') + ziel, x + 9.0, 3.4, z + 2.2, { farbe: HS_BLAU, hoehe: 0.45 });
  }
  if (!auf) { const L = lokal(S, x + 4.5, 0.06, z + 1.2, 0); SA.bank(L, -1.3, 0, 2.2, 0, '#2a2d31', HS_BLAU); SA.pflanze(L, 1.6, 0, 1.1); SA.pflanze(L, -3.2, 0, 1.0); }
  frei.push([x + 9.7, z + 2.5], [x + 0.5, z + 4.8]);
}

/** Kletterwand im Luftraum über zwei Geschosse (Glas-Kubus), 10 × 10 m an der Rückwand. */
function kletterwand(S, scene, x, z, ra, d, r, frei) {
  const unten = ra.unten, oben = ra.oben;
  const y0 = unten ? -HUB : 0, y1 = oben ? WH + HUB : WH;
  if (y1 > WH) ra.hochpunkt = Math.max(ra.hochpunkt, y1 - WH);
  // Boden des Luftraums mit Matten
  const mattenY = y0;
  if (unten) {
    S.box(10, 0.1, 9, x + 5, y0 - 0.05, z + 5.5, '#4d565e');
    S.box(0.15, HUB, 9, x + 0.08, y0 + HUB / 2, z + 5.5, '#c9cfd2');
    boden(S, x, z, 10, 1.0, 0, { a: '#ece8e1', b: '#dcd6cc', m: 'fliese' }, 0.3);
  } else boden(S, x, z, 10, 10, 0, { a: '#eceff1', b: '#dfe2e4', m: 'fliese' }, 0.3);
  S.box(9.4, 0.3, unten ? 8.6 : 3.0, x + 5, mattenY + 0.15 + (unten ? 0 : 0.06), z + (unten ? 5.4 : 2.6), '#2f63b5');
  for (let q = 0; q < 4; q++) S.box(0.04, 0.02, 3.0, x + 1.2 + q * 2.4, mattenY + 0.31 + (unten ? 0 : 0.06), z + 2.6, '#1f4a8a');
  // Wand mit Überhang
  const wz = z + 0.75;
  S.box(9.6, y1 - y0, 0.5, x + 5, (y0 + y1) / 2, z + 0.5, '#b9c2c7');
  for (let q = 0; q < 4; q++) { const vg = new THREE.ConeGeometry(0.9, 0.5, 3); vg.rotateX(PI / 2); vg.translate(x + 1.5 + q * 2.3, y0 + 1.6 + ((q * 3.1) % (y1 - y0 - 3)), wz + 0.25); S.add(vg, ['#e04b3a', '#f2c14e', '#3a7bd5', '#4caf50'][q]); }
  const ueber = new THREE.BoxGeometry(3.2, 2.6, 0.4); ueber.rotateX(0.35); ueber.translate(x + 6.5, Math.min(y1 - 1.8, y0 + 6.2), wz + 0.4); S.add(ueber, '#7d868b');
  const nGriff = Math.round((y1 - y0) * 9.6 * (d < 0.5 ? 0.35 : 0.9));
  for (let q = 0; q < nGriff; q++) S.box(0.24, 0.2, 0.14, x + zw(r, 0.6, 9.4), zw(r, y0 + 0.7, y1 - 0.4), wz + 0.02, waehle(r, ['#e04b3a', '#f2c14e', '#3a7bd5', '#4caf50', '#ff8c42', '#8d5fbf', '#ffffff']));
  for (let q = 0; q < 3; q++) { const u = x + 1.8 + q * 3.1; S.box(0.03, y1 - y0 - 0.6, 0.03, u, (y0 + y1) / 2, wz + 0.25, '#f2f1ec'); }
  // Kletternde und Sichernde
  for (let q = 0; q < 3; q++) { const u = x + 1.8 + q * 3.1, yy = y0 + 1.2 + ((q * 2.3) % (y1 - y0 - 3)); figur(S, u, wz + 0.35, 900 + q, 'kunde', { y: yy, ry: PI, pose: 'tragen' }); }
  for (let q = 0; q < 2; q++) figur(S, x + 2.3 + q * 3.1, z + 3.4, 950 + q, 'kunde', { y: mattenY + 0.31 + (unten ? 0 : 0.06), ry: PI, pose: 'schauen' });
  // Geländer bzw. niedrige Umwehrung
  const gl = (w, t, cx, cz) => { S.box(w, 1.05, t, cx, 0.6, cz, GLAS); S.box(w + 0.04, 0.07, t + 0.08, cx, 1.15, cz, '#c9d2d8'); };
  if (unten) { gl(9.4, 0.04, x + 5, z + 9.7); gl(0.04, 8.7, x + 9.7, z + 5.35); }
  else { S.box(9.4, 0.8, 0.08, x + 5, 0.46, z + 4.6, '#2f63b5'); S.box(0.08, 0.8, 4.4, x + 9.7, 0.46, z + 2.4, '#2f63b5'); SA.bank(lokal(S, x + 3, 0.06, z + 5.6, 0), 0, 0, 2.6, 0, '#2a2d31', HS_ROT); }
  if (scene) { const yS = Math.min(y1, WH) - 0.5; S.box(4.0, 0.7, 0.1, x + 3.0, yS, wz + 0.05, HS_ROT); wandschild(S, scene, 'Kletterwand', 'x', x + 3.0, yS, wz + 0.1, { schrift: '#ffffff', hoehe: 0.45 }); }
  for (let q = 0; q < 4; q++) frei.push([x + zw(r, 1, 9), z + (unten ? 0.5 : zw(r, 6.5, 9))]);
}
/** Radwand über die volle Höhe (eingeschossiger Glas-Kubus), 10 × 5 m an der Rückwand. */
function radbuehne(S, scene, x, z, d, r, frei, ctx) {
  boden(S, x, z, 10, 5, 0, { a: '#3d4248', b: '#363a40', m: 'beton' }, d);
  const L = lokal(S, x + 5, 0.06, z + 0.02, 0);
  L.box(9.8, WH - 0.1, 0.12, 0, 0, 0.06, '#1f2328');
  for (const y of [1.25, 2.6, 3.95]) L.box(9.6, 0.06, 0.12, 0, y + 0.95, 0.15, '#9aa3aa');
  for (let lev = 0; lev < 3; lev++) for (let q = 0; q < 7; q++) I.fahrrad(L, -4.2 + q * 1.4, 0.3, r, 0, 0.35 + lev * 1.35);
  L.box(6.0, 0.25, 2.2, 0, 0, 2.6, '#ffffff'); L.box(6.04, 0.03, 2.24, 0, 0.25, 2.6, '#ffcc00');
  for (let q = 0; q < 4; q++) I.fahrrad(L, -2.2 + q * 1.5, 2.6 + (q % 2) * 0.4, r, 0.4, 0.25);
  if (scene) { L.box(3.2, 0.6, 0.06, 3.3, 4.0, 0.22, '#ffcc00'); I.schrift(L, 'Radwand', 3.3, 4.3, 0.26, 0.36, '#1f2328'); }
  frei.push([x + 1, z + 4.4], [x + 8.5, z + 4.5]);
}
/** Laufband-Teststrecke hinter der Glasfront (Zellenreihe entlang x). */
function teststrecke(S, scene, i, j, ra, d, r, frei) {
  const x = i * R, z = j * R, erst = i === ra.lauf[0], letzt = i === ra.lauf[1] - 1;
  boden(S, x, z, R, R, 0, { a: '#eef0f1', b: '#dfe2e4', m: 'fliese' }, d);
  S.box(R, 0.04, 2.6, x + 2.5, 0.08, z + 2.0, '#c4553e');
  for (const zz of [z + 0.75, z + 2.0, z + 3.25]) S.box(R, 0.01, 0.06, x + 2.5, 0.105, zz, '#ffffff');
  S.box(R, 0.04, 0.9, x + 2.5, 0.08, z + 4.0, '#6fae5c');
  if (erst) { S.box(0.12, 0.012, 2.6, x + 0.4, 0.106, z + 2.0, '#ffffff'); if (scene) haengeschild(S, scene, 'Teststrecke', x + 2.5, 3.5, z + 2.0, { farbe: '#c4553e', hoehe: 0.6 }); }
  if (letzt) { for (let q = 0; q < 8; q++) S.box(0.3, 0.012, 0.32, x + 4.4 + (q % 2) * 0.3 - 0.15, 0.106, z + 0.85 + q * 0.32, q % 2 ? '#1f1f1f' : '#ffffff'); SA.laufband(lokal(S, x + 2.6, 0.12, z + 4.0, 0), r, d, { S, r }); }
  else { const L = lokal(S, x + 2.5, 0.12, z + 4.05, 0); if ((i + j) % 2) SA.bank(L, 0, 0, 2.4, 0, '#2a2d31', '#ffffff'); else SA.pflanze(L, 0, 0, 0.9); }
  figur(S, x + zw(r, 1, 4), z + (i % 2 ? 1.4 : 2.6), 700 + i, 'kunde', { y: 0.12, ry: PI / 2, pose: 'gehen' });
  ra.belegt.push([x, z + 0.5, x + R, z + 4.6]);
}
/** Kletterturm (Outdoor-Flagship), 5 × 5 m, ragt über die Decke. */
function kletterturm(S, scene, x, z, ra, d, r, frei) {
  const kw = 3.4, cx = x + 2.5, cz = z + 2.5, h = 9.5;
  ra.hochpunkt = Math.max(ra.hochpunkt, h - WH);
  boden(S, x, z, R, R, 0, { a: '#2f63b5', b: '#2a5aa3', m: 'fliese' }, 0.3);
  S.box(kw, h, kw, cx, h / 2, cz, '#8f979c');
  S.box(kw + 0.4, 0.3, kw + 0.4, cx, h + 0.15, cz, '#5f676e');
  const n = d < 0.5 ? 30 : 80;
  for (let q = 0; q < n; q++) { const u = zw(r, -kw / 2 + 0.2, kw / 2 - 0.2), y = zw(r, 0.6, h - 0.5); if (q % 2) S.box(0.24, 0.2, 0.12, cx + u, y, cz + kw / 2 + 0.05, waehle(r, SA.SCHUH)); else S.box(0.12, 0.2, 0.24, cx + kw / 2 + 0.05, y, cz + u, waehle(r, SA.SCHUH)); }
  S.box(0.03, h - 0.5, 0.03, cx - 0.6, h / 2, cz + kw / 2 + 0.3, '#f2f1ec');
  figur(S, cx - 0.6, cz + kw / 2 + 0.3, 811, 'kunde', { y: 4.2, ry: PI, pose: 'tragen' });
  figur(S, cx + kw / 2 + 0.3, cz + 0.5, 812, 'kunde', { y: 1.6, ry: -PI / 2, pose: 'tragen' });
  S.box(4.8, 0.3, 0.9, cx, 0.2, z + 4.5, '#1f4a8a'); S.box(0.9, 0.3, 4.8, x + 4.5, 0.2, cz, '#1f4a8a');
  if (scene) { S.box(2.6, 0.6, 0.06, cx, h - 1.0, cz + kw / 2 + 0.2, HS_ROT); wandschild(S, scene, 'Kletterturm', 'x', cx, h - 1.0, cz + kw / 2 + 0.24, { schrift: '#ffffff', hoehe: 0.36 }); }
  frei.push([x + 4.6, z + 0.6]);
}
/** Rundbühne in der Zylinderecke (Postmoderne 90er). Mittelpunkt (B − R, T − R). */
function rundbuehne(S, scene, ra, d, r, frei, drin) {
  const { B, T, nx, nz } = ra, Rz = ra.zylR;
  const cx = B - Rz, cz = T - Rz;
  if (!drin(nx - 1, nz - 1)) return;
  // Boden der Eckzellen (ohne den Bereich jenseits der Rundung)
  for (const [i, j] of [[nx - 2, nz - 2], [nx - 1, nz - 2], [nx - 2, nz - 1], [nx - 1, nz - 1]]) if (ra.typ[i][j] === 'buehne') boden(S, i * R, j * R, R, R, 0, { a: '#ece6db', b: '#ddd5c7', m: 'platten' }, d);
  const seg = (rad, h, y, f) => { const g = new THREE.CylinderGeometry(rad, rad, h, 18, 1, false, 0, PI / 2); g.translate(cx, y + h / 2, cz); S.add(g, f); };
  // Hinterer Halbkreis der Bühne (Richtung Innenraum) und Viertel zur Rundung
  const voll = (rad, h, y, f) => { const g = new THREE.CylinderGeometry(rad, rad, h, 24); g.translate(cx, y + h / 2, cz); S.add(g, f); };
  voll(Rz - 0.2, 0.06, 0.04, '#d9cdb9');
  voll(Rz * 0.82, 0.3, 0.06, '#ffffff'); voll(Rz * 0.82 + 0.03, 0.04, 0.36, F6AKZ[ra.v]);
  voll(Rz * 0.45, 0.3, 0.36, '#2a2d31');
  const pal = waehle(r, [SA.WINTER, SA.OUT, I.PAL.sport]);
  const n = d < 0.5 ? 4 : 7;
  for (let q = 0; q < n; q++) { const a = (q + 0.5) * (PI * 2 / n); puppe(lokal(S, cx, 0.4, cz, 0), Math.sin(a) * Rz * 0.64, Math.cos(a) * Rz * 0.64, r, 'sport', pal, a + PI); }
  puppe(lokal(S, cx, 0.7, cz, 0), 0, 0, r, 'sport', pal, PI * 1.25);
  // Lichtring unter der Decke
  const ring = new THREE.TorusGeometry(Rz * 0.7, 0.07, 4, 24); ring.rotateX(PI / 2); ring.translate(cx, WH - 0.5, cz); S.add(ring, '#f7e9c8');
  if (scene) haengeschild(S, scene, 'Neue Saison', cx - Rz * 0.2, 3.4, cz - Rz * 0.9, { farbe: F6AKZ[ra.v], hoehe: 0.6 });
  ra.belegt.push([cx - Rz, cz - Rz, B, T]);
  frei.push([cx - Rz - 0.5, cz + 0.5], [cx + 0.5, cz - Rz - 0.4]);
}
/** Zelt- und Kanuinszenierung hinter dem Portalfenster (Outdoor-Flagship). */
function inszenierung(S, scene, ra, d, r, frei, drin) {
  const zellen = []; for (let i = 0; i < ra.nx; i++) for (let j = 0; j < ra.nz; j++) if (ra.typ[i][j] === 'szene') zellen.push([i, j]);
  if (!zellen.length) return;
  const i0 = Math.min(...zellen.map((c) => c[0])), i1 = Math.max(...zellen.map((c) => c[0])) + 1, j0 = Math.min(...zellen.map((c) => c[1])), j1 = Math.max(...zellen.map((c) => c[1])) + 1;
  if (!drin(i0, j0) || !drin(i1 - 1, j1 - 1)) { for (const [i, j] of zellen) if (drin(i, j)) boden(S, i * R, j * R, R, R, 0, { a: '#cdb48d', b: '#c2a880', m: 'dielen' }, d); }
  const x0 = i0 * R, x1 = i1 * R, z0 = j0 * R, z1 = j1 * R, w = x1 - x0, t = z1 - z0;
  if (!drin(i0, j0) || !drin(i1 - 1, j1 - 1)) return;
  const L = lokal(S, (x0 + x1) / 2, 0.06, (z0 + z1) / 2, 0);
  // Gelände: Holzdeck, Wiese, Kies, Wasser
  boden(S, x0, z0, w, t, 0, { a: '#cdb48d', b: '#c2a880', m: 'dielen' }, d);
  L.box(w - 1.0, 0.18, t - 1.6, 0, 0, -0.3, '#7f9a5b');
  L.box(w * 0.38, 0.05, t * 0.5, w * 0.22, 0.18, t * 0.12, '#3c8a9b');
  for (let q = 0; q < (d < 0.5 ? 5 : 12); q++) SA.fels(L.hoch(0.1), zw(r, -w / 2 + 1, w / 2 - 1), zw(r, -t / 2 + 1.2, -t / 2 + 2.6), zw(r, 0.6, 1.6), waehle(r, ['#8e8a83', '#9a948a', '#7f7c77']));
  // Großes Zelt mit Abspannleinen
  const zx = -w * 0.25, zz = -0.6;
  SA.kuppelzelt(L.hoch(0.18), zx, zz, '#e0a33a', 1.9);
  SA.pflanze(L.hoch(0.18), zx + 2.4, zz - 1.0, 0.9);
  // Lagerfeuer, Stühle, Figuren
  L.zyl(0.4, 0.4, 0.08, zx + 1.6, 0.18, zz + 1.6, '#6b6458', 8); L.kugel(0.2, zx + 1.6, 0.4, zz + 1.6, '#ff8c42'); L.kugel(0.12, zx + 1.6, 0.6, zz + 1.6, '#f2c14e');
  puppe(L.hoch(0.18), zx - 1.8, zz + 1.4, r, 'herren', SA.OUT, 0.6); puppe(L.hoch(0.18), zx + 0.4, zz + 2.0, r, 'damen', SA.OUT, -0.4);
  // Kanu am Wasser, Steg
  SA.kanu(L, w * 0.22, 0.2, t * 0.12, '#d04a3f', 4.4);
  L.box(1.6, 0.06, 0.1, w * 0.22 + 0.4, 0.6, t * 0.12 + 0.75, '#b98d61', 0.4);
  L.box(2.4, 0.12, 1.2, w * 0.22, 0.18, t * 0.12 - 1.6, '#a87549');
  // Nadelbäume
  for (const [tx, tz] of [[w / 2 - 1.2, -t / 2 + 1.4], [-w / 2 + 1.2, -t / 2 + 1.0], [w * 0.05, -t / 2 + 1.0]]) { L.box(0.2, 0.6, 0.2, tx, 0.18, tz, '#6b4a32'); L.geo(new THREE.ConeGeometry(0.9, 2.6, 7).translate(0, 1.3, 0), tx, 0.7, tz, '#3f6b3a'); L.geo(new THREE.ConeGeometry(0.6, 1.6, 7).translate(0, 0.8, 0), tx, 2.4, tz, '#4d7d46'); }
  if (scene) haengeschild(S, scene, 'Draußen zuhause', (x0 + x1) / 2, 3.8, z0 + 1.2, { farbe: '#3f6b3a', schrift: '#f4efe6', hoehe: 0.7 });
  ra.belegt.push([x0, z0, x1, z1]);
  frei.push([x1 - 0.5, z0 + 0.6], [x0 + 1, z0 + 0.6]);
}

// ---- Fachmarkt-Box: Kassen, Wagen, Aktion, Werkstatt
function kassenZelle(S, scene, x, z, d, r, frei, schild) {
  boden(S, x, z, R, R, 0, { a: '#e9e9e7', b: '#dcdcd9', m: 'fliese' }, d);
  for (const u of [1.25, 3.75]) {
    const L = lokal(S, x + u, 0.06, z + 2.4, -PI / 2);
    L.box(2.6, 0.85, 0.75, 0, 0, 0, '#2a2d31'); L.box(2.0, 0.05, 0.55, 0.2, 0.85, 0, '#1f1f1f'); L.box(2.66, 0.04, 0.8, 0, 0.85, 0, '#c9d2d8');
    L.box(0.3, 0.3, 0.05, -0.9, 1.0, -0.3, '#2b3640'); L.box(0.05, 1.4, 0.05, -1.25, 0.85, -0.35, '#9aa3aa'); L.box(0.4, 0.3, 0.05, -1.25, 2.25, -0.35, HS_ROT);
    figur(S, ...L.P(-0.8, -0.8), (r() * 1e9) | 0, 'kasse', { y: 0.06, ry: L.rot + PI });
    if (r() < 0.3) figur(S, ...L.P(1.2, 0.85), (r() * 1e9) | 0, 'kunde', { y: 0.06, ry: L.rot - PI / 2, pose: 'tragen' });
    if (r() < 0.6) SA.einkaufswagen(L, 1.9, 0.9, PI);
  }
  if (schild && scene) haengeschild(S, scene, 'Kasse', x + 2.5, 3.6, z + 2.5, { farbe: HS_ROT, hoehe: 0.6 });
  frei.push([x + 2.5, z + 4.6]);
}
function wagenZelle(S, scene, x, z, d, r, frei) {
  boden(S, x, z, R, R, 0, { a: '#e9e9e7', b: '#dcdcd9', m: 'fliese' }, d);
  for (const zz of [z + 1.0, z + 2.4]) { const L = lokal(S, x + 0.4, 0.06, zz, 0); for (let q = 0; q < (d < 0.5 ? 3 : 6); q++) SA.einkaufswagen(L, 0.5 + q * 0.42, 0, 0); }
  S.box(4.6, 0.08, 0.08, x + 2.5, 1.0, z + 1.7, '#9aa3aa');
  if (scene) { S.box(1.6, 0.5, 0.06, x + 3.9, 2.3, z + 0.3, HS_BLAU); wandschild(S, scene, 'Wagen', 'x', x + 3.9, 2.3, z + 0.34, { schrift: '#ffffff', hoehe: 0.32 }); S.box(0.06, 2.3, 0.06, x + 3.9, 1.15, z + 0.3, '#9aa3aa'); }
  frei.push([x + 2.5, z + 4.3]);
}
function aktionsZelle(S, scene, x, z, d, r, frei) {
  boden(S, x, z, R, R, 0, { a: '#e9e9e7', b: '#dcdcd9', m: 'fliese' }, d);
  for (const [px, pz] of [[1.3, 1.5], [3.7, 1.5], [2.5, 3.6]]) {
    S.box(1.2, 0.14, 1.0, x + px, 0.13, z + pz, '#c9a26b');
    const f = waehle(r, ['#e8403a', '#1f6fd1', '#ffcc00', '#38b86b']);
    for (let q = 0; q < 2; q++) S.box(1.1, 0.4, 0.9, x + px, 0.27 + q * 0.42 + 0.2, z + pz, q ? f : dunkler(f, 0.06));
    I.preisschild(lokal(S, x + px + 0.4, 0.06, z + pz + 0.4, 0), 0, 0, waehle(r, ['9,99 €', '−30 %', 'ab 5 €']), 1.6);
  }
  frei.push([x + 2.5, z + 4.6], [x + 4.6, z + 2.6]);
}
function werkstattZelle(S, scene, x, z, d, r, frei, ctx, art) {
  boden(S, x, z, R, R, 0, { a: '#a3a9ae', b: '#989ea4', m: 'beton' }, d);
  const L = lokal(S, x + 2.5, 0.06, z + 0.02, 0);
  const c = { ...ctx, d, r };
  if (art === 'rad') SA.radWerkstatt(L, 4.9, r, d, c); else SA.skiService(L, 4.9, r, d, c);
  L.box(0.06, WH - 0.1, 2.4, -2.45, 0, 1.2, '#c9d2d8');
  frei.push([x + 2.5, z + 3.2]);
}

// ---- Fachmarkt-Box: Regalgassen mit Schwerlastregalen
const GASSE = {
  rad: { name: 'Fahrrad', farbe: '#2a2d31', schrift: '#ffcc00', boden: '#b8bcbf' },
  outdoor: { name: 'Outdoor & Camping', farbe: '#3f6b3a', schrift: '#f4efe6', boden: '#c4b9a5' },
  sportschuhe: { name: 'Sportschuhe', farbe: '#e8403a', schrift: '#ffffff', boden: '#bfc2c6' },
  sporttextil: { name: 'Sportbekleidung', farbe: '#1f6fd1', schrift: '#ffffff', boden: '#c7cbd0' },
  wintersport: { name: 'Wintersport', farbe: '#20b5c9', schrift: '#ffffff', boden: '#cdd6dc' },
  teamsport: { name: 'Teamsport', farbe: '#38b86b', schrift: '#ffffff', boden: '#b9c4b4' },
};
function gassenWare(art) {
  if (art === 'sportschuhe') return (L, u, y, lz, w, h, e, r, d) => {
    const n = Math.max(1, Math.floor(w / 0.38)), lagen = Math.max(1, Math.floor(Math.min(h, 1.2) / 0.16));
    for (let k = 0; k < n; k++) { const f = ['#e8762a', '#f2f2f2', '#1f6fd1', '#1f1f1f', '#e8403a'][(k + e) % 5]; if (d > 0.5) for (let q = 0; q < lagen; q++) SA.karton(L, u - w / 2 + (k + 0.5) * (w / n), y + q * 0.16, lz, f, 0.34, 0.15); else L.box(0.34, lagen * 0.16, 0.22, u - w / 2 + (k + 0.5) * (w / n), y, lz, f); }
    if (e === 0) for (let k = 0; k < Math.floor(w / 0.6); k++) SA.paar(L, u - w / 2 + 0.3 + k * 0.6, y + lagen * 0.16, lz, SA.SCHUH[k % SA.SCHUH.length], d);
  };
  if (art === 'sporttextil') return (L, u, y, lz, w, h, e, r, d) => {
    if (e === 0) { L.box(w, 0.04, 0.04, u, y + 1.12, lz, '#c9d2d8'); I.kleiderReihe(L, u - w / 2 + 0.05, u + w / 2 - 0.05, y + 1.12, lz, I.PAL.sport, r, d, { hMin: 0.6, hMax: 0.9 }); return; }
    I.stapel(L, u, lz, w, 0.6, y, SA.SPORT_MARKEN[(Math.round(u) & 3)].pal, r, d);
  };
  if (art === 'wintersport') return (L, u, y, lz, w, h, e, r, d) => {
    if (e === 0) { const n = Math.max(1, Math.floor(w / (d < 0.5 ? 0.35 : 0.18))); for (let k = 0; k < n; k++) L.box(0.09, Math.min(h, 1.35), 0.04, u - w / 2 + (k + 0.5) * (w / n), y, lz + ((k % 2) - 0.5) * 0.2, SA.WINTER[k % SA.WINTER.length]); return; }
    const n = Math.max(1, Math.floor(w / 0.42)); for (let k = 0; k < n; k++) { if (k % 2) SA.helm(L, u - w / 2 + (k + 0.5) * (w / n), y, lz, SA.WINTER[k % SA.WINTER.length], 1.1); else L.box(0.3, 0.32, 0.36, u - w / 2 + (k + 0.5) * (w / n), y, lz, '#1f2a3a'); }
  };
  if (art === 'teamsport') return (L, u, y, lz, w, h, e, r, d) => {
    if (e === 0) { L.box(w, 0.9, 0.7, u, y, lz, '#4b5560'); const n = Math.max(1, Math.floor(w / (d < 0.5 ? 0.6 : 0.36))); for (let k = 0; k < n; k++) L.geo(new THREE.IcosahedronGeometry(0.16, 1), u - w / 2 + (k + 0.5) * (w / n), y + 1.0, lz + ((k % 2) - 0.5) * 0.25, ['#ffffff', '#ffffff', '#ff6a2b', '#ffcc00'][k % 4]); return; }
    I.stapel(L, u, lz, w, 0.6, y, SA.VEREINE.map((v) => v[0]), r, d);
  };
  if (art === 'rad') return (L, u, y, lz, w, h, e, r, d) => {
    if (e === 0) { const n = Math.max(1, Math.floor(w / 1.1)); for (let k = 0; k < n; k++) I.fahrrad(L, u - w / 2 + (k + 0.5) * (w / n), lz, r, 0, y); return; }
    const n = Math.max(1, Math.floor(w / 0.5)); for (let k = 0; k < n; k++) L.box(0.42, Math.min(h, zw(r, 0.4, 0.8)), 0.6, u - w / 2 + (k + 0.5) * (w / n), y, lz, waehle(r, ['#e8e4dc', '#1f1f1f', '#e8403a', '#1f6fd1', '#ffcc00']));
  };
  return (L, u, y, lz, w, h, e, r, d) => {
    if (e === 0) { // Zelte und Schlafsäcke in Packsäcken, Kühlboxen
      const n = Math.max(1, Math.floor(w / 0.55));
      for (let k = 0; k < n; k++) { const uu = u - w / 2 + (k + 0.5) * (w / n), f = waehle(r, SA.OUT); if (k % 3 === 2) L.box(0.5, 0.4, 0.4, uu, y, lz, waehle(r, ['#e8403a', '#1f6fd1', '#f2f1ec'])); else L.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 8).rotateX(PI / 2), uu, y + 0.2, lz, f); }
      return;
    }
    const n = Math.max(1, Math.floor(w / 0.45)); // Rucksäcke, Campingstühle
    for (let k = 0; k < n; k++) { const uu = u - w / 2 + (k + 0.5) * (w / n), f = waehle(r, SA.OUT); L.box(0.36, Math.min(h, 0.55), 0.24, uu, y, lz + 0.1, f); if (d > 0.6) L.box(0.28, 0.16, 0.06, uu, y + 0.08, lz + 0.24, dunkler(f, 0.08)); }
  };
}
/** Hallenfläche mit Regalgassen quer zur Hauptgangreihe (Racks laufen entlang z). Rückgabe wie flaeche(). */
function gassen(S, scene, art, Z, o) {
  const alle = Z.alle, res = { frei: [], belegt: [] };
  if (!alle.length) return res;
  const r = rng((o.seed ?? 1) * 977 + 3), d = o.dichte ?? 1;
  const G = GASSE[art], ware = gassenWare(art);
  const satz = new Set(alle.map((c) => c.i + ',' + c.j));
  for (const c of alle) {
    boden(S, c.i * R, c.j * R, R, R, 0, { a: G.boden, b: dunkler(G.boden, 0.03), m: 'beton' }, d);
  }
  // Spalten: je Spalte ein Doppelregal (2 × 1,1 m) mittig, Gassen 1,4 m beidseits
  const cols = new Map();
  for (const c of alle) { const a = cols.get(c.i) ?? [c.j, c.j]; a[0] = Math.min(a[0], c.j); a[1] = Math.max(a[1], c.j); cols.set(c.i, a); }
  let n = 0;
  for (const [i, [j0, j1]] of [...cols.entries()].sort((a, b) => a[0] - b[0])) {
    const cx = i * R + 2.5;
    const hintenWand = Z.kante(i, j0, 0, -1) === 'wand';
    const za = j0 * R + (hintenWand ? 1.6 : 0.9), zb = (j1 + 1) * R - 1.0, len = zb - za;
    if (len < 2.5) continue;
    for (const s of [-1, 1]) {
      const L = lokal(S, cx + s * 0.02, 0.06, (za + zb) / 2, s > 0 ? PI / 2 : -PI / 2);
      if (Z.sicht(cx, (za + zb) / 2)) regalSchwerS(L, len, 4.3, 1.1, ware, r, d, art);
    }
    res.belegt.push([cx - 1.15, za, cx + 1.15, zb]);
    // Kopfregal zur Gangseite mit Aktionsware
    const Lk = lokal(S, cx, 0.06, zb + 0.35, 0);
    if (Z.sicht(cx, zb)) { Lk.box(2.2, 1.4, 0.6, 0, 0, 0, G.farbe); Lk.box(2.0, 0.04, 0.5, 0, 0.7, 0.05, '#ffffff'); if (art === 'rad') { SA.helm(Lk, -0.6, 1.4, 0, '#1f6fd1'); SA.helm(Lk, 0, 1.4, 0, '#ffcc00'); SA.helm(Lk, 0.6, 1.4, 0, '#1f1f1f'); } else if (art === 'sportschuhe') { for (let q = 0; q < 4; q++) SA.paar(Lk, -0.75 + q * 0.5, 1.4, 0, SA.SCHUH[q * 2], d); } else if (art === 'sporttextil' || art === 'wintersport') { puppe(Lk.hoch(1.4), -0.5, 0, r, 'sport', art === 'wintersport' ? SA.WINTER : I.PAL.sport); puppe(Lk.hoch(1.4), 0.5, 0, r, 'sport', art === 'wintersport' ? SA.WINTER : I.PAL.sport); } else I.stapel(Lk, 0, 0, 2.0, 0.5, 1.4, art === 'teamsport' ? SA.VEREINE.map((v) => v[0]) : SA.OUT, r, d); }
    res.belegt.push([cx - 1.1, zb, cx + 1.1, zb + 0.7]);
    // Gassenschild
    if (scene && n % 2 === 0 && Z.sicht(cx, za)) haengeschild(S, scene, `Gang ${i + 1}`, cx, 4.0, (za + zb) / 2, { farbe: G.farbe, schrift: G.schrift, hoehe: 0.4, seile: false });
    for (let q = 0; q < Math.max(2, Math.round(len / 3)); q++) for (const s of [-1, 1]) { const p = [cx + s * 1.85, zw(r, za + 0.5, zb - 0.3)]; if (Z.sicht(...p)) res.frei.push(p); }
    n++;
  }
  // Rückwand: hohes Schwerlastregal an der Außenwand
  const rows = new Map();
  for (const c of alle) { const b = rows.get(c.j) ?? [c.i, c.i]; b[0] = Math.min(b[0], c.i); b[1] = Math.max(b[1], c.i); rows.set(c.j, b); }
  const jmin = Math.min(...alle.map((c) => c.j));
  const [i0, i1] = rows.get(jmin);
  if (Z.kante(i0, jmin, 0, -1) === 'wand') {
    const L = lokal(S, (i0 * R + (i1 + 1) * R) / 2, 0.06, jmin * R + 0.05, 0);
    if (Z.sicht((i0 * R + (i1 + 1) * R) / 2, jmin * R + 0.6)) SA.regalSchwer(L, (i1 - i0 + 1) * R - 0.3, 4.4, 1.0, ware, r, d, art === 'rad' || art === 'outdoor' ? {} : { pfosten: '#eceae6', balken: G.farbe });
    res.belegt.push([i0 * R, jmin * R, (i1 + 1) * R, jmin * R + 1.1]);
  }
  // Deckenschild der Abteilung
  if (scene) {
    const vis = alle.filter((c) => Z.sicht(c.i * R + 2.5, c.j * R + 2.5));
    if (vis.length) {
      const x0 = Math.min(...vis.map((c) => c.i)) * R, x1 = (Math.max(...vis.map((c) => c.i)) + 1) * R, z0 = Math.min(...vis.map((c) => c.j)) * R, z1 = (Math.max(...vis.map((c) => c.j)) + 1) * R;
      haengeschild(S, scene, G.name, (x0 + x1) / 2, 4.6, z0 + (z1 - z0) * 0.6, { farbe: G.farbe, schrift: G.schrift, hoehe: Math.min(1.1, Math.max(0.6, (x1 - x0) / 9)) });
    }
  }
  // Personal
  for (let q = 0; q < Math.max(1, Math.round(alle.length / 6)) && res.frei.length; q++) { const [fx, fz] = res.frei.splice(Math.floor(r() * res.frei.length), 1)[0]; figur(S, fx, fz, (r() * 1e9) | 0, q % 2 ? 'lager' : 'verkauf', { ry: r() * PI * 2 }); }
  return res;
}
function regalSchwerS(L, w, h, t, ware, r, d, art) {
  if (art === 'rad' || art === 'outdoor') { SA.regalSchwer(L, w, h, t, ware, r, d); return; }
  // niedrige Gondelgasse in Abteilungsfarbe (Ware bis 2,6 m, kein Lager oben)
  const G = GASSE[art];
  SA.regalSchwer(L, w, 2.6, t * 0.8, ware, r, d, { ebenen: [0.1, 1.3], lagerAb: 9, pfosten: '#eceae6', balken: '#d9d6d0', band: G.farbe });
}

// ================================================================ Fronten
/** Vorderkante je Familie. achse 'z': Front bei z = pos (u = x), 'x': Front bei x = pos (u = z). */
function front(S, scene, achse, a, b, pos, ra, r, d, k) {
  const echt = achse === 'z' ? pos === ra.T : pos === ra.B;
  const box = (l, h, t, u, y, f) => (achse === 'z' ? S.box(l, h, t, u, y, pos - t / 2 + 0.05, f) : S.box(t, h, l, pos - t / 2 + 0.05, y, u, f));
  if (!echt) { box(b - a, 0.08, 0.5, (a + b) / 2, 0.04, '#59626a'); return; }
  const fam = ra.fam, eg = ra.e === 0, mall = ra.mall;
  const L = (u, t = 0) => (achse === 'z' ? lokal(S, u, 0.06, pos - t, 0) : lokal(S, pos - t, 0.06, u, PI / 2));
  const tuerU = achse === 'z' ? (ra.box || fam !== 5 ? [ra.gx * R, ra.gx * R + R] : null) : (fam === 5 || (mall && ra.gz >= 0 && !ra.box) ? [ra.gz * R, ra.gz * R + R] : null);
  const istTuer = (m) => eg && tuerU && m > tuerU[0] && m < tuerU[1];
  // Zylinderecke (Familie 6): gerade Front endet vor der Rundung
  let b2 = b;
  if (fam === 6 && ra.zylR) { const lim = (achse === 'z' ? ra.B : ra.T) - ra.zylR; if (b > lim) b2 = lim; }
  const deko = (u, art, t) => { if (d < 0.35) return; const Ld = L(u, t); const grp = art ?? 'sporttextil'; const pal = { wintersport: SA.WINTER, outdoor: SA.OUT, teamsport: SA.VEREINE.map((v) => v[0]) }[grp] ?? I.PAL.sport; if (grp === 'sportschuhe') { for (let q = 0; q < 3; q++) { Ld.box(0.6, 0.3 + q * 0.25, 0.6, -1.2 + q * 1.2, 0.5, 0, '#ffffff'); SA.schuh(Ld, -1.2 + q * 1.2, 0.8 + q * 0.25, 0, SA.SCHUH[q * 2]); } return; } if (grp === 'rad') { I.fahrrad(Ld, -0.6, 0, r, 0, 0.5); I.fahrrad(Ld, 0.7, 0.1, r, 0, 0.5); return; } for (let q = 0; q < 3; q++) puppe(Ld.hoch(0.5), -1.3 + q * 1.3, zw(r, -0.15, 0.15), r, grp === 'outdoor' ? 'herren' : 'sport', pal, zw(r, -0.4, 0.4)); };
  const artAn = (m) => (achse === 'z' ? ra.artAn(Math.floor(m / R), ra.nz - 1) : ra.artAn(ra.nx - 1, Math.floor(m / R)));
  const eingangTuer = (m, farbe = HS_BLAU) => {
    const Lt = L(m, 0.15);
    Lt.box(4.4, 0.25, 0.4, 0, WH - 0.5, 0, farbe);
    for (const s of [-2.1, 2.1]) Lt.box(0.25, WH - 0.5, 0.3, s, 0, 0, farbe);
    Lt.box(1.9, 2.9, 0.05, -1.0, 0, -0.05, '#2f3d48'); Lt.box(1.9, 2.9, 0.05, 1.3, 0, 0.05, '#2f3d48');
    Lt.box(3.6, 0.02, 2.0, 0, 0, -1.1, '#3a3f45');
  };

  if (mall) { mallFront(S, scene, achse, a, b, pos, ra, r, d, box, L, istTuer, deko, artAn); return; }

  if (fam === 1) {
    // Glas bis unter die Decke, schlanke Pfosten, rote Eckfinne, blaues Vordach am Eingang
    const F = 3.4, ende = b > (achse === 'z' ? ra.B : ra.T) - F - 0.01 ? b - F : b;
    box(ende - a, 0.3, 0.3, (a + ende) / 2, 0.15, '#59636b');
    box(ende - a, WH - 0.35, 0.04, (a + ende) / 2, 0.3 + (WH - 0.35) / 2, GLAS);
    box(ende - a, 0.32, 0.36, (a + ende) / 2, WH - 0.16, '#e3e8ea');
    for (let u = a; u <= ende + 0.01; u += 1.55) if (!istTuer(u)) box(0.1, WH, 0.14, u, WH / 2, '#e6ebed');
    // Eckfinne im Etagenschnitt nur in Brüstungshöhe (voll hoch verdeckt sie die Fläche dahinter)
    if (ende < b) { box(F, 1.25, 0.5, b - F / 2, 0.625, HS_ROT); if (scene && achse === 'z') wandschild(S, scene, 'H', 'x', b - F / 2, 0.66, pos + 0.06, { schrift: '#ffffff', hoehe: 0.8 }); }
    if (eg && tuerU && tuerU[1] <= ende) { const m = (tuerU[0] + tuerU[1]) / 2, Lv = L(m, -1.5); Lv.box(6.4, 0.35, 3.0, 0, 3.9, 0, HS_BLAU); Lv.box(6.4, 0.12, 0.06, 0, 4.0, 1.52, HS_ROT); }
    if (!eg) { box(ende - a, 1.05, 0.04, (a + ende) / 2, 0.6, GLAS); box(ende - a, 0.06, 0.1, (a + ende) / 2, 1.12, '#c9d2d8'); }
    return;
  }
  if (fam === 3) {
    // Blechhalle: Fensterband auf +z, Portal rot, Seitenfront mit niedriger Blechbrüstung
    const blech = '#e4e6e7';
    if (achse === 'x' || !eg) {
      box(b - a, 1.2, 0.3, (a + b) / 2, 0.6, blech);
      for (let u = a + 0.4; u < b; u += 0.8) box(0.2, 1.2, 0.08, u, 0.6, dunkler(blech, 0.04));
      box(b - a, 0.08, 0.36, (a + b) / 2, 1.24, HS_BLAU);
      return;
    }
    for (let u = a; u < b - 0.01; u += R) {
      const m = u + R / 2;
      if (istTuer(m)) {
        box(0.6, WH + 0.6, 0.6, u, (WH + 0.6) / 2, HS_ROT); box(0.6, WH + 0.6, 0.6, u + R, (WH + 0.6) / 2, HS_ROT); box(R + 0.6, 0.6, 0.6, m, WH + 0.3, HS_ROT);
        // Windfang vor der Front
        const Lw = L(m, -1.6); Lw.box(4.2, 3.0, 0.06, 0, 0, 1.6, GLAS); Lw.box(0.06, 3.0, 3.2, -2.1, 0, 0, GLAS); Lw.box(0.06, 3.0, 3.2, 2.1, 0, 0, GLAS); Lw.box(4.4, 0.3, 3.4, 0, 3.0, 0, '#f4f3ef'); Lw.box(1.8, 2.6, 0.04, 0, 0, 1.64, '#2f3d48');
        continue;
      }
      box(0.2, WH, 0.4, u, WH / 2, '#59636b');
      box(R, 0.6, 0.3, m, 0.3, '#7c838a');
      box(R - 0.2, 3.3, 0.04, m, 2.25, GLAS);
      box(R, WH - 3.9, 0.3, m, 3.9 + (WH - 3.9) / 2, blech);
      box(R, 0.12, 0.36, m, 3.95, HS_ROT);
    }
    return;
  }
  if (fam === 2) {
    const [brF, rF] = F2PAL[ra.v];
    if (!eg) {
      box(b - a, 1.35, 0.3, (a + b) / 2, 0.675, brF);
      for (let u = a + 1.25; u < b; u += 1.25) box(0.05, 1.3, 0.34, u, 0.67, dunkler(brF, 0.08));
      box(b - a, 2.5, 0.04, (a + b) / 2, 1.35 + 1.25, GLAS);
      for (let u = a + 0.8; u < b; u += 1.6) box(0.1, 2.5, 0.1, u, 2.6, rF);
      for (let u = a + 0.8; u < b - 1.6; u += 1.6) if (r() < 0.35) { const hh = zw(r, 0.5, 1.6); box(1.44, hh, 0.03, u + 0.8, 3.85 - hh / 2, '#d8d4c8'); }
      box(b - a, WH - 3.85, 0.3, (a + b) / 2, 3.85 + (WH - 3.85) / 2, rF);
      return;
    }
    for (let u = a; u < b - 0.01; u += R) {
      const m = u + R / 2;
      box(0.4, WH, 0.5, u, WH / 2, HS_BLAU);
      box(R, 0.4, 0.5, m, WH - 0.2, HS_BLAU);
      if (istTuer(m)) { eingangTuer(m, HS_ROT); continue; }
      box(R - 0.4, 0.55, 1.7, m, 0.275, '#2b3036');
      box(R - 0.4, 0.04, 1.6, m, 0.57, '#e9e3d8');
      box(R - 0.4, 3.1, 0.04, m, 0.55 + 1.55, GLAS);
      deko(m, artAn(m), 0.85);
    }
    box(0.4, WH, 0.5, b, WH / 2, HS_BLAU);
    return;
  }
  if (fam === 5) {
    const stein = ['#8e8a83', '#9a948a', '#7f7c77', '#a29a8c'][ra.v % 4], holz = ['#b9875a', '#a87549', '#c49466', '#9c6b43'][(ra.v >> 1) % 4];
    if (!eg) {
      for (let u = a + 0.2; u < b; u += 0.42) box(0.26, 1.1, 0.12, u, 0.55, r() < 0.5 ? holz : dunkler(holz, 0.05));
      box(b - a, 0.12, 0.3, (a + b) / 2, 1.16, '#3b3f44');
      box(b - a, 2.2, 0.04, (a + b) / 2, 2.3, GLAS);
      box(b - a, WH - 3.4, 0.3, (a + b) / 2, 3.4 + (WH - 3.4) / 2, holz);
      return;
    }
    const L0 = achse === 'z' ? ra.B : ra.T;
    const portal = achse === 'z' ? [Math.round(L0 * 0.18 / R) * R, Math.round(L0 * 0.18 / R) * R + Math.min(Math.round(L0 * 0.42 / R) * R, 20)] : null;
    for (let u = a; u < b - 0.01; u += R) {
      const m = u + R / 2;
      if (portal && m > portal[0] && m < portal[1]) {
        box(R, 0.45, 0.2, m, 0.22, '#c9b08a'); box(R, WH - 0.5, 0.04, m, 0.45 + (WH - 0.5) / 2, GLAS);
        box(0.18, WH, 0.18, u, WH / 2, '#3b3f44'); box(R, 0.3, 0.3, m, WH - 0.15, '#3b3f44');
        continue;
      }
      if (istTuer(m)) { eingangTuer(m, '#3b3f44'); const Lv = L(m, -1.6); for (const s of [-2.8, 2.8]) Lv.box(0.8, 4.0, 0.8, s, 0, 1.2, stein); Lv.box(7.4, 0.4, 3.4, 0, 4.0, 0.2, holz); continue; }
      // Steinpfeiler, Brüstung und Sturz, dazwischen tief eingeschnittenes Fenster
      box(1.1, WH, 0.6, u + 0.55, WH / 2, stein);
      for (let y = 0.7; y < WH; y += 0.7) box(1.12, 0.04, 0.62, u + 0.55, y, dunkler(stein, 0.08));
      box(R - 1.1, 0.6, 0.6, m + 0.55, 0.3, stein); box(R - 1.1, 0.12, 0.7, m + 0.55, 0.62, heller(stein, 0.06));
      box(R - 1.1, WH - 3.9, 0.6, m + 0.55, 3.9 + (WH - 3.9) / 2, stein); box(R - 1.1, 0.04, 0.62, m + 0.55, 4.2, dunkler(stein, 0.08));
      box(R - 1.1, 3.2, 0.04, m + 0.55, 0.68 + 1.6, GLAS); box(0.08, 3.2, 0.1, m + 0.55, 2.28, '#3b3f44');
      box(R - 1.1, 0.5, 1.4, m + 0.55, 0.25, '#c9b08a');
      deko(m + 0.55, artAn(m), 0.75);
    }
    return;
  }
  if (fam === 6) {
    const akz = F6AKZ[ra.v], putz = '#efe8dc';
    if (!eg) {
      box(b2 - a, 0.9, 0.3, (a + b2) / 2, 0.45, putz);
      for (let u = a + 1.5; u < b2 - 0.5; u += 3.0) { box(1.7, 2.0, 0.04, u, 1.9, GLAS); box(2.0, 0.15, 0.34, u, 0.83, akz); box(2.0, 0.15, 0.34, u, 2.97, akz); box(0.1, 2.0, 0.08, u, 1.9, '#eef1f2'); }
      box(b2 - a, 0.6, 0.3, (a + b2) / 2, WH - 0.3, putz);
    } else for (let u = a; u < b2 - 0.01; u += R) {
      const m = Math.min(u + R / 2, b2 - 0.5), uE = Math.min(u + R, b2);
      box(0.45, WH, 0.4, u, WH / 2, akz);
      box(uE - u, 0.6, 0.35, (u + uE) / 2, 0.3, '#b8ab98');
      box(uE - u, WH - 4.0, 0.35, (u + uE) / 2, 4.0 + (WH - 4.0) / 2, putz);
      box(uE - u, 0.3, 0.4, (u + uE) / 2, 4.15, akz);
      if (istTuer(m)) { eingangTuer(m, akz); continue; }
      box(uE - u - 0.45, 3.4, 0.04, (u + uE) / 2, 0.6 + 1.7, GLAS);
      if (uE - u > 3) deko((u + uE) / 2, artAn(m), 0.75);
    }
    // Glaszylinder an der Ecke (nur einmal, bei achse 'z')
    if (achse === 'z' && b2 < b && ra.zylR) {
      const Rz = ra.zylR, cx = ra.B - Rz, cz = ra.T - Rz;
      const g = new THREE.CylinderGeometry(Rz - 0.05, Rz - 0.05, WH - 0.3, 16, 1, true, 0, PI / 2); g.translate(cx, 0.3 + (WH - 0.3) / 2, cz); S.add(g, GLAS);
      const sockel = new THREE.CylinderGeometry(Rz, Rz, 0.3, 16, 1, false, 0, PI / 2); sockel.translate(cx, 0.15, cz); S.add(sockel, '#b8ab98');
      const kranz = new THREE.CylinderGeometry(Rz + 0.1, Rz + 0.1, 0.3, 16, 1, true, 0, PI / 2); kranz.translate(cx, WH - 0.15, cz); S.add(kranz, '#eef1f2');
      for (let q = 0; q <= 6; q++) { const an = (q / 6) * PI / 2; S.box(0.12, WH, 0.12, cx + Math.sin(an) * (Rz - 0.05), WH / 2, cz + Math.cos(an) * (Rz - 0.05), eg ? akz : '#eef1f2'); }
      if (!eg) { const gl = new THREE.CylinderGeometry(Rz - 0.1, Rz - 0.1, 0.06, 16, 1, true, 0, PI / 2); gl.translate(cx, 1.1, cz); S.add(gl, '#c9d2d8'); }
    }
    return;
  }
}

/** Ladenfront zur Mall-Passage bzw. Galerie: Rahmen, Glas bis 3,6 m, Blende mit Logo, offene Eingänge mit Sicherungsanlage. */
function mallFront(S, scene, achse, a, b, pos, ra, r, d, box, L, istTuer, deko, artAn) {
  const rahmen = [HS_BLAU, '#f4f3ef', '#1f2328', HS_BLAU][ra.v % 4], band = rahmen === HS_BLAU ? '#f4f3ef' : HS_BLAU;
  const eg = ra.e === 0;
  const tuerOffen = (m) => istTuer(m) || (!eg && achse === 'z' && Math.abs(m - (ra.gx * R + 2.5)) < 1);
  box(b - a, 0.08, 0.6, (a + b) / 2, 0.04, '#cfd3d6');
  box(b - a, WH - 3.6, 0.5, (a + b) / 2, 3.6 + (WH - 3.6) / 2, rahmen);
  box(b - a + 0.02, 0.12, 0.54, (a + b) / 2, 3.66, HS_ROT);
  for (let u = a; u < b - 0.01; u += R) {
    const m = u + R / 2;
    box(0.35, 3.6, 0.45, u, 1.8, rahmen);
    if (tuerOffen(m)) {
      for (const s of [-1.5, 1.5]) { const Lt = L(m + s, 0.6); Lt.box(0.22, 1.5, 0.5, 0, 0, 0, '#e9ecee'); Lt.box(0.24, 0.1, 0.52, 0, 1.5, 0, HS_ROT); }
      continue;
    }
    box(R - 0.35, 0.3, 0.3, m, 0.15, '#3a4148');
    box(R - 0.35, 3.3, 0.04, m, 0.3 + 1.65, GLAS);
    if (((u / R) | 0) % 2 === 0) { box(R - 0.6, 0.35, 1.2, m, 0.32, '#ffffff'); deko(m, artAn(m), 0.6); }
  }
  box(0.35, 3.6, 0.45, b, 1.8, rahmen);
  if (scene) {
    const w = b - a;
    if (w > 9) {
      const u = (a + b) / 2, y = 3.6 + (WH - 3.6) / 2 + 0.02, hh = Math.min(0.65, WH - 3.75);
      const Lq = achse === 'z' ? { x: u, z: pos + 0.06 } : { x: pos + 0.06, z: u };
      if (achse === 'z') { S.box(hh * 1.3, hh * 1.3, 0.1, u - 3.6, y, pos + 0.1, HS_ROT); wandschild(S, scene, 'H', 'x', u - 3.6, y, pos + 0.16, { schrift: '#ffffff', hoehe: hh }); wandschild(S, scene, 'HARTWIG SPORT', 'x', u + 0.4, y, Lq.z, { schrift: band, hoehe: hh * 0.8 }); }
      else { S.box(0.1, hh * 1.3, hh * 1.3, pos + 0.1, y, u - 3.6, HS_ROT); wandschild(S, scene, 'H', 'z', u - 3.6, y, pos + 0.16, { schrift: '#ffffff', hoehe: hh }); wandschild(S, scene, 'HARTWIG SPORT', 'z', u + 0.4, y, Lq.x, { schrift: band, hoehe: hh * 0.8 }); }
    }
  }
}

// ================================================================ Außenraum
/** Gehweg und Straße vor den beiden Fronten (wie Warenhaus), dazu Radständer und Fahnen von Hartwig Sport. */
function strasse(S, ax0, az0, ax1, az1, ra, r, d) {
  const gw = 4.5, st = 9, yg = -0.15;
  S.box(ax1 - ax0 + gw, 0.3, gw, (ax0 + ax1 + gw) / 2, yg, az1 + gw / 2, '#d8d4cb');
  S.box(gw, 0.3, az1 - az0, ax1 + gw / 2, yg, (az0 + az1) / 2, '#d8d4cb');
  for (let x = ax0 + 2; x < ax1 + gw; x += 2.5) S.box(0.04, 0.01, gw, x, yg + 0.15, az1 + gw / 2, '#c9c4ba');
  for (let z = az0 + 2; z < az1; z += 2.5) S.box(gw, 0.01, 0.04, ax1 + gw / 2, yg + 0.15, z, '#c9c4ba');
  S.box(ax1 - ax0 + gw + 0.3, 0.32, 0.3, (ax0 + ax1 + gw) / 2, yg, az1 + gw + 0.15, '#bdb8ae');
  S.box(0.3, 0.32, az1 - az0 + gw, ax1 + gw + 0.15, yg, (az0 + az1 + gw) / 2, '#bdb8ae');
  S.box(ax1 - ax0 + gw + st, 0.2, st, (ax0 + ax1 + gw + st) / 2, -0.35, az1 + gw + st / 2, '#8d939a');
  S.box(st, 0.2, az1 - az0 + gw, ax1 + gw + st / 2, -0.35, (az0 + az1 + gw) / 2, '#8d939a');
  for (let x = ax0 + 1; x < ax1 + gw - 2; x += 6) S.box(3, 0.02, 0.25, x, -0.24, az1 + gw + st / 2, '#f2f1ec');
  for (let z = az0 + 1; z < az1 + gw - 2; z += 6) S.box(0.25, 0.02, 3, ax1 + gw + st / 2, -0.24, z, '#f2f1ec');
  for (let q = 0; q < 6; q++) S.box(0.6, 0.02, 3.5, ax1 + gw + 1.2 + q * 1.2, -0.24, az1 + gw - 2.2, '#f6f5f0');
  const tuerX = ra.gx * R + 2.5;
  for (let x = ax0 + 4; x < ax1 - 2; x += 11) { if (Math.abs(x - tuerX) < 4) continue; baum(S, x, az1 + gw - 1.0, r, 0.85); S.box(1.2, 0.05, 1.2, x, yg + 0.16, az1 + gw - 1.0, '#9c8a6e'); }
  for (let z = az0 + 6; z < az1 - 2; z += 11) { baum(S, ax1 + gw - 1.0, z, r, 0.85); S.box(1.2, 0.05, 1.2, ax1 + gw - 1.0, yg + 0.16, z, '#9c8a6e'); }
  // Radständer mit Rädern und drei Fahnen neben dem Eingang
  if (tuerX > ax0 && tuerX < ax1) {
    const L = lokal(S, tuerX + 5.5, 0.15, az1 + 2.6, 0);
    for (let q = 0; q < 5; q++) { L.geo(new THREE.TorusGeometry(0.35, 0.04, 4, 10, PI), -1.6 + q * 0.8, 0, 0, '#9aa3aa'); if (q % 2 === 0 || d > 0.6) I.fahrrad(L, -1.6 + q * 0.8, 0, r, PI / 2); }
    for (let q = 0; q < 3; q++) { const fx = tuerX - 5 - q * 1.4; S.box(0.08, 6, 0.08, fx, 3, az1 + gw - 0.5, '#d9dcde'); S.box(0.06, 2.0, 0.9, fx, 4.8, az1 + gw - 0.5 + 0.48, q === 1 ? HS_BLAU : HS_ROT); }
  }
  const auto = (x, z, quer) => {
    const f = waehle(r, ['#d04a3f', '#2f63b5', '#f1f1ee', '#2a2d31', '#e0b23c', '#8c9aa6', '#5b8f5a']), ry = quer ? PI / 2 : 0;
    S.box(4.3, 0.75, 1.85, x, 0.4, z, f, ry);
    S.box(2.4, 0.65, 1.7, x + (quer ? 0 : -0.2), 1.1, z + (quer ? -0.2 : 0), '#9bb7c7', ry);
    S.box(2.2, 0.08, 1.6, x + (quer ? 0 : -0.2), 1.47, z + (quer ? -0.2 : 0), f, ry);
    for (const s of [-1.35, 1.35]) for (const t of [-0.85, 0.85]) S.add(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 10).rotateX(PI / 2).rotateY(ry).translate(x + (quer ? t : s), 0.1, z + (quer ? s : t)), '#1f2328');
  };
  westAuto(S, ax0 + (ax1 - ax0) * 0.35, az1 + gw + 2.6, 0, 'pkw', null, -0.25);
  if (ax1 - ax0 > 25) westAuto(S, ax0 + (ax1 - ax0) * 0.75, az1 + gw + 6.3, PI, 'kombi', null, -0.25);
  westAuto(S, ax1 + gw + 6.3, az0 + (az1 - az0) * 0.4, PI / 2, 'kompakt', null, -0.25);
  const n = Math.round(0.7 * ((ax1 - ax0) + (az1 - az0)) / 4);
  for (let q = 0; q < n; q++) {
    const vorne = r() < (ax1 - ax0) / ((ax1 - ax0) + (az1 - az0));
    if (vorne) figur(S, zw(r, ax0 + 1, ax1 + gw - 1), az1 + zw(r, 0.8, gw - 1.6), q + 500, 'kunde', { y: yg + 0.15, ry: r() < 0.5 ? PI / 2 : -PI / 2, pose: r() < 0.7 ? 'gehen' : 'tasche' });
    else figur(S, ax1 + zw(r, 0.8, gw - 1.6), zw(r, az0 + 1, az1), q + 700, 'kunde', { y: yg + 0.15, ry: r() < 0.5 ? 0 : PI, pose: r() < 0.7 ? 'gehen' : 'tasche' });
  }
}
/** Parkplatz der Fachmarkt-Box vor +z, Lieferzone und Fußweg vor +x. */
function parkplatz(S, scene, ax0, az0, ax1, az1, ra, r, d) {
  const gw = 3.4, P = 15, yg = -0.15;
  // Gehweg unter dem Vordach
  S.box(ax1 - ax0 + gw, 0.3, gw, (ax0 + ax1 + gw) / 2, yg, az1 + gw / 2, '#d8d4cb');
  S.box(gw, 0.3, az1 - az0, ax1 + gw / 2, yg, (az0 + az1) / 2, '#d8d4cb');
  S.box(ax1 - ax0 + gw + 0.3, 0.32, 0.3, (ax0 + ax1 + gw) / 2, yg, az1 + gw + 0.15, '#bdb8ae');
  S.box(0.3, 0.32, az1 - az0 + gw, ax1 + gw + 0.15, yg, (az0 + az1 + gw) / 2, '#bdb8ae');
  // Vordach mit Stützen
  { const tx = ra.gx * R + 2.5, v0 = Math.max(ax0, tx - 8), v1 = Math.min(ax1, tx + 8);
    if (v1 > v0) { S.box(v1 - v0, 0.35, 2.9, (v0 + v1) / 2, 4.75, az1 + 1.45, '#f4f3ef'); S.box(v1 - v0, 0.15, 0.06, (v0 + v1) / 2, 4.75, az1 + 2.92, HS_ROT); for (const x of [v0 + 0.5, v1 - 0.5]) S.box(0.2, 4.6, 0.2, x, 2.3, az1 + 2.5, '#5f676e'); } }
  // Asphalt
  S.box(ax1 - ax0 + gw + 8, 0.2, P, (ax0 + ax1 + gw + 8) / 2, -0.35, az1 + gw + P / 2, '#868c93');
  S.box(8, 0.2, az1 - az0 + gw, ax1 + gw + 4, -0.35, (az0 + az1 + gw) / 2, '#868c93');
  for (let x = ax0 + 1; x < ax1 + gw; x += 2.6) { S.box(0.12, 0.02, 5, x, -0.24, az1 + gw + 3.0, '#f2f1ec'); S.box(0.12, 0.02, 5, x, -0.24, az1 + gw + P - 2.8, '#f2f1ec'); }
  S.box(ax1 - ax0 + gw, 0.02, 0.15, (ax0 + ax1 + gw) / 2, -0.24, az1 + gw + P / 2, '#f2f1ec');
  for (let q = 0; q < 6; q++) S.box(0.6, 0.02, 3.0, ra.gx * R + 0.5 + q * 0.9, -0.24, az1 + gw + P / 2, '#f6f5f0');
  const typen = ['pkw', 'pkw', 'kombi', 'kompakt', 'kombi'];
  for (let x = ax0 + 2.3; x < ax1 + gw - 1; x += 2.6) {
    if (r() < 0.62) westAuto(S, x, az1 + gw + 3.0, r() < 0.5 ? PI / 2 : -PI / 2, waehle(r, typen), null, -0.25);
    if (r() < 0.5) westAuto(S, x, az1 + gw + P - 2.8, r() < 0.5 ? PI / 2 : -PI / 2, waehle(r, typen), null, -0.25);
  }
  westAuto(S, ax1 + gw + 4, az0 + (az1 - az0) * 0.55, PI / 2, 'lkw', HS_BLAU, -0.25);
  // Wagenbox auf dem Parkplatz
  { const L = lokal(S, ra.gx * R + 9, 0.0, az1 + gw + P / 2 + 1.2, 0); L.box(3.6, 0.04, 1.4, 0, -0.15, 0, '#bdb8ae'); L.box(3.6, 2.2, 0.06, 0, -0.15, -0.65, '#9aa3aa'); L.box(3.8, 0.1, 1.6, 0, 2.05, 0, HS_BLAU); for (let q = 0; q < (d < 0.5 ? 3 : 7); q++) SA.einkaufswagen(L.hoch(-0.15), -1.4 + q * 0.42, 0, 0); }
  // Lieferzone an +x
  for (let k = 0; k < 4; k++) S.box(1.2, 0.02, 0.4, ax1 + gw + 4, -0.24, az0 + 3 + k * 1.6, '#f2c14e');
  const n = Math.round(0.7 * (ax1 - ax0) / 5);
  for (let q = 0; q < n; q++) figur(S, zw(r, ax0 + 1, ax1 - 1), az1 + zw(r, 0.6, gw - 0.6), q + 500, 'kunde', { y: yg + 0.15, ry: r() < 0.5 ? PI / 2 : -PI / 2, pose: r() < 0.5 ? 'gehen' : 'tragen' });
  for (let q = 0; q < 2; q++) { const L = lokal(S, ra.gx * R + zw(r, -4, 6), -0.24, az1 + gw + zw(r, 6, 9), zw(r, 0, 6)); SA.einkaufswagen(L, 0, 0, 0); figur(S, ...L.P(-0.9, 0), q + 590, 'kunde', { y: -0.24, ry: L.rot + PI / 2, pose: 'gehen' }); }
}
/** Mall-Passage (EG) bzw. Galerie mit Luftraum (OG) vor beiden Fronten, Nachbarläden angedeutet, Bänke und Pflanzen. */
function passage(S, scene, ax0, az0, ax1, az1, ra, r, d, og) {
  const P = 9, yb = 0;
  const steinA = '#ece7de', steinB = '#ddd6ca';
  const flaecheP = (x0, z0, x1, z1) => {
    S.box(x1 - x0, 0.5, z1 - z0, (x0 + x1) / 2, -0.25, (z0 + z1) / 2, '#59626a');
    S.box(x1 - x0, 0.05, z1 - z0, (x0 + x1) / 2, 0.025, (z0 + z1) / 2, steinA);
    if (d > 0.35) for (let x = x0; x < x1 - 0.1; x += 2.5) for (let z = z0; z < z1 - 0.1; z += 2.5) if (((x + z) / 2.5 | 0) % 2) S.box(Math.min(2.5, x1 - x), 0.012, Math.min(2.5, z1 - z), x + Math.min(2.5, x1 - x) / 2, 0.055, z + Math.min(2.5, z1 - z) / 2, steinB);
  };
  if (!og) {
    flaecheP(ax0, az1, ax1 + P, az1 + P);
    flaecheP(ax1, az0, ax1 + P, az1);
    // Fries an der Schnittkante
    S.box(ax1 - ax0 + P, 0.06, 0.3, (ax0 + ax1 + P) / 2, 0.06, az1 + P - 0.15, '#c9bba5');
    S.box(0.3, 0.06, az1 - az0 + P, ax1 + P - 0.15, 0.06, (az0 + az1 + P) / 2, '#c9bba5');
    // Möblierung: Bänke mit Pflanztrögen, Bäume in Kübeln, Infostele
    const insel = (x, z, quer) => {
      const L = lokal(S, x, 0.06, z, quer ? PI / 2 : 0);
      L.box(3.4, 0.55, 1.4, 0, 0, 0, '#d6cfc3'); L.box(3.2, 0.1, 1.2, 0, 0.55, 0, '#6b5a48');
      for (let q = 0; q < 3; q++) L.kugel(0.45, -1.1 + q * 1.1, 0.95, 0, q % 2 ? '#5f9a56' : '#6fa860');
      L.box(0.12, 2.6, 0.12, 0, 0.55, 0, '#6b4a32'); L.kugel(1.1, 0, 3.4, 0, '#5f9a56', 1);
      for (const s of [-1, 1]) { L.box(2.6, 0.42, 0.45, 0, 0, s * 0.95, '#b98d61'); }
      if (r() < 0.8) figur(S, ...L.P(-0.6, 0.95), (r() * 1e9) | 0, 'kunde', { y: 0.06, ry: L.rot, pose: 'sitzen' });
    };
    for (let x = ax0 + 6; x < ax1 - 2; x += 14) insel(x, az1 + P / 2 + 0.6, false);
    for (let z = az0 + 7; z < az1 - 2; z += 14) insel(ax1 + P / 2 + 0.6, z, true);
    { const L = lokal(S, ax1 + 2.2, 0.06, az1 + 2.2, PI / 4); L.box(0.7, 2.2, 0.3, 0, 0, 0, '#2b3a4a'); L.box(0.56, 1.5, 0.02, 0, 0.5, 0.16, '#f4f0ea'); for (let q = 0; q < 5; q++) L.box(0.44, 0.14, 0.02, 0, 0.6 + q * 0.27, 0.17, ['#d23c32', '#1f6fd1', '#38b86b', '#e0b23c', '#8c5a8f'][q]); }
  } else {
    // Galerie: Laufgang 4 m, Glasgeländer, Luftraum mit Blick auf das Erdgeschoss
    const G = 4;
    flaecheP(ax0, az1, ax1 + G, az1 + G);
    flaecheP(ax1, az0, ax1 + G, az1);
    S.box(ax1 - ax0 + G, 1.05, 0.05, (ax0 + ax1 + G) / 2, 0.58, az1 + G - 0.1, GLAS); S.box(ax1 - ax0 + G, 0.07, 0.12, (ax0 + ax1 + G) / 2, 1.12, az1 + G - 0.1, '#c9d2d8');
    S.box(0.05, 1.05, az1 - az0 + G, ax1 + G - 0.1, 0.58, (az0 + az1 + G) / 2, GLAS); S.box(0.12, 0.07, az1 - az0 + G, ax1 + G - 0.1, 1.12, (az0 + az1 + G) / 2, '#c9d2d8');
    S.box(ax1 - ax0 + G, 0.6, 0.2, (ax0 + ax1 + G) / 2, -0.3, az1 + G + 0.0, '#e9e4dc');
    S.box(0.2, 0.6, az1 - az0 + G, ax1 + G, -0.3, (az0 + az1 + G) / 2, '#e9e4dc');
    // Erdgeschoss im Luftraum
    const yu = -HUB;
    S.box(ax1 - ax0 + P, 0.1, P - G, (ax0 + ax1 + P) / 2, yu, az1 + G + (P - G) / 2, steinB);
    S.box(P - G, 0.1, az1 - az0 + G, ax1 + G + (P - G) / 2, yu, (az0 + az1 + G) / 2, steinB);
    for (let x = ax0 + 1.25; x < ax1 + P; x += 2.5) S.box(1.2, 0.012, P - G, x, yu + 0.06, az1 + G + (P - G) / 2, steinA);
    for (let q = 0; q < Math.round((ax1 - ax0) / 6); q++) figur(S, zw(r, ax0 + 1, ax1 + P - 1), az1 + G + zw(r, 1, P - G - 0.5), q + 880, 'kunde', { y: yu + 0.05, ry: r() * 6, pose: r() < 0.6 ? 'gehen' : 'tasche' });
    for (let x = ax0 + 6; x < ax1; x += 14) { const L = lokal(S, x, yu + 0.05, az1 + G + 2.5, 0); L.box(2.8, 0.5, 1.2, 0, 0, 0, '#d6cfc3'); for (let q = 0; q < 3; q++) L.kugel(0.45, -0.9 + q * 0.9, 0.9, 0, '#5f9a56'); L.box(0.12, 2.6, 0.12, 0, 0.5, 0, '#6b4a32'); L.kugel(1.2, 0, 3.6, 0, '#6fa860', 1); }
    for (let x = ax0 + 4; x < ax1 - 2; x += 9) { SA.bank(lokal(S, x, 0.06, az1 + 2.8, 0), 0, 0, 2.2, 0, '#b98d61', '#9c7650'); }
    // Banner im Luftraum
    for (let x = ax0 + 8; x < ax1; x += 16) { S.box(0.04, 3.0, 0.04, x, 3.5, az1 + G + 2, '#9aa3aa'); S.box(1.6, 2.6, 0.04, x, 1.6, az1 + G + 2, x % 2 ? HS_ROT : '#1f6fd1'); }
  }
  // Nachbarläden an den Passagenenden (Fronten zeigen zur Passage)
  const laeden = [['Optik Brandt', '#2f6f8f'], ['Café Bohne', '#6b4f3a'], ['Buchwelt', '#8c3b3b'], ['Mode Kessler', '#2b2b2b'], ['Handy-Ecke', '#1f7f86']];
  const lad = (x0, z0, wl, achse, k) => {
    const [name, f] = laeden[k % laeden.length], t = 8;
    const L = achse === 'z' ? lokal(S, x0 + wl / 2, 0, z0, 0) : lokal(S, x0, 0, z0 + wl / 2, PI / 2);
    // lokal: Front bei z = 0 (zur Passage), Laden nach -z, Breite entlang x
    L.box(wl, 0.5, t, 0, -0.5, -t / 2, '#59626a');
    L.box(wl, 0.05, t, 0, 0, -t / 2, '#e4ddd1');
    L.box(wl, WH, 0.3, 0, 0, -t, '#ece8e1');
    L.box(0.3, WH, t, achse === 'z' ? -wl / 2 + 0.15 : wl / 2 - 0.15, 0, -t / 2, '#e6e2da');
    L.box(wl, WH - 3.4, 0.4, 0, 3.4, -0.2, f);
    L.box(wl - 0.4, 3.1, 0.04, 0, 0.3, -0.2, GLAS);
    L.box(wl, 0.3, 0.3, 0, 0, -0.2, '#3a4148');
    for (let q = 0; q < 2; q++) L.box(1.4, 1.7, 0.5, -1.6 + q * 3.0, 0, -t + 0.5, waehle(r, ['#c9d2d8', '#e8dcc6', '#b98d61']));
    L.box(1.6, 0.9, 0.8, 0, 0, -3.5, '#ffffff');
    figur(S, ...L.P(0.6, -2.2), 1500 + k, 'kunde', { y: 0.06, ry: L.rot + PI });
    if (scene) { if (achse === 'z') wandschild(S, scene, name, 'x', x0 + wl / 2, 4.0, z0 + 0.02, { schrift: '#ffffff', hoehe: 0.5 }); else wandschild(S, scene, name, 'z', z0 + wl / 2, 4.0, x0 + 0.02, { schrift: '#ffffff', hoehe: 0.5 }); }
  };
  // Nachbarläden an der Passage, bündig an unseren Rückwänden (links bei x < 0, rechts bei z < 0)
  if (!og && ax0 === 0) { flaecheP(-7, az1, 0, az1 + P); S.box(7, 0.06, 0.3, -3.5, 0.06, az1 + P - 0.15, '#c9bba5'); lad(-7, az1, 7, 'z', 1 + ra.v); }
  if (!og && az0 === 0) { flaecheP(ax1, -7, ax1 + P, 0); S.box(0.3, 0.06, 7, ax1 + P - 0.15, 0.06, -3.5, '#c9bba5'); lad(ax1, -7, 7, 'x', 3 + ra.v); }
  // Passanten
  const n = Math.round(0.7 * ((ax1 - ax0) + (az1 - az0)) / (og ? 5 : 3.5));
  const tiefe = og ? 3.2 : P - 0.8;
  for (let q = 0; q < n; q++) {
    const vorne = r() < (ax1 - ax0) / ((ax1 - ax0) + (az1 - az0));
    if (vorne) figur(S, zw(r, ax0 + 1, ax1 + 3), az1 + zw(r, 0.6, tiefe), q + 500, r() < 0.12 ? 'kind' : 'kunde', { y: 0.05, ry: r() < 0.5 ? PI / 2 : -PI / 2, pose: r() < 0.6 ? 'gehen' : 'tasche' });
    else figur(S, ax1 + zw(r, 0.6, tiefe), zw(r, az0 + 1, az1), q + 700, 'kunde', { y: 0.05, ry: r() < 0.5 ? 0 : PI, pose: r() < 0.6 ? 'gehen' : 'tasche' });
  }
}
