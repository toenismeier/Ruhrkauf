// Q07: Anzeige auf Engine-Aggregaten, ohne eigene Haus- oder Sammelaktionslogik.
// E47 (G2): Vertriebssteuerung wie Coffee 21 und 25. Oben Umsatz und Haus-DB mit Abweichung zum Vorjahr, darunter die
// Kennzahlen als Tabelle, die Formate und die Standorte als Buch (antippen geht eine Ebene tiefer); Ampel als Farbe.
import { esc, geld } from './format.js';
import * as K from './komponenten.js';
import * as B from './g2-buch.js';

const pz = (v) => v == null || !Number.isFinite(v) ? 'offen' : (100 * v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace('-', '−') + ' %';
const pzV = (v) => v == null || !Number.isFinite(v) ? 'offen' : (v > 0 ? '+' : '') + pz(v);
const n = (v) => Number(v || 0).toLocaleString('de-DE');
const FORMATE = [['alle', 'Alle Formate'], ['warenhaus', 'Warenhaus'], ['schwester', 'Volkskauf'], ['sport', 'Sport'], ['outlet', 'FUNDUS']];
const PERIODEN = [['woche', 'Woche'], ['vier', '4 Wochen'], ['monat', 'Monat'], ['quartal', 'Quartal'], ['ytd', 'Jahr bis heute']];
const SORT = [['schlecht', 'Schwächste zuerst'], ['gut', 'Stärkste zuerst'], ['umsatz', 'Umsatz absteigend']];
const AMPEL = { rot: 'schlecht', gelb: 'achtung', gruen: 'gut' };
const ZEITRAUM = { woche: 'diese Woche', vier: 'in 4 Wochen', monat: 'im Monat', quartal: 'im Quartal', ytd: 'im Jahr' };

export function vertriebModul(ctx) {
  const ui = { ebene: 'alle', id: undefined, format: 'alle', zeitraum: 'woche', sort: 'schlecht' };
  const vj = (z) => (z.abweichungProzent === undefined ? 'offen' : pzV(z.abweichungProzent));
  function darstellen() {
    const d = ctx.E.vertriebUebersicht(ctx.s(), ui), g = d.gesamt;
    let h = '<div class="hw-g2-vertrieb">';
    // Pfad zurück: Alle Regionen › Region (nur unterhalb der obersten Ebene)
    if (ui.ebene !== 'alle') {
      let pfad = K.knopf('‹ Alle Regionen', 'data-vtr="oben" data-ebene="alle"', 'text');
      const haus = ctx.s().haeuser.find((x) => x.id === ui.id || x.hauscluster === ui.id);
      const region = ui.ebene === 'region' ? null : haus?.region;
      if (region) pfad += K.knopf(`‹ Region ${region}`, `data-vtr="oben" data-ebene="region" data-id="${esc(region)}"`, 'text');
      h += `<div class="hw-knoepfe">${pfad}</div>`;
    }
    h += K.abschnitt(d.titel, `Umsatz ${ZEITRAUM[ui.zeitraum] ?? ''}`);
    h += K.gross([
      { label: 'Umsatz', wert: geld(g.umsatz), unter: g.abweichung === undefined ? 'Vorjahr offen' : K.abweichung(g.abweichung, (g.abweichung >= 0 ? '+' : '') + geld(g.abweichung), g.abweichungProzent) + '<br>zum Vorjahr' },
      { label: 'Haus-DB', wert: geld(g.ebitda), ton: g.ebitda < 0 ? 'schlecht' : 'gut', unter: `${pz(g.ebitdaQuote)} vom Umsatz<br>Vorjahr ${pz(g.vorjahrEbitdaQuote)}` },
    ]);
    const typ = ui.ebene === 'hauscluster' ? 'Cluster' : ui.ebene === 'region' ? 'Region' : 'Vergleichsgruppe';
    h += '<div class="hw-abstand"></div>' + K.tabelle({ titel: 'Kennzahlen', zeilen: [
      { name: 'Vorjahr', werte: [g.vorjahr === undefined ? 'noch offen' : geld(g.vorjahr)] },
      { name: 'Plan', werte: [`${geld(g.plan)} · ${pzV(g.planAbweichung)}`], ton: [g.planAbweichung < 0 ? 'schlecht' : ''] },
      { name: 'Umsatz Jahr bis heute', werte: [geld(g.umsatzYtd)] },
      { name: `${typ}, je Haus`, werte: [g.anzahl ? geld(g.umsatz / g.anzahl) : 'offen'] },
      { name: 'Frequenz', werte: [n(g.frequenz)] },
      { name: 'Kaufquote', werte: [pz(g.kaufquote)] },
      { name: 'Durchschnittsbon', werte: [geld(g.bon)] },
      { name: 'Personalquote', werte: [pz(g.personalquote)] },
      { name: 'Mietquote', werte: [pz(g.mietquote)] },
    ] });
    h += B.fuss('Haus-DB als EBITDA-Näherung. Vorjahr: 52 simulierte Wochen, danach Ist-Werte. Ohne Wirtschaftsdaten keine erfundenen Ergebnisse.');
    h += K.abschnitt('Auswahl');
    h += B.felder(K.feld('Format', B.auswahl(FORMATE, ui.format, 'data-vtr-wahl="format"', 'Format')), K.feld('Zeitraum', B.auswahl(PERIODEN, ui.zeitraum, 'data-vtr-wahl="zeitraum"', 'Zeitraum')));
    const zeile = (z, tief) => B.reihe({
      name: esc(z.name), unter: esc((z.stadt ? z.stadt + ' · ' : '') + n(z.anzahl) + (z.anzahl === 1 ? ' Haus' : ' Häuser') + (z.nurDaten ? ' · noch ohne Wirtschaft' : '')),
      werte: [geld(z.umsatz), { t: pz(z.ebitdaQuote), ton: z.ebitdaQuote < 0 ? 'schlecht' : '' }, { t: vj(z), ton: AMPEL[z.ampel] === 'gut' ? '' : AMPEL[z.ampel] }],
      attr: tief ? `data-vtr="tiefer" data-ebene="${z.ebene}" data-id="${esc(z.id)}" aria-label="${esc(z.name)} öffnen"` : '' });
    const formate = d.formate.filter((z) => ui.format === 'alle' || z.format === ui.format);
    h += B.buch({ titel: 'Formate', spalten: ['Umsatz', 'DB', 'Vorjahr'], breite: 72, zeilen: formate.length ? formate.map((z) => zeile(z, false)) : [K.leer('Kein Format im Filter.')] });
    const sortiert = [...d.zeilen];
    if (ui.sort === 'umsatz') sortiert.sort((a, b) => b.umsatz - a.umsatz || a.name.localeCompare(b.name, 'de'));
    if (ui.sort === 'gut') sortiert.sort((a, b) => (b.abweichungProzent ?? -Infinity) - (a.abweichungProzent ?? -Infinity));
    const ebene = ui.ebene === 'alle' ? 'Regionen' : ui.ebene === 'region' ? 'Hauscluster' : 'Häuser';
    h += K.abschnitt(ebene, `${sortiert.length} · antippen für Details`);
    h += K.feld('Sortierung', B.auswahl(SORT, ui.sort, 'data-vtr-wahl="sort"', 'Sortierung'));
    h += B.buch({ titel: ebene, spalten: ['Umsatz', 'DB', 'Vorjahr'], breite: 72, zeilen: sortiert.length ? sortiert.map((z) => zeile(z, true)) : [K.leer('Keine Standorte im Filter.')] });
    h += B.fuss('DB: Haus-DB-Quote vom Umsatz. Vorjahr in Rot heißt schwach, in Gelb beobachten.');
    h += K.knoepfe(K.knopf('Portfolio und Sammelaktionen', 'data-vtr="portfolio"', 'zweit breit'));
    return h + '</div>';
  }
  function klick(el) {
    if (el.dataset.vtr === 'portfolio') { ctx.oeffnePortfolio(); return false; }
    if (el.dataset.vtr === 'oben') { ui.ebene = el.dataset.ebene; ui.id = el.dataset.id || undefined; return true; }
    if (el.dataset.vtr === 'tiefer') {
      if (el.dataset.ebene === 'haus') { ctx.oeffneHaus(el.dataset.id); return false; }
      ui.ebene = el.dataset.ebene; ui.id = el.dataset.id; return true;
    }
    return false;
  }
  function wahl(el) {
    if (!['format', 'zeitraum', 'sort'].includes(el.dataset.vtrWahl)) return false;
    ui[el.dataset.vtrWahl] = el.value; return true;
  }
  return { darstellen, klick, wahl, ui };
}
