// Wochenabschluss ausschließlich aus Engine-Abfragen: auftraege/spiel-reise-und-wochenabschluss.md
import { esc } from './format.js';
import { portraetSVG } from '../kit/portraet.js';
const ASSISTENTIN = portraetSVG({ geschlecht: 'w', alter: 36, haar: 'bob', haarfarbe: 'braun', hautton: 'rosig', kleidung: 'blazer', kleidungFarbe: 'marine', seed: 821 }, 110);
const BANK = portraetSVG({ geschlecht: 'm', alter: 56, haar: 'seitenscheitel', haarfarbe: 'grau', hautton: 'hell', kleidung: 'anzug', seed: 236 }, 110);
const BETRIEBSRAT = portraetSVG({ geschlecht: 'w', alter: 49, haar: 'halblang', haarfarbe: 'dunkelbraun', kleidung: 'bluse', seed: 922 }, 110);
export const WOCHEN_ZEIT = Object.freeze({
  frageEin: 200, frageAus: 300, stillstand: 180, berichtEin: 380,
  zaehlStart: 900, zaehlen: 11000, vorfallEin: 150, vorfallText: 1500,
  vorfallAus: 200, reduziert: 150,
});
const eur = (n) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.round(n ?? 0)) + ' €';
const kurve = (t) => 1 - (1 - t) ** 2;
const reduziert = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ohneAnimation = () => new URLSearchParams(location.search).has('ohne-animation');
const warten = (ms) => new Promise((r) => setTimeout(r, ms));
const KATEGORIE = ['Presse', 'Konkurrenz'];
export function wochenberichtModul(ctx) {
  const node = document.createElement('div'); node.id = 'wochen-overlay'; node.hidden = true; document.body.append(node);
  let status = 'zu', token = 0, bericht = null, vorfall = 0, start = 0, zaehlRaf = 0;
  const zeiten = [];
  const markieren = (ereignis) => zeiten.push({ ereignis, ms: Math.round(performance.now() - start) });
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
    node.innerHTML = '<section class="wochen-maske" role="dialog" aria-modal="true" aria-label="Woche abschließen"><div class="wochen-frage"><button class="wochen-x" data-wa="nein" aria-label="Schließen">×</button><h2>Woche abschließen?</h2><div class="wochen-frageinhalt"><p>Sind Sie mit dieser Woche fertig?</p><span class="wochen-gesicht">' + ASSISTENTIN + '</span></div>' + (ctx.warnen() && warnungen.length ? '<p class="wochen-warnung">' + warnungen.length + ' Vorgänge laufen ab. Der Standard wird gewählt beziehungsweise das Angebot verfällt.</p>' : '') + '<div class="wochen-knopfreihe"><button data-wa="nein">Nein</button><button class="prim" data-wa="ja">Ja</button></div></div></section>';
    node.hidden = false; node.className = 'frage-ein'; document.body.classList.add('wochen-aktiv'); status = 'frage';
    requestAnimationFrame(() => node.classList.add('sichtbar'));
  }
  function oeffne() {
    if (status !== 'zu') return;
    ++token; start = performance.now(); zeiten.length = 0; markieren('Wochenknopf');
    if (modus() === 'aus') return berechnen(false);
    fragDialog();
  }
  async function berechnen(mitDialog = true) {
    if (status === 'rechnen') return;
    const meins = ++token, istReduziert = schnell();
    status = 'rechnen';
    ctx.sperren?.();
    node.classList.remove('sichtbar');
    if (mitDialog) await warten(istReduziert ? 0 : WOCHEN_ZEIT.frageAus + WOCHEN_ZEIT.stillstand);
    if (meins !== token) return;
    markieren('Wochenberechnung');
    const vor = ctx.posteingang(), alt = ctx.cockpit(), davorCash = alt.cash;
    try {
      ctx.woche();
    } catch (e) { aufraeumen(); ctx.fehler?.(e); return; }
    const nach = ctx.posteingang(), neu = new Set(vor.handeln.map((x) => x.id)), gemeldet = new Set(vor.meldungen.map((x) => x.id));
    const c = ctx.cockpit(), ver = ctx.historie();
    const vergangen = ver.length > 1 ? ver[ver.length - 2] : null;
    const jetzt = ver[ver.length - 1];
    const meldungen = nach.meldungen.filter((m) => !gemeldet.has(m.id) && m.woche === ctx.wocheNr() && KATEGORIE.includes(m.kategorie));
    const vorgaenge = nach.handeln.filter((h) => !neu.has(h.id)).sort((a, b) => Number(b.dringend) - Number(a.dringend) || a.frist - b.frist);
    bericht = {
      kw: c.kw, jahr: c.jahr, umsatz: c.umsatzWoche, ebitda: c.ebitdaWoche, umsatzVor: vergangen?.umsatz ?? null,
      ebitdaVor: vergangen?.ebitda ?? null, cashNetto: c.cash - davorCash, cash: c.cash,
      phase: c.phase, kredite: c.kreditFrei, runway: c.runwayWochen,
      meldungen, vorgaenge, woche: ctx.wocheNr(), letzte: jetzt,
    };
    markieren('Engine abgeschlossen');
    if (modus() === 'aus') { aufraeumen(); return; }
    berichtZeigen(meins);
  }
  function zeile(name, wert, k = '') { return '<div class="wb-zeile ' + k + '"><span>' + esc(name) + '</span><strong>' + esc(wert) + '</strong></div>'; }
  function berichtZeigen(meins) {
    if (meins !== token) return;
    status = 'zaehlen'; vorfall = 0;
    const m = bericht.meldungen, titel = m[0]?.text ?? 'Hartwig startet in eine neue Geschäftswoche';
    const delta = (wert, vorher) => vorher == null ? 'Noch keine Vergleichswoche'
      : eur(wert - vorher) + ' (' + (vorher === 0 ? '–' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format((wert - vorher) / Math.abs(vorher) * 100) + ' %') + ')';
    const uDelta = delta(bericht.umsatz, bericht.umsatzVor);
    const eDelta = delta(bericht.ebitda, bericht.ebitdaVor);
    const nachricht = (a, platz) => a ? '<div class="wb-meldung"><div class="wb-foto" aria-hidden="true" style="background-image:url(./bilder/reise-' + (platz === 1 ? 'hafen' : 'altstadt') + '.png)"></div><span>' + esc(a.text) + '</span></div>' : '';
    node.innerHTML = '<section class="wb-bericht" role="dialog" aria-modal="true" aria-label="Wochenergebnis"><header><span class="wb-logo">H</span><h2>KW ' + bericht.kw + ' · Wochenergebnis</h2><button class="wochen-x wb-schliessen" data-wa="schliessen" aria-label="Bericht schließen">×</button></header><div class="wb-scroll"><div class="wb-kennzahlen"><article><small>UMSATZ DER WOCHE</small><strong id="wb-umsatz" data-wert="' + bericht.umsatz + '">0 €</strong><span id="wb-umsatz-delta">' + esc(uDelta) + ' zur Vorwoche</span></article><article><small>EBITDA DER WOCHE</small><strong id="wb-ebitda" data-wert="' + bericht.ebitda + '">0 €</strong><span id="wb-ebitda-delta">' + esc(eDelta) + ' zur Vorwoche</span></article></div><div class="wb-cash"><h3>Kapitalfluss</h3>' +
      zeile('Cash operativ', 'nicht separat erfasst') + zeile('Investitionen', 'nicht separat erfasst') + zeile('Finanzierung', 'nicht separat erfasst') +
      zeile('Cash netto', eur(bericht.cashNetto)) + zeile('Cash-Bestand', eur(bericht.cash), 'wb-summe') +
      '<p>Die Engine stellt keinen nach Zahlungsarten getrennten Cashflow bereit.</p></div>' +
      (bericht.phase === 'insolvenz' ? '<div class="wb-insolvenz"><strong>Insolvenzbarometer</strong><span>Freier Kreditrahmen: ' + eur(bericht.kredite) + ' · Liquiditätsreichweite: ' + bericht.runway + ' Wochen</span></div>' : '') +
      '<div class="wb-zeitung"><div class="wb-zeitungskopf"><small>KW ' + bericht.kw + ' / ' + bericht.jahr + '</small><h3>Der Handelsbote</h3><nav>Top · Handel · Konzern · Markt · Politik</nav></div><div class="wb-titelbild" style="background-image:url(./bilder/reise-ruhr.png)"></div><h4>' + esc(titel) + '</h4>' +
      nachricht(m[1], 1) + nachricht(m[2], 2) + (!m.length ? '<p>Diese Woche liegen keine neuen Presse- oder Konkurrenzmeldungen vor.</p>' : '') + '</div></div><div id="wb-vorfall"></div></section>';
    node.hidden = false; node.className = 'bericht-ein'; document.body.classList.add('wochen-aktiv');
    requestAnimationFrame(() => node.classList.add('sichtbar'));
    const originalDauer = dauer();
    const zaehlBeginn = performance.now() + (originalDauer ? WOCHEN_ZEIT.berichtEin : 0);
    let abgeschlossen = false;
    function zahlen(t = performance.now(), sprung = false) {
      const f = sprung || !originalDauer ? 1 : kurve(Math.max(0, Math.min(1, (t - zaehlBeginn) / originalDauer)));
      const u = node.querySelector('#wb-umsatz'), e = node.querySelector('#wb-ebitda');
      if (!u || !e || meins !== token) return;
      u.textContent = eur(bericht.umsatz * f); e.textContent = eur(bericht.ebitda * f);
      e.classList.toggle('negativ', bericht.ebitda < 0);
      if (f < 1) zaehlRaf = requestAnimationFrame(zahlen);
      else if (!abgeschlossen) { abgeschlossen = true; node.classList.add('gezaehlt'); status = 'bericht'; markieren('Zählung beendet'); if (bericht.vorgaenge.length) setTimeout(() => { if (meins === token) vorfallZeigen(); }, schnell() ? 0 : 200); }
    }
    node.querySelector('.wb-bericht').addEventListener('click', (e) => { if (status === 'zaehlen' && !e.target.closest('[data-wa]')) { cancelAnimationFrame(zaehlRaf); zahlen(performance.now(), true); } });
    if (originalDauer) zaehlRaf = requestAnimationFrame(zahlen); else zahlen(performance.now(), true);
  }
  function vorfallZeigen() {
    const alle = bericht?.vorgaenge ?? [], lauf = alle.slice(0, 3), m = lauf[vorfall];
    if (!m || !node.querySelector('#wb-vorfall')) return;
    status = 'vorfall'; markieren('Vorfall ' + (vorfall + 1));
    const feld = node.querySelector('#wb-vorfall'), meins = token;
    feld.innerHTML = '<div class="wb-vorfallmaske"><section class="wb-vorfall" role="dialog" aria-modal="true" aria-label="Vorfall"><div class="wb-vorfallkopf"><span>H</span><div><small>HARTWIG</small><h3>VORFALL</h3></div><div class="wb-gesicht">' + (m.typ.includes('bank') ? '€' : m.typ.includes('betriebsrat') ? 'BR' : 'H') + '</div></div><h4>' + esc(m.titel) + '</h4><p class="wb-tippt" aria-live="polite"></p><div class="wb-vorfallfuss"><small>Vorgang ' + (vorfall + 1) + ' von ' + lauf.length + '</small><button data-wa="spaeter" hidden>Später</button><button data-wa="ansehen" hidden>Ansehen</button></div>' + (alle.length > 3 ? '<p class="wb-rest">+' + (alle.length - 3) + ' weitere im Posteingang</p>' : '') + '</section></div>';
    requestAnimationFrame(() => feld.classList.add('offen'));
    const text = m.text ?? '', el = feld.querySelector('.wb-tippt'), beginn = performance.now();
    function tick(t) {
      if (meins !== token || status !== 'vorfall') return;
      const n = schnell() ? text.length : Math.floor((t - beginn) / 1000 * 70);
      el.textContent = text.slice(0, n);
      if (el.textContent.length !== text.length && t - beginn < WOCHEN_ZEIT.vorfallText) requestAnimationFrame(tick);
      else { el.textContent = text; feld.querySelector('.wb-vorfallfuss small').hidden = true; for (const b of feld.querySelectorAll('.wb-vorfallfuss button')) b.hidden = false; }
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
    }, schnell() ? 0 : WOCHEN_ZEIT.vorfallAus);
  }
  node.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wa]');
    if (!b) return;
    switch (b.dataset.wa) {
      case 'nein': abbruch(); break;
      case 'ja': berechnen(true); break;
      case 'schliessen': if (status === 'bericht') abbruch(); else if (status === 'zaehlen') { cancelAnimationFrame(zaehlRaf); node.querySelector('.wb-kennzahlen')?.click(); } break;
      case 'spaeter': vorfallWeiter(false); break;
      case 'ansehen': vorfallWeiter(true); break;
    }
  });
  return { oeffne, zu: abbruch, pruefe: () => ({ status, bericht: bericht && { ...bericht, vorgaenge: bericht.vorgaenge.length, meldungen: bericht.meldungen.length }, zeiten: [...zeiten] }), get status() { return status; } };
}
