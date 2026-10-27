// Q41: neue Artikeltypen Accessoires, Taschen, Schmuck, Beauty aus dem Referenzsortiment (auftraege/wurf4/daten/q41-typen.csv,
// 50 Typen ab 3 Artikeln, Reihenfolge nach Häufigkeit). Bild: bis zur Abnahme durch Ummo bildOffen mit der nächstliegenden vorhandenen
// Silhouette (auftraege/wurf4/bilder-neu.md Abschnitt 1); die eigenen Bilder liefern die Bildpakete B01–B30 (daten/bildpakete.csv).
// Zielgruppe G(kinder, jung, mitte, reif): Teens und Young Adults über jung ≥ 0,4, Adults über mitte ≥ 0,4 (wie in der CSV ab 30 % der
// Artikel einer Gruppe). Best Ager kennt die Referenz nicht: nur klassische Teile (Armreif, Ohrstecker, Brosche, Citytasche …) mit reif ≥ 0,4.
// Preis (mitte) knapp über dem Preismedian der Referenz (Warenhaus-Eigenmarke). WGs nur dort, wo schon Artikeltypen liegen,
// neue Typen hängen hinten an und starten nicht im Grundsortiment (Kalibrierung neutral).
import { G, type SortimentTyp } from './basis';
import type { Material, ProduktKategorie, TypSaison, TrendGruppe } from '../produkte';
import type { BaumKategorie } from '../produkt-sortiment';
import type { WgId } from '../einkauf';
import type { Muster } from '../muster';
import type { AnlassId } from '../anlass';

export const NAMEN = [
  'Baseballcap', 'Bowlingtasche', 'Halsketten-Set', 'Ring-Set', 'Hobo-Bag', 'Armreif', 'Halbmondtasche', 'Ohrring-Set', 'Taillengürtel', 'Handyhülle',
  'Baguette-Tasche', 'Haarband', 'Ohrhänger', 'Balaclava', 'Armreif-Set', 'Ohrstecker', 'Haarklammer', 'Dreieckstuch', 'Kettengürtel', 'Armband-Set',
  'Kordelkette', 'Creolen-Set', 'Beuteltasche', 'Citytasche', 'Barrel-Bag', 'Lariat-Halskette', 'Halsreif', 'Taschenanhänger', 'Schmuckset', 'Kameratasche',
  'Stirnband', 'Layering-Halskette', 'Biker-Bag', 'Schlüsselanhänger', 'Armstulpen', 'Pareo', 'Military-Cap', 'Fliegermütze', 'Broschen-Set', 'Hüftgürtel',
  'Fingerlose Handschuhe', 'Ring', 'Scrunchie', 'Haarparfum', 'Box-Tasche', 'Messenger-Bag', 'Ohrenwärmer', 'Einsatzkragen', 'Korsettgürtel', 'Baskenmütze',
] as const;

type N = (typeof NAMEN)[number];
type T = SortimentTyp<N>;
type Pfad = readonly [BaumKategorie, string];

// Zielgruppenprofile (Kinder nie: Referenz sind Young-Fashion-Shops)
const JUNG = G(0, 0.95, 0.6, 0.25);      // Teens, Young Adults, Adults
const BREIT = G(0, 0.9, 0.8, 0.45);      // dazu Best Ager (klassische Form)
const TEENS = G(0, 1, 0.45, 0.15);       // Adults knapp (Handyhülle 37 %, Taillengürtel 55 %, Balaclava 47 %)
const OHNE_ADULTS = G(0, 0.95, 0.3, 0.1); // Einsatzkragen: Adults unter 30 %

// Materialien (Kunstleder als Polyester, Modeschmuck wie bestehende Schmucktypen als Polyester)
const KL: Material[] = ['Polyester', 'Leder'];
const SCHMUCK: Material[] = ['Polyester'];
const STRICK: Material[] = ['Merino', 'Polyester', 'Baumwolle'];
const STOFF: Material[] = ['Baumwolle', 'Polyester'];
const FLIESS: Material[] = ['Viskose', 'Seide', 'Polyester'];

