// N01: Reproduzierbare Speichermessung der kompletten 560-Häuser-Simulation.
// Aufruf: cd engine && npx tsx scripts/statistik-messung.ts [104]
import { neuesSpiel, wocheAbspielen } from '../src/engine';
import { fuehreAus } from '../src/aktionen';

const wochen = Math.max(1, Number(process.argv[2] ?? 104));
const s = neuesSpiel(1, { warenhaeuser: 420, sporthaeuser: 140, startCash: 10_000_000_000, kreditlinie: 5_000_000_000 });
if (s.haeuser.length !== 560) throw new Error('Erwartet 560 Häuser, erhalten: ' + s.haeuser.length);
for (let i = 0; i < wochen; i++) {
  if (s.phase === 'zerschlagen') throw new Error('Messspiel vorzeitig beendet in Woche ' + i);
  fuehreAus(s, { typ: 'sammelfreigabe' });
  wocheAbspielen(s);
}
const bytes = (x: unknown) => Buffer.byteLength(JSON.stringify(x), 'utf8');
const mit = bytes(s), reihen = s.haeuser.map(h => h.verlauf ?? []);
const sparmodusEingeschaltet = s.statistik?.sparsam ?? false;
const hausBytes = reihen.reduce((sum, x) => sum + bytes(x), 0);
const punkte = reihen.reduce((sum, x) => sum + x.length, 0);
for (const h of s.haeuser) delete h.verlauf;
delete s.statistik;
const ohne = bytes(s);
console.log(JSON.stringify({
  seed: 1, hauser: s.haeuser.length, simulierteWochen: s.woche,
  spielstandMitStatistikBytes: mit, spielstandOhneStatistikBytes: ohne,
  differenzBytes: mit - ohne, hausverlaeufeBytes: hausBytes,
  punkte, punkteProHaus: Math.round(punkte / s.haeuser.length),
  grenzwertUeberschritten: mit > 2_000_000, sparmodusEingeschaltet, sparmodusAktiv: reihen[0]?.length > 0 &&
    reihen[0].filter(x => x.woche > 52 && x.woche < s.woche - 1).every(x => x.woche % 4 === 0),
}, null, 2));
