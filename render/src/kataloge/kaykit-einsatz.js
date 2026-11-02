// KayKit-Wohnmöbel im Einsatz: Living-Abteilung (drei Seeds, Möbelgeneration 1 und 3) und Zentrale (Lounge, Gesprächsecke, Empfang).
import { zeigeKatalog } from '../kit/katalog.js';
import { abteilungKachel } from '../kit/abteilung.js';
const HG = '#26313a';
const e = [];
for (const seed of [11, 23, 37]) e.push({ titel: 'Living · Seed ' + seed, hintergrund: HG, bau(S, scene) { const b = abteilungKachel(S, scene, 'wohnen', { seed, nx: 3 }); this.unter = S.anzahl + ' Teile, ' + S.teile.size + ' Farben'; return b; } });
zeigeKatalog(e, { titel: 'KayKit im Einsatz', spalten: 3, kachel: [760, 600] });
