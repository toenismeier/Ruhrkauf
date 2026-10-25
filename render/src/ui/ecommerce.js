// O09 E-Commerce (E47 nach Coffee 12, 22): Panel hartwig.de, ausschließlich Engine-Abfragen und SpielerAktion.
import { geld, fmt, esc, clusterName } from './format.js';
import * as K from './komponenten.js';
import { itProdukteKarten } from './it-produkte.js';
import { digitalSprecher } from './it.js';

const prozent = (x, n = 1) => (100 * (x || 0)).toFixed(n).replace('.', ',') + ' %';
const vz = (x) => (x < 0 ? '−' : x > 0 ? '+' : '') + geld(Math.abs(x));
const REITER = [['uebersicht', 'Zahlen', 'reporting'], ['steuerung', 'Steuerung', 'online'], ['haeuser', 'Häuser', 'haus'], ['produkte', 'Produkte', 'allokation']];
const STUFEN = {
  sortimentsbreite: ['Sortimentsbreite', [[0.45, '45 %'], [0.65, '65 %'], [0.8, '80 %'], [1, '100 %']]],
  verfuegbarkeit: ['Verfügbarkeit', [[0.7, '70 %'], [0.88, '88 %'], [0.95, '95 %'], [1, '100 %']]],
  lieferTage: ['Lieferzeit', [[1, '1 Tag'], [2, '2 Tage'], [3, '3 Tage'], [5, '5 Tage'], [7, '7 Tage']]],
  preisFaktor: ['Preisniveau', [[0.9, '−10 %'], [1, 'Standard'], [1.1, '+10 %'], [1.2, '+20 %']]],
};

