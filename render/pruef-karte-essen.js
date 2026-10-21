// Q01: rein datenbasierte Prüfungen. Aufrufer: cd render && node pruef-karte-essen.js
// Vollständige Bild-, Dreiecks- und Draw-Call-Abnahme führt Claude lokal aus.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const osm = JSON.parse(readFileSync(new URL('./karten/essen.json', import.meta.url), 'utf8'));
assert.equal(osm.stadt, 'essen');
assert.match(osm.lizenz, /OpenStreetMap.*ODbL/);
assert.equal(osm.radius_m, 1700);
for (const [k, min] of Object.entries({ strassen: 2000, gleise: 500, bahnsteige: 100,
  flaechen: 1800, bebauung: 7500, wahrzeichen: 7 })) {
  assert.ok(osm[k].length >= min, k + ': ' + osm[k].length + ' < ' + min);
}
const hat = (liste, begriff) => liste.some(q => new RegExp(begriff, 'i').test(q.name ?? ''));
assert.ok(hat(osm.strassen, 'Kettwiger Straße'), 'Kettwiger Straße als reale Straße');
assert.ok(hat(osm.bahnhoefe, 'Essen Hauptbahnhof'), 'Hbf-Gebäudepolygon');
assert.ok(hat(osm.gebaeude, 'Rathaus Essen'), 'Rathaus-Gebäudepolygon');
assert.ok(hat(osm.gebaeude, 'Limbecker Platz'), 'Einkaufszentrum-Gebäudepolygon');
const orte = new Set(osm.wahrzeichen.map(q => q.id));
for (const id of ['essen-hbf', 'essen-rathaus', 'essen-muenster', 'essen-limbecker']) {
  assert.ok(orte.has(id), 'Wahrzeichen ' + id);
}
// Keine frei schwebenden Bahnzüge: reale Schienenabschnitte von mindestens zwei
// Wagenlängen müssen bei einem Hbf-Bahnsteig liegen.
const plat = osm.bahnsteige.filter(p => /Essen Hbf|Essen Hauptbahnhof/.test(p.name ?? '') && p.flaeche);
const mitte = a => a.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map(q => q / a.length);
let bahnsteiggleise = 0;
for (const g of osm.gleise.filter(q => q.art === 'fern' && !q.tunnel)) {
  for (let i = 1; i < g.punkte.length; i++) {
    const a = g.punkte[i - 1], b = g.punkte[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 70) continue;
    const m = mitte([a, b]);
    if (plat.some(p => Math.hypot(m[0] - mitte(p.punkte)[0], m[1] - mitte(p.punkte)[1]) < 85)) bahnsteiggleise++;
  }
}
assert.ok(bahnsteiggleise >= 2, 'Mindestens zwei wirkliche Hbf-Gleise mit Zugraum');
const q = readFileSync(new URL('./src/kit/karten/essen.js', import.meta.url), 'utf8');
const ansichten = ['hbf','kettwiger','rathaus','limbecker','muenster','ruettenscheid','norden','rand'];
for (const id of ansichten) assert.ok(q.includes("id: '" + id + "'"), 'Katalogstandort ' + id);
assert.equal((q.match(/id: '/g) ?? []).length, 8, 'Genau acht Katalogansichten');
console.log('Q01 Essen: OSM-Datensatz, sieben Wahrzeichen, Hbf-Gleise und acht Ansichten geprüft.');
console.log('Bild, Performance, Fingerabdrücke und übrige Prüfskripte: Claude lokal.');
