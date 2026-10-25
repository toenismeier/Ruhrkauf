// Bausteine der Spieloberfläche (E47). Aussehen ausschließlich in hartwig.css, Maße aus Coffee 2 vermessen (render/ui-referenz).
// Alle Funktionen liefern HTML-Text. Texte werden maskiert, Zahlen kommen fertig formatiert oder als Rohwert (data-w),
// damit die Summenprüfung (stilpruefung.js) Summen gegen die angezeigten Zeilen nachrechnen kann.
import { esc } from './format.js';
import { ILLUSTRATIONEN } from './illustrationen-daten.js';

/** Marker, der den dunklen Look und das Kopfsymbol des Panels einschaltet. bereich: haus | zentrale | betrieb | papier. */
export const bereich = (name, symbol = name, { voll = false } = {}) => `<i class="hk-bereich hw-marker" data-bereich="${esc(name)}" data-symbol="${esc(symbol)}"${voll ? ' data-hoehe="voll"' : ''} aria-hidden="true"></i>`;

/** Karussell gleichartiger Karten mit Seitenpunkten (Coffee 05, 26): Karte 300 px, Nachbar schaut heraus.
 *  karten: fertiges HTML je Karte (Inhalt der Karte, Rahmen setzt das Karussell). */
export function karussell(karten, { aktiv = 0, label = 'Karten' } = {}) {
  if (!karten.length) return leer('Keine Einträge vorhanden.');
  return `<div class="hw-karussell hw-randlos" role="group" aria-label="${esc(label)}" data-aktiv="${aktiv}" onscroll="const i=Math.round(this.scrollLeft/(this.firstElementChild.offsetWidth+21));this.nextElementSibling.querySelectorAll('i').forEach((p,k)=>p.classList.toggle('an',k===i))">${karten.map((k) => `<article class="hw-karte hw-kontur">${k}</article>`).join('')}</div>`
    + `<div class="hw-punkte" aria-hidden="true">${karten.map((_, i) => `<i class="${i === aktiv ? 'an' : ''}"></i>`).join('')}</div>`;
}

/** Innenrand für Inhalt (20 px wie Coffee). */
export const rumpf = (html) => `<div class="hw-rumpf">${html}</div>`;
/** Dunkles Band über die volle Breite (Coffee 22: GuV unter den Balken). */
export const band = (html) => `<section class="hw-band">${html}</section>`;

/** Sprecherzeile: eine Person sagt den Befund der Woche (nie eine Begrüßung). Die Hülle hebt sie unter den Kopf.
 *  ton: '' | 'engpass' | 'alarm'. person: fertiges SVG (Porträt). */
export function sprecher({ text, unter = '', person = '', ton = '' }) {
  return `<div class="hw-sprecher"${ton ? ` data-ton="${esc(ton)}"` : ''} role="note"><div class="hw-sprecher-text"><span>${text}${unter ? `<small class="hw-sprecher-unter">${esc(unter)}</small>` : ''}</span></div>${person ? `<span class="hw-sprecher-figur" aria-hidden="true">${person}</span>` : ''}<div class="hw-griff" aria-hidden="true"></div></div>`;
}

/** Abschnittskopf in Versalien, rechts optional eine leise Ergänzung. */
export const abschnitt = (titel, rechts = '') => `<h3 class="hw-abschnitt">${esc(titel)}${rechts ? `<small>${esc(rechts)}</small>` : ''}</h3>`;

/** Abweichung als Text mit Ton: abweichung(+1234, '+1.234 €', 0.05) → „+1.234 € (+5 %)“. Ton nur bei klarer Wirkung. */
export function abweichung(roh, text, quote = null, umgekehrt = false) {
  if (roh == null) return '<span>keine Vergleichswoche</span>';
  const gut = umgekehrt ? roh < 0 : roh > 0, schlecht = umgekehrt ? roh > 0 : roh < 0;
  const q = quote == null || !Number.isFinite(quote) ? '' : ` (${quote > 0 ? '+' : quote < 0 ? '−' : '±'}${Math.abs(quote * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %)`;
  return `<span class="${gut ? 'hw-gut' : schlecht ? 'hw-schlecht' : ''}">${esc(text)}${q}</span>`;
}

