// Häuser der eigenen Kette „Hartwig“ (Warenhaus) und „Hartwig Sport“, generiert aus den Engine-Daten (haeuser.json).
// Bildsprache Coffee Inc 2: Detail aus Geometrie, nur +x und +z voll detailliert, Logos über textTextur().
//
// export warenhaus(S, scene, haus, { x, z, status?, zusatz?, aktion?, untermieter?, hartwig?, familie? })  → { hoehe, w, d, familie, teile }
// Zustände (Räumung, Leerstand, Untermiete …) kommen aus zustaende.js.
// export familieVon(haus), masse(haus), FAMILIEN, EG, GH
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, rng, waehle, zw, heller, dunkler, textTextur, textMaterial, LOD } from './basis.js';
import { zustandNormal, zustandFlags, zustandsDekor, eigeneMieterflaechen, ladenInhalt, merke, mieterInfo } from './zustaende.js';
import { seitenVon as seitenFremd, plakat as plakatFremd, passend as passendFremd } from './sporthelfer.js';
import { WETTBEWERBER_FARBEN } from './wettbewerber.js';
import { dachInstallationen } from './dach-qualitaet.js';
import { dachLandschaft } from './dach-landschaft.js';
import { STADT_GEOGRAFIE } from './stadt-geografie.js';

export const ROT = '#d23c32';
export const EG = 5.5, GH = 4.5;
export const FAMILIEN = { 1: 'Kaiserzeit', 2: 'Neue Sachlichkeit', 3: 'Nachkrieg', 4: 'Kachelfassade', 5: 'Glas/Postmoderne', 6: 'Center-Kopfbau', 7: 'Sporthaus',
  8: 'Aluwabe', 9: 'Kachelraster Ost', 10: 'Glasvorhang 70er Ost', 11: 'Magistrale 50er' };

/** Städte der ehemaligen DDR (Berlin nur teilweise, siehe istOstHaus). */
export const DDR_STAEDTE = Object.keys(STADT_GEOGRAFIE).filter((name) => STADT_GEOGRAFIE[name].ddr || ['Berlin', 'Rostock', 'Stralsund', 'Schwerin', 'Dresden', 'Leipzig', 'Magdeburg', 'Erfurt', 'Chemnitz', 'Halle', 'Potsdam', 'Cottbus', 'Jena', 'Zwickau', 'Görlitz', 'Dessau', 'Gera', 'Weimar'].includes(name));
const anteil = (id, salz) => rng(`${id}/${salz}`)();
/**
 * Ehemaliges DDR-Warenhaus? Nur Warenhäuser außerhalb von Centern (Grundfläche/Mall-Flügel bleiben unverändert).
 * Berlin: nur etwa die Hälfte der Häuser (Ostteil), deterministisch per id. Baujahr 1960 bis 1989 immer,
 * sonst mit 50 % (in haeuser.json liegen nur wenige Häuser 1960 bis 1989 in DDR-Städten).
 */
export function istOstHaus(haus) {
  if (!haus || haus.format === 'sport' || haus.lage === 'center') return false;
  if (!DDR_STAEDTE.includes(haus.stadt)) return false;
  if (haus.stadt === 'Berlin' && anteil(haus.id, 'berlin-ost') >= 0.5) return false;
  const j = haus.baujahr ?? 0;
  if (j >= 1960 && j <= 1989) return true;
  return anteil(haus.id, 'ost') < 0.5;
}
function ostFamilie(haus) {
  const j = haus.baujahr ?? 1975, r = anteil(haus.id, 'ostfamilieg');
  if (j >= 1950 && j <= 1963) return r < 0.7 ? 11 : 9;
  if (j < 1950) return r < 0.45 ? 11 : r < 0.75 ? 8 : 10; // Nachkriegsersatz für zerstörte Altbauten
  if (j <= 1974) return r < 0.55 ? 8 : 9;
  if (j <= 1989) return r < 0.4 ? 10 : r < 0.75 ? 9 : 8;
  return [8, 9, 10][Math.floor(r * 3)]; // Wende-Jahrgang: übernommener DDR-Bau
}

const GLAS = '#4d6677', GLAS_TUER = '#2f3d48', GLAS_HELL = '#7d9fb2', LICHT = '#f7e9c8', RAHMEN = '#3a4148', STAHL = '#8f989f';
const KIES = '#bab8b2', KIES_D = '#a9a7a1', TOT = '#7c3d36';
const KLEID = ['#d04a3f', '#2f63b5', '#e8e4dc', '#e0b23c', '#5b8f5a', '#8d5fbf', '#ef8b4c', '#2b2b2b', '#f2c6d2', '#7d97b8', '#1f3f6b'];
const AUTO = ['#d04a3f', '#2f63b5', '#f1f1ee', '#2a2d31', '#e0b23c', '#8c9aa6', '#5b8f5a', '#f1f1ee', '#9aa4ad'];
const MALLS = ['LINDENGALERIE', 'MARKTQUARTIER', 'KÖNIGSPASSAGE', 'STADTCARRÉ', 'WALLARKADEN', 'BRÜCKENHOF'];
const SLOGANS = ['LAUF LOS.', 'RAUS. JETZT.', 'NEUE SAISON', 'BERG RUFT.', 'DEIN SPIEL.', 'WINTER KOMMT'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- Daten → Form
/** Anzahl Fassadenvarianten je Familie (Index haus.fassade). */
export const VARIANTEN = (fam) => (fam === 6 ? 16 : fam === 5 ? 12 : 8);

export function familieVon(haus) {
  if (haus.format === 'sport') return 7;
  if (haus.lage === 'center') return 6;
  if (istOstHaus(haus)) return ostFamilie(haus);
  const j = haus.baujahr;
  if (j <= 1919) return 1;
  if (j <= 1939) return 2;
  if (j <= 1964) return 3;
  if (j <= 1980) return 4;
  return 5;
}

/** Grundfläche → Breite × Tiefe auf 5-m-Raster, Seitenverhältnis 1,2 bis 1,8; Etagen → Höhe. */
export function masse(haus) {
  const A = Math.max(300, haus.grundflaecheQm || 2000);
  const r = rng(String(haus.id) + '/masse');
  const ziel = 1.25 + r() * 0.5;
  let best = null;
  for (let w = 15; w <= 170; w += 5) for (let d = 10; d <= w; d += 5) {
    const q = w / d;
    if (q < 1.2 || q > 1.8) continue;
    const s = Math.abs(w * d - A) / A + 0.12 * Math.abs(q - ziel);
    if (!best || s < best.s) best = { w, d, s };
  }
  const n = Math.max(1, (haus.etagen || [0]).filter((e) => e >= 0).length);
  return { w: best.w, d: best.d, n, H: EG + (n - 1) * GH };
}

// ---------------------------------------------------------------- Helfer: Fassadenseite in lokalen Koordinaten
// u = Lauf entlang der Fassade (u = L ist immer die sichtbare Hausecke), y = Höhe, t = Abstand nach außen.
function spiegeln(g) {
  for (const n of ['position', 'normal']) {
    const a = g.attributes[n]?.array;
    if (!a) continue;
    for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; }
    for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; }
  }
}
class Seite {
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
  /** Geometrie im lokalen Rahmen (x = u, y, z = t) einsetzen. */
  geo(g, f) {
    g = g.index ? g.toNonIndexed() : g;
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
    if (this.seite === '+x') spiegeln(g);
    const [x, z] = this.welt(0, 0);
    g.translate(x, 0, z);
    this.S.add(g, f);
  }
  /** gedrehter Quader: rz dreht in der Fassadenebene, rx kippt nach außen. */
  kipp(bu, by, bt, u, y, t, f, rz = 0, rx = 0) {
    const g = new THREE.BoxGeometry(bu, by, bt);
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    g.translate(u, y, t);
    this.geo(g, f);
  }
  /** Fläche (Text) an die Fassade setzen. */
  flaeche(mesh, u, y, t, rz = 0) {
    if (this.seite === '+z') { mesh.position.set(this.basis + u, y, this.ebene + t); mesh.rotation.set(0, 0, rz); }
    else { mesh.position.set(this.ebene + t, y, this.basis + u); mesh.rotation.set(0, Math.PI / 2, rz); }
  }
}
const seitenVon = (S, x0, z0, w, d) => [new Seite(S, x0, z0, w, d, '+z'), new Seite(S, x0, z0, w, d, '+x')];

/** Pyramidenstumpf über w × d (Mitte unten im Ursprung). */
function stumpf(w, d, h, ein, einZ = ein) {
  const a = [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2]];
  const b = [[-w / 2 + ein, h, -d / 2 + einZ], [w / 2 - ein, h, -d / 2 + einZ], [w / 2 - ein, h, d / 2 - einZ], [-w / 2 + ein, h, d / 2 - einZ]];
  const p = [];
  const quad = (A, B, C, D) => p.push(...A, ...B, ...C, ...A, ...C, ...D);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(a[i], b[i], b[j], a[j]); }
  quad(b[0], b[3], b[2], b[1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}
/** Dreiecksgiebel (Prisma) an einer Seite: Basis bei y, Spitze y + h, Dicke entlang t. */
function giebel(s, u, y, t, breite, h, dicke, f) {
  const sh = new THREE.Shape();
  sh.moveTo(-breite / 2, 0); sh.lineTo(breite / 2, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: dicke, bevelEnabled: false });
  g.translate(u, y, t - dicke / 2);
  s.geo(g, f);
}
/** Rundbogen (Halbscheibe) oben auf einem Fenster. */
function bogen(s, u, y, t, rad, dicke, f) {
  const g = new THREE.CylinderGeometry(rad, rad, dicke, 12, 1, false, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  g.translate(u, y, t + dicke / 2);
  s.geo(g, f);
}
function viertelzylinder(S, cx, cz, rad, y0, y1, f, seg = 12) {
  const g = new THREE.CylinderGeometry(rad, rad, y1 - y0, seg, 1, false, 0, Math.PI / 2);
  g.translate(cx, (y0 + y1) / 2, cz);
  S.add(g, f);
}
function zyl(S, x, y0, z, rad, h, f, seg = 12, oben = rad) {
  const g = new THREE.CylinderGeometry(oben, rad, h, seg);
  g.translate(x, y0 + h / 2, z);
  S.add(g, f);
}

// ---------------------------------------------------------------- Schrift
// Texturen und Materialien aus dem gemeinsamen Cache in basis.js
const tex = (text, farbe, bg = null) => textTextur(text, farbe, 120, bg);
const texMat = (text, farbe, bg = null, lit = false) => textMaterial(text, farbe, { groesse: 120, hintergrund: bg, alphaTest: 0.45, lit }).mat;
const PH = 2.05; // Ebenenhöhe je Meter Buchstabenhöhe
function buchstabenBreite(c, hb) { return c === ' ' ? hb * 0.45 : ((tex(c, '#000').seitenverhaeltnis * 180 - 96) / 180) * hb * PH; }
function schriftBreite(text, hb) { const z = [...text]; return z.reduce((a, c) => a + buchstabenBreite(c, hb), 0) + hb * 0.16 * (z.length - 1); }

/** Einzelbuchstaben (Leuchtschrift). o: { kaputt, geist(Farbe), r } */
function leuchtschrift(K, s, text, um, y, t, hb, farbe, o = {}) {
  const z = [...text];
  const br = z.map((c) => buchstabenBreite(c, hb));
  const gap = hb * 0.16;
  const total = br.reduce((a, b) => a + b, 0) + gap * (z.length - 1);
  const r = o.r ?? K.r;
  const defekt = new Map();
  if (o.abbau != null) { // abmontierte Buchstaben: nur die ersten bleiben hängen
    const idx = z.map((c, i) => i).filter((i) => z[i] !== ' ');
    const bleib = Math.max(1, Math.round(idx.length * o.abbau));
    idx.forEach((i, j) => { if (j >= bleib) defekt.set(i, 'weg'); });
  }
  // Q36: intakter Schriftzug als eine Fläche (ein Draw Call statt einer je Buchstabe, kein Buchstabe kann fehlen).
  // Haarspatien halten die Laufweite der Einzelbuchstaben; die Fläche wird auf die gleiche Gesamtbreite gesetzt.
  if (o.abbau == null && !o.geist) {
    const f = o.kaputt ? ausgeblichen(farbe) : farbe;
    // Fernstufe: wie bisher bei Einzelbuchstaben entfällt der Schriftzug nur, wenn jeder Buchstabe unter der Schildgrenze läge.
    if (LOD.stufe === 'fern' && Math.max(...z.filter((c) => c !== ' ').map((c) => tex(c, f).seitenverhaeltnis)) * hb * PH < LOD.schildMin) return total;
    // Je zwei Buchstaben eine Fläche: ein Viertel der Zeichenaufrufe, Hüllkugel kaum größer als beim Einzelbuchstaben.
    // Fläche nur so breit wie die Schrift (Textur-Rand per UV abgeschnitten).
    const rand = (96 / 180) * hb * PH;
    let acc0 = 0;
    const pos = z.map((c, i) => { const a = acc0; acc0 += br[i] + gap; return { a, b: a + br[i], c }; });
    const teile = [];
    for (const p of pos) { if (p.c === ' ') { teile.push(null); continue; } const l = teile[teile.length - 1]; if (l && l.length < 2) l.push(p); else teile.push([p]); }
    for (const tl of teile) {
      if (!tl) continue;
      const a = tl[0].a, b = tl[tl.length - 1].b, breite = b - a, wort = tl.map((p) => p.c).join('\u200A');
      const geo = new THREE.PlaneGeometry(breite, hb * PH), uv = geo.attributes.uv, rel = (rand / 2) / (breite + rand);
      for (let i = 0; i < uv.count; i++) uv.setX(i, rel + uv.getX(i) * (1 - 2 * rel));
      const m = new THREE.Mesh(geo, texMat(wort, f));
      s.flaeche(m, um + s.lese * (-total / 2 + (a + b) / 2), y, t, 0);
      m.userData.schriftzug = { text, i: -1, n: z.length, seite: s.seite, wort: true };
      K.scene.add(m);
    }
    return total;
  }
  let acc = 0;
  z.forEach((c, i) => {
    const uc = um + s.lese * (-total / 2 + acc + br[i] / 2);
    acc += br[i] + gap;
    if (c === ' ') return;
    const df = defekt.get(i);
    if (df === 'weg' && o.aus && o.aus.u == null) o.aus.u = uc;
    if (df === 'weg') { // nur Halterungen bleiben
      s.q(uc - hb * 0.25, uc - hb * 0.15, y - hb * 0.3, y + hb * 0.3, t - 0.3, t - 0.05, '#6c6c6c');
      s.q(uc + hb * 0.15, uc + hb * 0.25, y - hb * 0.3, y + hb * 0.3, t - 0.3, t - 0.05, '#6c6c6c');
      return;
    }
    const f = o.geist ?? (df === 'tot' ? TOT : df === 'blass' ? ausgeblichen(farbe) : farbe);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tex(c, f).seitenverhaeltnis * hb * PH, hb * PH), texMat(c, f, null, !!o.geist));
    s.flaeche(m, uc, y, t, 0);
    if (!o.geist && !o.abbau) m.userData.schriftzug = { text, i, n: z.length, seite: s.seite };
    K.scene.add(m);
  });
  return total;
}
/** Textschild als Fläche mit Hintergrund. Gibt Breite zurück. */
function plakat(K, s, text, u, y, t, ph, farbe, bg, lit = false) {
  const sv = tex(text, farbe, bg).seitenverhaeltnis;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sv * ph, ph), texMat(text, farbe, bg, lit));
  s.flaeche(m, u, y, t);
  K.scene.add(m);
  return sv * ph;
}
const plakatBreite = (text, ph) => tex(text, '#000', '#fff').seitenverhaeltnis * ph;

// ---------------------------------------------------------------- Erdgeschoss
function puppe(s, u, y, t, oben, unten, sk = 1) {
  s.q(u - 0.28 * sk, u + 0.28 * sk, y, y + 0.08, t - 0.22, t + 0.22, '#d9d4cc');
  s.q(u - 0.17 * sk, u + 0.17 * sk, y + 0.08, y + 0.95 * sk, t - 0.1, t + 0.1, unten);
  s.q(u - 0.26 * sk, u + 0.26 * sk, y + 0.95 * sk, y + 1.62 * sk, t - 0.13, t + 0.13, oben);
  s.q(u - 0.11 * sk, u + 0.11 * sk, y + 1.64 * sk, y + 1.92 * sk, t - 0.11, t + 0.11, '#f1ece4');
}
function auslage(K, s, a, b, y, t, gruppe) {
  const r = K.r, m = (a + b) / 2, br = b - a;
  const nP = br > 3.6 ? 3 : 2;
  const reihe = (fn) => { for (let i = 0; i < nP; i++) fn(a + br * (i + 0.5) / nP, i); };
  switch (gruppe) {
    case 'beauty':
      s.q(m - 1.0, m + 1.0, y, y + 2.6, t - 0.3, t - 0.22, waehle(r, ['#f2c6d2', '#1f1f1f', '#d8b25a']));
      s.q(a + 0.4, b - 0.4, y, y + 0.6, t - 0.15, t + 0.2, '#fbfaf7');
      for (let i = 0; i < 4; i++) s.q(a + 0.6 + i * (br - 1.2) / 4, a + 0.9 + i * (br - 1.2) / 4, y + 0.6, y + 0.9 + r() * 0.5, t - 0.05, t + 0.15, waehle(r, ['#b5162b', '#ffffff', '#d8b25a', '#f2c6d2']));
      break;
    case 'accessoires': case 'sportschuhe':
      s.q(a + 0.4, b - 0.4, y, y + 0.45, t - 0.25, t + 0.25, '#efe9df');
      s.q(m - br * 0.2, m + br * 0.2, y + 0.45, y + 0.95, t - 0.25, t + 0.1, '#e2dacd');
      for (let i = 0; i < 5; i++) {
        const u = a + 0.7 + i * (br - 1.4) / 4, hoch = i === 2 ? 0.95 : 0.45;
        s.q(u - 0.25, u + 0.25, y + hoch, y + hoch + (gruppe === 'sportschuhe' ? 0.2 : 0.45), t - 0.1, t + 0.12, waehle(r, ['#5a3b22', '#2b2b2b', '#c9483e', '#e8dcc6', '#2f6f8f', '#f1f1ee']));
      }
      break;
    case 'wohnen':
      s.q(a + 0.5, a + 2.6, y, y + 0.55, t - 0.3, t + 0.2, waehle(r, ['#7d97b8', '#c9a26b', '#5b8f5a', '#b25b4c']));
      s.q(a + 0.5, a + 2.6, y + 0.55, y + 1.1, t - 0.3, t - 0.12, waehle(r, ['#6c86a7', '#b8915a', '#4e7f4d']));
      s.q(b - 0.9, b - 0.82, y, y + 1.8, t - 0.04, t + 0.04, '#333333');
      s.q(b - 1.2, b - 0.52, y + 1.6, y + 2.0, t - 0.2, t + 0.15, '#f4ead2');
      break;
    case 'spielwaren':
      for (let i = 0; i < 5; i++) s.q(a + 0.5 + i * 0.6, a + 1.0 + i * 0.6, y, y + 0.5 + (i % 3) * 0.45, t - 0.2, t + 0.2, waehle(r, ['#e04b3a', '#f2c14e', '#3a7bd5', '#4caf50', '#ff8c42']));
      s.q(b - 1.4, b - 0.5, y, y + 0.9, t - 0.25, t + 0.2, '#a0703f');
      s.q(b - 1.25, b - 0.65, y + 0.9, y + 1.45, t - 0.2, t + 0.15, '#a0703f');
      break;
    case 'food':
      s.q(a + 0.4, b - 0.4, y, y + 1.3, t - 0.3, t - 0.05, '#b9895a');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) s.q(a + 0.55 + i * (br - 1.1) / 4, a + 0.45 + (i + 1) * (br - 1.1) / 4, y + 0.15 + j * 0.6, y + 0.5 + j * 0.6, t - 0.05, t + 0.2, waehle(r, ['#e04b3a', '#f2c14e', '#7cb342', '#ff8c42', '#8e5b3a']));
      break;
    case 'rad': case 'sport': {
      const u = m;
      for (const du of [-0.65, 0.65]) { const g = new THREE.TorusGeometry(0.42, 0.05, 4, 14); g.translate(u + du, y + 0.45, t); s.geo(g, '#2b2b2b'); }
      s.kipp(1.4, 0.08, 0.08, u, y + 0.75, t, waehle(r, ['#e04b3a', '#1f6fb5', '#f2c14e']), 0.35);
      s.q(u - 0.1, u + 0.1, y + 0.45, y + 1.05, t - 0.04, t + 0.04, '#555555');
      if (gruppe === 'sport') puppe(s, a + 0.6, y, t, waehle(r, KLEID), '#2b2b2b');
      break;
    }
    case 'outdoor': {
      const g = new THREE.ConeGeometry(1.1, 1.4, 4); g.rotateY(Math.PI / 4); g.translate(m - 0.4, y + 0.7, t); s.geo(g, waehle(r, ['#e36b2c', '#3f7d56', '#f2c14e']));
      puppe(s, b - 0.7, y, t, waehle(r, ['#c0392b', '#2e7d32', '#1f3f6b']), '#3a3a3a');
      break;
    }
    case 'wintersport':
      for (let i = 0; i < 4; i++) s.q(a + 0.6 + i * 0.35, a + 0.75 + i * 0.35, y, y + 1.9, t - 0.03, t + 0.03, waehle(r, ['#e04b3a', '#1f6fb5', '#f2c14e', '#ffffff']));
      puppe(s, b - 0.8, y, t, waehle(r, ['#e04b3a', '#1f6fb5', '#ffffff']), '#2b2b2b');
      break;
    default: {
      const sk = gruppe === 'kinder' ? 0.72 : 1;
      s.q(a + 0.3, b - 0.3, y, y + 0.22, t - 0.32, t + 0.32, '#e9e4da');
      reihe((u, i) => puppe(s, u, y + 0.22, t, gruppe === 'waesche' ? waehle(r, ['#ffffff', '#f2c6d2', '#e8e4dc']) : waehle(r, KLEID), gruppe === 'waesche' ? '#f1ece4' : waehle(r, ['#2b3a55', '#3a3a3a', '#6b5a48', '#20304a', '#e8e4dc']), sk));
    }
  }
}

/**
 * Schaufensterzone einer Seite. o: { u0, u1, tF, raster, pfeiler, sockel, sturz, glas, rueck, pb, eingaenge (Indizes), tuer: 'dreh'|'schiebe' }
 * Gibt die Fensterachsen zurück: [{ a, b, eingang, mieter }].
 */
