// N07: reproduzierbare Datenmodell-Abnahme, ausführen: cd render && node tests/leben-test.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const bundle = esbuild.buildSync({
  entryPoints: [path.join(__dirname, '../src/kit/leben.js')],
  bundle: true, platform: 'node', format: 'cjs', write: false,
}).outputFiles[0].text;
const modul = { exports: {} };
new Function('module', 'exports', 'require', bundle)(modul, modul.exports, require);
const { verkehrsnetz, hausGewicht } = modul.exports;

const s1 = { id: 's1', achse: 'z', mitte: 0, von: -60, bis: -10, breite: 14, gehweg: 2.75, typ: 'neben', parken: 0 };
const s2 = { id: 's2', achse: 'x', mitte: 0, von: 10, bis: 60, breite: 20, gehweg: 3.5, typ: 'haupt', parken: 0 };
const s3 = { id: 's3', achse: 'x', mitte: 70, von: 10, bis: 60, breite: 12, gehweg: 2, typ: 'fussgaenger', parken: 0 };
const tram = { id: 's4', achse: 'z', mitte: 75, von: 10, bis: 100, breite: 46, gehweg: 5, mittel: 16,
  typ: 'haupt', art: 'magistrale', tram: true, parken: 0 };
const k = { x: 0, z: 0, arme: { '-z': s1, '+x': s2 } };
const plan = { strassen: [s1, s2, s3, tram], kreuzungen: [k] };
const netz = verkehrsnetz(plan);
assert(netz.spuren.every((x) => x.s.typ !== 'fussgaenger'), 'Keine Autos in Fußgängerzonen');
assert(netz.fusswege.some((x) => x.s === s3), 'Fußgängerzonen müssen Wege besitzen');
assert(netz.trams.some((x) => x.s === tram), 'Straßenbahn auf Magistrale mit Gleis');
assert(netz.haupt.every((x) => x.s.typ === 'haupt'), 'Busse nur auf Hauptstraßen');
const zufahrt = netz.spuren.find((x) => x.s === s1 && x.dir === 1);
assert(zufahrt?.naechste.some((x) => x.s === s2 && x.dir === 1), 'Abbiegemöglichkeit an Kreuzung fehlt');
assert(!zufahrt.naechste.some((x) => x.s === s2 && x.dir === -1), 'Nicht entgegen Fahrtrichtung abbiegen');

const umsatzstark = { status: 'offen', lage: '1a', kpi: { umsatz: 150000 }, transferBonus: 0.1 };
const schwach = { status: 'offen', lage: 'rand', kpi: { umsatz: 18000 }, transferBonus: 0 };
assert(hausGewicht(umsatzstark, 60000) > hausGewicht(schwach, 60000));
assert.equal(hausGewicht({ ...umsatzstark, status: 'geschlossen' }, 60000), 0);
assert(Number.isFinite(hausGewicht({ status: 'offen' }, 0)), 'Ohne KPI muss Fallback sicher sein');
assert.deepEqual(verkehrsnetz({ strassen: [], kreuzungen: [] }).spuren, []);
console.log('N07: Spurrichtungen, Abbiegungen, Gehwege, Straßenbahn und Umsatzgewichtung: OK');
