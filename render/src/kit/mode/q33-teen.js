// Q33: Zubehör, Schuhe, Beauty und Zimmer für Teens & Tweens und Young Adults als Freisteller.
// Gleicher Stil wie q29-hilfen (Licht links, Standfläche, feine Kontur). Maße je Zeichner im Kommentar.

import { f, E, glatt, hell, dunkel, linie, naht, flaeche, boden, form, zylinder, stoff2, rund, glanz } from './q29-hilfen.js';
import { motiv } from './q33-motive.js';
import { dessin } from './q33-dessins.js';

const rr = (x, y, w, h, r) => `M${f(x + r)} ${f(y)} H${f(x + w - r)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} V${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} H${f(x + r)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} V${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;
const kreis = (cx, cy, r) => `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;

export const TEEN = { silhouetten: {}, zeichner: {} };
const neu = (id, gruppe, material, farbe, zeichner, p = {}, model = null) => { TEEN.silhouetten[id] = { gruppe, zeichner: 'z:' + id, p, material, farbe, model }; TEEN.zeichner[id] = zeichner; };

// ─────────────────────────────── Kopf und Haar
// Bucket Hat: Kopfteil Höhe 0,35 der Breite, Krempe rundum 0,2 abfallend, Steppringe auf der Krempe, Allover-Dessin.
neu('t_buckethat', 'accessoire', 'baumwolle', 'creme', (S, t, p) => {
  t.push(boden(50, 84, 40, 3));
  S.tex = dessin(S, p.dessin ?? 'schach');
  t.push(flaeche(S, 'M8 70 Q12 54 26 50 L74 50 Q88 54 92 70 Q50 84 8 70 Z', { ton: -0.06 }));
  t.push(flaeche(S, 'M26 52 Q24 26 50 24 Q76 26 74 52 Q50 58 26 52 Z'));
  for (const k of [3, 7, 11]) t.push(linie(`M${8 + k} ${70 - k * 0.6} Q50 ${83 - k * 0.9} ${92 - k} ${70 - k * 0.6}`, S.cD, 0.45, 0.6));
  t.push(linie('M26 50 Q50 56 74 50', S.cK, 0.8));
}, { dessin: 'schach', art: 'bucket' }, 'muetze');
// Bandana: Quadrattuch 55 × 55 diagonal gefaltet, Paisley-Bordüre.
neu('t_bandana', 'accessoire', 'baumwolle', 'rot', (S, t) => {
  t.push(boden(50, 80, 40, 2.4));
  t.push(flaeche(S, 'M8 30 L92 30 L50 82 Z'));
  t.push(linie('M14 34 L86 34 L50 77 Z', '#fbf7ee', 0.9));
  for (let i = 0; i < 9; i++) { const x = 18 + i * 8; t.push(`<path d="M${x} 38 q3 -1 3 2 q0 3 -3 3 q-2 -2 0 -5" fill="#fbf7ee"/>`); }
  for (const [x, y] of [[50, 52], [40, 46], [60, 46], [50, 64]]) t.push(`<circle cx="${x}" cy="${y}" r="2" fill="none" stroke="#fbf7ee" stroke-width="0.8"/><circle cx="${x}" cy="${y}" r="0.6" fill="#fbf7ee"/>`);
});
// Haarklammer (Claw Clip): 9 cm, zwei Kammhälften mit Zähnen, Federgelenk, Schildpatt-Optik.
neu('t_herzbrille', 'accessoire', 'kunststoff', 'rosa', (S, t) => {
  t.push(boden(50, 80, 38, 2.4));
  // Herz-Sonnenbrille: zwei herzförmige Gläser 30 breit, Steg, Bügel nach hinten angedeutet
  const herz = (x) => `M${x} 66 C${x - 26} 50 ${x - 18} 26 ${x} 38 C${x + 18} 26 ${x + 26} 50 ${x} 66 Z`;
  for (const x of [30, 70]) t.push(form(S, herz(x), S.c), `<path d="${herz(x)}" transform="translate(${x * 0.18} 7.6) scale(0.82)" fill="#5a2a3a" opacity="0.75"/>`, `<path d="M${x - 10} 40 q4 -4 8 -2" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.6"/>`);
  t.push(`<path d="M42 40 Q50 34 58 40" stroke="${S.c}" stroke-width="3" fill="none"/>`, linie('M8 40 L2 30 M92 40 L98 30', dunkel(S.c, 0.2), 2.4));
});
// Scrunchies im 3er-Set: gekräuselter Stoffring Ø 0,4, Satin, Velours, Karo.
neu('t_scrunchies', 'accessoire', 'satin', 'altrosa', (S, t) => {
  t.push(boden(50, 86, 40, 2.4));
  // Scrunchies: Haargummis mit stark gekräuseltem Stoffschlauch, Rand gewellt, kleines Loch in der Mitte
  [['altrosa', 'satin', 30, 50], ['salbei', 'samt', 70, 50], ['creme', 'baumwolle', 50, 70]].forEach(([c, m, x, y]) => {
    const S2 = stoff2(S, c, m);
    if (m === 'baumwolle') S2.tex = dessin(S2, 'schotten');
    let d = 'M'; for (let i = 0; i <= 36; i++) { const a = i * Math.PI / 18, r = i % 2 ? 18 : 15; d += `${f(x + r * Math.cos(a))} ${f(y + r * 0.8 * Math.sin(a))} ${i < 36 ? 'L' : 'Z'}`; }
    t.push(flaeche(S2, `${d} M${x - 5} ${y} A5 4 0 1 0 ${x + 5} ${y} A5 4 0 1 0 ${x - 5} ${y} Z`));
    for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; t.push(linie(`M${f(x + 6 * Math.cos(a))} ${f(y + 4.8 * Math.sin(a))} L${f(x + 15 * Math.cos(a))} ${f(y + 12 * Math.sin(a))}`, S2.cD, 0.7, 0.7)); }
  });
});
// Stirnband: Frottee-Stirnband breit 0,25, ringförmig, Logo-Streifen frei.
neu('t_stirnband', 'accessoire', 'frottee', 'weiß', (S, t) => {
  // Frottee-Stirnband an einem Büstenkopf: Band 0,25 der Kopfhöhe über der Stirn, zwei Kontraststreifen
  t.push(`<path d="M30 92 Q30 74 38 70 L38 62 Q24 54 26 34 Q30 10 50 10 Q70 10 74 34 Q76 54 62 62 L62 70 Q70 74 70 92 Z" fill="#d9d2c6"/>`);
  t.push(`<path d="M28 34 Q30 10 50 10 Q70 10 72 34 Q60 26 50 26 Q40 26 28 34 Z" fill="#6a4630"/>`);
  t.push(flaeche(S, 'M25 28 Q50 16 75 28 L76 42 Q50 30 24 42 Z'), `<path d="M25 33 Q50 21 75 33" stroke="#c8372f" stroke-width="1.6" fill="none"/><path d="M24.6 37 Q50 25 75.4 37" stroke="#273659" stroke-width="1.4" fill="none"/>`);
});
// Truckercap: Schaum-Front mit Druck, Mesh hinten, Druckverschluss, flacher Schirm.
neu('t_truckercap', 'accessoire', 'polyester', 'weiß', (S, t) => {
  t.push(boden(50, 82, 36, 2.4));
  const M = stoff2(S, 'schwarz', 'polyester'); M.tex = dessin(M, 'netz');
  t.push(flaeche(M, 'M58 26 Q80 28 82 60 L60 62 Z'));
  t.push(flaeche(S, 'M18 62 Q16 22 52 20 Q62 22 60 62 Z'));
  t.push(flaeche(S, 'M16 60 Q46 64 80 60 Q86 68 88 74 Q50 80 14 74 Q12 66 16 60 Z', { ton: -0.15 }), motiv('blitz', 38, 42, 16), `<circle cx="50" cy="21" r="2" fill="${dunkel(S.c, 0.2)}"/>`);
}, { art: 'cap' }, 'muetze');

