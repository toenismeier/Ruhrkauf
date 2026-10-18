import { neuesSpiel, wocheAbspielen } from '../src';
import { botRegulaer, botTief } from './bot';
const lines = ['umsatz','rohertrag','abschriften','wkz','personal','miete','nebenkosten','sonstige','logistik','zentrale','marketing','beratung','ebitda','sondereffekte','offeneHaeuser','fte'];
function lauf(bot?: (s: any) => void) {
  const s = neuesSpiel(1); s.cash = 5e9;
  const sum: Record<string, number> = {};
  for (let i = 0; i < 104; i++) { bot?.(s); s.cash = Math.max(s.cash, 1e9); const k: any = wocheAbspielen(s); if (i >= 52) for (const l of lines) sum[l] = (sum[l] ?? 0) + k[l]; }
  return { sum, s };
}
const a = lauf(), b = lauf(botRegulaer), c = lauf(botTief);
console.log('Jahr 2'.padEnd(14), 'ohne'.padStart(9), 'regulär'.padStart(9), 'tief'.padStart(9));
for (const l of lines) console.log(l.padEnd(14), ...[a, b, c].map((x) => (l === 'offeneHaeuser' || l === 'fte' ? (x.sum[l] / 52).toFixed(0) : (x.sum[l] / 1e6).toFixed(1)).padStart(9)));
console.log('Tarif', b.s.tarif, c.s.tarif, 'BR', b.s.stakeholder.betriebsrat.toFixed(0), 'Image', a.s.stakeholder.image.toFixed(0), b.s.stakeholder.image.toFixed(0), c.s.stakeholder.image.toFixed(0));
