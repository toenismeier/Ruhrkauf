import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import * as SB from '../kit/sonderbauten.js';

// [Titel, Funktion, Parameter, Budget]
const liste = [
  ['Einkaufszentrum Rotunde', 'einkaufszentrum', { seed: 3, variante: 'rotunde', name: 'Stadtgalerie' }, 6000],
  ['Einkaufszentrum Portal', 'einkaufszentrum', { seed: 8, variante: 'portal', name: 'Löwen-Arkaden', geschosse: 4 }, 6000],
  ['Parkhaus offen', 'parkhaus', { seed: 2, variante: 'offen', geschosse: 5 }, 2500],
  ['Parkhaus Lamellen', 'parkhaus', { seed: 5, variante: 'lamellen', geschosse: 6 }, 2500],
  ['Parkhaus Spindel', 'parkhaus', { seed: 9, variante: 'spirale', geschosse: 4, w: 40 }, 2500],
  ['Stadtkirche Spitzhelm', 'kirche', { seed: 4, typ: 'stadt', helm: 'spitz', stein: '#b9785e', dach: '#5d6a72' }, 2500],
  ['Stadtkirche Zwiebelhaube', 'kirche', { seed: 7, typ: 'stadt', helm: 'zwiebel', stein: '#ece5d7', dach: '#b4583f' }, 2500],
  ['Dom Doppelturm', 'kirche', { seed: 11, typ: 'dom', stein: '#cdbfa6', dach: '#56636c', helmFarbe: '#6f9a7d' }, 6000],
  ['Rathaus Backstein', 'rathaus', { seed: 2, stil: 'backstein' }, 2500],
  ['Rathaus Neorenaissance', 'rathaus', { seed: 6, stil: 'sandstein', geschosse: 3 }, 2500],
  ['Hauptbahnhof eine Halle', 'hauptbahnhof', { seed: 1, hallen: 1 }, 6000],
  ['Hauptbahnhof drei Hallen', 'hauptbahnhof', { seed: 4, hallen: 3, stein: '#cdbfa6' }, 6000],
  ['Bürohochhaus Glas', 'buerohochhaus', { seed: 3, variante: 'glas', geschosse: 28 }, 2500],
  ['Bürohochhaus Raster', 'buerohochhaus', { seed: 5, variante: 'raster', geschosse: 16 }, 2500],
  ['Bürohochhaus Band', 'buerohochhaus', { seed: 8, variante: 'band', geschosse: 22 }, 2500],
  ['Bürohochhaus Rund', 'buerohochhaus', { seed: 12, variante: 'rund', geschosse: 25 }, 2500],
  ['Bürohochhaus Staffel', 'buerohochhaus', { seed: 14, variante: 'stufen', geschosse: 30 }, 2500],
  ['Discounter Preisfuchs', 'discounter', { seed: 1, marke: 'preisfuchs' }, 2500],
  ['Discounter Sparkorb', 'discounter', { seed: 2, marke: 'sparkorb' }, 2500],
  ['Rossberg Drogerie', 'discounter', { seed: 3, marke: 'rossberg' }, 2500],
  ['Fachmarktzentrum', 'fachmarktzentrum', { seed: 4, anzahl: 4, mieter: [SB.FACHMAERKTE[0], SB.FACHMAERKTE[3], SB.FACHMAERKTE[2], SB.FACHMAERKTE[5]] }, 2500],
  ['Fachmarktzentrum groß', 'fachmarktzentrum', { seed: 9, anzahl: 5, w: 140, mieter: [SB.FACHMAERKTE[1], SB.FACHMAERKTE[4], SB.FACHMAERKTE[6], SB.FACHMAERKTE[7], SB.FACHMAERKTE[2]] }, 2500],
  ['Kaufstadt Warenhaus', 'konkurrenz', { seed: 1, marke: 'kaufstadt' }, 2500],
  ['Ostermann Warenhaus', 'konkurrenz', { seed: 2, marke: 'ostermann' }, 2500],
  ['Modehaus Brenner', 'konkurrenz', { seed: 3, marke: 'brenner' }, 2500],
  ['Primo Moda', 'konkurrenz', { seed: 4, marke: 'primo' }, 2500],
  ['Stadttheater', 'kulturbau', { seed: 1, art: 'theater' }, 2500],
  ['Opernhaus', 'kulturbau', { seed: 2, art: 'oper' }, 2500],
  ['Kunstmuseum', 'kulturbau', { seed: 3, art: 'museum' }, 2500],
  ['Markthalle Backstein', 'markthalle', { seed: 1, variante: 'backstein' }, 2500],
  ['Markthalle Eisen und Glas', 'markthalle', { seed: 2, variante: 'eisen' }, 2500],
  ['Tankstelle Flink', 'tankstelle', { seed: 1, marke: 'flink' }, 2500],
  ['Tankstelle Nordtank', 'tankstelle', { seed: 2, marke: 'nordtank' }, 2500],
  ['Hotel modern', 'hotel', { seed: 1, stil: 'modern', geschosse: 9, name: 'Hotel Lindenhof' }, 2500],
  ['Grandhotel', 'hotel', { seed: 2, stil: 'grand', geschosse: 9, name: 'Grand Hotel Fürstenhof' }, 2500],
  ['Fernmeldeturm Korb', 'fernmeldeturm', { seed: 1, variante: 'korb', hoehe: 130 }, 2500],
  ['Fernmeldeturm Teller', 'fernmeldeturm', { seed: 2, variante: 'teller', hoehe: 115 }, 2500],
  ['Hotel modern 10 G.', 'hotel', { seed: 5, stil: 'modern', geschosse: 10, name: 'Hotel Am Stadtpark', akzent: '#c98a3a' }, 2500],
];

const nurIndex = typeof window !== 'undefined' && window.location.hash ? window.location.hash.slice(1).split(',').map(Number) : null;
const zahlen = [];
const eintraege = liste.filter((_, i) => !nurIndex || nurIndex.includes(i)).map(([titel, fn, par, budget]) => ({
  titel,
  bau(S, scene) {
    const p = { x: 0, z: 0, ...par };
    const erg = SB[fn](S, scene, p);
    const teile = S.anzahl;
    const b = new THREE.Box3();
    for (const gs of S.teile.values()) for (const g of gs) { g.computeBoundingBox(); b.union(g.boundingBox); }
    sockel(S, b.min.x, b.min.z, b.max.x - b.min.x, b.max.z - b.min.z, 3);
    S.anzahl = teile;
    this.unter = `${fn}() · ${S.anzahl} Teile / ${budget} · Höhe ${erg.hoehe.toFixed(0)} m${S.anzahl > budget ? ' · ÜBER BUDGET' : ''}`;
    zahlen.push(`${titel}: ${S.anzahl}`);
    return null;
  },
}));
window.teilezahlen = zahlen;
zeigeKatalog(eintraege, { titel: 'Sonderbauten', spalten: 4, kachel: [480, 480] });
