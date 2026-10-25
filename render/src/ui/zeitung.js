// Der Handelsbote: Wochenzeitung mit Reitern und Wischarchiv.
// Sämtliche Inhalte und Entscheidungen stammen aus engine/src/zeitung.ts.
import { esc } from './format.js';
import { zeitungsBild } from '../kit/zeitung.js';
import * as K from './komponenten.js';

// Die Engine-Rubrik "Konzern" wird lesefreundlich als "Wirtschaft" angezeigt.
// "Region" ist eine zusätzliche redaktionelle Sicht auf bestehende Standortmeldungen,
// keine neue Meldungsquelle, keine zweite Filter-/Abfragelogik.
const REITER = ['Top', 'Handel', 'Wirtschaft', 'Markt', 'Politik', 'Region'];
const REGIONALE_ARTEN = new Set([
  'markt_einzel', 'markt_ueberblick', 'konkurrenz_neu', 'konkurrenz_zu',
  'konkurrenz_aktion', 'konkurrenz_uebernahme', 'haus_schliessung',
  'haus_raeumung', 'haus_umbau', 'haus_miete', 'immobilie', 'stadt', 'kommunen'
]);
function rubrik(a) { return a.reiter === 'Konzern' ? 'Wirtschaft' : a.reiter; }
function passt(a, reiter) {
  return reiter === 'Top' || (reiter === 'Region' ? REGIONALE_ARTEN.has(a.art) : rubrik(a) === reiter);
}
/** Zeitung als Papierkarte im Wochenergebnis (Coffee „Weekly Results“): Titelkopf, Rubriken, zwei Spalten mit
 *  bebilderten Meldungen. Antippen öffnet die ganze Ausgabe (data-wa="zeitung"). */
export function zeitungKarte(a) {
  if (!a) return '';
  const alle = [a.aufmacher, ...a.meldungen].slice(0, 4);
  const stueck = (x, i) => '<article class="zk-artikel">' + '<div class="zk-bild" aria-hidden="true">' + zeitungsBild(x.art, x.bild, a.nummer * 10 + i) + '</div>'
    + '<h3>' + esc(x.titel) + '</h3><p>' + esc(x.unterzeile || x.text) + '</p></article>';
  const links = alle.filter((_, i) => i % 2 === 0), rechts = alle.filter((_, i) => i % 2 === 1);
  return '<button type="button" class="zk" data-bereich="papier" data-wa="zeitung" aria-label="Der Handelsbote lesen">'
    + '<span class="zk-titel">Der Handelsbote.</span><span class="zk-datum">KW ' + a.kw + ' / ' + a.jahr + '</span>'
    + '<span class="zk-reiter" aria-hidden="true">' + REITER.map((v, i) => '<span class="' + (i ? '' : 'an') + '">' + v + '</span>').join('') + '</span>'
    + (alle.length === 1 ? '<span class="zk-spalten eins"><span class="zk-spalte">' + stueck(alle[0], 0) + '</span></span></button>' : '<span class="zk-spalten"><span class="zk-spalte">' + links.map((x) => stueck(x, alle.indexOf(x))).join('') + '</span><span class="zk-spalte">' + rechts.map((x) => stueck(x, alle.indexOf(x))).join('') + '</span></span></button>');
}

