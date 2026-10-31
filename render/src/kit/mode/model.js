// Q25: Model-Figuren, die Eigenmarken-Ware tragen. Flache Modeillustration, Licht von links.
// Reine Funktionen, kein DOM. modelSVG({ geschlecht, zielgruppe, haut, haar, outfit }) → SVG-String (viewBox 0 0 200 420).
//
// Körper und Kleidung entstehen aus denselben Ankerpunkten (Vorlage je Geschlecht, umgerechnet je Zielgruppe)
// und werden als glatte Kurven gezeichnet (Catmull-Rom → Bézier).

import { hell, dunkel, materialDefs, flaeche } from './stoff.js';
import { musterFuellung } from './q37-muster.js';

export const ZIELGRUPPEN = ['kinder', 'teens', 'young', 'adults', 'bestager'];
export const HAUT = ['#f3d6c1', '#e6b994', '#c98f68', '#9a6546', '#6b4330'];
export const HAAR = { blond: '#d8b46e', dunkelblond: '#a8844f', aschblond: '#b9a27a', hellbraun: '#9a6a3e', braun: '#5a3b26', schwarz: '#26211e', rot: '#a8522d', grau: '#b7b4ae', weiss: '#e6e4de' };

const f = (n) => Math.round(n * 10) / 10;

