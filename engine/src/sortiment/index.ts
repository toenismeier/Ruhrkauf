// Gemeinsamer Haken für neue Artikeltypen der Bild-Chats (Q27 Mode, Q28 Zubehör, Q29 Home/Beauty/Spielwaren, Q33 jung).
// Jeder Chat trägt nur in seine eigene Datei ein (NAMEN + TYPEN); produkte.ts hängt SORTIMENT_TYPEN an ARTIKELTYPEN an.
// bild verweist auf eine Silhouette aus render/src/kit/mode/silhouetten.json (Parameter überschreiben deren Standard).
import type { SortimentTyp } from './basis';
import type { BaumKategorie, ProduktZielgruppe } from '../produkt-sortiment';
import * as Q27 from './q27-mode';
import * as Q28 from './q28-zubehoer';
import * as Q29 from './q29-home';
import * as Q33 from './q33-jung';
import { q33Kinder, q33Teens, q33Young, q33Pfad, BILD_Q33, Q33_ZUORDNUNG, type ZgTyp } from './q33-zielgruppen';
export { G, type ArtikelBild, type SortimentTyp } from './basis';

export type SortimentName = (typeof Q27.NAMEN)[number] | (typeof Q28.NAMEN)[number] | (typeof Q29.NAMEN)[number] | (typeof Q33.NAMEN)[number];

export const SORTIMENT_TYPEN: SortimentTyp<SortimentName>[] = [...Q27.TYPEN, ...Q28.TYPEN, ...Q29.TYPEN, ...Q33.TYPEN];

/** Sichtbare Zielgruppen eines Artikeltyps in der Sortimentsnavigation. Kinder/Teens/Young: Q33; Adults/Best Ager: Gewicht ≥ 0,4, Home immer. */
export function zielgruppenFuer(t: ZgTyp): ProduktZielgruppe[] {
  const z: ProduktZielgruppe[] = [];
  if (q33Kinder(t)) z.push('kinder');
  if (q33Teens(t)) z.push('teens');
  if (q33Young(t)) z.push('young');
  // Kinderartikel nie für Erwachsene; Q33-Typen (Kinder, Teens) nur über ihr Gewicht, auch im Home-Bereich
  const kind = t.kategorie === 'kinder' || /^Kinder/.test(t.typ);
  const home = t.kategorie === 'home' && !Q33_ZUORDNUNG.has(t.typ);
  if (!kind && (home || (t.gruppe.mitte ?? 0) >= 0.4)) z.push('adults');
  if (!kind && (home || (t.gruppe.reif ?? 0) >= 0.4)) z.push('bestager');
  return z;
}

/** Platz im Sortimentsbaum (Q33: Kinderartikel nach Art statt doppelter Ebene „Kinder und Baby“). */
export const sortimentsPlatz = (t: ZgTyp, basis: (typ: string, kategorie: string) => readonly [BaumKategorie, string]) => q33Pfad(t, basis);

/** Q33: Bildkorrekturen bestehender Typen (nur Grafik, keine Wirkung auf die Wirtschaft). */
export const BILD_KORREKTUR: Readonly<Record<string, { silhouette: string }>> = BILD_Q33;
