// FUNDUS: 66 echte, unabhängige Standorte und geometrisch getrennte Slots.
import outlets from '../haeuser-outlet.json';
import { STADTLISTE, stadtDaten } from './kit/staedte.js';
import { stadtplan } from './kit/stadtplan.js';
import { masseOutlet, familieOutlet } from './kit/outlet.js';

const fehler = [];
const pruefe = (ok, s) => { if (!ok) fehler.push(s); };
const ids = new Set(outlets.map((h) => h.id));
pruefe(outlets.length === 66 && ids.size === 66, 'genau 66 eindeutige Filialen');
pruefe(outlets.filter((h) => h.lage === 'rand').length === 46, '46 Außenring-Filialen');
pruefe(outlets.filter((h) => h.lage === 'b').length === 20, '20 Innenstadt-Filialen');
pruefe(new Set(outlets.map((h) => h.stadt)).size === 66, '66 eigenständige FUNDUS-Städte');
pruefe(Object.keys({ 1: 1, 2: 1, 3: 1 }).every((n) => outlets.some((h) => familieOutlet(h) === +n)), 'drei Bauformen');

for (const h of outlets) {
  const m = masseOutlet(h);
  pruefe(m.w > 0 && m.d > 0 && Number.isFinite(m.H), h.id + ' Maße');
  // Nachbesserung: drei Baukörper müssen sich schon über Geschosszahl und Silhouette unterscheiden.
  if (m.familie === 1) pruefe(m.n === 1 && m.H >= 6 && m.H <= 7, h.id + ': Retail-Park-Box 6–7 m');
  if (m.familie === 2) pruefe(m.n === 2 && m.H >= 10 && m.H <= 11, h.id + ': Fachmarkt 10–11 m');
  if (m.familie === 3) pruefe(m.n >= 2 && m.n <= 3 && m.buero >= 1 && m.buero <= 2 && m.H > 11, h.id + ': Geschäftshaus mit Büros');
  pruefe(m.familie === 3 ? m.park === 0 : m.park >= 18, h.id + ': Parken nach Bauform');

  pruefe(h.substanz >= 40 && h.substanz <= 85, h.id + ' Substanz');
  pruefe(h.lage === 'b' ? h.baujahr >= 1965 && h.baujahr <= 1985 : h.baujahr >= 1998 && h.baujahr <= 2016, h.id + ' Baujahr passend zur Bauform');
  pruefe(h.flaechen.length === 7 && h.flaechen.every((f) => f.konzept === 'eigen' && !!f.gruppe), h.id + ': sieben Abteilungsflächen');
  if (h.lage === 'b') {
    // Die alte 20er-Illustration begrenzte Innenstadt-FUNDUS auf 80 % eines
    // Hartwig-Hauses. Im eigenständigen 66er-Netz ist Hartwig kein verlässlicher
    // Flächenvergleich (teils kleinere Hartwig-Standorte).
    pruefe(m.bw * m.bd <= 3200, h.id + ' Innenstadtgrundfläche max. 3.200 qm');
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
