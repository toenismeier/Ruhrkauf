// FUNDUS – eigenständige Off-Price-Marke, nicht Hartwig Outlet.
// Drei Bauformen; der Ladenbau-Workstream ersetzt später den bewusst einfachen Innenraum.
import { THREE, rng, waehle, zw, LOD } from './basis.js';
import { Seite, seitenVon, plakat, passend, parkreihe, mensch, puppe, clamp, technik, KLEID } from './sporthelfer.js';
import { zustandNormal, zustandFlags, zustandsDekor, merke } from './zustaende.js';
import { lokal as innenLokal, puppe as innenPuppe, vorbereiten as innenVorbereiten } from './innen.js';

export const NAME_OUTLET = 'FUNDUS';
export const FARBE_OUTLET = '#8c1d40';
export const FAMILIEN_OUTLET = { 1: 'Retail-Park-Box', 2: 'Zweigeschossiger Fachmarkt', 3: 'Innenstadt-Geschäftshaus' };
const HELL = '#f2f0eb', WAND = '#d7d9da', GLAS = '#cfe8f1', FUGE = '#c1c5c5';
const WAREN = ['#263b53', '#c67e73', '#e0c7a3', '#748d74', '#d8dce0', '#b88b56', '#a7a0ba'];

export function familieOutlet(haus) {
  if (haus.lage === 'b') return 3;
  return Number.parseInt(String(haus.id).replace(/\D/g, ''), 10) % 2 ? 1 : 2;
}

export function masseOutlet(haus) {
  const familie = familieOutlet(haus);
  const variante = Number(haus.fassade ?? 0);
  const n = familie === 3 ? clamp((haus.etagen ?? [0, 1]).filter((e) => e >= 0).length, 2, 3) : familie === 2 ? 2 : 1;
  const buero = familie === 3 ? 1 + (variante % 2) : 0;
  const A = clamp(haus.grundflaecheQm ?? 1700, 650, 3100);
  const bw = Math.round(clamp(Math.sqrt(A * (1.4 + (variante % 3) * 0.11)), 26, 68) / 2) * 2;
  const bd = Math.round(clamp(A / bw, 19, 55) / 2) * 2;
  const park = familie === 3 ? 0 : 18 + (variante % 3) * 2;
  const H = familie === 1 ? 6.65 + (variante % 3) * 0.1
    : familie === 2 ? 10.35 + (variante % 3) * 0.18
    : 5 + (n - 1) * 3.9 + buero * 3.5;
  return { w: bw, d: bd + park, bw, bd, n, H, familie, park, buero, variante };
}

function text(scene, s, inhalt, u, y, t, breite, hoehe, farbe = '#ffffff', bg = null) {
  if (breite < 1) return;
  plakat(scene, s, inhalt, u, y, t, passend(inhalt, breite, hoehe), farbe, bg);
}
function marke(scene, s, H, bandUnterkante, zusatz = false) {
  // Durchgehende 3,5-m-Brüstung auf beiden sichtbaren Seiten, kein kleines Dachlogoschild.
  const y = bandUnterkante;
  s.q(0, s.L, y, y + 3.5, 0.45, 0.90, FARBE_OUTLET);
  s.q(0, s.L, y + 3.38, y + 3.55, 0.91, 1.05, '#64152d');
  // Weiße Versalien im Format einer echten Handelsfassade (2,4 m / 2,0 m City).
  const city = H > 11.5;
  text(scene, s, NAME_OUTLET, s.L / 2, y + 1.88, 1.10, s.L - 2.2, city ? 2.35 : 2.70);
  const claim = zusatz ? 'Neue Ware jede Woche' : 'Marken. Bis zu 60 % unter dem empfohlenen Preis.';
  s.q(0.3, s.L - 0.3, y - 1.14, y - 0.08, 0.48, 0.88, '#f3ede3');
  text(scene, s, claim, s.L / 2, y - 0.61, 1.07, s.L - 1.5, 0.69, FARBE_OUTLET);
  return { u0: 0, u1: s.L, y0: y - 1.16, y1: y + 3.56, art: 'logo' };
}

