// Q18 · Redaktionelle Illustrationen je Artikelart. Keine Fremdbilder, Marken oder Personen.
// Vektorformen verwenden dieselbe isometrische Perspektive und reduzierte Farbwelt wie die Stadtgrafik.
// art kommt aus der bestehenden Zeitung-Engine; bild dient nur als Rückfall für alte Spielstände.
const ARTIKEL = [
  ['markt_ueberblick', 'markt', 'stadt', 'Wettbewerb'],
  ['markt_einzel', 'markt', 'laden', 'Marktbewegung'],
  ['konkurrenz_neu', 'laden', 'laden', 'Neueröffnung'],
  ['konkurrenz_zu', 'laden', 'geschlossen', 'Geschlossen'],
  ['konkurrenz_aktion', 'laden', 'rabatt', 'Aktion'],
  ['konkurrenz_uebernahme', 'laden', 'schluessel', 'Übernahme'],
  ['konkurrenz_preise', 'laden', 'preis', 'Preisvergleich'],
  ['haus_schliessung', 'haus', 'geschlossen', 'Schließung'],
  ['haus_raeumung', 'haus', 'kartons', 'Räumungsverkauf'],
  ['haus_umbau', 'haus', 'bau', 'Umbau'],
  ['haus_miete', 'haus', 'schluessel', 'Mietvertrag'],
  ['haus_personal', 'haus', 'menschen', 'Personal'],
  ['glaeubiger', 'politik', 'versammlung', 'Gläubiger'],
  ['insolvenzantrag', 'politik', 'akten', 'Insolvenzantrag'],
  ['insolvenz_gescheitert', 'politik', 'warnung', 'Sanierung'],
  ['betriebsrat', 'politik', 'versammlung', 'Betriebsrat'],
  ['sozialplan', 'politik', 'akten', 'Sozialplan'],
  ['streik', 'politik', 'streik', 'Arbeitskampf'],
  ['tarif', 'politik', 'menschen', 'Tarifrunde'],
  ['quartal', 'wirtschaft', 'diagramm', 'Quartalszahlen'],
  ['liquiditaet', 'wirtschaft', 'muenzen', 'Liquidität'],
  ['bank', 'wirtschaft', 'bank', 'Banken'],
  ['lieferanten', 'logistik', 'kartons', 'Lieferanten'],
  ['vorstand', 'haus', 'versammlung', 'Vorstand'],
  ['eigenmarken', 'mode', 'mode', 'Eigenmarken'],
  ['sortiment', 'mode', 'ware', 'Sortiment'],
  ['marketing', 'laden', 'plakat', 'Werbung'],
  ['verkauf', 'laden', 'diagramm', 'Verkauf'],
  ['immobilie', 'stadt', 'bau', 'Immobilien'],
  ['kosten', 'wirtschaft', 'diagramm', 'Kosten'],
  ['ecommerce', 'digital', 'geraet', 'Onlinehandel'],
  ['presse', 'stadt', 'zeitung', 'Nachrichten'],
  ['textil', 'mode', 'mode', 'Textilbranche'],
  ['frequenz', 'stadt', 'menschen', 'Frequenz'],
  ['kaufkraft', 'wirtschaft', 'muenzen', 'Kaufkraft'],
  ['mieten', 'stadt', 'schluessel', 'Mietniveau'],
  ['stadt', 'stadt', 'stadt', 'Innenstadt'],
  ['kunden', 'laden', 'menschen', 'Kundschaft'],
  ['logistik', 'logistik', 'lieferwagen', 'Lieferkette'],
  ['saison', 'mode', 'ware', 'Saisonware'],
  ['personal', 'politik', 'menschen', 'Beschäftigung'],
  ['kommunen', 'stadt', 'rathaus', 'Kommunen'],
  ['kredit', 'wirtschaft', 'bank', 'Kreditmarkt'],
  ['digital', 'digital', 'geraet', 'Digitalisierung'],
  ['quartalsblick', 'wirtschaft', 'diagramm', 'Quartalsbilanz'],
  ['weihnachten', 'winter', 'geschenke', 'Weihnachten'],
  ['winter', 'winter', 'schnee', 'Winterwetter'],
  ['sommer', 'sommer', 'sonne', 'Sommersaison'],
  ['interview', 'politik', 'mikrofon', 'Interview'],
  // Motive für künftig hinzukommende redaktionelle Artikelarten.
  ['messe', 'messe', 'messe', 'Fachmesse'],
  ['modewoche', 'mode', 'laufsteg', 'Modewoche'],
  ['konjunktur', 'wirtschaft', 'diagramm', 'Konjunktur'],
  ['wetter', 'winter', 'wetter', 'Wetterlage']
];
export const ZEITUNGS_ARTEN = Object.freeze(ARTIKEL.map((a) => a[0]));
const MOTIVE = Object.freeze(Object.fromEntries(ARTIKEL.map(([art, szene, objekt, label]) =>
  [art, Object.freeze({ szene, objekt, label })])));
