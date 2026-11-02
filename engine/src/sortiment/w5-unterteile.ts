// Wurf 5 · V2 Unterteile (Hosen, Jeans, Shorts, Röcke, Leggings): Schnittvarianten mit eigenem Bild und neue Typen (Spielstatus „neu“)
// aus auftraege/wurf5/daten/v-pakete.csv. Nur dieser Chat trägt hier ein (auftraege/wurf5/README.md, Abschnitt Haken).
// Variante: { name, zieltyp, zielgruppen, wgs?, bild: { silhouette }, bildOffen?: true }; bildOffen bis zu Ummos Bildabnahme.
// Silhouetten: render/src/kit/mode/w5-unterteile.js, Zuordnung w5-unterteile-zuordnung.json.
import type { Schnittvariante } from './q42-varianten';
import type { SortimentTyp } from './basis';

export const VARIANTEN_W5_UNTERTEILE: readonly Schnittvariante[] = [];

/** Neue Artikeltypen (Spielstatus „neu“), Aufbau wie q38-oberteile.ts. */
export const NAMEN = [] as const;
export const TYPEN: SortimentTyp<(typeof NAMEN)[number]>[] = [];
