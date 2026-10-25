// Q33: Sichtbarkeit je Zielgruppe für Kinder, Teens & Tweens und Young Adults (Navigation „Neues Produkt“ und Sortiment).
// Die Gewichte G(kinder, jung, mitte, reif) bleiben unverändert (Sterne, Kalibrierung); Teens und Young Adults teilen
// sich „jung“, deshalb trennen hier Namensregeln, was für 13- bis 17-Jährige nicht passt (Business, Klassik, Haushalt).
// Adults und Best Ager bleiben bei der Gewichtsregel (Q34 regelt sie in q34-zielgruppen.ts).
// Außerdem: Baumplatz für Kinderartikel nach Oberteile/Unterteile/…, Baby und Spielzeug als eigene Äste.
import type { BaumKategorie } from '../produkt-sortiment';

export interface ZgTyp { typ: string; kategorie: string; wgs: readonly string[]; gruppe: Record<string, number>; pfad?: readonly [BaumKategorie, string] }

const kinderWg = (t: ZgTyp) => t.wgs.some((w) => w.startsWith('kinder.'));
const istHome = (t: ZgTyp) => t.kategorie === 'home';

/** Nur für Erwachsene: Business, Klassik, Haushalt, Pflege 40+. */
const NUR_ERWACHSEN = new RegExp('^(' + [
  // Oberteile, Hosen, Röcke, Kleider, Jacken
  'Bluse', 'Hemd', 'Kaschmirpullover', 'Feinstrickpullover', 'Longcardigan', 'Tunikabluse', 'Schluppenbluse', 'Blumenbluse',
  'Slim-Fit-Hemd', 'Regular-Fit-Hemd', 'Oxford-Hemd', 'Rollkragenpullover', 'Troyer', 'Twinset', 'Strickweste',
  'Feinstrick-Pullunder', 'Wickelshirt', 'V-Shirt', 'Poloshirt',
  'Chino', 'Stoffhose', 'Anzughose', 'Culotte', 'Marlenehose', 'Paperbag-Hose', 'Komforthose', 'Komfort-Jeans', 'Bootcut-Jeans',
  'Bleistiftrock', 'Wickelrock', 'Satin-Midirock', 'Plisseerock', 'A-Linien-Rock', 'Rock',
  'Etuikleid', 'Hemdblusenkleid', 'Blusenkleid', 'Kaftan', 'Wickelkleid', 'A-Linien-Kleid', 'Strickkleid',
  'Blazer', 'Mantel', 'Wollmantel', 'Steppmantel', 'Trenchcoat', 'Bouclé-Jacke', 'Hosenanzug', 'Anzug', 'Anzugweste',
  'Tweed-Sakko', 'Stricksakko', 'Leinen-Sakko', 'Poncho', 'Harrington-Jacke', 'Funktionsjacke', 'Regenjacke', 'Fieldjacket', 'Kimono-Jacke',
  // Schuhe
  'Pumps', 'Slingpumps', 'Mule', 'Loafer', 'Slipper', 'Mokassin', 'Bootsschuh', 'Derby-Schuh', 'Budapester', 'Business-Schuh',
  'Schnürschuh', 'Hausschuh', 'Trekkingschuh', 'Wanderschuh', 'Stiefel', 'Stiefelette', 'Overknee-Stiefel', 'Espadrille',
  // Accessoires
  'Krawatte', 'Einstecktuch', 'Fliege', 'Seidentuch', 'Schal', 'Portemonnaie', 'Kartenetui', 'Herren-Geldbörse', 'Schlüsseletui',
  'Weekender', 'Reisetasche', 'Kabinentrolley', 'Schultertasche', 'Abendtasche', 'Clutch', 'Handtasche', 'Umhängetasche', 'Panamahut', 'Strohhut',
  'Regenschirm', 'Handschuhe', 'Gürtel',
  // Wäsche
  'Taillenslip', 'Shapewear-Body', 'Nachthemd', 'Unterhemd', 'Kniestrümpfe', 'Spitzen-BH', 'Spitzenslip', 'Bademantel', 'Strumpfhose',
  // Beauty
  'Augencreme', 'Hyaluron-Serum', 'Gesichtsserum', 'Gesichtscreme', 'Foundation', 'Concealer', 'Rouge', 'Eau de Parfum', 'Herrenduft',
  'Eau de Toilette', 'Parfum', 'Nassrasierer', 'Creme', 'Handcreme', 'Körperlotion', 'Körperbutter', 'Reinigungsgel', 'Flüssigseife',
].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$');

/** Haushalt, den Teens nicht selbst kaufen: Tisch, Küche, klassische Deko, Bettwaren für Erwachsene. */
const HOME_ERWACHSEN = new RegExp('^(' + [
  'Bettwäsche', 'Spannbettlaken', 'Bettbezug', 'Kopfkissenbezug', 'Tagesdecke', 'Gesteppte Tagesdecke', 'Satin-Bettwäsche',
  'Leinen-Bettwäsche', 'Renforcé-Bettwäsche', 'Daunendecke', 'Ganzjahres-Bettdecke', 'Sommerdecke', 'Nackenstützkissen',
  'Boxspring-Spannbettlaken', 'Wohndecke', 'Badetuch', 'Gästehandtuch', 'Waschlappen', 'Saunatuch', 'Waffelpiqué-Handtuch',
  'Duschvorleger', 'Badematte', 'Tischläufer', 'Tischdecke', 'Leinen-Tischdecke', 'Tischset', 'Serviette', 'Leinenserviette',
  'Geschirrtuch', 'Schürze', 'Topflappen', 'Ösenschal', 'Leinenvorhang', 'Vorratsdose', 'Vorratsglas', 'Servierschale',
  'Salatschüssel', 'Servierplatte', 'Speiseteller', 'Frühstücksteller', 'Steingut-Geschirrset', 'Besteckset', 'Weinglas',
  'Wasserglas', 'Glaskaraffe', 'Teekanne', 'Kochtopf', 'Bratpfanne', 'Schneidebrett', 'Trinkbecher', 'Tasse', 'Steingut-Becher-Set',
  'Kerzenhalter', 'Messing-Kerzenleuchter', 'Laterne', 'Wanduhr', 'Dekoschale', 'Dekotablett', 'Steingutvase', 'Vase',
  'Wäschekorb', 'Aufbewahrungskorb', 'Kunstpflanze im Übertopf', 'Duftstäbchen', 'Tischleuchte', 'Wandspiegel', 'Dekokissen', 'Handtuch',
].join('|') + ')$');

/** Teens kaufen davon selbst: eigenes Zimmer, Bad, Becher. */
const TEENS_HOME_OK = new Set(['Bettwäsche', 'Wohndecke', 'Handtuch',
  'Tasse', 'Wasserglas', 'Tischleuchte', 'Wandspiegel', 'Kunstpflanze im Übertopf', 'Duftstäbchen',
  'Aufbewahrungskorb', 'Ganzjahres-Bettdecke', 'Renforcé-Bettwäsche', 'Badematte', 'Waffelpiqué-Handtuch']);

/** Für Young Adults (18 bis 29) fehl am Platz: Komfort- und Seniorenklassik. */
const NICHT_YOUNG = /^(Twinset|Komforthose|Komfort-Jeans|Taillenslip|Shapewear-Body|Nachthemd|Nackenstützkissen|Kaftan|Poncho|Augencreme|Unterhemd|Kniestrümpfe|Budapester|Mokassin|Steppmantel|Schluppenbluse|Tunikabluse|Gesteppte Tagesdecke|Hausschuh)$/;

/** Kindernamen (eigener Kinderzuschnitt). Für Teens und Young Adults nie. */
const KINDNAME = /(^Kinder|^Baby|Kinderbody|Kinderkleid|Kinderrucksack|Kinderbettwäsche|Strampler|Langarmbody|Latzkleid|Latzhose|Matschhose|Schneeanzug|Leggings-Set|Lauflernschuh|Plüsch|Holz|Puzzle|Stoffpuppe)/;

/** Teens- und Young-Adults-Artikel aus Q33 sind ausdrücklich zugeordnet (siehe q33-jung.ts, Feld zg). */
export const Q33_ZUORDNUNG = new Map<string, readonly ('kinder' | 'teens' | 'young')[]>();

export function q33Kinder(t: ZgTyp): boolean {
  const z = Q33_ZUORDNUNG.get(t.typ);
  if (z) return z.includes('kinder');
  if (KINDNAME.test(t.typ) || t.kategorie === 'kinder') return true;
  if (NUR_ERWACHSEN.test(t.typ)) return false;
  if (istHome(t)) return (t.gruppe.kinder ?? 0) >= 0.4 && !HOME_ERWACHSEN.test(t.typ);
  return (t.gruppe.kinder ?? 0) >= 0.4;
}

export function q33Teens(t: ZgTyp): boolean {
  const z = Q33_ZUORDNUNG.get(t.typ);
  if (z) return z.includes('teens');
  if (KINDNAME.test(t.typ) || t.kategorie === 'kinder') return false;
  if (NUR_ERWACHSEN.test(t.typ) || NICHT_YOUNG.test(t.typ)) return false;
  if (istHome(t)) return (TEENS_HOME_OK.has(t.typ) || !HOME_ERWACHSEN.test(t.typ)) && (t.gruppe.jung ?? 0) >= 0.4;
  return (t.gruppe.jung ?? 0) >= 0.4;
}

export function q33Young(t: ZgTyp): boolean {
  const z = Q33_ZUORDNUNG.get(t.typ);
  if (z) return z.includes('young');
  if (KINDNAME.test(t.typ) || t.kategorie === 'kinder') return false;
  if (NICHT_YOUNG.test(t.typ)) return false;
  // Erste eigene Wohnung: Haushalt passt, auch ohne hohes jung-Gewicht
  if (istHome(t)) return (t.gruppe.jung ?? 0) >= 0.3 || (t.gruppe.mitte ?? 0) >= 0.8;
  return (t.gruppe.jung ?? 0) >= 0.4;
}

/** Platz im Baum: Kinderartikel nach Art (Oberteile, Unterteile …); Baby und Spielzeug bleiben eigene Äste unter „Baby und Spielzeug“. */
export function q33Pfad(t: ZgTyp, basis: (typ: string, kategorie: string) => readonly [BaumKategorie, string]): readonly [BaumKategorie, string] {
  const p = t.pfad ?? basis(t.typ, t.kategorie);
  if (p[0] !== 'kinder') return p;
  if (/Plüsch|Spiel|Holz|Puzzle|puppe|Teddy/i.test(t.typ) || /Spielwaren|Spielzeug/.test(p[1])) return ['kinder', 'Spielzeug'];
  if (/Strampler|body|Body|Baby|Schlafsack|Lauflern|Lätzchen|Spucktuch|Erstlings|Wickel|Krabbel|Schnuller|Rassel|Greifling/.test(t.typ) || p[1] === 'Baby' || p[1] === 'Bodys') return ['kinder', 'Baby'];
  const name = t.typ.replace(/^Kinder-?/i, '').replace(/^./, (c) => c.toUpperCase());
  const neu = basis(name, t.kategorie);
  if (neu[0] !== 'kinder') return neu;
  if (/Bade/i.test(t.typ)) return ['waesche', 'Bademode'];
  if (/Pyjama|Schlafanzug|Nacht/i.test(t.typ)) return ['waesche', 'Nachtwäsche'];
  if (/Schneeanzug|Matsch|Regen|Stepp|Parka|Kapuzenjacke/i.test(t.typ)) return ['jacken', /Matsch|Regen/i.test(t.typ) ? 'Matsch und Regen' : 'Winter'];
  if (/Latz|Leggings/i.test(t.typ)) return ['unterteile', /Latzkleid/.test(t.typ) ? 'Kleider' : 'Hosen'];
  if (/kleid/i.test(t.typ)) return ['kleider', 'Kleider'];
  return ['oberteile', 'Weitere Oberteile'];
}

/** Bildkorrektur bestehender Kindertypen: sie zeigten dasselbe Bild wie der Erwachsenentyp (Kinder-Jeans = Jeans usw.). */
export const BILD_Q33: Record<string, { silhouette: string }> = {
  'Kinder-T-Shirt': { silhouette: 'k_tshirt' }, 'Kinder-Jeans': { silhouette: 'k_jeans' }, 'Kinder-Hoodie': { silhouette: 'k_hoodie' },
  'Kinder-Steppjacke': { silhouette: 'k_steppjacke' }, 'Kinder-Parka': { silhouette: 'k_parka' }, 'Kinder-Regenjacke': { silhouette: 'k_regenjacke' },
  'Kinder-Softshelljacke': { silhouette: 'k_softshelljacke' }, 'Kinder-Strickpullover': { silhouette: 'k_strickpulli' }, 'Kinder-Polo': { silhouette: 'k_polo' },
  'Kinder-Sweatshirt': { silhouette: 'k_sweatshirt' }, 'Kinder-Langarmshirt': { silhouette: 'k_langarmshirt' }, 'Kinder-Jogginghose': { silhouette: 'k_jogginghose' },
  'Kinder-Leggings': { silhouette: 'k_leggings' }, 'Kinder-Cargohose': { silhouette: 'k_cargohose' }, 'Kinder-Jeansshorts': { silhouette: 'k_jeansshorts' },
  'Kinder-Pyjama': { silhouette: 'k_schlafanzug' }, 'Kinder-Tüllrock': { silhouette: 'k_tuellrock' }, 'Kinder-Sommerkleid': { silhouette: 'k_sommerkleid' },
  Kinderbettwäsche: { silhouette: 'k_bettwaesche' },
};
