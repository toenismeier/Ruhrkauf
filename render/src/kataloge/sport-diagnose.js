// TEMPORÄRER DIAGNOSEKATALOG: Schnittansichten für Abverkauf und 1a-Erlebnisflächen.
// Die Datei wird nach Sichtprüfung wieder entfernt.
import { zeigeKatalog } from '../kit/katalog.js';
import { etage } from '../kit/grundriss.js';
import { familieSport, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const sport = haeuser.filter(h => h.format === 'sport');
const eintraege = [];
for (let fam=1; fam<=6; fam++) {
  const basis = sport.find(h => familieSport(h) === fam && h.etagen.includes(1) && h.flaechen.some(f=>f.etage===1&&f.qm>10))
    ?? sport.find(h => familieSport(h) === fam && h.etagen.includes(1))
    ?? sport.find(h => familieSport(h) === fam);
  const og = basis.etagen.filter(e => e>0).at(-1) ?? 1;
  const f1 = basis.flaechen.some(f=>f.etage===og&&f.qm>10)
    ? basis.flaechen
    : [...basis.flaechen,...basis.flaechen.filter(f=>f.etage===0).map(f=>({...f,etage:og}))];
  const h = {...basis, etagen:[...new Set([...basis.etagen,0,og])].sort((a,b)=>a-b), flaechen:f1};
  eintraege.push({
    titel: `F${fam} ${FAMILIEN_SPORT[fam]} · OBERSTES OG / SALE`,
    hintergrund:'#26313a',
    bau(S,scene) {
      const z={status:'aktion',aktion:'sale',rabatt:0.35};
      const erg=etage(S,scene,h,og,{zustand:z});
      this.unter=`${basis.id} · ${og}. OG · ${erg.anzahl} Teile · ${erg.zonen.length} Abteilungen`;
      return erg.box;
    }
  });
  if (fam!==3 && fam!==4) eintraege.push({
    titel: `F${fam} ${FAMILIEN_SPORT[fam]} · 1A-ERLEBNIS`,
    hintergrund:'#26313a',
    bau(S,scene) {
      const g={...basis,lage:'1a',grundflaecheQm:Math.max(2200,basis.grundflaecheQm)};
      const erg=etage(S,scene,g,0,{ausschnitt:{anker:'eingang'},zustand:{status:'offen'}});
      this.unter=`${basis.id} · EG · ${erg.anzahl} Teile`;
      return erg.box;
    }
  });
}
zeigeKatalog(eintraege,{titel:'Hartwig Sport · Diagnose Innenräume',spalten:2,kachel:[900,740]});