const PALETTEN = {
  haus: ['#efe7d7', '#d9c4a5', '#9e8065', '#a54a42'],
  laden: ['#e2e9ec', '#bdcdd5', '#7993a4', '#b57a3d'],
  stadt: ['#e2e6df', '#d6c4af', '#8d9ba1', '#667c61'],
  markt: ['#e2e6df', '#b9ccbd', '#8da295', '#587b67'],
  wirtschaft: ['#e6e4df', '#c3c9cf', '#788593', '#3e667b'],
  politik: ['#eee5da', '#d0c6bf', '#81767b', '#975c51'],
  mode: ['#eae7e2', '#c8bab6', '#99838c', '#a1686a'],
  digital: ['#dde9eb', '#b9d0d6', '#688b9a', '#407d92'],
  logistik: ['#e4e7dd', '#c0cabc', '#829382', '#986845'],
  winter: ['#edf1ef', '#dae5e8', '#98b6c6', '#6685a2'],
  sommer: ['#edf0df', '#ddd0a7', '#97b79b', '#b8874a'],
  messe: ['#ece8e0', '#c3c6be', '#929a9d', '#ad6d48']
};
const XML = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const P = (d, fill, extra = '') => '<path d="' + d + '" fill="' + fill + '"' + extra + '/>';
const LINE = (d, color = '#495760', w = 3) => P(d, 'none',
  ' stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"');
const R = (x, y, w, h, fill, extra = '') => '<rect x="' + x + '" y="' + y + '" width="' + w +
  '" height="' + h + '" fill="' + fill + '"' + extra + '/>';
const C = (x, y, r, fill, extra = '') => '<circle cx="' + x + '" cy="' + y + '" r="' + r +
  '" fill="' + fill + '"' + extra + '/>';

