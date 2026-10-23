// Q33: Kinder- und Jugendmode als Flatlay. Baut auf den Q25-Flatlays auf (flatlay.js, unverändert) und ergänzt
// Dessins (q33-dessins.js), Applikationen (q33-motive.js) und Details, die Kinder- und Teen-Teile erkennbar machen.
// Bildparameter: basis oberteil|hose|rock|kleid|jacke, alle Parameter der Basis, dazu
//   dessin  Name aus DESSINS, motiv Name aus MOTIVE (motivX, motivY, motivS optional), extras: Liste von Details (siehe EXTRAS).
// Maße der Details (Kindergröße 116, Flatlay-Einheiten): Knieflicken 9 × 7 bei Kniehöhe, Rüsche 4 hoch, Kapuzenohren Ø 5,
// Reverskragen 9 lang, Seitenstreifen 2 breit, Fallschirm-Kordel 6 lang mit Stopper Ø 1,6.

import { oberteilFlat, hoseFlat, rockFlat, kleidFlat, jackeFlat, oberteilMasse, linie, naht } from './flatlay.js';
import { hell, dunkel, flaeche } from './stoff.js';
import { glatt } from './model.js';
import { dessin } from './q33-dessins.js';
import { motiv } from './q33-motive.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const FLAT = { oberteil: oberteilFlat, hose: hoseFlat, rock: (S, t, p) => rockFlat(S, t, p, 16), kleid: kleidFlat, jacke: jackeFlat };

// Lage der Hosenbeine wie in hoseFlat (für Flicken, Streifen, Kordeln)
function beine(p) {
  const pf = p.passform ?? 'gerade', lang = p.laenge ?? 'lang';
  const bund = p.latz ? 26 : 10, hw = pf === 'leggings' ? 16 : pf === 'baggy' ? 22 : 20.5;
  const hem = { kurz: 53, bermuda: 60, cropped: pf === 'weit' ? 74 : 80, lang: 94 }[lang] ?? 94;
  const halb = ({ skinny: 5.6, leggings: 4.6, schmal: 7, gerade: 8.6, weit: 12.5, baggy: 13, flare: 12, jogger: 6.2 }[pf] ?? 8.6) + (lang === 'bermuda' ? 1.5 : 0);
  const mitte = lang === 'kurz' ? 50 + hw / 2 + 1 : 50 + (pf === 'weit' || pf === 'baggy' ? 13.5 : 11.5);
  return { bund, hw, hem, halb, mitte, knie: Math.min(hem, 64), aussenUnten: mitte + (lang === 'kurz' ? halb * 0.6 + 2 : halb) };
}

