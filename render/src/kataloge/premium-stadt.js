// Premiumgebäude in den jeweiligen Städten, mit vorhandenem Stadtplan und Slot-Bauer.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { stadtplan } from '../kit/stadtplan.js';
import { baueStadt } from '../kit/stadt.js';
import { stadtDaten } from '../kit/staedte.js';
import { echterBauer } from '../kit/bauer.js';
import { PREMIUM_NAMEN } from '../kit/premium.js';
import { ausschnittBauer } from './_standorte-staedte.js';
const eintraege=[['Berlin','P001'],['Berlin','P005'],['München','P002'],['Hamburg','P003'],['Düsseldorf','P004']].map(([name,id])=>({
 titel:`${name}: ${id} · Premium-1a-Lage`,
 bau(S,scene){
  const st=stadtDaten(name);
  const plan=stadtplan(st.seed,{typ:st.typ,archetyp:st.archetyp,region:st.region,...st.extra,standorte:st.standorte});
  const stand=plan.standorte.find(s=>s.rolle==='premium' && s.name===PREMIUM_NAMEN[id]);
  if(!stand) throw new Error('Premium-Standort fehlt in '+name);
  const p=plan.parzellen.find(p=>p.id===stand.parzelle);
  if(!p) throw new Error('Premium-Parzelle fehlt in '+name);
  const x=p.x+p.w/2,z=p.z+p.d/2,zoom=88;
  const box=new THREE.Box3(new THREE.Vector3(x-zoom,0,z-zoom),new THREE.Vector3(x+zoom,75,z+zoom));
  baueStadt(S,scene,plan,ausschnittBauer(plan,echterBauer(),box,{kachel:[900,950]}));
  this.unter=`${stand.name} · ${plan.parzellen.length} Parzellen`;
  return box;
 }
}));
zeigeKatalog(eintraege,{titel:'Hartwig-Kronjuwelen: städtisches Umfeld',spalten:2,kachel:[900,950]});
