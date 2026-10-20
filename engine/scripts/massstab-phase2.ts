// Auswertung der Phase-2-Ziele, für lokale Läufe mit installierten Abhängigkeiten.
// Aufruf: npx tsx scripts/massstab-phase2.ts 1,2,3
//        npx tsx scripts/massstab-phase2.ts 1,2,3 --bot
import { neuesSpiel, wocheAbspielen } from '../src';
import { botTief, einkaufStandard } from './bot';
import { UMSATZZIELE_JAHR1 } from '../src/welt';
import type { GameState, Haus, WochenKpi } from '../src/types';

const seeds = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const mitBot = process.argv.includes('--bot');
const wochen = mitBot ? 260 : 52;
const ziel = { warenhaus: UMSATZZIELE_JAHR1.A + UMSATZZIELE_JAHR1.B + UMSATZZIELE_JAHR1.C,
  premium: UMSATZZIELE_JAHR1.premium, sport: UMSATZZIELE_JAHR1.sport };

function gruppe(h: Haus): keyof typeof ziel | undefined {
  if (h.nurDaten) return undefined;
  return h.format === 'sport' ? 'sport' : h.klasse === 'premium' ? 'premium' : 'warenhaus';
}

for (const seed of seeds) {
  if (!Number.isInteger(seed) || seed < 0) throw new Error('Seed muss eine nichtnegative Ganzzahl sein');
  const s: GameState = neuesSpiel(seed);
  const proFormat = { warenhaus: 0, premium: 0, sport: 0 };
  let jahrUmsatz = 0;
  let jahrEbitda = 0;
  let q4Ebitda = 0;
  let summeMs = 0;
  let maximumMs = 0;
  let laufe = 0;
  let maxFreigaben = 0;
  let freigabenSumme = 0;
  let quartalVororderMax = 0;
  for (let i = 0; i < wochen && s.phase !== 'zerschlagen'; i++) {
    if (mitBot) botTief(s);
    else einkaufStandard(s);
    const beginn = process.hrtime.bigint();
    const k: WochenKpi = wocheAbspielen(s);
    const ms = Number(process.hrtime.bigint() - beginn) / 1e6;
    summeMs += ms;
    maximumMs = Math.max(maximumMs, ms);
    laufe++;
    const f = s.einkauf.protokoll.at(-1);
    const freigaben = f?.neu ?? 0;
    maxFreigaben = Math.max(maxFreigaben, freigaben);
    freigabenSumme += freigaben;
    quartalVororderMax = Math.max(quartalVororderMax, f?.neu ?? 0);
    if (i < 52) {
      jahrUmsatz += k.umsatz;
      jahrEbitda += k.ebitda;
      if (i >= 39) q4Ebitda += k.ebitda;
      // Vergleich je Format aus den aktuellen Haus-KPIs (bei Bot-Sanierung
      // können Hauswechsel und Schließungen die Portfolio-Zuordnung ändern).
      for (const h of s.haeuser) {
        const art = gruppe(h);
        if (art && h.kpi?.woche === k.woche) proFormat[art] += h.kpi.umsatz;
      }
    }
  }
  const p = (a: number, z: number) => `${(a / 1e6).toFixed(1)} Mio. € (${(100 * (a / z - 1)).toFixed(1)} %)`;
  const ergebnis = {
    seed, modus: mitBot ? 'Bot C' : 'Ausgangslage/Einkauf Standard',
    woche: s.woche, phase: s.phase, insolvenzen: s.insolvenzenGesamt,
    umsatzJahr1: p(jahrUmsatz, ziel.warenhaus + ziel.premium + ziel.sport),
    umsatzHartwig: p(proFormat.warenhaus, ziel.warenhaus),
    umsatzPremium: p(proFormat.premium, ziel.premium),
    umsatzSport: p(proFormat.sport, ziel.sport),
    ebitdaQuoteJahr1: jahrUmsatz ? (100 * jahrEbitda / jahrUmsatz).toFixed(2) + ' %' : 'keine Daten',
    q4EbitdaMio: (q4Ebitda / 1e6).toFixed(1),
    freigabenWocheMittel: laufe ? (freigabenSumme / laufe).toFixed(1) : '0',
    freigabenWocheMax: maxFreigaben,
    laufzeitWocheMittelMs: laufe ? (summeMs / laufe).toFixed(2) : '0',
    laufzeitWocheMaxMs: maximumMs.toFixed(2),
    botZiel260: mitBot ? s.woche >= 260 && s.phase !== 'zerschlagen' : undefined,
  };
  console.log(JSON.stringify(ergebnis, null, 2));
  // Keine stillschweigende Freigabe auf Basis eines abgebrochenen Laufs.
  if (s.woche < wochen || (mitBot && s.phase === 'zerschlagen')) process.exitCode = 1;
}
