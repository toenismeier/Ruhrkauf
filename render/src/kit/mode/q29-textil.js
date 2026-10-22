// Q29: Home Textil – Bettwäsche, Bettdecke, Kissen, Laken, Tagesdecke, Bad, Tisch, Vorhang.
// Zeichner (S, t, p): Stoffkontext S (stoff.js), Teile t, Parameter p.

import { f, E, glatt, flaeche, hell, dunkel, mische, linie, naht, boden, form, zylinder, stoff2, muster, maserung, glanz } from './q29-hilfen.js';

// Muster über einer Fläche: stoff.js-Muster sind schon in S.tex; eigene Muster (punkte, print) kommen hier dazu
function musterUeber(S, d, p) {
  if (!p.muster || S.tex) return '';
  const m = muster(S, p.muster);
  return m ? `<path d="${d}" fill="${m}"/>` : '';
}
// Glanz für Satin (Mako-Satin) als weiche Querbahnen
function satin(S, d, p) {
  if (S.m !== 'satin') return '';
  return `<path d="${d}" fill="${muster(S, 'satinstreifen')}"/>`;
}

// Gefalteter Textilstapel: Deckfläche (leicht perspektivisch) + Vorderkante mit Falzlagen
function stapel(S, t, { x0, x1, y, tief = 10, hoch = 26, lagen = 3, ton = 0, p = {}, weich = false }) {
  const w = (x, y2, e) => [x, y2, e];
  const top = glatt([w(x0 + 3, y, E), w(x1 - 3, y, E), w(x1, y + tief, E), w(x0, y + tief, E)], true, 0.2);
  const yb = y + tief + hoch;
  const vorn = weich
    ? glatt([w(x0, y + tief, E), w(x1, y + tief, E), [x1 + 1.2, y + tief + hoch * 0.5], w(x1, yb - 1), [(x0 + x1) / 2, yb + 0.8], w(x0, yb - 1), [x0 - 1.2, y + tief + hoch * 0.5]], true, 0.45)
    : glatt([w(x0, y + tief, E), w(x1, y + tief, E), [x1 + 0.8, y + tief + hoch / 2], w(x1, yb, E), w(x0, yb, E), [x0 - 0.8, y + tief + hoch / 2]], true, 0.4);
  t.push(flaeche(S, vorn, { ton: ton - 0.07 }), musterUeber(S, vorn, p), satin(S, vorn, p));
  for (let i = 1; i < lagen; i++) {
    const yy = y + tief + (hoch * i) / lagen;
    const b = weich ? 1.6 : 1;
    t.push(`<path d="M${f(x0)} ${f(yy)} Q${f((x0 + x1) / 2)} ${f(yy + b * 1.6)} ${f(x1)} ${f(yy)}" stroke="${dunkel(S.c, 0.32)}" stroke-width="0.9" fill="none" opacity="0.65"/>`);
    t.push(`<path d="M${f(x0 + 1)} ${f(yy + 1)} Q${f((x0 + x1) / 2)} ${f(yy + b * 1.6 + 1)} ${f(x1 - 1)} ${f(yy + 1)}" stroke="${hell(S.c, 0.35)}" stroke-width="0.6" fill="none" opacity="0.55"/>`);
  }
  // seitliche Falzrundung
  t.push(`<path d="M${f(x1 - 0.4)} ${f(y + tief + 1)} Q${f(x1 + 1.4)} ${f(y + tief + hoch / 2)} ${f(x1 - 0.4)} ${f(yb - 1)}" stroke="${dunkel(S.c, 0.25)}" stroke-width="1.2" fill="none" opacity="0.4"/>`);
  t.push(flaeche(S, top, { ton: ton + 0.08 }), musterUeber(S, top, p), satin(S, top, p));
  if (weich) for (const [a, b2] of [[0.3, 0.45], [0.62, 0.7]]) t.push(linie(`M${f(x0 + (x1 - x0) * a)} ${f(y + 2)} q2 ${f(tief * 0.4)} ${f((x1 - x0) * (b2 - a))} ${f(tief * 0.5)}`, dunkel(S.c, 0.2), 0.5, 0.5));
  return { top, vorn, yb };
}

