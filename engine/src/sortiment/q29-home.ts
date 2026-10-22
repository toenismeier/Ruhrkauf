// Q29: neue Artikeltypen (Home, Beauty, Spielwaren). Nur diese Datei füllen; Haken in ./index.ts, Typen in ./basis.ts.
// NAMEN: alle neuen Typnamen (eindeutig, nicht schon in produkte.ts); TYPEN: je Name ein Eintrag mit bild.
import type { SortimentTyp } from './basis';
// Hilfen: import { G } from './basis'; G(kinder, jung, mitte, reif) für die Passung je Zielgruppe.

export const NAMEN = [] as const;
export const TYPEN: SortimentTyp<(typeof NAMEN)[number]>[] = [];