// Wiederverwendbarer Satz isometrischer Gebäude. Die Fassaden- und Straßengeometrie
// ist absichtlich einheitlich; das redaktionelle Ereignis ist jeweils im Vordergrund.
function stadtbild(f, nr, szene) {
  const [himmel, front, seite, akzent] = f;
  let a = R(0, 0, 420, 260, himmel);
  a += P('M0 221 183 134 420 198 420 260 0 260Z', '#d6d3ca');
  a += P('M34 207 202 141 370 192 198 260Z', '#e6e4dc');
  a += LINE('M20 241 204 161 389 220', '#fff9eb', 4);
  // Links ein schmales Nachbarhaus.
  a += P('M30 113 88 93 121 109 63 131Z', '#b8b1a7');
  a += P('M30 113 63 131 63 207 30 185Z', '#a59f94');
  a += P('M63 131 121 109 121 187 63 207Z', '#cfc6b8');
  for (let y = 143; y <= 185; y += 21) {
    a += R(77, y, 12, 13, '#778e99') + R(99, y - 8, 12, 13, '#778e99');
  }
  // Vorderes Warenhaus mit ablesbarer Dach- und Fassadenstaffelung.
  a += P('M117 82 264 35 357 79 210 129Z', '#78838b');
  a += P('M117 82 210 129 210 234 117 187Z', seite);
  a += P('M210 129 357 79 357 183 210 234Z', front);
  a += P('M116 80 265 31 359 77 357 84 210 134 115 87Z', '#f6f2e9');
  for (let k = 0; k < 3; k++) {
    const y = 130 + k * 28;
    for (let j = 0; j < 4; j++) {
      const x = 223 + j * 30;
      a += P('M' + x + ' ' + (y - j * 10) + 'v-17l16-5v17Z', '#6e8998');
      a += LINE('M' + x + ' ' + (y - j * 10 - 17) + 'l16-5', '#f8f5eb', 1.5);
    }
    a += P('M135 ' + (123 + k * 27) + 'l27 14v-17l-27-14Z', '#6b858e');
    a += P('M171 ' + (141 + k * 27) + 'l26 13v-17l-26-13Z', '#6b858e');
  }
  a += P('M208 183 359 133v20l-151 50Z', akzent);
  a += P('M208 202 359 151v5l-151 51Z', '#f5ead7');
  a += P('M246 219v-31l34-12v31Z', '#526b79');
  a += LINE('M263 181v32', '#d3e5e7', 2);
  // Gleichbleibende perspektivische Pflanzkübel und Schatten.
  a += P('M72 222 91 214 107 223 88 232Z', '#aca79c');
  a += C(89, 210, 11, szene === 'winter' ? '#d8e7e4' : '#7d9e79');
  a += P('M352 217 372 209 387 217 366 228Z', '#aca79c');
  a += C(368, 205, 9, szene === 'winter' ? '#d8e7e4' : '#7d9e79');
  if (nr % 3 === 1) a += P('M115 188 210 235 210 238 115 191Z', '#f5e8da');
  return a;
}

