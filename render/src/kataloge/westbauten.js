// Katalog der Westbauten: jeder Schlüssel mit 3 bis 4 Varianten in mindestens zwei Ausrichtungen.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { WEST_SLOTS, WEST_META } from '../kit/westbauten.js';

// [Titel, Slot, Parameter (w, d = Slotgröße in Weltkoordinaten), Budget, Ausrichtungen]
export const WEST_LISTE = [
  ['Zeche Strebengerüst, aktiv', 'slot:ruhr_zeche', { seed: 1, variante: 'strebe', zustand: 'aktiv', w: 96, d: 76 }, 4000],
  ['Zeche Strebengerüst, stillgelegt', 'slot:ruhr_zeche', { seed: 2, variante: 'strebe', zustand: 'stillgelegt', w: 96, d: 76 }, 4000],
  ['Zeche Doppelbock, Industriekultur', 'slot:ruhr_zeche', { seed: 3, variante: 'doppelbock', zustand: 'museum', w: 100, d: 76 }, 4000],
  ['Zeche mit Malakowturm, stillgelegt', 'slot:ruhr_zeche', { seed: 7, variante: 'malakow', zustand: 'stillgelegt', w: 96, d: 76 }, 4000],
  ['Kokerei, Industriekultur', 'slot:ruhr_kokerei', { seed: 1, variante: 'kokerei', zustand: 'museum', w: 110, d: 70 }, 4000],
  ['Kokerei, aktiv', 'slot:ruhr_kokerei', { seed: 4, variante: 'kokerei', zustand: 'aktiv', w: 110, d: 70 }, 4000],
  ['Hütte mit Hochofen, Landschaftspark', 'slot:ruhr_kokerei', { seed: 2, variante: 'huette', zustand: 'museum', w: 100, d: 76 }, 4000],
  ['Hütte mit Hochofen, aktiv', 'slot:ruhr_kokerei', { seed: 5, variante: 'huette', zustand: 'aktiv', w: 100, d: 76 }, 4000],
  ['Gasometer, Ausstellung', 'slot:ruhr_kokerei', { seed: 3, variante: 'gasometer', zustand: 'museum', w: 56, d: 56 }, 2500],
  ['Halde mit Stahlpyramide', 'slot:ruhr_halde', { seed: 1, variante: 'pyramide', w: 70, d: 70 }, 2500],
  ['Halde mit Bramme', 'slot:ruhr_halde', { seed: 2, variante: 'bramme', w: 60, d: 60 }, 2500],
  ['Halde mit Himmelsleiter', 'slot:ruhr_halde', { seed: 3, variante: 'treppe', w: 60, d: 60 }, 2500],
  ['Halde mit Gipfelkreuz', 'slot:ruhr_halde', { seed: 4, variante: 'kreuz', w: 64, d: 60 }, 2500],
  ['Zechenkolonie Doppelhäuser', 'slot:ruhr_siedlung', { seed: 1, variante: 'kolonie', w: 72, d: 36 }, 4000],
  ['Zechenkolonie Doppelhäuser, Traufseite', 'slot:ruhr_siedlung', { seed: 6, variante: 'kolonie', w: 56, d: 34 }, 2500],
  ['Kolonie mit Kreuzgrundriss', 'slot:ruhr_siedlung', { seed: 2, variante: 'kreuz', w: 60, d: 40 }, 2500],
  ['Gartenstadt', 'slot:ruhr_siedlung', { seed: 3, variante: 'gartenstadt', w: 64, d: 32 }, 4000],
  ['Geschäftszeile der 60er und 70er', 'slot:ruhr_innenstadt60', { seed: 1, variante: 'zeile', w: 64, d: 32 }, 4000],
  ['Geschäftszeile, andere Mischung', 'slot:ruhr_innenstadt60', { seed: 5, variante: 'zeile', w: 52, d: 30 }, 4000],
  ['Kaufhaus mit Wabenfassade', 'slot:ruhr_innenstadt60', { seed: 2, variante: 'kaufhaus', w: 64, d: 36 }, 4000],
  ['Geschäftshochhaus am Markt', 'slot:ruhr_innenstadt60', { seed: 3, variante: 'hochhaus', w: 56, d: 36 }, 4000],
  ['Konzernverwaltung 60er, Glasscheibe', 'slot:ruhr_buero', { seed: 1, variante: 'glas60', w: 70, d: 44 }, 4000],
  ['Verwaltungsturm 70er', 'slot:ruhr_buero', { seed: 2, variante: 'turm70', w: 52, d: 56 }, 4000],
  ['Backstein-Verwaltung der 20er', 'slot:ruhr_buero', { seed: 3, variante: 'backstein20', w: 66, d: 34 }, 4000],
  ['Trinkhalle', 'slot:ruhr_bude', { seed: 1, variante: 'trinkhalle', w: 18, d: 15 }, 2500],
  ['Imbiss', 'slot:ruhr_bude', { seed: 2, variante: 'imbiss', w: 18, d: 15 }, 2500],
  ['Ladenzeile mit Wettbüro und Shisha-Bar', 'slot:ruhr_bude', { seed: 3, variante: 'zeile', w: 24, d: 18 }, 2500],
  ['Kanalstrecke mit Bogenbrücke', 'slot:ruhr_kanal', { seed: 1, variante: 'strecke', w: 100, d: 64 }, 4000],
  ['Hafenbecken mit Kränen', 'slot:ruhr_kanal', { seed: 2, variante: 'hafen', w: 90, d: 64 }, 4000],
  ['Schleuse mit Hubtor', 'slot:ruhr_kanal', { seed: 3, variante: 'schleuse', w: 100, d: 60 }, 4000],
  ['Einkaufszentrum 70er mit Dachparkdeck', 'slot:ruhr_einkaufszentrum', { seed: 1, variante: '70er', w: 100, d: 80 }, 4000],
  ['Einkaufszentrum 80er', 'slot:ruhr_einkaufszentrum', { seed: 2, variante: '80er', w: 110, d: 80 }, 4000],
  ['Einkaufszentrum 90er mit Parkhaus', 'slot:ruhr_einkaufszentrum', { seed: 3, variante: '90er', w: 120, d: 84 }, 4000],
  ['Bahnhof 70er mit Busbahnhof', 'slot:ruhr_bahnhof', { seed: 1, variante: '70er', w: 84, d: 60 }, 4000],
  ['Bahnhof 50er', 'slot:ruhr_bahnhof', { seed: 2, variante: '50er', w: 84, d: 60 }, 4000],
  ['Bahnhof um 1910 mit Busbahnhof', 'slot:ruhr_bahnhof', { seed: 3, variante: 'altbau', w: 84, d: 60 }, 4000],
  ['Kampfbahn mit Stehwällen', 'slot:ruhr_stadion', { seed: 1, variante: 'kampfbahn', w: 130, d: 100 }, 4000],
  ['Stadion der 70er', 'slot:ruhr_stadion', { seed: 2, variante: 'stadion70', w: 130, d: 100 }, 4000],
  ['Arena', 'slot:ruhr_stadion', { seed: 3, variante: 'arena', w: 130, d: 100 }, 4000],
  ['Gründerzeitzeile, Wohnen', 'slot:rhein_gruenderzeit', { seed: 1, variante: 'wohnen', w: 44, d: 24 }, 4000],
  ['Gründerzeitzeile mit Läden', 'slot:rhein_gruenderzeit', { seed: 2, variante: 'laden', w: 40, d: 22 }, 4000],
  ['Gründerzeit-Eckhaus mit Turm', 'slot:rhein_gruenderzeit', { seed: 3, variante: 'eck', w: 34, d: 22 }, 4000],
  ['50er Geschäftshaus, Naturstein und Raster', 'slot:rhein_wiederaufbau', { seed: 1, variante: 'geschaeft', w: 40, d: 24 }, 2500],
  ['50er Hochhausscheibe', 'slot:rhein_wiederaufbau', { seed: 2, variante: 'hochhaus', w: 44, d: 36 }, 2500],
  ['50er Wohnzeile mit Balkonen', 'slot:rhein_wiederaufbau', { seed: 3, variante: 'wohnhaus', w: 44, d: 28 }, 2500],
  ['Rheinpromenade mit Kasematten', 'slot:rhein_promenade', { seed: 1, variante: 'doppelt', w: 80, d: 50 }, 4000],
  ['Rheinufer mit Freitreppe', 'slot:rhein_promenade', { seed: 2, variante: 'treppe', w: 70, d: 46 }, 4000],
  ['Schiffsanleger', 'slot:rhein_promenade', { seed: 3, variante: 'anleger', w: 80, d: 56 }, 4000],
  ['Giebelhäuser mit Bogengang', 'slot:westf_giebelhaus', { seed: 1, variante: 'markt', w: 44, d: 24 }, 4000],
  ['Giebelhäuser Renaissance', 'slot:westf_giebelhaus', { seed: 2, variante: 'renaissance', w: 34, d: 24 }, 4000],
  ['Giebelhäuser Wiederaufbau', 'slot:westf_giebelhaus', { seed: 3, variante: 'nachkrieg', w: 34, d: 24 }, 2500],
];
const WASSER = new Set(Object.keys(WEST_META).filter((k) => WEST_META[k].wasser));
const AUSRICHTUNG = { '+z': 'Front +z', '+x': 'Front +x', '-z': 'Front -z', '-x': 'Front -x' };

