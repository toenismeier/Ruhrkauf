import { baueEintraegeL } from './hilfe-katalog.js';
import { zeigeKatalog } from '../kit/katalog.js';
import * as SB from '../kit/sonderbauten.js';

const NAMEN = { romanisch: 'Romanisch', hallenkirche: 'Gotische Hallenkirche', backsteingotik: 'Backsteingotik', barock: 'Barock', klassizismus: 'Klassizismus', neugotik: 'Neugotischer Dom', nachkrieg: 'Nachkriegsmoderne', kapelle: 'Kapelle' };
const liste = [];
for (const stil of SB.KIRCHEN_STILE) for (const seed of [1, 2, 3]) liste.push([`${NAMEN[stil]} · Seed ${seed}`, 'kirche', { seed, stil, w: 54, d: 24 }, stil === 'neugotik' ? 6000 : 2500]);
// Auswahl über Region und Stadtslot-Maß
for (const [region, seed] of [['nord', 4], ['sued', 5], ['west', 6], ['ost', 7], ['mitte', 8], ['sued', 9]]) liste.push([`Region ${region} · Seed ${seed}`, 'kirche', { seed, region, w: 46, d: 20 }, 2500]);

zeigeKatalog(baueEintraegeL(liste), { titel: 'Kirchenfamilien', spalten: 6, kachel: [400, 400] });
