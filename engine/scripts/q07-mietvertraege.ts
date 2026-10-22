/** Q07-Abnahme durch Claude: 52 Wochen, offene Mietentscheidungen alt gegen Sammelvorlagen neu.
 * Ausführen aus engine/: npx tsx scripts/q07-mietvertraege.ts
 * Der Test verändert keine Spieldatei. Ausgang: Seed 1, mittel, ohne Spieleraktionen.
 */
import { neuesSpiel, wocheAbspielen } from '../src/engine';
import { posteingang } from '../src/abfragen';

const s = neuesSpiel(1);
let vorher = 0, nachher = 0;
const wochen: { woche: number; vorher: number; nachher: number }[] = [];
for (let n = 0; n < 52; n++) {
  wocheAbspielen(s);
  const aktuelle = s.entscheidungen.filter((e) => e.typ === 'mietende' && e.woche === n);
  const gruppen = posteingang(s).handeln.filter((x) => x.typ === 'mietvertraege' && x.woche === n);
  vorher += aktuelle.length;
  nachher += gruppen.length;
  if (aktuelle.length) wochen.push({ woche: n+1, vorher: aktuelle.length, nachher: gruppen.length });
}
console.log(JSON.stringify({
  seed: 1, schwierigkeit: 'mittel', laufzeitWochen: 52, haeuser: s.haeuser.length,
  alteEinzelvorlagen: vorher, neueSammelvorlagen: nachher,
  reduktion: vorher - nachher, wochen, phase: s.phase, cash: s.cash,
}, null, 2));
