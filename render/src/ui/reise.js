// Reise zwischen Hartwig-Städten. Messwerte: auftraege/spiel-reise-und-wochenabschluss.md.
// E47: Reise als Vollbild-Blatt wie das Spielblatt (Kopf, Sprecherzeile, Inhalt); Karte mit beschrifteten Städten
// oder Städteliste als Segment, Suche darüber. Die Fahrt selbst bleibt die Bildfolge mit Zug und Panorama.
import { esc, geld } from './format.js';
import * as K from './komponenten.js';
import { portraetSVG } from '../kit/portraet.js';
import { stadtSymbolSVG } from '../kit/stadtwahrzeichen.js';
import { reiseDeutschlandKarte } from './deutschland.js';
const ASSISTENTIN = portraetSVG({ geschlecht: 'w', alter: 36, haar: 'bob', haarfarbe: 'braun', hautton: 'rosig', kleidung: 'blazer', kleidungFarbe: 'marine', seed: 821 }, 72);
export const REISE_ZEIT = Object.freeze({
  kreisAuf: 240, panelSteht: 260, text: 1500, zieleAb: 1000, wechsel: 150,
  fahrt: 4400, zugStart: 700, zugEnde: 3500, kreisZu: 400, reduziert: 150,
});
const bewegungReduziert = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ohneAnimation = () => new URLSearchParams(location.search).has('ohne-animation');
const warten = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const kuerzel = { Essen: 'E', Düsseldorf: 'D', Dortmund: 'DO', Duisburg: 'DU', Köln: 'K',
  Bochum: 'BO', Berlin: 'B', Hamburg: 'HH', München: 'M', Frankfurt: 'F', Bremen: 'HB',
  Hannover: 'H', Stuttgart: 'S', Leipzig: 'L', Bonn: 'BN', Wuppertal: 'W', Dresden: 'DD' };
const kode = (name) => kuerzel[name] ?? (name.replace(/[^A-ZÄÖÜ]/g, '').slice(0, 3) || name.slice(0, 2).toUpperCase());
const typBild = (name) => /Hamburg|Bremen|Kiel|Lübeck|Rostock|Bremerhaven|Wismar|Wilhelmshaven/i.test(name)
  ? 'hafen' : /Köln|Dresden|Heidelberg|Bamberg|Erfurt|Münster|Aachen/i.test(name) ? 'altstadt' : 'ruhr';
const bild = (name) => './bilder/reise-' + typBild(name) + '.jpg';
// Ein echter, 96 x 96 Pixel großer Stadtplanausschnitt wird je besuchter Stadt im RAM gehalten.
// Für noch nicht besuchte Städte: Katalog-Wahrzeichen der Stadt.
const vorschauen = new Map();
const stadtVorschau = (c) => { const data = vorschauen.get(c.name); return '<span class="hw-reise-bild" aria-hidden="true">' + (data ? '<img src="' + data + '" alt="" loading="lazy">' : stadtSymbolSVG(c)) + '</span>'; };
const zug = (klasse) => '<svg class="' + klasse + '" viewBox="0 0 780 180" aria-hidden="true"><path d="M42 85 Q72 37 153 32 L598 32 Q693 37 748 106 L754 134 Q747 148 717 151 L82 151 Q43 142 42 115Z" fill="#f7f8f9" stroke="#a5b1ba" stroke-width="5"/><path d="M44 118 L748 118" stroke="#cf392e" stroke-width="17"/><path d="M75 76 Q102 43 170 45 L222 45 L222 88 L62 88Z M246 45 H350 V88 H246Z M373 45 H475 V88 H373Z M497 45 H601 V88 H497Z M621 53 Q685 66 712 95 H621Z" fill="#263d50"/><path d="M76 150 L711 150" stroke="#59636c" stroke-width="7"/></svg>';

