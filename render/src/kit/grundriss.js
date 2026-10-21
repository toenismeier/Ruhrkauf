// Komplette Etage eines Hauses als aufgeschnittenes Puppenhaus (Rückwände -x/-z stehen, Front +x/+z offen).
//
// Grundriss im 5-m-Raster:
// - Rolltreppenhalle in der Mitte (Kern 10 × 10 m mit Lichthof), bei größeren Etagen mit umlaufendem Hallenring (Naturstein).
// - Hauptgang (heller Belag): Quergang vor dem Kern über die ganze Breite, Eingangsgang vom Kern zur Straßenfront.
// - Nebenräume an der Rückwand: Treppenhäuser in den Ecken, Lager, WC/Personal, Aufzug am Hallenring.
// - Abteilungen als zusammenhängende Flächen aus ganzen Zellenspuren (quer zum Hauptgang), Größe nach m², im Umlauf
//   ab dem Eingang angeordnet (EG: Beauty und Accessoires zuerst). Inhalt aus abteilung.js.
// - EG: Schaufenster mit Dekoration zur Straße, Eingänge, Gehweg und Straße. OG: Brüstung mit Glasgeländer.
import { THREE, rng, zw, waehle, Sammler, dunkler, heller, baum, textMaterial } from './basis.js';
import {
  RASTER, WANDHOEHE, vorbereiten, lokal, rueckwand, stuetze, rolltreppenKern, aufzug, treppenhaus, lager,
  haengeschild, wandschild, figur, boden, GLAS, kassentresen, infoCounter, puppe,
} from './innen.js';
import * as I from './innen.js';
import { flaeche, fremdflaeche, abteilungsArt, ABT, schirmTisch, pflanzentrog } from './abteilung.js';
import { sportEtage } from './sportgrundriss.js';
import { farbeGeneration } from './moebel/generationen.js';
import { NAME_SCHWESTER, FARBE_SCHWESTER } from './schwesterhaus.js';

const R = RASTER;
const FASSADE = ['#efe4c9', '#e3d3bd', '#ece5d7', '#d3d9de', '#b9785e', '#e8dfcf', '#c9b8a0', '#dde1e4'];
const GANG = { a: '#f2f1ee', b: '#dedcd7', m: 'fliese' };
const HALLE = { a: '#e8e1d4', b: '#d6cdbd', c: '#c4b8a4', m: 'platten' };
const SCHWESTER_BODEN = { a: '#cfc6b4', b: '#c5bba9', m: 'fliese' };

/** Maße eines Hauses im 5-m-Raster (wie beim Außengebäude). */
export function masse(haus) {
  const gf = haus.grundflaecheQm;
  const B = Math.max(15, Math.round(Math.sqrt(gf * 1.5) / 5) * 5);
  const T = Math.max(15, Math.round(gf / B / 5) * 5);
  return { B, T, nx: B / R, nz: T / R };
}

/** Feste Infrastruktur: Kern, Hallenring, Gänge, Treppenhäuser, Lager, WC, Aufzug. Liefert Rasterbelegung. */
export function raster(haus, etageNr) {
  const { B, T, nx, nz } = masse(haus);
  const typ = Array.from({ length: nx }, () => Array(nz).fill(null));
  const setz = (i, j, t) => { if (i >= 0 && j >= 0 && i < nx && j < nz && !typ[i][j]) typ[i][j] = t; };
  const kx = Math.max(1, Math.min(nx - 3, Math.floor(nx / 2) - 1)), kz = Math.max(1, Math.min(nz - 2, Math.floor(nz / 2) - 1));
  for (let i = kx; i < kx + 2; i++) for (let j = kz; j < kz + 2; j++) typ[i][j] = 'kern';
  const ring = haus.kette !== 'schwester' && nx >= 8 && nz >= 7;
  if (ring) for (let i = kx - 1; i <= kx + 2; i++) for (let j = kz - 1; j <= kz + 1; j++) setz(i, j, 'halle');
  const gz = Math.min(nz - 1, kz + 2), gx = kx;
  if (gz > kz + 1) for (let i = 0; i < nx; i++) setz(i, gz, 'gang');
  for (let j = gz + 1; j < nz; j++) setz(gx, j, 'gang');
  // Nebenräume an der Rückwand
  if (nz >= 5) { setz(0, 0, 'treppe'); setz(0, 1, 'treppe2'); }
  const lw = Math.max(1, Math.min(4, Math.round(nx * 0.2)));
  for (let i = 1; i <= lw; i++) setz(i, 0, 'lager');
  if (nx >= 6 && nz >= 4) { setz(nx - 1, 0, 'treppe'); setz(nx - 1, 1, 'treppe2'); }
  if (nx >= 8) setz(nx - 2, 0, 'wc');
  if (ring) typ[kx - 1][kz] = 'aufzug'; else setz(kx - 1, kz, 'aufzug');
  // Nebengänge: teilen breite Blöcke in Shopblöcke von höchstens rund 400 m² (drei bis vier Spuren)
  const bl = ring ? [[0, kx - 1, 0, gz], [kx + 3, nx, 0, gz], [0, gx, gz + 1, nz], [gx + 1, nx, gz + 1, nz]] : [[0, kx, 0, gz], [kx + 2, nx, 0, gz], [0, gx, gz + 1, nz], [gx + 1, nx, gz + 1, nz]];
  for (const [a, b, c, e] of bl) {
    const w = b - a, tief = e - c;
    if (w < 6 || w * tief < 20) continue;
    const n = Math.round(w / 4.5);
    for (let q = 1; q < n; q++) { const i = a + Math.round((q * w) / n); for (let j = c; j < e; j++) setz(i, j, 'neben'); }
  }
  return { B, T, nx, nz, typ, kx, kz, gx, gz, ring, schwester: haus.kette === 'schwester' };
}

/** Große Flächen in Fachabteilungen teilen (Accessoires: Schuhe, Lederwaren, Schmuck, Strümpfe; Wohnen: Living, Haushalt, Elektro). */
export function unterteilen(fl, etageNr) {
  const out = [];
  for (const f of fl) {
    const art = abteilungsArt(f);
    const fremd = f.konzept && !['eigen', 'kommission'].includes(f.konzept);
    const teil = (liste) => liste.forEach(([a, w], k) => out.push({ ...f, id: `${f.id ?? 'f'}-${k}`, qm: f.qm * w, art: a }));
    if (!fremd && art === 'accessoires' && f.qm >= 1000) teil([['accessoires', 0.45], ['lederwaren', 0.22], ['schmuck', 0.2], ['strumpf', 0.13]]);
    else if (!fremd && art === 'accessoires' && f.qm >= 600) teil([['accessoires', 0.5], ['lederwaren', 0.25], ['schmuck', 0.25]]);
    else if (!fremd && art === 'wohnen' && f.qm >= 900) teil([['wohnen', 0.42], ['haushalt', 0.38], ['elektro', 0.2]]);
    else if (!fremd && art === 'wohnen' && f.qm >= 600) teil([['wohnen', 0.5], ['haushalt', 0.5]]);
    else out.push({ ...f, art });
  }
  if (etageNr === 0) {
    const prio = { beauty: 0, schmuck: 1, lederwaren: 2, strumpf: 3, accessoires: 4 };
    out.sort((a, b) => (prio[a.art] ?? 9) - (prio[b.art] ?? 9));
  }
  return out;
}

