// Schneller Node-Smoketest für die deterministische Planlogik.
// Ausführen: cd render && node tests/ladenbau-smoke.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const aus=path.join(__dirname,'..','out','.ladenbau-smoke-bundle.cjs');
fs.mkdirSync(path.dirname(aus),{recursive:true});
esbuild.buildSync({
 entryPoints:[path.join(__dirname,'..','src','kit','ladenplan.js')],
 bundle:true,platform:'node',format:'cjs',outfile:aus,logLevel:'silent'
});
const {ladenplan}=require(aus);
const checkAus=path.join(__dirname,'..','out','.ladenbau-pruefung-bundle.cjs');
esbuild.buildSync({
 entryPoints:[path.join(__dirname,'..','src','kit','ladenbau-pruefung.js')],
 bundle:true,platform:'node',format:'cjs',outfile:checkAus,logLevel:'silent'
});
const {pruefeLadenplan}=require(checkAus);
const abteilungen=['sportschuhe','sporttextil','outdoor','rad','wintersport','teamsport']
 .map((art,i)=>({art,qm:400+i*75}));
for(const [breite,tiefe] of [[30,30],[45,40],[55,40],[75,55]]){
 const e={breite,tiefe,eingang:{x:breite/2,z:tiefe}};
 const a=ladenplan(e,'sport',abteilungen,37),b=ladenplan(e,'sport',abteilungen,37);
 assert.deepEqual(a,b,'Seed muss deterministisch sein');
 assert.equal(a.abteilungen.length,abteilungen.length,'jede Abteilung genau einmal');
 assert.equal(new Set(a.abteilungen.map(x=>x.id)).size,abteilungen.length);
 assert.ok(a.moebel.some(x=>x.typ==='kasse'),'Kasse vorhanden');
 const q=pruefeLadenplan(a);
 assert.equal(q.fehler.filter(x=>/^(Drehung|Geometrie|Anschluss)/.test(x)).length,0,q.fehler.join('\n'));
 const mut=structuredClone(a);mut.moebel[0].winkel=45;
 assert.ok(pruefeLadenplan(mut).fehler.some(x=>x.startsWith('Drehung')),'Drehungsschutz');
 console.log(breite+'×'+tiefe+' m: '+a.moebel.length+' Möbel, '+q.fehler.length+' derzeitige Plan-Regelverstöße');
}
console.log('ladenbau-smoke: Schnittstelle, Determinismus, eindeutige Abteilungen und Prüfreaktionen OK');
