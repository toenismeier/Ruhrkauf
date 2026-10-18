import { sockel } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { MITTE_SLOTS } from '../kit/mittebauten.js';

// [Titel, Slot, Parameter (w, d = Slotgröße in Weltachsen), Budget]
export const MITTE_LISTE = [
  ['Rasterturm der 70er', 'slot:mitte_skyline', { seed: 1, variante: 'raster', w: 48, d: 44 }, 2500],
  ['Glas-Zwilling', 'slot:mitte_skyline', { seed: 2, variante: 'zwilling', w: 60, d: 46 }, 2500],
  ['Kronenturm', 'slot:mitte_skyline', { seed: 3, variante: 'krone', w: 48, d: 48 }, 2500],
  ['Abgerundeter Turm', 'slot:mitte_skyline', { seed: 4, variante: 'rund', w: 56, d: 44 }, 2500],
  ['Bankenensemble', 'slot:mitte_skyline', { seed: 5, variante: 'ensemble', w: 96, d: 76 }, 4000],
  ['Glas-Zwilling, Front -x', 'slot:mitte_skyline', { seed: 6, variante: 'zwilling', w: 46, d: 60, front: '-x' }, 2500],
  ['Kronenturm, Front -z', 'slot:mitte_skyline', { seed: 7, variante: 'krone', w: 48, d: 48, front: '-z' }, 2500],
  ['Rasterturm, Front +x', 'slot:mitte_skyline', { seed: 8, variante: 'raster', w: 44, d: 48, front: '+x' }, 2500],
  ['Abgerundeter Turm, Front -z', 'slot:mitte_skyline', { seed: 9, variante: 'rund', w: 56, d: 44, front: '-z' }, 2500],
  ['Fachwerkzeile', 'slot:mitte_fachwerk', { seed: 1, variante: 'zeile', w: 46, d: 24 }, 2500],
  ['Altstadt am Römerberg-Typ', 'slot:mitte_fachwerk', { seed: 2, variante: 'roemer', w: 56, d: 28 }, 4000],
  ['Fachwerkrathaus', 'slot:mitte_fachwerk', { seed: 3, variante: 'rathaus', w: 44, d: 30 }, 2500],
  ['Fachwerk-Marktplatz', 'slot:mitte_fachwerk', { seed: 4, variante: 'platz', w: 52, d: 48 }, 4000],
  ['Fachwerkzeile, Front -z', 'slot:mitte_fachwerk', { seed: 5, variante: 'zeile', w: 46, d: 24, front: '-z' }, 2500],
  ['Römerberg-Typ, Front +x', 'slot:mitte_fachwerk', { seed: 6, variante: 'roemer', w: 28, d: 56, front: '+x' }, 4000],
  ['Fachwerkrathaus, Front -x', 'slot:mitte_fachwerk', { seed: 7, variante: 'rathaus', w: 30, d: 44, front: '-x' }, 2500],
  ['Fachwerk-Marktplatz, Front -z', 'slot:mitte_fachwerk', { seed: 8, variante: 'platz', w: 52, d: 48, front: '-z' }, 4000],
  ['Kurhaus mit Kolonnaden', 'slot:mitte_kurstadt', { seed: 1, variante: 'kurhaus', w: 100, d: 80 }, 4000],
  ['Wandelhalle und Brunnentempel', 'slot:mitte_kurstadt', { seed: 2, variante: 'wandelhalle', w: 80, d: 56 }, 4000],
  ['Villen der Gründerzeit', 'slot:mitte_kurstadt', { seed: 3, variante: 'villen', w: 72, d: 44 }, 4000],
  ['Kurhaus, Front -z', 'slot:mitte_kurstadt', { seed: 4, variante: 'kurhaus', w: 100, d: 80, front: '-z' }, 4000],
  ['Wandelhalle, Front +x', 'slot:mitte_kurstadt', { seed: 5, variante: 'wandelhalle', w: 56, d: 80, front: '+x' }, 4000],
  ['Villen, Front -x', 'slot:mitte_kurstadt', { seed: 6, variante: 'villen', w: 44, d: 72, front: '-x' }, 4000],
  ['Kaiserdom', 'slot:mitte_dom_rot', { seed: 1, variante: 'kaiserdom', w: 114, d: 62 }, 4000],
  ['Doppelchöriger Dom', 'slot:mitte_dom_rot', { seed: 2, variante: 'doppelchor', w: 108, d: 58 }, 4000],
  ['Dom mit Stufenturm', 'slot:mitte_dom_rot', { seed: 3, variante: 'westturm', w: 114, d: 62 }, 4000],
  ['Kaiserdom, Front -z', 'slot:mitte_dom_rot', { seed: 4, variante: 'kaiserdom', w: 114, d: 62, front: '-z' }, 4000],
  ['Doppelchöriger Dom, Front +x', 'slot:mitte_dom_rot', { seed: 5, variante: 'doppelchor', w: 58, d: 108, front: '+x' }, 4000],
  ['Dom mit Stufenturm, Front -x', 'slot:mitte_dom_rot', { seed: 6, variante: 'westturm', w: 62, d: 114, front: '-x' }, 4000],
  ['Treppenstraße der 50er', 'slot:mitte_wiederaufbau', { seed: 1, variante: 'treppenstrasse', w: 50, d: 70 }, 4000],
  ['Geschäftshaus mit runder Ecke', 'slot:mitte_wiederaufbau', { seed: 2, variante: 'geschaeftshaus', w: 56, d: 30 }, 2500],
  ['Wiederaufbau-Platz', 'slot:mitte_wiederaufbau', { seed: 3, variante: 'platz', w: 56, d: 48 }, 2500],
  ['Treppenstraße, Front -z', 'slot:mitte_wiederaufbau', { seed: 4, variante: 'treppenstrasse', w: 50, d: 70, front: '-z' }, 4000],
  ['Geschäftshaus, Front +x', 'slot:mitte_wiederaufbau', { seed: 5, variante: 'geschaeftshaus', w: 30, d: 56, front: '+x' }, 2500],
  ['Wiederaufbau-Platz, Front -x', 'slot:mitte_wiederaufbau', { seed: 6, variante: 'platz', w: 48, d: 56, front: '-x' }, 2500],
  ['Alte Universität (Neugotik)', 'slot:mitte_universitaet', { seed: 1, variante: 'alte_uni', w: 62, d: 42 }, 2500],
  ['Betonuniversität der 70er', 'slot:mitte_universitaet', { seed: 2, variante: 'betonuni', w: 88, d: 64 }, 2500],
  ['Klassizistische Aula', 'slot:mitte_universitaet', { seed: 3, variante: 'aula', w: 54, d: 42 }, 2500],
  ['Alte Universität, Front -z', 'slot:mitte_universitaet', { seed: 4, variante: 'alte_uni', w: 62, d: 42, front: '-z' }, 2500],
  ['Betonuni, Front +x', 'slot:mitte_universitaet', { seed: 5, variante: 'betonuni', w: 64, d: 88, front: '+x' }, 2500],
  ['Aula, Front -x', 'slot:mitte_universitaet', { seed: 6, variante: 'aula', w: 42, d: 54, front: '-x' }, 2500],
  ['Römisches Stadttor', 'slot:mitte_roemisch', { seed: 1, variante: 'tor', w: 46, d: 32 }, 2500],
  ['Thermenruine', 'slot:mitte_roemisch', { seed: 2, variante: 'thermen', w: 70, d: 52 }, 2500],
  ['Palastbasilika mit Palais', 'slot:mitte_roemisch', { seed: 3, variante: 'basilika', w: 72, d: 66 }, 2500],
  ['Amphitheater', 'slot:mitte_roemisch', { seed: 4, variante: 'amphitheater', w: 68, d: 54 }, 2500],
  ['Stadttor, Front -z', 'slot:mitte_roemisch', { seed: 5, variante: 'tor', w: 46, d: 32, front: '-z' }, 2500],
  ['Thermenruine, Front +x', 'slot:mitte_roemisch', { seed: 6, variante: 'thermen', w: 52, d: 70, front: '+x' }, 2500],
  ['Palastbasilika, Front -x', 'slot:mitte_roemisch', { seed: 7, variante: 'basilika', w: 66, d: 72, front: '-x' }, 2500],
  ['Amphitheater, Front -z', 'slot:mitte_roemisch', { seed: 8, variante: 'amphitheater', w: 68, d: 54, front: '-z' }, 2500],
  ['Chemiewerk am Rhein', 'slot:mitte_industrie', { seed: 1, variante: 'chemie', w: 140, d: 100 }, 4000],
  ['Tanklager mit Kesselwagen', 'slot:mitte_industrie', { seed: 2, variante: 'tanklager', w: 140, d: 100 }, 4000],
  ['Hüttenwerk an der Saar', 'slot:mitte_industrie', { seed: 3, variante: 'huette', w: 140, d: 100 }, 4000],
  ['Hütte als Industriedenkmal', 'slot:mitte_industrie', { seed: 4, variante: 'denkmal', w: 140, d: 100 }, 4000],
  ['Chemiewerk, Front -z', 'slot:mitte_industrie', { seed: 5, variante: 'chemie', w: 140, d: 100, front: '-z' }, 4000],
  ['Hüttenwerk, Front +x', 'slot:mitte_industrie', { seed: 6, variante: 'huette', w: 100, d: 140, front: '+x' }, 4000],
  ['Tanklager, Front -x', 'slot:mitte_industrie', { seed: 7, variante: 'tanklager', w: 100, d: 140, front: '-x' }, 4000],
  ['Industriedenkmal, Front -z', 'slot:mitte_industrie', { seed: 8, variante: 'denkmal', w: 140, d: 100, front: '-z' }, 4000],
  ['Weinort am Rhein', 'slot:mitte_weinort', { seed: 1, variante: 'rhein', w: 90, d: 80 }, 4000],
  ['Weinort an der Mosel', 'slot:mitte_weinort', { seed: 2, variante: 'mosel', w: 84, d: 88 }, 4000],
  ['Winzerhof mit Burgblick', 'slot:mitte_weinort', { seed: 3, variante: 'winzerhof', w: 80, d: 76 }, 4000],
  ['Weinort Rhein, Front +x', 'slot:mitte_weinort', { seed: 4, variante: 'rhein', w: 80, d: 90, front: '+x' }, 4000],
  ['Weinort Mosel, Front -x', 'slot:mitte_weinort', { seed: 5, variante: 'mosel', w: 88, d: 84, front: '-x' }, 4000],
  ['Winzerhof, Front -z', 'slot:mitte_weinort', { seed: 6, variante: 'winzerhof', w: 80, d: 76, front: '-z' }, 4000],
  ['Großer Kopfbahnhof', 'slot:mitte_bahnhof', { seed: 1, variante: 'gross', w: 176, d: 136 }, 4000],
  ['Kopfbahnhof mit drei Hallen', 'slot:mitte_bahnhof', { seed: 2, variante: 'drei', w: 126, d: 116 }, 4000],
  ['Kopfbahnhof der 50er', 'slot:mitte_bahnhof', { seed: 3, variante: 'nachkrieg', w: 110, d: 104 }, 4000],
  ['Großer Kopfbahnhof, Front -z', 'slot:mitte_bahnhof', { seed: 4, variante: 'gross', w: 176, d: 136, front: '-z' }, 4000],
  ['Drei Hallen, Front +x', 'slot:mitte_bahnhof', { seed: 5, variante: 'drei', w: 116, d: 126, front: '+x' }, 4000],
  ['50er-Bahnhof, Front -x', 'slot:mitte_bahnhof', { seed: 6, variante: 'nachkrieg', w: 104, d: 110, front: '-x' }, 4000],
  ['Oberstadt mit Schloss', 'slot:mitte_oberstadt', { seed: 1, variante: 'schloss', w: 104, d: 90 }, 4000],
  ['Oberstadt mit Dom', 'slot:mitte_oberstadt', { seed: 2, variante: 'dom', w: 100, d: 86 }, 4000],
  ['Oberstadt mit Schloss, Front +x', 'slot:mitte_oberstadt', { seed: 3, variante: 'schloss', w: 90, d: 104, front: '+x' }, 4000],
  ['Oberstadt mit Dom, Front -z', 'slot:mitte_oberstadt', { seed: 4, variante: 'dom', w: 100, d: 86, front: '-z' }, 4000],
];

export function mitteEintraege(liste, nur = null) {
  return liste.filter((e, i) => !nur || nur(e, i)).map(([titel, slot, par, budget]) => ({
    titel,
    bau(S, scene) {
      const p = { x: 0, z: 0, ...par };
      const erg = MITTE_SLOTS[slot](S, scene, p);
      const teile = S.anzahl;
      sockel(S, p.x, p.z, p.w, p.d, 3);
      S.anzahl = teile;
      this.unter = `${slot} ${erg.variante ?? ''}${par.front ? ' · ' + par.front : ''} · ${teile} / ${budget} Teile · ${erg.hoehe.toFixed(0)} m${teile > budget ? ' · ÜBER BUDGET' : ''}`;
      return null;
    },
  }));
}

if (!globalThis.MITTE_KEIN_AUTOSTART) zeigeKatalog(mitteEintraege(MITTE_LISTE), { titel: 'Mittebauten: Hessen, Rheinland-Pfalz, Saarland, Südniedersachsen', spalten: 4, kachel: [520, 520] });
