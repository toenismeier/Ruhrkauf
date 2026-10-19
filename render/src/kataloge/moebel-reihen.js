import { zeigeKatalog } from '../kit/katalog.js';
import { MOEBEL } from '../kit/moebel/index.js';
import { reihenKachel } from '../kit/moebel/katalog-hilfe.js';
const p = (...ids)=>ids.map(id=>MOEBEL[id]);
const katalog = [
 reihenKachel('Sportwand | 20 m',p('sport_schuh_marken','sport_schuh_laufen','sport_schuh_kinder','sport_kartonwand'),'wand'),
 reihenKachel('Outdoor-Wandband | 20 m',p('sport_rucksack','sport_schlafsack','sport_wanderschuh','sport_jacken_outdoor'),'wand'),
 reihenKachel('Wintersport-Wandband | 20 m',p('sport_ski','sport_board','sport_skijacken','sport_ski_kinder'),'wand'),
 reihenKachel('Off-Price-Wandband | 20 m',p('outlet_wandstange','outlet_schuh_kartons','outlet_taschenwand','outlet_homewand'),'wand'),
 reihenKachel('Kaufhaus | 20 m',p('alt_holz_regal','alt_damen_haengung','alt_schuh_klassik','alt_haushalt'),'wand'),
 reihenKachel('Sport-Gondeln | Reihe',p('gondel_schuhe','gondel_fitness','gondel_textil','gondel_baelle'),'gondel'),
 reihenKachel('Off-Price-Gondeln | Reihe',p('outlet_home','outlet_accessoires','outlet_beauty'),'gondel'),
];
zeigeKatalog(katalog,{titel:'Ladenbau | Möbelanschlüsse und Reihen',spalten:2,kachel:[750,420],rand:1.13});