// ─────────────────────────────── Taschen
// Schulrucksack (Teens): 30 l, Front mit Reißverschlussfach und Seitentaschen, Laptopfach, Griffschlaufe, Daisy-Chain.
neu('t_schulrucksack', 'tasche', 'polyester', 'schwarz', (S, t) => {
  t.push(boden(50, 92, 32, 2.6));
  t.push(flaeche(S, 'M22 24 Q22 10 50 10 Q78 10 78 24 L80 88 Q80 92 74 92 L26 92 Q20 92 20 88 Z'));
  t.push(flaeche(S, rr(28, 52, 44, 32, 6), { ton: 0.06 }), linie('M32 56 H68', '#c9c6bf', 0.9), `<rect x="62" y="54" width="3" height="6" rx="1" fill="#c9c6bf"/>`);
  t.push(linie('M24 26 Q50 16 76 26', '#c9c6bf', 0.9), `<rect x="69" y="27" width="3" height="5" rx="1" fill="#c9c6bf"/>`);
  for (let y = 60; y < 82; y += 5) t.push(`<rect x="47" y="${y}" width="6" height="3" rx="0.6" fill="${dunkel(S.c, 0.4)}"/>`);
  t.push(`<path d="M42 10 Q50 0 58 10" stroke="${dunkel(S.c, 0.3)}" stroke-width="2.4" fill="none"/>`, flaeche(S, 'M80 54 L88 56 L88 84 L80 84 Z', { ton: -0.15 }), flaeche(S, 'M20 54 L12 56 L12 84 L20 84 Z', { ton: -0.15 }));
  t.push(`<rect x="30" y="38" width="12" height="7" rx="1" fill="#e8833a"/>`);
});
// Stoffbeutel (Tote Bag): Canvas 38 × 42, lange Henkel, großer Siebdruck.
neu('t_stoffbeutel', 'tasche', 'baumwolle', 'ecru', (S, t) => {
  t.push(boden(50, 92, 30, 2.2));
  t.push(`<path d="M32 40 Q30 6 42 6 Q48 6 46 40 M54 40 Q52 6 60 6 Q72 6 68 40" stroke="${dunkel(S.c, 0.12)}" stroke-width="3.6" fill="none"/>`);
  t.push(flaeche(S, 'M22 38 L78 38 L80 92 L20 92 Z'), motiv('grafik', 50, 64, 30));
});
// Mini-Rucksack: kleiner Lederrucksack 20 × 24, Kordelzug, Klappe mit Schnalle.
neu('t_minirucksack', 'tasche', 'leder', 'cognac', (S, t) => {
  t.push(boden(50, 88, 26, 2.2));
  t.push(`<path d="M36 26 Q30 2 50 2 Q70 2 64 26" stroke="${dunkel(S.c, 0.2)}" stroke-width="2.4" fill="none"/>`);
  t.push(form(S, 'M26 30 Q26 22 34 22 L66 22 Q74 22 74 30 L76 82 Q76 88 70 88 L30 88 Q24 88 24 82 Z', S.c, { licht: 'rund' }));
  t.push(form(S, 'M26 28 Q50 20 74 28 L72 50 Q50 58 28 50 Z', dunkel(S.c, 0.08)), `<rect x="45" y="50" width="10" height="12" rx="1.4" fill="none" stroke="#c9a24a" stroke-width="1.4"/>`, linie('M50 54 V70', dunkel(S.c, 0.25), 2));
});
// Handykette: Umhängekette mit Perlen und Karabiner, Handyhülle transparent.
neu('t_handykette', 'accessoire', 'kunststoff', 'lila', (S, t) => {
  t.push(boden(54, 90, 22, 2));
  t.push(form(S, rr(40, 40, 30, 50, 6), '#e9eef2', { glanz: true }), `<rect x="44" y="44" width="10" height="10" rx="3" fill="#2a2c30"/><circle cx="49" cy="49" r="2.4" fill="#4f6f9a"/>`);
  const pkt = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pkt.push([42 + 26 * u - Math.sin(u * Math.PI) * 30, 88 - u * 78 + Math.sin(u * Math.PI) * 10]); }
  pkt.forEach(([x, y], i) => t.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${i % 3 ? 1.4 : 2.2}" fill="${['#f1cf4a', '#e86aa0', '#6fc4c9', '#9a7bd0'][i % 4]}"/>`));
});

