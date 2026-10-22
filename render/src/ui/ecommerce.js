// O09 E-Commerce: Panel hartwig.de, ausschließlich Engine-Abfragen und SpielerAktion.
import { geld, fmt, esc, clusterName } from './format.js';
import { itProdukteKarten } from './it-produkte.js';

const prozent = (x, n = 1) => (100 * (x || 0)).toFixed(n).replace('.', ',') + ' %';
const zahl = (titel, wert, ton = '') => '<div class="kz ' + ton + '"><span>' + titel + '</span><b>' + wert + '</b></div>';
const zeile = (label, detail, aktion) => '<div class="zeile"><span class="was"><b>' + esc(label) +
  '</b><i>' + esc(detail) + '</i></span>' + aktion + '</div>';
const schalter = (akt, wert, parameter = '') => '<button class="mini ' + (wert ? 'gruen' : '') +
  '" data-online="' + akt + '" ' + parameter + '>' + (wert ? 'Ein' : 'Aus') + '</button>';

export function ecommerceModul(ctx) {
  let offen = false, tab = 'uebersicht';
  const state = () => ctx.E.ecommerceUebersicht(ctx.s());
  function anzeigen(behalten = false) {
    if (!offen) return;
    const u = state(), vorher = behalten ? document.getElementById('pinhalt').scrollTop : 0;
    let h = '<div class="tabs">' + [['uebersicht', 'Kennzahlen'], ['steuerung', 'Steuerung'], ['haeuser', 'Häuser'], ['produkte', 'IT-Produkte']]
      .map(([id, name]) => '<button class="tab ' + (tab === id ? 'an' : '') +
        '" data-online="tab" data-wert="' + id + '">' + name + '</button>').join('') + '</div>';
    if (tab === 'produkte') {
      h += itProdukteKarten(ctx.E.itProdukte(ctx.s()), 'online');
    } else if (tab === 'uebersicht') {
      h += '<div class="raster">' + zahl('Onlineumsatz Woche', geld(u.umsatz)) +
        zahl('Anteil Konzernumsatz', prozent(u.anteil)) +
        zahl('Online-Conversion', prozent(u.conversion, 2)) +
        zahl('Retourenquote', prozent(u.retourenquote)) +
        zahl('Kosten je Bestellung', geld(u.kostenJeBestellung)) +
        zahl('Deckungsbeitrag online', geld(u.deckungsbeitrag), u.deckungsbeitrag < 0 ? 'rot' : 'gruen') +
        zahl('Click & Collect', prozent(u.clickCollectAnteil)) +
        zahl('Bestellungen', fmt.format(u.bestellungen)) + '</div>';
      h += '<div class="karte"><div class="khead">Umsatzbrücke: Effekt Online</div>' +
        zeile('Onlinewachstum gegenüber Basis', geld(u.umsatz - u.basis), '') +
        zeile('Kannibalisierung in den Häusern', '−' + geld(u.kannibalisierung), '') +
        zeile('Gesamteffekt Konzernumsatz', geld(u.onlineEffekt), '') +
        '<div class="zeile grau">Die Ausgangsbasis von 8 % ist bereits im bisherigen Konzernumsatz enthalten und wird nicht nochmals addiert.</div></div>';
      h += '<div class="karte"><div class="khead">Onlineumsatz der letzten Wochen</div>';
      const max = Math.max(1, ...u.verlauf.map((q) => q.umsatz));
      h += '<div class="online-verlauf">' + u.verlauf.slice(-26).map((q) =>
        '<div class="online-balken" style="height:' + Math.max(2, 100 * q.umsatz / max) +
        '%" title="KW ' + ((q.woche % 52) + 1) + ': ' + geld(q.umsatz) + '"></div>').join('') + '</div>';
      h += '<div class="zeile grau">Basis: Umsatzanteil stationär und online ohne Doppelzählung</div></div>';
      h += '<div class="karte"><div class="khead">Warengruppen online</div>' +
        Object.entries(u.umsatzJeGruppe).sort((a, b) => b[1] - a[1]).map(([g, umsatz]) =>
          zeile(ctx.E.GRUPPEN[g]?.name ?? g, geld(umsatz), '')).join('') + '</div>';
    } else if (tab === 'steuerung') {
      const optionen = (id, werte, aktuell, format) => '<div class="zeile"><span class="was">' +
        id + '</span><select class="ort" data-online="strategie" data-feld="' + format + '">' +
        werte.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(aktuell) ? ' selected' : '') + '>' + t + '</option>').join('') +
        '</select></div>';
      h += '<div class="karte"><div class="khead">Online-Sortiment und Service</div>';
      h += optionen('Sortimentsbreite', [[0.45, '45 %'], [0.65, '65 %'], [0.8, '80 %'], [1, '100 %']], u.sortimentsbreite, 'sortimentsbreite');
      h += optionen('Verfügbarkeit', [[0.7, '70 %'], [0.88, '88 %'], [0.95, '95 %'], [1, '100 %']], u.verfuegbarkeit, 'verfuegbarkeit');
      h += optionen('Lieferzeit', [[1, '1 Tag'], [2, '2 Tage'], [3, '3 Tage'], [5, '5 Tage'], [7, '7 Tage']], u.lieferTage, 'lieferTage');
      h += optionen('Preisniveau', [[0.9, '−10 %'], [1, 'Standard'], [1.1, '+10 %'], [1.2, '+20 %']], u.preisFaktor, 'preisFaktor');
      h += zeile('Click & Collect', 'Abholung nur in Häusern mit Abholstation', schalter('collect', u.clickCollect)) + '</div>';
      h += '<div class="karte"><div class="khead">Fulfillment</div>' +
        zeile('Aktuelles Modell', u.fulfillment === 'eigen' ? 'Eigenes Lager, niedrigere Paketkosten und Fixkosten' : 'Dienstleister, variable Paketkosten', '');
      if (u.projekt) h += zeile('Projekt in Umsetzung', (u.projekt.modell === 'eigen' ? 'Eigenes Lager' : 'Dienstleister') +
        ' ab KW ' + ((u.projekt.bis % 52) + 1) + ' · Investition ' + geld(u.projekt.investition), '');
      else h += '<div class="zeile"><button class="mini gruen" data-online="fulfillment" data-wert="' +
        (u.fulfillment === 'eigen' ? 'dienstleister' : 'eigen') + '">' +
        (u.fulfillment === 'eigen' ? 'Zum Dienstleister wechseln' : 'Eigenes Lager bauen') + '</button></div>';
      h += '</div><div class="karte"><div class="khead">Versand aus dem Haus je Hauscluster</div>';
      for (const c of u.cluster) h += zeile(clusterName(ctx.s(), c.id), c.haeuser + ' Häuser', schalter('cluster', c.aktiv, 'data-id="' + esc(c.id) + '"'));
      h += '</div>';
    } else {
      h += '<div class="karte"><div class="khead">Abholstationen und Filiallogistik</div>';
      for (const a of u.haeuser) h += '<div class="abt"><div class="zeile"><span class="was"><b>' +
        esc(a.name) + '</b><i>' + esc(a.stadt) + ' · ' + esc(clusterName(ctx.s(), a.cluster)) + '</i></span>' +
        schalter('station', a.station, 'data-id="' + esc(a.id) + '"') + '</div>' +
        '<div class="zeile unter">Abholungen ' + fmt.format(a.abholungen) +
        ' · Versand ' + fmt.format(a.versand) + ' · Retouren ' + fmt.format(a.retouren) +
        ' · ' + a.instoreStunden.toFixed(1).replace('.', ',') + ' Logistikstunden ' +
        schalter('retouren', a.retourenAn, 'data-id="' + esc(a.id) + '"' + (a.station ? '' : ' disabled')) + '</div></div>';
      h += '</div>';
    }
    ctx.panel('Online', 'hartwig.de · E-Commerce', h, 'gross');
    offen = true; // Das gemeinsame Panel schließt zunächst die übrigen Module.
    document.getElementById('pinhalt').scrollTop = vorher;
  }
  function tun(a) {
    const r = ctx.E.fuehreAus(ctx.s(), a);
    ctx.meldung(r.text, r.ok);
    if (r.ok) { ctx.nachAktion(); anzeigen(true); }
    return r;
  }
  const panel = document.getElementById('pinhalt');
  panel.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-online]');
    if (!offen || !b || !panel.contains(b) || b.tagName === 'SELECT') return;
    const id = b.dataset.id, typ = b.dataset.online;
    if (typ === 'tab') { tab = b.dataset.wert; anzeigen(); }
    else if (typ === 'produkt') ctx.oeffneItProdukt?.(b.dataset.id);
    else if (typ === 'collect') tun({ typ: 'onlineClickCollect', an: !state().clickCollect });
    else if (typ === 'cluster') { const x = state().cluster.find((c) => c.id === id); if (x) tun({ typ: 'onlineVersandCluster', cluster: id, an: !x.aktiv }); }
    else if (typ === 'station') { const x = state().haeuser.find((h) => h.id === id); if (x) tun({ typ: 'onlineAbholstation', haus: id, an: !x.station }); }
    else if (typ === 'retouren') { const x = state().haeuser.find((h) => h.id === id); if (x) tun({ typ: 'onlineRetourenHaus', haus: id, an: !x.retourenAn }); }
    else if (typ === 'fulfillment') tun({ typ: 'onlineFulfillment', modell: b.dataset.wert });
  });
  panel.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!offen || el.dataset.online !== 'strategie') return;
    tun({ typ: 'onlineStrategie', [el.dataset.feld]: Number(el.value) });
  });
  return { oeffne: (seite = 'uebersicht') => { offen = true; tab = seite; anzeigen(); },
    neuZeichnen: () => anzeigen(true), aktiv: () => offen, zu: () => { offen = false; } };
}
