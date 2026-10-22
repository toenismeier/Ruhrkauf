// Q12 – deterministische Geometrie- und Zeitschrittprüfung ohne Browser oder WebGL.
// cd render && node tests/hausbesuch-navigation.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');
const text = buildSync({ entryPoints: [path.join(__dirname, '../src/ui/hausbesuch-navigation.js')],
  bundle: true, platform: 'node', format: 'cjs', write: false, target: 'node18',
  logLevel: 'silent' }).outputFiles[0].text;
const mod = { exports: {} };
new Function('module', 'exports', 'require', text)(mod, mod.exports, require);
const { navigationsRaster, findeGangpunkt, sucheWeg, streckeFrei, istKollisionsfrei,
  erstelleBesucher, simuliereLaufwege } = mod.exports;

const buehne = { breite: 20, tiefe: 20, navigation: { hindernisse: [
  { x: 8, z: 0, w: 2, d: 14 }, // Regalwand mit freier Passage im hinteren Gang
  { x: 2, z: 2, w: 2, d: 3 },
  { x: 15, z: 5, w: 1, d: 4 }
] } };
const nav = navigationsRaster(buehne);
assert.ok(nav.freieZellen > 0, 'Es gibt begehbare Gänge');
assert.ok(!istKollisionsfrei(nav, 8.7, 4), 'Möbel-Grundfläche ist gesperrt');
assert.ok(!istKollisionsfrei(nav, 0.1, 1), 'Außenwand ist gesperrt');
const start = findeGangpunkt(nav, { x: 5, z: 5 });
const ende = findeGangpunkt(nav, { x: 14, z: 5 });
const route = sucheWeg(nav, start, ende);
assert.ok(route?.length > 0, 'Es gibt eine Route um die Regalwand');
let vor = { x: (start % nav.nx + .5) * nav.schritt,
  z: (Math.floor(start / nav.nx) + .5) * nav.schritt };
for (const p of route) {
  assert.ok(streckeFrei(nav, vor, p), 'Alle Teilstücke bleiben auf freier Gangfläche');
  assert.ok(istKollisionsfrei(nav, p.x, p.z), 'Jeder Knoten bleibt außerhalb der Regale');
  vor = p;
}
assert.ok(route.length * nav.schritt > 12, 'Der Weg folgt dem Umweg durch den freien Gang');

const zonen = [
  { id: 'damen', gruppe: 'damen', punkte: [{ x: 5, z: 5 }, { x: 4, z: 16 }] },
  { id: 'herren', gruppe: 'herren', punkte: [{ x: 14, z: 5 }, { x: 15, z: 16 }] }
];
const besatz = { kunden: 12, verkauf: 3 };
const a = simuliereLaufwege(nav, zonen, besatz, 'q12:probe', 60, 1 / 30);
const b = simuliereLaufwege(nav, zonen, besatz, 'q12:probe', 60, 1 / 120);
assert.deepEqual(erstelleBesucher(nav, zonen, besatz, 'probe').map(p => [p.x, p.z, p.tempo]),
  erstelleBesucher(nav, zonen, besatz, 'probe').map(p => [p.x, p.z, p.tempo]),
  'Start und Schrittgeschwindigkeit sind deterministisch');
assert.equal(a.kollisionen, 0);
assert.equal(b.kollisionen, 0);
assert.ok(a.kundenMeter > 0 && b.kundenMeter > 0);
assert.ok(a.kundentempo >= .8 && a.kundentempo <= 1.4);
assert.ok(b.kundentempo >= .8 && b.kundentempo <= 1.4);
assert.ok(Math.abs(a.kundenMeter - b.kundenMeter) / a.kundenMeter < .02,
  '30 und 120 fps dürfen den zurückgelegten Weg nicht verändern');
console.log('Q12: Weg um Regale, freie Gänge, 0 Kollisionen, 60 s und 30/120-fps-Vergleich bestanden.');
