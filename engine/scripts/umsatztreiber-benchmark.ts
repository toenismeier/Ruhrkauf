// O02 Umsatztreiber: A/B-Laufzeit über 52 Wochen, Seed 1, identische Ausgangslage.
// Aufruf: cd engine && npx tsx scripts/umsatztreiber-benchmark.ts
import { neuesSpiel, wocheAbspielen, fuehreAus } from '../src';

interface Messung { zeitMs: number; umsatz: number; ebitda: number }
function messe(aktiv: boolean): Messung {
  const s = neuesSpiel(1);
  s.treiberErfassungAus = !aktiv;
  s.cash = 5_000_000_000;
  const start = performance.now();
  for (let w = 0; w < 52; w++) {
    fuehreAus(s, { typ: 'sammelfreigabe' });
    wocheAbspielen(s);
  }
  const zeitMs = performance.now() - start;
  return { zeitMs, umsatz: s.historie.reduce((sum, k) => sum + k.umsatz, 0),
    ebitda: s.historie.reduce((sum, k) => sum + k.ebitda, 0) };
}
// Wechselnde Reihenfolge, damit JIT-Warmup nicht vollständig einer Variante zugutekommt.
const laeufe = [false, true, true, false].map((aktiv) => ({ aktiv, ...messe(aktiv) }));
const avg = (aktiv: boolean) => laeufe.filter((x) => x.aktiv === aktiv).reduce((a, x) => a + x.zeitMs, 0) / 2;
const aus = avg(false) / 52, an = avg(true) / 52;
const unveraendert = laeufe.every((m) => m.umsatz === laeufe[0].umsatz && m.ebitda === laeufe[0].ebitda);
console.log(JSON.stringify({ seed: 1, wochen: 52, vorO02MsProWoche: aus,
  mitO02MsProWoche: an, deltaMsProWoche: an - aus, umsatz: laeufe[0].umsatz,
  ebitda: laeufe[0].ebitda, neutral: unveraendert, zeitBudgetEingehalten: an - aus <= 10 }, null, 2));
if (!unveraendert || an - aus > 10) process.exitCode = 1;
