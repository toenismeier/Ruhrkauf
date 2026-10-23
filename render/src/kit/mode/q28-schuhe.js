// Q28: Schuhe in Dreiviertelansicht (schräg von vorn, Spitze nach links unten), ein Leisten für alle Arten.
// Maße in Schuhlängen (1 = Länge Ferse bis Spitze, Damen Gr. 39 ≈ 25 cm):
//   Ballenbreite 0,38 (≈ 9,5 cm), Fersenbreite 0,30, Gelenk 0,27; Vorderkappe 0,09–0,13 hoch; Rist 0,26.
//   Sneaker: Laufsohle 0,05–0,07, Schaft hinten 0,27 (≈ 6,8 cm). Chunky 0,12, Plateau 0,14.
//   Pumps: Absatz 0,32 (≈ 8 cm Stiletto), Ausschnitt bis 0,68 der Länge, Seiten 0,11 hoch.
//   Stiefelette/Chelsea: Schaft 0,48 (≈ 12 cm), Schnürstiefel 0,52, Winterstiefel 0,58, Stiefel 1,05 (≈ 38 cm, kniehoch), Overknee 1,6.
//   Kinder (Lauflernschuh): Länge zu Breite 1 : 0,46, Schaft 0,42; Gummistiefel Kind: Schaft 0,9.

import { materialDefs, hell, dunkel, mische, farbeVon } from './stoff.js';
import { kamera, netz, projiziere, koerper, polylinie, flaecheP, glatt3, bodenschatten } from './q28-raum.js';

const f = (n) => Math.round(n * 100) / 100;
const lerp = (a, b, t) => a + (b - a) * t;
const glatt01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function tabelle(tab) {
  // Catmull-Rom über (x, wert)
  return (x) => {
    if (x <= tab[0][0]) return tab[0][1];
    if (x >= tab.at(-1)[0]) return tab.at(-1)[1];
    let i = 0; while (x > tab[i + 1][0]) i++;
    const p0 = tab[Math.max(0, i - 1)], p1 = tab[i], p2 = tab[i + 1], p3 = tab[Math.min(tab.length - 1, i + 2)];
    const t = (x - p1[0]) / (p2[0] - p1[0]);
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0]), m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0]);
    const t2 = t * t, t3 = t2 * t;
    return Math.max(0, (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2);
  };
}

const BREITE = {
  rund: [[0, 0.02], [0.03, 0.105], [0.1, 0.15], [0.25, 0.148], [0.42, 0.138], [0.6, 0.172], [0.72, 0.19], [0.84, 0.175], [0.92, 0.135], [0.97, 0.08], [1, 0.012]],
  spitz: [[0, 0.02], [0.03, 0.1], [0.1, 0.14], [0.25, 0.138], [0.42, 0.13], [0.6, 0.165], [0.72, 0.175], [0.82, 0.15], [0.9, 0.1], [0.96, 0.045], [1, 0.005]],
  eckig: [[0, 0.02], [0.03, 0.105], [0.1, 0.15], [0.25, 0.148], [0.42, 0.138], [0.6, 0.172], [0.72, 0.188], [0.86, 0.178], [0.94, 0.155], [0.985, 0.11], [1, 0.02]],
  breit: [[0, 0.03], [0.04, 0.14], [0.12, 0.19], [0.3, 0.19], [0.5, 0.2], [0.68, 0.23], [0.82, 0.22], [0.92, 0.17], [0.97, 0.1], [1, 0.02]],
};
const HOEHE = {
  sneaker: [[0, 0.3], [0.3, 0.3], [0.45, 0.27], [0.62, 0.2], [0.8, 0.135], [0.93, 0.095], [1, 0.05]],
  flach: [[0, 0.26], [0.3, 0.26], [0.45, 0.235], [0.62, 0.17], [0.8, 0.11], [0.93, 0.075], [1, 0.035]],
  pumps: [[0, 0.24], [0.3, 0.24], [0.5, 0.2], [0.65, 0.14], [0.8, 0.095], [0.93, 0.06], [1, 0.025]],
  hoch: [[0, 0.34], [0.3, 0.33], [0.45, 0.29], [0.62, 0.21], [0.8, 0.145], [0.93, 0.1], [1, 0.055]],
  kind: [[0, 0.34], [0.3, 0.34], [0.5, 0.3], [0.66, 0.24], [0.82, 0.17], [0.93, 0.12], [1, 0.06]],
};