function erdgeschoss(K, s, o = {}) {
  const u0 = o.u0 ?? 0, u1 = o.u1 ?? s.L, tF = o.tF ?? 0, rueck = o.rueck ?? 0.7, pb = o.pb ?? 0.8;
  const sockH = 0.55, gTop = o.glasTop ?? 4.3, hE = o.h ?? EG;
  const pf = o.pfeiler, sockF = o.sockel ?? dunkler(pf, 0.12), sturz = o.sturz ?? pf, glas = o.glas ?? GLAS;
  const len = u1 - u0;
  if (len < 2.5) return [];
  const nb = Math.max(1, Math.round(len / (o.raster ?? 5)));
  const bw = len / nb;
  let ein = o.eingaenge;
  if (!ein) ein = s.seite === '+z' ? (nb >= 4 ? [Math.round(nb * 0.4), nb - 1] : [Math.floor(nb / 2)]) : (nb >= 3 ? [Math.round(nb * 0.55)] : []);
  ein = new Set(ein.map((i) => clamp(i, 0, nb - 1)));
  const tG = tF - rueck;
  for (let i = 0; i <= nb; i++) { const ub = u0 + i * bw; s.q(ub - pb / 2, ub + pb / 2, 0, hE, tG - 0.15, tF + 0.12, pf); }
  const achsen = [];
  const gr = K.gruppenEG;
  for (let i = 0; i < nb; i++) {
    const a = u0 + i * bw + pb / 2, b = u0 + (i + 1) * bw - pb / 2, m = (a + b) / 2;
    const mieter = K.mieterEG.find((x) => x.seite === s.seite && m > x.u0 && m < x.u1);
    achsen.push({ a, b, eingang: ein.has(i) && !mieter, mieter });
    s.q(a, b, gTop, hE, tG, tF + 0.04, sturz);
    s.q(a, b, 0, sockH, tG, tF + 0.06, sockF);
    if (mieter) { // Untermieter: helles Inneres, eigener Rahmen, eigener Eingang
      const rahmenM = mieter.bg === '#ffffff' ? mieter.fg : mieter.bg;
      const tuerM = !mieter.tuer && m > (mieter.u0 + mieter.u1) / 2 - bw / 2;
      if (tuerM) mieter.tuer = true;
      s.q(a, b, tuerM ? 0.3 : sockH, gTop, tG - 0.1, tG, tuerM ? GLAS_TUER : '#8fa8b5');
      s.q(a, b, sockH, sockH + 0.12, tG, tG + 0.1, rahmenM);
      s.q(a, b, gTop - 0.14, gTop, tG, tG + 0.1, rahmenM);
      s.q(m - 0.06, m + 0.06, tuerM ? 0.3 : sockH, gTop, tG, tG + 0.1, rahmenM);
      if (tuerM) { s.q(a, a + 0.18, 0.3, gTop, tG, tF + 0.1, rahmenM); s.q(b - 0.18, b, 0.3, gTop, tG, tF + 0.1, rahmenM); K.eingaenge.push({ seite: s.seite, u: m, breite: b - a, t: tG, mieter: true }); }
      else if (!K.zu) ladenInhalt(s, a, b, sockH + 0.02, tG, tF - 0.05, mieter.typ, K.r);
      continue;
    }
    if (ein.has(i)) {
      K.eingaenge.push({ seite: s.seite, u: m, breite: b - a, t: tG });
      s.q(a, b, 0.3, gTop, tG - 0.1, tG, GLAS_TUER);
      for (let k = 1; k < 4; k++) s.q(a + (b - a) * k / 4 - 0.05, a + (b - a) * k / 4 + 0.05, 0.3, gTop, tG, tG + 0.06, RAHMEN);
      s.q(a, b, 2.7, 2.85, tG, tG + 0.06, RAHMEN);
      // Portal in Hartwig-Rot
      s.q(a, a + 0.22, 0.3, gTop + 0.1, tG, tF + 0.18, ROT);
      s.q(b - 0.22, b, 0.3, gTop + 0.1, tG, tF + 0.18, ROT);
      s.q(a, b, gTop - 0.1, gTop + 0.15, tG, tF + 0.18, ROT);
      if (K.zu) {
        s.q(a + 0.2, b - 0.2, 0.3, gTop - 0.1, tG + 0.08, tG + 0.14, '#8e9499');
        for (let y = 0.6; y < gTop - 0.2; y += 0.42) s.q(a + 0.2, b - 0.2, y, y + 0.07, tG + 0.14, tG + 0.18, '#6f757a');
      } else if (o.tuer === 'dreh') {
        const g = new THREE.CylinderGeometry(1.15, 1.15, 2.5, 12); g.translate(m, 0.3 + 1.25, tG + 0.2); s.geo(g, '#6a8796');
        const d2 = new THREE.CylinderGeometry(1.3, 1.3, 0.25, 12); d2.translate(m, 2.9, tG + 0.2); s.geo(d2, RAHMEN);
      }
      continue;
    }
    // Schaufenster
    K.fensterEG.push({ seite: s.seite, a, b, y0: sockH, y1: gTop, t: tG });
    s.q(a, b, sockH, gTop, tG - 0.1, tG, glas);
    if (K.status === 'leer') { // zugeklebt
      s.q(a + 0.05, b - 0.05, sockH, gTop - 0.05, tG, tG + 0.05, i % 2 ? '#ece3cc' : '#e2d6b8');
      s.kipp(b - a - 0.4, 0.22, 0.03, m, (sockH + gTop) / 2, tG + 0.07, '#cbbd98', 0.5);
      continue;
    }
    if (K.status === 'geschlossen') { // Rollgitter
      s.q(a, b, sockH, gTop, tG + 0.02, tG + 0.06, '#9aa0a4');
      for (let y = sockH + 0.3; y < gTop; y += 0.38) s.q(a, b, y, y + 0.07, tG + 0.06, tG + 0.1, '#7a8085');
      continue;
    }
    s.q(a, b, gTop - 0.32, gTop - 0.12, tG, tG + 0.03, LICHT);
    s.q(a, b, gTop - 1.0, gTop - 0.9, tG, tG + 0.05, RAHMEN);
    auslage(K, s, a, b, sockH + 0.02, tG + rueck * 0.45, gr[(i + (s.seite === '+x' ? 3 : 0)) % gr.length]);
  }
  // Untermieterschild
  for (const mi of K.mieterEG.filter((x) => x.seite === s.seite)) {
    const as = achsen.filter((x) => x.mieter === mi);
    if (!as.length) continue;
    const ua = as[0].a - pb / 2, ub = as[as.length - 1].b + pb / 2;
    mi.ua = ua; mi.ub = ub;
    s.q(ua, ub, gTop + 0.1, hE - 0.05, tF + 0.04, tF + 0.3, mi.bg);
    s.q(ua, ub, gTop + 0.02, gTop + 0.12, tF + 0.04, tF + 0.36, dunkler(mi.bg, 0.15));
    const ph = Math.min(1.2, ((ub - ua) * 0.85) / tex(mi.name, mi.fg, mi.bg).seitenverhaeltnis);
    plakat(K, s, mi.name, (ua + ub) / 2, (gTop + hE) / 2 + 0.05, tF + 0.32, ph, mi.fg, mi.bg);
    s.kipp(ub - ua - 0.4, 0.12, 1.3, (ua + ub) / 2, gTop - 0.2, tF + 0.6, mi.bg === '#ffffff' ? mi.fg : mi.bg, 0, 0.35);
  }
  return achsen;
}

/** Vordach entlang einer Seite. stil: platte | duenn | glas | markisen. Lässt Untermieter frei. */
function vordach(K, s, o = {}) {
  const y = o.y ?? 4.55, tief = o.tiefe ?? 2.2, tF = o.tF ?? 0, stil = o.stil ?? 'platte';
  const farbe = o.farbe ?? '#f4f1ea';
  const u0 = o.u0 ?? 0;
  let u1 = o.u1 ?? s.L;
  if (u1 >= s.L - 0.01 && s.seite === '+z' && o.ecke !== false) u1 = s.L + tF + tief;
  let stuecke = [[u0, u1]];
  for (const mi of K.mieterEG.filter((x) => x.seite === s.seite)) {
    const neu = [];
    for (const [a, b] of stuecke) { if (mi.ub <= a || mi.ua >= b) neu.push([a, b]); else { if (mi.ua > a) neu.push([a, mi.ua]); if (mi.ub < b) neu.push([mi.ub, b]); } }
    stuecke = neu;
  }
  for (const [a, b] of stuecke) {
    if (b - a < 0.5) continue;
    if (stil === 'markisen' && o.achsen) {
      for (const ax of o.achsen) {
        if (ax.mieter || ax.b < a || ax.a > b) continue;
        if (ax.eingang) { s.q(ax.a - 0.3, ax.b + 0.3, 4.45, 4.65, tF, tF + 1.6, '#3f474e'); continue; }
        const mm = (ax.a + ax.b) / 2, bb = ax.b - ax.a;
        s.kipp(bb, 0.12, 1.7, mm, 4.0, tF + 0.75, o.markise ?? ROT, 0, 0.42);
        for (let k = 0; k < 3; k++) s.kipp(bb * 0.12, 0.13, 1.7, ax.a + bb * (0.2 + k * 0.3), 4.0, tF + 0.75, '#f6f2ea', 0, 0.42);
        s.q(ax.a, ax.b, 3.05, 3.4, tF + 1.48, tF + 1.56, o.markise ?? ROT);
      }
      continue;
    }
    if (stil === 'glas') {
      s.q(a, b, y, y + 0.1, tF, tF + tief, '#a9c6d3');
      s.q(a, b, y - 0.2, y + 0.15, tF + tief - 0.15, tF + tief, STAHL);
      const l = wurzelSumme(tief, 2.4), th = Math.atan2(-tief, 2.4);
      for (let u = a + 1; u < b; u += 3) {
        s.q(u - 0.07, u + 0.07, y - 0.22, y, tF, tF + tief, STAHL);
        s.kipp(0.07, l, 0.07, u, y + 1.2, tF + tief / 2, '#6f777e', 0, th);
      }
      continue;
    }
    const dick = stil === 'duenn' ? 0.24 : 0.5;
    s.q(a, b, y, y + dick, tF, tF + tief, farbe);
    if (o.streifen !== false) s.q(a, b, y + dick * 0.3, y + dick * 0.7, tF + tief, tF + tief + 0.04, ROT);
    if (stil === 'duenn') s.q(a, b, y + dick, y + dick + 0.08, tF + tief - 0.12, tF + tief, heller(farbe, 0.05));
    for (const u of o.stuetzen ?? []) if (u > a && u < b) { const [x, z] = s.welt(u, tF + tief - 0.35); zyl(K.S, x, 0.3, z, 0.11, y - 0.3, '#5f676e', 8); }
  }
}

/** Hängefahnen an Auslegern. */
function haengefahnen(K, s, us, y, t0) {
  for (const u of us) {
    s.q(u - 0.05, u + 0.05, y, y + 0.1, t0, t0 + 2.3, '#4a4f55');
    s.q(u - 0.04, u + 0.04, y - 4.2, y, t0 + 1.0, t0 + 2.2, K.zu ? '#cfcac0' : ROT);
    if (!K.zu) s.q(u - 0.045, u + 0.045, y - 3.2, y - 2.8, t0 + 1.0, t0 + 2.2, '#ffffff');
  }
}
/** Fahnenmasten auf dem Dach. */
function fahnenmasten(K, s, us, y, t) {
  for (const u of us) {
    const [x, z] = s.welt(u, t);
    zyl(K.S, x, y, z, 0.07, 6, '#d9dcde', 6);
    s.q(u + 0.07 * s.lese, u + 1.6 * s.lese, y + 4.8, y + 5.9, t - 0.03, t + 0.03, K.zu ? '#cfcac0' : ROT);
  }
}

// ---------------------------------------------------------------- Dach
function attika(K, x0, z0, w, d, y, h, f, dick = 0.5) {
  const S = K.S;
  S.quader(x0, y, z0, x0 + w, y + 0.15, z0 + d, KIES);
  S.quader(x0, y, z0 + d - dick, x0 + w, y + h, z0 + d, f);
  S.quader(x0 + w - dick, y, z0, x0 + w, y + h, z0 + d, f);
  S.quader(x0, y, z0, x0 + w, y + h, z0 + dick, f);
  S.quader(x0, y, z0, x0 + dick, y + h, z0 + d, f);
  S.quader(x0 - 0.1, y + h, z0 + d - dick - 0.1, x0 + w + 0.1, y + h + 0.12, z0 + d + 0.1, heller(f, 0.04));
  S.quader(x0 + w - dick - 0.1, y + h, z0 - 0.1, x0 + w + 0.1, y + h + 0.12, z0 + d + 0.1, heller(f, 0.04));
}
/** Dachfläche für Zustände (Pflanzen, Dachgastronomie) merken; reserviert bei Dachgastro eine Ecke. */
function setzeDach(K, x0, z0, x1, z1, y) {
  K.dach = { x0, z0, x1, z1, y };
  if (K.dachGastro && x1 - x0 > 10 && z1 - z0 > 8) {
    const tw = Math.min(17, (x1 - x0) * 0.5), td = Math.min(12, (z1 - z0) * 0.6);
    K.terrasse = { x0: x1 - tw, z0: z1 - td, x1, z1, y };
  }
}
function reserviert(K, x, z, rad = 0) {
  const t = K.terrasse;
  if (K.dachBelegt?.some((q) => Math.abs(q.x - x) < q.w / 2 + rad + 0.6 && Math.abs(q.z - z) < q.d / 2 + rad + 0.6)) return true;
  return !!t && x + rad > t.x0 - 0.5 && x - rad < t.x1 + 0.5 && z + rad > t.z0 - 0.5 && z - rad < t.z1 + 0.5;
}
/** Lichtkuppeln in Reihen. */
function lichtkuppeln(K, x0, z0, x1, z1, y, ax = 6.5, az = 9) {
  const S = K.S;
  if (x1 - x0 < 8 || z1 - z0 < 8) return;
  // Q36: große Dächer bekommen eine gegliederte Dachlandschaft statt eines gleichförmigen Kuppelrasters.
  K.dachBelegt ??= [];
  // Nur wo das Kuppelraster groß ist (ab 18 Kuppeln): dort ist die Dachlandschaft auch leichter als das Raster.
  const kuppeln = Math.floor((x1 - x0 - 2) / ax) * Math.floor((z1 - z0 - 2) / az);
  if (kuppeln >= 18 && dachLandschaft(S, { x0, z0, x1, z1, y }, rng(`${K.haus?.id ?? ''}:dach:${Math.round(x0)}:${Math.round(z0)}`),
    { baujahr: K.haus?.baujahr, alt: K.alt, belegt: K.dachBelegt, reserviert: (x, z, rad) => reserviert({ terrasse: K.terrasse }, x, z, rad), protokoll: K.qualitaet?.daecher })) {
    K.dachLandschaft = true;
    return;
  }
  const nx = Math.floor((x1 - x0 - 2) / ax), nz = Math.floor((z1 - z0 - 2) / az);
  const ox = x0 + (x1 - x0 - (nx - 1) * ax) / 2, oz = z0 + (z1 - z0 - (nz - 1) * az) / 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (reserviert(K, ox + i * ax, oz + j * az, 1.5)) continue;
    S.box(2.0, 0.3, 2.0, ox + i * ax, y + 0.15, oz + j * az, '#d3d0c9');
    S.box(1.5, 0.35, 1.5, ox + i * ax, y + 0.45, oz + j * az, K.alt ? '#c9cfd1' : '#e8eef0');
  }
}
/** Q02: Aufbauten bündig auf der Dachoberfläche, maximal drei Bauarten pro Dachbereich. */
function technik(K, x0, z0, x1, z1, y, o = {}) {
  const dach = { x0, z0, x1, z1, y, steil: false };
  if (K.dach && Math.abs(K.dach.y - y) < 1.1) {
    dach.x0 = Math.max(x0, K.dach.x0);
    dach.z0 = Math.max(z0, K.dach.z0);
    dach.x1 = Math.min(x1, K.dach.x1);
    dach.z1 = Math.min(z1, K.dach.z1);
    dach.y = K.dach.y;
  }
  dachInstallationen(K.S, dach, K.r, { max: K.dachLandschaft ? Math.min(2, o.max ?? 2) : o.max, farbe: o.farbe,
    reserviert: (x, z, rad) => reserviert(K, x, z, rad), protokoll: K.qualitaet?.daecher });
}
/** Parkdeck (Dach): Asphalt, Markierungen, Autos, Treppenhaus, P-Schild. */
function parkdeck(K, x0, z0, x1, z1, y, mitSchild = true) {
  const S = K.S, r = K.r;
  S.quader(x0, y, z0, x1, y + 0.2, z1, '#7e858c');
  const reihen = [];
  for (let z = z0 + 1.5; z + 5 <= z1 - 1; z += 13) reihen.push(z);
  for (const rz of reihen) for (const zz of [rz, rz + 6.6]) {
    if (zz + 5 > z1 - 1) continue;
    for (let x = x0 + 2; x + 2.5 <= x1 - 2; x += 2.6) {
      S.box(0.12, 0.04, 5, x, y + 0.22, zz + 2.5, '#f2f1ec');
      if (!K.zu && r() < 0.55 && !reserviert(K, x + 1.3, zz + 2.5, 2.5)) {
        const c = waehle(r, AUTO), cx = x + 1.3, cz = zz + 2.5;
        S.box(1.85, 0.9, 4.3, cx, y + 0.65, cz, c);
        S.box(1.65, 0.65, 2.2, cx, y + 1.42, cz - 0.15, '#9bb7c7');
      }
    }
  }
  // Brüstungsgeländer an den sichtbaren Kanten
  S.quader(x0, y + 1.0, z1 - 0.15, x1, y + 1.12, z1, '#d9dcde');
  S.quader(x1 - 0.15, y + 1.0, z0, x1, y + 1.12, z1, '#d9dcde');
  // Treppenhaus
  S.box(4.5, 3.4, 4.5, x0 + 3, y + 1.7, z0 + 3, '#d0ccc4');
  S.box(4.6, 0.25, 4.6, x0 + 3, y + 3.5, z0 + 3, '#a9a49a');
  if (mitSchild) {
    S.box(0.2, 5.5, 0.2, x1 - 2.5, y + 2.75, z1 - 2.5, '#5f676e');
    const s = new Seite(S, x1 - 4, z1 - 4, 1.5, 1.5, '+z');
    S.box(2.1, 2.1, 0.25, x1 - 2.5, y + 6.2, z1 - 2.45, '#1f63b5');
    plakat(K, s, 'P', 1.5, y + 6.2, 0.2, 1.9, '#ffffff', '#1f63b5');
  }
}

// ---------------------------------------------------------------- Patina
function flecken(K, s, u0, u1, y0, y1, t, base, anz) {
  if (!K.alt) return;
  const r = K.r;
  for (let i = 0; i < anz; i++) {
    const bw = zw(r, 1.2, 5), bh = zw(r, 0.8, 3.5);
    const u = zw(r, u0, Math.max(u0, u1 - bw)), y = zw(r, y0, Math.max(y0, y1 - bh));
    s.q(u, u + bw, y, y + bh, t, t + 0.02, dunkler(base, zw(r, 0.08, 0.16)));
  }
  for (let i = 0; i < anz / 2; i++) { // Schlieren unter Simsen
    const u = zw(r, u0, u1 - 0.5);
    s.q(u, u + zw(r, 0.3, 0.8), Math.max(y0, y1 - zw(r, 3, 9)), y1, t, t + 0.025, dunkler(base, 0.15));
  }
}
function ausgeblichen(c) { const f = new THREE.Color(c), h = {}; f.getHSL(h); return '#' + f.setHSL(h.h, Math.max(0, h.s - 0.18), Math.min(0.85, h.l + 0.07)).getHexString(); }
function verblasst(c) { const f = new THREE.Color(c), h = {}; f.getHSL(h); return '#' + f.setHSL(h.h, Math.max(0, h.s - 0.22), Math.max(h.l * 0.6, h.l - 0.07)).getHexString(); }
function patinaFarbe(c) { const f = new THREE.Color(c), h = {}; f.getHSL(h); return '#' + f.setHSL(h.h, Math.max(0, h.s - 0.06), Math.max(h.l * 0.6, h.l - 0.075)).getHexString(); }

// ---------------------------------------------------------------- Logo-Zonen
// zone: { u, y, t, hb, max, grund, dach (bool), sport (bool) }
function logos(K) {
  for (const s of K.seiten) {
    const z = K.zonen[s.seite];
    if (!z) continue;
    const text = z.text ?? 'HARTWIG';
    if (K.fam !== 1 && !z.sport && !z.dach && !z.wand && (K.n === 1 || Math.min(z.hb, z.max / schriftBreite(text, 1)) < Math.max(2.4, s.L * 0.035))) { // niedrige Fassade: Dachschrift auf Gerüst
      const hbD = Math.min(clamp(s.L * 0.06, 2.2, 3.6), (s.L * 0.6) / schriftBreite(text, 1));
      const br = schriftBreite(text, hbD), yB = K.Hw + 0.6;
      for (let k = 0; k <= 4; k++) { const uu = z.u - br / 2 + (k * br) / 4; s.q(uu - 0.07, uu + 0.07, K.Hw, yB + hbD * 1.3, -1.0, -0.85, '#4a4f55'); }
      s.q(z.u - br / 2, z.u + br / 2, yB, yB + 0.12, -1.0, -0.85, '#4a4f55');
      Object.assign(z, { y: yB + 0.15 + hbD * 0.6, t: -0.75, hb: hbD, max: s.L * 0.6, dach: true });
    }
    const hb = Math.min(z.hb, z.max / schriftBreite(text, 1));
    z.hbIst = hb;
    if (z.sport) {
      const br = schriftBreite(text, hb);
      if (!K.ohneLogo) {
        s.q(z.u - br / 2 - hb * 0.6, z.u + br / 2 + hb * 0.6, z.y - hb * 0.95, z.y + hb * 0.95, z.t - 0.25, z.t - 0.05, K.alt ? dunkler(ROT, 0.1) : ROT);
        leuchtschrift(K, s, text, z.u, z.y, z.t + 0.02, hb, '#ffffff', { kaputt: K.alt });
      } else s.q(z.u - br / 2 - hb * 0.6, z.u + br / 2 + hb * 0.6, z.y - hb * 0.95, z.y + hb * 0.95, z.t - 0.25, z.t - 0.2, dunkler(z.grund, 0.05));
      if (K.abbau) K.abbauPos[s.seite] = { u: z.u, y: z.y, t: z.t };
      continue;
    }
    if (K.abbau) { // Schließung: Leuchtbuchstaben werden abmontiert, ein Teil hängt noch (unbeleuchtet)
      const aus = {};
      const tot = leuchtschrift(K, s, text, z.u, z.y, z.t, hb, dunkler(z.farbe ?? ROT, 0.14), { abbau: 0.45, aus });
      const anf = z.u - s.lese * tot / 2, ende = aus.u ?? z.u;
      K.abbauPos[s.seite] = { u: ende, y: z.y, t: z.t, rest: { u: (anf + ende) / 2, breite: Math.abs(ende - anf) + hb * 0.6, hb } };
    } else if (K.ohneLogo) { if (!z.dach) leuchtschrift(K, s, text, z.u, z.y, z.t - 0.25, hb, ROT, { geist: dunkler(z.grund, 0.045) }); } // leeres Schriftgerüst auf dem Dach bleibt leer
    else leuchtschrift(K, s, text, z.u, z.y, z.t, hb, z.farbe ?? ROT, { kaputt: K.alt });
  }
}

