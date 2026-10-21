// Export der deterministischen Stammdaten. Aufruf aus engine/: npx tsx scripts/haeuser-export.ts
import { writeFileSync } from 'fs';
import { join } from 'path';
import { neueWelt } from '../src/welt';
import type { Haus } from '../src/types';

const ziel = process.argv[2] ?? join(__dirname, '..', '..', 'render');
const s = neueWelt(1);

/** Nur Felder, die der 3D-Baukasten tatsächlich benötigt. Kein Laufzeit-Zustand. */
function grafikDaten(h: Haus) {
  return {
    id: h.id, name: h.name, stadt: h.stadt, format: h.format,
    ...(h.hausklasse ? { hausklasse: h.hausklasse } : {}),
    ...(h.klasse ? { klasse: h.klasse, premiumSchluessel: h.premiumSchluessel, premiumImage: h.premiumImage } : {}),
    ...(h.nurDaten ? { nurDaten: true } : {}),
    lage: h.lage, cluster: h.cluster, region: h.region,
    grundflaecheQm: h.grundflaecheQm, etagen: h.etagen,
    baujahr: h.baujahr, fassade: h.fassade, substanz: h.substanz, status: h.status,
    flaechen: h.flaechen.map((f) => ({
      id: f.id, etage: f.etage, qm: f.qm, konzept: f.konzept,
      ...(f.gruppe ? { gruppe: f.gruppe } : {}),
    })),
  };
}
const schreibe = (datei: string, filter: (h: Haus) => boolean) =>
  writeFileSync(join(ziel, datei), JSON.stringify(s.haeuser.filter(filter).map(grafikDaten), null, 2) + '\n', 'utf8');

schreibe('haeuser.json', (h) => h.format === 'warenhaus' || h.format === 'sport');
schreibe('haeuser-schwester.json', (h) => h.format === 'schwester');
schreibe('haeuser-outlet.json', (h) => h.format === 'outlet');
console.log('Maßstab-Export:', s.haeuser.length, 'Häuser in drei JSON-Dateien (Seed 1).');
