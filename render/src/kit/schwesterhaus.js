// Volkskauf: vergessene Schwester von Hartwig. Keine Engine-Abhaengigkeit.
// Nachkriegs-Fassaden 1955–1979; deterministisch nach ID; Akzent nur Petrol.
// API wie sporthaus(S, scene, haus, opt).
import { THREE, rng, waehle, heller, dunkler, schild, LOD } from './basis.js';
import { puppe, mensch } from './sporthelfer.js';
import { Seite, zustandNormal, zustandFlags, zustandsDekor, eigeneMieterflaechen, merke, ladenInhalt } from './zustaende.js';

export const NAME_SCHWESTER = 'Volkskauf';
export const FARBE_SCHWESTER = '#2f6f73';
export const FAMILIEN_SCHWESTER = { 1: 'Klinkerkasten der 60er', 2: 'Sichtbeton-Raster der 70er', 3: 'Waschbeton mit Fensterband' };
const EG = 4.9, GH = 3.65, GLAS = '#647078', BLIND = '#42494e';
const PALETTEN = [
  ['#d5c3a9', '#c7b396', '#bca58b', '#ded0bb'],
  ['#b7b6b0', '#c2c1b9', '#a9ada9', '#c8c7c1'],
  ['#d0cfc7', '#bbbcb6', '#c6c6bd', '#d9d6cb'],
];
const index = (haus) => Math.max(0, (parseInt(String(haus.id ?? 'K001').replace(/\D/g, ''), 10) || 1) - 1);
export function familieSchwester(haus) { return haus.familie ?? (index(haus) % 3) + 1; }
/** Nachvollziehbare, deterministische Formsignatur – auch in der 24-Häuser-Prüfung verwendet. */
export function architekturSchwester(haus, familie = familieSchwester(haus)) {
  const i = index(haus), v = (haus.fassade ?? Math.floor(i / 3)) % 8;
  const n = Math.max(4, Math.min(5, (haus.etagen ?? [0, 1, 2, 3]).filter((e) => e >= 0).length));
  return { familie, n, variante: v, achsenBreite: +(3.15 + familie * 0.13 + (i % 8) * 0.23).toFixed(2),
    ecke: ['scharf', 'gefast', 'gerundet'][(i + Math.floor(i / 4)) % 3],
    treppe: (i * 5 + v) % 4, sockel: (i + familie) % 4,
    dachLayout: (i + Math.floor(i / 3) * 2) % 11 };
}
export function masseSchwester(haus) {
  const r = rng(String(haus.id) + '/masse');
  const A = Math.min(2600, Math.max(650, haus.grundflaecheQm ?? 1400));
  const seitenfaktor = 1.25 + r() * 0.3;
  const w = Math.max(30, Math.round(Math.sqrt(A * seitenfaktor) / 5) * 5);
  const d = Math.max(20, Math.round(A / w / 5) * 5);
  const n = Math.max(4, Math.min(5, (haus.etagen ?? [0, 1, 2, 3]).filter((e) => e >= 0).length));
  return { w, d, n, H: EG + (n - 1) * GH, familie: familieSchwester(haus) };
}

/** Unterschiedlich schmal gerahmte Fenster; blinde Felder sichtbar, aber ohne Texturen. */
function fenster(S, s, a, b, y0, y1, f, rahmen, blind) {
  s.q(a - 0.10, b + 0.10, y0 - 0.10, y1 + 0.10, 0.13, 0.29, rahmen);
  s.q(a, b, y0, y1, 0.3, 0.38, blind ? BLIND : f);
  if (!blind && b - a > 1.5 && LOD.stufe !== 'fern') {
    s.q((a + b) / 2 - 0.065, (a + b) / 2 + 0.065, y0, y1, 0.39, 0.45, rahmen);
  }
}