// Lange Bekleidungsreihen statt Wühltischen; durch die beiden großen Glasfronten lesbar.
function wareHinterGlas(S, scene, x, z, w, d, r, n) {
  const breite = Math.min(28, w - 7);
  for (let reihe = 0; reihe < (n > 1 ? 3 : 4); reihe++) {
    const z0 = z + d - 4.5 - reihe * 2.5;
    if (z0 < z + 2) break;
    const links = x + 3;
    const rw = breite;
    S.box(rw, 0.09, 0.10, links + rw / 2, 2.55, z0, '#8d979d');
    for (let u = links; u < links + rw; u += 1.15) {
      if (Math.abs(u - (x + w * 0.52)) < 2) continue; // breiter Hauptgang
      S.box(0.6, 0.74, 0.29, u, 1.95, z0, waehle(r, WAREN));
    }
    for (const u of [links, links + rw]) S.box(0.08, 2.25, 0.08, u, 1.4, z0, '#889299');
    const schild = ['XS', 'S', 'M', 'L', 'XL'][reihe % 5];
    const schildSeite = new Seite(S, links, z0 - 0.05, rw, 0.12, '+z');
    for (const pos of [rw * 0.25, rw * 0.75]) {
      schildSeite.q(pos - 0.7, pos + 0.7, 3.13, 3.67, 0.1, 0.22, '#f5f5f2');
      text(scene, schildSeite, schild, pos, 3.42, 0.27, 1.3, 0.48, FARBE_OUTLET);
    }
  }
  // Schuhe nach Größen, Home-Gondeln, zentrale Kassenzeile und Impulsware.
  for (let k = 0; k < 5; k++) {
    const xx = x + w - 4, zz = z + 5 + 2.2 * k;
    S.box(3.4, 0.07, 1.4, xx, 0.8 + k * 0.22, zz, '#e5e1d9');
    for (let b = 0; b < 3; b++) S.box(0.8, 0.44, 0.55, xx - 1 + b, 1.1 + k * 0.22, zz, waehle(r, WAREN));
  }
  for (let k = 0; k < 3; k++) {
    const xx = x + 3 + k * 2.1, zz = z + 5;
    S.box(1.65, 1.05, 2.5, xx, 0.85, zz, '#e2dfd6');
    for (let j = 0; j < 3; j++) S.box(0.48, 0.38, 0.53, xx + (j - 1) * 0.52, 1.60, zz, waehle(r, WAREN));
  }
  S.box(7, 1.1, 1.45, x + w * 0.53, 0.85, z + d - 6, '#e2e1de');
  for (let k = 0; k < 4; k++) S.box(0.8, 0.32, 0.5, x + w * 0.53 - 2.4 + k * 1.6, 1.55, z + d - 6, '#3d4246');
  for (let k = 0; k < 4; k++) S.box(0.05, 0.95, 0.05, x + w * 0.53 - 3 + k * 1.8, 0.78, z + d - 2.6, '#8c1d40');
}

