// Schwierigkeitsstufen: Plan-EBITDA der Gläubigerversammlung und Überleben je Bot und Seed.
// Aufruf: npx tsx scripts/schwierigkeit-vergleich.ts [stufen] [seeds] [wochen]
// Beispiel: npx tsx scripts/schwierigkeit-vergleich.ts leicht,mittel,schwer 1,2,3 260
import { neuesSpiel, wocheAbspielen } from '../src';
import type { GameState, SchwierigkeitId } from '../src';
import { botTief, botWoche } from './bot';

const stufen = (process.argv[2] ?? 'leicht,mittel,schwer').split(',') as SchwierigkeitId[];
const seeds = (process.argv[3] ?? '1,2,3').split(',').map(Number);
const wochen = Number(process.argv[4] ?? 260);
const BOTS: [string, (s: GameState) => void][] = [['Bot C', botTief], ['Bot A', botWoche], ['ohne Eingriff', () => undefined]];

for (const st of stufen) {
  for (const [name, bot] of BOTS) {
    const zeilen: string[] = [];
    let ueberlebt = 0;
    for (const seed of seeds) {
      const s = neuesSpiel(seed, { schwierigkeit: st });
      let plan = 'keine Versammlung';
      for (let i = 0; i < wochen && s.phase !== 'zerschlagen'; i++) {
        bot(s); wocheAbspielen(s);
        if (plan === 'keine Versammlung') {
          const m = s.meldungen.find((x) => x.text.startsWith('Integrierte Planung'));
          if (m) plan = `${m.text.replace('Integrierte Planung: EBITDA der nächsten 52 Wochen ', '').replace(' Mio. €.', '')} W${m.woche}`;
        }
      }
      if (s.phase !== 'zerschlagen') ueberlebt++;
      zeilen.push(`${plan} (${s.phase === 'zerschlagen' ? `zerschlagen W${s.woche}` : `läuft W${s.woche}`})`);
    }
    console.log(`${st.padEnd(7)} ${name.padEnd(14)} überlebt ${ueberlebt}/${seeds.length} | ${zeilen.join(' | ')}`);
  }
}