/** Zonen: Flächen der Etage als zusammenhängende Spurenbündel im Umlauf ab dem Eingang, Größe proportional zu m². */
export function zonen(haus, etageNr, ra) {
  const { nx, nz, typ, kx, kz, gx, gz, ring } = ra;
  let fl = unterteilen(haus.flaechen.filter((f) => f.etage === etageNr && f.qm >= 10), etageNr);
  const blocks = ring
    ? [[gx + 1, nx, gz + 1, nz, 1], [kx + 3, nx, 0, gz, -1], [kx - 1, kx + 3, 0, kz - 1, -1], [0, kx - 1, 0, gz, -1], [0, gx, gz + 1, nz, 1]]
    : [[gx + 1, nx, gz + 1, nz, 1], [kx + 2, nx, 0, gz, -1], [kx, kx + 2, 0, kz, -1], [0, kx, 0, gz, -1], [0, gx, gz + 1, nz, 1]];
  const vergeben = Array.from({ length: nx }, () => Array(nz).fill(false));
  let spuren = [];
  for (const [a, b, c, e, dir] of blocks) {
    const is = []; for (let i = a; i < b; i++) is.push(i);
    if (dir < 0) is.reverse();
    for (const i of is) {
      const zellen = [];
      for (let j = c; j < e; j++) if (i >= 0 && j >= 0 && i < nx && j < nz && !typ[i][j] && !vergeben[i][j]) { zellen.push({ i, j }); vergeben[i][j] = true; }
      if (zellen.length) spuren.push(zellen);
    }
  }
  const gesamt = spuren.reduce((s, z) => s + z.length, 0);
  if (!fl.length || !gesamt) return [];
  // sehr kleine Flächen entfallen (Fläche geht an die Nachbarn)
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

function zonenUmsatz(haus, fl) {
  const k = haus.kpi ?? {};
  const jeGr = k.umsatzJeGruppe ?? {};
  const qmGruppe = {};
  for (const f of haus.flaechen) qmGruppe[f.gruppe] = (qmGruppe[f.gruppe] ?? 0) + f.qm;
  if (jeGr[fl.gruppe] != null) return (jeGr[fl.gruppe] * fl.qm) / (qmGruppe[fl.gruppe] || 1);
  const gesQm = haus.flaechen.reduce((s, f) => s + f.qm, 0) || 1;
  return ((k.umsatz ?? 0) * fl.qm) / gesQm;
}

/** Untergeschoss der Schwesterkette: ausschließlich Anlieferung und Lager, keine Kunden und kein Verkauf. */
function lagerSchwester(S, scene, haus) {
  const { B, T } = masse(haus);
  S.box(B, 0.4, T, B / 2, -0.2, T / 2, '#999185');
  S.box(B, 3.6, 0.45, B / 2, 1.7, 0, '#aaa69d');
  S.box(0.45, 3.6, T, 0, 1.7, T / 2, '#b2ada2');
  // Querregale, Anlieferung, zentrale schlichte Treppe.
  let regale = 0;
  for (let x = 3; x < B - 3; x += 7) for (let z = 3; z < T - 3; z += 5) {
    if (Math.abs(x - B / 2) < 5 && Math.abs(z - T / 2) < 6) continue;
    S.box(3.7, 2.4, 0.9, x, 1.2, z, '#77796f');
    S.box(3.5, 0.15, 0.95, x, 0.6, z, '#b3a99a');
    S.box(3.5, 0.15, 0.95, x, 1.45, z, '#b3a99a');
    regale++;
  }
  const stufen = 7, steigung = 0.25;
  for (let j = 0; j < stufen; j++) S.box(3.2, 0.22, 0.55, B / 2, 0.25 + j * steigung, T / 2 - 2.3 + j * 0.5, '#a4a39b');
  S.box(3, 2.4, 0.24, B - 4.5, 1.2, T - 0.35, FARBE_SCHWESTER);
  return { box: new THREE.Box3(new THREE.Vector3(-0.6, -0.6, -0.6), new THREE.Vector3(B + 0.6, 4, T + 0.6)), breite: B, tiefe: T, zonen: [], anzahl: S.anzahl, dichte: 0, kunden: 0, regale };
}

/**
 * Baut Etage etageNr von haus. o: { ausschnitt: true | { x, z, w, d, anker: 'eingang'|'ecke'|'kern' } (Meter, Raster 5),
 * budget = 25000 (Ausschnitt 8000), dichte, kunden }
 * Rückgabe: { box, breite, tiefe, zonen, anzahl, dichte, kunden }
 */
export function etage(S, scene, haus, etageNr, o = {}) {
  if (haus.kette === 'schwester' && etageNr < 0) return lagerSchwester(S, scene, haus);
  if (haus.format === 'sport') return sportEtage(S, scene, haus, etageNr, o);
  vorbereiten(S, scene);
  const ra = raster(haus, etageNr);
  const zn = zonen(haus, etageNr, ra);
  const { B, T, nx, nz } = ra;
  let ax0 = 0, az0 = 0, ax1 = B, az1 = T;
  if (o.ausschnitt) {
    const a = o.ausschnitt === true ? {} : o.ausschnitt;
    const w = Math.min(B, a.w ?? 30), d = Math.min(T, a.d ?? 25);
    const anker = a.anker ?? 'eingang';
    const vx = anker === 'ecke' ? B - w : anker === 'kern' ? (ra.kx + 1) * R - w / 2 : ra.gx * R - 10;
    const vz = anker === 'kern' ? (ra.kz + 1) * R - d / 2 : T - d;
    ax0 = Math.max(0, Math.min(B - w, Math.round((a.x ?? vx) / R) * R));
    az0 = Math.max(0, Math.min(T - d, Math.round((a.z ?? vz) / R) * R));
    ax1 = ax0 + w; az1 = az0 + d;
  }
  const drin = (i, j) => i * R >= ax0 && (i + 1) * R <= ax1 && j * R >= az0 && (j + 1) * R <= az1;
  const premium = haus.klasse === 'premium';
  const budget = o.budget ?? (o.ausschnitt ? 8000 : 25000);
  let umsatz = 0;
  for (const z of zn) umsatz += zonenUmsatz(haus, z.flaeche);
  const verkaufsZellen = zn.reduce((s, z) => s + z.zellen.length, 0) || 1;
  const jeZelle = Math.max(0.35, Math.min(1.9, umsatz / 850 / verkaufsZellen));
  const anteil = ((ax1 - ax0) * (az1 - az0)) / (B * T);
  const zellenImBild = zn.reduce((s, z) => s + z.zellen.filter((c) => drin(c.i, c.j)).length, 0);
  let kunden = o.kunden ?? Math.round(jeZelle * (zellenImBild + 0.5 * (nx + nz) * anteil) * (etageNr === 0 ? 1.15 : 1) * (haus.kette === 'schwester' ? 0.6 : 1));

  let d = o.dichte ?? 1;
  let tmp, gruppe, versuch = 0;
  for (;;) {
    tmp = new Sammler();
    gruppe = new THREE.Group();
    tmp.szene = gruppe;
    vorbereiten(tmp, gruppe);
    var kk = { ax0, az0, ax1, az1, drin, d, kunden, o };
    bauen(tmp, gruppe, haus, etageNr, ra, zn, kk);
    if (premium) premiumInnen(tmp, gruppe, haus, etageNr, { ax0, az0, ax1, az1, d });
    if (tmp.anzahl <= budget || versuch > 8) break;
    versuch++;
    const f = Math.max(0.5, Math.min(0.92, (budget * 0.97) / tmp.anzahl));
    if (d > 0.3) d = Math.max(0.3, d * f); else kunden = Math.floor(kunden * 0.75);
    gruppe.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  }
  // Branding im gemeinsamen Sortiment-Modul: Rot der Hartwig-Infrastruktur nur fuer Schwester umfaerben.
  // O08 Umbau: gleiche Geometrie, Materialpalette gemäß Generation der Etage.
  const moebelGeneration=haus.etagenBau?.[etageNr]?.moebelGeneration ?? 3;
  for (const [k, gs] of tmp.teile) {
    const farbeAlt = haus.kette === 'schwester' && ['#d23c32', '#c8102e'].includes(k) ? FARBE_SCHWESTER : k;
    const farbe = farbeGeneration(farbeAlt,moebelGeneration);
    if (!S.teile.has(farbe)) S.teile.set(farbe, []);
    S.teile.get(farbe).push(...gs);
  }
  S.anzahl += tmp.anzahl;
  while (gruppe.children.length) scene.add(gruppe.children[0]);
  const eg = etageNr === 0;
  const box = new THREE.Box3(new THREE.Vector3(ax0 - 0.6, eg ? -0.3 : -2.2, az0 - 0.6), new THREE.Vector3(ax1 + (eg ? 7 : 0.4), WANDHOEHE, az1 + (eg ? 7 : 0.4)));
  return { box, breite: B, tiefe: T, zonen: zn, anzahl: tmp.anzahl, dichte: d, kunden, leer: kk.leer, navigation: kk.navigation };
}

function bauen(S, scene, haus, etageNr, ra, zn, k) {
  const { B, T, nx, nz, typ, kx, kz, gx, gz, ring } = ra;
  const { ax0, az0, ax1, az1, drin, d } = k;
  const hid = (haus.id ?? 'H').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const r = rng(hid + etageNr * 101);
  const eg = etageNr === 0;
  const sport = haus.format === 'sport';
  const fassade = FASSADE[(haus.fassade ?? 0) % FASSADE.length];
  const hatOben = haus.etagen.includes(etageNr + 1), hatUnten = haus.etagen.includes(etageNr - 1);
  const zoneVon = Array.from({ length: nx }, () => Array(nz).fill(-1));
  zn.forEach((z, zi) => z.zellen.forEach((c) => (zoneVon[c.i][c.j] = zi)));
  const sicht = (x, z) => x >= ax0 - 0.01 && x <= ax1 + 0.01 && z >= az0 - 0.01 && z <= az1 + 0.01;
  const freiGang = [], freiZone = [], belegt = [];
  ra.ug = etageNr < 0;
  ra.belegt = belegt; ra.ausschnitt = [ax0, az0, ax1, az1];
  ra.artAn = (i, j) => { const q = zoneVon[i]?.[j]; return q >= 0 ? zn[q].art : null; };

  // ---- Decke/Bodenplatte mit Loch im Kern
  const platte = (x0, z0, x1, z1) => { if (x1 > x0 && z1 > z0) S.box(x1 - x0, 0.5, z1 - z0, (x0 + x1) / 2, -0.25, (z0 + z1) / 2, '#59626a'); };
  const kz0 = kz * R + 5.5, kz1 = kz * R + 8.7, kx0 = kx * R + 0.9, kx1 = kx * R + 9.3;
  const kernDrin = drin(kx, kz) && drin(kx + 1, kz + 1);
  if (hatUnten && kernDrin && !ra.schwester) {
    platte(ax0, az0, ax1, kz0); platte(ax0, kz1, ax1, az1); platte(ax0, kz0, kx0, kz1); platte(kx1, kz0, ax1, kz1);
  } else platte(ax0, az0, ax1, az1);
  if (!eg) {
    S.box(ax1 - ax0 + 0.3, 1.7, 0.3, (ax0 + ax1) / 2, -1.35, az1 + 0.15, fassade);
    S.box(0.3, 1.7, az1 - az0 + 0.3, ax1 + 0.15, -1.35, (az0 + az1) / 2, dunkler(fassade, 0.04));
    S.box(ax1 - ax0 + 0.6, 0.25, 0.5, (ax0 + ax1) / 2, -0.4, az1 + 0.2, heller(fassade, 0.04));
    S.box(0.5, 0.25, az1 - az0 + 0.6, ax1 + 0.2, -0.4, (az0 + az1) / 2, heller(fassade, 0.03));
    if (etageNr > 0) {
      for (let x = ax0 + 1.25; x < ax1; x += 2.5) S.box(1.4, 1.0, 0.1, x, -1.2, az1 + 0.31, '#55636f');
      for (let z = az0 + 1.25; z < az1; z += 2.5) S.box(0.1, 1.0, 1.4, ax1 + 0.31, -1.2, z, '#55636f');
    }
  }

  // ---- Abteilungen
  const kante = (i, j, di, dj) => {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0) return 'wand';
    if (ni >= nx || nj >= nz) return 'front';
    const t = typ[ni][nj];
    if (t === 'gang' || t === 'halle' || t === 'kern' || t === 'neben') return (di < 0 || dj < 0) && !drin(ni, nj) ? 'wand' : 'gang';
    if (t) return 'wand';
    // Schnitt des Ausschnitts an der Rückseite: Rückwand steht, Abteilung bestückt sie
    if ((di < 0 || dj < 0) && !drin(ni, nj)) return 'wand';
    return 'nachbar';
  };
  zn.forEach((z, zi) => {
    if (!z.zellen.some((c) => drin(c.i, c.j))) return;
    const f = z.flaeche, art = z.art;
    // Ausschnitt: nur sichtbare Zellen, damit die Abteilung ihre Warenwände an die Schnittwand stellt
    const Z = { alle: z.zellen.filter((c) => drin(c.i, c.j)), kante, sicht, y: 0, bereich: [ax0, az0, ax1, az1] };
    const opt = { seed: hid % 1000 + zi * 37 + etageNr * 11 + 1, dichte: ra.schwester ? Math.min(d, 0.48) : d, eg, basis: f.gruppe, mieter: f.mieter, marke: ra.schwester ? undefined : f.marke, name: f.name, ...(ra.schwester ? { teil: true, schildEinmal: true } : {}) };
    const res = art === 'konzession' || art === 'untermiete'
      ? fremdflaeche(S, scene, art, Z, { ...opt, mieter: f.mieter ?? ['discounter', 'gastro', 'fitness', 'arzt'][(zi + etageNr) % 4], marke: I.MARKEN.find((m) => m.gruppe === f.gruppe) ?? I.MARKEN[((hid >> 3) + zi) % I.MARKEN.length], seed: (hid >> 3) + zi })
      : flaeche(S, scene, art, Z, opt);
    if (!['leer', 'umbau'].includes(art)) freiZone.push(...res.frei);
    belegt.push(...res.belegt);
  });

  // ---- Infrastruktur-Zellen
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (!drin(i, j)) continue;
    const t = typ[i][j], x = i * R, z = j * R, seed = (i * 131 + j * 17 + etageNr * 7 + 1) * 3;
    if (t === 'neben') { nebengangZelle(S, scene, i, j, ra, d, freiGang, rng(seed), drin); continue; }
    if (t === 'gang' || t === 'halle') { gangZelle(S, scene, t, i, j, ra, eg, d, freiGang, rng(seed)); continue; }
    if (t === 'aufzug') { boden(S, x, z, R, R, 0, HALLE, d); aufzug(S, x + 1.2, z + 0.6); freiGang.push([x + 2.5, z + 4.3]); continue; }
    if (t === 'lager') { if (i === 0 || !drin(i - 1, j) || typ[i - 1][j] !== 'lager') { let w = 1; while (i + w < nx && typ[i + w][j] === 'lager' && drin(i + w, j)) w++; lager(S, x, z, w * R, R, 0, seed, WANDHOEHE, d); } continue; }
    if (t === 'treppe') { if (drin(i, j + 1)) treppenhaus(S, x, z, R, 2 * R, 0, WANDHOEHE, { wandNX: i > 0, wandNZ: j > 0 }); else boden(S, x, z, R, R, 0, 'lager', d); continue; }
    if (t === 'treppe2') { if (!drin(i, j - 1)) boden(S, x, z, R, R, 0, GANG, d); continue; }
    if (t === 'wc') { nebenraum(S, scene, x, z, eg, d); freiGang.push([x + 2.5, z + 4.3]); continue; }
  }

  // ---- Kern mit Lichthof
  if (kernDrin && !ra.schwester) {
    rolltreppenKern(S, kx * R, kz * R, { auf: hatOben, ab: hatUnten, dichte: d });
    if (!hatUnten) {
      // ohne Lichthof nach unten: Aktionsfläche vor den Rolltreppen (Podest, Kampagne, Bänke)
      const L = lokal(S, kx * R + 5, 0.06, kz * R + 7.3, 0);
      L.zyl(2.2, 2.2, 0.25, 0, 0, 0, '#ffffff', 16); L.zyl(2.25, 2.25, 0.04, 0, 0.25, 0, '#d23c32', 16);
      for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + 0.4; puppe(L.hoch(0.29), Math.cos(a) * 1.3, Math.sin(a) * 1.0, r, 'damen', AKTION.damen, -a); }
      L.box(0.06, 2.6, 0.06, 0, 0.29, 0, '#9aa3aa'); L.box(1.6, 0.9, 0.06, 0, 2.2, 0, '#d23c32');
      if (scene) I.schrift(L, 'Neu im Haus', 0, 2.65, 0.04, 0.3, '#ffffff');
      for (const s of [-3.8, 3.8]) { L.box(0.5, 0.45, 1.8, s, 0, 0, '#b98d61'); L.box(0.7, 0.7, 0.7, s, 0, 1.5, '#ece6dc'); L.kugel(0.5, s, 1.15, 1.5, '#5f9a56'); }
      belegt.push([kx * R + 2.5, kz * R + 5.2, kx * R + 7.5, kz * R + 9.5]);
    }
  }
  else if (!ra.schwester) for (let i = kx; i < kx + 2; i++) for (let j = kz; j < kz + 2; j++) if (drin(i, j)) gangZelle(S, scene, 'halle', i, j, ra, eg, d, freiGang, rng(i + j));

  if (kernDrin && ra.schwester) {
    // Altbau: schlichte zentrale Stiege mit geraden Läufen und niedrigen Betonwangen.
    // Keine Rolltreppen und kein offener Lichthof.
    const x0 = kx * R, z0 = kz * R;
    const stufen = 12, schritt = 3.0 / stufen;
    S.box(9.5, 0.16, 9.5, x0 + 5, 0.08, z0 + 5, SCHWESTER_BODEN.a);
    for (let j = 0; j < stufen; j++) {
      S.box(2.6, 0.2, 0.55, x0 + 3.3, 0.25 + j * schritt, z0 + 1.6 + j * 0.51, '#b0aca3');
      S.box(2.6, 0.2, 0.55, x0 + 6.7, 3.2 - j * schritt, z0 + 1.6 + j * 0.51, '#bab6ad');
    }
    S.box(0.22, 2.8, 8.0, x0 + 1.8, 1.45, z0 + 5, '#96968e');
    S.box(0.22, 2.8, 8.0, x0 + 8.2, 1.45, z0 + 5, '#9c9a91');
    S.box(1.3, 0.7, 0.55, x0 + 5, 0.45, z0 + 8.8, '#a79e90');
    S.box(1.18, 0.08, 0.62, x0 + 5, 0.85, z0 + 8.8, FARBE_SCHWESTER);
    belegt.push([x0 + 0.5, z0 + 0.5, x0 + 9.5, z0 + 9.5]);
  }

  // ---- Stützen im 10-m-Raster (nicht in Möbeln)
  for (let i = 2; i < nx; i += 2) for (let j = 2; j < nz; j += 2) {
    const x = i * R, z = j * R;
    if (x < ax0 + 1 || x > ax1 - 1 || z < az0 + 1 || z > az1 - 1) continue;
    const um = [typ[i - 1]?.[j - 1], typ[i]?.[j - 1], typ[i - 1]?.[j], typ[i]?.[j]];
    if (um.some((t) => t === 'kern' || t === 'lager' || (t || '').startsWith('treppe') || t === 'aufzug' || t === 'wc')) continue;
    if (belegt.some((b) => x > b[0] - 0.45 && x < b[2] + 0.45 && z > b[1] - 0.45 && z < b[3] + 0.45)) continue;
    stuetze(S, x, z, 0, WANDHOEHE, '#e9e3d8');
    belegt.push([x - 0.35, z - 0.35, x + 0.35, z + 0.35]);
  }

  // ---- Rückwände (echte oder Schnittwand des Ausschnitts)
  // echte Außenwand oder niedrige Schnittkante des Ausschnitts
  rueckwand(S, 'x', ax0, ax1, az0, 0, WANDHOEHE, { pilasterVersatz: 0 });
  rueckwand(S, 'z', az0, az1, ax0, 0, WANDHOEHE, { pilasterVersatz: 0, putz: '#f1e9dd' });
  if (scene && az0 === 0 && ax1 - ax0 > 14) {
    const lx = Math.min(ax1 - 6, Math.max(ax0 + 6, (kx + 1) * R));
    if (!(lx > (nx - 2) * R - 3)) wandschild(S, scene, haus.kette === 'schwester' ? NAME_SCHWESTER.toUpperCase() : sport ? 'HARTWIG SPORT' : 'HARTWIG', 'x', lx, 4.05, 0.25, { schrift: haus.kette === 'schwester' ? FARBE_SCHWESTER : '#d23c32', hoehe: haus.kette === 'schwester' ? 0.48 : 0.7 });
  }

  // ---- Front: Schaufenster (EG) oder Brüstung
  const artAn = ra.artAn;
  frontKante(S, scene, 'z', ax0, ax1, az1, eg, fassade, ra, r, artAn, d);
  frontKante(S, scene, 'x', az0, az1, ax1, eg, fassade, ra, r, artAn, d);
  if (eg) strasse(S, ax0, az0, ax1, az1, r, d);

  // ---- Belegungsraster: größte zusammenhängende Leerfläche (Quadrat) im Bild
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const t = typ[i][j], zi = zoneVon[i][j];
    if (['kern', 'lager', 'treppe', 'treppe2', 'wc', 'aufzug'].includes(t) || (zi >= 0 && ['leer', 'umbau', 'untermiete', 'konzession'].includes(zn[zi].art))) belegt.push([i * R, j * R, (i + 1) * R, (j + 1) * R]);
  }
  if (eg) { belegt.push([0, T - 1.9, B, T]); belegt.push([B - 1.9, 0, B, T]); }
  {
    const q = 0.5, gw = Math.round((ax1 - ax0) / q), gh = Math.round((az1 - az0) / q);
    const voll = Array.from({ length: gw }, () => new Uint8Array(gh));
    for (const b of belegt) {
      const i0 = Math.max(0, Math.floor((b[0] - ax0) / q)), i1 = Math.min(gw, Math.ceil((b[2] - ax0) / q)), j0 = Math.max(0, Math.floor((b[1] - az0) / q)), j1 = Math.min(gh, Math.ceil((b[3] - az0) / q));
      for (let a = i0; a < i1; a++) for (let c = j0; c < j1; c++) voll[a][c] = 1;
    }
    // Wandstreifen (0,9 m) und Laufwege zählen nicht als Leerfläche, wenn sie schmal sind: Quadratsuche erledigt das
    let best = 0, wo = null; const dp = Array.from({ length: gw }, () => new Uint16Array(gh));
    for (let a = 0; a < gw; a++) for (let c = 0; c < gh; c++) {
      if (voll[a][c]) continue;
      dp[a][c] = a && c ? 1 + Math.min(dp[a - 1][c], dp[a][c - 1], dp[a - 1][c - 1]) : 1;
      if (dp[a][c] > best) { best = dp[a][c]; wo = [ax0 + (a + 1 - best) * q, az0 + (c + 1 - best) * q]; }
    }
    k.leer = { m: best * q, wo };
  }

  // Schwesterkette: Rasterleuchten und eine kleine Etagenkasse nahe der Front statt Zentralkassenrotunde.
  if (ra.schwester) {
    for (let ix = ax0 + 5; ix < ax1 - 2; ix += 8) for (let iz = az0 + 5; iz < az1 - 2; iz += 8) {
      S.box(1.8, 0.1, 0.7, ix, WANDHOEHE - 0.12, iz, '#e1dfd4');
      S.box(1.45, 0.045, 0.50, ix, WANDHOEHE - 0.18, iz, '#f2eee0');
    }
    const kx = ax1 - 5.0, kz = az1 - 5.2;
    S.box(2.6, 0.88, 0.85, kx, 0.52, kz, '#968f83');
    S.box(2.8, 0.12, 0.92, kx, 1.02, kz, '#b6ada0');
    S.box(0.8, 0.25, 0.42, kx - 0.6, 1.19, kz, '#48565b');
    S.box(0.3, 0.18, 0.35, kx + 0.55, 1.2, kz, '#d9d0bd');
  }

  // Navigationshindernisse sind genau die im finalen Etagenbau belegten Grundflächen.
  const kassen = ra.schwester ? [{ x: B - 5, z: T - 3.4 }] :
    !eg && ring ? [{ x: (kx + 2.5) * R, z: (kz - 1) * R + 4.7 }] : [];
  k.navigation = { hindernisse: belegt.map(([x0, z0, x1, z1]) => ({ x: x0, z: z0, w: x1 - x0, d: z1 - z0 })), kassen };

  // ---- Kundschaft
  const pool = freiZone.concat(freiGang);
  const n = Math.min(k.kunden, pool.length);
  for (let q = 0; q < n; q++) {
    const idx = Math.floor(r() * pool.length);
    const [fx, fz] = pool.splice(idx, 1)[0];
    figur(S, fx + zw(r, -0.2, 0.2), fz + zw(r, -0.2, 0.2), q * 7 + etageNr * 1000 + 3, r() < 0.1 ? 'kind' : 'kunde', { ry: Math.atan2(kx * R + 5 - fx, kz * R + 5 - fz) + zw(r, -1.2, 1.2) });
  }
}