/** Alle Elemente nur an den beiden zum Betrachter zeigenden Fassaden. */
function fassade(S, s, K) {
  const { fam, n, H, alt, r, arch } = K;
  const L = s.L;
  const v = K.variante;
  const achsen = Math.max(4, Math.floor((L - 2.8) / arch.achsenBreite));
  const ab = (L - 2) / achsen;
  if (fam === 1) { // Klinker: regelmaessige vertikale Fensterraster, flaches Gesims.
    for (let k = 0; k < n - 1; k++) {
      const y = EG + k * GH + 0.75;
      for (let j = 0; j < achsen; j++) {
        const u = 1 + (j + 0.5) * ab;
        fenster(S, s, u - 0.74, u + 0.74, y, y + 1.75, j % 11 === v ? '#667079' : GLAS, K.rahmen, alt && (j + 3 * k + v) % 6 === 0);
        if (LOD.stufe !== 'fern') s.q(u - 1.02, u + 1.02, y - 0.18, y - 0.08, 0.25, 0.53, K.gesims);
      }
    }
    s.q(0, L, EG + 0.1, EG + 0.34, 0.16, 0.48, K.gesims);
  } else if (fam === 2) { // Sichtbeton: massive Rahmen, kraeftige Attika, eigene Bruestungsfelder.
    for (let k = 0; k < n - 1; k++) {
      const y = EG + k * GH + 0.85;
      s.q(0.4, L - 0.4, y - 0.25, y + 0.2, 0.15, 0.53, K.gesims);
      for (let j = 0; j < achsen; j++) {
        const ua = 1 + j * ab, ub = ua + ab - 0.18;
        s.q(ua, ua + 0.42, y, y + GH - 0.28, 0.19, 0.56, K.gesims);
        s.q(ub - 0.42, ub, y, y + GH - 0.28, 0.19, 0.56, K.gesims);
        fenster(S, s, ua + 0.59, ub - 0.58, y + 0.58, y + 2.25, GLAS, K.rahmen, alt && (k * 5 + j + v) % 7 === 0);
        s.q(ua + 0.56, ub - 0.5, y + 0.17, y + 0.53, 0.26, 0.52, (j + k) % 2 ? K.gesims : K.fleck);
      }
    }
  } else { // Waschbeton: lange horizontale Fensterbaender, darunter geschlossene Platten.
    for (let k = 0; k < n - 1; k++) {
      const y = EG + k * GH;
      s.q(0.65, L - 0.65, y + 0.65, y + 2.5, 0.15, 0.4, K.rahmen);
      for (let j = 0; j < achsen; j++) {
        const ua = 0.85 + j * ((L - 1.7) / achsen), ub = 0.85 + (j + 1) * ((L - 1.7) / achsen) - 0.1;
        s.q(ua, ub, y + 0.82, y + 2.33, 0.41, 0.5, alt && (j + k * 2 + v) % 7 === 0 ? BLIND : GLAS);
        s.q(ub - 0.10, ub, y + 0.72, y + 2.42, 0.5, 0.61, K.gesims);
        s.q(ua, ub + 0.1, y + 2.52, y + 2.7, 0.22, 0.53, K.fleck);
      }
      s.q(0.4, L - 0.4, y + 0.12, y + 0.66, 0.19, 0.43, (k + v) % 2 ? K.gesims : K.fleck);
    }
  }
  // Fleckige Attika und Gesimse werden ausschliesslich durch farblich versetzte Geometrie erzeugt.
  const attikaH = fam === 2 ? 1.6 : fam === 1 ? 0.8 : 1.0;
  s.q(0, L, H - 0.12, H + attikaH, 0.16, 0.75, K.gesims);
  const versatz = L / 6;
  for (let j = 0; j < 6; j++) {
    if ((j + v) % 3 !== 2) s.q(j * versatz, (j + 1) * versatz - 0.05, H + attikaH - 0.32, H + attikaH - 0.07, 0.75, 0.82, K.fleck);
  }
  // Geometrische Altersspuren: verwitterte Stürze, Regenrinnen und punktuelle Putzreparaturen.
  // Nicht flächig verschmutzen: Volkskauf ist schwach, aber weiterhin in Betrieb.
  if (alt && LOD.stufe !== 'fern') {
    const felder = Math.max(2, Math.floor(L / 12));
    const pflege = fam === 1 ? '#a99681' : fam === 2 ? '#969994' : '#adafa6';
    for (let j = 0; j < felder; j++) {
      const u = 1.1 + (j + 0.35) * (L - 2.2) / felder;
      const oben = H - 1.0 - (j % 3) * 0.6;
      s.q(u, u + (j % 2 ? 0.28 : 0.48), EG + 0.3, oben, 0.10, 0.16, pflege);
      if ((j + v) % 2 === 0) {
        s.q(Math.max(0.4, u - 0.6), Math.min(L - 0.4, u + 2.0), H - 0.24,
          H + 0.11, 0.78, 0.91, K.fleck);
      }
    }
    if (L > 28) for (let q = 0; q < 2; q++) {
      const u = L * (q ? 0.82 : 0.18);
      s.q(u, u + 2.8, EG + (q ? 1.1 : 0.2), EG + (q ? 3.1 : 1.8), 0.08, 0.12, K.fleck);
    }
  }
  // Jedes Haus erhaelt eine individuelle Treppenhausachse mit anderen Fenstern und Sockel.
  const tu = 2.5 + (arch.treppe / 3) * Math.max(0, L - 7);
  if (s.seite === (arch.treppe % 2 === 0 ? '+z' : '+x')) {
    s.q(tu - 0.8, tu + 0.8, EG + 0.55, H - 0.55, 0.58, 0.77, K.gesims);
    for (let e = 0; e < n - 1; e++) {
      const y = EG + e * GH + 1.12;
      s.q(tu - 0.49, tu + 0.49, y, y + 1.48, 0.78, 0.88, '#8ca3a7');
      s.q(tu - 0.04, tu + 0.04, y, y + 1.48, 0.88, 0.94, K.rahmen);
    }
  }

  // Auf beiden sichtbaren Seiten eine echte, helle Warenhaus-Ladenzone mit Ware hinter der Glasfront.
  const sockel = ['#7e796f', '#8a8e87', '#a89f8e', '#687a7b'][arch.sockel];
  const eintritt = [Math.floor(achsen / 2) - 1, Math.floor(achsen / 2)];
  const buchten = [];
  const lochH = 3.92;
  s.q(0, L, 0.10, 0.49, 0.30, 0.89, sockel);
  for (let i = 0; i <= achsen; i++) {
    const u = 0.85 + i * ((L - 1.7) / achsen);
    s.q(u - 0.28, u + 0.28, 0.45, 4.06, 0.24, 0.89, K.gesims);
  }
  for (let i = 0; i < achsen; i++) {
    const a = 0.85 + i * ((L - 1.7) / achsen) + 0.29;
    const b = 0.85 + (i + 1) * ((L - 1.7) / achsen) - 0.29;
    const m = (a + b) / 2;
    const eingang = s.seite === '+z' && eintritt.includes(i);
    const innenHell = '#e1d9c6', rahmen = '#a4aba8';
    // Zurueckliegende Ladenrueckwand, Leuchtstreifen und Schaufensterbuehne.
    s.q(a, b, 0.52, lochH, 0.26, 0.34, eingang ? '#87a8a9' : innenHell);
    s.q(a, b, lochH - 0.23, lochH - 0.10, 0.36, 0.69, '#f4f0db');
    s.q(a, b, 0.48, 0.60, 0.34, 0.95, rahmen);
    s.q(a, b, lochH - 0.04, 4.12, 0.34, 0.96, K.gesims);
    if (eingang) {
      // Eine zusammenhaengende Eingangsachse aus zwei schmalen Tueren.
      s.q(a, b, 0.25, 3.62, 0.34, 0.53, '#698b91');
      s.q(m - 0.055, m + 0.055, 0.28, 3.61, 0.53, 0.67, '#ced8d5');
      for (const u of [a + 0.14, b - 0.14]) s.q(u - 0.055, u + 0.055, 0.28, 3.62, 0.52, 0.72, FARBE_SCHWESTER);
      s.q(a, b, 3.53, 3.68, 0.50, 0.68, '#bbc5c1');
      s.q(m - 0.43, m - 0.37, 1.26, 1.8, 0.68, 0.75, '#d8e1dc');
      s.q(m + 0.37, m + 0.43, 1.26, 1.8, 0.68, 0.75, '#d8e1dc');
      s.q(a - 0.14, b + 0.14, 3.78, 4.08, 0.76, 2.20, K.gesims);
      s.q(a + 0.08, b - 0.08, 0.26, 0.29, 0.86, 2.75, '#5b5c56');
      K.eingaenge.push({ seite: s.seite, u: m, breite: b - a, t: 0.61, haupt: i === eintritt[1] });
      if (i === eintritt[1] && LOD.stufe !== 'fern') {
        const u = Math.min(L - 2, m + (b - a) / 2 + 0.8);
        s.q(u - 0.48, u + 0.48, 0.2, 1.36, 1.35, 1.45, FARBE_SCHWESTER);
        s.q(u - 0.43, u + 0.43, 0.84, 1.18, 1.45, 1.50, '#e4e5db');
        s.q(u - 0.04, u + 0.04, 0.28, 0.84, 1.41, 1.53, '#c0c0b7');
      }
    } else {
      s.q(a, b, 0.63, 3.8, 0.34, 0.40, '#c9e2e3');
      ladenInhalt(s, a + 0.12, b - 0.12, 0.74, 0.45, 0.91,
        (i + v) % 3 === 0 ? 'drogerie' : 'laden', r);
      if ((i + v) % 2 === 0) {
        puppe(s, m - 0.45, 0.93, 0.96, '#a65a5d', '#323d51', 1.06);
        if (b - a > 3.1) puppe(s, m + 0.56, 0.93, 0.96, '#536f8f', '#d3b7a0', 0.95);
      }
      // Nur feine Glaskanten vor der Auslage, um die Ware sichtbar zu lassen.
      for (const u of [a + 0.08, b - 0.08]) s.q(u - 0.055, u + 0.055, 0.56, 3.85, 0.96, 1.02, rahmen);
      s.q(a, b, 2.36, 2.44, 0.96, 1.02, '#c8d3d0');
      s.q(a, b, 3.83, 3.90, 0.95, 1.03, '#f4ecd9');
      K.fensterEG.push({ seite: s.seite, a, b, y0: 0.55, y1: 3.84, t: 1.03 });
    }
    buchten.push({ a, b, m, eingang, i });
  }

  if (s.seite === '+z') {
    // Gemeinschaftliches flaches Eingangsdach über den beiden schmalen Tueren.
    const bm = L / 2, bw = Math.min(4.4, L / achsen * 1.1);
    s.q(bm - bw, bm + bw, 3.76, 4.12, 0.82, 2.40, K.gesims);
    s.q(bm - bw + 0.3, bm + bw - 0.3, 3.79, 3.96, 2.36, 2.49, FARBE_SCHWESTER);
    const [eingangX] = s.welt(bm, 0);
    if (!K.zu) schild(K.scene, 'EINGANG', '+z', eingangX, 3.87, s.ebene + 2.53, 0.94, '#f0eee4');
  }
  // Hauptschriftzug: Textur enthält transparenten Rand; eine 2,0–2,45-m-Fläche
  // ergibt eine tatsächliche sichtbare Glyphenhöhe von etwa 1,2–1,6 m.
  // Die horizontale Dachkante trennt das EG von den Obergeschossen.
  s.q(0, L, 4.06, 5.49, 0.43, 0.77, K.zu ? '#596b6b' : FARBE_SCHWESTER);
  s.q(0, L, 5.48, 5.70, 0.40, 1.36, K.gesims);
  s.q(0, L, 5.69, 5.77, 0.42, 1.46, K.rahmen);
  const ySchrift = 4.75, hSchrift = L < 33 ? 2.02 : L < 47 ? 2.24 : 2.45;

  // Ausgeblichene Markisen auf beiden Seiten; defekte Exemplare bei niedrigem Substanzwert.
  if (LOD.stufe !== 'fern' && !K.zu) for (const q of buchten) {
    if (q.eingang || q.i % 2 === (v % 2)) continue;
    if (alt && q.i % 5 === 1) continue; // einzelne Markise fehlt
    const roll = alt && q.i % 7 === 3;
    const t = roll ? 1.0 : 1.58;
    s.q(q.a, q.b, roll ? 3.86 : 3.64, roll ? 3.98 : 3.80, 1.0, t, roll ? '#638588' : '#5b8788');
    if (!roll) s.q(q.a, q.b, 3.60, 3.67, 1.55, 1.68, '#759b9b');
  }

  // Vorhersehbare, aber verschiedene Ecken: scharfer Sockel, gefaste Ecke, gerundete Vorblende.
  if (s.seite === '+z' && arch.ecke !== 'scharf') {
    if (arch.ecke === 'gefast') {
      s.q(L - 1.8, L - 0.40, EG + 0.1, H - 0.2, 0.68, 0.97, K.gesims);
      s.q(L - 1.25, L - 0.65, EG + 1.0, H - 1.0, 0.97, 1.04, K.rahmen);
    } else {
      const g = new THREE.CylinderGeometry(0.9, 0.9, H - EG - 0.6, 12);
      g.translate(L - 0.9, EG + (H - EG) / 2, 0.35);
      s.geo(g, K.rahmen);
    }
  }

  // Architekturmerkmale der drei Familien, nicht bloss ein austauschbarer Kasten.
  if (s.seite === '+z' && fam === 1) {
    const u = L - 2.4, y = H - 2.25;
    s.q(u - 1.1, u + 1.1, y - 1.1, y + 1.1, 0.82, 1.04, FARBE_SCHWESTER);
    s.q(u - 0.84, u + 0.84, y - 0.85, y + 0.85, 1.05, 1.16, '#e4e0ce');
    s.q(u - 0.07, u + 0.07, y + 0.06, y + 0.70, 1.16, 1.22, '#303f41');
    s.kipp(0.10, 0.58, 0.10, u + 0.15, y - 0.20, 1.23, '#303f41', -0.85);
  }
  if (s.seite === '+z' && fam === 2) {
    const a = 1.3, b = Math.min(L - 1, 17.5), oben = H - 1.0;
    s.q(a, b, oben - 4.05, oben, 0.73, 0.93, '#9a9b95');
    const [wx] = s.welt((a + b) / 2, 0);
    if (!K.zu) schild(K.scene, NAME_SCHWESTER.toUpperCase(), '+z', wx, oben - 2.1,
      s.ebene + 0.98, 1.22, '#ecece7');
  }
  if (fam === 3 && s.seite === '+x') {
    // Angesetztes Treppenhaus mit eigener vertikaler Verglasung.
    const ua = Math.max(1, L - (5.8 + (v % 3))), ub = L - 0.8;
    s.q(ua, ub, EG + 0.3, H + 0.45, 0.63, 1.32, K.gesims);
    for (let j = 0; j < n - 1; j++) {
      const y = EG + j * GH + 1.1;
      s.q(ua + 0.55, ub - 0.55, y, y + 1.9, 1.32, 1.47, '#658b93');
    }
    s.q(ua - 0.15, ub + 0.15, H + 0.38, H + 0.63, 0.60, 1.62, K.rahmen);
  }
  return { ySchrift, hSchrift, L };
}