// ─────────────────────────────────────────── glatte Kurven
// Punkte [[x,y],…] → geschlossener oder offener Pfad durch alle Punkte. Punkt mit drittem Wert 'ecke' bleibt spitz.
export function glatt(pts, zu = true, spannung = 0.5) {
  const n = pts.length;
  const get = (i) => (zu ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const ende = zu ? n : n - 1;
  for (let i = 0; i < ende; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const k1 = p1[2] === 'ecke' ? 0 : spannung / 3, k2 = p2[2] === 'ecke' ? 0 : spannung / 3;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return zu ? d + ' Z' : d;
}
const spiegelX = (pts) => pts.map(([x, y, e]) => [200 - x, y, e]);
const E = 'ecke';

// ─────────────────────────────────────────── Vorlagen (rechte Körperhälfte im Bild = x > 100)
// Alle Maße für „young“; andere Zielgruppen werden daraus umgerechnet.
const VORLAGE = {
  damen: {
    kopf: { y: 50, rx: 12.6, ry: 16.4 }, kinn: 66, hals: { b: 5.2, y0: 63, y1: 79 },
    schulter: [[106, 78], [117, 81], [125.5, 86]],
    torso: [[125.5, 86], [124, 100], [122.5, 116], [116.5, 140], [114.5, 150], [119.5, 168], [124.5, 186], [123.5, 198]],
    schritt: [100, 207],
    beinA: [[124.5, 186], [124, 214], [120.5, 246], [115.5, 280], [116.5, 300], [114, 340], [108.6, 388]],
    beinI: [[101.6, 207], [104.5, 236], [105.4, 262], [104.6, 282], [103.6, 302], [104.2, 340], [103.2, 388]],
    armA: [[125.5, 86], [130.5, 98], [131.5, 120], [132.6, 142], [134, 166], [135.4, 186]],
    armI: [[119.5, 104], [122.5, 124], [124.5, 144], [127.8, 166], [130, 186]],
    hand: [132.7, 186], fuss: 397,
    marken: { brust: 116, taille: 148, huefte: 186, schritt: 207, knie: 281, knoechel: 386, ellbogen: 143, handgelenk: 186, schulterY: 84 },
  },
  herren: {
    kopf: { y: 48, rx: 13, ry: 16.6 }, kinn: 64, hals: { b: 6.6, y0: 61, y1: 78 },
    schulter: [[107, 77], [121, 80], [132, 86]],
    torso: [[132, 86], [130.5, 100], [128, 118], [123.5, 142], [122.5, 154], [123.5, 170], [123.5, 188], [122.5, 200]],
    schritt: [100, 210],
    beinA: [[123.5, 188], [124.5, 214], [121.5, 248], [117.5, 283], [118.5, 303], [116, 343], [110, 389]],
    beinI: [[101.8, 210], [104.6, 238], [105.6, 264], [104.8, 285], [103.8, 305], [104.4, 343], [103.4, 389]],
    armA: [[132, 86], [137, 100], [137.5, 122], [137.8, 146], [138.6, 170], [139.6, 190]],
    armI: [[125.5, 106], [127.5, 126], [129.5, 148], [131.8, 170], [133.6, 190]],
    hand: [136.6, 190], fuss: 398,
    marken: { brust: 116, taille: 152, huefte: 188, schritt: 210, knie: 284, knoechel: 387, ellbogen: 147, handgelenk: 190, schulterY: 84 },
  },
};

// Umrechnung je Zielgruppe: Höhe (ohne Kopf), Kopfgröße, Breiten je Zone
const ALTER = {
  kinder: { h: 0.62, kopf: 0.92, breit: { schulter: 0.6, taille: 0.66, huefte: 0.64, bein: 0.62, arm: 0.62 } },
  teens: { h: 0.92, kopf: 1.0, breit: { schulter: 0.9, taille: 0.9, huefte: 0.9, bein: 0.88, arm: 0.88 } },
  young: { h: 1, kopf: 1, breit: { schulter: 1, taille: 1, huefte: 1, bein: 1, arm: 1 } },
  adults: { h: 1, kopf: 1, breit: { schulter: 1.0, taille: 1.04, huefte: 1.02, bein: 1.0, arm: 1.02 } },
  bestager: { h: 0.97, kopf: 1, breit: { schulter: 0.98, taille: 1.12, huefte: 1.05, bein: 1.0, arm: 1.02 } },
};

// Alltagsproportionen (Ummo 21.10.: „sehen aus wie Slender“): breiter, Beine kürzer, Kopf größer, ca. 7,5 Kopflängen
const BREITE = 1.12, BEINE = 0.86, KOPF = 1.4, BODEN = 404;
function alltag(V) {
  const s = V.marken.schritt, sNeu = BODEN - (BODEN - s) * BEINE, shift = sNeu - s;
  const Y = (y) => (y <= s ? y + shift : BODEN - (BODEN - y) * BEINE);
  const P = (pts) => pts.map(([x, y, e]) => [100 + (x - 100) * BREITE, Y(y), e]);
  return {
    kopf: { y: V.kopf.y + shift, rx: V.kopf.rx * KOPF, ry: V.kopf.ry * KOPF }, kinn: V.kinn + shift,
    hals: { b: V.hals.b * 1.18, y0: V.hals.y0 + shift, y1: V.hals.y1 + shift },
    schulter: P(V.schulter), torso: P(V.torso), schritt: [100, Y(V.schritt[1])], beinA: P(V.beinA), beinI: P(V.beinI).map(([x, y]) => [Math.max(100.6, x), y]),
    armA: P(V.armA), armI: P(V.armI), hand: P([V.hand])[0], fuss: Y(V.fuss),
    marken: Object.fromEntries(Object.entries(V.marken).map(([k, v]) => [k, Y(v)])),
  };
}
const ALLTAG = { damen: alltag(VORLAGE.damen), herren: alltag(VORLAGE.herren) };

function koerper(geschlecht, zielgruppe) {
  const V = ALLTAG[geschlecht === 'herren' ? 'herren' : 'damen'];
  const A = ALTER[zielgruppe] ?? ALTER.young;
  const boden = 404;
  const yT = (y) => boden - (boden - y) * A.h;
  const zone = (y) => (y < V.marken.brust ? 'schulter' : y < V.marken.huefte - 12 ? 'taille' : 'huefte');
  const xT = (x, y, z) => 100 + (x - 100) * A.breit[z ?? zone(y)];
  const T = (pts, z) => pts.map(([x, y, e]) => [xT(x, y, z), yT(y), e]);
  // Kopf: Kinn bleibt am transformierten Hals, Kopf wird um Faktor größer
  const kinn = yT(V.kinn);
  const ry = V.kopf.ry * A.kopf * (A.h < 1 ? 1 / Math.sqrt(A.h) * 0.82 : 1);
  const K = {
    geschlecht, zielgruppe, boden,
    kopf: { x: 100, y: kinn - ry * 0.98, rx: V.kopf.rx * ry / V.kopf.ry, ry },
    kinn, hals: { b: V.hals.b * A.breit.schulter, y0: kinn - 4, y1: yT(V.hals.y1) },
    schulter: T(V.schulter, 'schulter'), torso: T(V.torso), schritt: [100, yT(V.schritt[1])],
    beinA: T(V.beinA.map(([x, y], i) => [x + [0, 1.0, 1.4, 1.1, 1.2, 1.0, 0.7][i], y]), 'bein'), beinI: T(V.beinI, 'bein'), armA: T(V.armA, 'arm'), armI: T(V.armI, 'arm'),
    hand: [xT(V.hand[0], 0, 'arm'), yT(V.hand[1])], fuss: yT(V.fuss),
  };
  K.m = Object.fromEntries(Object.entries(V.marken).map(([k, v]) => [k, yT(v)]));
  // Hüftbreite für Kleidung
  K.breite = (y) => { // halbe Körperbreite bei Höhe y (Torso/Hüfte)
    const t = K.torso;
    for (let i = 0; i < t.length - 1; i++) if (y >= t[i][1] && y <= t[i + 1][1]) { const u = (y - t[i][1]) / (t[i + 1][1] - t[i][1] || 1); return t[i][0] + (t[i + 1][0] - t[i][0]) * u - 100; }
    return y < t[0][1] ? t[0][0] - 100 : t[t.length - 1][0] - 100;
  };
  K.beinAX = (y) => interp(K.beinA, y), K.beinIX = (y) => interp(K.beinI, y);
  // Haltung (Spielbein links im Bild): Knie 5,2 nach innen, Fuß 2,8 nach innen, Ferse 3,6 angehoben; rechts Standbein
  const glatt01 = (a, b, y) => { const u = Math.max(0, Math.min(1, (y - a) / (b - a))); return u * u * (3 - 2 * u); };
  const hY = K.m.huefte, kY = K.m.knie, fY = K.fuss, sk = (fY - hY) / 190;
  K.spiel = (y) => (y <= hY ? [0, 0] : [sk * (5.2 * glatt01(hY, kY, y) - 2.4 * glatt01(kY, fY, y)), sk * 3.6 * glatt01(kY, fY, y) ** 2]);
  K.bx = (s) => (pts) => pts.map(([x, y, e]) => { if (s > 0) return [x, y, e]; const [dx, dy] = K.spiel(y); return [200 - x + dx, y - dy, e]; });
  K.armAX = (y) => interp(K.armA, y), K.armIX = (y) => interp(K.armI, y);
  return K;
}
function interp(pts, y) {
  if (y <= pts[0][1]) return pts[0][0];
  for (let i = 0; i < pts.length - 1; i++) if (y <= pts[i + 1][1]) { const u = (y - pts[i][1]) / (pts[i + 1][1] - pts[i][1] || 1); return pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u; }
  return pts[pts.length - 1][0];
}

// ─────────────────────────────────────────── Körper
function koerperSVG(K, haut) {
  const hd = dunkel(haut, 0.12), hk = dunkel(haut, 0.32), hl = hell(haut, 0.12);
  const t = [];
  const bein = (s) => {
    const sp = K.bx(s);
    const pts = [...sp(K.beinA), [sp([[K.beinA.at(-1)[0] - 1, K.fuss]])[0][0], K.fuss], [sp([[K.beinI.at(-1)[0] + 0.5, K.fuss]])[0][0], K.fuss], ...sp([...K.beinI].reverse())];
    return glatt(pts);
  };
  const arm = (s) => {
    const sp = s > 0 ? (p) => p : spiegelX;
    return glatt([...sp(K.armA), ...sp([...K.armI].reverse()), ...sp([[K.armI[0][0] - 4, K.armI[0][1] - 10]])]);
  };
  // hinten liegende (rechte) Gliedmaßen dunkler
  t.push(`<path d="${bein(1)}" fill="${haut}"/>`, `<path d="${arm(1)}" fill="${haut}"/>`);
  t.push(`<path d="${bein(-1)}" fill="${haut}"/>`);
  const torso = glatt([...spiegelX([...K.torso].reverse()), ...K.torso.slice(1), [100, K.schritt[1] - 1]].filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]));
  t.push(`<path d="${torso}" fill="${haut}"/>`);
  t.push(`<path d="${glatt([...spiegelX([...K.schulter].reverse()), ...K.schulter, [K.schulter.at(-1)[0] - 6, K.schulter.at(-1)[1] + 14], [200 - K.schulter.at(-1)[0] + 6, K.schulter.at(-1)[1] + 14]])}" fill="${haut}"/>`);
  t.push(`<path d="${arm(-1)}" fill="${haut}"/>`);
  // Hals mit Schatten unter dem Kinn
  t.push(`<path d="M${f(100 - K.hals.b)} ${f(K.hals.y0)} L${f(100 + K.hals.b)} ${f(K.hals.y0)} L${f(100 + K.hals.b + 1)} ${f(K.hals.y1)} L${f(100 - K.hals.b - 1)} ${f(K.hals.y1)} Z" fill="${haut}"/>`);
  t.push(`<path d="M${f(100 - K.hals.b)} ${f(K.hals.y0)} Q100 ${f(K.hals.y0 + 7)} ${f(100 + K.hals.b)} ${f(K.hals.y0)} Z" fill="${hd}"/>`);
  // Kopf
  const { x, y, rx, ry } = K.kopf;
  const kopf = glatt([[x, y - ry], [x + rx, y - ry * 0.35], [x + rx * 0.86, y + ry * 0.42], [x + rx * 0.3, y + ry * 0.93], [x, y + ry], [x - rx * 0.3, y + ry * 0.93], [x - rx * 0.86, y + ry * 0.42], [x - rx, y - ry * 0.35]]);
  t.push(`<path d="${kopf}" fill="${haut}"/>`);
  t.push(`<path d="${glatt([[x + rx * 0.2, y - ry * 0.95], [x + rx, y - ry * 0.35], [x + rx * 0.86, y + ry * 0.42], [x + rx * 0.3, y + ry * 0.93], [x + rx * 0.55, y + ry * 0.2]])}" fill="${hd}" opacity="0.5"/>`);
  for (const s of [-1, 1]) t.push(`<ellipse cx="${f(x + s * rx * 0.98)}" cy="${f(y + ry * 0.05)}" rx="${f(rx * 0.14)}" ry="${f(ry * 0.16)}" fill="${s > 0 ? hd : haut}"/>`);
  // Gesicht
  const ay = y + ry * 0.04, ax = rx * 0.38, aug = Math.max(1.1, rx * 0.1);
  for (const s of [-1, 1]) {
    t.push(`<ellipse cx="${f(x + s * ax)}" cy="${f(ay)}" rx="${f(aug * 0.95)}" ry="${f(aug * 1.2)}" fill="#2b2522"/>`);
    t.push(`<circle cx="${f(x + s * ax - aug * 0.3)}" cy="${f(ay - aug * 0.4)}" r="${f(aug * 0.3)}" fill="#fff" opacity="0.8"/>`);
    t.push(`<path d="M${f(x + s * ax - rx * 0.2)} ${f(ay - ry * 0.22)} Q${f(x + s * ax)} ${f(ay - ry * 0.3)} ${f(x + s * ax + rx * 0.2)} ${f(ay - ry * 0.21)}" stroke="${hk}" stroke-width="${f(rx * 0.07)}" fill="none" stroke-linecap="round"/>`);
    t.push(`<ellipse cx="${f(x + s * rx * 0.55)}" cy="${f(y + ry * 0.36)}" rx="${f(rx * 0.16)}" ry="${f(ry * 0.07)}" fill="#e88a7a" opacity="0.22"/>`);
  }
  t.push(`<path d="M${f(x + 0.3)} ${f(y + ry * 0.12)} Q${f(x + rx * 0.14)} ${f(y + ry * 0.36)} ${f(x - rx * 0.06)} ${f(y + ry * 0.4)}" stroke="${hk}" stroke-width="0.8" fill="none" stroke-linecap="round" opacity="0.6"/>`);
  t.push(`<path d="M${f(x - rx * 0.26)} ${f(y + ry * 0.58)} Q${f(x)} ${f(y + ry * 0.7)} ${f(x + rx * 0.26)} ${f(y + ry * 0.58)}" stroke="${dunkel(haut, 0.4)}" stroke-width="1.1" fill="${K.geschlecht === 'damen' ? '#c9706a' : 'none'}" stroke-linecap="round"/>`);
  if (K.zielgruppe === 'bestager') t.push(`<path d="M${f(x - rx * 0.62)} ${f(ay + ry * 0.12)} q${f(rx * 0.12)} ${f(ry * 0.08)} ${f(rx * 0.24)} 0 M${f(x + rx * 0.38)} ${f(ay + ry * 0.12)} q${f(rx * 0.12)} ${f(ry * 0.08)} ${f(rx * 0.24)} 0" stroke="${hk}" stroke-width="0.5" fill="none" opacity="0.6"/>`);
  return t.join('');
}

// Hände: Handrücken nach außen, Daumen zur Körpermitte, Finger geschlossen, Länge ≈ 0,75 × Kopfhöhe
function haendeSVG(K, haut) {
  const hd = dunkel(haut, 0.14), t = [];
  const w = Math.max(3.6, K.armAX(K.m.handgelenk) - K.armIX(K.m.handgelenk)) / 5.0;
  const [hx, hy] = K.hand;
  for (const s of [1, -1]) {
    const sp = s > 0 ? (p) => p : spiegelX;
    const P = (dx, dy, e) => [hx + dx * w, hy + dy * w, e];
    const d = glatt(sp([P(-2.6, -1.2), P(2.7, -1.2), P(3.4, 3.4), P(3.1, 8.6), P(2, 11.6), P(0.2, 12.4), P(-1.4, 11.2), P(-2.2, 8.4), P(-3.3, 6.6), P(-4.4, 4.6), P(-3.9, 3.2), P(-2.6, 3.6)]), true, 0.5);
    t.push(`<path d="${d}" fill="${haut}"/>`, `<path d="${d}" fill="none" stroke="${hd}" stroke-width="0.4" opacity="0.7"/>`);
    const [[ax, ay]] = sp([P(-2.2, 6.8)]), [[bx, by]] = sp([P(-1, 4.2)]);
    t.push(`<path d="M${f(ax)} ${f(ay)} Q${f(bx)} ${f(by)} ${f(sp([P(0.4, 3.4)])[0][0])} ${f(hy + 3.4 * w)}" stroke="${hd}" stroke-width="0.45" fill="none" opacity="0.8"/>`);
    for (const fx of [0.7, 1.9]) { const [[x1, y1]] = sp([P(fx, 8.6)]), [[x2, y2]] = sp([P(fx - 0.2, 11.6)]); t.push(`<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${hd}" stroke-width="0.35" opacity="0.6"/>`); }
  }
  return t.join('');
}

