// Diagnose und Abnahme der Premium-Kronjuwelen gegen dieselbe Engine ohne Umwidmung.
// Aufruf: cd engine && npx tsx scripts/premium-kalibrierung.ts
import { neuesSpiel, wocheAbspielen } from '../src';
import { botTief } from './bot';
import type { GameState } from '../src';

const ziele: Record<string, number> = { P001: .11, P002: .11, P003: .09, P004: .06 };
const ids = Object.keys(ziele);
type Kennzahl = { u: number; db: number };
const addiere = (map: Map<string, Kennzahl>, id: string, u: number, db: number) => {
  const k = map.get(id) ?? { u: 0, db: 0 };
  k.u += u; k.db += db; map.set(id, k);
};
const format = (x: number) => (x / 1e6).toFixed(2);
const marge = (x?: Kennzahl) => x && x.u > 0 ? 100 * x.db / x.u : NaN;
const kurz = (s: GameState) => ({
  phase: s.phase, woche: s.woche, br: s.stakeholder.betriebsrat,
  quartal: s.historie.slice(0, 13).reduce((v, k) => v + k.ebitda, 0),
  insolvenz: s.meldungen.filter(m => m.typ === 'insolvenz').slice(-2).map(m => `W${m.woche}: ${m.text}`),
});

let fehler = 0;
for (const seed of [1, 2, 3]) {
  const basis = neuesSpiel(seed, { premiumDeaktiviert: true });
  const premium = neuesSpiel(seed);
  for (const s of [basis, premium]) {
    s.cash = 5_000_000_000;
    s.wettbewerbEreignisseDeaktiviert = true;
  }
  let alt = 0, neu = 0;
  const vorher = new Map<string, Kennzahl>(), nachher = new Map<string, Kennzahl>();
  const idZuHaus = new Map(premium.haeuser.filter(h => h.klasse === 'premium').map(h => [h.premiumSchluessel!, h.id]));
  for (let w = 0; w < 52; w++) {
    alt += wocheAbspielen(basis).umsatz;
    neu += wocheAbspielen(premium).umsatz;
    for (const id of ids) {
      const hausId = idZuHaus.get(id)!;
      const altKpi = basis.haeuser.find(h => h.id === hausId)?.kpi;
      const neuKpi = premium.haeuser.find(h => h.id === hausId)?.kpi;
      if (altKpi) addiere(vorher, id, altKpi.umsatz, altKpi.db);
      if (neuKpi) addiere(nachher, id, neuKpi.umsatz, neuKpi.db);
    }
  }
  const flaechen = premium.haeuser.filter(h => h.klasse === 'premium').map(h => ({
    haus: h.premiumSchluessel, qm: h.flaechen.reduce((sum, f) => sum + f.qm, 0),
    grundflaecheQm: h.grundflaecheQm, geschosse: h.etagen.length,
  }));
  console.log('Normierte Premiumflächen:', JSON.stringify(flaechen));
  const delta = 100 * (neu / alt - 1);
  if (Math.abs(delta) > 1.5) fehler++;
  console.log(`\nSeed ${seed} | Konzernumsatz Jahr 1: Basis ${format(alt)}, Premium ${format(neu)} Mio. EUR; Abweichung ${delta.toFixed(3)} %`);
  console.log('Haus | Umsatz vorher/nachher Mio. EUR | Marge vorher/nachher % | Marge Ziel % | Abweichung Ziel PP');
  for (const id of ids) {
    const b = vorher.get(id), p = nachher.get(id);
    const ziel = ziele[id], ist = marge(p) / 100;
    console.log(`${id} | ${format(b?.u ?? 0)} / ${format(p?.u ?? 0)} | ${marge(b).toFixed(2)} / ${marge(p).toFixed(2)} | ${(100 * ziel).toFixed(0)} | ${(100 * (ist - ziel)).toFixed(2)}`);
    if (!(p && p.u > 0 && Math.abs(ist - ziel) <= .02)) fehler++;
  }
  const u=(id:string)=>nachher.get(id)?.u ?? 0;
  const umsatzfolge = Math.min(u('P001'), u('P002')) > u('P003') && u('P003') > u('P004');
  console.log('Umsatzrangfolge P001 ≈ P002 > P003 > P004:', umsatzfolge ? 'erfüllt' : 'NICHT erfüllt');
  if (!umsatzfolge) fehler++;
  // Nur diese Bot-Läufe verwenden echte Cashflows, Insolvenzplan und Gläubigervoten.
  const kontrollBot = neuesSpiel(seed, { premiumDeaktiviert: true });
  const premiumBot = neuesSpiel(seed);
  for (const [label, s] of [['main-Logik ohne Premium', kontrollBot], ['Premium', premiumBot]] as const) {
    while (s.woche < 260 && s.phase !== 'zerschlagen') {
      botTief(s);
      wocheAbspielen(s);
      if (s.woche === 13 || s.woche === 23) console.log(`  ${label} W${s.woche}: ${JSON.stringify(kurz(s))}`);
    }
    console.log(`  ${label} Ende: ${JSON.stringify(kurz(s))}`);
    if (s === premiumBot && s.woche < 260) {
      fehler++;
      console.log('  Premiumstatus:', s.haeuser.filter(h => h.klasse === 'premium').map(h => `${h.premiumSchluessel}: ${h.status}`).join(', '));
    }
  }
}
if (fehler) {
  console.error('Premium-Abnahme nicht erfüllt:', fehler, 'Verstöße');
  process.exitCode = 1;
}