// ---------------------------------------------------------------- Familie 1: Kaiserzeit (bis 1919)
function familie1(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const stein = K.c(['#e9dcc5', '#e2d0b3', '#efe7d8', '#dcc0a2', '#e6d6bb', '#ede2cd', '#d9c9b0', '#e8d8bd'][v]);
  const hell = heller(stein, 0.045), dunk = dunkler(stein, 0.09);
  const dachF = K.c(v % 3 === 2 ? '#6f9a83' : ['#646d77', '#5b636c', '#6d747c'][v % 3]);
  const kupfer = K.c('#6f9a7d');
  const eck = ['kuppel', 'spitz', 'kuppel', 'zelt', 'kuppel', 'spitz', 'zelt', 'kuppel'][v];
  const raster = [6, 6.5, 5.5, 6, 7, 6, 5.5, 6.5][v];
  const tw = clamp(Math.min(w, d) * 0.24, 7, 12), p = 0.9, rueck = 0.7;
  const Ht = Hw + (n >= 2 ? GH * 1.6 : 4);
  K.tRelief = 0.5;
  S.quader(x0, 0, z0, x0 + w - rueck - 0.1, EG, z0 + d - rueck - 0.1, dunk);
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, stein);
  // Eckturm
  const tx0 = x0 + w - tw, tz0 = z0 + d - tw;
  S.quader(tx0, 0, tz0, x0 + w + p, Ht, z0 + d + p, hell);
  const risalit = v % 2 === 0 && n >= 2;
  K.raster = raster; K.fensterBand = [1.0, 3.9];
  if (risalit) K.tBanner = 1.35;
  for (const s of K.seiten) {
    const uEnd = s.L - tw;
    K.nutz[s.seite] = uEnd;
    // Erdgeschoss mit Rustika
    const ax = erdgeschoss(K, s, { u1: uEnd, raster: raster, pfeiler: hell, sockel: dunk, sturz: stein, pb: 1.1, tuer: 'dreh' });
    for (const a of ax) for (let y = 0.9; y < EG - 0.3; y += 0.75) s.q(a.a - 1.1, a.a - 0.02, y, y + 0.06, 0.12, 0.16, dunk);
    vordach(K, s, { stil: v % 4 === 1 || v % 4 === 3 ? 'markisen' : 'duenn', achsen: ax, u1: uEnd, ecke: false, tiefe: 2.0, farbe: '#4a4f55', y: 4.6, markise: v % 4 === 3 ? '#3f7d56' : ROT });
    // Gurtgesims
    s.q(0, uEnd, EG - 0.1, EG + 0.55, 0, 0.45, hell);
    s.q(0, uEnd, EG + 0.55, EG + 0.75, 0, 0.28, dunk);
    // Obergeschosse: hohe Fensterbahnen zwischen Pilastern
    const nb = Math.max(1, Math.round(uEnd / raster)), bw = uEnd / nb;
    const rA = risalit && s.seite === '+z' ? Math.floor(nb / 2) - 1 : -9, rB = rA + 1;
    if (n >= 2) {
      if (rA >= 0) { // Mittelrisalit
        (K.vorspruenge ??= []).push({ seite: s.seite, u0: rA * bw - 0.6, u1: (rB + 1) * bw + 0.6, t: 0.8 });
        s.q(rA * bw, (rB + 1) * bw, EG + 0.75, Hw + 1.4, 0, 0.8, hell);
        giebel(s, (rA * bw + (rB + 1) * bw) / 2, Hw + 1.4, 0.4, (rB + 1 - rA) * bw + 0.8, 4.5, 0.8, hell);
        giebel(s, (rA * bw + (rB + 1) * bw) / 2, Hw + 1.4, 0.85, (rB + 1 - rA) * bw - 1.0, 3.4, 0.1, stein);
      }
      for (let i = 0; i <= nb; i++) {
        const u = i * bw, tb = (i >= rA && i <= rB + 1 && rA >= 0) ? 0.8 : 0;
        s.q(u - 0.6, u + 0.6, EG + 0.75, Hw - 1.3, tb, tb + 0.45, hell);
        s.q(u - 0.75, u + 0.75, Hw - 1.75, Hw - 1.3, tb, tb + 0.55, hell); // Kapitell
      }
      for (let i = 0; i < nb; i++) {
        const tb = i >= rA && i <= rB && rA >= 0 ? 0.8 : 0;
        const a = i * bw + 0.6, b = (i + 1) * bw - 0.6, m = (a + b) / 2, rad = (b - a) / 2 - 0.35;
        const yTop = Hw - 2.1 - rad;
        s.q(a + 0.35, b - 0.35, EG + 1.2, yTop, tb, tb + 0.05, GLAS);
        bogen(s, m, yTop, tb, rad, 0.05, GLAS);
        s.q(m - 0.3, m + 0.3, yTop + rad - 0.3, yTop + rad + 0.35, tb, tb + 0.3, hell); // Schlussstein
        for (let k = 1; k < n - 1; k++) { const y = EG + k * GH; s.q(a + 0.35, b - 0.35, y - 0.6, y + 0.25, tb, tb + 0.2, dunk); s.q(a + 0.35, b - 0.35, y - 0.6, y - 0.5, tb, tb + 0.3, hell); }
        s.q(m - 0.06, m + 0.06, EG + 1.2, yTop + rad - 0.1, tb, tb + 0.12, RAHMEN);
        s.q(a + 0.35, b - 0.35, EG + 1.2, EG + 1.35, tb, tb + 0.35, hell);
      }
    }
    // Fries mit Zahnschnitt
    s.q(0, uEnd, Hw - 1.3, Hw - 0.45, 0, 0.3, dunk);
    for (let u = 0.45; u < uEnd; u += 0.9) s.q(u - 0.18, u + 0.18, Hw - 0.6, Hw - 0.25, 0, 0.5, hell);
    // Figurengesims: Balustrade und Figuren über den Pilastern
    s.q(0, uEnd, Hw + 1.15, Hw + 1.35, 0.05, 0.6, hell);
    for (let u = 0.4; u < uEnd; u += 0.75) s.q(u - 0.11, u + 0.11, Hw + 0.45, Hw + 1.15, 0.2, 0.45, hell);
    if (n >= 2) for (let i = 0; i < nb; i++) {
      if (i >= rA && i <= rB + 1 && rA >= 0) continue;
      const u = i * bw;
      s.q(u - 0.45, u + 0.45, Hw + 0.45, Hw + 1.5, 0.05, 0.7, hell);
      s.q(u - 0.24, u + 0.24, Hw + 1.5, Hw + 2.55, 0.18, 0.55, stein);
      s.q(u - 0.34, u + 0.34, Hw + 2.25, Hw + 2.6, 0.2, 0.52, stein);
      s.q(u - 0.15, u + 0.15, Hw + 2.6, Hw + 2.95, 0.22, 0.5, stein);
    }
    // Gauben
    const yb = Hw + 0.45;
    if (n >= 2) for (let i = 0; i < nb; i++) {
      if (i >= rA && i <= rB && rA >= 0) continue;
      const u = (i + 0.5) * bw;
      s.q(u - 0.95, u + 0.95, yb + 0.7, yb + 2.9, -3.2, -0.75, hell);
      s.q(u - 0.55, u + 0.55, yb + 1.0, yb + 2.5, -0.75, -0.7, GLAS);
      giebel(s, u, yb + 2.9, -1.9, 2.3, 0.9, 2.6, dachF);
    }
    flecken(K, s, 0, uEnd, EG + 0.8, Hw - 1.3, 0.46, stein, 10);
    // Turm: Portal, Fensterbahn, Ecklisenen, Uhr
    const tu0 = s.L - tw, tu1 = s.L + p, tm = (tu0 + tu1) / 2;
    s.q(tu0, tu1, 0, 0.55, p, p + 0.08, dunk);
    s.q(tm - 2.2, tm + 2.2, 0.3, 4.4, p, p + 0.05, GLAS_TUER);
    K.eingaenge.push({ seite: s.seite, u: tm, breite: 4.4, t: p, haupt: s.seite === '+z' });
    if (K.zu) { s.q(tm - 2.1, tm + 2.1, 0.3, 4.3, p + 0.06, p + 0.1, '#8e9499'); for (let y = 0.6; y < 4.2; y += 0.42) s.q(tm - 2.1, tm + 2.1, y, y + 0.07, p + 0.1, p + 0.14, '#6f757a'); }
    s.q(tm - 2.45, tm + 2.45, 4.4, 4.8, p, p + 0.3, ROT);
    s.q(tm - 2.45, tm - 2.2, 0.3, 4.4, p, p + 0.3, ROT); s.q(tm + 2.2, tm + 2.45, 0.3, 4.4, p, p + 0.3, ROT);
    if (!K.zu) { const g = new THREE.CylinderGeometry(1.2, 1.2, 2.6, 12); g.translate(tm, 1.6, p + 0.3); s.geo(g, '#6a8796'); }
    s.q(tu0 - 0.4, tu1 + 0.4, 4.85, 5.2, p, p + 1.8, '#4a4f55');
    s.q(tu0, tu1, EG - 0.1, EG + 0.55, p, p + 0.45, hell);
    for (const uu of [tu0, tu1 - 0.8]) s.q(uu, uu + 0.8, EG, Ht, p, p + 0.2, dunk);
    for (let y = EG + 0.6; y < Ht; y += 1.1) for (const uu of [tu0, tu1 - 1.1]) s.q(uu, uu + 1.1, y, y + 0.5, p, p + 0.25, hell);
    if (n >= 2) {
      const rad = 1.4, yTop = Ht - 4.2;
      s.q(tm - rad, tm + rad, EG + 1.2, yTop, p, p + 0.05, GLAS);
      bogen(s, tm, yTop, p, rad, 0.05, GLAS);
      for (let k = 1; k < n - 1; k++) s.q(tm - rad, tm + rad, EG + k * GH - 0.6, EG + k * GH + 0.2, p, p + 0.2, dunk);
    }
    if (s.seite === '+x' || v % 2) { // Uhr
      const g = new THREE.CylinderGeometry(1.3, 1.3, 0.2, 16); g.rotateX(Math.PI / 2); g.translate(tm, Ht - 1.9, p + 0.1); s.geo(g, '#f6f3ea');
      s.q(tm - 0.06, tm + 0.06, Ht - 1.9, Ht - 1.0, p + 0.2, p + 0.25, '#222'); s.kipp(0.7, 0.1, 0.05, tm + 0.3, Ht - 1.75, p + 0.25, '#222', 0.5);
    }
  }
  // Hauptgesims und Mansarddach
  S.quader(x0 - 0.7, Hw - 0.25, z0 - 0.7, x0 + w + 0.7, Hw + 0.45, z0 + d + 0.7, hell);
  const md = stumpf(w - 0.4, d - 0.4, 4.4, 2.6); md.translate(x0 + w / 2, Hw + 0.45, z0 + d / 2); S.add(md, dachF);
  const md2 = stumpf(w - 5.6, d - 5.6, 1.2, Math.min(4, (w - 6) / 2.2), Math.min(4, (d - 6) / 2.2)); md2.translate(x0 + w / 2, Hw + 4.85, z0 + d / 2); S.add(md2, dunkler(dachF, 0.05));
  const fx0 = x0 + w / 2 - (w - 5.6) / 2 + Math.min(4, (w - 6) / 2.2), fz0 = z0 + d / 2 - (d - 5.6) / 2 + Math.min(4, (d - 6) / 2.2);
  S.quader(fx0, Hw + 6.04, fz0, 2 * (x0 + w / 2) - fx0, Hw + 6.1, 2 * (z0 + d / 2) - fz0, KIES);
  setzeDach(K, fx0, fz0, 2 * (x0 + w / 2) - fx0 - tw * 0.8, 2 * (z0 + d / 2) - fz0, Hw + 6.1);
  lichtkuppeln(K, fx0, fz0, 2 * (x0 + w / 2) - fx0 - tw * 0.4, 2 * (z0 + d / 2) - fz0 - tw * 0.4, Hw + 6.1);
  technik(K, fx0, fz0, x0 + w - 6 - tw, z0 + d - 6 - tw * 0.5, Hw + 6.1, { max: 3, antenne: false });
  // Turmhelm
  const tc = tw + p, cx = x0 + w - tw + tc / 2, cz = z0 + d - tw + tc / 2;
  S.box(tc + 1.0, 0.7, tc + 1.0, cx, Ht + 0.35, cz, hell);
  if (eck === 'kuppel') {
    zyl(S, cx, Ht + 0.7, cz, tc * 0.42, 2.4, hell, 16);
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; S.box(0.5, 1.2, 0.5, cx + Math.sin(a) * tc * 0.43, Ht + 1.9, cz + Math.cos(a) * tc * 0.43, GLAS); }
    const g = new THREE.SphereGeometry(tc * 0.43, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 1.35, 1); g.translate(cx, Ht + 3.1, cz); S.add(g, kupfer);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const rr = tc * 0.43; const gr = new THREE.SphereGeometry(rr * 1.01, 16, 8, a - 0.04, 0.08, 0, Math.PI / 2); gr.scale(1, 1.35, 1); gr.translate(cx, Ht + 3.1, cz); S.add(gr, heller(kupfer, 0.08)); }
    zyl(S, cx, Ht + 3.0 + tc * 0.58, cz, 0.9, 2.0, hell, 8);
    zyl(S, cx, Ht + 5.0 + tc * 0.58, cz, 1.1, 1.4, kupfer, 8, 0.05);
    zyl(S, cx, Ht + 6.4 + tc * 0.58, cz, 0.08, 2.4, '#4a4f55', 4);
  } else if (eck === 'spitz') {
    const g = new THREE.ConeGeometry(tc * 0.5 * Math.SQRT2, tc * 1.5, 4); g.rotateY(Math.PI / 4); g.translate(cx, Ht + 0.7 + tc * 0.75, cz); S.add(g, dachF);
    for (const [dx, dz] of [[tc * 0.32, 0], [0, tc * 0.32]]) S.box(dz ? 1.4 : 1.8, 2, dz ? 1.8 : 1.4, cx + dx, Ht + 2.2, cz + dz, hell);
    zyl(S, cx, Ht + 0.7 + tc * 1.5, cz, 0.08, 2.5, '#4a4f55', 4);
  } else {
    const g = new THREE.ConeGeometry(tc * 0.5 * Math.SQRT2, 3.2, 4); g.rotateY(Math.PI / 4); g.translate(cx, Ht + 2.3, cz); S.add(g, kupfer);
    S.box(2.4, 2.4, 2.4, cx, Ht + 4.4, cz, hell);
    S.box(1.8, 1.6, 2.5, cx, Ht + 4.3, cz, GLAS); S.box(2.5, 1.6, 1.8, cx, Ht + 4.3, cz, GLAS);
    const g2 = new THREE.ConeGeometry(1.9, 2.4, 4); g2.rotateY(Math.PI / 4); g2.translate(cx, Ht + 6.8, cz); S.add(g2, kupfer);
  }
  // Logos
  for (const s of K.seiten) {
    const uEnd = s.L - tw;
    if (n >= 2) {
      const nb = Math.max(1, Math.round(uEnd / raster)), rStart = (Math.floor(nb / 2) - 1) * (uEnd / nb);
      const mitR = s.seite === '+z' && risalit && rStart > 6;
      K.zonen[s.seite] = { u: mitR ? rStart / 2 : uEnd / 2, y: Hw - 3.6, t: 0.75, hb: clamp(uEnd * 0.08, 2.4, 4.4), max: mitR ? rStart - 2 : uEnd * 0.75, grund: stein };
    }
    else K.zonen[s.seite] = { u: uEnd / 2, y: EG + 1.3, t: 0.55, hb: 1.5, max: uEnd * 0.8, grund: stein };
  }
  if (n >= 4) haengefahnen(K, K.seiten[0], [K.seiten[0].L * 0.1, K.seiten[0].L * 0.62], EG + GH * 1.7, 0.45);
  return Ht + tc;
}

// ---------------------------------------------------------------- Familie 2: Neue Sachlichkeit (1920 bis 1939)
function familie2(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const putz = K.c(['#f2eee5', '#ece3cb', '#f0ebe0', '#e9e4d8', '#efe8d4', '#f3efe6', '#e6dfcf', '#f1ece2'][v]);
  const klinker = v === 3 || v === 6;
  const brF = klinker ? K.c('#9b5a45') : putz;
  const R = clamp(Math.min(w, d) * 0.22, 5, 11), rueck = 0.7;
  const staffel = n >= 3 && (v === 1 || v === 4 || v === 7);
  const turm = v === 0 || v === 5 || v === 2;
  const Hb = staffel ? Hw - GH : Hw;
  K.traufe = Hb; // Traufe des Hauptbaus (Staffelgeschoss sitzt darüber), für Attikarand und Dekor
  const cx = x0 + w - R, cz = z0 + d - R;
  K.tRelief = 0.3;
  const ei = rueck + 0.1;
  S.quader(x0, 0, z0, cx, EG, z0 + d - ei, dunkler(putz, 0.1));
  S.quader(cx - 0.01, 0, z0, x0 + w - ei, EG, cz, dunkler(putz, 0.1));
  viertelzylinder(S, cx, cz, R - ei, 0, EG, dunkler(putz, 0.1));
  S.quader(x0, EG, z0, cx, Hb, z0 + d, putz);
  S.quader(cx - 0.01, EG, z0, x0 + w, Hb, cz, putz);
  viertelzylinder(S, cx, cz, R, EG, Hb, putz, 16);
  const nOG = Math.floor((Hb - EG + 0.1) / GH);
  K.raster = 2.8; K.fensterBand = [1.9, 4.2];
  for (const s of K.seiten) {
    const uEnd = s.L - R;
    K.nutz[s.seite] = uEnd;
    const ax = erdgeschoss(K, s, { u1: uEnd, raster: 4.5, pfeiler: '#3e464d', pb: 0.35, sockel: '#3b3f44', sturz: putz });
    vordach(K, s, { stil: 'duenn', u1: uEnd, ecke: false, tiefe: 2.4, y: 4.6, farbe: '#f4f1ea' });
    void ax;
    for (let k = 0; k < nOG; k++) {
      const y0 = EG + k * GH;
      s.q(0, uEnd, y0, y0 + 1.75, 0, 0.22, brF);
      s.q(0, uEnd, y0 + 1.75, y0 + 1.9, 0, 0.32, heller(putz, 0.03));
      s.q(0, uEnd, y0 + 1.9, y0 + GH - 0.3, 0, 0.05, GLAS);
      s.q(0, uEnd, y0 + GH - 0.3, y0 + GH, 0, 0.1, brF);
      for (let u = 0.7; u < uEnd; u += 1.4) s.q(u - 0.05, u + 0.05, y0 + 1.9, y0 + GH - 0.3, 0, 0.1, '#e9eef0');
      if (klinker) for (let y = y0 + 0.35; y < y0 + 1.7; y += 0.35) s.q(0, uEnd, y, y + 0.05, 0.22, 0.25, dunkler(brF, 0.07));
    }
    s.q(0, uEnd, Hb, Hb + 1.0, 0, 0.12, brF);
    s.q(0, uEnd, Hb + 1.0, Hb + 1.15, -0.1, 0.25, heller(putz, 0.04));
    flecken(K, s, 0, uEnd, EG, Hb, 0.24, brF, 8);
    if (turm && s.seite === '+z') { // gläsernes Treppenhaus
      const u = uEnd * 0.32;
      (K.vorspruenge ??= []).push({ seite: s.seite, u0: u - 2.6, u1: u + 2.6, t: 1.6, voll: true }); // Banner nie hinter das Glas-Treppenhaus
      s.q(u - 2.2, u + 2.2, EG, Hb + 3, 0, 1.4, putz);
      s.q(u - 1.7, u + 1.7, EG + 0.4, Hb + 2.4, 1.4, 1.46, GLAS_HELL);
      for (let y = EG + 1.2; y < Hb + 2.4; y += 1.1) s.q(u - 1.7, u + 1.7, y, y + 0.08, 1.4, 1.52, '#e9eef0');
      s.q(u - 0.05, u + 0.05, EG + 0.4, Hb + 2.4, 1.4, 1.52, '#e9eef0');
      s.q(u - 2.4, u + 2.4, Hb + 3, Hb + 3.3, -0.2, 1.6, heller(putz, 0.04));
    }
  }
  // Runde Ecke
  const ring = (rad, y0, y1, f) => viertelzylinder(S, cx, cz, rad, y0, y1, f, 16);
  ring(R - rueck, 0.55, 4.3, GLAS_TUER);
  ring(R + 0.06, 0, 0.55, '#3b3f44');
  ring(R + 0.04, 4.3, EG, putz);
  for (let k = 0; k <= 5; k++) { const a = (k / 5) * Math.PI / 2; S.box(0.12, 3.8, 0.12, cx + Math.sin(a) * (R - rueck + 0.06), 2.4, cz + Math.cos(a) * (R - rueck + 0.06), RAHMEN); }
  ring(R + 2.4, 4.6, 4.84, '#f4f1ea');
  ring(R + 2.44, 4.67, 4.77, ROT);
  for (let k = 0; k < nOG; k++) {
    const y0 = EG + k * GH;
    ring(R + 0.22, y0, y0 + 1.75, brF);
    ring(R + 0.32, y0 + 1.75, y0 + 1.9, heller(putz, 0.03));
    ring(R + 0.05, y0 + 1.9, y0 + GH - 0.3, GLAS);
    ring(R + 0.1, y0 + GH - 0.3, y0 + GH, brF);
    for (let j = 1; j < 8; j++) { const a = (j / 8) * Math.PI / 2; S.box(0.1, GH - 2.2, 0.1, cx + Math.sin(a) * (R + 0.07), y0 + 1.9 + (GH - 2.2) / 2, cz + Math.cos(a) * (R + 0.07), '#e9eef0'); }
  }
  ring(R + 0.12, Hb, Hb + 1.0, brF);
  ring(R + 0.25, Hb + 1.0, Hb + 1.15, heller(putz, 0.04));
  ring(R - 0.25, Hb + 0.9, Hb + 1.17, KIES);
  // Dach
  S.quader(x0, Hb, z0, x0 + w - 0.3, Hb + 0.9, z0 + d - 0.3, KIES);
  if (staffel) {
    const sw = w - Math.max(6, w * 0.18), sd = d - Math.max(6, d * 0.2);
    setzeDach(K, x0 + 2, z0 + 2, x0 + sw - 2, z0 + sd - 2, Hw + 0.4);
    S.quader(x0, Hb, z0, x0 + sw, Hw, z0 + sd, putz);
    for (const s of seitenVon(S, x0, z0, sw, sd)) {
      s.q(0, s.L, Hb + 1.2, Hw - 0.6, 0, 0.05, GLAS);
      for (let u = 1; u < s.L; u += 2.5) s.q(u - 0.08, u + 0.08, Hb + 1.2, Hw - 0.6, 0, 0.12, putz);
    }
    S.quader(x0 - 0.5, Hw, z0 - 0.5, x0 + sw + 1.2, Hw + 0.35, z0 + sd + 1.2, heller(putz, 0.04));
    S.quader(x0, Hw + 0.35, z0, x0 + sw + 0.7, Hw + 0.4, z0 + sd + 0.7, KIES);
    lichtkuppeln(K, x0 + 2, z0 + 2, x0 + sw - 2, z0 + sd - 2, Hw + 0.4, 7, 9);
    technik(K, x0 + 3, z0 + 3, x0 + sw - 3, z0 + sd - 3, Hw + 0.4, { max: 4 });
  } else { setzeDach(K, x0 + 2, z0 + 2, x0 + w - R, z0 + d - 5, Hb + 0.9); lichtkuppeln(K, x0 + 3, z0 + 3, x0 + w - 6, z0 + d - 6, Hb + 0.9); technik(K, x0 + 3, z0 + 3, x0 + w - 6, z0 + d - 6, Hb + 0.9, { max: 6 }); }
  // Leuchtschrift auf dem Dach (Gerüst)
  for (const s of K.seiten) {
    const uEnd = s.L - R;
    const hb = clamp(uEnd * 0.07, 2.2, 4.2);
    const u = uEnd * 0.55, br = Math.min(schriftBreite('HARTWIG', hb), uEnd * 0.8);
    const hbIst = Math.min(hb, (uEnd * 0.8) / schriftBreite('HARTWIG', 1));
    const yB = (staffel ? Hb + 1.15 : Hb + 1.15) + 0.3, y = yB + hbIst * 0.7;
    const tf = staffel ? -0.6 : -0.6;
    for (let k = 0; k <= 4; k++) { const uu = u - br / 2 + (k * br) / 4; s.q(uu - 0.08, uu + 0.08, Hb + 1.15, yB + hbIst * 1.3, tf - 0.4, tf - 0.24, '#4a4f55'); }
    s.q(u - br / 2, u + br / 2, yB, yB + 0.12, tf - 0.4, tf - 0.24, '#4a4f55');
    s.q(u - br / 2, u + br / 2, yB + hbIst * 1.3, yB + hbIst * 1.3 + 0.12, tf - 0.4, tf - 0.24, '#4a4f55');
    K.zonen[s.seite] = { u, y, t: tf, hb, max: uEnd * 0.8, grund: putz, dach: true };
  }
  return Hw + 6;
}

