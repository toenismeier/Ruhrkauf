// Wochenabschluss ausschließlich aus Engine-Abfragen: auftraege/spiel-reise-und-wochenabschluss.md
// E47: Bericht wie Coffee-Finanzen (Coffee 21, 22): Befund der Finanzchefin, zwei Großkennzahlen, fünf Wochen als Balken,
// Kapitalfluss als GuV-Tabelle im Band, darunter Presse und Erfolge. Eigenes Vollbild-Blatt über der Stadt.
import { esc, geld, kwVon } from './format.js';
import * as K from './komponenten.js';
import { effektiveAnimation } from './einstellungen.js';
import { portraetSVG } from '../kit/portraet.js';
import { zeitungKarte } from './zeitung.js';
const ASSISTENTIN = portraetSVG({ geschlecht: 'w', alter: 36, haar: 'bob', haarfarbe: 'braun', hautton: 'rosig', kleidung: 'blazer', kleidungFarbe: 'marine', seed: 821 }, 110);
const BANK = portraetSVG({ geschlecht: 'm', alter: 56, haar: 'seitenscheitel', haarfarbe: 'grau', hautton: 'hell', kleidung: 'anzug', seed: 236 }, 110);
const BETRIEBSRAT = portraetSVG({ geschlecht: 'w', alter: 49, haar: 'halblang', haarfarbe: 'dunkelbraun', kleidung: 'bluse', seed: 922 }, 110);
const VERMIETER = portraetSVG({ geschlecht: 'm', alter: 59, haar: 'seitenscheitel', haarfarbe: 'grau', hautton: 2, kleidung: 'anzug', seed: 197 }, 110);
const LIEFERANT = portraetSVG({ geschlecht: 'w', alter: 43, haar: 'halblang', haarfarbe: 'braun', hautton: 2, kleidung: 'blazer', seed: 379 }, 110);
export const WOCHEN_ZEIT = Object.freeze({
  frageEin: 200, frageAus: 300, stillstand: 180, berichtEin: 380,
  zaehlStart: 900, zaehlen: 11000, vorfallEin: 150, vorfallText: 1500,
  vorfallAus: 200, reduziert: 150,
});
const eur = (n) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(n ?? 0)).replace('-', '−') + ' €';
const kurve = (t) => 1 - (1 - t) ** 2;
const reduziert = () => effektiveAnimation() !== 'voll';
const ohneAnimation = () => new URLSearchParams(location.search).has('ohne-animation');
const warten = (ms) => new Promise((r) => setTimeout(r, ms));
const KATEGORIE = ['Presse', 'Konkurrenz'];
/** Kopf eines Vollbild-Blatts (gleiche Lagen wie #panel.hw). */
const blattKopf = (symbol, titel, unter, zu) => `<div class="hw-grund"></div><header class="hw-kopf"><span class="hw-kopf-symbol" aria-hidden="true">${K.illustration(symbol) || K.SYMBOLE[symbol] || ''}</span><h2 class="hw-kopf-titel" tabindex="-1">${esc(titel)}</h2><div class="hw-kopf-unter">${esc(unter)}</div>${zu}</header>`;
export function wochenberichtModul(ctx) {
  const node = document.createElement('div'); node.id = 'wochen-overlay'; node.hidden = true; document.body.append(node);
  let status = 'zu', token = 0, bericht = null, vorfall = 0, start = 0, bestaetigt = null, zaehlRaf = 0;
  const zeiten = [];
  const markieren = (ereignis) => { const t = performance.now(); zeiten.push({ ereignis, ms: Math.round(t - start), ...(bestaetigt === null ? {} : { jaMs: Math.round(t - bestaetigt) }) }); };
  const modus = () => ctx.modus?.() ?? 'voll';
  const schnell = () => reduziert() || ohneAnimation() || modus() === 'aus';
  const dauer = () => schnell() ? 0 : modus() === 'kurz' ? 2000 : WOCHEN_ZEIT.zaehlen;
  function aufraeumen() {
    ++token; cancelAnimationFrame(zaehlRaf); node.hidden = true; node.innerHTML = '';
    node.className = ''; status = 'zu'; document.body.classList.remove('wochen-aktiv'); ctx.entsperren?.();
  }
  function abbruch() { if (status !== 'rechnen') aufraeumen(); }
  function fragDialog() {
    const warnungen = ctx.posteingang().handeln.filter((x) => x.restWochen === 0);
    node.innerHTML = '<section class="hw-wb-maske" role="dialog" aria-modal="true" aria-label="Woche abschließen"><div class="hw hw-kontur hw-wb-frage" data-bereich="betrieb">'
      + '<button type="button" class="hw-zu" data-wa="nein" aria-label="Schließen"></button><h2 tabindex="-1">Woche abschließen?</h2>'
      + '<div class="hw-wb-frageinhalt"><p>Die Engine rechnet die Woche für alle Häuser ab. Danach folgt der Wochenbericht.</p><span class="hw-wb-gesicht" aria-hidden="true">' + ASSISTENTIN + '</span></div>'
      + (ctx.warnen() && warnungen.length ? K.hinweis(warnungen.length + (warnungen.length === 1 ? ' Vorgang läuft' : ' Vorgänge laufen') + ' ab. Ohne Entscheidung gilt der Standard, Angebote verfallen.', 'achtung') : '')
      + K.knoepfe(K.knopf('Nein', 'data-wa="nein"', 'zweit'), K.knopf('Ja, abschließen', 'data-wa="ja"')) + '</div></section>';
    node.hidden = false; node.className = 'frage-ein'; document.body.classList.add('wochen-aktiv'); status = 'frage';
    node.querySelector('.hw-wb-frage h2')?.focus({ preventScroll: true });
    requestAnimationFrame(() => node.classList.add('sichtbar'));
  }
  function oeffne() {
    if (status !== 'zu') return;
    ++token; start = performance.now(); bestaetigt = null; zeiten.length = 0; markieren('Wochenknopf');
    // Auch ohne Wochenbericht vor tatsächlich ablaufenden Vorgängen warnen, sofern aktiviert.
    const faellig = ctx.warnen() && ctx.posteingang().handeln.some((p) => p.restWochen === 0);
    if (modus() === 'aus' && !faellig) return berechnen(false);
    fragDialog();
  }
  async function berechnen(mitDialog = true) {
    if (status === 'rechnen') return;
    const meins = ++token, istReduziert = schnell();
    if (mitDialog) { bestaetigt = performance.now(); markieren('Ja gewählt'); }
    status = 'rechnen';
    ctx.sperren?.();
    node.classList.remove('sichtbar');
    if (mitDialog) await warten(istReduziert ? 0 : WOCHEN_ZEIT.frageAus + WOCHEN_ZEIT.stillstand);
    if (meins !== token) return;
    markieren('Wochenberechnung');
    const vor = ctx.posteingang();
    try {
      ctx.woche();
    } catch (e) { aufraeumen(); ctx.fehler?.(e); return; }
    const nach = ctx.posteingang(), neu = new Set(vor.handeln.map((x) => x.id)), gemeldet = new Set(vor.meldungen.map((x) => x.id));
    const c = ctx.cockpit(), ver = ctx.historie(), fluss = ctx.kapitalfluss();
    const vergangen = ver.length > 1 ? ver[ver.length - 2] : null;
    const jetzt = ver[ver.length - 1];
    // Die Engine verbucht Ereignisse für die gerade beendete Woche, bevor sie s.woche erhöht.
    const meldungen = nach.meldungen.filter((m) => !gemeldet.has(m.id) && m.woche === jetzt?.woche && KATEGORIE.includes(m.kategorie));
    const kwEnde = c.kw === 1 ? 52 : c.kw - 1;
    const jahrEnde = c.kw === 1 ? c.jahr - 1 : c.jahr;
    const vorgaenge = nach.handeln.filter((h) => !neu.has(h.id)).sort((a, b) => Number(b.dringend) - Number(a.dringend) || a.frist - b.frist);
    bericht = {
      kw: kwEnde, jahr: jahrEnde, umsatz: c.umsatzWoche, ebitda: c.ebitdaWoche, umsatzVor: vergangen?.umsatz ?? null,
      ebitdaVor: vergangen?.ebitda ?? null, cashNetto: fluss.netto, cash: c.cash,
      phase: c.phase, kredite: c.kreditFrei, runway: c.runwayWochen,
      meldungen, vorgaenge, erfolge: ctx.erfolge?.() ?? [], woche: ctx.wocheNr(), letzte: jetzt, kapitalfluss: fluss,
      verlauf: ver.slice(-5).map((k) => ({ label: String(kwVon(k.woche)), a: k.umsatz, b: k.ebitda })),
    };
    markieren('Engine abgeschlossen');
    if (modus() === 'aus') { aufraeumen(); return; }
    berichtZeigen(meins);
  }
  function portraetZumVorgang(m) {
    const typ = String(m.typ ?? '').toLocaleLowerCase('de');
    const thema = (typ + ' ' + String(m.titel ?? '')).toLocaleLowerCase('de');
    if (/betriebsrat|tarif|streik/.test(thema)) return { bild: BETRIEBSRAT, rolle: 'Betriebsrat' };
    if (/vermieter|mietvertrag|mietverhandlung/.test(thema)) return { bild: VERMIETER, rolle: 'Vermieter' };
    if (/lieferant|warenkreditversicher/.test(thema)) return { bild: LIEFERANT, rolle: 'Lieferant' };
    if (/bank|kredit|finanzier/.test(thema)) return { bild: BANK, rolle: 'Bank' };
    const ressort = /einkauf|produkt|marke/.test(thema) ? 'cpo'
      : /marketing|werbung|kundenkarte/.test(thema) ? 'cmo'
      : /personal|mitarbeiter|belegschaft/.test(thema) ? 'chro'
      : /filial|vertrieb/.test(thema) ? 'cso'
      : /online|digital|it_/.test(thema) ? 'cdo'
      : /vorstand|leitung|betrieb/.test(thema) ? 'coo'
      : /schließ|schliess|sanierung|insolvenz/.test(thema) ? 'cro' : 'cfo';
    const person = ctx.person?.(ressort);
    return { bild: person?.portraet ? portraetSVG(person.portraet, 110) : ASSISTENTIN,
      rolle: person?.name ?? 'Vorstand' };
  }
  /** Befund der Finanzleitung in einem Satz: EBITDA und was sich am Cash getan hat. */
  function befund(b) {
    const e = b.ebitda < 0 ? `<b>EBITDA ${esc(geld(b.ebitda))}.</b>` : `<b>EBITDA plus ${esc(geld(b.ebitda))}.</b>`;
    const cash = b.cashNetto >= 0 ? ` Die Kasse wächst um ${esc(geld(b.cashNetto))}.` : ` Die Kasse verliert ${esc(geld(-b.cashNetto))}.`;
    return e + cash;
  }
  function berichtZeigen(meins) {
    if (meins !== token) return;
    status = 'zaehlen'; vorfall = 0;
    const m = bericht.meldungen, ausgabe = ctx.zeitung?.(), titel = ausgabe?.aufmacher?.titel ?? m[0]?.text ?? 'Hartwig startet in eine neue Geschäftswoche';
    const delta = (wert, vorher) => vorher == null ? 'keine Vergleichswoche'
      : K.abweichung(wert - vorher, (wert - vorher >= 0 ? '+' : '−') + geld(Math.abs(wert - vorher)), vorher ? (wert - vorher) / Math.abs(vorher) : null) + ' zur Vorwoche';
    const cfo = ctx.person?.('cfo');
    const sprecher = K.sprecher({ text: befund(bericht), unter: (cfo?.name ?? 'Finanzen') + ' · Finanzvorstand', person: cfo?.portraet ? portraetSVG(cfo.portraet, 72) : ASSISTENTIN, ton: bericht.ebitda < 0 ? 'engpass' : '' });
    // Coffee „Weekly Results“: zwei Großkennzahlen, darunter die Kassenbrücke (vier Zeilen, Strich, Summe), dann die Zeitung.
    const f = bericht.kapitalfluss, z = (name, v) => ({ name, werte: [(v > 0 ? '+' : '') + eur(v)], roh: [Math.round(v)] });
    const zeilen = [z('Aus dem Geschäft', f.operativ), z('Investitionen', f.investitionen), z('Finanzierung', f.finanzierung), ...(Math.abs(f.sonstiges) >= 1 ? [z('Sonstiges', f.sonstiges)] : [])];
    const kapital = '<div class="hw-wb-fluss" data-wb="cash" data-summen-name="Kapitalfluss">' + K.tabelle({ zeilen, summe: z('Kassenänderung', f.netto), pruefen: Math.abs(f.operativ + f.investitionen + f.finanzierung + f.sonstiges - f.netto) < 2 })
      + `<p class="hw-wb-kasse">Kasse ${esc(eur(f.bestand))}</p></div>`;
    const insolvenz = bericht.phase === 'insolvenz' ? K.abschnitt('Insolvenzbarometer') + K.liste([K.zeile({ was: 'Freier Kreditrahmen', wert: esc(eur(bericht.kredite)), ton: bericht.kredite < 0 ? 'schlecht' : '' }), K.zeile({ was: 'Liquiditätsreichweite', wert: bericht.runway + ' Wochen', ton: 'achtung' })]) : '';
    const presse = '<div data-wb="zeitung">' + (ausgabe ? zeitungKarte(ausgabe)
      : K.abschnitt('Der Handelsbote', 'KW ' + bericht.kw + ' / ' + bericht.jahr) + K.liste([K.zeile({ was: esc(titel), unter: 'Aufmacher' })])) + '</div>';
    const erfolge = bericht.erfolge.length ? '<div data-wb="erfolge">' + K.abschnitt('Neu freigeschaltet', bericht.erfolge.length + (bericht.erfolge.length === 1 ? ' Erfolg' : ' Erfolge'))
      + K.liste(bericht.erfolge.map((e) => K.zeile({ was: 'Neu: ' + esc(e.titel), unter: esc(e.beschreibung ?? '') }))) + '</div>' : '';
    const offen = bericht.vorgaenge.length ? K.hinweis(`<b>${bericht.vorgaenge.length} ${bericht.vorgaenge.length === 1 ? 'Vorgang wartet' : 'Vorgänge warten'} auf dich.</b> Sie folgen, wenn du den Bericht schließt.`, 'achtung') : '';
    const inhalt = K.rumpf(K.gross([{ label: 'Umsatz der Woche', wert: '0 €', p: 'wb:umsatz', unter: delta(bericht.umsatz, bericht.umsatzVor) },
      { label: 'EBITDA der Woche', wert: '0 €', p: 'wb:ebitda', ton: bericht.ebitda < 0 ? 'schlecht' : 'gut', unter: delta(bericht.ebitda, bericht.ebitdaVor) }])
      + kapital + insolvenz + offen) + presse + K.rumpf(erfolge + K.knoepfe(K.knopf(bericht.vorgaenge.length ? 'Weiter zu den Vorgängen' : 'Zurück zur Stadt', 'data-wa="schliessen"', 'breit')));
    node.innerHTML = '<section class="hw hw-blatt hw-wb" data-bereich="zentrale" data-wb="bericht" role="dialog" aria-modal="true" aria-label="Wochenergebnis">'
      + blattKopf('finanzen', 'Wochenergebnis', 'KW ' + bericht.kw + ' / ' + bericht.jahr, '<button type="button" class="hw-zu" data-wa="schliessen" aria-label="Bericht schließen"></button>')
      + sprecher + '<div class="hw-inhalt">' + inhalt + '</div><div id="wb-vorfall"></div></section>';
    for (const [p, id, wert] of [['wb:umsatz', 'wb-umsatz', bericht.umsatz], ['wb:ebitda', 'wb-ebitda', bericht.ebitda]]) {
      const el = node.querySelector(`[data-p="${p}"]`); if (el) { el.id = id; el.dataset.wert = wert; }
    }
    node.hidden = false; node.className = 'bericht-ein'; document.body.classList.add('wochen-aktiv');
    requestAnimationFrame(() => node.classList.add('sichtbar'));
    node.querySelector('.hw-wb h2')?.focus({ preventScroll: true });
    const originalDauer = dauer();
    const zaehlBeginn = performance.now() + (originalDauer ? WOCHEN_ZEIT.berichtEin : 0);
    let abgeschlossen = false;
    function zahlen(t = performance.now(), sprung = false) {
      const f = sprung || !originalDauer ? 1 : kurve(Math.max(0, Math.min(1, (t - zaehlBeginn) / originalDauer)));
      const u = node.querySelector('#wb-umsatz'), e = node.querySelector('#wb-ebitda');
      if (!u || !e || meins !== token) return;
      u.textContent = eur(bericht.umsatz * f); e.textContent = eur(bericht.ebitda * f);
      if (f < 1) zaehlRaf = requestAnimationFrame(zahlen);
      else if (!abgeschlossen) { abgeschlossen = true; node.classList.add('gezaehlt'); status = 'bericht'; markieren('Zählung beendet'); }
    }
    node.querySelector('.hw-wb').addEventListener('click', (e) => { if (status === 'zaehlen' && !e.target.closest('[data-wa]')) { cancelAnimationFrame(zaehlRaf); zahlen(performance.now(), true); } });
    if (originalDauer) zaehlRaf = requestAnimationFrame(zahlen); else zahlen(performance.now(), true);
  }
  function vorfallZeigen() {
    const alle = bericht?.vorgaenge ?? [], lauf = alle.slice(0, 3), m = lauf[vorfall];
    if (!m || !node.querySelector('#wb-vorfall')) return;
    status = 'vorfall'; markieren('Vorfall ' + (vorfall + 1));
    const feld = node.querySelector('#wb-vorfall'), meins = token;
    const verantwortlich = portraetZumVorgang(m);
    feld.innerHTML = '<div class="hw-wb-vorfallmaske"><section class="hw-wb-vorfall" data-wb="vorfall" role="dialog" aria-modal="true" aria-label="Vorfall">'
      + '<div class="hw-wb-vorfallkopf"><div><span class="hw-marke">Vorfall · ' + esc(verantwortlich.rolle) + '</span><h3 tabindex="-1">' + esc(m.titel) + '</h3></div><div class="hw-wb-gesicht" data-wb="gesicht" aria-hidden="true">' + verantwortlich.bild + '</div></div>'
      + '<p class="hw-wb-tippt" aria-live="polite"></p><div class="hw-wb-vorfallfuss"><small>Vorgang ' + (vorfall + 1) + ' von ' + lauf.length + (alle.length > 3 ? ' · ' + (alle.length - 3) + ' weitere im Posteingang' : '') + '</small>'
      + K.knopf('Später', 'data-wa="spaeter" hidden', 'zweit') + K.knopf('Ansehen', 'data-wa="ansehen" hidden') + '</div></section></div>';
    feld.querySelector('.hw-wb-vorfall h3')?.focus({ preventScroll: true });
    requestAnimationFrame(() => feld.classList.add('offen'));
    const text = m.text ?? '', el = feld.querySelector('.hw-wb-tippt'), beginn = performance.now();
    function tick(t) {
      if (meins !== token || status !== 'vorfall') return;
      const n = schnell() ? text.length : Math.floor((t - beginn) / 1000 * 70);
      el.textContent = text.slice(0, n);
      if (el.textContent.length !== text.length && t - beginn < WOCHEN_ZEIT.vorfallText) requestAnimationFrame(tick);
      else { el.textContent = text; for (const b of feld.querySelectorAll('.hw-wb-vorfallfuss button')) b.hidden = false; }
    }
    requestAnimationFrame(tick);
  }
  function vorfallWeiter(ansehen) {
    const item = bericht.vorgaenge[vorfall], t = token;
    const feld = node.querySelector('#wb-vorfall'); feld?.classList.remove('offen');
    setTimeout(() => {
      if (t !== token) return;
      feld.innerHTML = '';
      vorfall++; status = 'bericht';
      if (ansehen) { const id = item.id; aufraeumen(); ctx.oeffneVorgang(id); return; }
      if (vorfall < Math.min(3, bericht.vorgaenge.length)) vorfallZeigen();
      else if (node.classList.contains('vorgaenge')) aufraeumen();
    }, schnell() ? 0 : WOCHEN_ZEIT.vorfallAus);
  }
  node.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wa]');
    if (!b) return;
    switch (b.dataset.wa) {
      case 'nein': abbruch(); break;
      case 'ja': berechnen(true); break;
      case 'schliessen': if (status === 'bericht' && bericht?.vorgaenge.length && !node.querySelector('.hw-wb-vorfall')) { node.classList.add('vorgaenge'); vorfallZeigen(); } else if (status === 'bericht') abbruch(); else if (status === 'zaehlen') { cancelAnimationFrame(zaehlRaf); node.querySelector('.hw-wb .hw-gross')?.click(); } break;
      case 'zeitung': if (status === 'bericht' || status === 'zaehlen') { abbruch(); ctx.oeffneZeitung?.(); } break;
      case 'spaeter': vorfallWeiter(false); break;
      case 'ansehen': vorfallWeiter(true); break;
    }
  });
  return { oeffne, zu: abbruch, pruefe: () => ({ status, bericht: bericht && { ...bericht, vorgaenge: bericht.vorgaenge.length, meldungen: bericht.meldungen.length, meldungstexte: bericht.meldungen.slice(0, 3).map((m) => m.text) }, zeiten: [...zeiten] }), get status() { return status; } };
}
