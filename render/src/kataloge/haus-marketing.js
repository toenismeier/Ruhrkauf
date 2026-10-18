// Marketing am Haus: Kundenkarten-Werbung, App-Plakat, Prospektständer und Aktionsbanner je Anlass des Aktionskalenders.
import { zeigeKatalog } from '../kit/katalog.js';
import { AKTION_TITEL } from '../kit/zustaende.js';
import { haus, eintrag } from './_zustaende-hilfe.js';

const H = [haus('M1', 1905, 5, 5200, 0), haus('M2', 1958, 3, 2600, 0), haus('M3', 1975, 4, 4500, 1)];
const ALLES = { karte: true, app: true, prospekt: true };
const E = [];
H.forEach((h, i) => E.push(eintrag(`Marketing am Haus · ${['Altbau', 'Nachkrieg', '70er'][i]}`, [[h, { status: 'offen', marketing: ALLES }]], 'Karte · App · Prospekt')));
E.push(eintrag('Nur Kundenkarte', [[H[0], { status: 'offen', marketing: { karte: true } }]]));
E.push(eintrag('Nur App-Plakat', [[H[1], { status: 'offen', marketing: { app: true } }]]));
E.push(eintrag('Nur Prospektständer', [[H[2], { status: 'offen', marketing: { prospekt: true } }]]));
const ANLAESSE = [
  ['wsv', 0.5], ['ssv', 0.4], ['midseason', 0.3], ['blackfriday', 0.3], ['weihnachten', 0], ['ostern', 0], ['muttertag', 0, 'punkte', 5],
  ['beauty', 0.2], ['waesche', 0.2], ['schulanfang', 0], ['jubilaeum', 0.2], ['mwst', 0.19], ['friends', 0.2, 'coupon'], ['personalkauf', 0.25],
  ['raeumung', 0.5], ['sale', 0.3, 'staffel'],
];
ANLAESSE.forEach(([a, rabatt, mechanik, punkteFaktor], i) => {
  const h = H[i % 3];
  E.push(eintrag(`${AKTION_TITEL[a]}`, [[h, { status: 'offen', aktion: a, rabatt, mechanik, punkteFaktor, marketing: i % 2 ? { karte: true } : { prospekt: true, app: true } }]], `${rabatt ? Math.round(rabatt * 100) + ' %' : 'ohne Rabatt'}${mechanik ? ' · ' + mechanik : ''}`));
});
setTimeout(() => zeigeKatalog(E, { titel: 'Hartwig: Marketing am Haus und Aktionsbanner', spalten: 3, kachel: [520, 460] }), 50);
