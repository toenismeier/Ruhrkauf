import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { OST_SLOTS, ostFahrzeug } from '../kit/ostbauten.js';

const FAHRZEUGE = (S, scene, p) => {
  // über die ganze Platte verteilt: Pkw-Reihe links, Lkw und Bus vorn, Straßenbahnen längs rechts
  [['kleinwagen', '#9fb7a8'], ['kleinwagen', '#e3c35e'], ['limousine', '#7f9fba'], ['kombi', '#c9b98c'], ['modern', '#2f5f8f']].forEach(([t, f], i) => ostFahrzeug(S, p.x + 6, p.z + 5 + i * 3.4, t, 0, f));
  ostFahrzeug(S, p.x + 8, p.z + 25, 'lkw', 0, '#4f7a8c');
  ostFahrzeug(S, p.x + 10, p.z + 31, 'bus', 0, null);
  ostFahrzeug(S, p.x + 22, p.z + 18, 'tram', Math.PI / 2, null);
  ostFahrzeug(S, p.x + 31, p.z + 18, 'tram2', Math.PI / 2, '#f1d27a');
  return { hoehe: 4 };
};

// [Titel, Slot, Parameter (w, d = Slotgröße), Budget]
export const OST_LISTE = [
  ['Magistrale Berliner Typ', 'slot:magistrale', { seed: 1, variante: 'berlin', w: 72, d: 34 }, 4000],
  ['Magistrale Berlin, Doppelturm', 'slot:magistrale', { seed: 4, variante: 'berlin', w: 96, d: 20 }, 4000],
  ['Magistrale Rostocker Backstein', 'slot:magistrale', { seed: 2, variante: 'rostock', w: 70, d: 30 }, 4000],
  ['Magistrale Dresdner Sandstein', 'slot:magistrale', { seed: 3, variante: 'dresden', w: 72, d: 34 }, 4000],
  ['WBS 70 Sechsgeschosser unsaniert', 'slot:platte_wohn', { seed: 1, variante: 'wbs70_6', zustand: 'unsaniert', w: 60, d: 40 }, 4000],
  ['WBS 70 Sechsgeschosser saniert', 'slot:platte_wohn', { seed: 2, variante: 'wbs70_6', zustand: 'saniert', w: 60, d: 40 }, 4000],
  ['WBS 70 Elfgeschosser unsaniert', 'slot:platte_wohn', { seed: 3, variante: 'wbs70_11', zustand: 'unsaniert', w: 72, d: 40 }, 4000],
  ['P2 Balkonbänder saniert', 'slot:platte_wohn', { seed: 4, variante: 'p2', zustand: 'saniert', w: 60, d: 40 }, 4000],
  ['Q3A Blockbau unsaniert', 'slot:platte_wohn', { seed: 5, variante: 'q3a', zustand: 'unsaniert', w: 54, d: 34 }, 4000],
  ['Punkthochhaus PH 16 unsaniert', 'slot:platte_wohn', { seed: 6, variante: 'ph16', zustand: 'unsaniert', w: 44, d: 40 }, 4000],
  ['Elfgeschosser-Scheibe saniert', 'slot:platte_wohn', { seed: 7, variante: 'scheibe', zustand: 'saniert', w: 90, d: 40 }, 4000],
  ['Würfelhäuser saniert', 'slot:platte_wohn', { seed: 8, variante: 'wuerfel', zustand: 'saniert', w: 56, d: 34 }, 4000],
  ['Winkelzeile unsaniert', 'slot:platte_wohn', { seed: 9, variante: 'winkel', zustand: 'unsaniert', w: 64, d: 56 }, 4000],
  ['Gekrümmte Zeile saniert', 'slot:platte_wohn', { seed: 10, variante: 'kurve', zustand: 'saniert', w: 96, d: 56 }, 4000],
  ['Zentrum Wohnscheibe + Läden', 'slot:platte_zentrum', { seed: 1, variante: 'prager', w: 96, d: 60 }, 4000],
  ['Zentrum Ladenzeile mit Arkade', 'slot:platte_zentrum', { seed: 2, variante: 'arkade', w: 64, d: 34 }, 4000],
  ['Zentrum Hochhaus-Ensemble', 'slot:platte_zentrum', { seed: 3, variante: 'ensemble', w: 64, d: 56 }, 4000],
  ['Kulturpalast', 'slot:kulturhaus', { seed: 1, variante: 'palast', w: 80, d: 60 }, 4000],
  ['Stadthalle', 'slot:kulturhaus', { seed: 2, variante: 'stadthalle', w: 70, d: 56 }, 4000],
  ['Kulturhaus der 50er', 'slot:kulturhaus', { seed: 3, variante: 'kulturhaus50', w: 60, d: 44 }, 2500],
  ['Fernsehturm Kugel', 'slot:dominante', { seed: 1, variante: 'fernsehturm', w: 44, d: 44 }, 2500],
  ['Fernmeldeturm Kanzel', 'slot:dominante', { seed: 2, variante: 'kanzel', w: 36, d: 36 }, 2500],
  ['Uni-Hochhaus mit Krone', 'slot:dominante', { seed: 3, variante: 'uni', w: 56, d: 44 }, 4000],
  ['Interhotel-Scheibe', 'slot:dominante', { seed: 4, variante: 'interhotel', w: 70, d: 44, name: 'Hotel Stadt Neustrelitz' }, 4000],
  ['Gaststätte mit HP-Schale', 'slot:pavillon', { seed: 1, variante: 'hp', w: 40, d: 36 }, 2500],
  ['Blumenpavillon Faltdach', 'slot:pavillon', { seed: 2, variante: 'faltdach', w: 30, d: 26 }, 2500],
  ['Eisbar-Pavillon', 'slot:pavillon', { seed: 3, variante: 'eisbar', w: 34, d: 30 }, 2500],
  ['Brunnenpavillon', 'slot:pavillon', { seed: 4, variante: 'brunnen', w: 40, d: 34 }, 2500],
  ['Kaufhalle Typenbau', 'slot:kaufhalle', { seed: 1, variante: 'typ', w: 56, d: 50 }, 2500],
  ['Kaufhalle Waschbeton', 'slot:kaufhalle', { seed: 2, variante: 'waschbeton', w: 56, d: 50 }, 2500],
  ['Kaufhalle als Discounter (90er)', 'slot:kaufhalle', { seed: 3, variante: 'discounter', w: 56, d: 50 }, 2500],
  ['Heizwerk Kohle', 'slot:heizwerk', { seed: 1, variante: 'kohle', w: 70, d: 56 }, 4000],
  ['Heizwerk Gas', 'slot:heizwerk', { seed: 2, variante: 'gas', w: 60, d: 46 }, 2500],
  ['Fernwärme-Umformer', 'slot:heizwerk', { seed: 3, variante: 'umformer', w: 50, d: 40 }, 2500],
  ['Typenschule mit Turnhalle', 'slot:schule', { seed: 1, variante: 'erfurt', w: 90, d: 60 }, 4000],
  ['Schule Winkelbau', 'slot:schule', { seed: 2, variante: 'winkel', w: 70, d: 60 }, 4000],
  ['Kinderkombination', 'slot:schule', { seed: 3, variante: 'kita', w: 60, d: 50 }, 2500],
  ['Bürohaus mit Bullaugen', 'slot:wendebau', { seed: 1, variante: 'bullauge', w: 40, d: 30 }, 2500],
  ['Einkaufspassage 90er', 'slot:wendebau', { seed: 2, variante: 'passage', w: 56, d: 36 }, 2500],
  ['Bank-Neubau der 90er', 'slot:wendebau', { seed: 3, variante: 'sparkasse', w: 36, d: 28 }, 2500],
  ['Altbau unsaniert, bewohnt', 'slot:altbau_unsaniert', { seed: 1, zustand: 'unsaniert', w: 22, d: 16 }, 2500],
  ['Altbau leer, vernagelt', 'slot:altbau_unsaniert', { seed: 2, zustand: 'leer', w: 20, d: 16 }, 2500],
  ['Altbau saniert', 'slot:altbau_unsaniert', { seed: 3, zustand: 'saniert', w: 22, d: 16 }, 2500],
  ['Altbau-Eckhaus unsaniert', 'slot:altbau_unsaniert', { seed: 4, zustand: 'unsaniert', variante: 'eck', w: 22, d: 20 }, 2500],
  ['Brache mit Wiese', 'slot:brache', { seed: 1, variante: 'wiese', w: 30, d: 26 }, 2500],
  ['Brache als Parkplatz', 'slot:brache', { seed: 2, variante: 'parkplatz', w: 34, d: 28 }, 2500],
  ['Brache mit Imbiss', 'slot:brache', { seed: 3, variante: 'kiosk', w: 30, d: 24 }, 2500],
  ['Fahrzeuge: Kleinwagen bis Tatra-Großzug', 'fahrzeuge', { seed: 1, w: 40, d: 36 }, 2500],
  ['Brache mit Bauzaun', 'slot:brache', { seed: 4, variante: 'bauzaun', w: 32, d: 26 }, 2500],
];

export function ostEintraege(liste, nur = null) {
  return liste.filter((e, i) => !nur || nur(e, i)).map(([titel, slot, par, budget]) => ({
    titel,
    bau(S, scene) {
      const p = { x: 0, z: 0, ...par };
      const erg = slot === 'fahrzeuge' ? FAHRZEUGE(S, scene, p) : OST_SLOTS[slot](S, scene, p);
      const teile = S.anzahl;
      sockel(S, p.x, p.z, p.w, p.d, 3);
      S.anzahl = teile;
      const v = par.variante ? `${par.variante}` : '';
      this.unter = `${slot} ${v}${par.zustand ? ' · ' + par.zustand : ''} · ${teile} / ${budget} Teile · ${erg.hoehe.toFixed(0)} m${teile > budget ? ' · ÜBER BUDGET' : ''}`;
      return null;
    },
  }));
}

if (!globalThis.OST_KEIN_AUTOSTART) zeigeKatalog(ostEintraege(OST_LISTE), { titel: 'Ostbauten: DDR- und Ostblock-Architektur', spalten: 4, kachel: [520, 520] });
