// Lokal: node pruef-premium.js
const esbuild=require('esbuild');
const path=require('path');
const {execFileSync}=require('child_process');
const aus=path.join(__dirname,'out','.pruef-premium.mjs');
esbuild.buildSync({entryPoints:[path.join(__dirname,'src','pruef-premium-inhalt.js')],bundle:true,platform:'node',format:'esm',outfile:aus,loader:{'.json':'json'},logLevel:'error'});
process.stdout.write(execFileSync('node',[aus],{encoding:'utf8',maxBuffer:1<<24}));
