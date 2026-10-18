// Katalog: 12 sichtbare Zustände (Zeilen) × 3 Warenhausfamilien/Größen (Spalten).
import { zeigeKatalog } from '../kit/katalog.js';
import { STATUS_TITEL } from '../kit/zustaende.js';
import { haus, eintrag } from './_zustaende-hilfe.js';

const SPALTEN = [haus('Z1', 1905, 5, 5200, 0), haus('Z2', 1958, 3, 2600, 0), haus('Z3', 1975, 4, 4500, 1)];
const MIETER = [{ name: 'Preisfuchs Markt', etage: 0 }, { name: 'MVZ Stadtmitte', etage: 2 }, { name: 'FitWerk 24', etage: 3 }, { name: 'Café Fräulein', etage: 99 }];
const AKT = { sale: 'Sale', jubilaeum: 'Jubiläum', blackfriday: 'Black Friday', weihnachten: 'Weihnachten' };
const ZEILEN = [
  ['offen', () => ({}), 'Normalbetrieb'],
  ['aktion', (i) => ({ aktion: ['sale', 'jubilaeum', 'blackfriday'][i] }), ''],
  ['untermiete', () => ({ untermieter: MIETER }), 'Discounter · MVZ · Fitness · Dachcafé'],
  ['offprice', () => ({}), 'Outlet im EG'],
  ['teilschliessung', () => ({}), 'ab 2. OG dicht'],
  ['umbau', () => ({}), 'EG läuft weiter'],
  ['raeumung', () => ({}), ''],
  ['geschlossen', () => ({}), ''],
  ['leer', () => ({}), ''],
  ['verfall', () => ({}), ''],
  ['neueroeffnung', () => ({}), ''],
  ['abriss', () => ({}), ''],
];
const eintraege = [];
for (const [st, fn, unter] of ZEILEN) SPALTEN.forEach((h, i) => {
  const opt = { status: st, ...fn(i) };
  eintraege.push(eintrag(`${STATUS_TITEL[st]}${opt.aktion ? ' · ' + AKT[opt.aktion] : ''}`, [[h, opt]], unter));
});
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Hartwig: Zustände eines Hauses', spalten: 3, kachel: [440, 400] }), 50);
