// Geräteweite Einstellungen lassen sich ohne Browser und ohne Engine prüfen.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const esbuild = require('esbuild');
const quelltext = esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, '../src/ui/einstellungen.js')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
}).outputFiles[0].text;

function umgebung(anfang = {}) {
  let roh = JSON.stringify(anfang);
  const events = [];
  const speicher = {
    getItem: (k) => k === 'hartwig.einstellungen.v1' ? roh : null,
    setItem: (k, v) => { assert.equal(k, 'hartwig.einstellungen.v1'); roh = v; },
  };
  const exports = {};
  const context = {
    module: { exports }, exports, localStorage: speicher,
    CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts?.detail; } },
    window: { dispatchEvent: (e) => events.push(e), matchMedia: () => ({ matches: false }) },
    console,
  };
  vm.runInNewContext(quelltext, context);
  return { api: context.module.exports, events, speicher, get roh() { return JSON.parse(roh); } };
}
test('Standardwerte und Registrierung weiterer Nice-to-haves', () => {
  const { api } = umgebung();
  assert.equal(api.einstellung('schrift'), 'normal');
  assert.equal(api.einstellung('warnung'), true);
  assert.equal(api.einstellung('autospeichern'), true);
  api.meldeSchalter({ schluessel: 'n99_demo', titel: 'Demo', gruppe: 'Zusatzmodule', art: 'schalter', standard: false });
  assert.equal(api.einstellung('n99_demo'), false);
  api.setzeEinstellung('n99_demo', true);
  assert.equal(api.einstellung('n99_demo'), true);
});
test('Speicherung, gültige Optionen und CustomEvent', () => {
  const x = umgebung();
  x.api.setzeEinstellung('schrift', 'gross');
  x.api.setzeEinstellung('zahlen', 'voll');
  assert.equal(x.roh.schrift, 'gross');
  assert.equal(x.roh.zahlen, 'voll');
  assert.equal(x.events.at(-1).type, 'einstellung');
  assert.equal(x.events.at(-1).detail.schluessel, 'zahlen');
  assert.equal(x.events.at(-1).detail.wert, 'voll');
  x.api.setzeEinstellung('schrift', 'unbekannt');
  assert.equal(x.api.einstellung('schrift'), 'normal');
  const neu = umgebung(x.roh);
  assert.equal(neu.api.einstellung('zahlen'), 'voll');
});
test('Beschädigte oder gesperrte localStorage-Zugriffe fallen auf Standard zurück', () => {
  const x = umgebung();
  x.speicher.getItem = () => { throw new Error('gesperrt'); };
  assert.equal(x.api.einstellung('schrift'), 'normal');
  x.speicher.setItem = () => { throw new Error('quota'); };
  assert.equal(x.api.setzeEinstellung('warnung', false), false);
  assert.equal(x.api.einstellung('warnung'), false);
});
test('Auswahl und Reglerwerte werden validiert', () => {
  const x = umgebung({ schrift: 'gefälscht', warnung: 'nein' });
  assert.equal(x.api.einstellung('schrift'), 'normal');
  assert.equal(x.api.einstellung('warnung'), true);
  x.api.meldeSchalter({ schluessel: 'tempo', titel: 'Tempo', gruppe: 'Zusatzmodule', art: 'regler', standard: 5, optionen: { min: 0, max: 10, schritt: 2 } });
  x.api.setzeEinstellung('tempo', 11);
  assert.equal(x.api.einstellung('tempo'), 10);
});
