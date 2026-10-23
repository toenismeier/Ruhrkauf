// Q33: sichtbare Artikeltypen je Zielgruppe × Abteilung (Logik wie render/src/ui/produkte-q24.js) und je Marke.
// Aufruf: npx tsx scripts/q33-zaehlung.ts [--json Datei]
import { writeFileSync } from 'fs';
import { neuesSpiel, produktKatalog, produkte } from '../src';
// @ts-ignore js-Modul aus render
import { passendeTypen, FAECHER, zielgruppenFuerFach } from '../../render/src/ui/produkte-q24.js';
type T = { typ: string; kategorie: string };
const s = neuesSpiel(1);
const K = produktKatalog(s) as unknown as { typen: T[]; zielgruppen: readonly { id: string; name: string }[] };
const L = produkte(s);
const ausgabe: Record<string, string[]> = {};
for (const z of K.zielgruppen) {
  const alle = new Map<string, T>();
  const teile = (FAECHER as [string, string][]).map(([f, n]) => {
    if (!(zielgruppenFuerFach(K, f) as { id: string }[]).some((x) => x.id === z.id)) return `${n} –`;
    const t = passendeTypen(K, f, z.id) as T[]; t.forEach((x) => alle.set(x.typ, x)); return `${n} ${t.length}`;
  });
  ausgabe[z.id] = [...alle.keys()];
  console.log(`${z.name.padEnd(15)} gesamt ${String(alle.size).padStart(3)} · ${teile.join(' · ')}`);
}
for (const m of L.marken) {
  const z = K.zielgruppen.map((g) => {
    const n = new Set((FAECHER as [string, string][]).flatMap(([f]) => (passendeTypen(K, f, g.id) as T[]).filter((t) => m.entwickelbar.includes(t.typ) && m.kategorien.some((k) => k.id === t.kategorie)).map((t) => t.typ)));
    return `${g.name} ${n.size}`;
  });
  console.log(`Marke ${m.name}: ${z.join(' · ')}`);
}
console.log('Typen gesamt', K.typen.length);
const i = process.argv.indexOf('--json');
if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify({ katalog: K, sichtbar: ausgabe }));