/** Warenwand am Gang (Rückwand): Regal mit Aktionsware, rotes Feld bis unter die Decke. Rücken z = 0. */
function aktionswand(S, scene, L, art, r, d) {
  if (Math.round((L.P(0, 0)[0] + L.P(0, 0)[1]) / 5) % 2 === 1) {
    // im Wechsel: neutrale Warenwand mit Kampagnenbild
    I.wandRegal(L, 4.8, 2.6, 5, '#ece6dc', I.prodGefaltet(AKTION[art] ?? AKTION.damen), r, d, 0.45);
    L.box(4.8, 1.6, 0.1, 0, 2.95, 0.06, '#e2d6c4'); I.bildtafel(L, 0, 3.0, 0.12, 3.2, 1.3, r, AKTION[art] ?? AKTION.damen);
    return;
  }
  const pal = AKTION[art] ?? AKTION[art?.startsWith?.('herren') ? 'herren' : art === 'haushalt' || art === 'elektro' ? 'wohnen' : 'damen'];
  I.wandRegal(L, 4.8, 2.5, 4, '#f4f2ee', I.prodPackungen(pal), r, d, 0.45);
  // rotes Feld mit großem Schriftzug (aus Spielabstand lesbar; kleine Zweitzeilen entfallen)
  L.box(4.8, 1.62, 0.14, 0, 2.9, 0.08, '#d23c32');
  if (scene) I.schrift(L, 'HARTWIG', 0, 3.71, 0.16, 0.82, '#ffffff');
}

