// Adapter für bestehende Sporthäuser: Außenmaß, Eingang, feste 5-m-Hindernisse und Verkaufsflächen.
import { familieSport, masseSport } from './sporthaus.js';
import { sportRaster } from './sportgrundriss.js';

export function sportLadenEingabe(haus, etage) {
  const fam=familieSport(haus),masse=masseSport(haus,fam),ra=sportRaster(haus,etage);
  const istHindernis=t=>/^(treppe|treppe2|treppe_offen|treppe_holz|rt|rt2|aufzug|lager|wc|werkstatt|werkstatt2|luft|turm)/.test(String(t));
  const hindernisse=[];
  for(let i=0;i<ra.nx;i++)for(let j=0;j<ra.nz;j++){
    const typ=ra.typ[i][j];
    if(istHindernis(typ))hindernisse.push({
      id:typ+'-'+i+'-'+j,typ:String(typ).startsWith('treppe')?'treppe':typ,
      x:i*5,z:j*5,w:5,d:5,
    });
  }
  const abteilungen=(haus.flaechen??[]).filter(f=>f.etage===etage&&f.qm>=10);
  const eingaenge=[{x:Math.min(masse.bw-2.5,Math.max(2.5,ra.gx*5+2.5)),z:masse.bd}];
  return {flaeche:{breite:masse.bw,tiefe:masse.bd,hindernisse,eingaenge},abteilungen,
    familie:fam,etage,id:haus.id};
}
