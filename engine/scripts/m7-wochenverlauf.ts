/**
 * M7: echte Wochen-GuV und Liquidität der Ausgangslage je Schwierigkeit.
 *
 * cd engine && npx tsx scripts/m7-wochenverlauf.ts
 * cd engine && npx tsx scripts/m7-wochenverlauf.ts --write-stand
 *
 * Kein Eingriff, kein künstlicher Cash-Zuschuss und keine automatische
 * Einkaufsfreigabe: ausschließlich die Engine-Standardmechanik.
 * --write-stand ersetzt die gekennzeichneten Tabellen in massstab-stand.md.
 * Bei verletzten Zielwerten wird process.exitCode = 1 gesetzt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neuesSpiel, wocheAbspielen } from '../src';
import type { GameState, WochenKpi, SchwierigkeitId } from '../src';
import { botTief } from './bot';
import { GRUPPEN, saisonFaktor } from '../src/daten';

type Messung = {
  k: WochenKpi;
  phase: GameState['phase'];
  insolvenzen: number;
  saison: number;
};
const stufen: SchwierigkeitId[] = ['leicht', 'mittel', 'schwer'];
const ziel = {
  leicht: { mittel: -0.03, minimum: -0.045 },
  mittel: { mittel: -0.04, minimum: -0.06 },
  schwer: { mittel: -0.06, minimum: -0.08 },
} as const;
const fmt = (x: number) => (x / 1_000_000).toFixed(1).replace('.', ',');
const pct = (x: number) => (100 * x).toFixed(2).replace('.', ',') + ' %';
const quote = (k: WochenKpi) => k.umsatz === 0 ? 0 : k.ebitda / k.umsatz;
const quotenMittel = (ks: Messung[]) =>
  ks.reduce((x, y) => x + y.k.ebitda, 0) / Math.max(1, ks.reduce((x, y) => x + y.k.umsatz, 0));
const status = (r: Messung) => `${r.phase}${r.insolvenzen ? ' (Insolvenz)' : ''}`;
const fehler: string[] = [];

function saisonMix(s: GameState): number {
  let sum = 0; let gewichtet = 0;
  for (const [gruppe, u] of Object.entries(s.basisUmsatz)) {
    if (!u) continue;
    sum += u;
    gewichtet += u * saisonFaktor(gruppe as keyof typeof GRUPPEN, s.woche);
  }
  return sum > 0 ? gewichtet / sum : 1;
}

function ohneEingriffe(st: SchwierigkeitId): Messung[] {
  const s = neuesSpiel(1, { schwierigkeit: st });
  const daten: Messung[] = [];
  for (let i = 0; i < 52 && s.phase !== 'zerschlagen'; i++) {
    const saison = saisonMix(s);
    const k = wocheAbspielen(s);
    // Auch nicht endliche KPI-Werte und fehlender Umsatz müssen die Abnahme
    // scheitern lassen: NaN würde numerische Grenzwertvergleiche sonst umgehen.
    for (const [feld, wert] of Object.entries(k)) {
      if (typeof wert === 'number' && !Number.isFinite(wert))
        fehler.push(`${st}: KW ${k.woche + 1} hat ungültigen Wert in ${feld}`);
    }
    if (!(k.umsatz > 0))
      fehler.push(`${st}: KW ${k.woche + 1} hat keinen positiven Umsatz`);
    daten.push({ k, saison, phase: s.phase, insolvenzen: s.insolvenzenGesamt });
  }
  if (daten.length !== 52) fehler.push(`${st}: nur ${daten.length} von 52 Wochen simuliert`);
  if (s.insolvenzenGesamt > 0) fehler.push(`${st}: im ersten Jahr ${s.insolvenzenGesamt} Insolvenzen`);
  const winter = daten.slice(0, 9); // KW 1–9: Januar und Februar
  const q = quotenMittel(winter);
  if (q < ziel[st].mittel - 0.005)
    fehler.push(`${st}: Januar/Februar ${pct(q)} unter Richtwert ${pct(ziel[st].mittel)} (Toleranz 0,5 PP)`);
  for (const r of daten.slice(0, 13)) {
    if (quote(r.k) < ziel[st].minimum)
      fehler.push(`${st}: KW ${r.k.woche + 1} EBITDA-Quote ${pct(quote(r.k))} unter Mindestwert ${pct(ziel[st].minimum)}`);
  }
  if (daten.length > 1 && daten[0].k.ebitda > 0 && daten[1].k.ebitda < 0)
    fehler.push(`${st}: künstlicher Vorzeichenwechsel von positiver KW 1 zu negativer KW 2`);
  return daten;
}

function tabelle(st: SchwierigkeitId, mess: Messung[], laenge: number): string {
  const rows = [
    `### ${st}: KW 1–${laenge} (Seed 1, ohne Eingriffe)`,
    '',
    '| KW | Saisonfaktor | Umsatz Mio. € | Rohertrag Mio. € | Abschriften Mio. € | Personal Mio. € | Miete Mio. € | EBITDA Mio. € | EBITDA-Quote | Liquide Mittel Mio. € | Status |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
  ];
  for (const { k, saison, phase, insolvenzen } of mess.slice(0, laenge)) {
    rows.push(`| ${k.woche + 1} | ${saison.toFixed(3).replace('.', ',')} | ${fmt(k.umsatz)} | ${fmt(k.rohertrag)} | ${fmt(k.abschriften)} | ${fmt(k.personal)} | ${fmt(k.miete)} | ${fmt(k.ebitda)} | ${pct(quote(k))} | ${fmt(k.cash)} | ${status({ k, saison, phase, insolvenzen })} |`);
  }
  rows.push('');
  const e = mess.slice(0, laenge);
  rows.push(`**Summe ${laenge} Wochen:** Umsatz ${fmt(e.reduce((a, b) => a + b.k.umsatz, 0))} Mio. €, EBITDA ${fmt(e.reduce((a, b) => a + b.k.ebitda, 0))} Mio. €, Quote ${pct(quotenMittel(e))}.`);
  return rows.join('\n');
}

function botC(st: SchwierigkeitId, seed: number): string {
  const s = neuesSpiel(seed, { schwierigkeit: st });
  for (let i = 0; i < 260 && s.phase !== 'zerschlagen'; i++) {
    botTief(s);
    wocheAbspielen(s);
  }
  const erfolgreich = s.woche === 260 && s.phase !== 'zerschlagen';
  // Verpflichtende Fünfjahresabnahme: Standardstufe mittel, Seeds 1–3.
  // Leicht/Schwer zusätzlich berichten, aber nicht mit dem Standard-Bot-Tuning verwechseln.
  if (!erfolgreich && st === 'mittel') fehler.push(`Bot C ${st} Seed ${seed}: ${s.phase} nach ${s.woche} Wochen`);
  return `| ${st} | ${seed} | ${s.woche} | ${s.phase} | ${s.insolvenzenGesamt} | ${erfolgreich ? 'ja' : 'NEIN'} |`;
}

const bericht: string[] = [
  '**Messung:** Seed 1, unveränderte Startwelt, kein Spielereingriff. Alle Geldbeträge sind Mio. €, Umsatz und EBITDA aus den tatsächlichen Wochen-KPIs; Abschriften sind bereits im Rohertrag enthalten. Die Saisonfaktoren sind mit der Nachfragebasis gewichtete Werte. Die 52-Wochen-Tabelle enthält nicht die aufsummierten 13-Wochen-Werte, sondern alle Einzelwochen.',
  '',
];
for (const st of stufen) {
  const mess = ohneEingriffe(st);
  bericht.push(tabelle(st, mess, 13), '', tabelle(st, mess, 52), '');
  const winter = mess.slice(0, 9);
  bericht.push(`Januar/Februar ${st}: gewichtete EBITDA-Quote ${pct(quotenMittel(winter))}; schlechteste Q1-Einzelwoche ${pct(Math.min(...mess.slice(0, 13).map((x) => quote(x.k))))}.`, '');
}
bericht.push('### Bot C: 260 Wochen', '', '| Schwierigkeit | Seed | Wochen | Schlussphase | Insolvenzen | 260 Wochen überlebt |', '|---|---:|---:|---|---:|---|');
for (const st of stufen) for (const seed of [1, 2, 3]) bericht.push(botC(st, seed));
bericht.push('', `**Abnahme:** ${fehler.length ? 'NICHT bestanden' : 'Alle M7-Grenzwerte bestanden'}.`);
if (fehler.length) bericht.push(...fehler.map((x) => '- ' + x));

const inhalt = bericht.join('\n') + '\n';
console.log(inhalt);
if (process.argv.includes('--write-stand')) {
  const pfad = resolve(__dirname, '../../auftraege/massstab-stand.md');
  const start = '<!-- M7-WOCHENTABELLEN:START -->';
  const ende = '<!-- M7-WOCHENTABELLEN:ENDE -->';
  const alt = readFileSync(pfad, 'utf8');
  const von = alt.indexOf(start);
  const bis = alt.indexOf(ende);
  if (von < 0 || bis <= von) throw new Error('M7-Tabellenmarker fehlen in massstab-stand.md');
  const neu = alt.slice(0, von + start.length) + '\n\n' + inhalt + '\n' + alt.slice(bis);
  writeFileSync(pfad, neu, 'utf8');
}
if (fehler.length) {
  for (const f of fehler) console.error('M7:', f);
  process.exitCode = 1;
}
