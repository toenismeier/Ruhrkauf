// Q37: Muster-Typen gehen in Grundtyp plus Muster auf (auftraege/wurf4/daten/q37-mustertypen.csv).
// Drei Grundtypen gab es noch nicht (Faltenrock, Midirock, Strickpullover): sie übernehmen Schnitt, Preis und WG des
// bisherigen Muster-Typs, das Bild ist dieselbe Silhouette ohne Dessin. Alte Spielstände schreibt migriereQ37 um.
// Nebenbefund: „Cargohose“ (Q11) und „Cargo-Hose“ waren doppelt, es bleibt „Cargo-Hose“ (steht im Trend-Zufallsstrom).
import { G, type SortimentTyp } from './basis';
import type { Muster } from '../muster';

export const NAMEN = ['Faltenrock', 'Midirock', 'Strickpullover'] as const;

export const TYPEN: SortimentTyp<(typeof NAMEN)[number]>[] = [
  { typ: 'Faltenrock', kategorie: 'unterteile', wgs: ['damen.hosen', 'damen.young'], saison: 'winter', preis: 69, materialien: ['Merino', 'Polyester'], gruppe: G(0, 0.35, 0.8, 0.95), aufwand: 2, bild: { silhouette: 'karofaltenrock', muster: 'uni' }, pfad: ['unterteile', 'Röcke'] },
  { typ: 'Midirock', kategorie: 'unterteile', wgs: ['damen.hosen', 'damen.young', 'kinder.maedchen'], saison: 'ganz', preis: 39, materialien: ['Viskose', 'Polyester', 'Baumwolle'], gruppe: G(0.1, 0.9, 0.75, 0.5), aufwand: 1, bild: { silhouette: 't_leorock', dessin: '' }, pfad: ['unterteile', 'Röcke'] },
  { typ: 'Strickpullover', kategorie: 'oberteile', wgs: ['damen.strick', 'herren.strick', 'damen.young', 'herren.casual', 'kinder.maedchen', 'kinder.jungen'], saison: 'winter', preis: 39, materialien: ['Baumwolle', 'Merino', 'Bio-Baumwolle'], gruppe: G(0.3, 0.85, 0.8, 0.75), aufwand: 2, bild: { silhouette: 't_schachpulli', dessin: '' }, pfad: ['oberteile', 'Strick'] },
];

/** Alter Typname → Grundtyp und Muster. Norweger- und Weihnachtspullover gab es im Spiel nicht (für spätere Wünsche: Strickpullover + Muster). */
export const MUSTER_ALIAS: Record<string, { typ: string; muster: Muster }> = {
  'Print-Jumpsuit': { typ: 'Jumpsuit', muster: 'Print' },
  Punktekleid: { typ: 'Kleid', muster: 'Punkte' },
  Blumenkleid: { typ: 'Kleid', muster: 'Blumen' },
  Blumenbluse: { typ: 'Bluse', muster: 'Blumen' },
  Ringelshirt: { typ: 'T-Shirt', muster: 'Ringel' },
  'Karo-Anzug': { typ: 'Anzug', muster: 'Karo' },
  Karohemd: { typ: 'Hemd', muster: 'Karo' },
  Streifenhemd: { typ: 'Hemd', muster: 'Streifen' },
  'Karo-Faltenrock': { typ: 'Faltenrock', muster: 'Karo' },
  Karoschal: { typ: 'Schal', muster: 'Karo' },
  'Batik-Shirt': { typ: 'T-Shirt', muster: 'Batik' },
  'Oversize-Printshirt': { typ: 'T-Shirt', muster: 'Print' },
  'Schachbrett-Pullover': { typ: 'Strickpullover', muster: 'Schachbrett' },
  'Batik-Hoodie': { typ: 'Hoodie', muster: 'Batik' },
  'Camouflage-Shirt': { typ: 'T-Shirt', muster: 'Camouflage' },
  'Ringel-Croptop': { typ: 'Crop-Top', muster: 'Ringel' },
  'Camouflage-Cargohose': { typ: 'Cargo-Hose', muster: 'Camouflage' },
  'Karo-Minirock': { typ: 'Minirock', muster: 'Karo' },
  'Regenbogen-Pullover': { typ: 'Strickpullover', muster: 'Print' },
  Karohose: { typ: 'Stoffhose', muster: 'Karo' },
  'Leo-Midirock': { typ: 'Midirock', muster: 'Leo' },
  'Camouflage-Shorts': { typ: 'Cargo-Shorts', muster: 'Camouflage' },
  'Ringel-Hoodie': { typ: 'Hoodie', muster: 'Ringel' },
  'Schachbrett-Shorts': { typ: 'Sweatshorts', muster: 'Schachbrett' },
  'Leo-Shirt': { typ: 'T-Shirt', muster: 'Leo' },
  'Sterne-Pullover': { typ: 'Strickpullover', muster: 'Print' },
  'Herzchen-Croptop': { typ: 'Crop-Top', muster: 'Print' },
  'Karo-Overshirt': { typ: 'Hemdjacke', muster: 'Karo' },
  Norwegerpullover: { typ: 'Strickpullover', muster: 'Norweger' },
  Weihnachtspullover: { typ: 'Strickpullover', muster: 'Print' },
};

/** Umbenennungen ohne Muster (Dublette). */
export const TYP_UMBENANNT: Record<string, string> = { Cargohose: 'Cargo-Hose' };
