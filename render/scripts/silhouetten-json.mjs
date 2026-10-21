// Erzeugt src/kit/mode/silhouetten.json aus silhouetten.js (Q25-Bildschnittstelle für die Engine/Q24).
// Aufruf: cd render && node scripts/silhouetten-json.mjs
import { writeFileSync } from 'node:fs';
import { silhouettenDaten } from '../src/kit/mode/silhouetten.js';
const ziel = new URL('../src/kit/mode/silhouetten.json', import.meta.url);
writeFileSync(ziel, JSON.stringify(silhouettenDaten(), null, 2) + '\n');
console.log('geschrieben:', ziel.pathname);
