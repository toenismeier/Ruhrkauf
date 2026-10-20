// N04: Geführter Spieleinstieg. Ausschließlich UI-Zustand, keine Engine-Eingriffe.
import { portraetSVG } from '../kit/portraet.js';

export const EINFUEHRUNG_AKTIV = true; // Fallback, bis N13 seinen zentralen Schalter bereitstellt.
const SCHLUESSEL = 'hartwig.einfuehrung.v1';
const TIPPS = 'hartwig.einfuehrung.tipps.v1';
const TEMPO = 60; // Zeichen/Sekunde, wie beim Wochenabschluss
const ASSISTENTIN = portraetSVG({
  geschlecht: 'w', alter: 36, haar: 'bob', haarfarbe: 'braun', hautton: 'rosig',
  kleidung: 'blazer', kleidungFarbe: 'marine', seed: 821,
}, 110);

// "ziel" bezeichnet eine UI-Zone; "warte" ist eine echte Handlung oder "weiter".
// Bewusst keine Funktionsaufrufe oder HTML in den Texten.
export const EINFUEHRUNG = Object.freeze([
  { id: 'lage', text: 'Willkommen bei Hartwig. Ich bin Ihre Vorstandsassistentin. Die Warenhauskette ist insolvenzreif: Die Liquidität schwindet, Lieferanten sind nervös und zahlreiche Häuser verlieren Geld. Ihre Entscheidungen bestimmen, ob die Sanierung gelingt.', ziel: 'mitte', warte: 'weiter' },
  { id: 'karte', text: 'Verschieben Sie die Stadtkarte mit dem Finger oder der Maus. Zoomen Sie danach mit zwei Fingern oder dem Mausrad. So behalten Sie die Standorte im Blick.', ziel: 'karte', warte: 'karte' },
  { id: 'haus', text: 'Tippen Sie ein Hartwig-Haus auf der Karte an, um seinen Zustand und seine Wirtschaftlichkeit zu prüfen.', ziel: 'karte', warte: 'haus' },
  { id: 'kennzahlen', text: 'Im Hausdetail sehen Sie Flächen, Umsatz, Ergebnis und den Zustand des Gebäudes. Achten Sie auf Verlustbringer. Spätere Maßnahmen setzen genau hier an.', ziel: 'panel', warte: 'weiter' },
  { id: 'cockpit', text: 'Oben liegt Ihr Cockpit: Cash, freier Kreditrahmen, EBITDA, Umsatz, Vertrauen und Image. Ohne Liquidität lässt sich die Sanierung nicht fortsetzen.', ziel: 'cockpit', warte: 'weiter' },
  { id: 'posteingang', text: 'Im Posteingang landen Entscheidungen, Angebote und Meldungen. Öffnen Sie ihn über das Briefsymbol. Beachten Sie die Fristen.', ziel: 'post', warte: 'posteingang' },
  { id: 'einkauf', text: 'Im Einkauf warten Bestellungen auf Ihre Freigabe. Öffnen Sie Einkauf, wechseln Sie zu Freigaben und geben Sie eine Order frei. Eine fehlende Freigabe kann die Warenversorgung gefährden.', ziel: 'einkauf', warte: 'freigabe' },
  { id: 'marketing', text: 'Im Marketing legen Sie Werbung und Aktionen fest. Öffnen Sie dort den Aktionskalender, um künftige Verkaufswochen zu planen.', ziel: 'marketing', warte: 'kalender' },
  { id: 'vorstand', text: 'Im Vorstand besetzen Sie Ressorts und delegieren Aufgaben. Öffnen Sie die Übersicht und prüfen Sie, welche Positionen noch unbesetzt sind.', ziel: 'vorstand', warte: 'vorstand' },
  { id: 'hq', text: 'In der Zentrale steuern Sie Gebäude, Kosten und die Leistungsfähigkeit der Abteilungen. Öffnen Sie die Hauptverwaltung.', ziel: 'hq', warte: 'hq' },
  { id: 'insolvenz', text: 'Der Insolvenzantrag ist eine tiefgreifende Entscheidung, keine Schaltfläche für den Einstieg. Ein Schutzschirm kann eine Sanierung ermöglichen, aber Fristen, Gläubiger und Liquidität bleiben kritisch. Stellen Sie den Antrag erst nach sorgfältiger Prüfung.', ziel: 'panel', warte: 'weiter' },
  { id: 'woche', text: 'Sind Ihre Entscheidungen für diese Woche getroffen, schließen Sie die Woche ab. Bestätigen Sie den Wochenwechsel im Dialog.', ziel: 'woche', warte: 'woche' },
  { id: 'bericht', text: 'Der Wochenbericht zeigt Umsatz, EBITDA, Liquiditätsbewegung und aktuelle Meldungen. Sehen Sie sich die Zahlen an, bevor Sie fortfahren.', ziel: 'bericht', warte: 'weiter' },
  { id: 'reise', text: 'Mit dem Stadtchip unten links öffnen Sie die Bahnreise. Wählen Sie eine andere Stadt, um die übrigen Häuser Ihres Konzerns zu erkunden.', ziel: 'reise', warte: 'reise' },
]);

