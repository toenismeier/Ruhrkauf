import { zeigeKatalog } from '../kit/katalog.js';
import { abteilungKachel, ABT_NAMEN } from '../kit/abteilung.js';

const HG = '#26313a';
const k = (art, titel, o = {}) => ({
  titel: titel ?? ABT_NAMEN[art] ?? art, hintergrund: HG,
  bau(S, scene) {
    const box = abteilungKachel(S, scene, art, { seed: o.seed ?? art.length * 7, ...o });
    this.unter = `${o.unter ?? art} · ${(o.nx ?? 3) * 5} × 15 m · ${S.anzahl} Teile`;
    return box;
  },
});

const eintraege = [
  k('beauty', 'Beauty & Parfümerie (EG)'),
  k('damen', 'Damenmode, Shop-in-Shop', { unter: 'damen · Marken mit eigenem Boden und Wandsystem' }),
  k('herren', 'Herrenmode', { unter: 'herren · Anzug, Casual, Schuhe' }),
  k('kinder', 'Kinderwelt (Kiko)', { unter: 'kinder · Kiko, Baby, Ranzen' }),
  k('waesche', 'Wäsche & Dessous'),
  k('accessoires', 'Schuhe'),
  k('lederwaren', 'Koffer & Lederwaren'),
  k('schmuck', 'Uhren & Schmuck'),
  k('strumpf', 'Strumpfwaren'),
  k('wohnen', 'Living'),
  k('haushalt', 'Tisch, Küche & Haushalt'),
  k('elektro', 'Multimedia & Elektro'),
  k('spielwaren', 'Spielwaren'),
  k('food', 'Feinkostmarkt (UG)', { nx: 4, unter: 'food · Frischetheken, Obst, Kassenzone, Wein' }),
  k('wein', 'Weinabteilung mit Probierbar'),
  k('restaurant', 'Restaurant (oberste Etage)'),
  k('sport', 'Sport'),
  k('offprice', 'Offprice: Rote Preise', { basis: 'damen' }),
  k('konzession', 'Konzession: Fremdmarke', { seed: 0, unter: 'konzession · Lindqvist, eigene Gestaltung' }),
  k('untermiete', 'Untermiete: Discounter', { mieter: 'discounter', seed: 3 }),
  k('untermiete', 'Untermiete: Gastro', { mieter: 'gastro', seed: 4 }),
  k('leer', 'Leerstand, abgeklebt'),
  k('umbau', 'Umbau mit Bauzaun'),
  k('sportschuhe', 'Sporthaus: Sportschuhe'),
];
zeigeKatalog(eintraege, { titel: 'Abteilungen und Konzepte · 15 × 15 m', spalten: 4, kachel: [560, 520] });