// ─────────────────────────────────────────── Haare
function haarSVG(K, farbe, stil, hinten) {
  const { x, y, rx, ry } = K.kopf, c = farbe, cD = dunkel(c, 0.22), cL = hell(c, 0.2);
  const t = [];
  if (hinten) {
    if (stil === 'lang') t.push(`<path d="${glatt([[x - rx * 1.05, y - ry * 0.3], [x - rx * 1.2, y + ry * 0.9], [x - rx * 1.25, K.m.brust - 4], [x - rx * 0.6, K.m.brust + 2], [x + rx * 0.6, K.m.brust + 2], [x + rx * 1.25, K.m.brust - 4], [x + rx * 1.2, y + ry * 0.9], [x + rx * 1.05, y - ry * 0.3]])}" fill="${cD}"/>`);
    if (stil === 'zopf') t.push(`<path d="${glatt([[x + rx * 0.8, y + ry * 0.1], [x + rx * 1.5, y + ry * 0.6], [x + rx * 1.4, y + ry * 1.6], [x + rx * 1.0, y + ry * 2.1], [x + rx * 0.9, y + ry * 1.4], [x + rx * 0.7, y + ry * 0.6]])}" fill="${cD}"/>`);
    if (stil === 'dutt') t.push(`<circle cx="${x}" cy="${f(y - ry * 1.02)}" r="${f(rx * 0.48)}" fill="${cD}"/>`);
    if (stil === 'bob') t.push(`<path d="${glatt([[x - rx * 1.12, y - ry * 0.2], [x - rx * 1.18, y + ry * 0.75], [x, y + ry * 0.9], [x + rx * 1.18, y + ry * 0.75], [x + rx * 1.12, y - ry * 0.2]])}" fill="${cD}"/>`);
    return t.join('');
  }
  if (stil === 'kurz' || stil === 'seitenscheitel') {
    const kappe = [[x - rx * 1.04, y + ry * 0.02], [x - rx * 1.06, y - ry * 0.55], [x - rx * 0.4, y - ry * 1.1], [x + rx * 0.5, y - ry * 1.08], [x + rx * 1.06, y - ry * 0.55], [x + rx * 1.04, y + ry * 0.02, E], [x + rx * 0.86, y - ry * 0.38], [x + rx * 0.1, y - ry * (stil === 'seitenscheitel' ? 0.62 : 0.55)], [x - rx * 0.6, y - ry * 0.5], [x - rx * 0.9, y - ry * 0.3]];
    t.push(`<path d="${glatt(kappe)}" fill="${c}"/>`);
    t.push(`<path d="M${f(x - rx * 0.5)} ${f(y - ry * 0.85)} Q${f(x + rx * 0.1)} ${f(y - ry * 1.02)} ${f(x + rx * 0.7)} ${f(y - ry * 0.72)}" stroke="${cL}" stroke-width="1.4" fill="none" opacity="0.55" stroke-linecap="round"/>`);
  } else if (stil === 'locken') {
    for (let i = 0; i < 11; i++) { const a = Math.PI * (1.0 + i * 0.1); t.push(`<circle cx="${f(x + Math.cos(a) * rx * 1.02)}" cy="${f(y - ry * 0.12 + Math.sin(a) * ry * 0.92)}" r="${f(rx * 0.32)}" fill="${i % 2 ? c : cD}"/>`); }
  } else {
    // Mittelscheitel für lang/zopf/dutt/bob
    const tief = stil === 'bob' ? 0.6 : stil === 'lang' ? 0.5 : 0.1;
    t.push(`<path d="${glatt([[x - rx * 1.1, y + ry * tief], [x - rx * 1.12, y - ry * 0.55], [x - rx * 0.4, y - ry * 1.1], [x + rx * 0.4, y - ry * 1.1], [x + rx * 1.12, y - ry * 0.55], [x + rx * 1.1, y + ry * tief, E], [x + rx * 0.9, y - ry * 0.25], [x + rx * 0.3, y - ry * 0.72], [x, y - ry * 0.82, E], [x - rx * 0.3, y - ry * 0.72], [x - rx * 0.9, y - ry * 0.25]])}" fill="${c}"/>`);
    t.push(`<path d="M${f(x - rx * 0.2)} ${f(y - ry * 0.95)} Q${f(x - rx * 0.8)} ${f(y - ry * 0.7)} ${f(x - rx * 0.98)} ${f(y - ry * 0.1)}" stroke="${cL}" stroke-width="1.3" fill="none" opacity="0.5" stroke-linecap="round"/>`);
    if (stil === 'lang') for (const s of [-1, 1]) t.push(`<path d="${glatt([[x + s * rx * 1.1, y + ry * 0.2], [x + s * rx * 1.18, y + ry * 1.0], [x + s * rx * 1.0, K.m.brust - 2], [x + s * rx * 0.75, K.m.brust - 6], [x + s * rx * 0.95, y + ry * 0.8]])}" fill="${s > 0 ? cD : c}"/>`);
  }
  return t.join('');
}

