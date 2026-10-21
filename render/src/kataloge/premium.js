// Kontaktbogen der vier einmaligen Luxusfassaden.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { premiumhaus } from '../kit/premium.js';
import haeuser from '../../haeuser.json';
const premium=haeuser.filter(h=>h.klasse==='premium');
if(premium.length!==4) throw new Error('Vier Premiumhäuser fehlen im JSON');
const zustaende=[
  [{status:'offen'},'Regelbetrieb'],
  [{status:'umbau',zusatz:['neueroeffnung']},'Investition / Umbau'],
  [{status:'offen',verkaufsprozess:true,investor:'Family Office Merian'},'Insolvenz / Verkauf'],
];
const eintraege=[];
for(const h of premium) for(const [opt,titel] of zustaende) eintraege.push({
  titel:`${h.name}: ${titel}`,
  bau(S,scene) {
    const e=premiumhaus(S,scene,h,opt);
    if(e.teile<4000||e.teile>9000) throw new Error('Premium-Budget 4.000–9.000 Teile verletzt: '+e.teile);
    sockel(S,0,0,e.w,e.d,6);
    this.unter=`${h.stadt} · ${e.teile} Teile · ${h.premiumSchluessel}`;
    return new THREE.Box3(new THREE.Vector3(-6,0,-6),new THREE.Vector3(e.w+6,e.hoehe+3,e.d+6));
  }
});
zeigeKatalog(eintraege,{titel:'Hartwig-Kronjuwelen: Gebäude und Zustände',spalten:3,kachel:[650,570]});
