// FUNDUS: 20 echte, unabhängige Standorte und geometrisch getrennte Slots.
import outlets from '../haeuser-outlet.json';
import haeuser from '../haeuser.json';
import { STADTLISTE, stadtDaten } from './kit/staedte.js';
import { stadtplan } from './kit/stadtplan.js';
import { masseOutlet, familieOutlet } from './kit/outlet.js';

const fehler = [];
const pruefe = (ok, s) => { if (!ok) fehler.push(s); };
const ids = new Set(outlets.map((h) => h.id));
pruefe(outlets.length === 20 && ids.size === 20, 'genau 20 eindeutige Filialen');
pruefe(outlets.filter((h) => h.lage === 'rand').length === 14, '14 Außenring-Filialen');
pruefe(outlets.filter((h) => h.lage === 'b').length === 6, '6 Innenstadt-Filialen');
pruefe(new Set(outlets.map((h) => h.stadt)).size === 20, 'ein FUNDUS-Standort je Stadt');
pruefe(Object.keys({ 1: 1, 2: 1, 3: 1 }).every((n) => outlets.some((h) => familieOutlet(h) === +n)), 'drei Bauformen');

for (const h of outlets) {
  const m = masseOutlet(h);
  pruefe(m.w > 0 && m.d > 0 && Number.isFinite(m.H), h.id + ' Maße');
  pruefe(h.substanz >= 40 && h.substanz <= 85, h.id + ' Substanz');
  pruefe(h.baujahr >= 1998 && h.baujahr <= 2016, h.id + ' Baujahr');
  if (h.lage === 'b') {
    const gr = Math.max(0, ...haeuser.filter((x) => x.stadt === h.stadt && x.format === 'warenhaus').map((x) => x.grundflaecheQm));
    pruefe(m.bw * m.bd <= gr * 0.8 + 0.1, h.id + ' max. 80% Hartwig-Grundfläche');
  }
  const s = stadtDaten(h.stadt);
  pruefe(s?.standorte.filter((x) => x.id === h.id).length === 1, h.id + ' in Stadt-Daten');
}

let stadtFehler = 0;
for (const s of STADTLISTE) {
  try {
    const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
    const inStadt = s.standorte.filter((x) => x.rolle === 'outlet');
    const imPlan = plan.standorte.filter((x) => x.rolle === 'outlet');
    pruefe(inStadt.length === imPlan.length, s.name + ': alle FUNDUS-Standorte platziert');
    for (const h of inStadt) {
      const p = [...plan.parzellen, ...(plan.aussen?.bauten ?? [])].filter((x) => x.standort?.id === h.id);
      pruefe(p.length === 1 && p[0]?.typ === 'slot:outlet', h.id + ': genau eine separate Parzelle');
      if (h.lage === 'rand') pruefe(p[0] && plan.aussen?.bauten.includes(p[0]), h.id + ': im echten Außenring');
      if (h.lage === 'b') pruefe(p[0] && plan.parzellen.includes(p[0]), h.id + ': im Stadtblock');
      if (p.length && h.lage === 'rand') {
        const block = plan.aussen?.bloecke.find((b) => b.id === p[0].block);
        pruefe(block && p[0].x >= block.x && p[0].z >= block.z &&
          p[0].x + p[0].w <= block.x + block.w && p[0].z + p[0].d <= block.z + block.d,
          h.id + ': Außenring-Slot innerhalb Gewerbeblock');
      }
      // Wettbewerber nicht auf derselben Parzelle oder im selben Block.
      const konkurrenz = plan.standorte.filter((x) => x.rolle === 'wettbewerber' && x.art === 'offprice');
      pruefe(!konkurrenz.some((k) => k.parzelle === p[0]?.id || k.block === p[0]?.block), h.id + ': keine direkte Off-Price-Nachbarschaft');
    }
  } catch (e) { stadtFehler++; fehler.push(s.name + ': ' + e.message); }
}
console.log('FUNDUS Standorte:', outlets.length, 'Städte geprüft:', STADTLISTE.length, 'Plan-Abstürze:', stadtFehler, 'Verstöße:', fehler.length);
for (const s of fehler) console.log('FEHL', s);
if (fehler.length) process.exitCode = 1;
