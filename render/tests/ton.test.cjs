// N05: Tests ohne Browser, Lautsprecher, Audiogerät und fremde Audiodateien.
// Aufruf: node --test render/tests/ton.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const quelle = readFileSync(path.join(__dirname, '../src/ui/ton.js'), 'utf8')
  .replace(/^\s*export\s+(?=(const|function|class|async))/gm, '');
const auswahl = '\n;({ tonModul, tonEinstellung, setzeTonEinstellung, haptik, TON_SCHALTER, TON_DAUER })';

function testUmgebung(audioVorhanden) {
  let kontexte = 0, oszillatoren = 0, schwingungen = 0, audioStart = 0;
  const wert = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ gain: wert(), frequency: wert(), Q: wert(), connect() {}, start() { audioStart++; }, stop() {} });
  class AudioContext {
    constructor() { kontexte++; this.sampleRate = 1000; this.currentTime = 1; this.state = 'suspended'; this.destination = {}; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createGain() { return node(); }
    createOscillator() { oszillatoren++; return { ...node(), type: 'sine', frequency: wert() }; }
    createBufferSource() { schwingungen++; return { ...node(), loop: false }; }
    createBiquadFilter() { return { ...node(), type: 'lowpass' }; }
    createBuffer(_kanal, länge) { return { getChannelData: () => new Float32Array(länge) }; }
  }
  const events = new Map(), speicher = {};
  const document = {
    hidden: false, body: {},
    addEventListener: (name, callback) => { events.set(name, callback); },
    getElementById: () => null, querySelector: () => null,
  };
  const window = {
    addEventListener: (name, callback) => events.set(name, callback),
    dispatchEvent: () => true, setInterval: () => 0,
  };
  const sandbox = {
    document, window, navigator: {}, performance: { now: () => 1000 },
    localStorage: { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => { speicher[k] = v; } },
    MutationObserver: class { observe() {} },
    CustomEvent: class { constructor(name, detail) { this.type = name; this.detail = detail; } },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, Math,
  };
  if (audioVorhanden) sandbox.AudioContext = AudioContext;
  sandbox.globalThis = sandbox;
  const m = vm.runInNewContext(quelle + auswahl, sandbox);
  return { ...m, sandbox, ereignisse: events,
    statistik: () => ({ kontexte, oszillatoren, schwingungen, audioStart }), speicher };
}

test('Standard: Klänge und Stadt an, Musik aus, kein Audio vor Berührung', () => {
  const u = testUmgebung(true);
  const ton = u.tonModul({});
  assert.equal(u.tonEinstellung('ton_klaenge'), true);
  assert.equal(u.tonEinstellung('ton_stadt'), true);
  assert.equal(u.tonEinstellung('ton_musik'), false);
  assert.equal(ton.pruefe().audio, 'nicht gestartet');
  assert.equal(u.statistik().kontexte, 0);
  assert.equal(ton.abspielen('erfolg'), false);
});

test('Headless: fehlendes AudioContext und navigator.vibrate werfen keine Fehler', async () => {
  const u = testUmgebung(false);
  const ton = u.tonModul({});
  assert.equal(await ton.freischalten(), false);
  assert.equal(ton.abspielen('tippen'), false);
  assert.equal(ton.pruefe().verfuegbar, false);
  assert.equal(u.haptik('warnung'), false);
});

test('Web Audio: zehn Klänge entstehen aus Oszillatoren und Rauschen', async () => {
  const u = testUmgebung(true);
  const ton = u.tonModul({ zoom: () => 42, spiel: () => ({ phase: 'regulaer' }), ebitda13: () => 1000000 });
  assert.equal(await ton.freischalten(), true);
  const arten = ['tippen', 'panelAuf', 'panelZu', 'erfolg', 'warnung',
    'kasse', 'kassenklingeln', 'reise', 'insolvenz', 'freigeschaltet'];
  for (const art of arten) assert.equal(ton.abspielen(art), true, art);
  assert.ok(u.statistik().oszillatoren > 10);
  assert.ok(u.statistik().schwingungen >= 2);
  assert.equal(u.statistik().kontexte, 1);
  ton.aktualisieren();
});

test('Lautstärke null und Schalter aus verhindern Wiedergabe', async () => {
  const u = testUmgebung(true);
  const ton = u.tonModul({});
  await ton.freischalten();
  u.setzeTonEinstellung('ton_klaenge_lautstaerke', 0);
  assert.equal(ton.abspielen('erfolg'), false);
  u.setzeTonEinstellung('ton_klaenge_lautstaerke', 100);
  assert.equal(ton.abspielen('erfolg'), true);
  u.setzeTonEinstellung('ton_klaenge', false);
  assert.equal(ton.abspielen('erfolg'), false);
  assert.equal(u.tonEinstellung('ton_klaenge'), false);
  assert.ok(u.speicher['hartwig.einstellungen.v1']);
});

test('N13-Registrierung verwendet Geräte-Schlüssel und behält gespeicherte Werte', () => {
  const u = testUmgebung(false);
  const definitionen = [];
  u.tonModul({});
  u.setzeTonEinstellung('ton_stadt_lautstaerke', 70);
  assert.equal(u.TON_SCHALTER.length, 7);
  assert.equal(u.tonEinstellung('ton_stadt_lautstaerke'), 70);
  assert.equal(u.TON_DAUER.reise, 4.4);
  assert.equal(u.TON_DAUER.tippen, 0.02);
});