// Innen-Platzhalter: Rasterbeleuchtung, klare Hauptachse, Größenhinweise und hohe Warendichte.
export function innenOutlet(S, scene, haus, opt = {}) {
  const { w, bd, H } = masseOutlet(haus);
  const x = opt.x ?? 0, z = opt.z ?? 0, r = rng(String(haus.id) + '/innen');
  S.quader(x, 0, z, x + w, 0.30, z + bd, '#e7e6e1');
  for (let ix = x + 2.5; ix < x + w - 2; ix += 5) for (let iz = z + 2.5; iz < z + bd - 2; iz += 5)
    S.box(2.5, 0.08, 0.50, ix, H - 0.4, iz, '#fff6dc');
  wareHinterGlas(S, scene, x, z, w, bd, r, 1);
  // Recycelte Innenbau-Primitive: eigene Gondeln und Markenpuppen in den Abteilungszonen.
  const zStart = z + bd * 0.35;
  for (let k = 0; k < 4; k++) {
    const L = innenLokal(S, x + w - 5.5, 0.32, zStart + k * 3.2);
    L.box(2.8, 1.35, 0.9, 0, 0, 0, '#eeece6');
    L.box(3.0, 0.12, 1.1, 0, 1.25, 0, '#bfc2c0');
    for (let j = 0; j < 4; j++) L.box(0.53, 0.42, 0.6, -1 + j * 0.68, 1.38, 0, waehle(r, WAREN));
  }
  for (let k = 0; k < 3; k++) {
    const L = innenLokal(S, x + 7 + k * 4.7, 0.32, z + 4.7);
    innenPuppe(L, 0, 0, r, k === 2 ? 'kind' : k === 1 ? 'herren' : 'damen', WAREN);
  }
  // Verdichtete, aber ordentlich präsentierte Markenware: Kleiderstangen, Schuh- und Taschenwände.
  // Die 3-D-Einzelwaren entfallen bei Fern-LOD, die großen Gestelle bleiben erhalten.
  const nah = LOD.stufe !== 'fern';
  const gangBreite = Math.min(w - 10, 38);
  for (let gang = 0; gang < 7; gang++) {
    const zz = z + 3.7 + (gang % 4) * 3.05;
    const xx = x + 4.2 + Math.floor(gang / 4) * 6.0;
    if (zz > z + bd - 3.5 || xx > x + w - 8) continue;
    const laenge = Math.min(gangBreite - (gang % 3) * 2, w - (xx - x) - 5);
    S.box(laenge, 0.12, 0.15, xx + laenge / 2, 2.35, zz, '#7f8589');
    for (const ex of [xx + 0.2, xx + laenge - 0.2])
      S.box(0.13, 2.1, 0.13, ex, 1.32, zz, '#81878d');
    if (nah) for (let i = 0; i < Math.floor(laenge / 0.85); i++) {
      const bx = xx + 0.55 + i * 0.85;
      if (Math.abs(bx - (x + w * 0.52)) < 2.25) continue;
      S.box(0.53, 0.84, 0.34, bx, 1.65, zz, waehle(r, WAREN));
      S.box(0.37, 0.25, 0.34, bx, 2.17, zz, waehle(r, WAREN));
    }
    const schild = ['DAMEN', 'HERREN', 'KINDER', 'SPORT', 'ACCESSOIRES', 'SCHUHE', 'HOME'][gang];
    const seite = new Seite(S, xx, zz - 0.2, laenge, 0.2, '+z');
    seite.q(laenge * 0.3, laenge * 0.7, 2.85, 3.4, 0.10, 0.23, '#f3f0e8');
    text(scene, seite, schild, laenge / 2, 3.12, 0.27, laenge * 0.4 - 0.4, 0.40, FARBE_OUTLET);
  }
  // Schuhgrößenwand und Handtaschen: klar strukturierte Regale statt Wühltische.
  for (let regal = 0; regal < 16; regal++) {
    const rx = x + 3.5 + regal % 8 * Math.max(2.35, (w - 7) / 9);
    const rz = z + Math.min(bd - 4.2, 3 + Math.floor(regal / 8) * 3.5);
    S.box(1.9, 2.75, 0.23, rx, 1.67, rz, '#e7e6df');
    for (let ebenen = 0; ebenen < 4; ebenen++) {
      const yy = 0.65 + ebenen * 0.61;
      S.box(1.9, 0.09, 0.95, rx, yy, rz + 0.35, '#d1d0ca');
      if (nah) for (let st = 0; st < 3; st++) {
        S.box(0.49, 0.34, 0.48, rx - 0.57 + st * 0.57, yy + 0.22, rz + 0.3, waehle(r, WAREN));
        S.box(0.45, 0.07, 0.49, rx - 0.57 + st * 0.57, yy + 0.42, rz + 0.3, '#eeece6');
      }
    }
  }
    // Mitarbeiter beim Nachräumen und Rollwagen.
  const mx = x + w - 6, mz = z + bd - 8;
  mensch(S, r, mx, 0.34, mz);
  S.box(1.6, 1.05, 1.0, mx + 1.3, 0.85, mz + 0.5, '#8d969d');
  for (let k = 0; k < 3; k++) S.box(1.4, 0.2, 0.9, mx + 1.3, 0.5 + k * 0.4, mz + 0.5, '#e3ddd2');
  return { hoehe: H, w, d: bd };
}

