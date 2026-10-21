// Prüft echte grafische Hausfamilien je Format in Städten unter 50 km.
// Aufruf: node pruef-kopien.js (erst nach vollständigem Engine-Hausexport aussagekräftig)
import haupt from '../haeuser.json';
import volkskauf from '../haeuser-schwester.json';
import fundus from '../haeuser-outlet.json';
import { STADT_GEOGRAFIE } from './kit/stadt-geografie.js';
import { familieVon } from './kit/warenhaus.js';
import { familieSport } from './kit/sporthaus.js';
import { familieSchwester, architekturSchwester } from './kit/schwesterhaus.js';
import { familieOutlet } from './kit/outlet.js';
const distanzKm = (a, b) => {
  const c = STADT_GEOGRAFIE[a.stadt]?.koord, d = STADT_GEOGRAFIE[b.stadt]?.koord;
  if (!c || !d) throw new Error('Stadtgeografie fehlt: ' + a.stadt + '/' + b.stadt);
  return Math.hypot((c[0] - d[0]) * 111, (c[1] - d[1]) * 70);
};
const formatHaeuser = {
  hartwig: haupt.filter((h) => h.format === 'warenhaus' && h.klasse !== 'premium'),
  premium: haupt.filter((h) => h.klasse === 'premium'),
  sport: haupt.filter((h) => h.format === 'sport'),
  volkskauf,
  fundus,
};
// Kein grüner Kopienbericht anhand des veralteten Teilbestands.
for (const [format, anzahl] of Object.entries({ hartwig: 360, premium: 4, sport: 44, volkskauf: 86, fundus: 66 }))
  if (formatHaeuser[format].length !== anzahl)
    throw new Error('Unvollständiger Seed-1-Export: ' + format + ' ' + formatHaeuser[format].length + '/' + anzahl);
const ids = [...haupt, ...volkskauf, ...fundus].map((h) => h.id);
if (new Set(ids).size !== 560) throw new Error('Doppelte Haus-IDs im Engine-Export');
const familie = (k, h) => k === 'sport' ? familieSport(h) : k === 'volkskauf' ? familieSchwester(h)
  : k === 'fundus' ? familieOutlet(h) : familieVon(h);
const signatur = (k, h) => {
  const f = familie(k, h);
  const variant = k === 'volkskauf' ? architekturSchwester(h).variante : (h.variante ?? h.fassade ?? 0);
  return [f, variant, h.fassade ?? 0].join('/');
};
let fehler = 0, paare = 0;
for (const [format, alle] of Object.entries(formatHaeuser)) {
  for (let i = 0; i < alle.length; i++) for (let j = i + 1; j < alle.length; j++) {
    const a = alle[i], b = alle[j];
    if (distanzKm(a, b) >= 50) continue;
    paare++;
    if (signatur(format, a) === signatur(format, b)) {
      console.error('KOPIE', format, a.id, a.stadt, b.id, b.stadt, signatur(format, a));
      fehler++;
    }
  }
}
console.log('Kopienprüfung:', paare, 'Nachbarhauspaare,', fehler, 'gleiche Familien-/Varianten-/Fassadensignaturen');
if (fehler) process.exitCode = 1;
