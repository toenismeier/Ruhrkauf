// P005: eigener Motivkatalog des zweiten Berliner Premiumhauses am Leipziger Platz.
// Prüfbefehl nach Engine-Export: cd render && node render-katalog.js premium-p005
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { premiumhaus } from '../kit/premium.js';
import haeuser from '../../haeuser.json';

const haus=(id)=>{
 const treffer=haeuser.filter(h=>h.klasse==='premium'&&h.premiumSchluessel===id);
 if(treffer.length!==1)throw new Error('Premiumhaus '+id+' fehlt – zuerst den Engine-Export neu erstellen');
 return treffer[0];
};
const alt=haus('P001'), neu=haus('P005');
const motive=[
 [alt,{status:'offen'},'P001: Kaiserzeitliches Eckpalais als Referenz'],
 [neu,{status:'offen'},'P005: Berliner Platzfront, gestaffelte Attika'],
 [neu,{status:'umbau',zusatz:['neueroeffnung']},'P005: Umbau und Neueröffnung'],
 [neu,{status:'offen',verkaufsprozess:true,investor:'Family Office Merian'},'P005: Exklusiver Verkaufsprozess'],
];
const eintraege=motive.map(([h,opt,titel])=>({
 titel,
 bau(S,scene) {
  const r=premiumhaus(S,scene,h,opt);
  if(r.teile<4000||r.teile>9000)throw new Error('Bauteilbudget verletzt: '+h.premiumSchluessel+' / '+r.teile);
  sockel(S,0,0,r.w,r.d,6);
  this.unter=h.name+' · '+r.teile+' Teile · '+h.premiumSchluessel;
  return new THREE.Box3(new THREE.Vector3(-7,0,-7),new THREE.Vector3(r.w+7,r.hoehe+4,r.d+7));
 }
}));
zeigeKatalog(eintraege,{titel:'Berliner Premiumhäuser: P005 am Leipziger Platz',spalten:2,kachel:[760,680]});