// Grundwerte je Art; p überschreibt
const ARTEN = {
  sneaker: { spitze: 'rund', hoehe: 'sneaker', sohle: 0.06, sohleFarbe: '#f4f3ef', xo: 0.36, kHinten: 0.27, kSeite: 0.2, schnuerung: [0.38, 0.64, 6], zunge: true, kappe: 'gummi', profil: true, fersenlasche: true, seitenpanel: true },
  chunky: { spitze: 'rund', hoehe: 'hoch', sohle: 0.2, sohleFarbe: '#ece6d8', sohleWelle: true, lagen: [[0.08, 0.32, '#a2a6ab'], [0.62, 0.78, '#c8372f']], akzent: '#273659', overlays: true, xo: 0.36, kHinten: 0.28, kSeite: 0.22, schnuerung: [0.38, 0.62, 5], zunge: true, profil: true, fersenlasche: true, seitenpanel: true, zweiton: true },
  plateau: { spitze: 'rund', hoehe: 'flach', sohle: 0.15, sohleFarbe: '#f4f3ef', xo: 0.36, kHinten: 0.25, kSeite: 0.19, schnuerung: [0.38, 0.64, 6], zunge: true, profil: true, plateauLinie: true },
  pumps: { spitze: 'spitz', hoehe: 'pumps', sohle: 0.018, sohleFarbe: '#1d1b1c', absatz: 0.32, absatzForm: 'stiletto', xo: 0.66, kHinten: 0.21, kSeite: 0.1 },
  ballerina: { spitze: 'rund', hoehe: 'pumps', sohle: 0.025, sohleFarbe: '#3a2e26', absatz: 0.03, absatzForm: 'block', xo: 0.7, kHinten: 0.15, kSeite: 0.08, schleife: true, einfass: true },
  loafer: { spitze: 'rund', hoehe: 'flach', sohle: 0.03, sohleFarbe: '#3a2a20', absatz: 0.05, absatzForm: 'block', xo: 0.42, kHinten: 0.22, kSeite: 0.15, mokassin: true, riegel: true, rahmennaht: true },
  slipper: { spitze: 'rund', hoehe: 'flach', sohle: 0.035, sohleFarbe: '#e9dcc0', xo: 0.42, kHinten: 0.21, kSeite: 0.15, mokassin: true, kragenband: true, noppen: true },
  business: { spitze: 'eckig', hoehe: 'flach', sohle: 0.03, sohleFarbe: '#2a1d16', absatz: 0.05, absatzForm: 'block', xo: 0.38, kHinten: 0.23, kSeite: 0.17, schnuerung: [0.4, 0.55, 5], schnuerEng: true, zunge: false, kappenNaht: true, rahmennaht: true, budapester: false },
  espadrille: { spitze: 'rund', hoehe: 'flach', sohle: 0.07, sohleFarbe: '#d9c39a', jute: true, xo: 0.44, kHinten: 0.18, kSeite: 0.14, gummiband: true },
  mule: { spitze: 'spitz', hoehe: 'pumps', sohle: 0.025, sohleFarbe: '#2a1d16', absatz: 0.12, absatzForm: 'block', xo: 0.62, kHinten: 0, kSeite: 0, offen: 0.4 },
  hausschuh: { spitze: 'rund', hoehe: 'flach', sohle: 0.045, sohleFarbe: '#6a5a4a', xo: 0.48, kHinten: 0.2, kSeite: 0.15, fell: true, breiter: 1.08 },
  // Stiefel: schaft = Höhe über Boden, schaftArt für Details
  stiefel: { spitze: 'rund', hoehe: 'hoch', sohle: 0.035, sohleFarbe: '#2a1d16', absatz: 0.09, absatzForm: 'block', schaft: 1.5, schaftWeite: 0.94, oberkanteGerade: true, reissverschluss: true, rahmennaht: true },
  overknee: { spitze: 'spitz', hoehe: 'pumps', sohle: 0.02, sohleFarbe: '#1d1b1c', absatz: 0.3, absatzForm: 'stiletto', schaft: 2.6, schaftWeite: 0.88, ziehband: true, oberschenkel: true, schleifeOben: true },
  chelsea: { spitze: 'rund', hoehe: 'hoch', sohle: 0.045, sohleFarbe: '#2a1d16', absatz: 0.04, absatzForm: 'block', schaft: 0.5, schaftWeite: 0.92, einsatz: true, lasche: true, rahmennaht: true, profil: true },
  schnuerstiefel: { spitze: 'rund', hoehe: 'hoch', sohle: 0.07, sohleFarbe: '#24211f', absatz: 0.03, absatzForm: 'block', schaft: 0.52, schnuerung: [0.24, 0.6, 6], schaftSchnuerung: 4, haken: true, profil: true, grob: true, lasche: true, rahmennaht: true },
  winterstiefel: { spitze: 'rund', hoehe: 'hoch', sohle: 0.08, sohleFarbe: '#3a332e', schaft: 0.62, fellRand: true, fellBreit: true, profil: true, grob: true, schnuerung: [0.36, 0.6, 4], breiter: 1.06, steppung: true },
  wanderschuh: { spitze: 'rund', hoehe: 'hoch', sohle: 0.09, sohleFarbe: '#2e2a27', schaft: 0.58, schnuerung: [0.3, 0.68, 4], schaftSchnuerung: 3, haken: true, profil: true, grob: true, kappe: 'gummi', kappeFarbe: '#55493f', zweiton: true, akzent: '#e8833a', senkel: '#c8372f', lasche: true, polsterRand: true, lagen: [[0.55, 0.75, '#e8833a']] },
  gummistiefel: { spitze: 'rund', hoehe: 'kind', breite: 'breit', sohle: 0.06, sohleFarbe: '#3a3532', schaft: 0.9, glaenzend: true, griffe: true, profil: true, grob: true, schaftWeite: 1.1 },
  lauflern: { spitze: 'rund', hoehe: 'kind', breite: 'breit', sohle: 0.07, sohleFarbe: '#e8d9bf', schaft: 0.5, klett: 2, klettFarbe: '#273659', polsterRand: true, hoeher: 1.2, breiter: 1.12, kappe: 'gummi', kappeFarbe: '#e8d9bf', schaftWeite: 1.16, paar: true },
  // ── Q34: jede Schuhart ein eigener Leisten (Befund Wurf 3, Bild 04)
  //   Schnürschuh (sportlicher Derby): offene Schnürung 5 Ösen, Profilsohle 0,07, Rist 0,26.
  schnuerschuh: { spitze: 'rund', hoehe: 'flach', sohle: 0.07, sohleFarbe: '#c9a978', xo: 0.38, kHinten: 0.24, kSeite: 0.18, schnuerung: [0.38, 0.6, 5], zunge: true, profil: true, polster: true, kappe: 'leder', fersenlasche: true },
  //   Derby: offene Schnürung (Quartiere auf dem Blatt), eckige Spitze, Rahmennaht, Absatz 0,05 (≈ 2,5 cm).
  derby: { spitze: 'eckig', hoehe: 'flach', sohle: 0.03, sohleFarbe: '#2a1d16', absatz: 0.05, absatzForm: 'block', xo: 0.36, kHinten: 0.23, kSeite: 0.17, schnuerung: [0.36, 0.56, 4], zunge: true, quartier: true, rahmennaht: true },
  //   Budapester: Flügelkappe (W-Form) mit Lochreihen, geschlossene Schnürung 5 Ösen.
  budapester: { spitze: 'eckig', hoehe: 'flach', sohle: 0.032, sohleFarbe: '#2a1d16', absatz: 0.05, absatzForm: 'block', xo: 0.38, kHinten: 0.23, kSeite: 0.17, schnuerung: [0.4, 0.55, 5], schnuerEng: true, zunge: false, fluegelkappe: true, brogue: true, rahmennaht: true },
  //   Mokassin: weich, ohne Absatz, Mokassinnaht, Lederschleife mit Quasten auf dem Rist.
  mokassin: { spitze: 'rund', hoehe: 'flach', sohle: 0.022, sohleFarbe: '#b98a5c', xo: 0.46, kHinten: 0.18, kSeite: 0.13, mokassin: true, quaste: true, einfass: true, breiter: 1.04 },
  //   Bootsschuh: Mokassinnaht, zwei Ösenpaare, Lederband rundum, weiße Rillensohle 0,05.
  bootsschuh: { spitze: 'rund', hoehe: 'flach', sohle: 0.05, sohleFarbe: '#f4f3ef', xo: 0.42, kHinten: 0.22, kSeite: 0.16, mokassin: true, kragenband: true, schnuerung: [0.44, 0.52, 2], zunge: false, profil: true },
  //   Monk: Querriemen mit Schnalle außen, eckig, Absatz 0,05.
  monk: { spitze: 'eckig', hoehe: 'flach', sohle: 0.03, sohleFarbe: '#2a1d16', absatz: 0.05, absatzForm: 'block', xo: 0.4, kHinten: 0.23, kSeite: 0.17, monk: true, kappenNaht: true, rahmennaht: true },
  //   Quastenloafer: wie Loafer, statt Riegel zwei Quasten.
  quastenloafer: { spitze: 'rund', hoehe: 'flach', sohle: 0.03, sohleFarbe: '#3a2a20', absatz: 0.05, absatzForm: 'block', xo: 0.42, kHinten: 0.22, kSeite: 0.15, mokassin: true, quaste: true, rahmennaht: true },
  //   Slip-on: Sneakersohle, Gummizug seitlich, ohne Schnürung.
  slipon: { spitze: 'rund', hoehe: 'sneaker', sohle: 0.07, sohleFarbe: '#f4f3ef', xo: 0.48, kHinten: 0.24, kSeite: 0.18, gummizug: true, kappe: 'gummi', profil: true, seitenStreifen: true },
  //   Komfortschuh: Weite H (breiter 1,1), zwei Klettriemen, Wechselfußbett, Sohle 0,06, Absatz 0,03.
  komfort: { spitze: 'rund', hoehe: 'hoch', breite: 'breit', sohle: 0.06, sohleFarbe: '#e1d6c4', absatz: 0.03, absatzForm: 'keil', xo: 0.42, kHinten: 0.26, kSeite: 0.2, klett: 2, klettSchlaufe: true, polster: true, breiter: 1.06 },
  //   Clog: hinten offen, Holzsohle 0,14, Nietenreihe am Rand.
  clog: { spitze: 'rund', hoehe: 'hoch', breite: 'breit', sohle: 0.14, sohleFarbe: '#c79a62', jute: false, xo: 0.6, kHinten: 0, kSeite: 0, offen: 0.5, nieten: true, holz: true },
  //   Pantoffel: Hausschuh hinten offen, Filz, Fellrand.
  pantoffel: { spitze: 'rund', hoehe: 'flach', sohle: 0.04, sohleFarbe: '#5a4a3c', xo: 0.62, kHinten: 0, kSeite: 0, offen: 0.5, fell: true, breiter: 1.08, filz: true },
  //   Haferlschuh: seitliche Schnürung außen, derbe Zwienaht, Profilsohle.
  haferl: { spitze: 'rund', hoehe: 'hoch', sohle: 0.07, sohleFarbe: '#2e241c', absatz: 0.04, absatzForm: 'block', xo: 0.4, kHinten: 0.26, kSeite: 0.2, seitenSchnuerung: true, profil: true, grob: true, rahmennaht: true, zwienaht: true },
  //   Slingpumps: Fersenriemen statt Hinterkappe, Absatz 0,22 (≈ 5,5 cm).
  slingpumps: { spitze: 'spitz', hoehe: 'pumps', sohle: 0.018, sohleFarbe: '#1d1b1c', absatz: 0.22, absatzForm: 'block', xo: 0.62, kHinten: 0, kSeite: 0.08, offen: 0.22, fersenriemen: true },
  //   Kitten-Heel: niedriger Pfennigabsatz 0,17 (≈ 4,5 cm), spitz, Zierschnalle.
  kitten: { spitze: 'spitz', hoehe: 'pumps', sohle: 0.018, sohleFarbe: '#1d1b1c', absatz: 0.17, absatzForm: 'stiletto', xo: 0.64, kHinten: 0.2, kSeite: 0.1, zierschnalle: true },
  //   Stiefelette: Schaft 0,5, Blockabsatz 0,2 (≈ 5 cm), Reißverschluss innen.
  stiefelette: { spitze: 'spitz', hoehe: 'pumps', sohle: 0.02, sohleFarbe: '#1d1b1c', absatz: 0.2, absatzForm: 'block', schaft: 0.5, schaftWeite: 0.9, reissverschluss: true, oberkanteGerade: true },
  //   Trekkingschuh: halbhoch ohne Schaft, Gummikappe, grobe Sohle, Schnürhaken.
  trekking: { spitze: 'rund', hoehe: 'hoch', sohle: 0.08, sohleFarbe: '#2e2a27', xo: 0.34, kHinten: 0.3, kSeite: 0.24, schnuerung: [0.34, 0.66, 5], zunge: true, haken: true, profil: true, grob: true, kappe: 'gummi', kappeFarbe: '#55493f', seitenpanel: true, akzent: '#3d7a6a', senkel: '#e8833a', polster: true },
  //   Combat-Boots: Schaft 0,75, 8 Ösenpaare, Plateau-Profilsohle 0,1.
  combat: { spitze: 'rund', hoehe: 'hoch', sohle: 0.1, sohleFarbe: '#1d1b1c', schaft: 0.78, schnuerung: [0.24, 0.6, 6], schaftSchnuerung: 6, profil: true, grob: true, lasche: true, rahmennaht: true, zweiton: false, sohleWelle: false, plateauLinie: true },
  //   Gummistiefel Erwachsene: Schaft 1,15 (≈ 35 cm), schmal, Schnalle oben, ohne Griffe.
  gummistiefelhoch: { spitze: 'rund', hoehe: 'hoch', sohle: 0.06, sohleFarbe: '#2a2624', schaft: 1.15, schaftWeite: 1.0, glaenzend: true, profil: true, grob: true, schnalleOben: true },
  //   Kinder: Klettsneaker (zwei Klettriemen auf Sneakerleisten, Paar), Spangenschuh, Kinderhausschuh, Kinderwinterstiefel.
  klettsneaker: { spitze: 'rund', hoehe: 'kind', breite: 'breit', sohle: 0.07, sohleFarbe: '#f4f3ef', xo: 0.36, kHinten: 0.3, kSeite: 0.24, klett: 2, klettSchlaufe: true, klettFarbe: '#c8372f', kappe: 'gummi', profil: true, seitenpanel: true, paar: true },
  spangenschuh: { spitze: 'rund', hoehe: 'kind', breite: 'breit', sohle: 0.035, sohleFarbe: '#3a2e26', absatz: 0.02, absatzForm: 'block', xo: 0.62, kHinten: 0.2, kSeite: 0.1, spange: true, einfass: true, paar: true },
  kinderhausschuh: { spitze: 'rund', hoehe: 'kind', breite: 'breit', sohle: 0.05, sohleFarbe: '#9a8a78', xo: 0.46, kHinten: 0.3, kSeite: 0.22, klett: 1, klettFarbe: '#f1cf4a', fell: true, gesicht: true, breiter: 1.06 },
  kinderwinterstiefel: { spitze: 'rund', hoehe: 'kind', breite: 'breit', sohle: 0.08, sohleFarbe: '#3a332e', schaft: 0.62, fellRand: true, fellBreit: true, profil: true, grob: true, klett: 2, klettFarbe: '#273659', steppung: true, schaftWeite: 1.12, breiter: 1.1, paar: true },
};

