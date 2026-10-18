// Aufruf: node pruef-staedte.js [Stadt,Stadt,…]
// Plant alle Städte aus haeuser.json und prüft: keine überlappenden Parzellen, keine Parzelle auf einer Straße,
// alle Standorte platziert. Für Ost-Städte werden zusätzlich die Ost-Slots gezählt.
const esbuild = require('esbuild');
const path = require('path');
const { execFileSync } = require('child_process');
const aus = path.join(__dirname, 'out', '.pruef-staedte.mjs');
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'src', 'pruef-staedte-inhalt.js')], bundle: true, platform: 'node', format: 'esm', outfile: aus, loader: { '.json': 'json' }, logLevel: 'error' });
process.stdout.write(execFileSync('node', [aus, ...process.argv.slice(2)], { encoding: 'utf8' }));
