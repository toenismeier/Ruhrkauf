import assert from 'node:assert/strict';
import { rng } from '../src/kit/basis.js';
import { pruefeQualitaetsdaten, tramArme, dachPasst } from '../src/kit/q02-qualitaet.js';
import { dachInstallationen } from '../src/kit/dach-qualitaet.js';

function test(name, fn) { try { fn(); console.log('OK ' + name); } catch (e) { console.error('FEHLER ' + name); throw e; } }
const spur = { achse: 'x', mitte: 0, von: 0, bis: 100, breite: 3 };
const dach = { x0: 0, z0: 0, x1: 35, z1: 27, y: 14, steil: false };
const gut = { gleise: [spur], draehte: [{ ...spur }], gleisenden: [{ abschluss: 'prellbock' }],
  fahrzeuge: [{ art: 'zug', x: 40, z: 0, laenge: 26 }],
  fahrbahnen: [{ ...spur, breite: 8 }],
  daecher: [{ x: 8, z: 8, w: 3, d: 3, h: 2, unten: 14, dach }],
  gruppen: Array.from({ length: 10 }, (_, i) => ({ x: 5 + i * 4, z: 5, muster: 'typ-' + i })) };
test('Geometrieprüfung akzeptiert gültige Gleise, Dächer und Gruppen', () => {
  assert.ok(Object.values(pruefeQualitaetsdaten(gut).werte).every((n) => n === 0));
});
test('Alle fünf Grenzwerte melden echte Fehler', () => {
  const schlecht = { ...gut, gleisenden: [{ abschluss: null }],
    draehte: [{ ...spur, mitte: 9 }], fahrzeuge: [{ art: 'zug', x: 150, z: 0, laenge: 26 }],
    daecher: [{ x: 2, z: 2, w: 7, d: 7, h: 2, unten: 19, dach }],
    gruppen: Array.from({ length: 12 }, (_, i) => ({ x: i, z: 2, muster: 'gleich' })) };
  assert.deepEqual(Object.values(pruefeQualitaetsdaten(schlecht).werte), [1, 1, 1, 1, 1]);
});
test('Kreuzung zeichnet nur vorhandene Gleisarme', () => {
  const einseitig = tramArme({ x: 0, z: 0, bx: 16, bz: 20, arme: { '-z': { tram: true }, '+z': null, '-x': null, '+x': null } });
  assert.equal(einseitig.length, 1);
  assert.deepEqual(einseitig[0].ende, [0]);
  assert.equal(einseitig[0].von, -10);
  assert.equal(einseitig[0].bis, 0);
  const durchgehend = tramArme({ x: 0, z: 0, bx: 16, bz: 20, arme: { '-z': { tram: true }, '+z': { tram: true } } });
  assert.deepEqual(durchgehend[0].ende, []);
});
test('Dachaufbauten bleiben vollständig auf der Fläche und sind deterministisch', () => {
  const bauen = () => {
    const protokoll = [];
    const S = { box() {}, quader() {}, add() {} };
    const e = dachInstallationen(S, dach, rng(1481), { max: 5, protokoll });
    assert.deepEqual(e, protokoll);
    assert.ok(new Set(e.map((a) => a.art)).size <= 3);
    assert.ok(e.length <= 5);
    for (const a of e) {
      assert.equal(a.unten, dach.y);
      assert.ok(dachPasst(dach, a.x, a.z, a.w, a.d));
    }
    return e;
  };
  assert.deepEqual(bauen(), bauen());
});
test('Steildach und zu kleine Fläche schließen Installationen aus', () => {
  assert.equal(dachInstallationen({box(){}}, { ...dach, steil: true }, rng(1)).length, 0);
  assert.equal(dachInstallationen({box(){}}, { ...dach, x1: 5 }, rng(1)).length, 0);
});
console.log('Q02: 5 Qualitäts-Tests erfolgreich.');