// ─────────────────────────────── Schmuck
// Freundschaftsarmbänder: drei geknüpfte Bänder mit Perlen-Buchstaben, ringförmig gestapelt.
neu('t_freundschaftsarmband', 'accessoire', 'baumwolle', 'rosa', (S, t) => {
  t.push(boden(50, 82, 36, 2.4));
  [['#e86aa0', 0], ['#6fc4c9', 9], ['#f1cf4a', 18]].forEach(([c, d]) => {
    t.push(`<ellipse cx="50" cy="${46 + d}" rx="34" ry="14" fill="none" stroke="${c}" stroke-width="3.4"/><ellipse cx="50" cy="${46 + d}" rx="34" ry="14" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="1.4 2" opacity="0.6"/>`);
  });
  for (let i = 0; i < 5; i++) t.push(`<rect x="${37 + i * 5.4}" y="56.4" width="4.6" height="4.6" rx="0.8" fill="#fbf7ee" stroke="#a89c8a" stroke-width="0.3"/><path d="M${38.4 + i * 5.4} 58.7 h1.8" stroke="#2a2c30" stroke-width="0.7"/>`);
});
// Kreolen: zwei große Ringe Ø 0,5, Goldton, Klappverschluss.
neu('t_kreolen', 'accessoire', 'metall', 'gold', (S, t) => {
  t.push(boden(50, 86, 34, 2));
  for (const [x, r] of [[32, 20], [68, 20]]) t.push(`<circle cx="${x}" cy="54" r="${r}" fill="none" stroke="${dunkel('#c9a24a', 0.25)}" stroke-width="4.4"/><circle cx="${x}" cy="54" r="${r}" fill="none" stroke="#e6c873" stroke-width="2.6"/><path d="M${x - 10} ${54 - r + 2} A${r} ${r} 0 0 1 ${x + 6} ${54 - r + 1}" stroke="#fff6d8" stroke-width="1" fill="none"/>`);
});
// Choker: enges Halsband aus Samt mit Anhänger, offen gelegt im Halbkreis.
neu('t_choker', 'accessoire', 'samt', 'schwarz', (S, t) => {
  t.push(boden(50, 84, 36, 2.2));
  t.push(`<path d="M12 34 Q14 74 50 74 Q86 74 88 34" stroke="${S.c}" stroke-width="5" fill="none"/><path d="M12 34 Q14 74 50 74 Q86 74 88 34" stroke="#fff" stroke-width="0.6" fill="none" opacity="0.25"/>`);
  t.push(`<circle cx="50" cy="76" r="2" fill="#c9ced3"/><path d="M44 80 L50 92 L56 80 Z" fill="#c9ced3" stroke="#77736b" stroke-width="0.4"/>`, `<rect x="9" y="28" width="6" height="7" rx="1" fill="#c9ced3"/><rect x="85" y="28" width="6" height="7" rx="1" fill="#c9ced3"/>`);
});
// Tennissocken im 3er-Pack: weiß mit Ringelbündchen in zwei Farben.
neu('t_tennissocken', 'waesche', 'baumwolle', 'weiß', (S, t) => {
  t.push(boden(50, 88, 40, 2));
  [[26, -10], [50, 0], [74, 10]].forEach(([x, r]) => {
    t.push(`<g transform="rotate(${r} ${x} 50)">` + flaeche(S, `M${x - 8} 12 L${x + 8} 12 L${x + 8} 58 Q${x + 18} 62 ${x + 18} 74 Q${x + 18} 84 ${x + 6} 84 L${x - 4} 84 Q${x - 10} 84 ${x - 10} 74 L${x - 8} 12 Z`) + `<rect x="${x - 8}" y="18" width="16" height="2.6" fill="#273659"/><rect x="${x - 8}" y="22" width="16" height="2.6" fill="#c8372f"/>` + linie(`M${x - 8} 15 H${x + 8}`, S.cD, 0.5) + '</g>');
  });
});

