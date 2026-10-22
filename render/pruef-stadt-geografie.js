// Statische Abnahme der stadtgeografischen Grundlage, ohne Render-/Chromium-Abhängigkeiten.
// Aufruf: cd render && node pruef-stadt-geografie.js
const fs = require('node:fs');
const path = require('node:path');
const engine = fs.readFileSync(path.join(__dirname, '../engine/src/daten.ts'), 'utf8');
const grafik = fs.readFileSync(path.join(__dirname, 'src/kit/stadt-geografie.js'), 'utf8');
const stadt = fs.readFileSync(path.join(__dirname, 'src/kit/staedte.js'), 'utf8');
const m = engine.match(/export const STAEDTE:[\s\S]*?\n\];/);
if (!m) throw new Error('Engine-Stadtliste nicht gefunden');
const engineZeilen = [...m[0].matchAll(/^\s*\["([^"]+)",\s*'([^']+)',\s*'([^']+)'/gm)];
const soll = new Map(engineZeilen.map((x) => [x[1], { region: x[2].toLowerCase().replace('ü', 'ue'), typ: x[3] }]));
const zeilen = [...grafik.matchAll(/^\s*("[^"]+"):\s*(\{.*\}),$/gm)];
const ist = new Map(zeilen.map((m) => [JSON.parse(m[1]), JSON.parse(m[2])]));
const bildAlt = stadt.match(/const BILD = \{([\s\S]*?)\n\};/);
if (!bildAlt) throw new Error('BILD-Tabelle nicht gefunden');
const alteNamen = new Set([...bildAlt[1].matchAll(/(?:^|\s)(?:(['"])(.*?)\1|([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]*)):\s*\[/gm)].map((x) => x[2] || x[3]));
const fehler = [];
if (soll.size !== 220 || ist.size !== 220) fehler.push('Stadtzahl: Engine ' + soll.size + ', Grafik ' + ist.size + ' statt 220');
for (const [name, e] of soll) {
  const d = ist.get(name);
  if (!d) { fehler.push('Fehlende Stadt: ' + name); continue; }
  if (d.typ !== e.typ) fehler.push(name + ': Cluster ' + d.typ + ' statt ' + e.typ);
  const region = ['Rostock', 'Stralsund', 'Schwerin'].includes(name) ? 'nord' : e.region;
  if (d.region !== region) fehler.push(name + ': Region ' + d.region + ' statt ' + region);
  if (!Array.isArray(d.koord) || d.koord.length !== 2 || !d.koord.every(Number.isFinite) || d.koord[0] < 47 || d.koord[0] > 55.1 || d.koord[1] < 5.8 || d.koord[1] > 15.1) fehler.push(name + ': unplausible Koordinaten');
  if (!alteNamen.has(name) && !d.bild) fehler.push(name + ': neuer Stadtbild-Archetyp fehlt');
  if (!alteNamen.has(name) && e.region === 'ost' && !d.ddr) fehler.push(name + ': DDR-Prägung fehlt');
}
for (const name of ist.keys()) if (!soll.has(name)) fehler.push('Stadt außerhalb Engine: ' + name);
const klassen = Object.fromEntries(['metropole', 'grossstadt', 'mittelstadt'].map((typ) => [typ, [...ist.values()].filter((d) => d.typ === typ).length]));
if (klassen.metropole !== 7 || klassen.grossstadt !== 73 || klassen.mittelstadt !== 140) fehler.push('Clusterverteilung: ' + JSON.stringify(klassen));
const kataloge = ['haeuser.json', 'haeuser-schwester.json', 'haeuser-outlet.json'].map((f) => [f, JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'))]);
for (const [datei, haeuser] of kataloge) for (const h of haeuser) if (!ist.has(h.stadt)) fehler.push(datei + ': ' + h.id + ' ohne Stadtgeografie ' + h.stadt);
console.log('Geografie: ' + ist.size + ' Städte, ' + (ist.size - alteNamen.size) + ' neue, Cluster ' + JSON.stringify(klassen));
console.log('Render-Exporte (Stand): ' + kataloge.map(([f, h]) => f + '=' + h.length).join(', '));
if (kataloge[0][1].length !== 409 || kataloge[1][1].length !== 86 || kataloge[2][1].length !== 66) console.warn('OFFEN: Render-Exporte haben noch nicht den 561-Häuser-Maßstab (Q08: fünftes Premiumhaus). Erneuter Seed-Export durch Engine-Branch erforderlich.');
if (fehler.length) { fehler.forEach((x) => console.error('FEHLER: ' + x)); process.exitCode = 1; }
else console.log('Geografie: 0 statische Verstöße.');