// WG-Bündel
const LW: WgId = 'accessoires.lederwaren', SM: WgId = 'accessoires.schmuck';
const D: WgId[] = [LW, 'damen.young'];                    // Damenaccessoire
const U: WgId[] = [LW, 'damen.young', 'herren.casual'];   // unisex
const SD: WgId[] = [SM, 'damen.young'];                   // Damenschmuck
const SU: WgId[] = [SM];                                  // Schmuck unisex

// Baumpfade
const TA: Pfad = ['accessoires', 'Taschen'], SCH: Pfad = ['accessoires', 'Schmuck'], HAAR: Pfad = ['accessoires', 'Haarschmuck'];
const HUT: Pfad = ['accessoires', 'Mützen und Hüte'], GUE: Pfad = ['accessoires', 'Gürtel'], TUCH: Pfad = ['accessoires', 'Tücher und Schals'];
const WEI: Pfad = ['accessoires', 'Weitere Accessoires'], DUFT: Pfad = ['beauty', 'Duft'];

const t = (typ: N, wgs: WgId[], saison: TypSaison, preis: number, materialien: Material[], gruppe: Record<TrendGruppe, number>, aufwand: number,
  pfad: Pfad, kategorie: ProduktKategorie = 'accessoires'): T =>
  ({ typ, kategorie, wgs, saison, preis, materialien: [...materialien], gruppe, aufwand, pfad, bild: { silhouette: PLATZHALTER[typ] }, bildOffen: true });

/** Nächstliegende vorhandene Silhouette je Typ (Taschen mit Model-Platz Tasche, Kopfbedeckungen mit Model-Platz Mütze). */
const PLATZHALTER: Record<N, string> = {
  Baseballcap: 'cap', Bowlingtasche: 'handtasche', 'Halsketten-Set': 'halskette', 'Ring-Set': 'armband', 'Hobo-Bag': 'schultertasche',
  Armreif: 'armband', Halbmondtasche: 'crossbody', 'Ohrring-Set': 'ohrringe', 'Taillengürtel': 'guertel', 'Handyhülle': 't_handykette',
  'Baguette-Tasche': 'b01baguette', Haarband: 'haarreif', 'Ohrhänger': 'ohrringe', Balaclava: 'beanie', 'Armreif-Set': 'armband',
  Ohrstecker: 'ohrringe', Haarklammer: 'k_haarspangen', Dreieckstuch: 't_bandana', 'Kettengürtel': 'guertel', 'Armband-Set': 't_freundschaftsarmband',
  Kordelkette: 'halskette', 'Creolen-Set': 't_kreolen', Beuteltasche: 'tote', Citytasche: 'handtasche', 'Barrel-Bag': 'weekender',
  'Lariat-Halskette': 'halskette', Halsreif: 't_choker', 'Taschenanhänger': 't_handykette', Schmuckset: 'perlenkette', Kameratasche: 'crossbodytasche',
  Stirnband: 't_stirnband', 'Layering-Halskette': 'perlenkette', 'Biker-Bag': 'handtasche', 'Schlüsselanhänger': 'schluesseletui', Armstulpen: 'handschuhe',
  Pareo: 'seidentuch', 'Military-Cap': 'cap', 'Fliegermütze': 'muetze', 'Broschen-Set': 'brosche', 'Hüftgürtel': 'guertel',
  'Fingerlose Handschuhe': 'handschuhe', Ring: 'armband', Scrunchie: 't_scrunchies', Haarparfum: 't_bodyspray', 'Box-Tasche': 'handtasche',
  'Messenger-Bag': 'crossbody', 'Ohrenwärmer': 'muetze', Einsatzkragen: 'schal', 'Korsettgürtel': 'guertel', 'Baskenmütze': 'beanie',
};