// Leisten und Hilfsfunktionen
function leisten(p) {
  const B = tabelle(BREITE[p.breite ?? p.spitze] ?? BREITE.rund);
  const H0 = tabelle(HOEHE[p.hoehe] ?? HOEHE.sneaker), H = (x) => H0(x) * (p.hoeher ?? 1);
  const br = p.breiter ?? 1;
  // Spitze im Grundriss als Superellipse: rund k=2, spitz k=1,35, eckig k=3,6
  const xt = { spitz: 0.78, eckig: 0.86 }[p.spitze] ?? 0.84;
  const kk = { spitz: 1.35, eckig: 3.6 }[p.spitze] ?? 2.1;
  const Bt = B(xt);
  const w = (x) => {
    if (x <= xt) return B(x) * br;
    const u = Math.min(1, (x - xt) / (1 - xt));
    return Bt * Math.pow(Math.max(0, 1 - Math.pow(u, kk)), 1 / kk) * br + 0.004;
  };
  const y0 = (x) => -0.02 * Math.pow(Math.max(0, (x - 0.55) / 0.45), 2);
  const ha = p.absatz ?? 0;
  const zb = (x) => (ha ? ha * (1 - glatt01((x - 0.16) / (0.62 - 0.16))) : 0);
  const sohle = p.sohle ?? 0.04;
  // Oberkante Sohle (Laufsohle folgt dem Fußbett; vorn leichte Spitzensprengung)
  const zs = (x) => zb(x) + sohle + 0.02 * glatt01((x - 0.85) / 0.15);
  const n = p.n ?? 2.7;
  const pt = (x, s, Hx = H(x)) => {
    const th = s * Math.PI / 2;
    const si = Math.sin(th), co = Math.cos(th);
    return [x, y0(x) + w(x) * Math.sign(si) * Math.pow(Math.abs(si), 2 / n), zs(x) + Hx * Math.pow(Math.abs(co), 2 / n)];
  };
  const xo = p.xo ?? 0;
  const kH = p.kHinten ?? 0.26, kS = p.kSeite ?? 0.2;
  const kragen = (x) => {
    if (x >= xo) return H(x);
    const t = x / (xo || 1);
    if (p.offen && x < p.offen) return 0;
    if (t < 0.45) return lerp(kH, kS, glatt01(t / 0.45));
    const v = p.vorn ?? 0.78;
    if (t < v) return kS;
    return lerp(kS, H(xo), Math.pow(glatt01((t - v) / (1 - v)), 1.6));
  };
  // s, ab dem die Höhe den Kragen überschreitet
  const sK = (x) => {
    const Hx = H(x), c = kragen(x);
    if (c >= Hx - 1e-6) return 0;
    if (c <= 0.001) return 1;
    const co = Math.pow(c / Hx, n / 2);
    return (Math.acos(Math.min(1, co)) / (Math.PI / 2));
  };
  return { w, y0, H, zb, zs, pt, kragen, sK, xo, sohle };
}

function xs(n = 34) {
  const r = [];
  for (let i = 0; i <= n; i++) { const t = i / n; r.push(0.5 - 0.5 * Math.cos(t * Math.PI)); }
  return r;
}

