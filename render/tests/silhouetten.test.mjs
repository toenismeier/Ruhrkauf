// Q25: Silhouetten-Bibliothek, Produktbilder und Model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SILHOUETTEN, silhouettenDaten } from '../src/kit/mode/silhouetten.js';
import { produktSVG, modelFuerProdukt, bildFuer } from '../src/kit/mode/produkt.js';
import { produktbildSVG, ARTIKELTYPEN_BILD } from '../src/kit/produktbild.js';

test('silhouetten.json ist aktuell (node scripts/silhouetten-json.mjs)', () => {
  const json = JSON.parse(readFileSync(new URL('../src/kit/mode/silhouetten.json', import.meta.url), 'utf8'));
  assert.deepEqual(json, JSON.parse(JSON.stringify(silhouettenDaten())));
});

test('jede Silhouette zeichnet einen Freisteller', () => {
  for (const id of Object.keys(SILHOUETTEN)) {
    const svg = produktSVG(id, undefined, undefined, 100);
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/, id);
    assert.ok(!/NaN|undefined/.test(svg), `${id}: NaN/undefined im SVG`);
  }
});

test('Silhouetten mit Model-Platz zeichnen ein Model je Zielgruppe', () => {
  for (const [id, s] of Object.entries(SILHOUETTEN)) {
    for (const zielgruppe of ['kinder', 'teens', 'young', 'adults', 'bestager']) for (const geschlecht of ['damen', 'herren']) {
      const svg = modelFuerProdukt(id, undefined, undefined, { geschlecht, zielgruppe });
      if (!s.model) { assert.equal(svg, null, id); continue; }
      // eingebettete Bilddaten (base64) können zufällig "undefined" enthalten, daher vor dem Prüfen entfernen
      assert.ok(svg && !/NaN|undefined/.test(svg.replace(/base64,[^"]+/g, '')), `${id} ${geschlecht} ${zielgruppe}`);
    }
  }
});

test('Artikelnamen finden eine bekannte Silhouette', () => {
  for (const typ of [...ARTIKELTYPEN_BILD, 'Crop-Top', 'Babytee', 'Wide-Leg-Jeans', 'Slip-Dress', 'Steppweste', 'Duftkerze', 'Waffelpiqué-Handtuch']) {
    const b = bildFuer(typ);
    assert.ok(SILHOUETTEN[b.silhouette], `${typ} → ${b.silhouette}`);
    assert.match(produktbildSVG(typ, 'marine', 'Baumwolle', 80), /^<svg/);
  }
  assert.equal(bildFuer('Jeans-Shorts').silhouette, 'jeansshorts');
  assert.equal(bildFuer('Crop-Top').silhouette, 'croptop');
});