export function westEintraege(liste, fronten = ['+z', '+x']) {
  const out = [];
  for (const [titel, slot, par, budget, eigene] of liste) for (const front of eigene ?? fronten) out.push({
    titel: `${titel} · ${AUSRICHTUNG[front]}`,
    hintergrund: WASSER.has(slot) ? '#cfd6d9' : undefined,   // Wasserslots: heller neutraler Grund, damit FARBEN.wasser nicht im Türkis des Standardhintergrunds verschwimmt
    bau(S, scene) {
      const quer = front[1] === 'x';
      const p = { x: 0, z: 0, ...par, w: quer ? par.d : par.w, d: quer ? par.w : par.d, front };
      const erg = WEST_SLOTS[slot](S, scene, p);
      const teile = S.anzahl;
      if (WASSER.has(slot)) {
        // Sockel ohne Mitte: das Wasser liegt unter Geländeniveau
        S.box(p.w + 14, 0.2, p.d + 14, p.x + p.w / 2, -0.1 + (WEST_META[slot].wasserY ?? -2.2) - 1.4, p.z + p.d / 2, '#8d939a');
      } else sockel(S, p.x, p.z, p.w, p.d, 3);
      S.anzahl = teile;
      this.unter = `${slot} ${par.variante ?? ''}${erg.zustand ? ' · ' + erg.zustand : ''} · ${teile} / ${budget} Teile · ${erg.hoehe.toFixed(0)} m${teile > budget ? ' · ÜBER BUDGET' : ''}`;
      return null;
    },
  });
  return out;
}

if (!globalThis.WEST_KEIN_AUTOSTART) zeigeKatalog(westEintraege(WEST_LISTE), { titel: 'Westbauten: Ruhrgebiet, Rheinland, Westfalen', spalten: 4, kachel: [520, 520] });