// ---------------------------------------------------------------- Familie 3: Nachkrieg (1940 bis 1964)
function familie3(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const stein = K.c(['#e4ddcf', '#ddd6c6', '#e8e2d6', '#d8d3c9', '#e2d8c4', '#e6e0d3', '#d6cfc0', '#e9e3d5'][v]);
  const rahmenF = K.c(heller(stein, 0.05));
  const mosaik = [['#9cc7cc', '#e9dfc4', '#7fb2bb'], ['#e6c9a0', '#f1e9d8', '#d7b187'], ['#b9cbd8', '#dfe6ea', '#9fb6c8'], ['#c9d6b5', '#f0ece0', '#aac096'],
    ['#e8b4a0', '#f1e6d8', '#d79a86'], ['#a8c4c9', '#d9e4e4', '#e8d9a8'], ['#d0c4a8', '#ece4d0', '#bfb091'], ['#9fb9d1', '#f0e7cf', '#e0c27a']][v].map((c) => K.c(c));
  const c = [2.4, 2.0, 2.8, 2.2, 2.6, 1.9, 3.0, 2.4][v];
  const staffel = n >= 3 && v % 2 === 1;
  const Hb = staffel ? Hw - GH : Hw;
  K.traufe = Hb; // Traufe des Hauptbaus (Staffelgeschoss sitzt darüber), für Attikarand und Dekor
  const wand = v % 4 === 0 || v % 4 === 3;
  const rueck = 0.7, ei = rueck + 0.1;
  K.tRelief = 0.45;
  S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, dunkler(stein, 0.1));
  S.quader(x0, EG, z0, x0 + w, Hb, z0 + d, stein);
  const nOG = Math.floor((Hb - EG + 0.1) / GH);
  K.raster = c * 2; K.fensterBand = [1.5, 4.4];
  for (const s of K.seiten) {
    const ax = erdgeschoss(K, s, { raster: 5, pfeiler: K.c('#cfc6b4'), sockel: '#4e5257', sturz: rahmenF, pb: 0.6, tuer: v % 2 ? 'schiebe' : 'dreh' });
    const st = ax.filter((a) => a.eingang).flatMap((a) => [a.a + 0.3, a.b - 0.3]);
    vordach(K, s, { stil: 'duenn', tiefe: 3.0, y: 4.7, farbe: '#f6f4ef', stuetzen: st });
    const wu0 = 0, wu1 = wand && (s.seite === '+z' || v % 4 === 0) ? Math.min(s.L * 0.34, 26) : 0;
    // geschlossene Natursteinwand
    if (wu1 > 0 && nOG > 0) {
      s.q(wu0, wu1, EG, Hb, 0, 0.3, heller(stein, 0.03));
      let k = 0;
      for (let y = EG + 1.0; y < Hb - 0.2; y += 1.0, k++) {
        s.q(wu0, wu1, y - 0.03, y + 0.03, 0.3, 0.32, dunkler(stein, 0.06));
        for (let u = wu0 + (k % 2 ? 0.8 : 1.6); u < wu1 - 0.3; u += 1.6) s.q(u - 0.03, u + 0.03, y - 1.0, y, 0.3, 0.32, dunkler(stein, 0.05));
      }
    }
    // Rasterfassade
    const ru0 = wu1 > 0 ? wu1 + 0.3 : 0, len = s.L - ru0;
    const nc = Math.max(1, Math.round(len / c)), cw = len / nc;
    for (let k = 0; k < nOG; k++) {
      const y0 = EG + k * GH;
      for (let i = 0; i < nc; i++) {
        const a = ru0 + i * cw, b = a + cw;
        s.q(a, b, y0 + 0.3, y0 + 1.5, 0, 0.08, mosaik[(i * 7 + k * 3 + (i % 3)) % 3 === 0 ? 2 : (i + k) % 2]);
        s.q(a, b, y0 + 1.5, y0 + GH, 0, 0.04, GLAS);
        s.q(a + cw * 0.5 - 0.04, a + cw * 0.5 + 0.04, y0 + 1.5, y0 + GH, 0, 0.1, RAHMEN);
      }
      s.q(ru0, s.L, y0, y0 + 0.32, 0, 0.42, rahmenF);
    }
    s.q(ru0, s.L, Hb - 0.05, Hb + 0.5, 0, 0.45, rahmenF);
    if (nOG > 0) for (let i = 0; i <= nc; i++) { const u = ru0 + i * cw; s.q(u - 0.12, u + 0.12, EG, Hb, 0, 0.4, rahmenF); }
    flecken(K, s, 0, s.L, EG, Hb, 0.43, stein, 8);
    // Logo
    if (wu1 > 0 && nOG > 0) K.zonen[s.seite] = { u: wu1 / 2, y: EG + (Hb - EG) * 0.55, t: 0.5, hb: clamp(wu1 * 0.11, 1.8, 3.6), max: wu1 * 0.85, grund: stein, wand: true };
  }
  // Dach: Staffelgeschoss mit Flugdach oder Attika
  S.quader(x0, Hb, z0, x0 + w, Hb + 0.15, z0 + d, KIES);
  S.quader(x0, Hb + 0.15, z0 + d - 0.4, x0 + w, Hb + 0.9, z0 + d, rahmenF);
  S.quader(x0 + w - 0.4, Hb + 0.15, z0, x0 + w, Hb + 0.9, z0 + d, rahmenF);
  if (staffel) {
    const sw = w - Math.max(6, w * 0.2), sd = d - Math.max(6, d * 0.22);
    setzeDach(K, x0 + 2, z0 + 2, x0 + sw - 2, z0 + sd - 2, Hw + 0.3);
    S.quader(x0, Hb, z0, x0 + sw, Hw - 0.1, z0 + sd, heller(stein, 0.02));
    lichtkuppeln(K, x0 + sw + 1, z0 + 2, x0 + w - 1, z0 + d - 1, Hb + 0.15, 6.5, 8);
    lichtkuppeln(K, x0 + 2, z0 + sd + 1, x0 + sw, z0 + d - 1, Hb + 0.15, 6.5, 8);
    for (const s of seitenVon(S, x0, z0, sw, sd)) {
      s.q(0, s.L, Hb + 0.8, Hw - 0.6, 0, 0.05, GLAS);
      for (let u = 1; u < s.L; u += 2) s.q(u - 0.06, u + 0.06, Hb + 0.8, Hw - 0.6, 0, 0.12, '#f4f1ea');
    }
    S.quader(x0 - 0.3, Hw - 0.1, z0 - 0.3, x0 + sw + 2.6, Hw + 0.25, z0 + sd + 2.6, '#f6f4ef');
    S.quader(x0, Hw + 0.25, z0, x0 + sw + 2.0, Hw + 0.3, z0 + sd + 2.0, KIES);
    technik(K, x0 + 3, z0 + 3, x0 + sw - 3, z0 + sd - 3, Hw + 0.3, { max: 4 });
  } else { setzeDach(K, x0 + 2, z0 + 2, x0 + w - 2, z0 + d - 4, Hb + 0.15); lichtkuppeln(K, x0 + 3, z0 + 3, x0 + w - 4, z0 + d - 4, Hb + 0.15); technik(K, x0 + 3, z0 + 3, x0 + w - 4, z0 + d - 4, Hb + 0.15, { max: 7 }); }
  // Dachschrift auf Gerüst (wo keine Wand): 50er-Neon
  for (const s of K.seiten) {
    if (K.zonen[s.seite]) continue;
    const hb = clamp(s.L * 0.065, 2.0, 3.8), hbIst = Math.min(hb, (s.L * 0.7) / schriftBreite('HARTWIG', 1));
    const u = s.L * 0.5, br = schriftBreite('HARTWIG', hbIst), yB = (staffel ? Hw + 0.25 : Hb + 0.9);
    const tf = staffel ? -2.4 : -0.8;
    for (let k = 0; k <= 5; k++) { const uu = u - br / 2 + (k * br) / 5; s.q(uu - 0.07, uu + 0.07, yB - (staffel ? 0 : 0.7), yB + hbIst * 1.6, tf - 0.4, tf - 0.25, '#4a4f55'); }
    s.q(u - br / 2, u + br / 2, yB + 0.25, yB + 0.37, tf - 0.4, tf - 0.25, '#4a4f55');
    K.zonen[s.seite] = { u, y: yB + 0.4 + hbIst * 0.75, t: tf, hb, max: s.L * 0.7, grund: stein, dach: true };
  }
  if (v % 3 === 1 && n >= 2) { // Warenhausuhr an der Ecke
    const s = K.seiten[1], u = s.L - 2.5, y = EG + GH * 0.6;
    s.q(u - 0.1, u + 0.1, y - 0.1, y + 0.1, 0, 1.5, '#4a4f55');
    const g = new THREE.CylinderGeometry(1.0, 1.0, 0.3, 16); g.rotateX(Math.PI / 2); g.rotateY(Math.PI / 2); g.translate(u, y, 2.2); s.geo(g, '#f6f3ea');
    const g2 = new THREE.CylinderGeometry(1.1, 1.1, 0.26, 16); g2.rotateX(Math.PI / 2); g2.rotateY(Math.PI / 2); g2.translate(u, y, 2.2); s.geo(g2, ROT);
  }
  if (n >= 3) haengefahnen(K, K.seiten[1], [K.seiten[1].L * 0.15, K.seiten[1].L * 0.45], EG + GH * 1.5, 0.42);
  return Hw + 5;
}

// ---------------------------------------------------------------- Familie 4: Kachel-/Wabenfassade (1965 bis 1980)
function familie4(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const kF = K.c(['#efe8d6', '#e9e3d3', '#d8d6d0', '#ece0c4', '#e4ddd0', '#f1ebdc', '#dcd7cc', '#e8dcc2'][v]);
  const fuge = dunkler(kF, 0.16);
  const muster = ['horten', 'wabe', 'horten', 'lamellen', 'wabe', 'horten', 'raster', 'wabe'][v];
  const parkdeckJa = v % 2 === 0 && (K.haus?.lage === 'rand' || K.haus?.lage === 'center');   // B4: Parkdeck nur am Stadtrand und im Center
  const kr = n >= 2 ? [1.8, 0, 2.4, 1.8, 0, 2.4, 1.8, 0][v] : 0; // Auskragung
  const waschbeton = K.c('#b3aa98');
  const rueck = 0.7, ei = kr + rueck + 0.1;
  K.tRelief = 0.4;
  S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, dunkler(waschbeton, 0.08));
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, fuge);
  const schlitz = (v === 2 || v === 5 || v === 7) && n >= 3;
  const flaeche = (w + d) * (Hw - EG);
  const k = clamp(Math.sqrt((flaeche * 2) / 3400), 1.35, 2.6);
  K.raster = 3.2; K.fensterBand = [0.9, 3.6];
  for (const s of K.seiten) {
    const ax = erdgeschoss(K, s, { tF: -kr, raster: 5.5, pfeiler: waschbeton, sockel: dunkler(waschbeton, 0.1), sturz: dunkler(kF, 0.05), pb: 1.2, tuer: 'schiebe' });
    for (const a of ax) for (let y = 0.9; y < EG; y += 0.9) s.q(a.a - 1.2, a.a, y, y + 0.05, -kr + 0.12, -kr + 0.15, dunkler(waschbeton, 0.1));
    vordach(K, s, { tF: -kr, tiefe: kr + 1.4, y: 4.75, dicke: 0.5, farbe: '#d9d6cf', stil: 'platte' });
    if (n < 2) continue;
    // Kachelrelief
    const y0 = EG + 0.35, y1 = Hw - 0.75;
    const sy0 = Hw - 2.6, sy1 = Hw - 1.6;
    const rows = Math.floor((y1 - y0) / k), cols = Math.floor(s.L / k);
    const ou = (s.L - cols * k) / 2;
    if (muster === 'lamellen') {
      for (let u = 0.45; u < s.L; u += 0.9) s.q(u - 0.09, u + 0.09, y0, y1, 0, 0.45, kF);
      for (let y = EG + GH; y < y1; y += GH) s.q(0, s.L, y - 0.15, y + 0.15, 0, 0.5, heller(kF, 0.03));
      s.q(0, s.L, y0, y1, 0, 0.02, dunkler(kF, 0.08));
    } else for (let j = 0; j < rows; j++) {
      const yc = y0 + (j + 0.5) * k;
      if (schlitz && yc > sy0 - k * 0.3 && yc < sy1 + k * 0.3) continue;
      const versatz = muster === 'wabe' && j % 2 ? k / 2 : 0;
      for (let i = 0; i < cols; i++) {
        const uc = ou + (i + 0.5) * k + versatz;
        if (uc > s.L - k * 0.45) continue;
        let f = kF;
        if (K.alt && K.r() < 0.22) f = dunkler(kF, zw(K.r, 0.05, 0.13));
        if (muster === 'horten') {
          s.q(uc - k * 0.47, uc + k * 0.47, yc - k * 0.47, yc + k * 0.47, 0, 0.17, f);
          if ((i + j) % 2) s.q(uc - k * 0.13, uc + k * 0.13, yc - k * 0.4, yc + k * 0.4, 0.17, 0.36, heller(f, 0.035));
          else s.q(uc - k * 0.4, uc + k * 0.4, yc - k * 0.13, yc + k * 0.13, 0.17, 0.36, heller(f, 0.035));
        } else if (muster === 'wabe') {
          s.kipp(k * 0.64, k * 0.64, 0.22, uc, yc, 0.11, f, Math.PI / 4);
          s.q(uc - k * 0.16, uc + k * 0.16, yc - k * 0.16, yc + k * 0.16, 0.22, 0.36, heller(f, 0.04));
        } else {
          s.q(uc - k * 0.46, uc + k * 0.46, yc - k * 0.46, yc + k * 0.46, 0, 0.32, f);
          s.q(uc - k * 0.28, uc + k * 0.28, yc - k * 0.28, yc + k * 0.28, 0.32, 0.34, dunkler(f, 0.07));
        }
      }
    }
    if (schlitz) {
      s.q(0, s.L, sy0, sy1, 0, 0.3, GLAS);
      for (let u = 1.2; u < s.L; u += 2.4) s.q(u - 0.05, u + 0.05, sy0, sy1, 0.3, 0.36, '#c9ced2');
      s.q(0, s.L, sy0 - 0.15, sy0, 0, 0.42, '#c9ced2');
    }
    s.q(0, s.L, Hw - 0.75, Hw + 0.35, 0, 0.42, '#c9ced2'); // Kantenblech
    s.q(0, s.L, EG, EG + 0.35, 0, 0.42, '#c9ced2');
    // Pflanzkübel aus Waschbeton
    for (let i = 0; i < 2 + (s.L > 50 ? 1 : 0); i++) {
      const u = s.L * (0.18 + i * 0.3), [x, z] = s.welt(u, 2.6);
      zyl(S, x, 0.3, z, 0.95, 0.75, waschbeton, 6);
      const g = new THREE.IcosahedronGeometry(0.9, 0); g.translate(x, 1.6, z); S.add(g, '#6fa860');
    }
  }
  if (n < 2) { // eingeschossig: Kachelfries als Schriftband
    for (const s of K.seiten) for (let u = 0.6; u < s.L; u += 1.2) s.q(u - 0.5, u + 0.5, EG + 0.3, Hw - 0.3, 0, 0.25, kF);
  }
  // Dach
  if (parkdeckJa && w >= 30) {
    attika(K, x0, z0, w, d, Hw + 0.35, 0.2, '#c9ced2', 0.4);
    setzeDach(K, x0 + 1, z0 + 1, x0 + w - 1, z0 + d - 1, Hw + 0.6);
    parkdeck(K, x0 + 0.5, z0 + 0.5, x0 + w - 0.5, z0 + d - 0.5, Hw + 0.4);
  } else {
    attika(K, x0, z0, w, d, Hw + 0.35, 0.3, '#c9ced2', 0.4);
    const tw = Math.min(w * 0.45, 30), td = Math.min(d * 0.5, 18);
    S.quader(x0 + 4, Hw + 0.5, z0 + 4, x0 + 4 + tw, Hw + 4.5, z0 + 4 + td, fuge);
    for (const s of seitenVon(S, x0 + 4, z0 + 4, tw, td)) for (let u = 0.4; u < s.L; u += 0.8) s.q(u - 0.1, u + 0.1, Hw + 0.6, Hw + 4.4, 0, 0.3, kF);
    S.quader(x0 + 3.8, Hw + 4.5, z0 + 3.8, x0 + 4.2 + tw, Hw + 4.8, z0 + 4.2 + td, '#c9ced2');
    setzeDach(K, x0 + 6 + tw, z0 + 2, x0 + w - 2, z0 + d - 2, Hw + 0.5);
    lichtkuppeln(K, x0 + 6 + tw, z0 + 3, x0 + w - 3, z0 + d - 3, Hw + 0.5);
    technik(K, x0 + 6 + tw, z0 + 3, x0 + w - 3, z0 + d - 3, Hw + 0.5, { max: 4 });
  }
  for (const s of K.seiten) {
    const hb = clamp(s.L * 0.075, 2.4, 5.5);
    if (n >= 2) K.zonen[s.seite] = { u: s.L * 0.5, y: EG + (Hw - EG) * (schlitz ? 0.42 : 0.55), t: 0.6, hb: Math.min(hb, (Hw - EG) * 0.32), max: s.L * 0.72, grund: kF };
    else K.zonen[s.seite] = { u: s.L * 0.5, y: EG + 1.2, t: 0.45, hb: 1.5, max: s.L * 0.7, grund: kF };
  }
  return Hw + 7;
}

// ---------------------------------------------------------------- Familie 5: Glas / Postmoderne (1981 bis 2015)
function familie5(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const stil = ['pomo', 'glas', 'pomo', 'stein', 'glas', 'stein', 'pomo', 'glas', 'stein', 'glas', 'pomo', 'stein'][v];
  // Varianten 8 bis 11: wärmere bzw. dunklere Verkleidung (Klinkerrot, Sandstein, Anthrazit, Terrakotta)
  const basisF = K.c(v >= 8 ? ['#c99a82', '#d8c39f', '#9aa1a6', '#d6a98c'][v - 8] : { pomo: ['#eadfce', '#e6dccf', '#efe4d2'][v % 3], stein: '#dcd9d2', glas: '#d5dcdf' }[stil]);
  const akzent = K.c(['#3f8f8e', '#c46a55', '#2f6f8f', '#7a5aa0'][v % 4]);
  const band = K.c(['#d9a48f', '#c7b8a3', '#a9bfc9'][v % 3]);
  const A = clamp(Math.min(w, d) * 0.32, 8, 18);
  const rueck = 0.7, ei = rueck + 0.1;
  K.tRelief = 0.35;
  S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, dunkler(basisF, 0.1));
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, basisF);
  const nOG = n - 1 + (n === 1 ? 0 : 0);
  const Ha = Hw + (n >= 2 ? 3 : 1.5);
  // Atrium an der Ecke
  S.quader(x0 + w - A, 0, z0 + d - A, x0 + w, Ha, z0 + d, '#c5d3da');
  K.raster = 3.2; K.fensterBand = stil === 'glas' ? [0.5, 3.0] : stil === 'stein' ? [1.4, 3.4] : [1.6, 3.5];
  for (const s of K.seiten) {
    const uE = s.L - A;
    K.nutz[s.seite] = uE;
    erdgeschoss(K, s, { u1: uE, raster: 5, pfeiler: '#59636b', pb: 0.4, sockel: '#6b7177', sturz: stil === 'pomo' ? band : dunkler(basisF, 0.04), glas: '#557286', tuer: 'schiebe' });
    vordach(K, s, { stil: 'glas', tiefe: 2.6, y: 4.6, u1: uE + 0.5, ecke: false });
    // Atriumfassade: Glas mit Stahlrahmen
    s.q(uE, s.L, 0.3, Ha - 0.3, 0, 0.05, '#6f93a6');
    for (let y = EG; y < Hw; y += GH) s.q(uE + 0.2, s.L - 0.2, y - 0.3, y + 0.1, 0.05, 0.08, '#e1e6e8');
    for (let u = uE; u <= s.L + 0.01; u += A / Math.round(A / 1.5)) s.q(u - 0.07, u + 0.07, 0.3, Ha, 0.05, 0.2, '#e6eaec');
    for (let y = 0.3; y < Ha; y += 1.5) s.q(uE, s.L, y - 0.05, y + 0.05, 0.05, 0.16, '#e6eaec');
    s.q(uE - 0.2, uE + 0.2, 0, Ha + 0.2, 0, 0.35, '#59636b');
    // Haupteingang im Atrium
    const um = uE + A * 0.45;
    s.q(um - 2.4, um + 2.4, 0.3, 3.4, 0.05, 0.12, GLAS_TUER);
    K.eingaenge.push({ seite: s.seite, u: um, breite: 4.8, t: 0.12, haupt: s.seite === '+z' });
    if (K.zu) { s.q(um - 2.3, um + 2.3, 0.3, 3.3, 0.12, 0.16, '#8e9499'); for (let y = 0.6; y < 3.2; y += 0.42) s.q(um - 2.3, um + 2.3, y, y + 0.07, 0.16, 0.2, '#6f757a'); }
    s.q(um - 2.7, um + 2.7, 3.4, 3.8, 0.05, 2.8, '#59636b');
    s.q(um - 2.7, um + 2.7, 3.8, 3.9, 0.05, 2.8, ROT);
    if (n < 2) continue;
    // Restfassade
    if (stil === 'pomo') {
      for (let k = 0; k < nOG; k++) {
        const y0 = EG + k * GH;
        s.q(0, uE, y0, y0 + 1.0, 0, 0.12, band);
        for (let u = 1.6; u < uE - 1; u += 3.2) {
          s.q(u - 0.95, u + 0.95, y0 + 1.6, y0 + 3.5, 0, 0.18, akzent);
          s.q(u - 0.75, u + 0.75, y0 + 1.8, y0 + 3.3, 0.18, 0.22, GLAS);
          s.q(u - 0.05, u + 0.05, y0 + 1.8, y0 + 3.3, 0.18, 0.25, akzent);
        }
      }
      s.q(0, uE, Hw - 0.6, Hw + 0.6, 0, 0.5, heller(basisF, 0.04));
      s.q(0, uE, Hw + 0.6, Hw + 0.9, 0, 0.25, akzent);
      if (s.seite === '+z') { giebel(s, uE * 0.3, Hw + 0.9, 0.25, 9, 3.2, 0.5, akzent); giebel(s, uE * 0.3, Hw + 1.3, 0.55, 6.5, 2.1, 0.1, band); }
      for (const uu of [uE * 0.3 - 4.5, uE * 0.3 + 4.5]) if (s.seite === '+z') { const [x, z] = s.welt(uu, 1.2); zyl(S, x, 0.3, z, 0.45, EG - 0.3, akzent, 12); }
    } else if (stil === 'stein') {
      for (let k = 0; k < nOG; k++) {
        const y0 = EG + k * GH;
        s.q(0, uE, y0 + 1.4, y0 + 3.4, 0, 0.05, GLAS);
        for (let u = 0.75; u < uE; u += 1.5) s.q(u - 0.06, u + 0.06, y0 + 1.4, y0 + 3.4, 0, 0.14, '#8d969c');
        s.q(0, uE, y0 + 1.3, y0 + 1.42, 0, 0.3, heller(basisF, 0.05));
        for (let u = 3; u < uE; u += 3) s.q(u - 0.02, u + 0.02, y0, y0 + 1.3, 0, 0.02, dunkler(basisF, 0.06));
      }
      s.q(0, uE, Hw - 0.3, Hw + 0.5, 0, 0.3, heller(basisF, 0.04));
    } else { // Vorhangfassade mit Sonnenschutzlamellen
      s.q(0, uE, EG, Hw, 0, 0.05, '#6a8a9c');
      for (let u = 0; u <= uE; u += 1.5) s.q(u - 0.05, u + 0.05, EG, Hw, 0.05, 0.15, '#dfe4e6');
      for (let k = 0; k < nOG; k++) { const y0 = EG + k * GH; s.q(0, uE, y0 - 0.2, y0 + 0.4, 0.05, 0.18, '#dfe4e6'); for (let j = 0; j < 3; j++) s.q(0, uE, y0 + 3.0 + j * 0.35, y0 + 3.1 + j * 0.35, 0.2, 0.8, '#c9ced2'); }
      s.q(0, uE, Hw - 0.2, Hw + 0.6, 0, 0.3, '#c9ced2');
    }
    flecken(K, s, 0, uE, EG, Hw, 0.25, basisF, 8);
  }
  // Atriumdach: Glaspyramide
  const g = new THREE.ConeGeometry(A * 0.5 * Math.SQRT2 * 0.92, A * 0.4, 4); g.rotateY(Math.PI / 4); g.translate(x0 + w - A / 2, Ha + A * 0.2, z0 + d - A / 2); S.add(g, '#9fbccb');
  S.quader(x0 + w - A - 0.2, Ha - 0.2, z0 + d - A - 0.2, x0 + w + 0.2, Ha + 0.1, z0 + d + 0.2, '#59636b');
  attika(K, x0, z0, w - A, d, Hw + 0.4, 0.4, heller(basisF, 0.03), 0.4);
  S.quader(x0 + w - A, Hw + 0.4, z0, x0 + w, Hw + 0.55, z0 + d - A, KIES);
  setzeDach(K, x0 + 2, z0 + 2, x0 + w - A - 1, z0 + d - 2, Hw + 0.55);
  lichtkuppeln(K, x0 + 3, z0 + 3, x0 + w - A - 2, z0 + d - 3, Hw + 0.55);
  technik(K, x0 + 3, z0 + 3, x0 + w - A - 2, z0 + d - 3, Hw + 0.55, { max: 6 });
  fahnenmasten(K, K.seiten[0], [3, 6, 9], Hw + 0.8, -0.6);
  for (const s of K.seiten) {
    const uE = s.L - A;
    if (n >= 2) K.zonen[s.seite] = { u: stil === 'pomo' && s.seite === '+z' ? uE * 0.68 : uE * 0.5, y: EG + (Hw - EG) * 0.58, t: 0.6, hb: clamp(uE * 0.075, 2.0, Math.min(4.5, (Hw - EG) * 0.3)), max: stil === 'pomo' && s.seite === '+z' ? uE * 0.5 : uE * 0.78, grund: basisF };
    else K.zonen[s.seite] = { u: uE * 0.5, y: EG + 1.2, t: 0.45, hb: 1.5, max: uE * 0.75, grund: basisF };
  }
  return Ha + A * 0.4;
}

