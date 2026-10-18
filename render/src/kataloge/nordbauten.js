// Katalog Nordbauten: alle Slots aus nordbauten.js, je Variante in mindestens zwei Ausrichtungen (Front zur Straße).
import { sockel, FARBEN } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { NORD_SLOTS, NORD_META } from '../kit/nordbauten.js';

/** Rechteck minus Loch als bis zu vier Rechtecke. */
function ohne([x0, z0, x1, z1], [a0, b0, a1, b1]) {
  a0 = Math.max(a0, x0); a1 = Math.min(a1, x1); b0 = Math.max(b0, z0); b1 = Math.min(b1, z1);
  if (a0 >= a1 || b0 >= b1) return [[x0, z0, x1, z1]];
  return [[x0, z0, x1, b0], [x0, b1, x1, z1], [x0, b0, a0, b1], [a1, b0, x1, b1]].filter(([p, q, r, s]) => r - p > 0.01 && s - q > 0.01);
}
/** Sockel wie basis.sockel, aber mit Aussparung für abgesenktes Wasser. */
function sockelMitWasser(S, x0, z0, w, d, rand, loch) {
  const au = rand + 4;
  for (const [a, b, c, e] of ohne([x0 - au, z0 - au, x0 + w + au, z0 + d + au], loch)) S.quader(a, -0.2, b, c, 0, e, FARBEN.asphalt);
  for (const [a, b, c, e] of ohne([x0 - rand, z0 - rand, x0 + w + rand, z0 + d + rand], loch)) S.quader(a, 0, b, c, 0.3, e, FARBEN.gehweg);
}

