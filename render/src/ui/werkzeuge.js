// N14: Verstecktes Testpanel. Keine Telemetrie, kein Upload, keine Eingriffe ohne Freischaltung.
import { geld, esc } from './format.js';

// Bis die N13-Einstellungen auf main liegen, ist dies der lokale Feature-Schalter.
const WERKZEUGE_AKTIV = true;
const BERICHT_FORMAT = 'RUHRKAUF-TEST-1:gzip:';
const MAX_FEHLER = 50;

function base64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 16384)
    s += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(s);
}
function bytesAusBase64(s) {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
async function gzip(text) {
  if (typeof CompressionStream !== 'function') throw new Error('Dieser Browser unterstützt CompressionStream nicht.');
  const rohr = new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(new CompressionStream('gzip'));
  return base64(new Uint8Array(await new Response(rohr).arrayBuffer()));
}
async function ungzip(base64Text) {
  if (typeof DecompressionStream !== 'function') throw new Error('Dieser Browser unterstützt DecompressionStream nicht.');
  const daten = bytesAusBase64(base64Text);
  const rohr = new Blob([daten]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(rohr).text();
}
async function kopiereText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch (_) { /* file:// unter iOS */ }
  }
  const feld = document.createElement('textarea');
  feld.value = text; feld.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(feld); feld.select();
  const ok = document.execCommand('copy');
  feld.remove();
  if (!ok) throw new Error('Kopieren nicht erlaubt. Bitte den Text im Berichtsfeld manuell kopieren.');
}

