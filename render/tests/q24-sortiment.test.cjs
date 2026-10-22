const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

const entry = path.join(__dirname, '../src/ui/produkte-q24.js');
const out = esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', write: false });
const mod = new Module(entry, module);
mod.filename = entry;
mod.paths = module.paths;
mod._compile(out.outputFiles[0].text, entry);
const { passendeTypen, sortimentBedienung, fachSegmente, zielChips, teamAufschluesselung } = mod.exports;

const G = { kinder: 0.85, jung: 0.9, mitte: 0.9, reif: 0.85 };
const F = ['damen.blusen', 'herren.hemden', 'kinder.jungen', 'wohnen.bett'];
const typen = Array.from({ length: 400 }, (_, i) => ({
  typ: 'Artikel-' + i, kategorie: i % 4 === 3 ? 'home' : 'oberteile',
  wgs: [F[i % 4]], gruppe: G, materialien: ['Baumwolle'], preisMitte: 45,
}));
const K = { typen, zielgruppen: [
  { id: 'kinder', name: 'Kinder' }, { id: 'teens', name: 'Teens & Tweens' },
  { id: 'young', name: 'Young Adults' }, { id: 'adults', name: 'Adults' },
  { id: 'bestager', name: 'Best Ager' },
], baum: [{ id: 'oberteile', name: 'Oberteile', unterkategorien: [
  { id: 'alles', name: 'Alles', typen: typen.map((t) => t.typ) },
] }] };

test('400 Artikeltypen: Abteilungen und Alters-Chips filtern vollständig', () => {
  for (const fach of ['damen', 'herren', 'kinder', 'home']) {
    const treffer = passendeTypen(K, fach, 'adults');
    assert.equal(treffer.length, 100);
  }
  const ui = { fach: 'damen', zielgruppe: 'adults', baumOffen: null, astOffen: null };
  assert.match(fachSegmente(ui), /Damen/);
  assert.match(fachSegmente(ui), /Home/);
  assert.match(zielChips(K, ui), /Teens &amp; Tweens/);
  const html = sortimentBedienung(K, ui, passendeTypen(K, 'damen', 'adults'), (typ) => '<svg data-typ="' + typ + '"></svg>', 'detailTyp');
  assert.match(html, /Artikel-396/);
  assert.doesNotMatch(html, /Artikel-397/);
  assert.match(html, /data-a="detailTyp"/);
});
test('Explizite Zielgruppen aus späteren Sortimentspaketen haben Vorrang', () => {
  const spec = { typen: [{ typ: 'Modernes Modell', wgs: ['damen.young'],
    kategorie: 'oberteile', gruppe: G, zielgruppen: ['teens', 'young'] }] };
  assert.equal(passendeTypen(spec, 'damen', 'teens').length, 1);
  assert.equal(passendeTypen(spec, 'damen', 'bestager').length, 0);
});
test('Leistungskomponenten sind pro Marke sichtbar', () => {
  const html = teamAufschluesselung({
    wert: 57, team: 62, zielgruppe: 80, trend: 45, lieferant: 73,
    hq: 55, teamgroesse: 5, kategorieErfahrung: 62,
  });
  assert.match(html, /57 \/ 100/);
  assert.match(html, /Team <b>62<\/b>/);
  assert.match(html, /Trend <b>45<\/b>/);
});
