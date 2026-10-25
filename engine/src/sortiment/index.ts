// Gemeinsamer Haken für neue Artikeltypen der Bild-Chats (Q27 Mode, Q28 Zubehör, Q29 Home/Beauty/Spielwaren, Q33 jung, Q34 Erwachsene,
// Q37 Muster-Grundtypen und Freischaltungen, Q38 Oberteile aus dem Referenzsortiment).
// Jeder Chat trägt nur in seine eigene Datei ein (NAMEN + TYPEN); produkte.ts hängt SORTIMENT_TYPEN an ARTIKELTYPEN an.
// bild verweist auf eine Silhouette aus render/src/kit/mode/silhouetten.json (Parameter überschreiben deren Standard).
import type { SortimentTyp } from './basis';
import type { BaumKategorie, ProduktZielgruppe } from '../produkt-sortiment';
import * as Q27 from './q27-mode';
import * as Q28 from './q28-zubehoer';
import * as Q29 from './q29-home';
import * as Q33 from './q33-jung';
import * as Q34 from './q34-erwachsen';
import * as Q37 from './q37-muster';
import { Q37_ZUSATZ, KORREKTUREN as Q37_KORREKTUREN } from './q37-zielgruppen';
import * as Q38 from './q38-oberteile';
import { q33Kinder, q33Teens, q33Young, q33Pfad, BILD_Q33, Q33_ZUORDNUNG, type ZgTyp } from './q33-zielgruppen';
import { KORREKTUREN as Q34_KORREKTUREN, type Korrektur } from './q34-zielgruppen';
export { G, type ArtikelBild, type SortimentTyp } from './basis';

export type SortimentName = (typeof Q27.NAMEN)[number] | (typeof Q28.NAMEN)[number] | (typeof Q29.NAMEN)[number] | (typeof Q33.NAMEN)[number] | (typeof Q34.NAMEN)[number] | (typeof Q37.NAMEN)[number] | (typeof Q38.NAMEN)[number];

export const SORTIMENT_TYPEN: SortimentTyp<SortimentName>[] = [...Q27.TYPEN, ...Q28.TYPEN, ...Q29.TYPEN, ...Q34.TYPEN, ...Q33.TYPEN, ...Q37.TYPEN, ...Q38.TYPEN];

/** Korrekturen bestehender Typen (Bild, Zielgruppe) je Sortimentspaket; produkte.ts wendet sie nach dem Aufbau an.
 * Q33-Kinderbilder nur dort, wo Q34 keinen eigenen Eintrag hat. */
export const SORTIMENT_KORREKTUREN: Record<string, Korrektur> = { ...BILD_Q33_ALS_KORREKTUR(), ...Q34_KORREKTUREN, ...Q37_KORREKTUREN };
function BILD_Q33_ALS_KORREKTUR(): Record<string, Korrektur> { return Object.fromEntries(Object.entries(BILD_Q33).map(([k, b]) => [k, { bild: { ...b } }])); }

const ZG_REIHE: ProduktZielgruppe[] = ['kinder', 'teens', 'young', 'adults', 'bestager'];

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
  // Q37: Freischaltungen, Zielgruppen aufgelöster Muster-Typen, Anlassmode für Teens und Young Adults
  const plus = Q37_ZUSATZ.get(t.typ);
  if (!plus) return z;
  return ZG_REIHE.filter((g) => z.includes(g) || plus.has(g));
}

/** Platz im Sortimentsbaum (Q33: Kinderartikel nach Art statt doppelter Ebene „Kinder und Baby“). */
export const sortimentsPlatz = (t: ZgTyp, basis: (typ: string, kategorie: string) => readonly [BaumKategorie, string]) => q33Pfad(t, basis);

export { MUSTER_ALIAS, TYP_UMBENANNT } from './q37-muster';
export { q37Freigeschaltet } from './q37-zielgruppen';
