// ESM-Module des Grafikbaukastens unter Node ohne Änderung an package.json prüfen.
const esbuild=require('esbuild');
const path=require('path');
const {execFileSync}=require('child_process');
const fs=require('fs');
const out=path.join(__dirname,'out','.pruef-ladenbau.mjs');
fs.mkdirSync(path.dirname(out),{recursive:true});
esbuild.buildSync({
  entryPoints:[path.join(__dirname,'src','pruef-ladenbau-inhalt.js')],
  bundle:true,platform:'node',format:'esm',outfile:out,
  loader:{'.json':'json'},logLevel:'error'
});
try{process.stdout.write(execFileSync(process.execPath,[out,...process.argv.slice(2)],{encoding:'utf8',maxBuffer:16*1024*1024}));}
catch(e){if(e.stdout)process.stdout.write(e.stdout);if(e.stderr)process.stderr.write(e.stderr);process.exitCode=e.status??1;}
