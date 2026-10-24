/** Q16, E47: Stadtauswertung, Kanalkarten (Coffee 05), Marktanteil (Coffee 25) und Kacheln (Coffee 23–24).
 *  Keine eigene Budget- oder Nachfrageberechnung: alle Werte aus marketingStaedte, kanaele, marketingUebersicht. */
import { esc, geld, pz, dez } from './format.js';
import * as K from './komponenten.js';
import { kanalBildSVG, MARKETING_KANAL_INFO } from '../kit/marketing-bilder.js';

/** Wert für die Prüfung merken (data-p setzt der Baustein), Text zurückgeben. */
export const merke = (P, k, t) => { P(k, t); return t; };

export function ortDaten(E, spiel, ui) {
  const daten = E.marketingStaedte(spiel());
  const regionen = ['alle', ...new Set(daten.staedte.map((x) => x.region))];
  const auswahl = daten.staedte.filter((x) => ui.region === 'alle' || x.region === ui.region);
  const index = Math.max(0, auswahl.findIndex((x) => x.stadt === ui.stadt));
  const stadt = auswahl[index];
  return { daten, regionen, auswahl, stadt, index };
}

/** Kachel wie Coffee 23–24: Illustration, Titel, Betrag rechts, Stufe links unten. wert ist fertiges HTML. */
export const kachel = ({ bild, titel, stufe = '', wert = '', einheit = 'je Woche', attr = '', an = false }) =>
  `<button type="button" class="hw-g3-kachel${an ? ' an' : ''}" aria-pressed="${an}" ${attr}><span class="hw-g3-kachelbild" aria-hidden="true">${bild}</span>`
  + `<span class="hw-g3-kacheltitel">${esc(titel)}</span><span class="hw-g3-kachelwert">${wert}</span>`
  + `<span class="hw-g3-kachelfuss"><span>${esc(stufe)}</span><small>${esc(einheit)}</small></span></button>`;

/** Kacheln zweispaltig; steuer (HTML) erscheint unter dem Kachelpaar der gewählten Kachel. */
export function kachelRaster(kacheln, gewaehlt = -1, steuer = '') {
  let h = '';
  kacheln.forEach((k, i) => {
    h += k;
    if (steuer && gewaehlt >= 0 && (i === (gewaehlt | 1) || (i === kacheln.length - 1 && i < (gewaehlt | 1)))) h += `<div class="hw-g3-steuer">${steuer}</div>`;
  });
  return `<div class="hw-g3-kacheln">${h}</div>`;
}