export function zeitungModul(ctx) {
  const ui = { aktiv: false, index: -1, reiter: 'Top', archiv: false };
  const ausgaben = () => ctx.E.zeitungArchiv(ctx.s());
  const aktiv = () => ctx.E.zeitungAktiv(ctx.s());
  const sortiert = () => [...ausgaben()].reverse();
  const ausgabe = () => ausgaben()[ui.index] ?? null;

  function leer() {
    return K.leer('Die erste Ausgabe erscheint nach dem nächsten Wochenabschluss.', 'Das Archiv ist noch leer.');
  }
  function kopf(a) {
    return '<header class="zb-kopf"><div class="zb-ausgabenzeile hw-marke"><span>Handel · Wirtschaft · Gesellschaft</span><span>Nr. ' + a.nummer + '</span></div>' +
      '<h2>Der Handelsbote</h2><div class="zb-datum"><span>KW ' + a.kw + ' / ' + a.jahr + '</span><span>Wochenzeitung für den Handel</span></div></header>';
  }
  function artikel(a, aufmacher = false) {
    const illustr = zeitungsBild(a.art, a.bild, ui.index);
    return '<article data-art="' + esc(a.art || 'presse') + '" class="zb-artikel ' + (aufmacher ? 'zb-aufmacher' : '') + '">' +
      '<div class="zb-rubrik hw-marke">' + esc(rubrik(a)) + '</div>' +
      '<h3>' + esc(a.titel) + '</h3><p class="zb-unter">' + esc(a.unterzeile) + '</p>' +
      '<figure class="zb-bild"><div class="zb-bildrahmen">' +
      '<div class="zb-bildlade" aria-hidden="true">Illustration wird vorbereitet …</div>' + illustr + '</div>' +
      '<figcaption class="hw-lese">Illustration: Redaktion Der Handelsbote</figcaption></figure>' +
      '<p class="zb-text hw-lese">' + esc(a.text) + '</p></article>';
  }
  function ausgabeZeigen(a) {
    const alle = [a.aufmacher, ...a.meldungen];
    const gewaehlt = alle.filter((x) => passt(x, ui.reiter));
    const inhalt = gewaehlt.length ? gewaehlt.map((x, i) => artikel(x, i === 0)).join('') : K.leer('In dieser Rubrik liegen in dieser Woche keine Artikel vor.');
    return kopf(a) +
      '<nav class="zb-tabs" role="tablist" aria-label="Zeitungsrubriken">' + REITER.map((v) =>
        '<button type="button" role="tab" aria-selected="' + (ui.reiter === v) + '" data-z-a="tab" data-v="' + v + '" class="' + (ui.reiter === v ? 'aktiv' : '') + '">' + v + '</button>').join('') +
      '</nav><div class="zb-spalten">' + inhalt + '</div>';
  }
  function archivZeigen() {
    const aus = sortiert();
    return K.abschnitt('Alle Ausgaben', 'die letzten 104 Wochen') + '<div class="zb-archivliste">' + K.liste(aus.map((a) =>
      K.zeile({ was: esc(a.aufmacher.titel), unter: 'Nr. ' + a.nummer + ' · KW ' + a.kw + ' / ' + a.jahr, wert: String(a.meldungen.length + 1), wertUnter: 'Artikel', tippbar: true, attr: 'data-z-a="ausgabe" data-v="' + a.woche + '"' }))) + '</div>';
  }
  function anzeigen(halten = false) {
    const vorher = halten ? document.getElementById('pinhalt')?.scrollTop ?? 0 : 0;
    const aus = ausgaben();
    if (ui.index < 0 || ui.index >= aus.length) ui.index = aus.length - 1;
    const a = ausgabe();
    const n = ui.index + 1;
    // G6 (E47): Blattrahmen dunkel wie Coffee 10, die Zeitung selbst bleibt Papier (bereich 'papier').
    const navigation = '<div class="zb-navigation">' + K.knopf('‹ Älter', 'data-z-a="vor" aria-label="Ältere Ausgabe"', 'zweit', ui.index <= 0 || ui.archiv)
      + K.knopf(ui.archiv ? 'Zur Zeitung' : 'Archiv ' + aus.length, 'data-z-a="archiv" aria-pressed="' + ui.archiv + '"', 'zweit')
      + K.knopf('Neuer ›', 'data-z-a="naechste" aria-label="Neuere Ausgabe"', 'zweit', ui.index >= aus.length - 1 || ui.archiv) + '</div>'
      + '<div class="zb-zahl hw-lese" aria-live="polite">Ausgabe ' + (aus.length ? n : 0) + ' von ' + aus.length + (!ui.archiv && aus.length > 1 ? ' · wischen für andere Ausgaben' : '') + '</div>';
    const einstellungen = K.schalter({ text: 'Neue Ausgaben und Interviews', unter: aktiv() ? 'Der Handelsbote erscheint jede Woche.' : 'Ausgeschaltet. Das bisherige Archiv bleibt lesbar.', an: aktiv(), attr: 'data-z-a="schalter"' });
    ctx.panel('Zeitung', 'Unabhängige Wochenzeitung · Archiv', K.bereich('papier', 'zeitung') + '<div class="hw-boden"><div class="zb-root">' +
      navigation + (ui.archiv ? archivZeigen() : a ? ausgabeZeigen(a) : leer()) + einstellungen + '</div></div>', 'gross');
    ui.aktiv = true;
    document.getElementById('pinhalt').scrollTop = vorher;
  }
  function oeffne(woche) {
    ui.archiv = false; ui.reiter = 'Top';
    const a = ausgaben();
    ui.index = typeof woche === 'number' ? a.findIndex((x) => x.woche === woche) : a.length - 1;
    anzeigen();
  }
  function klicken(el) {
    const aktion = el.dataset.zA;
    if (aktion === 'tab') { ui.reiter = el.dataset.v; return anzeigen(); }
    if (aktion === 'vor') { ui.index = Math.max(0, ui.index - 1); ui.reiter = 'Top'; return anzeigen(); }
    if (aktion === 'naechste') { ui.index = Math.min(ausgaben().length - 1, ui.index + 1); ui.reiter = 'Top'; return anzeigen(); }
    if (aktion === 'archiv') { ui.archiv = !ui.archiv; return anzeigen(); }
    if (aktion === 'schalter') {
      const ergebnis = ctx.E.fuehreAus(ctx.s(), { typ: 'zeitungAktiv', an: !aktiv() });
      ctx.meldung(ergebnis.text, ergebnis.ok);
      ctx.nachAktion();
      return anzeigen(true);
    }
    if (aktion === 'ausgabe') { ui.index = ausgaben().findIndex((x) => x.woche === Number(el.dataset.v)); ui.archiv = false; ui.reiter = 'Top'; return anzeigen(); }
  }
  const ziel = document.getElementById('pinhalt');
  ziel.addEventListener('click', (e) => {
    if (!ui.aktiv) return;
    const el = e.target.closest('[data-z-a]');
    if (el && !el.disabled) klicken(el);
  });
  let start = null;
  ziel.addEventListener('touchstart', (e) => {
    if (!ui.aktiv || ui.archiv || e.touches.length !== 1) return;
    start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  ziel.addEventListener('touchend', (e) => {
    if (!start || !ui.aktiv || ui.archiv || !e.changedTouches.length) { start = null; return; }
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.4 * Math.abs(dy)) {
      if (dx > 0 && ui.index > 0) klicken({ dataset: { zA: 'vor' } });
      else if (dx < 0 && ui.index < ausgaben().length - 1) klicken({ dataset: { zA: 'naechste' } });
    }
  }, { passive: true });
  return { ui, oeffne, aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; start = null; },
    neuZeichnen: () => { if (ui.aktiv) anzeigen(true); },
    pruefe: () => ({ archiv: ausgaben().length, sichtbar: ausgabe()?.woche ?? null, reiter: ui.reiter, aktiv: aktiv() }) };
}
