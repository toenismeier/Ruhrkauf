// Phase 4: identische Sportetagen vor und nach Umstellung, mit unveränderter Kamera.
import { zeigeKatalog } from '../kit/katalog.js';
import { etage } from '../kit/grundriss.js';
import { familieSport, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const ids=['S002','S029','S041','S024','S017','S012','S011','S026'];
const faelle=[];
for(const id of ids) {
  const h=haeuser.find(x=>x.id===id);
  if(!h)throw new Error('Sporthaus fehlt: '+id);
  const e=h.etagen.includes(0)?0:h.etagen.find(x=>x>=0);
  for(const altbestand of [true,false])faelle.push({
    titel:id+' · '+(altbestand?'Vorher':'Phase 4')+' · '+(e===0?'EG':e+'. OG'),
    hintergrund:'#26313a',
    bau(S,scene) {
      const erg=etage(S,scene,h,e,{altbestand,ausschnitt:false});
      this.unter='F'+familieSport(h)+' '+FAMILIEN_SPORT[familieSport(h)]+
        ' · '+erg.breite+' × '+erg.tiefe+' m · '+erg.anzahl+' Teile'+
        (erg.ladenplan?' · '+erg.ladenplan.moebel.length+' Bibliotheksmöbel':' · Altgeometrie');
      return erg.box;
    },
  });
}
zeigeKatalog(faelle,{titel:'Hartwig Sport · Ladenbau Phase 4 · Vorher / Nachher',spalten:2,kachel:[1000,800]});