// Baut den Schuh: Liste von Teilen mit Zeichenfunktionen (K) und allen Punkten für die Einpassung
function baue(p, SS) {
  const L = leisten(p);
  const punkte = [];
  const teile = [];
  const merk = (pts) => { for (const q of pts) punkte.push(q); return pts; };
  const X0 = xs(p.schaft ? 30 : 36);
  // Stützstellen am vorderen Einstiegsrand verdichten, xo exakt treffen
  const extra = L.xo > 0 && !p.schaft ? [0.8, 0.84, 0.88, 0.92, 0.95, 0.975, 0.99, 1].map((k) => L.xo * k) : [];
  const X = [...new Set([...X0, ...extra].map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b);
  const M = 16;

  // ── Absatz
  if (p.absatz && p.absatzForm) {
    const top = [], k = p.absatzForm === 'stiletto' ? 0.16 : p.absatzForm === 'keil' ? 1 : 0.86;
    const xr = p.absatzForm === 'stiletto' ? 0.22 : 0.27;
    for (let i = 0; i <= 12; i++) { const x = xr * i / 12; top.push([x, L.y0(x) + L.w(x) * 0.96, L.zb(x)]); }
    for (let i = 12; i >= 0; i--) { const x = xr * i / 12; top.push([x, L.y0(x) - L.w(x) * 0.96, L.zb(x)]); }
    const cx = p.absatzForm === 'stiletto' ? 0.07 : 0.11;
    const ringe = [0, 0.5, 1].map((t) => top.map(([x, y, z]) => [lerp(cx + (x - cx) * k, x, t) + (p.absatzForm === 'stiletto' ? (1 - t) * 0.02 : 0), y * lerp(k, 1, t), lerp(0, z, t)]));
    merk(ringe.flat());
    teile.push({ art: 'absatz', v: netz(ringe, { zu: true, innen: () => [cx, 0, L.zb(0) / 2] }) });
  }

  // ── Laufsohle als umlaufendes Band
  const rand = [], schritte = 40;
  const ws = (x) => L.w(Math.min(1, Math.max(0, x))) * 1.05 + 0.006;
  // Umriss: Außenseite Ferse→Spitze, runde Spitzenkappe, Innenseite zurück, runde Fersenkappe
  const xr = (i) => 0.5 - 0.5 * Math.cos((i / schritte) * Math.PI);
  for (let i = 0; i <= schritte; i++) rand.push([xr(i), 1]);
  for (let k = 1; k < 6; k++) { const a = Math.PI / 2 - (k / 6) * Math.PI; rand.push([1 + 0.012 * Math.cos(a), Math.sin(a), 1]); }
  for (let i = schritte; i >= 0; i--) rand.push([xr(i), -1]);
  for (let k = 1; k < 6; k++) { const a = -Math.PI / 2 - (k / 6) * Math.PI; rand.push([-0.01 * -Math.cos(a), Math.sin(a), 1]); }
  const z0 = (x) => L.zb(Math.min(1, x)) + (x > 0.85 ? 0.02 * glatt01((x - 0.85) / 0.15) : 0);
  const welle = (x) => (p.sohleWelle ? 0.03 * Math.sin(x * 22) * glatt01(x / 0.15) : 0);
  const yr = ([x, s, kappe]) => L.y0(Math.min(1, x)) + (kappe ? s * ws(x < 0.5 ? 0.0 : 1) : s * ws(x));
  const unten = rand.map((r) => [r[0], yr(r), z0(r[0])]);
  const oben = rand.map((r) => [r[0], yr(r), L.zs(Math.min(1, Math.max(0, r[0]))) + welle(r[0]) * (r[1] > 0 ? 1 : 0)]);
  merk(unten); merk(oben);
  const sohleInnen = (i, j) => { const x = Math.min(1, Math.max(0, rand[j][0])); return [x, L.y0(x), L.zs(x) - L.sohle / 2]; };
  teile.push({ art: 'sohle', v: netz([unten, oben], { zu: true, innen: sohleInnen }), deckel: oben });

  // ── Oberschuh: geschlossener Vorderteil und Seitenwände hinten
  const voll = [], lat = [], med = [];
  for (const x of X) {
    const sk = L.sK(x);
    if (x >= L.xo - 1e-9 || (sk <= 0 && x > L.xo * 0.5)) {
      const r = [];
      for (let j = 0; j <= M; j++) r.push(L.pt(x, -1 + 2 * j / M));
      voll.push({ x, r });
    }
    if (x <= L.xo + 1e-9 && L.xo > 0) {
      const a = [], b = [];
      for (let j = 0; j <= M / 2; j++) { const s = lerp(sk, 1, j / (M / 2)); a.push(L.pt(x, s)); b.push(L.pt(x, -s)); }
      lat.push(a); med.push(b);
    }
  }
  const innenO = (ringe) => (i) => { const x = ringe[i][0][0]; return [x, L.y0(x), L.zs(x) + L.H(x) * 0.35]; };
  const vr = voll.map((v) => v.r);
  if (vr.length > 1) { merk(vr.flat()); teile.push({ art: 'ober', v: netz(vr, { innen: innenO(vr) }) }); }
  const offen = L.xo > 0 && !p.schaft;
  if (offen && lat.length > 1) {
    merk(lat.flat()); merk(med.flat());
    teile.push({ art: 'ober', v: [...netz(lat, { innen: innenO(lat) }), ...netz(med, { innen: innenO(med) })] });
    // Einstiegsrand
    const ring = [];
    for (const x of [...X].filter((x) => x <= L.xo).reverse()) ring.push(L.pt(x, L.sK(x)));
    for (const x of X.filter((x) => x <= L.xo)) ring.push(L.pt(x, -L.sK(x)));
    teile.push({ art: 'einstieg', ring });
  }

  // ── Schaft (Stiefel)
  if (p.schaft) {
    const ringe = [], weite = p.schaftWeite ?? 1;
    const z1 = L.zs(0.15) + 0.12, z2 = p.schaft;
    const stufen = 12;
    // Schaftprofil: Knöchel schmal, Wade breiter, oben leicht offen; Vorderkante etwas höher als hinten
    const hoch = p.schaft;
    for (let k = 0; k <= stufen; k++) {
      const t = k / stufen, z = lerp(z1, z2, t);
      const zr = z / 0.42; // in Knöchelhöhen
      const wade = hoch > 0.8 ? glatt01((z - 0.45) / 0.35) - (hoch > 1.3 ? 0.35 * glatt01((z - 0.95) / 0.35) - 0.3 * glatt01((z - 1.25) / 0.3) : 0) : 0;
      const xc = 0.2 + 0.035 * t;
      const ob = p.oberschenkel ? 0.07 * glatt01((z - 1.3) / 0.7) : 0;
      const rx = (0.15 + 0.045 * wade + 0.012 * t + ob) * weite;
      const ry = (0.128 + 0.04 * wade + 0.01 * t + ob * 0.9) * weite * (p.breiter ?? 1);
      const r = [];
      for (let j = 0; j < 24; j++) {
        const a = (j / 24) * Math.PI * 2;
        // Oberkante: vorn etwas höher (Schnitt des Schaftes)
        const dz = k === stufen ? (p.oberkanteGerade ? 0.01 : p.oberschenkel ? 0.1 : 0.04) * Math.cos(a) * (hoch > 0.8 ? 1 : 0.5) : 0;
        r.push([xc + rx * Math.cos(a), ry * Math.sin(a), z + dz]);
      }
      ringe.push(r);
    }
    merk(ringe.flat());
    teile.push({ art: 'schaft', v: netz(ringe, { zu: true, innen: (i) => [ringe[i][0][0] - 0.1, 0, ringe[i][0][2]] }), ringe });
  }
  return { L, punkte, teile };
}

// ── Zeichnen
function zeichneSchuh(S, t, p0, { pos, groesse = 1, kam = {} } = {}) {
  const p = { ...ARTEN[p0.schuh] ?? ARTEN.sneaker, ...p0 };
  const { L, punkte, teile } = baue(p, S);
  // Einpassen: Kamera so wählen, dass der Schuh die Kachel füllt
  const probe = kamera({ ...kam, mass: 1, x0: 0, y0: 0 });
  const q = punkte.map(probe.P);
  const minX = Math.min(...q.map((v) => v[0])), maxX = Math.max(...q.map((v) => v[0]));
  const minY = Math.min(...q.map((v) => v[1])), maxY = Math.max(...q.map((v) => v[1]));
  const box = pos ?? { x: 50, y: 52, b: 86, h: 78 };
  const mass = Math.min(box.b / (maxX - minX), box.h / (maxY - minY)) * groesse;
  const K = kamera({ ...kam, mass, x0: box.x - ((minX + maxX) / 2) * mass, y0: box.y - ((minY + maxY) / 2) * mass });

  const defs = S.defs;
  const SO = materialDefs(p.sohleFarbe, p.jute ? 'leinen' : p.sohleFarbe === '#f4f3ef' || p.sohleFarbe === '#ece6d8' ? 'baumwolle' : 'leder', defs);
  if (p.glaenzend) S = { ...S, glanz: true };
  if (S.glanz && !defs.some((d) => d.includes(`id="${S.id}g"`))) defs.push(`<linearGradient id="${S.id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0.2" stop-color="#fff" stop-opacity="0"/><stop offset="0.38" stop-color="#fff" stop-opacity="0.32"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  const futter = p.futter ?? (helligkeitGrob(S.c) > 0.75 ? '#d9cdb8' : mische(S.c, '#c7ad86', 0.55));
  const g = [];
  // Bodenschatten
  const fuss = [L.pt(0.05, 0), L.pt(0.95, 0)].map(([x, y]) => K.P([x, y, 0]));
  g.push(bodenschatten((fuss[0][0] + fuss[1][0]) / 2, (fuss[0][1] + fuss[1][1]) / 2 + 2.4, Math.abs(fuss[1][0] - fuss[0][0]) / 2 + 9, 3.2));

  const teil = (art) => teile.filter((x) => x.art === art);
  for (const a of teil('absatz')) g.push(koerper(SO, projiziere(K, a.v), { tex: false }));
  // Sohle
  for (const s of teil('sohle')) {
    g.push(koerper(SO, projiziere(K, s.v, { kontrast: 0.8 }), { kw: 1 }));
    // Deckfläche (unter Fußöffnung bei Mules sichtbar)
    g.push(flaecheP(K, s.deckel, hell(SO.c, 0.08)));
    if (p.jute) {
      // geflochtenes Juteband: schräge Striche über das Band
      for (let i = 0; i <= 34; i++) {
        const x = i / 34, a = [x, L.y0(x) + L.w(x) * 1.05 + 0.006, L.zb(x) + 0.006], b = [x, a[1], L.zs(x) - 0.006];
        g.push(polylinie(K, [a, [x + 0.012, b[1], b[2]]], dunkel(SO.c, 0.3), 0.5, { op: 0.7 }));
      }
      g.push(polylinie(K, sohlenLinie(L, 0.5, 1.06), dunkel(SO.c, 0.35), 0.4, { op: 0.6 }));
    }
    if (p.profil) {
      // Profil: Kerben an der Unterkante, grob bei Stiefeln
      const n = p.grob ? 16 : 26;
      for (let i = 1; i < n; i++) {
        const x = i / n;
        if (p.absatz && x < 0.3 && p.absatzForm === 'stiletto') continue;
        const y = L.y0(x) + (L.w(x) * 1.05 + 0.007);
        const h = (L.zs(x) - L.zb(x)) * (p.grob ? 0.5 : 0.32);
        g.push(polylinie(K, [[x, y, L.zb(x) + 0.002], [x, y, L.zb(x) + h]], dunkel(SO.c, p.grob ? 0.45 : 0.28), p.grob ? 1.4 : 0.6, { op: 0.8 }));
      }
    }
    if (p.lagen) for (const [h0, h1, fl] of p.lagen) {
      const a = sohlenLinie(L, h0, 1.056), b = sohlenLinie(L, h1, 1.056).reverse();
      if (p.sohleWelle) for (const q of b) q[2] += 0.03 * Math.sin(q[0] * 22) * glatt01(q[0] / 0.15) * h1;
      g.push(flaecheP(K, [...a, ...b], fl, { op: 0.92 }));
    }
    if (p.plateauLinie || p.sohleWelle || p.sohle >= 0.06) g.push(polylinie(K, sohlenLinie(L, 0.55, 1.055), dunkel(SO.c, 0.22), 0.45, { op: 0.7, dash: p.rahmennaht ? '0.9 0.7' : null }));
    if (p.zweiton && p.sohle >= 0.07) g.push(polylinie(K, sohlenLinie(L, 0.22, 1.055), dunkel(SO.c, 0.5), 1.2, { op: 0.6 }));
  }
  // Rahmennaht an der Sohlenoberkante
  if (p.rahmennaht) g.push(polylinie(K, sohlenLinie(L, 0.96, 1.03), hell(SO.c, 0.35), 0.4, { dash: '0.8 0.6', op: 0.8 }));
  // Schaft hinter dem Vorderfuß? Schaft steht hinten, der Vorderfuß liegt vorn: erst Schaft, dann Fuß
  const schaft = teil('schaft')[0];
  const oberGeo = teil('ober').map((o) => projiziere(K, o.v));
  if (schaft) {
    const sg = projiziere(K, schaft.v);
    // Vereinigung Schaft + Fuß als ein Körper (keine Innenkante)
    g.push(koerper(S, { d: sg.d + oberGeo.map((o) => o.d).join(''), stufen: [...sg.stufen, ...oberGeo.flatMap((o) => o.stufen)] }));
  } else g.push(koerper(S, { d: oberGeo.map((o) => o.d).join(''), stufen: oberGeo.flatMap((o) => o.stufen) }));

  // Einstieg: Futter und Brandsohle
  const ein = teil('einstieg')[0];
  if (ein) {
    const id = S.id + 'e' + Math.round(Math.random() * 1e6);
    const rq = ein.ring.map(K.P);
    const rd = 'M' + rq.map((v) => `${f(v[0])} ${f(v[1])}`).join(' L') + ' Z';
    defs.push(`<clipPath id="${id}"><path d="${rd}"/></clipPath>`);
    g.push(`<path d="${rd}" fill="${dunkel(futter, 0.38)}"/>`);
    // Brandsohle (Fußbett) innen, hell
    const bett = [];
    for (let i = 0; i <= 20; i++) { const x = (L.xo + 0.08) * i / 20; bett.push([x, L.y0(x) + L.w(x) * 0.86, L.zs(x) + 0.004]); }
    for (let i = 20; i >= 0; i--) { const x = (L.xo + 0.08) * i / 20; bett.push([x, L.y0(x) - L.w(x) * 0.86, L.zs(x) + 0.004]); }
    g.push(`<g clip-path="url(#${id})">${flaecheP(K, bett, hell(futter, 0.12))}${polylinie(K, bett.slice(0, 21), dunkel(futter, 0.1), 2.4, { op: 0.5 })}</g>`);
    // Rand: Kante und Paspel
    g.push(`<path d="${rd}" fill="none" stroke="${dunkel(S.c, 0.35)}" stroke-width="${p.einfass ? 1.4 : 0.9}" stroke-linejoin="round" opacity="0.85"/>`);
    if (p.polster || p.art === 'sneaker' || p.art === 'chunky') g.push(polylinie(K, ein.ring.slice(0, Math.ceil(ein.ring.length / 2)), hell(S.c, 0.25), 1.6, { op: 0.6 }));
    if (p.kragenband) {
      // Lederband um den Einstieg (Bootsschuh)
      g.push(polylinie(K, ein.ring.slice(0, Math.ceil(ein.ring.length * 0.55)), dunkel(S.c, 0.45), 0.9, { op: 0.9 }));
      const k = L.pt(0.2, L.sK(0.2) * 0.98);
      g.push(polylinie(K, [k, [k[0] + 0.05, k[1] + 0.05, k[2] - 0.06]], dunkel(S.c, 0.45), 0.9), polylinie(K, [k, [k[0] + 0.08, k[1] + 0.03, k[2] - 0.08]], dunkel(S.c, 0.45), 0.9));
    }
    if (p.fell) g.push(fellRand(K, ein.ring.slice(0, Math.ceil(ein.ring.length * 0.98)), '#efe7d6'));
    if (p.gummiband) g.push(polylinie(K, ein.ring.slice(0, Math.ceil(ein.ring.length / 2)), hell(S.c, 0.15), 1.1, { op: 0.6 }));
  }
  // Schaftöffnung oben
  if (schaft) {
    const top = schaft.ringe.at(-1);
    g.push(flaecheP(K, top, dunkel(futter, 0.35)));
    // Innenseite hinten etwas heller
    g.push(flaecheP(K, top.map(([x, y, z]) => [x + 0.02, y * 0.82, z - 0.01]).slice(0, 13).concat(top.slice(12).reverse().slice(0, 1)), dunkel(futter, 0.15), { op: 0.6 }));
    g.push(polylinie(K, top, dunkel(S.c, 0.35), 0.9, { zu: true, op: 0.85 }));
    if (p.fellRand) {
      const r = schaft.ringe.at(-1), r2 = schaft.ringe.at(-2);
      const band = r.map(([x, y, z], j) => [x, y * 1.06, z - 0.02]);
      g.push(fellRand(K, band.concat([band[0]]), '#efe7d6', p.fellBreit ? 5 : 2.6));
      g.push(flaecheP(K, top, dunkel('#efe7d6', 0.25)));
    }
    if (p.polsterRand) {
      const r = schaft.ringe.at(-1).map(([x, y, z]) => [x, y * 1.04, z - 0.015]);
      g.push(polylinie(K, [...r, r[0]], dunkel(S.c, 0.45), 4.4), polylinie(K, [...r, r[0]], p.akzent ?? hell(S.c, 0.15), 3.2));
    }
    if (p.reissverschluss) {
      const seite = schaft.ringe.map((r) => r[6]);
      g.push(polylinie(K, seite.slice(1), dunkel(S.c, 0.5), 1.3, { op: 0.8 }), polylinie(K, seite.slice(1), '#c9ced3', 0.4, { dash: '0.5 0.5' }));
      const z = seite.at(-1); g.push(polylinie(K, [z, [z[0] + 0.01, z[1] + 0.01, z[2] - 0.08]], '#c9ced3', 1.2));
    }
    if (p.ziehband) {
      const r = schaft.ringe.at(-1);
      g.push(polylinie(K, r.slice(0, 13), dunkel(S.c, 0.3), 0.6, { op: 0.6, dash: '1 0.8' }));
    }
    if (p.schleifeOben) {
      // Bindeband oben hinten mit Schleife und Enden
      const r = schaft.ringe.at(-1), a = r[12], b = r[10];
      g.push(polylinie(K, [b, [b[0] - 0.08, b[1] + 0.06, b[2] - 0.18], [b[0] - 0.06, b[1] + 0.1, b[2] - 0.32]], dunkel(S.c, 0.1), 1.2));
      g.push(polylinie(K, [b, [b[0] - 0.02, b[1] + 0.1, b[2] - 0.14], [b[0] + 0.02, b[1] + 0.14, b[2] - 0.26]], dunkel(S.c, 0.1), 1.2));
      const [bx, by] = K.P(b);
      g.push(`<path d="M${f(bx)} ${f(by)} q-4 -3 -5 1 q2 2.4 5 -1 q3.6 -3 5 0.8 q-2 2.4 -5 -0.8" fill="${dunkel(S.c, 0.1)}" stroke="${dunkel(S.c, 0.5)}" stroke-width="0.4"/>`);
    }
    if (p.steppung) for (const k of [2, 4, 6, 8]) g.push(polylinie(K, schaft.ringe[k].slice(0, 13), dunkel(S.c, 0.3), 0.6, { op: 0.6 }));
    if (p.griffe) {
      const r = schaft.ringe.at(-1);
      for (const j of [6, 18]) { const a = r[j]; g.push(polylinie(K, [[a[0], a[1], a[2]], [a[0], a[1] * 1.08, a[2] + 0.09], [a[0] + 0.05, a[1] * 1.08, a[2] + 0.09], [a[0] + 0.05, a[1], a[2]]], dunkel(S.c, 0.25), 1.6)); }
    }
    if (p.einsatz) {
      // Chelsea: elastischer Einsatz seitlich (dunkel, längs gerippt), V-förmig
      const R = schaft.ringe, top = R.length - 1;
      const kante = [];
      for (let j = 3; j <= 7; j++) kante.push(R[top][j]);
      const spitze = R[2][5];
      const zwischen = (k) => R.map((r) => r).slice(2, top + 1).map((r, i, a) => { const t = i / (a.length - 1); const jj = lerp(5, k, t); const j0 = Math.floor(jj), j1 = Math.min(23, j0 + 1), u = jj - j0; return [lerp(r[j0][0], r[j1][0], u), lerp(r[j0][1], r[j1][1], u), lerp(r[j0][2], r[j1][2], u)]; });
      const links = zwischen(3), rechts = zwischen(7);
      g.push(flaecheP(K, [...links, ...kante.slice(1, -1), ...rechts.reverse()], dunkel(S.c, 0.58), { stroke: dunkel(S.c, 0.7), w: 0.4 }));
      for (const k of [3.8, 4.6, 5.4, 6.2]) g.push(polylinie(K, zwischen(k), dunkel(S.c, 0.72), 0.35, { op: 0.9 }));
      g.push(polylinie(K, links.map(([x, y, z]) => [x, y + 0.004, z]), hell(S.c, 0.3), 0.35, { dash: '0.6 0.5' }), polylinie(K, zwischen(7).map(([x, y, z]) => [x, y + 0.004, z]), hell(S.c, 0.3), 0.35, { dash: '0.6 0.5' }));
    }
    if (p.lasche) {
      const r = schaft.ringe.at(-1); const a = r[12];
      g.push(flaecheP(K, [[a[0] - 0.006, -0.03, a[2] - 0.05], [a[0] - 0.006, 0.03, a[2] - 0.05], [a[0] - 0.006, 0.026, a[2] + 0.045], [a[0] - 0.006, -0.026, a[2] + 0.045]], dunkel(S.c, 0.3), { stroke: dunkel(S.c, 0.55), w: 0.4 }));
    }
    if (p.schaftSchnuerung) {
      // Schnürung vorn am Schaft: Ösen/Haken auf beiden Seiten der Vorderkante
      const n = p.schaftSchnuerung + 1;
      const pts = [];
      for (let k = 1; k <= n; k++) {
        const r = schaft.ringe[Math.min(schaft.ringe.length - 1, Math.round((k / n) * (schaft.ringe.length - 1)))];
        pts.push([r[1], r[23]]);
      }
      g.push(schnuer(K, pts, p, S));
    }
  }

  // Details am Oberschuh
  const SP = (x, s) => L.pt(x, s);
  // Teilfläche des Oberschuhs (Besatz, Kappe): Streifen x0..x1, je x ein s-Bereich [sa, sb]; nur sichtbare Vierecke
  const bereich = (x0, x1, sFn, Sx, o = {}) => {
    const nx = 30, ns = 14, ringe = [];
    for (let i = 0; i <= nx; i++) {
      const x = lerp(x0, x1, i / nx), [sa, sb] = sFn(x), r = [];
      for (let j = 0; j <= ns; j++) r.push(SP(x, lerp(sa, sb, j / ns)));
      ringe.push(r);
    }
    const q = netz(ringe, { innen: (i) => { const x = lerp(x0, x1, i / nx); return [x, L.y0(x), L.zs(x) + L.H(x) * 0.3]; } });
    return koerper(Sx, projiziere(K, q, { nurSichtbar: true }), { kw: o.kw ?? 0.8, weich: 0.6 });
  };
  // Untere Randzone des Oberschuhs (Gummikappe, Schmutzrand): s, ab dem die Höhe über der Sohle kleiner als hb ist
  const sB = (x, hb) => { const Hx = L.H(x); if (hb >= Hx) return 0; return Math.acos(Math.min(1, Math.pow(hb / Hx, 2.7 / 2))) / (Math.PI / 2); };
  if (p.kappe === 'gummi' && !p.kappeFarbe) {
    const lin = [];
    for (let i = 0; i <= 18; i++) { const x = lerp(0.66, 1, i / 18); lin.push(SP(x, sB(x, 0.045))); }
    for (let i = 8; i >= 0; i--) { const x = lerp(0.86, 1, i / 8); lin.push(SP(x, -sB(x, 0.045))); }
    g.push(polylinie(K, lin, dunkel(S.c, 0.3), 0.55, { op: 0.8 }), polylinie(K, lin.map(([x, y, z]) => [x, y, z - 0.01]), dunkel(S.c, 0.2), 0.4, { op: 0.6, dash: '0.7 0.6' }));
  } else if (p.kappe === 'gummi') {
    const SK = materialDefs(p.kappeFarbe, 'leder', defs);
    const hb = (x) => 0.035 + 0.035 * glatt01((x - 0.62) / 0.34);
    g.push(bereich(0.62, 1, (x) => [sB(x, hb(x)), 1], SK), bereich(0.8, 1, (x) => [-1, -sB(x, hb(x))], SK));
  } else if (p.kappe === 'leder') {
    const lk = [];
    for (let j = 0; j <= 16; j++) lk.push(SP(0.8 + 0.06 * Math.cos((j / 16 - 0.5) * Math.PI), -1 + 2 * j / 16));
    g.push(polylinie(K, lk, dunkel(S.c, 0.3), 0.6, { op: 0.8 }), polylinie(K, lk.map(([x, y, z]) => [x - 0.015, y, z]), hell(S.c, 0.4), 0.4, { dash: '0.8 0.6', op: 0.8 }));
  }
  if (p.kappenNaht) {
    const lk = [];
    for (let j = 0; j <= 16; j++) lk.push(SP(0.84, -1 + 2 * j / 16));
    g.push(polylinie(K, lk, dunkel(S.c, 0.45), 0.6, { op: 0.9 }), polylinie(K, lk.map(([x, y, z]) => [x + 0.012, y, z]), dunkel(S.c, 0.2), 0.4, { dash: '0.6 0.5', op: 0.8 }));
    // hintere Kappe (Fersenkappe) auf der Außenseite
    const fk = []; for (let i = 0; i <= 10; i++) { const x = 0.25 * i / 10; fk.push(SP(x, 0.95 - 0.55 * Math.sin((i / 10) * Math.PI / 2) * 0 - (L.sK(x) ? 0 : 0))); }
    g.push(polylinie(K, [SP(0.02, L.sK(0.02) + 0.05), SP(0.16, 0.62), SP(0.26, 0.9)], dunkel(S.c, 0.4), 0.55, { op: 0.8 }));
  }
  if (p.overlays) {
    // aufgesetzte Teile (Dad-Sneaker): Mittelpanel in Akzentfarbe, Vorderkappe grau
    const SA = materialDefs(p.akzent ?? '#273659', 'leder', defs), SG = materialDefs('#a2a6ab', 'leder', defs);
    g.push(bereich(0.62, 1, (x) => [lerp(0.55, 0.1, glatt01((x - 0.8) / 0.2)), 1], SG));
    g.push(bereich(0.26, 0.6, (x) => [lerp(0.95, 0.5, Math.sin(((x - 0.26) / 0.34) * Math.PI)), 1], SA));
    g.push(bereich(0.004, 0.2, (x) => [Math.max(L.sK(x) + 0.02, 0.45), 1], SG));
  }
  if (p.seitenpanel) {
    // Seitenteil: geschwungene Ziernaht von der Ferse zur Schnürung, Fersenkappe
    const kurve = glatt3([SP(0.05, 0.86), SP(0.22, 0.72), SP(0.38, 0.6), SP(0.52, 0.66), SP(0.64, 0.9)], 3);
    g.push(polylinie(K, kurve, dunkel(S.c, 0.3), 0.6, { op: 0.8 }));
    const kurve2 = glatt3([SP(0.1, 0.62), SP(0.24, 0.52), SP(0.36, 0.4)], 3);
    if (p.zweiton) g.push(polylinie(K, kurve2, dunkel(S.c, 0.3), 0.55, { op: 0.7 }));
    g.push(polylinie(K, [SP(0.02, 0.55), SP(0.08, 0.6), SP(0.16, 0.74), SP(0.2, 0.96)], dunkel(S.c, 0.3), 0.55, { op: 0.7 }));
  }
  if (p.zweiton) {
    // zweite Farbe: Fersenkappe als aufgesetztes Teil
    const fz = p.akzent ?? (helligkeitGrob(S.c) > 0.7 ? '#a2a6ab' : hell(S.c, 0.4));
    const SZ = materialDefs(fz, 'leder', defs);
    g.push(bereich(0.004, 0.22, (x) => [Math.max(L.sK(x) + 0.02, lerp(0.2, 0.98, glatt01((x - 0.08) / 0.14))), 1], SZ));
  }
  if (p.mokassin) {
    // Mokassinnaht: U-förmige Blende auf dem Vorderfuß
    const u = [];
    for (let j = 0; j <= 20; j++) { const s = -0.62 + 1.24 * j / 20; const x = 0.47 + 0.4 * Math.pow(Math.cos((s / 0.62) * Math.PI / 2), 0.7); u.push(SP(Math.min(0.94, x), s * (x > 0.88 ? 1.1 : 1))); }
    const u2 = [SP(0.47, -0.62), ...u.slice(1, -1), SP(0.47, 0.62)];
    g.push(polylinie(K, u2, dunkel(S.c, 0.4), 0.7, { op: 0.9 }));
    g.push(polylinie(K, u2.map(([x, y, z]) => [x, y * 0.92, z + 0.004]), hell(S.c, 0.35), 0.4, { dash: '0.7 0.55', op: 0.9 }));
  }
  if (p.riegel) {
    // Penny-Riegel: Querband über den Rist mit rautenförmigem Ausschnitt, beidseitig abgesteppt
    const xa = L.xo + 0.07, xb = L.xo + 0.15, n = 14;
    const kante = (x) => { const r = []; for (let j = 0; j <= n; j++) r.push(SP(x, -0.82 + 1.64 * j / n)); return r; };
    const ka = kante(xa), kb = kante(xb);
    g.push(flaecheP(K, [...ka, ...kb.reverse()], dunkel(S.c, 0.08), { stroke: dunkel(S.c, 0.5), w: 0.5 }));
    kb.reverse();
    g.push(polylinie(K, ka.map(([x, y, z]) => [x + 0.01, y, z + 0.002]), hell(S.c, 0.35), 0.4, { dash: '0.7 0.55', op: 0.85 }), polylinie(K, kb.map(([x, y, z]) => [x - 0.01, y, z + 0.002]), hell(S.c, 0.35), 0.4, { dash: '0.7 0.55', op: 0.85 }));
    const xm = (xa + xb) / 2, ym = SP(xm, 0);
    g.push(flaecheP(K, [SP(xm, -0.22), SP(xm - 0.022, 0), SP(xm, 0.22), SP(xm + 0.022, 0)].map(([x, y, z]) => [x, y, z + 0.003]), dunkel(S.c, 0.62)));
  }
  if (p.schnuerung) {
    const [xa, xe, n] = p.schnuerung;
    const se = p.schnuerEng ? 0.22 : 0.36;
    const pts = [];
    for (let i = 0; i < n; i++) { const x = lerp(xa, xe, i / (n - 1)); pts.push([SP(x, se), SP(x, -se)]); }
    // Blatt (Ösenleiste) als Fläche
    const lasche = [...pts.map(([a]) => a), ...pts.map(([, b]) => b).reverse()];
    g.push(flaecheP(K, [...pts.map(([a]) => SP(a[0], se + 0.12)), ...pts.map(([a]) => SP(a[0], se + 0.12)).reverse().map(([x, y, z]) => [x, y, z])], 'none'));
    if (!p.schnuerEng) g.push(flaecheP(K, lasche, dunkel(S.c, 0.12), { op: 0.7 }));
    // Ösenleisten-Naht
    g.push(polylinie(K, pts.map(([a]) => SP(a[0], se + 0.12)), dunkel(S.c, 0.3), 0.5, { op: 0.8, dash: '0.8 0.6' }));
    if (p.zunge !== false) {
      const z0 = SP(xa - 0.02, 0);
      const zunge = [SP(xa + 0.04, -0.2), SP(xa + 0.04, 0.2), [xa - 0.06, z0[1] + 0.07, z0[2] + 0.05], [xa - 0.08, z0[1], z0[2] + 0.07], [xa - 0.06, z0[1] - 0.07, z0[2] + 0.05]];
      g.push(flaecheP(K, glatt3([...zunge, zunge[0]], 2), hell(S.c, 0.05), { stroke: dunkel(S.c, 0.35), w: 0.5 }));
    }
    g.push(schnuer(K, pts, p, S));
  }
  if (p.fersenlasche) {
    const a = SP(0.0, 0), b = L.pt(0.0, 0, L.kragen(0) + 0.03);
    const zt = L.zs(0) + L.kragen(0);
    g.push(flaecheP(K, [[-0.004, -0.03, zt - 0.07], [-0.004, 0.03, zt - 0.07], [-0.004, 0.026, zt + 0.03], [-0.004, -0.026, zt + 0.03]], p.akzent ?? dunkel(S.c, 0.3), { stroke: dunkel(S.c, 0.5), w: 0.4 }));
  }
  if (p.schleife) {
    const m = SP(0.715, 0);
    const z = m[2] + 0.006;
    g.push(flaecheP(K, [[m[0], 0, z], [m[0] + 0.07, 0.1, z + 0.01], [m[0] - 0.05, 0.11, z + 0.01]], dunkel(S.c, 0.2), { stroke: dunkel(S.c, 0.5), w: 0.5 }));
    g.push(flaecheP(K, [[m[0], 0, z], [m[0] + 0.07, -0.1, z + 0.01], [m[0] - 0.05, -0.11, z + 0.01]], dunkel(S.c, 0.08), { stroke: dunkel(S.c, 0.5), w: 0.5 }));
    g.push(polylinie(K, [[m[0], 0.02, z], [m[0] + 0.1, 0.06, z - 0.03]], dunkel(S.c, 0.3), 1.1), polylinie(K, [[m[0], -0.02, z], [m[0] + 0.1, -0.05, z - 0.03]], dunkel(S.c, 0.3), 1.1));
    g.push(flaecheP(K, [[m[0] - 0.018, -0.02, z + 0.01], [m[0] - 0.018, 0.02, z + 0.01], [m[0] + 0.018, 0.02, z + 0.01], [m[0] + 0.018, -0.02, z + 0.01]], dunkel(S.c, 0.4)));
  }
  if (p.klett) {
    for (let i = 0; i < p.klett; i++) {
      const x = 0.4 + i * 0.15;
      const band = [];
      for (let j = 0; j <= 10; j++) band.push(SP(x, -0.55 + 1.5 * j / 10));
      for (let j = 10; j >= 0; j--) band.push(SP(x + 0.1, -0.55 + 1.5 * j / 10));
      g.push(flaecheP(K, band, p.klettFarbe ?? dunkel(S.c, 0.18), { stroke: dunkel(S.c, 0.45), w: 0.5 }));
      g.push(polylinie(K, [SP(x + 0.015, 0.92), SP(x + 0.015, -0.4)], hell(S.c, 0.3), 0.4, { dash: '0.6 0.5', op: 0.8 }));
      if (p.klettSchlaufe) {
        // Riemenende steht über die Außenseite hinaus, D-Ring
        const a = SP(x, 0.95), b = SP(x + 0.1, 0.95);
        const ende = [a, b, [b[0] + 0.01, b[1] + 0.05, b[2] - 0.04], [a[0] - 0.01, a[1] + 0.05, a[2] - 0.04]];
        g.push(flaecheP(K, ende, p.klettFarbe ?? dunkel(S.c, 0.18), { stroke: dunkel(S.c, 0.5), w: 0.5 }));
        g.push(polylinie(K, [SP(x - 0.005, 0.7), SP(x + 0.105, 0.7)], '#c9ced3', 1.2));
      }
    }
  }
  // ── Q34-Details
  const naht = (pts, op = 0.85) => polylinie(K, pts, hell(S.c, 0.38), 0.4, { dash: '0.7 0.55', op });
  if (p.quartier) {
    // Derby: Quartiere liegen auf dem Blatt; Kante vom Kragen schräg nach vorn bis vor die erste Öse
    for (const s of [1, -1]) {
      const kante = glatt3([SP(L.xo - 0.04, s * (L.sK(L.xo - 0.04) + 0.02)), SP(L.xo + 0.08, s * 0.62), SP(p.schnuerung[1] + 0.05, s * 0.42), SP(p.schnuerung[1] + 0.07, s * 0.2)], 3);
      g.push(polylinie(K, kante, dunkel(S.c, 0.5), 0.75, { op: 0.9 }), naht(kante.map(([x, y, z]) => [x - 0.012, y, z])));
    }
  }
  if (p.fluegelkappe) {
    // W-förmige Flügelkappe: Spitze auf dem Rist bei 0,8, Flügel laufen seitlich bis 0,58 zurück
    const fl = [];
    for (let j = 0; j <= 24; j++) {
      const s = -1 + 2 * j / 24, a = Math.abs(s);
      const x = a < 0.35 ? 0.8 - 0.05 * Math.cos((a / 0.35) * Math.PI / 2) : lerp(0.78, 0.6, glatt01((a - 0.35) / 0.65));
      fl.push(SP(x, s));
    }
    g.push(polylinie(K, fl, dunkel(S.c, 0.5), 0.7, { op: 0.95 }));
    if (p.brogue) {
      // Lochreihen entlang der Kappe und der Hinterkappe, Medaillon in der Spitze
      const dot = (q, r = 0.42) => { const [x, y] = K.P(q); return `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${dunkel(S.c, 0.62)}"/>`; };
      for (let j = 0; j <= 24; j += 1) { const [x, y, z] = fl[j]; g.push(dot([x - 0.022, y, z])); }
      for (const [x, s] of [[0.92, 0], [0.9, 0.12], [0.9, -0.12], [0.94, 0.08], [0.94, -0.08], [0.88, 0]]) g.push(dot(SP(x, s), 0.36));
      for (let i = 0; i <= 8; i++) { const x = lerp(0.04, 0.3, i / 8); g.push(dot(SP(x, lerp(0.5, 0.86, i / 8)), 0.36)); }
    }
  }
  if (p.quaste) {
    // Zierband quer über den Rist, zwei Quasten hängen nach vorn
    const xa = L.xo + 0.03;
    const band = []; for (let j = 0; j <= 12; j++) band.push(SP(xa, -0.7 + 1.4 * j / 12));
    g.push(polylinie(K, band, dunkel(S.c, 0.45), 1.3, { op: 0.95 }));
    for (const s of [0.18, -0.12]) {
      const a = SP(xa + 0.01, s), b = [a[0] + 0.1, a[1] + 0.02, a[2] - 0.01];
      g.push(polylinie(K, [a, b], dunkel(S.c, 0.45), 0.8));
      const [bx, by] = K.P(b);
      g.push(`<path d="M${f(bx - 1.3)} ${f(by - 0.6)} L${f(bx + 1.3)} ${f(by - 0.6)} L${f(bx + 2)} ${f(by + 3.6)} L${f(bx - 2)} ${f(by + 3.6)} Z" fill="${dunkel(S.c, 0.25)}" stroke="${dunkel(S.c, 0.55)}" stroke-width="0.4"/>`,
        `<path d="M${f(bx - 1)} ${f(by + 1)} V${f(by + 3.4)} M${f(bx)} ${f(by + 1)} V${f(by + 3.4)} M${f(bx + 1)} ${f(by + 1)} V${f(by + 3.4)}" stroke="${dunkel(S.c, 0.55)}" stroke-width="0.3"/>`);
    }
  }
  if (p.monk) {
    // Querriemen von innen nach außen über den Rist, Schnalle auf der Außenseite
    const xa = L.xo + 0.02, xb = L.xo + 0.1, n = 14;
    const ka = [], kb = [];
    for (let j = 0; j <= n; j++) { const s = -0.5 + 1.42 * j / n; ka.push(SP(xa, s)); kb.push(SP(xb + 0.02 * (j / n), s)); }
    g.push(flaecheP(K, [...ka, ...[...kb].reverse()], dunkel(S.c, 0.12), { stroke: dunkel(S.c, 0.55), w: 0.5 }));
    g.push(naht(ka.map(([x, y, z]) => [x + 0.01, y, z + 0.002])));
    const m = SP((xa + xb) / 2 + 0.01, 0.78);
    const [mx, my] = K.P(m);
    g.push(`<rect x="${f(mx - 2.4)}" y="${f(my - 3)}" width="4.8" height="6" rx="0.8" fill="none" stroke="#c9ced3" stroke-width="1.1"/><path d="M${f(mx)} ${f(my - 3)} V${f(my + 3)}" stroke="#a7adb3" stroke-width="0.7"/>`);
  }
  if (p.gummizug) {
    // Slip-on: Gummizug-Dreiecke an beiden Seiten des Einstiegs
    for (const s of [1, -1]) {
      const a = SP(L.xo - 0.02, s * (L.sK(L.xo - 0.02) + 0.01)), b = SP(L.xo + 0.08, s * 0.5), c = SP(L.xo - 0.1, s * (L.sK(L.xo - 0.1) + 0.01));
      g.push(flaecheP(K, [c, a, b], dunkel(S.c, 0.6), { stroke: dunkel(S.c, 0.7), w: 0.4 }));
      for (const t of [0.3, 0.55, 0.8]) g.push(polylinie(K, [[lerp(c[0], a[0], t), lerp(c[1], a[1], t), lerp(c[2], a[2], t)], b], dunkel(S.c, 0.75), 0.3));
    }
  }
  if (p.seitenStreifen) {
    // umlaufender Kontraststreifen über der Sohle (Vulkanisiert)
    g.push(polylinie(K, sohlenLinie(L, 0.62, 1.056), '#c8372f', 0.9, { op: 0.9 }), polylinie(K, sohlenLinie(L, 0.38, 1.056), '#273659', 0.7, { op: 0.8 }));
  }
  if (p.nieten) {
    // Clog: Nietenreihe entlang der Oberkante der Holzsohle und Lederkante
    for (let i = 0; i <= 16; i++) {
      const x = lerp(0.48, 0.98, i / 16), [px, py] = K.P([x, L.y0(x) + L.w(x) * 0.98, L.zs(x) + 0.02]);
      g.push(`<circle cx="${f(px)}" cy="${f(py)}" r="0.55" fill="#d8c48a" stroke="#8a7440" stroke-width="0.25"/>`);
    }
  }
  if (p.holz) for (let i = 1; i < 5; i++) g.push(polylinie(K, sohlenLinie(L, i / 5, 1.055), dunkel(p.sohleFarbe, 0.18), 0.35, { op: 0.7 }));
  if (p.seitenSchnuerung) {
    // Haferl: Schnürung seitlich außen
    const pts = [];
    for (let i = 0; i < 5; i++) { const x = lerp(0.42, 0.62, i / 4); pts.push([SP(x, 0.32), SP(x, 0.6)]); }
    const lasche = [...pts.map(([a]) => a), ...pts.map(([, b]) => b).reverse()];
    g.push(flaecheP(K, lasche, dunkel(S.c, 0.14), { op: 0.75 }));
    g.push(schnuer(K, pts, p, S));
  }
  if (p.zwienaht) g.push(polylinie(K, sohlenLinie(L, 1.0, 1.04), hell(S.c, 0.5), 0.8, { dash: '1.1 0.7', op: 0.9 }));
  if (p.fersenriemen) {
    // Slingpumps: dünner Riemen um die Ferse auf Höhe 0,17, Schnalle außen
    const r = [];
    for (let j = 0; j <= 18; j++) { const s = -1 + 2 * j / 18; r.push(L.pt(0.05 + 0.13 * Math.abs(s), s, 0.17)); }
    g.push(polylinie(K, r, dunkel(S.c, 0.4), 1.6), polylinie(K, r, S.c, 0.9));
    const [bx, by] = K.P(r[15]);
    g.push(`<rect x="${f(bx - 1.2)}" y="${f(by - 1.4)}" width="2.4" height="2.8" rx="0.4" fill="none" stroke="#c9a24a" stroke-width="0.7"/>`);
  }
  if (p.zierschnalle) {
    const m = SP(L.xo + 0.04, 0);
    const [mx, my] = K.P(m);
    g.push(`<rect x="${f(mx - 3.2)}" y="${f(my - 1.8)}" width="6.4" height="3.6" rx="0.6" fill="${dunkel(S.c, 0.1)}" stroke="#c9a24a" stroke-width="1"/>`);
  }
  if (p.schnalleOben && schaft) {
    // Gummistiefel: Riemen mit Schnalle an der Schaftoberkante außen
    const r = schaft.ringe.at(-2), a = r[4], b = r[8];
    g.push(polylinie(K, [a, r[5], r[6], r[7], b], dunkel(S.c, 0.3), 2.2));
    const [bx, by] = K.P(r[6]);
    g.push(`<rect x="${f(bx - 1.6)}" y="${f(by - 2)}" width="3.2" height="4" rx="0.5" fill="none" stroke="#c9ced3" stroke-width="0.9"/>`);
  }
  if (p.spange) {
    // Spangenschuh: Riemchen über den Rist mit Knopf außen
    const xs0 = L.xo - 0.06, band = [], band2 = [];
    for (let j = 0; j <= 14; j++) { const s = -1 + 2 * j / 14; band.push(L.pt(xs0, s, L.H(xs0) + 0.01)); band2.push(L.pt(xs0 + 0.07, s, L.H(xs0 + 0.07) + 0.01)); }
    g.push(flaecheP(K, [...band, ...band2.reverse()], dunkel(S.c, 0.12), { stroke: dunkel(S.c, 0.5), w: 0.5 }));
    const [bx, by] = K.P(L.pt(xs0 + 0.035, 0.85, L.H(xs0) * 0.7));
    g.push(`<circle cx="${f(bx)}" cy="${f(by)}" r="1.4" fill="#f4f3ef" stroke="${dunkel(S.c, 0.5)}" stroke-width="0.4"/>`);
  }
  if (p.gesicht) {
    // Kinderhausschuh: Tiergesicht (Augen, Nase, Ohren) auf der Kappe
    const auge = (s) => { const [x, y] = K.P(SP(0.84, s)); return `<circle cx="${f(x)}" cy="${f(y)}" r="1.2" fill="#2a2c30"/><circle cx="${f(x - 0.4)}" cy="${f(y - 0.4)}" r="0.4" fill="#fff"/>`; };
    g.push(auge(0.3), auge(-0.25));
    const [nx, ny] = K.P(SP(0.93, 0));
    g.push(`<ellipse cx="${f(nx)}" cy="${f(ny)}" rx="1.8" ry="1.3" fill="#d96a6a"/>`);
    for (const s of [0.5, -0.45]) { const [ox, oy] = K.P(L.pt(0.72, s, L.H(0.72) + 0.05)); g.push(`<path d="M${f(ox - 2.2)} ${f(oy + 1.5)} L${f(ox)} ${f(oy - 3.4)} L${f(ox + 2.2)} ${f(oy + 1.5)} Z" fill="${dunkel(S.c, 0.12)}" stroke="${dunkel(S.c, 0.45)}" stroke-width="0.4"/>`); }
  }
  if (p.noppen) for (let i = 0; i < 9; i++) { const x = 0.08 + i * 0.1; const a = [x, L.y0(x) + L.w(x) * 1.05 + 0.006, L.zb(x) + 0.004]; g.push(flaecheP(K, [a, [x + 0.03, a[1], a[2]], [x + 0.03, a[1], a[2] + 0.025], [x, a[1], a[2] + 0.025]], dunkel(SO.c, 0.25))); }
  // Glanzlicht auf dem Rist
  const glanz = glatt3([SP(0.62, 0.42), SP(0.76, 0.42), SP(0.9, 0.5)], 2);
  g.push(polylinie(K, glanz, '#fff', S.glanz ? 1.8 : 1.2, { op: S.glanz ? 0.4 : 0.16 }));
  if (p.fell && !ein) g.push('');
  t.push(...g);
  return K;
}

