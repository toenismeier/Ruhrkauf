// Vergleichskatalog Hartwig Sport: Erlebnis, Abverkauf und leichte Abnutzung für alle sechs Familien.
// Bei Familien, die im Bestand nicht als 1a-Großfläche vorkommen, sind die Parameter
// bewusst als Design-Muster gesetzt. Keine Veränderung an haeuser.json.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { sporthaus, familieSport, sportGefuehl, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const sport = haeuser.filter((h) => h.format === 'sport');
const eintraege = [];
const protokoll = [];
let letzteSonne = null;
for (let fam = 1; fam <= 6; fam++) {
  const basis = sport.find((h) => familieSport(h) === fam && (h.etagen ?? []).some((e) => e > 0))
    ?? sport.find((h) => familieSport(h) === fam);
  if (!basis) throw new Error('Keine Sporthaus-Familie ' + fam + ' vorhanden');
  const etagen = basis.etagen.filter((e) => e >= 0).length > 1 ? basis.etagen : [0, 1];
  const faelle = [
    { titel: 'Erlebnisfläche', haus: { ...basis, lage: '1a', grundflaecheQm: Math.max(2200, basis.grundflaecheQm) }, zustand: { status: 'offen' } },
    { titel: 'Abverkauf oben', haus: { ...basis, etagen, substanz: 75 }, zustand: { status: 'aktion', aktion: 'sale', rabatt: 0.35 } },
    { titel: 'Substanz 25', haus: { ...basis, etagen, substanz: 25 }, zustand: { status: 'offen' } },
  ];
  for (const fall of faelle) eintraege.push({
    titel: `F${fam} · ${fall.titel}`,
    bau(S, scene) {
      if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
      letzteSonne = scene.userData.sonne;
      letzteSonne.shadow.mapSize.set(3072, 3072);
      const erg = sporthaus(S, scene, fall.haus, { x: 0, z: 0, familie: fam, ...fall.zustand });
      const z = sportGefuehl(fall.haus, fall.zustand);
      sockel(S, 0, 0, erg.w, erg.d, 4);
      protokoll.push({ id: basis.id, familie: fam, fall: fall.titel, erlebnis: z.erlebnis, abverkauf: z.abverkauf, teile: erg.teile });
      this.unter = `${FAMILIEN_SPORT[fam]} · ${basis.id} · ${erg.teile} Teile · ${z.erlebnis ?? (z.abverkauf ? 'oberstes OG reduziert' : 'Regelbetrieb')}`;
      return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(erg.w + 4, erg.hoehe, erg.d + 4));
    },
  });
}
setTimeout(() => {
  zeigeKatalog(eintraege, { titel: 'Hartwig Sport · Modern, hell, weniger Betrieb', spalten: 3, kachel: [520, 435] });
  console.log('STATJSON ' + JSON.stringify(protokoll));
}, 50);
