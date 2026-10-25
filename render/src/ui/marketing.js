// Marketing-Panel (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5; E47 Gestaltung nach Coffee 05, 23–25):
// Übersicht, Kanäle als Karussell, Städte mit Marktanteil-Ring, Karte und App als Kacheln, CRM-Baukasten mit Auswertung,
// Aktionskalender als Zeitleiste mit Planen, Absagen und Auswertung.
// Daten: marketingUebersicht, kanaele, kundenkarte, crmKampagnen, aktionskalender, aktionsAuswertung; Aktionen über fuehreAus.
// Prüfung wie im Vorstand: data-p-Werte gegen eine frische Darstellung aus den Abfragen.
import { geld, fmt, pz, dez, kwVon, esc } from './format.js';
import { ortDaten, stadtAnsicht, kanaeleAnsicht, kachel, kachelRaster, skalaGross, merke } from './marketing-q16.js';
import * as K from './komponenten.js';
import { kanalBildSVG } from '../kit/marketing-bilder.js';
import { portraetSVG, zufallsMerkmale } from '../kit/portraet.js';
import { werteSammler, vergleiche, wocheText } from './vorstand.js';

const STATUS = { geplant: 'geplant', laufend: 'läuft', beendet: 'beendet', abgesagt: 'abgesagt', aktiv: 'aktiv', gestoppt: 'gestoppt' };
const MONATE = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const ANGEBOT = [['coupon', 'Coupon'], ['punkte', 'Punkte'], ['zugabe', 'Zugabe'], ['info', 'Info']];
const FREQUENZ = [['einmalig', 'einmalig'], ['woechentlich', 'wöchentlich'], ['zweiwoechentlich', 'alle 14 Tage'], ['monatlich', 'monatlich'], ['quartal', 'je Quartal']];
const KANAL = [['mail', 'Mail'], ['push', 'Push'], ['brief', 'Brief']];
const REITER = [['uebersicht', 'Überblick', 'reporting'], ['kanaele', 'Kanäle', 'marketing'], ['stadt', 'Städte', 'staedte'], ['karte', 'Karte', 'kundenkarte'], ['crm', 'CRM', 'crm'], ['kalender', 'Kalender', 'kalender']];
const SICHT = { uebersicht: 'Überblick', kanaele: 'Kanäle', stadt: 'Städte', karte: 'Karte und App', crm: 'CRM-Versand', kalender: 'Aktionskalender', aktion: 'Aktion' };
/** Kanalmotiv aus dem Kit ohne hellen Bildgrund. */
const motiv = (id) => kanalBildSVG(id).replace(/<rect width="190" height="160" rx="8" fill="#f0eee9"\/><rect y="140" width="190" height="20" fill="#e2dfd8"\/>/, '');
const zyklus = (liste, aktuell, d) => { const i = Math.max(0, liste.findIndex(([v]) => String(v) === String(aktuell))); return liste[(i + d + liste.length) % liste.length][0]; };

