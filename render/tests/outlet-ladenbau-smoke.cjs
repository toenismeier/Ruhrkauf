// Phase 5: FUNDUS – realer Ladenplan aller Verkaufsflächen, ohne Bild-/Browser-Abnahme.
// Ausführen: cd render && node tests/outlet-ladenbau-smoke.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const ziel=path.join(__dirname,'..','out','.outlet-ladenbau-smoke-bundle.cjs');
fs.mkdirSync(path.dirname(ziel),{recursive:true});
esbuild.buildSync({
  stdin:{
    contents:`export { ladenplan } from './src/kit/ladenplan.js';
export { pruefeLadenplan } from './src/kit/ladenbau-pruefung.js';
export { outletLadenEingabe, fundusInnenZustand, FUNDUS_INNEN_ZUSTAENDE } from './src/kit/ladenbau-outlet.js';
export { masseOutlet } from './src/kit/outlet.js';`,
    resolveDir:path.join(__dirname,'..'),sourcefile:'outlet-ladenbau-smoke-entry.js',
    loader:'js',
  },
  bundle:true,platform:'node',format:'cjs',outfile:ziel,logLevel:'silent'
});
const {ladenplan,pruefeLadenplan,outletLadenEingabe,masseOutlet,
  FUNDUS_INNEN_ZUSTAENDE,fundusInnenZustand}=require(ziel);
const haeuser=JSON.parse(fs.readFileSync(path.join(__dirname,'..','haeuser-outlet.json'),'utf8'));
assert.equal(haeuser.length,20,'20 FUNDUS-Filialen im Produktionsstamm');
assert.deepEqual(FUNDUS_INNEN_ZUSTAENDE,['normal','schwach','ansturm','raeumung']);
for(const [eingang,erwartet] of [
  ['offen','normal'],['schwach-bestueckt','schwach'],['neueroeffnung','ansturm'],
  ['raeumung','raeumung'],['leer','raeumung']
])assert.equal(fundusInnenZustand(eingang),erwartet);
let etagen=0,moebel=0,minimum=1,maximum=0,groesste=0;
const formen=new Set();
for(const haus of haeuser){
  const m=masseOutlet(haus);
  formen.add(m.familie);
  const grundrisse=[];
  for(let etage=0;etage<m.n;etage++){
    const eing=outletLadenEingabe(haus,m,etage);
    const seed=haus.id+':'+etage;
    const plan=ladenplan(eing.flaeche,'outlet',eing.abteilungen,seed);
    assert.deepEqual(plan,ladenplan(eing.flaeche,'outlet',eing.abteilungen,seed),
      haus.id+' '+etage+': Seed muss deterministisch sein');
    const q=pruefeLadenplan(plan);
    assert.deepEqual(q.fehler,[],haus.id+' '+etage+': '+q.fehler.join(' | '));
    const ids=plan.abteilungen.map(a=>a.id);
    assert.equal(new Set(ids).size,ids.length,haus.id+': doppelte Abteilungen');
    assert.ok(ids.includes('damen'),haus.id+': Damenabteilung fehlt');
    assert.equal(plan.moebel.filter(x=>x.typ==='kasse').length,1,
      haus.id+': zentrale Kassenzeile genau einmal');
    assert.equal(plan.moebel.filter(x=>x.inszenierung).length,0,
      haus.id+': FUNDUS hat keine Inszenierungsflächen');
    assert.ok(plan.moebel.some(x=>x.id==='outlet_doppelstange'),
      haus.id+': lange Kleiderstangen fehlen');
    assert.ok(plan.moebel.every(x=>!/(wuehl|gitter|palette)/i.test(x.id)),
      haus.id+': verbotene Restpostenmöbel');
    assert.ok(plan.boeden.every(b=>b.typ==='gang'||b.typ==='flaeche'),
      haus.id+': nur Gang und Verkaufsboden');
    const d=q.messwerte.dichte;
    assert.ok(d>=0.35&&d<=0.5,haus.id+': Dichte '+d);
    assert.ok(q.messwerte.groessteLeerflaecheM<=6,
      haus.id+': Leerräume über 6 m');
    grundrisse.push(plan);
    etagen++;moebel+=plan.moebel.length;
    minimum=Math.min(minimum,d);maximum=Math.max(maximum,d);
    groesste=Math.max(groesste,q.messwerte.groessteLeerflaecheM);
  }
  assert.equal(grundrisse.length,m.n);
}
assert.deepEqual([...formen].sort(),[1,2,3],'alle FUNDUS-Bauformen geprüft');
assert.equal(etagen,35,'alle 35 FUNDUS-Verkaufsetagen im aktuellen Stamm geprüft');
console.log('FUNDUS-Ladenbau: '+haeuser.length+' Filialen, '+etagen+
  ' Verkaufsetagen, '+moebel+' Möbel, 0 Verstöße, Dichte '+
  (minimum*100).toFixed(1)+'–'+(maximum*100).toFixed(1)+
  ' %, größte Leerfläche '+groesste.toFixed(2)+' m.');
