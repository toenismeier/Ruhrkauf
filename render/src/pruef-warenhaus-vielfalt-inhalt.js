// Q21: Läuft auf den exportierten Engine-Daten; Claude führt den Export zuvor aus.
// npm in render installiert: node pruef-warenhaus-vielfalt.js
import assert from 'node:assert/strict';
import haeuser from '../haeuser.json';
import { warenhausVielfalt } from './kit/warenhaus-vielfalt.js';
import { fussabdruck } from './kit/bauer.js';

const vorwaerts = warenhausVielfalt(haeuser);
const rueckwaerts = warenhausVielfalt([...haeuser].reverse());
assert.deepEqual([...vorwaerts].sort(), [...rueckwaerts].sort(), 'Die Hausfolge ändert die Bauform');

const stadt = new Map();
for (const h of haeuser) {
  if (h.format !== 'warenhaus' || h.klasse === 'premium') continue;
  const v = vorwaerts.get(h.id);
  assert(v, `Haus ${h.id} ohne Bauform`);
  assert(v.familie >= 1 && v.familie <= 11 && v.familie !== 7, `Familie ungültig: ${h.id}`);
  assert(v.fassade >= 0 && v.fassade < 8, `Fassade ungültig: ${h.id}`);
  if (!stadt.has(h.stadt)) stadt.set(h.stadt, []);
  stadt.get(h.stadt).push({ ...v, id: h.id, lage: h.lage });
  const m = fussabdruck(h, v.familie);
  assert(m.w > 0 && m.d > 0, `Grundfläche ungültig: ${h.id}`);
  assert.equal(m.mall > 0, v.familie === 6, `Center-Maße widersprechen der Familie: ${h.id}`);
}
for (const [name, liste] of stadt) {
  const benutzt = new Set();
  const familien = new Set();
  for (const h of liste) {
    const key = `${h.familie}/${h.fassade}`;
    assert(!benutzt.has(key), `Doppelte Familie+Variante in ${name}: ${key}`);
    benutzt.add(key);
    familien.add(h.familie);
    assert(h.familie !== 6 || h.lage === 'center', `Centerfamilie ohne Center in ${name}`);
  }
  if (liste.length <= 10) assert.equal(familien.size, liste.length, `Doppelte Familie in ${name}`);
}
for (const name of ['Berlin', 'Hamburg', 'München', 'Essen']) {
  console.log(`${name}: ${(stadt.get(name) ?? []).map((h) => `${h.id}=${h.familie}/${h.fassade} (${h.lage})`).join(', ')}`);
}
console.log(`Q21: ${vorwaerts.size} reguläre Hartwig-Häuser in ${stadt.size} Städten ohne doppelte Familie+Variante`);