function beschriftung(scene, s, K, y, hb) {
  if (K.zu) return;
  // Unter Substanz 30 genau ein fehlender Buchstabe; sonst durchgaengig beschriftet.
  const text = (K.haus.substanz ?? 50) < 30
    ? NAME_SCHWESTER.toUpperCase().replace('KAUF', ' AUF') : NAME_SCHWESTER.toUpperCase();
  const u = s.L / 2, [wx, wz] = s.welt(u, 0);
  const weltU = s.seite === '+z' ? wx : wz;
  // Versetzte dunkle Ruecklage und matte Vorderseite simulieren erhabene Kastenbuchstaben.
  schild(scene, text, s.seite, weltU + 0.10, y - 0.07, s.ebene + 0.87, hb, '#1d4c50');
  schild(scene, text, s.seite, weltU, y, s.ebene + 1.02, hb, '#e4e5db');
}

function dach(S, K) {
  const { x, z, w, d, H, arch } = K;
  const r = rng(String(K.haus.id) + '/' + K.fam + '/dach/' + arch.dachLayout);
  const y = H + 0.28;
  S.quader(x + 0.5, H, z + 0.5, x + w - 0.5, y, z + d - 0.5, '#777c78');
  // 2–5 verteilte Aufbauten, individuelle Maße, Positionen und Grundformen.
  const n = 2 + Math.floor(r() * 4);
  const platz = [];
  for (let j = 0; j < n; j++) {
    const ww = 2.0 + r() * 3.2, dd = 2 + r() * 3.6, hh = 1.2 + r() * 2.3;
    let px = 0, pz = 0;
    for (let versuch = 0; versuch < 20; versuch++) {
      const nx = x + 3 + ww / 2 + r() * (w - ww - 6);
      const nz = z + 3 + dd / 2 + r() * (d - dd - 6);
      px = nx; pz = nz;
      if (!platz.some((p) => Math.abs(p.x - px) < (p.w + ww) / 2 + 1.2 &&
          Math.abs(p.z - pz) < (p.d + dd) / 2 + 1.2)) break;
    }
    platz.push({ x: px, z: pz, w: ww, d: dd });
    const farbe = waehle(r, ['#a5a7a0', '#b3b0a8', '#959992', '#8d9493']);
    S.box(ww, hh, dd, px, y + hh / 2, pz, farbe);
    S.box(ww + 0.20, 0.13, dd + 0.20, px, y + hh + 0.06, pz, '#747a76');
    if (j % 2 === 0) for (let q = 0; q < 3; q++) S.box(0.13, hh * 0.65, 0.12, px + ww / 2 + 0.10, y + hh * 0.5, pz + (q - 1) * dd * 0.23, '#5a6869');
  }
  // Aufzugsueberfahrt und Treppenhauskopf, je nach Haus anders platziert.
  const liftX = x + w * (arch.treppe % 2 ? 0.28 : 0.72);
  const liftZ = z + d * (arch.treppe < 2 ? 0.27 : 0.72);
  S.box(3.3, 3.5, 3.5, liftX, y + 1.75, liftZ, '#b6b7ae');
  S.box(3.6, 0.22, 3.8, liftX, y + 3.62, liftZ, '#777b77');
  const tx = x + w * (0.18 + arch.treppe * 0.14), tz = z + d * 0.81;
  S.box(5.2, 2.45, 4.3, tx, y + 1.22, tz, '#969b96');
  S.box(5.5, 0.17, 4.5, tx, y + 2.52, tz, '#737975');
  // Abluftrohre: einige liegen nah am hinteren Rand, andere an der Technik.
  for (let i = 0; i < 3 + arch.dachLayout % 5; i++) {
    const px = x + 3 + r() * (w - 6), pz = z + 3 + r() * (d - 6);
    const h = 0.65 + r() * 1.15;
    const g = new THREE.CylinderGeometry(0.2 + r() * 0.16, 0.25, h, 7);
    g.translate(px, y + h / 2, pz); S.add(g, '#989e99');
    S.box(0.65, 0.12, 0.68, px, y + h + 0.07, pz, '#687473');
  }
  if (arch.dachLayout % 4 === 1 && !K.zu) {
    const s = new Seite(S, x, z, w, d, '+z'), u = w * 0.68;
    s.q(u - 4.3, u + 4.3, H + 0.8, H + 3.7, 0, 0.30, FARBE_SCHWESTER);
    for (const q of [u - 3.4, u + 3.4]) s.q(q - 0.13, q + 0.13, H + 0.2, H + 1.0, 0, 0.23, '#767975');
    schild(K.scene, NAME_SCHWESTER.toUpperCase(), '+z', x + u, H + 2.24, z + d + 0.38, 0.88, '#e4e5db');
  }
  return H + 3.8;
}
/** Gepflegte Gebrauchsspuren statt Ruine: wenig Moos, eine Ecke mit vereinzelten Ranken. */
function mildePatina(S, K) {
  const r = rng(String(K.haus.id) + '/patina');
  const y = K.H + 0.32;
  // Nur Dachhaut: bodenbedeckende Moosflecken, keine kugelfoermigen Baeume.
  for (let q = 0; q < 9; q++) {
    const px = K.x + 2 + r() * (K.w - 4), pz = K.z + 2 + r() * (K.d - 4);
    S.box(0.8 + r() * 2.2, 0.025, 0.5 + r() * 1.6, px, y, pz,
      waehle(r, ['#78876b', '#849176', '#7a856d']));
  }
  const s = new Seite(S, K.x, K.z, K.w, K.d, '+z');
  const u = K.w - 1.15;
  for (let h = 0; h < Math.min(K.H * 0.55, 9); h += 0.65) {
    s.q(u - 0.10 + r() * 0.22, u + 0.04 + r() * 0.15, 0.7 + h, 1.5 + h,
      0.86, 0.99, waehle(r, ['#66805b', '#73895d', '#86916a']));
  }
}
function moebel(S, K) {
  // Hoechstens zwei Radstaender und eine Bank; kein dekorativer Hartwig-Vorplatz.
  if (LOD.stufe === 'fern') return;
  const px = K.x + K.w * 0.18, zz = K.z + K.d + 2.0;
  for (let i = 0; i < 2; i++) {
    const u = px + i * 1.0;
    const ring = new THREE.TorusGeometry(0.52, 0.07, 5, 9, Math.PI);
    ring.rotateY(Math.PI / 2); ring.translate(u, 0.65, zz); S.add(ring, '#767e7d');
  }
  if (K.variante % 2 === 0) {
    const bx = K.x + K.w * 0.68, bz = zz + 0.3;
    S.box(2.6, 0.2, 0.65, bx, 0.7, bz, '#8b877f');
    S.box(0.12, 0.75, 0.12, bx - 0.9, 0.35, bz, '#6f7474');
    S.box(0.12, 0.75, 0.12, bx + 0.9, 0.35, bz, '#6f7474');
  }
  // Circa 60 % der Passanten eines Hartwig-Vorplatzes, aber niemals Null im laufenden Spiel.
  if (K.leute) {
    const pr = rng(String(K.haus.id) + '/passanten');
    const anzahl = Math.max(2, Math.round((K.w + K.d) / 12 * 0.6));
    for (let i = 0; i < anzahl; i++) {
      const anFront = i % 3 !== 2;
      const px = anFront ? K.x + 2.5 + pr() * (K.w - 5) : K.x + K.w + 2.8;
      const pz = anFront ? K.z + K.d + 2.0 + pr() * 1.5 : K.z + 3 + pr() * (K.d - 6);
      mensch(S, pr, px, 0.30, pz);
    }
  }
}

