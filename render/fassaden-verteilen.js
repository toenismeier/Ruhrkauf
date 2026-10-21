// Fassadenvarianten nach dem Engine-Export verteilen (keine Kopien unter 50 km), siehe src/fassaden-verteilen-inhalt.js.
// Aufruf: node fassaden-verteilen.js
const esbuild = require('esbuild');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const out = path.join(__dirname, 'out', '.fassaden-verteilen.mjs');
esbuild.buildSync({ entryPoints: [path.join(__dirname, 'src', 'fassaden-verteilen-inhalt.js')], bundle: true, platform: 'node', format: 'esm', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
const r = spawnSync(process.execPath, [out, __dirname], { stdio: 'inherit' });
process.exitCode = r.status || 0;
