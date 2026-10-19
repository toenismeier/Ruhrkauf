import { zeigeKatalog } from '../kit/katalog.js';
import { ALLE_MOEBEL } from '../kit/moebel/index.js';
import { moebelKachel } from '../kit/moebel/katalog-hilfe.js';
const katalog = ALLE_MOEBEL.filter(m=>m.bereich==='allgemein');
zeigeKatalog(katalog.map((m,i)=>moebelKachel(m,300+i)),{titel:'Ladenbau | Kaufhaus und Schwesterkette | Möbelbibliothek',spalten:4,kachel:[440,405],rand:1.13});
