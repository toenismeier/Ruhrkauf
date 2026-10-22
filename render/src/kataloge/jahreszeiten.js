// N06/Q09: Jahreszeitenvergleich und dachgebundener Schnee in vier Städten.
import { THREE, KompaktSammler, setzeLod, entferneKleineSchilder } from '../kit/basis.js';
import { stadtplan, baueStadt, setzeMarker } from '../kit/stadt.js';
import { echterBauer } from '../kit/bauer.js';
import { stadtDaten } from '../kit/staedte.js';
import { stadtRahmen, STADT_KACHEL } from './_standorte-staedte.js';
import { jahreszeit, jahreszeitenStadt } from '../kit/jahreszeit.js';
import { zeigeKatalog } from '../kit/katalog.js';

const BEISPIELE = [
  { woche: 0, name: 'Winter' },
  { woche: 12, name: 'Frühling' },
  { woche: 26, name: 'Sommer' },
  { woche: 40, name: 'Herbst' },
  { woche: 47, name: 'Weihnachten' },
  { woche: 3, name: 'Schnee', schnee: true },
];
// Essen und München behalten alle N06-Ansichten. Berlin und Hamburg ergänzen
// den direkten Sommer-/Schneevergleich für unterschiedliche Dachtypen und Formate.
const eintraege = ['Essen', 'München', 'Berlin', 'Hamburg'].flatMap((name) =>
  (['Essen', 'München'].includes(name) ? BEISPIELE : [BEISPIELE[2], BEISPIELE[5]]).map((bild) => ({
  titel: name + ' · ' + bild.name,
  unter: '',
  bau(S, scene) {
    const d = stadtDaten(name);
    if (!d) throw new Error('Unbekannte Stadt ' + name);
    const plan = stadtplan(d.seed, {
      typ: d.typ, archetyp: d.archetyp, region: d.region,
      strassenFaktor: 1.6, ...d.extra, standorte: d.standorte,
    });
    const T = new KompaktSammler();
    setzeLod('fern');
    let e;
    try {
      e = baueStadt(T, scene, plan, echterBauer());
      T.bauen(scene);
      S.anzahl = T.anzahl;
      entferneKleineSchilder(scene);
    } finally { setzeLod('nah'); }
    // Im Katalog wird für die Schnee-Stichprobe der Seed gezielt so gewählt,
    // dass der 40-%-Wochenentscheid positiv ist (nicht die Produktionslogik geändert).
    let seed = d.seed;
    if (bild.schnee) {
      while (!jahreszeit({ woche: bild.woche, seed, startJahr: 2026 }).schnee) seed++;
    }
    const s = { woche: bild.woche, seed, startJahr: 2026, marketing: { aktionen: [] } };
    const saison = jahreszeitenStadt(scene, plan, e.hoehen, s, true, e.dachFlaechen);
    const j = saison.aktualisiere(s);
    if (bild.schnee && !j.schnee) throw new Error('Schneewoche nicht gefunden');
    const box = stadtRahmen(plan, { hoehen: e.hoehen });
    setzeMarker(scene, plan, e, 'standorte', { markerGroesse: Math.max(24, plan.breite / 15) });
    this.unter = 'KW ' + j.kw + ' · ' + j.name + (j.schnee ? ' · Schnee' : '');
    return box;
  },
})));

window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, {
  titel: 'Jahreszeiten: Essen, München, Berlin und Hamburg',
  spalten: 2, kachel: STADT_KACHEL, rand: 1.06,
}), 20));
