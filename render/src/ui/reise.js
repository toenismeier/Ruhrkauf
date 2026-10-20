// Reise zwischen Hartwig-Städten. Messwerte: auftraege/spiel-reise-und-wochenabschluss.md.
import { esc } from './format.js';
import { portraetSVG } from '../kit/portraet.js';
const ASSISTENTIN = portraetSVG({ geschlecht: 'w', alter: 36, haar: 'bob', haarfarbe: 'braun', hautton: 'rosig', kleidung: 'blazer', kleidungFarbe: 'marine', seed: 821 }, 110);
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
const zug = '<svg class="reise-zug" viewBox="0 0 780 180" aria-hidden="true"><path d="M42 85 Q72 37 153 32 L598 32 Q693 37 748 106 L754 134 Q747 148 717 151 L82 151 Q43 142 42 115Z" fill="#f7f8f9" stroke="#a5b1ba" stroke-width="5"/><path d="M44 118 L748 118" stroke="#cf392e" stroke-width="17"/><path d="M75 76 Q102 43 170 45 L222 45 L222 88 L62 88Z M246 45 H350 V88 H246Z M373 45 H475 V88 H373Z M497 45 H601 V88 H497Z M621 53 Q685 66 712 95 H621Z" fill="#263d50"/><path d="M76 150 L711 150" stroke="#59636c" stroke-width="7"/></svg>';

// Schematische Deutschlandkarte: jedes Reiseziel als Punkt, die eigene Stadt rot.
// Die Stadtliste liefert Regionen statt Koordinaten, daher bewusst keine geographische Präzision suggerieren.
const MAP_FELDER = {
  nord: [70, 35], ost: [103, 79], west: [42, 78], mitte: [72, 82], sued: [75, 125],
};
function deutschlandPunkte(staedte, hier) {
  const punkte = staedte.map((stadt) => {
    const hash = [...stadt.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const [x, y] = MAP_FELDER[String(stadt.region ?? 'mitte').toLocaleLowerCase('de')] ?? MAP_FELDER.mitte;
    const dx = (hash % 29) - 14, dy = (Math.floor(hash / 37) % 35) - 17;
    return { name: stadt.name, x: x + dx, y: y + dy, aktuell: stadt.name === hier };
  });
  return punkte.sort((a, b) => Number(a.aktuell) - Number(b.aktuell))
    .map((p) => '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (p.aktuell ? 4 : 1.4) + '" fill="' + (p.aktuell ? '#d23c32' : '#8295a0') + '"><title>' + esc(p.name) + '</title></circle>').join('');
}

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
    const liste = z.querySelector('.reise-zielraster');
    if (!liste) return;
    liste.innerHTML = sortiert.map((c) => '<button class="reise-ziel" data-reiseziel="' + esc(c.name) + '"><img src="' + bild(c.name) + '" alt="" loading="lazy"><span><strong>' + esc(c.name) + '</strong><small>' + esc(c.formate ?? '') + '</small></span></button>').join('');
    if (!sortiert.length) liste.innerHTML = '<p>Keine Reiseziele gefunden.</p>';
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
    z.hidden = false; z.innerHTML = '<section class="reise-panel" role="dialog" aria-modal="true" aria-label="Reiseziele"><header class="reise-kopf"><div class="reise-kopfbild">' + zug + '</div><button class="reise-zu" aria-label="Schließen" data-reisezu>×</button><span class="reise-bahnhof">Hauptbahnhof ' + esc(hier) + '</span><strong>' + esc(hier) + '</strong></header><div class="reise-assistent"><div class="reise-text" aria-live="polite"></div><div class="reise-portraet" aria-hidden="true">' + ASSISTENTIN + '</div></div><div class="reise-ziele"><h2>REISEZIELE</h2><input class="reise-suche" type="search" placeholder="Stadt suchen …" aria-label="Reiseziel suchen"><div class="reise-deutschland" aria-hidden="true"><svg viewBox="0 0 150 155"><path d="M45 8L86 14L102 32L94 52L123 76L112 104L130 127L97 150L65 132L36 140L17 112L31 85L17 58L38 39Z" fill="none" stroke="#aebbc3" stroke-dasharray="2 5" stroke-width="3"/>' + deutschlandPunkte(ctx.staedte(), hier) + '</svg></div><div class="reise-zielraster"></div></div></section>';
    document.body.classList.add('reise-aktiv');
    z.querySelector('.reise-suche').addEventListener('input', (e) => ziele(e.target.value));
    ziele();
    requestAnimationFrame(() => { if (meins === token) z.classList.add('offen'); });
    const animate = !(ohneAnimation() || bewegungReduziert());
    setTimeout(() => { if (meins !== token) return; messen('Panel offen'); schreibe(z.querySelector('.reise-text'), 'Willkommen am Hauptbahnhof ' + hier + '. Wohin soll es gehen?', REISE_ZEIT.text, meins); }, animate ? REISE_ZEIT.kreisAuf + REISE_ZEIT.panelSteht : 0);
    setTimeout(() => { if (meins === token) { z.classList.add('ziele-offen'); messen('Ziele sichtbar'); } }, animate ? REISE_ZEIT.zieleAb : 0);
  }
  async function fahren(ziel) {
    if (!aktiv || !ctx.staedte().some((c) => c.name === ziel) || ziel === ctx.stadt()) return;
    const meins = ++token, von = ctx.stadt(), start = performance.now(), reduziert = bewegungReduziert() || ohneAnimation();
    zielStart = start; messen('Reiseziel gewählt');
    const p = ortPunkt(); kreis(p); z.classList.remove('offen', 'ziele-offen'); z.classList.add('faehrt');
    z.innerHTML = '<section class="reise-flug" role="status" aria-label="Bahnreise nach ' + esc(ziel) + '"><div class="reise-panorama" style="background-image:url(\'' + bild(ziel) + '\')"></div><div class="reise-dunst"></div>' + zug + '<div class="reise-strecke"><div>' + esc(kode(von)) + ' <span>🚆</span> ' + esc(kode(ziel)) + '</div><small>' + esc(von) + ' → ' + esc(ziel) + '</small></div></section>';
    const flug = z.querySelector('.reise-flug'); flug.classList.add('start');
    const vorbereitung = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (meins !== token) return resolve(false);
        try { ctx.bauen(ziel); resolve(true); } catch (e) { reject(e); }
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
    const b = e.target.closest('[data-reiseziel]');
    if (b) fahren(b.dataset.reiseziel);
  });
  return { oeffne, zu: schliessen, aktiv: () => aktiv, pruefe: () => ({ stadt: ctx.stadt(), aktiv, schritte: [...protokoll], zielAnzahl: z.querySelectorAll('[data-reiseziel]').length }), fahren };
}
