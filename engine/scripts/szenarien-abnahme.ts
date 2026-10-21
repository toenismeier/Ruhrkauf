/** Szenarioabnahme N09: 7 Lagen × 3 Seeds × Bot C / ohne Eingriff.
 * cd engine && npx tsx scripts/szenarien-abnahme.ts
 * Exitcode 1, wenn eine gewertete Lage die Abnahmebedingungen nicht erfüllt.
 */
import { neuesSpiel, szenarioKonfiguration, szenarioZiel, SZENARIEN, wocheAbspielen } from '../src';
import { botTief } from './bot';
import type { SzenarioId } from '../src/szenarien';

const grenzen: Record<SzenarioId, number> = {
  standard: 260, schutzschirm: 12, lockdown: 18, fusion: 156,
  investor: 260, aufbruch: 156, sandkasten: 260,
};
const zeilen: { sz: string; spieler: string; seed: number; wochen: number; ziel: string; phase: string }[] = [];
for (const karte of SZENARIEN) {
  for (const bot of [true, false]) {
    for (const seed of [1, 2, 3]) {
      const s = neuesSpiel(seed, szenarioKonfiguration(karte.id));
      for (let i = 0; i < grenzen[karte.id] && s.phase !== 'zerschlagen'; i++) {
        if (bot) botTief(s);
        wocheAbspielen(s);
        const z = szenarioZiel(s);
        if (z.erreicht || z.gescheitert) break;
      }
      const z = szenarioZiel(s);
      zeilen.push({ sz: karte.id, spieler: bot ? 'Bot C' : 'ohne Eingriff', seed, wochen: s.woche, ziel: z.erreicht ? 'erreicht' : z.gescheitert ? 'verfehlt' : z.wertung ? 'offen' : 'ohne Wertung', phase: s.phase });
    }
  }
}
console.log('| Szenario | Steuerung | Seed | Wochen | Ziel | Phase |');
console.log('|---|---|---:|---:|---|---|');
for (const z of zeilen) console.log('| ' + Object.values(z).join(' | ') + ' |');
let fehler = 0;
for (const karte of SZENARIEN.filter((x) => x.id !== 'sandkasten')) {
  const bots = zeilen.filter((x) => x.sz === karte.id && x.spieler === 'Bot C');
  const ohne = zeilen.filter((x) => x.sz === karte.id && x.spieler === 'ohne Eingriff');
  const ok = bots.some((x) => x.ziel === 'erreicht') && ohne.every((x) => x.ziel !== 'erreicht');
  console.log(karte.id + ': ' + (ok ? 'ABNAHME ERFÜLLT' : 'ABNAHME OFFEN/FEHLGESCHLAGEN'));
  if (!ok) fehler++;
}
if (fehler) {
  console.error(fehler + ' Szenarioabnahmen nicht erfüllt. Parameter oder Bot kalibrieren.');
  process.exitCode = 1;
}
