// Katalog: Etagen der Hartwig-Sporthäuser je Außenfamilie (ganze Etage und Ausschnitt 30 × 25 m).
import { zeigeKatalog } from '../kit/katalog.js';
import { etage } from '../kit/grundriss.js';
import { FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const HG = '#26313a';
const haus = (id) => haeuser.find((h) => h.id === id);
const ETAGE = (n) => (n === 0 ? 'EG' : `${n}. OG`);
const faelle = [
  ['S017', 0, 'Outdoor-Flagship 1a, groß'],
  ['S002', 0, 'Glas-Kubus, eingeschossig'],
  ['S011', 1, 'Glas-Kubus, Kletterwand im Luftraum'],
  ['S010', 1, 'Mall, klein, dreigeschossig'],
  ['S024', 0, 'Center-Großfläche an der Mall'],
  ['S001', 1, 'Mall, Galerie im 1. OG'],
  ['S041', 0, 'Fachmarkt-Box mit Parkplatz'],
  ['S008', 1, 'Outdoor-Flagship, dreigeschossig'],
  ['S029', 0, 'Geschäftshaus 70/80'],
  ['S012', 0, 'Postmoderne 90er, Rundbühne'],
];
const eintraege = [];
for (const [id, e, info] of faelle) for (const aus of [false, { anker: 'eingang' }]) {
  const h = haus(id);
  eintraege.push({
    titel: `${h.name.replace('Hartwig Sport ', '')} · ${ETAGE(e)}${aus ? ' · Ausschnitt 30 × 25 m' : ''}`, hintergrund: HG,
    bau(S, scene) {
      const r = etage(S, scene, h, e, { ausschnitt: aus });
      this.unter = `${id} · F${r.familie} ${FAMILIEN_SPORT[r.familie]} · ${info} · ${r.breite} × ${r.tiefe} m · ${r.anzahl} Teile${r.leer ? ' · größte Leerfläche ' + r.leer.m.toFixed(1) + ' m' : ''}`;
      if (r.leer) console.log('LEER', this.titel, r.leer.m, JSON.stringify(r.leer.wo), r.anzahl);
      return r.box;
    },
  });
}
zeigeKatalog(eintraege, { titel: 'Hartwig Sport: Etagen je Außenfamilie', spalten: 2, kachel: [1000, 800] });
