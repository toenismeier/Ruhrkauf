import { neuesSpiel, wocheAbspielen, cockpit } from '../src';
import { mio } from '../src/util';

const seed = Number(process.argv[2] ?? 1);
const wochen = Number(process.argv[3] ?? 104);
const s = neuesSpiel(seed);
console.log(`Start: ${s.haeuser.length} Häuser, Cash ${mio(s.cash)}`);
for (let i = 0; i < wochen && s.phase !== 'zerschlagen'; i++) {
  const k = wocheAbspielen(s);
  if (k.woche % 4 === 0 || s.phase !== 'regulaer') {
    const c = cockpit(s);
    console.log(`W${k.woche} KW${c.kw}/${c.jahr} ${s.phase} Umsatz ${mio(k.umsatz)} RoE ${(k.rohertrag / k.umsatz * 100).toFixed(1)}% Pers ${(k.personal / k.umsatz * 100).toFixed(1)}% Miete ${(k.miete / k.umsatz * 100).toFixed(1)}% EBITDA ${mio(k.ebitda)} Cash ${mio(k.cash)} frei ${mio(k.kreditFrei)} Best ${mio(k.bestand)} KV ${s.stakeholder.kreditversicherer.toFixed(0)} Bank ${s.stakeholder.bank.toFixed(0)}`);
  }
}
for (const m of s.meldungen.filter((m) => m.typ !== 'presse' || true).slice(-25)) console.log(`  [W${m.woche} ${m.typ}] ${m.text}`);
