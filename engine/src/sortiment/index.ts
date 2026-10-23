// Gemeinsamer Haken für neue Artikeltypen der Bild-Chats (Q27 Mode, Q28 Zubehör, Q29 Home/Beauty/Spielwaren, Q34 Erwachsene).
// Jeder Chat trägt nur in seine eigene Datei ein (NAMEN + TYPEN); produkte.ts hängt SORTIMENT_TYPEN an ARTIKELTYPEN an.
// bild verweist auf eine Silhouette aus render/src/kit/mode/silhouetten.json (Parameter überschreiben deren Standard).
import type { SortimentTyp } from './basis';
import * as Q27 from './q27-mode';
import * as Q28 from './q28-zubehoer';
import * as Q29 from './q29-home';
import * as Q34 from './q34-erwachsen';
import { KORREKTUREN as Q34_KORREKTUREN, type Korrektur } from './q34-zielgruppen';
export { G, type ArtikelBild, type SortimentTyp } from './basis';

export type SortimentName = (typeof Q27.NAMEN)[number] | (typeof Q28.NAMEN)[number] | (typeof Q29.NAMEN)[number] | (typeof Q34.NAMEN)[number];

export const SORTIMENT_TYPEN: SortimentTyp<SortimentName>[] = [...Q27.TYPEN, ...Q28.TYPEN, ...Q29.TYPEN, ...Q34.TYPEN];

/** Korrekturen bestehender Typen (Bild, Zielgruppe) je Sortimentspaket; produkte.ts wendet sie nach dem Aufbau an. */
export const SORTIMENT_KORREKTUREN: Record<string, Korrektur> = { ...Q34_KORREKTUREN };
