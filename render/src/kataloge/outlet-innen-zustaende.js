// Vier planidentische Innenzustände: Warenbestand und Kundenaufkommen verändern sich.
import { THREE, sockel } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { innenOutlet } from '../kit/outlet.js';
import { FUNDUS_INNEN_ZUSTAENDE } from '../kit/ladenbau-outlet.js';
import haeuser from '../../haeuser-outlet.json';

const h=haeuser[0];
const unter={
  normal:'Volle Kleiderstangen · freie Kassenwege',
  schwach:'Lücken und sichtbare Größenschilder',
  ansturm:'Andrang bis zum Hauptgang · Nachschubwagen',
  raeumung:'Fast leere Gestelle · Räumungshinweis',
};
const eintraege=FUNDUS_INNEN_ZUSTAENDE.map(status=>({
  titel:'FUNDUS · '+status.toUpperCase(),hintergrund:'#29323a',
  bau(S,scene) {
    const r=innenOutlet(S,scene,h,{innenZustand:status});
    sockel(S,0,0,r.w,r.d,3);
    this.unter=unter[status]+' · '+r.geschosse[0].plan.moebel.length+' Möbel';
    return new THREE.Box3(new THREE.Vector3(-3,0,-3),
      new THREE.Vector3(r.w+3,r.hoehe+1,r.d+3));
  },
}));
zeigeKatalog(eintraege,{titel:'FUNDUS · Innenzustände',spalten:2,kachel:[920,730]});
