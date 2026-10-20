import { zeigeKatalog } from '../kit/katalog.js';
import { ALLE_MOEBEL } from '../kit/moebel/index.js';
import { moebelKachel } from '../kit/moebel/katalog-hilfe.js';
const katalog = ALLE_MOEBEL.filter(m=>m.bereich==='sport');
zeigeKatalog(katalog.map((m,i)=>moebelKachel(m,100+i)),{titel:'Ladenbau | Hartwig Sport | Möbelbibliothek',spalten:4,kachel:[430,390],rand:1.13});
