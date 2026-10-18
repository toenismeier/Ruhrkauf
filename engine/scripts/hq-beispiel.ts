// Schreibt die Beispieldateien für die Grafik: render/hq-beispiel.json (Start) und render/hq-beispiel-umzug.json (nach HQ-Strategie, Woche 60).
import { writeFileSync } from 'fs';
import { join } from 'path';
import { hqFuerGrafik, neuesSpiel, wocheAbspielen } from '../src';
import { botHq } from './bot';

const ziel = process.argv[2] ?? join(__dirname, '..', '..', 'render');
const start = neuesSpiel(1);
writeFileSync(join(ziel, 'hq-beispiel.json'), JSON.stringify(hqFuerGrafik(start), null, 2) + '\n');
const s = neuesSpiel(1);
for (let i = 0; i < 60 && s.phase !== 'zerschlagen'; i++) { botHq(s); wocheAbspielen(s); }
writeFileSync(join(ziel, 'hq-beispiel-umzug.json'), JSON.stringify(hqFuerGrafik(s), null, 2) + '\n');
console.log(`geschrieben nach ${ziel}: Start und Woche ${s.woche} (${s.hq.gebaeude.map((g) => `${g.name} ${g.stadt}`).join(', ')})`);