// ---------------------------------------------------------------- Mall-Flügel (Familie 6 und Sport im Center)
function mallFluegel(K, xm, M, dm, hm) {
  const { S, z0, d, r } = K;
  const zm = z0 + d - dm;
  const f = K.c(['#e6e2da', '#ddd8ce', '#e9e5dd'][K.v % 3]);
  S.quader(xm, 0, zm, xm + M, hm, zm + dm - 0.8, dunkler(f, 0.06));
  S.quader(xm, EG, zm, xm + M, hm, zm + dm, f);
  const s = new Seite(S, xm, zm, M, dm, '+z');
  const name = MALLS[Math.floor(r() * MALLS.length)];
  const portalU = M - 9;
  // Läden im EG
  const laeden = ['Café', 'Optik', 'Bäckerei', 'Schuhe', 'Mode', 'Handy', 'Apotheke', 'Eis'];
  const nb = Math.max(1, Math.floor((portalU - 6) / 7));
  for (let i = 0; i <= nb; i++) s.q(i * 7 - 0.3, i * 7 + 0.3, 0, EG, -0.9, 0.1, '#bfc5c9');
  for (let i = 0; i < nb; i++) {
    const a = i * 7 + 0.3, b = (i + 1) * 7 - 0.3;
    s.q(a, b, 0.4, 3.6, -0.9, -0.8, '#5e7c8e');
    s.q(a, b, 3.6, EG, -0.8, 0.05, '#cfd3d6');
    const t = laeden[(i + Math.floor(r() * 3)) % laeden.length];
    const c = waehle(r, ['#2f6f8f', '#3f7d56', '#8c3b3b', '#d39a2b', '#6b4f8f', '#2b2b2b']);
    s.q(a + 0.6, b - 0.6, 3.85, 5.0, 0.05, 0.2, c);
    plakat(K, s, t, (a + b) / 2, 4.42, 0.22, 0.8, '#ffffff', c);
    if (!K.zu) puppe(s, a + 1.5, 0.4, -0.45, waehle(r, KLEID), '#2b2b2b');
  }
  // Obergeschoss: Paneele mit Fensterband
  for (let y = EG; y < hm - 1; y += GH) {
    s.q(0, portalU - 3, y + 1.2, y + 3.4, 0, 0.05, GLAS);
    for (let u = 1.5; u < portalU - 3; u += 3) s.q(u - 0.06, u + 0.06, y + 1.2, y + 3.4, 0, 0.12, '#bfc5c9');
  }
  s.q(0, M, hm - 0.2, hm + 0.6, 0, 0.3, '#cfd3d6');
  // Portal Mall-Eingang
  const pu0 = portalU - 3.5, pu1 = portalU + 4.5, ph = hm + 3.5;
  s.q(pu0, pu1, 0, ph, 0, 2.2, '#d0d6da');
  s.q(pu0 + 0.6, pu1 - 0.6, 0.3, ph - 2.5, 2.2, 2.26, '#6f93a6');
  for (let u = pu0 + 0.6; u <= pu1 - 0.5; u += 1.15) s.q(u - 0.05, u + 0.05, 0.3, ph - 2.5, 2.2, 2.32, '#eef1f2');
  for (let y = 3.2; y < ph - 2.5; y += 1.6) s.q(pu0 + 0.6, pu1 - 0.6, y - 0.05, y + 0.05, 2.2, 2.3, '#eef1f2');
  s.q(pu0 + 2, pu1 - 2, 0.3, 3.0, 2.2, 2.35, GLAS_TUER);
  s.q(pu0 - 1, pu1 + 1, 3.3, 3.7, 0, 5.0, '#eef1f2');
  const br = Math.min(pu1 - pu0 - 0.6, plakatBreite(name, 1.3));
  plakat(K, s, name, (pu0 + pu1) / 2, ph - 1.2, 2.3, Math.min(1.3, br / tex(name, '#2b3a4a', '#ffffff').seitenverhaeltnis), '#2b3a4a', '#ffffff');
  s.q(pu0, pu1, ph, ph + 0.3, -0.2, 2.4, '#bfc5c9');
  // Pylon mit Mallnamen
  const [px, pz] = s.welt(pu0 - 5, 4.5);
  S.box(2.2, 11, 1.0, px, 5.8, pz, '#2b3a4a');
  const sp = new Seite(S, px - 1.1, pz - 0.5, 2.2, 1.0, '+z');
  plakat(K, sp, 'EINKAUFEN', 1.1, 9.8, 0.04, 0.32, '#ffffff', '#2b3a4a');
  // Dach: Glastonne + wahlweise offenes Parkdeck oder mehrgeschossiges Parkhaus.
  const g = new THREE.CylinderGeometry(3.2, 3.2, M - 4, 10, 1, false, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.translate(xm + M / 2, hm + 0.4, zm + dm * 0.72); S.add(g, '#a9c6d3');
  for (let x = xm + 3; x < xm + M - 2; x += 3) { const rg = new THREE.TorusGeometry(3.25, 0.08, 3, 10, Math.PI); rg.rotateY(Math.PI / 2); rg.translate(x, hm + 0.4, zm + dm * 0.72); S.add(rg, '#eef1f2'); }
  S.quader(xm, hm, zm, xm + M, hm + 0.4, zm + dm, KIES_D);
  if (dm * 0.72 - 4 > 10) {
    if ([1, 4, 7].includes(K.v)) {
      // Q21: Parkhausvariante ohne größere Grundfläche; gestapelte offene
      // Decks statt eines immer gleichen ebenerdigen Parkplatz-Motivs.
      const x1 = xm + 2, x2 = xm + M - 2;
      const z1 = zm + 1, z2 = zm + dm * 0.72 - 4.2;
      for (const y of [hm + 2.8, hm + 5.4]) {
        S.quader(x1, y, z1, x2, y + 0.32, z2, '#7e858c'); // Farben aus parkdeck/STAHL: keine zusätzlichen Draw Calls
        for (const px of [x1 + 1, x2 - 1]) for (const pz of [z1 + 1, z2 - 1])
          S.box(0.65, 2.35, 0.65, px, y - 1.15, pz, STAHL);
        for (const px of [x1 + 1, x2 - 1])
          S.box(0.24, 0.9, z2 - z1, px, y + 0.75, (z1 + z2) / 2, STAHL);
      }
      parkdeck(K, x1, z1, x2, z2, hm + 5.72, false);
    } else parkdeck(K, xm + 1, zm + 1, xm + M - 1, zm + dm * 0.72 - 4.2, hm + 0.4, false);
  }
  if (K.alt) flecken(K, s, 0, M, EG, hm, 0.06, f, 6);
}

// ---------------------------------------------------------------- Familie 6: Kopfbau im Einkaufszentrum
function familie6(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  // Varianten 8 bis 15: Klinker, Sandstein, Anthrazit, Terrakotta, Taubenblau, Ocker, Umbra, Salbei (Center-Kopfbauten der
  // dichten Rhein-Ruhr-Schiene ohne Kopie unter 50 km)
  const verkl = K.c(['#d6d9db', '#e3dccf', '#cfd4d6', '#e6e0d4', '#d9d5cc', '#dfe2e3', '#d2cdc2', '#e2e4e4', '#b9806a', '#d4bf98', '#7f878d', '#c9906f', '#9fb0bd', '#b5a48c', '#8d7f72', '#a8b39f'][v]);
  const rueck = 0.7, ei = rueck + 0.1;
  K.tRelief = 0.3;
  mallFluegel(K, K.xm, K.M, Math.min(d, Math.max(26, d * 0.8)), Math.min(Hw, EG + GH * (n >= 3 ? 1 : 0) + 1.5));
  S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, dunkler(verkl, 0.1));
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, verkl);
  const V = clamp(Math.min(w, d) * 0.18, 5, 9); // Glasfuge an der Ecke
  K.raster = 4; K.fensterBand = [0.9, 3.6];
  for (const s of K.seiten) {
    K.nutz[s.seite] = s.L - V;
    erdgeschoss(K, s, { raster: 5, pfeiler: '#59636b', pb: 0.4, sockel: '#6b7177', sturz: '#cfd3d6', glas: '#557286', tuer: 'schiebe', eingaenge: s.seite === '+z' ? [1] : undefined });
    vordach(K, s, { stil: 'platte', tiefe: 2.4, y: 4.6, farbe: '#eef0f0', dicke: 0.6 });
    if (n < 2) continue;
    // horizontale Paneelbänder
    for (let y = EG + 1.2; y < Hw - 0.5; y += 1.2) s.q(0, s.L - V, y - 0.04, y + 0.04, 0, 0.06, dunkler(verkl, 0.07));
    for (let u = 4; u < s.L - V; u += 4) s.q(u - 0.03, u + 0.03, EG, Hw, 0, 0.06, dunkler(verkl, 0.05));
    // Glasfuge an der Ecke
    s.q(s.L - V, s.L, EG, Hw + 1.5, 0, 0.08, '#6f93a6');
    for (let y = EG; y < Hw + 1.5; y += 1.5) s.q(s.L - V, s.L, y - 0.05, y + 0.05, 0.08, 0.16, '#e6eaec');
    for (let u = s.L - V; u <= s.L + 0.01; u += V / 4) s.q(u - 0.06, u + 0.06, EG, Hw + 1.5, 0.08, 0.2, '#e6eaec');
    // schmales Fensterband
    if (v % 2) { s.q(2, s.L - V - 2, Hw - 2.6, Hw - 1.4, 0, 0.08, GLAS); }
    s.q(0, s.L - V, Hw - 0.3, Hw + 0.6, 0, 0.3, '#cfd3d6');
    flecken(K, s, 0, s.L - V, EG, Hw, 0.1, verkl, 8);
    K.zonen[s.seite] = { u: (s.L - V) * 0.5, y: EG + (Hw - EG) * (v % 2 ? 0.42 : 0.55), t: 0.4, hb: clamp((s.L - V) * 0.08, 2.0, Math.min(5, (Hw - EG) * 0.32)), max: (s.L - V) * 0.8, grund: verkl };
  }
  if (n < 2) for (const s of K.seiten) K.zonen[s.seite] = { u: s.L * 0.5, y: EG + 1.2, t: 0.4, hb: 1.5, max: s.L * 0.75, grund: verkl };
  attika(K, x0, z0, w, d, Hw + 0.6, 0.3, '#cfd3d6', 0.4);
  setzeDach(K, x0 + 2, z0 + 2, x0 + w - V - 1, z0 + d - V - 1, Hw + 0.75);
  lichtkuppeln(K, x0 + 3, z0 + 3, x0 + w - V - 2, z0 + d - V - 2, Hw + 0.75);
  technik(K, x0 + 3, z0 + 3, x0 + w - V - 2, z0 + d - V - 2, Hw + 0.75, { max: 6 });
  // H-Kubus über der Glasfuge
  const hc = Math.min(V, 5);
  S.box(hc, hc, hc, x0 + w - V / 2, Hw + 1.5 + hc / 2, z0 + d - V / 2, ROT);
  for (const s of K.seiten) plakat(K, s, 'H', s.L - V / 2, Hw + 1.5 + hc / 2, -V / 2 + hc / 2 + 0.03, hc * 0.95, '#ffffff', ROT);
  return Hw + 3 + hc;
}

// ---------------------------------------------------------------- Familie 7: Hartwig Sport
function familie7(K) {
  const { S, v, x0, z0, w, d, n, Hw, r } = K;
  const stil = ['dunkel', 'weiss', 'holz', 'dunkel', 'netz', 'weiss', 'dunkel', 'holz'][v];
  const verkl = K.c({ dunkel: '#3d4349', weiss: '#eef0f0', holz: '#b9875a', netz: '#9aa2a8' }[stil]);
  const rueck = 0.6, ei = rueck + 0.1;
  K.tRelief = 0.35;
  if (K.haus.lage === 'center') mallFluegel(K, K.xm, K.M, Math.min(d, Math.max(24, d * 0.8)), EG + 1.5);
  S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, '#3a4148');
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, verkl);
  const gruppen = K.gruppenEG;
  void gruppen;
  const [sz, sx] = K.seiten;
  for (const s of K.seiten) {
    erdgeschoss(K, s, { raster: 4.2, pfeiler: '#2b3036', pb: 0.3, sockel: '#2b3036', sturz: '#2b3036', glas: '#506d80', tuer: 'schiebe', rueck, glasTop: 4.6 });
    vordach(K, s, { stil: 'platte', tiefe: 1.6, y: 4.7, dicke: 0.8, farbe: stil === 'weiss' ? ROT : '#2b3036', streifen: stil !== 'weiss' });
    // Verkleidung
    const y0 = EG + 0.8, y1 = Hw;
    if (stil === 'dunkel') for (let u = 1.2; u < s.L; u += 1.2) s.q(u - 0.025, u + 0.025, y0 - 0.8, y1, 0, 0.05, heller(verkl, 0.06));
    if (stil === 'holz') for (let u = 0.25; u < s.L; u += 0.5) s.q(u - 0.11, u + 0.11, EG, y1, 0, 0.18, K.r() < 0.5 ? verkl : dunkler(verkl, 0.05));
    if (stil === 'netz') { for (let u = 0.6; u < s.L; u += 1.2) s.q(u - 0.04, u + 0.04, EG, y1, 0.25, 0.3, '#c4cacf'); for (let y = EG + 0.6; y < y1; y += 1.2) s.q(0, s.L, y - 0.04, y + 0.04, 0.25, 0.3, '#c4cacf'); }
    if (stil === 'weiss') { s.q(0, s.L, EG, EG + 0.8, 0, 0.1, ROT); }
    s.q(0, s.L, Hw - 0.1, Hw + 0.5, 0, 0.12, stil === 'weiss' ? '#dfe2e3' : dunkler(verkl, 0.05));
    if (n >= 2 && s === sx) { // Fensterband im OG
      s.q(1.5, s.L * 0.45, EG + 1.6, EG + 3.6, 0, 0.3, '#5a7a8c');
      for (let u = 2.5; u < s.L * 0.45; u += 1.6) s.q(u - 0.05, u + 0.05, EG + 1.6, EG + 3.6, 0.3, 0.36, '#2b3036');
    }
    flecken(K, s, 0, s.L, EG, Hw, 0.36, verkl, 6);
  }
  // Großflächenwerbung auf +z
  const wb = Math.min(sz.L * 0.5, 34), wh = Math.min(Hw - EG - 1.2, 11);
  if (wh > 2) {
    const wu = sz.L * 0.32, wy = EG + 0.6 + wh / 2;
    K.werbung = { seite: '+z', u0: wu - wb / 2, u1: wu + wb / 2 };
    const bg = ['#1f6fb5', '#f2b705', '#2f8f5b', '#e8562a', '#6b3fa0', '#1f6fb5', '#2b2b2b', '#2f8f5b'][v];
    sz.q(wu - wb / 2 - 0.25, wu + wb / 2 + 0.25, wy - wh / 2 - 0.25, wy + wh / 2 + 0.25, 0.3, 0.45, '#d9dcde');
    sz.q(wu - wb / 2, wu + wb / 2, wy - wh / 2, wy + wh / 2, 0.45, 0.55, bg);
    for (let i = 0; i < 3; i++) {
      const len = wurzelSumme(wh, wh) * 0.9;
      const uc = wu + wb * (0.12 + i * 0.12);
      if (uc + wh * 0.35 > wu + wb / 2) continue;
      sz.kipp(1.0, len * 0.8, 0.05, uc, wy, 0.58, ['#ffffff', ROT, '#f2b705'][i], -0.55);
    }
    // Figur: Läufer-Silhouette aus Quadern
    const fu = wu + wb * 0.3, fy = wy - wh * 0.12, fs = wh * 0.11;
    sz.kipp(fs * 0.9, fs * 2.6, 0.05, fu, fy + fs * 1.4, 0.62, '#ffffff', -0.3);
    sz.q(fu + fs * 0.6, fu + fs * 1.5, fy + fs * 2.9, fy + fs * 3.8, 0.6, 0.64, '#ffffff');
    sz.kipp(fs * 0.5, fs * 2.4, 0.05, fu - fs * 0.6, fy - fs * 0.5, 0.62, '#ffffff', -0.8);
    sz.kipp(fs * 0.5, fs * 2.4, 0.05, fu + fs * 0.9, fy - fs * 0.4, 0.62, '#ffffff', 0.6);
    sz.kipp(fs * 0.4, fs * 1.9, 0.05, fu + fs * 0.9, fy + fs * 1.9, 0.62, '#ffffff', 1.2);
    const slogan = SLOGANS[(v + Math.floor(r() * 2)) % SLOGANS.length];
    const sv = tex(slogan, '#ffffff').seitenverhaeltnis;
    const sph = Math.min(wh * 0.7, (wb * 0.62) / sv);
    plakat(K, sz, slogan, wu - wb * 0.17, wy, 0.6, sph, '#ffffff', null);
  }
  // Kletterwand bei Outdoor-Varianten
  if (stil === 'holz' && n >= 2) {
    const u0 = sx.L * 0.55, u1 = Math.min(sx.L - 2, u0 + 9);
    sx.q(u0, u1, EG - 0.5, Hw - 0.2, 0.2, 0.4, '#8f979c');
    for (let i = 0; i < 34; i++) sx.q(...(() => { const u = zw(r, u0 + 0.3, u1 - 0.6), y = zw(r, EG, Hw - 0.8); return [u, u + 0.35, y, y + 0.3]; })(), 0.4, 0.55, waehle(r, ['#e04b3a', '#f2c14e', '#3a7bd5', '#4caf50', '#ff8c42', '#8d5fbf']));
  }
  // Logos
  const hbS = clamp(sx.L * 0.05, 1.3, Math.min(2.6, (Hw - EG) * 0.22 + 0.8));
  K.zonen['+x'] = { text: 'HARTWIG SPORT', sport: true, u: stil === 'holz' && n >= 2 ? sx.L * 0.28 : sx.L * 0.5, y: n >= 2 ? Hw - hbS * 1.6 : EG + 2.0, t: 0.6, hb: n >= 2 ? hbS : 1.1, max: sx.L * 0.48, grund: verkl };
  K.zonen['+z'] = { text: 'HARTWIG SPORT', sport: true, u: wh > 2 ? Math.min(sz.L * 0.32 + wb / 2 + (sz.L - (sz.L * 0.32 + wb / 2)) / 2, sz.L - 6) : sz.L * 0.5, y: n >= 2 ? Hw - hbS * 1.6 : EG + 2.0, t: 0.6, hb: n >= 2 ? hbS : 1.1, max: wh > 2 ? (sz.L - sz.L * 0.32 - wb / 2) * 0.8 : sz.L * 0.6, grund: verkl };
  // Dach
  attika(K, x0, z0, w, d, Hw + 0.5, 0.25, stil === 'weiss' ? '#dfe2e3' : '#4a5056', 0.35);
  const yD = Hw + 0.65;
  K.raster = 3.2; K.fensterBand = [1.6, 3.6];
  setzeDach(K, x0 + 2, z0 + 2, x0 + w - 2, z0 + d - 2, yD);
  if (v % 3 === 0 && w >= 30) { // Bolzplatz auf dem Dach
    const cw = Math.min(w - 8, 32), cd = Math.min(d - 8, 18);
    const cx0 = x0 + w - cw - 3, cz0 = z0 + d - cd - 3;
    S.quader(cx0, yD, cz0, cx0 + cw, yD + 0.1, cz0 + cd, '#3f8f6a');
    S.quader(cx0 + 1, yD + 0.1, cz0 + 1, cx0 + cw - 1, yD + 0.13, cz0 + 1.12, '#ffffff');
    S.quader(cx0 + 1, yD + 0.1, cz0 + cd - 1.12, cx0 + cw - 1, yD + 0.13, cz0 + cd - 1, '#ffffff');
    S.quader(cx0 + cw / 2 - 0.06, yD + 0.1, cz0 + 1, cx0 + cw / 2 + 0.06, yD + 0.13, cz0 + cd - 1, '#ffffff');
    S.quader(cx0 + 1, yD + 0.1, cz0 + 1, cx0 + 1.12, yD + 0.13, cz0 + cd - 1, '#ffffff');
    S.quader(cx0 + cw - 1.12, yD + 0.1, cz0 + 1, cx0 + cw - 1, yD + 0.13, cz0 + cd - 1, '#ffffff');
    for (const gx of [cx0 + 1.5, cx0 + cw - 1.5]) { S.box(0.1, 2, 0.1, gx, yD + 1, cz0 + cd / 2 - 1.8, '#f4f4f4'); S.box(0.1, 2, 0.1, gx, yD + 1, cz0 + cd / 2 + 1.8, '#f4f4f4'); S.box(0.1, 0.1, 3.7, gx, yD + 2, cz0 + cd / 2, '#f4f4f4'); }
    for (let x = cx0; x <= cx0 + cw + 0.01; x += 2.5) { S.box(0.1, 3.5, 0.1, x, yD + 1.75, cz0 + cd, '#5f676e'); }
    for (let z = cz0; z <= cz0 + cd + 0.01; z += 2.5) { S.box(0.1, 3.5, 0.1, cx0 + cw, yD + 1.75, z, '#5f676e'); }
    S.quader(cx0, yD + 3.4, cz0 + cd - 0.05, cx0 + cw, yD + 3.5, cz0 + cd + 0.05, '#5f676e');
    S.quader(cx0 + cw - 0.05, yD + 3.4, cz0, cx0 + cw + 0.05, yD + 3.5, cz0 + cd, '#5f676e');
    for (let y = yD + 0.9; y < yD + 3.4; y += 0.9) { S.quader(cx0, y, cz0 + cd - 0.02, cx0 + cw, y + 0.03, cz0 + cd + 0.02, '#8a9196'); S.quader(cx0 + cw - 0.02, y, cz0, cx0 + cw + 0.02, y + 0.03, cz0 + cd, '#8a9196'); }
    technik(K, x0 + 2, z0 + 2, cx0 - 1, z0 + d - 2, yD, { max: 3 });
  } else { // Solarfelder
    for (let z = z0 + 3; z + 2 < z0 + d - 3; z += 3.2) for (let x = x0 + 3; x + 4 < x0 + w * 0.65; x += 4.6) {
      const g = new THREE.BoxGeometry(4.2, 0.08, 1.9); g.rotateX(-0.3); g.translate(x + 2.1, yD + 0.6, z + 1); S.add(g, '#2c4a73');
      S.box(0.1, 0.6, 0.1, x + 0.3, yD + 0.3, z + 1.6, '#8a9196'); S.box(0.1, 0.6, 0.1, x + 3.9, yD + 0.3, z + 1.6, '#8a9196');
    }
    technik(K, x0 + w * 0.67, z0 + 2, x0 + w - 2, z0 + d - 2, yD, { max: 4 });
  }
  return Hw + 5;
}

