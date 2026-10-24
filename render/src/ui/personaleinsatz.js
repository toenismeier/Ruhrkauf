// O04 Personal: alle Kennzahlen aus Engine-Abfragen, keine Simulation im Browser.
// E47 wie Coffee 30: Hauscluster und Häuser als Listen, Deckung je Gruppe als Großkennzahlen, Wochentage als Balken
// (Bedarf hell, Plan grün), Einsatz je Gruppe als Stepper (Schritt 5 %, gleiche Aktionen wie zuvor die Schieberegler).
import { esc, fmt, geld } from './format.js';
import * as K from './komponenten.js';

const GRUPPEN = ['logistik', 'verkauf', 'kasse', 'verwaltung'];
const NAME = { logistik: 'Instore-Logistik', verkauf: 'Verkauf', kasse: 'Kasse', verwaltung: 'Verwaltung' };
const KURZ = { logistik: 'Logistik', verkauf: 'Verkauf', kasse: 'Kasse', verwaltung: 'Verwaltung' };
const pct = (n) => Math.round(n * 100) + ' %';
const ton = (n) => n < 0.85 ? 'schlecht' : n < 0.98 ? 'achtung' : '';
const steuer = (a, opts = {}) =>
  Object.entries({ 'data-pe': a, ...opts }).map(([k, v]) => k + '="' + esc(String(v)) + '"').join(' ');

