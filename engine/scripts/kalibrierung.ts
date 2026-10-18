import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';
// Ausgangslage: der Einkauf gibt jede Woche alle offenen Orders frei (wie bisher ohne Freigabe-Eingang)
const s = neuesSpiel(Number(process.argv[2] ?? 1));
s.cash = 5e9;
const sum: Record<string, number> = {};
const q: number[] = [0, 0, 0, 0];
const dbJahr: Record<string, number> = {};
for (let i = 0; i < 52; i++) {
  fuehreAus(s, { typ: 'sammelfreigabe' });
  const k = wocheAbspielen(s) as any;
  for (const h of s.haeuser) dbJahr[h.id] = (dbJahr[h.id] ?? 0) + (h.kpi?.db ?? 0);
  for (const key of Object.keys(k)) if (!['woche', 'cash', 'kreditFrei', 'bestand', 'offeneHaeuser', 'fte'].includes(key)) sum[key] = (sum[key] ?? 0) + k[key];
  q[Math.floor(i / 13)] += k.ebitda;
}
const u = sum.umsatz;
for (const [k, v] of Object.entries(sum)) console.log(k.padEnd(14), (v / 1e6).toFixed(1).padStart(9), 'Mio', ((v / u) * 100).toFixed(1).padStart(6), '%');
console.log('Quartale EBITDA', q.map((x) => (x / 1e6).toFixed(0)).join(' / '));
const dbs = Object.values(dbJahr).sort((a, b) => a - b);
console.log('Häuser mit negativem Jahres-DB:', dbs.filter((x) => x < 0).length, 'von', dbs.length, '| schlechteste 5:', dbs.slice(0, 5).map((x) => (x / 1e6).toFixed(1)).join(', '), '| beste:', (dbs[dbs.length - 1] / 1e6).toFixed(1), '| Summe neg.:', (dbs.filter((x) => x < 0).reduce((a, b) => a + b, 0) / 1e6).toFixed(0));
console.log('Bestand', (s.bestand.reduce((a, b) => a + b.wert, 0) / 1e6).toFixed(0), 'Mio; KV', s.stakeholder.kreditversicherer.toFixed(0));