// ================================================================ Ost-Familien 8 bis 11 (ehemalige DDR-Warenhäuser)
// K.saniert: Stand nach 90er-Modernisierung, sonst Originalzustand (leicht patiniert über K.p).

/** Rautenpyramide (Aluminium-Wabe) im lokalen Rahmen: Spitze nach +t, Basis bei t = 0. Facettiert. */
function raute(a, b, h) {
  let g = new THREE.ConeGeometry(1, 1, 4, 1, true);
  g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); g.scale(a, b, h);
  g = g.toNonIndexed(); g.computeVertexNormals();
  return g;
}
/** Rautenfeld (versetzte Reihen, lückenlos). o: { t, skip(u, y), farbe(u, y) } */
function rautenFeld(s, u0, u1, y0, y1, a, b, h, farbe, o = {}) {
  const basis = raute(a, b, h);
  const rows = Math.floor((y1 - y0) / b) - 1;
  for (let j = 0; j < rows; j++) {
    const yc = y0 + b * (j + 1), off = j % 2 ? a : 0;
    for (let uc = u0 + a + off; uc <= u1 - a + 1e-3; uc += 2 * a) {
      if (o.skip && o.skip(uc, yc)) continue;
      const g = basis.clone(); g.translate(uc, yc, o.t ?? 0.02);
      s.geo(g, o.farbe ? o.farbe(uc, yc) : farbe);
    }
  }
}
/** Rauten auf einer Viertelrundung um (cx, cz), Radius R. */
function rautenBogen(K, cx, cz, R, y0, y1, a, b, h, farbe) {
  const bogenL = (Math.PI / 2) * R, nA = Math.max(2, Math.round(bogenL / (2 * a))), dth = Math.PI / 2 / nA;
  const basis = raute(bogenL / nA / 2, b, h);
  const rows = Math.floor((y1 - y0) / b) - 1;
  for (let j = 0; j < rows; j++) {
    const yc = y0 + b * (j + 1), off = j % 2 ? 0.5 : 0;
    for (let i = 0; i < nA; i++) {
      const th = (i + 0.5 + off) * dth;
      if (th > Math.PI / 2) continue;
      const g = basis.clone(); g.rotateY(th); g.translate(cx + Math.sin(th) * R, yc, cz + Math.cos(th) * R);
      K.S.add(g, typeof farbe === 'function' ? farbe() : farbe);
    }
  }
}
/** Körper mit abgerundeter +x/+z-Ecke (Radius R) zwischen y0 und y1, Außenkante um 'aus' vergrößert. */
function rundKoerper(S, x0, z0, w, d, R, y0, y1, f, aus = 0, ein = 0) {
  const cx = x0 + w - R, cz = z0 + d - R;
  S.quader(x0, y0, z0, cx, y1, z0 + d + aus - ein, f);
  S.quader(cx - 0.01, y0, z0, x0 + w + aus - ein, y1, cz, f);
  viertelzylinder(S, cx, cz, R + aus - ein, y0, y1, f, 16);
}
/** Schriftzug-Gerüst (Stahlfachwerk) auf dem Dach, hinter der Logozone. */
function schriftGeruest(K, s, u, br, yFuss, yB, hb, t) {
  const st = '#4f565c', yT = yB + hb * 1.55;
  s.q(u - br / 2 - 0.4, u + br / 2 + 0.4, yB, yB + 0.16, t - 0.2, t - 0.04, st);
  s.q(u - br / 2 - 0.4, u + br / 2 + 0.4, yT, yT + 0.16, t - 0.2, t - 0.04, st);
  const nf = Math.max(3, Math.round((br + 0.8) / 2.2)), df = (br + 0.8) / nf;
  for (let k = 0; k <= nf; k++) {
    const uu = u - br / 2 - 0.4 + k * df;
    s.q(uu - 0.08, uu + 0.08, yFuss, yT + 0.16, t - 0.2, t - 0.04, st);
    s.q(uu - 0.07, uu + 0.07, yFuss, yB, t - 1.6, t - 1.45, st); // Strebe hinten
    s.kipp(0.07, wurzelSumme(1.5, yB - yFuss), 0.07, uu, (yFuss + yB) / 2, t - 0.8, st, 0, Math.atan2(1.5, yB - yFuss));
    if (k < nf) s.kipp(0.06, wurzelSumme(df, yT - yB), 0.06, uu + df / 2, (yB + yT) / 2, t - 0.15, st, (k % 2 ? 1 : -1) * Math.atan2(df, yT - yB));
  }
}

// ---------------------------------------------------------------- Familie 8: Aluwabe (geschlossene Aluminium-Rautenfassade)
function familie8(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const san = K.saniert;
  const rund = v % 2 === 0;
  const R = rund ? clamp(Math.min(w, d) * 0.2, 5, 10) : 0;
  const Gk = !rund && san && n >= 2 ? clamp(Math.min(w, d) * 0.16, 5, 8) : 0; // verglaste Ecke nach Modernisierung
  const alu = san ? ['#d3d9dd', '#cdd4d9', '#d8dcdf', '#d0d6da'][v % 4] : K.p(['#bfc4c4', '#b9bebf', '#c4c6c3', '#bcc1c2'][v % 4]);
  const fuge = dunkler(alu, 0.24);
  const egRahmen = san ? '#3e454c' : K.p('#7d6748'); // eloxiert bronze im Original
  const gesF = K.p(v % 4 === 1 || v % 4 === 2 ? '#e6e7e5' : '#5b6168');
  const rueck = 0.7, ei = rueck + 0.1;
  const cx = x0 + w - R, cz = z0 + d - R;
  K.tRelief = 0.55;
  const egF = dunkler(fuge, 0.06);
  if (rund) { rundKoerper(S, x0, z0, w, d, R, 0, EG, egF, 0, ei); rundKoerper(S, x0, z0, w, d, R, EG, Hw, fuge); }
  else { S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, egF); S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, fuge); }
  const gy0 = n >= 2 ? Hw - 1.1 : Hw - 0.5, gy1 = Hw + 0.8, ov = 1.3;
  const yA = EG + 0.45;
  const Ltot = w + d, Hf = Math.max(1, gy0 - yA);
  const a = clamp(Math.sqrt((Ltot * Hf) / 6000), 0.75, 1.6), b = a * 1.12, h = a * 0.5;
  const r = K.r;
  const fleck = () => (!san && r() < 0.1 ? dunkler(alu, zw(r, 0.03, 0.08)) : alu);
  const band = san && n >= 3 ? [EG + 0.9, EG + GH - 0.5] : null; // 1. OG: Waben durch Glasband ersetzt
  K.raster = 2 * a; K.fensterBand = false;
  for (const s of K.seiten) {
    const uEnd = s.L - R, uN = uEnd - Gk;
    K.nutz[s.seite] = uN;
    erdgeschoss(K, s, { u1: uEnd, raster: 6, pfeiler: egRahmen, pb: 0.4, sockel: '#3b3f44', sturz: dunkler(alu, 0.12), glas: san ? '#557286' : GLAS, tuer: 'schiebe' });
    vordach(K, s, { stil: san ? 'glas' : 'duenn', u1: uEnd, ecke: !rund, tiefe: 2.3, y: 4.65, farbe: san ? '#eef0f0' : K.p('#d9dbd8') });
    // Schattenfuge über dem EG
    s.q(0, uEnd, EG, yA, 0, 0.08, '#2e3338');
    const bandU1 = uN * 0.78;
    rautenFeld(s, 0, uN, yA, gy0, a, b, h, alu, {
      farbe: () => fleck(),
      skip: band ? (u, y) => u < bandU1 + a && y + b > band[0] && y - b < band[1] : null,
    });
    if (band) { // Glasband mit Pfosten
      s.q(0, bandU1, band[0], band[1], 0, 0.1, GLAS_HELL);
      for (let u = 0; u <= bandU1; u += 1.6) s.q(u - 0.06, u + 0.06, band[0], band[1], 0.1, 0.2, '#e3e7e9');
      s.q(0, bandU1, band[0] - 0.15, band[0], 0, 0.45, '#e3e7e9');
      s.q(0, bandU1, band[1], band[1] + 0.15, 0, 0.45, '#e3e7e9');
    }
    if (Gk) { // verglaste Ecke
      s.q(uN, s.L, EG, gy0, 0, 0.1, '#6f93a6');
      for (let u = uN; u <= s.L + 0.01; u += Gk / 4) s.q(u - 0.06, u + 0.06, EG, gy0, 0.1, 0.22, '#e6eaec');
      for (let y = EG + GH; y < gy0; y += GH) s.q(uN, s.L, y - 0.2, y + 0.05, 0.1, 0.2, '#e6eaec');
    }
    // senkrechte Kantenprofile an den Feldrändern
    s.q(-0.05, 0.3, EG, gy0, 0, h + 0.05, dunkler(alu, 0.1));
    if (!rund && !Gk) s.q(s.L - 0.3, s.L + 0.05, EG, gy0, 0, h + 0.05, dunkler(alu, 0.1));
    flecken(K, s, 0, uN, EG + 1, gy0, h + 0.05, alu, 6);
    s.q(0, uEnd, gy0 - 0.2, gy0, 0, 0.6, '#3a3f44'); // Schattenfuge unter dem Gesims
  }
  if (rund) { // Rundung: EG-Glas, Waben oder Glas oben, Vordach
    const ring = (rad, y0, y1, f) => viertelzylinder(S, cx, cz, rad, y0, y1, f, 16);
    ring(R - rueck, 0.55, 4.3, GLAS_TUER); ring(R + 0.06, 0, 0.55, '#3b3f44'); ring(R + 0.04, 4.3, EG, egRahmen);
    for (let k = 0; k <= 6; k++) { const t = (k / 6) * Math.PI / 2; S.box(0.12, 3.8, 0.12, cx + Math.sin(t) * (R - rueck + 0.06), 2.4, cz + Math.cos(t) * (R - rueck + 0.06), egRahmen); }
    ring(R + 2.3, 4.65, 4.89, san ? '#a9c6d3' : K.p('#d9dbd8')); ring(R + 2.34, 4.72, 4.82, ROT);
    ring(R + 0.08, EG, yA, '#2e3338');
    if (san) {
      ring(R + 0.1, yA, gy0, '#6f93a6');
      for (let k = 0; k <= 8; k++) { const t = (k / 8) * Math.PI / 2; S.box(0.12, gy0 - yA, 0.12, cx + Math.sin(t) * (R + 0.16), (yA + gy0) / 2, cz + Math.cos(t) * (R + 0.16), '#e6eaec'); }
      for (let y = EG + GH; y < gy0; y += GH) ring(R + 0.22, y - 0.2, y + 0.05, '#e6eaec');
    } else rautenBogen(K, cx, cz, R, yA, gy0, a, b, h, fleck);
    ring(R + 0.6, gy0 - 0.2, gy0, '#3a3f44');
  }
  // kräftiges Gesims als Dachplatte
  if (rund) rundKoerper(S, x0, z0, w, d, R, gy0, gy1, gesF, ov);
  else S.quader(x0, gy0, z0, x0 + w + ov, gy1, z0 + d + ov, gesF);
  const lip = heller(gesF, 0.05);
  if (rund) rundKoerper(S, x0, z0, w, d, R, gy1, gy1 + 0.18, lip, ov - 0.15);
  else S.quader(x0, gy1, z0, x0 + w + ov - 0.15, gy1 + 0.18, z0 + d + ov - 0.15, lip);
  const yD = gy1 + 0.18;
  if (rund) rundKoerper(S, x0, z0, w, d, R, yD, yD + 0.06, KIES, -0.4);
  else S.quader(x0, yD, z0, x0 + w + ov - 0.6, yD + 0.06, z0 + d + ov - 0.6, KIES);
  const dx1 = x0 + w - 2 - R * 0.5, dz1 = z0 + d - 2 - R * 0.5;
  setzeDach(K, x0 + 2, z0 + 2, dx1, dz1, yD + 0.06);
  lichtkuppeln(K, x0 + 3, z0 + 3, dx1 - 1, dz1 - 1, yD + 0.06, 7, 9);
  technik(K, x0 + 3, z0 + 3, dx1 - 1, dz1 - 1, yD + 0.06, { max: 5, farbe: '#c4c6c4' });
  for (const s of K.seiten) {
    const uN = K.nutz[s.seite];
    const yL = band ? (band[1] + gy0) / 2 + 0.2 : yA + (gy0 - yA) * 0.55;
    K.zonen[s.seite] = n >= 2
      ? { u: uN * 0.5, y: yL, t: h + 0.18, hb: clamp(uN * 0.075, 2.0, Math.min(4.5, (band ? gy0 - band[1] : gy0 - yA) * 0.34)), max: uN * 0.72, grund: alu, wand: true }
      : { u: uN * 0.5, y: (yA + gy0) / 2, t: h + 0.18, hb: Math.min(1.3, (gy0 - yA) * 0.45), max: uN * 0.7, grund: alu, wand: true };
  }
  return gy1 + 6;
}

// ---------------------------------------------------------------- Familie 9: Kachelraster Ost (Emailleplatten, Fensterbänder, Schriftgerüst)
function familie9(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const san = K.saniert;
  const PAL = [['#d9822b', '#e9b949', '#f1ead8'], ['#3c9aa0', '#2f5f9a', '#eef0ea'], ['#b24a32', '#d9b48a', '#f2ede2'], ['#4f8f5a', '#e0c341', '#eef0e6'],
    ['#2f6f8f', '#e07a3a', '#f0ece2'], ['#c4572e', '#3f7f9a', '#efe9dc'], ['#7a5a9a', '#e3b34a', '#f1ede4'], ['#e2a62f', '#9a3b2e', '#f3eee2']][v].map((c) => K.p(c));
  const beton = K.p(['#d9d6cd', '#d2d0c8', '#dedbd2'][v % 3]);
  const muster = ['diagonal', 'block', 'schach', 'diagonal', 'verlauf', 'block', 'schach', 'verlauf'][v];
  const lisenen = v % 2 === 0;
  const kopf = (v % 4 === 1 || v % 4 === 2) && n >= 3; // geschlossener Plattenkopf an der Ecke
  const rueck = 0.7, ei = rueck + 0.1;
  K.tRelief = 0.35;
  S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, dunkler(beton, 0.12));
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, beton);
  const nOG = n - 1, HA = 0.9; // Attika
  const farbe = (i, k) => {
    if (muster === 'diagonal') return PAL[(i + k) % 3];
    if (muster === 'block') return Math.floor(i / 3) % 2 === 0 ? PAL[0] : PAL[k % 2 ? 1 : 2];
    if (muster === 'schach') return i % 5 === 2 ? PAL[1] : (i + k) % 2 ? PAL[0] : PAL[2];
    const m = (i + k * 2) % 6; return PAL[m < 2 ? 0 : m < 4 ? 1 : 2];
  };
  const glas = san ? '#6f8fa2' : GLAS, sprosse = san ? '#3e454c' : '#d4d8d9';
  const neu = '#d8dbdb';
  K.raster = 2.5; K.fensterBand = [1.55, GH - 0.3];
  for (const s of K.seiten) {
    const Kz = kopf ? clamp(s.L * 0.16, 6, 11) : 0;
    const uK = s.L - Kz;
    K.nutz[s.seite] = uK;
    erdgeschoss(K, s, { raster: 5, pfeiler: beton, pb: 0.7, sockel: '#55595e', sturz: beton, glas: san ? '#557286' : GLAS, tuer: 'schiebe' });
    vordach(K, s, { stil: san ? 'glas' : 'platte', tiefe: 2.6, y: 4.65, farbe: '#efede7' });
    const nc = Math.max(1, Math.round(uK / 1.25)), cw = uK / nc;
    if (n >= 2) {
      for (let k = 0; k < nOG; k++) {
        const y0 = EG + k * GH;
        if (san) { // 90er: großformatige Verbundplatten, ein Farbstreifen
          s.q(0, uK, y0 + 0.05, y0 + 1.5, 0, 0.14, neu);
          for (let u = 3; u < uK; u += 3) s.q(u - 0.03, u + 0.03, y0 + 0.05, y0 + 1.5, 0.14, 0.16, dunkler(neu, 0.08));
          s.q(0, uK, y0 + 1.1, y0 + 1.3, 0.14, 0.18, PAL[0]);
        } else for (let i = 0; i < nc; i++) s.q(i * cw + 0.05, (i + 1) * cw - 0.05, y0 + 0.08, y0 + 1.47, 0, 0.14, farbe(i, k));
        s.q(0, uK, y0 + 1.47, y0 + 1.6, 0, 0.24, beton);
        s.q(0, uK, y0 + 1.6, y0 + GH - 0.3, 0, 0.04, glas);
        for (let i = 0; i <= nc; i += 2) s.q(i * cw - 0.05, i * cw + 0.05, y0 + 1.6, y0 + GH - 0.3, 0, 0.1, sprosse);
        s.q(0, uK, y0 + GH - 0.3, y0 + GH, 0, 0.2, beton);
      }
      if (Kz) { // Plattenkopf: alle Geschosse geschlossen
        const nk = Math.max(2, Math.round(Kz / 1.25)), kw = Kz / nk, nr = Math.floor((Hw - EG) / 1.5);
        const kh = (Hw - EG) / nr;
        if (san) { s.q(uK, s.L, EG, Hw, 0, 0.16, neu); for (let y = EG + 3; y < Hw; y += 3) s.q(uK, s.L, y - 0.03, y + 0.03, 0.16, 0.18, dunkler(neu, 0.08)); s.q(uK + 0.6, uK + 1.0, EG, Hw, 0.16, 0.2, PAL[0]); }
        else for (let j = 0; j < nr; j++) for (let i = 0; i < nk; i++) s.q(uK + i * kw + 0.05, uK + (i + 1) * kw - 0.05, EG + j * kh + 0.05, EG + (j + 1) * kh - 0.05, 0, 0.16, farbe(i + j, j + 1));
        s.q(uK - 0.3, uK + 0.05, EG, Hw + HA, 0, 0.34, beton);
      }
      if (lisenen) for (let i = 0; i <= nc; i += 4) s.q(i * cw - 0.18, i * cw + 0.18, EG, Hw + HA, 0, 0.32, beton);
    } else { // eingeschossig: Plattenband als Fries
      const nr = Math.max(1, Math.floor((Hw - EG - 0.2) / 1.2));
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) s.q(i * cw + 0.05, (i + 1) * cw - 0.05, EG + 0.15 + j * 1.2, EG + 0.15 + (j + 1) * 1.2 - 0.1, 0, 0.14, san ? neu : farbe(i, j));
    }
    s.q(0, s.L, Hw, Hw + HA, 0, 0.26, beton);
    s.q(0, s.L, Hw + HA, Hw + HA + 0.12, -0.05, 0.36, heller(beton, 0.04));
    flecken(K, s, 0, s.L, EG, Hw, 0.25, beton, 8);
  }
  // Dach
  S.quader(x0, Hw, z0, x0 + w - 0.3, Hw + 0.15, z0 + d - 0.3, KIES);
  S.quader(x0, Hw, z0, x0 + w, Hw + HA, z0 + 0.3, beton); S.quader(x0, Hw, z0, x0 + 0.3, Hw + HA, z0 + d, beton);
  const yD = Hw + 0.15;
  setzeDach(K, x0 + 2, z0 + 2, x0 + w - 4, z0 + d - 5, yD);
  lichtkuppeln(K, x0 + 3, z0 + 3, x0 + w - 5, z0 + d - 6, yD, 7, 8);
  technik(K, x0 + 3, z0 + 3, x0 + w - 5, z0 + d - 6, yD, { max: 4, farbe: '#cfccc4' });
  // Schriftzug-Gerüst auf beiden sichtbaren Dachkanten
  for (const s of K.seiten) {
    const L = K.nutz[s.seite];
    const hbS = clamp(L * 0.07, 2.0, 4.0), hb = Math.min(hbS, (L * 0.62) / schriftBreite('HARTWIG', 1));
    const br = schriftBreite('HARTWIG', hb), u = L * 0.5, t = -1.4, yB = Hw + HA + 0.35;
    schriftGeruest(K, s, u, br, yD, yB, hb, t);
    K.zonen[s.seite] = { u, y: yB + 0.1 + hb * 0.78, t: t + 0.05, hb, max: L * 0.62, grund: beton, dach: true };
  }
  return Hw + HA + 6;
}

