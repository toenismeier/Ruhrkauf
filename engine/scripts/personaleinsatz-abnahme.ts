// O04 Abnahme: gleiche Seeds und Freigaben, Variante ohne wöchentliche Neuplanung
// gegen volle Personalsteuerung. Bots bleiben unverändert.
import { botTief } from './bot';
import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';

function jahr(seed: number, aktiv: boolean) {
  const s = neuesSpiel(seed);
  s.cash = 10_000_000_000; // Simulation nicht wegen Liquidität vorzeitig beenden
  s.personaleinsatzDeaktiviert = !aktiv;
  let umsatz = 0, ebitda = 0;
  for (let w = 0; w < 52; w++) {
    fuehreAus(s, { typ: 'sammelfreigabe' });
    const k = wocheAbspielen(s);
    umsatz += k.umsatz;
    ebitda += k.ebitda;
  }
  return { umsatz, ebitda };
}
const diff = (a: number, b: number) => a ? (b / a - 1) * 100 : 0;
for (const seed of [1, 2, 3]) {
  const basis = jahr(seed, false), neu = jahr(seed, true);
  console.log('Seed', seed, 'Umsatz', diff(basis.umsatz, neu.umsatz).toFixed(3), '%',
    'EBITDA', diff(basis.ebitda, neu.ebitda).toFixed(3), '%',
    'Grenze maximal ±1 %');
  if (Math.abs(diff(basis.umsatz, neu.umsatz)) > 1 || Math.abs(diff(basis.ebitda, neu.ebitda)) > 1)
    process.exitCode = 1;
}
for (const seed of [1, 2, 3]) {
  const s = neuesSpiel(seed);
  for (let i = 0; i < 260 && s.phase !== 'zerschlagen'; i++) {
    botTief(s);
    wocheAbspielen(s);
  }
  const ok = s.woche === 260 && s.phase !== 'zerschlagen';
  console.log('Bot C', seed, 'Woche', s.woche, 'Phase', s.phase, ok ? 'OK' : 'FEHLER');
  if (!ok) process.exitCode = 1;
}
