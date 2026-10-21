// O04: 52 Wochen A/B-Laufzeit, Seed 1. Testschalter verändert nur die Planberechnung.
// Auf demselben Rechner mehrfach laufen lassen; p95 und Mittel über 52 Wochen ausgeben.
import { performance } from 'node:perf_hooks';
import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';

function lauf(personalAktiv: boolean): number[] {
  const s = neuesSpiel(1);
  s.cash = 10_000_000_000; // Liquiditätsgrenze für den Benchmark ausblenden
  s.personaleinsatzDeaktiviert = !personalAktiv;
  const zeit: number[] = [];
  for (let i = 0; i < 52; i++) {
    fuehreAus(s, { typ: 'sammelfreigabe' });
    const t0 = performance.now();
    wocheAbspielen(s);
    zeit.push(performance.now() - t0);
  }
  return zeit;
}
const mittel = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
const p95 = (arr: number[]) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length * 0.95)];
// Vorlauf für JIT-Warmup; keine Messergebnisse hiervon verwenden.
lauf(false);
lauf(true);
const ohne = lauf(false), mit = lauf(true);
console.log('O04 Personaleinsatz: 52 Wochen, Seed 1');
console.log('ohne: Mittel', mittel(ohne).toFixed(2), 'ms, p95', p95(ohne).toFixed(2), 'ms');
console.log('mit:  Mittel', mittel(mit).toFixed(2), 'ms, p95', p95(mit).toFixed(2), 'ms');
console.log('Delta je Woche:', (mittel(mit) - mittel(ohne)).toFixed(2), 'ms (Grenze +10 ms)');
