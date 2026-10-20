// Phase 5: Innenraum aller FUNDUS-Bauformen, geschossweise aufgeschnitten.
import { THREE, sockel } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { innenOutlet, FAMILIEN_OUTLET, familieOutlet } from '../kit/outlet.js';
import haeuser from '../../haeuser-outlet.json';

const muster=[haeuser[0],haeuser[1],haeuser[14]];
const eintraege=[];
for(const h of muster) {
  for(const geschoss of h.etagen.filter(e=>e>=0))eintraege.push({
    titel:'FUNDUS '+h.stadt+' · '+(geschoss?'OG '+geschoss:'EG'),
    hintergrund:'#29323a',
    bau(S,scene) {
      const r=innenOutlet(S,scene,h,{geschosse:[geschoss],innenZustand:'normal'});
      const eb=r.geschosse[0];
      sockel(S,0,0,r.w,r.d,3);
      this.unter=FAMILIEN_OUTLET[familieOutlet(h)]+' · '+r.w+' × '+r.d+
        ' m · '+eb.plan.abteilungen.map(a=>a.titel).join(' / ')+
        ' · '+eb.plan.moebel.length+' Möbel · '+eb.teile+' Teile';
      return new THREE.Box3(new THREE.Vector3(-3,0,-3),
        new THREE.Vector3(r.w+3,r.hoehe+1,r.d+3));
    },
  });
}
zeigeKatalog(eintraege,{titel:'FUNDUS · Phase 5 · alle Bauformen und Geschosse',
  spalten:2,kachel:[920,730]});
