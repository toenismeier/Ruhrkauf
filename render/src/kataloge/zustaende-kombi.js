// Katalog: typische Kombinationen von Zuständen.
import { zeigeKatalog } from '../kit/katalog.js';
import { haus, eintrag } from './_zustaende-hilfe.js';

const eintraege = [
  eintrag('Ex-Warenhaus: Ärztehaus + Fitness + Discounter', [[haus('K1', 1972, 5, 5200, 0), { status: 'untermiete', hartwig: false,
    untermieter: [{ name: 'Kaufgut', etage: 0 }, { name: 'Drogerie Nachbar', etage: 0 }, { name: 'Bürgeramt', etage: 1 }, { name: 'MediCampus', etage: 2 }, { name: 'Praxisgemeinschaft Zentrum', etage: 3 }, { name: 'IronCity Fitness', etage: 4 }] }]], 'hartwig: false'),
  eintrag('Offen mit Sale', [[haus('K2', 1928, 5, 4200, 0), { status: 'offen', zusatz: ['aktion'], aktion: 'sale' }]]),
  eintrag('Teilschließung + Outlet', [[haus('K3', 1960, 5, 5000, 1), { status: 'teilschliessung', zusatz: ['offprice'] }]]),
  eintrag('Umbau bei laufendem Betrieb + Untermieter', [[haus('K4', 1995, 4, 4200, 3), { status: 'umbau', untermieter: [{ name: 'Rossberg Drogerie', etage: 0 }, { name: 'Deskhaus', etage: 3 }] }]]),
  eintrag('Räumung neben offenem Nachbarn', [[haus('K5a', 1912, 3, 2600, 3), { status: 'raeumung' }], [haus('K5b', 1985, 3, 2600, 0), { status: 'offen' }]]),
  eintrag('Verfall', [[haus('K6', 1966, 4, 4200, 4, { substanz: 15 }), { status: 'verfall' }]]),
  eintrag('Weihnachten + Untermieter', [[haus('K7', 1956, 4, 4000, 0), { status: 'aktion', aktion: 'weihnachten', untermieter: [{ name: 'Pulsraum', etage: 3 }, { name: 'Burgerwerk', etage: 99 }] }]]),
  eintrag('Abriss neben Leerstand', [[haus('K8a', 1975, 3, 3000, 2), { status: 'abriss' }], [haus('K8b', 1931, 3, 2600, 4), { status: 'leer' }]]),
  eintrag('Neueröffnung nach Neukonzept', [[haus('K9', 2006, 3, 3000, 1), { status: 'neueroeffnung', untermieter: [{ name: 'Markthalle Kost', etage: 0 }] }]]),
  eintrag('Drei laute Zustände: Räumung + Aktion + Umbau', [[haus('K10', 1974, 5, 5200, 0), { status: 'raeumung', zusatz: ['umbau'], aktion: 'sale' }]], 'Prioritätslogik'),
  eintrag('Kachel + Mittellogo: Teilschließung + Outlet + Sale + Mieter', [[haus('K11', 1972, 5, 5600, 0), { status: 'teilschliessung', zusatz: ['offprice'], aktion: 'sale', untermieter: [{ name: 'MVZ Stadtmitte', etage: 2 }, { name: 'FitWerk 24', etage: 3 }] }]]),
  eintrag('Kaiserzeit mit Risalit: Teilschließung', [[haus('K12', 1906, 5, 5200, 0), { status: 'teilschliessung' }]]),
  eintrag('Neueröffnung + Black Friday + Untermieter', [[haus('K13', 1990, 4, 4400, 0), { status: 'neueroeffnung', aktion: 'blackfriday', untermieter: [{ name: 'WorkLoft', etage: 3 }] }]]),
  eintrag('Abriss an +z und Abriss Ecke', [[haus('K14a', 1960, 4, 3000, 1), { status: 'abriss', abrissSeite: '+z' }], [haus('K14b', 1975, 4, 3000, 2), { status: 'abriss', abrissSeite: 'ecke' }]]),
  eintrag('Geschlossen ohne Passanten neben offenem Haus', [[haus('K15a', 1928, 4, 3400, 0), { status: 'geschlossen', passanten: false }], [haus('K15b', 1962, 4, 3000, 3), { status: 'offen', passanten: false }]], 'passanten: false'),
];
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Hartwig: Zustands-Kombinationen', spalten: 3, kachel: [560, 460] }), 50);
