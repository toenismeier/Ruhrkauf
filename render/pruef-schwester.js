const esbuild = require('esbuild');
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, '.pruef-schwester.mjs');
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'src', 'pruef-schwester-inhalt.js')], bundle: true, platform: 'node', format: 'esm', outfile: file, loader: { '.json': 'json' }, logLevel: 'error' });
try { process.stdout.write(execFileSync('node', [file], { encoding: 'utf8', maxBuffer: 1 << 23 })); }
catch (e) { if (e.stdout) process.stdout.write(e.stdout); if (e.stderr) process.stderr.write(e.stderr); process.exitCode = 1; }