function helligkeitGrob(c) { const n = parseInt(String(c).slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }

function sohlenLinie(L, hoehe, w) {
  const r = [];
  for (let i = 0; i <= 30; i++) { const x = i / 30; r.push([x, L.y0(x) + (L.w(x) * w + 0.007), lerp(L.zb(x), L.zs(x), hoehe)]); }
  return r;
}

function schnuer(K, pts, p, S) {
  const g = [];
  const farbe = p.senkel ?? (helligkeitGrob(S.c) > 0.75 ? '#f4f3ef' : helligkeitGrob(S.c) < 0.3 ? '#2a2c30' : hell(S.c, 0.7));
  const kreuz = [];
  for (let i = 0; i < pts.length - 1; i++) {
    kreuz.push(polylinie(K, [pts[i][0], pts[i + 1][1]], dunkel(farbe, 0.35), 1.5), polylinie(K, [pts[i][1], pts[i + 1][0]], dunkel(farbe, 0.35), 1.5));
    kreuz.push(polylinie(K, [pts[i][0], pts[i + 1][1]], farbe, 0.95), polylinie(K, [pts[i][1], pts[i + 1][0]], farbe, 0.95));
  }
  g.push(...kreuz);
  for (const [a, b] of pts) for (const o of [a, b]) {
    const [x, y] = K.P(o);
    g.push(p.haken ? `<circle cx="${f(x)}" cy="${f(y)}" r="0.95" fill="none" stroke="#b9bec3" stroke-width="0.7"/>` : `<circle cx="${f(x)}" cy="${f(y)}" r="0.8" fill="${dunkel(S.c, 0.55)}" stroke="#c9ced3" stroke-width="0.35"/>`);
  }
  // Schleife oben
  const [a, b] = pts[0];
  const m = K.P([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + 0.01]);
  g.push(`<path d="M${f(m[0])} ${f(m[1])} q-4 -3 -5.4 1 q2 2.6 5.4 -1 q3.6 -3.4 5.6 0.6 q-2.2 2.4 -5.6 -0.6" fill="none" stroke="${farbe}" stroke-width="0.9"/>`);
  g.push(`<path d="M${f(m[0])} ${f(m[1])} l-2 6 M${f(m[0])} ${f(m[1])} l1.4 6.6" stroke="${farbe}" stroke-width="0.8" fill="none"/>`);
  return g.join('');
}

function fellRand(K, ring, farbe, w = 2.4) {
  const q = ring.map(K.P);
  const d = 'M' + q.map((v) => `${f(v[0])} ${f(v[1])}`).join(' L');
  return `<path d="${d}" fill="none" stroke="${dunkel(farbe, 0.15)}" stroke-width="${w + 0.8}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${farbe}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1.2 0.5"/>`;
}

// ── Sandale: Fußbett + Riemen in Dreiviertelansicht
function zeichneSandale(S, t, p) {
  const L = leisten({ spitze: 'rund', hoehe: 'flach', sohle: 0.06, absatz: 0 });
  const probe = kamera({ mass: 1, x0: 0, y0: 0 });
  const pts = [];
  for (let i = 0; i <= 20; i++) { const x = i / 20; pts.push([x, L.w(x) * 1.1, 0], [x, -L.w(x) * 1.1, 0], [x, L.w(x) * 1.1, p.form === 'keil' ? 0.4 : 0.22]); }
  const q = pts.map(probe.P);
  const minX = Math.min(...q.map((v) => v[0])), maxX = Math.max(...q.map((v) => v[0])), minY = Math.min(...q.map((v) => v[1])), maxY = Math.max(...q.map((v) => v[1]));
  const mass = Math.min(84 / (maxX - minX), 64 / (maxY - minY));
  const K = kamera({ mass, x0: 50 - ((minX + maxX) / 2) * mass, y0: 54 - ((minY + maxY) / 2) * mass });
  const SO = materialDefs(p.bett ?? '#c7a77d', 'leder', S.defs);
  const g = [];
  g.push(bodenschatten(50, 74, 40, 3.4));
  // Fußbett als Band
  const rand = [];
  for (let i = 0; i <= 40; i++) rand.push([i / 40, 1]);
  for (let i = 39; i >= 1; i--) rand.push([i / 40, -1]);
  const ws = (x) => L.w(x) * 1.08 + 0.01;
  // Q34: Formen. sandale (zwei Riemen mit Schnalle), pantolette (ein breiter Riemen, Fußbett mit Zehensteg),
  // riemchen (drei dünne Riemchen + Fersenriemen), keil (Keilsohle 0,16 hinten), zehentrenner (Y-Riemen)
  const form = p.form ?? 'sandale';
  const h = form === 'keil' ? (x) => 0.05 + 0.3 * Math.pow(1 - x, 1.2) : (x) => 0.06 + 0.012 * (1 - x);
  const unten = rand.map(([x, s]) => [x, L.y0(x) + s * ws(x), 0]);
  const oben = rand.map(([x, s]) => [x, L.y0(x) + s * ws(x), h(x)]);
  g.push(koerper(SO, projiziere(K, netz([unten, oben], { zu: true, innen: (i, j) => [rand[j][0], 0, 0.03] }))));
  g.push(flaecheP(K, oben, hell(SO.c, 0.32)));
  // Zehenmulde und Fersenmulde
  g.push(flaecheP(K, oben.map(([x, y, z]) => [x * 0.92 + 0.04, y * 0.78, z + 0.001]), hell(SO.c, 0.42)));
  g.push(polylinie(K, sohlenLinie({ ...L, zb: () => 0, zs: h, w: (x) => L.w(x) * 1.03 }, 0.5, 1.05), dunkel(SO.c, 0.35), 0.4, { dash: '0.8 0.6' }));
  // Riemen als Bögen über den Fuß
  const riemen = (x, b, hoch) => {
    const r1 = [], r2 = [];
    for (let j = 0; j <= 16; j++) {
      const s = -1 + 2 * j / 16, th = s * Math.PI / 2;
      const y = Math.sign(Math.sin(th)) * Math.pow(Math.abs(Math.sin(th)), 0.75) * ws(x) * 1.02, z = h(x) + hoch * Math.pow(Math.abs(Math.cos(th)), 0.75);
      r1.push([x - b / 2, y, z]); r2.push([x + b / 2, y, z]);
    }
    return { v: netz([r1, r2], { innen: () => [x, 0, h(x)] }), r1, r2 };
  };
  if (form === 'keil') for (let i = 1; i < 6; i++) g.push(polylinie(K, sohlenLinie({ ...L, zb: () => 0, zs: h, w: (x) => L.w(x) * 1.08 }, i / 6, 1.0), dunkel(SO.c, 0.3), 0.35, { op: 0.6 }));
  if (form === 'pantolette') {
    const r = riemen(0.6, 0.26, 0.16);
    g.push(koerper(S, projiziere(K, r.v)));
    g.push(polylinie(K, r.r1.map(([x, y, z]) => [x + 0.015, y, z + 0.004]), hell(S.c, 0.35), 0.45, { dash: '0.8 0.6' }), polylinie(K, r.r2.map(([x, y, z]) => [x - 0.015, y, z + 0.004]), hell(S.c, 0.35), 0.45, { dash: '0.8 0.6' }));
    t.push(...g); return;
  }
  if (form === 'zehentrenner') {
    const steg = [0.86, 0, h(0.86)], li = [0.56, ws(0.56) * 0.98, h(0.56)], re = [0.56, -ws(0.56) * 0.98, h(0.56)], top = [0.68, 0, h(0.68) + 0.12];
    for (const e of [li, re]) g.push(polylinie(K, [top, e], dunkel(S.c, 0.4), 3), polylinie(K, [top, e], S.c, 2.1));
    g.push(polylinie(K, [steg, top], dunkel(S.c, 0.4), 2), polylinie(K, [steg, top], S.c, 1.3));
    const [bx, by] = K.P(top); g.push(`<circle cx="${f(bx)}" cy="${f(by)}" r="1.5" fill="#c9a24a"/>`);
    t.push(...g); return;
  }
  if (form === 'keil') {
    // Keilsandalette: breites Kreuzband vorn, Knöchelriemen mit Schnalle
    const a = riemen(0.66, 0.16, 0.15);
    g.push(koerper(S, projiziere(K, a.v)));
    g.push(polylinie(K, a.r1.map(([x, y, z]) => [x + 0.012, y, z + 0.004]), hell(S.c, 0.35), 0.45, { dash: '0.8 0.6' }));
    const fr = []; for (let j = 0; j <= 20; j++) { const w = -Math.PI / 2 + Math.PI * j / 20, c = Math.cos(w); fr.push([0.3 - 0.32 * c, Math.sin(w) * ws(0.12) * 1.02, h(0.2) + 0.12 * Math.pow(c, 0.6)]); }
    g.push(polylinie(K, fr, dunkel(S.c, 0.4), 2.4), polylinie(K, fr, S.c, 1.6));
    const [bx, by] = K.P(fr[15]); g.push(`<rect x="${f(bx - 1.3)}" y="${f(by - 1.5)}" width="2.6" height="3" rx="0.4" fill="none" stroke="#c9a24a" stroke-width="0.8"/>`);
    t.push(...g); return;
  }
  const liste = form === 'riemchen' ? [riemen(0.83, 0.035, 0.09), riemen(0.68, 0.035, 0.14), riemen(0.5, 0.035, 0.17)] : [riemen(0.5, 0.09, 0.17), riemen(0.74, 0.1, 0.13)];
  if (form === 'riemchen') {
    // Fersenriemen: Bogen hinter der Ferse
    // setzt seitlich bei x 0,24 am Fußbett an und läuft 0,1 hoch um die Ferse
    const fr = []; for (let j = 0; j <= 20; j++) { const a = -Math.PI / 2 + Math.PI * j / 20, c = Math.cos(a); fr.push([0.24 - 0.26 * c, Math.sin(a) * ws(0.12) * 1.02, h(0.1) + 0.02 + 0.1 * Math.pow(c, 0.6)]); }
    g.push(polylinie(K, fr, dunkel(S.c, 0.4), 2.2), polylinie(K, fr, S.c, 1.4));
  }
  for (const r of liste) {
    g.push(koerper(S, projiziere(K, r.v)));
    g.push(polylinie(K, r.r1.map(([x, y, z]) => [x + 0.012, y, z + 0.004]), hell(S.c, 0.35), 0.4, { dash: '0.8 0.6' }), polylinie(K, r.r2.map(([x, y, z]) => [x - 0.012, y, z + 0.004]), hell(S.c, 0.35), 0.4, { dash: '0.8 0.6' }));
    if (form === 'riemchen') continue;
    // Schnalle außen
    const a = r.r1[13], b = r.r2[13];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    g.push(flaecheP(K, [[m[0] - 0.05, m[1] + 0.01, m[2] + 0.03], [m[0] + 0.05, m[1] + 0.01, m[2] + 0.03], [m[0] + 0.05, m[1] + 0.02, m[2] - 0.035], [m[0] - 0.05, m[1] + 0.02, m[2] - 0.035]], 'none', { stroke: '#c9a24a', w: 1.2 }));
    g.push(polylinie(K, [[m[0], m[1] + 0.012, m[2] + 0.03], [m[0], m[1] + 0.02, m[2] - 0.035]], '#a8832f', 0.7));
  }
  t.push(...g);
}

// Fertige Zeichner für die Erweiterung
export const SCHUH_ZEICHNER = {
  q28schuh: (S, t, p) => {
    const q = { ...ARTEN[p.schuh], ...p };
    if (!q.paar) return zeichneSchuh(S, t, p);
    // Paar: zweiter Schuh dahinter, leicht versetzt und kleiner
    const hinten = [], vorn = [];
    zeichneSchuh(S, hinten, p, { pos: { x: 58, y: 44, b: 66, h: 60 } });
    zeichneSchuh(S, vorn, p, { pos: { x: 44, y: 58, b: 72, h: 64 } });
    t.push(`<g opacity="0.97">${hinten.join('')}</g>`, `<g>${vorn.join('')}</g>`);
  },
  q28sandale: (S, t, p) => zeichneSandale(S, t, p),
};
export const SCHUH_ARTEN = Object.keys(ARTEN);
