// Q07: Anzeige auf Engine-Aggregaten, ohne eigene Haus- oder Sammelaktionslogik.
import { esc, geld } from './format.js';
const pz = (v) => v == null ? '—' : (100 * v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
const n = (v) => Number(v || 0).toLocaleString('de-DE');
const FORMATE = [['alle', 'Alle'], ['warenhaus', 'Warenhaus'], ['schwester', 'Volkskauf'],
  ['sport', 'Sport'], ['outlet', 'FUNDUS']];
const PERIODEN = [['woche', 'Woche'], ['vier', '4 Wochen'], ['monat', 'Monat'], ['quartal', 'Quartal'], ['ytd', 'YTD']];
export function vertriebModul(ctx) {
  const ui = { ebene: 'alle', id: undefined, format: 'alle', zeitraum: 'woche', sort: 'schlecht' };
  const optionen = (key, values) => '<select data-vtr-wahl="' + key + '" aria-label="' + key + '">' +
    values.map(([value, text]) => '<option value="' + esc(value) + '"' +
      (value === ui[key] ? ' selected' : '') + '>' + esc(text) + '</option>').join('') + '</select>';
  const kpi = (titel, wert, hinweis = '') => '<div class="vtr-kpi"><small>' + esc(titel) + '</small><strong>' +
    esc(wert) + '</strong><small>' + esc(hinweis) + '</small></div>';
  function zeile(z, aktion = false) {
    const vj = z.abweichung === undefined ? 'Vorjahr noch nicht verfügbar' :
      (z.abweichung >= 0 ? '+' : '') + geld(z.abweichung) + ' / ' + pz(z.abweichungProzent);
    const knopf = aktion ? '<button data-vtr="tiefer" data-ebene="' + z.ebene + '" data-id="' +
      esc(z.id) + '" aria-label="' + esc(z.name) + ' öffnen">' : '<div>';
    return '<div class="vtr-zeile">' + knopf + '<b>' + esc(z.name) + '</b><small>' +
      esc(z.stadt ? z.stadt + ' · ' : '') + n(z.anzahl) + ' Häuser' +
      (z.nurDaten ? ' · noch ohne Wirtschaft' : '') + '</small>' +
      (aktion ? '</button>' : '</div>') + '<div class="vtr-zahlen">' +
      '<span><b>' + geld(z.umsatz) + '</b><small>Umsatz</small></span>' +
      '<span><b>' + pz(z.ebitdaQuote) + '</b><small>Haus-DB-Quote</small></span>' +
      '<span><b>' + esc(vj) + '</b><small>Vorjahr</small></span>' +
      '<span class="vtr-ampel ' + z.ampel + '">' +
      (z.ampel === 'rot' ? 'Schwach' : z.ampel === 'gruen' ? 'Gut' : z.ampel === 'gelb' ? 'Beobachten' : 'Ohne Daten') +
      '</span></div><details class="vtr-details"><summary>Weitere Kennzahlen</summary>' +
      '<div>Umsatz YTD: ' + geld(z.umsatzYtd) +
      ' · Haus-DB: ' + geld(z.ebitda) + ' (VJ ' + (z.vorjahrEbitda === undefined ? '—' : geld(z.vorjahrEbitda)) + ')' +
      ' · Marge VJ: ' + pz(z.vorjahrEbitdaQuote) +
      ' · Planabweichung: ' + pz(z.planAbweichung) +
      ' · Frequenz: ' + n(z.frequenz) + ' · Kaufquote: ' + pz(z.kaufquote) +
      ' · Bon: ' + geld(z.bon) + ' · Personalquote: ' + pz(z.personalquote) +
      ' · Mietquote: ' + pz(z.mietquote) + '</div></details></div>';
  }
  function darstellen() {
    const d = ctx.E.vertriebUebersicht(ctx.s(), ui);
    let h = '<div class="vtr-filter">' +
      '<label>Format ' + optionen('format', FORMATE) + '</label>' +
      '<label>Zeitraum ' + optionen('zeitraum', PERIODEN) + '</label>' +
      '<label>Sortierung ' + optionen('sort', [['schlecht','Schwächste zuerst'],['gut','Stärkste zuerst'],['umsatz','Umsatz absteigend']]) + '</label></div>';
    h += '<div class="vtr-pfad"><button data-vtr="oben" data-ebene="alle">Alle Regionen</button>';
    if (ui.ebene !== 'alle') {
      const haus = ctx.s().haeuser.find((x) => x.id === ui.id || x.hauscluster === ui.id);
      const region = ui.ebene === 'region' ? ui.id : haus?.region;
      if (region) h += ' › <button data-vtr="oben" data-ebene="region" data-id="' + esc(region) +
        '">Region ' + esc(region) + '</button>';
    }
    h += '</div><h3>' + esc(d.titel) + '</h3>' +
      '<p class="vtr-hinweis">Haus-DB als EBITDA-Näherung · Vorjahr: 52 simulierte Wochen, anschließend Ist-Werte. Ohne Wirtschaft keine fingierten Ergebnisse.</p>';
    const typ = ui.ebene === 'hauscluster' ? 'Cluster' : ui.ebene === 'region' ? 'Region' : 'Vergleichsgruppe';
    const mittel = d.gesamt.anzahl ? geld(d.gesamt.umsatz / d.gesamt.anzahl) : '—';
    h += '<p class="vtr-hinweis">' + typ + '-Durchschnitt je Haus: ' + mittel +
      ' Umsatz im gewählten Zeitraum.</p>';
    h += '<div class="vtr-kennzahlen">' +
      kpi('Umsatz', geld(d.gesamt.umsatz), 'YTD ' + geld(d.gesamt.umsatzYtd)) +
      kpi('Vorjahr', d.gesamt.vorjahr === undefined ? 'Noch nicht verfügbar' : geld(d.gesamt.vorjahr),
        d.gesamt.abweichung === undefined ? '' : (d.gesamt.abweichung >= 0 ? '+' : '') + geld(d.gesamt.abweichung) + ' / ' + pz(d.gesamt.abweichungProzent)) +
      kpi('Haus-DB', geld(d.gesamt.ebitda), pz(d.gesamt.ebitdaQuote) + ' · Vorjahr ' + pz(d.gesamt.vorjahrEbitdaQuote)) +
      kpi('Plan (O06)', geld(d.gesamt.plan), 'Abweichung ' + pz(d.gesamt.planAbweichung)) +
      kpi('Frequenz', n(d.gesamt.frequenz), 'Kaufquote ' + pz(d.gesamt.kaufquote)) +
      kpi('Durchschnittsbon', geld(d.gesamt.bon), 'Personal ' + pz(d.gesamt.personalquote) + ' · Miete ' + pz(d.gesamt.mietquote)) +
      '</div><h4>Formate</h4><div class="vtr-liste">' + d.formate.filter((z) => ui.format === 'alle' || z.format === ui.format)
        .map((z) => zeile(z)).join('') + '</div>';
    let sortiert = [...d.zeilen];
    if (ui.sort === 'umsatz') sortiert.sort((a,b) => b.umsatz - a.umsatz || a.name.localeCompare(b.name,'de'));
    if (ui.sort === 'gut') sortiert.sort((a,b) => (b.abweichungProzent ?? -Infinity) - (a.abweichungProzent ?? -Infinity));
    h += '<h4>' + (ui.ebene === 'alle' ? 'Regionen' : ui.ebene === 'region' ? 'Hauscluster' : 'Häuser') +
      ' · ' + sortiert.length + '</h4><div class="vtr-liste">' +
      (sortiert.length ? sortiert.map((z) => zeile(z, true)).join('') : '<p>Keine Standorte im Filter.</p>') +
      '</div><button class="vtr-portfolio" data-vtr="portfolio">Portfolio und Sammelaktionen öffnen</button>';
    return h;
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
  function wahl(el) { if (!['format','zeitraum','sort'].includes(el.dataset.vtrWahl)) return false;
    ui[el.dataset.vtrWahl] = el.value; return true; }
  return { darstellen, klick, wahl, ui };
}
