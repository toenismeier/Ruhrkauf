// Vergleich der Marketingstrategien auf Basis Bot C (Schutzschirm, tiefe Sanierung), echte Liquidität.
// Aufruf: npx tsx scripts/marketing-vergleich.ts 1,2,3 [jahre]
// Je Strategie Mittel über die Seeds, je Jahr: Umsatz, Rohertragsquote, Kassenbons (Frequenz), Image am Jahresende,
// EBITDA, Kartenanteil am Umsatz, Werbung netto, Gewöhnung.
import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';
import type { GameState, SpielerAktion } from '../src';
import { botTief } from './bot';

const tu = (s: GameState, a: SpielerAktion) => fuehreAus(s, a);

/** Kommende Aktionen des laufenden und des nächsten Jahres. */
const kommend = (s: GameState) => s.marketing.aktionen.filter((a) => a.start > s.woche && a.status !== 'abgesagt');

/** Rabattschlacht: zusätzliche Rabattwochen, tiefere Sales, längerer Black Friday (ab Woche `ab`, Standard nach der Gläubigerversammlung). */
export function botRabattschlacht(s: GameState, ab = 26): void {
  botTief(s);
  const w = s.woche;
  if (w < ab) return;
  if (w === ab || w % 52 === 40) {
    for (const a of kommend(s)) {
      if (!a.standard || (a as { _rs?: boolean })._rs) continue;
      (a as { _rs?: boolean })._rs = true;
      if (a.anlass === 'wsv' || a.anlass === 'ssv') tu(s, { typ: 'aktionAendern', id: a.id, rabatt: 0.5 });
      if (a.anlass === 'blackfriday') tu(s, { typ: 'aktionAendern', id: a.id, rabatt: 0.3, wochen: 3 });
      if (a.anlass === 'jubilaeum' || a.anlass === 'beauty' || a.anlass === 'ostern') tu(s, { typ: 'aktionAendern', id: a.id, rabatt: 0.25 });
    }
  }
  // jede sechste Woche ein Wochenende "20 % auf alles", wenn nichts anderes läuft
  if (w % 6 === 0) {
    const frei = !s.marketing.aktionen.some((a) => a.status !== 'abgesagt' && a.start <= w + 1 && a.ende > w + 1 && (a.mechanik === 'rabatt_alles' || a.mechanik === 'reduzierung'));
    if (frei) tu(s, { typ: 'aktionPlanen', name: 'Rabattwochenende 20 % auf alles', mechanik: 'rabatt_alles', rabatt: 0.2, wochen: 1, start: w + 1, sonderwerbung: 600_000 });
  }
}

/** CRM und Karte: Kartenprogramm mit Stufen und doppelten Punkten, App-Relaunch, gezielte Kampagnen; Prospekt kleiner. */
export function botCrmKarte(s: GameState): void {
  botTief(s);
  const w = s.woche;
  if (w === 4) {
    tu(s, { typ: 'kundenkarteSetzen', stufen: true, punkteSatz: 0.0075, datenBudgetWoche: 45_000, anmeldepraemie: 10, anmeldeWochen: 13 });
    tu(s, { typ: 'appSetzen', relaunch: true, appCoupons: true, budgetWoche: 60_000 });
    tu(s, { typ: 'kanalBudget', kanal: 'prospekt', faktor: 0.75 });
    tu(s, { typ: 'kanalBudget', kanal: 'anzeigen', faktor: 0.6 });
    tu(s, { typ: 'kanalBudget', kanal: 'crm', faktor: 1.5 });
    tu(s, { typ: 'crmKampagneAnlegen', name: 'Reaktivierung Inaktive', segment: { typ: 'inaktive' }, kanal: 'mail', angebot: { typ: 'coupon', prozent: 0.15, mindestbon: 40 }, frequenz: 'monatlich' });
    tu(s, { typ: 'crmKampagneAnlegen', name: 'Beauty-Käufer Punkte', segment: { typ: 'affinitaet', gruppe: 'beauty' }, kanal: 'mail', angebot: { typ: 'punkte', faktor: 5 }, frequenz: 'monatlich' });
    tu(s, { typ: 'crmKampagneAnlegen', name: 'Kaufkraft hoch Herbstbrief', segment: { typ: 'kaufkraft', kaufkraft: 'hoch' }, kanal: 'brief', angebot: { typ: 'zugabe', wert: 10 }, frequenz: 'quartal', start: 30 });
  }
  if (w === 21) tu(s, { typ: 'crmKampagneAnlegen', name: 'App-Wochendeal', segment: { typ: 'alle' }, kanal: 'push', angebot: { typ: 'coupon', prozent: 0.1, mindestbon: 30 }, frequenz: 'zweiwoechentlich' });
}