/** Nebengang zwischen Shopblöcken: heller Belag, Ware an beiden Rändern. */
function nebengangZelle(S, scene, i, j, ra, d, frei, r, drin) {
  const x = i * R, z = j * R;
  boden(S, x, z, R, R, 0, GANG, d);
  for (let q = 0; q < 3; q++) frei.push([x + zw(r, 1.8, 3.2), z + zw(r, 0.5, 4.5)]);
  const [ax0, az0] = ra.ausschnitt;
  if (z === az0) { aktionswand(S, scene, lokal(S, x + 2.5, 0.06, z + 0.02, 0), ra.artAn?.(i - 1, j), r, d); ra.belegt.push([x, z, x + R, z + 0.9]); return; }
  if (d < 0.3) return;
  for (const s of [-1, 1]) {
    const L = lokal(S, x + 2.5 + s * 1.95, 0.06, z + 2.5, Math.PI / 2);
    gangRand(S, scene, L, ra.artAn?.(i + s, j), r, d, i + j * 3 + (s > 0 ? 1 : 0));
    ra.belegt.push([x + 2.5 + s * 1.95 - 0.45, z + 0.8, x + 2.5 + s * 1.95 + 0.45, z + 4.2]);
  }
}

/** Schnittkante eines Ausschnitts: niedrige Kante mit dunklem Deckel (die Etage geht dahinter weiter). */
function schnittkante(S, achse, a, b, pos) {
  if (achse === 'x') { S.box(b - a + 0.6, 0.9, 0.3, (a + b) / 2 - 0.3, 0.45, pos - 0.15, '#cfc8bc'); S.box(b - a + 0.6, 0.06, 0.32, (a + b) / 2 - 0.3, 0.93, pos - 0.15, '#4a525a'); }
  else { S.box(0.3, 0.9, b - a, pos - 0.15, 0.45, (a + b) / 2, '#d8d1c5'); S.box(0.32, 0.06, b - a, pos - 0.15, 0.93, (a + b) / 2, '#4a525a'); }
}

/** Ware am Gangrand: niedriger Aktionstisch, Puppenpodest oder Bank mit Pflanze, passend zur Abteilung daneben (lokal entlang x). */
function gangRand(S, scene, L, art, r, d, k) {
  const mode = ['damen', 'herren', 'herren_casual', 'kinder', 'baby', 'waesche', 'sport'].includes(art);
  const fremd = !art || ['leer', 'umbau', 'untermiete', 'konzession'].includes(art);
  if (fremd || k % 3 === 2) { L.box(1.8, 0.45, 0.5, -0.5, 0, 0, '#b98d61'); L.box(1.8, 0.08, 0.5, -0.5, 0.45, 0, '#9c7650'); L.box(0.7, 0.7, 0.7, 1.0, 0, 0, '#ece6dc'); L.kugel(0.55, 1.0, 1.15, 0, '#5f9a56'); return; }
  if (mode && k % 5 === 0) {
    L.box(2.6, 0.22, 0.75, 0, 0, 0, '#ffffff');
    const typ = art === 'waesche' ? 'waesche' : art.startsWith('herren') ? 'herren' : art === 'kinder' || art === 'baby' ? 'kind' : art === 'sport' ? 'sport' : 'damen';
    for (let q = 0; q < 3; q++) puppe(L.hoch(0.22), -0.85 + q * 0.85, 0, r, typ, AKTION[art] ?? AKTION.damen, zw(r, -0.4, 0.4));
    return;
  }
  const pal = AKTION[art] ?? AKTION[art?.startsWith?.('herren') ? 'herren' : 'damen'];
  L.box(2.8, 0.66, 0.8, 0, 0, 0, art === 'food' || art === 'wein' ? '#7b5a40' : '#ffffff'); L.box(2.86, 0.05, 0.86, 0, 0.66, 0, '#d23c32');
  I.stapel(L, 0, 0, 2.6, 0.65, 0.71, pal, r, d);
  if (k % 4 === 1) { L.box(0.04, 0.9, 0.04, 1.2, 0.71, 0, '#9aa3aa'); L.box(0.7, 0.36, 0.04, 1.2, 1.61, 0, '#d23c32'); if (scene) I.schrift(L, 'Aktion', 1.2, 1.79, 0.03, 0.24, '#ffffff'); }
}

