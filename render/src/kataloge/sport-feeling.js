// Hartwig Sport: vier unabhängig wahrnehmbare Zustände je Außenfamilie.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { sporthaus, familieSport, sportGefuehl, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const sport=haeuser.filter(h=>h.format==='sport');
export const sportFeelingFaelle = [];
const ergebnis=[];
for(let fam=1;fam<=6;fam++){
 const basis=sport.find(h=>familieSport(h)===fam&&(h.etagen??[]).some(e=>e>0))
       ?? sport.find(h=>familieSport(h)===fam);
 if(!basis)throw new Error('Familie fehlt: '+fam);
 const etagen=(basis.etagen??[]).filter(e=>e>=0).length>1?basis.etagen:[0,1];
 const haus={...basis, lage:'1a', grundflaecheQm:Math.max(2200,basis.grundflaecheQm), etagen, substanz:75};
 const varianten=[
   {titel:'Normal',haus,zustand:{status:'offen'}},
   {titel:'Abverkauf',haus,zustand:{status:'aktion',aktion:'sale',rabatt:0.35}},
   {titel:'Substanz 25',haus:{...haus,substanz:25},zustand:{status:'offen'}},
   {titel:'Abverkauf + Substanz 25',haus:{...haus,substanz:25},zustand:{status:'aktion',aktion:'sale',rabatt:0.35}},
 ];
 for(const v of varianten)sportFeelingFaelle.push({fam,original: basis.id,...v});
}
let letzteSonne=null;
const eintraege=sportFeelingFaelle.map(f=>({
 titel:`F${f.fam} · ${f.titel}`,unter:'',
 bau(S,scene){
  if(letzteSonne?.shadow.map){letzteSonne.shadow.map.dispose();letzteSonne.shadow.map=null;}
  letzteSonne=scene.userData.sonne;letzteSonne.shadow.mapSize.set(3072,3072);
  const erg=sporthaus(S,scene,f.haus,{familie:f.fam,...f.zustand});
  sockel(S,0,0,erg.w,erg.d,4);
  const z=sportGefuehl(f.haus,f.zustand);
  ergebnis.push({id:f.original,fam:f.fam,fall:f.titel,teile:erg.teile,erlebnis:z.erlebnis,abverkauf:z.abverkauf,matt:z.matt});
  this.unter=`${FAMILIEN_SPORT[f.fam]} · ${f.original} · ${erg.teile} Teile`;
  return new THREE.Box3(new THREE.Vector3(-4,0,-4),new THREE.Vector3(erg.w+4,erg.hoehe,erg.d+4));
 }
}));
setTimeout(()=>{
 zeigeKatalog(eintraege,{titel:'Hartwig Sport · Normal | Sale | Substanz | Beides',spalten:4,kachel:[600,490]});
 console.log('SPORTFEELING_STAT '+JSON.stringify(ergebnis));
},50);
