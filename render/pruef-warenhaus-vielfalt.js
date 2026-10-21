// Q21: Erst Export der Engine-Häuser, dann node pruef-warenhaus-vielfalt.js.
// Das Prüfmodul wird wie die übrigen Render-Checks per esbuild geladen.
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const aus = path.join(__dirname, 'out', '.pruef-warenhaus-vielfalt.cjs');
fs.mkdirSync(path.dirname(aus), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'src', 'pruef-warenhaus-vielfalt-inhalt.js')],
  bundle: true, platform: 'node', format: 'cjs', outfile: aus,
  loader: { '.json': 'json' }, logLevel: 'error',
});
require(aus);