/**
 * Dach eines Hauses mit Dachterrasse über dem Restaurant der obersten Etage (sonst über dem vorderen rechten Block).
 * Kiesdach mit Attika und rotem Hartwig-Rand, Treppenhausköpfe, Haustechnik, Lichtkuppel über der Rolltreppenhalle,
 * Terrasse mit Holzdeck, Glasgeländer, Schirmtischen, Pflanzkübeln, Ausschank und Gästen.
 * o: { ausschnitt: true | { x, z, w, d } } Rückgabe wie etage()
 */
export function dach(S, scene, haus, o = {}) {
  vorbereiten(S, scene);
  const oben = Math.max(...haus.etagen);
  const ra = raster(haus, oben), zn = zonen(haus, oben, ra);
  const { B, T, nx, nz, typ, kx, kz } = ra;
  let ax0 = 0, az0 = 0, ax1 = B, az1 = T;
  if (o.ausschnitt) { const a = o.ausschnitt === true ? {} : o.ausschnitt; const w = Math.min(B, a.w ?? 30), dd = Math.min(T, a.d ?? 25); ax0 = Math.round((a.x ?? B - w) / R) * R; az0 = Math.round((a.z ?? T - dd) / R) * R; ax1 = ax0 + w; az1 = az0 + dd; }
  const sicht = (x, z) => x >= ax0 - 0.01 && x <= ax1 + 0.01 && z >= az0 - 0.01 && z <= az1 + 0.01;
  const r = rng(((haus.id ?? 'H').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) + 777);
  const fassade = FASSADE[(haus.fassade ?? 0) % FASSADE.length];
  const n0 = S.anzahl;
  // Dachplatte, Fassadenband der obersten Etage, Attika mit rotem Rand
  S.box(ax1 - ax0, 0.5, az1 - az0, (ax0 + ax1) / 2, -0.25, (az0 + az1) / 2, '#59626a');
  S.box(ax1 - ax0 + 0.3, 2.4, 0.3, (ax0 + ax1) / 2, -1.7, az1 + 0.15, fassade);
  S.box(0.3, 2.4, az1 - az0 + 0.3, ax1 + 0.15, -1.7, (az0 + az1) / 2, dunkler(fassade, 0.04));
  for (let x = ax0 + 1.25; x < ax1; x += 2.5) S.box(1.4, 1.5, 0.1, x, -1.9, az1 + 0.31, '#55636f');
  for (let z = az0 + 1.25; z < az1; z += 2.5) S.box(0.1, 1.5, 1.4, ax1 + 0.31, -1.9, z, '#55636f');
  S.box(ax1 - ax0 - 0.6, 0.04, az1 - az0 - 0.6, (ax0 + ax1) / 2 + 0.3, 0.02, (az0 + az1) / 2 + 0.3, '#b9b4aa');
  for (let x = ax0 + 2.5; x < ax1; x += 2.5) S.box(0.05, 0.012, az1 - az0 - 1, x, 0.045, (az0 + az1) / 2, '#aaa59b');
  const attika = (achse, a, b, pos) => {
    if (achse === 'x') { S.box(b - a, 1.0, 0.4, (a + b) / 2, 0.5, pos, fassade); S.box(b - a + 0.1, 0.18, 0.5, (a + b) / 2, 1.09, pos, '#d23c32'); }
    else { S.box(0.4, 1.0, b - a, pos, 0.5, (a + b) / 2, dunkler(fassade, 0.03)); S.box(0.5, 0.18, b - a + 0.1, pos, 1.09, (a + b) / 2, '#d23c32'); }
  };
  if (az0 === 0) attika('x', ax0, ax1, 0.2); if (ax0 === 0) attika('z', az0, az1, 0.2);
  attika('x', ax0, ax1, az1 - 0.2); attika('z', az0, az1, ax1 - 0.2);
  // Terrassenfläche
  let tz = zn.find((z) => z.art === 'restaurant')?.zellen;
  if (!tz) { tz = []; for (let i = Math.max(0, nx - 4); i < nx; i++) for (let j = Math.max(0, nz - 3); j < nz; j++) tz.push({ i, j }); }
  const terr = new Set(tz.map((c) => c.i + ',' + c.j));
  const imin = Math.min(...tz.map((c) => c.i)), imax = Math.max(...tz.map((c) => c.i)), jmin = Math.min(...tz.map((c) => c.j)), jmax = Math.max(...tz.map((c) => c.j));
  let n = 0;
  for (const c of tz) {
    const x = c.i * R, z = c.j * R;
    if (!sicht(x + 2.5, z + 2.5)) continue;
    S.box(R, 0.12, R, x + 2.5, 0.1, z + 2.5, '#b98d61');
    for (let u = 0.5; u < R; u += 1.0) S.box(0.04, 0.01, R, x + u, 0.165, z + 2.5, '#a37a52');
    // Geländer an Grenzen zum Kiesdach
    for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      if (terr.has((c.i + di) + ',' + (c.j + dj))) continue;
      const aussen = c.i + di >= nx || c.j + dj >= nz || c.i + di < 0 || c.j + dj < 0;
      const pos = dj ? (dj > 0 ? z + R - 0.15 : z + 0.15) : (di > 0 ? x + R - 0.15 : x + 0.15);
      if (dj) { S.box(R, 1.0, 0.04, x + 2.5, 0.66, pos, GLAS); S.box(R, 0.06, 0.1, x + 2.5, 1.18, pos, '#c9d2d8'); if (!aussen) { const L = lokal(S, x + 2.5, 0.16, pos + (dj > 0 ? -0.45 : 0.45), 0); pflanzentrog(L, 0, 0, 3.6, r); } }
      else { S.box(0.04, 1.0, R, pos, 0.66, z + 2.5, GLAS); S.box(0.1, 0.06, R, pos, 1.18, z + 2.5, '#c9d2d8'); if (!aussen) { const L = lokal(S, pos + (di > 0 ? -0.45 : 0.45), 0.16, z + 2.5, Math.PI / 2); pflanzentrog(L, 0, 0, 3.6, r); } }
    }
    const L = lokal(S, x + 2.5, 0.16, z + 2.5, 0);
    if (c.i === imin && c.j === jmin) {
      // Ausschank mit Markise
      L.box(3.6, 1.05, 0.8, 0, 0, -1.2, '#5a3b2a'); L.box(3.7, 0.06, 0.9, 0, 1.05, -1.2, '#f4f0ea');
      L.box(3.8, 0.12, 1.6, 0, 2.6, -1.0, '#d23c32'); for (const s of [-1.8, 1.8]) L.box(0.08, 2.6, 0.08, s, 0, -0.3, '#5a636b');
      figur(S, ...L.P(0.3, -1.8), (r() * 1e9) | 0, 'theke', { y: 0.16, ry: 0 });
      if (scene) { L.box(2.4, 0.5, 0.06, 0, 2.9, -0.3, '#8c5a2b'); I.schrift(L, 'Dachterrasse', 0, 3.15, -0.26, 0.32, '#ffffff'); }
    } else if ((c.i + c.j) % 3 === 0) { L.box(0.7, 0.5, 1.9, -1.2, 0, 0, '#ffffff'); L.box(0.7, 0.5, 1.9, 1.2, 0, 0, '#ffffff'); L.geo(new THREE.ConeGeometry(1.6, 0.45, 8).translate(0, 0.22, 0), 0, 2.3, 0, '#f2e6d0'); L.zyl(0.04, 0.04, 2.3, 0, 0, 0, '#5a636b', 4); if (r() < 0.6) figur(S, ...L.P(-1.2, 0.2), (r() * 1e9) | 0, 'kunde', { y: 0.66, ry: Math.PI / 2, pose: 'sitzen' }); }
    else schirmTisch(L, r, 1, { S, r, d: 1 });
    n++;
  }
  // Treppenhausköpfe, Aufzugsüberfahrt, Haustechnik, Lichtkuppel
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const t = typ[i][j], x = i * R, z = j * R;
    if (!sicht(x + 2.5, z + 2.5) || terr.has(i + ',' + j)) continue;
    if (t === 'treppe') { S.box(4.4, 3.0, 9.4, x + 2.5, 1.5, z + 5, '#e4ddd1'); S.box(4.6, 0.2, 9.6, x + 2.5, 3.1, z + 5, '#9aa3aa'); S.box(1.0, 2.2, 0.06, x + 2.5, 1.1, z + 9.72, '#6c7d6f'); }
    if (t === 'aufzug') { S.box(3.0, 2.2, 3.0, x + 2.5, 1.1, z + 2.0, '#d6cfc3'); }
    if (t === 'lager' && (i + j) % 2) { S.box(3.2, 1.6, 2.2, x + 2.5, 0.8, z + 2.5, '#c9d2d8'); S.box(0.9, 0.9, 0.9, x + 1.6, 2.05, z + 2.5, '#9aa3aa'); S.add(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10).translate(x + 3.3, 1.75, z + 2.5), '#5a636b'); }
  }
  if (sicht(kx * R + 5, kz * R + 5)) {
    S.box(9.0, 0.5, 9.0, kx * R + 5, 0.25, kz * R + 5, '#d8d1c5');
    const g = new THREE.ConeGeometry(6.0, 1.6, 4); g.rotateY(Math.PI / 4); g.translate(kx * R + 5, 1.3, kz * R + 5); S.add(g, GLAS);
    for (const s of [-4.2, 4.2]) { S.box(0.08, 0.1, 8.6, kx * R + 5 + s, 0.55, kz * R + 5, '#9aa3aa'); S.box(8.6, 0.1, 0.08, kx * R + 5, 0.55, kz * R + 5 + s, '#9aa3aa'); }
  }
  for (const [px, pz] of [[0.25, 0.4], [0.35, 0.25], [0.6, 0.3]]) {
    const x = ax0 + (ax1 - ax0) * px, z = az0 + (az1 - az0) * pz;
    const ti = Math.floor(x / R), tj = Math.floor(z / R);
    if (terr.has(ti + ',' + tj) || typ[ti]?.[tj] === 'kern' || typ[ti]?.[tj] === 'treppe' || typ[ti]?.[tj] === 'treppe2') continue;
    S.box(3.0, 1.4, 1.6, x, 0.7, z, '#c9d2d8'); for (let q = 0; q < 3; q++) S.add(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 10).translate(x - 1 + q, 1.5, z), '#5a636b');
  }
  // Gäste
  for (let q = 0; q < n * 1.5; q++) { const c = tz[Math.floor(r() * tz.length)]; const fx = c.i * R + zw(r, 0.8, 4.2), fz = c.j * R + zw(r, 0.8, 4.2); if (sicht(fx, fz)) figur(S, fx, fz, q + 4000, r() < 0.1 ? 'kind' : 'kunde', { y: 0.16 }); }
  const box = new THREE.Box3(new THREE.Vector3(ax0 - 0.6, -2.9, az0 - 0.6), new THREE.Vector3(ax1 + 0.4, 3.5, az1 + 0.4));
  return { box, breite: B, tiefe: T, anzahl: S.anzahl - n0, dichte: 1, kunden: Math.round(n * 1.5), leer: null };
}

