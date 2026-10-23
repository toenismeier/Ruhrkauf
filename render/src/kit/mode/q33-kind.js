// Q33: Baby, Spielzeug, Schule, Kinderzimmer, Kinderwäsche und Kinder-Zubehör als Freisteller (Produktfoto-Anmutung).
// Ein Stil: Licht von links, weiche Standfläche (boden), Kontur wie stoff.js; Maße je Zeichner im Kommentar.

import { f, E, glatt, hell, dunkel, mische, linie, naht, flaeche, boden, form, zylinder, stoff2, etikett, rund } from './q29-hilfen.js';
import { motiv } from './q33-motive.js';
import { dessin } from './q33-dessins.js';
import { SCHUH_ZEICHNER } from './q28-schuhe.js';

const z = (gruppe, name, material, farbe, p = {}) => ({ gruppe, zeichner: 'z:' + name, p, material, farbe, model: null });
const rr = (x, y, w, h, r) => `M${f(x + r)} ${f(y)} H${f(x + w - r)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} V${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} H${f(x + r)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} V${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;
const kreis = (cx, cy, r) => `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
const BUNT = ['#c8574a', '#e3b04b', '#5f8f7a', '#4f6f9a', '#d98a6b', '#9a7bd0'];
const HOLZ = '#d9b98c';
const knopfDruck = (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="1.2" fill="#d9d6cf" stroke="#77736b" stroke-width="0.35"/>`;

export const KIND = { silhouetten: {}, zeichner: {} };
const neu = (id, gruppe, material, farbe, zeichner, p = {}) => { KIND.silhouetten[id] = z(gruppe, id, material, farbe, p); KIND.zeichner[id] = zeichner; };

// ─────────────────────────────── Baby
// Wickelbody: Body Gr. 62 mit seitlicher Wickelung (zwei Druckknöpfe an der Seite, drei im Schritt), Kurzarm. Länge : Breite ≈ 1,25.
neu('k_wickelbody', 'oberteil', 'baumwolle', 'salbei', (S, t) => {
  t.push(boden(50, 92, 28, 2));
  const d = glatt([[34, 14, E], [42, 12, E], [50, 18], [58, 12, E], [66, 14, E], [80, 24, E], [74, 34, E], [68, 30, E], [67, 56], [62, 72], [56, 84, E], [44, 84, E], [38, 72], [33, 56], [32, 30, E], [26, 34, E], [20, 24, E]], true, 0.3);
  t.push(flaeche(S, d));
  t.push(linie('M42 13 Q50 22 58 13', dunkel(S.c, 0.2), 1.6));
  t.push(flaeche(S, glatt([[58, 13, E], [66, 15, E], [68, 30], [67, 56], [52, 46], [48, 22]], true, 0.3), { ton: 0.06 }));
  t.push(linie('M58 13 Q48 30 66 56', S.cD, 0.8), knopfDruck(63, 42), knopfDruck(66, 52), knopfDruck(45, 81), knopfDruck(50, 81), knopfDruck(55, 81));
});
// Erstlingsmütze mit Knoten: halbkugelige Haube, Umschlag 1/4, Zipfel geknotet.
neu('k_erstlingsmuetze', 'accessoire', 'baumwolle', 'creme', (S, t) => {
  t.push(boden(48, 86, 30, 2.4));
  t.push(flaeche(S, glatt([[20, 82, E], [18, 52], [30, 30], [52, 26], [66, 30], [70, 36], [78, 82, E]], true, 0.35)));
  t.push(flaeche(S, glatt([[66, 30, E], [76, 18], [86, 16], [84, 26], [74, 34, E]], true, 0.4), { ton: -0.05 }));
  t.push(`<ellipse cx="78" cy="22" rx="5" ry="4.4" fill="${dunkel(S.c, 0.08)}" stroke="${S.cK}" stroke-width="0.5"/>`);
  t.push(flaeche(S, glatt([[19, 70, E], [79, 70, E], [79, 84, E], [19, 84, E]], true, 0.2), { ton: -0.07 }));
  for (let x = 22; x < 78; x += 2.4) t.push(linie(`M${f(x)} 71 l0 12`, S.cD, 0.35, 0.5));
});
// Lätzchen: Rundform Ø 0,8 Bildbreite, Halsausschnitt, Druckknopf, Frotteerand, Motiv.
neu('k_laetzchen', 'accessoire', 'frottee', 'hellblau', (S, t) => {
  t.push(boden(50, 92, 30, 2));
  t.push(flaeche(S, 'M50 92 C20 92 12 64 18 42 C22 28 30 16 34 14 L42 14 C40 24 44 34 50 34 C56 34 60 24 58 14 L66 14 C70 16 78 28 82 42 C88 64 80 92 50 92 Z'));
  t.push(linie('M50 89 C24 89 16 64 21 43 C24 31 31 20 35 17', '#fff', 1.4, 0.7), linie('M50 89 C76 89 84 64 79 43 C76 31 69 20 65 17', '#fff', 1.4, 0.7));
  t.push(knopfDruck(38, 18), knopfDruck(62, 18), motiv('wal', 50, 62, 22));
});
// Mullwindel/Spucktuch: 80 × 80 cm, zweimal gefaltet, Webkante mit Farbstreifen, Mullstruktur.
neu('k_schmusetuch', 'spielzeug', 'pluesch', 'hellblau', (S, t) => {
  t.push(boden(50, 88, 36, 2.6));
  // Schmusetuch: weiches Quadrattuch mit Knotenecken, in der Mitte Hasenkopf aus Plüsch
  t.push(flaeche(S, 'M10 50 Q30 40 50 54 Q70 40 90 50 Q80 66 92 82 Q70 76 50 86 Q30 76 8 82 Q20 66 10 50 Z'));
  for (const [x, y] of [[8, 50], [92, 50], [8, 82], [92, 82]]) t.push(`<circle cx="${x}" cy="${y}" r="3.6" fill="${dunkel(S.c, 0.12)}" stroke="${S.cK}" stroke-width="0.4"/>`);
  t.push(motiv('hase', 50, 46, 30));
});
// Schnullerkette: Clip, Holzperlen Ø 6 und Silikonperlen, Schnuller mit Schild und Ring.
neu('k_schnullerkette', 'accessoire', 'holz', 'salbei', (S, t) => {
  t.push(boden(54, 88, 34, 2));
  t.push(`<rect x="10" y="16" width="16" height="9" rx="2" fill="#c9ced3" stroke="#77736b" stroke-width="0.5"/><rect x="13" y="18.5" width="10" height="4" rx="1" fill="${S.c}"/>`);
  const pkt = []; for (let i = 0; i < 9; i++) { const u = i / 8; pkt.push([26 + u * 42, 22 + Math.sin(u * Math.PI) * 34 + u * 22]); }
  t.push(linie(`M${pkt.map(([x, y]) => f(x) + ' ' + f(y)).join(' L')}`, '#8a7a6a', 0.6));
  pkt.forEach(([x, y], i) => t.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${i % 2 ? 3.4 : 4.4}" fill="${i % 2 ? HOLZ : [S.c, '#e9e4dc', '#f2b8cc'][i % 3]}" stroke="${dunkel(i % 2 ? HOLZ : S.c, 0.35)}" stroke-width="0.4"/><circle cx="${f(x - 1)}" cy="${f(y - 1.2)}" r="0.9" fill="#fff" opacity="0.4"/>`));
  t.push(`<circle cx="74" cy="78" r="6" fill="none" stroke="${S.c}" stroke-width="2"/><path d="M68 68 Q78 60 88 68 Q90 76 80 74 Q70 76 68 68 Z" fill="${hell(S.c, 0.2)}" stroke="${S.cK}" stroke-width="0.5"/><ellipse cx="86" cy="60" rx="5" ry="7" fill="#efe7c8" opacity="0.85" stroke="#b8a882" stroke-width="0.4" transform="rotate(30 86 60)"/>`);
});
// Rassel: Griff Länge 0,5, Kopf Ø 0,32 mit Perlen sichtbar, Holzring.
neu('k_rassel', 'spielzeug', 'holz', 'gelb', (S, t) => {
  t.push(boden(50, 88, 26, 2));
  t.push(form(S, 'M44 86 L48 46 L54 46 L58 86 Q51 90 44 86 Z', HOLZ, { licht: 'rund' }));
  t.push(form(S, kreis(51, 32, 18), S.c, { licht: 'rund' }));
  t.push(`<circle cx="51" cy="32" r="12" fill="#fff" opacity="0.35"/>`);
  for (const [x, y, c] of [[46, 30, '#c8574a'], [55, 28, '#4f6f9a'], [51, 37, '#5f8f7a'], [57, 35, '#fff']]) t.push(`<circle cx="${x}" cy="${y}" r="2.6" fill="${c}"/>`);
  t.push(`<ellipse cx="51" cy="64" rx="10" ry="4" fill="none" stroke="${dunkel(HOLZ, 0.15)}" stroke-width="3"/>`);
});
// Beißring/Greifling: Ring Ø 0,6 aus Silikon mit Holzring und Tierform (Bär-Kopf).
neu('k_beissring', 'spielzeug', 'silikon', 'mint', (S, t) => {
  t.push(boden(50, 88, 30, 2));
  t.push(`<circle cx="38" cy="48" r="20" fill="none" stroke="${HOLZ}" stroke-width="8"/><circle cx="38" cy="48" r="20" fill="none" stroke="${dunkel(HOLZ, 0.3)}" stroke-width="0.5"/>`);
  t.push(form(S, kreis(66, 58, 16), S.c, { licht: 'rund' }), form(S, kreis(54, 44, 6), S.c), form(S, kreis(78, 44, 6), S.c));
  t.push(`<circle cx="61" cy="56" r="1.6" fill="${dunkel(S.c, 0.5)}"/><circle cx="71" cy="56" r="1.6" fill="${dunkel(S.c, 0.5)}"/><ellipse cx="66" cy="63" rx="4.4" ry="3" fill="${hell(S.c, 0.4)}"/>`);
});
// Babydecke: Wolldecke 75 × 100, gefaltet, Pompon-Bordüre, Sternenmuster.
neu('k_babydecke', 'home', 'strick', 'altrosa', (S, t) => {
  t.push(boden(50, 86, 40, 3));
  // Babydecke 75 × 100, aufgefaltet schräg liegend: Zopfmuster, Satinkante ringsum, eine Ecke umgeschlagen, Name-Etikett mit Teddy
  S.tex = dessin(S, 'stepp');
  t.push(`<path d="M6 54 L54 24 L96 48 L48 80 Z" fill="#fbf7ee"/>`, flaeche(S, 'M11 54 L54 28 L90 48 L48 75 Z'));
  t.push(flaeche(S, 'M48 75 L90 48 L80 66 Z', { ton: 0.2 }), motiv('hase', 34, 52, 14));
});
// Kapuzenbadetuch: Frottee 80 × 80, Ecke als Kapuze mit Ohren.
neu('k_kapuzenhandtuch', 'home', 'frottee', 'gelb', (S, t) => {
  t.push(boden(50, 88, 38, 3));
  t.push(flaeche(S, 'M12 86 L18 30 L82 30 L88 86 Z', { ton: -0.03 }));
  t.push(flaeche(S, 'M30 30 Q50 6 70 30 L62 46 Q50 52 38 46 Z', { ton: 0.05 }));
  for (const x of [36, 64]) t.push(`<circle cx="${x}" cy="17" r="6" fill="${dunkel(S.c, 0.06)}" stroke="${S.cK}" stroke-width="0.5"/><circle cx="${x}" cy="17" r="3" fill="${hell(S.c, 0.4)}"/>`);
  t.push(`<circle cx="45" cy="34" r="1.6" fill="#2a2c30"/><circle cx="55" cy="34" r="1.6" fill="#2a2c30"/><ellipse cx="50" cy="40" rx="3" ry="2" fill="#e39a2a"/>`, linie('M14 80 H86', hell(S.c, 0.3), 2));
});
// Spieluhr: Plüschmond mit Zugschnur und Holzperle.
neu('k_spieluhr', 'spielzeug', 'pluesch', 'flieder', (S, t) => {
  t.push(boden(50, 86, 26, 2));
  // Spieluhr: Plüschschaf zum Aufziehen, Zugring unten, Noten als Zeichen für die Melodie
  t.push(form(S, 'M24 70 Q14 66 18 56 Q12 46 22 40 Q24 28 38 30 Q46 22 58 28 Q72 26 74 40 Q84 46 78 58 Q82 70 70 72 Z', '#f6f1fa', { licht: 'rund' }));
  t.push(form(S, rr(56, 38, 22, 20, 9), S.c), `<circle cx="63" cy="46" r="1.4" fill="#2a2c30"/><circle cx="71" cy="46" r="1.4" fill="#2a2c30"/>`);
  t.push(linie('M30 70 l0 10 M44 72 l0 10 M60 72 l0 10', dunkel(S.c, 0.2), 3), linie('M50 72 L50 84', '#8a7a6a', 0.8), `<circle cx="50" cy="88" r="3" fill="none" stroke="${HOLZ}" stroke-width="1.6"/>`);
  for (const [x, y] of [[18, 20], [30, 12], [82, 22]]) t.push(`<path d="M${x} ${y} v-8 l6 -2 v8" stroke="#4f6f9a" stroke-width="1.2" fill="none"/><ellipse cx="${x - 1.6}" cy="${y}" rx="2" ry="1.5" fill="#4f6f9a"/><ellipse cx="${x + 4.4}" cy="${y - 2}" rx="2" ry="1.5" fill="#4f6f9a"/>`);
});
// Baby-Mobile: Holzbügel, an Fäden Wolke, Stern, Mond, Herz.
neu('k_mobile', 'spielzeug', 'holz', 'hellblau', (S, t) => {
  t.push(linie('M50 6 V18', '#8a7a6a', 0.6), `<path d="M18 20 Q50 14 82 20" stroke="${HOLZ}" stroke-width="2.6" fill="none"/>`);
  for (const [x, l, m] of [[22, 40, 'wolke'], [40, 52, 'stern'], [60, 48, 'herz'], [78, 38, 'sonne']]) t.push(linie(`M${x} 19 V${l}`, '#8a7a6a', 0.4), motiv(m, x, l + 8, 14));
});
// Wickelauflage: Keilform mit hohen Rändern, abwaschbar, Kantenpaspel.
neu('k_wickeltasche', 'tasche', 'polyester', 'salbei', (S, t) => {
  t.push(boden(50, 90, 38, 2.6));
  // Wickeltasche: große Umhängetasche mit Henkeln, Außenfach mit Fläschchen, Wickelunterlage gerollt seitlich
  t.push(`<path d="M30 34 Q30 10 50 10 Q70 10 70 34" stroke="${dunkel(S.c, 0.3)}" stroke-width="3" fill="none"/>`);
  t.push(form(S, rr(14, 32, 66, 56, 6), S.c), form(S, rr(22, 54, 50, 26, 4), dunkel(S.c, 0.1)), motiv('stern', 47, 67, 10));
  t.push(`<rect x="80" y="40" width="12" height="40" rx="3" fill="${dunkel(S.c, 0.2)}"/>`, `<rect x="83" y="22" width="7" height="22" rx="2" fill="#f4f8fb" stroke="#9aa8b0" stroke-width="0.5"/><path d="M83.5 22 Q86.5 12 89.5 22 Z" fill="#f1cf4a"/><path d="M84 30 h5 M84 34 h5 M84 38 h5" stroke="#9aa8b0" stroke-width="0.5"/>`);
});
// Baby-Wickeljacke: Erstlingsjäckchen mit Bindebändern seitlich, Langarm.
neu('k_babyjaeckchen', 'oberteil', 'strick', 'creme', (S, t) => {
  t.push(boden(50, 82, 30, 2));
  S.tex = dessin(S, 'stepp');
  t.push(flaeche(S, glatt([[38, 20, E], [62, 20, E], [84, 30, E], [86, 54, E], [76, 56, E], [70, 40], [70, 76, E], [30, 76, E], [30, 40], [24, 56, E], [14, 54, E], [16, 30, E]], true, 0.3)));
  t.push(linie('M38 20 L60 72', dunkel(S.c, 0.2), 1.2), linie('M62 20 L50 46', dunkel(S.c, 0.2), 1));
  t.push(`<path d="M64 52 l10 -2 M64 52 l9 4" stroke="#f2b8cc" stroke-width="1.6" stroke-linecap="round"/>`);
});

