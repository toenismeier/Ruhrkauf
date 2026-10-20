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
 assert.equal(a.moebel.filter(m=>a.gaenge.some(g=>m.x<g.x+g.w&&m.x+m.w>g.x&&m.z<g.z+g.d&&m.z+m.d>g.z)).length,0,
   'kein Möbel darf in den Gang hineinragen');
 const q=pruefeLadenplan(a);
 assert.equal(q.fehler.filter(x=>/^(Drehung|Geometrie|Anschluss)/.test(x)).length,0,q.fehler.join('\n'));
 const mut=structuredClone(a);mut.moebel[0].winkel=45;
 assert.ok(pruefeLadenplan(mut).fehler.some(x=>x.startsWith('Drehung')),'Drehungsschutz');
 const block=structuredClone(a);
 const gang=block.gaenge[0];
 block.moebel[0].x=gang.x;
 block.moebel[0].z=gang.z+gang.d/2;
 assert.ok(pruefeLadenplan(block).fehler.some(x=>x.includes('blockiert einen Gang')),
   'Gangflächen müssen von allen Möbeltypen frei bleiben');
 // Phase 4: keine Einheitsgondeln und keine fehlenden Abteilungskennzeichen.
 for(const raum of a.abteilungen) {
   const moebel=a.moebel.filter(m=>m.abteilung===raum.id);
   const arten=new Map();
   for(const m of moebel) {
     const id=m.moebelart??m.id;
     arten.set(id,(arten.get(id)??0)+1);
   }
   assert.ok(arten.size>=4,raum.id+': mindestens vier Möbelarten');
   assert.ok([...arten.values()].every(n=>n<=moebel.length*0.4),raum.id+': höchstens 40 % je Möbelart');
   assert.ok(a.boeden.some(f=>f.abteilung===raum.id),raum.id+': eigene Sortimentsbodenfarbe');
 }
 const einheitsgondeln=structuredClone(a);
 for(const m of einheitsgondeln.moebel.filter(m=>m.abteilung===a.abteilungen[0].id))
   m.moebelart='immer_gleich';
 assert.ok(pruefeLadenplan(einheitsgondeln).fehler.some(f=>f.startsWith('Sortimentsmix')),
   'Einheitsgondeln müssen als Fehler erkannt werden');
 assert.deepEqual(q.fehler,[],breite+'×'+tiefe+' m: '+q.fehler.join(' | '));
 console.log(breite+'×'+tiefe+' m: '+a.moebel.length+' Möbel, Dichte '+(100*q.messwerte.dichte).toFixed(1)+' %, größte Leerfläche '+q.messwerte.groessteLeerflaecheM+' m');
}
// Der Produktionsdaten-Regressionscheck ist Teil des Smoke-Tests, nicht nur des CLI-Berichts.
const sportAus=path.join(__dirname,'..','out','.ladenbau-sport-bundle.cjs');
esbuild.buildSync({
 entryPoints:[path.join(__dirname,'..','src','kit','ladenbau-sport.js')],
 bundle:true,platform:'node',format:'cjs',outfile:sportAus,logLevel:'silent'
});
const {sportLadenEingabe}=require(sportAus);
const haeuser=JSON.parse(fs.readFileSync(path.join(__dirname,'..','haeuser.json'),'utf8'));
const sport=haeuser.filter(h=>h.format==='sport'||/^S\d/.test(h.id));
let etagen=0;
for(const haus of sport)for(const etage of haus.etagen.filter(e=>e>=0)){
 const eingabe=sportLadenEingabe(haus,etage);
 const plan=ladenplan(eingabe.flaeche,'sport',eingabe.abteilungen,haus.id+':'+etage);
 const ergebnis=pruefeLadenplan(plan);
 assert.deepEqual(ergebnis.fehler,[],haus.id+' Etage '+etage+': '+ergebnis.fehler.join(' | '));
 assert.ok(ergebnis.messwerte.dichte>=0.35&&ergebnis.messwerte.dichte<=0.5,
   haus.id+' Etage '+etage+': Dichte außerhalb 35–50 %');
 assert.equal(plan.boeden.filter(b=>b.abteilung).length,plan.abteilungen.length,
   haus.id+' Etage '+etage+': Sortimentsböden fehlen');
 for(const raum of plan.abteilungen) {
   const ins=plan.moebel.filter(m=>m.abteilung===raum.id&&m.inszenierung).length+
     (plan.festeInszenierungen??[]).filter(m=>m.abteilung===raum.id).length;
   assert.equal(ins,1,haus.id+' Etage '+etage+' '+raum.id+': genau eine Themenbühne');
   if(raum.id==='sporttextil') {
     const bestand=plan.moebel.filter(m=>m.abteilung===raum.id);
     assert.ok(bestand.some(m=>m.id.includes('_rundstaender_')),
       haus.id+' Etage '+etage+': Rundständer fehlen');
     assert.ok(bestand.some(m=>m.id.includes('_puppen_')),
       haus.id+' Etage '+etage+': Puppengruppen fehlen');
   }
 }

 etagen++;
}
assert.equal(sport.length,50,'vollständige Sporthaus-Stichprobe');
assert.equal(etagen,101,'vollständige Sportetagen-Stichprobe');
console.log('ladenbau-smoke: '+sport.length+' echte Sporthäuser / '+etagen+' Etagen regelkonform; synthetische Fälle deterministisch OK');
