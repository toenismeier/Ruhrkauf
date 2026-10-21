// Q18 · Strukturelle Prüfung aller Zeitungsillustrationen ohne Browser.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const bundle = esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'kit', 'zeitung.js')],
  bundle: true, write: false, format: 'cjs', platform: 'node'
});
const modul = { exports: {} };
new Function('module', 'exports', bundle.outputFiles[0].text)(modul, modul.exports);
const { zeitungsBild, ZEITUNGS_ARTEN } = modul.exports;
const source = fs.readFileSync(path.resolve(root, '..', 'engine', 'src', 'zeitung.ts'), 'utf8');
const ausEngine = [...new Set([...source.matchAll(/^\s*\['([a-z_]+)',/gm)].map((m) => m[1]).concat('interview'))];
const fehlend = ausEngine.filter((a) => !ZEITUNGS_ARTEN.includes(a));
if (fehlend.length) throw new Error('Fehlende Zeitungsartikelmotive: ' + fehlend.join(', '));
const bilder = ZEITUNGS_ARTEN.map((art, i) => {
  const svg = zeitungsBild(art, 'haus', i + 1);
  if (!svg.includes('viewBox="0 0 420 260"') ||
    !svg.includes('<title>') || !svg.includes('aria-label="Isometrische Illustration zu ') ||
    !svg.endsWith('</svg>')) throw new Error('Ungültige SVG-Illustration: ' + art);
  if (svg.includes('<image') || svg.includes('<script') || svg.includes('http://') ||
    svg.includes('https://')) throw new Error('Fremdinhalt im Motiv: ' + art);
  return svg;
});
if (new Set(bilder).size !== bilder.length) {
  throw new Error('Nicht alle Artikelarten haben eine eigenständige Illustration.');
}
const ui = fs.readFileSync(path.join(root, 'src', 'ui', 'zeitung.js'), 'utf8');
if (!ui.includes("zeitungsBild(a.art, a.bild, ui.index)") ||
    !ui.includes("'Wirtschaft', 'Markt', 'Politik', 'Region'")) {
  throw new Error('Die Zeitungsoberfläche verwendet nicht alle Motive und Reiter.');
}
console.log('Q18-Motive: ' + bilder.length + ' SVGs, ' + ausEngine.length +
  ' Artikelarten aus der Engine, keine Fremdbilder, alle Motive vorhanden.');