// ─────────────────────────────────────────── Kleidung
// Oberteile: o = { aermel: ohne|kurz|halb|lang, passform: tailliert|gerade|oversize, laenge: crop|normal|lang|tunika, ausschnitt: rund|v|carree|kragen|stehkragen, kapuze, kaenguru, rippbund, knopfleiste }
function oberteil(K, S, o) {
  const plus = o.passform === 'oversize' ? 6 : o.passform === 'tailliert' ? 2.4 : 3.4;
  const unten = o.rock ? o.rock.ende : o.laenge === 'taille' ? K.m.taille + 4 : o.laenge === 'crop' ? K.m.taille - 2 : o.laenge === 'lang' ? K.m.huefte + 8 : o.laenge === 'tunika' ? K.m.schritt + 12 : K.m.huefte - 2;
  const sw = K.schulter.at(-1);
  const off = o.ausschnitt === 'offshoulder';
  const t = [];
  // Ärmel
  for (const s of [-1, 1]) {
    if (o.aermel === 'ohne') continue;
    const sp = s > 0 ? (p) => p : spiegelX;
    const yEnde = o.aermel === 'kurz' ? K.m.schulterY + 20 : o.aermel === 'halb' ? K.m.ellbogen + 4 : K.m.handgelenk - 2;
    const weit = o.passform === 'oversize' ? 4 : 1.6;
    const aussen = K.armA.filter((p) => p[1] < yEnde).map(([x, y]) => [x + weit + (y - K.m.schulterY) * 0.02, y]);
    const innen = K.armI.filter((p) => p[1] < yEnde).map(([x, y]) => [x - weit * 0.6, y]).reverse();
    const ax = K.armAX(yEnde) + weit, ix = K.armIX(yEnde) - weit * 0.6;
    const pts = [off ? [sw[0] - 1, K.m.schulterY + 8] : [sw[0] - 2, sw[1] - 2], ...aussen.slice(1), [ax + (o.aermel === 'kurz' ? 1.5 : 0.5), yEnde, E], [ix - (o.aermel === 'kurz' ? 1 : 0), yEnde + 1, E], ...innen, [K.armI[0][0] - 6, K.armI[0][1] - 6]];
    t.push(flaeche(S, glatt(sp(pts))));
    if (o.aermel === 'lang' && (o.rippbund || o.buendchen)) t.push(flaeche(S, glatt(sp([[ix, yEnde - 6, E], [ax, yEnde - 6, E], [ax, yEnde + 0.5, E], [ix, yEnde + 1, E]])), { ton: -0.1 }));
  }
  // Rumpf
  const rechts = [];
  rechts.push([sw[0] + 1, sw[1] - 1.5]);
  rechts.push([K.armI[0][0] + plus * 0.4, K.armI[0][1] - 2]);
  if (o.rock) { for (const y of [K.m.brust, K.m.taille]) rechts.push([100 + K.breite(y) + plus, y]); rechts.push(...o.rock.pts); }
  else {
    for (const y of [K.m.brust, K.m.taille, K.m.taille + 11, K.m.taille + 22, K.m.huefte - 6, unten]) if (y < unten - 3 || y === unten) rechts.push([100 + Math.max(K.breite(y) + plus, o.passform === 'oversize' ? K.breite(K.m.brust) + plus : 0), y]);
    rechts[rechts.length - 1][2] = E;
  }
  const halsB = off ? K.breite(K.m.brust) + 3 : K.hals.b + (o.ausschnitt === 'carree' ? 6 : o.ausschnitt === 'v' ? 3.5 : 2.4);
  const halsT = o.ausschnitt === 'v' ? K.m.brust - 6 : o.ausschnitt === 'carree' ? K.m.schulterY + 8 : off ? K.m.schulterY + 9 : K.hals.y1 + 2;
  const pts = [
    ...(off ? [[100 + halsB, halsT, E]] : [[100 + halsB, K.hals.y1 - 3, E], [K.schulter[1][0] + 1, K.schulter[1][1] - 1.5]]), ...(off ? rechts.slice(2) : rechts),
    [100, unten + (o.rock ? 2.5 : 1.5)],
    ...spiegelX([...(off ? rechts.slice(2) : rechts)].reverse()), ...(off ? [[100 - halsB, halsT, E]] : [[200 - K.schulter[1][0] - 1, K.schulter[1][1] - 1.5], [100 - halsB, K.hals.y1 - 3, E]]),
    ...(off ? [] : o.ausschnitt === 'v' ? [[100, halsT, E]] : o.ausschnitt === 'carree' ? [[100 - halsB, halsT, E], [100 + halsB, halsT, E]] : [[100 - halsB * 0.6, halsT - 0.5], [100, halsT + 0.8], [100 + halsB * 0.6, halsT - 0.5]]),
  ];
  t.push(flaeche(S, glatt(pts, true, 0.4)));
  // Falten, Details
  if (off) t.push(flaeche(S, glatt([[100 - halsB - 3, halsT - 1, E], [100 + halsB + 3, halsT - 1, E], [100 + halsB + 2, halsT + 7], [100, halsT + 9], [100 - halsB - 2, halsT + 7]]), { ton: 0.06 }));
  t.push(`<path d="M${f(100 - K.breite(K.m.taille) - plus + 3)} ${f(K.m.brust + 6)} q2 ${f((K.m.taille - K.m.brust) * 0.6)} -1 ${f((unten - K.m.brust) * 0.8)}" stroke="${S.cD}" stroke-width="0.7" fill="none" opacity="0.6"/>`);
  if (o.ausschnitt === 'rund' || !o.ausschnitt) t.push(`<path d="M${f(100 - halsB)} ${f(K.hals.y1 - 3)} Q100 ${f(halsT + 3.5)} ${f(100 + halsB)} ${f(K.hals.y1 - 3)}" stroke="${S.cD}" stroke-width="1.8" fill="none"/>`);
  if (o.kapuze) t.push(flaeche(S, glatt([[100 - halsB - 7, K.hals.y1 - 4], [100 - halsB - 9, K.m.schulterY + 6], [100, K.m.schulterY + 10], [100 + halsB + 9, K.m.schulterY + 6], [100 + halsB + 7, K.hals.y1 - 4], [100, K.hals.y1 + 4]]), { ton: -0.07 }), `<path d="M${f(100 - 3)} ${f(K.hals.y1 + 4)} l-1 14 M${f(100 + 3)} ${f(K.hals.y1 + 4)} l1 13" stroke="${hell(S.c, 0.5)}" stroke-width="0.9"/>`);
  if (o.kaenguru) { const y0 = unten - (unten - K.m.taille) * 0.75; t.push(`<path d="${glatt([[100 - 14, y0, E], [100 + 14, y0, E], [100 + 18, unten - 7, E], [100 - 18, unten - 7, E]])}" fill="none" stroke="${S.cD}" stroke-width="1"/>`); }
  if (o.rippbund && o.laenge !== 'crop' && !o.rock) { const b = K.breite(unten) + plus; t.push(flaeche(S, glatt([[100 - b, unten - 6, E], [100 + b, unten - 6, E], [100 + b, unten, E], [100, unten + 1.5], [100 - b, unten, E]]), { ton: -0.1 })); }
  if (o.knopfleiste) { t.push(`<path d="M100.8 ${f(halsT)} L100.8 ${f(unten)}" stroke="${S.cD}" stroke-width="0.8"/>`); for (let y = halsT + 7; y < unten - 4; y += 11) t.push(`<circle cx="102.2" cy="${f(y)}" r="1.15" fill="${hell(S.c, 0.4)}" stroke="${S.cD}" stroke-width="0.35"/>`); }
  if (o.ausschnitt === 'kragen' || o.kragen) for (const s of [-1, 1]) t.push(flaeche(S, glatt([[100 + s * (K.hals.b + 1), K.hals.y0 + 2, E], [100 + s * 1, K.hals.y1 + 2, E], [100 + s * 4, K.hals.y1 + 9, E], [100 + s * (K.hals.b + 9), K.m.schulterY + 1, E]]), { ton: s < 0 ? 0.08 : -0.03 }));
  return t.join('');
}