/** Großkennzahlen (Coffee 20, 22). werte: [{ label, wert, ton?: 'gut'|'schlecht', unter?: HTML, p?: data-p }] */
export function gross(werte) {
  return `<div class="hw-gross" style="--n:${werte.length}">${werte.map((w) => `<div><span class="hw-marke">${esc(w.label)}</span><b class="hw-zahl${w.ton ? ' hw-' + w.ton : ''}"${w.p ? ` data-p="${esc(w.p)}"` : ''}>${esc(w.wert)}</b>${w.unter ? `<span class="hw-abw">${w.unter}</span>` : ''}</div>`).join('')}</div>`;
}

/** Gepaarte Balken ohne Achsen mit Wochen darunter (Coffee 22). reihen: [{ label, a, b }] (Rohwerte), legende: [Name a, Name b]. */
export function balken(reihen, legende = []) {
  if (reihen.length < 2) return leer('Ein Verlauf ist ab der zweiten Woche verfügbar.');
  const max = Math.max(1, ...reihen.flatMap((r) => [Math.abs(r.a ?? 0), Math.abs(r.b ?? 0)]));
  const h = (v) => `${Math.max(2, Math.round((Math.abs(v) / max) * 100))}%`;
  const saeule = (v, k) => v == null ? '' : `<i class="${k}${v < 0 ? ' neg' : ''}${v === 0 ? ' null' : ''}" style="height:${h(v)}" data-w="${Math.round(v)}"></i>`;
  return `<div class="hw-balkenfeld"><div class="hw-balken" style="--hoehe:100px" role="img" aria-label="${esc(legende.join(' und '))}">${reihen.map((r) => `<div>${saeule(r.a, 'a')}${saeule(r.b, 'b')}</div>`).join('')}</div>`
    + `<div class="hw-balkenfuss">${reihen.map((r) => `<span>${esc(r.label)}</span>`).join('')}</div>`
    + (legende.length ? `<div class="hw-legende">${legende.map((l, i) => `<span><i class="${i ? 'b' : ''}"></i>${esc(l)}</span>`).join('')}</div>` : '') + '</div>';
}

/** Zwei Balkenreihen mit eigener Skala untereinander. reihen: [{ titel, serie: 'a'|'b', punkte: [{ label, wert }] }]. */
export function balkenPaar(reihen) {
  return reihen.map((r) => abschnitt(r.titel) + (r.punkte.length < 2 ? leer('Ab der zweiten Woche.')
    : balken(r.punkte.map((q) => r.serie === 'b' ? { label: q.label, a: null, b: q.wert } : { label: q.label, a: q.wert, b: null })))).join('');
}

/** Tabelle (GuV, Coffee 17–22). spalten: Kopf rechts; zeilen: [{ name, werte: [Text], roh?: [Zahl], ton?: [..] }];
 *  summe: { name, werte, roh } mit Strich darüber. Mit `pruefen: true` muss summe.roh[i] = Σ zeilen.roh[i] gelten. */