// ─────────────────────────────── Schuhe ohne Schnürung
// Badeschlappen (Slides): Fußbett mit Profil, breiter Riemen 0,35 der Länge, Dreiviertel.
neu('t_slides', 'schuhe', 'gummi', 'schwarz', (S, t) => {
  t.push(boden(50, 78, 42, 3));
  t.push(form(S, 'M6 66 Q8 54 26 52 L80 48 Q96 48 94 60 Q92 70 78 70 L22 74 Q6 76 6 66 Z', dunkel(S.c, 0.2)), form(S, 'M8 62 Q10 52 26 50 L80 46 Q94 46 92 56 Q90 64 78 64 L22 68 Q8 70 8 62 Z', hell(S.c, 0.12)));
  t.push(form(S, 'M16 58 Q14 30 40 28 Q62 28 62 50 L60 62 L18 66 Z', S.c, { licht: 'rund' }));
  t.push(`<path d="M24 46 Q38 38 54 44" stroke="#fbf7ee" stroke-width="2.4" fill="none"/>`);
}, { art: 'sneaker' }, 'schuhe');
// Clogs: Komfortclog mit Belüftungslöchern und Fersenriemen, Pins (Anstecker).
neu('t_clogs', 'schuhe', 'gummi', 'mint', (S, t) => {
  t.push(boden(50, 82, 42, 2.6));
  t.push(form(S, 'M6 68 Q6 34 42 34 L70 40 Q92 46 92 64 L92 70 Q90 78 80 78 L16 80 Q6 80 6 68 Z', S.c, { glanz: true }), form(S, 'M8 72 L92 70 L92 78 Q90 84 80 84 L16 84 Q8 84 8 76 Z', dunkel(S.c, 0.2)));
  for (const [x, y] of [[18, 46], [26, 42], [34, 40], [42, 39], [22, 54], [30, 50], [38, 48]]) t.push(`<circle cx="${x}" cy="${y}" r="1.8" fill="${dunkel(S.c, 0.45)}"/>`);
  t.push(`<path d="M68 44 Q78 26 90 40" stroke="${dunkel(S.c, 0.12)}" stroke-width="5" fill="none"/>`, motiv('smiley', 30, 62, 9), motiv('herz', 48, 60, 8), motiv('stern', 62, 58, 8));
}, { art: 'sneaker' }, 'schuhe');