// Unterteile: o = { laenge: kurz|bermuda|cropped|lang, passform: skinny|schmal|gerade|weit|baggy|flare, leibhoehe: hoch|normal|tief, saum: offen|umschlag, cargo, bundfalte, komfortbund, knopf, latz, streifen, paperbag }
function hose(K, S, o) {
  const t = [];
  const bund = K.m.taille + (o.leibhoehe === 'hoch' || o.paperbag ? -3 : o.leibhoehe === 'tief' ? 12 : 4);
  const ende = o.laenge === 'kurz' ? K.m.schritt + (K.m.knie - K.m.schritt) * 0.22 : o.laenge === 'bermuda' ? K.m.knie - 3 : o.laenge === 'cropped' ? K.m.knoechel - 24 : K.fuss - 2;
  const weit = { skinny: 0.4, schmal: 1.6, gerade: 3.2, weit: 6.5, baggy: 9, flare: 2.4 }[o.passform ?? 'gerade'] ?? 3.2;
  const bw = K.breite(bund) + 1.6;
  for (const s of [-1, 1]) {
    const sp = K.bx(s);
    const Q = (x, y) => { const [[a, b]] = sp([[x, y]]); return `${f(a)} ${f(b)}`; };
    const aussen = [], innen = [];
    const ys = [bund, ...[K.m.taille + 11, K.m.taille + 22].filter((y) => y > bund + 4), K.m.huefte, (K.m.huefte + K.m.knie) / 2, K.m.knie, (K.m.knie + K.m.knoechel) / 2, K.m.knoechel - 2, ende].filter((y, i, a) => y <= ende && a.indexOf(y) === i).sort((a, b) => a - b);
    for (const y of ys) {
      let xa = y <= K.m.huefte ? 100 + K.breite(y) + 1.4 : K.beinAX(y) + weit * Math.min(1, (y - K.m.huefte) / 30 + 0.4);
      if (o.passform === 'flare' && y > K.m.knie) xa += (y - K.m.knie) / (K.m.knoechel - K.m.knie) * 6;
      if (o.passform === 'baggy' && y > K.m.knie) xa += 1.5;
      if (o.laenge === 'kurz' && y === ende) xa += 2.4;
      aussen.push([xa, y]);
      if (y >= K.schritt[1]) {
        let xi = K.beinIX(y) - Math.min(1.2, weit * 0.15);
        if (o.passform === 'flare' && y > K.m.knie) xi -= (y - K.m.knie) / (K.m.knoechel - K.m.knie) * 2.5;
        innen.push([Math.max(100.4, xi), o.laenge === 'kurz' && y === ende ? y - 2 : y]);
      }
    }
    if (!innen.length) innen.push([100.6, ende]);
    aussen[aussen.length - 1][2] = E; innen[innen.length - 1][2] = E;
    const pts = [[100, bund, E], ...aussen, ...innen.reverse(), [100.5, K.schritt[1] - 3]];
    t.push(flaeche(S, glatt(sp(pts), true, 0.35)));
    const xa = aussen.at(-1)[0], xi = innen[0][0], yi = innen[0][1];
    if (o.saum === 'offen') {
      t.push(`<path d="M${Q(xi, yi - 1.5)} L${Q(xa, ende - 1.5)}" stroke="${hell(S.c, 0.4)}" stroke-width="1.3" opacity="0.8"/>`);
      for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7; t.push(`<path d="M${Q(xi + (xa - xi) * u, yi + (ende - yi) * u - 0.5)} l0.3 2.4" stroke="${hell(S.c, 0.55)}" stroke-width="0.8" stroke-linecap="round"/>`); }
    }
    if (o.saum === 'umschlag') t.push(flaeche(S, glatt(sp([[xi - 0.5, yi - 5, E], [xa + 0.6, ende - 5, E], [xa + 0.6, ende + 0.5, E], [xi - 0.5, yi + 0.5, E]])), { ton: 0.1 }));
    if (o.cargo) { const y = (K.m.huefte + K.m.knie) / 2 + 2, x = K.beinAX(y) + weit; t.push(flaeche(S, glatt(sp([[x - 0.5, y - 9, E], [x - 10, y - 9, E], [x - 10, y + 9, E], [x - 0.5, y + 9, E]])), { ton: -0.07 }), `<path d="M${Q(x - 10, y - 5)} L${Q(x - 0.5, y - 5)}" stroke="${S.cK}" stroke-width="0.7"/>`); }
    if (o.streifen) t.push(`<path d="M${Q(100 + K.breite(bund + 6) + 1, bund + 6)} L${Q(K.beinAX(K.m.huefte) + weit * 0.6, K.m.huefte)} L${Q(xa - 1, ende - 1)}" stroke="#f4f3ef" stroke-width="1.6" fill="none"/>`);
    const mitte = (y) => (K.beinAX(y) + K.beinIX(y)) / 2;
    if (o.bundfalte || o.passform === 'weit') t.push(`<path d="M${Q(mitte(K.m.huefte), bund + 6)} L${Q(mitte(ende - 2), ende - 2)}" stroke="${S.cD}" stroke-width="0.7" opacity="0.6"/>`);
    if (S.denim) {
      t.push(`<path d="M${Q(100 + bw - 2.6, bund + 5)} Q${Q(100 + bw - 4, bund + 13)} ${Q(100 + 6, bund + 5.5)}" stroke="${S.naht}" stroke-width="0.7" stroke-dasharray="1.3 0.9" fill="none"/>`);
      t.push(`<path d="M${Q(xa - 1.2, K.m.huefte)} L${Q(xa - 1.2, ende - 2)}" stroke="${S.naht}" stroke-width="0.55" stroke-dasharray="1.3 0.9" opacity="0.7"/>`);
    }
  }
  t.push(`<path d="M100 ${f(K.schritt[1] - 12)} L100 ${f(K.schritt[1] - 2)}" stroke="${S.cK}" stroke-width="0.7" opacity="0.7"/>`);
  if (o.paperbag) {
    t.push(flaeche(S, glatt([[100 - bw - 1.5, bund - 5, E], [100 + bw + 1.5, bund - 5, E], [100 + bw + 0.6, bund + 1], [100 + bw, bund + 5, E], [100 - bw, bund + 5, E], [100 - bw - 0.6, bund + 1]]), { ton: 0.03 }));
    for (let x = -bw + 2; x < bw; x += 3) t.push(`<path d="M${f(100 + x)} ${f(bund - 4.6)} l0.4 3" stroke="${S.cD}" stroke-width="0.5" opacity="0.6"/>`);
    t.push(flaeche(S, glatt([[100 - bw, bund + 0.4, E], [100 + bw, bund + 0.4, E], [100 + bw, bund + 3.6, E], [100 - bw, bund + 3.6, E]]), { ton: -0.08 }));
    t.push(`<path d="M99 ${f(bund + 2)} l-4 8 M101 ${f(bund + 2)} l3.4 8.6" stroke="${S.cD}" stroke-width="2" stroke-linecap="round"/>`);
    return t.join('');
  }
  t.push(flaeche(S, glatt([[100 - bw - 0.3, bund, E], [100 + bw + 0.3, bund, E], [100 + bw + 0.5, bund + 5, E], [100 - bw - 0.5, bund + 5, E]]), { ton: o.komfortbund ? 0.04 : -0.07 }));
  if (o.komfortbund) t.push(`<path d="M${f(100 - bw)} ${f(bund + 2.5)} L${f(100 + bw)} ${f(bund + 2.5)}" stroke="${S.cD}" stroke-width="0.6" stroke-dasharray="0.7 0.7"/>`);
  else for (const x of [-bw + 3, -7, 7, bw - 3]) t.push(`<rect x="${f(100 + x - 0.8)}" y="${f(bund - 0.6)}" width="1.6" height="6.2" rx="0.4" fill="${S.cD}"/>`);
  if (S.denim || o.knopf) t.push(`<circle cx="100" cy="${f(bund + 2.5)}" r="1.4" fill="#caa34c" stroke="#8f6f2a" stroke-width="0.35"/>`, `<path d="M101.6 ${f(bund + 5)} Q102 ${f(K.schritt[1] - 10)} 104.6 ${f(K.schritt[1] - 13)}" stroke="${S.cD}" stroke-width="0.7" fill="none"/>`);
  if (o.bundfalte) for (const s of [-1, 1]) t.push(`<path d="M${f(100 + s * 8)} ${f(bund + 5)} l${s * 1.2} 12" stroke="${S.cD}" stroke-width="0.7"/>`);
  if (o.latz) {
    const lb = K.breite(K.m.brust) * 0.62, oy = K.m.brust - 2;
    t.push(flaeche(S, glatt([[100 - lb, bund + 1, E], [100 - lb, oy, E], [100 + lb, oy, E], [100 + lb, bund + 1, E]], true, 0.2)));
    t.push(flaeche(S, glatt([[100 - lb * 0.55, oy + 4, E], [100 + lb * 0.55, oy + 4, E], [100 + lb * 0.55, oy + 13, E], [100 - lb * 0.55, oy + 13, E]], true, 0.2), { ton: -0.05 }));
    for (const s of [-1, 1]) t.push(`<path d="M${f(100 + s * (lb - 2))} ${f(oy + 1)} L${f(100 + s * (K.breite(K.m.brust) - 1))} ${f(K.m.schulterY - 2)}" stroke="${S.cD}" stroke-width="3.2" stroke-linecap="round"/>`, `<circle cx="${f(100 + s * (lb - 2))}" cy="${f(oy + 2)}" r="1.4" fill="#caa34c"/>`);
  }
  return t.join('');
}

function rock(K, S, o) {
  const bund = K.m.taille + (o.leibhoehe === 'hoch' ? -2 : 3);
  const ende = o.laenge === 'mini' ? K.m.schritt + 12 : o.laenge === 'knie' ? K.m.knie + 4 : o.laenge === 'midi' ? K.m.knie + (K.m.knoechel - K.m.knie) * 0.5 : K.m.knoechel - 4;
  const ausstell = { bleistift: -2, etui: -1, gerade: 1.5, slip: 3, 'a-linie': 9, wickel: 8, plissee: 11, stufen: 12, glocke: 14 }[o.form ?? 'a-linie'] ?? 9;
  const hw = K.breite(K.m.huefte) + 2;
  const r = [[100 + K.breite(bund) + 1.5, bund, E], [100 + hw, K.m.huefte], [100 + hw + ausstell, ende, E]];
  const pts = [...r, [100 + (hw + ausstell) * 0.4, ende + 2.5], [100 - (hw + ausstell) * 0.4, ende + 2.5], ...spiegelX([...r].reverse())];
  const t = [flaeche(S, glatt(pts, true, 0.35))];
  if (o.form === 'plissee') for (let i = -6; i <= 6; i++) t.push(`<path d="M${f(100 + i * hw / 7)} ${f(K.m.huefte - 4)} L${f(100 + i * (hw + ausstell) / 7)} ${f(ende + 1.8)}" stroke="${i % 2 ? S.cD : hell(S.c, 0.14)}" stroke-width="${i % 2 ? 0.8 : 1.3}"/>`);
  else if (ausstell > 5) for (const i of [-3, -1, 2]) t.push(`<path d="M${f(100 + i * hw / 4)} ${f(K.m.huefte + 6)} Q${f(100 + i * (hw + ausstell) / 4)} ${f((K.m.huefte + ende) / 2)} ${f(100 + i * (hw + ausstell) / 3.6)} ${f(ende)}" stroke="${S.cD}" stroke-width="0.8" fill="none" opacity="0.6"/>`);
  t.push(flaeche(S, glatt([[100 - K.breite(bund) - 1.5, bund, E], [100 + K.breite(bund) + 1.5, bund, E], [100 + K.breite(bund) + 1.8, bund + 4.5, E], [100 - K.breite(bund) - 1.8, bund + 4.5, E]]), { ton: -0.09 }));
  if (o.latz) {
    const lb = K.breite(K.m.brust) * 0.62, oy = K.m.brust - 2;
    t.push(flaeche(S, glatt([[100 - lb, bund + 1, E], [100 - lb, oy, E], [100 + lb, oy, E], [100 + lb, bund + 1, E]], true, 0.2)));
    t.push(flaeche(S, glatt([[100 - lb * 0.55, oy + 4, E], [100 + lb * 0.55, oy + 4, E], [100 + lb * 0.55, oy + 13, E], [100 - lb * 0.55, oy + 13, E]], true, 0.2), { ton: 0.05 }));
    for (const s of [-1, 1]) t.push(`<path d="M${f(100 + s * (lb - 2))} ${f(oy + 1)} L${f(100 + s * (K.breite(K.m.brust) - 1))} ${f(K.m.schulterY - 2)}" stroke="${S.cD}" stroke-width="3.2" stroke-linecap="round"/>`, `<circle cx="${f(100 + s * (lb - 2))}" cy="${f(oy + 2)}" r="1.4" fill="${hell(S.c, 0.35)}"/>`);
  }
  return t.join('');
}

