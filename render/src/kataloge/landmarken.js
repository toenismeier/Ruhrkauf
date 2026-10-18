import { zeigeKatalog } from '../kit/katalog.js';
import { baueEintraegeL } from './hilfe-katalog.js';

const liste = [
  // Rathäuser
  ...['backstein', 'renaissance', 'neugotik', 'barock', 'hochhaus', 'sandstein'].flatMap((stil) => [1, 2].map((seed) => [`Rathaus ${stil} · ${seed}`, 'rathaus', { seed, stil }, 2500])),
  ['Rathaus Slot 26×16 (renaiss.)', 'rathaus', { seed: 3, stil: 'renaissance', w: 26, d: 16 }, 2500],
  ['Rathaus Region nord', 'rathaus', { seed: 7, region: 'nord', w: 36, d: 18 }, 2500],
  // Schloss
  ['Schloss Kuppel', 'schloss', { seed: 1, mitte: 'kuppel' }, 6000],
  ['Schloss Giebel', 'schloss', { seed: 2, mitte: 'giebel' }, 6000],
  ['Schloss Uhrturm', 'schloss', { seed: 3, mitte: 'turm', w: 100, d: 80 }, 6000],
  // Tore und Mauer
  ['Stadttor Torturm', 'stadttor', { seed: 1, art: 'turm' }, 2500],
  ['Stadttor Torturm 2', 'stadttor', { seed: 6, art: 'turm' }, 2500],
  ['Stadttor Doppelturm', 'stadttor', { seed: 2, art: 'doppel', w: 24, d: 14 }, 2500],
  ['Stadttor Doppelturm 2', 'stadttor', { seed: 5, art: 'doppel', w: 24, d: 14 }, 2500],
  ['Stadttor Triumphbogen', 'stadttor', { seed: 3, art: 'barock', w: 22, d: 12 }, 2500],
  ['Mauerturm rund', 'stadtmauerturm', { seed: 1, art: 'rund' }, 2500],
  ['Mauerturm eckig', 'stadtmauerturm', { seed: 2, art: 'eckig' }, 2500],
  ['Mauerturm Schale', 'stadtmauerturm', { seed: 3, art: 'schale' }, 2500],
  // Denkmäler
  ['Denkmal Säule', 'denkmal', { seed: 1, art: 'saeule' }, 2500],
  ['Denkmal Reiter', 'denkmal', { seed: 2, art: 'reiter' }, 2500],
  ['Denkmal Obelisk', 'denkmal', { seed: 3, art: 'obelisk' }, 2500],
  // Wassertürme
  ['Wasserturm Backstein', 'wasserturm', { seed: 1, art: 'backstein' }, 2500],
  ['Wasserturm Pilz', 'wasserturm', { seed: 2, art: 'pilz' }, 2500],
  ['Wasserturm Stein', 'wasserturm', { seed: 3, art: 'stein' }, 2500],
  // Brücken
  ['Brücke Steinbogen', 'bruecke', { seed: 1, art: 'stein' }, 2500],
  ['Brücke Stahlfachwerk', 'bruecke', { seed: 2, art: 'stahl' }, 2500],
  // Kulturbauten
  ['Theater modern', 'kulturbau', { seed: 1, art: 'theater', variante: 'modern' }, 2500],
  ['Museum modern', 'kulturbau', { seed: 2, art: 'museum', variante: 'modern' }, 2500],
  ['Museum Backstein', 'kulturbau', { seed: 3, art: 'museum', variante: 'backstein' }, 2500],
  ['Markthalle Beton', 'markthalle', { seed: 1, variante: 'beton' }, 2500],
  // Hotels, Konkurrenz
  ['Hotel Turm', 'hotel', { seed: 1, stil: 'turm' }, 2500],
  ['Hotel Fünfziger', 'hotel', { seed: 2, stil: 'fuenfziger' }, 2500],
  ['Zentra Kaufhaus', 'konkurrenz', { seed: 1, marke: 'zentra' }, 2500],
  ['Modehaus Lederer', 'konkurrenz', { seed: 2, marke: 'lederer' }, 2500],
  ['Kaufring Warenhaus', 'konkurrenz', { seed: 3, marke: 'kaufring' }, 2500],
  ['Klassizismus Rotunde', 'kirche', { seed: 4, stil: 'klassizismus', form: 'rotunde', w: 46, d: 24 }, 2500],
  ['Klassizismus Rotunde 2', 'kirche', { seed: 5, stil: 'klassizismus', form: 'rotunde', w: 40, d: 30 }, 2500],
  ['Bahnhof Slot 80×24', 'empfangsgebaeude', { seed: 2, w: 80, d: 24 }, 6000],
];
zeigeKatalog(baueEintraegeL(liste), { titel: 'Landmarken und Varianten', spalten: 6, kachel: [400, 400] });