function figuren(streik = false) {
  let a = '';
  for (const [x, y] of [[108, 214], [159, 234], [326, 229]]) {
    a += C(x, y - 23, 5, '#b19b86');
    a += P('M' + (x - 5) + ' ' + (y - 17) + 'h10l5 14h-20Z', streik ? '#9b504b' : '#576977');
    a += LINE('M' + (x - 3) + ' ' + (y - 3) + 'l-3 9m11-9 3 9', '#625d56', 2);
  }
  return a;
}
function papier(titel, akzent) {
  return P('M240 119 313 97 354 119 281 143Z', '#f4f0e6') +
    P('M240 119 281 143 281 220 240 195Z', '#d3d6d3') +
    P('M281 143 354 119 354 195 281 220Z', '#fffdf6') +
    LINE('M293 157l45-15M293 170l45-15M293 183l30-10', '#879296', 3) +
    P('M294 195l12 4 10-15', 'none', ' stroke="' + akzent + '" stroke-width="5"') +
    '<text x="288" y="146" fill="#33414b" font-size="11" font-family="Arial" font-weight="bold">' + XML(titel) + '</text>';
}
function motiv(objekt, f, label) {
  const akzent = f[3];
  const schild = (wort, color = akzent) =>
    R(235, 155, 126, 44, color, ' rx="2"') + R(245, 165, 106, 24, '#fffaef') +
    '<text x="298" y="182" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#36414b"' +
    // Lange Wörter (MARKTBEWEGUNG, NEUERÖFFNUNG) auf die Schildbreite stauchen, statt über den Rand zu laufen
    (wort.length > 9 ? ' textLength="96" lengthAdjust="spacingAndGlyphs"' : '') + '>' + XML(wort) + '</text>';
  const stapel = (x, y) => P('M' + x + ' ' + y + 'l34-12 24 10-35 13Z', '#e5be8d') +
    P('M' + x + ' ' + y + 'l23 11v28l-23-11Z', '#b68c62') +
    P('M' + (x + 23) + ' ' + (y + 11) + 'l35-13v28l-35 13Z', '#d4a779');
  const personen = figuren(false);
  switch (objekt) {
    case 'geschlossen': return schild('GESCHLOSSEN', '#6c7779') + LINE('M220 200l147-51', '#9a4b45', 6);
    case 'rabatt': return schild('−30 %') + C(321, 140, 19, '#fff8e8') + LINE('M311 149l20-19', '#a34942', 4);
    case 'preis': return schild('PREISE') + R(305, 201, 35, 18, '#f2d5aa') + LINE('M311 210h21', '#9f533e', 2);
    case 'schluessel': return C(285, 172, 24, '#c99d50') + C(285, 172, 11, '#e7e5de') +
      R(302, 169, 60, 9, '#bd8e43') + R(347, 169, 8, 25, '#bd8e43');
    case 'kartons': return stapel(240, 179) + stapel(290, 170) + stapel(270, 209);
    case 'bau': return R(231, 170, 123, 4, '#dbb36c') + R(248, 142, 4, 91, '#a16d3d') +
      R(339, 130, 4, 86, '#a16d3d') + LINE('M246 140l96-10', '#dbb36c', 5) +
      P('M289 127l26-10 23 8-26 11Z', '#eabb58');
    case 'menschen': return personen + schild(label === 'Personal' ? 'TEAM' : 'GESPRÄCH');
    case 'versammlung': return P('M221 198 275 164 360 185 305 222Z', '#9f7753') +
      P('M221 198 305 222v10l-84-22Z', '#78573f') + figuren(false) +
      R(270, 173, 27, 20, '#f8f1e3');
    case 'akten': return papier('AKTEN', akzent);
    case 'warnung': return P('M295 126 355 221 235 221Z', '#c48b48') +
      LINE('M295 155v32', '#fff5dc', 8) + C(295, 199, 5, '#fff5dc');
    case 'streik': return figuren(true) +
      R(100, 127, 75, 42, '#eee2cc') + R(320, 113, 69, 42, '#eee2cc') +
      LINE('M137 169v58M354 155v66', '#694d3e', 3) +
      '<text x="137" y="150" font-family="Arial" font-weight="bold" font-size="16" text-anchor="middle" fill="#933f3b">STREIK</text>' +
      LINE('M327 131h53M327 138h53', '#9b504b', 3);
    case 'diagramm': return R(244, 128, 105, 90, '#fffaf0') +
      LINE('M261 202v-27m22 27v-47m22 47v-33m22 33v-62', akzent, 13) +
      LINE('M248 208h94', '#637780', 2);
    case 'muenzen': return [0, 1, 2, 3].map((i) =>
      R(247 + i * 27, 208 - i * 12, 24, 16 + i * 12, '#b5924e', ' rx="5"') +
      '<ellipse cx="' + (259 + i * 27) + '" cy="' + (208 - i * 12) + '" rx="12" ry="5" fill="#e0bc6e"/>').join('');
    case 'bank': return P('M238 153 295 119 362 147 304 182Z', '#e5e0d5') +
      [252, 278, 304, 330].map((x) => R(x, 172, 10, 51, '#e6d9c3')).join('') +
      R(238, 217, 127, 7, '#7b8084') + R(237, 225, 128, 6, '#53616b');
    case 'ware': return stapel(250, 186) + schild('WARE');
    case 'mode': return P('M265 147l-15 13-11 29 17 9 5-14v47h65v-47l5 14 17-9-11-29-15-13-21 10-15-10Z', '#ba8588') +
      P('M286 147q10 15 20 0', 'none', ' stroke="#f2e6de" stroke-width="5"') +
      LINE('M273 211h43', '#754b59', 2);
    case 'plakat': return schild('AKTION') + R(290, 119, 6, 43, '#657980');
    case 'geraet': return R(262, 122, 84, 115, '#435765', ' rx="9"') +
      R(271, 133, 66, 86, '#d0e4e6') + C(305, 227, 4, '#f6f0e3') +
      R(282, 148, 44, 20, akzent) + R(282, 179, 44, 5, '#7aa0a6');
    case 'zeitung': return papier('PRESSE', akzent);
    case 'stadt': return figuren(false) + P('M230 220v-30h75v30Z', '#aabdc0') +
      P('M224 190l44-29 45 29Z', '#64818a');
    case 'lieferwagen': return R(238, 169, 78, 40, '#f1eee7') +
      P('M316 181h30l19 28h-49Z', '#c7d6d8') +
      C(267, 213, 11, '#424e52') + C(344, 213, 11, '#424e52') +
      R(249, 177, 45, 6, akzent);
    case 'rathaus': return P('M240 157 296 130 355 156 296 181Z', '#e4dfd2') +
      [258, 285, 312, 339].map((x) => R(x, 177, 11, 41, '#eee8d9')).join('') +
      R(239, 217, 119, 8, '#89949a');
    case 'geschenke': return R(250, 165, 75, 63, '#ad635b') +
      R(283, 165, 9, 63, '#ecdbb6') + R(250, 186, 75, 9, '#ecdbb6') +
      P('M286 166c-42-14-25-36 0-7 24-32 38-4 0 7Z', '#ecdbb6');
    case 'schnee': return [60, 110, 185, 245, 320, 380].map((x, i) =>
      C(x, 50 + (i % 3) * 27, 5, '#fff')).join('') +
      P('M22 215 211 141 405 204 405 223 201 167 22 240Z', '#f6f9f8');
    case 'sonne': return C(336, 56, 24, '#e7bf61') + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = i * Math.PI / 4;
      return LINE('M' + (336 + Math.cos(a) * 30) + ' ' + (56 + Math.sin(a) * 30) +
        'l' + (Math.cos(a) * 9) + ' ' + (Math.sin(a) * 9), '#e7bf61', 3);
    }).join('');
    case 'wetter': return '<ellipse cx="315" cy="83" rx="45" ry="23" fill="#b5c9d2"/>' +
      C(291, 72, 20, '#cfdce0') + C(323, 67, 27, '#cfdce0') +
      LINE('M288 114l-9 20m37-20-9 20m39-20-9 20', '#557f9c', 4);
    case 'mikrofon': return R(286, 137, 17, 50, '#657d87', ' rx="9"') +
      LINE('M276 175q17 39 37 0M295 192v23m-19 0h38', '#475d66', 4);
    case 'messe': return P('M238 173 300 138 366 165 302 201Z', '#e4ece8') +
      P('M238 173v39l64 27v-38Z', '#a5bab4') +
      P('M302 201v38l64-27v-47Z', '#d0d9d3') + schild('MESSE');
    case 'laufsteg': return P('M249 193 296 172 366 226 320 250Z', '#f5ece0') +
      P('M249 193 320 250l-9 5-72-58Z', '#a98c8b') +
      P('M288 172l-15 18 17 23h27l16-23-15-18Z', '#ad6b78');
    default: return schild(label.toUpperCase());
  }
}