/** Markenaufbau: Budget nicht kürzen, mehr TV, Plakat, Social und Schaufenster, weniger Prospekt; keine Tiefstrabatte. */
export function botMarkenaufbau(s: GameState): void {
  botTief(s);
  const w = s.woche;
  if (w === 3) {
    tu(s, { typ: 'marketingBudget', quote: 0.025 });
    tu(s, { typ: 'kanalBudget', kanal: 'tv', faktor: 2 });
    tu(s, { typ: 'kanalBudget', kanal: 'plakat', faktor: 1.6 });
    tu(s, { typ: 'kanalBudget', kanal: 'social', faktor: 1.8 });
    tu(s, { typ: 'kanalBudget', kanal: 'schaufenster', faktor: 1.3 });
    tu(s, { typ: 'kanalBudget', kanal: 'prospekt', faktor: 0.8 });
  }
  if (w === 4 || w % 52 === 40) {
    for (const a of kommend(s)) {
      if (!a.standard) continue;
      if (a.anlass === 'mwst') tu(s, { typ: 'aktionAbsagen', id: a.id });
      if (a.anlass === 'blackfriday' && a.rabatt > 0.15) tu(s, { typ: 'aktionAendern', id: a.id, rabatt: 0.15 });
      if ((a.anlass === 'wsv' || a.anlass === 'ssv') && a.rabatt > 0.3) tu(s, { typ: 'aktionAendern', id: a.id, rabatt: 0.3 });
    }
  }
}

export const MARKETING_STRATEGIEN: [string, (s: GameState) => void][] = [
  ['Standard (Bot C)', botTief],
  ['Rabattschlacht (ab Woche 26)', (s) => botRabattschlacht(s)],
  ['Rabattschlacht (ab Woche 4)', (s) => botRabattschlacht(s, 4)],
  ['CRM und Karte', botCrmKarte],
  ['Markenaufbau', botMarkenaufbau],
];

interface Jahr { umsatz: number; rohertrag: number; kunden: number; image: number; ebitda: number; karte: number; werbung: number; gew: number }

function lauf(seed: number, bot: (s: GameState) => void, jahre: number): { jahre: Jahr[]; ende: string } {
  const s = neuesSpiel(seed);
  const out: Jahr[] = [];
  for (let j = 0; j < jahre && s.phase !== 'zerschlagen'; j++) {
    const y: Jahr = { umsatz: 0, rohertrag: 0, kunden: 0, image: 0, ebitda: 0, karte: 0, werbung: 0, gew: 0 };
    for (let i = 0; i < 52 && (s.phase as string) !== 'zerschlagen'; i++) {
      bot(s);
      const k = wocheAbspielen(s);
      const v = s.marketing.stand.verlauf[s.marketing.stand.verlauf.length - 1];
      y.umsatz += k.umsatz; y.rohertrag += k.rohertrag; y.ebitda += k.ebitda; y.werbung += v.netto; y.kunden += v.kunden;
    }
    y.image = s.stakeholder.image; y.karte = s.marketing.stand.ist.karte.umsatzAnteil; y.gew = s.marketing.gewoehnung;
    out.push(y);
  }
  return { jahre: out, ende: `${s.phase} W${s.woche}` };
}

if (require.main === module) {
  const seeds = (process.argv[2] ?? '1,2,3').split(',').map(Number);
  const jahre = Number(process.argv[3] ?? 3);
  const mio = (x: number) => (x / 1e6).toFixed(0).padStart(6);
  const pz = (x: number, d = 1) => (x * 100).toFixed(d).padStart(5);
  console.log(`Seeds ${seeds.join(', ')}, ${jahre} Jahre, Mittel über Seeds. Werte in Mio. € bzw. %; Bons in Mio.`);
  for (const [name, bot] of MARKETING_STRATEGIEN) {
    const laeufe = seeds.map((x) => lauf(x, bot, jahre));
    console.log(`\n${name}  (Ende: ${laeufe.map((l) => l.ende).join(', ')})`);
    console.log('  Jahr  Umsatz  RQ%   Bons  Image  EBITDA  Karte%  Werbung  Gewöhnung');
    for (let j = 0; j < jahre; j++) {
      const ys = laeufe.map((l) => l.jahre[j]).filter((y): y is Jahr => !!y);
      if (!ys.length) continue;
      const m = (f: (y: Jahr) => number) => ys.reduce((a, y) => a + f(y), 0) / ys.length;
      console.log(`  ${j + 1}   ${mio(m((y) => y.umsatz))} ${pz(m((y) => y.rohertrag / y.umsatz))} ${mio(m((y) => y.kunden))}  ${m((y) => y.image).toFixed(1).padStart(5)}  ${mio(m((y) => y.ebitda))}  ${pz(m((y) => y.karte))}  ${mio(m((y) => y.werbung))}    ${m((y) => y.gew).toFixed(3)}`);
    }
  }
}
