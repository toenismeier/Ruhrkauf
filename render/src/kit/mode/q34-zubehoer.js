// Q34: Freisteller für Adults und Best Ager (Accessoires, Taschen, Home, Beauty), Stil wie Q28/Q29:
// Licht von links, weiche Standfläche, Kontur aus stoff.js. Je Zeichner eine Maßzeile (cm) nach Ware im Warenhaus.
import { hell, dunkel, mische, flaeche, glatt, linie, naht, f, E, boden, form, zylinder, glas, etikett, stoff2, metall, rund, muster } from './q29-hilfen.js';

const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const sym = (rechts) => [...rechts, ...sp([...rechts].reverse())];
const GOLD = '#c9a24a', SILBER = '#c9ced3';
let nr = 0;
const uid = (S, k) => `${S.id}q34${k}${(++nr).toString(36)}`;
const metallVerlauf = (S, farbe) => { const id = uid(S, 'm'); S.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hell(farbe, 0.5)}"/><stop offset="0.45" stop-color="${farbe}"/><stop offset="1" stop-color="${dunkel(farbe, 0.35)}"/></linearGradient>`); return `url(#${id})`; };

export const Q34_ZUBEHOER = {
  // Lesebrille mit Brillenband: Breite 13,5, Glas 4,8 × 3,0 (Halbrand), Band 70 als Bogen
  lesebrille(S, t, p) {
    t.push(boden(50, 80, 36, 2.4));
    // Brillenband (Kordel) hängt in einem Bogen unter der Brille
    t.push(`<path d="M10 44 C6 70 30 92 50 92 C70 92 94 70 90 44" stroke="${dunkel(S.c, 0.35)}" stroke-width="1.8" fill="none"/><path d="M10 44 C6 70 30 92 50 92 C70 92 94 70 90 44" stroke="${hell(S.c, 0.25)}" stroke-width="0.9" fill="none" stroke-dasharray="1.6 1.2"/>`);
    const glasId = uid(S, 'g');
    S.defs.push(`<linearGradient id="${glasId}" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="#e8f2f6" stop-opacity="0.75"/><stop offset="1" stop-color="#bcd3dc" stop-opacity="0.55"/></linearGradient>`);
    for (const s of [1, -1]) {
      const X = (x) => (s > 0 ? x : 100 - x);
      // schmale Halbrandfassung: oben dicker Rand, unten Nylonfaden
      const d = glatt([[X(55), 40, E], [X(88), 40, E], [X(87), 50], [X(80), 57], [X(64), 57.5], [X(56.5), 51]], true, 0.45);
      t.push(`<path d="${d}" fill="url(#${glasId})"/><path d="${d}" fill="none" stroke="#7f949c" stroke-width="0.45" opacity="0.8"/>`);
      t.push(`<path d="M${X(54)} 40.5 L${X(89)} 40.5" stroke="${S.c}" stroke-width="3.2" stroke-linecap="round"/><path d="M${X(54)} 39.6 L${X(89)} 39.6" stroke="${hell(S.c, 0.4)}" stroke-width="0.7" stroke-linecap="round" opacity="0.7"/>`);
      t.push(`<path d="M${X(60)} 44 L${X(66)} 53" stroke="#fff" stroke-width="1.2" opacity="0.55" stroke-linecap="round"/>`);
      // Bügel nach hinten mit Endstück
      t.push(`<path d="M${X(89)} 41 L${X(93)} 31 L${X(90)} 25" stroke="${dunkel(S.c, 0.3)}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
      t.push(`<circle cx="${X(10)}" cy="44" r="1.6" fill="${dunkel(S.c, 0.3)}"/>`);
    }
    t.push(`<path d="M46 41 Q50 37.4 54 41" stroke="${S.c}" stroke-width="2.4" fill="none"/>`);
  },
  // Brillenetui (Klappetui): 16 × 6,5 × 4, geöffnet, Deckel steht hinten, Brille liegt im Futter
  brillenetui(S, t, p) {
    t.push(boden(50, 82, 44, 3));
    // Deckel hinten (Halbschale, Innenseite sichtbar)
    t.push(`<path d="M8 58 Q8 26 50 24 Q92 26 92 58 Z" fill="${S.c}" stroke="${dunkel(S.c, 0.45)}" stroke-width="0.6"/>`);
    t.push(`<path d="M13 58 Q14 32 50 30 Q86 32 87 58 Z" fill="${dunkel(S.c, 0.5)}"/><path d="M20 34 Q34 27 50 27" stroke="#fff" stroke-width="1.4" opacity="0.25" fill="none"/>`);
    // Unterschale vorn
    t.push(flaeche(S, glatt([[6, 60], [20, 52], [50, 50], [80, 52], [94, 60], [84, 74], [50, 80], [16, 74]], true, 0.5), { ton: -0.04 }));
    t.push(`<ellipse cx="50" cy="60" rx="38" ry="7.6" fill="${dunkel(S.c, 0.55)}"/>`);
    // Brille im Futter
    for (const x of [36, 64]) t.push(`<ellipse cx="${x}" cy="59" rx="10" ry="5" fill="#dceef4" opacity="0.8" stroke="#2a2c30" stroke-width="1.4"/><path d="M${x - 6} 57.4 Q${x - 2} 55.6 ${x + 2} 56.4" stroke="#fff" stroke-width="0.8" opacity="0.7" fill="none"/>`);
    t.push(`<path d="M46 58 Q50 55.6 54 58" stroke="#2a2c30" stroke-width="1.3" fill="none"/>`);
    t.push(naht('M12 66 Q50 76 88 66', S, 0.8));
    t.push(`<rect x="46" y="49" width="8" height="2.4" rx="1" fill="${GOLD}"/>`);
  },
  // Armbanduhr: Gehäuse Ø 4 (Herren) bzw. 2,8 (Damen), Lederband 2,0 bzw. Gliederband 1,4; stehend, Band zum Kreis gelegt
  armbanduhr(S, t, p) {
    const damen = p.art === 'damen';
    t.push(boden(50, 88, 26, 2.6));
    const band = damen ? SILBER : S.c;
    // Band hinten (Ring)
    t.push(`<ellipse cx="50" cy="68" rx="${damen ? 20 : 24}" ry="${damen ? 18 : 20}" fill="none" stroke="${dunkel(band, 0.35)}" stroke-width="${damen ? 7 : 10}"/>`);
    t.push(`<ellipse cx="50" cy="68" rx="${damen ? 20 : 24}" ry="${damen ? 18 : 20}" fill="none" stroke="${band}" stroke-width="${damen ? 5.6 : 8.4}"${damen ? ' stroke-dasharray="2.2 0.7"' : ''}/>`);
    if (!damen) for (let i = 0; i < 6; i++) t.push(`<circle cx="${f(50 + 24 * Math.cos(Math.PI * (0.25 + i * 0.1)))}" cy="${f(68 + 20 * Math.sin(Math.PI * (0.25 + i * 0.1)))}" r="0.8" fill="${dunkel(band, 0.55)}"/>`);
    // Gehäuse vorn oben
    const r = damen ? 15 : 19, cy = damen ? 44 : 42;
    t.push(`<circle cx="50" cy="${cy}" r="${r + 2.6}" fill="${metallVerlauf(S, damen ? GOLD : SILBER)}" stroke="${dunkel(damen ? GOLD : SILBER, 0.45)}" stroke-width="0.5"/>`);
    t.push(`<rect x="${50 + r + 1.6}" y="${cy - 2}" width="3.2" height="4" rx="0.8" fill="${damen ? GOLD : SILBER}" stroke="${dunkel(SILBER, 0.4)}" stroke-width="0.4"/>`);
    t.push(`<circle cx="50" cy="${cy}" r="${r}" fill="${damen ? '#f7f2e6' : '#f4f3ef'}" stroke="${dunkel(SILBER, 0.3)}" stroke-width="0.5"/>`);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const r0 = r * (i % 3 ? 0.84 : 0.76); t.push(linie(`M${f(50 + Math.sin(a) * r0)} ${f(cy - Math.cos(a) * r0)} L${f(50 + Math.sin(a) * r * 0.92)} ${f(cy - Math.cos(a) * r * 0.92)}`, '#2a2c30', i % 3 ? 0.5 : 1.1)); }
    t.push(linie(`M50 ${cy} L${f(50 + r * 0.45)} ${f(cy - r * 0.3)}`, '#2a2c30', 1.4), linie(`M50 ${cy} L${f(50 - r * 0.15)} ${f(cy - r * 0.72)}`, '#2a2c30', 0.9), `<circle cx="50" cy="${cy}" r="1" fill="#2a2c30"/>`);
    t.push(`<path d="M${50 - r * 0.7} ${cy - r * 0.5} Q50 ${cy - r * 1.05} ${50 + r * 0.6} ${cy - r * 0.6}" stroke="#fff" stroke-width="1.4" opacity="0.35" fill="none"/>`);
  },
  // Manschettenknöpfe (Paar): Kopf Ø 1,8 rund, Emaille mit Goldrand, Steg 1,2 und Kippriegel; einer von vorn, einer gekippt mit Riegel
  manschettenknoepfe(S, t, p) {
    const mv = metallVerlauf(S, GOLD);
    t.push(boden(34, 74, 22, 2.6), boden(70, 80, 20, 2.4));
    const kopf = (cx, cy, rx, ry) => [`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${mv}" stroke="${dunkel(GOLD, 0.5)}" stroke-width="0.6"/>`,
      `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * 0.74)}" ry="${f(ry * 0.74)}" fill="${S.c}" stroke="${dunkel(GOLD, 0.4)}" stroke-width="0.5"/>`,
      `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * 0.74)}" ry="${f(ry * 0.74)}" fill="url(#${S.id}l)"/>`,
      `<path d="M${f(cx - rx * 0.45)} ${f(cy - ry * 0.35)} Q${cx} ${f(cy - ry * 0.7)} ${f(cx + rx * 0.3)} ${f(cy - ry * 0.5)}" stroke="#fff" stroke-width="1.4" opacity="0.5" fill="none"/>`].join('');
    // links: von vorn, Steg nach hinten unten sichtbar
    t.push(`<rect x="31" y="50" width="6" height="18" fill="${mv}" stroke="${dunkel(GOLD, 0.5)}" stroke-width="0.4"/><rect x="22" y="66" width="24" height="7" rx="3.5" fill="${mv}" stroke="${dunkel(GOLD, 0.5)}" stroke-width="0.5"/>`);
    t.push(kopf(34, 40, 20, 20));
    // rechts: gekippt, flach liegend
    t.push(`<rect x="66" y="66" width="22" height="6" rx="3" transform="rotate(20 77 69)" fill="${mv}" stroke="${dunkel(GOLD, 0.5)}" stroke-width="0.5"/><path d="M70 64 L74 70" stroke="${dunkel(GOLD, 0.4)}" stroke-width="4"/>`);
    t.push(kopf(68, 60, 19, 10));
  },
  // Brosche (Blüte): Ø 4,5, fünf Blätter, Stein in der Mitte; Nadel hinten
  brosche(S, t, p) {
    t.push(boden(50, 86, 30, 2.6));
    t.push(`<path d="M18 74 L82 60" stroke="${dunkel(GOLD, 0.3)}" stroke-width="1.4" stroke-linecap="round"/>`);
    const mv = metallVerlauf(S, GOLD);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const cx = 50 + Math.cos(a) * 18, cy = 50 + Math.sin(a) * 18;
      t.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="15" ry="11" transform="rotate(${f((a * 180) / Math.PI)} ${f(cx)} ${f(cy)})" fill="${mv}" stroke="${dunkel(GOLD, 0.45)}" stroke-width="0.6"/>`);
      t.push(`<ellipse cx="${f(50 + Math.cos(a) * 20)}" cy="${f(50 + Math.sin(a) * 20)}" rx="8" ry="5" transform="rotate(${f((a * 180) / Math.PI)} ${f(50 + Math.cos(a) * 20)} ${f(50 + Math.sin(a) * 20)})" fill="${S.c}" opacity="0.85"/>`);
    }
    t.push(`<circle cx="50" cy="50" r="9" fill="${hell(S.c, 0.2)}" stroke="${dunkel(GOLD, 0.4)}" stroke-width="1.6"/><circle cx="47" cy="47" r="3" fill="#fff" opacity="0.6"/>`);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; t.push(`<circle cx="${f(50 + Math.cos(a) * 12)}" cy="${f(50 + Math.sin(a) * 12)}" r="1.2" fill="#f4f3ef" stroke="${dunkel(GOLD, 0.4)}" stroke-width="0.3"/>`); }
  },
  // Schiebermütze (Flatcap): Länge 27, Breite 22, Schirm 6 vorn eingenäht, Druckknopf
  schiebermuetze(S, t, p) {
    t.push(boden(50, 84, 40, 3));
    // Kopfteil: flach nach vorn gezogen
    const kopf = glatt([[12, 64], [16, 46], [34, 32], [60, 30], [82, 38], [92, 54], [90, 70, E], [14, 72, E]], true, 0.5);
    t.push(flaeche(S, kopf));
    // Schirm vorn (unter dem Kopfteil)
    t.push(flaeche(S, glatt([[6, 70, E], [12, 64], [40, 62], [56, 66], [52, 78], [24, 82], [8, 78]], true, 0.5), { ton: -0.12 }));
    t.push(naht('M12 72 Q30 74 52 70', S, 0.8));
    // Mittelnaht und Druckknopf
    t.push(linie('M20 62 Q46 44 86 46', dunkel(S.c, 0.35), 0.7, 0.8), naht('M22 60 Q46 42 84 44', S, 0.7));
    t.push(`<circle cx="26" cy="58" r="2" fill="${dunkel(S.c, 0.25)}" stroke="${dunkel(S.c, 0.5)}" stroke-width="0.4"/>`);
    t.push(`<path d="M30 38 Q46 30 66 32" stroke="#fff" stroke-width="1.4" opacity="0.2" fill="none"/>`);
  },
  // Filzhut (Homburg): Krempe Ø 32 rundum aufgebogen, Kopfhöhe 13 mit Mittelkniff, Ripsband 3,5
  filzhut(S, t, p) {
    t.push(boden(50, 82, 42, 3.4));
    const krempe = glatt([[6, 62], [14, 58], [50, 60], [86, 58], [94, 62], [86, 74], [50, 80], [14, 74]], true, 0.5);
    t.push(flaeche(S, krempe, { ton: -0.1 }));
    t.push(`<path d="M7 61.6 Q12 57 20 59" stroke="${dunkel(S.c, 0.45)}" stroke-width="1.6" fill="none"/><path d="M93 61.6 Q88 57 80 59" stroke="${dunkel(S.c, 0.45)}" stroke-width="1.6" fill="none"/>`);
    // Kopf: oval, oben mit Längsrille
    const kopf = [[27, 64, E], [26, 40], [30, 26], [40, 20], [50, 22], [60, 20], [70, 26], [74, 40], [73, 64, E]];
    t.push(flaeche(S, glatt(kopf, true, 0.45)));
    t.push(`<path d="M50 23 Q48 32 50 40" stroke="${dunkel(S.c, 0.4)}" stroke-width="1" fill="none"/><path d="M32 28 Q36 22 44 21" stroke="#fff" stroke-width="1.4" opacity="0.18" fill="none"/>`);
    const band = p.band ?? dunkel(S.c, 0.55);
    t.push(`<path d="M26.4 52 Q50 56 73.6 52 L73.4 62.6 Q50 66.6 26.6 62.6 Z" fill="${band}"/><path d="M26.4 52 Q50 56 73.6 52" stroke="${hell(band, 0.3)}" stroke-width="0.5" fill="none"/>`);
    t.push(`<path d="M30 54 l-4 1 l1 6 l4 -1 Z" fill="${dunkel(band, 0.3)}"/>`);
  },
  // Hosenträger (Y-Form): Breite 3,5, Länge 110, vier Clips, Lederrücken
  hosentraeger(S, t, p) {
    t.push(boden(50, 92, 30, 2.4));
    const band = (d) => `<path d="${d}" stroke="${dunkel(S.c, 0.35)}" stroke-width="7.2" fill="none" stroke-linecap="butt"/><path d="${d}" stroke="${S.c}" stroke-width="6" fill="none"/>${S.tex ? `<path d="${d}" stroke="${S.tex}" stroke-width="6" fill="none"/>` : ''}<path d="${d}" stroke="${hell(S.c, 0.35)}" stroke-width="0.4" fill="none" stroke-dasharray="1 0.8" transform="translate(-2 0)"/>`;
    t.push(band('M50 26 L50 50 Q50 64 34 86'), band('M50 50 Q50 64 66 86'), band('M50 26 Q38 40 22 84'), band('M50 26 Q62 40 78 84'));
    // Lederrückenteil
    t.push(`<path d="M42 20 L58 20 L60 30 L50 34 L40 30 Z" fill="#6a4630" stroke="#3a2a20" stroke-width="0.6"/><path d="M44 22.4 L56 22.4" stroke="#c7ad86" stroke-width="0.4" stroke-dasharray="0.8 0.6"/>`);
    for (const [x, y] of [[22, 84], [34, 86], [66, 86], [78, 84]]) t.push(`<rect x="${x - 4}" y="${y - 1}" width="8" height="8" rx="1" fill="${metallVerlauf(S, SILBER)}" stroke="${dunkel(SILBER, 0.5)}" stroke-width="0.5"/><path d="M${x - 2.6} ${y + 5} L${x + 2.6} ${y + 5}" stroke="${dunkel(SILBER, 0.5)}" stroke-width="0.6"/>`);
  },
  // Kulturbeutel: 26 × 14 × 12, Reißverschluss oben, Trageschlaufe seitlich
  kulturbeutel(S, t, p) {
    t.push(boden(50, 84, 40, 3));
    t.push(flaeche(S, glatt([[12, 44], [20, 34, E], [80, 34, E], [88, 44], [90, 76], [84, 82, E], [16, 82, E], [10, 76]], true, 0.45)));
    t.push(flaeche(S, glatt([[80, 34, E], [92, 40], [94, 74], [90, 76], [88, 44]], true, 0.4), { ton: -0.16 }));
    // Reißverschluss
    t.push(`<path d="M18 36 Q50 40 82 36" stroke="${dunkel(S.c, 0.55)}" stroke-width="2.4" fill="none"/><path d="M18 36 Q50 40 82 36" stroke="${SILBER}" stroke-width="0.8" fill="none" stroke-dasharray="0.7 0.7"/>`);
    t.push(`<rect x="70" y="35" width="4" height="7" rx="1" fill="${SILBER}" stroke="${dunkel(SILBER, 0.5)}" stroke-width="0.4"/><path d="M72 42 L72 48" stroke="${dunkel(S.c, 0.4)}" stroke-width="1.6" stroke-linecap="round"/>`);
    t.push(naht('M14 46 Q50 50 86 46', S, 0.7), naht('M13 74 Q50 78 87 74', S, 0.7));
    // Schlaufe
    t.push(`<path d="M10 52 Q2 58 10 66" stroke="${dunkel(S.c, 0.3)}" stroke-width="3.4" fill="none"/>`);
  },
  // Aktentasche: 40 × 30 × 10, Überschlag mit zwei Schlössern, Tragegriff
  aktentasche(S, t, p) {
    t.push(boden(50, 88, 44, 3));
    t.push(`<path d="M38 26 Q38 14 50 14 Q62 14 62 26" stroke="${dunkel(S.c, 0.35)}" stroke-width="4.6" fill="none"/><path d="M38 26 Q38 14 50 14 Q62 14 62 26" stroke="${S.c}" stroke-width="3.2" fill="none"/>`);
    t.push(`<rect x="34" y="23" width="6" height="5" rx="1" fill="${GOLD}"/><rect x="60" y="23" width="6" height="5" rx="1" fill="${GOLD}"/>`);
    // Korpus
    t.push(flaeche(S, glatt([[8, 30, E], [92, 30, E], [94, 86, E], [6, 86, E]], true, 0.2), { ton: -0.06 }));
    // Seitenfalte rechts
    t.push(flaeche(S, glatt([[92, 30, E], [97, 34, E], [98, 82, E], [94, 86, E]], true, 0.2), { ton: -0.22 }));
    // Überschlag
    t.push(flaeche(S, glatt([[8, 30, E], [92, 30, E], [91, 60], [86, 64, E], [14, 64, E], [9, 60]], true, 0.3)));
    t.push(naht('M12 33 L88 33 L88 60 Q50 61.6 12 60 Z', S, 0.8));
    for (const x of [28, 72]) t.push(`<rect x="${x - 5}" y="56" width="10" height="12" rx="1.4" fill="${metallVerlauf(S, GOLD)}" stroke="${dunkel(GOLD, 0.45)}" stroke-width="0.5"/><rect x="${x - 2}" y="61" width="4" height="3" rx="0.6" fill="${dunkel(GOLD, 0.45)}"/>`);
  },
  // Einkaufstrolley: Tasche 35 × 50, Gestell mit zwei Rädern Ø 17, Schiebegriff 95 hoch
  einkaufstrolley(S, t, p) {
    t.push(boden(50, 92, 30, 2.6));
    // Gestell
    t.push(`<path d="M62 8 L68 80" stroke="#474c53" stroke-width="2.4" stroke-linecap="round"/><path d="M56 8 L68 8" stroke="#2a2c30" stroke-width="4" stroke-linecap="round"/>`);
    t.push(`<path d="M30 84 L70 84" stroke="#474c53" stroke-width="2.4" stroke-linecap="round"/>`);
    // Tasche
    t.push(flaeche(S, glatt([[28, 26], [34, 20, E], [64, 20, E], [68, 26], [70, 80, E], [28, 82, E]], true, 0.4)));
    const tex = S.tex ? '' : (muster(S, 'karo') ?? '');
    if (tex) t.push(`<path d="${glatt([[28, 26], [34, 20, E], [64, 20, E], [68, 26], [70, 80, E], [28, 82, E]], true, 0.4)}" fill="${tex}"/>`);
    // Klappe und Außentasche
    t.push(flaeche(S, glatt([[27, 20, E], [70, 20, E], [70, 34], [27, 34]], true, 0.3), { ton: -0.18 }));
    t.push(flaeche(S, glatt([[34, 50, E], [64, 50, E], [64, 72, E], [34, 72, E]], true, 0.2), { ton: -0.1 }), naht('M36 53 L62 53', S, 0.7));
    // Räder
    for (const x of [32, 66]) t.push(`<circle cx="${x}" cy="84" r="8.6" fill="#2a2c30"/><circle cx="${x}" cy="84" r="4.6" fill="#a2a6ab"/><circle cx="${x}" cy="84" r="1.4" fill="#474c53"/>`);
  },
  // Spraydose: Ø 5,3 × 19, Kappe Ø 5,6 × 5; p.art = deo (schmal, flache Kappe) | haarspray (höher, gewölbte Kappe)
  spraydose(S, t, p) {
    const deo = p.art === 'deo';
    const rx = deo ? 11 : 14, y0 = deo ? 34 : 28;
    t.push(boden(50, 88, rx + 4, 2.6));
    t.push(zylinder(S, 50, y0, 86, rx, 3, S.c, { metall: false, glanz: true }));
    // Schulter
    t.push(`<path d="M${50 - rx} ${y0} Q50 ${y0 - 7} ${50 + rx} ${y0} Z" fill="${hell(S.c, 0.1)}" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.4"/>`);
    // Kappe
    if (deo) t.push(zylinder(S, 50, 20, 31, rx - 1, 2.6, '#f4f3ef', { glanz: true }));
    else t.push(`<path d="M${50 - rx + 1} ${y0 - 3} L${50 - rx + 2} ${y0 - 14} Q50 ${y0 - 24} ${50 + rx - 2} ${y0 - 14} L${50 + rx - 1} ${y0 - 3} Z" fill="${hell(S.c, 0.55)}" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.5"/><path d="M${52} ${y0 - 19} Q${56} ${y0 - 18} ${58} ${y0 - 14}" stroke="#fff" stroke-width="1" fill="none" opacity="0.5"/>`);
    t.push(etikett(50 - rx + 3, deo ? 52 : 50, rx * 2 - 6, 18, '#f7f3ea', dunkel(S.c, 0.3)));
  },
  // Schürze (Latzschürze): 70 × 85, Nackenband, Bauchtasche, Bindebänder
  schuerze(S, t, p) {
    t.push(boden(50, 94, 26, 2));
    const d = glatt([[36, 16, E], [64, 16, E], [64, 36], [76, 44], [80, 90, E], [20, 90, E], [24, 44], [36, 36]], true, 0.4);
    t.push(flaeche(S, d));
    t.push(`<path d="M36 16 Q50 2 64 16" stroke="${dunkel(S.c, 0.35)}" stroke-width="2" fill="none"/>`);
    for (const s of [1, -1]) { const X = (x) => (s > 0 ? x : 100 - x); t.push(`<path d="M${X(76)} 44 Q${X(88)} 48 ${X(92)} 60 Q${X(94)} 70 ${X(90)} 74" stroke="${dunkel(S.c, 0.2)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`); }
    t.push(flaeche(S, glatt([[32, 56, E], [68, 56, E], [68, 72, E], [32, 72, E]], true, 0.2), { ton: -0.1 }), linie('M50 56 L50 72', dunkel(S.c, 0.3), 0.6, 0.8), naht('M33 58 L67 58', S, 0.8));
    t.push(naht('M38 18 L62 18', S, 0.7), naht('M22 87 L78 87', S, 0.7));
  },
  // Topflappen (Paar): 20 × 20 gesteppt, Einfassband, Aufhängeschlaufe
  topflappen(S, t, p) {
    t.push(boden(50, 88, 38, 2.6));
    const lappen = (x, y, w, rot, ton) => {
      const d = `M${x} ${y} h${w} v${w} h${-w} Z`;
      const g = [`<g transform="rotate(${rot} ${x + w / 2} ${y + w / 2})">`, flaeche(S, d, { ton })];
      for (let i = 1; i < 5; i++) { g.push(linie(`M${x + (w * i) / 5} ${y + 1} L${x + (w * i) / 5} ${y + w - 1}`, dunkel(S.c, 0.25), 0.5, 0.6), linie(`M${x + 1} ${y + (w * i) / 5} L${x + w - 1} ${y + (w * i) / 5}`, dunkel(S.c, 0.25), 0.5, 0.6)); }
      g.push(`<path d="${d}" fill="none" stroke="${p.rand ?? '#c8372f'}" stroke-width="2.4"/>`);
      g.push(`<path d="M${x - 1} ${y + 1} q-6 -6 0 -9 q5 0 3 7" stroke="${p.rand ?? '#c8372f'}" stroke-width="1.6" fill="none"/>`);
      g.push('</g>');
      return g.join('');
    };
    t.push(lappen(16, 26, 44, -8, -0.08), lappen(42, 36, 44, 6, 0));
  },
  // Tablett: 45 × 32 × 4, Griffmulden an den Schmalseiten, Holzrand; perspektivisch von oben
  tablett(S, t, p) {
    t.push(boden(50, 84, 46, 3.2));
    const d = glatt([[6, 58, E], [30, 30, E], [96, 30, E], [72, 76, E]], true, 0.1);
    t.push(form(S, d, S.c, { kw: 0.8 }));
    t.push(`<path d="M6 58 L72 76 L72 82 L6 64 Z" fill="${dunkel(S.c, 0.25)}"/><path d="M72 76 L96 30 L96 36 L72 82 Z" fill="${dunkel(S.c, 0.38)}"/>`);
    const innen = glatt([[14, 57, E], [33, 35, E], [88, 35, E], [69, 71, E]], true, 0.1);
    t.push(form(S, innen, hell(S.c, 0.14), { kontur: true, ko: 0.4 }));
    for (const [x, y] of [[18, 46], [84, 50]]) t.push(`<ellipse cx="${x}" cy="${y}" rx="4.6" ry="2.2" transform="rotate(-40 ${x} ${y})" fill="${dunkel(S.c, 0.5)}"/>`);
  },
  // Isolierkanne: 1,0 l, Ø 11 × 27, Pumpdeckel, Henkel
  isolierkanne(S, t, p) {
    t.push(boden(48, 90, 24, 2.8));
    t.push(`<path d="M70 34 Q86 36 86 54 Q86 72 70 74" stroke="${dunkel(S.c, 0.35)}" stroke-width="6.4" fill="none"/><path d="M70 34 Q86 36 86 54 Q86 72 70 74" stroke="${S.c}" stroke-width="4.6" fill="none"/>`);
    t.push(zylinder(S, 48, 30, 88, 22, 4.4, S.c, { glanz: true }));
    // Schulter und Deckel
    t.push(`<path d="M26 30 Q48 18 70 30 Z" fill="${hell(S.c, 0.12)}" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.4"/>`);
    t.push(zylinder(S, 48, 12, 24, 13, 3, '#474c53', { glanz: true }));
    t.push(`<rect x="40" y="6" width="16" height="8" rx="3" fill="#2a2c30"/><path d="M25 24 L28 20 L34 22" stroke="#474c53" stroke-width="2.4" fill="none"/>`);
    t.push(`<path d="M30 40 L30 82" stroke="#fff" stroke-width="2" opacity="0.25"/>`);
  },
  // Gehstock-Schirm: Länge 92, geschlossen, Derbygriff aus Holz, Gummifuß (stützt beim Gehen)
  stockschirm(S, t, p) {
    t.push(boden(52, 94, 18, 2));
    // Schaft und gerollte Bespannung
    const dach = glatt([[46, 26, E], [54, 26, E], [57, 46], [55, 74], [51, 86, E], [49, 86, E], [45, 74], [43, 46]], true, 0.4);
    t.push(flaeche(S, dach));
    for (const y of [36, 52, 66]) t.push(linie(`M${44 + (y - 36) * 0.03} ${y} Q50 ${y + 3} ${56 - (y - 36) * 0.03} ${y - 1}`, dunkel(S.c, 0.35), 0.6, 0.7));
    t.push(`<rect x="47" y="56" width="6" height="4" rx="0.8" fill="${dunkel(S.c, 0.2)}" stroke="${dunkel(S.c, 0.5)}" stroke-width="0.4"/>`);
    t.push(`<path d="M50 86 L50 92" stroke="#474c53" stroke-width="2"/><rect x="47.6" y="91" width="4.8" height="3.4" rx="1" fill="#2a2c30"/>`);
    // Derbygriff
    t.push(`<path d="M50 26 L50 16 Q50 8 40 8 L28 9" stroke="#3a2a20" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M50 26 L50 16 Q50 8 40 8 L28 9" stroke="#8a5a34" stroke-width="4.4" fill="none" stroke-linecap="round"/><path d="M48.6 22 L48.6 16 Q48.6 10 40 9.6" stroke="#c7955a" stroke-width="0.8" fill="none" opacity="0.7"/>`);
    t.push(`<rect x="46.8" y="24" width="6.4" height="3" rx="0.6" fill="${GOLD}"/>`);
  },
  // Leselupe: Linse Ø 7,5, Griff 11; leicht schräg, Lichtreflex
  leselupe(S, t, p) {
    t.push(boden(50, 88, 26, 2.4));
    t.push(`<path d="M62 60 L84 86" stroke="${dunkel(S.c, 0.4)}" stroke-width="9" stroke-linecap="round"/><path d="M62 60 L84 86" stroke="${S.c}" stroke-width="7.4" stroke-linecap="round"/><path d="M64 62 L82 83" stroke="#fff" stroke-width="1.2" opacity="0.3" stroke-linecap="round"/>`);
    t.push(`<circle cx="42" cy="40" r="28" fill="${metallVerlauf(S, SILBER)}" stroke="${dunkel(SILBER, 0.5)}" stroke-width="0.6"/>`);
    t.push(glas(S, 'M42 15 A25 25 0 1 1 41.9 15 Z', { ton: '#dceef4', deck: 0.6 }));
    t.push(`<path d="M24 32 Q30 20 42 18" stroke="#fff" stroke-width="2.4" opacity="0.6" fill="none" stroke-linecap="round"/>`);
    // vergrößerte Schrift hinter der Linse
    for (const [y, w] of [[36, 26], [44, 30], [52, 22]]) t.push(`<path d="M${42 - w / 2} ${y} H${42 + w / 2}" stroke="#5a5048" stroke-width="2.2" opacity="0.4"/>`);
  },
  // Kompaktpuder (Rouge): Dose Ø 7, aufgeklappt, Spiegel im Deckel, Puder mit Prägung, Quaste
  puderdose(S, t, p) {
    t.push(boden(50, 86, 38, 3));
    const mv = metallVerlauf(S, p.dose === 'schwarz' ? '#474c53' : GOLD);
    // Deckel hinten mit Spiegel
    t.push(`<ellipse cx="50" cy="34" rx="32" ry="20" fill="${mv}" stroke="${dunkel(GOLD, 0.5)}" stroke-width="0.6"/><ellipse cx="50" cy="34" rx="27" ry="16" fill="#cfdde3"/><path d="M30 30 Q40 20 58 20" stroke="#fff" stroke-width="2.6" opacity="0.6" fill="none"/>`);
    // Unterteil vorn
    t.push(`<ellipse cx="50" cy="64" rx="34" ry="16" fill="${dunkel(GOLD, 0.25)}"/><ellipse cx="50" cy="60" rx="34" ry="16" fill="${mv}" stroke="${dunkel(GOLD, 0.5)}" stroke-width="0.6"/>`);
    t.push(`<ellipse cx="50" cy="60" rx="28" ry="12.4" fill="${S.c}"/><ellipse cx="50" cy="60" rx="28" ry="12.4" fill="url(#${S.id}l)"/>`);
    for (let i = 0; i < 6; i++) t.push(`<path d="M${30 + i * 8} 54 Q${34 + i * 8} 60 ${30 + i * 8} 66" stroke="${dunkel(S.c, 0.2)}" stroke-width="0.6" fill="none" opacity="0.6"/>`);
    t.push(`<path d="M30 56 Q40 50 52 51" stroke="#fff" stroke-width="1.6" opacity="0.4" fill="none"/>`);
  },
  // Make-up-Pinselset: fünf Pinsel 15–19 in Rolltasche, Holzgriffe, Zwinge
  pinselset(S, t, p) {
    t.push(boden(50, 88, 42, 3));
    t.push(flaeche(S, glatt([[8, 50, E], [92, 50, E], [92, 84, E], [8, 84, E]], true, 0.2), { ton: -0.06 }));
    const pinsel = [[18, 14, 7], [32, 18, 5.4], [46, 12, 8], [60, 20, 4.2], [74, 16, 6]];
    for (const [x, y, b] of pinsel) {
      t.push(`<path d="M${x - b / 2} ${y + 14} Q${x - b} ${y} ${x} ${y - 2} Q${x + b} ${y} ${x + b / 2} ${y + 14} Z" fill="#3a2e26"/><path d="M${x - b / 3} ${y + 4} Q${x} ${y} ${x + b / 6} ${y + 2}" stroke="#7a6a5a" stroke-width="0.6" fill="none"/>`);
      t.push(`<rect x="${x - 2.4}" y="${y + 14}" width="4.8" height="9" fill="${metallVerlauf(S, SILBER)}" stroke="${dunkel(SILBER, 0.5)}" stroke-width="0.3"/><rect x="${x - 1.8}" y="${y + 23}" width="3.6" height="30" rx="1.6" fill="#c7955a" stroke="#6a4630" stroke-width="0.3"/>`);
    }
    // Vorderlasche der Rolltasche mit Fächern
    t.push(flaeche(S, glatt([[8, 62, E], [92, 62, E], [92, 84, E], [8, 84, E]], true, 0.2)));
    for (let x = 25; x < 92; x += 14) t.push(naht(`M${x} 63 L${x} 83`, S, 0.8));
    t.push(`<path d="M92 72 L99 72" stroke="${dunkel(S.c, 0.3)}" stroke-width="2"/>`);
  },
  // Vorratsdose (Blech): Ø 13 × 15, Stülpdeckel 3, umlaufende Sicke, Etikettfeld
  vorratsdose(S, t, p) {
    t.push(boden(50, 88, 34, 3));
    t.push(zylinder(S, 50, 36, 86, 30, 7, S.c, { glanz: true }));
    for (const y of [52, 72]) t.push(`<path d="M20 ${y} A30 7 0 0 0 80 ${y}" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.8" fill="none" opacity="0.7"/>`);
    t.push(etikett(34, 56, 32, 13, '#f7f3ea', dunkel(S.c, 0.4)));
    t.push(zylinder(S, 50, 26, 38, 31.4, 7.4, hell(S.c, 0.08), { glanz: true }));
    t.push(`<ellipse cx="50" cy="26" rx="20" ry="4.4" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.7" opacity="0.6"/>`);
  },
  // Salatschüssel mit Salatbesteck: Ø 28 × 11, Besteck 30 lang aus Holz
  salatschuessel(S, t, p) {
    t.push(boden(50, 86, 44, 3.4));
    for (const [x, r] of [[40, -16], [56, 14]]) t.push(`<g transform="rotate(${r} ${x} 40)"><rect x="${x - 2}" y="12" width="4" height="36" rx="2" fill="#c7955a" stroke="#6a4630" stroke-width="0.4"/><ellipse cx="${x}" cy="14" rx="5" ry="7" fill="#c7955a" stroke="#6a4630" stroke-width="0.4"/></g>`);
    const schale = 'M4 44 Q8 84 50 86 Q92 84 96 44 Z';
    t.push(form(S, schale, S.c, { licht: 'rund', glanz: true }));
    t.push(`<ellipse cx="50" cy="44" rx="46" ry="10" fill="${hell(S.c, 0.2)}" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.5"/>`);
    t.push(`<ellipse cx="50" cy="45.4" rx="41" ry="7.6" fill="#7aa35a"/>`);
    for (const [x, y, c] of [[30, 43, '#a8cf8e'], [44, 41, '#5c8a3e'], [58, 43, '#c8372f'], [70, 42, '#a8cf8e'], [38, 47, '#f1cf4a'], [62, 47, '#5c8a3e']]) t.push(`<ellipse cx="${x}" cy="${y}" rx="6" ry="2.6" fill="${c}"/>`);
  },
  // Teelichthalter (Glas, 3er-Set): Ø 7 × 8, farbiges Glas, Flamme
  teelicht(S, t, p) {
    t.push(boden(50, 84, 42, 3));
    const glasK = (cx, cy, s) => {
      const w = 15 * s, h = 26 * s;
      const d = `M${f(cx - w)} ${f(cy - h)} L${f(cx - w * 0.92)} ${f(cy)} Q${cx} ${f(cy + 4 * s)} ${f(cx + w * 0.92)} ${f(cy)} L${f(cx + w)} ${f(cy - h)} Z`;
      return [`<path d="${d}" fill="${S.c}" opacity="0.6"/>`, glas(S, d, { ton: hell(S.c, 0.4), deck: 0.5 }),
        `<ellipse cx="${cx}" cy="${f(cy - h)}" rx="${f(w)}" ry="${f(3.2 * s)}" fill="${hell(S.c, 0.5)}" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.4" opacity="0.8"/>`,
        `<ellipse cx="${cx}" cy="${f(cy - h * 0.35)}" rx="${f(w * 0.7)}" ry="${f(2.4 * s)}" fill="#f4f3ef"/>`,
        `<path d="M${cx} ${f(cy - h * 0.38)} Q${f(cx - 3 * s)} ${f(cy - h * 0.7)} ${cx} ${f(cy - h * 0.95)} Q${f(cx + 3 * s)} ${f(cy - h * 0.7)} ${cx} ${f(cy - h * 0.38)} Z" fill="#f1b24a"/><path d="M${cx} ${f(cy - h * 0.42)} Q${f(cx - 1.4 * s)} ${f(cy - h * 0.6)} ${cx} ${f(cy - h * 0.78)} Q${f(cx + 1.4 * s)} ${f(cy - h * 0.6)} ${cx} ${f(cy - h * 0.42)} Z" fill="#fff2c4"/>`].join('');
    };
    t.push(glasK(28, 70, 1.25), glasK(72, 70, 1.25), glasK(50, 84, 1.5));
  },
  // Nackenstützkissen (Wellenform): 50 × 30 × 11/8, zwei Wülste unterschiedlicher Höhe, Bezug mit Reißverschluss
  nackenkissen(S, t, p) {
    t.push(boden(50, 82, 44, 3.4));
    const d = glatt([[6, 76, E], [6, 48], [14, 34], [26, 32], [36, 44], [50, 50], [64, 46], [76, 34], [88, 36], [94, 50], [94, 76, E]], true, 0.45);
    t.push(flaeche(S, d));
    t.push(flaeche(S, glatt([[6, 76, E], [94, 76, E], [94, 82, E], [6, 82, E]], true, 0.2), { ton: -0.18 }));
    t.push(`<path d="M12 40 Q20 30 30 36" stroke="#fff" stroke-width="2.2" opacity="0.3" fill="none"/><path d="M70 40 Q80 30 90 40" stroke="#fff" stroke-width="2.2" opacity="0.3" fill="none"/>`);
    t.push(naht('M8 74 L92 74', S, 0.8), `<path d="M30 79 L70 79" stroke="${dunkel(S.c, 0.5)}" stroke-width="1.2"/><rect x="66" y="77.4" width="3.4" height="4" rx="0.6" fill="#c9ced3"/>`);
  },
  // Kabinentrolley (Hartschale): 55 × 40 × 20, vier Rollen, Teleskopgriff, Rillen; Dreiviertelansicht
  koffer(S, t, p) {
    t.push(boden(50, 92, 34, 2.8));
    // Teleskopgriff
    t.push(`<path d="M38 30 L38 8 L58 8 L58 30" stroke="#474c53" stroke-width="2.4" fill="none"/><rect x="35" y="5" width="26" height="6" rx="3" fill="#2a2c30"/>`);
    // Seite rechts
    t.push(form(S, 'M70 30 L84 24 L84 82 L70 88 Z', dunkel(S.c, 0.28), { licht: 'diag' }));
    // Front
    const d = glatt([[18, 34, E], [22, 30, E], [66, 30, E], [70, 34, E], [70, 86, E], [66, 89, E], [22, 89, E], [18, 86, E]], true, 0.3);
    t.push(form(S, d, S.c, { glanz: true }));
    for (const x of [30, 44, 58]) t.push(`<path d="M${x} 34 L${x} 85" stroke="${dunkel(S.c, 0.35)}" stroke-width="1.6" opacity="0.6"/><path d="M${x + 1.4} 34 L${x + 1.4} 85" stroke="${hell(S.c, 0.25)}" stroke-width="0.6" opacity="0.6"/>`);
    t.push(`<path d="M18 58 L70 58" stroke="${dunkel(S.c, 0.5)}" stroke-width="0.8"/><rect x="38" y="31" width="12" height="3" rx="1.2" fill="#2a2c30"/>`);
    for (const [x, y] of [[22, 91], [66, 91], [80, 85]]) t.push(`<circle cx="${x}" cy="${y}" r="3.2" fill="#2a2c30"/><circle cx="${x}" cy="${y}" r="1.2" fill="#a2a6ab"/>`);
  },
  // Perlenkette: Länge 45, 55 Perlen Ø 7 mm, Kastenschloss; als Oval gelegt, vorn größer
  perlenkette(S, t, p) {
    t.push(boden(50, 86, 34, 2.4, 0.06));
    const n = 44;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = 50 + Math.sin(a) * 36, y = 50 - Math.cos(a) * 30, r = 2.6 + 1.1 * (1 - Math.cos(a)) / 2;
      t.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${S.c}" stroke="${dunkel(S.c, 0.25)}" stroke-width="0.35"/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.35)}" fill="#fff" opacity="0.8"/>`);
    }
    t.push(`<rect x="45" y="16" width="10" height="6" rx="1.2" fill="${GOLD}" stroke="${dunkel(GOLD, 0.45)}" stroke-width="0.5"/>`);
  },
  // Kaffeeservice: Kanne 1,2 l (Höhe 22), zwei Tassen 0,2 l mit Untertasse Ø 15; Porzellan mit Goldrand
  kaffeeservice(S, t, p) {
    t.push(boden(50, 88, 44, 3));
    // Kanne hinten
    t.push(`<path d="M64 32 Q76 36 74 50 Q72 58 64 60" stroke="${dunkel(S.c, 0.3)}" stroke-width="3.6" fill="none"/>`);
    t.push(form(S, 'M40 20 Q36 30 38 46 Q40 62 46 66 L62 66 Q68 62 68 46 Q70 30 66 20 Z', S.c, { licht: 'rund', glanz: true }));
    t.push(`<path d="M40 30 Q30 30 26 22" stroke="${dunkel(S.c, 0.3)}" stroke-width="3.4" fill="none"/><path d="M40 30 Q30 30 26 22" stroke="${S.c}" stroke-width="2.2" fill="none"/>`);
    t.push(`<ellipse cx="53" cy="20" rx="13" ry="3" fill="${hell(S.c, 0.1)}" stroke="${GOLD}" stroke-width="0.9"/><ellipse cx="53" cy="16" rx="3" ry="2.4" fill="${S.c}" stroke="${GOLD}" stroke-width="0.7"/>`);
    // Tassen vorn
    const tasse = (cx, cy) => [`<ellipse cx="${cx}" cy="${cy + 8}" rx="15" ry="4" fill="${hell(S.c, 0.05)}" stroke="${GOLD}" stroke-width="0.8"/>`,
      `<path d="M${cx + 9} ${cy - 3} q6 0 5 5 q-1 4 -6 4" stroke="${dunkel(S.c, 0.3)}" stroke-width="2" fill="none"/>`,
      form(S, `M${cx - 10} ${cy - 6} Q${cx - 10} ${cy + 8} ${cx} ${cy + 8} Q${cx + 10} ${cy + 8} ${cx + 10} ${cy - 6} Z`, S.c, { licht: 'rund' }),
      `<ellipse cx="${cx}" cy="${cy - 6}" rx="10" ry="2.6" fill="#6a4630" stroke="${GOLD}" stroke-width="0.8"/>`].join('');
    t.push(tasse(26, 70), tasse(74, 74));
  },
};
export const Q34_ZUBEHOER_ZEICHNER = Object.fromEntries(Object.entries(Q34_ZUBEHOER).map(([k, fn]) => ['q34' + k, fn]));
