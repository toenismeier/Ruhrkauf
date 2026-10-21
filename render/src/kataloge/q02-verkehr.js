// Q02 Vorher/Nachher: Chemnitzer Oberleitungen und Essener Hbf.
import { zeigeKatalog } from '../kit/katalog.js';
import { q02Plan, q02Box, q02Szene } from './q02-hilfe.js';

const chemnitz = q02Plan('Chemnitz'), essen = q02Plan('Essen');
const t = chemnitz.strassen.filter((s) => s.tram).sort((a, b) => {
  const wert = (s) => Math.hypot((s.achse === 'z' ? s.mitte : (s.von + s.bis) / 2) - chemnitz.breite / 2,
    (s.achse === 'x' ? s.mitte : (s.von + s.bis) / 2) - chemnitz.tiefe / 2);
  return wert(a) - wert(b);
})[0];
if (!t) throw new Error('Chemnitz: Keine Straßenbahntrasse gefunden.');
const punkt = t.achse === 'z' ? [t.mitte, (t.von + t.bis) / 2] : [(t.von + t.bis) / 2, t.mitte];
const bhf = essen.bloecke.filter((b) => b.art === 'bahn').sort((a, b) => b.w * b.d - a.w * a.d)[0];
if (!bhf) throw new Error('Essen: Kein Bahnhofsgleisblock gefunden.');
const eintraege = [
  { titel: 'Chemnitz – Straßenbahn', unter: 'Schienen und Fahrdraht: identisches Ende, Prellbock',
    bau: (S, scene) => q02Szene(S, scene, chemnitz, q02Box(punkt[0], punkt[1], 92), { ohneHaeuser: true }) },
  { titel: 'Essen – Hbf', unter: 'Züge innerhalb der Bahnsteiggleise',
    bau: (S, scene) => q02Szene(S, scene, essen, q02Box(bhf.x + bhf.w / 2, bhf.z + bhf.d / 2, 105), { ohneHaeuser: false }) },
];
zeigeKatalog(eintraege, { titel: 'Q02 – Verkehr | Vorher / Nachher', spalten: 2, kachel: [640, 640], rand: 1.04 });
