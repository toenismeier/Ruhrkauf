// O07 Haus: deterministischer A/B-Vergleich zu deaktiviertem O07-Mechanismus.
// cd engine && npx tsx scripts/haus-vergleich.ts
import { performance } from 'node:perf_hooks';
import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';
import { STANDARD_SZENARIO } from '../src/welt';

type Messung = { seed: number; an: boolean; umsatz: number; ebitda: number; ms: number; wochen: number };
function simulation(seed: number, an: boolean, massstab = false): Messung {
  const s = neuesSpiel(seed, massstab ? { ...STANDARD_SZENARIO, warenhaeuser: 510, sporthaeuser: 50 } : STANDARD_SZENARIO);
  s.hausbetriebAbnahmeAus = !an;
  s.cash = 5_000_000_000; // Für den Baseline-Vergleich Liquidität neutralisieren.
  let umsatz = 0, ebitda = 0, ms = 0, wochen = 0;
  for (let w = 0; w < 52 && s.phase !== 'zerschlagen'; w++) {
    fuehreAus(s, { typ: 'sammelfreigabe' });
    const start = performance.now();
    const kpi = wocheAbspielen(s);
    ms += performance.now() - start;
    umsatz += kpi.umsatz;
    ebitda += kpi.ebitda;
    wochen++;
  }
  return { seed, an, umsatz, ebitda, ms: ms/Math.max(1,wochen), wochen };
}
const prozent = (a:number,b:number) => Math.abs(a-b)/Math.max(1,Math.abs(b))*100;
// Bis zum Merge von feat/engine-massstab wird die 560-Häuser-Last synthetisch
// mit den zwei auf main verfügbaren Formaten durchgespielt.
const gross = process.argv.includes('--massstab');
const zeilen = [1,2,3].map(seed => {
  const alt = simulation(seed, false, gross);
  const neu = simulation(seed, true, gross);
  return { seed, hauszahl: gross ? 560 : 180, umsatzAbweichungProzent: prozent(neu.umsatz,alt.umsatz),
    ebitdaAbweichungProzent: prozent(neu.ebitda,alt.ebitda), vorherMs: alt.ms, nachherMs: neu.ms,
    mehrMsProWoche: neu.ms - alt.ms, wochenAlt:alt.wochen, wochenNeu:neu.wochen };
});
console.table(zeilen);
if (zeilen.some(x => x.umsatzAbweichungProzent > 1 || x.ebitdaAbweichungProzent > 1))
  throw new Error('O07 Ausgangslage verletzt die ±1%-Grenze.');
if (zeilen.some(x => x.mehrMsProWoche > 10))
  throw new Error('O07 Mehrlaufzeit überschreitet 10 ms je Woche.');
