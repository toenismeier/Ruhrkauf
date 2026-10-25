// Q19, E47: digitale Produkte für IT und Online (Coffee 12–14). Keine UI-seitige Berechnung von KPIs.
import { esc } from './format.js';
import * as K from './komponenten.js';
import { kanalBildSVG } from '../kit/marketing-bilder.js';

const zahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const anzahl = (n) => zahl.format(Number(n) || 0);
/** Version deutsch („2,0“), nie mit Dezimalpunkt. */
const version = (v) => String(v ?? '').replace('.', ',');
const motiv = (id) => kanalBildSVG(id).replace(/<rect width="190" height="160" rx="8" fill="#f0eee9"\/><rect y="140" width="190" height="20" fill="#e2dfd8"\/>/, '');
/** Illustration je Produkt: vorerst Kit-Motive und isometrische Symbole (eigene IT-Illustrationen folgen). */
export const itIllustration = (id) => ({ kundenkarte: K.symbol('kundenkarte', 'kommentare'), hartwig_app: K.illustration('kanal-social') || motiv('social'), kasse: K.symbol('it', 'kosten'), mobile_pay: K.illustration('kanal-online') || motiv('online') })[id] ?? K.symbol('systeme', 'zentrale');

const STERN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 3.15 6.38 7.04 1.02-5.09 4.96 1.2 7.01L12 18.07l-6.3 3.3 1.2-7.01-5.09-4.96 7.04-1.02Z"/></svg>';
const sterne = (n) => `<span class="hw-sterne hw-g3-sterne" role="img" aria-label="${n} von 5 Qualitätssternen">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? '' : 'aus'}">${STERN}</i>`).join('')}</span>`;
// Version 0.0 = noch nicht eingeführt (z. B. Mobile Pay ohne mobile Kassenstufe): nicht als „Aktiv“ ausweisen.
const status = (p) => { const neu = p.aktiv && p.version === '0.0'; return K.marke(neu ? 'Noch nicht eingeführt' : p.aktiv ? 'Aktiv' : 'Abgeschaltet', neu ? 'achtung' : p.aktiv ? 'gut' : 'schlecht'); };
const aenderung = (p) => p.aenderung === undefined ? 'ab der zweiten Woche vergleichbar'
  : K.abweichung(p.aenderung, `${p.aenderung > 0 ? '+' : p.aenderung < 0 ? '−' : '±'}${anzahl(Math.abs(p.aenderung))}`, p.aenderungQuote ?? null);

/** Linienverlauf wie Coffee 12: Punkte, letzter Punkt groß, Wochen darunter. */
function kurve(p) {
  const v = p.verlauf;
  if (v.length < 2) return K.leer('Ein Verlauf ist ab der zweiten Woche verfügbar.');
  const min = Math.min(...v.map((x) => x.wert)), max = Math.max(...v.map((x) => x.wert));
  const B = 350, H = 110, R = 14;
  const pt = v.map((x, i) => [R + (i * (B - 2 * R)) / (v.length - 1), min === max ? H / 2 : H - R - ((x.wert - min) / (max - min)) * (H - 2 * R)]);
  return `<div class="hw-g3-kurve"><svg viewBox="0 0 ${B} ${H}" role="img" aria-label="Verlauf ${esc(p.einheit)} über ${v.length} Wochen"><polyline points="${pt.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')}"/>`
    + pt.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === pt.length - 1 ? 8 : 5.5}"${i === pt.length - 1 ? ' class="letzter"' : ''}/>`).join('') + '</svg>'
    + `<div class="hw-balkenfuss">${v.map((x) => `<span>KW ${(x.woche % 52 + 52) % 52 + 1}</span>`).join('')}</div></div>`;
}