export function werkzeugeModul(ctx) {
  const datum = document.querySelector('.datum');
  const menu = document.getElementById('werkzeuge');
  const inhalt = document.getElementById('pinhalt');
  const fehler = [];
  const frames = [];
  const einmal = new URLSearchParams(location.search).get('werkzeuge') === '1';
  let freigeschaltet = false, aktiv = false, beschaeftigt = false;
  let messTimer = null, raf = null;
  let berichteingabe = '';
  let letzterBericht = '';
  const klicks = [];
  const num = (x) => Number.isFinite(x) ? Math.round(x * 10) / 10 : null;

  function eintrag(art, text) {
    fehler.push({ zeit: new Date().toISOString(), art, text: String(text).slice(0, 3000) });
    if (fehler.length > MAX_FEHLER) fehler.shift();
    if (freigeschaltet) datum.classList.add('testfehler');
  }

  // Auch Fehler vor dem Entsperren auffangen; kein Netzwerk oder Tracking.
  window.addEventListener('error', (e) => eintrag('error', e.message || e.error?.stack || 'Unbekannter Fehler'));
  window.addEventListener('unhandledrejection', (e) => eintrag('unhandledrejection', e.reason?.stack || e.reason || 'Unbehandeltes Promise'));
  const originalConsoleError = console.error.bind(console);
  console.error = (...args) => {
    eintrag('console.error', args.map((x) => x?.stack || String(x)).join(' '));
    originalConsoleError(...args);
  };

  function entsperren() {
    if (!WERKZEUGE_AKTIV) return false;
    freigeschaltet = true;
    menu.hidden = false;
    menu.style.display = '';
    datum.classList.toggle('testfehler', fehler.length > 0);
    return true;
  }
  datum.addEventListener('click', () => {
    if (!WERKZEUGE_AKTIV) return;
    const jetzt = performance.now();
    klicks.push(jetzt);
    while (klicks.length && jetzt - klicks[0] > 1800) klicks.shift();
    if (klicks.length >= 5) {
      klicks.length = 0;
      if (entsperren() && ctx.s()) oeffne();
    }
  });
  menu.addEventListener('click', () => oeffne());

  function fenster() {
    const seit = performance.now() - 2000;
    while (frames.length && frames[0] < seit) frames.shift();
    const abstaende = frames.slice(1).map((x, i) => x - frames[i]).filter((x) => x > 0);
    return {
      fpsMittel: abstaende.length ? num(1000 * abstaende.length / abstaende.reduce((a, b) => a + b, 0)) : null,
      fpsSchlechteste: abstaende.length ? num(1000 / Math.max(...abstaende)) : null,
    };
  }
  function animation(t) {
    if (!aktiv) return;
    // Bei geöffnetem Panel aktiv einen echten WebGL-Frame zeichnen, nicht nur RAF-Aufrufe zählen.
    ctx.renderFrame();
    frames.push(t);
    fenster();
    raf = requestAnimationFrame(animation);
  }
  function metriken() {
    const m = fenster();
    const teile = ctx.teileStand()?.teile ?? 0;
    const ende = ctx.messung.wocheMs.at(-1);
    const speicher = performance.memory?.usedJSHeapSize;
    return { ...m, teile, engineMs: ende?.engineMs ?? null, speicherMiB: speicher === undefined ? null : num(speicher / 1048576) };
  }
  function metrikZeigen() {
    if (!aktiv) return;
    const m = metriken();
    for (const [id, wert] of Object.entries(m)) {
      const el = document.getElementById('test-' + id);
      if (el) el.textContent = wert === null ? 'Nicht verfügbar' : String(wert);
    }
  }
  function zeigeMetrik(name, id, einheit) {
    return '<div class="zeile"><span>' + name + '</span><b><span id="test-' + id + '">–</span>' + (einheit || '') + '</b></div>';
  }
  function zeigen(scroll = false) {
    if (!freigeschaltet || !ctx.s()) return;
    const sc = scroll ? inhalt.scrollTop : 0, s = ctx.s();
    const stakeholder = Object.entries(s.stakeholder).map(([feld, wert]) =>
      '<label class="test-eingabe">' + esc(feld) + ' <input type="number" min="0" max="100" step="1" data-test-stake="' + esc(feld) + '" value="' + Math.round(wert) + '"></label>').join('');
    const angebot = ctx.E.TEST_EREIGNISSE.filter((e) => e.id.startsWith('angebot:'));
    const ereignis = ctx.E.TEST_EREIGNISSE.filter((e) => !e.id.startsWith('angebot:'));
    const knoepfe = (list) => list.map((e) =>
      '<button type="button" data-test-ereignis="' + esc(e.id) + '">' + esc(e.name) + '</button>').join('');
    const html = '<div class="testwerkzeuge">' +
      '<div class="karte"><h3>Teststeuerung</h3><p class="leise">Nur für Tests. Änderungen markieren den Spielstand dauerhaft als Testspiel.</p>' +
      '<label><input id="test-bot" type="checkbox"' + (document.getElementById('test-bot')?.checked ? ' checked' : '') + '> Bot C für den Zeitsprung einsetzen</label>' +
      '<div class="test-tasten">' + [1, 4, 13, 52].map((n) => '<button type="button" data-test-wochen="' + n + '">' + n + ' Woche' + (n > 1 ? 'n' : '') + '</button>').join('') + '</div>' +
      '<progress id="test-fortschritt" max="1" value="0" hidden></progress><div id="test-status" role="status"></div>' +
      '<label class="test-eingabe">Cash (€) <input id="test-cash" type="number" step="1" value="' + s.cash + '"></label>' +
      '<button type="button" data-test-a="cash">Cash setzen</button> <button type="button" class="rot" data-test-a="insolvenz">Insolvenz eröffnen</button>' +
      '<h3>Stakeholder</h3><div class="test-felder">' + stakeholder + '</div>' +
      '<label class="test-eingabe">Schwierigkeit <select id="test-schwierigkeit">' + ['leicht', 'mittel', 'schwer'].map((v) => '<option value="' + v + '"' + ((s.schwierigkeit ?? 'mittel') === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label>' +
      '<button type="button" data-test-a="schwierigkeit">Schwierigkeit setzen</button></div>' +
      '<div class="karte"><h3>Angebote auslösen</h3><div class="test-tasten">' + knoepfe(angebot) + '</div><h3>Ereignisse auslösen</h3><div class="test-tasten">' + knoepfe(ereignis) + '</div></div>' +
      '<div class="karte"><h3>Live-Messung (letzte 2 Sekunden)</h3>' +
      zeigeMetrik('Bildrate Mittel', 'fpsMittel', ' FPS') +
      zeigeMetrik('Schlechteste Bildrate', 'fpsSchlechteste', ' FPS') +
      zeigeMetrik('Szenenteile', 'teile', '') +
      zeigeMetrik('Engine letzte Woche', 'engineMs', ' ms') +
      zeigeMetrik('JS-Speicher', 'speicherMiB', ' MiB') + '</div>' +
      '<div class="karte"><h3>Fehlerbericht</h3><p class="leise">Enthält den vollständigen Spielstand und Geräteinformationen. Nur an vertrauenswürdige Empfänger weitergeben.</p>' +
      '<button type="button" data-test-a="kopieren">Bericht kopieren</button> <button type="button" data-test-a="laden">Bericht laden</button>' +
      '<textarea id="test-bericht" rows="4" placeholder="Komprimierten Fehlerbericht hier einfügen" spellcheck="false"></textarea>' +
      '<small>' + fehler.length + ' Konsolenfehler gespeichert, 20 im Bericht</small></div></div>';
    ctx.panel('Testwerkzeuge', 'Seed ' + s.seed + ' · Woche ' + s.woche + ' · Version ' + s.version, html, 'gross');
    aktiv = true;
    inhalt.scrollTop = sc;
    document.getElementById('test-bericht').value = berichteingabe;
    metrikZeigen();
    if (!messTimer) messTimer = setInterval(metrikZeigen, 400);
    if (!raf) raf = requestAnimationFrame(animation);
  }
  function oeffne() {
    if (!freigeschaltet || !ctx.s()) return false;
    zeigen();
    return true;
  }
  function zu() {
    aktiv = false;
    clearInterval(messTimer); messTimer = null;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null; frames.length = 0;
  }
  const sende = (a) => {
    const r = ctx.E.fuehreAus(ctx.s(), a);
    ctx.meldung(r.text, r.ok);
    if (r.ok) ctx.nachAktion();
    if (aktiv) zeigen(true);
    return r;
  };
  async function springen(n, bot) {
    if (!aktiv || beschaeftigt || ![1, 4, 13, 52].includes(n)) return { fertig: 0 };
    beschaeftigt = true;
    const bar = document.getElementById('test-fortschritt');
    const status = document.getElementById('test-status');
    bar.hidden = false; bar.max = n; bar.value = 0;
    let fertig = 0;
    try {
      for (let i = 0; i < n; i++) {
        if (ctx.s().phase === 'zerschlagen') break;
        const m = ctx.testWoche(bot);
        if (!m) break;
        fertig++;
        bar.value = fertig;
        status.textContent = fertig + ' / ' + n + ' Wochen';
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      status.textContent = 'Zeitsprung: ' + fertig + ' von ' + n + ' Wochen abgeschlossen.';
      if (fertig !== n) ctx.meldung('Zeitsprung beendet: Spielende erreicht.', false);
      return { fertig };
    } catch (e) {
      ctx.meldung('Zeitsprung fehlgeschlagen: ' + e.message, false);
      throw e;
    } finally {
      beschaeftigt = false;
      if (aktiv) zeigen();
    }
  }
  async function erstelleBericht() {
    if (!freigeschaltet || !ctx.s()) throw new Error('Testwerkzeuge nicht freigeschaltet.');
    const s = ctx.s();
    const daten = {
      format: 1, erzeugt: new Date().toISOString(), seed: s.seed, woche: s.woche,
      version: s.version, userAgent: navigator.userAgent, fehler: fehler.slice(-20),
      stadt: ctx.stadt(), spiel: structuredClone(s), ui: structuredClone(ctx.ui()),
    };
    letzterBericht = BERICHT_FORMAT + await gzip(JSON.stringify(daten));
    return letzterBericht;
  }
  async function berichtKopieren() {
    const bericht = await erstelleBericht();
    // Auch bei verweigerter Zwischenablage bleibt der vollständige Text auswählbar.
    berichteingabe = bericht;
    const feld = document.getElementById('test-bericht');
    if (feld) feld.value = bericht;
    await kopiereText(bericht);
    ctx.meldung('Fehlerbericht kopiert (' + bericht.length + ' Zeichen).');
    return bericht;
  }
  async function berichtLaden(text) {
    if (!freigeschaltet) throw new Error('Testwerkzeuge nicht freigeschaltet.');
    const input = String(text || '').trim();
    if (!input.startsWith(BERICHT_FORMAT)) throw new Error('Unbekanntes Berichtsformat.');
    const datensatz = JSON.parse(await ungzip(input.slice(BERICHT_FORMAT.length)));
    if (datensatz.format !== 1 || datensatz.version !== 1 || datensatz.spiel?.version !== 2 ||
        !Number.isInteger(datensatz.spiel.woche) || !Number.isInteger(datensatz.spiel.seed) ||
        !Array.isArray(datensatz.spiel.haeuser) || !Array.isArray(datensatz.spiel.historie) ||
        !datensatz.spiel.hq || !datensatz.spiel.einkauf || !datensatz.spiel.vorstand ||
        !datensatz.spiel.produkte || !datensatz.spiel.marketing?.stand)
      throw new Error('Bericht enthält keinen gültigen Spielstand.');
    await ctx.standLaden(datensatz);
    ctx.meldung('Testbericht geladen: Seed ' + datensatz.spiel.seed + ', Woche ' + datensatz.spiel.woche + '.');
    if (aktiv) zeigen();
    return { seed: ctx.s().seed, woche: ctx.s().woche, cash: ctx.s().cash };
  }

  inhalt.addEventListener('input', (e) => {
    if (aktiv && e.target.id === 'test-bericht') berichteingabe = e.target.value;
  });
  inhalt.addEventListener('change', (e) => {
    if (!aktiv) return;
    const feld = e.target.dataset.testStake;
    if (feld && e.target.validity.valid && e.target.value !== '')
      sende({ typ: 'testStakeholder', feld, wert: Number(e.target.value) });
  });
  inhalt.addEventListener('click', async (e) => {
    if (!aktiv || beschaeftigt) return;
    const button = e.target.closest('[data-test-a],[data-test-wochen],[data-test-ereignis]');
    if (!button) return;
    const a = button.dataset.testA;
    try {
      if (button.dataset.testWochen) return springen(Number(button.dataset.testWochen), document.getElementById('test-bot').checked);
      if (button.dataset.testEreignis) return sende({ typ: 'testEreignis', ereignis: button.dataset.testEreignis });
      if (a === 'cash') return sende({ typ: 'testCash', betrag: Number(document.getElementById('test-cash').value) });
      if (a === 'insolvenz') return sende({ typ: 'testInsolvenz' });
      if (a === 'schwierigkeit') return sende({ typ: 'testSchwierigkeit', stufe: document.getElementById('test-schwierigkeit').value });
      if (a === 'kopieren') return await berichtKopieren();
      if (a === 'laden') return await berichtLaden(document.getElementById('test-bericht').value);
    } catch (err) {
      eintrag('werkzeuge', err.stack || err.message);
      ctx.meldung('Testwerkzeuge: ' + err.message, false);
    }
  });
  return {
    oeffne, zu, aktiv: () => aktiv, neuZeichnen: () => { if (aktiv && !beschaeftigt) zeigen(true); },
    nachStart: () => { if (einmal && entsperren()) oeffne(); },
    freischalten: entsperren, get freigeschaltet() { return freigeschaltet; },
    springen, erstelleBericht, berichtKopieren, berichtLaden, metriken, get fehler() { return [...fehler]; },
  };
}
