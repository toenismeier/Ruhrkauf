// Node-Prüfer: Bounding-Box aus echten Three.js-Geometrien, nicht aus geschätzten Metadaten.
import { THREE, Sammler, rng, setzeLod } from '../basis.js';
import { lokal } from '../innen.js';
import { ALLE_MOEBEL } from './index.js';

const fehler = [];
const gruppe = new Map();
const grenze = {wand:220,gondel:120,insel:260,deko:80,kasse:260,service:260};
const check = (ok, id, txt) => { if(!ok) fehler.push(id+': '+txt); };
const eps = 0.051;
function probe(m, seed, lod='nah') {
  setzeLod(lod);
  try {
    const S = new Sammler();
    m.bau(lokal(S,0,0,0,0),rng(seed),1,{seed,ohneText:true});
    const bb = new THREE.Box3();
    const farben = [], teile = [];
    for(const [f, gs] of S.teile) for(const g of gs) {
      g.computeBoundingBox();bb.union(g.boundingBox);
      const b = g.boundingBox;
      teile.push([f,...b.min.toArray().map(x=>x.toFixed(3)),...b.max.toArray().map(x=>x.toFixed(3))].join('/'));
      farben.push(f);
    }
    check(!bb.isEmpty(),m.id,'ohne Geometrie');
    return {anzahl:S.anzahl, bbox:bb, finger:teile.sort().join(';')};
  } finally { setzeLod('nah'); }
}
for(const m of ALLE_MOEBEL){
  try {
    const a=probe(m,37), b=probe(m,37), f=probe(m,37,'fern');
    const bb=a.bbox, b2=m.rasterB*1.25/2, t=m.rasterT*1.25;
    check(Number.isInteger(m.rasterB)&&Number.isInteger(m.rasterT),m.id,'Raster nicht ganzzahlig');
    check(a.anzahl<=m.budget,m.id,`Budget ${a.anzahl} > ${m.budget}`);
    check(m.budget<=grenze[m.typ],m.id,`Typbudget zu hoch: ${m.budget}`);
    check(bb.min.x >= -b2-eps && bb.max.x <= b2+eps,m.id,`x ${bb.min.x.toFixed(2)}..${bb.max.x.toFixed(2)} statt ±${b2}`);
    check(bb.min.z >= -eps && bb.max.z <= t+eps,m.id,`z ${bb.min.z.toFixed(2)}..${bb.max.z.toFixed(2)} statt 0..${t}`);
    check(bb.min.y >= -eps && bb.max.y <= m.hoehe+eps,m.id,`Höhe ${bb.min.y.toFixed(2)}..${bb.max.y.toFixed(2)} statt 0..${m.hoehe}`);
    check(a.anzahl===b.anzahl && a.finger===b.finger,m.id,'nicht deterministisch');
    check(f.anzahl<a.anzahl && f.anzahl>=1,m.id,`Fernstufe nicht reduziert: ${a.anzahl}/${f.anzahl}`);
    if(m.typ==='wand') check(bb.max.z<=0.65+eps && bb.max.y<=3.05,m.id,'Wandmaß 0,6 m / 3,0 m überschritten');
    if(m.typ==='gondel') check(bb.max.z<=1.25+eps && bb.max.y<=1.45,m.id,'Gondelmaß 1,25 m / 1,4 m überschritten');
    if(m.typ==='insel') check(bb.max.y<=1.55,m.id,'Inselhöhe 1,5 m überschritten');
    const g=gruppe.get(m.bereich)??{anzahl:0,max:0,maxFern:0};
    g.anzahl++;g.max=Math.max(g.max,a.anzahl);g.maxFern=Math.max(g.maxFern,f.anzahl);gruppe.set(m.bereich,g);
  }catch(e){fehler.push(m.id+': '+e.stack);}
}
console.log('Möbelprüfung | Anzahl | max. Teile nah | max. Teile fern');
for (const [name,g] of [...gruppe].sort()) console.log(name.padEnd(14)+String(g.anzahl).padStart(7)+String(g.max).padStart(19)+String(g.maxFern).padStart(18));
for(const e of fehler) console.error('FEHLER '+e);
console.log(`pruef-moebel: ${ALLE_MOEBEL.length} Möbel, ${fehler.length} Fehler`);
if (fehler.length) process.exitCode=1;
