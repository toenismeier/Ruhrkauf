// O09 E-Commerce: Panel hartwig.de, ausschließlich Engine-Abfragen und SpielerAktion.
import { geld, fmt, esc, clusterName } from './format.js';
import { itProdukteKarten } from './it-produkte.js';
import { bereich } from './komponenten.js';

const prozent = (x, n = 1) => (100 * (x || 0)).toFixed(n).replace('.', ',') + ' %';
const zahl = (titel, wert, ton = '') => '<div class="kz ' + ton + '"><span>' + titel + '</span><b>' + wert + '</b></div>';
const zeile = (label, detail, aktion) => '<div class="zeile"><span class="was"><b>' + esc(label) +
  '</b><i>' + esc(detail) + '</i></span>' + aktion + '</div>';
const schalter = (akt, wert, parameter = '') => '<button class="mini ' + (wert ? 'gruen' : '') +
  '" data-online="' + akt + '" ' + parameter + '>' + (wert ? 'Ein' : 'Aus') + '</button>';

const knopfText = (akt, an, text, id) => '<button class="mini' + (an ? ' q-an-knopf' : '') + '" data-online="' + akt + '" data-id="' + esc(id) + '" aria-pressed="' + !!an + '">' + text + '</button>';

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
      // Q31 Paketschein. Hauptfrage: Verdient hartwig.de diese Woche Geld? Größter Block = Deckungsbeitrag online,
      // darunter die Umsatzbrücke mit Summenstrich (Zeilen ergeben den Gesamteffekt) und der Verlauf.
      const wachstum = u.umsatz - u.basis, mitkauf = u.onlineEffekt - wachstum + u.kannibalisierung;
      const vz = (x) => (x < 0 ? '−' : x > 0 ? '+' : '') + geld(Math.abs(x));
      h += '<div class="q31">';
      h += '<div class="q-gross"><span class="q-label">Deckungsbeitrag online</span><span class="q-haupt ' + (u.deckungsbeitrag < 0 ? 'q-minus' : '') + '">' + geld(u.deckungsbeitrag) + '</span><span class="q-neben"><b>' + geld(u.umsatz) + '</b>Onlineumsatz Woche</span></div>';
      h += '<div class="q-befund">' + (u.bestellungen ? (u.deckungsbeitrag < 0 ? '<b class="q-minus">hartwig.de verliert Geld.</b> ' : '') + '<b>' + fmt.format(u.bestellungen) + '</b> Bestellungen zu je <b>' + geld(u.kostenJeBestellung) + '</b> Kosten, ' + prozent(u.retourenquote) + ' gehen zurück.' : 'Diese Woche gab es keine Onlinebestellung.') + '</div>';
      h += '<div class="q-buch q-paketschein"><div class="q-buch-kopf"><span>Paketschein KW ' + ((ctx.s().woche % 52) + 1) + '</span><b>hartwig.de</b></div>' +
        '<div class="q-zeile"><span class="q-name">Anteil am Konzernumsatz</span><span class="q-wert">' + prozent(u.anteil) + '</span></div>' +
        '<div class="q-zeile"><span class="q-name">Online-Conversion</span><span class="q-wert">' + prozent(u.conversion, 2) + '</span></div>' +
        '<div class="q-zeile"><span class="q-name">Retourenquote</span><span class="q-wert">' + prozent(u.retourenquote) + '</span></div>' +
        '<div class="q-zeile"><span class="q-name">Click & Collect<small>Anteil der Bestellungen</small></span><span class="q-wert">' + prozent(u.clickCollectAnteil) + '</span></div></div>';
      h += '<div class="q-buch"><div class="q-buch-kopf"><span>Umsatzbrücke Online</span><b>Woche</b></div>' +
        '<div class="q-zeile"><span class="q-name">Onlinewachstum gegenüber Basis<small>Basis 8 % ist im Konzernumsatz schon enthalten</small></span><span class="q-wert">' + vz(wachstum) + '</span></div>' +
        '<div class="q-zeile"><span class="q-name">Mitkäufe bei Abholung im Haus</span><span class="q-wert">' + vz(mitkauf) + '</span></div>' +
        '<div class="q-zeile"><span class="q-name">Kannibalisierung in den Häusern</span><span class="q-wert">' + vz(-u.kannibalisierung) + '</span></div>' +
        '<div class="q-summe"><span>Effekt auf den Konzernumsatz</span><span class="q-wert ' + (u.onlineEffekt < 0 ? 'q-minus' : '') + '">' + vz(u.onlineEffekt) + '</span></div></div>';
      const v = u.verlauf.slice(-26);
      if (v.length < 2) h += '<div class="q-buch"><div class="q-leer">Ein Verlauf ist ab der zweiten Woche verfügbar.</div></div>';
      else {
        const max = Math.max(1, ...v.map((q) => q.umsatz));
        h += '<div class="q-buch"><div class="q-buch-kopf"><span>Onlineumsatz</span><b>' + v.length + ' Wochen</b></div><div class="online-verlauf" style="padding:8px 14px 0">' + v.map((q) =>
          '<div class="online-balken" style="height:' + Math.max(2, 100 * q.umsatz / max) + '%" title="KW ' + ((q.woche % 52) + 1) + ': ' + geld(q.umsatz) + '"></div>').join('') + '</div>' +
          '<div class="q-zwischen" style="border:0"><span>KW ' + ((v[0].woche % 52) + 1) + '</span><span>KW ' + ((v[v.length - 1].woche % 52) + 1) + '</span></div></div>';
      }
      const gr = Object.entries(u.umsatzJeGruppe).sort((a, b) => b[1] - a[1]);
      h += '<div class="q-buch"><div class="q-buch-kopf"><span>Warengruppen online</span><b>Umsatz</b></div>' +
        (gr.length ? gr.map(([g, umsatz]) => '<div class="q-zeile"><span class="q-name">' + esc(ctx.E.GRUPPEN[g]?.name ?? g) + '</span><span class="q-wert">' + geld(umsatz) + '</span></div>').join('') +
        '<div class="q-summe"><span>Summe</span><span class="q-wert">' + geld(gr.reduce((a, [, x]) => a + x, 0)) + '</span></div>' : '<div class="q-leer">Noch kein Onlineumsatz.</div>') + '</div>';
      h += '</div>';
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
      // Q31: Abholstationen als Liste je Haus; Werte nur, wenn eine Station läuft
      const an = u.haeuser.filter((a) => a.station).length;
      h += '<div class="q31"><div class="q-gross"><span class="q-label">Häuser mit Abholstation</span><span class="q-haupt">' + an + ' von ' + u.haeuser.length + '</span><span class="q-neben"><b>' + fmt.format(u.haeuser.reduce((s, a) => s + a.abholungen, 0)) + '</b>Abholungen Woche</span></div>';
      if (!an) h += '<div class="q-befund">Kein Haus hat eine Abholstation. Click & Collect braucht mindestens eine.</div>';
      h += '<div class="q-buch"><div class="q-buch-kopf"><span>Abholstationen</span><b>Station · Retouren</b></div>';
      for (const a of u.haeuser) h += '<div class="q-zeile"><span class="q-name">' + esc(a.name) + '<small>' + esc(a.stadt) + ' · ' + esc(clusterName(ctx.s(), a.cluster)) + '</small>' +
        (a.station ? '<small>Abholungen ' + fmt.format(a.abholungen) + ' · Versand ' + fmt.format(a.versand) + ' · Retouren ' + fmt.format(a.retouren) + ' · ' + a.instoreStunden.toFixed(1).replace('.', ',') + ' Logistikstunden</small>' : '') +
        '</span><span class="q-knoepfe" style="grid-column:auto;padding:0">' + knopfText('station', a.station, a.station ? 'Station an' : 'Station einrichten', a.id) +
        (a.station ? knopfText('retouren', a.retourenAn, a.retourenAn ? 'Retouren an' : 'Retouren aus', a.id) : '') + '</span></div>';
      h += '</div></div>';
    }
    ctx.panel('Online', 'hartwig.de · E-Commerce', bereich('zentrale') + '<i class="q31-marke" hidden></i>' + h, 'gross');
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