const EXTRAS = {
  // Knieflicken mit Steppnaht (Kinderhose)
  kniepatch(S, t, p) {
    const B = beine(p);
    for (const s of [1, -1]) {
      const x = s > 0 ? B.mitte : 100 - B.mitte, y = B.knie - 2;
      const d = `M${f(x - 4.6)} ${f(y - 3.6)} Q${f(x)} ${f(y - 5)} ${f(x + 4.6)} ${f(y - 3.6)} Q${f(x + 5.4)} ${f(y)} ${f(x + 4.6)} ${f(y + 3.6)} Q${f(x)} ${f(y + 5)} ${f(x - 4.6)} ${f(y + 3.6)} Q${f(x - 5.4)} ${f(y)} ${f(x - 4.6)} ${f(y - 3.6)} Z`;
      t.push(`<path d="${d}" fill="${p.patchFarbe ?? '#e8833a'}" stroke="${dunkel(p.patchFarbe ?? '#e8833a', 0.3)}" stroke-width="0.4"/>`, naht(`M${f(x - 3.6)} ${f(y - 2.6)} Q${f(x)} ${f(y - 3.8)} ${f(x + 3.6)} ${f(y - 2.6)} Q${f(x + 4.2)} ${f(y)} ${f(x + 3.6)} ${f(y + 2.6)} Q${f(x)} ${f(y + 3.8)} ${f(x - 3.6)} ${f(y + 2.6)} Z`, { cD: '#fff', denim: false }, 0.9));
    }
  },
  // Seitenstreifen (Trainings- und Track-Hose): doppelter Streifen auf der Seitennaht
  seitenstreifen(S, t, p) {
    const B = beine(p);
    for (const s of [1, -1]) {
      const X = (x) => (s > 0 ? x : 100 - x);
      for (const [o, c] of [[-0.9, '#f4f3ef'], [0.9, p.streifenFarbe ?? '#f4f3ef']]) t.push(linie(`M${f(X(50 + B.hw - 1.6 + o))} ${B.bund + 7} Q${f(X(50 + B.hw + o - 0.6))} ${B.bund + 22} ${f(X(B.aussenUnten - 1.4 + o))} ${B.hem - 1}`, c, 1.1, 0.95));
    }
  },
  // Fallschirmhose: Kordelzug am Saum mit Stopper, aufgesetzte Taschen am Unterschenkel
  parachute(S, t, p) {
    const B = beine(p);
    for (const s of [1, -1]) {
      const X = (x) => (s > 0 ? x : 100 - x), xm = B.mitte;
      t.push(flaeche(S, glatt([[X(xm - 4), B.knie + 4, E], [X(xm + 5), B.knie + 4, E], [X(xm + 5.5), B.knie + 14, E], [X(xm - 3.5), B.knie + 14, E]], true, 0.2), { ton: -0.07 }));
      t.push(flaeche(S, glatt([[X(xm - 4.4), B.knie + 3, E], [X(xm + 5.4), B.knie + 3, E], [X(xm + 5.4), B.knie + 7, E], [X(xm - 4.4), B.knie + 7, E]], true, 0.2), { ton: -0.12 }));
      t.push(linie(`M${f(X(xm - 1))} ${B.hem - 1} l${s * -1.6} 5 M${f(X(xm + 1.6))} ${B.hem - 1} l${s * 1.2} 5.4`, '#2a2c30', 0.6));
      t.push(`<rect x="${f(X(xm - 3.4) - 0.8)}" y="${B.hem + 2.6}" width="1.6" height="2.4" rx="0.6" fill="#2a2c30"/><rect x="${f(X(xm + 3) - 0.8)}" y="${B.hem + 3}" width="1.6" height="2.4" rx="0.6" fill="#2a2c30"/>`);
      t.push(linie(`M${f(X(50 + B.hw - 3))} ${B.bund + 14} Q${f(X(xm + 2))} ${B.knie - 10} ${f(X(xm - 3))} ${B.knie}`, S.cD, 0.6, 0.6));
    }
  },
  // Rüsche am Saum (Rock, Kleid): gekräuselter Volant
  volant(S, t, p, M) {
    const y = M.hem ?? 70, w = M.flare ?? 26;
    const d = [`M${f(50 - w - 1)} ${f(y - 1)}`];
    for (let i = 0; i <= 12; i++) { const x = 50 - w - 1 + (2 * w + 2) * i / 12; d.push(`Q${f(x - (w / 12))} ${f(y + 6)} ${f(x)} ${f(y + 4)}`); }
    d.push(`L${f(50 + w + 1)} ${f(y - 1)} Z`);
    t.push(flaeche(S, d.join(' '), { ton: -0.05 }));
    for (let i = 1; i < 12; i++) { const x = 50 - w + (2 * w) * i / 12; t.push(linie(`M${f(x)} ${f(y)} l${f((i - 6) * 0.15)} 3.6`, S.cD, 0.5, 0.6)); }
  },
  // Kapuzenohren (Tier-Kapuze, Kinder)
  ohren(S, t, p, M) {
    const y = (M.oben ?? 12) - 9;
    for (const s of [1, -1]) t.push(`<ellipse cx="${50 + s * 7}" cy="${f(y)}" rx="3.2" ry="3.4" fill="${dunkel(S.c, 0.08)}" stroke="${S.cK}" stroke-width="0.5"/><ellipse cx="${50 + s * 7}" cy="${f(y + 0.4)}" rx="1.7" ry="1.9" fill="${hell(S.c, 0.45)}"/>`);
  },
  // Trikotkragen: V mit Kontrastblende und Ärmelbündchen-Streifen
  trikot(S, t, p, M) {
    const o = M.oben ?? 12;
    t.push(linie(`M43 ${o} L50 ${o + 9} L57 ${o}`, '#f4f3ef', 2.2), linie(`M43 ${o} L50 ${o + 9} L57 ${o}`, dunkel(S.c, 0.4), 0.6));
    for (const s of [1, -1]) t.push(linie(`M${50 + s * 30} ${o + 13} l${s * 3} 5`, '#f4f3ef', 1.6));
  },
  // Reverskragen (Bowling-/Resorthemd)
  revers(S, t, p, M) {
    const o = M.oben ?? 12;
    for (const s of [1, -1]) t.push(flaeche(S, glatt([[50 + s * 6.8, o - 0.4, E], [50 + s * 12.5, o + 3, E], [50 + s * 4, o + 13, E], [50 + s * 0.8, o + 9, E]], true, 0.2), { ton: s > 0 ? -0.05 : 0.07 }));
    t.push(linie(`M50 ${o + 10} L50 ${(M.unten ?? 84) - 2}`, S.cD, 0.6, 0.7));
    for (let y = o + 16; y < (M.unten ?? 84) - 3; y += 10) t.push(`<circle cx="51.2" cy="${y}" r="1" fill="${hell(S.c, 0.4)}" stroke="${S.cK}" stroke-width="0.3"/>`);
  },
  // Cut-out an der Taille (Teen-Top)
  cutout(S, t, p, M) {
    const y = (M.unten ?? 70) - 9;
    t.push(`<path d="M42 ${y} Q50 ${y - 6} 58 ${y} Q50 ${y + 4} 42 ${y} Z" fill="#000" opacity="0.0"/><path d="M42 ${y} Q50 ${y - 6} 58 ${y} Q50 ${y + 4} 42 ${y} Z" fill="#f4efe6" stroke="${S.cK}" stroke-width="0.6"/>`);
  },
  // Neckholder: Träger um den Hals, Schleife im Nacken
  neckholder(S, t, p, M) {
    const o = M.oben ?? 12;
    for (const s of [1, -1]) t.push(linie(`M${50 + s * 9} ${o + 2} Q${50 + s * 5} ${o - 6} ${50 + s * 1.5} ${o - 9}`, S.cD, 2));
    t.push(`<path d="M50 ${o - 9} l-4 -3 l0 5 Z M50 ${o - 9} l4 -3 l0 5 Z" fill="${S.cD}"/>`);
  },
  // Doppelte Brusttaschen mit Patten (Fleece/Utility)
  brusttaschen(S, t, p, M) {
    const o = M.oben ?? 12;
    for (const x of [36, 56]) t.push(flaeche(S, glatt([[x, o + 12, E], [x + 8, o + 12, E], [x + 8, o + 21, E], [x, o + 21, E]], true, 0.2), { ton: -0.05 }), flaeche(S, glatt([[x - 0.4, o + 11, E], [x + 8.4, o + 11, E], [x + 8.4, o + 14.5, E], [x - 0.4, o + 14.5, E]], true, 0.2), { ton: -0.1 }));
  },
  // Kontrast-Ärmel (Raglan, Baseballshirt): Ärmel in Zweitfarbe übermalt
  raglan(S, t, p, M) {
    const { Sw, schY, achselY, unten } = M;
    const c = p.raglanFarbe ?? '#273659';
    for (const s of [1, -1]) {
      const X = (x) => (s > 0 ? x : 100 - x);
      const cuff = unten - 4;
      const pts = [[X(50 + 6), M.oben + 1.5, E], [X(50 + Sw), schY, E], [X(50 + Sw + 8), schY + 18], [X(50 + Sw + 12.5), cuff - 2, E], [X(50 + Sw + 4.6), cuff, E], [X(50 + Sw - 1.2 + 1.2), achselY + 14], [X(50 + Sw - 1.2), achselY, E]];
      t.push(`<path d="${glatt(pts, true, 0.3)}" fill="${c}" stroke="${dunkel(c, 0.4)}" stroke-width="0.5" opacity="0.96"/>`);
    }
  },
  // Kordel am Bund (Sweatshorts, Basketballshorts)
  kordel(S, t, p) {
    const B = beine(p);
    t.push(linie(`M48 ${B.bund + 4} q-1 5 -2.4 7 M52 ${B.bund + 4} q1 5 2.4 7`, '#f4f3ef', 0.9));
  },
  // Netzeinsatz/Mesh-Seiten (Basketballshorts, Trikot)
  seitenband(S, t, p) {
    const B = beine(p);
    for (const s of [1, -1]) { const X = (x) => (s > 0 ? x : 100 - x); t.push(`<path d="M${f(X(50 + B.hw - 3))} ${B.bund + 6} L${f(X(50 + B.hw + 0.4))} ${B.bund + 6} L${f(X(B.aussenUnten + 0.4))} ${B.hem} L${f(X(B.aussenUnten - 3.6))} ${B.hem} Z" fill="#f4f3ef" opacity="0.92"/>`); }
  },
  // Bandeau: gerafftes Mittelteil
  raffung(S, t, p, M) {
    const o = M.oben ?? 18;
    t.push(`<path d="M47 ${o + 1} Q50 ${o + 8} 47 ${o + 15} L53 ${o + 15} Q50 ${o + 8} 53 ${o + 1} Z" fill="${dunkel(S.c, 0.12)}"/>`);
    for (let i = -2; i <= 2; i++) t.push(linie(`M${48 + i * 3} ${o + 3} q${-i * 0.6} 5 0 10`, S.cD, 0.5, 0.6));
  },
  // Gürtelschlaufe mit Kordel (Latzrock, Sweatkleid)
  taillenkordel(S, t, p, M) {
    const y = M.taille ?? 34;
    t.push(linie(`M36 ${y} Q50 ${y + 1.2} 64 ${y}`, S.cD, 1.6), `<path d="M49 ${y + 0.6} q-1 5 -3 8 M51 ${y + 0.6} q1 5 3 8" stroke="${hell(S.c, 0.55)}" stroke-width="0.9" fill="none"/>`);
  },
  // Steppung als Rautenmuster (wird über dessin 'stepp' gelegt) – hier nur Kragenpolster
  stehkragenpolster(S, t, p, M) {
    const o = M.oben ?? 9;
    t.push(flaeche(S, glatt([[41, o + 1.5, E], [41.6, o - 5, E], [58.4, o - 5, E], [59, o + 1.5, E]], true, 0.2), { ton: -0.06 }));
  },
  // Spaghettiträger am Kleid (Hängerchen)
  spaghetti(S, t, p, M) {
    for (const s of [1, -1]) t.push(linie(`M${50 + s * 8} 12 L${50 + s * 9.5} 0`, S.cD, 0.9));
  },
  // Schleife vorn (Kinderkleid, Bluse)
  schleife(S, t, p, M) {
    const y = M.taille ?? (M.oben ?? 12) + 5;
    t.push(`<path d="M50 ${y} l-6 -3.4 l0 6.8 Z M50 ${y} l6 -3.4 l0 6.8 Z" fill="${p.schleifeFarbe ?? dunkel(S.c, 0.3)}" stroke="#fff" stroke-width="0.4"/><circle cx="50" cy="${y}" r="1.4" fill="${p.schleifeFarbe ?? dunkel(S.c, 0.4)}"/>`);
  },
  // Druckknöpfe im Schritt (Baby)
  druckknoepfe(S, t, p, M) {
    const y = (M.unten ?? 84) - 2;
    for (const x of [45, 50, 55]) t.push(`<circle cx="${x}" cy="${y}" r="1" fill="#d9d6cf" stroke="#77736b" stroke-width="0.3"/>`);
  },
};