/** Produkte als Karussell (Coffee 05/26): Illustration, Name, Status, Kennzahl; Antippen öffnet die Detailseite. */
export function itProdukteKarten(produkte, quelle = 'it') {
  const karten = produkte.map((p) => `<button type="button" class="hw-g3-produkt" data-${quelle}="produkt" data-${quelle === 'it' ? 'v' : 'id'}="${esc(p.id)}" aria-label="${esc(p.name)} öffnen">`
    + `<span class="hw-g3-bild" aria-hidden="true">${itIllustration(p.id)}</span><span class="hw-karte-titel">${esc(p.name)}</span><span class="hw-g3-mitte">${status(p)}</span>`
    + `<span class="hw-lese hw-g3-text">${esc(p.beschreibung[0])}</span>`
    + `<span class="hw-marke">${esc(p.einheit)}</span><b class="hw-zahl">${anzahl(p.kennzahl)}</b><span class="hw-abw">${aenderung(p)}</span>`
    + `<span class="hw-g3-fuss"><span>Version ${version(p.version)}</span>${sterne(p.sterne)}<span>Team ${anzahl(p.team)}</span></span></button>`);
  return K.rumpf(K.abschnitt('Digitale Produkte', `${produkte.length} Produkte, antippen`)) + K.karussell(karten, { label: 'Digitale Produkte' })
    + K.rumpf('<p class="hw-lese hw-g3-notiz">Die Kennzahlen stammen aus Marketing, Filialumsatz und E-Commerce.</p>');
}

/** Detailseite wie Coffee 12–14: Titel, Illustration und Text, Kennzahl mit Abweichung, Verlauf, Versionskarte, Team, Betrieb. */
export function itProduktDetail(p, bestaetigen = false) {
  let h = `<h3 class="hw-g3-produkttitel">${esc(p.name)}</h3><div class="hw-g3-vorstellung"><span class="hw-g3-bild" aria-hidden="true">${itIllustration(p.id)}</span><div>${p.beschreibung.map((t) => `<p class="hw-lese">${esc(t)}</p>`).join('')}</div></div>`;
  h += K.gross([{ label: p.einheit, wert: anzahl(p.kennzahl), unter: aenderung(p) }]);
  h += kurve(p);
  h += `<section class="hw-g3-version hw-kontur"><span class="hw-marke">Installierte Version</span><div class="hw-g3-versionzeile"><b class="hw-zahl">${version(p.version)}</b>${sterne(p.sterne)}</div>`
    + `<div class="hw-g3-mitte">${status(p)}<span class="hw-feldunter">Systemgeneration ${p.generation} von 4</span></div>`
    + K.knoepfe(K.knopf('Version modernisieren', `data-it="modernisieren" data-v="${esc(p.id)}"`, 'zweit')) + '</section>';
  h += K.abschnitt('Zugewiesenes Team', `${anzahl(p.teamKostenWoche)} € je Woche`);
  h += K.feld('Personen im Produktteam', K.stepper({ wert: `${anzahl(p.team)} Personen`, unter: 'je Schritt drei Personen', label: 'Produktteam',
    attrMinus: `data-it="team" data-n="-3" data-v="${esc(p.id)}"`, attrPlus: `data-it="team" data-n="3" data-v="${esc(p.id)}"`, minusAus: p.team < 3, plusAus: p.team >= 30 }));
  h += '<p class="hw-lese hw-g3-notiz">Jede zusätzliche Person kostet 1.400 € je Woche.</p>';
  h += K.abschnitt('Produktkennzahlen');
  h += K.liste(p.details.map(([t, v]) => K.zeile({ was: esc(t), wert: esc(typeof v === 'number' ? anzahl(v) : String(v)) })));
  h += K.abschnitt('Betrieb');
  if (bestaetigen) h += K.hinweis('Produkt wirklich abschalten? Die Wirkung auf die Filialnachfrage zählt ab der nächsten Woche.', 'achtung')
    + K.knoepfe(K.knopf('Abbrechen', 'data-it="abbrechen"', 'zweit'), K.knopf('Abschalten bestätigen', `data-it="aktiv" data-v="${esc(p.id)}" data-gefahr`, 'gefahr'));
  else h += `<p class="hw-lese hw-g3-notiz">${p.aktiv ? 'Bei Abschaltung wird der Betrieb dieses Produkts eingeschränkt.' : 'Das Produkt ist abgeschaltet und kann wieder aktiviert werden.'}</p>`
    + K.knoepfe(p.aktiv ? K.knopf('Abschalten', `data-it="abschalten" data-v="${esc(p.id)}" data-gefahr`, 'gefahr') : K.knopf('Wieder aktivieren', `data-it="aktiv" data-v="${esc(p.id)}"`));
  h += K.knoepfe(K.knopf('Alle Produkte', 'data-it="zurueck"', 'text'));
  return K.rumpf(h);
}
