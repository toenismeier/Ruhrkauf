// 24 neue Städte, mindestens vier je Region; pro Kachel Nahausschnitt des Stadtzentrums.
// Der Katalog kann nach dem vollständigen Seed-Export der Engine gerendert werden.
import { zeigeKatalog } from '../kit/katalog.js';
import { stadtDaten } from '../kit/staedte.js';
import { standortEintrag } from './_standorte-staedte.js';

export const STADT_AUSWAHL = [
  "Gladbeck",
  "Herten",
  "Castrop-Rauxel",
  "Lünen",
  "Bergkamen",
  "Remscheid",
  "Bergisch Gladbach",
  "Brühl",
  "Wilhelmshaven",
  "Emden",
  "Norderstedt",
  "Stade",
  "Bad Homburg",
  "Neu-Isenburg",
  "Rüsselsheim",
  "Limburg",
  "Offenburg",
  "Lörrach",
  "Friedrichshafen",
  "Ansbach",
  "Neubrandenburg",
  "Frankfurt (Oder)",
  "Bautzen",
  "Plauen"
];
const eintraege = STADT_AUSWAHL.map((name) => {
  const s = stadtDaten(name);
  if (!s) throw new Error('Stadt ' + name + ' fehlt im Haus-Export (Engine-Export nachziehen)');
  return standortEintrag(name, 'einkauf', 72, null, '', { kachel: [560, 940] });
});
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege,
  { titel: 'Stadtvielfalt: 24 neue Städte · fünf Regionen', spalten: 4, kachel: [560, 940] }), 20));