/** Gang- und Hallenzelle: heller Belag, wenige ruhige Möbel (Pflanzkübel, Bänke), Kundenservice und Zentralkasse am Ring. */
function gangZelle(S, scene, t, i, j, ra, eg, d, frei, r) {
  const { nx, nz, kx, kz, gx, gz, ring } = ra;
  const typ = (a, b) => ra.typ[a]?.[b];
  const x = i * R, z = j * R;
  boden(S, x, z, R, R, 0, ra.schwester ? SCHWESTER_BODEN : t === 'halle' ? HALLE : GANG, d);
  const fr = (fx, fz) => frei.push([x + fx, z + fz]);
  for (let q = 0; q < 5; q++) fr(zw(r, 0.6, 4.4), zw(r, 0.6, 4.4));
  const [ax0, az0] = ra.ausschnitt;
  if (z === az0 && !(t === 'gang' && j === gz && i === 0)) { aktionswand(S, scene, lokal(S, x + 2.5, 0.06, z + 0.02, 0), ra.artAn?.(i - 1, j) ?? ra.artAn?.(i + 1, j), r, d); ra.belegt.push([x, z, x + R, z + 0.9]); }
  if (x === ax0 && !(t === 'gang' && j === gz && i === 0)) { aktionswand(S, scene, lokal(S, x + 0.02, 0.06, z + 2.5, Math.PI / 2), ra.artAn?.(i, j - 1) ?? ra.artAn?.(i, j + 1), r, d); ra.belegt.push([x, z, x + 0.9, z + R]); }
  if (t === 'halle') {
    const ecke = (i === kx - 1 || i === kx + 2) && j === kz - 1;
    if (ecke && i === kx + 2) {
      if (eg) { infoCounter(S, x + 2.5, z + 2.4, i * 7 + j); }
      else { kassentresen(S, x + 2.5, z + 2.2, i * 7 + j + 5, { y: 0.06 }); if (scene) haengeschild(S, scene, 'Kasse', x + 2.5, 3.6, z + 2.0, { farbe: '#d23c32', hoehe: 0.6 }); }
      frei.length -= 3;
      ra.belegt.push([x + 0.5, z + 0.8, x + 4.5, z + 4.2]);
      return;
    }
    if (ecke && i === kx - 1) {
      ra.belegt.push([x + 0.6, z + 0.6, x + 4.4, z + 1.8]);
      const L2 = lokal(S, x + 0.55, 0.06, z + 3.2, Math.PI / 2); gangRand(S, scene, L2, ra.artAn?.(i - 1, j), r, d, 4); ra.belegt.push([x + 0.1, z + 1.8, x + 1.0, z + 4.6]);
      const L = lokal(S, x + 2.5, 0.06, z + 1.2, 0);
      L.box(2.4, 0.45, 0.55, 0, 0, 0, '#b98d61'); L.box(2.4, 0.08, 0.55, 0, 0.45, 0, '#9c7650');
      for (const s of [-1.6, 1.6]) { L.box(0.7, 0.7, 0.7, s, 0, 0, '#ece6dc'); L.kugel(0.55, s, 1.2, 0, '#5f9a56'); }
      if (r() < 0.7) figur(S, x + 2.0, z + 1.2, i * 13 + j, 'kunde', { y: 0.06, ry: 0, pose: 'sitzen' });
      return;
    }
    if (j === kz - 1 && (i === kx || i === kx + 1) && d > 0.3) {
      const L = lokal(S, x + 2.5, 0.06, z + 1.6, 0);
      L.box(3.4, 0.3, 1.6, 0, 0, 0, '#ffffff'); L.box(3.46, 0.04, 1.66, 0, 0.3, 0, '#d23c32');
      if (i === kx) for (let q = 0; q < 3; q++) puppe(L.hoch(0.34), -1.0 + q * 1.0, zw(r, -0.2, 0.2), r, 'damen', AKTION.damen, zw(r, -0.5, 0.5));
      else { for (let q = 0; q < 3; q++) L.box(0.7, 0.4 + q * 0.25, 0.7, -1.0 + q * 1.0, 0.34, 0, q % 2 ? '#1f1f1f' : '#f4f0ea'); for (let q = 0; q < 3; q++) L.box(0.3, 0.5, 0.2, -1.0 + q * 1.0, 0.74 + q * 0.25, 0, waehle(r, ['#f2c6d2', '#d8b25a', '#9bc6d8', '#b5162b'])); }
      L.box(3.0, 1.4, 0.06, 0, 0.34, -0.7, '#f8f6f2'); L.box(2.8, 1.2, 0.03, 0, 0.44, -0.66, waehle(r, ['#e9c9b5', '#bcd3df', '#d6c6e0']));
      if (scene) I.schrift(L, i === kx ? 'Neue Saison' : 'Duftwelten', 0, 1.5, -0.62, 0.26, '#2a3540');
      ra.belegt.push([x + 0.8, z + 0.6, x + 4.2, z + 2.4]);
      return;
    }
    if (i === kx + 2 && j === kz + 1 && d > 0.3) {
      const L = lokal(S, x + 3.9, 0.06, z + 2.5, Math.PI / 2);
      L.box(3.0, 0.62, 0.9, 0, 0, 0, '#ffffff'); L.box(3.06, 0.05, 0.96, 0, 0.62, 0, '#d23c32'); I.stapel(L, 0, 0, 2.8, 0.75, 0.67, AKTION.beauty, r, d);
      ra.belegt.push([x + 3.4, z + 1.0, x + 4.4, z + 4.0]);
      return;
    }
    if (i === kx - 1 && j === kz + 1) {
      const L = lokal(S, x + 1.2, 0.06, z + 2.5, Math.PI / 2);
      L.box(2.4, 0.45, 0.55, 0, 0, 0, '#b98d61'); L.box(2.4, 0.08, 0.55, 0, 0.45, 0, '#9c7650');
      for (const s of [-1.6, 1.6]) { L.box(0.7, 0.7, 0.7, s, 0, 0, '#ece6dc'); L.kugel(0.55, s, 1.2, 0, '#5f9a56'); }
      ra.belegt.push([x + 0.6, z + 0.6, x + 1.8, z + 4.4]);
      return;
    }
    if (i === kx + 2 && j === kz) {
      // Auslauf der Rolltreppen: frei halten, Infostele mit Etagenplan
      ra.belegt.push([x, z + 1.0, x + 2.5, z + 4.0]);
      const L = lokal(S, x + 3.8, 0.06, z + 4.2, Math.PI / 2);
      L.box(0.5, 2.2, 0.25, 0, 0, 0, '#2a3540'); L.box(0.4, 1.3, 0.02, 0, 0.7, 0.13, '#f4f0ea'); for (let q = 0; q < 5; q++) L.box(0.32, 0.12, 0.02, 0, 0.8 + q * 0.24, 0.14, ['#d23c32', '#a8325e', '#1f2a3a', '#5f7f5a', '#e8403a'][q]);
      ra.belegt.push([x + 3.4, z + 3.0, x + 4.4, z + 5.0]);
      return;
    }
    return;
  }
  // Hauptgang: Ware an beiden Gangrändern, Laufweg rund 3 m in der Mitte; Kampagnenwand am Gangende an der Außenwand
  const quer = j === gz, laengs = i === gx && j > gz;
  if (quer && i === 0) {
    const L = lokal(S, 0.3, 0.06, z + 2.5, Math.PI / 2);
    L.box(4.4, 3.4, 0.08, 0, 0.3, 0.05, '#d23c32'); L.box(3.8, 2.4, 0.04, 0, 0.6, 0.1, '#f8f6f2'); L.box(3.6, 2.2, 0.03, 0, 0.7, 0.12, waehle(r, ['#e9c9b5', '#bcd3df', '#d6c6e0']));
    L.box(0.9, 1.8, 0.03, -0.8, 0.8, 0.14, waehle(r, ['#d65a6f', '#2b3a55', '#5f7f5a'])); L.box(1.4, 0.3, 0.03, 0.9, 2.2, 0.14, '#ffffff');
    if (scene) I.schrift(L, 'HARTWIG', 0, 3.3, 0.1, 0.5, '#ffffff');
    gangRand(S, scene, lokal(S, x + 2.5, 0.06, z + 0.55, 0), ra.artAn?.(i, j - 1), r, d, 1);
    return;
  }
  const kreuz = i === gx && j === gz, eingang = laengs && j === nz - 1;
  if (d > 0.3 && (quer || laengs) && !kreuz && !eingang) {
    let k = i * 3 + j;
    for (const s of [-1, 1]) {
      const nb = quer ? ra.artAn?.(i, j + s) : ra.artAn?.(i + s, j);
      if (quer && typ(i, j + s) === 'kern') continue;
      const L = quer ? lokal(S, x + 2.5, 0.06, z + 2.5 + s * 1.95, 0) : lokal(S, x + 2.5 + s * 1.95, 0.06, z + 2.5, Math.PI / 2);
      gangRand(S, scene, L, nb, r, d, k++);
      ra.belegt.push(quer ? [x + 0.6, z + 2.5 + s * 1.95 - 0.45, x + 4.4, z + 2.5 + s * 1.95 + 0.45] : [x + 2.5 + s * 1.95 - 0.45, z + 0.6, x + 2.5 + s * 1.95 + 0.45, z + 4.4]);
    }
    frei.length = Math.max(0, frei.length - 2);
  }
  if (i === gx && j === gz && !ring) { const L = lokal(S, x + 2.5, 0.06, z + 2.5, 0); L.zyl(0.9, 0.9, 0.5, 0, 0, 0, '#ece6dc', 10); L.kugel(0.8, 0, 1.2, 0, '#5f9a56'); L.kugel(0.5, 0.3, 1.8, 0.2, '#6fa860'); }
  if (j === gz && (i === 1 || i === nx - 2) && d > 0.4) { const L = lokal(S, x + 2.5, 0.06, z + 2.5, 0); L.box(0.8, 0.8, 0.8, 0, 0, 0, '#ece6dc'); L.kugel(0.6, 0, 1.3, 0, '#5f9a56'); L.kugel(0.4, 0.2, 1.8, 0.1, '#6fa860'); }
}

