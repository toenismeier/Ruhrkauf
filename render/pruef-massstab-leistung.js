#!/usr/bin/env node
// Leistungsvergleich für die 220er-Städte: rein lesend, verändert keine Referenzen.
// cd render && node pruef-fingerabdruck.js --messen > messung.log
// node pruef-massstab-leistung.js messung.log
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const basis = fs.readFileSync(path.join(__dirname, '..', 'auftraege', 'massstab-leistung-basis.csv'), 'utf8')
  .trim().split(/\r?\n/).slice(1).filter(Boolean);
const stadtTyp = { metropole: [1233, 10148022], grossstadt: [1022, 7322207], mittelstadt: [826, 4224050] };
const messdaten = process.argv[2];
if (!messdaten) {
  console.error('Aufruf: node pruef-massstab-leistung.js <Ausgabe-von-pruef-fingerabdruck---messen>');
  process.exit(2);
}
const roh = fs.readFileSync(messdaten, 'utf8');
const ist = new Map();
for (const line of roh.split(/\r?\n/)) {
  const m = /^MESSUNG;(.+);(\d+);(\d+)$/.exec(line.trim());
  if (m) {
    if (ist.has(m[1])) throw new Error('Stadt mehrfach gemessen: ' + m[1]);
    ist.set(m[1], [Number(m[2]), Number(m[3])]);
  }
}
let fehlend = 0, zuSchwer = 0, bisher = 0, neu = 0;
for (const line of basis) {
  const [name, typ, mainCalls, mainDrei] = line.trim().split(';');
  const grenze = mainCalls && mainDrei ? [Number(mainCalls), Number(mainDrei)] : stadtTyp[typ];
  if (mainCalls && mainDrei) bisher++; else neu++;
  const wert = ist.get(name);
  if (!wert) { console.error('FEHLT ' + name); fehlend++; continue; }
  if (wert[0] > grenze[0] || wert[1] > grenze[1]) {
    console.error('ÜBER LIMIT ' + name + ' (' + typ + '): Draw Calls ' + wert[0] + '/' + grenze[0]
      + ', Dreiecke ' + wert[1] + '/' + grenze[1]);
    zuSchwer++;
  }
}
for (const name of ist.keys()) {
  if (!basis.some((s) => s.startsWith(name + ';'))) { console.error('UNBEKANNTE STADT ' + name); fehlend++; }
}
console.log('Maßstab Leistung: ' + ist.size + ' Messungen; ' + bisher + ' bisherige, ' + neu
  + ' neue Städte; ' + zuSchwer + ' über Limit; ' + fehlend + ' fehlend/ungültig.');
if (zuSchwer || fehlend || ist.size !== basis.length) process.exitCode = 1;
