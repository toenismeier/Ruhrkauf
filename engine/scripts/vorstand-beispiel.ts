// Schreibt render/vorstand-beispiel.json und render/produkte-beispiel.json: Abfrageergebnisse in Woche 30 von Seed 1 mit Bot C.
import { writeFileSync } from 'fs';
import { join } from 'path';
import { kandidaten, neuesSpiel, produkte, produktKatalog, produktVorschau, trendbericht, vorstandProfil, vorstandUebersicht, wocheAbspielen, RESSORTS } from '../src';
import type { ProduktEntwurf } from '../src';
import { botTief } from './bot';

const ziel = process.argv[2] ?? join(__dirname, '..', '..', 'render');
const woche = Number(process.argv[3] ?? 30);
const s = neuesSpiel(1);
for (let i = 0; i < woche && s.phase !== 'zerschlagen'; i++) { botTief(s); wocheAbspielen(s); }

const vorstand = {
  seed: 1, woche: s.woche, bot: 'C (Schutzschirm, tiefe Sanierung)', phase: s.phase,
  vorstandUebersicht: vorstandUebersicht(s),
  vorstandProfil: Object.fromEntries(RESSORTS.map((r) => [r, vorstandProfil(s, r)])),
  kandidaten: Object.fromEntries(RESSORTS.map((r) => [r, kandidaten(s, r)])),
};
writeFileSync(join(ziel, 'vorstand-beispiel.json'), JSON.stringify(vorstand, null, 1) + '\n');

const t = trendbericht(s);
const reif = t.naechste.gruppen.reif;
const kinder = t.naechste.gruppen.kinder;
const entwuerfe: ProduktEntwurf[] = [
  { marke: 'em1', typ: 'Kaschmirpullover', farbe: reif.farben[0], material: 'Kaschmir', dauer: 12, budgetWoche: 30_000 },
  { marke: 'em1', typ: 'Jeans-Shorts', farbe: reif.out[0], material: 'Denim', dauer: 4, budgetWoche: 5_000 },
  { marke: 'em4', typ: 'Jeans-Shorts', farbe: kinder.farben[0], material: 'Denim', dauer: 12, budgetWoche: 20_000 },
];
const produkteOut = {
  seed: 1, woche: s.woche, bot: 'C (Schutzschirm, tiefe Sanierung)', phase: s.phase,
  produkte: produkte(s),
  produktKatalog: produktKatalog(s),
  trendbericht: t,
  produktVorschau: entwuerfe.map((entwurf) => ({ entwurf, ergebnis: produktVorschau(s, entwurf) })),
};
writeFileSync(join(ziel, 'produkte-beispiel.json'), JSON.stringify(produkteOut, null, 1) + '\n');
console.log(`geschrieben: vorstand-beispiel.json und produkte-beispiel.json (Woche ${s.woche}, ${vorstand.vorstandUebersicht.besetzt} Ressorts besetzt, ${produkteOut.produkte.marken.reduce((a, m) => a + m.produkte.length, 0)} Produkte)`);
