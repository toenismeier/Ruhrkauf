// N05: Synthetische Klangkulisse. Keine Audiodateien, keine Engine-Zufallszahlen.
// Web Audio wird erst nach einer echten Benutzerinteraktion erzeugt.
const SPEICHER = 'hartwig.einstellungen.v1';
export const TON_SCHALTER = [
  { schluessel: 'ton_klaenge', titel: 'Klänge', gruppe: 'Klang', art: 'schalter', standard: true },
  { schluessel: 'ton_klaenge_lautstaerke', titel: 'Lautstärke Klänge', gruppe: 'Klang', art: 'regler', optionen: { min: 0, max: 100, schritt: 5 }, standard: 40 },
  { schluessel: 'ton_stadt', titel: 'Stadtklang', gruppe: 'Klang', art: 'schalter', standard: true },
  { schluessel: 'ton_stadt_lautstaerke', titel: 'Lautstärke Stadt', gruppe: 'Klang', art: 'regler', optionen: { min: 0, max: 100, schritt: 5 }, standard: 25 },
  { schluessel: 'ton_musik', titel: 'Musik (standardmäßig aus)', gruppe: 'Klang', art: 'schalter', standard: false },
  { schluessel: 'ton_musik_lautstaerke', titel: 'Lautstärke Musik', gruppe: 'Klang', art: 'regler', optionen: { min: 0, max: 100, schritt: 5 }, standard: 25 },
  { schluessel: 'ton_haptik', titel: 'Haptische Rückmeldung', gruppe: 'Klang', art: 'schalter', standard: true },
];
const definition = new Map(TON_SCHALTER.map((d) => [d.schluessel, d]));
const begrenze = (v, min, max) => Math.min(max, Math.max(min, v));
let fremdeEinstellungen = null;
let lokaleWerte = null;

