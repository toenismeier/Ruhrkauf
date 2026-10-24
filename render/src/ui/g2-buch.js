// G2 (E47): Buch im Stil der Coffee-GuV (Vorlagen 17 bis 22) für Übersichten, die tabelle() aus komponenten.js nicht
// abdeckt: tippbare Zeilen, Ampelwerte als Farbe, Prüfschlüssel (data-p) und Summenschlüssel (data-s / data-summe für
// tests/q31-summen.cjs). Aussehen ausschließlich in hartwig.css, Abschnitt G2. Genutzt von einkauf.js, ware.js,
// planung.js und vertrieb.js.
import { esc } from './format.js';
import { portraet } from './vorstand.js';
import * as K from './komponenten.js';

/** Wert einer Zelle: Text oder { t, p?, s?, summe?, ton? } (ton: 'schlecht' | 'achtung' | 'gut'). */
function zelle(w) {
  if (w == null || w === '') return '<span class="hw-g2-w"></span>';
  const x = typeof w === 'object' ? w : { t: w };
  return `<span class="hw-g2-w${x.ton ? ' hw-' + x.ton : ''}"${x.p ? ` data-p="${esc(x.p)}"` : ''}${x.s ? ` data-s="${esc(x.s)}"` : ''}${x.summe ? ` data-summe="${esc(x.summe)}"` : ''}>${esc(x.t)}</span>`;
}

/** Eine Zeile. art: '' | 'bereich' (Gruppenzeile) | 'unter' (eingerückt) | 'summe' (Strich vor den Werten).
 *  name und unter sind fertiges HTML. Mit attr wird die Zeile ein Knopf (tippbar, mindestens 44 px hoch). */
export function reihe({ name, unter = '', werte = [], art = '', attr = '', pfeil = '' }) {
  const tag = attr ? 'button' : 'div';
  return `<${tag} class="hw-g2-reihe${art ? ' ' + art : ''}"${attr ? ' type="button" ' + attr : ''}><span class="hw-g2-name">${pfeil ? `<i class="hw-g2-auf" aria-hidden="true">${pfeil}</i>` : ''}<span>${name}${unter ? `<small>${unter}</small>` : ''}</span></span>${werte.map(zelle).join('')}</${tag}>`;
}

/** Buch: Kopf mit Titel links und Spalten rechts (wie „STORE INCOME STATEMENT“), darunter fertige Zeilen (reihe()).
 *  spalten: Text oder { t, attr } (attr macht den Spaltenkopf zum Sortierknopf); titelAttr macht den Titel zum Knopf.
 *  breite: Spaltenbreite in px; attr: weitere Attribute am Buch (z. B. data-summenbuch). */
export function buch({ titel = '', titelAttr = '', spalten = [], zeilen = [], breite = 84, attr = '' }) {
  const kopfzelle = (x) => (typeof x === 'object' && x.attr ? `<button type="button" class="hw-g2-w hw-g2-sort" ${x.attr}>${esc(x.t)}</button>` : `<span class="hw-g2-w">${esc(typeof x === 'object' ? x.t : x)}</span>`);
  const kopf = `<div class="hw-g2-reihe kopf">${titelAttr ? `<button type="button" class="hw-g2-name hw-g2-sort" ${titelAttr}>${esc(titel)}</button>` : `<span class="hw-g2-name">${esc(titel)}</span>`}${spalten.map(kopfzelle).join('')}</div>`;
  return `<div class="hw-g2-buch" style="--sw:${breite}px"${attr ? ' ' + attr : ''}>${kopf}${zeilen.join('')}</div>`;
}

/** Leise Fußzeile unter einem Buch oder Bedienfeld (Legende, Stand, Protokoll). */
export const fuss = (html) => `<p class="hw-g2-fuss">${html}</p>`;

/** Zwei Bedienfelder nebeneinander (Stepper, Auswahl), wie die Felder im Hausdetail. */
export const felder = (...f) => `<div class="hw-felder">${f.join('')}</div>`;

/** Auswahlfeld im Hartwig-Look. optionen: [[wert, text]]. */
export function auswahl(optionen, aktiv, attr, label) {
  return `<select class="hw-g2-auswahl hw-kontur" ${attr} aria-label="${esc(label)}">${optionen.map(([w, t]) => `<option value="${esc(w)}"${String(w) === String(aktiv ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
}

/** Sprecherzeile mit einem Vorstand als Person (Ressort aus dem Spielstand); unbesetzt ohne Figur. */
export function vorstandSprecher(s, ressort, rolle, text, ton = '') {
  const p = s?.vorstand?.ressorts?.[ressort]?.person;
  return K.sprecher({ text, unter: p ? `${p.name} · ${rolle}` : `${rolle} unbesetzt`, person: p ? portraet(p.portraet, 72) : '', ton });
}

/** Marker für den G2-Abschnitt in hartwig.css (Kopfschrift aus der Skala, Reiterleiste mit sechs Plätzen). */
export const G2 = '<i class="hw-g2" hidden></i>';