// Referenz: Preismedian in Klammern
const LISTE: T[] = [
  t('Baseballcap', U, 'ganz', 19, STOFF, JUNG, 1, HUT),                       // 15,99
  t('Bowlingtasche', D, 'ganz', 32, KL, JUNG, 2, TA),                         // 25,99
  t('Halsketten-Set', SD, 'ganz', 15, SCHMUCK, JUNG, 1, SCH),                 // 12,99
  t('Ring-Set', SU, 'ganz', 15, SCHMUCK, JUNG, 1, SCH),                       // 12,99
  t('Hobo-Bag', D, 'ganz', 35, KL, BREIT, 2, TA),                             // 29,99
  t('Armreif', SD, 'ganz', 15, SCHMUCK, BREIT, 1, SCH),                       // 12,99
  t('Halbmondtasche', D, 'ganz', 25, KL, JUNG, 2, TA),                        // 19,99
  t('Ohrring-Set', SD, 'ganz', 15, SCHMUCK, JUNG, 1, SCH),                    // 12,99
  t('Taillengürtel', D, 'ganz', 22, KL, TEENS, 1, GUE),                       // 17,99
  t('Handyhülle', [LW], 'ganz', 12, ['Polyester'], TEENS, 1, WEI),            // 9,99
  t('Baguette-Tasche', D, 'ganz', 25, KL, JUNG, 2, TA),                       // 19,99
  t('Haarband', D, 'ganz', 15, ['Baumwolle', 'Viskose', 'Polyester'], JUNG, 1, HAAR), // 12,99
  t('Ohrhänger', SD, 'ganz', 15, SCHMUCK, BREIT, 1, SCH),                     // 12,99
  t('Balaclava', D, 'winter', 25, STRICK, TEENS, 1, HUT),                     // 19,99
  t('Armreif-Set', SD, 'ganz', 19, SCHMUCK, JUNG, 1, SCH),                    // 15,99
  t('Ohrstecker', SD, 'ganz', 15, SCHMUCK, BREIT, 1, SCH),                    // 12,99
  t('Haarklammer', D, 'ganz', 9, ['Polyester'], BREIT, 1, HAAR),              // 7,99
  t('Dreieckstuch', D, 'winter', 22, ['Merino', 'Baumwolle', 'Viskose'], JUNG, 1, TUCH), // 17,99
  t('Kettengürtel', D, 'ganz', 17, SCHMUCK, JUNG, 1, GUE),                    // 14,49
  t('Armband-Set', SU, 'ganz', 9, ['Polyester', 'Baumwolle', 'Leder'], JUNG, 1, SCH), // 7,99
  t('Kordelkette', SD, 'ganz', 15, ['Polyester', 'Baumwolle'], JUNG, 1, SCH), // 12,99
  t('Creolen-Set', SD, 'ganz', 12, SCHMUCK, BREIT, 1, SCH),                   // 9,99
  t('Beuteltasche', D, 'ganz', 32, KL, JUNG, 2, TA),                          // 25,99
  t('Citytasche', D, 'ganz', 39, KL, BREIT, 2, TA),                           // 32,99
  t('Barrel-Bag', D, 'ganz', 32, KL, JUNG, 2, TA),                            // 27,99
  t('Lariat-Halskette', SD, 'ganz', 17, SCHMUCK, JUNG, 1, SCH),               // 14,49
  t('Halsreif', SD, 'ganz', 15, SCHMUCK, BREIT, 1, SCH),                      // 12,99
  t('Taschenanhänger', D, 'ganz', 19, ['Polyester', 'Leder'], JUNG, 1, WEI),  // 15,99
  t('Schmuckset', SD, 'ganz', 22, SCHMUCK, BREIT, 2, SCH),                    // 19,00
  t('Kameratasche', U, 'ganz', 27, KL, JUNG, 1, TA),                          // 22,99
  t('Stirnband', D, 'winter', 14, STRICK, JUNG, 1, HAAR),                     // 11,49
  t('Layering-Halskette', SD, 'ganz', 19, SCHMUCK, JUNG, 1, SCH),             // 15,99
  t('Biker-Bag', D, 'ganz', 32, KL, JUNG, 2, TA),                             // 25,99
  t('Schlüsselanhänger', [LW], 'ganz', 19, ['Polyester', 'Leder'], TEENS, 1, WEI), // 15,99
  t('Armstulpen', D, 'winter', 19, STRICK, JUNG, 1, WEI),                     // 15,99
  t('Pareo', D, 'sommer', 19, FLIESS, JUNG, 1, TUCH),                         // 15,99
  t('Military-Cap', U, 'ganz', 22, STOFF, JUNG, 1, HUT),                      // 17,99
  t('Fliegermütze', D, 'winter', 25, ['Polyester', 'Merino'], JUNG, 1, HUT),  // 19,99
  t('Broschen-Set', SD, 'ganz', 19, SCHMUCK, BREIT, 1, SCH),                  // 15,99
  t('Hüftgürtel', D, 'ganz', 22, KL, JUNG, 1, GUE),                           // 17,99
  t('Fingerlose Handschuhe', D, 'winter', 19, ['Leder', 'Merino', 'Polyester'], TEENS, 1, WEI), // 15,99
  t('Ring', SD, 'ganz', 12, SCHMUCK, BREIT, 1, SCH),                          // 9,99
  t('Scrunchie', D, 'ganz', 9, ['Seide', 'Baumwolle', 'Polyester'], JUNG, 1, HAAR), // 8,99
  t('Haarparfum', ['beauty.parfuem', 'beauty.drogerie'], 'ganz', 19, ['Polyester'], JUNG, 1, DUFT, 'beauty'), // 15,99
  t('Box-Tasche', D, 'ganz', 35, KL, JUNG, 2, TA),                            // 29,99
  t('Messenger-Bag', U, 'ganz', 35, ['Polyester', 'Baumwolle', 'Leder'], JUNG, 2, TA), // 29,99
  t('Ohrenwärmer', D, 'winter', 15, ['Polyester'], JUNG, 1, HUT),             // 12,99
  t('Einsatzkragen', D, 'winter', 25, STRICK, OHNE_ADULTS, 1, WEI),           // 19,99
  t('Korsettgürtel', D, 'ganz', 22, ['Polyester', 'Baumwolle', 'Leder'], JUNG, 1, GUE), // 17,99
  t('Baskenmütze', D, 'winter', 19, ['Merino'], BREIT, 1, HUT),               // 15,99
];

