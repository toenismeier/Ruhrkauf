/**
 * M7 – Ursachenanalyse über alle 52 Kalenderwochen.
 *
 * cd engine
 * npx tsx scripts/m7-jahresdiagnose.ts
 * npx tsx scripts/m7-jahresdiagnose.ts --bot --seed=1
 * npx tsx scripts/m7-jahresdiagnose.ts --verfall   # Kontrolllauf: alte Saison-Freigabevoreinstellung
 * npx tsx scripts/m7-jahresdiagnose.ts --write-stand
 *
 * --write-stand setzt ausschließlich den M7-Jahresdiagnoseblock in
 * auftraege/massstab-stand.md ein. Zahlen werden aus der Simulation berechnet,
 * nicht geschätzt. Abbruchwochen werden ausdrücklich als nicht simuliert markiert.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neuesSpiel, wocheAbspielen } from '../src';
import type { GameState, SchwierigkeitId, WochenKpi } from '../src';
import { botRegulaer } from './bot';

const args = process.argv.slice(2);
const bot = args.includes('--bot');
const seed = Number(args.find((x) => x.startsWith('--seed='))?.slice('--seed='.length) ?? 1);
const stufe = (args.find((x) => x.startsWith('--schwierigkeit='))?.slice('--schwierigkeit='.length) ?? 'mittel') as SchwierigkeitId;
if (!Number.isInteger(seed) || seed < 0 || !['leicht', 'mittel', 'schwer'].includes(stufe)) throw new Error('Ungültiger Seed oder Schwierigkeitsgrad');

const geld = (x: number) => (x / 1_000_000).toFixed(2).replace('.', ',');
const prozent = (x: number) => (100 * x).toFixed(2).replace('.', ',') + ' %';
const summe = (s: GameState, feld: keyof GameState['einkauf']['wgs'][string]['v']): number =>
  Object.values(s.einkauf.wgs).reduce((a, w) => a + (w.v[feld].at(-1) ?? 0), 0);

interface Zeile {
  kw: number; k: WochenKpi; phase: string; cash: number;
  fehl: number; bestand: number; pipeline: number; offen: number;
  verfallWert: number; verfallAnzahl: number; freigaben: number;
}
const s = neuesSpiel(seed, { schwierigkeit: stufe });
// A/B-Isolation des Fehlers aus Stand 37d446a: saisonale Orders verfallen
// ohne Eingriff. Wirtschaft und Portfolio bleiben ansonsten identisch.
if (args.includes('--verfall')) {
  for (const wg of Object.values(s.einkauf.wgs)) wg.st.modus.saison = 'verfall';
}
const zeilen: Zeile[] = [];
for (let i = 0; i < 52; i++) {
  if (s.phase === 'zerschlagen') break;
  if (bot) botRegulaer(s);
  const k = wocheAbspielen(s);
  const p = s.einkauf.protokoll.at(-1);
  zeilen.push({
    kw: i + 1, k, phase: s.phase, cash: s.cash,
    fehl: summe(s, 'f'), bestand: s.bestand.reduce((a, k) => a + k.wert, 0),
    pipeline: s.bestellungen.reduce((a, b) => a + b.wert, 0),
    offen: s.einkauf.freigaben.reduce((a, f) => a + f.wert, 0),
    verfallWert: p?.woche === i ? p.verfallenWert : 0,
    verfallAnzahl: p?.woche === i ? p.verfallen : 0,
    freigaben: s.einkauf.freigaben.length,
  });
}

const titel = `M7 Jahresdiagnose – ${bot ? 'Bot D ohne Insolvenzantrag' : 'ohne Eingriffe'}, ${stufe}, Seed ${seed}${args.includes('--verfall') ? ', Kontrolllauf: Saisonorders verfallen' : ''}`;
const bericht: string[] = [
  `### ${titel}`,
  '',
  'Alle Geldbeträge in Mio. €. Der Rohertrag der GuV ist bereits **nach** Abschriften; zusätzlich wird der Rohertrag **vor** Abschriften ausgewiesen. Fehlumsatz ist der im Einkauf ermittelte entgangene VK-Umsatz. Die Werte stammen aus den tatsächlich berechneten Wochen-KPIs.',
  '',
  '| KW | Umsatz | Rohertrag vor Abschr. | Abschriften | Rohertrag GuV | Personal | Miete | Zentrale | EBITDA | EBITDA-% | Fehlumsatz | Warenbestand EK | Pipeline EK | Offene Freigaben EK | Verfallene Orders EK | Cash | Phase |',
  '|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
];
for (let i = 0; i < 52; i++) {
  const x = zeilen[i];
  if (!x) {
    bericht.push(`| ${i + 1} | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | Nicht simuliert (Spiel beendet) |`);
    continue;
  }
  const k = x.k;
  bericht.push(`| ${x.kw} | ${geld(k.umsatz)} | ${geld(k.rohertrag + k.abschriften)} | ${geld(k.abschriften)} | ${geld(k.rohertrag)} | ${geld(k.personal)} | ${geld(k.miete)} | ${geld(k.zentrale)} | ${geld(k.ebitda)} | ${prozent(k.umsatz ? k.ebitda / k.umsatz : 0)} | ${geld(x.fehl)} | ${geld(x.bestand)} | ${geld(x.pipeline)} | ${geld(x.offen)} | ${geld(x.verfallWert)} | ${geld(x.cash)} | ${x.phase} |`);
}
const vor = zeilen.filter((z) => z.kw >= 26 && z.kw <= 38);
const nach = zeilen.filter((z) => z.kw >= 39 && z.kw <= 52);
const durchschnitt = (xs: Zeile[], fn: (x: Zeile) => number) => xs.length ? xs.reduce((a, b) => a + fn(b), 0) / xs.length : NaN;
const indikator = (label: string, fn: (x: Zeile) => number) =>
  `| ${label} | ${geld(durchschnitt(vor, fn))} | ${geld(durchschnitt(nach, fn))} |`;
bericht.push('', '#### Vorher/Nachher-Vergleich', '',
  '| Durchschnitt pro Woche (Mio. €) | KW 26–38 | KW 39–52 |',
  '|---|---:|---:|',
  indikator('Umsatz', (x) => x.k.umsatz),
  indikator('Rohertrag vor Abschriften', (x) => x.k.rohertrag + x.k.abschriften),
  indikator('Abschriften', (x) => x.k.abschriften),
  indikator('Personal', (x) => x.k.personal),
  indikator('Miete', (x) => x.k.miete),
  indikator('Zentrale', (x) => x.k.zentrale),
  indikator('Entgangener Umsatz', (x) => x.fehl),
  indikator('Warenbestand (EK)', (x) => x.bestand),
  indikator('Verfallene Orders (EK)', (x) => x.verfallWert),
  '',
  `**Status nach ${zeilen.length} Wochen:** ${s.phase}, Insolvenzereignisse ${s.insolvenzenGesamt}. Offene Freigaben ${s.einkauf.freigaben.length}. Summierte im Zeitraum verfallene Orders ${geld(zeilen.reduce((a, x) => a + x.verfallWert, 0))} Mio. €.`,
  '',
  '**Diagnoseregel:** Sinkt der Rohertrag bei weitgehend konstanten Fixkosten, müssen Wareneingang, Orderverfall, Bestand und Fehlumsatz gemeinsam bewertet werden. Ein Saisonfaktorrückgang allein darf nicht als Ursache einer Versorgungslücke interpretiert werden.',
);
const out = bericht.join('\n') + '\n';
console.log(out);
if (args.includes('--write-stand')) {
  const datei = resolve(__dirname, '../../auftraege/massstab-stand.md');
  const START = '<!-- M7-JAHRESDIAGNOSE:START -->';
  const ENDE = '<!-- M7-JAHRESDIAGNOSE:ENDE -->';
  const bisher = readFileSync(datei, 'utf8');
  const beginn = bisher.indexOf(START);
  const schluss = bisher.indexOf(ENDE);
  if (beginn < 0 || schluss <= beginn) throw new Error('Marker M7-JAHRESDIAGNOSE fehlen');
  writeFileSync(datei, bisher.slice(0, beginn + START.length) + '\n\n' + out + '\n' + bisher.slice(schluss));
}
