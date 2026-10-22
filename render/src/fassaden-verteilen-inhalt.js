// Maßstab Städte, Phase 3: Fassadenvarianten so verteilen, dass zwei Häuser derselben Kette mit gleicher Familie in
// Städten unter 50 km nie dieselbe Variante tragen (pruef-kopien.js). Läuft nach dem Engine-Export und schreibt die
// drei Hausdateien neu: node fassaden-verteilen.js. Deterministisch (Reihenfolge nach Haus-ID), Familien bleiben,
// nur der Fassadenindex (0 bis 7, Familien 5 und 6 bis 11) wird verschoben (zuerst die Engine-Variante, dann die nächste freie).
import fs from 'node:fs';
import path from 'node:path';
import { STADT_GEOGRAFIE } from './kit/stadt-geografie.js';
import { familieVon, VARIANTEN } from './kit/warenhaus.js';
import { warenhausVielfalt, familienKandidaten } from './kit/warenhaus-vielfalt.js';
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
const Q21 = warenhausVielfalt(haupt);
const gruppen = [
  // Q21: Hartwig-Familie je Haus aus warenhausVielfalt (eigene Familie je Stadt), nicht mehr aus familieVon.
  ['hartwig', haupt.filter((h) => h.format === 'warenhaus' && h.klasse !== 'premium'), (h) => Q21.get(h.id)?.familie ?? familieVon(h), VARIANTEN],
  ['sport', haupt.filter((h) => h.format === 'sport'), familieSport, () => 8],
  ['volkskauf', volkskauf, familieSchwester, () => 8],
  ['fundus', fundus, familieOutlet, () => 8],
];
let geaendert = 0, rest = 0;
const ergebnisse = new Map();
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
  // Restkonflikte per Min-Conflicts-Suche (deterministisch, Seed fest): ein Konflikthaus wechselt auf die Variante
  // mit den wenigsten Konflikten, bei Gleichstand zufällig. Löst dichte Regionen, an denen der Greedy-Lauf hängen bleibt.
  let zufall = 12345;
  const rnd = () => ((zufall = (zufall * 1103515245 + 12345) >>> 0) / 4294967296);
  const zaehle = (x, v) => nb.get(x).filter((q) => q.v === v).length;
  for (let schritt = 0; schritt < 200000; schritt++) {
    const offen = fertig.filter((x) => zaehle(x, x.v) > 0);
    if (!offen.length) break;
    const x = offen[Math.floor(rnd() * offen.length)], N = anzahl(x.f);
    let best = Infinity, wahl = [];
    for (let v = 0; v < N; v++) { if (v === x.v) continue; const n = zaehle(x, v); if (n < best) { best = n; wahl = [v]; } else if (n === best) wahl.push(v); }
    const v = wahl[Math.floor(rnd() * wahl.length)];
    x.v = v; x.h.fassade = v;
  }
  ergebnisse.set(name, { fertig, nb, anzahl });
  console.log('Fassaden', name, 'Restkonflikte', fertig.filter((x) => zaehle(x, x.v) > 0).length, liste.length, 'Häuser, höchstens', Math.max(...fertig.map((x) => nb.get(x).length)), 'gleichfamilige Nachbarn');
}
// Hartwig: verbleibende Kopien in dichten Regionen (mehr gleichfamilige Nachbarn als Varianten) über einen Familienwechsel
// lösen. Familie bleibt je Stadt eindeutig (Q21) und stammt aus den zulässigen Kandidaten; ein Wechsel kostet etwas,
// damit die Engine-Wunschfamilie wo möglich bleibt. Ergebnis landet als h.familie im Export, warenhausVielfalt übernimmt es.
{
  const { fertig } = ergebnisse.get('hartwig');
  const nahe = new Map(fertig.map((x) => [x, fertig.filter((q) => q !== x && km(q.h, x.h) < 50)]));
  const konflikte = (x, f, v) => nahe.get(x).filter((q) => q.f === f && q.v === v).length;
  let zufall = 4711;
  const rnd = () => ((zufall = (zufall * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let schritt = 0; schritt < 100000; schritt++) {
    const offen = fertig.filter((x) => konflikte(x, x.f, x.v) > 0);
    if (!offen.length) break;
    const x = offen[Math.floor(rnd() * offen.length)];
    const belegt = new Set(fertig.filter((q) => q !== x && q.h.stadt === x.h.stadt).map((q) => q.f));
    let best = Infinity, wahl = [];
    for (const f of familienKandidaten(x.h)) {
      if (belegt.has(f)) continue;
      for (let v = 0; v < VARIANTEN(f); v++) {
        if (f === x.f && v === x.v) continue;
        const k = konflikte(x, f, v) + (f === x.f ? 0 : 0.5);
        if (k < best) { best = k; wahl = [[f, v]]; } else if (k === best) wahl.push([f, v]);
      }
    }
    if (!wahl.length) continue;
    [x.f, x.v] = wahl[Math.floor(rnd() * wahl.length)];
    x.h.fassade = x.v;
  }
  for (const x of fertig) x.h.familie = x.f;
  console.log('Hartwig nach Familienausgleich: Restkonflikte', fertig.filter((x) => konflikte(x, x.f, x.v) > 0).length);
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