// Lage der Applikation je Basis
function motivLage(basis, p, M) {
  if (basis === 'oberteil') { const o = M.oben ?? 12, u = M.unten ?? 84; return [50, o + Math.min(22, (u - o) * 0.42), (M.Ww ?? 18) * 0.95]; }
  if (basis === 'kleid') return [50, 22, 11];
  if (basis === 'jacke') return [41, 30, 9];
  if (basis === 'hose') return [39, 36, 8];
  return [50, 36, 10];
}

export function q33flat(S, t, p) {
  const basis = p.basis ?? 'oberteil';
  if (p.dessin) S.tex = dessin(S, p.dessin);
  t.push(`<ellipse cx="50" cy="96" rx="30" ry="2.4" fill="#000" opacity="0.07"/>`);
  let M = FLAT[basis](S, t, p);
  if (basis === 'oberteil') M = { ...M, ...oberteilMasse(p) };
  else if (basis === 'rock') M = { hem: M, oben: 16, flare: { bleistift: 15, gerade: 18, 'a-linie': 25, plissee: 28, glocke: 31, wickel: 24, stufen: 28 }[p.form ?? 'a-linie'] };
  else if (basis === 'kleid') { const taille = 34; M = { oben: 8, taille, hem: { mini: taille + 30, knie: taille + 46, midi: taille + 56, maxi: taille + 62 }[p.laenge ?? 'knie'], flare: { bleistift: 15, gerade: 18, etui: 16, 'a-linie': 25, plissee: 28, glocke: 31, wickel: 24, slip: 19, stufen: 28 }[p.form ?? 'a-linie'] ?? 25 }; }
  else M = M ?? { oben: 9 };
  for (const x of p.extras ?? []) EXTRAS[x]?.(S, t, p, M);
  if (p.motiv) { const [x, y, s] = motivLage(basis, p, M); t.push(motiv(p.motiv, p.motivX ?? x, p.motivY ?? y, p.motivS ?? s)); }
}

// Zoom wie produkt.js für kurze Teile
export function q33zoom(p) {
  if (p.basis === 'oberteil' && p.laenge === 'crop') return [1.3, 50, 36];
  if (p.basis === 'hose' && p.laenge === 'kurz') return [1.4, 50, 32];
  if (p.basis === 'hose' && p.laenge === 'bermuda') return [1.22, 50, 37];
  if (p.basis === 'rock' && p.laenge === 'mini') return [1.5, 50, 32];
  if (p.basis === 'rock' && p.laenge === 'knie') return [1.2, 50, 42];
  return null;
}