/** Große Skala in fünf Segmenten mit Wert rechts (Coffee 05, Markenbekanntheit). */
export const skalaGross = (label, wert, wertHtml) => `<span class="hw-marke hw-g3-skalaname">${esc(label)}</span>`
  + `<div class="hw-skala hw-g3-skala" role="img" aria-label="${esc(label)}: ${Math.round(wert)} von 100"><div class="hw-skala-balken">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < Math.round(wert / 20) ? '' : 'aus'}"></i>`).join('')}</div>${wertHtml}</div>`;

/** Kanalmotiv aus dem Kit ohne hellen Bildgrund (keine hellen Flächen im dunklen Blatt). */
const kanalBild = (id) => kanalBildSVG(id).replace(/<rect width="190" height="160" rx="8" fill="#f0eee9"\/><rect y="140" width="190" height="20" fill="#e2dfd8"\/>/, '');

/** Stadtwahl: Regionen als Segment, Stadt per Stepper (vorherige, nächste). */
export function stadtWahl(E, spiel, ui, mitRegion = true) {
  const { regionen, auswahl, stadt, index } = ortDaten(E, spiel, ui);
  const reg = mitRegion ? K.seg(regionen.map((r) => [r, r === 'alle' ? 'Alle' : r]), ui.region, (w) => `data-a="region" data-v="${esc(w)}"`) + '<div class="hw-abstand"></div>' : '';
  return reg + K.feld('Stadt', K.stepper({ wert: stadt?.stadt ?? 'keine Stadt', unter: stadt ? `Region ${stadt.region} · ${index + 1} von ${auswahl.length}` : '', label: 'Stadt wechseln',
    attrMinus: 'data-a="stadtShift" data-v="-1"', attrPlus: 'data-a="stadtShift" data-v="1"', minusAus: auswahl.length < 2, plusAus: auswahl.length < 2 }));
}

const GRUPPEN = [['hartwig', 'Hartwig mit Sport'], ['volkskauf', 'Volkskauf'], ['fundus', 'FUNDUS'], ['wettbewerber', 'Wettbewerber']];
const FORMAT = { warenhaus: 'Hartwig Warenhaus', sport: 'Hartwig Sport', schwester: 'Volkskauf', outlet: 'FUNDUS' };
const STATUS_HAUS = { offen: 'geöffnet', schliessung_verhandlung: 'Schließung in Verhandlung', raeumung: 'Räumungsverkauf', geschlossen: 'geschlossen', verkauft: 'verkauft' };

/** Ring wie Coffee 25: Anteile als Segmente, Prozent auf dem Segment. */
function ring(werte) {
  const R = 54, W = 30, U = 2 * Math.PI * R;
  let start = 0, seg = '', text = '';
  for (const [k] of GRUPPEN) {
    const a = Math.max(0, werte[k] ?? 0);
    if (a <= 0) continue;
    seg += `<circle class="hw-g3-ring-${k}" cx="75" cy="75" r="${R}" fill="none" stroke-width="${W}" stroke-dasharray="${(U * a).toFixed(2)} ${(U * (1 - a)).toFixed(2)}" stroke-dashoffset="${(-U * start).toFixed(2)}" transform="rotate(-90 75 75)"/>`;
    if (a >= 0.06) {
      const w = (start + a / 2) * 2 * Math.PI - Math.PI / 2;
      text += `<text x="${(75 + R * Math.cos(w)).toFixed(1)}" y="${(75 + R * Math.sin(w) + 3.5).toFixed(1)}" text-anchor="middle">${Math.round(a * 100)} %</text>`;
    }
    start += a;
  }
  return `<svg class="hw-g3-ring" viewBox="0 0 150 150" aria-hidden="true">${seg}${text}</svg>`;
}

export function stadtAnsicht(E, spiel, ui, P) {
  const { stadt } = ortDaten(E, spiel, ui);
  let h = stadtWahl(E, spiel, ui);
  if (!stadt) return { befund: 'In dieser Region liegt keine Stadt mit Hartwig-Standort.', html: K.rumpf(h + K.leer('Keine Stadt verfügbar.')) };
  const w = stadt.marktanteile;
  h += K.abschnitt(`Marktanteil in ${stadt.stadt}`);
  h += `<div class="hw-g3-markt">${ring(w)}${K.liste(GRUPPEN.map(([k, t]) => K.zeile({ was: `<i class="hw-g3-farbe hw-g3-ring-${k}" aria-hidden="true"></i>${esc(t)}`, wert: P(`ms:${stadt.stadt}:${k}`, pz(w[k], 1), 'span') })))}</div>`;
  h += `<p class="hw-lese hw-g3-notiz">${stadt.wettbewerberAnzahl} modellierte Wettbewerber. Der übrige lokale Handel steckt im Wettbewerbsanteil.</p>`;
  h += K.abschnitt('Markenbekanntheit', `Hartwig in ${stadt.stadt}`);
  h += skalaGross(`Markenbekanntheit in ${stadt.stadt}`, stadt.markenbekanntheit, P(`bek:${stadt.stadt}`, `${stadt.markenbekanntheit} / 100`, 'b', ' class="hw-skala-wert"'));
  h += '<p class="hw-lese hw-g3-notiz">Modellschätzung aus Konzernimage, Marketingdruck und Standortpräsenz. Ohne Eingriffe neutral zum Konzernwert.</p>';
  const haeuser = spiel().haeuser.filter((x) => x.stadt === stadt.stadt);
  h += K.abschnitt('Eigene Häuser in der Stadt', `${stadt.haeuserAktiv} aktiv`);
  h += haeuser.length ? K.liste(haeuser.map((x) => K.zeile({ was: esc(x.name), unter: esc(FORMAT[x.format] ?? 'Hartwig'), wert: esc(STATUS_HAUS[x.status] ?? 'unbekannt'), ton: x.status === 'offen' ? '' : 'schlecht' }))) : K.leer('Kein eigenes Haus in dieser Stadt.');
  const fuehrend = w.hartwig >= Math.max(w.volkskauf, w.fundus, w.wettbewerber);
  return {
    befund: `In ${esc(stadt.stadt)} hält Hartwig ${pz(w.hartwig, 1)} Marktanteil${fuehrend ? ' und führt den Markt' : ''}. Bekanntheit ${stadt.markenbekanntheit} von 100.`,
    html: K.rumpf(h),
  };
}

export function kanaeleAnsicht(E, spiel, ui, P) {
  const { stadt, daten } = ortDaten(E, spiel, ui);
  const k = daten.kanaele, q = E.marketingUebersicht(spiel());
  const uebrig = daten.kapazitaet.verfuegbar - daten.kapazitaet.zugeordnet;
  const region = stadt?.region;
  let oben = stadtWahl(E, spiel, ui, false);
  if (stadt) oben += '<div class="hw-abstand"></div>' + skalaGross(`Markenbekanntheit in ${stadt.stadt}`, stadt.markenbekanntheit, P(`bek:${stadt.stadt}`, `${stadt.markenbekanntheit} / 100`, 'b', ' class="hw-skala-wert"'));
  oben += K.abschnitt('Kanäle', `${k.kanaele.length} Karten, wischen`);
  const karten = k.kanaele.map((c) => {
    const [beschreibung, betreuung] = MARKETING_KANAL_INFO[c.id] ?? [c.text, 'Inhouse'];
    const team = daten.kapazitaet.teams[c.id] ?? 0;
    const max = Math.max(1, c.startBudgetWoche * 4);
    const faktor = region ? c.regionen[region] ?? 1 : 1;
    merke(P, `kn:${c.id}:woche`, geld(c.budgetWoche));
    let x = `<div class="hw-g3-kanal"><span class="hw-g3-bild">${kanalBild(c.id)}</span>`
      + `<div class="hw-karte-titel hw-g3-links">${esc(c.name)}</div><span class="hw-feldunter">${c.regional ? 'regional steuerbar' : 'bundesweit'}</span>`
      + `<p class="hw-lese hw-g3-text">${esc(beschreibung)}</p>`
      + `<div class="hw-g3-team"><div><span class="hw-marke">Verantwortlich</span><span class="hw-g3-wert">${esc(betreuung)} · Team ${P(`kn:${c.id}:team`, team, 'span')}</span></div>`
      + `<div class="hw-g3-teamknoepfe">${K.knopf('−1', `data-a="teamAendern" data-k="${esc(c.id)}" data-v="-1" aria-label="${esc(c.name)}: Team minus eins"`, 'zweit', !team)}${K.knopf('+1', `data-a="teamAendern" data-k="${esc(c.id)}" data-v="1" aria-label="${esc(c.name)}: Team plus eins"`, 'zweit', uebrig <= 0)}</div></div>`
      + K.feld('Wochenbudget', K.stepper({ wert: geld(c.budgetWoche), unter: `Standard ${geld(c.startBudgetWoche)}`, label: `Wochenbudget ${c.name}`,
        attrMinus: `data-a="kanalBudget" data-k="${esc(c.id)}" data-v="-1"`, attrPlus: `data-a="kanalBudget" data-k="${esc(c.id)}" data-v="1"`, minusAus: c.budgetWoche <= 0, plusAus: c.budgetWoche * 1.1 > max }));
    if (c.regional && region) x += K.feld(`Ausspielung Region ${region}`, K.stepper({ wert: `${dez(faktor, 1)} ×`, unter: '0 × bis 3 ×', label: `Regionale Ausspielung ${c.name}`,
      attrMinus: `data-a="kanalRegion" data-k="${esc(c.id)}" data-region="${esc(region)}" data-v="-1"`, attrPlus: `data-a="kanalRegion" data-k="${esc(c.id)}" data-region="${esc(region)}" data-v="1"`, minusAus: faktor <= 0, plusAus: faktor >= 3 }));
    else x += '<p class="hw-lese hw-g3-leise">Bundesweite Kanalsteuerung</p>';
    return x + '</div>';
  });
  let unten = K.abschnitt('Werbebudget', 'konzernweit');
  unten += K.gross([{ label: 'Kanäle je Woche', wert: merke(P, 'kn:summe', geld(k.summeWoche)), p: 'kn:summe' }, { label: 'Werbequote netto', wert: merke(P, 'kn:netto', pz(q.werbequoteNetto, 1)), p: 'kn:netto' }]);
  unten += `<p class="hw-lese hw-g3-notiz">Zugeordnete Marketing-FTE: ${P('kn:teamSum', daten.kapazitaet.zugeordnet, 'span')} von ${P('kn:fte', daten.kapazitaet.verfuegbar, 'span')}. Die Teamzuordnung ist organisatorisch; die Wirkung folgt aus Kanalbudgets und Marketingabteilung.</p>`;
  const teuer = [...k.kanaele].sort((a, b) => b.budgetWoche - a.budgetWoche)[0];
  return {
    befund: `Die Kanäle kosten ${geld(k.summeWoche)} je Woche.${teuer ? ` Größter Posten: ${esc(teuer.name)}.` : ''}`,
    html: K.rumpf(oben) + K.karussell(karten, { label: 'Marketingkanäle' }) + K.rumpf(unten),
  };
}
