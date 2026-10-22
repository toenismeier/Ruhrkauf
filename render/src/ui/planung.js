// O06 Planung: Planungsassistent, Abweichungsreporting, Forecast und Führungsboni.
import { geld, esc, clusterName } from './format.js';
import { bereich } from './komponenten.js';

const zahl = (x) => Number(x || 0).toLocaleString('de-DE', { maximumFractionDigits: 0 });
const pct = (v) => (100 * v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
const pctV = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + pct(Math.abs(v)); // Q31: Abweichung mit Vorzeichen
const mio = (v) => (v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' Mio. €';
const rolle = { haus: 'Hausleitungen', hauscluster: 'Clusterleitungen', bereich: 'Bereichsleitungen' };
const FORMATNAME = { warenhaus: 'Hartwig', sport: 'Hartwig Sport', schwester: 'Volkskauf', outlet: 'FUNDUS' };
const EBENE = { konzern: 'Konzern', format: 'Format', region: 'Region', hauscluster: 'Hauscluster', haus: 'Haus', warengruppe: 'Warengruppe' };

export function planungModul(ctx) {
  const E = ctx.E, s = ctx.s, ui = { aktiv: false, tab: 'assistent', schritt: 1 };
  // Q31: Hauscluster-Knoten tragen intern die Cluster-ID als Namen.
  const nname = (n) => (n.ebene === 'hauscluster' ? clusterName(s(), n.name) : n.name);
  const vor = () => E.planungAssistent(s());
  const zeile = (text, wert) => '<div class="zeile"><span class="was">' + esc(text) + '</span><b>' + wert + '</b></div>';
  const tabs = () => '<div class="tabs">' + [['assistent','Planung'],['report','Reporting'],['forecast','Forecast'],['bonus','Boni']].map(([id, t]) =>
    '<button class="tab ' + (ui.tab === id ? 'an' : '') + '" data-pl-tab="' + id + '">' + t + '</button>').join('') + '</div>';

  function entwurf(D) {
    const e = D.entwurf;
    if (!e || e.stand !== 'offen') return '<div class="q31"><div class="q-buch"><div class="q-buch-kopf"><span>Jahresplanung</span></div><div class="q-leer"><b>Keine Planungsrunde offen.</b>Die nächste läuft in KW 40 bis 44. Den laufenden Jahresplan zeigt der Reiter Reporting.</div><button class="q-mehr" data-pl-tab="report">Zum Reporting</button></div></div>';
    const steps = ['Konzernziel', 'Gegenstrom', 'Abschluss'];
    let html = '<div class="tabs">' + steps.map((t, i) => '<button class="tab ' + (ui.schritt === i + 1 ? 'an' : '') + '" data-pl-schritt="' + (i + 1) + '">' + (i + 1) + '. ' + t + '</button>').join('') + '</div>';
    if (ui.schritt === 1) {
      html += '<div class="karte"><div class="khead">Zielsetzung ' + e.jahr + '<small>Vorschlag Konzerncontrolling · vom Vorjahr und Trend abgeleitet</small></div>';
      const basis = D.vorschlag;
      const reg = (id, titel, step, min, max) => '<div class="regler"><label for="pl-' + id + '"><b>' + titel + '</b></label>' +
        '<input id="pl-' + id + '" data-pl-regler="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + e.ziele[id] + '">' +
        '<div class="zeile"><small>' + mio(min) + '</small><b>' + mio(e.ziele[id]) + '</b><small>' + mio(max) + '</small></div></div>';
      html += reg('umsatz','Umsatz', 1e6, Math.max(0, Math.round(basis.umsatz * .75 / 1e6) * 1e6), Math.max(1e6, Math.round(basis.umsatz * 1.25 / 1e6) * 1e6));
      html += reg('ebitda','EBITDA', 1e6, Math.round((basis.ebitda - Math.abs(basis.umsatz * .04)) / 1e6) * 1e6, Math.round((basis.ebitda + Math.abs(basis.umsatz * .04)) / 1e6) * 1e6);
      html += reg('investitionen','Investitionen', 100000, 0, Math.max(1000000, Math.round(basis.investitionen * 2 / 100000) * 100000));
      html += '<div class="olief">EBITDA-Effekt der Umsatzplanung (bei 25 % zusätzlichem Deckungsbeitrag): <b>' + mio(D.ebitdaSensitivitaet) + '</b>. Budgetwerte ändern zunächst nicht den laufenden Umsatz.</div>';
      html += '</div><div class="oknoepfe"><button class="gruen" data-pl-schritt="2">Weiter zur Verteilung →</button></div>';
    } else if (ui.schritt === 2) {
      html += '<div class="karte"><div class="khead">Controlling-Verteilung und Rückmeldungen</div><div class="olief">Formate → Regionen → Hauscluster → Häuser. Rote Markierung = Sandbagging-Verdacht. Änderungen eines Teilbudgets werden innerhalb des übergeordneten Budgets ausgeglichen.</div>';
      const nodes = Object.fromEntries(D.knoten.map((x) => [x.id, x]));
      const renderNode = (id, tiefe) => {
        const n = nodes[id]; if (!n) return '';
        const hinweis = n.verdacht ? '<span class="chip warn">Sandbagging-Verdacht</span>' : '';
        const inhalt = '<div class="zeile"><span class="was"><b>' + esc(nname(n)) + '</b><i>' + esc(EBENE[n.ebene] ?? n.ebene) + '</i></span><span>' + mio(n.umsatz) + '</span></div>' +
          (n.ebene !== 'konzern' ? '<label class="zeile"><span class="was">Ziel in Mio. €</span><input style="width:110px;max-width:45%" type="number" step="0.1" min="0" data-pl-knoten="' + esc(n.id) + '" value="' + (n.umsatz / 1e6).toFixed(1) + '"></label>' : '') +
          (n.ebene === 'hauscluster' || n.ebene === 'haus' ? '<div class="olief">Rückmeldung Leitung: ' + mio(n.rueckmeldung) + ' ' + hinweis + '</div>' : '');
        const kinder = (n.kinder || []).map((x) => renderNode(x, tiefe + 1)).join('');
        return tiefe === 0 ? inhalt + kinder : '<details class="karte" style="margin:6px 0 6px ' + Math.min(tiefe * 8, 30) + 'px"' + (tiefe <= 2 ? ' open' : '') + '><summary>' + esc(nname(n)) + ' · ' + mio(n.umsatz) + (n.verdacht ? ' · !' : '') + '</summary>' + inhalt + kinder + '</details>';
      };
      html += renderNode('konzern', 0) + '</div>';
      html += '<div class="karte"><div class="khead">Merchandise Planning: Warengruppenziele</div>' +
        '<div class="olief">Die Konzernsumme bleibt bei Änderungen einzelner Warengruppen erhalten.</div>' +
        Object.entries(D.warengruppen || {}).map(([id, value]) => '<label class="zeile"><span class="was">' +
          esc(E.GRUPPEN?.[id]?.name || id) + '</span><input style="width:105px;max-width:42%" type="number" min="0" step="0.1"' +
          ' data-pl-wg="' + esc(id) + '" value="' + (value / 1e6).toFixed(1) + '" aria-label="' + esc(id) + ' Ziel Mio. Euro"></label>').join('') +
        '</div><div class="oknoepfe"><button class="gruen" data-pl-schritt="3">Weiter zum Abschluss →</button></div>';
    } else {
      html += '<div class="karte"><div class="khead">Jahresplan ' + e.jahr + ' freigeben</div>' +
        zeile('Konzernumsatz', mio(e.ziele.umsatz)) + zeile('EBITDA-Ziel', mio(e.ziele.ebitda)) +
        zeile('Investitionsbudget', mio(e.ziele.investitionen)) +
        '<p class="olief">Mit dem Abschluss werden Wochenbudgets und Clusterziele verbindlich. Ohne Aktion wird der Controlling-Vorschlag nach Fristablauf automatisch übernommen.</p></div>' +
        '<div class="oknoepfe"><button class="gruen" data-pl-abschluss="spieler">Angepasste Planung beschließen</button><button data-pl-abschluss="controlling">Controlling-Vorschlag abschließen</button></div>';
    }
    return html;
  }

  function bericht(D) {
    // Q31 Planblatt. Hauptfrage: Liegen wir im Plan? Größter Block = kumulierte Abweichung, darunter das Planblatt
    // je Format mit Regionen als Zeilen und Summenstrich (Regionen ergeben das Format), Hauscluster aufklappbar.
    const b = D.bericht;
    if (!b.ziele) return '<div class="q31"><div class="q-buch"><div class="q-leer"><b>Kein Jahresplan vorhanden.</b>Die Planungsrunde läuft in KW 40 bis 44; bis dahin gibt es nichts zu vergleichen.</div></div></div>';
    const vz = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + mio(Math.abs(x));
    let html = '<div class="q31">';
    html += '<div class="q-gross"><span class="q-label">Abweichung zum Plan bis heute</span><span class="q-haupt ' + (b.abweichung < 0 ? 'q-minus' : 'q-plus') + '">' + vz(b.abweichung) + '</span>' +
      '<span class="q-neben"><b>' + mio(b.ist) + '</b>Ist kumuliert</span></div>';
    html += '<div class="q-befund">Plan bis heute ' + mio(b.planBisHeute) + ', Jahresplan ' + b.jahr + ' ' + mio(b.ziele.umsatz) + ', EBITDA-Plan ' + mio(b.ziele.ebitda) + '. ' +
      (b.forecasting == null ? 'Der erste Jahresforecast entsteht nach KW 13.' : 'Forecast ' + mio(b.forecasting) + '.') + '</div>';
    const K = b.knoten, kinder = (id, ebene) => K.filter((n) => n.ebene === ebene && n.parent === id);
    const formate = K.filter((n) => n.ebene === 'format');
    const m1 = (v) => (v / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const fname = (f) => FORMATNAME[f.id.replace('format:', '')] ?? f.name;
    const zeileP = (n, klasse = '') => '<div class="q-zeile q-plan ' + klasse + '"><span class="q-name">' + esc(nname(n)) + '</span><span class="q-wert"' + (klasse ? '' : ' data-s="p"') + '>' + m1(n.umsatz) + '</span><span class="q-wert"' + (klasse ? '' : ' data-s="i"') + '>' + m1(n.ist) + '</span><span class="q-wert ' + (n.abweichung < 0 ? 'q-minus' : '') + '">' + pctV(n.abweichung) + '</span></div>';
    for (const f of formate) {
      const regionen = kinder(f.id, 'region');
      html += '<div class="q-buch" data-summenbuch="Planblatt ' + esc(fname(f)) + '"><div class="q-buch-kopf q-plan"><span>' + esc(fname(f)) + '</span><b>Plan Mio. €</b><b>Ist Mio. €</b><b>Abw.</b></div>';
      for (const r of regionen) {
        const cl = kinder(r.id, 'hauscluster');
        html += cl.length ? '<details class="q-plan-auf"><summary>' + zeileP(r) + '</summary>' + cl.map((c) => zeileP(c, 'q-unter')).join('') + '</details>' : zeileP(r);
      }
      html += '<div class="q-summe q-plan"><span>' + esc(fname(f)) + ' gesamt</span><span class="q-wert" data-summe="p">' + m1(f.umsatz) + '</span><span class="q-wert" data-summe="i">' + m1(f.ist) + '</span><span class="q-wert">' + pctV(f.abweichung) + '</span></div></div>';
    }
    const w = (b.wochen || []).slice().reverse();
    html += '<div class="q-buch"><div class="q-buch-kopf q-plan q-wochen"><span>Woche</span><b>Ist Mio. €</b><b>Plan Mio. €</b><b>Abw.</b></div>' +
      (w.length ? w.map((x) => '<div class="q-zeile q-plan q-wochen"><span class="q-name">KW ' + ((x.woche % 52) + 1) + '</span><span class="q-wert">' + m1(x.ist) + '</span><span class="q-wert">' + m1(x.plan) + '</span><span class="q-wert ' + (x.abweichungQuote < 0 ? 'q-minus' : '') + '">' + pctV(x.abweichungQuote) + '</span></div>').join('') : '<div class="q-leer">Noch keine Woche im Plan.</div>') + '</div>';
    if (b.warengruppen) html += '<details class="q-buch"><summary class="q-buch-kopf"><span>Warengruppenbudgets</span><b>öffnen</b></summary>' +
      Object.entries(b.warengruppen).map(([g, v]) => '<div class="q-zeile"><span class="q-name">' + esc(E.GRUPPEN?.[g]?.name ?? g) + '</span><span class="q-wert">' + mio(v) + '</span></div>').join('') + '</details>';
    return html + '</div>';
  }

  function forecasts(D) {
    const L = D.bericht.forecasts || [];
    let html = '<div class="karte"><div class="khead">Quartalsforecast</div><p class="olief">3+9 in KW 13, 6+6 in KW 26 und 9+3 in KW 39. Der Forecast kann vor der Abgabe an Eigentümer und Bank angepasst werden.</p></div>';
    for (const f of [...L].reverse()) {
      html += '<div class="karte"><div class="khead">' + f.bezeichnung + ' · ' + f.jahr + '<small>' + (f.status === 'abgegeben' ? 'Abgegeben' : f.status === 'offen' ? 'Zur Freigabe' : 'Zurückgehalten') + '</small></div>' +
        zeile('Erwarteter Jahresumsatz', mio(f.ziele.umsatz)) + zeile('Erwartetes EBITDA', mio(f.ziele.ebitda));
      if (f.status === 'offen') html += '<div class="regler"><label>Umsatz Mio. € <input data-pl-forecast="umsatz" type="number" min="0" step="0.1" value="' + (f.ziele.umsatz / 1e6).toFixed(1) + '"></label>' +
        '<label>EBITDA Mio. € <input data-pl-forecast="ebitda" type="number" step="0.1" value="' + (f.ziele.ebitda / 1e6).toFixed(1) + '"></label></div>' +
        '<div class="oknoepfe"><button class="gruen" data-pl-forecast-abgabe="1">Änderungen speichern und abgeben</button></div>';
      html += '</div>';
    }
    if (!L.length) html += '<div class="q31"><div class="q-buch"><div class="q-leer"><b>Noch kein Forecast.</b>Der erste Forecast (3+9) entsteht nach KW 13.</div></div></div>';
    if (D.bericht.vertrauen?.length) html += '<div class="karte"><div class="khead">Trefferquote und Vertrauen</div>' +
      D.bericht.vertrauen.slice(-8).map((v) => zeile('KW ' + ((v.woche % 52) + 1) + ' · Abweichung ' + pct(v.abweichung), (v.delta > 0 ? '+' : '') + v.delta)).join('') + '</div>';
    return html;
  }

  function boni(D) {
    const q = D.bericht.quoten || {};
    let html = '<div class="karte"><div class="khead">Variable Vergütung der Leitungen</div><p class="olief">Erfüllung von Umsatz- und EBITDA-Zielen. Die Abrechnung erfolgt im Jahresabschluss, Auszahlung im Februar des Folgejahres als Personalaufwand.</p>';
    for (const [id, title] of Object.entries(rolle)) html += '<label class="zeile"><span class="was">' + title + '</span><select class="ort" data-pl-bonus="' + id + '">' +
      [0, .05, .10, .15, .20, .25, .30].map((w) => '<option value="' + w + '"' + (Math.abs((q[id] ?? .1) - w) < .001 ? ' selected' : '') + '>' + pct(w) + '</option>').join('') + '</select></label>';
    html += '</div>';
    for (const b of [...(D.bericht.boni || [])].reverse().slice(0, 5)) html += '<div class="karte"><div class="khead">Bonusjahr ' + b.jahr + '<small>' + (b.bezahlt ? 'ausgezahlt' : 'fällig im Februar') + '</small></div>' +
      zeile('Bonussumme', geld(b.betrag)) + zeile('Leitungsposten', String(b.details.length)) + '</div>';
    return html;
  }

  function zeigen(halten = false) {
    const position = document.getElementById('pinhalt').scrollTop, D = vor();
    const html = tabs() + (ui.tab === 'assistent' ? entwurf(D) : ui.tab === 'report' ? bericht(D) : ui.tab === 'forecast' ? forecasts(D) : boni(D));
    ctx.panel('Planung & Forecast', 'Konzerncontrolling · KW ' + ((s().woche % 52) + 1), bereich('zentrale') + '<i class="q31-marke" hidden></i>' + html, 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = halten ? position : 0;
  }
  function tun(a) {
    const x = E.fuehreAus(s(), a);
    if (!x.ok) ctx.meldung(x.text, false);
    ctx.nachAktion?.();
    return x.ok;
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (ev) => {
    if (!ui.aktiv) return;
    const el = ev.target.closest('[data-pl-tab],[data-pl-schritt],[data-pl-abschluss],[data-pl-forecast-abgabe]');
    if (!el) return;
    if (el.dataset.plTab) { ui.tab = el.dataset.plTab; return zeigen(); }
    if (el.dataset.plSchritt) { ui.schritt = Number(el.dataset.plSchritt); return zeigen(); }
    if (el.dataset.plAbschluss) {
      if (tun({ typ: 'planungAbschliessen', quelle: el.dataset.plAbschluss })) return zeigen();
    }
    if (el.dataset.plForecastAbgabe) {
      const u = Number(inhalt.querySelector('[data-pl-forecast="umsatz"]')?.value) * 1e6;
      const e = Number(inhalt.querySelector('[data-pl-forecast="ebitda"]')?.value) * 1e6;
      if (!tun({ typ:'planungForecast', umsatz: u, ebitda: e })) return;
      const v = s().entscheidungen.find((d) => d.typ === 'planung_forecast');
      if (v) tun({ typ:'entscheiden', id: v.id, option: 'abgeben' });
      return zeigen();
    }
  });
  inhalt.addEventListener('change', (ev) => {
    if (!ui.aktiv) return;
    const el = ev.target;
    if (el.dataset.plRegler) { tun({ typ: 'planungZiel', kennzahl: el.dataset.plRegler, wert: Number(el.value) }); return zeigen(true); }
    if (el.dataset.plKnoten) { tun({ typ: 'planungVerteilen', id: el.dataset.plKnoten, umsatz: Math.round(Number(el.value) * 1e6) }); return zeigen(true); }
    if (el.dataset.plWg) { tun({ typ: 'planungWarengruppe', gruppe: el.dataset.plWg, umsatz: Math.round(Number(el.value) * 1e6) }); return zeigen(true); }
    if (el.dataset.plBonus) { tun({ typ: 'planungBonus', ebene: el.dataset.plBonus, anteil: Number(el.value) }); return zeigen(true); }
  });
  return {
    // Q31: Ohne offene Planungsrunde ist das Reporting die Hauptaufgabe und öffnet direkt.
    oeffne: (tab) => { ui.tab = tab ?? (vor().entwurf?.stand === 'offen' ? 'assistent' : 'report'); ui.schritt = 1; zeigen(); },
    aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; }, neuZeichnen: () => zeigen(true),
    pruefe: () => ({ jahr: vor().bericht.jahr, knoten: vor().bericht.knoten.length, freigaben: s().entscheidungen.filter((x) => x.typ.startsWith('planung_')).length }),
  };
}
