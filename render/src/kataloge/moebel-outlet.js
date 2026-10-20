import { zeigeKatalog } from '../kit/katalog.js';
import { ALLE_MOEBEL } from '../kit/moebel/index.js';
import { moebelKachel } from '../kit/moebel/katalog-hilfe.js';
const katalog = ALLE_MOEBEL.filter(m=>m.bereich==='outlet');
zeigeKatalog(katalog.map((m,i)=>moebelKachel(m,200+i)),{titel:'Ladenbau | Off-Price | Möbelbibliothek',spalten:3,kachel:[520,445],rand:1.13});
