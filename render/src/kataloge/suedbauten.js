// Katalog Südbauten: alle Slots × Varianten × zwei Ausrichtungen.
import { sockel } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { SUED_SLOTS } from '../kit/suedbauten.js';

// [Titel, Slot, Parameter, Budget, Ausrichtungen]
export const SUED_LISTE = [
  ['Bürgerhäuser Rosenheim-Typ', 'slot:bay_buergerhaus', { seed: 1, variante: 'rosenheim', w: 44, d: 24 }, 2500],
  ['Bürgerhäuser Landshut-Typ', 'slot:bay_buergerhaus', { seed: 2, variante: 'landshut', w: 40, d: 24 }, 2500],
  ['Bürgerhäuser Passau-Typ', 'slot:bay_buergerhaus', { seed: 3, variante: 'passau', w: 44, d: 24 }, 2500],
  ['Bürgerhäuser Wasserburg-Typ', 'slot:bay_buergerhaus', { seed: 4, variante: 'wasserburg', w: 40, d: 24 }, 2500],
  ['München Neorenaissance', 'slot:bay_muenchen', { seed: 1, variante: 'neorenaissance', w: 46, d: 28 }, 2500],
  ['München Neubarock', 'slot:bay_muenchen', { seed: 2, variante: 'neubarock', w: 44, d: 28 }, 2500],
  ['München Wiederaufbau', 'slot:bay_muenchen', { seed: 3, variante: 'wiederaufbau', w: 44, d: 28 }, 2500],
  ['München gemischte Zeile', 'slot:bay_muenchen', { seed: 4, variante: 'zeile', w: 56, d: 28 }, 4000],
  ['Barockkirche Doppelturm', 'slot:bay_zwiebelkirche', { seed: 1, variante: 'doppelturm', w: 44, d: 64 }, 2500],
  ['Stadtpfarrkirche', 'slot:bay_zwiebelkirche', { seed: 2, variante: 'stadtpfarr', w: 40, d: 58 }, 2500],
  ['Wallfahrtskirche', 'slot:bay_zwiebelkirche', { seed: 3, variante: 'wallfahrt', w: 52, d: 54 }, 2500],
  ['Dorfkirche mit Friedhof', 'slot:bay_zwiebelkirche', { seed: 4, variante: 'dorf', w: 34, d: 44 }, 2500],
  ['Wirtshaus mit Biergarten', 'slot:bay_wirtshaus', { seed: 1, variante: 'wirtshaus', w: 50, d: 36 }, 2500],
  ['Bräuhaus mit Biergarten', 'slot:bay_wirtshaus', { seed: 2, variante: 'braeuhaus', w: 60, d: 40 }, 4000],
  ['Brauerei mit Sudhaus und Schlot', 'slot:bay_wirtshaus', { seed: 3, variante: 'brauerei', w: 60, d: 44 }, 2500],
  ['Maibaum Dorfplatz', 'slot:bay_maibaum', { seed: 1, variante: 'dorf', w: 28, d: 28 }, 2500],
  ['Maibaum Marktplatz mit Brunnen', 'slot:bay_maibaum', { seed: 2, variante: 'markt', w: 34, d: 30 }, 2500],
  ['Maibaum Festplatz', 'slot:bay_maibaum', { seed: 3, variante: 'fest', w: 34, d: 32 }, 2500],
  ['Franken Nürnberg-Typ', 'slot:franken_fachwerk', { seed: 1, variante: 'nuernberg', w: 40, d: 22 }, 2500],
  ['Franken Bamberg-Typ', 'slot:franken_fachwerk', { seed: 2, variante: 'bamberg', w: 40, d: 22 }, 2500],
  ['Franken Stadtmauer', 'slot:franken_fachwerk', { seed: 3, variante: 'stadtmauer', w: 60, d: 34 }, 4000],
  ['Alpen Bergpanorama', 'slot:bay_alpen', { seed: 1, variante: 'panorama', w: 90, d: 50 }, 2500],
  ['Voralpenhaus', 'slot:bay_alpen', { seed: 2, variante: 'voralpenhaus', w: 30, d: 30 }, 2500],
  ['Alpengasthof', 'slot:bay_alpen', { seed: 3, variante: 'gasthof', w: 44, d: 32 }, 2500],
  ['Voralpen-Ortsrand', 'slot:bay_alpen', { seed: 4, variante: 'ortsrand', w: 50, d: 50 }, 2500],
  ['Schwäbisches Fachwerk Tübingen-Typ', 'slot:bw_fachwerk', { seed: 1, variante: 'tuebingen', w: 40, d: 22 }, 2500],
  ['Schwäbisches Fachwerk Esslingen-Typ', 'slot:bw_fachwerk', { seed: 2, variante: 'esslingen', w: 42, d: 22 }, 2500],
  ['Marktplatz mit Rathaus und Brunnen', 'slot:bw_fachwerk', { seed: 3, variante: 'marktplatz', w: 44, d: 40 }, 2500],
  ['Stuttgart Stäffele und Hanghäuser', 'slot:bw_stuttgart', { seed: 1, variante: 'staeffele', w: 40, d: 52 }, 2500],
  ['Stuttgart 50er Geschäftshäuser', 'slot:bw_stuttgart', { seed: 2, variante: 'geschaeft50', w: 48, d: 26 }, 2500],
  ['Stuttgart Villa in Halbhöhenlage', 'slot:bw_stuttgart', { seed: 3, variante: 'halbhoehe', w: 40, d: 40 }, 2500],
  ['Stuttgart Kessel mit Weinberg', 'slot:bw_stuttgart', { seed: 4, variante: 'kessel', w: 44, d: 60 }, 2500],
  ['Residenzschloss mit Ehrenhof', 'slot:bw_schloss_barock', { seed: 1, variante: 'residenz', w: 120, d: 90 }, 4000],
  ['Barockes Lustschloss', 'slot:bw_schloss_barock', { seed: 2, variante: 'lustschloss', w: 80, d: 66 }, 4000],
  ['Fächerstadt-Zirkel', 'slot:bw_schloss_barock', { seed: 3, variante: 'zirkel', w: 90, d: 50 }, 4000],
  ['Quadrate-Block', 'slot:bw_schloss_barock', { seed: 4, variante: 'quadrat', w: 70, d: 60 }, 4000],
  ['Münster Freiburg-Typ', 'slot:bw_muenster', { seed: 1, variante: 'freiburg', w: 48, d: 100 }, 4000],
  ['Münster Ulm-Typ', 'slot:bw_muenster', { seed: 2, variante: 'ulm', w: 48, d: 104 }, 4000],
  ['Sandstein-Stadtkirche', 'slot:bw_muenster', { seed: 3, variante: 'stadtkirche', w: 44, d: 96 }, 4000],
  ['Rebterrassen mit Weinberghäuschen', 'slot:sued_weinberg', { seed: 1, variante: 'terrassen', w: 40, d: 40 }, 2500],
  ['Weinberghang', 'slot:sued_weinberg', { seed: 2, variante: 'hang', w: 44, d: 40 }, 2500],
  ['Weingut mit Kelterhaus', 'slot:sued_weinberg', { seed: 3, variante: 'weingut', w: 44, d: 44 }, 2500],
  ['Weinberg mit Kapelle', 'slot:sued_weinberg', { seed: 4, variante: 'kapelle', w: 44, d: 44 }, 2500],
  ['Flussufer mit Steinbrücke', 'slot:sued_fluss', { seed: 1, variante: 'bruecke', w: 60, d: 50 }, 4000],
  ['Fischerhäuser am Wasser', 'slot:sued_fluss', { seed: 2, variante: 'fischer', w: 44, d: 36 }, 2500],
  ['Kai mit altem Kran', 'slot:sued_fluss', { seed: 3, variante: 'kai', w: 60, d: 44 }, 4000],
  ['Rosenheim-Typ verwittert', 'slot:bay_buergerhaus', { seed: 1, variante: 'rosenheim', w: 44, d: 24, zustand: 'verwittert' }, 2500, ['+z']],
  ['München Wiederaufbau Leerstand', 'slot:bay_muenchen', { seed: 3, variante: 'wiederaufbau', w: 44, d: 28, zustand: 'leerstand' }, 2500, ['+z']],
];
const FRONTEN = ['-x', '-z', '+x'];
export function suedEintraege(liste, nur = null) {
  const out = [];
  liste.forEach(([titel, slot, par, budget, fronten], i) => {
    if (nur && !nur(slot, par, i)) return;
    // Hang-Slots haben nur zwei echte Ausrichtungen (+z, +x); -x und -z würden gewendet und doppelt erscheinen
    const hang = SUED_SLOTS[slot].hang?.(par);
    for (const front of fronten ?? (hang ? ['+z', '+x'] : ['+z', FRONTEN[i % 3]])) out.push({
      titel: `${titel} · Front ${front}`,
      bau(S, scene) {
        // Bei Front ±x Breite und Tiefe tauschen, damit die Straßenseite gleich lang bleibt
        const p = { x: 0, z: 0, ...par, front, ...(front === '+x' || front === '-x' ? { w: par.d, d: par.w } : {}) };
        const erg = SUED_SLOTS[slot](S, scene, p);
        const teile = S.anzahl;
        sockel(S, p.x, p.z, p.w, p.d, 3);
        S.anzahl = teile;
        this.unter = `${slot} ${par.variante ?? ''}${par.zustand ? ' · ' + par.zustand : ''} · ${teile} / ${budget} Teile · ${erg.hoehe.toFixed(0)} m${teile > budget ? ' · ÜBER BUDGET' : ''}`;
        return null;
      },
    });
  });
  return out;
}
const nur = globalThis.SUED_NUR ?? (typeof location !== 'undefined' && location.hash ? (s) => location.hash.slice(1).split(',').some((k) => s.includes(k)) : null);
if (!globalThis.SUED_KEIN_AUTOSTART) zeigeKatalog(suedEintraege(SUED_LISTE, nur), { titel: 'Südbauten: Bayern und Baden-Württemberg', spalten: 4, kachel: [520, 520] });