// ---------------------------------------------------------------- Mosaik (Kunst am Bau), Kacheln zu Läufen zusammengefasst
function mosaikMotiv(motiv, W, H, P) {
  const m = Math.min(W, H);
  const kreis = (X, Y, cx, cy, r) => wurzelSumme(X - cx, Y - cy) < r;
  if (motiv === 0) return (X, Y) => { // Sonne, Menschen, Welle
    const sx = 0.7 * W, sy = 0.72 * H, sr = 0.17 * m, dS = wurzelSumme(X - sx, Y - sy);
    if (dS < sr * 0.62) return P.gelb;
    if (dS < sr) return P.orange;
    if (dS < sr * 1.75 && Math.floor((Math.atan2(Y - sy, X - sx) + Math.PI) / (Math.PI / 10)) % 2 === 0) return P.hellgelb;
    const fig = [[0.16, 0.6, P.rot], [0.31, 0.7, P.weiss], [0.46, 0.54, P.blauD]];
    for (const [fx, fh, fc] of fig) {
      const cxF = fx * W, bw = 0.075 * W;
      if (kreis(X, Y, cxF, (fh + 0.07) * H, 0.05 * W)) return P.haut;
      if (Math.abs(X - cxF) < bw / 2 && Y > 0.13 * H && Y < fh * H) return fc;
    }
    // ausgestreckter Arm zur Sonne
    const ax = 0.31 * W, ay = 0.6 * H, t = ((X - ax) * 0.8 + (Y - ay) * 0.6);
    if (t > 0 && t < 0.25 * W && Math.abs(-(X - ax) * 0.6 + (Y - ay) * 0.8) < 0.025 * W + 0.15) return P.weiss;
    if (Y < 0.13 * H) return Math.floor((X + Y * 1.5) / (0.09 * W)) % 2 ? P.rotD : P.orange;
    if (Math.abs(Y - (0.32 * H + Math.sin((X / W) * Math.PI * 3) * 0.05 * H)) < 0.035 * H + 0.1) return P.weiss;
    return Y > 0.45 * H ? P.blau : P.blauH;
  };
  if (motiv === 1) return (X, Y) => { // Kosmos und Wissenschaft
    const cx = 0.62 * W, cy = 0.6 * H;
    if (kreis(X, Y, cx, cy, 0.06 * m)) return P.rot;
    for (const wi of [0, Math.PI / 3, -Math.PI / 3]) {
      const dx = X - cx, dy = Y - cy, u = dx * Math.cos(wi) + dy * Math.sin(wi), q = -dx * Math.sin(wi) + dy * Math.cos(wi);
      const e = (u / (0.32 * m)) ** 2 + (q / (0.11 * m)) ** 2;
      if (Math.abs(e - 1) < 0.22) return P.weiss;
    }
    const ex = 0.25 * W, ey = 0.28 * H, er = 0.2 * m;
    if (kreis(X, Y, ex, ey, er)) return Math.sin(X * 0.9) + Math.cos(Y * 1.1) > 0.6 ? P.gruen : P.tuerkis;
    if (kreis(X, Y, ex, ey, er * 1.12)) return P.blauH;
    const kd = (X - 0.12 * W) * 0.55 - (Y - 0.9 * H) * 0.83; // Komet
    if (Math.abs((X - 0.12 * W) * 0.83 + (Y - 0.9 * H) * 0.55) < 0.02 * W + 0.12 && kd > 0 && kd < 0.3 * W) return P.orange;
    if ((Math.floor(X * 1.7) * 7 + Math.floor(Y * 1.7) * 13) % 23 === 0) return P.gelb;
    return Y > 0.5 * H ? P.blauD : P.nacht;
  };
  return (X, Y) => { // Arbeit und Fortschritt: Zahnrad, Ähren, Schwünge
    const cx = 0.66 * W, cy = 0.52 * H, r = 0.26 * m, dz = wurzelSumme(X - cx, Y - cy), wz = Math.atan2(Y - cy, X - cx);
    if (dz < r * 0.42) return P.gelb;
    if (dz < r * 0.62) return P.sand;
    if (dz < r) return P.grau;
    if (dz < r * 1.22 && Math.floor((wz + Math.PI) / (Math.PI / 6)) % 2 === 0) return P.grau;
    for (const fx of [0.1, 0.17, 0.24]) {
      const sx = fx * W + Math.sin(Y / H * 2) * 0.02 * W;
      if (Math.abs(X - sx) < 0.012 * W + 0.1 && Y < 0.78 * H) return P.ocker;
      if (Y > 0.6 * H && Y < 0.9 * H && Math.abs(X - sx) < 0.03 * W + 0.15 && Math.floor(Y * 2.2) % 2 === 0) return P.gelb;
    }
    const sw = (X * 0.7 + Y) / (0.16 * (W + H));
    const f = sw - Math.floor(sw);
    if (Y < 0.35 * H && f < 0.4) return P.rot;
    if (Y < 0.35 * H && f < 0.55) return P.orange;
    return Y > 0.8 * H ? P.blauH : P.creme;
  };
}
function mosaik(K, s, u0, u1, y0, y1, motiv, t) {
  const san = K.saniert;
  const P0 = { gelb: '#f2c14e', orange: '#e8862e', hellgelb: '#f0d98a', rot: '#c8323a', rotD: '#9a2f2a', weiss: '#f1ece0', blau: '#3d6fb0', blauH: '#6aa0c8', blauD: '#2f4f8a',
    haut: '#e7b98f', nacht: '#1f3561', gruen: '#5aa05a', tuerkis: '#3c9aa0', grau: '#5a6168', sand: '#d9c6a0', ocker: '#c9962e', creme: '#ece0c4' };
  const P = Object.fromEntries(Object.entries(P0).map(([k, c]) => [k, san ? c : K.p('#' + new THREE.Color(c).offsetHSL(0, -0.08, 0.02).getHexString())]));
  const W = u1 - u0, H = y1 - y0;
  const m = clamp(Math.min(W / 24, H / 18), 0.55, 1.0);
  const nc = Math.floor(W / m), nr = Math.floor(H / m), mu = W / nc, my = H / nr;
  const f = mosaikMotiv(motiv, W, H, P);
  for (let j = 0; j < nr; j++) {
    let start = 0, col = null;
    for (let i = 0; i <= nc; i++) {
      const c = i < nc ? f((i + 0.5) * mu, (j + 0.5) * my) : null;
      if (c !== col) {
        if (col) s.q(u0 + start * mu + 0.03, u0 + i * mu - 0.03, y0 + j * my + 0.03, y0 + (j + 1) * my - 0.03, t, t + 0.1, col);
        start = i; col = c;
      }
    }
  }
}
/** Flugdach über einem Eingang. typ: 'hypar' (HP-Schale) | 'falt' (Faltwerk) | 'platte' */
function flugdach(K, s, um, typ, f) {
  const B = typ === 'hypar' ? 13 : 17, T = typ === 'hypar' ? 9 : 8, t0 = -0.4;
  if (typ === 'hypar') {
    const N = 8, yM = 6.2, c = 1.25, dick = 0.18, p = [];
    const P = (i, j, off) => { const x = i / N * 2 - 1, z = j / N * 2 - 1; return [um + x * B / 2, yM + c * x * z + off, t0 + T / 2 + z * T / 2]; };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const A = P(i, j, 0), Bq = P(i + 1, j, 0), C = P(i + 1, j + 1, 0), D = P(i, j + 1, 0);
      p.push(...A, ...C, ...Bq, ...A, ...D, ...C);
      const a2 = P(i, j, -dick), b2 = P(i + 1, j, -dick), c2 = P(i + 1, j + 1, -dick), d2 = P(i, j + 1, -dick);
      p.push(...a2, ...b2, ...c2, ...a2, ...c2, ...d2);
    }
    let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
    s.geo(g, f);
    // Randträger als dünne Kanten
    for (const [i0, j0, i1, j1] of [[0, 0, N, 0], [0, N, N, N], [0, 0, 0, N], [N, 0, N, N]]) {
      const A = P(i0, j0, 0), Bq = P(i1, j1, 0), len = wurzelSumme(Bq[0] - A[0], Bq[1] - A[1], Bq[2] - A[2]);
      const gg = new THREE.BoxGeometry(len, 0.28, 0.28);
      const dir = new THREE.Vector3(Bq[0] - A[0], Bq[1] - A[1], Bq[2] - A[2]).normalize();
      gg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir));
      gg.translate((A[0] + Bq[0]) / 2, (A[1] + Bq[1]) / 2 - 0.05, (A[2] + Bq[2]) / 2);
      s.geo(gg, j0 === N && j1 === N ? ROT : heller(f, 0.03));
    }
    // Stützen in den Tiefpunkten
    const L1 = P(0, N, 0), L2 = P(N, 0, 0);
    for (const q of [L1, L2]) { const [x, z] = s.welt(q[0], q[2]); zyl(K.S, x, 0.3, z, 0.22, q[1] - 0.3, '#8d9196', 8, 0.12); }
    return yM + c;
  }
  if (typ === 'falt') {
    const nf = 6, fw = B / nf, wi = 0.3, y = 5.6, by = 0.26, lang = fw / Math.cos(wi);
    for (let i = 0; i < nf; i++) s.kipp(lang, by, T, um - B / 2 + fw * (i + 0.5), y, t0 + T / 2, f, (i % 2 ? 1 : -1) * wi);
    s.q(um - B / 2, um + B / 2, y - 0.25, y - 0.08, t0 + T - 0.1, t0 + T + 0.05, ROT);
    for (const du of [-B * 0.3, B * 0.3]) { const [x, z] = s.welt(um + du, t0 + T - 1.2); zyl(K.S, x, 0.3, z, 0.16, y - 0.4, '#8d9196', 8); }
    return y + 1;
  }
  const y = 5.0;
  s.q(um - B / 2, um + B / 2, y, y + 0.35, t0, t0 + T, f);
  s.q(um - B / 2, um + B / 2, y + 0.35, y + 1.0, t0 + T - 0.3, t0 + T, f);
  for (const uu of [um - B / 2, um + B / 2 - 0.3]) s.q(uu, uu + 0.3, y + 0.35, y + 1.0, t0 + 1.5, t0 + T, f);
  s.q(um - B / 2 - 0.02, um + B / 2 + 0.02, y + 0.35, y + 0.5, t0 + T, t0 + T + 0.03, ROT);
  for (let u = um - B / 2 + 1.5; u < um + B / 2; u += 2.2) s.q(u - 0.3, u + 0.3, y - 0.05, y, t0 + 1, t0 + T - 1, LICHT);
  for (const du of [-B * 0.36, -B * 0.12, B * 0.12, B * 0.36]) { const [x, z] = s.welt(um + du, t0 + T - 1.0); zyl(K.S, x, 0.3, z, 0.12, y - 0.3, '#8d9196', 8); }
  return y + 1;
}

// ---------------------------------------------------------------- Familie 10: Glasvorhang 70er Ost (Konsument-Typ, Flugdach, Mosaikwand)
function familie10(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const san = K.saniert;
  const prof = san ? '#c9ced2' : K.p('#5e5142');
  const glas = san ? '#7fa3b6' : K.p(['#5b7275', '#56696f', '#5f7470'][v % 3]);
  const brue = san ? '#a9b4bb' : K.p(['#3b3530', '#2f3a44', '#43392f'][v % 3]);
  const blende = san ? '#eef0f0' : K.p(['#e8e4d8', '#d9d4c6', '#ebe7dc'][v % 3]);
  const schale = K.p(san ? '#f1f0ec' : '#e3e1da');
  const schaleF = K.p(san ? '#7f8c95' : '#8a8478'); // Faltwerk/Platte: dunkler Sichtbeton, hebt sich vom Gehweg ab
  const mosSeite = v % 2 ? '+z' : '+x';
  const dachTyp = ['hypar', 'falt', 'platte'][v % 3];
  const motiv = Math.floor(v / 2) % 3;
  const rueck = 0.7, ei = rueck + 0.1;
  const HB = n >= 3 ? 4.2 : n === 2 ? 3.2 : 2.2;
  K.tRelief = 0.3;
  S.quader(x0, 0, z0, x0 + w - ei, EG, z0 + d - ei, dunkler(brue, 0.05));
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, dunkler(brue, 0.04));
  K.raster = 3.0; K.fensterBand = [1.4, GH - 0.1];
  let hoch = Hw + HB;
  for (const s of K.seiten) {
    const mos = s.seite === mosSeite && n >= 2;
    const Wm = mos ? clamp(s.L * 0.36, 10, 24) : 0, uC = s.L - Wm;
    K.nutz[s.seite] = uC;
    const ax = erdgeschoss(K, s, { raster: 5, pfeiler: prof, pb: 0.35, sockel: '#3b3f44', sturz: brue, glas: san ? '#557286' : GLAS, tuer: 'schiebe' });
    let fd = null;
    if (s.seite === '+z') { const e = ax.filter((x) => x.eingang); fd = e[0] ? (e[0].a + e[0].b) / 2 : null; }
    if (fd != null) {
      const B = dachTyp === 'hypar' ? 13 : 17;
      vordach(K, s, { stil: 'duenn', u1: Math.max(0.6, fd - B / 2 - 0.3), tiefe: 2.0, y: 4.6, farbe: '#ecebe6', ecke: false });
      vordach(K, s, { stil: 'duenn', u0: Math.min(s.L - 0.6, fd + B / 2 + 0.3), tiefe: 2.0, y: 4.6, farbe: '#ecebe6' });
      hoch = Math.max(hoch, flugdach(K, s, fd, dachTyp, dachTyp === 'hypar' ? schale : schaleF));
    } else vordach(K, s, { stil: 'duenn', tiefe: 2.0, y: 4.6, farbe: '#ecebe6' });
    if (n >= 2) {
      for (let k = 0; k < n - 1; k++) {
        const y0 = EG + k * GH;
        s.q(0, uC, y0, y0 + 0.25, 0, 0.22, prof);
        s.q(0, uC, y0 + 0.25, y0 + 1.3, 0, 0.06, brue);
        s.q(0, uC, y0 + 1.3, y0 + 1.4, 0, 0.16, prof);
        s.q(0, uC, y0 + 1.4, y0 + GH, 0, 0.04, glas);
        if (!san) for (let u = 0.75; u < uC; u += 6) s.q(u, u + 1.5, y0 + 1.6, y0 + GH - 0.2, 0.04, 0.06, K.p('#d8cfb5')); // Vorhänge
      }
      for (let u = 0; u <= uC + 0.01; u += uC / Math.max(1, Math.round(uC / 1.5))) s.q(u - 0.06, u + 0.06, EG, Hw, 0, 0.2, prof);
      if (mos) {
        s.q(uC, s.L, EG, Hw, 0, 0.2, blende);
        s.q(uC - 0.3, uC, EG, Hw, 0, 0.32, prof);
        mosaik(K, s, uC + 0.5, s.L - 0.5, EG + 0.5, Hw - 0.4, motiv, 0.2);
        s.q(uC, s.L, EG, EG + 0.3, 0, 0.5, heller(blende, 0.03));
      }
    }
    // Attikablende mit senkrechten Rippen
    for (let u = 0.6; u < s.L; u += 1.2) s.q(u - 0.06, u + 0.06, Hw, Hw + HB - 0.2, 0, 0.08, dunkler(blende, 0.07));
    s.q(0, s.L, Hw + HB - 0.2, Hw + HB, -0.05, 0.14, heller(blende, 0.04));
    s.q(0, s.L, Hw - 0.1, Hw + 0.05, 0, 0.3, prof);
    if (san) s.q(0, s.L, Hw + 0.05, Hw + 0.3, 0, 0.1, ROT);
    flecken(K, s, 0, uC, EG, Hw + HB, 0.2, blende, 6);
  }
  attika(K, x0, z0, w, d, Hw, HB, blende, 0.35);
  const yD = Hw + 0.15;
  setzeDach(K, x0 + 2, z0 + 2, x0 + w - 2, z0 + d - 2, yD);
  lichtkuppeln(K, x0 + 3, z0 + 3, x0 + w - 3, z0 + d - 3, yD, 7, 9);
  technik(K, x0 + 3, z0 + 3, x0 + w - 3, z0 + d - 3, yD, { max: 5 });
  for (const s of K.seiten) {
    const uC = K.nutz[s.seite];
    K.zonen[s.seite] = { u: uC * 0.5, y: Hw + HB * 0.5, t: 0.32, hb: HB * 0.66, max: uC * 0.66, grund: blende, wand: true };
  }
  return hoch + 5;
}

// ---------------------------------------------------------------- Familie 11: Magistrale 50er (Kaufhaus im Arkadengeschoss eines Wohnblocks)
function familie11(K) {
  const { S, v, x0, z0, w, d, n, Hw } = K;
  const san = K.saniert;
  const fliese = K.p(san ? ['#f3e9d2', '#f1e6cf', '#f4ecda', '#efe3c9'][v % 4] : ['#e6d9bd', '#e2d4b6', '#e8dcc4', '#ddcfb2'][v % 4]);
  const stein = K.p(['#d6c3a0', '#cfbb96', '#dac8a8'][v % 3]);
  const dunk = dunkler(stein, 0.1), hell = heller(stein, 0.05);
  const ornF = K.p(['#c39a55', '#b8864a', '#9fae86', '#c9a467'][v % 4]);
  const kreuz = san ? '#f4f3ef' : K.p('#6b4e36');
  const A = 3.4, turm = v % 2 === 0 && n >= 3;
  const rueck = 0.7;
  K.tRelief = 0.45;
  S.quader(x0, 0, z0, x0 + w - A - rueck - 0.1, EG, z0 + d - A - rueck - 0.1, dunkler(fliese, 0.15));
  S.quader(x0, EG, z0, x0 + w, Hw, z0 + d, fliese);
  // Arkadendecke (Unterseite) etwas dunkler
  S.quader(x0, EG - 0.05, z0, x0 + w, EG, z0 + d, dunkler(stein, 0.18));
  const FR = n >= 2 ? 3.3 : 1.7; // Fries über den Arkaden (Kaufhaus-Schriftzug)
  K.raster = 3.2; K.fensterBand = [1.6, 3.9];
  for (const s of K.seiten) {
    const raster = 5;
    erdgeschoss(K, s, { tF: -A, raster, pfeiler: stein, pb: 0.5, sockel: dunk, sturz: stein, glas: san ? '#557286' : GLAS, tuer: 'dreh' });
    const nb = Math.max(1, Math.round(s.L / raster)), bw = s.L / nb;
    for (let i = 0; i <= nb; i++) {
      const u = i === nb ? s.L - 0.6 : Math.max(0.6, i * bw);
      s.q(u - 0.55, u + 0.55, 0.3, EG, -0.95, 0.15, stein);
      s.q(u - 0.72, u + 0.72, 0.3, 1.0, -1.1, 0.3, dunk);
      s.q(u - 0.75, u + 0.75, EG - 0.55, EG - 0.05, -1.1, 0.3, hell);
      if (!K.zu && i < nb && san) s.q(u + bw / 2 - 0.4, u + bw / 2 + 0.4, EG - 0.12, EG - 0.05, -2.0, -1.4, LICHT);
    }
    // Fries mit Gesims
    s.q(0, s.L, EG, EG + FR, 0, 0.3, stein);
    s.q(0, s.L, EG + FR, EG + FR + 0.2, 0, 0.5, hell);
    // Sanierungsstand auch bei kleinen Häusern sichtbar: saniert mit hellen Kassetten im Fries und Pfeilerlampen,
    // Original mit Laufspuren unter dem Gesims, dunkleren Feldern und abgeplatzten Fliesen
    if (san) {
      const nk = Math.max(2, Math.round(s.L / 5)), kw = s.L / nk;
      for (let i = 0; i < nk; i++) s.q(i * kw + 0.5, (i + 1) * kw - 0.5, EG + 0.45, EG + FR - 0.45, 0.3, 0.36, heller(stein, 0.1));
      for (let i = 0; i <= nb; i++) { const u = i === nb ? s.L - 0.6 : Math.max(0.6, i * bw); s.q(u - 0.18, u + 0.18, 2.6, 3.1, 0.15, 0.32, '#f6ecc8'); }
    } else {
      const rr = rng(`f11alt:${K.haus?.id ?? ''}:${s.seite}`);
      for (let i = 0; i < Math.round(s.L / 3); i++) { const u = zw(rr, 0.5, s.L - 1.5), bh = zw(rr, 1.2, FR - 0.2); s.q(u, u + zw(rr, 0.25, 0.6), EG + FR - bh, EG + FR, 0.3, 0.33, dunkler(stein, zw(rr, 0.12, 0.22))); }
      for (let i = 0; i < Math.round(s.L / 6); i++) { const u = zw(rr, 0.5, s.L - 3), y = zw(rr, EG + 0.3, EG + FR - 1.4); s.q(u, u + zw(rr, 1.2, 2.6), y, y + zw(rr, 0.6, 1.1), 0.3, 0.32, dunkler(stein, 0.1)); }
    }
    if (n < 2) continue;
    // Obergeschosse: Fenster mit Faschen, Lisenen, Balkone
    const nw = Math.max(1, Math.round(s.L / 3.2)), aw = s.L / nw;
    const mitte = Math.floor(nw / 2);
    for (let k = 1; k < n; k++) {
      const y0 = EG + (k - 1) * GH;
      for (let i = 0; i < nw; i++) {
        const um = (i + 0.5) * aw;
        if (k === 1) { if (FR < 3) s.q(um - 0.75, um + 0.75, y0 + FR + 0.45, y0 + 3.9, 0, 0.05, GLAS); s.q(um - 0.95, um + 0.95, y0 + 3.9, y0 + 4.15, 0, 0.22, stein); continue; }
        s.q(um - 0.75, um + 0.75, y0 + 1.6, y0 + 3.9, 0, 0.05, GLAS);
        s.q(um - 0.05, um + 0.05, y0 + 1.6, y0 + 3.9, 0.05, 0.1, kreuz);
        s.q(um - 0.75, um + 0.75, y0 + 3.05, y0 + 3.13, 0.05, 0.1, kreuz);
        s.q(um - 0.95, um + 0.95, y0 + 3.9, y0 + 4.15, 0, 0.22, stein);
        s.q(um - 0.95, um + 0.95, y0 + 1.45, y0 + 1.6, 0, 0.26, stein);
        if (s.seite === '+z' && k >= 2 && k < n - 1 && Math.abs(i - mitte) <= 1 && nw >= 5) { // Balkone in der Mittelachse
          s.q(um - 1.25, um + 1.25, y0 + 1.25, y0 + 1.45, 0, 1.15, stein);
          s.q(um - 1.25, um + 1.25, y0 + 1.45, y0 + 2.45, 1.0, 1.15, hell);
          s.q(um - 1.25, um + 1.25, y0 + 1.8, y0 + 1.95, 1.15, 1.2, ornF);
        }
      }
    }
    for (let i = 0; i <= nw; i += 2) s.q(i * aw - 0.28, i * aw + 0.28, EG + FR + 0.2, Hw - 1.4, 0, 0.18, heller(fliese, 0.03));
    // Ornamentfries, Kranzgesims mit Konsolen, Balustrade
    s.q(0, s.L, Hw - 1.4, Hw - 0.6, 0, 0.2, ornF);
    for (let u = 0.6; u < s.L; u += 1.2) s.q(u - 0.25, u + 0.25, Hw - 1.25, Hw - 0.75, 0.2, 0.28, fliese);
    s.q(0, s.L, Hw - 0.6, Hw - 0.35, 0, 0.6, hell);
    for (let u = 0.45; u < s.L; u += 0.9) s.q(u - 0.16, u + 0.16, Hw - 0.35, Hw - 0.05, 0.3, 0.75, stein);
    s.q(0, s.L, Hw - 0.05, Hw + 0.3, 0, 0.95, hell);
    s.q(0, s.L, Hw + 0.3, Hw + 0.5, 0.1, 0.5, stein);
    for (let u = 0.4; u < s.L; u += 0.8) s.q(u - 0.1, u + 0.1, Hw + 0.5, Hw + 1.2, 0.2, 0.4, hell);
    s.q(0, s.L, Hw + 1.2, Hw + 1.4, 0.1, 0.5, stein);
    flecken(K, s, 0, s.L, EG + FR, Hw - 1.4, 0.2, fliese, 10);
  }
  if (n < 2) for (const s of K.seiten) s.q(0, s.L, Hw - 0.3, Hw + 0.2, 0, 0.6, hell);
  // Dach
  S.quader(x0, Hw, z0, x0 + w - 0.2, Hw + 0.15, z0 + d - 0.2, KIES);
  S.quader(x0, Hw, z0, x0 + w, Hw + 1.2, z0 + 0.3, stein); S.quader(x0, Hw, z0, x0 + 0.3, Hw + 1.2, z0 + d, stein);
  const tw = turm ? clamp(Math.min(w, d) * 0.28, 8, 12) : 0;
  setzeDach(K, x0 + 2, z0 + 2, x0 + w - 2 - tw, z0 + d - 2, Hw + 0.15);
  lichtkuppeln(K, x0 + 3, z0 + 3, x0 + w - 3 - tw, z0 + d - 3, Hw + 0.15, 7, 9);
  technik(K, x0 + 3, z0 + 3, x0 + w - 3 - tw * 1.2, z0 + d - 3 - tw * 0.8, Hw + 0.15, { max: 3, antenne: false });
  let hoch = Hw + 1.4;
  if (turm) { // Eckaufsatz: zwei Stufen, Laterne mit Säulen
    const tx0 = x0 + w - tw, tz0 = z0 + d - tw, h1 = GH * 1.4;
    S.quader(tx0, Hw, tz0, x0 + w, Hw + h1, z0 + d, fliese);
    for (const s of seitenVon(S, tx0, tz0, tw, tw)) {
      const nf = 3, fw = tw / nf;
      for (let i = 0; i < nf; i++) { const um = (i + 0.5) * fw; s.q(um - 0.6, um + 0.6, Hw + 1.4, Hw + h1 - 1.2, 0, 0.05, GLAS); s.q(um - 0.05, um + 0.05, Hw + 1.4, Hw + h1 - 1.2, 0.05, 0.1, kreuz); s.q(um - 0.8, um + 0.8, Hw + h1 - 1.2, Hw + h1 - 0.95, 0, 0.2, stein); }
      for (let i = 0; i <= nf; i++) s.q(i * fw - 0.3, i * fw + 0.3, Hw + 0.3, Hw + h1 - 0.6, 0, 0.3, hell);
      s.q(0, tw, Hw + h1 - 0.6, Hw + h1 - 0.2, 0, 0.3, ornF);
    }
    S.quader(tx0 - 0.4, Hw + h1 - 0.2, tz0 - 0.4, x0 + w + 0.5, Hw + h1 + 0.25, z0 + d + 0.5, hell);
    const lw = tw * 0.55, lx = x0 + w - tw / 2, lz = z0 + d - tw / 2, yl = Hw + h1 + 0.25;
    S.box(lw, 0.4, lw, lx, yl + 0.2, lz, stein);
    for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, 1], [1, 0]]) zyl(S, lx + dx * lw * 0.42, yl + 0.4, lz + dz * lw * 0.42, 0.22, 3.2, hell, 8);
    S.box(lw * 0.7, 3.2, lw * 0.7, lx, yl + 2.0, lz, dunkler(fliese, 0.05));
    S.box(lw + 0.4, 0.4, lw + 0.4, lx, yl + 3.8, lz, hell);
    const g = new THREE.ConeGeometry(lw * 0.45, 2.2, 4); g.rotateY(Math.PI / 4); g.translate(lx, yl + 5.1, lz); S.add(g, K.p('#6f9a7d'));
    zyl(S, lx, yl + 6.2, lz, 0.07, 4, '#d9dcde', 6);
    S.box(0.04, 1.0, 1.6, lx, yl + 9.6, lz + 0.85, K.zu ? '#cfcac0' : ROT);
    hoch = yl + 10.5;
  }
  // Friesschrift mit Abstand zur Ecke (Eckaufsatz und Eckpfeiler verdecken sonst den letzten Buchstaben)
  for (const s of K.seiten) { const uE = s.L - (turm ? tw : 2); K.zonen[s.seite] = { u: uE * 0.5, y: EG + FR * 0.5, t: 0.6, hb: Math.min(FR * 0.82, 2.7), max: uE * 0.72, grund: stein, wand: true }; }
  if (n >= 2) { // Leuchtschrift auf dem Dach der Seitenfront (+x), wie bei Magistralen-Kaufhäusern
    const s = K.seiten[1], L = s.L - tw - 1;
    const hb = Math.min(clamp(L * 0.08, 2.0, 3.6), (L * 0.7) / schriftBreite('HARTWIG', 1)), br = schriftBreite('HARTWIG', hb);
    const t = -1.6, yB = Hw + 1.6;
    schriftGeruest(K, s, L * 0.5, br, Hw + 0.15, yB, hb, t);
    K.zonen['+x'] = { u: L * 0.5, y: yB + 0.1 + hb * 0.78, t: t + 0.05, hb, max: L * 0.7, grund: stein, dach: true };
  }
  if (n >= 3) haengefahnen(K, K.seiten[1], [K.seiten[1].L * 0.2, K.seiten[1].L * 0.5], EG + GH * 1.9, 0.6);
  return hoch + 3;
}