export function tabelle({ titel = '', spalten = [], zeilen, summe = null, pruefen = false }) {
  const zelle = (t, roh, ton) => `<td class="${ton ?? ''}"${roh != null ? ` data-w="${roh}"` : ''}>${esc(t)}</td>`;
  const zeile = (z, k = '') => `<tr${k ? ` class="${k}"` : ''}><td>${esc(z.name)}</td>${z.werte.map((w, i) => zelle(w, z.roh?.[i], z.ton?.[i])).join('')}</tr>`;
  return `<table class="hw-tabelle"${pruefen ? ' data-summen="1"' : ''}>${(titel || spalten.length) ? `<thead><tr><th>${esc(titel)}</th>${spalten.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead>` : ''}<tbody>${zeilen.map((z) => zeile(z)).join('')}${summe ? zeile(summe, 'summe') : ''}</tbody></table>`;
}

/** Listenzeile. attr: zusätzliche Attribute (z. B. data-a), tippbar: als Knopf. */
export function zeile({ was, unter = '', wert = '', wertUnter = '', ton = '', attr = '', tippbar = false, roh = null }) {
  const tag = tippbar ? 'button' : 'div';
  return `<${tag} class="hw-zeile"${tippbar ? ' type="button"' : ''} ${attr}><span class="hw-was">${was}${unter ? `<small>${unter}</small>` : ''}</span>${wert !== '' ? `<span class="hw-wert ${ton}"${roh != null ? ` data-w="${roh}"` : ''}>${wert}${wertUnter ? `<small>${wertUnter}</small>` : ''}</span>` : ''}${tippbar ? '<span class="hw-pfeil" aria-hidden="true">›</span>' : ''}</${tag}>`;
}
export const liste = (zeilen) => `<div class="hw-liste">${zeilen.join('')}</div>`;

/** Knopf. art: '' (primär, höchstens einer je Abschnitt) | 'zweit' | 'text' | 'gefahr'; mit ' breit' volle Breite. */
export const knopf = (text, attr = '', art = '', aus = false) => `<button type="button" class="hw-knopf ${art}" ${attr}${aus ? ' disabled' : ''}>${esc(text)}</button>`;
export const knoepfe = (...k) => `<div class="hw-knoepfe">${k.join('')}</div>`;

/** Stepper [−] Wert [+]. gross: frei auf dem Grund (44 px), sonst in Karten (32 px). */
export const stepper = ({ wert, unter = '', attrMinus = '', attrPlus = '', minusAus = false, plusAus = false, label = '', gross = true }) =>
  `<div class="hw-stepper hw-kontur${gross ? ' gross' : ''}"${label ? ` role="group" aria-label="${esc(label)}"` : ''}><button type="button" class="hw-kontur" aria-label="weniger" ${attrMinus}${minusAus ? ' disabled' : ''}></button><output>${esc(wert)}${unter ? `<small>${esc(unter)}</small>` : ''}</output><button type="button" class="hw-kontur plus" aria-label="mehr" ${attrPlus}${plusAus ? ' disabled' : ''}></button></div>`;

/** Beschriftetes Bedienfeld (Versalien darüber), z. B. feld('Jahresgehalt', stepper({...})). */
export const feld = (name, html) => `<div class="hw-feld"><span class="hw-marke hw-feldname">${esc(name)}</span>${html}</div>`;

/** Schalterzeile (Coffee 28 Delegation): Schalter links, Beschriftung rechts. */
export const schalter = ({ text, unter = '', an, attr = '' }) =>
  `<button type="button" class="hw-schalterzeile" aria-pressed="${an ? 'true' : 'false'}" ${attr}><span class="hw-schalter hw-kontur" role="presentation" aria-checked="${an ? 'true' : 'false'}"></span><span>${esc(text)}${unter ? `<small>${esc(unter)}</small>` : ''}</span></button>`;

/** Segmentleiste (Coffee 26). optionen: [[wert, text]], attr(wert) liefert Attribute. */
export const seg = (optionen, aktiv, attr) => `<div class="hw-segment" role="group">${optionen.map(([w, t]) => `<button type="button" aria-pressed="${w === aktiv}" ${attr(w)}>${esc(t)}</button>`).join('')}</div>`;

/** Leerer Zustand mit Grund und optional nächster Aktion. */
/** Leerer Zustand; mit `bild` (Motivname) groß und mittig wie Coffee: Gegenstand, Satz, Aktion. */
export const leer = (grund, titel = '', aktion = '', bild = '') => bild && ILLUSTRATIONEN[bild]
  ? `<div class="hw-leer hw-leer-bild">${illustration(bild, 'hw-ill hw-leer-motiv')}${titel ? `<b>${esc(titel)}</b>` : ''}${esc(grund)}${aktion}</div>`
  : `<div class="hw-leer">${titel ? `<b>${esc(titel)}</b>` : ''}${esc(grund)}${aktion}</div>`;

/** Hinweis im Fluss. ton: '' | 'achtung' | 'fehler' | 'gut'. */
export const hinweis = (html, ton = '') => `<div class="hw-hinweis ${ton}" role="${ton === 'fehler' ? 'alert' : 'note'}">${html}</div>`;

/** Statusmarke als leise Versalie (kein Pillenhaufen). */
export const marke = (text, ton = '') => `<span class="hw-status ${ton}">${esc(text)}</span>`;

/** Fähigkeit: Name, fünf Segmente, Zahl (Coffee 28). */
export function skala(name, wert) {
  const n = Math.max(0, Math.min(100, wert)) / 20;
  return `<div class="hw-faehigkeit"><span>${esc(name)}</span><span class="hw-skala-balken" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i style="--a:${Math.max(0, Math.min(1, n - i)).toFixed(2)}"></i>`).join('')}</span><b>${Math.round(wert)}</b></div>`;
}

// ───────────── Isometrische Reitersymbole (eigener Satz, wie die Stadt: drei Flächen, Licht von links) ─────────────
const C30 = Math.cos(Math.PI / 6);
const pt = (x, y, z, s = 2.9, ox = 16, oy = 19) => [ox + (x - y) * C30 * s, oy + (x + y) * 0.5 * s - z * s];
const poly = (pts, f) => `<path d="M${pts.map(([a, b]) => a.toFixed(1) + ' ' + b.toFixed(1)).join('L')}Z" fill="${f}"/>`;
/** Quader [x,x+w]×[y,y+d]×[z,z+h]; farbe: [oben, links (+y), rechts (+x)]. */
function quader(x, y, z, w, d, h, [o, l, r]) {
  const P = (a, b, c) => pt(a, b, c);
  return poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], o)
    + poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], l)
    + poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], r);
}
/** viewBox passt sich an die gezeichneten Flächen an (quadratisch, 1 Einheit Rand). */
function svg(inhalt) {
  const z = [...inhalt.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const x0 = Math.min(...z.map((q) => q[0])), x1 = Math.max(...z.map((q) => q[0])), y0 = Math.min(...z.map((q) => q[1])), y1 = Math.max(...z.map((q) => q[1]));
  const g = Math.max(x1 - x0, y1 - y0) + 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return `<svg viewBox="${(cx - g / 2).toFixed(1)} ${(cy - g / 2).toFixed(1)} ${g.toFixed(1)} ${g.toFixed(1)}" aria-hidden="true">${inhalt}</svg>`;
}
const GRAU = ['#d9d3cb', '#b3aba1', '#8d847a'], DUNKEL = ['#6c655e', '#55504a', '#433f3a'], ROT = ['#ef6b60', '#d23c32', '#a62a22'];
const GRUEN = ['#8ed694', '#6dbf73', '#4a8d50'], BLAU = ['#9dc2dc', '#6f9cbd', '#4f7a99'], SAND = ['#f0dfb8', '#d9c393', '#b8a170'], WEISS = ['#ffffff', '#e5e1db', '#c9c3bb'];
const figur = (x, y, f) => quader(x, y, 0, 1.4, 1.4, 3.2, f) + quader(x + 0.15, y + 0.15, 3.3, 1.1, 1.1, 1.1, ['#f2d2b6', '#dcb593', '#c29a77']);
export const SYMBOLE = {
  ueberblick: svg(quader(-3, -3, 0, 6, 6, 4.5, WEISS) + quader(-3, -3, 2.4, 6, 6, 0.6, ROT) + quader(-3, -3, 4.5, 6, 6, 0.5, DUNKEL)),
  etagen: svg(quader(-3.5, -3.5, 0, 7, 7, 1, GRAU) + quader(-3.5, -3.5, 2.4, 7, 7, 1, WEISS) + quader(-3.5, -3.5, 4.8, 7, 7, 1, ROT)),
  personal: svg(figur(-2.5, 0, BLAU) + figur(0.5, -2, ROT) + figur(1.5, 1.5, GRUEN)),
  leitung: svg(quader(-3.5, -1, 0, 7, 3, 2.2, SAND) + figur(-0.5, -3.5, DUNKEL) + quader(-1, 0, 2.2, 2, 1.2, 0.8, ['#333', '#222', '#111'])),
  sortiment: svg(quader(-4, -0.3, 0, 0.6, 0.6, 6, DUNKEL) + quader(3.4, -0.3, 0, 0.6, 0.6, 6, DUNKEL) + quader(-4, -0.3, 5.6, 8, 0.6, 0.5, DUNKEL)
    + quader(-3, -0.8, 2, 1.6, 1.6, 3.2, ROT) + quader(-0.9, -0.8, 2, 1.6, 1.6, 3.2, BLAU) + quader(1.2, -0.8, 2, 1.6, 1.6, 3.2, SAND)),
  marketing: svg(quader(-0.4, -0.4, 0, 0.8, 0.8, 4, DUNKEL) + quader(-4, -0.5, 3.6, 8, 1, 4.6, WEISS) + quader(-3.4, 0.5, 4.2, 6.8, 0.1, 3.4, ROT)),
  kosten: svg(quader(-3.5, -2.5, 0, 7, 5, 2.5, GRAU) + quader(-3, -2, 2.5, 3, 4, 2.2, DUNKEL) + quader(0.4, -1.5, 2.5, 2.6, 3, 0.5, GRUEN)),
  finanzen: svg(quader(-3.5, -2.5, 0, 7, 5, 2.5, GRAU) + quader(-3, -2, 2.5, 3, 4, 2.2, DUNKEL) + quader(0.4, -1.5, 2.5, 2.6, 3, 0.5, GRUEN)),
  ware: svg(quader(-4, -3, 0, 4, 4, 3.4, SAND) + quader(0.3, -3, 0, 3.7, 4, 3.4, SAND) + quader(-2, -1.5, 3.4, 4, 4, 3.2, SAND) + quader(-2, 0.6, 5, 4, 0.1, 0.5, ROT)),
  umbau: svg(quader(-3.5, -3.5, 0, 0.5, 0.5, 7, SAND) + quader(3, -3.5, 0, 0.5, 0.5, 7, SAND) + quader(-3.5, -3.5, 3.3, 7, 0.5, 0.5, SAND) + quader(-3.5, -3.5, 6.5, 7, 0.5, 0.5, SAND) + quader(-2.5, -1, 0, 5, 4, 3, WEISS)),
  kommentare: svg(quader(-3.5, -3, 0, 7, 6, 0.6, WEISS) + quader(-2.5, -2, 0.6, 5, 4, 0.3, ['#f6f2e9', '#ddd6c7', '#c9c0ae']) + quader(-2, 1.5, 0.9, 4, 0.2, 0.2, DUNKEL)),
  post: svg(quader(-4, -3, 0, 8, 6, 1.6, SAND) + quader(-3.4, -2.4, 1.6, 6.8, 4.8, 0.4, WEISS) + quader(-3, -2, 2, 6, 4, 0.4, ['#fbf7ee', '#e5ddcd', '#cdc3ad']) + quader(-1, -0.6, 2.4, 2, 1.2, 0.2, ROT)),
  zentrale: svg(quader(-2.5, -2.5, 0, 5, 5, 10, WEISS) + quader(-2.5, 2.45, 2, 5, 0.1, 1, BLAU) + quader(-2.5, 2.45, 4.5, 5, 0.1, 1, BLAU) + quader(-2.5, 2.45, 7, 5, 0.1, 1, BLAU) + quader(-2.5, -2.5, 10, 5, 5, 0.6, ROT)),
  zahlen: svg(quader(-4, -1, 0, 2, 2, 3, WEISS) + quader(-1, -1, 0, 2, 2, 6, WEISS) + quader(2, -1, 0, 2, 2, 4.4, GRUEN)),
};

/** Reiterleiste unten. reiter: [[id, Name, Symbolname]], attr(id) liefert Attribute. */
/** Gerenderte Illustration (render/illustrationen) als Bild; leer, wenn es das Motiv noch nicht gibt. */
export const ILLUSTRATIONEN_ROH = ILLUSTRATIONEN;
export const illustration = (name, klasse = 'hw-ill') => { const i = ILLUSTRATIONEN[name]; return i ? `<img class="${klasse}" src="${i.u}" width="${i.b}" height="${i.h}" alt="" decoding="async">` : ''; };
/** Symbol für Reiter und Menü: Illustration, sonst das alte Code-Symbol. */
export const symbol = (name, rueckfall = name) => illustration(name) || SYMBOLE[name] || SYMBOLE[rueckfall] || '';
const RUECKFALL = { haus: 'ueberblick', flaeche: 'etagen', notizen: 'kommentare', vorstand: 'leitung', organisation: 'personal', reporting: 'zahlen', systeme: 'zentrale', it: 'post', projekte: 'umbau', neu: 'leitung',
  planung: 'leitung', forecast: 'finanzen', boni: 'personal', online: 'leitung', allokation: 'etagen', freigaben: 'post', marken: 'sortiment', saison: 'ware', reduzierung: 'kosten', staedte: 'zentrale', kundenkarte: 'kommentare', crm: 'post', kalender: 'etagen' };
export const reiterUnten = (reiter, aktiv, attr) => `<nav class="hw-reiter" aria-label="Bereiche">${reiter.map(([id, name, sym]) => `<button type="button" ${attr(id)}${id === aktiv ? ' aria-current="page"' : ''}>${symbol(sym ?? id, RUECKFALL[sym ?? id])}<span>${esc(name)}</span></button>`).join('')}</nav>`;
