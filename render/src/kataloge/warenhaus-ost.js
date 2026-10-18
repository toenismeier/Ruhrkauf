// Katalog: Ost-Familien 8 bis 11 (ehemalige DDR-Warenhäuser) in 3 Größen × original/modernisiert, Zustände je Familie,
// dazu alle Warenhäuser aus DDR-Städten (haeuser.json) als Kontaktbogen.
import { zeigeKatalog } from '../kit/katalog.js';
import { FAMILIEN, DDR_STAEDTE, familieVon } from '../kit/warenhaus.js';
import { haus, eintrag } from './_zustaende-hilfe.js';
import haeuser from '../../haeuser.json';

const OST = [8, 9, 10, 11];
const GROESSEN = [['klein', 1972, 2, 1600], ['mittel', 1976, 4, 3200], ['groß', 1981, 6, 5600]];
const eintraege = [];
for (const f of OST) for (const [i, [gr, bj, et, qm]] of GROESSEN.entries()) for (const san of [false, true]) {
  const h = haus(`O${f}${i}`, f === 11 ? 1955 : bj, et, qm, i, { substanz: san ? 80 : 50 });
  eintraege.push(eintrag(`F${f} ${FAMILIEN[f]} · ${gr} · ${san ? 'modernisiert' : 'original'}`, [[h, { familie: f, saniert: san }]], `${et} Et. · ${qm} m² · Var. ${i}`));
}
const MIETER = [{ name: 'Preisfuchs Markt', etage: 0 }, { name: 'MVZ Stadtmitte', etage: 2 }, { name: 'FitWerk 24', etage: 3 }];
const ZST = [['aktion', { aktion: 'sale' }, 'Sale'], ['untermiete', { untermieter: MIETER }, 'Untermiete'], ['raeumung', {}, 'Räumung'], ['leer', {}, 'Leerstand'], ['verfall', {}, 'Verfall'], ['umbau', {}, 'Umbau'], ['abriss', {}, 'Abriss']];
for (const f of OST) for (const [st, extra, titel] of ZST) {
  const h = haus(`Z${f}${st}`, f === 11 ? 1955 : 1978, 4, 3600, 3, { substanz: 55 });
  eintraege.push(eintrag(`F${f} ${FAMILIEN[f]} · ${titel}`, [[h, { familie: f, status: st, ...extra }]]));
}
const ddr = haeuser.filter((h) => h.format === 'warenhaus' && DDR_STAEDTE.includes(h.stadt));
for (const h of ddr) {
  const f = familieVon(h);
  eintraege.push(eintrag(`${h.id} ${h.stadt} · ${h.baujahr} · F${f}`, [[h, {}]], `${h.lage} · Subst. ${h.substanz}`));
}
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Hartwig: Warenhäuser Ost (Familien 8 bis 11)', spalten: 6, kachel: [440, 420] }), 50);