const AKTION = {
  damen: ['#d65a6f', '#f2c6d2', '#e8dcc6', '#2b2b2b', '#7d97b8'], herren: ['#2b3a55', '#e8e4dc', '#6b5a48', '#ffffff'], kinder: ['#ef5b5b', '#ffc145', '#5bc0eb', '#9bc53d'],
  waesche: ['#f4d4dc', '#e8b4c4', '#ffffff', '#c9a3d4'], beauty: ['#f2c6d2', '#d8b25a', '#ffffff', '#b5162b'], wohnen: ['#f4f0e6', '#9bc6d8', '#d97a5a', '#3f6b5a'],
  food: ['#c9483e', '#f2c14e', '#5a3b22', '#e8dcc6', '#3f6b3a'], spielwaren: ['#e8403a', '#f2c14e', '#3c8dd9', '#5bb36a'],
};
/** Aktionsinsel im Hauptgang: niedriger Tisch mit Ware, rotes Aktionsschild, Pflanzkübel (lokal entlang x). */
function aktionsinsel(S, scene, L, art, r, d) {
  const pal = AKTION[art] ?? AKTION[art?.startsWith?.('herren') ? 'herren' : 'damen'];
  L.box(2.2, 0.62, 1.0, -0.4, 0, 0, '#ffffff'); L.box(2.28, 0.05, 1.08, -0.4, 0.62, 0, '#d23c32');
  I.stapel(L, -0.4, 0, 2.0, 0.85, 0.67, pal, r, d);
  L.box(0.04, 1.0, 0.04, 0.55, 0.67, 0, '#9aa3aa'); L.box(0.7, 0.36, 0.04, 0.55, 1.67, 0, '#d23c32');
  if (scene) I.schrift(L, 'Aktion', 0.55, 1.85, 0.03, 0.24, '#ffffff');
  L.box(0.7, 0.7, 0.7, 1.45, 0, 0, '#ece6dc'); L.kugel(0.5, 1.45, 1.15, 0, '#5f9a56');
}

/** WC und Personalbereich an der Rückwand (angedeutet: Wand mit zwei Türen und Piktogrammschildern). */
function nebenraum(S, scene, x, z, eg, d) {
  boden(S, x, z, R, R, 0, GANG, d);
  const t = 2.8;
  S.box(R, WANDHOEHE, t, x + R / 2, WANDHOEHE / 2, z + t / 2, '#e4ddd1');
  S.box(R, 0.25, 0.06, x + R / 2, 0.125, z + t + 0.03, '#cfc5b6');
  for (const [u, f, txt] of [[1.4, '#5a6f7f', 'WC'], [3.6, '#8a8f94', 'Personal']]) {
    S.box(1.0, 2.2, 0.06, x + u, 1.16, z + t + 0.03, f);
    S.box(0.05, 0.05, 0.08, x + u + 0.35, 1.1, z + t + 0.06, '#c9d2d8');
    if (scene) { S.box(txt === 'WC' ? 0.7 : 1.1, 0.4, 0.04, x + u, 2.65, z + t + 0.05, txt === 'WC' ? '#2f6f8f' : '#5a636b'); wandschild(S, scene, txt, 'x', x + u, 2.65, z + t + 0.06, { schrift: '#ffffff', hoehe: 0.3 }); }
  }
}

/** Schaufensterdekoration passend zur Abteilung dahinter (lokal, Front +z = Straße). */
function deko(L, art, r) {
  const pal = { damen: PAL_D, herren: ['#1f2a3a', '#2b3a55', '#3a3f47', '#e8e4dc', '#6d2f3a'], kinder: ['#ef5b5b', '#ffc145', '#5bc0eb', '#9bc53d'], waesche: ['#f4d4dc', '#e8b4c4', '#ffffff', '#b0475f'] };
  const p = pal[art] ?? (art === 'baby' || art === 'schulranzen' ? pal.kinder : art?.startsWith('herren') ? pal.herren : null);
  if (p || art === 'sport' || art === 'offprice') {
    const typ = art === 'waesche' ? 'waesche' : art?.startsWith('herren') ? 'herren' : p === pal.kinder ? 'kind' : art === 'sport' ? 'sport' : 'damen';
    for (let k = 0; k < 3; k++) puppe(L, -1.3 + k * 1.3, zw(r, -0.15, 0.15), r, typ, p ?? ['#1f6fd1', '#e8403a', '#1f1f1f', '#ffcc00'], zw(r, -0.4, 0.4));
    L.box(0.9, 0.06, 0.6, 1.6, 0, 0.2, '#d23c32');
    return;
  }
  if (art === 'beauty' || art === 'schmuck' || art === 'strumpf') {
    for (let k = 0; k < 3; k++) { const h = 0.3 + k * 0.25; L.box(0.7, h, 0.7, -1.2 + k * 1.2, 0, 0, k % 2 ? '#1f1f1f' : '#ffffff'); L.box(0.28, 0.5 + 0.1 * k, 0.18, -1.2 + k * 1.2, h, 0, waehle(r, ['#f2c6d2', '#d8b25a', '#9bc6d8', '#b5162b'])); L.box(0.12, 0.12, 0.12, -1.2 + k * 1.2, h + 0.6 + 0.1 * k, 0, '#d8b25a'); }
    return;
  }
  if (art === 'accessoires' || art === 'lederwaren') {
    for (let k = 0; k < 4; k++) { const h = 0.2 + (k % 2) * 0.3; L.zyl(0.32, 0.32, h, -1.5 + k * 1.0, 0, 0, '#f4efe7', 10); L.box(0.34, 0.26, 0.14, -1.5 + k * 1.0, h, 0, waehle(r, ['#5a3b22', '#c9483e', '#2b2b2b', '#d8b25a'])); }
    return;
  }
  if (art === 'wohnen' || art === 'haushalt' || art === 'elektro') {
    L.box(1.8, 0.42, 0.8, -0.6, 0, -0.1, '#5f7f8c'); L.box(1.8, 0.45, 0.2, -0.6, 0.42, -0.4, '#557380');
    I.stehlampe(L, 1.1, -0.2, r); L.box(0.6, 0.45, 0.6, 1.0, 0, 0.3, '#b98d61');
    return;
  }
  if (art === 'spielwaren') { for (let k = 0; k < 4; k++) I.teddy(L, -1.4 + k * 0.95, 0, 0, r, 1.4); return; }
  if (art === 'food' || art === 'wein' || art === 'restaurant') {
    for (let k = 0; k < 3; k++) { L.box(0.7, 0.4, 0.5, -1.2 + k * 1.2, 0, 0, '#c9a26b'); for (let q = 0; q < 4; q++) L.box(0.1, 0.32, 0.1, -1.45 + k * 1.2 + q * 0.16, 0.4, 0, waehle(r, ['#6d1f2a', '#2f4a22', '#d8b25a'])); }
    return;
  }
  // neutral: Hartwig-Kampagne
  L.box(2.6, 1.2, 0.06, 0, 0.2, -0.4, '#d23c32'); L.box(2.0, 0.2, 0.02, 0, 0.9, -0.36, '#ffffff');
}
const PAL_D = ['#d65a6f', '#f2c6d2', '#e8dcc6', '#2b2b2b', '#7d97b8', '#c9483e', '#f4f0ea', '#e9b44c'];

