// O04 Personal: alle Kennzahlen aus Engine-Abfragen, keine Simulation im Browser.
import { esc, fmt, geld } from './format.js';

const GRUPPEN = ['logistik', 'verkauf', 'kasse', 'verwaltung'];
const NAME = { logistik: 'Instore-Logistik', verkauf: 'Verkauf', kasse: 'Kasse', verwaltung: 'Verwaltung' };
const pct = (n) => Math.round(n * 100) + ' %';
const farbe = (n) => n < 0.85 ? 'var(--rot)' : n < 0.98 ? '#d8a123' : 'var(--gruen)';
const steuer = (a, opts = {}) =>
  Object.entries({ 'data-pe': a, ...opts }).map(([k, v]) => ' ' + k + '="' + esc(String(v)) + '"').join('');

export function personalModul(ctx) {
  const { E } = ctx;
  const ui = { aktiv: false, cluster: null, haus: null };
  const stand = () => E.personalUebersicht(ctx.s());
  const actions = (a) => {
    const r = E.fuehreAus(ctx.s(), a);
    ctx.meldung(r.text, r.ok);
    if (r.ok) ctx.nachAktion();
    return r.ok;
  };
  function titelGruppen(p) {
    return GRUPPEN.map((g) =>
      '<div class="pe-gruppe"><div class="zeile"><span class="was"><b>' + esc(NAME[g]) +
      '</b><i>' + fmt.format(p.gruppen[g].plan) + ' / ' + fmt.format(p.gruppen[g].bedarf) +
      ' Stunden</i></span><strong style="color:' + farbe(p.gruppen[g].deckung) + '">' +
      pct(p.gruppen[g].deckung) + '</strong></div>' +
      '<div class="pe-tage">' + p.gruppen[g].tage.map((t) =>
        '<div class="pe-tag" aria-label="' + t.tag + ': ' + fmt.format(t.plan) + ' von ' + fmt.format(t.bedarf) +
        ' Stunden"><small>' + t.tag + '</small><div class="pe-saeule"><span style="height:' +
        Math.min(100, Math.max(3, t.deckung * 85)) + '%;background:' + farbe(t.deckung) +
        '"></span></div><small>' + pct(t.deckung) + '</small></div>').join('') +
      '</div></div>').join('');
  }
  function hausBlock(id) {
    const h = ctx.s().haeuser.find((x) => x.id === id);
    const p = E.personalHaus(ctx.s(), id);
    if (!h || !p) return '<div class="karte">Kein Personaleinsatzplan vorhanden.</div>';
    const st = h.personaleinsatz;
    const slider = (name, art, g, min, max, val, hint) =>
      '<div class="pe-slider"><label><b>' + esc(name) + '</b><span>' + pct(val) +
      '</span></label><input type="range" min="' + min + '" max="' + max +
      '" step="5" value="' + Math.round(val * 100) + '"' +
      steuer(art, { 'data-haus': id, 'data-gruppe': g || '' }) +
      ' aria-label="' + esc(name) + '"><small>' + esc(hint) + '</small></div>';
    let out = '<div class="karte"><div class="khead">Woche ' + (p.woche % 52 + 1) + ' · Personaleinsatz</div>' +
      '<div class="raster"><div class="kz"><span>Krankenstand</span><b>' + pct(p.krank) +
      '</b></div><div class="kz"><span>Urlaub</span><b>' + pct(p.urlaub) +
      '</b></div><div class="kz"><span>Aushilfen</span><b>' + fmt.format(p.aushilfenStunden) +
      ' Std.</b></div><div class="kz"><span>Zusatzkosten</span><b>' + geld(p.zusatzkosten) +
      '</b></div></div>' +
      '<div class="zeile"><span>Warenverfügbarkeit (Personalfaktor)</span><b>' + pct(p.verfuegbarkeit) +
      '</b></div><div class="zeile"><span>Kaufquotenfaktor</span><b>' + pct(p.kaufquote) +
      '</b></div><div class="zeile"><span>Springerbewegungen</span><b>' +
      fmt.format(p.springerSaldo) + ' Std.</b></div></div>';
    out += '<div class="karte"><div class="khead">Bedarf und Plan · Montag bis Samstag</div>' + titelGruppen(p) + '</div>';
    out += '<div class="karte"><div class="khead">Einsatz übersteuern</div>' +
      GRUPPEN.map((g) => slider(NAME[g], 'gruppe', g, 40, 160, st.faktor[g],
        '100 % = Vorschlag der Personaleinsatzplanung')).join('') +
      slider('Kasse Samstag', 'samstag', '', 40, 160, st.samstagKasse,
        'Reduzierung führt zu Wartezeiten und Kaufabbrüchen') +
      slider('Zusätzliche Aushilfen', 'aushilfen', '', 0, 30, st.aushilfenQuote,
        'Zusätzliche Stunden für Freitag und Samstag, kostenpflichtig') +
      '</div>';
    return out;
  }
  function clusterBlock(c) {
    const haus = ui.haus && c.haeuser.some((h) => h.id === ui.haus)
      ? ui.haus : null;
    let out = '<div class="karte"><div class="khead">' + esc(c.name) + '</div>' +
      '<div class="zeile"><span>' + c.haeuser.length + ' Häuser · Springerbewegungen</span><b>' +
      c.bewegungen + '</b></div>' +
      '<button class="mini"' + steuer('springer', { 'data-cluster': c.id, 'data-an': c.springerAktiv ? '0' : '1' }) +
      '>' + (c.springerAktiv ? 'Springerpool deaktivieren' : 'Springerpool aktivieren') + '</button>' +
      '<button class="mini"' + steuer('weiterbildung', { 'data-cluster': c.id }) +
      '>Weiterbildung Stufe +1</button></div>';
    out += '<div class="karte pe-uebersicht"><div class="pe-tabellenkopf">Haus · Logistik · Verkauf · Kasse · Verwaltung</div>';
    for (const h of c.haeuser) {
      out += '<button class="pe-tabellenzeile"' + steuer('haus', { 'data-haus': h.id }) + '><b>' +
        esc(h.name) + '</b><span class="pe-deckungen">' + GRUPPEN.map((g) =>
        '<span style="color:' + farbe(h.gruppen[g]) + '">' + pct(h.gruppen[g]) + '</span>').join('') +
        '</span><small>Krank ' + pct(h.krank) + ' · Aushilfen ' + fmt.format(h.aushilfen) +
        ' Std. · Springer ' + fmt.format(h.springer) + ' Std.</small></button>';
    }
    out += '</div>';
    if (haus) out += hausBlock(haus);
    return out;
  }
  function anzeigen(scrollHalten = false) {
    const vorher = document.getElementById('pinhalt').scrollTop;
    const liste = stand();
    if (ui.cluster && !liste.some((c) => c.id === ui.cluster)) ui.cluster = null;
    const gewaehlt = liste.find((c) => c.id === ui.cluster) ?? liste[0];
    if (gewaehlt) ui.cluster = gewaehlt.id;
    const selector = '<div class="karte"><div class="khead">Hauscluster</div><select class="ort" data-pe="cluster" aria-label="Hauscluster wählen">' +
      liste.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === ui.cluster ? ' selected' : '') + '>' +
      esc(c.name) + ' (' + c.haeuser.length + ')</option>').join('') + '</select></div>';
    ctx.panel('Personaleinsatz', 'Wochentagsplanung · vier Personalgruppen',
      selector + (gewaehlt ? clusterBlock(gewaehlt) : '<div class="karte">Keine offenen Häuser.</div>'), 'gross');
    ui.aktiv = true;
    if (scrollHalten) document.getElementById('pinhalt').scrollTop = vorher;
  }
  function tun(el, wert) {
    const a = el.dataset.pe, cluster = el.dataset.cluster || ui.cluster;
    const id = el.dataset.haus, gruppe = el.dataset.gruppe;
    if (a === 'cluster') { ui.cluster = wert; ui.haus = null; anzeigen(); return; }
    if (a === 'haus') { ui.haus = id; anzeigen(); return; }
    if (a === 'springer') { actions({ typ: 'personalSpringer', hauscluster: cluster, an: el.dataset.an === '1' }); anzeigen(true); return; }
    if (a === 'weiterbildung') {
      const hauser = ctx.s().haeuser.filter((h) => h.hauscluster === cluster || 'region-' + h.region === cluster);
      const stufe = Math.min(3, 1 + Math.max(0, ...hauser.map((h) => h.personaleinsatz?.training ?? 0)));
      actions({ typ: 'personalWeiterbildung', hauscluster: cluster, stufe }); anzeigen(true); return;
    }
    const faktor = Number(wert) / 100;
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
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    if (ui.aktiv || el.dataset.haus) tun(el);
  });
  pin.addEventListener('change', (event) => {
    const el = event.target.closest('[data-pe]');
    if (!el) return;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') tun(el, el.value);
  });
  return {
    ui, hausBlock, oeffne: (cluster) => { ui.haus = null; ui.cluster = cluster || null; anzeigen(); },
    aktiv: () => ui.aktiv, neuZeichnen: () => anzeigen(true), zu: () => { ui.aktiv = false; },
    pruefe: () => ({ cluster: ui.cluster, haus: ui.haus,
      daten: E.personalUebersicht(ctx.s(), ui.cluster) }),
  };
}