export function reiseModul(ctx) {
  const z = document.createElement('div');
  z.id = 'reise-overlay'; z.hidden = true; document.body.append(z);
  const protokoll = [];
  let aktiv = false, token = 0, gestartet = 0, zielStart = null, letzte = [];
  const messen = (schritt) => { const t = performance.now(); protokoll.push({ schritt, ms: Math.round(t - gestartet), ...(zielStart === null ? {} : { reiseMs: Math.round(t - zielStart) }) }); };
  function schliessen() { ++token; aktiv = false; z.hidden = true; z.innerHTML = ''; z.className = ''; document.body.classList.remove('reise-aktiv'); }
  // Liegt der Bahnhofs-Pin außerhalb des Bildes, startet bzw. endet der Kreis am Stadtchip (dort wurde getippt).
  function ortPunkt() {
    const p = ctx.pinPunkt(), w = innerWidth, h = innerHeight;
    if (p && p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h) return { x: Math.round(p.x), y: Math.round(p.y) };
    const chip = document.getElementById('stadt-reise')?.getBoundingClientRect();
    return chip ? { x: Math.round(chip.left + chip.width / 2), y: Math.round(chip.top + chip.height / 2) } : { x: Math.round(w * .5), y: Math.round(h * .65) };
  }
  // Radius bis zur entferntesten Bildecke, damit der offene Kreis das ganze Bild sicher deckt.
  function kreis(p) {
    const w = innerWidth, h = innerHeight, r = Math.ceil(Math.hypot(Math.max(p.x, w - p.x), Math.max(p.y, h - p.y))) + 2;
    z.style.setProperty('--rx', p.x + 'px'); z.style.setProperty('--ry', p.y + 'px'); z.style.setProperty('--rr', r + 'px');
  }
  function ziele(gesucht = '') {
    const hier = ctx.stadt();
    const sortiert = ctx.staedte().filter((c) => c.name !== hier && c.name.toLocaleLowerCase('de').includes(gesucht.toLocaleLowerCase('de')))
      .sort((a, b) => {
        const ia = letzte.indexOf(a.name), ib = letzte.indexOf(b.name);
        if (ia !== -1 || ib !== -1) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
        return (b.umsatz ?? 0) - (a.umsatz ?? 0) || a.name.localeCompare(b.name, 'de');
      });
    const liste = z.querySelector('#reise-zielliste');
    if (!liste) return;
    liste.innerHTML = sortiert.length ? K.liste(sortiert.map((c) => K.zeile({
      was: stadtVorschau(c) + '<span class="hw-reise-name">' + esc(c.name) + '<small>' + (Array.isArray(c.formate) ? c.formate.map((f) => '<span class="hw-reise-format">' + esc(f.name) + '&nbsp;' + esc(String(f.anzahl)) + '</span>').join('') : esc(c.formate ?? '')) + '</small></span>',
      wert: c.umsatz ? esc(geld(c.umsatz)) : '', wertUnter: c.umsatz ? 'Umsatz Woche' : '', tippbar: true,
      attr: 'data-reiseziel="' + esc(c.name) + '" aria-label="Nach ' + esc(c.name) + ' reisen"' })))
      : K.leer('Ein Teil des Namens reicht, zum Beispiel „Müh“ für Mülheim.', 'Keine Stadt passt zur Suche');
    const treffer = z.querySelector('[data-reise-treffer]');
    if (treffer) treffer.textContent = sortiert.length + ' ' + (sortiert.length === 1 ? 'Reiseziel' : 'Reiseziele');
  }
  function ansichtSetzen(name) {
    if (!aktiv || !['karte', 'liste'].includes(name)) return;
    for (const art of ['karte', 'liste']) {
      const an = art === name;
      z.querySelector('#reise-blatt-' + art)?.toggleAttribute('hidden', !an);
      z.querySelector('#reise-tab-' + art)?.setAttribute('aria-pressed', String(an));
    }
    z.dataset.ansicht = name;
  }
  function schreibe(el, text, dauer, meins) {
    if (!el) return;
    if (ohneAnimation() || bewegungReduziert()) { el.textContent = text; return; }
    const beginn = performance.now();
    function tick(t) {
      if (token !== meins) return;
      el.textContent = text.slice(0, Math.min(text.length, Math.floor((t - beginn) / 1000 * 60)));
      if (t - beginn < dauer && el.textContent.length < text.length) requestAnimationFrame(tick);
      else el.textContent = text;
    }
    requestAnimationFrame(tick);
  }
  function oeffne() {
    if (aktiv) return;
    ++token; const meins = token;
    letzte = [...(ctx.zuletzt?.() ?? letzte)];
    aktiv = true; gestartet = performance.now(); zielStart = null; protokoll.length = 0; messen('Pin angetippt');
    const hier = ctx.stadt(), p = ortPunkt(); kreis(p);
    const ausschnitt = ctx.vorschau?.();
    if (ausschnitt) vorschauen.set(hier, ausschnitt);
    z.hidden = false;
    const seg = K.seg([['karte', 'Karte'], ['liste', 'Städteliste']], 'karte', (v) => 'id="reise-tab-' + v + '" aria-controls="reise-blatt-' + v + '" data-reiseansicht="' + v + '"')
      .replace('class="hw-segment"', 'class="hw-segment" aria-label="Reiseziele anzeigen"');
    z.innerHTML = '<section class="hw hw-blatt hw-reise" data-bereich="betrieb" role="dialog" aria-modal="true" aria-label="Reiseziele"><div class="hw-grund"></div>'
      + '<header class="hw-kopf"><span class="hw-kopf-symbol" aria-hidden="true">' + (K.illustration('bahn') || K.SYMBOLE.zentrale) + '</span><h2 class="hw-kopf-titel">Hauptbahnhof ' + esc(hier) + '</h2>'
      + '<div class="hw-kopf-unter" data-reise-treffer></div><button type="button" class="hw-zu" aria-label="Schließen" data-reisezu></button></header>'
      + K.sprecher({ text: '<span class="reise-text" aria-live="polite"></span>', unter: 'Sekretariat', person: ASSISTENTIN })
      + '<div class="hw-inhalt"><div class="hw-reise-ziele">' + K.rumpf('<input class="hw-suche" data-reisesuche type="search" placeholder="Stadt suchen" aria-label="Reiseziel suchen">'
        + '<div class="hw-abstand"></div>' + seg
        + '<div id="reise-blatt-karte" class="hw-reise-blatt"><div class="hw-reise-karte"></div><p class="hw-text">Markiert: aktueller Standort. Die Punktgröße zeigt die Zahl der Häuser. Stadt antippen, um zu reisen.</p></div>'
        + '<div id="reise-blatt-liste" class="hw-reise-blatt" hidden>' + K.abschnitt('Reiseziele', 'zuletzt besucht, dann nach Umsatz') + '<div id="reise-zielliste"></div></div>') + '</div></div></section>';
    z.querySelector('.hw-reise-karte').append(
      reiseDeutschlandKarte(ctx.staedte(), hier, (stadt) => { if (stadt !== hier) fahren(stadt); })
    );
    document.body.classList.add('reise-aktiv');
    z.querySelector('[data-reisesuche]').addEventListener('input', (e) => {
      ziele(e.target.value);
      if (e.target.value) ansichtSetzen('liste');
    });
    ziele();
    z.dataset.ansicht = 'karte';
    requestAnimationFrame(() => { if (meins === token) z.classList.add('offen'); });
    const animate = !(ohneAnimation() || bewegungReduziert());
    setTimeout(() => { if (meins !== token) return; messen('Panel offen'); schreibe(z.querySelector('.reise-text'), 'Wohin soll es gehen? Der Zug steht bereit.', REISE_ZEIT.text, meins); }, animate ? REISE_ZEIT.kreisAuf + REISE_ZEIT.panelSteht : 0);
    setTimeout(() => { if (meins === token) { z.classList.add('ziele-offen'); messen('Ziele sichtbar'); } }, animate ? REISE_ZEIT.zieleAb : 0);
  }
  async function fahren(ziel) {
    if (!aktiv || !ctx.staedte().some((c) => c.name === ziel) || ziel === ctx.stadt()) return;
    const meins = ++token, von = ctx.stadt(), start = performance.now(), reduziert = bewegungReduziert() || ohneAnimation();
    zielStart = start; messen('Reiseziel gewählt');
    const p = ortPunkt(); kreis(p); z.classList.remove('offen', 'ziele-offen'); z.classList.add('faehrt');
    z.innerHTML = '<section class="hw-reise-flug" role="status" aria-label="Bahnreise nach ' + esc(ziel) + '"><div class="hw-reise-panorama" style="background-image:url(\'' + bild(ziel) + '\')"></div><div class="hw-reise-dunst"></div>' + zug('hw-reise-zug') + '<div class="hw-reise-strecke"><b>' + esc(kode(von)) + ' <span aria-hidden="true">›</span> ' + esc(kode(ziel)) + '</b><small>' + esc(von) + ' nach ' + esc(ziel) + '</small></div></section>';
    const flug = z.querySelector('.hw-reise-flug'); flug.classList.add('start');
    const vorbereitung = new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (meins !== token) return resolve(false);
        try { await ctx.bauen(ziel); resolve(true); } catch (e) { reject(e); }
      }, reduziert ? 0 : REISE_ZEIT.wechsel);
    });
    try {
      if (!reduziert) { await warten(REISE_ZEIT.wechsel); if (meins === token) { flug.classList.add('bewegt'); messen('Flug beginnt'); } }
      else flug.classList.add('bewegt');
      const fertig = await vorbereitung;
      if (!fertig || meins !== token) return;
      await warten(reduziert ? 0 : Math.max(0, REISE_ZEIT.wechsel + REISE_ZEIT.fahrt - (performance.now() - start)));
      if (meins !== token) return;
      ctx.bahnhofFokussieren();
      const ausschnitt = ctx.vorschau?.();
      if (ausschnitt) vorschauen.set(ziel, ausschnitt);
      const zielPin = ortPunkt(); kreis(zielPin);
      flug.classList.add('ankunft'); messen('Kreis-Schließen');
      await warten(reduziert ? REISE_ZEIT.reduziert : REISE_ZEIT.kreisZu);
      if (meins !== token) return;
      letzte = [von, ...letzte.filter((c) => c !== von && c !== ziel)].slice(0, 12);
      ctx.besucht?.(letzte);
      ctx.fertig(ziel); messen('Reise abgeschlossen'); schliessen();
    } catch (e) { schliessen(); ctx.fehler?.(e); }
  }
  z.addEventListener('click', (e) => {
    if (e.target.closest('[data-reisezu]')) return schliessen();
    const tab = e.target.closest('[data-reiseansicht]');
    if (tab) { ansichtSetzen(tab.dataset.reiseansicht); return; }
    const b = e.target.closest('[data-reiseziel]');
    if (b) fahren(b.dataset.reiseziel);
  });
  return { oeffne, zu: schliessen, aktiv: () => aktiv, pruefe: () => ({ stadt: ctx.stadt(), aktiv, schritte: [...protokoll],
    zielAnzahl: z.querySelectorAll('[data-reiseziel]').length,
    kartenPunkte: z.querySelectorAll('.hw-dl-stadt').length,
    ansicht: z.dataset.ansicht ?? 'karte' }), fahren };
}