// Kleid in einem Stück: Oberteil und Rock als eine Fläche (keine Taillennaht), Rockfalten darüber
function kleid(K, S, o) {
  const ende = o.laenge === 'mini' ? K.m.schritt + 12 : o.laenge === 'knie' ? K.m.knie + 4 : o.laenge === 'midi' ? K.m.knie + (K.m.knoechel - K.m.knie) * 0.5 : K.m.knoechel - 4;
  const aus = { bleistift: -2, etui: -1, gerade: 1.5, slip: 3, 'a-linie': 9, wickel: 8, plissee: 11, stufen: 12, glocke: 14 }[o.form ?? 'a-linie'] ?? 9;
  const hw = K.breite(K.m.huefte) + 2;
  const rockPts = [[100 + hw, K.m.huefte], [100 + hw + aus, ende, E], [100 + (hw + aus) * 0.4, ende + 2.5]];
  const t = [oberteil(K, S, { aermel: o.aermel ?? 'ohne', ausschnitt: o.ausschnitt ?? 'v', passform: 'tailliert', kragen: o.kragen, knopfleiste: o.knopfleiste, rock: { ende, pts: rockPts } })];
  if (o.form === 'plissee') for (let i = -6; i <= 6; i++) t.push(`<path d="M${f(100 + i * hw / 7)} ${f(K.m.huefte - 4)} L${f(100 + i * (hw + aus) / 7)} ${f(ende + 1.8)}" stroke="${i % 2 ? S.cD : hell(S.c, 0.14)}" stroke-width="${i % 2 ? 0.8 : 1.3}"/>`);
  else if (aus > 5) for (const i of [-3, -1, 2]) t.push(`<path d="M${f(100 + i * hw / 4)} ${f(K.m.huefte + 6)} Q${f(100 + i * (hw + aus) / 4)} ${f((K.m.huefte + ende) / 2)} ${f(100 + i * (hw + aus) / 3.6)} ${f(ende)}" stroke="${S.cD}" stroke-width="0.8" fill="none" opacity="0.6"/>`);
  if (o.form === 'stufen') for (const u of [0.4, 0.72]) { const y = K.m.huefte + (ende - K.m.huefte) * u, w = hw + aus * u; t.push(`<path d="M${f(100 - w)} ${f(y)} Q100 ${f(y + 2)} ${f(100 + w)} ${f(y)}" stroke="${S.cD}" stroke-width="0.9" fill="none"/>`); }
  if (o.guertel) t.push(`<rect x="${f(100 - K.breite(K.m.taille) - 2)}" y="${f(K.m.taille - 3)}" width="${f(2 * K.breite(K.m.taille) + 4)}" height="4" rx="1" fill="${dunkel(S.c, 0.3)}"/>`);
  return t.join('');
}

// Jacken/Mäntel: o = { laenge: kurz|normal|mantel, revers, steppung, guertel, passform, kapuze }
function jacke(K, S, o) {
  const unten = o.laenge === 'kurz' ? K.m.huefte - 2 : o.laenge === 'mantel' ? K.m.knie + 8 : K.m.huefte + 14;
  const t = [];
  for (const s of [-1, 1]) {
    const sp = s > 0 ? (p) => p : spiegelX;
    const weit = 3;
    const aussen = K.armA.map(([x, y]) => [x + weit, y]);
    const innen = K.armI.map(([x, y]) => [x - weit * 0.6, y]).reverse();
    if (!o.weste) t.push(flaeche(S, glatt(sp([[K.schulter.at(-1)[0] - 1, K.schulter.at(-1)[1] - 3], ...aussen.slice(1, -1), [aussen.at(-1)[0] + 0.5, K.m.handgelenk + 1, E], [innen[0][0] - 0.5, K.m.handgelenk + 1.5, E], ...innen.slice(1), [K.armI[0][0] - 6, K.armI[0][1] - 6]]))));
    // Vorderteil je Seite (offen in der Mitte bis zur Knopfung)
    const plus = 5;
    const seite = [[100 + K.hals.b + 1, K.hals.y1 - 4, E], [K.schulter.at(-1)[0] + 2, K.schulter.at(-1)[1] - 2], [100 + K.breite(K.m.brust) + plus, K.m.brust], [100 + K.breite(K.m.taille) + plus - (o.guertel ? 2 : 0), K.m.taille], [100 + K.breite(K.m.huefte) + plus, K.m.huefte]];
    if (unten > K.m.huefte) seite.push([100 + K.breite(K.m.huefte) + plus + (unten - K.m.huefte) * 0.06, unten, E]); else seite[seite.length - 1][2] = E;
    const mitteUnten = [100 - 1.5, unten + 1, E], mitteOben = [100 - 1.5, o.zip ? K.hals.y1 - 1 : K.m.brust - 2, E];
    t.push(flaeche(S, glatt(sp([...seite, mitteUnten, mitteOben]), true, 0.35)));
    if (o.revers) t.push(flaeche(S, glatt(sp([[100 + K.hals.b + 1, K.hals.y1 - 4, E], [100 + K.hals.b + 9, K.m.schulterY + 4, E], [100 + 6, K.m.brust + 2, E], [100 - 1.5, K.m.brust - 2, E]])), { ton: s < 0 ? 0.1 : -0.04 }));
    if (o.steppung) for (let y = K.m.schulterY + 10; y < unten - 3; y += 8.5) t.push(`<path d="M${f(sp([[100 - 1, 0]])[0][0])} ${f(y)} Q${f(sp([[100 + K.breite(y) / 2, 0]])[0][0])} ${f(y + 1.6)} ${f(sp([[100 + K.breite(y) + 4, 0]])[0][0])} ${f(y)}" stroke="${S.cD}" stroke-width="0.8" fill="none"/>`);
    // Tasche
    t.push(`<path d="M${f(sp([[100 + 6, 0]])[0][0])} ${f(K.m.huefte - 6)} L${f(sp([[100 + K.breite(K.m.huefte) - 2, 0]])[0][0])} ${f(K.m.huefte - 7)}" stroke="${S.cK}" stroke-width="0.9"/>`);
  }
  if (o.zip) t.push(`<path d="M100.2 ${f(K.hals.y1 - 3)} L100.2 ${f(unten)}" stroke="${dunkel(S.c, 0.45)}" stroke-width="1"/>`, `<rect x="99" y="${f(K.m.brust - 4)}" width="2.4" height="4" rx="0.5" fill="#c9c6bf"/>`);
  else for (let y = K.m.brust + 2; y < Math.min(unten, K.m.huefte + 6); y += 14) t.push(`<circle cx="101.8" cy="${f(y)}" r="1.4" fill="${dunkel(S.c, 0.45)}"/>`);
  if (o.guertel) t.push(`<rect x="${f(100 - K.breite(K.m.taille) - 6)}" y="${f(K.m.taille - 2.5)}" width="${f(2 * K.breite(K.m.taille) + 12)}" height="5" rx="1" fill="${S.cD}"/>`);
  if (o.kapuze) {
    // Kapuze liegt im Nacken: Rand hinter Hals und Kopf sichtbar (wird vor dem Körper gezeichnet), vorn Tunnelzug mit Kordel
    const hb = K.hals.b, y0 = K.hals.y0 - 2;
    t.unshift('<!--hinten-->' + flaeche(S, glatt([[100 - hb - 9, K.m.schulterY - 1], [100 - hb - 8, y0], [100 - hb - 2, y0 - 6], [100 + hb + 2, y0 - 6], [100 + hb + 8, y0], [100 + hb + 9, K.m.schulterY - 1], [100, K.m.schulterY + 4]]), { ton: -0.12 }) + '<!--/hinten-->');
    t.push(`<path d="M${f(100 - hb - 3)} ${f(K.hals.y1 - 3)} Q100 ${f(K.hals.y1 + 3)} ${f(100 + hb + 3)} ${f(K.hals.y1 - 3)}" stroke="${hell(S.c, 0.1)}" stroke-width="2.2" fill="none"/>`);
    for (const s of [-1, 1]) t.push(`<path d="M${f(100 + s * 3)} ${f(K.hals.y1 + 1)} q${s * 0.6} 6 ${s * -0.2} 11" stroke="${hell(S.c, 0.55)}" stroke-width="0.8" fill="none"/>`, `<rect x="${f(100 + s * 2.8 - 1)}" y="${f(K.hals.y1 + 11)}" width="2" height="2.8" rx="0.8" fill="${dunkel(S.c, 0.5)}"/>`);
  }
  return t.join('');
}

