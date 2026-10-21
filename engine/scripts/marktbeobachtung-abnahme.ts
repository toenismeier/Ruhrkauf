// Q06: reproduzierbare 52-Wochen-Abnahme mit vollständigen Wochenzahlen.
// Aufruf: cd engine && npx tsx scripts/marktbeobachtung-abnahme.ts
import { neuesSpiel, wocheAbspielen, fuehreAus } from '../src';

type Zeile = { kw: number; roh: number; ohne: number; mit: number; ueberblick: number; einzel: number };
function simulation(): Zeile[] {
  const ohne = neuesSpiel(1), mit = neuesSpiel(1);
  // Eine ausreichend große Liquiditätsreserve hält den A/B-Vergleich ohne Sanierungsentscheidungen konstant.
  ohne.cash = mit.cash = 10_000_000_000;
  const akt = fuehreAus(mit, { typ: 'marktbeobachtungStufe', stufe: 1 });
  if (!akt.ok) throw new Error(akt.text);
  const tab: Zeile[] = [];
  for (let w = 0; w < 52; w++) {
    fuehreAus(ohne, { typ: 'sammelfreigabe' });
    fuehreAus(mit, { typ: 'sammelfreigabe' });
    wocheAbspielen(ohne);
    wocheAbspielen(mit);
    const o = ohne.marktbeobachtung!.verlauf.at(-1)!;
    const m = mit.marktbeobachtung!.verlauf.at(-1)!;
    if (o.woche !== w || m.woche !== w) throw new Error('Fehlende Wochenmeldung in KW ' + (w + 1));
    if (m.einzeln > 1 || m.ueberblick > 1) throw new Error('Meldungsbudget überschritten in KW ' + (w + 1));
    tab.push({ kw: w + 1, roh: o.roh, ohne: o.einzeln + o.ueberblick, mit: m.einzeln + m.ueberblick,
      ueberblick: m.ueberblick, einzel: m.einzeln });
    if (JSON.stringify(ohne.wettbewerber) !== JSON.stringify(mit.wettbewerber)
      || ohne.wettbewerbRng !== mit.wettbewerbRng || ohne.rng !== mit.rng) {
      throw new Error('A/B-Wettbewerbsverlauf unterscheidet sich ab KW ' + (w + 1));
    }
  }
  return tab;
}
const t = simulation();
console.log('Q06 · Seed 1, Schwierigkeit mittel, 52 Wochen, keine Eingriffe außer Saisonfreigaben. Marktbeobachtung mit Stufe 1.');
console.log('| KW | Rohereignisse | Ohne Fachabteilung | Mit Fachabteilung | davon Überblick | davon Einzel |');
console.log('|---:|---:|---:|---:|---:|---:|');
for (const z of t) console.log(`| ${z.kw} | ${z.roh} | ${z.ohne} | ${z.mit} | ${z.ueberblick} | ${z.einzel} |`);
const sum = (f: keyof Zeile) => t.reduce((n, v) => n + v[f], 0);
console.log(`Summe: roh ${sum('roh')}, ohne ${sum('ohne')}, mit ${sum('mit')}, Überblick ${sum('ueberblick')}, Einzel ${sum('einzel')}.`);
console.log(`Mittel je Woche: ohne ${(sum('ohne') / 52).toFixed(2)}, mit ${(sum('mit') / 52).toFixed(2)}. Ziel: mit höchstens 2,00. ${sum('mit') / 52 <= 2 ? 'PASS' : 'FAIL'}`);
