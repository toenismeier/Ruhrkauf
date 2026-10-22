// Q29: Beauty – Pflege, Make-up, Duft, Bad. Produktfoto mit Standfläche, keine Marken, Etiketten ohne Schrift.

import { f, E, glatt, hell, dunkel, mische, linie, boden, form, zylinder, glas, rund, metall, glanz, etikett } from './q29-hilfen.js';

const GOLD = '#c9a24a';
const SCHWARZ = '#2c2b2e';
const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
const rr = (x, y, w, h, r) => `M${f(x + r)} ${f(y)} L${f(x + w - r)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} L${f(x + w)} ${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} L${f(x + r)} ${f(y + h)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} L${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;

export const BEAUTY = {
  // Creme: flache Cremedose 100 ml (Ø : Höhe = 2,4 : 1), Deckel abgenommen und flach daneben, Cremehaube mit Spitze, Cremetupfer davor.
  // Maß: Dose 0,6 der Bildbreite, Haube 0,5 Dosenhöhe über dem Rand.
  creme(S, t) {
    t.push(boden(46, 86, 42, 3));
    // Deckel flach liegend rechts hinten
    t.push(zylinder(S, 76, 50, 56, 18, 5.4, '#f4f2ee'), `<ellipse cx="76" cy="50" rx="13" ry="3.6" fill="none" stroke="#d6d0c4" stroke-width="0.5"/>`);
    // Dose
    t.push(zylinder(S, 40, 60, 84, 30, 8.4, S.c, { deckel: false, glanz: true }));
    t.push(`<path d="${ell(40, 60, 30, 8.4)}" fill="${hell(S.c, 0.25)}"/>`);
    // Cremehaube
    t.push(`<path d="M13 60 Q12 52 22 49 Q30 46 36 44 Q40 36 42 33 Q44 40 50 44 Q60 47 66 52 Q69 57 67 60 Q40 68 13 60 Z" fill="#fbf8f4"/>`);
    t.push(`<path d="M20 55 Q34 50 48 52 Q58 53 64 56 M28 50 Q38 46 46 47" stroke="#e4dbd0" stroke-width="1" fill="none"/><path d="M42 33 Q41 40 44 44" stroke="#e8e0d4" stroke-width="0.8" fill="none"/>`);
    t.push(`<path d="M13 60 Q12 52 22 49 Q30 46 36 44 Q40 36 42 33 Q44 40 50 44 Q60 47 66 52 Q69 57 67 60" fill="none" stroke="#d8cfc2" stroke-width="0.5"/>`);
    t.push(etikett(26, 68, 28, 9, '#fbf8f3', dunkel(S.c, 0.45)));
    // Tupfer
    t.push(`<path d="M74 88 Q74 82 79 82 Q80 79 82 78 Q83 81 85 82 Q89 83 88 88 Q81 90 74 88 Z" fill="#fbf8f4" stroke="#d8cfc2" stroke-width="0.5"/>`);
  },

  // Tiegel (Balsam) 30 ml Braunglas, schwarzer Schraubdeckel gerillt, Etikett umlaufend.
  // Maß: Ø : Höhe = 1,3 : 1, Deckel 0,4 Höhe.
  tiegel(S, t) {
    t.push(boden(50, 86, 30, 3));
    t.push(zylinder(S, 50, 58, 86, 26, 7, S.c, { glanz: true, deckel: false }));
    t.push(etikett(30, 64, 40, 16, '#f4efe4', '#3a332c'));
    t.push(zylinder(S, 50, 38, 58, 27, 7.2, SCHWARZ));
    for (let i = 0; i < 16; i++) { const x = 24 + i * 3.4; t.push(linie(`M${f(x)} ${40 + Math.abs(x - 50) * 0.02} V${f(57 + 5.2 * Math.sqrt(Math.max(0, 1 - ((x - 50) / 27) ** 2)))}`, '#000', 0.5, 0.35)); }
    t.push(`<ellipse cx="50" cy="38" rx="27" ry="7.2" fill="#3a393c"/><ellipse cx="44" cy="37" rx="12" ry="2.4" fill="#fff" opacity="0.12"/>`);
  },

  // Parfum 50 ml: Flakon nach Form (eckig: dicker Glasboden; rund: Kugel; saeule: hoher Zylinder), Sprühkopf mit Metallkragen, Kappe.
  // Maß: eckig Breite : Höhe 0,8 : 1 ohne Kappe, Kappe 0,45 Flakonhöhe; Säule 0,6 : 1 mit Glasboden 1/5.
  parfum(S, t, p) {
    const form2 = p.form ?? 'eckig';
    t.push(boden(50, 88, 30, 3));
    const fl = mische(S.c, '#ffffff', 0.25);
    if (form2 === 'rund') {
      t.push(`<circle cx="50" cy="62" r="25" fill="${fl}" opacity="0.75"/><circle cx="50" cy="66" r="21" fill="${S.c}" opacity="0.5"/>`);
      t.push(glas(S, ell(50, 62, 25, 25), { deck: 0.2 }));
      t.push(form(S, rr(44, 32, 12, 6, 1), GOLD, { licht: 'metall' }));
      t.push(form(S, 'M50 6 C62 6 64 20 56 32 L44 32 C36 20 38 6 50 6 Z', '#e9e4dc', { licht: 'rund' }));
    } else if (form2 === 'saeule') {
      // hoher, schmaler Flakon mit dickem Glasboden und facettierten Kanten, Zylinderkappe aus Metall
      t.push(`<rect x="34" y="34" width="32" height="54" rx="1" fill="${fl}" opacity="0.75"/><rect x="38" y="40" width="24" height="36" fill="${S.c}" opacity="0.55"/>`);
      t.push(glas(S, rr(34, 34, 32, 54, 1), { deck: 0.2 }));
      t.push(`<path d="M34 76 H66 M38 34 V88 M62 34 V88" stroke="#8e9ea4" stroke-width="0.5" opacity="0.7"/><rect x="34" y="76" width="32" height="12" fill="#fff" opacity="0.3"/>`);
      t.push(etikett(40, 52, 20, 7, '#fbf8f3', '#4a4440', { r: 0.3 }));
      t.push(form(S, rr(44, 28, 12, 6, 0.8), GOLD, { licht: 'metall' }), zylinder(S, 50, 8, 28, 8, 2.4, GOLD, { metall: true }));
    } else {
      t.push(`<path d="M24 40 L76 40 L76 88 L24 88 Z" fill="${fl}" opacity="0.75"/><path d="M27 46 L73 46 L73 78 L27 78 Z" fill="${S.c}" opacity="0.55"/>`);
      t.push(glas(S, 'M24 40 L76 40 L76 88 L24 88 Z', { deck: 0.25 }));
      t.push(`<path d="M24 78 L76 78 L76 88 L24 88 Z" fill="#fff" opacity="0.3"/><path d="M24 78 L76 78" stroke="#8e9ea4" stroke-width="0.5"/>`);
      t.push(etikett(38, 56, 24, 9, '#fbf8f3', '#4a4440', { r: 0.4 }));
      t.push(form(S, rr(42, 32, 16, 8, 1), GOLD, { licht: 'metall' }));
      t.push(form(S, rr(38, 10, 24, 22, 2), SCHWARZ, { licht: 'rund' }));
      t.push(`<path d="M41 13 L41 29" stroke="#fff" stroke-width="1.6" opacity="0.2"/>`);
    }
  },

  // Lippenstift: Hülse Ø 2, Mine schräg angeschnitten, Kappe liegend davor, Farbstrich als Swatch.
  // Maß: Mine 0,35 der Gesamthöhe, Goldring 0,1.
  lippenstift(S, t) {
    t.push(boden(50, 88, 34, 2.6));
    t.push(`<path d="M10 92 C30 84 54 92 78 82" stroke="${S.c}" stroke-width="4.6" fill="none" stroke-linecap="round" opacity="0.85"/>`);
    t.push(form(S, rr(36, 46, 22, 40, 2), SCHWARZ, { licht: 'rund' }));
    t.push(form(S, rr(38, 38, 18, 9, 0.8), GOLD, { licht: 'metall' }));
    t.push(form(S, 'M40 38 L40 18 Q40 12 47 10 L54 6 L54 38 Z', S.c, { licht: 'rund', glanz: true }));
    t.push(`<path d="M40.6 20 Q42 13 47 10 L54 6.6" stroke="#fff" stroke-width="0.7" fill="none" opacity="0.5"/>`);
    // Kappe liegend
    t.push(`<g transform="rotate(-72 74 76)">${form(S, rr(64, 66, 20, 26, 2), SCHWARZ, { licht: 'rund' })}<rect x="64" y="66" width="20" height="3" fill="${GOLD}"/></g>`);
  },

  // Mascara: Hülse 12 cm Ø 1,6, Bürstchen herausgezogen schräg, Spiralbürste dicht.
  // Maß: Bürste 0,25 der Stablänge, Kappe = Griff 0,4 der Länge.
  mascara(S, t) {
    t.push(boden(50, 90, 34, 2.4));
    t.push(form(S, rr(28, 22, 14, 66, 7), S.c, { licht: 'rund', glanz: true }));
    t.push(`<rect x="28" y="38" width="14" height="2" fill="${GOLD}"/>`, `<ellipse cx="35" cy="23" rx="6" ry="1.6" fill="${dunkel(S.c, 0.3)}"/>`);
    t.push(`<g transform="rotate(28 62 54)">`, form(S, rr(56, 12, 12, 34, 6), S.c, { licht: 'rund', glanz: true }), `<rect x="56" y="44" width="12" height="2" fill="${GOLD}"/>`, `<rect x="61" y="46" width="2" height="20" fill="#3a3a3a"/>`);
    t.push(`<path d="M58 66 Q62 64 66 66 L66 86 Q62 88 58 86 Z" fill="#1e1e20"/>`);
    for (let y = 67; y < 86; y += 1.3) t.push(linie(`M56.6 ${f(y)} L67.4 ${f(y + 0.6)}`, '#111', 0.6));
    t.push('</g>');
  },

  // Nagellack 10 ml: gedrungene Glasflasche, hohe schwarze Kappe, Lacktropfen und Strich.
  // Maß: Flasche Breite : Höhe 1 : 0,8, Kappe 1,4 Flaschenhöhe.
  nagellack(S, t) {
    t.push(boden(46, 88, 30, 2.6));
    const fl = rr(26, 52, 40, 36, 6);
    t.push(`<path d="${fl}" fill="${S.c}"/>`, `<path d="${fl}" fill="${rund(S)}"/>`, `<path d="${fl}" fill="${glanz(S)}"/>`, `<path d="${fl}" fill="none" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.6"/>`);
    t.push(`<rect x="28" y="54" width="36" height="32" rx="5" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.4"/>`);
    t.push(form(S, rr(36, 14, 20, 40, 2), SCHWARZ, { licht: 'rund' }));
    t.push(`<path d="M40 17 V51" stroke="#fff" stroke-width="1.4" opacity="0.18"/>`);
    t.push(`<path d="M72 82 Q76 74 80 82 Q80 86 76 86 Q72 86 72 82 Z" fill="${S.c}"/><circle cx="74.6" cy="81" r="1" fill="#fff" opacity="0.5"/>`);
  },

  // Lidschattenpalette: Klappdose 12×9, Spiegel im Deckel, 3×3 Näpfchen in Farbverlauf.
  // Maß: Näpfchen 1/4 der Breite, Rand 1/16.
  lidschatten(S, t) {
    t.push(boden(50, 86, 42, 3));
    t.push(form(S, 'M16 14 L84 14 L80 46 L20 46 Z', SCHWARZ));
    t.push(`<path d="M20 17 L80 17 L77 43 L23 43 Z" fill="#c9d3d8"/><path d="M28 18 L40 18 L32 42 L24 42 Z" fill="#fff" opacity="0.35"/>`);
    t.push(form(S, 'M12 48 L88 48 L92 84 L8 84 Z', SCHWARZ));
    const farben = [hell(S.c, 0.55), hell(S.c, 0.35), hell(S.c, 0.15), S.c, dunkel(S.c, 0.2), mische(S.c, GOLD, 0.5), dunkel(S.c, 0.4), mische(S.c, '#6a4630', 0.5), dunkel(S.c, 0.6)];
    farben.forEach((c, i) => {
      const r = Math.floor(i / 3), s = i % 3;
      const y = 52 + r * 10.4, k = (y - 48) / 36;
      const x0 = 12 - 4 * k + 4, w = (76 + 8 * k - 8) / 3;
      const x = x0 + s * w;
      t.push(`<path d="${rr(x + 0.8, y, w - 1.6, 9, 1.6)}" fill="${c}"/><path d="${rr(x + 0.8, y, w - 1.6, 9, 1.6)}" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="0.4"/>`);
      if (i === 5) t.push(`<path d="${rr(x + 0.8, y, w - 1.6, 9, 1.6)}" fill="${glanz(S)}"/>`);
    });
    t.push(`<rect x="44" y="45.4" width="12" height="3" rx="1" fill="#555"/>`);
  },

  // Foundation 30 ml in drei Nuancen (hell, mittel, dunkel): eckige Glasflaschen mit Schraubkappe, Flüssigkeit im Hautton,
  // davor Make-up-Schwamm (Ei-Form) und Farbstrich der mittleren Nuance.
  // Maß: Flasche Breite : Höhe 0,6 : 1, Kappe 0,45 Flaschenhöhe, Schwamm 0,45 Flaschenhöhe.
  foundation(S, t) {
    t.push(boden(48, 88, 42, 2.6));
    const flasche = (x, yb, w, h, ton) => {
      const yt = yb - h;
      t.push(`<path d="M${x + 2} ${yt + 4} L${x + w - 2} ${yt + 4} L${x + w - 2} ${yb - 2} L${x + 2} ${yb - 2} Z" fill="${ton}"/><path d="M${x + 2} ${yt + 4} L${x + w - 2} ${yt + 4} L${x + w - 2} ${yb - 2} L${x + 2} ${yb - 2} Z" fill="${rund(S)}"/>`);
      t.push(glas(S, `M${x} ${yt} L${x + w} ${yt} L${x + w} ${yb} L${x} ${yb} Z`, { deck: 0.08 }));
      t.push(`<rect x="${x}" y="${yb - 5}" width="${w}" height="5" fill="#fff" opacity="0.3"/>`);
      t.push(form(S, rr(x + w * 0.22, yt - 4, w * 0.56, 4, 0.4), GOLD, { licht: 'metall' }), form(S, rr(x + w * 0.16, yt - h * 0.42 - 4, w * 0.68, h * 0.42, 1), SCHWARZ, { licht: 'rund' }));
      t.push(etikett(x + w * 0.18, yt + h * 0.5, w * 0.64, h * 0.16, '#fbf8f3', '#4a4440', { r: 0.3 }));
    };
    flasche(8, 70, 20, 30, hell(S.c, 0.22));
    flasche(66, 70, 20, 30, dunkel(S.c, 0.45));
    flasche(32, 82, 26, 40, S.c);
    for (const [i, c] of [hell(S.c, 0.22), S.c, dunkel(S.c, 0.45)].entries()) t.push(`<path d="M${10 + i * 16} 91 q5 -3.6 11 -0.6" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
    // Schwamm
    const sw = 'M76 66 C84 66 88 78 86 85 C84 91 68 91 66 85 C64 78 68 66 76 66 Z';
    t.push(form(S, sw, '#f2a5b4', { licht: 'rund' }), `<path d="M66 85 C68 91 84 91 86 85 C84 88 68 88 66 85 Z" fill="${S.c}" opacity="0.9"/>`);
    const id = 'sw' + Math.random().toString(36).slice(2, 6);
    S.defs.push(`<pattern id="${id}" width="2" height="2" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.35" fill="#000" opacity="0.12"/></pattern>`);
    t.push(`<path d="${sw}" fill="url(#${id})"/>`);
  },

  // Serum 30 ml: Braunglas-Pipettenflasche, Gummihütchen, Pipette liegt daneben mit Tropfen.
  // Maß: Flasche Ø : Höhe 0,5 : 1, Hütchen 0,25 Höhe.
  serum(S, t) {
    t.push(boden(46, 88, 34, 2.6));
    t.push(zylinder(S, 38, 44, 86, 15, 4, S.c, { glanz: true }));
    t.push(etikett(25, 58, 26, 16, '#f6f1e6', '#3a332c'));
    t.push(form(S, rr(30, 36, 16, 8, 1), GOLD, { licht: 'metall' }), form(S, 'M32 36 Q32 18 38 16 Q44 18 44 36 Z', SCHWARZ, { licht: 'rund' }));
    // liegende Pipette
    t.push(`<g transform="rotate(-12 72 82)">`, `<rect x="56" y="80" width="30" height="3.2" rx="1.6" fill="#dfeaee" opacity="0.8" stroke="#8ea2aa" stroke-width="0.4"/>`, `<rect x="86" y="79" width="6" height="5.2" rx="1" fill="${GOLD}"/>`, `<path d="M92 79 Q100 81.6 92 84 Z" fill="${SCHWARZ}"/>`, `</g>`);
    t.push(`<path d="M54 84 Q56 80 58 84 Q58 86 56 86 Q54 86 54 84 Z" fill="#f2d991" opacity="0.9"/>`);
  },

  // Tube 75 ml: steht auf dem Klappdeckel, oben flach gecrimpt mit Riffelung, Etikett.
  // Maß: Breite oben 1,25-mal Deckelbreite, Crimp 1/14 der Höhe.
  tube(S, t) {
    t.push(boden(50, 90, 18, 2.4));
    const k = 'M26 10 L74 10 L74 15 Q72 40 62 74 L38 74 Q28 40 26 15 Z';
    t.push(form(S, k, S.c, { licht: 'rund' }));
    for (let x = 28; x < 73; x += 2) t.push(linie(`M${x} 10.6 V14.4`, dunkel(S.c, 0.25), 0.5));
    t.push(etikett(38, 34, 24, 14, hell(S.c, 0.6), dunkel(S.c, 0.5)));
    t.push(form(S, rr(37, 74, 26, 16, 2.4), '#f4f2ee', { licht: 'rund' }), `<path d="M37 79 H63" stroke="#c9c4ba" stroke-width="0.6"/>`);
  },

  // Pumpspender 300 ml: Keramikflasche, Edelstahlpumpe mit Ausguss, Schaumtupfer davor.
  // Maß: Ø : Höhe 0,55 : 1, Pumpe 0,28 Höhe.
  pumpspender(S, t) {
    t.push(boden(50, 90, 26, 2.8));
    const k = 'M30 44 Q30 36 40 34 L60 34 Q70 36 70 44 L70 84 Q70 90 64 90 L36 90 Q30 90 30 84 Z';
    t.push(form(S, k, S.c, { licht: 'rund' }));
    t.push(form(S, rr(43, 26, 14, 8, 1), '#c9ced3', { licht: 'metall' }), form(S, rr(46, 16, 8, 11, 0.6), '#c9ced3', { licht: 'metall' }));
    t.push(form(S, 'M42 12 L62 12 Q66 12 74 16 L74 19 Q68 17 62 18 L42 18 Z', '#b9bec3', { licht: 'metall' }));
    t.push(`<ellipse cx="78" cy="88" rx="6" ry="2.6" fill="#fbfbf9"/><circle cx="76" cy="86" r="2.6" fill="#fbfbf9"/><circle cx="80" cy="86.6" r="2" fill="#f2f2f0"/>`);
    t.push(`<path d="M35 46 Q33 64 36 82" stroke="#fff" stroke-width="2" fill="none" opacity="0.3" stroke-linecap="round"/>`);
  },

  // Duschgel 250 ml: ovale Flasche durchsichtig mit farbigem Gel, Klappdeckel unten, Luftbläschen.
  // Maß: Breite : Höhe 0,48 : 1, Schulter gerundet.
  duschgel(S, t) {
    t.push(boden(50, 92, 22, 2.4));
    const k = 'M34 20 Q34 12 42 10 L58 10 Q66 12 66 20 L68 70 L32 70 Z';
    t.push(`<path d="M35 22 Q35 13 43 11.6 L57 11.6 Q65 13 65 22 L66.6 70 L33.4 70 Z" fill="${S.c}" opacity="0.8"/>`);
    t.push(glas(S, k, { deck: 0.2 }));
    for (const [x, y, r] of [[42, 30, 1.4], [56, 40, 1], [48, 52, 1.8], [60, 60, 1.2], [40, 62, 0.9]]) t.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#fff" stroke-width="0.5" opacity="0.8"/>`);
    t.push(etikett(40, 36, 20, 14, '#ffffff', dunkel(S.c, 0.5)));
    t.push(form(S, 'M32 70 L68 70 L68 86 Q68 90 64 90 L36 90 Q32 90 32 86 Z', '#f4f2ee', { licht: 'rund' }), `<path d="M32 74 H68" stroke="#cbc6bc" stroke-width="0.6"/><rect x="46" y="72" width="8" height="1.6" rx="0.6" fill="#cbc6bc"/>`);
  },

  // Nassrasierer: Griff 12 cm gummiert, Kopf mit drei Klingen und Gleitstreifen, schräg aufgestellt.
  // Maß: Kopf 0,3 der Länge, Griffbreite 1/9.
  rasierer(S, t) {
    t.push(boden(50, 90, 34, 2.2));
    t.push(`<g transform="rotate(-38 50 54)">`);
    t.push(form(S, 'M45 34 L55 34 L56.6 92 Q50 96 43.4 92 Z', S.c, { licht: 'rund', glanz: true }));
    t.push(form(S, rr(46, 56, 8, 22, 3), '#3a3d42', { licht: 'rund' }));
    for (let y = 58; y < 77; y += 2.4) t.push(linie(`M47 ${y} H53`, '#55585e', 0.6));
    t.push(form(S, 'M47 30 L53 30 L53 36 L47 36 Z', '#9aa0a6', { licht: 'metall' }));
    t.push(form(S, rr(32, 14, 36, 17, 3), '#40444a', { licht: 'rund' }));
    t.push(`<rect x="34" y="15.6" width="32" height="3.2" rx="1.4" fill="#7fb7c9"/>`);
    for (const y of [20.8, 24, 27.2]) t.push(`<rect x="34" y="${y}" width="32" height="1.2" fill="#d9dde1"/><rect x="34" y="${y + 1.2}" width="32" height="0.6" fill="#777"/>`);
    t.push('</g>');
  },

  // Haarbürste (Paddle) 25 cm: Buchenholzkörper, Kissen mit Noppenborsten, ovaler Kopf.
  // Maß: Kopf : Griff = 0,55 : 0,45 der Länge, Kopfbreite 0,4 Länge.
  haarbuerste(S, t) {
    t.push(boden(50, 90, 26, 2.2));
    t.push(`<g transform="rotate(-18 50 50)">`);
    const holz = S.c;
    t.push(form(S, 'M44 52 L56 52 L55 90 Q50 94 45 90 Z', holz, { licht: 'rund' }));
    t.push(form(S, 'M50 4 C70 4 74 22 72 40 C70 54 60 58 50 58 C40 58 30 54 28 40 C26 22 30 4 50 4 Z', holz, { licht: 'rund' }));
    t.push(`<path d="M50 9 C65 9 68 23 66.4 38 C65 50 58 53 50 53 C42 53 35 50 33.6 38 C32 23 35 9 50 9 Z" fill="#2f3033"/>`);
    for (let y = 13; y < 52; y += 4) for (let x = 36; x <= 64; x += 4) {
      const dx = (x - 50) / 16, dy = (y - 31) / 22;
      if (dx * dx + dy * dy < 0.92) t.push(`<circle cx="${x + (y % 8 ? 2 : 0)}" cy="${y}" r="1" fill="#1b1b1d"/><circle cx="${x + (y % 8 ? 2 : 0) - 0.3}" cy="${y - 0.3}" r="0.4" fill="#9aa0a6"/>`);
    }
    t.push(`<circle cx="50" cy="84" r="1.6" fill="#f3f1ec" stroke="${dunkel(holz, 0.4)}" stroke-width="0.4"/>`);
    t.push('</g>');
  },
};
