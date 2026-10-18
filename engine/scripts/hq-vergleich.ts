// Vergleich der HQ-Strategien: gleiche Filialsanierung (Bot D ohne Pauschalkürzung), nur die Zentrale wird unterschiedlich geführt.
// Liquidität ausgeblendet und ohne Zufallsereignisse, damit die HQ-Wirkung nicht im Rauschen untergeht (wie vergleich.ts).
// Aufruf: npx tsx scripts/hq-vergleich.ts [seeds, z. B. 1,2,3]
import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';
import type { GameState } from '../src';
import { botRegulaerBasis, hqStrategie, HQ_AUSBAU, HQ_GUT, HQ_KAHLSCHLAG } from './bot';

const seeds = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const basis = (s: GameState) => botRegulaerBasis(s, false, 0);
const strategien: [string, (s: GameState) => void][] = [
  ['keine', basis],
  ['pauschal 30 %', (s) => { if (s.woche === 0) fuehreAus(s, { typ: 'zentrale', prozent: 0.3 }); basis(s); }],
  ['gut', (s) => { basis(s); hqStrategie(s, HQ_GUT); }],
  ['Kahlschlag', (s) => { basis(s); hqStrategie(s, HQ_KAHLSCHLAG); }],
  ['Ausbau', (s) => { basis(s); hqStrategie(s, HQ_AUSBAU); }],
];
const mio = (x: number) => (x / 1e6).toFixed(1).padStart(6);
type Jahr = { zentrale: number; ebitda: number; sonder: number };
const ergebnis: Record<string, Jahr[]> = {};
const sitz: Record<string, string[]> = {};
for (const seed of seeds) {
  for (const [name, bot] of strategien) {
    const s = neuesSpiel(seed);
    s.prognose = true;
    s.cash = 5e9;
    for (let i = 0; i < 156; i++) { bot(s); s.cash = Math.max(s.cash, 1e9); wocheAbspielen(s); }
    (sitz[name] ??= []).push(s.hq.sitz);
    const jahre = [0, 1, 2].map((j) => {
      const h = s.historie.filter((k) => k.woche >= j * 52 && k.woche < (j + 1) * 52);
      return { zentrale: h.reduce((a, k) => a + k.zentrale, 0), ebitda: h.reduce((a, k) => a + k.ebitda, 0), sonder: h.reduce((a, k) => a + k.sondereffekte, 0) };
    });
    const r = (ergebnis[name] ??= jahre.map(() => ({ zentrale: 0, ebitda: 0, sonder: 0 })));
    jahre.forEach((x, j) => { r[j].zentrale += x.zentrale / seeds.length; r[j].ebitda += x.ebitda / seeds.length; r[j].sonder += x.sonder / seeds.length; });
  }
}
const b = ergebnis.keine;
console.log(`Mittel über Seeds ${seeds.join(', ')} in Mio. €. Δ gegen "keine"; Sonder = Sondereffekte (Abfindungen, Restmieten, Umzug, Herrichtung; auch Filialschließungen, die in allen Strategien gleich sind)`);
console.log('Strategie'.padEnd(14), ...[1, 2, 3].map((j) => `| J${j} Zentrale EBITDA ΔEBITDA ΔSonder `), '| Zentrale J3 vs. keine | Σ Δ(EBITDA+Sonder) J1-3 | Sitz');
for (const [name] of strategien) {
  const r = ergebnis[name];
  const netto = [0, 1, 2].reduce((a, j) => a + r[j].ebitda + r[j].sonder - b[j].ebitda - b[j].sonder, 0);
  console.log(name.padEnd(14), ...[0, 1, 2].map((j) => `| ${mio(r[j].zentrale)}  ${mio(r[j].ebitda)} ${mio(r[j].ebitda - b[j].ebitda)}  ${mio(r[j].sonder - b[j].sonder)} `),
    `| ${String(Math.round((r[2].zentrale / b[2].zentrale - 1) * 100)).padStart(4)} %`, `| ${mio(netto)}`, `| ${sitz[name].join(', ')}`);
}
