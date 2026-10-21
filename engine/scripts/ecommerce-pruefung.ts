// O09 lokale Abnahme: npx tsx scripts/ecommerce-pruefung.ts
// Referenz: exakt gleiche Simulation, aber ohne E-Commerce-Haken.
import { neuesSpiel, wocheAbspielen } from '../src';
import { botTief } from './bot';
import type { GameState } from '../src';

type Lauf = { umsatz: number; ebitda: number; ms: number; wochen: number; insolvenz: number; ende: string };
function messe(seed: number, ecommerce: boolean, bot: boolean, wochen: number): Lauf {
  const s: GameState = neuesSpiel(seed);
  if (!ecommerce) s.ecommerceDeaktiviert = true;
  if (!bot) s.cash = 2_000_000_000;
  let umsatz = 0, ebitda = 0, zeit = 0, count = 0;
  for (let w = 0; w < wochen && s.phase !== 'zerschlagen'; w++) {
    if (bot) botTief(s);
    const start = performance.now();
    const k = wocheAbspielen(s);
    zeit += performance.now() - start;
    umsatz += k.umsatz;
    ebitda += k.ebitda;
    count++;
  }
  return { umsatz, ebitda, ms: zeit / Math.max(1, count), wochen: count,
    insolvenz: s.insolvenzenGesamt, ende: s.phase };
}
const diff = (vorher: number, nachher: number) => 100 * (nachher - vorher) / Math.max(1, Math.abs(vorher));
let fehler = false;
for (const seed of [1, 2, 3]) {
  const ref = messe(seed, false, false, 52);
  const online = messe(seed, true, false, 52);
  const umsatz = diff(ref.umsatz, online.umsatz);
  const ebitda = diff(ref.ebitda, online.ebitda);
  const dauer = online.ms - ref.ms;
  console.log('Seed', seed, '52 Wochen:',
    'Umsatz Δ', umsatz.toFixed(3) + '%', 'EBITDA Δ', ebitda.toFixed(3) + '%',
    'Laufzeit Δ', dauer.toFixed(2) + ' ms/Woche',
    '(Referenz', ref.ms.toFixed(2) + ', O09', online.ms.toFixed(2) + ')');
  if (Math.abs(umsatz) > 1 || Math.abs(ebitda) > 1 || dauer > 10) fehler = true;
}
for (const seed of [1, 2, 3]) {
  const bot = messe(seed, true, true, 260);
  console.log('Bot C', seed, bot.wochen, 'Wochen, Phase', bot.ende, 'Insolvenzen', bot.insolvenz);
  if (bot.wochen < 260 || bot.ende === 'zerschlagen') fehler = true;
}
if (fehler) {
  console.error('O09 Abnahme nicht bestanden.');
  process.exitCode = 1;
} else {
  console.log('O09 Abnahme bestanden.');
}