/** SVG einer Artikelart; "bild" bleibt als Fallback für alte Spielstände erhalten. */
export function zeitungsBild(art = 'presse', bild = 'haus', nummer = 0) {
  // Abwärtskompatibel zum früheren Aufruf zeitungsBild(bild, nummer).
  if (typeof bild === 'number') { nummer = bild; bild = art; art = ''; }
  const eintrag = MOTIVE[art] || {
    szene: bild === 'konkurrenz' ? 'laden' : bild === 'politik' ? 'politik' :
      bild === 'markt' ? 'wirtschaft' : 'haus',
    objekt: 'zeitung', label: 'Handelsnachrichten'
  };
  const farben = PALETTEN[eintrag.szene] || PALETTEN.haus;
  const beschreibung = 'Isometrische Illustration zu ' + eintrag.label;
  return '<svg class="zb-isobild" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 260" role="img" aria-label="' +
    XML(beschreibung) + '">' +
    '<title>' + XML(beschreibung) + '</title>' +
    stadtbild(farben, Number.isFinite(nummer) ? Math.abs(nummer) : 0, eintrag.szene) +
    motiv(eintrag.objekt, farben, eintrag.label) +
    '<path d="M0 259h420" fill="none" stroke="#aaaba5" stroke-width="2"/></svg>';
}