// ─────────────────────────────── Spielzeug
// Spielball: Ø 0,7, Segmente in vier Farben, Glanzpunkt.
neu('k_ball', 'spielzeug', 'gummi', 'rot', (S, t) => {
  t.push(boden(50, 86, 26, 2.6));
  const r = 32;
  ['#c8372f', '#f1cf4a', '#4f7fae', '#5f9a4a'].forEach((c, i) => t.push(`<path d="M50 52 L${f(50 + r * Math.cos(i * 1.5708 - 0.6))} ${f(52 + r * Math.sin(i * 1.5708 - 0.6))} A${r} ${r} 0 0 1 ${f(50 + r * Math.cos((i + 1) * 1.5708 - 0.6))} ${f(52 + r * Math.sin((i + 1) * 1.5708 - 0.6))} Z" fill="${c}"/>`));
  t.push(`<path d="${kreis(50, 52, r)}" fill="${rund(S)}"/><path d="${kreis(50, 52, r)}" fill="none" stroke="#5a2a20" stroke-width="0.5" opacity="0.5"/>`, `<ellipse cx="38" cy="36" rx="7" ry="4" fill="#fff" opacity="0.45" transform="rotate(-30 38 36)"/>`);
});
// Spielzeugauto: Holzauto mit großen Rädern, Fahrer-Figur.
neu('k_spielzeugauto', 'spielzeug', 'holz', 'rot', (S, t) => {
  t.push(boden(50, 80, 40, 2.6));
  t.push(form(S, rr(10, 46, 80, 22, 6), S.c), form(S, rr(26, 28, 38, 22, 5), hell(S.c, 0.1)));
  t.push(`<rect x="31" y="32" width="12" height="11" rx="2" fill="#cfe2ee"/><rect x="47" y="32" width="12" height="11" rx="2" fill="#cfe2ee"/>`);
  for (const x of [28, 72]) t.push(`<circle cx="${x}" cy="70" r="10" fill="#2a2c30"/><circle cx="${x}" cy="70" r="4.4" fill="${HOLZ}"/>`);
  t.push(`<rect x="84" y="52" width="6" height="5" rx="1" fill="#f1cf4a"/>`);
});
// Kreisel: Holzkreisel mit Spitze, Griffstiel, Farbringe.
neu('k_kreisel', 'spielzeug', 'holz', '#4f7fae', (S, t) => {
  t.push(boden(52, 88, 16, 2));
  t.push(form(S, 'M47 10 L53 10 L53 30 L47 30 Z', HOLZ, { licht: 'rund' }));
  t.push(form(S, 'M20 40 Q50 22 80 40 Q70 70 51 88 Q30 70 20 40 Z', HOLZ, { licht: 'rund' }));
  ['#c8574a', '#e3b04b', '#4f6f9a'].forEach((c, i) => t.push(`<path d="M${f(22 + i * 4)} ${f(44 + i * 9)} Q50 ${f(36 + i * 9)} ${f(78 - i * 4)} ${f(44 + i * 9)}" stroke="${c}" stroke-width="3.2" fill="none"/>`));
});
// Bilderbuch: Pappbilderbuch aufgeschlagen, dicke Seiten, Bilder links und rechts.
neu('k_bilderbuch', 'spielzeug', 'pappe', 'gelb', (S, t) => {
  t.push(boden(50, 84, 42, 3));
  t.push(form(S, 'M8 34 L50 40 L92 34 L92 76 L50 82 L8 76 Z', S.c));
  for (const s of [1, -1]) t.push(`<path d="${s < 0 ? 'M12 32 L50 38 L50 78 L12 72 Z' : 'M88 32 L50 38 L50 78 L88 72 Z'}" fill="#fbf7ee" stroke="#c9bfae" stroke-width="0.5"/>`);
  t.push(motiv('hase', 30, 54, 16), motiv('sonne', 72, 46, 12), `<path d="M58 66 Q70 58 84 66" stroke="#5f9a4a" stroke-width="3" fill="none"/>`, linie('M50 38 L50 78', '#c9bfae', 0.8));
});
// Buntstifte: 8 Stifte im Fächer, Spitzen gespitzt, Holz sichtbar.
neu('k_buntstifte', 'spielzeug', 'holz', 'rot', (S, t) => {
  t.push(boden(50, 88, 36, 2.4));
  ['#c8372f', '#e8833a', '#f1cf4a', '#5f9a4a', '#2f6f6a', '#4f6f9a', '#7a4f9a', '#6a4630'].forEach((c, i) => {
    const a = -32 + i * 9;
    t.push(`<g transform="rotate(${a} 50 86)"><rect x="47" y="24" width="6" height="58" fill="${c}"/><rect x="47" y="24" width="2" height="58" fill="#fff" opacity="0.25"/><path d="M47 24 L50 12 L53 24 Z" fill="${HOLZ}"/><path d="M49 16 L50 12 L51 16 Z" fill="${c}"/></g>`);
  });
});
// Stapelturm: Ringe in abnehmender Größe auf Holzstab, Kugelkopf.
neu('k_stapelturm', 'spielzeug', 'holz', 'rot', (S, t) => {
  t.push(boden(50, 88, 26, 2.4));
  t.push(form(S, rr(22, 82, 56, 6, 2), HOLZ), form(S, 'M47 18 L53 18 L53 82 L47 82 Z', HOLZ));
  BUNT.slice(0, 5).forEach((c, i) => { const w = 26 - i * 4, y = 74 - i * 11; t.push(form(S, `M${50 - w} ${y + 4} Q50 ${y - 6} ${50 + w} ${y + 4} Q${50 + w} ${y + 10} 50 ${y + 10} Q${50 - w} ${y + 10} ${50 - w} ${y + 4} Z`, c, { licht: 'rund' })); });
  t.push(form(S, kreis(50, 16, 7), '#f1cf4a', { licht: 'rund' }));
});
// Schaukelpferd: Holzpferd auf Kufen, Mähne aus Wolle, Griff.
neu('k_schaukelpferd', 'spielzeug', 'holz', 'rot', (S, t) => {
  t.push(boden(50, 88, 40, 2.4));
  t.push(`<path d="M8 76 Q50 96 92 76" stroke="${dunkel(HOLZ, 0.2)}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  t.push(form(S, 'M22 80 L28 58 M76 80 L70 58', HOLZ), linie('M24 82 L30 56 M76 82 L70 56', dunkel(HOLZ, 0.15), 4));
  t.push(form(S, 'M24 58 Q22 44 34 42 L62 42 Q66 30 64 18 Q70 10 80 14 Q86 22 84 30 L76 34 Q74 46 74 58 Z', HOLZ));
  t.push(`<path d="M62 18 Q56 26 60 40 Q66 32 70 16 Z" fill="${S.c}"/><circle cx="76" cy="20" r="1.6" fill="#2a2c30"/><path d="M30 42 L60 42 L58 50 L32 50 Z" fill="${S.c}"/>`, linie('M64 30 L72 30', '#2a2c30', 1.4));
});
// Sandspielzeug: Eimer mit Henkel, Schaufel, Sandform (Seestern).
neu('k_sandspielzeug', 'spielzeug', 'kunststoff', '#4f7fae', (S, t) => {
  t.push(boden(50, 88, 40, 2.6));
  t.push(form(S, 'M20 40 L58 40 L54 84 L24 84 Z', S.c, { licht: 'rund' }), `<ellipse cx="39" cy="40" rx="19" ry="4" fill="${dunkel(S.c, 0.3)}"/>`, `<path d="M20 42 Q39 12 58 42" stroke="#f1cf4a" stroke-width="2.2" fill="none"/>`);
  t.push(`<g transform="rotate(-30 76 60)"><rect x="73" y="34" width="5" height="26" rx="2" fill="#f1cf4a"/><path d="M68 60 L84 60 L82 82 Q76 86 70 82 Z" fill="#f1cf4a" stroke="#b8902a" stroke-width="0.5"/></g>`);
  t.push(motiv('stern', 34, 64, 12));
});
// Springseil: zwei Holzgriffe, Seil als Bogen.
neu('k_springseil', 'spielzeug', 'baumwolle', 'rot', (S, t) => {
  t.push(boden(50, 88, 38, 2));
  t.push(`<path d="M22 30 C10 70 40 90 50 84 C62 78 90 70 78 30" stroke="${S.c}" stroke-width="2.4" fill="none"/><path d="M22 30 C10 70 40 90 50 84 C62 78 90 70 78 30" stroke="#fff" stroke-width="0.8" stroke-dasharray="1.6 1.6" fill="none" opacity="0.6"/>`);
  for (const x of [22, 78]) t.push(form(S, rr(x - 4, 10, 8, 22, 4), HOLZ, { licht: 'rund' }), `<rect x="${x - 4}" y="12" width="8" height="2.4" fill="${S.c}"/>`);
});
// Xylophon: acht Klangplatten in Regenbogenfarben auf Holzrahmen, zwei Schlegel.
neu('k_xylophon', 'spielzeug', 'holz', 'rot', (S, t) => {
  t.push(boden(50, 84, 42, 2.6));
  t.push(form(S, 'M10 44 L90 34 L90 40 L10 70 Z', HOLZ), form(S, 'M10 70 L90 40 L90 46 L10 76 Z', dunkel(HOLZ, 0.15)));
  ['#c8372f', '#e8833a', '#f1cf4a', '#5f9a4a', '#2f8f8a', '#4f6f9a', '#7a4f9a', '#c46aa0'].forEach((c, i) => { const x = 14 + i * 9.5, y0 = 40 - i * 1.2, l = 32 - i * 2.4; t.push(form(S, rr(x, y0, 7.6, l, 1.4), c), `<circle cx="${f(x + 3.8)}" cy="${f(y0 + 3)}" r="0.9" fill="#c9ced3"/><circle cx="${f(x + 3.8)}" cy="${f(y0 + l - 3)}" r="0.9" fill="#c9ced3"/>`); });
  t.push(linie('M60 88 L84 66', HOLZ, 1.8), `<circle cx="85" cy="65" r="3" fill="#c8372f"/>`);
});
// Handpuppe: Stoffhandpuppe (Fuchs), Körper als Handschuh, Arme.
neu('k_handpuppe', 'spielzeug', 'pluesch', 'orange', (S, t) => {
  t.push(boden(50, 90, 22, 2));
  t.push(flaeche(S, glatt([[34, 88, E], [32, 56], [22, 50, E], [26, 44, E], [38, 46], [62, 46], [74, 44, E], [78, 50, E], [68, 56], [66, 88, E]], true, 0.3), { ton: -0.05 }));
  t.push(`<path d="M34 86 Q50 90 66 86 L66 82 Q50 86 34 82 Z" fill="#fbf7ee"/>`, motiv('fuchs', 50, 30, 40));
});
// Drachen: Rautendrachen mit Schwanz und Schleifen, Querstab.
neu('k_drachen', 'spielzeug', 'nylon', 'rot', (S, t) => {
  t.push(form(S, 'M50 6 L78 34 L50 72 L22 34 Z', S.c));
  t.push(`<path d="M50 6 L50 72 M22 34 L78 34" stroke="${HOLZ}" stroke-width="1.2"/><path d="M50 6 L78 34 L50 34 Z" fill="#f1cf4a"/><path d="M22 34 L50 72 L50 34 Z" fill="#4f7fae"/>`);
  t.push(`<path d="M50 72 Q40 80 50 86 Q60 92 48 98" stroke="#2a2c30" stroke-width="0.7" fill="none"/>`);
  for (const [x, y, c] of [[46, 80, '#f1cf4a'], [52, 88, '#5f9a4a'], [48, 95, '#c8372f']]) t.push(`<path d="M${x} ${y} l-4 -3 l0 6 Z M${x} ${y} l4 -3 l0 6 Z" fill="${c}"/>`);
});
// Badeente: klassische Gummiente, Schnabel orange.
neu('k_badeente', 'spielzeug', 'gummi', 'gelb', (S, t) => {
  t.push(boden(50, 86, 32, 2.6));
  t.push(form(S, 'M16 60 Q14 84 46 84 Q82 84 84 62 Q84 50 72 52 Q66 56 58 54 Q66 44 62 32 Q56 18 42 22 Q30 26 32 42 Q34 50 40 54 Q22 52 16 60 Z', S.c, { licht: 'rund', glanz: true }));
  t.push(`<path d="M30 36 Q20 36 18 42 Q24 46 32 42 Z" fill="#e8833a"/><circle cx="42" cy="32" r="2.4" fill="#2a2c30"/><circle cx="41" cy="31" r="0.8" fill="#fff"/><path d="M56 66 Q66 60 74 66" stroke="${dunkel(S.c, 0.25)}" stroke-width="1.2" fill="none"/>`);
});
// Kuschelhase: Plüschhase mit langen Schlappohren, sitzend.
neu('k_kuschelhase', 'spielzeug', 'pluesch', 'beige', (S, t) => {
  t.push(boden(50, 90, 26, 2.4));
  t.push(form(S, 'M38 30 Q30 4 36 2 Q44 4 46 28 Z M62 30 Q70 4 64 2 Q56 4 54 28 Z', S.c, { licht: 'rund' }), `<path d="M39 26 Q35 8 37 6 Q41 8 43 26 Z M61 26 Q65 8 63 6 Q59 8 57 26 Z" fill="#f2b8cc"/>`);
  t.push(form(S, 'M30 88 Q24 66 38 58 Q50 54 62 58 Q76 66 70 88 Z', S.c, { licht: 'rund' }), form(S, kreis(50, 42, 15), S.c, { licht: 'rund' }));
  t.push(`<circle cx="44" cy="40" r="1.8" fill="#2a2c30"/><circle cx="56" cy="40" r="1.8" fill="#2a2c30"/><path d="M48 46 h4 l-2 2 Z" fill="#e8a0a8"/><path d="M50 48 q-2 3 -5 2 M50 48 q2 3 5 2" stroke="#8a7a6a" stroke-width="0.6" fill="none"/><ellipse cx="50" cy="76" rx="8" ry="9" fill="${hell(S.c, 0.35)}"/><circle cx="72" cy="84" r="5" fill="#fbf7ee"/>`);
});
// Knete: drei Becher mit Deckel, offene Knete in Wurstform davor.
neu('k_malkasten', 'spielzeug', 'metall', 'schwarz', (S, t) => {
  t.push(boden(50, 82, 42, 2.6));
  // Wasserfarbkasten: Blechkasten mit 12 Farbnäpfen in zwei Reihen, Deckel hinten aufgeklappt, Pinsel davor
  t.push(form(S, 'M12 18 L88 18 L86 42 L14 42 Z', dunkel(S.c, 0.1)), `<rect x="18" y="22" width="64" height="16" rx="2" fill="#fbf7ee" opacity="0.92"/>`);
  t.push(form(S, rr(10, 44, 80, 34, 3), S.c));
  ['#f1cf4a', '#e8833a', '#c8372f', '#e86aa0', '#7a4f9a', '#4f6f9a', '#2f8fbf', '#5f9a4a', '#2c5a40', '#8a5a2e', '#6a4630', '#1d1b1c'].forEach((c, i) => t.push(`<rect x="${15 + (i % 6) * 12}" y="${48 + Math.floor(i / 6) * 14}" width="9" height="10" rx="1.6" fill="${c}"/><rect x="${16 + (i % 6) * 12}" y="${49 + Math.floor(i / 6) * 14}" width="3" height="3" rx="1" fill="#fff" opacity="0.4"/>`));
  t.push(`<g transform="rotate(-12 50 86)"><rect x="12" y="84" width="60" height="3" rx="1.5" fill="${HOLZ}"/><rect x="70" y="83.6" width="6" height="3.8" fill="#c9ced3"/><path d="M76 83.6 Q84 85.5 76 87.4 Z" fill="#2a2c30"/></g>`);
});
// Legespiel (Memo): Schachtel, Karten mit Motiven aufgedeckt, eine verdeckt.
neu('k_legespiel', 'spielzeug', 'pappe', '#4f7fae', (S, t) => {
  t.push(boden(50, 86, 42, 2.6));
  for (let i = 0; i < 6; i++) { const x = 12 + (i % 3) * 27, y = 18 + Math.floor(i / 3) * 34; t.push(`<rect x="${x}" y="${y}" width="22" height="28" rx="2" fill="${i === 4 ? S.c : '#fbf7ee'}" stroke="#a89c8a" stroke-width="0.6"/>`); if (i !== 4) t.push(motiv(['herz', 'stern', 'sonne', 'herz', '', 'stern'][i], x + 11, y + 14, 14)); else t.push(`<path d="M${x + 4} ${y + 4} L${x + 18} ${y + 24} M${x + 18} ${y + 4} L${x + 4} ${y + 24}" stroke="#fff" stroke-width="0.6" opacity="0.6"/>`); }
});

// ─────────────────────────────── Schule und Zubehör
// Schulranzen: formstabil, Breite : Höhe 0,8, Klappe über 3/4, Schnappverschluss, Reflektoren, Motiv.
neu('k_schulranzen', 'tasche', 'polyester', '#3f6fae', (S, t) => {
  t.push(boden(50, 90, 32, 2.6));
  t.push(form(S, rr(22, 22, 56, 66, 10), dunkel(S.c, 0.12)), form(S, 'M24 30 Q24 20 34 20 L66 20 Q76 20 76 30 L76 72 Q76 78 70 78 L30 78 Q24 78 24 72 Z', S.c));
  t.push(`<rect x="44" y="70" width="12" height="8" rx="2" fill="#2a2c30"/><rect x="47" y="73" width="6" height="3" rx="1" fill="#c9ced3"/>`);
  t.push(`<rect x="28" y="62" width="8" height="5" rx="1" fill="#f1cf4a"/><rect x="64" y="62" width="8" height="5" rx="1" fill="#f1cf4a"/>`, motiv('rakete', 50, 42, 24));
  t.push(`<path d="M38 20 Q50 8 62 20" stroke="${dunkel(S.c, 0.35)}" stroke-width="3" fill="none"/>`);
});
// Turnbeutel: Kordelzug, Ösen unten, Rechteck 1 : 1,2, Motivdruck.
neu('k_turnbeutel', 'tasche', 'baumwolle', 'rot', (S, t) => {
  t.push(boden(50, 90, 30, 2));
  t.push(flaeche(S, 'M24 24 Q50 30 76 24 L78 86 L22 86 Z'));
  t.push(linie('M24 24 Q50 30 76 24', dunkel(S.c, 0.3), 1.4), `<path d="M30 25 Q40 6 50 18 Q60 6 70 25" stroke="#e9e4dc" stroke-width="1.2" fill="none"/><path d="M24 26 L22 84 M76 26 L78 84" stroke="#e9e4dc" stroke-width="1.2"/>`);
  t.push(`<circle cx="23" cy="84" r="2" fill="#c9ced3" stroke="#77736b" stroke-width="0.4"/><circle cx="77" cy="84" r="2" fill="#c9ced3" stroke="#77736b" stroke-width="0.4"/>`, motiv('ball', 50, 56, 22));
});
// Federmäppchen: Klappmäppchen mit Gummischlaufen, Stifte, aufgeklappt.
neu('k_federmaeppchen', 'tasche', 'polyester', 'hellgrün', (S, t) => {
  t.push(boden(50, 84, 42, 2.6));
  t.push(form(S, rr(8, 30, 84, 22, 4), S.c), form(S, rr(8, 54, 84, 26, 4), dunkel(S.c, 0.08)));
  ['#c8372f', '#e8833a', '#f1cf4a', '#5f9a4a', '#4f6f9a', '#7a4f9a', '#6a4630', '#2a2c30'].forEach((c, i) => t.push(`<rect x="${16 + i * 9}" y="56" width="5" height="20" fill="${c}"/><path d="M${16 + i * 9} 56 L${18.5 + i * 9} 50 L${21 + i * 9} 56 Z" fill="${HOLZ}"/>`));
  t.push(linie('M12 64 H88', '#2a2c30', 1.6, 0.6), linie('M10 52 H90', dunkel(S.c, 0.35), 1));
  t.push(motiv('dino', 36, 41, 14), `<rect x="62" y="36" width="20" height="10" rx="2" fill="#fbf7ee"/>`);
});
// Brotdose: Edelstahl/Kunststoff mit Clips, Fächer innen sichtbar (Deckel offen dahinter).
neu('k_brotdose', 'home', 'kunststoff', 'hellgrün', (S, t) => {
  t.push(boden(50, 86, 40, 2.6));
  t.push(form(S, 'M16 22 L84 22 L80 44 L20 44 Z', hell(S.c, 0.15)));
  t.push(form(S, rr(12, 46, 76, 34, 6), S.c), `<rect x="16" y="50" width="68" height="26" rx="4" fill="${dunkel(S.c, 0.2)}"/>`);
  t.push(`<rect x="18" y="52" width="32" height="22" rx="3" fill="#e3c27a"/><path d="M20 58 h28 M20 64 h28" stroke="#c49a5a" stroke-width="0.8"/><circle cx="62" cy="62" r="7" fill="#c8372f"/><path d="M62 55 l1 -3" stroke="#5a4030" stroke-width="0.8"/><rect x="72" y="54" width="10" height="18" rx="2" fill="#e8833a"/>`);
  t.push(`<rect x="10" y="56" width="4" height="10" rx="1" fill="${dunkel(S.c, 0.35)}"/><rect x="86" y="56" width="4" height="10" rx="1" fill="${dunkel(S.c, 0.35)}"/>`, motiv('dino', 50, 33, 14));
});
// Trinkflasche: 0,4 l, Edelstahl, Sportverschluss mit Klappdeckel, Motiv.
neu('k_trinkflasche', 'home', 'edelstahl', 'koralle', (S, t) => {
  t.push(boden(50, 90, 16, 2));
  t.push(zylinder(S, 50, 28, 88, 14, 3.4, S.c, { glanz: true }), form(S, rr(38, 14, 24, 16, 4), '#2a2c30'), `<rect x="45" y="6" width="10" height="10" rx="3" fill="#f1cf4a"/><path d="M62 18 q8 0 8 8 l0 4" stroke="#2a2c30" stroke-width="2" fill="none"/>`);
  t.push(motiv('einhorn', 50, 58, 20));
});
// Bommelmütze: Strickmütze mit großem Bommel, Umschlag gerippt, Webetikett.
neu('k_bommelmuetze', 'accessoire', 'strick', 'rot', (S, t) => {
  t.push(boden(50, 88, 30, 2));
  t.push(flaeche(S, glatt([[22, 84, E], [20, 50], [32, 30], [50, 26], [68, 30], [80, 50], [78, 84, E]], true, 0.35)));
  t.push(flaeche(S, rr(19, 66, 62, 20, 3), { ton: -0.08 }));
  for (let x = 22; x < 80; x += 3) t.push(linie(`M${x} 68 l0 16`, S.cD, 0.4, 0.5));
  t.push(`<circle cx="50" cy="20" r="14" fill="#f4f3ef"/>`); for (let i = 0; i < 24; i++) { const a = i * 0.26; t.push(linie(`M50 20 l${f(13 * Math.cos(a))} ${f(13 * Math.sin(a))}`, '#c9c2b6', 0.5, 0.6)); }
  t.push(`<rect x="60" y="70" width="10" height="6" fill="#fbf7ee"/>`, motiv('stern', 65, 73, 4));
});
// Fäustlinge: Paar mit Verbindungsschnur, Daumen, Bündchen.
neu('k_faeustlinge', 'accessoire', 'strick', 'hellblau', (S, t) => {
  t.push(boden(50, 88, 38, 2));
  for (const [x, s] of [[30, -1], [70, 1]]) {
    const X = (v) => x + s * v;
    t.push(flaeche(S, glatt([[X(-10), 84, E], [X(-11), 46], [X(-6), 30], [X(4), 30], [X(9), 40], [X(16), 44], [X(14), 52], [X(10), 54], [X(10), 84, E]], true, 0.35)));
    t.push(flaeche(S, rr(x - 11, 72, 22, 14, 2), { ton: -0.1 }), motiv('herz', x, 54, 9));
  }
  t.push(`<path d="M30 86 Q50 96 70 86" stroke="${dunkel(S.c, 0.3)}" stroke-width="1" fill="none"/>`);
});
// Haarspangen-Set: Klickspangen auf Karte, Schleife, Stern, Herz.
neu('k_haarspangen', 'accessoire', 'kunststoff', 'rosa', (S, t) => {
  t.push(boden(50, 88, 32, 2), `<rect x="20" y="10" width="60" height="78" rx="3" fill="#fbf7ee" stroke="#c9bfae" stroke-width="0.6"/><circle cx="50" cy="16" r="2.4" fill="#fff" stroke="#c9bfae" stroke-width="0.6"/>`);
  for (const [y, m] of [[30, 'herz'], [50, 'stern'], [70, 'blume']]) t.push(`<path d="M30 ${y} Q50 ${y - 4} 70 ${y} Q50 ${y + 3} 30 ${y} Z" fill="#c9ced3" stroke="#77736b" stroke-width="0.4"/>`, motiv(m, 40, y, 12));
});
// Kinder-Armbanduhr: Zifferblatt Ø 0,3 mit großen Zahlen, Silikonarmband geschlossen.
neu('k_kinderuhr', 'accessoire', 'silikon', 'hellblau', (S, t) => {
  t.push(boden(50, 92, 22, 2));
  // Kinderarmbanduhr gestreckt: Armband oben mit Löchern, unten mit Schnalle, Zifferblatt Ø 26 mit großen Ziffern
  t.push(form(S, rr(40, 4, 20, 34, 6), S.c));
  for (const y of [10, 16, 22, 28]) t.push(`<circle cx="50" cy="${y}" r="1.4" fill="${dunkel(S.c, 0.4)}"/>`);
  t.push(form(S, rr(40, 62, 20, 30, 6), S.c), `<rect x="41" y="82" width="18" height="8" rx="2" fill="none" stroke="#c9ced3" stroke-width="2"/>`);
  t.push(form(S, kreis(50, 50, 18), '#f1cf4a', { licht: 'rund' }), `<circle cx="50" cy="50" r="14" fill="#fbf7ee"/>`);
  for (let i = 0; i < 12; i++) t.push(`<circle cx="${f(50 + 11 * Math.sin(i * 0.5236))}" cy="${f(50 - 11 * Math.cos(i * 0.5236))}" r="${i % 3 ? 0.8 : 1.4}" fill="${i % 3 ? '#2a2c30' : '#c8372f'}"/>`);
  t.push(linie('M50 50 L50 42 M50 50 L56 53', '#2a2c30', 1.4), `<rect x="67" y="47" width="4" height="6" rx="1" fill="#c9ced3"/>`);
});
// Kinderschirm: Glockenschirm transparent mit Ohren-Motiv, gebogener Griff.
neu('k_kinderschirm', 'accessoire', 'polyester', 'gelb', (S, t) => {
  t.push(boden(52, 90, 20, 2));
  t.push(form(S, 'M14 52 Q14 14 50 12 Q86 14 86 52 Q80 46 74 52 Q68 46 62 52 Q56 46 50 52 Q44 46 38 52 Q32 46 26 52 Q20 46 14 52 Z', S.c));
  for (const x of [34, 66]) t.push(`<circle cx="${x}" cy="12" r="6" fill="${S.c}" stroke="${S.cK}" stroke-width="0.5"/>`);
  t.push(`<circle cx="42" cy="32" r="2" fill="#2a2c30"/><circle cx="58" cy="32" r="2" fill="#2a2c30"/><ellipse cx="50" cy="40" rx="4" ry="2.4" fill="#e8833a"/>`, linie('M50 52 L50 82 Q50 90 42 88', '#2a2c30', 2.4));
});
// Kinder-Geldbörse: Klett-Börse mit Motiv und Schlüsselkette.
neu('k_kindergeldboerse', 'tasche', 'polyester', 'lila', (S, t) => {
  t.push(boden(50, 82, 34, 2.4));
  t.push(form(S, rr(16, 36, 68, 44, 5), S.c), form(S, 'M16 40 Q16 30 26 30 L74 30 Q84 30 84 40 L84 58 L16 58 Z', dunkel(S.c, 0.1)));
  t.push(`<rect x="42" y="52" width="16" height="6" rx="1" fill="#2a2c30" opacity="0.5"/>`, motiv('einhorn', 50, 44, 16), linie('M84 36 Q94 30 90 20', '#c9ced3', 1.2), `<circle cx="90" cy="18" r="3.4" fill="none" stroke="#c9ced3" stroke-width="1.2"/>`);
});
// Kindercap: Basecap mit Motiv vorn, Schirm gebogen, Knopf oben.
neu('k_kindercap', 'accessoire', 'baumwolle', 'rot', (S, t) => {
  t.push(boden(50, 82, 34, 2.4));
  t.push(flaeche(S, 'M22 62 Q20 26 50 22 Q80 26 78 62 Z'), flaeche(S, 'M22 60 Q50 66 78 60 Q86 70 92 76 Q60 84 30 72 Z', { ton: -0.12 }));
  t.push(linie('M50 22 Q46 40 50 62 M34 26 Q32 44 34 62 M66 26 Q68 44 66 62', S.cD, 0.5, 0.5), `<circle cx="50" cy="22" r="2.2" fill="${dunkel(S.c, 0.2)}"/>`, motiv('dino', 50, 46, 16));
});
// Loopschal Kinder: Rundschal mit Fleece innen, gedreht.
neu('k_schal', 'accessoire', 'strick', 'senf', (S, t) => {
  t.push(boden(50, 92, 30, 2.2));
  S.tex = dessin(S, 'bretagne');
  // Kinder-Strickschal 120 × 16 cm, über einen Haken gelegt: zwei Enden hängen ungleich lang, Fransen unten
  t.push(flaeche(S, 'M34 14 Q50 6 66 14 L64 78 L52 78 L54 22 Q50 18 46 22 L46 64 L34 64 Z'));
  t.push(`<path d="M46 22 Q50 18 54 22 L52 30 Q50 28 48 30 Z" fill="#000" opacity="0.15"/>`);
  for (let x = 35; x < 46; x += 2) t.push(linie(`M${x} 64 l0 8`, dunkel(S.c, 0.15), 1));
  for (let x = 53; x < 64; x += 2) t.push(linie(`M${x} 78 l0 8`, dunkel(S.c, 0.15), 1));
  t.push(motiv('stern', 58, 66, 7));
});

// ─────────────────────────────── Kinderzimmer
// Kinderteppich: rund Ø 100 cm, Regenbogenmotiv, Fransen frei.
neu('k_spielteppich', 'home', 'baumwolle', 'hellgrün', (S, t) => {
  // Spielteppich mit Straßen: rechteckig, schräg von oben, Straßen grau mit Mittelstreifen, Häuser, Bäume, ein Auto
  t.push(`<path d="M4 50 L60 22 L96 46 L40 78 Z" fill="#000" opacity="0.06" transform="translate(0 4)"/>`);
  t.push(form(S, 'M4 50 L60 22 L96 46 L40 78 Z', S.c));
  t.push(`<path d="M18 43 L74 70 M32 36 L88 62 M48 28 L22 60 M76 40 L50 72" stroke="#7a7f86" stroke-width="5" fill="none"/>`, `<path d="M18 43 L74 70 M48 28 L22 60" stroke="#fff" stroke-width="0.6" stroke-dasharray="2 2" fill="none"/>`);
  t.push(`<rect x="56" y="36" width="7" height="6" fill="#c8372f"/><path d="M55 36 l4.5 -4 l4.5 4 Z" fill="#6a4630"/><circle cx="34" cy="50" r="3" fill="#2c5a40"/><circle cx="70" cy="56" r="3" fill="#2c5a40"/><rect x="38" y="57" width="6" height="3" rx="1" fill="#4f7fae"/>`);
});
// Nachtlicht: Mondlampe auf Sockel, warm leuchtend, Kabel.
neu('k_nachtlicht', 'home', 'kunststoff', 'gelb', (S, t) => {
  t.push(boden(50, 88, 22, 2), `<circle cx="50" cy="44" r="34" fill="#f8e7a0" opacity="0.25"/>`);
  t.push(form(S, 'M58 14 C34 16 24 46 36 64 C46 78 70 76 78 64 C62 66 48 52 50 34 C51 26 54 18 58 14 Z', '#f6e3a0', { licht: 'rund' }));
  t.push(form(S, rr(36, 76, 28, 10, 3), HOLZ), linie('M64 82 Q80 84 86 92', '#f4f3ef', 1.2), motiv('stern', 72, 30, 9));
});
// Wimpelkette: 8 Wimpel an Schnur im Bogen, Muster wechselnd.
neu('k_wimpelkette', 'home', 'baumwolle', 'rosa', (S, t) => {
  t.push(`<path d="M4 20 Q50 46 96 20" stroke="#8a7a6a" stroke-width="0.8" fill="none"/>`);
  const muster = ['punkte', 'sterne', 'herzen', 'bretagne'];
  for (let i = 0; i < 8; i++) {
    const u = (i + 0.5) / 8, x = 4 + 92 * u, y = 20 + 26 * 4 * u * (1 - u) * 0.98;
    const S2 = stoff2(S, ['rosa', 'mint', 'gelb', 'hellblau'][i % 4], 'baumwolle', i % 4 === 0 ? 'punkte' : undefined);
    if (i % 4 !== 0) S2.tex = dessin(S2, muster[i % 4]);
    t.push(flaeche(S2, `M${f(x - 5.4)} ${f(y - 1)} L${f(x + 5.4)} ${f(y + 1)} L${f(x)} ${f(y + 20)} Z`));
  }
});
// Kindergeschirr: Teller mit drei Fächern, Becher mit Henkeln, Löffel.
neu('k_kindergeschirr', 'home', 'kunststoff', 'mint', (S, t) => {
  t.push(boden(46, 86, 40, 3));
  t.push(`<ellipse cx="42" cy="66" rx="34" ry="16" fill="${S.c}" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.6"/><ellipse cx="42" cy="64" rx="30" ry="13" fill="${hell(S.c, 0.3)}"/>`);
  t.push(linie('M42 52 L42 66 M42 66 L18 70 M42 66 L66 70', S.c, 2.4), motiv('wal', 30, 60, 10));
  t.push(zylinder(S, 78, 32, 56, 10, 3, '#f1cf4a'), `<path d="M88 38 q6 0 6 6 q0 6 -6 6" stroke="#f1cf4a" stroke-width="2.4" fill="none"/>`, motiv('stern', 78, 44, 8));
});
// Spielzeugkorb: Filzkorb mit Ohren und Gesicht, Griffloch.
neu('k_spielkorb', 'home', 'filz', 'grau', (S, t) => {
  t.push(boden(50, 88, 34, 2.6));
  t.push(form(S, 'M18 34 L82 34 L78 86 L22 86 Z', S.c, { licht: 'rund' }), `<ellipse cx="50" cy="34" rx="32" ry="5" fill="${dunkel(S.c, 0.4)}"/>`);
  for (const x of [28, 72]) t.push(form(S, `M${x - 8} 34 L${x} 18 L${x + 8} 34 Z`, S.c), `<path d="M${x - 4} 32 L${x} 24 L${x + 4} 32 Z" fill="#f2b8cc"/>`);
  t.push(`<path d="M38 56 q3 -3 6 0 M56 56 q3 -3 6 0" stroke="#2a2c30" stroke-width="1.2" fill="none"/><circle cx="50" cy="62" r="1.8" fill="#e8a0a8"/><rect x="42" y="72" width="16" height="5" rx="2.5" fill="${dunkel(S.c, 0.4)}"/>`);
});
// Wolkenkissen: Kissen in Wolkenform, Gesicht, Paspel.
neu('k_wolkenkissen', 'home', 'baumwolle', 'hellblau', (S, t) => {
  t.push(boden(50, 82, 40, 3));
  t.push(flaeche(S, 'M14 72 Q4 60 16 50 Q14 32 32 32 Q38 16 56 20 Q70 18 74 34 Q92 34 90 52 Q98 64 86 74 Z'));
  t.push(`<path d="M38 52 q3 3 6 0 M56 52 q3 3 6 0" stroke="#2a2c30" stroke-width="1.2" fill="none"/><circle cx="36" cy="58" r="3" fill="#f2b8cc" opacity="0.7"/><circle cx="64" cy="58" r="3" fill="#f2b8cc" opacity="0.7"/>`);
});
// Spardose: Sparschwein aus Keramik, Münzschlitz, Ringelschwanz.
neu('k_spardose', 'home', 'keramik', 'rosa', (S, t) => {
  t.push(boden(50, 86, 34, 2.6));
  t.push(form(S, 'M16 54 Q16 30 46 28 Q76 28 80 48 L88 50 L88 62 L80 64 Q76 78 60 80 L58 86 L50 86 L50 82 L38 82 L38 86 L30 86 L28 78 Q16 70 16 54 Z', S.c, { licht: 'rund', glanz: true }));
  t.push(`<rect x="40" y="27" width="14" height="3" rx="1.4" fill="${dunkel(S.c, 0.5)}"/><circle cx="72" cy="44" r="2" fill="#2a2c30"/><circle cx="86" cy="56" r="1" fill="${dunkel(S.c, 0.4)}"/><path d="M60 30 L66 22 L70 32 Z" fill="${dunkel(S.c, 0.08)}"/><path d="M16 50 q-6 -2 -4 -8 q4 2 0 6" stroke="${dunkel(S.c, 0.2)}" stroke-width="1.2" fill="none"/>`);
});
// Kinderbettwäsche: Bezug mit Sternen und Mond, Kissen davor.
neu('k_bettwaesche', 'home', 'baumwolle', 'hellblau', (S, t) => {
  t.push(boden(50, 88, 42, 3));
  // Kinderbettwäsche 100 × 135: Bettdecke mit Stern-Druck, Ecke umgeschlagen, Kissen 40 × 60 oben mit Bär, Knopfleiste
  S.tex = dessin(S, 'sterne');
  t.push(flaeche(S, 'M8 40 L92 40 L92 86 L8 86 Z'), flaeche(S, 'M62 86 L92 60 L92 86 Z', { ton: 0.25 }));
  const S2 = stoff2(S, 'weiß'); S2.tex = dessin(S2, 'sterne');
  t.push(flaeche(S2, rr(24, 14, 52, 30, 5)), motiv('hase', 50, 29, 16));
  for (const x of [20, 36, 52]) t.push(`<circle cx="${x}" cy="84" r="1.1" fill="#fbf7ee" stroke="${S.cK}" stroke-width="0.3"/>`);
});

// ─────────────────────────────── Kinderwäsche, Socken, Bademode
// Slips im 3er-Set: gefächert, Webgummi, Motive.
neu('k_slipset', 'waesche', 'baumwolle', 'weiß', (S, t) => {
  t.push(boden(50, 86, 40, 2.4));
  [['#f2b8cc', 26, 'herz'], ['#a9c8e8', 50, 'stern'], ['#fbf7ee', 74, 'blume']].forEach(([c, x, m], i) => {
    const S2 = stoff2(S, c);
    t.push(flaeche(S2, `M${x - 16} ${40 + i * 4} L${x + 16} ${40 + i * 4} L${x + 14} ${54 + i * 4} Q${x + 4} ${58 + i * 4} ${x + 4} ${70 + i * 4} L${x - 4} ${70 + i * 4} Q${x - 4} ${58 + i * 4} ${x - 14} ${54 + i * 4} Z`), linie(`M${x - 16} ${41 + i * 4} H${x + 16}`, dunkel(c, 0.25), 1.8), motiv(m, x, 50 + i * 4, 7));
  });
});
// Kinder-Boxershorts: zwei Stück, Webbund, Motivdruck Auto/Dino.
neu('k_boxershorts', 'waesche', 'baumwolle', 'marine', (S, t) => {
  t.push(boden(50, 86, 40, 2.4));
  [['autos', 'hellblau', 32], ['dinos', 'olive', 66]].forEach(([d, c, x]) => {
    const S2 = stoff2(S, c); S2.tex = dessin(S2, d);
    t.push(flaeche(S2, `M${x - 18} 30 L${x + 18} 30 L${x + 20} 70 L${x + 2} 70 L${x} 54 L${x - 2} 70 L${x - 20} 70 Z`), flaeche(S2, rr(x - 18, 28, 36, 6, 1.4), { ton: -0.2 }));
  });
});
// Kinder-Bikini: Bustier mit Rüsche, Höschen mit Schleifchen.
neu('k_bikini', 'waesche', 'polyester', 'koralle', (S, t) => {
  t.push(boden(50, 88, 26, 2));
  S.tex = dessin(S, 'punkte');
  t.push(flaeche(S, 'M30 22 L70 22 L68 40 L32 40 Z'), linie('M34 22 L36 12 M66 22 L64 12', S.cD, 1.2), linie('M30 40 Q50 44 70 40', hell(S.c, 0.3), 2.4));
  t.push(flaeche(S, 'M28 52 L72 52 L68 64 Q56 68 54 80 L46 80 Q44 68 32 64 Z'), `<path d="M68 56 l6 -3 l0 6 Z M68 56 l-2 4" fill="${dunkel(S.c, 0.2)}"/>`);
});
// Stoppersocken: Paar mit Noppen-Sohle (ABS), Motiv am Schaft.
neu('k_stoppersocken', 'waesche', 'baumwolle', 'hellgrau', (S, t) => {
  t.push(boden(50, 88, 38, 2));
  // Stoppersocken: ein Paar, eine Socke von der Seite (Ferse, Spitze), eine mit Sohle nach oben voller roter Gumminoppen
  t.push(flaeche(S, 'M14 12 L28 12 L28 52 Q28 60 36 64 L50 70 Q58 74 54 82 Q50 86 42 84 L22 78 Q12 74 12 62 Z'), flaeche(S, rr(13, 10, 16, 8, 1.5), { ton: -0.12 }));
  for (let x = 15; x < 28; x += 2) t.push(linie(`M${x} 11 l0 6`, S.cD, 0.4, 0.5));
  t.push(flaeche(S, 'M58 10 L76 10 L78 80 Q78 92 67 92 Q56 92 56 80 Z'), flaeche(S, rr(57, 8, 20, 8, 1.5), { ton: -0.12 }));
  for (let y = 34; y < 88; y += 6) for (let x = 61 + (y % 12 ? 3 : 0); x < 76; x += 6) t.push(`<circle cx="${x}" cy="${y}" r="1.5" fill="#c8372f"/>`);
  t.push(motiv('stern', 21, 32, 8));
});
// Socken-Set bunt: drei Paar Kindersocken gefächert, Ringel, Punkte, Sterne.
neu('k_sockenset', 'waesche', 'baumwolle', 'rot', (S, t) => {
  t.push(boden(50, 88, 40, 2));
  [['ringelbunt', 'weiß', 24, -10], ['punkte', 'hellblau', 50, 0], ['herzen', 'rosa', 76, 10]].forEach(([d, c, x, r]) => {
    const S2 = stoff2(S, c, 'baumwolle', d === 'punkte' ? 'punkte' : undefined); if (d !== 'punkte') S2.tex = dessin(S2, d);
    t.push(`<g transform="rotate(${r} ${x} 50)">` + flaeche(S2, `M${x - 7} 16 L${x + 7} 16 L${x + 7} 60 Q${x + 16} 64 ${x + 16} 74 Q${x + 16} 82 ${x + 6} 82 L${x - 3} 82 Q${x - 8} 82 ${x - 8} 74 L${x - 7} 16 Z`) + flaeche(S2, rr(x - 7, 14, 14, 7, 1.4), { ton: -0.12 }) + '</g>');
  });
});
// Kinder-Schlafanzug: Oberteil langarm und Hose als Set übereinander, Motiv.
neu('k_schlafanzug', 'waesche', 'baumwolle', 'hellblau', (S, t) => {
  t.push(boden(50, 94, 32, 2));
  S.tex = dessin(S, 'sterne');
  t.push(flaeche(S, glatt([[34, 8, E], [44, 6, E], [50, 10], [56, 6, E], [66, 8, E], [84, 20, E], [86, 40, E], [78, 42, E], [72, 26], [70, 52, E], [30, 52, E], [28, 26], [22, 42, E], [14, 40, E], [16, 20, E]], true, 0.3)));
  t.push(flaeche(S, glatt([[32, 56, E], [68, 56, E], [70, 94, E], [54, 94, E], [50, 70], [46, 94, E], [30, 94, E]], true, 0.3), { ton: -0.06 }));
  t.push(flaeche(S, rr(32, 55, 36, 4, 1), { ton: -0.18 }), motiv('einhorn', 50, 30, 16));
});
// Kinder-Sandale: geschlossene Kappe, Klettriemen, Profilsohle (Trekkingsandale), Seitenansicht schräg.
neu('k_sandale', 'schuhe', 'leder', 'marine', (S, t, p) => {
  // Kinder-Sandale: Q28-Sandalenleisten, Riemen mit Klett und aufgenähter Blumen-Applikation (Kinder-Merkmal)
  SCHUH_ZEICHNER.q28sandale(S, t, p);
  t.push(motiv('blume', 47, 41, 13), motiv('herz', 66, 46, 8));
});
// Badeschuh: Gummi-Clog mit Luftlöchern und Fersenriemen.
neu('k_badeschuh', 'schuhe', 'gummi', '#5f9a4a', (S, t) => {
  t.push(boden(50, 82, 40, 2.6));
  t.push(form(S, 'M8 70 Q8 40 40 40 L70 46 Q90 50 90 66 L90 72 Q88 78 80 78 L16 80 Q8 80 8 70 Z', S.c, { glanz: true }), form(S, 'M10 74 L90 72 L90 78 Q88 82 80 82 L16 82 Q10 82 10 76 Z', dunkel(S.c, 0.25)));
  for (const [x, y] of [[20, 52], [28, 48], [36, 46], [24, 60], [32, 56], [40, 54], [48, 52], [30, 66], [40, 62]]) t.push(`<ellipse cx="${x}" cy="${y}" rx="2.2" ry="1.6" fill="${dunkel(S.c, 0.45)}"/>`);
  t.push(`<path d="M66 48 Q76 34 88 46" stroke="${dunkel(S.c, 0.15)}" stroke-width="4" fill="none"/><circle cx="66" cy="50" r="2.4" fill="${hell(S.c, 0.3)}"/>`);
});

// ─────────────────────────────── Kinderpflege
// Kindershampoo: Flasche mit Klappdeckel in Fischform-Etikett, 250 ml.
neu('k_kindershampoo', 'beauty', 'kunststoff', 'hellblau', (S, t) => {
  t.push(boden(50, 90, 18, 2));
  t.push(form(S, 'M34 30 Q34 22 42 20 L58 20 Q66 22 66 30 L68 84 Q68 88 64 88 L36 88 Q32 88 32 84 Z', S.c, { licht: 'rund', glanz: true }), form(S, rr(40, 8, 20, 13, 3), '#f1cf4a'));
  t.push(`<rect x="36" y="44" width="28" height="30" rx="3" fill="#fbf7ee"/>`, motiv('wal', 50, 56, 18), `<path d="M42 68 h16" stroke="#4f7fae" stroke-width="1.6"/>`);
});
// Zahnputzset: Becher mit Kinderzahnbürste (kurzer Kopf, dicker Griff) und Zahnpastatube.
neu('k_zahnputzset', 'beauty', 'kunststoff', 'mint', (S, t) => {
  t.push(boden(46, 90, 32, 2.4));
  t.push(`<g transform="rotate(-10 40 40)"><rect x="34" y="8" width="8" height="50" rx="4" fill="#f1cf4a"/><rect x="34" y="8" width="8" height="10" rx="2" fill="#fbf7ee"/><path d="M34 10 h-4 M34 13 h-4 M34 16 h-4" stroke="#7fc4d9" stroke-width="1.6"/></g>`);
  t.push(zylinder(S, 44, 46, 88, 16, 4, S.c), motiv('dino', 44, 66, 16));
  t.push(`<g transform="rotate(14 78 70)"><path d="M70 50 L86 50 L84 88 L72 88 Z" fill="#fbf7ee" stroke="#a89c8a" stroke-width="0.5"/><rect x="74" y="44" width="8" height="6" rx="1" fill="#c8372f"/><rect x="72" y="60" width="12" height="10" fill="#f2b8cc"/></g>`);
});