// Q37: Anlass „Zubehör“ für die Typen, die das Referenzsortiment Anlässen zuordnet (auftraege/wurf4/daten/anlass-zuordnung.csv)
export const ANLASS_ZUBEHOER: readonly N[] = ['Halsketten-Set', 'Armreif', 'Beuteltasche', 'Ohrstecker', 'Armreif-Set', 'Ohrhänger', 'Layering-Halskette',
  'Broschen-Set', 'Lariat-Halskette', 'Ring-Set', 'Ohrring-Set', 'Halsreif', 'Taillengürtel', 'Schmuckset'];
// Q37: Muster abweichend vom Kategorie-Standard (muster.ts), nach den Mustern der Referenzartikel
const MUSTER_Q41: Partial<Record<N, readonly Muster[]>> = {
  'Military-Cap': ['Uni', 'Camouflage'],
  Balaclava: ['Uni', 'Streifen', 'Ringel', 'Leo', 'Norweger', 'Häkel/Strick'],
  Armstulpen: ['Uni', 'Ringel', 'Streifen', 'Norweger', 'Häkel/Strick'],
  Einsatzkragen: ['Uni', 'Streifen', 'Häkel/Strick'],
  'Ohrenwärmer': ['Uni', 'Leo'],
  Haarklammer: ['Uni', 'Leo', 'Karo', 'Blumen'],
  'Handyhülle': ['Uni', 'Karo', 'Leo', 'Punkte', 'Blumen', 'Print', 'Lizenzmotiv'],
  Pareo: ['Uni', 'Blumen', 'Tier', 'Print', 'Streifen'],
};
export const TYPEN: T[] = LISTE.map((x) => ({
  ...x,
  ...(MUSTER_Q41[x.typ] ? { muster: MUSTER_Q41[x.typ] } : {}),
  ...(ANLASS_ZUBEHOER.includes(x.typ) ? { anlass: ['zubehoer'] as readonly AnlassId[] } : {}),
}));
