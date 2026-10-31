// Q33: je Zielgruppe Kinder, Teens & Tweens, Young Adults mindestens 180 Artikeltypen mit eigenem, unterscheidbarem Bild
// (gleiche Logik wie die Sortimentsnavigation produkte-q24.js; Bilder ohne zufällige ids verglichen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import { produktSVG, bildFuer } from '../src/kit/mode/produkt.js';
import { passendeTypen, FAECHER, zielgruppenFuerFach } from '../src/ui/produkte-q24.js';

const ordner = mkdtempSync(join(tmpdir(), 'q33-'));
const eintrag = join(ordner, 'eintrag.ts');
writeFileSync(eintrag, `export { neuesSpiel, produktKatalog } from ${JSON.stringify(new URL('../../engine/src/index.ts', import.meta.url).pathname)};`);
esbuild.buildSync({ entryPoints: [eintrag], bundle: true, platform: 'node', format: 'cjs', outfile: join(ordner, 'engine.cjs'), logLevel: 'silent' });
const E = createRequire(import.meta.url)(join(ordner, 'engine.cjs'));
const K = E.produktKatalog(E.neuesSpiel(1));

const ohneIds = (svg) => { const ids = [...new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))].sort((a, b) => b.length - a.length); ids.forEach((id, i) => { svg = svg.split(id).join('§' + i); }); return svg; };

for (const z of ['kinder', 'teens', 'young']) {
  test(`${z}: mindestens 180 Artikeltypen mit eigenem Bild`, () => {
    const typen = new Map();
    for (const [fach] of FAECHER) if (zielgruppenFuerFach(K, fach).some((x) => x.id === z)) for (const t of passendeTypen(K, fach, z)) typen.set(t.typ, t);
    const bilder = new Set([...typen.values()].map((t) => ohneIds(produktSVG(t.bild ?? bildFuer(t.typ), undefined, undefined, 64))));
    assert.ok(typen.size >= 180, `${z}: ${typen.size} Typen`);
    assert.ok(bilder.size >= 180, `${z}: ${bilder.size} eigene Bilder`);
  });
}

test('Q33-Typen haben untereinander kein gleiches Bild', () => {
  // Wurf 4: Typen mit offenem Bild (bildOffen) leihen sich bis zur Abnahme eine vorhandene Silhouette
  const q33 = K.typen.filter((t) => !t.bildOffen && /^[kt]_/.test(t.bild?.silhouette ?? ''));
  const bilder = new Map();
  for (const t of q33) { const b = ohneIds(produktSVG(t.bild, undefined, undefined, 64)); assert.ok(!bilder.has(b), `${t.typ} = ${bilder.get(b)}`); bilder.set(b, t.typ); }
});

test('Reiter Kinder bietet nur Kinder und Teens & Tweens', () => {
  assert.deepEqual(zielgruppenFuerFach(K, 'kinder').map((x) => x.id), ['kinder', 'teens']);
  assert.equal(zielgruppenFuerFach(K, 'damen').length, 5);
});
