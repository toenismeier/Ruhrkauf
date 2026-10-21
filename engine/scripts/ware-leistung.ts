// O05: lokale Laufzeit-Abnahme (ohne CI), Ausgabe in ms je wocheAbspielen.
// cd engine && npx tsx scripts/ware-leistung.ts
import { neuesSpiel, fuehreAus, wocheAbspielen } from '../src';

for (const seed of [1, 2, 3]) {
  const s = neuesSpiel(seed);
  const laufzeiten: number[] = [];
  for (let i = 0; i < 52 && s.phase !== 'zerschlagen'; i++) {
    fuehreAus(s, { typ: 'sammelfreigabe' });
    const t = process.hrtime.bigint();
    wocheAbspielen(s);
    laufzeiten.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  const gesamt = laufzeiten.reduce((a, b) => a + b, 0);
  const sorted = [...laufzeiten].sort((a, b) => a - b);
  console.log(JSON.stringify({
    seed, wochen: laufzeiten.length,
    mittelMs: +(gesamt / Math.max(1, laufzeiten.length)).toFixed(2),
    medianMs: +(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(2),
    maximumMs: +(sorted.at(-1) ?? 0).toFixed(2),
    umsatz: s.historie.slice(0, 52).reduce((a, k) => a + k.umsatz, 0),
    ebitda: s.historie.slice(0, 52).reduce((a, k) => a + k.ebitda, 0),
    bestand: Math.round(s.bestand.reduce((a, k) => a + k.wert, 0)),
  }));
}
