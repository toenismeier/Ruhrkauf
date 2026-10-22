// Geräteweite Einstellungen für alle Nice-to-have-Module. Keine Engine- oder Spielstanddaten.
const SPEICHER = 'hartwig.einstellungen.v1';
const definitionen = new Map();
let werte = null;

function gespeicherteWerte() {
  if (werte) return werte;
  werte = {};
  try {
    const roh = typeof localStorage !== 'undefined' ? localStorage.getItem(SPEICHER) : null;
    const gelesen = roh ? JSON.parse(roh) : {};
    if (gelesen && typeof gelesen === 'object' && !Array.isArray(gelesen)) werte = gelesen;
  } catch { /* Privatmodus, gesperrter Speicher oder ungültiges JSON: Standardwerte verwenden. */ }
  return werte;
}
function optionenVon(d) {
  return Array.isArray(d.optionen) ? d.optionen.map((o) => typeof o === 'object' ? o.wert ?? o.value : o) : [];
}
function gueltig(d, wert) {
  if (d.art === 'schalter') return typeof wert === 'boolean' ? wert : d.standard;
  if (d.art === 'auswahl') return optionenVon(d).includes(wert) ? wert : d.standard;
  if (d.art === 'regler') {
    const o = d.optionen ?? {}, min = Number(o.min ?? 0), max = Number(o.max ?? 100);
    const zahl = Number(wert), schritt = Number(o.schritt ?? o.step ?? 1);
    if (!Number.isFinite(zahl)) return d.standard;
    const rund = schritt > 0 ? min + Math.round((zahl - min) / schritt) * schritt : zahl;
    return Math.min(max, Math.max(min, rund));
  }
  return d.standard;
}
export function meldeSchalter({ schluessel, titel, gruppe, art = 'schalter', optionen, standard }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(schluessel ?? '') || !titel || !gruppe || !['schalter', 'auswahl', 'regler'].includes(art))
    throw new Error('Ungültige Einstellungsdefinition.');
  if (definitionen.has(schluessel)) return;
  const d = { schluessel, titel, gruppe, art, optionen, standard };
  if (art === 'schalter' && typeof standard !== 'boolean') throw new Error('Schalter benötigen einen booleschen Standardwert.');
  if (art === 'auswahl' && !optionenVon(d).includes(standard)) throw new Error('Auswahlstandard fehlt in Optionen.');
  definitionen.set(schluessel, d);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('einstellung-registriert'));
}
export function einstellung(schluessel) {
  const d = definitionen.get(schluessel);
  return d ? gueltig(d, gespeicherteWerte()[schluessel] ?? d.standard) : undefined;
}
export function setzeEinstellung(schluessel, wert) {
  const d = definitionen.get(schluessel);
  if (!d) throw new Error('Unbekannte Einstellung: ' + schluessel);
  const neu = gueltig(d, wert), alt = einstellung(schluessel);
  if (Object.is(neu, alt)) return alt;
  gespeicherteWerte()[schluessel] = neu;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(SPEICHER, JSON.stringify(werte)); }
  catch { /* Einstellung bleibt für die laufende Sitzung aktiv. */ }
  if (typeof window !== 'undefined') {
    if (['schrift', 'animationen', 'farbschwaeche'].includes(schluessel)) anwendenDarstellung();
    window.dispatchEvent(new CustomEvent('einstellung', { detail: { schluessel, wert: neu } }));
  }
  return neu;
}
export function effektiveAnimation() {
  const wunsch = einstellung('animationen') ?? 'voll';
  if (wunsch === 'aus') return 'aus';
  try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduziert'; } catch {}
  return wunsch;
}
export function anwendenDarstellung() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--schrift', ({ klein: 0.9, normal: 1, gross: 1.16 })[einstellung('schrift')] ?? 1);
  document.documentElement.dataset.animation = effektiveAnimation();
  document.body?.classList.toggle('farbschwach', einstellung('farbschwaeche') === true);
}
const einstellungen = [
  { schluessel: 'schrift', titel: 'Schriftgröße', gruppe: 'Darstellung', art: 'auswahl', standard: 'normal', optionen: [{ wert: 'klein', titel: 'Klein' }, { wert: 'normal', titel: 'Normal' }, { wert: 'gross', titel: 'Groß' }] },
  { schluessel: 'zahlen', titel: 'Zahlenformat', gruppe: 'Darstellung', art: 'auswahl', standard: 'kompakt', optionen: [{ wert: 'kompakt', titel: 'Kompakt · 12,4 Mio. €' }, { wert: 'voll', titel: 'Voll · 12.403.221 €' }] },
  { schluessel: 'animationen', titel: 'Animationen', gruppe: 'Darstellung', art: 'auswahl', standard: 'voll', optionen: [{ wert: 'voll', titel: 'Voll' }, { wert: 'reduziert', titel: 'Reduziert' }, { wert: 'aus', titel: 'Aus' }] },
  { schluessel: 'farbschwaeche', titel: 'Farbschwäche-Modus', gruppe: 'Darstellung', art: 'schalter', standard: false },
  { schluessel: 'warnung', titel: 'Vor ablaufenden Vorgängen warnen', gruppe: 'Spiel', art: 'schalter', standard: true },
  { schluessel: 'wochenbericht', titel: 'Wochenbericht', gruppe: 'Spiel', art: 'auswahl', standard: 'voll', optionen: [{ wert: 'voll', titel: 'Voll · 11 Sekunden' }, { wert: 'kurz', titel: 'Kurz · 2 Sekunden' }, { wert: 'aus', titel: 'Aus' }] },
  { schluessel: 'autospeichern', titel: 'Autospeichern', gruppe: 'Spiel', art: 'schalter', standard: true },
];
for (const d of einstellungen) meldeSchalter(d);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const option = (o) => typeof o === 'object' ? { wert: o.wert ?? o.value, titel: o.titel ?? o.label ?? o.wert } : { wert: o, titel: o };
const version = () => typeof __HARTWIG_VERSION__ !== 'undefined' ? __HARTWIG_VERSION__ : 'Entwicklung';