// ─────────────────────────────── Beauty
// Lipgloss: Röhrchen mit Applikator-Kappe, Glitzerinhalt durchscheinend.
neu('t_lipgloss', 'beauty', 'glas', 'rosa', (S, t) => {
  t.push(boden(50, 90, 20, 2));
  t.push(`<g transform="rotate(-8 50 50)">` + form(S, rr(42, 40, 16, 48, 3), '#f2b8cc', { glanz: true }) + `<rect x="44" y="44" width="12" height="40" rx="2" fill="#e86aa0" opacity="0.6"/>` + [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${46 + (i % 3) * 4}" cy="${52 + i * 5}" r="0.6" fill="#fff"/>`).join('') + form(S, rr(43, 6, 14, 36, 4), '#2a2c30', { glanz: true }) + '</g>');
  t.push(`<g transform="rotate(20 74 70)"><rect x="72" y="46" width="3" height="30" fill="#2a2c30"/><ellipse cx="73.5" cy="78" rx="2.6" ry="5" fill="#e86aa0"/></g>`);
});
// Bodyspray: Sprühflasche 150 ml, Sprühkopf, bunter Verlauf.
neu('t_bodyspray', 'beauty', 'aluminium', 'lila', (S, t) => {
  t.push(boden(56, 90, 16, 2));
  // Bodyspray: schlanke Sprühdose 150 ml mit Sprühkopf, Sprühnebel nach links
  const id = 'bs' + Math.random().toString(36).slice(2, 6);
  S.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7bd0"/><stop offset="1" stop-color="#e86aa0"/></linearGradient>`);
  t.push(`<path d="M46 30 L66 30 L66 88 Q56 92 46 88 Z" fill="url(#${id})"/>`, `<path d="M46 30 L66 30 L66 88 Q56 92 46 88 Z" fill="${rund(S)}"/>`, zylinder(S, 56, 22, 30, 10, 2.6, '#c9ced3', { metall: true }), form(S, rr(50, 12, 12, 11, 2), '#fbf7ee'), `<circle cx="50.5" cy="16" r="1" fill="#2a2c30"/>`);
  for (const [x, y, r] of [[40, 16, 2.4], [32, 13, 3.4], [24, 18, 3], [20, 10, 2.4], [30, 22, 2.2], [14, 15, 2]]) t.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#c4a0dc" opacity="0.35"/>`);
  t.push(motiv('stern', 56, 58, 12));
});

// ─────────────────────────────── Zimmer
// Lichterkette: Kabel in Wellen, 20 Tropfenbirnen warmweiß mit Lichthof, Fotoklammern.
neu('t_lichterkette', 'home', 'kunststoff', 'gelb', (S, t) => {
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([4 + 92 * u, 22 + Math.sin(u * Math.PI * 2) * 10 + u * 40]); }
  t.push(`<path d="M${pts.map(([x, y]) => f(x) + ' ' + f(y)).join(' L')}" stroke="#4a4540" stroke-width="0.7" fill="none"/>`);
  pts.filter((_, i) => i % 2 === 1).forEach(([x, y], i) => t.push(`<circle cx="${f(x)}" cy="${f(y + 4)}" r="4.4" fill="#f8e7a0" opacity="0.35"/><path d="M${f(x)} ${f(y + 1)} q-2 3 0 5 q2 -2 0 -5 Z" fill="#fbe28a" stroke="#e3b04b" stroke-width="0.3"/>`));
  for (const [i, c] of [[8, '#4f6f9a'], [22, '#e86aa0'], [34, '#5f9a4a']]) { const [x, y] = pts[i]; t.push(`<rect x="${f(x - 6)}" y="${f(y + 6)}" width="12" height="14" fill="#fbf7ee" stroke="#c9bfae" stroke-width="0.4"/><rect x="${f(x - 4.6)}" y="${f(y + 7.4)}" width="9.2" height="9" fill="${c}" opacity="0.7"/><rect x="${f(x - 1)}" y="${f(y + 3)}" width="2" height="5" fill="${'#d9b98c'}"/>`); }
});
// Sitzsack: birnenförmig, Höhe 0,8, Kord, Tragegriff, Delle oben.
neu('t_sitzsack', 'home', 'cord', 'senf', (S, t) => {
  t.push(boden(50, 90, 40, 3.4));
  t.push(flaeche(S, 'M14 86 Q4 70 18 50 Q30 30 48 22 Q70 16 78 34 Q94 52 88 78 Q82 92 50 92 Q22 92 14 86 Z'));
  t.push(flaeche(S, 'M36 40 Q50 30 66 36 Q60 46 48 48 Q40 46 36 40 Z', { ton: -0.12 }), `<rect x="44" y="22" width="12" height="4" rx="2" fill="${dunkel(S.c, 0.3)}"/>`);
  for (const x of [26, 40, 54, 68, 80]) t.push(linie(`M${x} 46 Q${x + 2} 70 ${x} 90`, S.cD, 0.5, 0.4));
});
// Poster-Set: drei Kunstdrucke 30 × 40 in Rahmen, versetzt gelehnt.
neu('t_posterset', 'home', 'papier', 'weiß', (S, t) => {
  t.push(boden(50, 90, 42, 2.4));
  [[10, 30, 30, 42, 'grafik', '#f6e7d0'], [36, 20, 30, 48, 'regenbogen', '#e9eef2'], [64, 34, 26, 38, 'smiley', '#fbf7ee']].forEach(([x, y, w, h, m, g]) => t.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2a2c30"/><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="${g}"/>`, motiv(m, x + w / 2, y + h / 2, w * 0.55)));
});
// Pinnwand: Kork 40 × 60 mit Rahmen, Pins, Fotos, Notizzettel.
neu('t_pinnwand', 'home', 'kork', 'camel', (S, t) => {
  t.push(boden(50, 92, 34, 2));
  t.push(`<rect x="14" y="10" width="72" height="80" rx="2" fill="#f4f1ea" stroke="#a89c8a" stroke-width="0.6"/><rect x="18" y="14" width="64" height="72" fill="#c49a62"/>`);
  for (let i = 0; i < 40; i++) t.push(`<circle cx="${f(20 + ((i * 37) % 60))}" cy="${f(16 + ((i * 23) % 68))}" r="0.5" fill="#8a6a3a" opacity="0.6"/>`);
  t.push(`<rect x="24" y="22" width="20" height="16" fill="#fbf7ee" transform="rotate(-6 34 30)"/><rect x="26" y="24" width="16" height="10" fill="#6fc4c9" transform="rotate(-6 34 30)"/><rect x="52" y="20" width="18" height="18" fill="#f1cf4a" transform="rotate(5 61 29)"/><rect x="34" y="50" width="22" height="18" fill="#fbf7ee" transform="rotate(4 45 59)"/><rect x="36" y="52" width="18" height="11" fill="#e86aa0" transform="rotate(4 45 59)"/><rect x="62" y="54" width="14" height="20" fill="#a9c8e8" transform="rotate(-8 69 64)"/>`);
  for (const [x, y, c] of [[34, 22, '#c8372f'], [61, 21, '#4f6f9a'], [45, 51, '#5f9a4a'], [69, 55, '#c8372f']]) t.push(`<circle cx="${x}" cy="${y}" r="1.8" fill="${c}"/>`);
});
// Wecker: Retro-Doppelglockenwecker Ø 0,5, Füße, Zeiger.
neu('t_wecker', 'home', 'metall', 'mint', (S, t) => {
  t.push(boden(50, 88, 26, 2));
  for (const x of [30, 70]) t.push(form(S, `M${x - 10} 30 Q${x} 14 ${x + 10} 30 Z`, '#c9ced3', { licht: 'metall' }));
  t.push(linie('M38 22 L62 22', '#c9ced3', 1.6), linie('M34 80 L28 88 M66 80 L72 88', '#77736b', 2.4));
  t.push(form(S, kreis(50, 56, 26), S.c, { licht: 'rund', glanz: true }), `<circle cx="50" cy="56" r="20" fill="#fbf7ee"/>`);
  for (let i = 0; i < 12; i++) t.push(`<rect x="49.4" y="38" width="1.2" height="${i % 3 ? 2 : 3.4}" fill="#2a2c30" transform="rotate(${i * 30} 50 56)"/>`);
  t.push(linie('M50 56 L50 44 M50 56 L59 60', '#2a2c30', 1.4), `<circle cx="50" cy="56" r="1.4" fill="#c8372f"/>`);
});
// Flauschteppich: Hochflor rund Ø 120, zottige Kante.
neu('t_flauschteppich', 'home', 'pluesch', 'creme', (S, t) => {
  t.push(`<ellipse cx="50" cy="66" rx="46" ry="20" fill="#000" opacity="0.08"/>`);
  // Hochflor rund, schräg von oben: Florbüschel als Zotteln, Rand ausgefranst, Dicke sichtbar
  let d = 'M'; for (let i = 0; i <= 90; i++) { const a = i * Math.PI * 2 / 90, r = 1 + (i % 2 ? 0.06 : -0.03); d += `${f(50 + 45 * r * Math.cos(a))} ${f(56 + 24 * r * Math.sin(a))} ${i < 90 ? 'L' : 'Z'}`; }
  t.push(`<path d="${d}" fill="${dunkel(S.c, 0.25)}" transform="translate(0 4)"/>`, flaeche(S, d));
  for (let i = 0; i < 140; i++) { const a = (i * 2.399) % (Math.PI * 2), r = Math.sqrt((i % 70) / 70); const x = 50 + 42 * r * Math.cos(a), y = 56 + 22 * r * Math.sin(a); t.push(`<path d="M${f(x)} ${f(y)} q${f(1 + (i % 3))} ${f(-2 - (i % 2))} ${f(2.4)} ${f(0.4)}" stroke="${i % 2 ? dunkel(S.c, 0.22) : '#fff'}" stroke-width="0.7" fill="none" opacity="0.7"/>`); }
});
// Klemmleuchte: Schreibtisch-Klemmlampe, Gelenkarm, Kopf mit Schirm, Zwinge.
neu('t_klemmleuchte', 'home', 'metall', 'schwarz', (S, t) => {
  t.push(boden(30, 90, 18, 2));
  t.push(form(S, 'M22 74 L38 74 L38 90 L34 90 L34 80 L26 80 L26 90 L22 90 Z', S.c), linie('M30 74 L42 40 L70 30', S.c, 2.6), `<circle cx="42" cy="40" r="2.6" fill="${dunkel(S.c, 0.3)}"/>`);
  t.push(form(S, 'M64 26 L86 18 L94 40 Q82 50 70 44 Z', S.c, { licht: 'rund' }), `<ellipse cx="82" cy="45" rx="10" ry="3" fill="#fbe28a" transform="rotate(-22 82 45)"/>`, `<path d="M74 48 L60 90 L100 90 L92 44 Z" fill="#fbe28a" opacity="0.15"/>`);
});
// Wendebettwäsche: Bezug mit großem Karo, Rückseite uni umgeschlagen, Kissen.
neu('t_wendebettwaesche', 'home', 'baumwolle', 'salbei', (S, t) => {
  t.push(boden(50, 88, 42, 3));
  S.tex = dessin(S, 'schach');
  t.push(flaeche(S, rr(8, 24, 84, 60, 3)));
  const S2 = stoff2(S, 'creme');
  t.push(flaeche(S2, 'M60 84 L92 52 L92 84 Z', { ton: -0.03 }), flaeche(S2, rr(18, 14, 44, 24, 5)), linie('M60 84 L92 52', S.cK, 0.6));
});
// Neonschild: LED-Neon-Wolke mit Blitz auf Acrylplatte, Leuchtschein.
neu('t_neonlampe', 'home', 'kunststoff', 'rosa', (S, t) => {
  t.push(`<rect x="10" y="18" width="80" height="62" rx="6" fill="#e9eef2" opacity="0.5" stroke="#c9ced3" stroke-width="0.5"/>`);
  const d = 'M22 60 Q14 52 22 44 Q22 30 36 32 Q42 20 56 24 Q68 22 72 34 Q86 34 84 48 Q90 58 80 62 Z';
  t.push(`<path d="${d}" stroke="#e86aa0" stroke-width="7" fill="none" opacity="0.25"/><path d="${d}" stroke="#f6a0c8" stroke-width="2.4" fill="none"/><path d="${d}" stroke="#fff" stroke-width="0.8" fill="none"/>`);
  t.push(`<path d="M52 30 L44 46 L52 46 L46 60" stroke="#f1cf4a" stroke-width="6" fill="none" opacity="0.25"/><path d="M52 30 L44 46 L52 46 L46 60" stroke="#f8e27a" stroke-width="2.2" fill="none"/>`, linie('M50 80 Q52 90 64 92', '#9c978d', 0.8));
});
