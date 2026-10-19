// Schreibt render/wettbewerb-beispiel.json mit Momentaufnahmen (Bot C, Seed 1).
import { writeFileSync } from 'fs';
import { join } from 'path';
import { neuesSpiel, wettbewerbFuerGrafik, wettbewerbUebersicht, wocheAbspielen } from '../src';
import { botTief } from './bot';

const ziel = process.argv[2] ?? join(__dirname, '..', '..', 'render');
const s = neuesSpiel(1);
const snapshots: { woche: number; phase: string; staedte: Record<string, { grafik: ReturnType<typeof wettbewerbFuerGrafik>; analyse: ReturnType<typeof wettbewerbUebersicht> }> }[] = [];
const erfassen = () => {
  const staedte = Object.fromEntries([...new Set(s.haeuser.map((h) => h.stadt))].map((stadt) => [
    stadt, { grafik: wettbewerbFuerGrafik(s, stadt), analyse: wettbewerbUebersicht(s, stadt) },
  ]));
  snapshots.push({ woche: s.woche, phase: s.phase, staedte });
};
erfassen();
for (let i = 0; i < 104 && s.phase !== 'zerschlagen'; i++) {
  botTief(s);
  wocheAbspielen(s);
  if (s.woche === 30 || s.woche === 104) erfassen();
}
const path = join(ziel, 'wettbewerb-beispiel.json');
writeFileSync(path, JSON.stringify({ seed: 1, bot: 'C (tiefe Sanierung)', snapshots }, null, 2) + '\n');
console.log('geschrieben: ' + path + ' (' + snapshots.map((x) => x.woche).join(', ') + ')');
