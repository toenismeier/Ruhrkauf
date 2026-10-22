// Gemeinsamer Haken für neue Artikeltypen der Bild-Chats (Q27 Mode, Q28 Zubehör, Q29 Home/Beauty/Spielwaren).
// Jeder Chat trägt nur in seine eigene Datei ein (NAMEN + TYPEN); produkte.ts hängt SORTIMENT_TYPEN an ARTIKELTYPEN an.
// bild verweist auf eine Silhouette aus render/src/kit/mode/silhouetten.json (Parameter überschreiben deren Standard).
import type { SortimentTyp } from './basis';
import * as Q27 from './q27-mode';
import * as Q28 from './q28-zubehoer';
import * as Q29 from './q29-home';
export { G, type ArtikelBild, type SortimentTyp } from './basis';

export type SortimentName = (typeof Q27.NAMEN)[number] | (typeof Q28.NAMEN)[number] | (typeof Q29.NAMEN)[number];

export const SORTIMENT_TYPEN: SortimentTyp<SortimentName>[] = [...Q27.TYPEN, ...Q28.TYPEN, ...Q29.TYPEN];
