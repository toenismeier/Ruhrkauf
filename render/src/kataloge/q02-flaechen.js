// Q02: Kleingärten, Feldparzellen und Wohnzeilen im Raum Hannover.
import { zeigeKatalog } from '../kit/katalog.js';
import { q02Plan, q02Box, q02Szene } from './q02-hilfe.js';

const plan = q02Plan('Hannover');
const garten = plan.bloecke.find((b) => b.art === 'kleingarten')
  ?? plan.aussen.bloecke.find((b) => b.zone === 'kleingarten');
const felder = plan.aussen.bloecke.filter((b) => b.zone === 'feld');
const feld = felder.sort((a, b) => b.w * b.d - a.w * a.d)[0];
const wohn = plan.aussen.bloecke.filter((b) => b.zone === 'dicht' || b.zone === 'siedlung')
  .sort((a, b) => b.w * b.d - a.w * a.d)[0];
if (!garten || !feld || !wohn) throw new Error('Hannover: Kleingarten, Feld oder Wohnblock fehlt.');
const kachel = (b, rad, titel, unter, aussen = true) => ({
  titel, unter, bau: (S, scene) => q02Szene(S, scene, plan,
    q02Box(b.x + b.w / 2, b.z + b.d / 2, rad), { aussen, ohneHaeuser: true }),
});
const eintraege = [
  kachel(garten, 80, 'Hannover – Kleingärten', 'Mindestens sechs Laubenformen, ungleiche Parzellen und Wege',
    garten.zone === 'kleingarten'),
  kachel(feld, 110, 'Hannover – Felder', 'Variierende Schläge, Nutzstreifen und Feldwege'),
  kachel(wohn, 85, 'Hannover – Wohnzeilen', 'Fassaden-, Dach- und Größenmischung'),
];
zeigeKatalog(eintraege, { titel: 'Q02 – Flächenvielfalt', spalten: 3, kachel: [540, 540], rand: 1.05 });
