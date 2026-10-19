import { setzeLod } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { ALLE_MOEBEL } from '../kit/moebel/index.js';
import { moebelKachel } from '../kit/moebel/katalog-hilfe.js';
setzeLod('fern');
zeigeKatalog(ALLE_MOEBEL.filter(m=>m.bereich==='sport').slice(0,24).map((m,i)=>moebelKachel(m,100+i)),{titel:'Möbel | Fernstufe (Korpus und Farbe)',spalten:4,kachel:[430,390]});
