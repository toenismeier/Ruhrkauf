// Q02: regressionssichere Prüfung ohne Browser. Aufruf: node tests/q02-qualitaet.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const out = path.join(__dirname, '../out/.q02-tests.cjs');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'q02-qualitaet-inhalt.js')], bundle: true,
  platform: 'node', format: 'cjs', outfile: out, logLevel: 'error',
});
require(out);