// [Titel, Slot, Parameter (L = Frontlänge, T = Tiefe, lokal), Budget, Ausrichtungen]
export const NORD_LISTE = [
  ['Giebelhäuser Lübecker Typ', 'slot:nord_giebelhaus', { seed: 1, variante: 'luebeck', L: 48, T: 16 }, 2500, ['+z', '+x']],
  ['Giebelhäuser Stralsunder Typ', 'slot:nord_giebelhaus', { seed: 2, variante: 'stralsund', L: 44, T: 16 }, 2500, ['+z', '-x']],
  ['Giebelhäuser Lüneburger Typ', 'slot:nord_giebelhaus', { seed: 3, variante: 'lueneburg', L: 44, T: 16 }, 2500, ['+z', '-z']],
  ['Giebelhäuser verputzt, Pastell', 'slot:nord_giebelhaus', { seed: 4, variante: 'pastell', L: 46, T: 16 }, 2500, ['+z', '+x']],
  ['Kontorhaus mit spitzer Ecke', 'slot:nord_kontorhaus', { seed: 1, variante: 'spitz', L: 72, T: 40 }, 4000, ['+z', '+x']],
  ['Kontorhaus Block mit Staffeln', 'slot:nord_kontorhaus', { seed: 2, variante: 'block', L: 64, T: 44 }, 4000, ['+z', '-x']],
  ['Kontor-Hochhaus mit Kuppel', 'slot:nord_kontorhaus', { seed: 3, variante: 'turm', L: 56, T: 40 }, 4000, ['+z', '-z']],
  ['Speicherstadt-Block am Fleet', 'slot:nord_speicher', { seed: 1, variante: 'speicherstadt', L: 60, T: 40 }, 4000, ['+z', '+x']],
  ['Giebelspeicher am Wasser', 'slot:nord_speicher', { seed: 2, variante: 'giebel', L: 44, T: 36 }, 2500, ['+z', '-x']],
  ['Lagerhaus schlicht', 'slot:nord_speicher', { seed: 3, variante: 'schlicht', L: 50, T: 36 }, 2500, ['+z', '-z']],
  ['Speicherstadt umgenutzt (Lofts)', 'slot:nord_speicher', { seed: 4, variante: 'speicherstadt', zustand: 'umgenutzt', L: 60, T: 40 }, 4000, ['+z', '+x']],
  ['Wiederaufbau Kieler Typ', 'slot:nord_wiederaufbau', { seed: 1, variante: 'kiel', L: 40, T: 18 }, 2500, ['+z', '+x']],
  ['Wiederaufbau Hannover, Staffel', 'slot:nord_wiederaufbau', { seed: 2, variante: 'hannover', L: 44, T: 18 }, 2500, ['+z', '-x']],
  ['Laubenganghaus der 50er', 'slot:nord_wiederaufbau', { seed: 3, variante: 'laubengang', L: 40, T: 20 }, 2500, ['+z', '-z']],
  ['Geschäftshaus der 50er', 'slot:nord_wiederaufbau', { seed: 4, variante: 'geschaeft', L: 36, T: 22 }, 2500, ['+z', '+x']],
  ['Rotklinker-Block Schumacher-Typ', 'slot:nord_reihenhaus', { seed: 1, variante: 'schumacher', L: 50, T: 22 }, 2500, ['+z', '+x']],
  ['Bremer Häuser mit Vortreppe', 'slot:nord_reihenhaus', { seed: 2, variante: 'bremer', L: 34, T: 18 }, 2500, ['+z', '-x']],
  ['Klinkersiedlung der 30er', 'slot:nord_reihenhaus', { seed: 3, variante: 'siedlung', L: 38, T: 18 }, 2500, ['+z', '-z']],
  ['Backsteinbasilika Marien-Typ', 'slot:nord_kirche', { seed: 1, variante: 'marien', L: 40, T: 76 }, 4000, ['+z', '+x']],
  ['Hallenkirche mit Westturm', 'slot:nord_kirche', { seed: 2, variante: 'hallen', L: 34, T: 64 }, 4000, ['+z', '-x']],
  ['Doppelturmkirche', 'slot:nord_kirche', { seed: 3, variante: 'doppelturm', L: 40, T: 76 }, 4000, ['+z', '-z']],
  ['Dorfkirche mit Kirchhof', 'slot:nord_kirche', { seed: 4, variante: 'dorf', L: 24, T: 36 }, 2500, ['+z', '+x']],
  ['Kirchenruine als Mahnmal', 'slot:nord_kirche', { seed: 5, variante: 'hallen', zustand: 'ruine', L: 34, T: 64 }, 4000, ['+z', '+x']],
  ['Rathaus mit Schauwand', 'slot:nord_rathaus', { seed: 1, variante: 'schauwand', L: 40, T: 26 }, 4000, ['+z', '+x']],
  ['Rathaus mit Laube', 'slot:nord_rathaus', { seed: 2, variante: 'laube', L: 42, T: 24 }, 4000, ['+z', '-x']],
  ['Rathaus Weserrenaissance-Typ', 'slot:nord_rathaus', { seed: 3, variante: 'renaissance', L: 40, T: 26 }, 4000, ['+z', '-z']],
  ['Hafenkante mit Kränen', 'slot:nord_hafen', { seed: 1, variante: 'kai', L: 70, T: 50 }, 4000, ['+z', '+x']],
  ['Anleger mit Ausflugsdampfer', 'slot:nord_hafen', { seed: 2, variante: 'anleger', L: 60, T: 44 }, 4000, ['+z', '-x']],
  ['Mole mit Leuchtturm', 'slot:nord_hafen', { seed: 3, variante: 'leuchtturm', L: 50, T: 50 }, 2500, ['+z', '-z']],
  ['Fischmarkt am Kai', 'slot:nord_hafen', { seed: 4, variante: 'fischmarkt', L: 56, T: 44 }, 4000, ['+z', '+x']],
  ['Galerieholländer', 'slot:nord_windmuehle', { seed: 1, variante: 'galerie', L: 40, T: 36 }, 2500, ['+z', '+x']],
  ['Erdholländer mit Reet', 'slot:nord_windmuehle', { seed: 2, variante: 'erd', L: 32, T: 30 }, 2500, ['+z', '-x']],
  ['Bockwindmühle', 'slot:nord_windmuehle', { seed: 3, variante: 'bock', L: 28, T: 28 }, 2500, ['+z', '-z']],
  ['Fachhallenhaus mit Reetdach', 'slot:nord_bauernhaus', { seed: 1, variante: 'fachhalle', L: 26, T: 40 }, 2500, ['+z', '+x']],
  ['Hallenhaus in Backstein', 'slot:nord_bauernhaus', { seed: 2, variante: 'backstein', L: 24, T: 38 }, 2500, ['+z', '-x']],
  ['Friesenhaus mit Steinwall', 'slot:nord_bauernhaus', { seed: 3, variante: 'friesen', L: 32, T: 22 }, 2500, ['+z', '-z']],
  ['Bauernhof mit Scheune', 'slot:nord_bauernhaus', { seed: 4, variante: 'hof', L: 44, T: 40 }, 2500, ['+z', '+x']],
  ['Strandpromenade mit Villen', 'slot:nord_strandpromenade', { seed: 1, variante: 'villen', L: 60, T: 50 }, 4000, ['+z', '+x']],
  ['Kurhaus am Strand', 'slot:nord_strandpromenade', { seed: 2, variante: 'kurhaus', L: 70, T: 50 }, 4000, ['+z', '-x']],
  ['Seebrücke mit Bäderarchitektur', 'slot:nord_strandpromenade', { seed: 3, variante: 'seebruecke', L: 64, T: 56 }, 4000, ['+z', '-z']],
];

export function nordEintraege(liste, nur = null) {
  const aus = [];
  liste.forEach((e, i) => {
    const [titel, slot, par, budget, fronten] = e;
    for (const front of fronten) {
      if (nur && !nur(e, i, front)) continue;
      aus.push({
        titel: `${titel} · Front ${front}`,
        bau(S, scene) {
          const quer = front[1] === 'x';
          const p = { x: 0, z: 0, seed: par.seed, variante: par.variante, zustand: par.zustand, front, w: quer ? par.T : par.L, d: quer ? par.L : par.T };
          const erg = NORD_SLOTS[slot](S, scene, p);
          const teile = S.anzahl;
          if (NORD_META[slot].wasserAbgesenkt && erg.wasser) sockelMitWasser(S, p.x, p.z, p.w, p.d, 3, erg.wasser); else sockel(S, p.x, p.z, p.w, p.d, 3);
          S.anzahl = teile;
          this.unter = `${slot} ${par.variante ?? ''}${par.zustand ? ' · ' + par.zustand : ''} · ${teile} / ${budget} Teile · ${erg.hoehe.toFixed(0)} m${teile > budget ? ' · ÜBER BUDGET' : ''}`;
          return null;
        },
      });
    }
  });
  return aus;
}

if (!globalThis.NORD_KEIN_AUTOSTART) zeigeKatalog(nordEintraege(NORD_LISTE), { titel: 'Nordbauten: Hanse, Backstein, Küste', spalten: 4, kachel: [520, 520] });
