import { zeigeKatalog } from '../kit/katalog.js';
import { etage, dach, masse } from '../kit/grundriss.js';
import haeuser from '../../haeuser.json';

const HG = '#26313a';
const haus = (id) => haeuser.find((h) => h.id === id);
/** Kopie eines Hauses mit lokal umgesetzten Flächen einzelner Etagen (nur für den Katalog). */
function umgesetzt(id, etagen) {
  const h = structuredClone(haus(id));
  for (const [nr, neu] of Object.entries(etagen)) {
    const e = Number(nr);
    h.flaechen = h.flaechen.filter((f) => f.etage !== e).concat(neu.map((f, k) => ({ id: `${id}-u${e}-${k}`, etage: e, konzept: 'eigen', ...f })));
    if (!h.etagen.includes(e)) h.etagen = [...h.etagen, e].sort((a, b) => a - b);
  }
  return h;
}
const ETAGE = (n) => (n === 'dach' ? 'Dach' : n === 0 ? 'EG' : n < 0 ? 'UG' : `${n}. OG`);

// Großes Haus: Köln Arkaden (4.500 m² je Etage) aus haeuser.json, dazu ein 4. OG mit Restaurant und Living
const gross = umgesetzt('W012', { 4: [{ qm: 2300, gruppe: 'food', art: 'restaurant' }, { qm: 2200, gruppe: 'wohnen' }] });
// Mittleres Haus: Braunschweig (2.300 m²) unverändert
const mittel = haus('W046');
// Haus mit Offprice, Untermiete, Konzession, Leerstand und Umbau: Lüneburg (2.200 m²), lokal umgesetzt
const umbruch = umgesetzt('W109', {
  '-1': [{ qm: 1100, gruppe: 'food', konzept: 'untermiete', mieter: 'discounter' }, { qm: 1134, gruppe: 'wohnen' }],
  1: [{ qm: 700, gruppe: 'damen', konzept: 'offprice' }, { qm: 590, gruppe: 'waesche' }, { qm: 560, gruppe: 'herren', konzept: 'konzession' }, { qm: 500, gruppe: 'sport', konzept: 'untermiete', mieter: 'fitness' }, { qm: 450, gruppe: 'kinder', konzept: 'leer' }, { qm: 400, gruppe: 'spielwaren', konzept: 'umbau' }],
});

const faelle = [
  { h: gross, e: -1, info: 'Feinkostmarkt, Wein, Haushalt, Elektro', aus: { anker: 'eingang' } },
  { h: gross, e: 0, info: 'Beauty, Uhren & Schmuck, Lederwaren, Strümpfe, Schuhe, Damen', aus: { anker: 'eingang' } },
  { h: gross, e: 1, info: 'Damen (Shop-in-Shop), Wäsche', aus: { anker: 'ecke' } },
  { h: gross, e: 2, info: 'Wäsche, Herren, Kinder' },
  { h: gross, e: 3, info: 'Kinder, Sport, Spielwaren' },
  { h: gross, e: 4, info: 'lokal ergänzt: Restaurant, Living', aus: { anker: 'ecke' } },
  { h: gross, e: 'dach', info: 'Dachterrasse über dem Restaurant', aus: {} },
  { h: mittel, e: 0, info: 'mittleres Haus: Feinkost, Beauty, Accessoires', aus: { anker: 'eingang' } },
  { h: mittel, e: 2, info: 'mittleres Haus: Damen, Wäsche, Herren' },
  { h: umbruch, e: -1, info: 'lokal umgesetzt: Untermiete Discounter, Wohnen' },
  { h: umbruch, e: 1, info: 'lokal umgesetzt: Offprice, Konzession, Untermiete, Leerstand, Umbau', aus: { anker: 'eingang' } },
];

const eintraege = [];
for (const f of faelle) {
  const { B, T } = masse(f.h);
  for (const aus of [null, f.aus].filter((a, k) => k === 0 || a)) {
    eintraege.push({
      titel: `${f.h.name} · ${ETAGE(f.e)}${aus ? ' · Ausschnitt 30 × 25 m' : ''}`,
      hintergrund: HG,
      bau(S, scene) {
        const res = f.e === 'dach' ? dach(S, scene, f.h, { ausschnitt: aus ?? false }) : etage(S, scene, f.h, f.e, { ausschnitt: aus ?? false });
        this.unter = `${B} × ${T} m · ${f.info} · ${res.anzahl} Teile · ${res.kunden} Kunden${res.leer ? ` · größte Leerfläche ${res.leer.m.toFixed(1)} m` : ''}`;
        if (res.leer) console.log('LEER', this.titel, res.leer.m, JSON.stringify(res.leer.wo));
        return res.box;
      },
    });
  }
}
zeigeKatalog(eintraege, { titel: 'Etagen aus haeuser.json', spalten: 2, kachel: [1000, 800] });