/** Vorderkante: EG Schaufenster je 5-m-Feld mit Deko und Eingängen, OG Brüstung mit Glasgeländer. */
function frontKante(S, scene, achse, a, b, pos, eg, fassade, ra, r, artAn, d) {
  const { gz, gx, nx, nz } = ra;
  const eingang = achse === 'z' ? [gx * R, gx * R + R] : [gz * R, gz * R + R];
  const echteFront = achse === 'z' ? pos === ra.T : pos === ra.B;
  const box = (l, h, t, u, y, f) => (achse === 'z' ? S.box(l, h, t, u, y, pos - t / 2 + 0.05, f) : S.box(t, h, l, pos - t / 2 + 0.05, y, u, f));
  if (eg && echteFront) {
    for (let u = a; u < b - 0.01; u += R) {
      const m = u + R / 2;
      const tuer = m > eingang[0] && m < eingang[1];
      box(0.4, WANDHOEHE, 0.5, u, WANDHOEHE / 2, fassade);
      box(R, 0.28, 0.5, m, WANDHOEHE - 0.14, '#d23c32');
      if (tuer) {
        const L = achse === 'z' ? lokal(S, m, 0.065, pos - 1.3, 0) : lokal(S, pos - 1.3, 0.065, m, Math.PI / 2);
        L.box(3.6, 0.02, 2.2, 0, 0, 0, '#3a3f45');
        for (const s of [-1.9, 1.9]) L.box(0.25, 2.6, 0.25, s, 0, 1.15, '#c9d2d8');
        L.box(4.0, 0.25, 0.3, 0, 2.6, 1.15, '#c9d2d8');
        if (scene) schriftLiegend(scene, 'HARTWIG', L, 0, 0.03, 0, 0.75);
        continue;
      }
      // Schaufenster: Podest, Rückwand halbhoch, Glas, Deko
      const tief = 1.7;
      box(R - 0.4, 0.5, tief, m, 0.25, '#3f4a53');
      box(R - 0.4, 0.04, tief - 0.1, m, 0.52, '#e9e3d8');
      if (achse === 'z') S.box(R - 0.4, 1.5, 0.12, m, 1.25, pos - tief, dunkler(fassade, 0.06)); else S.box(0.12, 1.5, R - 0.4, pos - tief, 1.25, m, dunkler(fassade, 0.06));
      box(R - 0.4, 2.6, 0.04, m, 1.85, GLAS);
      box(R - 0.4, 0.08, 0.1, m, 3.15, '#c9d2d8');
      const i = achse === 'z' ? Math.floor(m / R) : nx - 1, j = achse === 'z' ? nz - 1 : Math.floor(m / R);
      const L = achse === 'z' ? lokal(S, m, 0.56, pos - tief / 2, 0) : lokal(S, pos - tief / 2, 0.56, m, Math.PI / 2);
      if (d > 0.3) deko(L, artAn(i, j), r);
    }
    box(0.4, WANDHOEHE, 0.5, b, WANDHOEHE / 2, fassade);
  } else if (ra.ug && echteFront) {
    // UG: geschlossener Sockel ohne Fenster
    box(b - a, 1.25, 0.3, (a + b) / 2, 0.62, dunkler(fassade, 0.04));
    box(b - a + 0.1, 0.07, 0.36, (a + b) / 2, 1.27, heller(fassade, 0.03));
  } else if (!eg && echteFront) {
    box(b - a, 0.9, 0.25, (a + b) / 2, 0.45, fassade);
    box(b - a + 0.1, 0.06, 0.32, (a + b) / 2, 0.93, heller(fassade, 0.05));
    box(b - a, 0.7, 0.04, (a + b) / 2, 1.3, GLAS);
    box(b - a, 0.05, 0.08, (a + b) / 2, 1.67, '#c9d2d8');
  } else {
    box(b - a, 0.08, 0.5, (a + b) / 2, 0.04, '#59626a');
  }
}

function schriftLiegend(scene, text, L, lx, ly, lz, hoehe) {
  const { mat, seitenverhaeltnis } = textMaterial(text, '#d23c32', { groesse: 120, versatz: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(hoehe * seitenverhaeltnis, hoehe), mat);
  const [X, Z] = L.P(lx, lz);
  m.position.set(X, L.oy + ly, Z);
  m.rotation.order = 'YXZ'; m.rotation.y = L.rot; m.rotation.x = -Math.PI / 2;
  scene.add(m);
  return m;
}

/** Gehweg und Straße vor den beiden Fronten (EG). */
function strasse(S, ax0, az0, ax1, az1, r, d) {
  const gw = 4.5, st = 9;
  const yg = -0.15;
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
  for (let k = 0; k < 6; k++) S.box(0.6, 0.02, 3.5, ax1 + gw + 1.2 + k * 1.2, -0.24, az1 + gw - 2.2, '#f6f5f0');
  for (let x = ax0 + 4; x < ax1 - 2; x += 11) { baum(S, x, az1 + gw - 1.0, r, 0.85); S.box(1.2, 0.05, 1.2, x, yg + 0.16, az1 + gw - 1.0, '#9c8a6e'); }
  for (let z = az0 + 6; z < az1 - 2; z += 11) { baum(S, ax1 + gw - 1.0, z, r, 0.85); S.box(1.2, 0.05, 1.2, ax1 + gw - 1.0, yg + 0.16, z, '#9c8a6e'); }
  for (let x = ax0 + 9.5; x < ax1; x += 11) { S.box(0.12, 4.2, 0.12, x, yg + 2.25, az1 + gw - 0.6, '#3f4a53'); S.box(0.9, 0.12, 0.25, x - 0.35, yg + 4.3, az1 + gw - 0.6, '#3f4a53'); }
  for (let k = 0; k < 3; k++) S.box(0.06, 0.8, 0.7, ax1 + gw - 0.8, yg + 0.55, az0 + 3 + k * 0.9, '#5a636b');
  const auto = (x, z, quer) => {
    const f = waehle(r, ['#d04a3f', '#2f63b5', '#f1f1ee', '#2a2d31', '#e0b23c', '#8c9aa6', '#5b8f5a']);
    const ry = quer ? Math.PI / 2 : 0;
    S.box(4.3, 0.75, 1.85, x, -0.25 + 0.65, z, f, ry);
    S.box(2.4, 0.65, 1.7, x + (quer ? 0 : -0.2), -0.25 + 1.35, z + (quer ? -0.2 : 0), '#9bb7c7', ry);
    S.box(2.2, 0.08, 1.6, x + (quer ? 0 : -0.2), -0.25 + 1.72, z + (quer ? -0.2 : 0), f, ry);
    for (const s of [-1.35, 1.35]) for (const t of [-0.85, 0.85]) S.add(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 10).rotateX(Math.PI / 2).rotateY(ry).translate(x + (quer ? t : s), -0.25 + 0.35, z + (quer ? s : t)), '#1f2328');
  };
  auto(ax0 + (ax1 - ax0) * 0.35, az1 + gw + 2.6, false);
  if (ax1 - ax0 > 25) auto(ax0 + (ax1 - ax0) * 0.75, az1 + gw + 6.3, false);
  auto(ax1 + gw + 6.3, az0 + (az1 - az0) * 0.4, true);
  const n = Math.round(((ax1 - ax0) + (az1 - az0)) / 4);
  for (let q = 0; q < n; q++) {
    const vorne = r() < (ax1 - ax0) / ((ax1 - ax0) + (az1 - az0));
    if (vorne) figur(S, zw(r, ax0 + 1, ax1 + gw - 1), az1 + zw(r, 0.8, gw - 1.6), q + 500, 'kunde', { y: yg + 0.15, ry: r() < 0.5 ? Math.PI / 2 : -Math.PI / 2, pose: r() < 0.7 ? 'gehen' : 'tasche' });
    else figur(S, ax1 + zw(r, 0.8, gw - 1.6), zw(r, az0 + 1, az1), q + 700, 'kunde', { y: yg + 0.15, ry: r() < 0.5 ? 0 : Math.PI, pose: r() < 0.7 ? 'gehen' : 'tasche' });
  }
}

/** Zusatzinszenierung auf dem normalen Etagenschnitt; Infrastruktur und Raster bleiben identisch. */
function premiumInnen(S, scene, haus, nr, k) {
  const { ax0, az0, ax1, az1, d } = k;
  const B=ax1-ax0,T=az1-az0,cx=(ax0+ax1)/2,cz=(az0+az1)/2;
  const gold='#b8955a', dunkel='#284139', stein='#eee3d1';
  // Der zentrale Lichthof wird über alle Etagen als offene Galerie markiert.
  const ring = Math.min(B,T)>18;
  if (ring) {
    for (const dx of [-1,1]) for(const dz of [-1,1]) S.box(0.55,3.8,0.55,cx+dx*5.2,1.9,cz+dz*5.2,gold);
    for(const dz of [-1,1]) S.box(10.5,0.22,0.3,cx,3.65,cz+dz*5.2,gold);
    for(const dx of [-1,1]) S.box(0.3,0.22,10.5,cx+dx*5.2,3.65,cz,gold);
  }
  // Warenwelt: Feinkosttheken, Austernbar und Weinwand im UG; Galerie und Glaskuben im EG.
  if (nr===-1 || (nr===0 && !haus.etagen.includes(-1))) {
    S.box(Math.min(B*0.3,9),1.15,1.7,cx,0.7,cz+T*0.23,stein);
    for(let u=0;u<7;u++) S.box(0.28,0.7,0.28,cx-3+u,1.5,cz+T*0.23,'#e0cba8');
    for(let u=0;u<8;u++) S.box(0.5,2.3,0.4,ax0+2+u*0.7,1.4,az0+1.0,dunkel);
  } else if(nr===0 || nr===1) {
    for(let u=0;u<4;u++) {
      const x=ax0+3+u*3.6;
      S.box(2.1,1.9,1.0,x,1.1,az0+2,stein);
      S.box(2.15,1.6,0.1,x,2.0,az0+2.52,'#8db0b8');
      S.box(2.2,0.18,1.2,x,2.16,az0+2,gold);
    }
  } else if(nr===Math.max(...haus.etagen)) {
    for(let u=0;u<5;u++) {
      const x=ax0+3+u*3;
      if(x<ax1-2) S.box(1.1,0.8,1.1,x,0.6,az0+2,'#ede8dc');
    }
  }
}