export const TEXTIL = {
  // Bettwäsche-Set: Kissenbezug 80×80 aufgestellt hinter dem dreifach gelegten Bettbezug 135×200, beide aus demselben Stoff,
  // Knopfleiste am Bezug, schmale Banderole mit Bett-Piktogramm. Satin glänzt, Renforcé gemustert, Leinen weich gewellt.
  // Maß: Kissen 0,7 der Bezugsbreite, Bezug Vorderkante Breite : Höhe 3 : 1.
  bettwaesche(S, t, p) {
    const weich = S.m === 'leinen';
    t.push(boden(50, 87, 44, 3));
    // aufgestelltes Kissen
    const kis = glatt([[24, 22, E], [50, 24.6], [76, 22, E], [74, 38], [78, 54, E], [22, 54, E], [26, 38]], true, 0.4);
    t.push(flaeche(S, kis, { ton: 0.05 }), musterUeber(S, kis, p), satin(S, kis, p));
    t.push(`<path d="${glatt([[28.6, 26.4], [50, 28.6], [71.4, 26.4], [69.8, 38], [73, 51], [27, 51], [30.2, 38]], true, 0.5)}" fill="none" stroke="${dunkel(S.c, 0.25)}" stroke-width="0.6" opacity="0.6"/>`);
    t.push(`<ellipse cx="44" cy="36" rx="14" ry="6" fill="#fff" opacity="${weich ? 0.08 : 0.16}"/>`);
    if (weich) t.push(linie('M30 22 q6 6 4 14 M66 24 q-4 8 -2 16', dunkel(S.c, 0.2), 0.5, 0.5));
    const { yb } = stapel(S, t, { x0: 8, x1: 92, y: 48, tief: 10, hoch: 28, lagen: 3, p, weich });
    // Knopfleiste an der vorderen Lage
    t.push(`<path d="M8 ${yb - 4} H92" stroke="${dunkel(S.c, 0.2)}" stroke-width="0.5" opacity="0.6"/>`);
    for (let x = 18; x < 92; x += 12) t.push(`<circle cx="${x}" cy="${yb - 6.4}" r="1.1" fill="${hell(S.c, 0.45)}" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.35"/>`);
    // Banderole mit Bett-Piktogramm
    t.push(`<path d="M58 48 L72 48 L72.6 58 L72 ${yb} L58 ${yb} L57.4 58 Z" fill="#f4efe4" stroke="#c9bfad" stroke-width="0.4"/>`);
    // Bett-Piktogramm: Kopfteil, Kissen, Decke
    t.push(`<g stroke="${dunkel(S.c, 0.5)}" stroke-width="0.9" fill="none" stroke-linecap="round"><path d="M59.6 72 V62 M59.6 68 H70.4 V72"/><rect x="61" y="64.6" width="3" height="2" rx="0.6" fill="${dunkel(S.c, 0.5)}"/><path d="M64.6 66.4 H70.4"/></g>`);
  },

  // Bettdecke (Füllung) 135×200 in Klarsicht-Tragetasche mit Reißverschluss und Griffen, wie im Regal:
  // gefaltete, gesteppte Decke (Kassetten) sichtbar, Einlegekarte mit Feder-Piktogramm.
  // Maß: Tasche 1,4 : 1, Decke dreifach gelegt mit Bausch, Griffe 1/4 der Breite.
  bettdecke(S, t, p) {
    t.push(boden(50, 88, 42, 3));
    // Griffe
    for (const x of [30, 58]) t.push(`<path d="M${x} 22 Q${x} 10 ${x + 6} 10 Q${x + 12} 10 ${x + 12} 22" stroke="#9aa3a8" stroke-width="2.2" fill="none"/>`);
    const tasche = 'M10 24 Q10 20 14 20 L86 20 Q90 20 90 24 L92 82 Q92 87 87 87 L13 87 Q8 87 8 82 Z';
    t.push(`<path d="${tasche}" fill="#e7ecee"/>`);
    // Decke innen: drei bauschige Lagen mit Steppkassetten
    [[64, 20], [45, 20], [26, 20]].forEach(([y, h], i) => {
      const d = glatt([[14, y + 1, E], [86, y + 1, E], [88.6, y + h / 2], [86, y + h, E], [14, y + h, E], [11.4, y + h / 2]], true, 0.5);
      t.push(flaeche(S, d, { ton: [-0.06, -0.02, 0.03][i] }));
      for (let x = 14; x < 82; x += 12) {
        t.push(`<ellipse cx="${x + 6}" cy="${f(y + h / 2 + 0.6)}" rx="5" ry="${f(h * 0.32)}" fill="#fff" opacity="0.4"/>`);
        t.push(linie(`M${x + 12} ${f(y + 3)} Q${x + 11} ${f(y + h / 2)} ${x + 12} ${f(y + h - 2)}`, dunkel(S.c, 0.25), 0.6, 0.7));
      }
    });
    // Folie: Glanz, Kante, Reißverschluss oben
    t.push(`<path d="${tasche}" fill="${glanz(S)}" opacity="0.8"/><path d="${tasche}" fill="none" stroke="#8e9ea4" stroke-width="0.8"/>`);
    t.push(`<path d="M14 23.4 H86" stroke="#7f8a90" stroke-width="1.2" stroke-dasharray="0.8 0.5"/><rect x="80" y="21.6" width="3" height="4.6" rx="0.8" fill="#9aa3a8"/>`);
    // Einlegekarte mit Feder
    t.push(`<rect x="22" y="48" width="26" height="20" rx="1" fill="${p.karte ?? '#2f4a5a'}"/>`);
    t.push(`<path d="M28 64 Q34 56 42 50 Q40 58 30 64 Z" fill="#f4f1ea"/><path d="M28 64 L41 51" stroke="${p.karte ?? '#2f4a5a'}" stroke-width="0.5"/><path d="M26 66 H44" stroke="#f4f1ea" stroke-width="0.8" opacity="0.7"/>`);
  },

  // Kopfkissen 80×40 mit Stehsaum (Biese 2 cm), prall, leicht perspektivisch liegend.
  // Maß: Breite:Höhe 2:1, Biese umlaufend, Ecken spitz auslaufend.
  kopfkissen(S, t, p) {
    t.push(boden(50, 76, 40, 3));
    const aussen = glatt([[8, 34, E], [50, 31], [92, 34, E], [89.4, 52], [92, 72, E], [50, 69], [8, 72, E], [10.6, 52]], true, 0.35);
    const innen = glatt([[13, 38], [50, 35.6], [87, 38], [85, 52], [87, 68], [50, 65.6], [13, 68], [15, 52]], true, 0.5);
    t.push(flaeche(S, aussen, { ton: -0.03 }), musterUeber(S, aussen, p), satin(S, aussen, p));
    t.push(flaeche(S, innen, { ton: 0.03 }), musterUeber(S, innen, p));
    t.push(`<ellipse cx="42" cy="47" rx="26" ry="9" fill="#fff" opacity="0.18"/><ellipse cx="58" cy="60" rx="24" ry="5" fill="#000" opacity="0.05"/>`);
    t.push(naht(innen.replace(/ Z$/, ''), S, 0.55));
    t.push(`<path d="M50 35.4 Q49 37 50.4 39 M50 65.8 Q51 64 49.6 62" stroke="${dunkel(S.c, 0.2)}" stroke-width="0.5" fill="none" opacity="0.5"/>`);
  },

  // Spannbettlaken auf Matratze: Matratze 90×200×20 in Aufsicht, Laken umgreift die Ecken mit Gummizug (Raffung unten).
  // Maß: Matratzenhöhe 0,2 der Breite, Eckenradius 4, Raffung 5 Falten je Ecke.
  spannbettlaken(S, t, p) {
    t.push(boden(50, 84, 46, 3));
    // Matratzenunterseite (Bezug weiß, schaut unten heraus)
    t.push(`<path d="M6 74 L94 74 L94 80 Q50 82 6 80 Z" fill="#e9e6df" stroke="#c9c4b8" stroke-width="0.4"/>`);
    for (let x = 10; x < 94; x += 6) t.push(linie(`M${x} 77.6 h3`, '#c9c4b8', 0.5));
    // Matratze weiß, rechte vordere Ecke noch frei
    const mO = 'M22 26 L78 26 Q82 26 83 29 L93 60 Q94 63 90 63 L10 63 Q6 63 7 60 L17 29 Q18 26 22 26 Z';
    const mV = 'M7 61 Q6 63 10 63 L90 63 Q94 63 93 61 L94 74 Q94 77 90 77 L10 77 Q6 77 6 74 Z';
    t.push(form(S, mV, '#e4e1da'), form(S, mO, '#f3f1ec'));
    for (const [x, y] of [[72, 56], [80, 52], [86, 58], [78, 60], [88, 48]]) t.push(`<path d="M${x - 1.6} ${y} l1.6 -1 l1.6 1 l-1.6 1 Z" fill="none" stroke="#cfcac0" stroke-width="0.5"/>`);
    t.push(`<path d="M62 77 L90 77 Q94 77 94 74 L93 61" stroke="#cfcac0" stroke-width="0.6" fill="none" stroke-dasharray="1 0.8"/>`);
    const oben = 'M22 26 L78 26 Q82 26 83 29 L84 33 Q74 50 58 63 L10 63 Q6 63 7 60 L17 29 Q18 26 22 26 Z';
    const vorn = 'M7 61 Q6 63 10 63 L58 63 Q55 70 56 77.6 L10 77.6 Q6 77 6 74 Z';
    t.push(flaeche(S, vorn, { ton: -0.08 }), musterUeber(S, vorn, p));
    t.push(flaeche(S, oben, { ton: 0.06 }), musterUeber(S, oben, p));
    // angehobene Ecke mit Gummizug
    const lasche = 'M84 33 Q74 50 58 63 Q55 70 56 77.6 Q64 66 72 60 Q86 50 92 36 Q88 32 84 33 Z';
    t.push(flaeche(S, lasche, { ton: -0.16 }));
    t.push(`<path d="M56 77.6 Q64 66 72 60 Q86 50 92 36" stroke="${dunkel(S.c, 0.4)}" stroke-width="2.4" fill="none"/>`);
    for (let i = 0; i < 9; i++) { const a2 = i / 8; t.push(linie(`M${f(58 + a2 * 33)} ${f(74 - a2 * 36)} l${f(-2.2)} ${f(-1.4)}`, dunkel(S.c, 0.4), 0.7, 0.8)); }
    // Gummizug-Saum unter der Matratze links
    t.push(`<path d="M6 74 Q6 77.4 10 77.6 L66 77.6" stroke="${dunkel(S.c, 0.3)}" stroke-width="1.4" fill="none"/>`);
    for (let i = 0; i < 5; i++) t.push(linie(`M${f(9 + i * 2.2)} 77 l-1 -${f(3 + i * 0.5)}`, dunkel(S.c, 0.3), 0.6, 0.7));
    t.push(`<path d="M7 61 Q34 64 58 63" stroke="${dunkel(S.c, 0.2)}" stroke-width="0.8" fill="none" opacity="0.6"/>`);
    t.push(linie('M24 30 Q30 38 26 50', dunkel(S.c, 0.15), 0.6, 0.5));
    t.push(`<ellipse cx="44" cy="42" rx="22" ry="8" fill="#fff" opacity="0.12"/>`);
  },

  // Tagesdecke (Wendesteppdecke 220×240) über das ganze Bett gelegt, fällt bis zum Boden, Kissenwulst unter der Decke,
  // vordere Ecke umgeschlagen zeigt die Wendeseite. Rautensteppung, Einfassband.
  // Maß: Liegefläche 3 : 1 in Aufsicht, Überhang = 1,4-mal Matratzenhöhe, Raute 8 Einheiten.
  tagesdecke(S, t, p) {
    t.push(boden(50, 88, 46, 3));
    const wende = p.farbe2 ?? hell(S.c, 0.45);
    // gepolstertes Kopfteil und Kissen hinter der Decke
    const kopf = '#d9d2c4';
    t.push(form(S, glatt([[16, 10, E], [84, 10, E], [84, 36, E], [16, 36, E]], true, 0.2), kopf));
    for (const x of [27, 38.6, 50, 61.4, 73]) t.push(linie(`M${x} 12 V34`, dunkel(kopf, 0.15), 0.6, 0.6));
    const ober = glatt([[16, 30, E], [32, 24], [50, 27], [68, 24], [84, 30, E], [86, 36], [92, 56, E], [8, 56, E], [14, 36]], true, 0.35);
    const vorn = glatt([[8, 56, E], [92, 56, E], [93, 70], [92, 86, E], [80, 84.6], [66, 86.6], [50, 85], [34, 86.6], [20, 84.6], [8, 86, E], [7, 70]], true, 0.4);
    t.push(flaeche(S, vorn, { ton: -0.07 }), musterUeber(S, vorn, p));
    t.push(flaeche(S, ober, { ton: 0.05 }), musterUeber(S, ober, p));
    // Kissenwulst
    t.push(`<path d="M15 37 Q50 33 85 37" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.9" fill="none" opacity="0.6"/>`);
    // Rautensteppung
    const cid = 'tg' + Math.random().toString(36).slice(2, 6);
    S.defs.push(`<clipPath id="${cid}"><path d="${ober} ${vorn}"/></clipPath>`);
    const st = [];
    for (let x = -80; x < 160; x += 9) st.push(`M${x} 20 L${x + 50.6} 92`, `M${x + 50.6} 20 L${x} 92`);
    const baeusche = [];
    for (let y = 20; y < 92; y += 6.4) for (let x = -4; x < 104; x += 9) { const xx = x + ((Math.round((y - 20) / 6.4)) % 2 ? 4.5 : 0); baeusche.push(`<ellipse cx="${f(xx - 0.6)}" cy="${f(y - 0.6)}" rx="2.4" ry="1.5" fill="#fff" opacity="0.28"/>`); }
    t.push(`<g clip-path="url(#${cid})">${baeusche.join('')}<path d="${st.join(' ')}" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.7" fill="none" opacity="0.8"/></g>`);
    t.push(`<path d="M8 56 L92 56" stroke="${dunkel(S.c, 0.32)}" stroke-width="0.9" opacity="0.6"/>`);
    // Einfassband am Saum
    t.push(`<path d="M8 86 L20 84.6 L34 86.6 L50 85 L66 86.6 L80 84.6 L92 86" stroke="${dunkel(S.c, 0.3)}" stroke-width="1.6" fill="none"/>`);
    // umgeschlagene Ecke vorne links mit Wendeseite
    const W = stoff2(S, wende, S.m);
    t.push(flaeche(W, 'M8 56 L30 56 Q20 66 8 74 Z', { ton: 0.02 }));
    t.push(`<path d="M30 56 Q20 66 8 74" stroke="${dunkel(S.c, 0.35)}" stroke-width="1.4" fill="none"/>`);
  },

  // Badematte 50×80 auf Fliesen, Hochflor-Schlingen, Ecken gerundet (r = 6 cm).
  // Maß: Matte in Aufsicht 60°, Breite:Tiefe 1,6:1, Fliesenraster 12 Einheiten.
  badematte(S, t, p) {
    // Fliesenboden als Standfläche
    const fl = 'M14 44 L86 44 L98 92 L2 92 Z';
    t.push(`<path d="${fl}" fill="#e6eaec"/>`);
    for (let i = 1; i < 6; i++) { const a2 = i / 6; t.push(linie(`M${f(14 + 72 * a2)} 44 L${f(2 + 96 * a2)} 92`, '#cbd2d6', 0.5)); }
    for (const y of [54, 66, 79]) { const k = (y - 44) / 48; t.push(linie(`M${f(14 - 12 * k)} ${y} L${f(86 + 12 * k)} ${y}`, '#cbd2d6', 0.5)); }
    const d = glatt([[20, 54, E], [80, 54, E], [90, 84, E], [10, 84, E]].map(([x, y]) => [x, y]), true, 0.12);
    const d2 = 'M22.5 54 L77.5 54 Q80.4 54 81 56.6 L89 81.4 Q89.8 84 87 84 L13 84 Q10.2 84 11 81.4 L19 56.6 Q19.6 54 22.5 54 Z';
    t.push(`<path d="M12 86 L88 86" stroke="#000" opacity="0.08" stroke-width="2"/>`);
    t.push(`<path d="${d2}" fill="${dunkel(S.c, 0.18)}" transform="translate(0 1.6)"/>`);
    t.push(flaeche(S, d2), musterUeber(S, d2, p));
    const cid = 'bm' + Math.random().toString(36).slice(2, 6);
    S.defs.push(`<clipPath id="${cid}"><path d="${d2}"/></clipPath>`);
    const flor = [];
    for (let y = 56; y < 84; y += 2.2) for (let x = 10; x < 90; x += 2.4) flor.push(`<circle cx="${f(x + ((y * 7) % 2.4))}" cy="${f(y)}" r="0.75" fill="${(x + y) % 3 < 1 ? hell(S.c, 0.25) : dunkel(S.c, 0.12)}" opacity="0.7"/>`);
    t.push(`<g clip-path="url(#${cid})">${flor.join('')}</g>`);
    t.push(`<path d="${d2}" fill="none" stroke="${hell(S.c, 0.2)}" stroke-width="1.6" opacity="0.6"/>`);
    void d;
  },

  // Waffelpiqué-Handtuch 50×100 über Handtuchhalter an der Wand: oben über die Stange gelegt, Waffelstruktur fein, glatte Bordüre.
  // Maß: vordere Lage 15 % kürzer als hintere, Waffel 2,4 Einheiten, Bordüre 1/14 der Länge.
  waffelhandtuch(S, t, p) {
    t.push(boden(50, 92, 26, 2));
    t.push(`<rect x="10" y="14" width="5" height="10" rx="1.4" fill="#8a8f95"/><rect x="85" y="14" width="5" height="10" rx="1.4" fill="#8a8f95"/>`);
    t.push(form(S, 'M12 16.4 L88 16.4 L88 20.6 L12 20.6 Z', '#b9bec3', { licht: 'metall' }));
    const W = stoff2(S, S.c, 'waffel');
    const hinten = glatt([[25, 17, E], [75, 17, E], [76, 88, E], [24, 88, E]], true, 0.2);
    const vorn = glatt([[24, 21, E], [76, 21, E], [77, 50], [77, 78, E], [23, 78, E], [23, 50]], true, 0.3);
    t.push(flaeche(W, hinten, { ton: -0.12 }));
    t.push(`<path d="M24 21 Q22 14 30 13 L70 13 Q78 14 76 21 Z" fill="${hell(S.c, 0.06)}" stroke="${dunkel(S.c, 0.25)}" stroke-width="0.5"/>`);
    t.push(flaeche(W, vorn));
    const cid = 'wf' + Math.random().toString(36).slice(2, 6);
    S.defs.push(`<clipPath id="${cid}"><path d="${vorn}"/></clipPath>`, `<pattern id="${cid}p" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><rect x="0.45" y="0.45" width="1.5" height="1.5" rx="0.3" fill="#000" opacity="0.07"/></pattern>`);
    t.push(`<g clip-path="url(#${cid})"><rect x="20" y="20" width="60" height="60" fill="url(#${cid}p)"/></g>`);
    // Bordüren glatt (Webkante)
    for (const [y, h] of [[70, 4], [84, 3]]) t.push(`<rect x="${y > 80 ? 24.4 : 23.2}" y="${y}" width="${y > 80 ? 51.2 : 53.6}" height="${h}" fill="${hell(S.c, 0.1)}"/><path d="M${y > 80 ? 24.4 : 23.2} ${y + 0.4} h${y > 80 ? 51.2 : 53.6}" stroke="${dunkel(S.c, 0.22)}" stroke-width="0.4"/>`);
    t.push(`<path d="M28 24 Q27 50 29 74" stroke="#fff" stroke-width="2" fill="none" opacity="0.25" stroke-linecap="round"/>`);
    t.push(linie('M24 78 L23.4 78.6 M76 78 L76.6 78.6', dunkel(S.c, 0.3), 0.6));
  },

  // Tischdecke auf rundem Tisch, Fall 30 cm mit sechs Wurffalten, Tischbeine sichtbar.
  // Maß: Tischplatte Ellipse 76×16, Fall 36 % der Tischhöhe.
  tischdecke(S, t, p) {
    t.push(boden(50, 90, 34, 2.6));
    const holz = '#8f6a48';
    for (const [x1, x2] of [[30, 27], [70, 73]]) t.push(`<path d="M${x1} 60 L${x2} 90" stroke="${holz}" stroke-width="2.6" stroke-linecap="round"/>`);
    t.push(`<path d="M50 60 L50 89" stroke="${dunkel(holz, 0.2)}" stroke-width="2.6" stroke-linecap="round"/>`);
    const fall = glatt([[12, 38, E], [88, 38, E], [90, 52], [92, 66, E], [84, 64.4], [76, 67.6], [66, 65], [56, 68.6], [46, 65.4], [36, 68.4], [26, 65], [16, 67.4], [8, 66, E], [10, 52]], true, 0.4);
    t.push(flaeche(S, fall, { ton: -0.08 }), musterUeber(S, fall, p));
    for (const x of [21, 31, 41, 51, 61, 71, 81]) t.push(linie(`M${f(x + (x - 50) * 0.02)} 44 Q${f(x + (x - 50) * 0.08)} 56 ${f(x + (x - 50) * 0.1)} 66`, dunkel(S.c, 0.22), 0.8, 0.45));
    const platte = `M12 38 A38 9 0 0 1 88 38 A38 9 0 0 1 12 38 Z`;
    t.push(flaeche(S, platte, { ton: 0.07 }), musterUeber(S, platte, p));
    t.push(naht('M15 66.4 Q50 70 85 66.4', S, 0.5));
    // kleine Vase
    t.push(`<path d="M47 37 Q45 31 48 27 L52 27 Q55 31 53 37 Z" fill="#e8e2d6" stroke="#b7ad9d" stroke-width="0.4"/><path d="M50 27 Q49 20 46 16 M50 27 Q52 21 55 18" stroke="#7f8f68" stroke-width="0.6" fill="none"/><circle cx="46" cy="16" r="1.4" fill="#e9d9b4"/><circle cx="55" cy="18" r="1.2" fill="#e9d9b4"/>`);
  },

  // Tischläufer 40×150 auf Holztisch, Längsrichtung in die Tiefe, Fransen 3 cm an der Vorderkante, hängt 20 cm über.
  // Maß: Läufer 30 % der Tischbreite, Überhang 1,5-mal Plattenstärke.
  tischlaeufer(S, t, p) {
    t.push(boden(50, 90, 40, 2.4));
    const holz = '#c39b6e';
    const platte = 'M18 30 L82 30 L96 66 L4 66 Z';
    t.push(form(S, platte, holz));
    t.push(maserung(S, platte, holz, 8, 0, 100, 30, 66));
    t.push(form(S, 'M4 66 L96 66 L96 71 L4 71 Z', dunkel(holz, 0.18)));
    for (const x of [8, 88]) t.push(`<rect x="${x}" y="71" width="4" height="19" fill="${dunkel(holz, 0.28)}"/>`);
    const laeufer = glatt([[41, 30, E], [59, 30, E], [64, 66, E], [36, 66, E]], true, 0.1);
    t.push(flaeche(S, laeufer), musterUeber(S, laeufer, p));
    const ueber = 'M36 66 L64 66 L64 76 L36 76 Z';
    t.push(flaeche(S, ueber, { ton: -0.12 }), musterUeber(S, ueber, p));
    t.push(naht('M43 31.6 L38.4 64.6 M57 31.6 L61.6 64.6', S, 0.55));
    for (let x = 36.6; x < 64; x += 1.6) t.push(linie(`M${f(x)} 76 l0 3.4`, dunkel(S.c, 0.08), 0.6));
    // Windlicht
    t.push(`<rect x="46" y="37" width="8" height="10" rx="1" fill="#e5eef1" opacity="0.7" stroke="#8fa3aa" stroke-width="0.4"/><rect x="48" y="41" width="4" height="5" fill="#f6efe2"/><path d="M50 41 l0 -1.6" stroke="#333" stroke-width="0.4"/><path d="M50 37.2 q-1 1.4 0 2.4 q1 -1 0 -2.4" fill="#f6c453"/>`);
  },

  // Vorhang (Ösenschal 140×245) an Metallstange, sechs Wellenfalten, unten Raffhalter auf 60 % Höhe.
  // Maß: Schal 0,45 der Bildbreite, Falten gleichmäßig, Saum 5 cm.
  vorhang(S, t, p) {
    t.push(boden(50, 92, 30, 2));
    t.push(`<rect x="6" y="11" width="88" height="2.6" rx="1.3" fill="#3c3f44"/><circle cx="6" cy="12.3" r="2.4" fill="#3c3f44"/><circle cx="94" cy="12.3" r="2.4" fill="#3c3f44"/>`);
    // linker Schal; rechter gespiegelt
    const X = (x, sp) => (sp ? 100 - x : x);
    for (const sp of [false, true]) {
      const P = (s) => s.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(X(+x, sp))} ${y}`);
      const d = P('M10 14 L44 14 C42 30 26 50 19 61 C25 70 34 81 38 90 Q33 92.4 28 90.4 Q23 92.4 18 90.4 Q12 92.4 6 90 L8 64 C9.4 50 10 30 10 14 Z');
      t.push(flaeche(S, d), musterUeber(S, d, p));
      for (let i = 1; i < 6; i++) {
        const x = 10 + 34 * i / 6, xb = 8 + 28 * i / 5;
        t.push(linie(P(`M${f(x)} 15 C${f(x - i * 2)} 34 ${f(12 + i * 1.2)} 50 ${f(11 + i * 1.4)} 61 C${f(12 + i * 2)} 72 ${f(xb - 2)} 80 ${f(xb)} 90`), dunkel(S.c, 0.24), 0.8, 0.5));
      }
      for (let i = 0; i < 6; i++) t.push(`<circle cx="${f(X(12 + 30 * i / 5, sp))}" cy="16" r="1.7" fill="none" stroke="#3c3f44" stroke-width="1"/>`);
      t.push(`<rect x="${f(X(sp ? 20 : 7, sp))}" y="60" width="13" height="3.6" rx="1.6" fill="${dunkel(S.c, 0.3)}"/>`);
    }
  },

  // Servietten 45×45, viertelt gelegt, zwei versetzt gestapelt, obere mit eingeschlagener Ecke und Hohlsaum.
  // Maß: Quadrat, Hohlsaum 4 % Abstand vom Rand, kein Ring.
  serviette(S, t, p) {
    t.push(boden(50, 82, 36, 3));
    const unten = 'M18 40 L70 32 L84 66 L30 76 Z';
    t.push(flaeche(S, unten, { ton: -0.08 }), musterUeber(S, unten, p));
    const oben = 'M24 30 L72 24 L82 56 L34 64 Z';
    t.push(`<path d="${oben}" fill="#000" opacity="0.08" transform="translate(1.2 2)"/>`);
    t.push(flaeche(S, oben, { ton: 0.04 }), musterUeber(S, oben, p));
    // Hohlsaum
    t.push(`<path d="M27.6 32.2 L70.4 26.8 L79 54 L36 61.2 Z" fill="none" stroke="${hell(S.c, 0.45)}" stroke-width="0.9" stroke-dasharray="0.7 0.6"/>`);
    // eingeschlagene Ecke
    t.push(`<path d="M72 24 L82 56 L66 42 Z" fill="${dunkel(S.c, 0.12)}"/><path d="M72 24 L66 42 L82 56" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.5"/>`);
    t.push(flaeche(S, 'M72 24 L66 42 L82 56 Z', { ton: 0.12 }));
    t.push(linie('M24 30 L34 64', dunkel(S.c, 0.25), 0.5, 0.5));
    // Zweig Olive
    t.push(linie('M40 44 Q48 40 58 41', '#6d6a4e', 0.6));
    for (const [x, y, w] of [[45, 41.4, -30], [50, 40.4, 25], [55, 40.6, -20]]) t.push(`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="0.9" fill="#8a9a72" transform="rotate(${w} ${x} ${y})"/>`);
  },
};
