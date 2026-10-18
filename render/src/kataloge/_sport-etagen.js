import { zeigeKatalog } from '../kit/katalog.js';
import { etage, masse } from '../kit/grundriss.js';
import haeuser from '../../haeuser.json';
const haus = (id) => haeuser.find((h) => h.id === id);
const faelle = [['S017', 0], ['S010', 1], ['S024', 0], ['S001', 1]];
const eintraege = [];
for (const [id, e] of faelle) for (const aus of [false, { anker: 'eingang' }]) {
  const h = haus(id);
  eintraege.push({ titel: `${h.name} · ${e === 0 ? 'EG' : e + '. OG'}${aus ? ' · Ausschnitt' : ''}`, hintergrund: '#26313a',
    bau(S, scene) { const r = etage(S, scene, h, e, { ausschnitt: aus }); this.unter = `${h.grundflaecheQm} m² · ${r.anzahl} Teile${r.leer ? ' · Leerfläche ' + r.leer.m.toFixed(1) + ' m' : ''}`; return r.box; } });
}
zeigeKatalog(eintraege, { titel: 'Sporthaus-Etagen (Prüfung)', spalten: 2, kachel: [1000, 800] });