// Schuhe am Model: sneaker | halb | pumps | ballerina | sandale | stiefel | gummistiefel
function schuhe(K, S, o) {
  const t = [];
  for (const s of [-1, 1]) {
    const sp = K.bx(s);
    const Q = (x, y) => { const [[a, b]] = sp([[x, y]]); return `${f(a)} ${f(b)}`; };
    const xa = K.beinA.at(-1)[0] + 0.6, xi = K.beinI.at(-1)[0] - 0.4, y = K.fuss;
    if (o.art === 'sneaker') {
      t.push(flaeche(S, glatt(sp([[xi - 0.8, y - 7], [xa + 0.6, y - 7.5], [xa + 2.8, y + 1, E], [xi - 1.2, y + 1, E]]), true, 0.4)));
      t.push(`<path d="M${Q(xi - 1.4, y + 2)} L${Q(xa + 3, y + 2)}" stroke="#f3f1ec" stroke-width="3" stroke-linecap="round"/>`);
      t.push(`<path d="M${Q(xi + 1, y - 4.6)} L${Q(xi + 4, y - 4.6)}" stroke="${S.cK}" stroke-width="0.6"/>`);
    } else if (o.art === 'stiefel' || o.art === 'gummistiefel') {
      const ob = o.art === 'gummistiefel' ? K.m.knie + (K.fuss - K.m.knie) * 0.35 : K.m.knie + 8;
      t.push(flaeche(S, glatt(sp([[K.beinIX(ob) - 1, ob, E], [K.beinAX(ob) + 1.2, ob, E], [xa + 1.2, y - 4], [xa + 2.6, y + 1.5, E], [xi - 1, y + 1.5, E]]), true, 0.4)));
      if (o.art === 'gummistiefel') t.push(`<path d="M${Q(xi - 1, y + 0.8)} L${Q(xa + 2.6, y + 0.8)}" stroke="${dunkel(S.c, 0.35)}" stroke-width="1.6"/>`);
    } else if (o.art === 'pumps') {
      t.push(flaeche(S, glatt(sp([[xi - 0.5, y - 4.2], [(xi + xa) / 2, y - 3.2], [xa + 0.3, y - 4.6], [xa + 2.4, y + 0.6, E], [xi - 0.6, y + 0.6, E]]), true, 0.4)));
      t.push(`<path d="M${Q(xa + 0.8, y)} L${Q(xa + 1.2, y + 3.6)}" stroke="${S.cK}" stroke-width="1.2" stroke-linecap="round"/>`);
    } else if (o.art === 'ballerina') {
      t.push(flaeche(S, glatt(sp([[xi - 0.6, y - 2.6], [(xi + xa) / 2, y - 1.4], [xa + 0.4, y - 2.8], [xa + 2.2, y + 1, E], [xi - 0.8, y + 1, E]]), true, 0.4)));
      t.push(`<circle cx="${Q((xi + xa) / 2, y - 1).split(' ')[0]}" cy="${Q((xi + xa) / 2, y - 1).split(' ')[1]}" r="0.7" fill="${S.cK}"/>`);
    } else if (o.art === 'sandale') {
      t.push(flaeche(S, glatt(sp([[xi - 1, y + 0.2, E], [xa + 2.4, y + 0.2, E], [xa + 2.4, y + 1.8, E], [xi - 1, y + 1.8, E]]), true, 0.2), { ton: -0.1 }));
      t.push(`<path d="M${Q(xi - 0.4, y - 3)} L${Q(xa + 0.8, y - 3.4)} M${Q(xi + 0.2, y - 0.6)} L${Q(xa + 1.6, y - 0.8)}" stroke="${S.c}" stroke-width="1.4" stroke-linecap="round"/>`);
    } else {
      t.push(flaeche(S, glatt(sp([[xi - 0.8, y - 5.5], [xa + 0.6, y - 6], [xa + 2.6, y + 1, E], [xi - 1, y + 1, E]]), true, 0.4)));
      t.push(`<path d="M${Q(xi - 1, y + 1.4)} L${Q(xa + 2.6, y + 1.4)}" stroke="${dunkel(S.c, 0.4)}" stroke-width="1.2"/>`);
    }
  }
  return t.join('');
}

function muetze(K, S, o) {
  const { x, y, rx, ry } = K.kopf;
  if (o.art === 'cap') return flaeche(S, glatt([[x - rx * 1.07, y - ry * 0.3, E], [x - rx * 1.0, y - ry * 0.85], [x - rx * 0.5, y - ry * 1.16], [x + rx * 0.5, y - ry * 1.16], [x + rx * 1.0, y - ry * 0.85], [x + rx * 1.07, y - ry * 0.3, E]]))
    + `<path d="M${f(x)} ${f(y - ry * 1.16)} L${f(x)} ${f(y - ry * 0.36)}" stroke="${S.cK}" stroke-width="0.5" opacity="0.6"/><circle cx="${x}" cy="${f(y - ry * 1.15)}" r="1" fill="${S.cD}"/>`
    + flaeche(S, glatt([[x - rx * 1.12, y - ry * 0.34, E], [x - rx * 0.6, y - ry * 0.42], [x + rx * 0.6, y - ry * 0.42], [x + rx * 1.12, y - ry * 0.34, E], [x + rx * 0.7, y - ry * 0.12], [x, y - ry * 0.06], [x - rx * 0.7, y - ry * 0.12]]), { ton: -0.14 });
  if (o.art === 'bucket') return flaeche(S, glatt([[x - rx * 1.02, y - ry * 0.3, E], [x - rx * 0.9, y - ry * 1.05], [x + rx * 0.9, y - ry * 1.05], [x + rx * 1.02, y - ry * 0.3, E], [x + rx * 1.55, y - ry * 0.05, E], [x - rx * 1.55, y - ry * 0.05, E]]));
  return flaeche(S, glatt([[x - rx * 1.1, y - ry * 0.3, E], [x - rx, y - ry * 1.05], [x, y - ry * 1.28], [x + rx, y - ry * 1.05], [x + rx * 1.1, y - ry * 0.3, E]])) + flaeche(S, glatt([[x - rx * 1.14, y - ry * 0.52, E], [x + rx * 1.14, y - ry * 0.52, E], [x + rx * 1.14, y - ry * 0.26, E], [x - rx * 1.14, y - ry * 0.26, E]]), { ton: -0.1 }) + `<circle cx="${x}" cy="${f(y - ry * 1.32)}" r="${f(rx * 0.32)}" fill="${hell(S.c, 0.12)}"/>`;
}

function tasche(K, S, o) {
  return '<!--tasche-->' + taschenTeil(K, S, o);
}
function taschenTeil(K, S, o) {
  const [hx, hy] = K.hand;
  if (o.art === 'tote') return `<path d="M${f(hx - 3)} ${f(hy + 2)} Q${f(hx + 4)} ${f(hy - 12)} ${f(hx + 11)} ${f(hy + 2)}" stroke="${S.cD}" stroke-width="1.8" fill="none"/>` + flaeche(S, glatt([[hx - 7, hy + 2, E], [hx + 15, hy + 2, E], [hx + 17, hy + 30, E], [hx - 9, hy + 30, E]]));
  const sx = 200 - K.schulter.at(-1)[0] + 4;
  return `<path d="M${f(sx)} ${f(K.m.schulterY - 2)} L${f(hx + 6)} ${f(K.m.huefte - 6)}" stroke="${S.cD}" stroke-width="1.4"/>` + flaeche(S, glatt([[hx - 2, K.m.huefte - 8, E], [hx + 14, K.m.huefte - 8, E], [hx + 14, K.m.huefte + 6, E], [hx - 2, K.m.huefte + 6, E]]));
}

// Poncho: über die Schultern bis Hüfte, vorn Spitze, Arme darunter, Rollkragen und Fransen
function poncho(K, S, o) {
  const sw = K.schulter.at(-1)[0] - 100, unten = K.m.huefte + 6;
  const r = [[100 + K.hals.b + 2, K.hals.y1 - 3, E], [100 + sw + 4, K.m.schulterY + 4], [100 + sw + 13, K.m.taille + 2], [100 + sw + 14, K.m.taille + 8, E], [100, unten + 12, E]];
  const t = [flaeche(S, glatt([...r, ...spiegelX([...r].reverse()).slice(1)], true, 0.3))];
  for (const s of [-1, 1]) for (let i = 0; i <= 12; i++) { const u = i / 12, x = 100 + s * (sw + 14) * (1 - u), y = K.m.taille + 8 + (unten + 12 - K.m.taille - 8) * u; t.push(`<path d="M${f(x)} ${f(y)} l${f(-s * 0.4)} 4" stroke="${S.cD}" stroke-width="0.8"/>`); }
  t.push(flaeche(S, glatt([[100 - K.hals.b - 2.5, K.hals.y1 - 2, E], [100 - K.hals.b - 1.6, K.hals.y0 + 2, E], [100 + K.hals.b + 1.6, K.hals.y0 + 2, E], [100 + K.hals.b + 2.5, K.hals.y1 - 2, E]]), { ton: -0.08 }));
  return t.join('');
}