function laden() {
  if (lokaleWerte !== null) return lokaleWerte;
  lokaleWerte = {};
  try {
    const roh = globalThis.localStorage?.getItem(SPEICHER);
    const gelesen = roh ? JSON.parse(roh) : null;
    if (gelesen && typeof gelesen === 'object' && !Array.isArray(gelesen)) lokaleWerte = gelesen;
  } catch { /* Safari-Privatmodus / blockierter Speicher: Standards verwenden. */ }
  return lokaleWerte;
}
function normiere(d, wert) {
  if (d.art === 'schalter') return typeof wert === 'boolean' ? wert : d.standard;
  const n = Number(wert);
  if (!Number.isFinite(n)) return d.standard;
  return begrenze(Math.round(n / 5) * 5, d.optionen.min, d.optionen.max);
}
export function tonEinstellung(schluessel) {
  const d = definition.get(schluessel);
  if (!d) return undefined;
  if (fremdeEinstellungen) {
    const wert = fremdeEinstellungen.einstellung(schluessel);
    if (wert !== undefined) return normiere(d, wert);
  }
  return normiere(d, laden()[schluessel] ?? d.standard);
}
export function setzeTonEinstellung(schluessel, wert) {
  const d = definition.get(schluessel);
  if (!d) throw new Error('Unbekannte Ton-Einstellung.');
  const neu = normiere(d, wert);
  if (fremdeEinstellungen?.setzeEinstellung) return fremdeEinstellungen.setzeEinstellung(schluessel, neu);
  if (Object.is(neu, tonEinstellung(schluessel))) return neu;
  laden()[schluessel] = neu;
  try { globalThis.localStorage?.setItem(SPEICHER, JSON.stringify(lokaleWerte)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('einstellung', { detail: { schluessel, wert: neu } }));
  return neu;
}
// N13 kann dieses Modul mit seinen drei öffentlichen API-Funktionen verbinden.
// Bereits lokal gespeicherte Werte liegen im selben geräteweiten Schlüssel.
export function registriereTonEinstellungen({ meldeSchalter, einstellung, setzeEinstellung }) {
  for (const d of TON_SCHALTER) meldeSchalter(d);
  fremdeEinstellungen = { einstellung, setzeEinstellung };
}

// Auf dem iPhone in Safari nicht unterstützt. Späterer nativer Adapter kann
// window.hartwigHaptik(art) bereitstellen; ohne Adapter immer fehlerfrei.
export function haptik(art = 'tippen') {
  if (!tonEinstellung('ton_haptik')) return false;
  try {
    if (typeof window !== 'undefined' && typeof window.hartwigHaptik === 'function') {
      window.hartwigHaptik(art);
      return true;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return !!navigator.vibrate(({ tippen: 8, erfolg: [14, 35, 14], warnung: [22, 40, 22], insolvenz: 60 })[art] ?? 8);
    }
  } catch { /* Nicht unterstützte oder gesperrte Haptik ist kein Fehler. */ }
  return false;
}

const ZEIT = { tippen: .020, panelAuf: .120, panelZu: .120, erfolg: .300, warnung: .310,
  kasse: .025, kassenklingeln: .360, reise: 4.400, insolvenz: .450, freigeschaltet: .650 };
export const TON_DAUER = Object.freeze(ZEIT);
const BPM = 70;
const TAKT = 60 / BPM;

export function tonModul(ctx = {}) {
  let audio = null, master = null, effekt = null, stadt = null, musik = null;
  let rausch = null, stadtNah = null, stadtFern = null, stadtStimmen = null;
  let gestartet = false, verfuegbar = true, freigabeLaeuft = false;
  let uiAktiv = false, letzteKassenzeit = -Infinity, berichtFertig = false;
  let reiseToken = 0, musikNaechste = 0, musikSchritt = 0;
  let timer = null, zugRaf = 0, letztePhase = null;
  const jetzt = () => audio?.currentTime ?? 0;
  const aktiv = () => audio && audio.state === 'running' && typeof document !== 'undefined' && !document.hidden;
  const laut = (typ) => tonEinstellung('ton_' + typ) ? tonEinstellung('ton_' + typ + '_lautstaerke') / 100 : 0;
  const leise = (g, wert, zeit = .07) => {
    if (!g || !audio) return;
    try { g.gain.setTargetAtTime(wert, jetzt(), zeit); } catch {}
  };
  function tonQuelle() {
    if (audio || !verfuegbar) return audio;
    const C = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!C) { verfuegbar = false; return null; }
    try {
      audio = new C();
      master = audio.createGain();
      master.gain.value = .75;
      master.connect(audio.destination);
      effekt = audio.createGain(); effekt.connect(master);
      stadt = audio.createGain(); stadt.gain.value = 0; stadt.connect(master);
      musik = audio.createGain(); musik.gain.value = 0; musik.connect(master);
    } catch {
      audio = null; verfuegbar = false; return null;
    }
    return audio;
  }
  async function freischalten() {
    if (freigabeLaeuft || !tonQuelle()) return false;
    if (audio.state === 'running') { gestartet = true; return true; }
    freigabeLaeuft = true;
    try {
      await audio.resume();
      gestartet = audio.state === 'running';
      return gestartet;
    } catch { return false; }
    finally { freigabeLaeuft = false; }
  }
  // Kurzer Oszillator mit weicher Hüllkurve, keine abrupten Sprünge/Knackser.
  function note(freq, zeit, dauer, pegel, typ = 'sine', ziel = effekt, ende = freq) {
    if (!aktiv() || !ziel || pegel <= 0) return;
    const osz = audio.createOscillator(), g = audio.createGain();
    osz.type = typ; osz.frequency.setValueAtTime(freq, zeit);
    if (ende !== freq) osz.frequency.exponentialRampToValueAtTime(Math.max(20, ende), zeit + dauer);
    g.gain.setValueAtTime(.0001, zeit);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, pegel), zeit + Math.min(.012, dauer / 4));
    g.gain.exponentialRampToValueAtTime(.0001, zeit + dauer);
    osz.connect(g); g.connect(ziel); osz.start(zeit); osz.stop(zeit + dauer + .01);
  }
  function rauschPuffer() {
    if (rausch || !audio) return rausch;
    const laenge = Math.round(audio.sampleRate * 5), b = audio.createBuffer(1, laenge, audio.sampleRate);
    const daten = b.getChannelData(0);
    for (let i = 0; i < laenge; i++) daten[i] = Math.random() * 2 - 1;
    rausch = b; return b;
  }
  function rauschen(zeit, dauer, pegel, filterFrequenz = 800, art = 'lowpass', ziel = effekt) {
    if (!aktiv() || !ziel || pegel <= 0) return;
    const quelle = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
    quelle.buffer = rauschPuffer(); quelle.loop = dauer >= 4.5;
    f.type = art; f.frequency.value = filterFrequenz; f.Q.value = .8;
    g.gain.setValueAtTime(.0001, zeit);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, pegel), zeit + .015);
    g.gain.exponentialRampToValueAtTime(.0001, zeit + dauer);
    quelle.connect(f); f.connect(g); g.connect(ziel);
    quelle.start(zeit); quelle.stop(zeit + dauer + .01);
  }
  function abspielen(art, faktor = 1) {
    if (!gestartet || !aktiv() || !tonEinstellung('ton_klaenge')) return false;
    const p = laut('klaenge') * begrenze(faktor, 0, 1), t = jetzt() + .008;
    if (p === 0) return false;
    switch (art) {
      case 'tippen': note(1100, t, .020, p * .13, 'triangle', effekt, 430); break;
      case 'panelAuf': rauschen(t, .120, p * .10, 1400, 'bandpass'); break;
      case 'panelZu': note(350, t, .120, p * .065, 'sine', effekt, 190); break;
      case 'erfolg':
        note(523.25, t, .190, p * .18);
        note(783.99, t + .105, .195, p * .18); break;
      case 'warnung':
        note(180, t, .110, p * .22, 'triangle');
        note(155, t + .160, .150, p * .23, 'triangle'); break;
      case 'kasse': note(950, t, .025, p * .065, 'triangle', effekt, 600); break;
      case 'kassenklingeln':
        note(1046.5, t, .330, p * .16);
        note(1568, t + .06, .300, p * .13); break;
      case 'insolvenz':
        note(100, t, .450, p * .30, 'triangle', effekt, 41);
        rauschen(t, .230, p * .12, 160); break;
      case 'freigeschaltet':
        [784, 1174.66, 1568].forEach((f, i) => note(f, t + i * .11, .43, p * .10)); break;
      case 'reise': reisen(); break;
      default: return false;
    }
    return true;
  }
  // Die Zuglautstärke folgt über 4,4 Sekunden dem sichtbaren Kamerafahrt-Overlay.
  function reisen() {
    if (!gestartet || !aktiv() || !laut('klaenge')) return false;
    ++reiseToken;
    const token = reiseToken, start = performance.now(), t = jetzt();
    const q = audio.createBufferSource(), filter = audio.createBiquadFilter(), g = audio.createGain();
    q.buffer = rauschPuffer(); q.loop = true;
    filter.type = 'lowpass'; filter.frequency.value = 450;
    g.gain.value = 0;
    q.connect(filter); filter.connect(g); g.connect(effekt);
    q.start(t); q.stop(t + ZEIT.reise);
    for (let i = 0; i < 13; i++) {
      const z = t + .15 + i * .325;
      note(90, z, .044, laut('klaenge') * .09, 'triangle', effekt, 58);
    }
    function lautstaerke() {
      if (token !== reiseToken || !aktiv() || !tonEinstellung('ton_klaenge')) { leise(g, 0, .015); return; }
      const x = (performance.now() - start) / 4400;
      if (x >= 1) { leise(g, 0, .025); return; }
      const overlay = document.querySelector('.reise-flug');
      const position = overlay?.classList.contains('ankunft') ? .18
        : overlay?.classList.contains('bewegt') ? 1 : .35;
      leise(g, .08 * laut('klaenge') * Math.sin(Math.PI * begrenze(x, 0, 1)) * position, .035);
      zugRaf = requestAnimationFrame(lautstaerke);
    }
    cancelAnimationFrame(zugRaf);
    zugRaf = requestAnimationFrame(lautstaerke);
    return true;
  }
  function stadtrauschen() {
    if (!aktiv() || stadtNah) return;
    function schicht(typ, frequenz) {
      const quelle = audio.createBufferSource(), filter = audio.createBiquadFilter(), g = audio.createGain();
      quelle.buffer = rauschPuffer(); quelle.loop = true;
      filter.type = typ; filter.frequency.value = frequenz; filter.Q.value = .6;
      g.gain.value = 0;
      quelle.connect(filter); filter.connect(g); g.connect(stadt);
      quelle.start(); return g;
    }
    // Fernes Verkehrsrauschen und zwei langsam modulierte Sprachformanten.
    stadtFern = schicht('lowpass', 380);
    stadtNah = schicht('bandpass', 920);
    stadtStimmen = schicht('bandpass', 460);
  }
  function musikNote(ton, start, dauer, pegel) {
    note(ton, start, dauer, pegel, 'sine', musik);
    note(ton * 2, start, dauer * .85, pegel * .10, 'triangle', musik);
  }
  function musikNachziehen() {
    if (!aktiv() || !laut('musik')) { musikNaechste = 0; return; }
    const s = ctx.spiel?.(), insolvenz = s?.phase === 'insolvenz' || s?.phase === 'zerschlagen';
    const ebitda = ctx.ebitda13?.() ?? 0;
    const moll = insolvenz || ebitda < 0;
    // A-Moll-/C-Dur-Pentatonik, vier Akkorde, Tempo 70 BPM.
    const akkorde = moll
      ? [[220, 261.63, 329.63], [196, 220, 293.66], [261.63, 329.63, 392], [293.66, 329.63, 392]]
      : [[261.63, 329.63, 392], [196, 293.66, 440], [220, 261.63, 329.63], [293.66, 392, 440]];
    if (!musikNaechste || musikNaechste < jetzt() - TAKT * 2) musikNaechste = jetzt() + .05;
    while (musikNaechste < jetzt() + .4) {
      const takt = Math.floor(musikSchritt / 4), schritt = musikSchritt % 4, akkord = akkorde[takt % 4];
      if (schritt === 0) for (const f of akkord) musikNote(f, musikNaechste, TAKT * 3.8, .025);
      const melodie = moll ? [0, 2, 4, 2, 3, 1, 2, 0] : [0, 2, 4, 3, 2, 1, 3, 4];
      const skala = moll ? [220, 261.63, 293.66, 329.63, 392] : [261.63, 293.66, 329.63, 392, 440];
      musikNote(skala[melodie[musikSchritt % melodie.length]] * 2, musikNaechste + TAKT * .52, TAKT * .4, .014);
      musikSchritt++; musikNaechste += TAKT;
    }
  }
  function aktualisieren() {
    const phase = ctx.spiel?.()?.phase ?? null;
    if (letztePhase !== null && phase !== letztePhase && (phase === 'insolvenz' || phase === 'zerschlagen')) {
      abspielen('insolvenz'); haptik('insolvenz');
    }
    letztePhase = phase;
    if (!audio) return;
    const sichtbar = aktiv();
    const zv = sichtbar ? laut('stadt') : 0, mv = sichtbar ? laut('musik') : 0;
    leise(stadt, zv, .09); leise(musik, mv, .13);
    if (sichtbar && zv > 0) {
      stadtrauschen();
      const halb = ctx.zoom?.() ?? 110;
      const nah = begrenze((240 - halb) / 218, 0, 1);
      const bewegung = .85 + .15 * Math.sin(performance.now() / 1800);
      leise(stadtNah, .038 * nah * bewegung, .11);
      leise(stadtStimmen, .020 * nah * (.7 + .3 * Math.sin(performance.now() / 490)), .11);
      leise(stadtFern, .022 * (1 - nah) + .006, .11);
    } else { leise(stadtNah, 0); leise(stadtStimmen, 0); leise(stadtFern, 0); }
    if (mv > 0) musikNachziehen();
    else musikNaechste = 0;
  }
  function kassenZaehlung() {
    const overlay = document.getElementById('wochen-overlay');
    const element = overlay?.querySelector('#wb-umsatz');
    if (!element || overlay.hidden) { berichtFertig = false; letzteKassenzeit = -Infinity; return; }
    const ziel = Math.abs(Number(element.dataset.wert));
    const zahl = Math.abs(Number((element.textContent || '0').replace(/[^0-9-]/g, '')));
    if (!(ziel > 0) || !Number.isFinite(zahl)) return;
    const fortschritt = begrenze(zahl / ziel, 0, 1);
    const t = performance.now();
    if (fortschritt >= .9999) {
      if (!berichtFertig) { berichtFertig = true; abspielen('kassenklingeln'); }
    } else if (t - letzteKassenzeit > 95 + fortschritt * 155) {
      letzteKassenzeit = t; abspielen('kasse', .30);
    }
  }
  function eingabe(e) {
    const el = e.target?.closest?.('button,[role="button"]');
    if (!el || el.disabled) return;
    // Die Benutzergeste entsperrt Audio; vor Freischaltung keinen Kontext anlegen.
    freischalten().then((ok) => { if (ok) abspielen('tippen'); }).catch(() => {});
    haptik('tippen');
  }
  function oeffne() {
    const feld = (d) => {
      const v = tonEinstellung(d.schluessel), id = 'ton-' + d.schluessel;
      return '<label class="zeile" for="' + id + '" style="display:flex;align-items:center;gap:12px;min-height:48px">'
        + '<span style="flex:1">' + d.titel + (d.art === 'regler' ? ': <output id="' + id + '-wert">' + v + ' %</output>' : '') + '</span>'
        + (d.art === 'schalter'
          ? '<input id="' + id + '" data-ton="' + d.schluessel + '" type="checkbox" ' + (v ? 'checked ' : '') + 'aria-label="' + d.titel + '">'
          : '<input id="' + id + '" data-ton="' + d.schluessel + '" type="range" min="0" max="100" step="5" value="' + v + '" aria-label="' + d.titel + '">')
        + '</label>';
    };
    ctx.panel?.('Klang & Haptik', 'Synthetische Klänge · geräteweit', '<div class="karte">' +
      TON_SCHALTER.map(feld).join('') + '</div><div class="karte"><p class="leise">Musik ist standardmäßig ausgeschaltet. '
      + 'Der iPhone-Stummschalter schaltet Web Audio nicht zuverlässig stumm. Zum vollständigen Stummschalten '
      + 'die Regler hier ausschalten.</p><p class="leise">Haptik steht nicht auf allen Geräten zur Verfügung.</p>'
      + '<button class="breit" data-ton-probe="erfolg">Klang testen</button></div>', 'gross');
    uiAktiv = true;
  }
  function aendern(e) {
    if (!uiAktiv || !e.target.matches?.('[data-ton]')) return;
    const schluessel = e.target.dataset.ton;
    const wert = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
    setzeTonEinstellung(schluessel, wert);
    const output = document.getElementById(e.target.id + '-wert');
    if (output) output.textContent = wert + ' %';
    aktualisieren();
  }
  function zustand() {
    return { audio: audio?.state ?? 'nicht gestartet', gestartet, verfuegbar,
      klang: tonEinstellung('ton_klaenge'), stadt: tonEinstellung('ton_stadt'), musik: tonEinstellung('ton_musik') };
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', eingabe, { capture: true, passive: true });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') freischalten().catch(() => {});
    }, { capture: true });
    document.getElementById('pinhalt')?.addEventListener('change', aendern);
    document.getElementById('pinhalt')?.addEventListener('input', aendern);
    document.getElementById('pinhalt')?.addEventListener('click', (e) => {
      if (uiAktiv && e.target.closest?.('[data-ton-probe]')) abspielen(e.target.closest('[data-ton-probe]').dataset.tonProbe);
    });
    let warOffen = false, menueOffen = false, letzteReise = null, letzteBericht = null;
    const beobachter = new MutationObserver(() => {
      const panelOffen = document.getElementById('panel')?.classList.contains('offen') ?? false;
      if (panelOffen !== warOffen) { abspielen(panelOffen ? 'panelAuf' : 'panelZu'); warOffen = panelOffen; }
      const menue = document.getElementById('menue')?.classList.contains('offen') ?? false;
      if (menue !== menueOffen) { abspielen(menue ? 'panelAuf' : 'panelZu'); menueOffen = menue; }
      const reise = document.querySelector('#reise-overlay .reise-flug');
      if (reise && reise !== letzteReise) { letzteReise = reise; reisen(); }
      if (!reise) letzteReise = null;
      const bericht = document.querySelector('#wochen-overlay #wb-umsatz');
      if (bericht !== letzteBericht) { letzteBericht = bericht; berichtFertig = false; letzteKassenzeit = -Infinity; }
      if (bericht) kassenZaehlung();
    });
    beobachter.observe(document.body, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['class', 'hidden'] });
    window.addEventListener('hartwig:erfolg-freigeschaltet', () => { abspielen('freigeschaltet'); haptik('erfolg'); });
    window.addEventListener('hartwig:erfolg', () => { abspielen('erfolg'); haptik('erfolg'); });
    window.addEventListener('hartwig:warnung', () => { abspielen('warnung'); haptik('warnung'); });
    document.addEventListener('visibilitychange', aktualisieren);
    window.addEventListener('pagehide', () => { if (audio) audio.suspend().catch(() => {}); });
    window.addEventListener('pageshow', () => { if (audio && gestartet) audio.resume().then(aktualisieren).catch(() => {}); });
    window.addEventListener('einstellung', (e) => { if (e.detail?.schluessel?.startsWith('ton_')) aktualisieren(); });
    timer = window.setInterval(aktualisieren, 250);
  }
  return { oeffne, zu: () => { uiAktiv = false; }, aktiv: () => uiAktiv, pruefe: zustand,
    abspielen, freischalten, haptik, aktualisieren, get audio() { return audio; },
    zerstoren: () => { if (timer) clearInterval(timer); cancelAnimationFrame(zugRaf); audio?.close?.().catch(() => {}); } };
}
