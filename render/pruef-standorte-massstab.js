// Prüft gemischte Standorte, Abstände und Nebenzentren, ohne Browser zu starten.
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const out = path.join(__dirname, 'out', '.pruef-standorte-massstab.mjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'src', 'pruef-standorte-massstab-inhalt.js')], bundle: true, platform: 'node', format: 'esm', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
const r = spawnSync(process.execPath, [out, ...process.argv.slice(2)], { encoding: 'utf8', stdio: 'inherit' });
if (r.error) throw r.error;
process.exitCode = r.status || 0;