export function personalModul(ctx) {
  const { E } = ctx;
  const ui = { aktiv: false, cluster: null, haus: null, wahl: false };
  const stand = () => E.personalUebersicht(ctx.s());
  const actions = (a) => {
    const r = E.fuehreAus(ctx.s(), a);
    ctx.meldung(r.text, r.ok);
    if (r.ok) ctx.nachAktion();
    return r.ok;
  };
  /** Einsatz je Gruppe als Stepper: Schritt 5 %, Grenzen wie in der Engine (40 bis 160 %, Aushilfen 0 bis 30 %). */
  function regler(name, art, id, g, wert, min, max, hinweis) {
    const v = Math.round(wert * 100);
    return K.feld(name, K.stepper({ wert: v + ' %', unter: hinweis, label: name,
      attrMinus: steuer(art, { 'data-haus': id, 'data-gruppe': g, 'data-wert': v - 5 }), attrPlus: steuer(art, { 'data-haus': id, 'data-gruppe': g, 'data-wert': v + 5 }),
      minusAus: v - 5 < min, plusAus: v + 5 > max }));
  }
  /** Personaleinsatz eines Hauses: wird auch im Hausdetail (Reiter Personal) eingebettet. */
  function hausBlock(id) {
    const h = ctx.s().haeuser.find((x) => x.id === id);
    const p = E.personalHaus(ctx.s(), id);
    if (!h || !p) return K.leer('Kein Personaleinsatzplan vorhanden.');
    const st = h.personaleinsatz;
    let out = K.gross([{ label: 'Krankenstand', wert: pct(p.krank), ton: p.krank > 0.1 ? 'schlecht' : '' }, { label: 'Urlaub', wert: pct(p.urlaub) },
      { label: 'Aushilfen', wert: fmt.format(p.aushilfenStunden) + ' Std.' }]);
    out += K.liste([K.zeile({ was: 'Zusatzkosten Woche', wert: geld(p.zusatzkosten) }), K.zeile({ was: 'Warenverfügbarkeit (Personalfaktor)', wert: pct(p.verfuegbarkeit) }),
      K.zeile({ was: 'Kaufquotenfaktor', wert: pct(p.kaufquote) }), K.zeile({ was: 'Springerbewegungen', wert: fmt.format(p.springerSaldo) + ' Std.' })]);
    out += K.abschnitt('Deckung KW ' + (p.woche % 52 + 1), 'Plan zu Bedarf');
    const kz = (g) => ({ label: KURZ[g], wert: pct(p.gruppen[g].deckung), ton: ton(p.gruppen[g].deckung) === 'schlecht' ? 'schlecht' : '' });
    out += K.gross(GRUPPEN.slice(0, 2).map(kz)) + K.gross(GRUPPEN.slice(2).map(kz));
    for (const g of GRUPPEN) {
      const x = p.gruppen[g];
      out += K.abschnitt(NAME[g], fmt.format(x.plan) + ' von ' + fmt.format(x.bedarf) + ' Std.');
      out += K.balken(x.tage.map((t) => ({ label: t.tag, a: t.bedarf, b: t.plan })));
    }
    out += `<div class="hw-legende"><span><i></i>Bedarf</span><span><i class="b"></i>Plan</span></div>`;
    out += K.abschnitt('Einsatz übersteuern', '100 % = Vorschlag');
    out += '<div class="hw-felder">' + GRUPPEN.map((g) => regler(KURZ[g], 'gruppe', id, g, st.faktor[g], 40, 160, 'Einsatz')).join('')
      + regler('Kasse Samstag', 'samstag', id, '', st.samstagKasse, 40, 160, 'Einsatz')
      + regler('Aushilfen', 'aushilfen', id, '', st.aushilfenQuote, 0, 30, 'Fr und Sa') + '</div>';
    out += `<p class="hw-lese hw-leise hw-unterzeile">Weniger Kasse am Samstag führt zu Wartezeiten und Kaufabbrüchen. Aushilfen verstärken Freitag und Samstag und kosten zusätzlich.</p>`;
    return out;
  }
  function clusterBlock(c) {
    const haus = ui.haus && c.haeuser.some((h) => h.id === ui.haus) ? ui.haus : null;
    let out = K.abschnitt('Springer', c.bewegungen + ' Bewegungen');
    out += K.schalter({ text: 'Springerpool', unter: c.springerAktiv ? 'Häuser helfen sich gegenseitig aus' : 'jedes Haus plant für sich', an: c.springerAktiv,
      attr: steuer('springer', { 'data-cluster': c.id, 'data-an': c.springerAktiv ? '0' : '1' }) });
    out += K.knoepfe(K.knopf('Weiterbildung um eine Stufe anheben', steuer('weiterbildung', { 'data-cluster': c.id }), 'zweit breit'),
      ctx.s().woche % 52 >= 43 ? K.knopf('Weihnachtsaushilfen nachbuchen', steuer('weihnachten', { 'data-cluster': c.id }), 'zweit breit') : '');
    out += K.abschnitt('Häuser', 'knappste Gruppe');
    out += K.liste(c.haeuser.map((h) => {
      const min = GRUPPEN.reduce((m, g) => (h.gruppen[g] < h.gruppen[m] ? g : m), GRUPPEN[0]);
      return K.zeile({ was: esc(h.name), unter: `Krank ${pct(h.krank)} · Aushilfen ${fmt.format(h.aushilfen)} Std. · Springer ${fmt.format(h.springer)} Std.`,
        wert: pct(h.gruppen[min]), wertUnter: 'knapp: ' + KURZ[min], ton: ton(h.gruppen[min]), tippbar: true,
        attr: steuer('haus', { 'data-haus': h.id }) + (h.id === haus ? ' aria-current="true"' : '') });
    }));
    if (haus) out += `<div data-pe-haus="${esc(haus)}">` + K.abschnitt(c.haeuser.find((h) => h.id === haus)?.name ?? 'Haus') + hausBlock(haus) + '</div>';
    return out;
  }
  function anzeigen(scrollHalten = false) {
    const vorher = document.getElementById('pinhalt').scrollTop;
    const liste = stand();
    if (ui.cluster && !liste.some((c) => c.id === ui.cluster)) ui.cluster = null;
    const gewaehlt = liste.find((c) => c.id === ui.cluster) ?? liste[0];
    if (gewaehlt) ui.cluster = gewaehlt.id;
    // Q30: Hauptfrage „Wo fehlt diese Woche Personal?“ Die Personalabteilung nennt die Häuser unter 90 % Deckung.
    const knapp = gewaehlt ? gewaehlt.haeuser.filter((h) => GRUPPEN.some((g) => h.gruppen[g] < 0.9)) : [];
    const befund = !gewaehlt ? '<b>Keine offenen Häuser.</b>' : knapp.length
      ? '<b>' + knapp.length + ' von ' + gewaehlt.haeuser.length + ' Häusern sind unter 90 % besetzt.</b> Am knappsten: ' + esc(knapp.slice(0, 2).map((h) => h.name).join(', ')) + '.'
      : (() => {
        // Q35: auch ohne Engpass das knappste Haus und seinen Krankenstand nennen.
        const min = (h) => Math.min(...GRUPPEN.map((g) => h.gruppen[g]));
        const k = [...gewaehlt.haeuser].sort((a, b) => min(a) - min(b))[0];
        return '<b>Alle ' + gewaehlt.haeuser.length + ' Häuser sind ausreichend besetzt.</b> ' + (k && min(k) < 0.985
          ? 'Am knappsten: ' + esc(k.name) + ' mit ' + pct(min(k)) + ' (Krankenstand ' + pct(k.krank) + ').'
          : 'Kein Springer nötig.');
      })();
    let r = '';
    if (gewaehlt) {
      const alle = gewaehlt.haeuser.length;
      const voll = gewaehlt.haeuser.filter((h) => GRUPPEN.every((g) => h.gruppen[g] >= 0.9)).length;
      r += K.gross([{ label: 'Häuser besetzt', wert: `${voll} von ${alle}`, ton: knapp.length ? 'schlecht' : '' },
        { label: 'Krankenstand', wert: pct(gewaehlt.haeuser.reduce((n, h) => n + h.krank, 0) / Math.max(1, alle)) }]);
      // Hauscluster wählen: aktueller Cluster als Zeile, aufgeklappt alle Cluster als Liste.
      r += K.abschnitt('Hauscluster', liste.length + ' Cluster');
      r += K.liste(ui.wahl
        ? liste.map((c) => K.zeile({ was: esc(c.name), unter: c.haeuser.length + ' Häuser', wert: c.id === ui.cluster ? 'gewählt' : '', ton: c.id === ui.cluster ? 'gut' : '', tippbar: c.id !== ui.cluster, attr: steuer('cluster', { 'data-cluster': c.id }) }))
        : [K.zeile({ was: esc(gewaehlt.name), unter: alle + ' Häuser', wert: 'wechseln', tippbar: true, attr: steuer('wahl') })]);
      r += clusterBlock(gewaehlt);
    } else r += K.leer('Keine offenen Häuser in diesem Cluster.');
    ctx.panel('Personaleinsatz', 'Wochentagsplanung · vier Personalgruppen',
      K.bereich('haus', 'haus') + '<i class="hw-g4" aria-hidden="true"></i>' + K.sprecher({ text: befund, unter: 'Personalplanung', ton: knapp.length ? 'engpass' : '' }) + K.rumpf(r), 'gross');
    ui.aktiv = true;
    if (scrollHalten) document.getElementById('pinhalt').scrollTop = vorher;
  }
  function tun(el) {
    const a = el.dataset.pe, cluster = el.dataset.cluster || ui.cluster;
    const id = el.dataset.haus, gruppe = el.dataset.gruppe;
    if (a === 'wahl') { ui.wahl = true; anzeigen(true); return; }
    if (a === 'cluster') { ui.cluster = cluster; ui.haus = null; ui.wahl = false; anzeigen(); return; }
    if (a === 'haus') {
      ui.haus = id; anzeigen(true);
      document.querySelector('#pinhalt [data-pe-haus]')?.scrollIntoView({ block: 'start' });
      return;
    }
    if (a === 'springer') { actions({ typ: 'personalSpringer', hauscluster: cluster, an: el.dataset.an === '1' }); anzeigen(true); return; }
    if (a === 'weihnachten') {
      actions({ typ: 'personalWeihnachtenNachbuchen', hauscluster: cluster, quote: 0.10 });
      anzeigen(true); return;
    }
    if (a === 'weiterbildung') {
      const hauser = ctx.s().haeuser.filter((h) => h.hauscluster === cluster || 'region-' + h.region === cluster);
      const stufe = Math.min(3, 1 + Math.max(0, ...hauser.map((h) => h.personaleinsatz?.training ?? 0)));
      actions({ typ: 'personalWeiterbildung', hauscluster: cluster, stufe }); anzeigen(true); return;
    }
    const faktor = Number(el.dataset.wert) / 100;
    const aktion = a === 'gruppe'
      ? { typ: 'personalSteuern', haus: id, gruppe, faktor }
      : a === 'samstag' ? { typ: 'personalSamstagKasse', haus: id, faktor }
      : { typ: 'personalAushilfen', haus: id, quote: faktor };
    if (!actions(aktion)) return;
    if (ui.aktiv) anzeigen(true);
    else ctx.oeffneHaus(id);
  }
  const pin = document.getElementById('pinhalt');
  pin.addEventListener('click', (event) => {
    const el = event.target.closest('[data-pe]');
    if (!el || el.disabled) return;
    if (ui.aktiv || el.dataset.haus) tun(el);
  });
  return {
    ui, hausBlock, oeffne: (cluster) => { ui.haus = null; ui.wahl = false; ui.cluster = cluster || null; anzeigen(); },
    aktiv: () => ui.aktiv, neuZeichnen: () => anzeigen(true), zu: () => { ui.aktiv = false; },
    pruefe: () => ({ cluster: ui.cluster, haus: ui.haus,
      daten: E.personalUebersicht(ctx.s(), ui.cluster) }),
  };
}