export function marketingModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const da = typeof E.marketingUebersicht === 'function';
  const ui = {
    aktiv: false, seite: 'uebersicht', jahr: null, aktion: null, planen: null, stadt: null, region: 'alle', kachel: -1, rollout: null,
    crm: { seg: 0, kanal: 'mail', angebot: 'coupon', prozent: 0.15, mindestbon: 40, faktor: 3, wert: 10, frequenz: 'monatlich', wochen: 13, kontrolle: true },
  };

  /** Sprecher: Marketingvorstand, sonst die Bereichsleitung Marketing. */
  function sprecher(text, ton = '') {
    const r = E.vorstandUebersicht?.(s())?.ressorts?.find((x) => x.id === 'cmo');
    const p = r?.person;
    return K.sprecher({ text, ton, unter: p ? `${p.name} · Marketingvorstand` : 'Bereichsleitung Marketing', person: portraetSVG(p?.portraet ?? zufallsMerkmale('bereich:marketing'), 72) });
  }

  // ─────────────────────────── Überblick
  function uebersicht(P) {
    // Hauptfrage: Bringt mein Werbegeld diese Woche Kundschaft? Oben Kundschaft je Woche, darunter das Werbebudget als Buch
    // (Zeilen in Tsd. €, Summe = Summe der gezeigten Zeilen, data-summenbuch für tests/q31-summen.cjs).
    const u = E.marketingUebersicht(s());
    const tsd = (x) => Math.round(x / 1000), tsdText = (n) => `${fmt.format(n)} Tsd. €`;
    const v = u.verlauf, vor = v.length > 1 ? v[v.length - 2].kunden : null;
    const delta = vor == null ? null : u.frequenzWoche - vor;
    let h = K.gross([
      { label: 'Kundschaft je Woche', wert: merke(P, 'u:frequenz', fmt.format(Math.round(u.frequenzWoche))), p: 'u:frequenz',
        unter: delta == null ? 'erste Woche' : K.abweichung(delta, `${delta >= 0 ? '+' : '−'}${fmt.format(Math.abs(Math.round(delta)))} zur Vorwoche`) },
      { label: 'Durchschnittsbon', wert: merke(P, 'u:bon', geld(u.bon)), p: 'u:bon', unter: `Werbung netto ${P('u:netto', geld(u.wocheNetto), 'span')}` },
    ]);
    const letzte = v.slice(-5);
    h += K.abschnitt('Kundschaft', letzte.length ? `KW ${kwVon(letzte[0].woche)} bis ${kwVon(letzte[letzte.length - 1].woche)}` : '');
    h += K.balken(letzte.map((x) => ({ label: 'KW ' + kwVon(x.woche), a: x.kunden, b: null })));
    const zeilen = [['kanaele', 'Kanäle', 'Prospekt, Anzeigen, Plakat, Radio, TV, Online, Social'], ['karte', 'Hartwig Karte', 'Punkte, Stufen, Betrieb, Daten'], ['app', 'Hartwig App', 'Pflege und Werbung'], ['crm', 'CRM-Versand', 'Mail, Push, Brief']].map(([k, t, d]) => ({ k, t, d, n: tsd(u.bloecke[k]) }));
    const brutto = zeilen.reduce((a, z) => a + z.n, 0), beteiligung = tsd(u.wocheBeteiligung);
    const summe = (was, html) => K.zeile({ was, wert: html }).replace('class="hw-zeile"', 'class="hw-zeile hw-g3-summe"');
    h += K.abschnitt('Werbebudget je Woche', 'Tsd. €');
    h += `<div data-summenbuch="Werbebudget">${K.liste([
      ...zeilen.map((z) => K.zeile({ was: z.t, unter: z.d, wert: P(`u:block:${z.k}`, tsdText(z.n), 'span', ' data-s="e"') })),
      summe('Brutto', P('u:brutto', tsdText(brutto), 'span', ' data-summe="e"')),
      K.zeile({ was: 'Lieferantenbeteiligung', unter: 'Werbekostenzuschüsse', wert: P('u:beteiligung', `−${tsdText(beteiligung)}`, 'span', ' data-s="e"') }),
      summe('Netto', P('u:nettoTsd', tsdText(brutto - beteiligung), 'span', ' data-summe="e"')),
    ])}</div>`;
    h += K.abschnitt('Marke und Kundschaft');
    h += skalaGross('Markenstärke', u.markenstaerke, P('u:marke', `${Math.round(u.markenstaerke)}`, 'b', ' class="hw-skala-wert"'));
    h += K.liste([
      K.zeile({ was: 'Werbequote netto', wert: P('u:quote', pz(u.werbequoteNetto, 1), 'span') }),
      K.zeile({ was: 'Image', wert: P('u:image', `${Math.round(u.image)} / 100`, 'span') }),
      K.zeile({ was: 'Umsatz mit Karte', wert: P('u:karte', pz(u.kartenanteil, 1), 'span') }),
      K.zeile({ was: 'Rabattquote 13 Wochen', wert: P('u:rabatt', pz(u.rabattquote13, 1), 'span'), ton: u.rabattquote13 > 0.08 ? 'schlecht' : '' }),
    ]);
    const aktionZeile = (a) => K.zeile({ was: esc(a.name), unter: esc(a.mechanikText) + (a.rabatt ? ` ${pz(a.rabatt)}` : ''), wert: `KW ${a.startKw}${a.endeKw !== a.startKw ? ` bis ${a.endeKw}` : ''}`, wertUnter: STATUS[a.status] ?? a.status, tippbar: true, attr: `data-a="aktion" data-v="${esc(a.id)}"` });
    h += K.abschnitt('Aktionen', 'läuft und als Nächstes');
    h += u.laufend.length || u.naechste.length ? K.liste([...u.laufend, ...u.naechste].map(aktionZeile)) : K.leer('Im Kalender planst du die nächste.', 'Keine Aktion geplant.');
    for (const x of u.hinweise) h += K.hinweis(esc(x), 'achtung');
    h += K.knoepfe(K.knopf('Neue Eigenmarke gründen', 'data-a="eigenmarkeGruenden"', 'breit'));
    const befund = delta == null ? `Werbung netto ${geld(u.wocheNetto)} je Woche, ${pz(u.werbequoteNetto, 1)} vom Umsatz.`
      : `${delta >= 0 ? '+' : '−'}${fmt.format(Math.abs(Math.round(delta)))} Kunden zur Vorwoche bei ${geld(u.wocheNetto)} Werbung netto.`;
    return { titel: 'Marketing', unter: `Werbequote ${pz(u.werbequoteNetto, 1)} · KW ${u.kw} / ${u.jahr}`, befund: u.rabattquote13 > 0.08 ? `Die Rabattquote liegt bei ${pz(u.rabattquote13, 1)}. Kunden gewöhnen sich an Preisaktionen.` : befund, ton: u.rabattquote13 > 0.08 ? 'engpass' : '', html: K.rumpf(h) };
  }

  // ─────────────────────────── Kanäle und Städte (marketing-q16.js)
  function kanaele(P) { const r = kanaeleAnsicht(E, s, ui, P); return { titel: 'Marketingkanäle', unter: 'Wochenbudget je Kanal', ...r }; }
  function staedte(P) { const r = stadtAnsicht(E, s, ui, P); return { titel: 'Marktanteile', unter: 'Städte und Markenbekanntheit', ...r }; }

  // ─────────────────────────── Karte und App als Kacheln (Coffee 23–24)
  function karte(P) {
    const st = s(), k = E.kundenkarte(st), a = k.app;
    const praemieLaeuft = k.anmeldeBis !== undefined && k.anmeldeBis > st.woche, relaunch = a.relaunchBis !== undefined && a.relaunchBis > st.woche;
    const geldP = (key, x) => x > 0 ? P(key, geld(x), 'span') : P(key, '0 €', 'span');
    const KACHELN = [
      { id: 'punkte', bild: K.symbol('kundenkarte', 'kommentare'), titel: 'Punkteprogramm', stufe: k.punkteSatz >= 0.01 ? '1 je 1 €' : k.punkteSatz >= 0.005 ? '1 je 2 €' : '1 je 4 €', wert: geldP('ka:k:punkte', k.kostenWoche.punkte), an: true,
        steuer: () => K.feld('Punkte je Euro', K.seg([[0.0025, '1 je 4 €'], [0.005, '1 je 2 €'], [0.01, '1 je 1 €']], k.punkteSatz, (w) => `data-a="punkte" data-v="${w}"`)) + '<p class="hw-lese hw-g3-notiz">1 Punkt ist 1 Cent wert.</p>' },
      { id: 'stufen', bild: K.symbol('podest', 'etagen'), titel: 'Silber und Gold', stufe: k.stufen ? 'An' : 'Aus', wert: k.stufen ? geld(k.kostenWoche.stufen) : '0 €', an: k.stufen,
        steuer: () => K.schalter({ text: 'Statusstufen Silber und Gold', unter: 'bindet Top-Kunden, Einführung kostet einmalig', an: k.stufen, attr: 'data-a="stufen"' }) },
      { id: 'rabatt', bild: K.symbol('reduzierung', 'kosten'), titel: 'Kartenrabatt', stufe: k.kartenrabatt ? pz(k.kartenrabatt) : 'kein', wert: k.kartenrabatt ? pz(k.kartenrabatt) : '0 %', einheit: 'auf Kartenkäufe', an: k.kartenrabatt > 0,
        steuer: () => K.feld('Dauerhafter Rabatt', K.seg([[0, 'kein'], [0.02, '2 %'], [0.03, '3 %'], [0.05, '5 %']], k.kartenrabatt, (w) => `data-a="kartenrabatt" data-v="${w}"`)) },
      { id: 'praemie', bild: K.symbol('boni', 'post'), titel: 'Anmeldeprämie', stufe: praemieLaeuft ? `bis ${wocheText(st, k.anmeldeBis)}` : 'keine', wert: praemieLaeuft ? geld(k.kostenWoche.anmeldung) : '0 €', an: praemieLaeuft,
        steuer: () => K.feld('Willkommensgutschein für 8 Wochen', K.seg([[0, 'keine'], [5, '5 €'], [10, '10 €'], [20, '20 €']], praemieLaeuft ? k.anmeldepraemie : 0, (w) => `data-a="praemie" data-v="${w}"`)) },
      { id: 'daten', bild: K.symbol('crm', 'zahlen'), titel: 'Datenpflege', stufe: `Qualität ${Math.round(k.datenqualitaet * 100)}`, wert: P('ka:datenBudget', geld(k.datenBudgetWoche), 'span'), an: k.datenBudgetWoche > 0,
        steuer: () => K.feld('Datenpflege je Woche', K.stepper({ wert: geld(k.datenBudgetWoche), unter: 'Adressen, Dubletten, Einwilligungen', label: 'Datenpflege', attrMinus: 'data-a="daten" data-v="-1"', attrPlus: 'data-a="daten" data-v="1"', minusAus: k.datenBudgetWoche <= 0 }))
          + skalaGross('Datenqualität', k.datenqualitaet * 100, P('ka:daten', String(Math.round(k.datenqualitaet * 100)), 'b', ' class="hw-skala-wert"')) + '<p class="hw-lese hw-g3-notiz">Bessere Daten machen CRM-Kampagnen treffsicherer.</p>' },
      { id: 'betrieb', bild: K.symbol('personal', 'personal'), titel: 'Kartenbetrieb', stufe: `${fmt.format(k.mitglieder)} Mitglieder`, wert: geld(k.kostenWoche.betrieb), an: true,
        steuer: () => K.liste([K.zeile({ was: 'Mitglieder', wert: P('ka:mitglieder', fmt.format(k.mitglieder), 'span') }), K.zeile({ was: 'davon aktiv', wert: P('ka:aktiv', pz(k.aktivQuote), 'span') }),
          K.zeile({ was: 'neu je Woche', wert: P('ka:neu', fmt.format(k.neuWoche), 'span') }), K.zeile({ was: 'Abgänge je Woche', wert: P('ka:ab', fmt.format(k.abgaengeWoche), 'span') }),
          K.zeile({ was: 'Mail-Einwilligung', wert: P('ka:mail', pz(k.mailQuote), 'span') })]) },
      { id: 'app', bild: motiv('social'), titel: 'Hartwig App', stufe: relaunch ? 'Relaunch läuft' : `Qualität ${Math.round(a.qualitaet * 100)}`, wert: P('ap:budget', geld(a.budgetWoche), 'span'), an: a.budgetWoche > 0,
        steuer: () => K.feld('App-Budget je Woche', K.stepper({ wert: geld(a.budgetWoche), unter: 'Pflege und Werbung für Downloads', label: 'App-Budget', attrMinus: 'data-a="appBudget" data-v="-1"', attrPlus: 'data-a="appBudget" data-v="1"', minusAus: a.budgetWoche <= 0 }))
          + skalaGross('App-Qualität', a.qualitaet * 100, P('ap:qualitaet', String(Math.round(a.qualitaet * 100)), 'b', ` class="hw-skala-wert${a.qualitaet < 0.3 ? ' hw-schlecht' : ''}"`))
          + K.liste([K.zeile({ was: 'Downloads', wert: P('ap:downloads', fmt.format(a.downloads), 'span') }), K.zeile({ was: 'aktive Nutzer', wert: P('ap:aktiv', fmt.format(a.aktiveNutzer), 'span') }), K.zeile({ was: 'Push erlaubt', wert: P('ap:push', pz(a.pushQuote), 'span') })])
          + K.knoepfe(K.knopf(relaunch ? `Relaunch bis ${wocheText(st, a.relaunchBis)}` : 'App-Relaunch beauftragen', 'data-a="relaunch"', 'breit', relaunch)) },
      { id: 'coupons', bild: motiv('online'), titel: 'App-Coupons', stufe: a.appCoupons ? 'An' : 'Aus', wert: a.appCoupons ? 'An' : 'Aus', einheit: 'bei Aktionen', an: a.appCoupons,
        steuer: () => K.schalter({ text: 'Aktions-Coupons in der App', unter: 'holt Nutzer in die App', an: a.appCoupons, attr: 'data-a="appCoupons"' }) },
    ];
    const g = ui.kachel >= 0 && ui.kachel < KACHELN.length ? ui.kachel : -1;
    let h = K.gross([
      { label: 'Kosten Karte je Woche', wert: merke(P, 'ka:k:summe', geld(k.kostenWoche.summe)), p: 'ka:k:summe', unter: `Umsatzanteil ${P('ka:anteil', pz(k.umsatzAnteil, 1), 'span')}` },
      { label: 'App je Woche', wert: geld(a.kostenWoche), unter: `${fmt.format(a.aktiveNutzer)} aktive Nutzer` },
    ]);
    h += K.abschnitt('Kundenbindung', 'Kachel antippen');
    h += kachelRaster(KACHELN.map((x, i) => kachel({ bild: x.bild, titel: x.titel, stufe: x.stufe, wert: x.wert, einheit: x.einheit ?? 'je Woche', an: i === g, attr: `data-a="kachel" data-v="${i}" aria-label="${esc(x.titel)} einstellen"` })), g, g >= 0 ? KACHELN[g].steuer() : '');
    const befund = k.datenqualitaet < 0.5 ? `Die Kartendaten sind lückenhaft (Qualität ${Math.round(k.datenqualitaet * 100)}). CRM trifft schlechter.` : `${fmt.format(k.mitglieder)} Mitglieder bringen ${pz(k.umsatzAnteil, 1)} vom Umsatz.`;
    return { titel: 'Hartwig Karte und App', unter: `${pz(k.umsatzAnteil, 1)} vom Umsatz mit Karte`, befund, ton: k.datenqualitaet < 0.5 ? 'engpass' : '', html: K.rumpf(h) };
  }

  // ─────────────────────────── CRM
  function crm(P) {
    const c = E.crmKampagnen(s()), B = ui.crm;
    const segment = c.segmente[B.seg] ?? c.segmente[0];
    let h = K.gross([
      { label: 'per Mail', wert: merke(P, 'c:mail', fmt.format(c.pools.mail)), p: 'c:mail' },
      { label: 'per Push', wert: merke(P, 'c:push', fmt.format(c.pools.push)), p: 'c:push' },
      { label: 'per Brief', wert: merke(P, 'c:brief', fmt.format(c.pools.brief)), p: 'c:brief' },
    ]);
    h += skalaGross('Ermüdung Mail', (c.ermuedung.mail ?? 0) * 100, P('c:ermuedung', pz(c.ermuedung.mail ?? 0), 'b', ` class="hw-skala-wert${(c.ermuedung.mail ?? 0) > 0.5 ? ' hw-schlecht' : ''}"`));
    h += K.abschnitt('Neue Kampagne');
    h += K.feld('Segment', K.stepper({ wert: segment?.text ?? 'Alle', unter: segment ? `${fmt.format(segment.groesse)} Mitglieder` : '', label: 'Segment wählen', attrMinus: 'data-a="crmSeg" data-v="-1"', attrPlus: 'data-a="crmSeg" data-v="1"' }));
    h += '<div class="hw-abstand"></div>' + K.feld('Kanal', K.seg(KANAL, B.kanal, (w) => `data-a="crmKanal" data-v="${w}"`));
    h += '<div class="hw-abstand"></div>' + K.feld('Angebot', K.seg(ANGEBOT, B.angebot, (w) => `data-a="crmAngebot" data-v="${w}"`));
    if (B.angebot === 'coupon') h += '<div class="hw-abstand"></div>' + K.feld('Coupon', K.seg([[0.1, '10 %'], [0.15, '15 %'], [0.2, '20 %'], [0.25, '25 %']], B.prozent, (w) => `data-a="crmProzent" data-v="${w}"`))
      + '<div class="hw-abstand"></div>' + K.feld('Mindestbon', K.seg([[0, 'ohne'], [40, 'ab 40 €'], [80, 'ab 80 €']], B.mindestbon, (w) => `data-a="crmMindestbon" data-v="${w}"`));
    if (B.angebot === 'punkte') h += '<div class="hw-abstand"></div>' + K.feld('Mehrfachpunkte', K.seg([[2, '2-fach'], [3, '3-fach'], [5, '5-fach'], [10, '10-fach']], B.faktor, (w) => `data-a="crmFaktor" data-v="${w}"`));
    if (B.angebot === 'zugabe') h += '<div class="hw-abstand"></div>' + K.feld('Gratiszugabe', K.seg([[5, '5 €'], [10, '10 €'], [20, '20 €']], B.wert, (w) => `data-a="crmWert" data-v="${w}"`));
    h += '<div class="hw-abstand"></div>' + K.feld('Frequenz', K.stepper({ wert: FREQUENZ.find(([v]) => v === B.frequenz)?.[1] ?? B.frequenz, label: 'Frequenz', attrMinus: 'data-a="crmFrequenz" data-v="-1"', attrPlus: 'data-a="crmFrequenz" data-v="1"' }));
    if (B.frequenz !== 'einmalig') h += '<div class="hw-abstand"></div>' + K.feld('Laufzeit', K.seg([[4, '4 Wo.'], [8, '8 Wo.'], [13, '13 Wo.'], [26, '26 Wo.']], B.wochen, (w) => `data-a="crmWochen" data-v="${w}"`));
    h += K.schalter({ text: 'Kontrollgruppe, 10 % ohne Versand', unter: 'macht die Auswertung genauer', an: B.kontrolle, attr: 'data-a="crmKontrolle"' });
    h += K.knoepfe(K.knopf('Kampagne starten', 'data-a="crmStart"', 'breit'));
    const liste = [...c.kampagnen].sort((a, b) => (a.status === 'aktiv' ? -1 : 0) - (b.status === 'aktiv' ? -1 : 0) || b.start - a.start);
    for (const k of liste) {
      const z = k.summe;
      h += K.abschnitt(k.name, STATUS[k.status] ?? k.status);
      h += `<p class="hw-lese hw-g3-notiz">${esc(k.segmentText)} · ${esc(k.kanalText)} · ${esc(k.angebotText)} · ${esc(k.frequenzText)}${k.standard ? ' · Grundprogramm' : ''}${k.kontrollgruppe ? ' · mit Kontrollgruppe' : ''}${k.naechsterVersand !== undefined ? ` · nächster Versand KW ${kwVon(k.naechsterVersand)}` : ''}</p>`;
      const zeilen = [K.zeile({ was: 'Versendet', wert: P(`c:${k.id}:versendet`, fmt.format(z.versendet), 'span') }), K.zeile({ was: 'Öffnung', wert: P(`c:${k.id}:oeffnung`, pz(z.oeffnungsrate, 1), 'span') }), K.zeile({ was: 'Einlösung', wert: P(`c:${k.id}:einloesung`, pz(z.einloesequote, 1), 'span') })];
      if (k.auswertung) zeilen.push(K.zeile({ was: 'Mehrumsatz', wert: P(`c:${k.id}:mehr`, `${geld(k.auswertung.mehrumsatzVon)} bis ${geld(k.auswertung.mehrumsatzBis)}`, 'span') }),
        K.zeile({ was: 'Ergebnis', wert: P(`c:${k.id}:ergebnis`, geld(k.auswertung.ergebnis), 'span'), ton: k.auswertung.ergebnis < 0 ? 'schlecht' : 'gut' }), K.zeile({ was: 'Abmeldungen', wert: P(`c:${k.id}:ab`, fmt.format(z.abmeldungen), 'span') }));
      h += K.liste(zeilen);
      if (k.auswertung) h += K.hinweis(esc(k.auswertung.hinweis));
      if (k.status === 'aktiv' || k.status === 'geplant') h += K.knoepfe(K.knopf('Kampagne stoppen', `data-a="crmStopp" data-v="${esc(k.id)}"`, 'zweit'));
    }
    const aktiv = c.kampagnen.filter((k) => k.status === 'aktiv').length;
    return { titel: 'CRM-Kampagnen', unter: `${aktiv} aktiv · Datenqualität ${Math.round(c.datenqualitaet * 100)}`, befund: (c.ermuedung.mail ?? 0) > 0.5 ? `Mail-Ermüdung ${pz(c.ermuedung.mail)}: Öffnungen sinken, Abmeldungen steigen.` : `${aktiv} Kampagnen laufen. Per Mail erreichen wir ${fmt.format(c.pools.mail)} Mitglieder.`, ton: (c.ermuedung.mail ?? 0) > 0.5 ? 'engpass' : '', html: K.rumpf(h) };
  }

  // ─────────────────────────── Kalender
  function zeitleiste(Kal) {
    const W = 350, L = 2, B = (W - L * 2) / 52, zeilen = [], balken = [];
    for (const a of Kal.eintraege) {
      const von = Math.max(0, a.start - (Kal.jahr - s().startJahr) * 52), bis = Math.min(52, a.ende - (Kal.jahr - s().startJahr) * 52);
      let z = zeilen.findIndex((e) => e <= von);
      if (z < 0) { z = zeilen.length; zeilen.push(0); }
      zeilen[z] = bis + 0.4;
      balken.push({ a, von, bis, z });
    }
    const RH = 24, H = 22 + Math.max(1, zeilen.length) * RH + 16;
    let g = `<svg class="hw-g3-zeitleiste" viewBox="0 0 ${W} ${H}" role="img" aria-label="Aktionen im Jahr ${Kal.jahr}">`;
    for (let m = 0; m < 12; m++) { const x = L + (m * 52 / 12) * B; g += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="16" y2="${H}" class="hw-g3-linie"/><text x="${(x + 3).toFixed(1)}" y="11" class="hw-g3-monat">${MONATE[m]}</text>`; }
    for (const { a, von, bis, z } of balken) {
      const x = L + von * B, w = Math.max(3, (bis - von) * B - 1), y = 20 + z * RH;
      g += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${RH - 6}" rx="5" class="hw-g3-akt-${a.status}"/>`;
    }
    const jetzt = s().woche - (Kal.jahr - s().startJahr) * 52;
    if (jetzt >= 0 && jetzt < 52) { const x = L + (jetzt + 0.5) * B; g += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="14" y2="${H}" class="hw-g3-jetzt"/>`; }
    return g + '</svg>';
  }
  function kalender(P) {
    const st = s(), jahr0 = st.startJahr + Math.floor(st.woche / 52);
    ui.jahr ??= jahr0;
    const Kal = E.aktionskalender(st, ui.jahr);
    let h = K.seg([[jahr0, String(jahr0)], [jahr0 + 1, String(jahr0 + 1)]], ui.jahr, (w) => `data-a="jahr" data-v="${w}"`);
    h += K.abschnitt(`Kampagnenkalender ${Kal.jahr}`, `KW ${Kal.kw}`);
    h += zeitleiste(Kal);
    h += `<div class="hw-legende">${['geplant', 'laufend', 'beendet'].map((x) => `<span><i class="hw-g3-akt-${x}"></i>${STATUS[x]}</span>`).join('')}</div>`;
    h += K.knoepfe(K.knopf(ui.planen ? 'Planung schließen' : 'Aktion planen', 'data-a="planen"', ui.planen ? 'zweit breit' : 'breit'));
    if (ui.planen) h += planen(Kal);
    h += K.abschnitt('Aktionsbuch', 'Wochen · Status');
    h += Kal.eintraege.length ? K.liste(Kal.eintraege.map((a) => K.zeile({ was: esc(a.name), unter: `${esc(a.mechanikText)}${a.rabatt ? ` ${pz(a.rabatt)}` : ''} · ${esc(a.scopeText)}`,
      wert: `KW ${a.startKw}${a.wochen > 1 ? ` bis ${a.endeKw}` : ''}`, wertUnter: P(`kal:${a.id}:status`, STATUS[a.status], 'span'), tippbar: true, attr: `data-a="aktion" data-v="${esc(a.id)}"` })))
      : K.leer('Plane die erste über den Knopf oben.', 'Keine Aktion in diesem Jahr.');
    for (const r of Kal.raeumungen) h += K.hinweis(`${esc(r.name)}: ${esc(r.text)}`);
    const n = Kal.eintraege.filter((a) => a.status !== 'abgesagt').length, laeuft = Kal.eintraege.find((a) => a.status === 'laufend');
    return { titel: 'Aktionskalender', unter: `${Kal.jahr} · ${n} Aktionen`, befund: laeuft ? `${esc(laeuft.name)} läuft bis KW ${laeuft.endeKw}. ${n} Aktionen im Jahr ${Kal.jahr}.` : `Gerade läuft keine Aktion. ${n} Aktionen im Jahr ${Kal.jahr}.`, html: K.rumpf(h) };
  }
  function planen(Kal) {
    const p = ui.planen, anl = Kal.anlaesse.filter((x) => x.id !== 'raeumung'), an = anl.find((x) => x.id === p.anlass);
    const mech = Kal.mechaniken.find((m) => m.id === p.mechanik);
    let h = K.abschnitt('Neue Aktion');
    h += K.feld('Anlass', K.stepper({ wert: an?.name ?? p.anlass, unter: an ? `üblich KW ${an.kw}${an.bereiche ? ` · ${an.bereiche.length} Bereiche` : ''}` : '', label: 'Anlass', attrMinus: 'data-a="planAnlass" data-v="-1"', attrPlus: 'data-a="planAnlass" data-v="1"' }));
    h += '<div class="hw-abstand"></div>' + K.feld('Mechanik', K.stepper({ wert: mech?.text ?? p.mechanik, label: 'Mechanik', attrMinus: 'data-a="planMechanik" data-v="-1"', attrPlus: 'data-a="planMechanik" data-v="1"' }));
    if (!['punkte', 'staffel'].includes(p.mechanik)) h += '<div class="hw-abstand"></div>' + K.feld('Rabatt', K.seg([[0.1, '10 %'], [0.15, '15 %'], [0.2, '20 %'], [0.3, '30 %'], [0.4, '40 %']], p.rabatt, (w) => `data-a="planRabatt" data-v="${w}"`));
    if (p.mechanik === 'punkte') h += '<div class="hw-abstand"></div>' + K.feld('Punkte', K.seg([[3, '3-fach'], [5, '5-fach'], [10, '10-fach']], p.punkteFaktor, (w) => `data-a="planPunkte" data-v="${w}"`));
    h += '<div class="hw-abstand"></div>' + K.feld('Start', K.stepper({ wert: `KW ${p.kw} / ${p.jahr}`, label: 'Startwoche', attrMinus: 'data-a="planKw" data-v="-1"', attrPlus: 'data-a="planKw" data-v="1"' }));
    h += '<div class="hw-abstand"></div>' + K.feld('Dauer', K.seg([[1, '1 Wo.'], [2, '2 Wo.'], [3, '3 Wo.'], [4, '4 Wo.']], p.wochen, (w) => `data-a="planWochen" data-v="${w}"`));
    h += '<div class="hw-abstand"></div>' + K.feld('Sonderwerbung', K.seg([[0, 'keine'], [250000, '250 Tsd.'], [750000, '750 Tsd.'], [1500000, '1,5 Mio.']], p.sonderwerbung, (w) => `data-a="planWerbung" data-v="${w}"`));
    h += K.schalter({ text: '5 Kontrollhäuser ohne Aktion', unter: 'genauere Auswertung, etwas weniger Umsatz', an: p.kontrolle, attr: 'data-a="planKontrolle"' });
    h += K.knoepfe(K.knopf('Aktion einplanen', 'data-a="planFertig"'), K.knopf('Abbrechen', 'data-a="planZu"', 'zweit'));
    return h;
  }
  function aktion(P) {
    const a = E.aktionsAuswertung(s(), ui.aktion);
    if (!a) { ui.seite = 'kalender'; return kalender(P); }
    let h = K.abschnitt(a.name, STATUS[a.status]);
    h += `<p class="hw-lese hw-g3-notiz">${esc(a.mechanikText)}${a.rabatt ? ` ${pz(a.rabatt)}` : ''}${a.bereicheText?.length ? ` auf ${a.bereicheText.map(esc).join(', ')}` : ''}</p>`;
    h += K.liste([K.zeile({ was: 'Zeitraum', wert: `KW ${a.startKw}${a.wochen > 1 ? ` bis ${a.endeKw}` : ''} / ${a.jahr}` }), K.zeile({ was: 'Geltung', wert: esc(a.scopeText) }),
      K.zeile({ was: 'Sonderwerbung', wert: a.sonderwerbung ? geld(a.sonderwerbung) : 'keine' })]);
    if (!a.gemessen) h += K.hinweis(esc(a.text));
    else {
      h += K.gross([{ label: 'Ergebnis', wert: merke(P, 'a:ergebnis', geld(a.ergebnis)), p: 'a:ergebnis', ton: a.ergebnis < 0 ? 'schlecht' : 'gut', unter: `Image ${P('a:image', `${a.image >= 0 ? '+' : '−'}${dez(Math.abs(a.image), 1)}`, 'span')}` }]);
      h += K.abschnitt('Wirkung', 'Spanne');
      h += K.liste([K.zeile({ was: 'Mehrumsatz', wert: P('a:mehr', `${geld(a.mehrumsatzVon)} bis ${geld(a.mehrumsatzBis)}`, 'span') }), K.zeile({ was: 'Rohertragseffekt', wert: P('a:roh', `${geld(a.rohertragseffektVon)} bis ${geld(a.rohertragseffektBis)}`, 'span') })]);
      h += K.abschnitt('Kosten der Aktion');
      h += K.liste([K.zeile({ was: 'Rabattkosten', wert: P('a:rabatt', geld(a.rabattkosten), 'span') }), K.zeile({ was: 'Mitnahme', wert: P('a:mitnahme', geld(a.mitnahme), 'span') }),
        K.zeile({ was: 'Vorzieheffekt', wert: P('a:vorzieh', geld(a.vorzieheffekt), 'span') }), K.zeile({ was: 'Kannibalisierung', wert: P('a:kanni', geld(a.kannibalisierung), 'span') }),
        K.zeile({ was: 'Altwarenabbau', wert: P('a:altware', geld(a.altwarenabbau), 'span') })]);
      h += K.hinweis(`Genauigkeit ${esc(a.genauigkeit)}${a.kontrollHaeuser ? ` · ${a.kontrollHaeuser} Kontrollhäuser` : ''}${a.hinweis ? ` · ${esc(a.hinweis)}` : ''}${a.marketingBericht ? ` · Marketing meldete ${geld(a.marketingBericht)}` : ''}`);
    }
    if (a.status === 'geplant') h += K.knoepfe(K.knopf('Eine Woche länger', `data-a="aktionLaenger" data-v="${esc(a.id)}"`, 'zweit'), K.knopf('Absagen', `data-a="aktionAbsagen" data-v="${esc(a.id)}"`, 'gefahr'));
    h += K.knoepfe(K.knopf('Zurück zum Kalender', 'data-a="seite" data-v="kalender"', 'text'));
    return { titel: 'Aktion', unter: `KW ${a.startKw} / ${a.jahr}`, befund: a.gemessen ? `${esc(a.name)}: Ergebnis ${geld(a.ergebnis)}.` : `${esc(a.name)} ist ${STATUS[a.status]}. Die Auswertung folgt nach dem Ende.`, ton: a.gemessen && a.ergebnis < 0 ? 'engpass' : '', html: K.rumpf(h) };
  }

  function rendern() {
    const S = werteSammler();
    if (!da) return { S, r: { titel: 'Marketing', unter: '', befund: 'Die Engine liefert noch kein Marketing.', html: K.rumpf(K.leer('Die Engine liefert noch kein Marketing.')) } };
    const f = { kanaele, stadt: staedte, karte, crm, kalender, aktion }[ui.seite] ?? uebersicht;
    return { S, r: f(S.P) };
  }
  function zeigen(scrollHalten = false) {
    const pi = document.getElementById('pinhalt'), sc = pi.scrollTop;
    const kar = pi.querySelector('.hw-karussell'), kx = kar ? kar.scrollLeft : 0;
    const { r } = rendern();
    const aktivReiter = ui.seite === 'aktion' ? 'kalender' : ui.seite;
    ctx.panel(r.titel, r.unter, K.bereich('zentrale', 'marketing') + sprecher(r.befund, r.ton) + '<i class="hw-g3" hidden></i>' + r.html
      + K.reiterUnten(REITER, aktivReiter, (id) => `data-a="seite" data-v="${id}" aria-label="${esc(SICHT[id])}"`), 'gross');
    ui.aktiv = true;
    pi.scrollTop = scrollHalten ? sc : 0;
    const neu = pi.querySelector('.hw-karussell');
    if (neu && scrollHalten) neu.scrollLeft = kx;
  }
  function tun(aktion, halten = true) {
    const r = E.fuehreAus(s(), aktion);
    if (r) ctx.meldung(r.text, r.ok);
    ctx.nachAktion?.();
    zeigen(halten);
    return r;
  }
  /** Fünf offene Häuser als Kontrollgruppe, über die Liste verteilt. */
  const kontrollHaeuser = () => { const l = s().haeuser.filter((h) => h.status === 'offen' && h.format === 'warenhaus'); const n = 5, out = []; for (let i = 0; i < n && l.length; i++) out.push(l[Math.floor(((i + 0.5) * l.length) / n)].id); return [...new Set(out)]; };
  function klick(el) {
    const a = el.dataset.a, v = el.dataset.v, st = s(), B = ui.crm;
    switch (a) {
      case 'eigenmarkeGruenden': return ctx.neueEigenmarke?.();
      case 'seite': ui.seite = v; ui.planen = null; ui.kachel = -1; return zeigen();
      case 'region': ui.region = v; ui.stadt = null; return zeigen(true);
      case 'stadtShift': { const d = ortDaten(E, s, ui); if (!d.auswahl.length) return; ui.stadt = d.auswahl[(d.index + Number(v) + d.auswahl.length) % d.auswahl.length].stadt; return zeigen(true); }
      case 'kachel': ui.kachel = ui.kachel === Number(v) ? -1 : Number(v); return zeigen(true);
      case 'teamAendern': return tun({ typ: 'kanalTeam', kanal: el.dataset.k, delta: Number(v) > 0 ? 1 : -1 });
      case 'aktion': ui.seite = 'aktion'; ui.aktion = v; return zeigen();
      case 'kanalBudget': return tun({ typ: 'kanalBudget', kanal: el.dataset.k, faktor: Number(v) > 0 ? 1.1 : 1 / 1.1 });
      case 'kanalRegion': {
        const c = E.kanaele(st).kanaele.find((x) => x.id === el.dataset.k); if (!c) return;
        const f = Math.round(Math.max(0, Math.min(3, (c.regionen[el.dataset.region] ?? 1) + Number(v) * 0.1)) * 10) / 10;
        return tun({ typ: 'kanalBudget', kanal: el.dataset.k, regionen: { [el.dataset.region]: f } });
      }
      case 'punkte': return tun({ typ: 'kundenkarteSetzen', punkteSatz: Number(v) });
      case 'stufen': return tun({ typ: 'kundenkarteSetzen', stufen: !E.kundenkarte(st).stufen });
      case 'kartenrabatt': return tun({ typ: 'kundenkarteSetzen', kartenrabatt: Number(v) });
      case 'praemie': return tun({ typ: 'kundenkarteSetzen', anmeldepraemie: Number(v), anmeldeWochen: Number(v) ? 8 : 0 });
      case 'daten': { const k = E.kundenkarte(st); return tun({ typ: 'kundenkarteSetzen', datenBudgetWoche: Math.max(0, k.datenBudgetWoche + Number(v) * 10000) }); }
      case 'appBudget': { const k = E.kundenkarte(st); return tun({ typ: 'appSetzen', budgetWoche: Math.max(0, k.app.budgetWoche + Number(v) * 10000) }); }
      case 'appCoupons': return tun({ typ: 'appSetzen', appCoupons: !E.kundenkarte(st).app.appCoupons });
      case 'relaunch': return tun({ typ: 'appSetzen', relaunch: true });
      case 'crmSeg': { const n = E.crmKampagnen(st).segmente.length; B.seg = (B.seg + Number(v) + n) % n; return zeigen(true); }
      case 'crmKanal': B.kanal = v; return zeigen(true);
      case 'crmAngebot': B.angebot = v; return zeigen(true);
      case 'crmProzent': B.prozent = Number(v); return zeigen(true);
      case 'crmMindestbon': B.mindestbon = Number(v); return zeigen(true);
      case 'crmFaktor': B.faktor = Number(v); return zeigen(true);
      case 'crmWert': B.wert = Number(v); return zeigen(true);
      case 'crmFrequenz': B.frequenz = zyklus(FREQUENZ, B.frequenz, Number(v)); return zeigen(true);
      case 'crmWochen': B.wochen = Number(v); return zeigen(true);
      case 'crmKontrolle': B.kontrolle = !B.kontrolle; return zeigen(true);
      case 'crmStart': {
        const seg = E.crmKampagnen(st).segmente[B.seg]?.segment ?? { typ: 'alle' };
        const angebot = B.angebot === 'coupon' ? { typ: 'coupon', prozent: B.prozent, mindestbon: B.mindestbon } : B.angebot === 'punkte' ? { typ: 'punkte', faktor: B.faktor } : B.angebot === 'zugabe' ? { typ: 'zugabe', wert: B.wert } : { typ: 'info' };
        return tun({ typ: 'crmKampagneAnlegen', segment: seg, kanal: B.kanal, angebot, frequenz: B.frequenz, ...(B.frequenz === 'einmalig' ? {} : { wochen: B.wochen }), kontrollgruppe: B.kontrolle });
      }
      case 'crmStopp': return tun({ typ: 'crmKampagneStoppen', id: v });
      case 'jahr': ui.jahr = Number(v); return zeigen(true);
      case 'planen': {
        const jahr = ui.jahr ?? st.startJahr + Math.floor(st.woche / 52), an = E.aktionskalender(st, jahr).anlaesse.find((x) => x.id === 'sonder');
        const kwJetzt = jahr === st.startJahr + Math.floor(st.woche / 52) ? kwVon(st.woche) + 2 : 1;
        ui.planen = ui.planen ? null : { anlass: 'sonder', mechanik: an.mechanik, rabatt: an.rabatt || 0.2, punkteFaktor: 5, kw: Math.min(52, kwJetzt), jahr, wochen: 1, sonderwerbung: 0, kontrolle: true };
        return zeigen(true);
      }
      case 'planZu': ui.planen = null; return zeigen(true);
      case 'planAnlass': {
        const Kal = E.aktionskalender(st, ui.planen.jahr), anl = Kal.anlaesse.filter((x) => x.id !== 'raeumung');
        const an = anl.find((x) => x.id === zyklus(anl.map((x) => [x.id]), ui.planen.anlass, Number(v)));
        Object.assign(ui.planen, { anlass: an.id, mechanik: an.mechanik, rabatt: an.rabatt || ui.planen.rabatt, kw: an.kw, wochen: Math.min(4, an.wochen) });
        return zeigen(true);
      }
      case 'planMechanik': { const Kal = E.aktionskalender(st, ui.planen.jahr); ui.planen.mechanik = zyklus(Kal.mechaniken.map((m) => [m.id]), ui.planen.mechanik, Number(v)); return zeigen(true); }
      case 'planRabatt': ui.planen.rabatt = Number(v); return zeigen(true);
      case 'planPunkte': ui.planen.punkteFaktor = Number(v); return zeigen(true);
      case 'planWochen': ui.planen.wochen = Number(v); return zeigen(true);
      case 'planWerbung': ui.planen.sonderwerbung = Number(v); return zeigen(true);
      case 'planKontrolle': ui.planen.kontrolle = !ui.planen.kontrolle; return zeigen(true);
      case 'planKw': { const p = ui.planen; let kw = p.kw + Number(v), j = p.jahr; if (kw > 52) { kw = 1; j++; } if (kw < 1) { kw = 52; j--; } p.kw = kw; p.jahr = j; return zeigen(true); }
      case 'planFertig': {
        const p = ui.planen, an = E.aktionskalender(st, p.jahr).anlaesse.find((x) => x.id === p.anlass);
        const r = tun({ typ: 'aktionPlanen', anlass: p.anlass, name: an?.name, mechanik: p.mechanik, ...(p.mechanik === 'punkte' ? { punkteFaktor: p.punkteFaktor } : { rabatt: p.rabatt }), ...(an?.bereiche ? { bereiche: an.bereiche } : {}), kw: p.kw, jahr: p.jahr, wochen: p.wochen, sonderwerbung: p.sonderwerbung, ...(p.kontrolle ? { kontrollHaeuser: kontrollHaeuser() } : {}) });
        if (r?.ok) { ui.jahr = p.jahr; ui.planen = null; zeigen(true); }
        return r;
      }
      case 'aktionAbsagen': return tun({ typ: 'aktionAbsagen', id: v });
      case 'aktionLaenger': { const x = E.aktionsAuswertung(st, v); return tun({ typ: 'aktionAendern', id: v, wochen: x.wochen + 1 }); }
      default:
    }
  }
  const auf = (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (!el || el.disabled) return; klick(el); };
  document.getElementById('pinhalt').addEventListener('click', auf);
  document.getElementById('preiter').addEventListener('click', auf); // Reiterleiste liegt außerhalb von #pinhalt

  return {
    ui, da,
    oeffne: (seite = 'uebersicht', arg) => { if (!ui.stadt) ui.stadt = ctx.stadt?.() ?? null; ui.seite = seite; if (seite === 'aktion') ui.aktion = arg; ui.planen = null; ui.kachel = -1; zeigen(); },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; },
    pruefe: () => ({ seite: ui.seite, ...vergleiche(rendern().S.W) }),
  };
}