export function einstellungenModul(ctx) {
  let aktiv = false;
  function feld(d) {
    const v = einstellung(d.schluessel), id = 'einst-' + d.schluessel;
    if (d.art === 'schalter') return '<label class="einst-zeile einst-schalter" for="' + id + '"><span>' + esc(d.titel) + '</span><input id="' + id + '" type="checkbox" data-einstellung="' + d.schluessel + '" ' + (v ? 'checked' : '') + ' aria-label="' + esc(d.titel) + '"></label>';
    if (d.art === 'auswahl') return '<label class="einst-zeile" for="' + id + '"><span>' + esc(d.titel) + '</span><select id="' + id + '" data-einstellung="' + d.schluessel + '" aria-label="' + esc(d.titel) + '">' + d.optionen.map((o) => { const p = option(o); return '<option value="' + esc(p.wert) + '" ' + (p.wert === v ? 'selected' : '') + '>' + esc(p.titel) + '</option>'; }).join('') + '</select></label>';
    const o = d.optionen ?? {};
    return '<label class="einst-zeile" for="' + id + '"><span>' + esc(d.titel) + ': <output id="' + id + '-wert">' + esc(v) + '</output></span><input id="' + id + '" type="range" data-einstellung="' + d.schluessel + '" min="' + esc(o.min ?? 0) + '" max="' + esc(o.max ?? 100) + '" step="' + esc(o.schritt ?? o.step ?? 1) + '" value="' + esc(v) + '" aria-label="' + esc(d.titel) + '"></label>';
  }
  function zeigen(halten = false) {
    const scroll = halten ? document.getElementById('pinhalt').scrollTop : 0;
    const gruppen = new Map();
    for (const d of definitionen.values()) {
      if (!gruppen.has(d.gruppe)) gruppen.set(d.gruppe, []);
      gruppen.get(d.gruppe).push(feld(d));
    }
    // Q30: dunkler Grundlook, Gruppen als Abschnitte mit Zeilen
    const html = '<i class="hk-bereich" data-bereich="betrieb" data-symbol="zahlen" aria-hidden="true"></i><div class="hk-rumpf">' + [...gruppen.entries()].map(([name, zeilen]) => '<h3 class="hk-abschnitt">' + esc(name) + '</h3><section class="hk-liste einst-gruppe">' + zeilen.join('') + '</section>').join('') +
      '<h3 class="hk-abschnitt">Über</h3><section class="hk-liste einst-gruppe"><div class="einst-info">Version <strong>' + esc(version()) + '</strong></div><p class="einst-info">Alle Namen sind frei erfunden.</p><p class="einst-info">Stadtplan Essen: Kartendaten © OpenStreetMap-Mitwirkende (ODbL). Quelle: OpenStreetMap, 20.10.2026.</p><p class="einst-info">Die Einstellungen gelten geräteweit und gehören nicht zum Spielstand.</p></section></div>';
    ctx.panel('Einstellungen', 'Darstellung, Bedienung und Spiel', html, 'gross');
    aktiv = true;
    document.getElementById('pinhalt').scrollTop = scroll;
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('change', (e) => {
    if (!aktiv || !e.target.matches('[data-einstellung]')) return;
    const d = definitionen.get(e.target.dataset.einstellung);
    if (!d) return;
    setzeEinstellung(d.schluessel, d.art === 'schalter' ? e.target.checked : e.target.value);
    if (d.art !== 'regler') zeigen(true);
  });
  inhalt.addEventListener('input', (e) => {
    if (!aktiv || !e.target.matches('input[type="range"][data-einstellung]')) return;
    const wert = setzeEinstellung(e.target.dataset.einstellung, Number(e.target.value));
    const output = document.getElementById(e.target.id + '-wert');
    if (output) output.textContent = wert;
  });
  window.addEventListener('einstellung-registriert', () => { if (aktiv) zeigen(true); });
  anwendenDarstellung();
  try {
    const medien = window.matchMedia('(prefers-reduced-motion: reduce)');
    medien.addEventListener?.('change', anwendenDarstellung);
  } catch {}
  return { oeffne: () => zeigen(), zu: () => { aktiv = false; }, aktiv: () => aktiv, neuZeichnen: () => { if (aktiv) zeigen(true); } };
}

// Für dynamisch erzeugte Bedienfelder (einschließlich der Wochen-Overlays).
// Buttons behalten ihre sichtbare Beschriftung; reine Symbolknöpfe erhalten einen sinnvollen Namen.
export function aktiviereBarrierefreiheit() {
  function beschriften(wurzel = document) {
    const knoepfe = [...(wurzel.matches?.('button') ? [wurzel] : []), ...wurzel.querySelectorAll('button')];
    for (const b of knoepfe) {
      if (b.hasAttribute('aria-label')) continue;
      const text = (b.textContent ?? '').replace(/\s+/g, ' ').trim();
      const label = text === '×' ? 'Schließen' : text === '+' ? 'Erhöhen' : text === '−' || text === '-' ? 'Verringern' : text || b.getAttribute('title') || b.id.replace(/[-_]/g, ' ') || 'Schaltfläche';
      b.setAttribute('aria-label', label);
    }
  }
  beschriften();
  new MutationObserver((mutationen) => {
    for (const m of mutationen) for (const node of m.addedNodes) if (node.nodeType === 1) beschriften(node);
  }).observe(document.body, { childList: true, subtree: true });
}
