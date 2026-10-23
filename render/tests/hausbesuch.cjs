// Prüfungen der rein visuellen Hausbesuch-Logik. Ausführen: cd render && node tests/hausbesuch.cjs
// Keine Engine-Aktionen, Browser- oder WebGL-Abhängigkeit beim Testlauf.
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');

const gebuendelt = buildSync({
  entryPoints: [path.join(__dirname, '../src/ui/hausbesuch.js')],
  bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node18'
}).outputFiles[0].text;
const mod = { exports: {} };
new Function('module', 'exports', 'require', gebuendelt)(mod, mod.exports, require);
const { HAUSBESUCH_SAETZE, hausbesuchLage, hausbesuchSpruch, hausbesuchBesatz, zonenNormalisieren } = mod.exports;

const alle = Object.values(HAUSBESUCH_SAETZE).flat();
assert.equal(alle.length, 40, 'Vier Spruchgruppen mit je zehn Sätzen');
assert.equal(new Set(alle).size, 40, 'Alle Sätze müssen eindeutig sein');
for (const [name, gruppe] of Object.entries(HAUSBESUCH_SAETZE)) {
  assert.equal(gruppe.length, 10, name);
  assert.ok(gruppe.every((satz) => /[.!?]$/.test(satz)), 'Vollständige Sätze');
  for (const woche of [0, 1, 12, 52]) {
    const satz = hausbesuchSpruch(woche, 'damen', name, 4);
    assert.ok(gruppe.includes(satz));
    assert.equal(satz, hausbesuchSpruch(woche, 'damen', name, 4), 'Deterministisch');
  }
}
assert.equal(hausbesuchLage({ altwarenanteil: 0.34, nosVerfuegbarkeit: 0.4 }, 0.5), 'altware');
assert.equal(hausbesuchLage({ altwarenanteil: 0.01, nosVerfuegbarkeit: 0.7 }, 1), 'fehlmengen');
assert.equal(hausbesuchLage({}, 0.7), 'personal');
assert.equal(hausbesuchLage({}, 1), 'gut');

const haus = { id: 'H01', format: 'warenhaus',
  flaechen: [{ id: 'f0', etage: 0, gruppe: 'damen', konzept: 'eigen', qm: 1200 },
    { id: 'f1', etage: 1, gruppe: 'herren', konzept: 'eigen', qm: 1200 }],
  personal: { vollzeit: 80, teilzeit: 0, aushilfen: 0 },
  kpi: { fteIst: 80, fteBedarf: 100, umsatzJeGruppe: { damen: 180000, herren: 100000 } }
};
const besatz = hausbesuchBesatz(haus, 0);
assert.equal(besatz.fte, 40);
assert.equal(besatz.personalquote, 0.8);
assert.ok(besatz.kunden >= 2 && besatz.kunden <= 36);
assert.ok(besatz.verkauf > 0 && besatz.verkauf <= 12);
// Q35: Figuren = gleichzeitig im Dienst, aus denselben FTE abgeleitet (40 FTE → 17 im Dienst, 12 im Bild).
assert.equal(besatz.imDienst, Math.round(40 * (40 / 60) * 0.9 * 0.71));
assert.equal(besatz.verkauf, Math.min(12, besatz.imDienst));
assert.ok(besatz.imDienst <= besatz.fte);
assert.deepEqual(hausbesuchBesatz(haus, 0), besatz);
assert.equal(hausbesuchBesatz({ ...haus, kpi: { ...haus.kpi, umsatzJeGruppe: { damen: 0 } } }, 0).kunden < besatz.kunden, true);
assert.equal(hausbesuchBesatz({ ...haus, kpi: { ...haus.kpi, fteIst: 0 } }, 0).verkauf, 0);

const normal = zonenNormalisieren([{ flaeche: haus.flaechen[0], zellen: [{ i: 2, j: 3 }] }], haus);
assert.equal(normal[0].gruppe, 'damen');
assert.deepEqual(normal[0].punkte, [{ x: 12.5, z: 17.5 }]);
const sport = zonenNormalisieren([{ id: 'sportschuhe', x: 5, z: 10, w: 20, d: 10 }], {
  flaechen: [{ id: 'sportschuhe-EG', etage: 0, gruppe: 'sportschuhe', qm: 200 }]
});
assert.equal(sport[0].gruppe, 'sportschuhe', 'Ladenplan-Räume müssen Einkaufsbereiche treffen');
assert.deepEqual(sport[0].punkte, [{ x: 15, z: 15 }]);

const outlet = { ...haus, format: 'outlet', personal: undefined, kpi: undefined };
assert.ok(hausbesuchBesatz(outlet, 0).verkauf >= 1, 'FUNDUS-Mock verfügt über Verkaufspersonal');
console.log('Hausbesuch: 40 einzigartige Sätze, Lage, Determinismus, Personal, Raumzuordnung und FUNDUS bestanden.');
