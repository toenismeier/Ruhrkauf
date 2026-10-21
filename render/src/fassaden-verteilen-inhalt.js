// Maßstab Städte, Phase 3: Fassadenvarianten so verteilen, dass zwei Häuser derselben Kette mit gleicher Familie in
// Städten unter 50 km nie dieselbe Variante tragen (pruef-kopien.js). Läuft nach dem Engine-Export und schreibt die
// drei Hausdateien neu: node fassaden-verteilen.js. Deterministisch (Reihenfolge nach Haus-ID), Familien bleiben,
// nur der Fassadenindex (0 bis 7, Familien 5 und 6 bis 11) wird verschoben (zuerst die Engine-Variante, dann die nächste freie).
import fs from 'node:fs';
import path from 'node:path';
import { STADT_GEOGRAFIE } from './kit/stadt-geografie.js';
import { familieVon, VARIANTEN } from './kit/warenhaus.js';
import { familieSport } from './kit/sporthaus.js';
import { familieSchwester } from './kit/schwesterhaus.js';
import { familieOutlet, masseOutlet } from './kit/outlet.js';

const dir = process.argv[2];
const datei = (n) => path.join(dir, n);
const haupt = JSON.parse(fs.readFileSync(datei('haeuser.json'), 'utf8'));
const volkskauf = JSON.parse(fs.readFileSync(datei('haeuser-schwester.json'), 'utf8'));
const fundus = JSON.parse(fs.readFileSync(datei('haeuser-outlet.json'), 'utf8'));
const km = (a, b) => {
  const c = STADT_GEOGRAFIE[a.stadt]?.koord, d = STADT_GEOGRAFIE[b.stadt]?.koord;
  if (!c || !d) throw new Error('Stadtgeografie fehlt: ' + a.stadt + '/' + b.stadt);
  return Math.sqrt(((c[0] - d[0]) * 111) ** 2 + ((c[1] - d[1]) * 70) ** 2);
};
const gruppen = [
  ['hartwig', haupt.filter((h) => h.format === 'warenhaus' && h.klasse !== 'premium'), familieVon, VARIANTEN],
  ['sport', haupt.filter((h) => h.format === 'sport'), familieSport, () => 8],
  ['volkskauf', volkskauf, familieSchwester, () => 8],
  ['fundus', fundus, familieOutlet, () => 8],
];
let geaendert = 0, rest = 0;
for (const [name, liste, familie, anzahl] of gruppen) {
  const fertig = [];
  for (const h of [...liste].sort((a, b) => String(a.id).localeCompare(String(b.id), 'de', { numeric: true }))) {
    const f = familie(h), N = anzahl(f), start = ((h.fassade ?? 0) % N + N) % N;
    const nachbarn = fertig.filter((q) => q.f === f && km(q.h, h) < 50);
    let wahl = null, best = Infinity;
    for (let k = 0; k < N; k++) {
      const v = (start + k) % N, n = nachbarn.filter((q) => q.v === v).length;
      if (n < best) { best = n; wahl = v; }
      if (n === 0) break;
    }
    if (best > 0) rest++;
    if (wahl !== h.fassade) { h.fassade = wahl; geaendert++; }
    fertig.push({ h, f, v: wahl });
  }
  // Nachbesserung: verbliebene Konflikte gegen alle Nachbarn (auch spätere IDs) auflösen, höchstens zehn Durchläufe
  const nb = new Map(fertig.map((x) => [x, fertig.filter((q) => q !== x && q.f === x.f && km(q.h, x.h) < 50)]));
  for (let lauf = 0; lauf < 10; lauf++) {
    let neu = 0;
    for (const x of fertig) {
      const N = anzahl(x.f), konflikt = (v) => nb.get(x).filter((q) => q.v === v).length;
      if (!konflikt(x.v)) continue;
      for (let k = 1; k < N; k++) { const v = (x.v + k) % N; if (!konflikt(v)) { x.v = v; x.h.fassade = v; neu++; break; } }
    }
    if (!neu) break;
  }
  console.log('Fassaden', name, liste.length, 'Häuser, höchstens', Math.max(...fertig.map((x) => nb.get(x).length)), 'gleichfamilige Nachbarn');
}
// Grafikfläche: Hartwig bleibt das prägnanteste Haus der Stadt (GESTALTUNG.md 3 und 3b). Volkskauf höchstens 80 % der
// größten Hartwig-Grundfläche der Stadt, FUNDUS in b-Lage mit Baukörper höchstens 80 %. Nur die Grafikdateien,
// die Wirtschaft der Engine rechnet mit ihren eigenen Flächen.
let gekappt = 0;
const maxHartwig = (stadt) => Math.max(0, ...haupt.filter((h) => h.stadt === stadt && h.format === 'warenhaus').map((h) => h.grundflaecheQm));
for (const h of volkskauf) {
  const m = maxHartwig(h.stadt);
  if (m && h.grundflaecheQm > m * 0.8) { h.grundflaecheQm = Math.floor(m * 0.8); gekappt++; }
}
for (const h of fundus.filter((q) => q.lage === 'b')) {
  const m = maxHartwig(h.stadt);
  if (!m) continue;
  let n = 0;
  while (masseOutlet(h).bw * masseOutlet(h).bd > m * 0.8 && h.grundflaecheQm > 650 && n++ < 200) h.grundflaecheQm = Math.max(650, h.grundflaecheQm - 25);
  if (n) gekappt++;
}
console.log('Grafikflächen gekappt:', gekappt);
const schreib = (n, d) => fs.writeFileSync(datei(n), JSON.stringify(d, null, 2) + '\n');
schreib('haeuser.json', haupt); schreib('haeuser-schwester.json', volkskauf); schreib('haeuser-outlet.json', fundus);
console.log('Fassadenverteilung:', geaendert, 'Varianten im ersten Durchlauf verschoben');
