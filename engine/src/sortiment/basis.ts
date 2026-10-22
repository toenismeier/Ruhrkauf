// Gemeinsame Bausteine für die Sortimentsdateien (q27-mode, q28-zubehoer, q29-home). Keine Importe aus ./index (Zirkel).
import type { TypDef, TrendGruppe } from '../produkte';

/** Bildschnittstelle zur Grafik: Silhouette plus optionale Parameter (aermel, laenge, kragen, passform, muster, form, art …). */
export interface ArtikelBild { silhouette: string; [parameter: string]: string | number | boolean }

/** Artikeltyp eines Bild-Chats: wie TypDef, mit Pflichtfeld bild; pfad optional ([Baumkategorie, Unterkategorie] aus produkt-sortiment.ts). */
export type SortimentTyp<N extends string = string> = Omit<TypDef, 'typ' | 'bild'> & { typ: N; bild: ArtikelBild };

/** Passung je Zielgruppe 0..1 (kinder, jung, mitte, reif). */
export const G = (kinder: number, jung: number, mitte: number, reif: number): Record<TrendGruppe, number> => ({ kinder, jung, mitte, reif });
