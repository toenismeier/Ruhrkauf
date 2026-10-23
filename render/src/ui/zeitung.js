// Der Handelsbote: Wochenzeitung mit Reitern und Wischarchiv.
// Sämtliche Inhalte und Entscheidungen stammen aus engine/src/zeitung.ts.
import { esc } from './format.js';
import { zeitungsBild } from '../kit/zeitung.js';

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
export function zeitungModul(ctx) {
  const ui = { aktiv: false, index: -1, reiter: 'Top', archiv: false };
  const ausgaben = () => ctx.E.zeitungArchiv(ctx.s());
  const aktiv = () => ctx.E.zeitungAktiv(ctx.s());
  const sortiert = () => [...ausgaben()].reverse();
  const ausgabe = () => ausgaben()[ui.index] ?? null;

  function leer() {
    return '<div class="zb-leer"><h3>Das Archiv ist noch leer.</h3><p>Die erste Ausgabe erscheint nach dem nächsten Wochenabschluss.</p></div>';
  }
  function kopf(a) {
    return '<header class="zb-kopf"><div class="zb-ausgabenzeile"><span>HANDEL · WIRTSCHAFT · GESELLSCHAFT</span><span>NR. ' + a.nummer + '</span></div>' +
      '<h2>Der Handelsbote</h2><div class="zb-datum"><span>KW ' + a.kw + ' / ' + a.jahr + '</span><span>Wochenzeitung für den Handel</span></div></header>';
  }
  function artikel(a, aufmacher = false) {
    const illustr = zeitungsBild(a.art, a.bild, ui.index);
    return '<article data-art="' + esc(a.art || 'presse') + '" class="zb-artikel ' + (aufmacher ? 'zb-aufmacher' : '') + '">' +
      '<div class="zb-rubrik">' + esc(rubrik(a)) + '</div>' +
      '<h3>' + esc(a.titel) + '</h3><p class="zb-unter">' + esc(a.unterzeile) + '</p>' +
      '<figure class="zb-bild"><div class="zb-bildrahmen">' +
      '<div class="zb-bildlade" aria-hidden="true">Illustration wird vorbereitet …</div>' + illustr + '</div>' +
      '<figcaption>Illustration: Redaktion Der Handelsbote</figcaption></figure>' +
      '<p class="zb-text">' + esc(a.text) + '</p></article>';
  }
  function ausgabeZeigen(a) {
    const alle = [a.aufmacher, ...a.meldungen];
    const gewaehlt = alle.filter((x) => passt(x, ui.reiter));
    const inhalt = gewaehlt.length ? gewaehlt.map((x, i) => artikel(x, i === 0)).join('') : '<p class="zb-keine">In dieser Rubrik liegen in dieser Woche keine Artikel vor.</p>';
    return kopf(a) +
      '<nav class="zb-tabs" role="tablist" aria-label="Zeitungsrubriken">' + REITER.map((v) =>
        '<button type="button" role="tab" aria-selected="' + (ui.reiter === v) + '" data-z-a="tab" data-v="' + v + '" class="' + (ui.reiter === v ? 'aktiv' : '') + '">' + v + '</button>').join('') +
      '</nav><div class="zb-spalten">' + inhalt + '</div>';
  }
  function archivZeigen() {
    const aus = sortiert();
    return '<h3 class="zb-archivtitel">Alle Ausgaben</h3><p class="zb-hinweis">Die letzten 104 Wochen bleiben im Spielstand erhalten.</p>' +
      '<div class="zb-archivliste">' + aus.map((a) =>
        '<button data-z-a="ausgabe" data-v="' + a.woche + '"><small>NR. ' + a.nummer + ' · KW ' + a.kw + ' / ' + a.jahr + '</small>' +
        '<strong>' + esc(a.aufmacher.titel) + '</strong><span>' + (a.meldungen.length + 1) + ' Artikel</span></button>').join('') + '</div>';
  }
  function anzeigen(halten = false) {
    const vorher = halten ? document.getElementById('pinhalt')?.scrollTop ?? 0 : 0;
    const aus = ausgaben();
    if (ui.index < 0 || ui.index >= aus.length) ui.index = aus.length - 1;
    const a = ausgabe();
    const n = ui.index + 1;
    const navigation = '<div class="zb-navigation"><button data-z-a="vor" ' + (ui.index <= 0 || ui.archiv ? 'disabled' : '') + ' aria-label="Ältere Ausgabe">‹ Älter</button>' +
      '<button data-z-a="archiv" aria-pressed="' + ui.archiv + '">' + (ui.archiv ? 'Zur Zeitung' : 'Archiv (' + aus.length + ')') + '</button>' +
      '<button data-z-a="naechste" ' + (ui.index >= aus.length - 1 || ui.archiv ? 'disabled' : '') + ' aria-label="Neuere Ausgabe">Neuer ›</button></div>' +
      '<div class="zb-zahl" aria-live="polite">Ausgabe ' + (aus.length ? n : 0) + ' von ' + aus.length + '</div>';
    const einstellungen = '<label class="zb-einstellung"><input type="checkbox" data-z-a="schalter" ' + (aktiv() ? 'checked' : '') + '> Neue Zeitungsausgaben und Interviews aktivieren</label>' +
      (!aktiv() ? '<p class="zb-hinweis">Der Handelsbote ist ausgeschaltet. Das bisherige Archiv bleibt lesbar.</p>' : '');
    // Q30: Papier bleibt Papier; die Zeitung zuerst, die Einstellung ans Ende.
    ctx.panel('Zeitung', 'Unabhängige Wochenzeitung · Archiv', '<i class="hk-bereich" data-bereich="papier" data-symbol="post" aria-hidden="true"></i><div class="zb-root">' +
      navigation + (ui.archiv ? archivZeigen() : a ? ausgabeZeigen(a) : leer()) +
      (!ui.archiv ? '<div class="zb-wischhinweis">Nach links oder rechts wischen, um eine andere Ausgabe zu lesen.</div>' : '') + einstellungen + '</div>', 'gross');
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
    if (aktion === 'ausgabe') { ui.index = ausgaben().findIndex((x) => x.woche === Number(el.dataset.v)); ui.archiv = false; ui.reiter = 'Top'; return anzeigen(); }
  }
  const ziel = document.getElementById('pinhalt');
  ziel.addEventListener('click', (e) => {
    if (!ui.aktiv) return;
    const el = e.target.closest('[data-z-a]');
    if (el && el.tagName !== 'INPUT' && !el.disabled) klicken(el);
  });
  ziel.addEventListener('change', (e) => {
    if (!ui.aktiv || e.target.dataset.zA !== 'schalter') return;
    const ergebnis = ctx.E.fuehreAus(ctx.s(), { typ: 'zeitungAktiv', an: e.target.checked });
    ctx.meldung(ergebnis.text, ergebnis.ok);
    ctx.nachAktion();
    anzeigen(true);
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
