// Aufruf: cd render && node pruef-outlet.js
// Bündelt die Daten-/Platzierungsprüfung analog zu pruef-staedte.js.
const esbuild = require('esbuild');
const path = require('path');
const { execFileSync } = require('child_process');
const aus = path.join(__dirname, 'out', '.pruef-outlet.mjs');
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'src', 'pruef-outlet-inhalt.js')], bundle: true, platform: 'node', format: 'esm', outfile: aus, loader: { '.json': 'json' }, logLevel: 'error' });
process.stdout.write(execFileSync('node', [aus], { encoding: 'utf8', maxBuffer: 1 << 24 }));