// Wurf 4, Bildpakete: Produktbild (Fassung B + vtracer) als Auflage am Model. o.zeichne(S, t, p) zeichnet in den Bildraum 0..100,
// o.ausschnitt [x0, y0, x1, y1] wählt den Teil des Bildes (z. B. ein Ohrring aus dem Set), o.platz die Stelle am Körper,
// o.b skaliert die Breite. Handschuhe werden als Ärmelstück + Hände in Stofffarbe gezeichnet (o.platz 'haende', o.bis).
function auflage(K, S, o) {
  if (o.platz === 'haende') return handschuhe(K, S, o);
  if (o.platz === 'haube') return auflageHaube(K, S, o);
  const t = [];
  o.zeichne(S, t, { ...o.p, ohneSchatten: true, musterfeld: o.muster37 && o.muster37 !== 'uni' ? o.muster37 : undefined });
  const [x0, y0, x1, y1] = o.ausschnitt ?? [0, 0, 100, 100];
  const inhalt = t.join('');
  const box = (cx, oben, w, h, ausr = 'xMidYMin') => `<svg x="${f(cx - w / 2)}" y="${f(oben)}" width="${f(w)}" height="${f(h)}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" preserveAspectRatio="${ausr} meet">${inhalt}</svg>`;
  const { x, y, rx, ry } = K.kopf, b = o.b ?? 1, [hx, hy] = K.hand, verh = (y1 - y0) / (x1 - x0);
  if (o.platz === 'kopf') { const w = 2 * rx * 1.25 * b, unten = y - ry * (o.unten ?? 0.25); return box(x, unten - w * 2, w, w * 2, 'xMidYMax'); }
  if (o.platz === 'gesicht') { const w = 2 * rx * 1.08 * b; return box(x, y + ry * 0.04 - w * verh / 2, w, w * verh, 'xMidYMid'); }
  if (o.platz === 'hals') { const w = K.hals.b * 2 * 3.2 * b; return box(100, K.hals.y1 - 5, w, w * 2); }
  if (o.platz === 'ohren') { const w = rx * 0.42 * b; return [-1, 1].map((s) => box(x + s * rx * 0.98, y + ry * 0.12, w, w * verh)).join(''); }
  if (o.platz === 'brust') { const w = 11 * b; return box(100 - K.breite(K.m.brust) * 0.5, K.m.brust - 14, w, w * verh); }
  if (o.platz === 'handgelenk' || o.platz === 'finger') {
    const yy = o.platz === 'finger' ? hy + 6 : K.m.handgelenk - 2, xm = (K.armAX(yy) + K.armIX(yy)) / 2;
    const w = (o.platz === 'finger' ? 4 : 2 * (K.armAX(yy) - K.armIX(yy)) + 4) * b; return '<!--tasche-->' + box(o.platz === 'finger' ? hx : xm, yy - w * verh / 2, w, w * verh, 'xMidYMid');
  }
  if (o.platz === 'huefte') { const w = 26 * b; return box(100 + K.breite(K.m.huefte) * 0.45, K.m.huefte - 8, w, w * verh); }
  // Taschen: in der Hand (Henkel an der Hand) oder quer über den Körper (Riemen von der Gegenschulter)
  const w = 30 * b;
  if (o.platz === 'quer') {
    const sx = 200 - K.schulter.at(-1)[0] + 4, by = K.m.huefte - 10;
    return '<!--tasche-->' + `<path d="M${f(sx)} ${f(K.m.schulterY - 2)} L${f(hx + 2)} ${f(by + 2)}" stroke="${S.cK}" stroke-width="1.6"/>` + box(hx + 4, by, w, w * verh);
  }
  return '<!--tasche-->' + box(hx + 2, hy - w * 0.12, w, w * verh);
}

// Haube/Kapuze frontal: Stoff um den Kopf mit Gesichtsöffnung, Bänder unter dem Kinn (o.baender 'schleife' | 'lang')
function auflageHaube(K, S, o) {
  const { x, y, rx, ry } = K.kopf, b = o.b ?? 1;
  const e = (cx, cy, a, c) => `M${f(cx - a)} ${f(cy)} a${f(a)} ${f(c)} 0 1 0 ${f(2 * a)} 0 a${f(a)} ${f(c)} 0 1 0 ${f(-2 * a)} 0 Z`;
  const d = e(x, y - ry * 0.08, rx * 1.28 * b, ry * 1.2 * b) + ' ' + e(x, y + ry * 0.14, rx * 0.84, ry * 0.9);
  const z = [`<path d="${d}" fill="${S.c}" fill-rule="evenodd"/>`, S.tex ? `<path d="${d}" fill="${S.tex}" fill-rule="evenodd"/>` : '', `<path d="${d}" fill="url(#${S.id}l)" fill-rule="evenodd"/>`, `<path d="${d}" fill="none" stroke="${S.cK}" stroke-width="0.7" fill-rule="evenodd"/>`];
  const ky = y + ry * 1.02;
  if (o.baender === 'lang') for (const s of [-1, 1]) z.push(flaeche(S, glatt([[x + s * rx * 0.75, y + ry * 0.7, E], [x + s * rx * 0.95, y + ry * 0.75, E], [x + s * rx * 0.55, ky + 24, E], [x + s * rx * 0.3, ky + 24, E]], true, 0.2), { ton: -0.1 }));
  else z.push(flaeche(S, glatt([[x - rx * 0.5, ky - 1.5], [x, ky + 1], [x + rx * 0.5, ky - 1.5], [x + rx * 0.45, ky + 3], [x, ky + 1.6], [x - rx * 0.45, ky + 3]], true, 0.3), { ton: -0.08 }));
  return z.join('');
}

// Handschuhe: Ärmelstück vom Handgelenk bis o.bis ('handgelenk' | 'unterarm' | 'ellbogen') + Hände in Stofffarbe
function handschuhe(K, S, o) {
  const y1 = K.m.handgelenk + 4, y0 = o.bis === 'ellbogen' ? K.m.ellbogen - 2 : o.bis === 'unterarm' ? (K.m.ellbogen + K.m.handgelenk) / 2 : K.m.handgelenk - 3;
  const stueck = (A, I) => { const sel = (P) => [[interp(P, y0), y0], ...P.filter(([, yy]) => yy > y0 && yy < y1), [interp(P, y1), y1]]; return [...sel(A), ...sel(I).reverse()]; };
  const t = [];
  for (const s of [1, -1]) { const sp = s > 0 ? (p) => p : spiegelX; t.push(flaeche(S, glatt(sp(stueck(K.armA, K.armI)), true, 0.3))); }
  return '<!--tasche-->' + t.join('') + haendeSVG(K, S.c);
}

// Bildpakete Wurf 4 (B17–B19): Zubehör zeichnet sich selbst am Platz (b-pakete.js zubehoerTeil)
const zubehoer = (K, S, o) => o.zeichne(K, S, o);
const TEILE = { oberteil, hose, rock, kleid, jacke, poncho, schuhe, muetze, tasche, zubehoer, auflage };
const REIHENFOLGE = ['schuhe', 'hose', 'rock', 'kleid', 'oberteil', 'jacke', 'poncho', 'zubehoer', 'auflage', 'tasche'];

// ─────────────────────────────────────────── Model
export function modelSVG({ geschlecht = 'damen', zielgruppe = 'young', haut = HAUT[1], haar = { farbe: HAAR.braun, stil: 'lang' }, outfit = [], hintergrund = '#eef1f4', groesse = 260 } = {}) {
  const K = koerper(geschlecht, zielgruppe);
  const defs = [];
  const teile = [];
  const rang = (o) => ((o.teil === 'hose' || o.teil === 'rock') && o.latz ? REIHENFOLGE.indexOf('oberteil') + 0.5 : REIHENFOLGE.indexOf(o.teil));
  const sortiert = [...outfit].sort((a, b) => rang(a) - rang(b));
  const oben = [];
  // Q37: muster37 (Musterfeld) ersetzt das Muster des Teils, ohne bisherige Model-Bilder zu verändern
  const stoff = (o) => { const S = materialDefs(o.farbe, o.material, defs, o.muster37 ? undefined : o.muster); if (o.muster37 && o.muster37 !== 'uni') S.tex = musterFuellung(S, o.muster37, { cx: 100, cy: o.teil === 'hose' || o.teil === 'rock' ? (K.m.huefte + K.m.knie) / 2 : K.m.brust + 4, s: K.zielgruppe === 'kinder' ? 1 : 1.25 }) ?? S.tex; return S; };
  for (const o of sortiert) (o.teil === 'muetze' || o.oben || (o.teil === 'auflage' && (o.platz === 'kopf' || o.platz === 'haube' || o.platz === 'gesicht' || o.platz === 'ohren')) ? oben : teile).push(TEILE[o.teil](K, stoff(o), o));
  const hg = hintergrund ? `<rect width="200" height="420" fill="${hintergrund}"/><ellipse cx="100" cy="${f(K.fuss + 3)}" rx="${f(K.zielgruppe === 'kinder' ? 26 : 38)}" ry="4.5" fill="#000" opacity="0.09"/>` : '';
  // Teile hinter dem Körper (Kapuze im Nacken) herauslösen, Taschen über den Händen
  const nacken = [];
  const teileV = teile.map((x) => x.replace(/<!--hinten-->([\s\S]*?)<!--\/hinten-->/g, (_, h) => { nacken.push(h); return ''; }));
  const hinten = teileV.filter((x) => x.startsWith('<!--tasche-->')), vorn = teileV.filter((x) => !x.startsWith('<!--tasche-->'));
  const svg = `${hg}${haarSVG(K, haar.farbe, haar.stil, true)}${nacken.join('')}${koerperSVG(K, haut)}${vorn.join('')}${haendeSVG(K, haut)}${hinten.join('')}${haarSVG(K, haar.farbe, haar.stil, false)}${oben.join('')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 420" width="${Math.round(groesse * 200 / 420)}" height="${groesse}"><defs>${defs.join('')}</defs>${svg}</svg>`;
}

export { koerper };
