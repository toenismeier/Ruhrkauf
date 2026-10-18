// Vergleich der Einkaufsstrategien auf Basis Bot C (Schutzschirm, tiefe Sanierung), echte Liquidität.
// Aufruf: npx tsx scripts/einkauf-vergleich.ts 1,2,3 [jahre]
// Je Strategie Mittel über die Seeds, je Jahr: Umsatz, Rohertragsquote (nach Abschriften), Abschriften, EBITDA,
// Lagerumschlag, Altwarenanteil, NOS-Verfügbarkeit, Fehlmengen, Eigenmarkenanteil; am Ende Phase nach allen Jahren.
import { einkaufUebersicht, neuesSpiel, wocheAbspielen } from '../src';
import type { GameState } from '../src';
import { botEinkaufEigenmarken, botEinkaufKahlschlag, botEinkaufNos, botTief } from './bot';

const seeds = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const jahre = Number(process.argv[3] ?? 3);
const STRATEGIEN: [string, (s: GameState) => void][] = [
  ['Bot C (Standard)', botTief],
  ['NOS-Pflege + Limitdisziplin', botEinkaufNos],
  ['Eigenmarken-Offensive', botEinkaufEigenmarken],
  ['Kahlschlag Limit (ab Woche 26)', botEinkaufKahlschlag],
  ['Kahlschlag Limit (ab Woche 3)', (s) => botEinkaufKahlschlag(s, false, 3)],
];

interface Jahr { umsatz: number; rohertrag: number; abschriften: number; ebitda: number; umschlag: number; alt: number; nos: number; fehl: number; em: number; n: number }

/** Kennzahlen ohne Controlling-Rauschen. */
function exakt(s: GameState) {
  const c = s.controllingStufe;
  s.controllingStufe = 2;
  const k = einkaufUebersicht(s).summe.kennzahlen;
  s.controllingStufe = c;
  return k;
}

function lauf(seed: number, bot: (s: GameState) => void): { jahre: Jahr[]; ende: string } {
  const s = neuesSpiel(seed);
  const out: Jahr[] = [];
  for (let j = 0; j < jahre && s.phase !== 'zerschlagen'; j++) {
    const y: Jahr = { umsatz: 0, rohertrag: 0, abschriften: 0, ebitda: 0, umschlag: 0, alt: 0, nos: 0, fehl: 0, em: 0, n: 0 };
    for (let i = 0; i < 52 && (s.phase as string) !== 'zerschlagen'; i++) {
      bot(s);
      const k = wocheAbspielen(s);
      y.umsatz += k.umsatz; y.rohertrag += k.rohertrag; y.abschriften += k.abschriften; y.ebitda += k.ebitda;
      if (i % 13 === 12) { const e = exakt(s); y.umschlag += e.lagerumschlag13; y.alt += e.altwarenanteil; y.nos += e.nosVerfuegbarkeit; y.fehl += e.entgangenerUmsatz; y.em += e.eigenmarkenAnteil; y.n++; }
    }
    out.push(y);
  }
  return { jahre: out, ende: `${s.phase} W${s.woche}` };
}

const mio = (x: number) => (x / 1e6).toFixed(0).padStart(6);
const pz = (x: number, d = 1) => (x * 100).toFixed(d).padStart(5);
console.log(`Seeds ${seeds.join(', ')}, ${jahre} Jahre, Mittel über Seeds. Werte in Mio. € bzw. %.`);
for (const [name, bot] of STRATEGIEN) {
  const laeufe = seeds.map((x) => lauf(x, bot));
  console.log(`\n${name}  (Ende: ${laeufe.map((l) => l.ende).join(', ')})`);
  console.log('  Jahr  Umsatz  RQ%   Abschr  EBITDA  Umschlag Alt%  NOS%  Fehlm.  EM%');
  for (let j = 0; j < jahre; j++) {
    const ys = laeufe.map((l) => l.jahre[j]).filter((y): y is Jahr => !!y);
    if (!ys.length) continue;
    const m = (f: (y: Jahr) => number) => ys.reduce((a, y) => a + f(y), 0) / ys.length;
    console.log(`  ${j + 1}   ${mio(m((y) => y.umsatz))} ${pz(m((y) => y.rohertrag / y.umsatz))} ${mio(m((y) => y.abschriften))}  ${mio(m((y) => y.ebitda))}   ${m((y) => y.umschlag / y.n).toFixed(2).padStart(5)}  ${pz(m((y) => y.alt / y.n))} ${pz(m((y) => y.nos / y.n))} ${mio(m((y) => y.fehl))}  ${pz(m((y) => y.em / y.n))}`);
  }
}
