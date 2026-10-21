// O08 Umbau – dieselbe Etage in drei Möbelgenerationen und Vorher/Nachher am Haus.
import { THREE, rng } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { vorbereiten, lokal } from '../kit/innen.js';
import { MOEBEL } from '../kit/moebel/index.js';
import { baueMoebelGeneration } from '../kit/moebel/generationen.js';
import { warenhaus } from '../kit/warenhaus.js';
import haeuser from '../../haeuser.json';
const basis=haeuser.find(h=>h.format==='warenhaus' && h.etagen.length>=3)??haeuser[0];
const teile=[];
for(const gen of [1,2,3])teile.push({
  titel:'Möbelgeneration '+gen,
  unter:gen===1?'90er Jahre · Holz, Messing, Beige':gen===2?'2000er · Grau und Chrom':'Aktuell · helle Materialien und Akzente',
  bau(S,scene) {
    vorbereiten(S,scene);
    S.box(22,0.15,14,0,-0.12,7,'#e9e5de');
    const ids=['alt_holz_regal','alt_damen_haengung','alt_schuh_klassik','alt_haushalt'];
    ids.forEach((id,i)=>baueMoebelGeneration(MOEBEL[id],lokal(S,(i-1.5)*5,0,1,0),rng(81+i),0.8,{seed:81+i},gen));
    return new THREE.Box3(new THREE.Vector3(-12,-0.3,-1),new THREE.Vector3(12,4,15));
  },
});
for(const [name,sub,zustand,substanz] of [
  ['Vorher · alte Fassade','Patina, Ausstattung vor Modernisierung','offen',Math.min(35,basis.substanz??40)],
  ['Nachher · Komplettumbau','Substanz 90, moderne Dachklimageräte','offen',90],
])teile.push({
  titel:name,unter:sub,
  bau(S,scene) {
    const h={...basis,substanz};
    const res=warenhaus(S,scene,h,{x:0,z:0,status:zustand,passanten:false});
    if(substanz===90) {
      const hoehe=res.hoehe;
      for(let i=0;i<3;i++)S.box(2.4,1.3,2.1,8+i*3,hoehe+0.65,12,'#bfc8d1');
    }
    return new THREE.Box3(new THREE.Vector3(-5,-1,-5),new THREE.Vector3(res.w+12,res.hoehe+8,res.d+12));
  },
});
zeigeKatalog(teile,{titel:'Modernisierung – Möbelgenerationen und Fassaden',spalten:3,kachel:[640,530],rand:1.1});