function glasfront(S, scene, s, maxY, offen, r, oben = false) {
  // Nicht durch einen grauen Vollquader verdecken: Rahmen, Schaufenster und sichtbare Displays.
  const y0 = 0.48, y1 = Math.max(3.2, Math.min(maxY, oben ? 7.05 : 4.25));
  s.q(0.25, s.L - 0.25, 0.35, 0.60, 0.10, 0.27, '#bfc2c3');
  s.q(0.25, s.L - 0.25, y1 - 0.18, y1, 0.1, 0.30, '#e0e1dc');
  for (let u = 0.6; u < s.L; u += 3.3) {
    s.q(u, u + 0.12, y0, y1, 0.11, 0.28, '#a9b6bd');
    if (offen && u > 2 && u < s.L - 3 && Math.abs(u - s.L * 0.52) > 4.5) {
      // Dekorierte Schaufensterinsel: Mannequins, Taschen, Schuhe und Home.
      const farbe = waehle(r, WAREN);
      puppe(s, u + 1.05, 0.85, -0.42, farbe, waehle(r, KLEID), 1.12);
      s.q(u + 0.38, u + 2.5, 0.42, 0.62, -1.3, -0.9, '#dedacf');
      s.q(u + 0.45, u + 0.95, 1.18, 1.55, -1.35, -0.87, waehle(r, WAREN));
      s.q(u + 1.62, u + 2.13, 0.83, 1.13, -1.35, -0.87, waehle(r, WAREN));
      s.q(u + 1.58, u + 2.44, 1.85, 2.03, -1.35, -0.95, '#dedacf');
      s.q(u + 1.68, u + 2.32, 2.03, 2.53, -1.32, -0.98, waehle(r, WAREN));
    }
  }
  if (!offen) s.q(0.55, s.L - 0.55, y0, y1 - 0.2, -0.01, 0.09, '#93999a');
  const tuer = s.L * 0.52;
  s.q(tuer - 1.9, tuer + 1.9, 0.4, 3.1, 0.15, 0.31, '#b1d1dc');
  s.q(tuer - 0.07, tuer + 0.07, 0.4, 3.1, 0.32, 0.39, '#d6dde1');
  if (oben) {
    s.q(0.6, s.L - 0.6, 4.95, 7.75, 0.02, 0.12, '#91b9ca');
    for (let u = 0.7; u < s.L - 1; u += 3.4)
      s.q(u, u + 0.16, 4.95, 7.75, 0.15, 0.31, '#e1e3e3');
    s.q(0, s.L, 4.72, 4.98, 0.17, 0.36, '#e3e3de');
    // Lesbare aufsteigende Rolltreppe, nicht bloß horizontale Stufen im Glas.
    for (let i = 0; i < 12; i++) {
      const u = Math.min(s.L - 3, s.L * 0.30 + i * 0.51);
      s.q(u, u + 0.8, 1.1 + i * 0.45, 1.22 + i * 0.45, -1.7, -0.75, '#bdc5c8');
      s.q(u, u + 0.1, 1.1 + i * 0.45, 2.0 + i * 0.45, -0.8, -0.65, '#788994');
    }
  }
}

function pylon(S, scene, x, z) {
  S.box(0.34, 9.3, 0.34, x, 4.95, z, '#697178');
  S.box(8.2, 2.95, 0.85, x, 9.8, z, FARBE_OUTLET);
  const s = new Seite(S, x - 4.1, z - 0.43, 8.2, 0.86, '+z');
  text(scene, s, NAME_OUTLET, 4.1, 10.0, 0.60, 7.75, 1.76);
  s.q(0.2, 8, 7.85, 8.28, 0.4, 0.48, '#f3ede3');
}

