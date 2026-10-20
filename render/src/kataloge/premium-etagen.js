import { zeigeKatalog } from '../kit/katalog.js';
import { etage, dach } from '../kit/grundriss.js';
import haeuser from '../../haeuser.json';
const premium=haeuser.filter(h=>h.klasse==='premium');
if(premium.length!==4) throw new Error('Vier Premiumhäuser fehlen');
const eintraege=[];
for(const h of premium){
 const oben=Math.max(...h.etagen);
 for(const nr of [...new Set([h.etagen.includes(-1)?-1:0,0,Math.min(1,oben),oben])]) eintraege.push({
  titel:`${h.name}: ${nr<0?'UG':nr===0?'EG':nr+'. OG'}`,hintergrund:'#26313a',
  bau(S,scene){const r=etage(S,scene,h,nr,{budget:30000});this.unter=`${r.breite} × ${r.tiefe} m · ${r.anzahl} Teile`;return r.box;}
 });
 eintraege.push({titel:`${h.name}: Dach`,hintergrund:'#26313a',
   bau(S,scene){const r=dach(S,scene,h,{});this.unter='Lichthof und Penthouse';return r.box;}});
}
zeigeKatalog(eintraege,{titel:'Hartwig-Kronjuwelen: Etagen und Dächer',spalten:2,kachel:[850,660]});
