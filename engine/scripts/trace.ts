import { neuesSpiel, wocheAbspielen } from '../src';
import { botWoche, botTief } from './bot';
import { kvLimit, offeneWarenverbindlichkeiten } from '../src/ware';
import { runwayWochen } from '../src/stakeholder';
const s = neuesSpiel(Number(process.argv[2] ?? 1));
const bot = !process.argv.includes('--ohne');
const f = (x: number) => (x / 1e6).toFixed(0).padStart(5);
for (let i = 0; i < Number(process.argv[3] ?? 30) && s.phase !== 'zerschlagen'; i++) {
  if (bot) (process.argv.includes('--tief') ? botTief : botWoche)(s);
  const lim = kvLimit(s), exp = offeneWarenverbindlichkeiten(s);
  const k = wocheAbspielen(s);
  console.log(`W${String(k.woche).padStart(2)} ${s.phase.slice(0, 4)} U${f(k.umsatz)} E${f(k.ebitda)} S${f(k.sondereffekte)} cash${f(k.cash)} frei${f(k.kreditFrei)} best${f(k.bestand)} lim${f(lim)} exp${f(exp)} pipe${f(s.bestellungen.reduce((a, b) => a + b.wert, 0))} KV${s.stakeholder.kreditversicherer.toFixed(0)} run${runwayWochen(s).toFixed(0)} RL${s.restLieferantenVertrauen.toFixed(0)}`);
}