export function ecommerceModul(ctx) {
  let offen = false, tab = 'uebersicht';
  const state = () => ctx.E.ecommerceUebersicht(ctx.s());

  function uebersicht(u) {
    // Hauptfrage: Verdient hartwig.de diese Woche Geld? Oben Deckungsbeitrag und Umsatz, dann Verlauf, Paketschein und Umsatzbrücke.
    const wachstum = u.umsatz - u.basis, mitkauf = u.onlineEffekt - wachstum + u.kannibalisierung;
    const v = u.verlauf, vor = v.length > 1 ? v[v.length - 2] : null;
    let h = K.gross([
      { label: 'Deckungsbeitrag online', wert: geld(u.deckungsbeitrag), ton: u.deckungsbeitrag < 0 ? 'schlecht' : 'gut', unter: vor ? K.abweichung(u.deckungsbeitrag - vor.deckungsbeitrag, vz(u.deckungsbeitrag - vor.deckungsbeitrag)) : 'erste Woche' },
      { label: 'Onlineumsatz Woche', wert: geld(u.umsatz), unter: vor ? K.abweichung(u.umsatz - vor.umsatz, vz(u.umsatz - vor.umsatz), vor.umsatz ? (u.umsatz - vor.umsatz) / vor.umsatz : null) : 'erste Woche' },
    ]);
    const letzte = v.slice(-5);
    h += K.abschnitt('Umsatz und Deckungsbeitrag', letzte.length ? `KW ${(((letzte[0].woche % 52) + 52) % 52) + 1} bis ${(((letzte[letzte.length - 1].woche % 52) + 52) % 52) + 1}` : '');
    h += K.balken(letzte.map((q) => ({ label: 'KW ' + ((((q.woche % 52) + 52) % 52) + 1), a: q.umsatz, b: q.deckungsbeitrag })), ['Umsatz', 'Deckungsbeitrag']);
    h += K.abschnitt(`Paketschein KW ${(((ctx.s().woche % 52) + 52) % 52) + 1}`, 'hartwig.de');
    h += K.liste([
      K.zeile({ was: 'Bestellungen', wert: fmt.format(u.bestellungen) }),
      K.zeile({ was: 'Kosten je Bestellung', wert: geld(u.kostenJeBestellung) }),
      K.zeile({ was: 'Anteil am Konzernumsatz', wert: prozent(u.anteil) }),
      K.zeile({ was: 'Online-Conversion', wert: prozent(u.conversion, 2) }),
      K.zeile({ was: 'Retourenquote', wert: prozent(u.retourenquote), ton: u.retourenquote > 0.4 ? 'schlecht' : '' }),
      K.zeile({ was: 'Click & Collect', unter: 'Anteil der Bestellungen', wert: prozent(u.clickCollectAnteil) }),
    ]);
    const summe = (was, html) => K.zeile({ was, wert: html }).replace('class="hw-zeile"', 'class="hw-zeile hw-g3-summe"');
    h += K.abschnitt('Umsatzbrücke online', 'Woche');
    h += `<div data-summenbuch="Umsatzbrücke Online">${K.liste([
      K.zeile({ was: 'Onlinewachstum gegenüber Basis', unter: 'Basis 8 % ist im Konzernumsatz schon enthalten', wert: `<span data-s="e">${vz(wachstum)}</span>` }),
      K.zeile({ was: 'Mitkäufe bei Abholung im Haus', wert: `<span data-s="e">${vz(mitkauf)}</span>` }),
      K.zeile({ was: 'Kannibalisierung in den Häusern', wert: `<span data-s="e">${vz(-u.kannibalisierung)}</span>` }),
      summe('Effekt auf den Konzernumsatz', `<span data-summe="e" class="${u.onlineEffekt < 0 ? 'hw-schlecht' : ''}">${vz(u.onlineEffekt)}</span>`),
    ])}</div>`;
    const gr = Object.entries(u.umsatzJeGruppe).sort((a, b) => b[1] - a[1]);
    h += K.abschnitt('Warengruppen online', 'Umsatz');
    h += gr.length ? `<div data-summenbuch="Warengruppen online">${K.liste([
      ...gr.map(([g, x]) => K.zeile({ was: esc(ctx.E.GRUPPEN[g]?.name ?? g), wert: `<span data-s="u">${geld(x)}</span>` })),
      summe('Summe', `<span data-summe="u">${geld(gr.reduce((a, [, x]) => a + x, 0))}</span>`),
    ])}</div>` : K.leer('Der Onlineshop hat noch keinen Umsatz gebucht.', 'Noch kein Onlineumsatz.', '', 'online');
    const befund = !u.bestellungen ? 'Diese Woche gab es keine Onlinebestellung.'
      : u.deckungsbeitrag < 0 ? `hartwig.de verliert ${geld(-u.deckungsbeitrag)} diese Woche. ${prozent(u.retourenquote)} der Ware kommt zurück.`
        : `hartwig.de verdient ${geld(u.deckungsbeitrag)} bei ${fmt.format(u.bestellungen)} Bestellungen.`;
    return { befund, ton: u.deckungsbeitrag < 0 ? 'alarm' : '', html: K.rumpf(h) };
  }

  function steuerung(u) {
    let h = K.abschnitt('Online-Sortiment und Service');
    h += Object.entries(STUFEN).map(([feld, [name, stufen]]) => {
      const i = stufen.findIndex(([v]) => String(v) === String(u[feld]));
      return K.feld(name, K.stepper({ wert: stufen[i]?.[1] ?? String(u[feld]), label: name, attrMinus: `data-online="stufe" data-feld="${feld}" data-wert="-1"`, attrPlus: `data-online="stufe" data-feld="${feld}" data-wert="1"`, minusAus: i <= 0, plusAus: i < 0 || i >= stufen.length - 1 }));
    }).join('<div class="hw-abstand"></div>');
    h += K.schalter({ text: 'Click & Collect', unter: 'Abholung nur in Häusern mit Abholstation', an: u.clickCollect, attr: 'data-online="collect"' });
    h += K.abschnitt('Fulfillment');
    h += K.liste([K.zeile({ was: 'Aktuelles Modell', unter: u.fulfillment === 'eigen' ? 'niedrigere Paketkosten, höhere Fixkosten' : 'variable Paketkosten', wert: u.fulfillment === 'eigen' ? 'Eigenes Lager' : 'Dienstleister' })]);
    if (u.projekt) h += K.hinweis(`Umstellung auf ${u.projekt.modell === 'eigen' ? 'eigenes Lager' : 'Dienstleister'} ab KW ${(((u.projekt.bis % 52) + 52) % 52) + 1} · Investition ${geld(u.projekt.investition)}`);
    else h += K.knoepfe(K.knopf(u.fulfillment === 'eigen' ? 'Zum Dienstleister wechseln' : 'Eigenes Lager bauen', `data-online="fulfillment" data-wert="${u.fulfillment === 'eigen' ? 'dienstleister' : 'eigen'}"`, 'breit'));
    const an = u.cluster.filter((c) => c.aktiv).length;
    h += K.abschnitt('Versand aus dem Haus', `${an} von ${u.cluster.length} Clustern`);
    h += K.liste(u.cluster.map((c) => K.schalter({ text: clusterName(ctx.s(), c.id), unter: `${c.haeuser} Häuser`, an: c.aktiv, attr: `data-online="cluster" data-id="${esc(c.id)}"` })));
    return { befund: `Lieferzeit ${STUFEN.lieferTage[1].find(([v]) => v === u.lieferTage)?.[1] ?? u.lieferTage + ' Tage'}, Versand aus ${an} von ${u.cluster.length} Clustern.`, html: K.rumpf(h) };
  }

  function haeuser(u) {
    const an = u.haeuser.filter((a) => a.station).length;
    let h = K.gross([{ label: 'Häuser mit Abholstation', wert: `${an} von ${u.haeuser.length}` }, { label: 'Abholungen Woche', wert: fmt.format(u.haeuser.reduce((x, a) => x + a.abholungen, 0)) }]);
    if (!an) h += K.hinweis('Kein Haus hat eine Abholstation. Click & Collect braucht mindestens eine.', 'achtung');
    h += K.abschnitt('Abholstationen', 'Station · Retouren');
    h += K.liste(u.haeuser.map((a) => `<div class="hw-zeile hw-g3-haus"><span class="hw-was">${esc(a.name)}<small>${esc(a.stadt)} · ${esc(clusterName(ctx.s(), a.cluster))}</small>`
      + (a.station ? `<small>Abholungen ${fmt.format(a.abholungen)} · Versand ${fmt.format(a.versand)} · Retouren ${fmt.format(a.retouren)} · ${a.instoreStunden.toFixed(1).replace('.', ',')} Logistikstunden</small>` : '') + '</span>'
      + `<span class="hw-g3-teamknoepfe">${a.station ? K.knopf(a.retourenAn ? 'Retouren an' : 'Retouren aus', `data-online="retouren" data-id="${esc(a.id)}" aria-pressed="${!!a.retourenAn}"`, 'zweit') + K.marke('Station', 'gut') : K.knopf('Station einrichten', `data-online="station" data-id="${esc(a.id)}"`, 'zweit')}</span></div>`));
    return { befund: an ? `${an} Häuser haben eine Abholstation.` : 'Kein Haus hat eine Abholstation.', ton: an ? '' : 'engpass', html: K.rumpf(h) };
  }

  function anzeigen(behalten = false) {
    if (!offen) return;
    const u = state(), pi = document.getElementById('pinhalt'), vorher = behalten ? pi.scrollTop : 0;
    const r = tab === 'produkte' ? { befund: 'Die Online-Kennzahlen speisen die digitalen Produkte der IT.', html: itProdukteKarten(ctx.E.itProdukte(ctx.s()), 'online') }
      : tab === 'steuerung' ? steuerung(u) : tab === 'haeuser' ? haeuser(u) : uebersicht(u);
    ctx.panel('Online', 'hartwig.de · E-Commerce', K.bereich('zentrale', 'online') + digitalSprecher(ctx.E, ctx.s(), r.befund, r.ton, 'E-Commerce') + (tab !== 'produkte' && tab !== 'steuerung' && tab !== 'haeuser' ? K.kopfbild('logistik|ecommerce') : '') + '<i class="hw-g3" hidden></i>' + r.html
      + K.reiterUnten(REITER, tab, (id) => `data-online="tab" data-wert="${id}"`), 'gross');
    offen = true; // Das gemeinsame Panel schließt zunächst die übrigen Module.
    pi.scrollTop = vorher;
  }
  function tun(a) {
    const r = ctx.E.fuehreAus(ctx.s(), a);
    ctx.meldung(r.text, r.ok);
    if (r.ok) { ctx.nachAktion(); anzeigen(true); }
    return r;
  }
  const klick = (ev) => {
    const b = ev.target.closest('[data-online]');
    if (!offen || !b || b.disabled) return;
    const id = b.dataset.id, typ = b.dataset.online;
    if (typ === 'tab') { tab = b.dataset.wert; anzeigen(); }
    else if (typ === 'produkt') ctx.oeffneItProdukt?.(b.dataset.id);
    else if (typ === 'collect') tun({ typ: 'onlineClickCollect', an: !state().clickCollect });
    else if (typ === 'cluster') { const x = state().cluster.find((c) => c.id === id); if (x) tun({ typ: 'onlineVersandCluster', cluster: id, an: !x.aktiv }); }
    else if (typ === 'station') { const x = state().haeuser.find((h) => h.id === id); if (x) tun({ typ: 'onlineAbholstation', haus: id, an: !x.station }); }
    else if (typ === 'retouren') { const x = state().haeuser.find((h) => h.id === id); if (x) tun({ typ: 'onlineRetourenHaus', haus: id, an: !x.retourenAn }); }
    else if (typ === 'fulfillment') tun({ typ: 'onlineFulfillment', modell: b.dataset.wert });
    else if (typ === 'stufe') {
      const feld = b.dataset.feld, stufen = STUFEN[feld][1], u = state();
      const i = stufen.findIndex(([v]) => String(v) === String(u[feld])), j = Math.max(0, Math.min(stufen.length - 1, i + Number(b.dataset.wert)));
      if (j !== i) tun({ typ: 'onlineStrategie', [feld]: stufen[j][0] });
    }
  };
  document.getElementById('pinhalt').addEventListener('click', klick);
  document.getElementById('preiter').addEventListener('click', klick);
  return { oeffne: (seite = 'uebersicht') => { offen = true; tab = seite; anzeigen(); },
    neuZeichnen: () => anzeigen(true), aktiv: () => offen, zu: () => { offen = false; } };
}
