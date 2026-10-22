// Gemischte Standortnetze: zehn Städte, je eine Karte mit Format-Pins und ein Nahausschnitt.
// Nach vollständigem Engine-Export: node render-katalog.js standorte-mix
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
export const STAEDTE_MIX = ['Berlin', 'Hamburg', 'München', 'Köln', 'Essen', 'Dortmund', 'Leipzig', 'Bamberg', 'Wesel', 'Cottbus'];
const eintraege = STAEDTE_MIX.flatMap((name) => [
  standortEintrag(name, 'stadt', 62),
  standortEintrag(name, 'einkauf', 72),
]);
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege,
  { titel: 'Standorte im Maßstab: zehn Städte · Stadtplan und Einkaufslage', spalten: 2, kachel: [960, 540], rand: 1.05 }), 20));
