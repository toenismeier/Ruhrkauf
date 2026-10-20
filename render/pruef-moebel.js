// Node-Kompatibilität: ES-Module der Grafik ohne Änderung der bestehenden package.json prüfen.
const esbuild = require('esbuild');
const path = require('node:path');
const fs = require('node:fs');
const aus = path.join(__dirname,'out','.pruef-moebel.cjs');
fs.mkdirSync(path.dirname(aus),{recursive:true});
esbuild.buildSync({entryPoints:[path.join(__dirname,'src','kit','moebel','pruefen.js')],bundle:true,platform:'node',format:'cjs',outfile:aus,logLevel:'error'});
require(aus);
