// Aufruf: node pruef-gestaltung.js [Stadt,Stadt,…] [--zoom 80] [--kachel 720x1280] [--rand 1.1]
// Zählt je Stadt die messbaren Verstöße gegen GESTALTUNG.md (ganze Stadt und Nahausschnitt der Einkaufslage):
// Grün in bebauten Blöcken, unbebauter Blockrand, nicht ebenerdige Bauten, Gleis- und Bahnhofsfläche, Wasser und
// Kartenrand im Ausschnitt, Wasserkanten ohne Ufergestaltung, Großbauten im Ausschnitt (innen = im mittleren Bildteil).
const esbuild = require('esbuild');
const path = require('path');
const { execFileSync } = require('child_process');
const aus = path.join(__dirname, 'out', '.pruef-gestaltung.mjs');
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'src', 'pruef-gestaltung-inhalt.js')], bundle: true, platform: 'node', format: 'esm', outfile: aus, loader: { '.json': 'json' }, logLevel: 'error' });
try {
  process.stdout.write(execFileSync('node', [aus, ...process.argv.slice(2)], { encoding: 'utf8', maxBuffer: 1 << 26 }));
} catch (e) {
  // Qualitätsverstöße liefern Exitcode 1. Die Ergebnistabelle darf dabei nicht verloren gehen.
  if (e.stdout) process.stdout.write(e.stdout.toString());
  if (e.stderr) process.stderr.write(e.stderr.toString());
  process.exitCode = e.status || 1;
}