// ---------------------------------------------------------------- Hauptfunktion
/**
 * Baut ein Haus aus haeuser.json.
 * opt: { x = 0, z = 0, familie?: 1 bis 11, saniert?: bool (nur Ost-Familien 8 bis 11),
 *        status?: 'offen'|'aktion'|'untermiete'|'offprice'|'teilschliessung'|'umbau'|'raeumung'|'geschlossen'|'leer'|'verfall'|'neueroeffnung'|'abriss',
 *        zusatz?: [Status…], aktion?: 'sale'|'jubilaeum'|'weihnachten'|'blackfriday',
 *        untermieter?: [Name | { name, typ, etage }], hartwig?: false (Ex-Warenhaus, Logo ab), offpriceEtage?, jahr?, pylon?,
 *        passanten?: false (keine Menschen), abrissSeite?: '+x' | '+z' | 'ecke' (Standard nach Seed) }
 * Rückgabe: { hoehe, w, d (belegte Grundfläche ab x, z), familie, teile, status }
 */
/**
 * GESTALTUNG.md: Hartwig ist das prägnanteste Haus der Einkaufslage. Vor den sichtbaren Fronten (+z, +x) ein heller
 * Vorplatzstreifen mit Pflasterfugen, Bänken und Pflanzkübeln, an der Ecke drei Fahnenmasten mit Hartwig-Fahnen und eine rote
 * Abdeckung der Attika. Nur solange das Haus betrieben wird (nicht geschlossen, leer, verfallen oder im Abriss); opt.vorplatz
 * = false schaltet ab.
 */
const VORPLATZ_STATUS = new Set(['offen', 'aktion', 'untermiete', 'offprice', 'teilschliessung', 'umbau', 'raeumung', 'neueroeffnung']);
function hartwigVorplatz(S, k, Z, r) {
  if (!VORPLATZ_STATUS.has(Z.status)) return;
  // Attikarand auf der Traufe des Hauptbaus: bei Staffelgeschoss liegt k.hoehe ein Geschoss höher als der Umriss x..x+w
  const { x, z, w, d } = k, H = k.traufe ?? k.hoehe, T = 3.2, y = 0.34;
  // Vorplatz: helles Pflaster mit Fugen vor beiden Fronten
  S.quader(x - 0.2, 0.3, z + d, x + w + T, y, z + d + T, '#efe9dc');
  S.quader(x + w, 0.3, z - 0.2, x + w + T, y, z + d, '#efe9dc');
  for (let u = x + 2; u < x + w + T - 0.5; u += 2) S.quader(u, y, z + d + 0.1, u + 0.06, y + 0.01, z + d + T - 0.1, '#ddd5c4');
  for (let u = z + 2; u < z + d - 0.5; u += 2) S.quader(x + w + 0.1, y, u, x + w + T - 0.1, y + 0.01, u + 0.06, '#ddd5c4');
  // Hartwig-Rot: breite Attika-Abdeckung und durchgehendes Band über dem Erdgeschoss an beiden sichtbaren Fronten
  S.quader(x - 0.2, H, z + d - 0.6, x + w + 0.2, H + 0.6, z + d + 0.2, ROT);
  S.quader(x + w - 0.6, H, z - 0.2, x + w + 0.2, H + 0.6, z + d + 0.2, ROT);
  const eg = k.egHoehe ?? 5;
  S.quader(x - 0.1, eg - 0.1, z + d, x + w + 0.1, eg + 0.45, z + d + 0.35, ROT);
  S.quader(x + w, eg - 0.1, z - 0.1, x + w + 0.35, eg + 0.45, z + d + 0.1, ROT);
  // Fahnenmasten an der Ecke
  const fl = k.fahnen ?? { seite: '+z', us: [w - 8.2, w - 5.6, w - 3] };
  fl.us.forEach((u, i) => {
    const f1 = i === 1 ? '#f4f2ec' : ROT, f2 = i === 1 ? ROT : '#f4f2ec';
    if (fl.seite === '+z') {
      const fx = x + u, fz = z + d + T - 0.6;
      S.quader(fx - 0.09, y, fz - 0.09, fx + 0.09, y + 10.5, fz + 0.09, '#e3e5e6');
      S.quader(fx + 0.1, y + 7.2, fz - 0.03, fx + 1.5, y + 10.2, fz + 0.03, f1);
      S.quader(fx + 0.1, y + 8.4, fz - 0.035, fx + 1.5, y + 9.0, fz + 0.035, f2);
    } else {
      const fz = z + u, fx = x + w + T - 0.6;
      S.quader(fx - 0.09, y, fz - 0.09, fx + 0.09, y + 10.5, fz + 0.09, '#e3e5e6');
      S.quader(fx - 0.03, y + 7.2, fz + 0.1, fx + 0.03, y + 10.2, fz + 1.5, f1);
      S.quader(fx - 0.035, y + 8.4, fz + 0.1, fx + 0.035, y + 9.0, fz + 1.5, f2);
    }
  });
  // Bänke und Pflanzkübel entlang der Fronten (Eingänge bleiben frei: nur in den Randdritteln)
  const bank = (bx, bz, quer) => { if (quer) { S.quader(bx - 0.25, y, bz - 0.9, bx + 0.25, y + 0.45, bz + 0.9, '#8a6a4a'); S.quader(bx + 0.15, y + 0.45, bz - 0.9, bx + 0.25, y + 0.9, bz + 0.9, '#8a6a4a'); } else { S.quader(bx - 0.9, y, bz - 0.25, bx + 0.9, y + 0.45, bz + 0.25, '#8a6a4a'); S.quader(bx - 0.9, y + 0.45, bz - 0.25, bx + 0.9, y + 0.9, bz - 0.15, '#8a6a4a'); } };
  const kuebel = (kx, kz) => { S.quader(kx - 0.55, y, kz - 0.55, kx + 0.55, y + 0.7, kz + 0.55, '#6b7177'); S.quader(kx - 0.45, y + 0.7, kz - 0.45, kx + 0.45, y + 1.15, kz + 0.45, waehle(r, ['#d96a8a', ROT, '#7cb369'])); };
  for (const f of [0.12, 0.28]) { bank(x + w * f, z + d + T - 1.0, false); kuebel(x + w * f + 2.2, z + d + T - 1.0); }
  for (const f of [0.15, 0.32]) { bank(x + w + T - 1.0, z + d * f, true); kuebel(x + w + T - 1.0, z + d * f + 2.2); }
}

/** Historischen Hartwig-Baukörper behalten, nur Ladenzone und Markenauftritt auf Nachnutzer umstellen. */
export function nachnutzung(S, scene, haus, wettbewerber, opt = {}) {
  const start = S.anzahl;
  const basis = warenhaus(S, scene, haus, { ...opt, status: 'offen', hartwig: false, vorplatz: false, passanten: false });
  const farbe = WETTBEWERBER_FARBEN[wettbewerber.art] ?? '#526477';
  const m = masse(haus), breite = basis.w, tiefe = basis.d;
  const x = opt.x ?? 0, z = opt.z ?? 0;
  for (const seite of seitenFremd(S, x, z, breite, tiefe)) {
    // Neues Glas und Fremdmarkenband; Hartwig-Schrift und das rote Band sind nicht mehr sichtbar.
    seite.q(0.5, seite.L - 0.5, 0.6, 4.1, 0.4, 0.5, '#779bab');
    seite.q(0.4, seite.L - 0.4, 4.1, 5.2, 0.45, 0.8, farbe);
    const ph = passendFremd(wettbewerber.name, seite.L * 0.77, 1.25);
    plakatFremd(scene, seite, wettbewerber.name, seite.L / 2, 4.65, 0.94, ph, '#ffffff');
    if (m.n > 2) for (let i = 0; i < 3; i++) {
      const a = 1 + i * (seite.L - 2) / 3;
      seite.q(a, a + (seite.L - 3) / 3, 5.7, Math.min(m.H - 0.6, 9), 0.25, 0.33, '#78848a');
    }
  }
  return { ...basis, teile: S.anzahl - start, nachnutzung: wettbewerber.id };
}

export function warenhaus(S, scene, haus, opt = {}) {
  const start = S.anzahl;
  const marke = merke(S, scene);
  const fam = opt.familie ?? familieVon(haus);
  const m = masse(haus);
  const x = opt.x ?? 0, z = opt.z ?? 0;
  const flaechen = haus.flaechen ?? [];
  const sumQm = flaechen.reduce((a, f) => a + (f.qm || 0), 0);
  const leerQm = flaechen.filter((f) => f.konzept === 'leer').reduce((a, f) => a + (f.qm || 0), 0);
  let status = opt.status ?? haus.status ?? 'offen';
  if (!opt.status && sumQm > 0 && leerQm / sumQm > 0.9) status = 'leer';
  // Untermieter aus den Engine-Daten, falls keine übergeben
  const namen = ['Preisfuchs Markt', 'FitWerk 24', 'MVZ Stadtmitte', 'Bücherinsel', 'Kita Sonnenschein', 'Lagerraum 24', 'Drogerie Nachbar', 'WorkLoft'];
  const rM = rng(`${haus.id}/mieter`);
  const ausDaten = flaechen.filter((f) => f.konzept === 'untermiete').map((f) => mieterInfo({ name: namen[Math.floor(rM() * namen.length)], etage: f.etage }));
  const Z = zustandNormal({ ...opt, status, seed: haus.id }, { untermieter: ausDaten });
  const F = zustandFlags(Z);
  // Center-Häuser: Mall-Flügel links (Richtung −x), Kopfbau rechts
  const M = fam === 6 ? Math.max(40, Math.round((m.w * 0.85) / 5) * 5) : (fam === 7 && haus.lage === 'center' ? Math.max(25, Math.round((m.w * 0.5) / 5) * 5) : 0);
  const K = {
    // Familie 5 hat zwölf, Familie 6 sechzehn Varianten (Maßstab: dichte Ruhr- und Rheinschiene ohne Kopien unter 50 km), sonst acht
    S, scene, haus, fam, v: ((haus.fassade ?? 0) % VARIANTEN(fam) + VARIANTEN(fam)) % VARIANTEN(fam), r: rng(`${haus.id}:${haus.fassade}:${fam}`),
    n: m.n, H: m.H, Hw: m.H + (m.n === 1 ? (fam === 7 ? 4.0 : 2.4) : 0), w: m.w, d: m.d, x0: x + M, z0: z, xm: x, M,
    alt: (haus.substanz ?? 100) < 40 || F.alt, verblichen: F.verblichen, status: F.eg, zu: F.zu, ohneLogo: F.ohneLogo,
    zonen: {}, nutz: {}, eingaenge: [], fensterEG: [], abbauPos: {}, abbau: Z.status === 'geschlossen' && !Z.ohneMarke,
    dachGastro: Z.untermieter.some((u) => u.typ === 'gastro' && (u.etage >= m.n || u.etage > 3)),
  };
  K.c = (c) => (K.verblichen ? verblasst(c) : K.alt ? patinaFarbe(c) : c);
  // Ost-Familien: Sanierungsstand (Original leicht patiniert vs. 90er-Modernisierung)
  K.saniert = opt.saniert ?? haus.saniert ?? ((haus.baujahr ?? 0) >= 1990 || (haus.substanz ?? 100) >= 65);
  K.p = (c) => K.c(K.saniert ? c : '#' + new THREE.Color(c).offsetHSL(0, -0.04, -0.035).getHexString());
  K.seiten = seitenVon(S, K.x0, K.z0, K.w, K.d);
  const egG = flaechen.filter((f) => f.etage === 0 && f.konzept !== 'leer').sort((a, b) => b.qm - a.qm).map((f) => f.gruppe);
  K.gruppenEG = egG.length ? egG : (fam === 7 ? ['sporttextil', 'sportschuhe', 'rad', 'outdoor'] : ['damen', 'beauty', 'accessoires', 'herren']);
  // EG-Mieter (eigene Läden mit Eingang); Nutzlänge grob vorab (Eckbauten kürzen die Fassade)
  const eck = { 1: clamp(Math.min(K.w, K.d) * 0.24, 7, 12), 2: clamp(Math.min(K.w, K.d) * 0.22, 5, 11), 5: clamp(Math.min(K.w, K.d) * 0.32, 8, 18), 6: clamp(Math.min(K.w, K.d) * 0.18, 5, 9) }[fam] ?? 0;
  const eck8 = fam === 8 && K.v % 2 === 0 ? clamp(Math.min(K.w, K.d) * 0.2, 5, 10) : 0;
  K.mieterEG = eigeneMieterflaechen(Z, { '+z': K.w - eck - eck8, '+x': K.d - eck - eck8 });
  const bauer = { 1: familie1, 2: familie2, 3: familie3, 4: familie4, 5: familie5, 6: familie6, 7: familie7, 8: familie8, 9: familie9, 10: familie10, 11: familie11 }[fam];
  let hoehe = bauer(K);
  // Laute Zustände brauchen Fassadenfläche: große Mittellogos rücken nach oben und werden kleiner (Banner und Mieter darunter)
  const laut = ['aktion', 'raeumung', 'neueroeffnung', 'teilschliessung', 'untermiete', 'offprice', 'geschlossen', 'umbau'].some((q) => Z.hat(q)) || Z.untermieter.some((u) => u.etage > 0);
  if (laut && K.n >= 3) for (const s of K.seiten) {
    const z = K.zonen[s.seite];
    if (!z || z.dach || z.sport || z.wand) continue; // Schrift in einem Band (Fries, Blende) bleibt in ihrem Band
    const hb = Math.min(z.hb, Math.max(2.2, (K.Hw - EG) * 0.2));
    const y = Math.max(z.y, K.Hw - 0.7 - hb * 0.95);
    if (y + hb * 0.95 <= K.Hw + 0.3) Object.assign(z, { hb, y });
  }
  logos(K);
  // Fahnenmasten des Vorplatzes: vor einem schriftfreien Stück, bevorzugt am hinteren Ende der +x-Front (dort stehen keine
  // Werbebanner und keine Schrift), sonst links oder rechts an der +z-Front.
  // Die Fahnen verdecken die Fassade dahinter etwa 2 bis 5 m höher und 3 m weiter links (zur Bildmitte): dort keine Schrift und keine Banner.
  K.fahnen = (() => {
    const frei = (seite, a, b) => { const z = K.zonen[seite]; if (K.werbung && K.werbung.seite === seite && b > K.werbung.u0 - 1 && a < K.werbung.u1 + 1) return false; if (!z || K.ohneLogo) return true; const br = schriftBreite(z.text ?? 'HARTWIG', z.hbIst ?? z.hb) / 2 + (z.sport ? 2 * (z.hbIst ?? 1) : 0) + 1; return b < z.u - br || a > z.u + br || z.dach; };
    const L = { '+z': K.w, '+x': K.d };
    for (const [seite, a] of [['+x', 1.2], ['+z', 1.2], ['+z', L['+z'] - 9.6], ['+x', L['+x'] - 9.6]]) if (a > 0.5 && frei(seite, a - 4, a + 8)) return { seite, us: [a + 0.6, a + 3.2, a + 5.8] };
    return { seite: '+z', us: [1.8, 4.4, 7.0] };
  })();
  const koerper = {
    x: K.x0, z: K.z0, w: K.w, d: K.d, hoehe: K.Hw, traufe: K.traufe ?? K.Hw, egHoehe: EG, geschossHoehe: GH, n: K.n, tRelief: K.tRelief, tBanner: K.tBanner,
    raster: K.raster, fensterBand: K.fensterBand,
    vorspruenge: K.vorspruenge,
    seiten: Object.fromEntries(K.seiten.map((s) => [s.seite, { u1: K.nutz[s.seite] ?? s.L, abbau: K.abbauPos[s.seite], sperren: K.fahnen.seite === s.seite ? [{ u0: K.fahnen.us[0] - 4.5, u1: K.fahnen.us[2] + 2.0, y0: 6.5, y1: 14.5, art: 'fahne' }] : [], logo: K.abbau && K.abbauPos[s.seite]?.rest ? { ...K.zonen[s.seite], ...K.abbauPos[s.seite].rest } : K.zonen[s.seite] && !K.ohneLogo ? { ...K.zonen[s.seite], hb: K.zonen[s.seite].hbIst ?? K.zonen[s.seite].hb, breite: schriftBreite(K.zonen[s.seite].text ?? 'HARTWIG', K.zonen[s.seite].hbIst ?? K.zonen[s.seite].hb) + (K.zonen[s.seite].sport ? 2 * (K.zonen[s.seite].hbIst ?? 1) : 0) } : null }])),
    eingaenge: K.eingaenge, fensterEG: K.fensterEG, mieterEG: K.mieterEG.filter((mi) => mi.ua != null), fahnen: K.fahnen,
    dach: K.dach, terrasse: K.terrasse, farbe: K.zonen['+z']?.grund, baujahr: haus.baujahr, jahr: opt.jahr, flaecheQm: sumQm || (haus.grundflaecheQm ?? 0) * m.n,
    marke, seed: `${haus.id}:${Z.status}`,
  };
  const dek = zustandsDekor(S, scene, koerper, Z, { pylon: opt.pylon, passanten: opt.passanten, abrissSeite: opt.abrissSeite });
  hoehe = Math.max(hoehe, dek.hoehe);
  if (opt.vorplatz !== false) hartwigVorplatz(S, koerper, Z, rng(`${haus.id}/vorplatz`));
  return { hoehe, w: K.w + M, d: K.d, familie: fam, teile: S.anzahl - start, status: Z.status, pinAnker: dek.pinAnker };
}
