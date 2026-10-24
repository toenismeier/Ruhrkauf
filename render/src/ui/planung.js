// O06 Planung: Planungsassistent, Abweichungsreporting, Forecast und Führungsboni.
// E47 (G2): Blatt wie Coffee 17 bis 22. Die Finanzvorständin spricht den Befund, oben die Abweichung zum Plan, darunter
// Wochenbalken Ist und Plan und das Planblatt je Format mit Strich vor der Summe; Reiterleiste unten.
import { geld, esc, clusterName } from './format.js';
import * as K from './komponenten.js';
import * as B from './g2-buch.js';

const pct = (v) => (100 * v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
const pctV = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + pct(Math.abs(v));
const mio = (v) => (v < 0 ? '−' : '') + (Math.abs(v) / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' Mio. €';
const m1 = (v) => (v < 0 ? '−' : '') + (Math.abs(v) / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const rolle = { haus: 'Hausleitungen', hauscluster: 'Clusterleitungen', bereich: 'Bereichsleitungen' };
const FORMATNAME = { warenhaus: 'Hartwig', sport: 'Hartwig Sport', schwester: 'Volkskauf', outlet: 'FUNDUS' };
const EBENE = { konzern: 'Konzern', format: 'Format', region: 'Region', hauscluster: 'Hauscluster', haus: 'Haus', warengruppe: 'Warengruppe' };
const REITER = [['assistent', 'Planung', 'leitung'], ['report', 'Reporting', 'zahlen'], ['forecast', 'Forecast', 'finanzen'], ['bonus', 'Boni', 'personal']];
const tonV = (v) => (v < 0 ? 'schlecht' : '');

export function planungModul(ctx) {
  const E = ctx.E, s = ctx.s, ui = { aktiv: false, tab: 'assistent', schritt: 1, auf: new Set(), wgAuf: false };
  // Hauscluster-Knoten tragen intern die Cluster-ID als Namen.
  const nname = (n) => (n.ebene === 'hauscluster' ? clusterName(s(), n.name) : n.name);
  const vor = () => E.planungAssistent(s());
  const reiter = () => B.G2 + K.reiterUnten(REITER, ui.tab, (id) => `data-pl-tab="${id}"`);
  const cfo = (text, ton = '') => B.vorstandSprecher(s(), 'cfo', 'Finanzvorstand', text, ton);

  // ─────────────────────────── Planungsrunde (Assistent)
  function entwurf(D) {
    const e = D.entwurf;
    if (!e || e.stand !== 'offen') return cfo('<b>Keine Planungsrunde offen.</b> Die nächste läuft in KW 40 bis 44.')
      + K.rumpf(K.abschnitt('Jahresplanung') + K.leer('Den laufenden Jahresplan zeigt der Reiter Reporting.', 'Keine Planungsrunde offen.') + K.knoepfe(K.knopf('Zum Reporting', 'data-pl-tab="report"', 'zweit breit')));
    let x = '<div class="hw-g2-oben">' + K.seg([[1, '1. Ziel'], [2, '2. Verteilung'], [3, '3. Abschluss']], ui.schritt, (v) => `data-pl-schritt="${v}"`) + '</div>';
    let befund = '';
    if (ui.schritt === 1) {
      befund = `<b>Planungsrunde ${e.jahr} ist offen.</b> Mein Vorschlag ist aus Vorjahr und Trend abgeleitet.`;
      const basis = D.vorschlag;
      x += K.gross([
        { label: `Umsatzziel ${e.jahr}`, wert: mio(e.ziele.umsatz), unter: `Vorschlag ${mio(basis.umsatz)}` },
        { label: 'EBITDA-Ziel', wert: mio(e.ziele.ebitda), ton: e.ziele.ebitda < 0 ? 'schlecht' : '', unter: `Vorschlag ${mio(basis.ebitda)}` },
      ]);
      const grenzen = {
        umsatz: [1e6, Math.max(0, Math.round(basis.umsatz * .75 / 1e6) * 1e6), Math.max(1e6, Math.round(basis.umsatz * 1.25 / 1e6) * 1e6)],
        ebitda: [1e6, Math.round((basis.ebitda - Math.abs(basis.umsatz * .04)) / 1e6) * 1e6, Math.round((basis.ebitda + Math.abs(basis.umsatz * .04)) / 1e6) * 1e6],
        investitionen: [1e5, 0, Math.max(1000000, Math.round(basis.investitionen * 2 / 100000) * 100000)],
      };
      const st = (id, titel) => { const [schritt, min, max] = grenzen[id], w = e.ziele[id];
        return K.feld(titel, K.stepper({ wert: mio(w), unter: `${mio(min)} bis ${mio(max)}`, label: titel, attrMinus: `data-pl-ziel="${id}" data-wert="${Math.max(min, w - schritt)}"`, attrPlus: `data-pl-ziel="${id}" data-wert="${Math.min(max, w + schritt)}"`, minusAus: w <= min, plusAus: w >= max })); };
      x += K.abschnitt('Zielsetzung', 'Vorschlag Konzerncontrolling');
      x += st('umsatz', 'Umsatz') + '<div class="hw-abstand"></div>' + st('ebitda', 'EBITDA') + '<div class="hw-abstand"></div>' + st('investitionen', 'Investitionen');
      x += B.fuss(`EBITDA-Effekt der Umsatzplanung bei 25 % zusätzlichem Deckungsbeitrag: ${mio(D.ebitdaSensitivitaet)}. Budgetwerte ändern zunächst nicht den laufenden Umsatz.`);
      x += K.knoepfe(K.knopf('Weiter zur Verteilung', 'data-pl-schritt="2"', 'breit'));
    } else if (ui.schritt === 2) {
      const nodes = Object.fromEntries(D.knoten.map((n) => [n.id, n]));
      const verdacht = D.knoten.filter((n) => n.verdacht).length;
      befund = verdacht ? `<b>${verdacht} ${verdacht === 1 ? 'Rückmeldung wirkt' : 'Rückmeldungen wirken'} zu vorsichtig.</b> Verdacht auf Sandbagging.` : '<b>Die Rückmeldungen der Leitungen liegen im Rahmen.</b>';
      x += K.gross([{ label: 'Konzernumsatz', wert: mio(nodes.konzern?.umsatz ?? e.ziele.umsatz), unter: 'verteilt auf Formate' }, { label: 'Sandbagging', wert: String(verdacht), ton: verdacht ? 'schlecht' : '', unter: verdacht === 1 ? 'Verdachtsfall' : 'Verdachtsfälle' }]);
      const zeilen = [];
      const knoten = (id, tiefe) => {
        const n = nodes[id]; if (!n) return;
        if (n.ebene !== 'konzern') {
          const kinder = (n.kinder ?? []).length, auf = ui.auf.has(n.id) || tiefe <= 1;
          const rueck = n.ebene === 'hauscluster' || n.ebene === 'haus' ? ` · Rückmeldung ${mio(n.rueckmeldung)}` : '';
          zeilen.push(`<div class="hw-g2-eingabe tiefe-${Math.min(tiefe, 4)}">${kinder && tiefe > 1 ? `<button type="button" class="hw-g2-name hw-g2-sort" data-pl-auf="${esc(n.id)}" aria-expanded="${auf}"><i class="hw-g2-auf" aria-hidden="true">${auf ? '▾' : '▸'}</i>` : '<span class="hw-g2-name">'}<span>${esc(nname(n))}<small>${esc(EBENE[n.ebene] ?? n.ebene)}${rueck}${n.verdacht ? ' · <span class="hw-schlecht">Sandbagging-Verdacht</span>' : ''}</small></span>${kinder && tiefe > 1 ? '</button>' : '</span>'}`
            + `<input class="hw-g2-auswahl hw-kontur" type="number" step="0.1" min="0" inputmode="decimal" data-pl-knoten="${esc(n.id)}" value="${(n.umsatz / 1e6).toFixed(1)}" aria-label="${esc(nname(n))} Ziel in Mio. Euro"></div>`);
          if (!auf) return;
        }
        for (const k of n.kinder ?? []) knoten(k, tiefe + 1);
      };
      knoten('konzern', 0);
      x += B.buch({ titel: 'Verteilung', spalten: ['Ziel Mio. €'], zeilen, breite: 96 });
      x += B.fuss('Formate, Regionen, Hauscluster, Häuser. Ändert sich ein Teilbudget, gleicht das übergeordnete Budget aus.');
      x += K.abschnitt('Warengruppenziele', 'Konzernsumme bleibt');
      x += B.buch({ titel: 'Warengruppe', spalten: ['Ziel Mio. €'], breite: 96, zeilen: Object.entries(D.warengruppen || {}).map(([id, value]) =>
        `<div class="hw-g2-eingabe"><span class="hw-g2-name"><span>${esc(E.GRUPPEN?.[id]?.name || id)}</span></span><input class="hw-g2-auswahl hw-kontur" type="number" min="0" step="0.1" inputmode="decimal" data-pl-wg="${esc(id)}" value="${(value / 1e6).toFixed(1)}" aria-label="${esc(E.GRUPPEN?.[id]?.name || id)} Ziel in Mio. Euro"></div>`) });
      x += K.knoepfe(K.knopf('Weiter zum Abschluss', 'data-pl-schritt="3"', 'breit'));
    } else {
      befund = `<b>Jahresplan ${e.jahr} wartet auf deinen Beschluss.</b> Ohne Aktion gilt nach Fristablauf mein Vorschlag.`;
      x += K.gross([{ label: 'Konzernumsatz', wert: mio(e.ziele.umsatz) }, { label: 'EBITDA-Ziel', wert: mio(e.ziele.ebitda), ton: e.ziele.ebitda < 0 ? 'schlecht' : '' }]);
      x += K.abschnitt(`Jahresplan ${e.jahr}`);
      x += K.tabelle({ zeilen: [{ name: 'Konzernumsatz', werte: [mio(e.ziele.umsatz)] }, { name: 'EBITDA-Ziel', werte: [mio(e.ziele.ebitda)], ton: [tonV(e.ziele.ebitda)] }, { name: 'Investitionsbudget', werte: [mio(e.ziele.investitionen)] }] });
      x += B.fuss('Mit dem Abschluss werden Wochenbudgets und Clusterziele verbindlich.');
      x += K.knoepfe(K.knopf('Angepasste Planung beschließen', 'data-pl-abschluss="spieler"', 'breit'));
      x += K.knoepfe(K.knopf('Controlling-Vorschlag übernehmen', 'data-pl-abschluss="controlling"', 'zweit breit'));
    }
    return cfo(befund) + K.rumpf(x);
  }

  // ─────────────────────────── Reporting
  function bericht(D) {
    // Hauptfrage: Liegen wir im Plan? Oben die kumulierte Abweichung, dann fünf Wochen Ist und Plan als Balken, darunter
    // das Planblatt je Format mit Regionen als Zeilen und Summenstrich (Regionen ergeben das Format), Hauscluster aufklappbar.
    const b = D.bericht;
    if (!b.ziele) return cfo('<b>Es gibt noch keinen Jahresplan.</b> Die Planungsrunde läuft in KW 40 bis 44.') + K.rumpf(K.abschnitt('Planblatt') + K.leer('Bis zur ersten Planungsrunde gibt es nichts zu vergleichen.', 'Kein Jahresplan vorhanden.'));
    const q = b.planBisHeute ? b.abweichung / b.planBisHeute : 0;
    const befund = `<b>Wir liegen ${mio(Math.abs(b.abweichung))} ${b.abweichung >= 0 ? 'über' : 'unter'} Plan.</b> ` + (b.forecasting == null ? 'Der erste Jahresforecast entsteht nach KW 13.' : `Forecast ${mio(b.forecasting)}.`);
    let x = K.gross([
      { label: 'Abweichung zum Plan', wert: (b.abweichung > 0 ? '+' : '') + mio(b.abweichung), ton: b.abweichung < 0 ? 'schlecht' : 'gut', unter: `${pctV(q)} bis heute` },
      { label: 'Ist kumuliert', wert: mio(b.ist), unter: `Plan ${mio(b.planBisHeute)}` },
    ]);
    const letzte = (b.wochen || []).slice(-5);
    x += K.abschnitt(letzte.length ? `Umsatz KW ${(letzte[0].woche % 52) + 1} bis ${(letzte[letzte.length - 1].woche % 52) + 1}` : 'Umsatz je Woche');
    x += K.balken(letzte.map((w) => ({ label: String((w.woche % 52) + 1), a: w.plan, b: w.ist })), ['Plan', 'Ist']);
    x += K.tabelle({ titel: `Jahresplan ${b.jahr}`, zeilen: [{ name: 'Umsatz', werte: [mio(b.ziele.umsatz)] }, { name: 'EBITDA', werte: [mio(b.ziele.ebitda)], ton: [tonV(b.ziele.ebitda)] }, { name: 'Forecast Umsatz', werte: [b.forecasting == null ? 'nach KW 13' : mio(b.forecasting)] }] });
    const N = b.knoten, kinder = (id, ebene) => N.filter((n) => n.ebene === ebene && n.parent === id);
    const fname = (f) => FORMATNAME[f.id.replace('format:', '')] ?? f.name;
    const spalten = ['Plan', 'Ist', 'Abw.'];
    for (const f of N.filter((n) => n.ebene === 'format')) {
      const zeilen = [];
      for (const r of kinder(f.id, 'region')) {
        const cl = kinder(r.id, 'hauscluster'), auf = ui.auf.has(r.id);
        zeilen.push(B.reihe({ name: esc(nname(r)), werte: [{ t: m1(r.umsatz), s: 'p' }, { t: m1(r.ist), s: 'i' }, { t: pctV(r.abweichung), ton: tonV(r.abweichung) }],
          pfeil: cl.length ? (auf ? '▾' : '▸') : '', attr: cl.length ? `data-pl-auf="${esc(r.id)}" aria-expanded="${auf}"` : '' }));
        if (auf) for (const c of cl) zeilen.push(B.reihe({ name: esc(nname(c)), werte: [m1(c.umsatz), m1(c.ist), { t: pctV(c.abweichung), ton: tonV(c.abweichung) }], art: 'unter' }));
      }
      zeilen.push(B.reihe({ name: `${esc(fname(f))} gesamt`, werte: [{ t: m1(f.umsatz), summe: 'p' }, { t: m1(f.ist), summe: 'i' }, { t: pctV(f.abweichung), ton: tonV(f.abweichung) }], art: 'summe' }));
      x += B.buch({ titel: `${fname(f)} Mio. €`, spalten, zeilen, breite: 64, attr: `data-summenbuch="Planblatt ${esc(fname(f))}"` });
    }
    const w = (b.wochen || []).slice().reverse();
    x += w.length ? B.buch({ titel: 'Woche Mio. €', spalten: ['Ist', 'Plan', 'Abw.'], breite: 64, zeilen: w.map((z) => B.reihe({ name: `KW ${(z.woche % 52) + 1}`, werte: [m1(z.ist), m1(z.plan), { t: pctV(z.abweichungQuote), ton: tonV(z.abweichungQuote) }] })) })
      : K.abschnitt('Wochen') + K.leer('Noch keine Woche im Plan.');
    if (b.warengruppen) {
      x += K.abschnitt('Warengruppenbudgets', `${Object.keys(b.warengruppen).length} Gruppen`);
      x += ui.wgAuf ? K.tabelle({ zeilen: Object.entries(b.warengruppen).map(([g, v]) => ({ name: E.GRUPPEN?.[g]?.name ?? g, werte: [mio(v)] })) }) + K.knoepfe(K.knopf('Weniger zeigen', 'data-pl-wgauf="0"', 'text'))
        : K.knoepfe(K.knopf('Budgets je Warengruppe zeigen', 'data-pl-wgauf="1"', 'zweit breit'));
    }
    return cfo(befund, b.abweichung < 0 ? 'engpass' : '') + K.rumpf(x);
  }

  // ─────────────────────────── Forecast
  function forecasts(D) {
    const L = D.bericht.forecasts || [];
    const offen = L.find((f) => f.status === 'offen');
    let x = '';
    const befund = offen ? `<b>Der Forecast ${esc(offen.bezeichnung)} ist zur Freigabe offen.</b> Eigentümer und Bank warten.`
      : L.length ? `<b>Alle Forecasts sind abgegeben.</b> 3+9 in KW 13, 6+6 in KW 26, 9+3 in KW 39.` : '<b>Noch kein Forecast.</b> Der erste Forecast (3+9) entsteht nach KW 13.';
    if (offen) {
      x += K.gross([{ label: 'Jahresumsatz', wert: mio(offen.ziele.umsatz) }, { label: 'EBITDA', wert: mio(offen.ziele.ebitda), ton: offen.ziele.ebitda < 0 ? 'schlecht' : '' }]);
      x += K.abschnitt(`${offen.bezeichnung} anpassen`, 'Mio. €');
      x += B.felder(K.feld('Umsatz', `<input class="hw-g2-auswahl hw-kontur" data-pl-forecast="umsatz" type="number" min="0" step="0.1" inputmode="decimal" value="${(offen.ziele.umsatz / 1e6).toFixed(1)}" aria-label="Umsatz in Mio. Euro">`),
        K.feld('EBITDA', `<input class="hw-g2-auswahl hw-kontur" data-pl-forecast="ebitda" type="number" step="0.1" inputmode="decimal" value="${(offen.ziele.ebitda / 1e6).toFixed(1)}" aria-label="EBITDA in Mio. Euro">`));
      x += K.knoepfe(K.knopf('Speichern und abgeben', 'data-pl-forecast-abgabe="1"', 'breit'));
    }
    const status = (f) => (f.status === 'abgegeben' ? 'abgegeben' : f.status === 'offen' ? 'zur Freigabe' : 'zurückgehalten');
    x += L.length ? K.tabelle({ titel: 'Forecasts', spalten: ['Umsatz', 'EBITDA'], zeilen: [...L].reverse().map((f) => ({ name: `${f.bezeichnung} · ${f.jahr} · ${status(f)}`, werte: [mio(f.ziele.umsatz), mio(f.ziele.ebitda)], ton: ['', tonV(f.ziele.ebitda)] })) })
      : K.abschnitt('Forecasts') + K.leer('Der erste Forecast (3+9) entsteht nach KW 13.', 'Noch kein Forecast.');
    if (D.bericht.vertrauen?.length) {
      x += K.abschnitt('Trefferquote und Vertrauen', 'letzte 8');
      x += K.liste(D.bericht.vertrauen.slice(-8).map((v) => K.zeile({ was: `KW ${(v.woche % 52) + 1}`, unter: `Abweichung ${pct(v.abweichung)}`, wert: (v.delta > 0 ? '+' : v.delta < 0 ? '−' : '') + Math.abs(v.delta), ton: v.delta < 0 ? 'schlecht' : v.delta > 0 ? 'gut' : '' })));
    }
    x += B.fuss('3+9 in KW 13, 6+6 in KW 26 und 9+3 in KW 39. Der Forecast kann vor der Abgabe an Eigentümer und Bank angepasst werden.');
    return cfo(befund, offen ? 'engpass' : '') + K.rumpf(x);
  }

  // ─────────────────────────── Boni
  function boni(D) {
    const q = D.bericht.quoten || {};
    const liste = [...(D.bericht.boni || [])].reverse().slice(0, 5);
    const faellig = liste.find((b) => !b.bezahlt);
    let x = K.gross([{ label: 'Nächste Auszahlung', wert: faellig ? geld(faellig.betrag) : geld(0), unter: faellig ? `Bonusjahr ${faellig.jahr}, im Februar` : 'nichts fällig' },
      { label: 'Leitungsposten', wert: String(faellig?.details.length ?? 0), unter: 'mit Bonus' }]);
    x += K.abschnitt('Bonusanteil am Gehalt', 'Umsatz- und EBITDA-Ziel');
    x += '<div class="hw-felder">' + Object.entries(rolle).map(([id, titel]) => { const w = q[id] ?? 0.1;
      return K.feld(titel, K.stepper({ wert: pct(w), label: titel, attrMinus: `data-pl-bonus="${id}" data-wert="${Math.max(0, Math.round((w - 0.05) * 100) / 100)}"`, attrPlus: `data-pl-bonus="${id}" data-wert="${Math.min(0.3, Math.round((w + 0.05) * 100) / 100)}"`, minusAus: w <= 0.001, plusAus: w >= 0.299 })); }).join('') + '</div>';
    x += B.fuss('Abrechnung im Jahresabschluss, Auszahlung im Februar des Folgejahres als Personalaufwand.');
    x += liste.length ? K.tabelle({ titel: 'Bonusjahre', spalten: ['Summe', 'Posten'], zeilen: liste.map((b) => ({ name: `${b.jahr} · ${b.bezahlt ? 'ausgezahlt' : 'fällig im Februar'}`, werte: [geld(b.betrag), String(b.details.length)] })) })
      : K.abschnitt('Bonusjahre') + K.leer('Das erste Bonusjahr wird im Jahresabschluss abgerechnet.');
    const befund = faellig ? `<b>Im Februar zahlen wir ${geld(faellig.betrag)} Führungsboni aus.</b>` : '<b>Kein Bonus ist fällig.</b> Abgerechnet wird im Jahresabschluss.';
    return cfo(befund) + K.rumpf(x);
  }

  function zeigen(halten = false) {
    const position = document.getElementById('pinhalt').scrollTop, D = vor();
    const html = reiter() + (ui.tab === 'assistent' ? entwurf(D) : ui.tab === 'report' ? bericht(D) : ui.tab === 'forecast' ? forecasts(D) : boni(D));
    ctx.panel('Planung und Forecast', 'Konzerncontrolling · KW ' + ((s().woche % 52) + 1), K.bereich('zentrale') + html, 'gross');
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
  const klick = (ev) => {
    if (!ui.aktiv) return;
    const el = ev.target.closest('[data-pl-tab],[data-pl-schritt],[data-pl-abschluss],[data-pl-forecast-abgabe],[data-pl-auf],[data-pl-wgauf],[data-pl-ziel],[data-pl-bonus]');
    if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
    if (el.dataset.plTab) { ui.tab = el.dataset.plTab; return zeigen(); }
    if (el.dataset.plSchritt) { ui.schritt = Number(el.dataset.plSchritt); return zeigen(); }
    if (el.dataset.plAuf) { const id = el.dataset.plAuf; if (ui.auf.has(id)) ui.auf.delete(id); else ui.auf.add(id); return zeigen(true); }
    if (el.dataset.plWgauf) { ui.wgAuf = el.dataset.plWgauf === '1'; return zeigen(true); }
    if (el.dataset.plZiel) { tun({ typ: 'planungZiel', kennzahl: el.dataset.plZiel, wert: Number(el.dataset.wert) }); return zeigen(true); }
    if (el.dataset.plBonus) { tun({ typ: 'planungBonus', ebene: el.dataset.plBonus, anteil: Number(el.dataset.wert) }); return zeigen(true); }
    if (el.dataset.plAbschluss) {
      if (tun({ typ: 'planungAbschliessen', quelle: el.dataset.plAbschluss })) return zeigen();
    }
    if (el.dataset.plForecastAbgabe) {
      const u = Number(inhalt.querySelector('[data-pl-forecast="umsatz"]')?.value) * 1e6;
      const e = Number(inhalt.querySelector('[data-pl-forecast="ebitda"]')?.value) * 1e6;
      if (!tun({ typ: 'planungForecast', umsatz: u, ebitda: e })) return;
      const v = s().entscheidungen.find((d) => d.typ === 'planung_forecast');
      if (v) tun({ typ: 'entscheiden', id: v.id, option: 'abgeben' });
      return zeigen();
    }
  };
  inhalt.addEventListener('click', klick);
  // E47: Die Reiterleiste liegt außerhalb von #pinhalt (huelleOrdnen hebt sie in #preiter).
  document.getElementById('preiter')?.addEventListener('click', klick);
  inhalt.addEventListener('change', (ev) => {
    if (!ui.aktiv) return;
    const el = ev.target;
    if (el.dataset.plKnoten) { tun({ typ: 'planungVerteilen', id: el.dataset.plKnoten, umsatz: Math.round(Number(el.value) * 1e6) }); return zeigen(true); }
    if (el.dataset.plWg) { tun({ typ: 'planungWarengruppe', gruppe: el.dataset.plWg, umsatz: Math.round(Number(el.value) * 1e6) }); return zeigen(true); }
  });
  return {
    // Ohne offene Planungsrunde ist das Reporting die Hauptaufgabe und öffnet direkt.
    oeffne: (tab) => { ui.tab = tab ?? (vor().entwurf?.stand === 'offen' ? 'assistent' : 'report'); ui.schritt = 1; zeigen(); },
    aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; }, neuZeichnen: () => zeigen(true),
    pruefe: () => ({ jahr: vor().bericht.jahr, knoten: vor().bericht.knoten.length, freigaben: s().entscheidungen.filter((x) => x.typ.startsWith('planung_')).length }),
  };
}