export function outlet(S, scene, haus, opt = {}) {
  const start = S.anzahl, mark = merke(S, scene);
  const m = masseOutlet(haus), x = opt.x ?? 0, z = opt.z ?? 0;
  const r = rng(String(haus.id) + '/outlet/' + String(haus.fassade ?? 0));
  const Z = zustandNormal({ ...opt, status: opt.status ?? haus.status ?? 'offen', seed: haus.id });
  const F = zustandFlags(Z), H = m.H, { bw, bd } = m;
  const stadt = m.familie === 3, zweigeschossig = m.familie === 2;
  const paneele = ['#d9dbdd', '#c4cbd0', '#e2dfd8'];
  const farbe = stadt ? (m.variante % 2 ? '#c3bdb5' : '#cbd0ce') : paneele[m.variante % paneele.length];
  const egTop = 5, ladenTop = stadt ? 5 + (m.n - 1) * 3.9 : H;
  const bandY = stadt ? ladenTop - 3.5 : H - 3.5;
  const eingang = 0.38 + (m.variante % 4) * 0.075;
  const werbung = Z.hat('aktion') || Z.hat('offprice');
  const seiten = seitenVon(S, x, z, bw, bd), logos = [];
  // Tragende Rückseite und Schmalseite; der offene Erdgeschosskörper lässt Waren erkennen.
  S.quader(x, 0.30, z, x + bw, H, z + 0.38, farbe);
  S.quader(x, 0.30, z, x + 0.38, H, z + bd, farbe);
  S.quader(x, 0.28, z, x + bw, 0.46, z + bd, '#ece9e2');
  S.quader(x, H - 0.22, z, x + bw, H + 0.17, z + bd, '#c5c7c4');
  if (stadt) {
    // Ehemaliger Warenhaus-/Geschäftshauskörper: alte Büros mit Lochfassade über den Verkaufsflächen.
    S.quader(x + 0.1, ladenTop, z + bd - 0.42, x + bw, H, z + bd, farbe);
    S.quader(x + bw - 0.42, ladenTop, z + 0.1, x + bw, H, z + bd, farbe);
    for (const s of seiten) for (let et = 0; et < m.buero; et++) {
      const y0 = ladenTop + 0.78 + et * 3.5, y1 = Math.min(H - 0.45, y0 + 1.74);
      for (let u = 1.8; u < s.L - 1.5; u += 3.7) {
        s.q(u, u + 2.0, y0, y1, 0.24, 0.52, '#7d99a6');
        s.q(u + 0.90, u + 1.02, y0, y1, 0.53, 0.59, '#e8e5dc');
        s.q(u - 0.17, u + 2.17, y0 - 0.19, y0, 0.43, 0.62, '#d9d6ce');
      }
      s.q(0.35, s.L - 0.35, ladenTop + et * 3.5, ladenTop + et * 3.5 + 0.27, 0.53, 0.69, '#aca9a3');
    }
    if (m.variante % 2 === 0) { // umgenutzte Warenhausfront mit Lisenen
      for (const s of seiten) for (let u = 2.2; u < s.L - 1.8; u += 7.5)
        s.q(u, u + 0.54, ladenTop, H, 0.67, 0.91, '#b2b0ab');
    }
    // Eine Geschossfuge trennt den aufgefrischten Markenladen vom alten Bürooberbau.
    for (const s of seiten) s.q(0, s.L, ladenTop - 0.14, ladenTop + 0.19, 0.61, 0.95, '#9f9d9a');
  } else if (zweigeschossig) {
    // Zweigeschossiger Fachmarkt: geschlossener OG-Körper aus grauen Paneelen, EG durchgehend Glas.
    S.quader(x + 0.35, 7.65, z + bd - 0.36, x + bw, H, z + bd, farbe);
    S.quader(x + bw - 0.36, 7.65, z + 0.35, x + bw, H, z + bd, farbe);
    S.quader(x + 0.35, 4.72, z + 0.4, x + bw, 4.98, z + bd, '#929ca4');
    S.quader(x + bw - 0.5, 0.45, z + bd - 7.6, x + bw, 7.8, z + bd, '#bbcbd1');
    for (let et = 0; et < 4; et++) {
      const y = 1.2 + et * 1.45;
      S.box(1.15, 0.16, 2.3, x + bw - 2.65 - et * 0.43, y, z + bd - 3.4 - et * 0.3, '#adb9bf');
      S.box(0.15, 1.0, 2.5, x + bw - 2.0 - et * 0.43, y + 0.5, z + bd - 3.4 - et * 0.3, '#727e87');
    }
  } else {
    // Eingeschossige Box mit flacher, nach außen ablesbarer Dachattika.
    S.quader(x + 0.3, H - 0.55, z + bd - 0.45, x + bw, H, z + bd, farbe);
    S.quader(x + bw - 0.45, H - 0.55, z + 0.3, x + bw, H, z + bd, farbe);
  }
  if (!F.zu) {
    innenVorbereiten(S, scene);
    innenOutlet(S, scene, haus, { x, z });
  }
  for (const [i, s] of seiten.entries()) {
    glasfront(S, scene, s, stadt ? bandY - 0.07 : (zweigeschossig ? 7.65 : bandY + 0.4), !F.zu, r, zweigeschossig);
    if (stadt) {
      // EG-Läden haben eine eigenständige, breite Schaufensterzone.
      s.q(0.1, s.L - 0.1, 4.6, 4.93, 0.33, 0.56, '#e5e0d5');
      for (let u = 3; u < s.L - 2; u += 4.0)
        s.q(u, u + 0.13, 0.42, 4.65, 0.16, 0.32, '#b5b9b9');
    }
    logos.push(marke(scene, s, H, bandY, werbung));
  }
  if (!stadt) {
    // Über die volle Front durchlaufendes Glasvordach mit Stützen.
    const vordach = zweigeschossig ? 4.45 : 3.18;
    S.box(bw + 1.2, 0.23, 3.25, x + bw / 2, vordach, z + bd + 1.55, '#aac4d0');
    S.box(bw + 1.1, 0.12, 0.18, x + bw / 2, vordach + 0.06, z + bd + 3.12, '#efeee9');
    for (let xx = x + 2.5; xx < x + bw - 1.5; xx += 7.4)
      S.box(0.18, vordach - 0.55, 0.18, xx, (vordach + 0.55) / 2, z + bd + 2.95, '#b2bac1');
  }
  // 8 × 4 m großer vorspringender Eingangs-Windfang in der Markenfarbe.
  const ex = x + bw * eingang, portalH = stadt ? 5.85 : 5.95;
  const pz = z + bd + (stadt ? 1.25 : 1.8);
  for (const dx of [-4.05, 4.05])
    S.box(0.7, portalH - 0.3, 3.9, ex + dx, portalH / 2, pz, FARBE_OUTLET);
  S.box(8.8, 0.95, 4.15, ex, portalH - 0.45, pz, FARBE_OUTLET);
  S.box(7.1, 3.55, 0.24, ex, 2.35, pz + 2.0, '#aacbd7');
  const portalSeite = new Seite(S, ex - 4.4, pz - 2.1, 8.8, 4.2, '+z');
  text(scene, portalSeite, NAME_OUTLET, 4.4, portalH - 0.46, 0.69, 7.6, 0.78);
  // Dachlandschaft: unterschiedliche Technikfelder und erkennbare Oberlichter.
  technik(S, r, x + 2.5, z + 3, x + bw - 2, z + bd - 3, H + 0.18, { max: stadt ? 5 : 10, farbe: '#b9bfc2' });
  for (let i = 0; i < (stadt ? 2 : 5 + m.variante % 3); i++) {
    const xx = x + 4 + i * Math.max(4.0, (bw - 8) / 7);
    if (xx > x + bw - 3) continue;
    S.box(2.25, 0.28, Math.min(8, bd * 0.35), xx, H + 0.22, z + bd * 0.47, '#8fb7c7');
    S.box(2.47, 0.13, Math.min(8, bd * 0.35) + 0.18, xx, H + 0.08, z + bd * 0.47, '#e9ece9');
  }
  if (m.park) {
    const parkz = z + bd + 1.2, parkTiefe = m.park - 2.2;
    S.quader(x + 1, 0.30, parkz, x + bw - 1, 0.36, z + m.d - 0.8, '#8d9399');
    parkreihe(S, r, x + 2, x + bw - 2, parkz + 3.2, 5.3, 0.36, 0.94);
    if (parkTiefe >= 17) parkreihe(S, r, x + 2, x + bw - 2, parkz + 10.1, 4.8, 0.36, 0.88);
    for (let i = 0; i < 8; i++) {
      const xx = x + 2.5 + i * (bw - 5) / 8;
      S.box(0.55, 0.27, 1.9, xx, 0.45, parkz + 9, '#c7cbba');
    }
    S.box(5.8, 0.25, 3.5, x + bw - 5.4, 2.52, z + m.d - 3.1, FARBE_OUTLET);
    for (let i = 0; i < 5; i++) {
      S.box(0.11, 2.0, 0.11, x + bw - 8.1 + i * 1.25, 1.38, z + m.d - 3.1, '#d7dee3');
      S.box(0.7, 0.56, 0.70, x + bw - 8 + i * 1.25, 0.6, z + m.d - 3.0, '#a4b2bb');
    }
    if (opt.pylon !== false) pylon(S, scene, x + 6.6, z + m.d - 2.4);
  } else {
    S.box(bw + 3.5, 0.20, 5.3, x + bw / 2, 0.31, z + bd + 2.4, '#c9c9c5');
    for (let i = 0; i < 10; i++) S.box(0.15, 0.04, 1.6, x + 2 + i * (bw - 3) / 10, 0.44, z + bd + 3.2, '#ededed');
  }
  if (!F.zu && opt.passanten !== false) {
    const anz = Z.status === 'neueroeffnung' ? 22 : 14;
    for (let i = 0; i < anz; i++) {
      const xx = x + 3 + r() * (bw - 6), zz = z + bd + 2.4 + r() * (m.park ? 6 : 2.1);
      mensch(S, r, xx, 0.32, zz);
      S.box(0.62, 0.78, 0.27, xx + 0.45, 0.73, zz + 0.08, FARBE_OUTLET);
      S.box(0.58, 0.08, 0.04, xx + 0.45, 1.17, zz + 0.22, '#e0d7cb');
    }
  }
  if (Z.status === 'neueroeffnung') {
    const bz = z + bd + 3.1;
    for (let i = 0; i < 10; i++) mensch(S, r, ex - 4.1 + i * 0.85, 0.32, bz + 2.6);
    for (const dz of [1.5, 3.7]) {
      S.box(9.5, 0.07, 0.07, ex, 1.02, bz + dz, FARBE_OUTLET);
      for (let j = -2; j <= 2; j++) S.box(0.08, 1.05, 0.08, ex + j * 2.25, 0.63, bz + dz, '#666f76');
    }
    for (let i = 0; i < 16; i++) {
      const xx = ex - 3 + i / 15 * 6, yy = 3.0 + Math.sin(i / 15 * Math.PI) * 2.5;
      const g = new THREE.IcosahedronGeometry(0.45, 1); g.translate(xx, yy, bz);
      S.add(g, i % 3 ? FARBE_OUTLET : '#f8ede4');
    }
  }
  const koerper = {
    x, z, w: bw, d: bd, hoehe: H, egHoehe: 5, geschossHoehe: 3.9, n: m.n,
    tRelief: 1.15, raster: 4.1, fensterBand: false,
    seiten: {
      '+z': { u1: bw, sperren: [logos[0]], abbau: { u: bw * 0.53, y: bandY + 1.6, t: 1.15 } },
      '+x': { u1: bd, sperren: [logos[1]], abbau: { u: bd * 0.53, y: bandY + 1.6, t: 1.15 } },
    },
    eingaenge: [{ seite: '+z', u: bw * eingang, breite: 7.4, t: 2.2, haupt: true }],
    fensterEG: [{ seite: '+z', a: 0.6, b: bw - 0.6, y0: 0.5, y1: 3.2, t: 0.30 }],
    farbe, baujahr: haus.baujahr, jahr: opt.jahr, flaecheQm: haus.grundflaecheQm * m.n,
    marke: mark, seed: String(haus.id) + '/outlet', planeText: 'HIER ENTSTEHT ' + NAME_OUTLET,
  };
  // Off-Price und Aktion verwenden ausschließlich den Markenclaim statt Rabatt-Plakatflächen.
  const dekZ = werbung ? zustandNormal({ status: 'offen', seed: haus.id }) : Z;
  const dekor = zustandsDekor(S, scene, koerper, dekZ, { pylon: false, passanten: false, logosAbdecken: true, abrissSeite: opt.abrissSeite });
  return { hoehe: Math.max(H + 3.8, dekor.hoehe, m.park ? 11.6 : 0), w: m.w, d: m.d, familie: m.familie, teile: S.anzahl - start, status: Z.status };
}
