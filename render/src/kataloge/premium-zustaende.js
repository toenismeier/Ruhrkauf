// Vollständiger Zustandsatlas: vier Premiumhäuser × zwölf Grundzustände sowie Verkäufe.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { premiumhaus } from '../kit/premium.js';
import { STATI } from '../kit/zustaende.js';
import haeuser from '../../haeuser.json';

const haeuserPremium=haeuser.filter(h=>h.klasse==='premium');
if(haeuserPremium.length!==4) throw new Error('Vier Premiumhäuser erforderlich');
const sonder=[
 [{status:'offen',verkaufsprozess:true,investor:'Family Office Merian'},'Exklusiver Verkaufsprozess'],
 [{status:'offen',kaeufer:'Valens Palais',hartwig:false},'Neuer Eigentümer'],
];
const eintraege=[];
for(const h of haeuserPremium){
 for(const status of STATI) eintraege.push({
  titel:h.name+' · '+status,
  bau(S,scene){
   const e=premiumhaus(S,scene,h,{status});
   if(e.teile<4000||e.teile>9000)throw new Error('Premium-Teilebudget verletzt: '+h.premiumSchluessel+' / '+status+' / '+e.teile);
   sockel(S,0,0,e.w,e.d,6);
   this.unter=h.premiumSchluessel+' · '+e.teile+' Teile';
   return new THREE.Box3(new THREE.Vector3(-7,0,-7),new THREE.Vector3(e.w+7,e.hoehe+4,e.d+7));
  }
 });
 for(const [opt,status] of sonder) eintraege.push({
  titel:h.name+' · '+status,
  bau(S,scene){
   const e=premiumhaus(S,scene,h,opt);
   if(e.teile<4000||e.teile>9000)throw new Error('Premium-Teilebudget verletzt: '+h.premiumSchluessel+' / '+status+' / '+e.teile);
   sockel(S,0,0,e.w,e.d,6);
   this.unter=h.premiumSchluessel+' · '+e.teile+' Teile';
   return new THREE.Box3(new THREE.Vector3(-7,0,-7),new THREE.Vector3(e.w+7,e.hoehe+4,e.d+7));
  }
 });
}
zeigeKatalog(eintraege,{titel:'Premiumhäuser: zwölf Grundzustände und Eigentümerwechsel',spalten:4,kachel:[450,450]});