const lesen = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const sichern = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* Privatmodus: nur Sitzung */ }
};
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches ||
  new URLSearchParams(location.search).has('ohne-animation');
const el = (id) => document.getElementById(id);

export function einfuehrungModul() {
  if (!EINFUEHRUNG_AKTIV) return { spielStart: () => {}, starten: () => {}, zustand: () => ({ aktiv: false }) };
  const root = document.createElement('div');
  root.id = 'einfuehrung-root';
  root.hidden = true;
  document.body.append(root);
  const zustand = lesen(SCHLUESSEL, { modus: 'neu', index: 0 });
  let index = Math.max(0, Math.min(EINFUEHRUNG.length - 1, Number(zustand.index) || 0));
  let aktiv = false, frage = false, tick = 0, rAF = 0, startZeit = 0, kompletterText = false;
  let kartenStart = null, kartenZeiger = new Map(), geschoben = false, gezoomt = false;
  let wocheVor = 0, stadtVor = '', gesehen = new Set();
  let tippsAn = lesen(TIPPS, true);
  const getSpiel = () => window.spiel;
  const speichern = () => { zustand.index = index; sichern(SCHLUESSEL, zustand); };

  function beenden(fertig = false) {
    aktiv = false; frage = false;
    clearInterval(tick); tick = 0; cancelAnimationFrame(rAF); rAF = 0;
    root.hidden = true; root.innerHTML = '';
    document.body.classList.remove('einfuehrung-aktiv');
    if (fertig) { zustand.modus = 'fertig'; index = 0; speichern(); }
  }

  function ganzenText() {
    if (!aktiv || kompletterText) return;
    kompletterText = true; cancelAnimationFrame(rAF); rAF = 0;
    const p = root.querySelector('.ein-text');
    if (p) p.textContent = EINFUEHRUNG[index].text;
  }
  function textTippen() {
    const p = root.querySelector('.ein-text');
    if (!p) return;
    kompletterText = reduziert();
    if (kompletterText) { p.textContent = EINFUEHRUNG[index].text; return; }
    startZeit = performance.now();
    function frame(t) {
      if (!aktiv || !p.isConnected || kompletterText) return;
      const text = EINFUEHRUNG[index].text;
      const zeichen = Math.min(text.length, Math.floor((t - startZeit) * TEMPO / 1000));
      p.textContent = text.slice(0, zeichen);
      if (zeichen < text.length) rAF = requestAnimationFrame(frame);
      else { kompletterText = true; rAF = 0; }
    }
    rAF = requestAnimationFrame(frame);
  }
  function schritt() {
    if (!aktiv) return;
    cancelAnimationFrame(rAF); rAF = 0;
    const d = EINFUEHRUNG[index];
    if (d.warte === 'woche') wocheVor = getSpiel()?.s?.woche ?? 0;
    if (d.warte === 'reise') stadtVor = getSpiel()?.reise?.pruefe()?.stadt ?? '';
    const keineFreigaben = d.warte === 'freigabe' &&
      (getSpiel()?.E?.freigaben(getSpiel().s)?.anzahl ?? 0) === 0;
    root.hidden = false;
    root.innerHTML = '<div class="ein-maske"></div><div class="ein-ring" aria-hidden="true"></div>' +
      '<section class="ein-sheet" role="region" aria-label="Einführung: Schritt ' + (index + 1) + '">' +
      '<div class="ein-kopf"><span class="ein-logo">H</span><div><b>Ihre Vorstandsassistentin</b><small>Schritt ' +
      (index + 1) + ' von ' + EINFUEHRUNG.length + '</small></div>' +
      '<button type="button" data-ein="beenden" aria-label="Einführung beenden">×</button></div>' +
      '<div class="ein-inhalt"><p class="ein-text" data-ein="text"></p><div class="ein-portraet">' + ASSISTENTIN + '</div></div>' +
      '<div class="ein-fuss"><span>' + (d.warte === 'weiter' ? 'Information' :
        d.warte === 'karte' ? 'Karte bewegen und zoomen' : 'Handlung auf der Karte oder im Panel ausführen') + '</span>' +
      ((d.warte === 'weiter' || keineFreigaben) ? '<button type="button" data-ein="weiter">' +
        (keineFreigaben ? 'Ohne Freigabe weiter' : index === EINFUEHRUNG.length - 1 ? 'Fertig' : 'Weiter') + '</button>' :
        '<button type="button" class="ein-ueberspringen" data-ein="weiter" title="Schritt ohne Handlung überspringen">Überspringen</button>') +
      '</div></section>';
    textTippen(); positionieren();
  }
  function weiter() {
    if (!aktiv) return;
    if (index + 1 === EINFUEHRUNG.length) return beenden(true);
    index++; speichern(); schritt();
  }
  function fokusElement() {
    const d = EINFUEHRUNG[index], panel = el('panel')?.classList.contains('offen');
    const menue = el('menue')?.classList.contains('offen');
    const q = (selector) => document.querySelector(selector);
    const panelIm = (titel) => panel && (el('ptitel')?.textContent || '').toLowerCase().includes(titel);
    switch (d.ziel) {
      case 'mitte': return null;
      case 'karte': return el('karte');
      case 'panel': return panel ? el('pinhalt') : el('cockpit');
      case 'cockpit': return el('cockpit');
      case 'post': return panel ? el('pzu') : el('postdirekt');
      case 'einkauf':
        if (panel) {
          if (!getSpiel()?.einkauf?.aktiv()) return el('pzu');
          if (getSpiel().einkauf.ui?.seite !== 'freigaben') return q('#pinhalt [data-a="seite"][data-v="freigaben"]') || el('pinhalt');
          return q('#pinhalt [data-a="frei"]') || q('#pinhalt [data-a="sammel"]') || el('pinhalt');
        }
        return menue ? el('einkauf') : el('menueknopf');
      case 'marketing':
        if (panel) {
          if (!getSpiel()?.marketing?.aktiv()) return el('pzu');
          return q('#pinhalt [data-a="seite"][data-v="kalender"]') || el('pinhalt');
        }
        return menue ? el('marketing') : el('menueknopf');
      case 'vorstand': return panel ? el('pzu') : menue ? el('vorstand') : el('menueknopf');
      case 'hq': return panel ? el('pzu') : menue ? el('hq') : el('menueknopf');
      case 'woche':
        if (panel) return el('pzu');
        return q('#wochen-overlay .wochen-knopfreihe [data-wa="ja"]') || el('weiter');
      case 'bericht': return q('#wochen-overlay .wb-scroll') || el('cockpit');
      case 'reise':
        if (q('#wochen-overlay .wb-vorfallmaske')) return q('#wochen-overlay [data-wa="spaeter"]');
        if (q('#wochen-overlay .wb-bericht')) return q('#wochen-overlay [data-wa="schliessen"]');
        if (panel) return el('pzu');
        return q('#reise-overlay:not([hidden]) .reise-zielraster') || el('stadt-reise');
      default: return null;
    }
  }
  function positionieren() {
    if (!aktiv) return;
    const ziel = fokusElement();
    let b = ziel?.getBoundingClientRect();
    if (!b || b.width < 2 || b.height < 2) b = null;
    const w = innerWidth, h = innerHeight;
    const x0 = b ? Math.max(0, b.left - 7) : w * .5;
    const x1 = b ? Math.min(w, b.right + 7) : w * .5;
    const y0 = b ? Math.max(0, b.top - 7) : h * .47;
    const y1 = b ? Math.min(h, b.bottom + 7) : h * .47;
    const maske = root.querySelector('.ein-maske'), ring = root.querySelector('.ein-ring');
    if (!maske || !ring) return;
    // Gerahmtes Polygon mit Even-Odd-Loch: nur die echte Zielzone lässt Interaktion durch.
    maske.style.clipPath = b
      ? 'polygon(evenodd, 0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px, ' +
        x0 + 'px ' + y0 + 'px, ' + x0 + 'px ' + y1 + 'px, ' + x1 + 'px ' + y1 +
        'px, ' + x1 + 'px ' + y0 + 'px, ' + x0 + 'px ' + y0 + 'px)'
      : '';
    ring.hidden = !b;
    if (b) Object.assign(ring.style, { left: x0 + 'px', top: y0 + 'px',
      width: Math.max(1, x1 - x0) + 'px', height: Math.max(1, y1 - y0) + 'px' });
    const sheet = root.querySelector('.ein-sheet');
    sheet?.classList.toggle('ein-oben', Boolean(b && y1 > h * .54));
  }
  function starten(neustart = false) {
    if (!getSpiel()?.s || !EINFUEHRUNG_AKTIV) return;
    beenden();
    if (neustart) index = 0;
    zustand.modus = 'aktiv'; speichern(); aktiv = true; frage = false;
    document.body.classList.add('einfuehrung-aktiv');
    geschoben = false; gezoomt = false; kartenStart = null; kartenZeiger = new Map();
    wocheVor = getSpiel().s.woche;
    stadtVor = getSpiel().reise?.pruefe()?.stadt ?? '';
    schritt();
    tick = setInterval(() => {
      if (!aktiv) return;
      const d = EINFUEHRUNG[index];
      if (d.warte === 'woche' && getSpiel()?.s?.woche > wocheVor) weiter();
      else if (d.warte === 'reise' && (getSpiel()?.reise?.pruefe()?.stadt ?? '') !== stadtVor &&
        !getSpiel()?.reise?.aktiv()) weiter();
      else positionieren();
    }, 160);
  }
  function abfrage() {
    if (aktiv || frage) return;
    frage = true; root.hidden = false;
    root.innerHTML = '<div class="ein-fragemaske"></div><section class="ein-frage" role="dialog" aria-modal="true" aria-label="Einführung starten">' +
      '<div class="ein-inhalt"><p><b>Einführung starten?</b><span>Die Vorstandsassistentin erklärt in 14 Schritten die wichtigsten Funktionen.</span></p>' +
      '<div class="ein-portraet">' + ASSISTENTIN + '</div></div><div class="ein-antworten">' +
      '<button type="button" data-ein="ja">Ja</button><button type="button" data-ein="spaeter">Später</button>' +
      '<button type="button" data-ein="nie">Nie</button></div></section>';
  }
  function spielStart() {
    // Prüfskripte und Bot-Läufe sollen nicht durch die Einführung blockiert werden.
    if (new URLSearchParams(location.search).has('ohne-animation')) return;
    if (zustand.modus === 'aktiv') starten();
    else if (zustand.modus === 'neu' || zustand.modus === 'spaeter') abfrage();
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ein]');
    if (!b) return;
    switch (b.dataset.ein) {
      case 'text': ganzenText(); break;
      case 'ja': frage = false; starten(true); break;
      case 'spaeter': zustand.modus = 'spaeter'; speichern(); beenden(); break;
      case 'nie': zustand.modus = 'nie'; speichern(); beenden(); break;
      case 'beenden': beenden(); zustand.modus = 'spaeter'; speichern(); break;
      case 'weiter': ganzenText(); weiter(); break;
    }
  });

  // Echte, erfolgreiche Aktionen werden im Bubble-Phase erkannt, nachdem die Module
  // ihre synchronen Handler ausgeführt haben. Keine simulierten Engine-Aktionen.
  document.addEventListener('click', (e) => {
    if (!aktiv) return;
    const d = EINFUEHRUNG[index], ziel = e.target.closest('button, [data-a]');
    if (d.warte === 'posteingang' && (ziel?.id === 'postdirekt' || ziel?.id === 'posteingang') &&
        getSpiel()?.posteingang?.aktiv()) return weiter();
    if (d.warte === 'freigabe' && ['frei', 'sammel', 'kuerzen'].includes(ziel?.dataset.a)) {
      const id = ziel.dataset.v;
      if (ziel.dataset.a === 'sammel' || (id &&
        !getSpiel()?.E?.freigaben(getSpiel().s)?.liste.some((o) => o.id === id))) return weiter();
    }
    if (d.warte === 'kalender' && getSpiel()?.marketing?.aktiv() &&
        getSpiel().marketing.ui?.seite === 'kalender') return weiter();
    if (d.warte === 'vorstand' && ziel?.id === 'vorstand' && getSpiel()?.vorstand?.aktiv()) return weiter();
    if (d.warte === 'hq' && ziel?.id === 'hq' && el('ptitel')?.textContent === 'Zentrale') return weiter();
    requestAnimationFrame(positionieren);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!aktiv || EINFUEHRUNG[index].warte !== 'karte' || e.target !== el('karte')) return;
    kartenZeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (kartenZeiger.size === 1) kartenStart = { x: e.clientX, y: e.clientY };
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!aktiv || EINFUEHRUNG[index].warte !== 'karte' || !kartenZeiger.has(e.pointerId)) return;
    const p = kartenZeiger.get(e.pointerId);
    if (kartenZeiger.size > 1 && Math.hypot(p.x - e.clientX, p.y - e.clientY) > 12) gezoomt = true;
    if (kartenStart && Math.hypot(kartenStart.x - e.clientX, kartenStart.y - e.clientY) > 18) geschoben = true;
    kartenZeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (geschoben && gezoomt) weiter();
  }, true);
  document.addEventListener('pointerup', (e) => {
    if (!aktiv) return;
    if (EINFUEHRUNG[index].warte === 'karte') {
      kartenZeiger.delete(e.pointerId);
      if (geschoben && gezoomt) weiter();
    } else if (EINFUEHRUNG[index].warte === 'haus' && e.target === el('karte')) {
      requestAnimationFrame(() => { if (aktiv && EINFUEHRUNG[index].warte === 'haus' &&
        el('panel')?.classList.contains('offen') && !['Zentrale', 'Wettbewerber'].includes(el('ptitel')?.textContent)) weiter(); });
    }
  });
  document.addEventListener('wheel', (e) => {
    if (aktiv && EINFUEHRUNG[index].warte === 'karte' && e.target === el('karte')) {
      gezoomt = true; if (geschoben) weiter();
    }
  }, { passive: true });
  window.addEventListener('resize', positionieren);
  document.addEventListener('scroll', positionieren, true);

  // Kontext-Hinweise sind nicht modal und verändern keine Aktionen oder Berechnungen.
  const HINWEISE = {
    Einkauf: 'Hier steuern Sie Bestellungen, Warenbestände und Freigaben.',
    Marketing: 'Hier planen Sie Aktionen, Werbung und Kundenansprache.',
    Vorstand: 'Hier besetzen Sie Ressorts und stellen Delegationen ein.',
    Zentrale: 'Hier steuern Sie Standorte und Kosten der Hauptverwaltung.',
    Posteingang: 'Hier finden Sie Entscheidungen und Fristen.',
  };
  const hinweis = document.createElement('div');
  hinweis.id = 'ein-kontext'; hinweis.hidden = true; document.body.append(hinweis);
  function panelTipp() {
    if (aktiv || frage || !tippsAn || zustand.modus !== 'fertig') return;
    if (!el('panel')?.classList.contains('offen')) return;
    const titel = el('ptitel')?.textContent ?? '';
    const key = Object.keys(HINWEISE).find((k) => titel.includes(k));
    if (!key || gesehen.has(key)) return;
    gesehen.add(key);
    const bekannt = lesen(SCHLUESSEL + '.tipps', []);
    if (bekannt.includes(key)) return;
    sichern(SCHLUESSEL + '.tipps', [...bekannt, key]);
    hinweis.textContent = HINWEISE[key]; hinweis.hidden = false;
    setTimeout(() => { hinweis.hidden = true; }, 4600);
  }
  const beobachter = new MutationObserver(panelTipp);
  beobachter.observe(el('ptitel'), { childList: true, characterData: true, subtree: true });
  beobachter.observe(el('panel'), { attributes: true, attributeFilter: ['class'] });

  const restart = el('einfuehrung-neustart');
  restart?.addEventListener('click', () => {
    if (el('menue')?.classList.contains('offen')) el('menueknopf')?.click();
    getSpiel()?.wochenbericht?.zu();
    getSpiel()?.reise?.zu();
    getSpiel()?.schliessePanel?.();
    starten(true);
  });
  const tipps = el('einfuehrung-tipps');
  if (tipps) {
    tipps.checked = tippsAn;
    tipps.addEventListener('change', () => { tippsAn = tipps.checked; sichern(TIPPS, tippsAn); });
  }
  return { spielStart, starten, beenden, zustand: () => ({
    aktiv, frage, index, schritt: EINFUEHRUNG[index].id, anzahl: EINFUEHRUNG.length,
    modus: zustand.modus, geschoben, gezoomt,
  }) };
}
