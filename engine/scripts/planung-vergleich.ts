// O06 Kontrollskript: Bot-C-Neutralität, Fünf-Jahres-Überleben und Wochenlaufzeit.
import { performance } from 'node:perf_hooks';
import { neuesSpiel, wocheAbspielen } from '../src';
import { botTief } from './bot';

interface Lauf { seed: number; aus: boolean; dauerMs: number; wochen: number; umsatz: number; ebitda: number; status: string }
function lauf(seed: number, aus: boolean, wochen: number): Lauf {
  const s = neuesSpiel(seed);
  s.planungDeaktiviert = aus; // gleiche Engine, keine operativen Planungseffekte
  let umsatz = 0, ebitda = 0;
  const t0 = performance.now();
  for (let i = 0; i < wochen && s.phase !== 'zerschlagen'; i++) {
    botTief(s);
    const k = wocheAbspielen(s);
    if (i < 52) { umsatz += k.umsatz; ebitda += k.ebitda; }
  }
  return { seed, aus, dauerMs: performance.now() - t0, wochen: s.woche,
    umsatz, ebitda, status: s.phase };
}
const deviation = (ist: number, basis: number) => Math.abs(ist - basis) / Math.max(1, Math.abs(basis));
const wochen = process.argv.includes('--kurz') ? 52 : 260;
let fehler = 0;
for (const seed of [1, 2, 3]) {
  const baseline = lauf(seed, true, wochen), plan = lauf(seed, false, wochen);
  const du = deviation(plan.umsatz, baseline.umsatz), de = deviation(plan.ebitda, baseline.ebitda);
  const extra = (plan.dauerMs - baseline.dauerMs) / Math.max(1, Math.min(plan.wochen, baseline.wochen));
  console.log('Seed', seed, 'Umsatz Y1 Δ', (du * 100).toFixed(2) + '%', 'EBITDA Y1 Δ',
    (de * 100).toFixed(2) + '%', 'Plan Δ ms/Woche', extra.toFixed(2),
    'Bot C', baseline.status, baseline.wochen, '->', plan.status, plan.wochen);
  if (du > 0.01 || de > 0.01 || extra > 10 || plan.status !== baseline.status ||
    (wochen === 260 && (plan.status !== 'regulaer' || plan.wochen !== 260))) fehler++;
}
if (fehler) {
  console.error(fehler + ' Seed(s) liegen außerhalb der Abnahmegrenzen.');
  process.exitCode = 1;
}
