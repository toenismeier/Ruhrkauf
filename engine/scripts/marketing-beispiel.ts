// Schreibt render/marketing-beispiel.json: Ergebnis der Marketingabfragen in Woche 30 von Seed 1 mit Bot C.
import { writeFileSync } from 'fs';
import { join } from 'path';
import { aktionsAuswertung, aktionskalender, crmKampagnen, kanaele, kundenkarte, marketingUebersicht, neuesSpiel, wocheAbspielen } from '../src';
import { botTief } from './bot';

const ziel = process.argv[2] ?? join(__dirname, '..', '..', 'render');
const woche = Number(process.argv[3] ?? 30);
const s = neuesSpiel(1);
for (let i = 0; i < woche && s.phase !== 'zerschlagen'; i++) { botTief(s); wocheAbspielen(s); }
const jahr = s.startJahr + Math.floor(s.woche / 52);
const kal = aktionskalender(s, jahr);
const out = {
  seed: 1, woche: s.woche, bot: 'C (Schutzschirm, tiefe Sanierung)', phase: s.phase,
  marketingUebersicht: marketingUebersicht(s),
  kanaele: kanaele(s),
  kundenkarte: kundenkarte(s),
  crmKampagnen: crmKampagnen(s),
  aktionskalender: kal,
  aktionsAuswertung: Object.fromEntries(kal.eintraege.filter((e) => e.ausgewertet).map((e) => [e.id, aktionsAuswertung(s, e.id)])),
};
writeFileSync(join(ziel, 'marketing-beispiel.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`geschrieben: ${join(ziel, 'marketing-beispiel.json')} (Woche ${s.woche}, ${kal.eintraege.length} Aktionen, ${Object.keys(out.aktionsAuswertung).length} ausgewertet, ${out.crmKampagnen.kampagnen.length} Kampagnen)`);
