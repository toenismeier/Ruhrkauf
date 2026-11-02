// Wurf 5 · V3 Kleider, Jumpsuits, Anlass-Kleider: Schnittvarianten mit eigenem Bild und neue Typen (Spielstatus „neu“)
// aus auftraege/wurf5/daten/v-pakete.csv. Nur dieser Chat trägt hier ein (auftraege/wurf5/README.md, Abschnitt Haken).
// Variante: { name, zieltyp, zielgruppen, wgs?, bild: { silhouette }, bildOffen?: true }; bildOffen bis zu Ummos Bildabnahme.
// Silhouetten: render/src/kit/mode/w5-kleider.js, Zuordnung w5-kleider-zuordnung.json.
import type { Schnittvariante } from './q42-varianten';
import type { SortimentTyp } from './basis';

export const VARIANTEN_W5_KLEIDER: readonly Schnittvariante[] = [];

/** Neue Artikeltypen (Spielstatus „neu“), Aufbau wie q38-oberteile.ts. */
export const NAMEN = [] as const;
export const TYPEN: SortimentTyp<(typeof NAMEN)[number]>[] = [];