export function schwesterhaus(S, scene, haus, opt = {}) {
  const start = S.anzahl;
  const marke = merke(S, scene);
  const m = masseSchwester(haus);
  const x = opt.x ?? 0, z = opt.z ?? 0;
  const fam = opt.familie ?? m.familie;
  const variant = ((haus.fassade ?? Math.floor(index(haus) / 3)) % 8 + 8) % 8;
  const r = rng(String(haus.id) + '/' + fam + '/' + variant);
  const status = opt.status ?? haus.status ?? 'offen';
  // "verfall" meint bei der betriebenen Schwesterkette nur eine milde Patina.
  // Der drastische Ruinen-Dekor des allgemeinen Zustandsmoduls bleibt unbenutzt.
  const dekorStatus = status === 'verfall' ? 'offen' : status;
  const Z = zustandNormal({ ...opt, status: dekorStatus, seed: haus.id }, { untermieter: haus.flaechen?.filter((f) => f.konzept === 'untermiete').map((f) => ({ name: 'Mieter', etage: f.etage })) });
  const flags = zustandFlags(Z);
  const K = { S, scene, haus, x, z, w: m.w, d: m.d, n: m.n, H: m.H,
    fam, variante: variant, r, leute: opt.passanten !== false, arch: architekturSchwester(haus, fam), Z, zu: flags.zu, alt: (haus.substanz ?? 50) < 46 || flags.alt,
    eingaenge: [], fensterEG: [], farbe: '', rahmen: '', gesims: '', fleck: '' };
  const c = PALETTEN[fam - 1][variant % 4];
  K.farbe = c;
  K.rahmen = heller(c, 0.11);
  K.gesims = dunkler(c, fam === 2 ? 0.10 : 0.07);
  K.fleck = (variant + fam) % 2 ? heller(c, 0.035) : dunkler(c, 0.045);
  S.quader(x, 0, z, x + m.w, m.H, z + m.d, K.farbe);
  const ss = [new Seite(S, x, z, m.w, m.d, '+z'), new Seite(S, x, z, m.w, m.d, '+x')];
  for (const s of ss) {
    const t = fassade(S, s, K);
    beschriftung(scene, s, K, t.ySchrift, t.hSchrift);
  }
  dach(S, K);
  if (status === 'verfall') mildePatina(S, K);
  moebel(S, K);
  const ueber = eigeneMieterflaechen(Z, { '+z': K.w, '+x': K.d }, ['+x', '+z'], NAME_SCHWESTER + ' Restposten').map((q) => ({ ...q, ua: q.u0, ub: q.u1 }));
  const k = { x, z, w: K.w, d: K.d, hoehe: K.H, egHoehe: EG, geschossHoehe: GH, n: K.n,
    tRelief: 0.45, tLogo: 0.56, raster: fam === 3 ? 4.2 : 3.8, fensterBand: [0.6, GH - 0.45],
    seiten: Object.fromEntries(ss.map((s) => [s.seite, {
      u1: s.L,
      logo: { u: s.L / 2, y: 4.75, hb: s.L < 33 ? 2.02 : s.L < 47 ? 2.24 : 2.45, breite: Math.min(s.L * 0.7, 19) }
    }])),
    eingaenge: K.eingaenge, fensterEG: K.fensterEG, mieterEG: ueber,
    dach: { x0: x + 1, z0: z + 1, x1: x + K.w - 1, z1: z + K.d - 1, y: K.H + 0.2 },
    farbe: K.farbe, baujahr: haus.baujahr, flaecheQm: (haus.grundflaecheQm || K.w * K.d) * K.n,
    marke, seed: haus.id + ':' + Z.status, planeText: NAME_SCHWESTER.toUpperCase() + ' WIRD MODERNISIERT',
    kettenFarbe: FARBE_SCHWESTER, kettenName: NAME_SCHWESTER };
  const dek = zustandsDekor(S, scene, k, Z, { passanten: opt.passanten === false ? false : undefined, logosAbdecken: true, pylon: false });
  const teile = S.anzahl - start;
  if (teile > 8000) throw new Error('Schwesterhaus ' + haus.id + ': Teilebudget ' + teile + ' > 8000');
  return { hoehe: Math.max(K.H + 3.8, dek.hoehe), w: m.w, d: m.d, familie: fam, teile, status };
}
