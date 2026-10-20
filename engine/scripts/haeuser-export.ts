/** Synchronisierter Engine-Export für die Grafik.
 * cd engine && npm run export:haeuser
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neuesSpiel, wocheAbspielen } from '../src';
const s=neuesSpiel(1);
for(let i=0;i<3;i++) wocheAbspielen(s);
const grafik=s.haeuser.map(h=>({
  id:h.id,name:h.name,stadt:h.stadt,format:h.format,lage:h.lage,cluster:h.cluster,
  grundflaecheQm:h.grundflaecheQm,etagen:h.etagen,baujahr:h.baujahr,
  fassade:h.fassade,substanz:h.substanz,status:h.status,
  ...(h.klasse==='premium'?{klasse:h.klasse,premiumSchluessel:h.premiumSchluessel,premiumImage:h.premiumImage}:{}),
  flaechen:h.flaechen,kpi:h.kpi,
}));
writeFileSync(resolve(__dirname,'../../render/haeuser.json'),JSON.stringify(grafik,null,2)+'\n');
console.log(grafik.length,'Häuser;',grafik.filter(h=>h.klasse==='premium').length,'Kronjuwelen');
