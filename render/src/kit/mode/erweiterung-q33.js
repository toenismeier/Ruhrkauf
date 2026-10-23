// Q33: eigene Silhouetten und Zeichner für Kinder, Teens & Tweens und Young Adults (Konfliktvermeidung mit Q34).
// Alle ids beginnen mit k_ (Kinder und Baby) oder t_ (Teens und Young Adults). Format wie silhouetten.js.
// Mode baut auf den Q25-Flatlays auf (q33-kleidung.js), Zubehör, Baby, Spielzeug und Zimmer zeichnen q33-kind.js und q33-teen.js.

import { q33flat, q33zoom } from './q33-kleidung.js';
import { KIND } from './q33-kind.js';
import { TEEN } from './q33-teen.js';

const GRUPPE = { oberteil: 'oberteil', hose: 'unterteil', rock: 'rock', kleid: 'kleid', jacke: 'jacke' };
// Kleidung: basis + Parameter; Model-Platz wie die Basis
const kl = (basis, p, material, farbe, o = {}) => ({ gruppe: GRUPPE[basis], zeichner: 'z:q33flat', p: { basis, ...p }, material, farbe, model: basis, zoom: q33zoom, ...o });
const kind = (basis, p, material, farbe, o = {}) => kl(basis, p, material, farbe, { nur: 'kinder', ...o });
const maedchen = (basis, p, material, farbe) => kind(basis, p, material, farbe, { geschlecht: 'damen' });
const damen = (basis, p, material, farbe) => kl(basis, p, material, farbe, { nur: 'damen' });
// Dinge ohne Model (Zubehör, Baby, Spielzeug, Zimmer, Beauty)
const z = (gruppe, name, material, farbe, p = {}, model = null) => ({ gruppe, zeichner: 'z:' + name, p, material, farbe, model });
// Schuhe über den Q28-Leisten (Parameter überschreiben die Leistenart)
const schuh = (basisArt, art, material, farbe, extra = {}) => ({ gruppe: 'schuhe', zeichner: 'z:q28schuh', p: { schuh: basisArt, art, ...extra }, material, farbe, model: 'schuhe' });

export const SILHOUETTEN = {
  // ───────────── Kinder: Oberteile (Applikation macht das Kinderteil erkennbar)
  k_motivshirt: kind('oberteil', { aermel: 'kurz', kragen: 'rund', motiv: 'dino' }, 'baumwolle', 'hellgrün'),
  k_ringellongsleeve: kind('oberteil', { aermel: 'lang', kragen: 'rund', dessin: 'ringelbunt', rippbund: true }, 'baumwolle', 'weiß'),
  k_paillettenshirt: kind('oberteil', { aermel: 'kurz', kragen: 'rund', motiv: 'pailletten', motivS: 24 }, 'baumwolle', 'flieder'),
  k_tanktop: kind('oberteil', { aermel: 'ohne', kragen: 'rund', armbuendchen: true, motiv: 'sonne' }, 'baumwolle', 'hellblau'),
  k_rueschenbluse: maedchen('oberteil', { aermel: 'puff', kragen: 'rund', rueschen: true, dessin: 'bluemchen', schleife: true }, 'baumwolle', 'rosa'),
  k_hemd: kind('oberteil', { aermel: 'lang', kragen: 'hemd', dessin: 'autos' }, 'baumwolle', 'hellblau'),
  k_rollkragen: kind('oberteil', { aermel: 'lang', kragen: 'rollkragen', rippbund: true, motiv: 'katze', motivY: 38 }, 'baumwolle', 'senf'),
  k_norweger: kind('oberteil', { aermel: 'lang', kragen: 'rund', dessin: 'norweger', rippbund: true, strick: true }, 'strick', 'rot'),
  k_fleecepulli: kind('oberteil', { aermel: 'lang', kragen: 'troyer', dessin: 'fleece', rippbund: true, motiv: 'fuchs', motivY: 42 }, 'baumwolle', 'senf'),
  k_raglanshirt: kind('oberteil', { aermel: 'lang', kragen: 'rund', extras: ['raglan'], motiv: 'ball' }, 'baumwolle', 'hellgrau'),
  k_uvshirt: kind('oberteil', { aermel: 'lang', kragen: 'stehkragen', zip: true, dessin: 'anker', motiv: 'wal', motivY: 44 }, 'polyester', 'hellblau'),
  k_polo: kind('oberteil', { aermel: 'kurz', kragen: 'polo', motiv: 'anker', motivX: 59, motivY: 32, motivS: 8 }, 'baumwolle', 'koralle'),
  k_sweatshirt: kind('oberteil', { aermel: 'lang', kragen: 'rund', rippbund: true, motiv: 'regenbogen', motivS: 22 }, 'baumwolle', 'altrosa'),
  k_langarmshirt: kind('oberteil', { aermel: 'lang', kragen: 'rund', motiv: 'rakete' }, 'baumwolle', 'marine'),
  k_tshirt: kind('oberteil', { aermel: 'kurz', kragen: 'rund', motiv: 'auto' }, 'baumwolle', 'gelb'),
  k_hoodie: kind('oberteil', { aermel: 'lang', kragen: 'kapuze', kaenguru: true, rippbund: true, motiv: 'bagger', motivY: 34 }, 'baumwolle', 'olive'),
  k_tierkapuzenjacke: kind('oberteil', { aermel: 'lang', kragen: 'kapuze', zip: true, kaenguru: true, rippbund: true, extras: ['ohren'] }, 'teddy', 'beige'),
  k_strickpulli: kind('oberteil', { aermel: 'lang', kragen: 'rund', rippbund: true, strick: true, motiv: 'herz' }, 'strick', 'senf'),
  k_unterhemd: kind('oberteil', { aermel: 'ohne', kragen: 'rund', armbuendchen: true, motiv: 'stern', motivS: 7, motivY: 24 }, 'rippe', 'weiß'),
  // ───────────── Kinder: Unterteile
  k_jeans: kind('hose', { passform: 'gerade', extras: ['kniepatch'], patchFarbe: '#c8372f' }, 'denim', 'jeansblau'),
  k_cordhose: kind('hose', { passform: 'gerade', extras: ['kniepatch'], patchFarbe: '#5f8f7a' }, 'cord', 'senf'),
  k_chino: kind('hose', { passform: 'gerade', saum: 'umschlag', komfortbund: true, motiv: 'stern', motivS: 6 }, 'baumwolle', 'sand'),
  k_thermohose: kind('hose', { passform: 'jogger', dessin: 'stepp', komfortbund: true }, 'nylon', 'marine'),
  k_radler: maedchen('hose', { passform: 'leggings', laenge: 'kurz', dessin: 'herzen' }, 'baumwolle', 'rosa'),
  k_bermuda: kind('hose', { passform: 'gerade', laenge: 'bermuda', cargo: true, komfortbund: true, dessin: 'dinos' }, 'baumwolle', 'khaki'),
  k_latzshorts: kind('hose', { passform: 'gerade', laenge: 'kurz', latz: true, motiv: 'blume', motivX: 50, motivY: 19, motivS: 7 }, 'denim', 'hellerdenim'),
  k_pumphose: kind('hose', { passform: 'jogger', laenge: 'cropped', komfortbund: true, dessin: 'sterne' }, 'baumwolle', 'salbei'),
  k_sweatshorts: kind('hose', { passform: 'gerade', laenge: 'kurz', komfortbund: true, extras: ['kordel'], motiv: 'blitz', motivS: 7 }, 'baumwolle', 'grau'),
  k_skihose: kind('hose', { passform: 'gerade', latz: true, dessin: 'stepp', extras: ['kniepatch'], patchFarbe: '#2a2c30' }, 'nylon', 'rot'),
  k_leggings: maedchen('hose', { passform: 'leggings', dessin: 'bluemchen' }, 'baumwolle', 'marine'),
  k_jogginghose: kind('hose', { passform: 'jogger', extras: ['kniepatch'], patchFarbe: '#f1cf4a' }, 'baumwolle', 'grau'),
  k_cargohose: kind('hose', { passform: 'weit', cargo: true, komfortbund: true, dessin: 'camo' }, 'baumwolle', 'olive'),
  k_jeansshorts: kind('hose', { passform: 'gerade', laenge: 'kurz', saum: 'offen', motiv: 'herz', motivS: 6 }, 'denim', 'hellerdenim'),
  // ───────────── Kinder: Röcke und Kleider
  k_jeansrock: maedchen('rock', { laenge: 'mini', form: 'a-linie', motiv: 'blume', motivS: 9 }, 'denim', 'jeansblau'),
  k_rueschenrock: maedchen('rock', { laenge: 'mini', form: 'glocke', dessin: 'bluemchen', extras: ['volant'] }, 'baumwolle', 'koralle'),
  k_tuellrock: maedchen('rock', { laenge: 'knie', form: 'glocke', extras: ['schleife'] }, 'tuell', 'rosa'),
  k_tuellkleid: maedchen('kleid', { laenge: 'knie', form: 'glocke', aermel: 'kurz', extras: ['schleife'], schleifeFarbe: '#e8a0b4' }, 'tuell', 'flieder'),
  k_traegerkleid: maedchen('kleid', { laenge: 'knie', form: 'a-linie', aermel: 'ohne', dessin: 'punkte', extras: ['volant'] }, 'baumwolle', 'rot'),
  k_sweatkleid: maedchen('kleid', { laenge: 'knie', form: 'gerade', aermel: 'lang', motiv: 'katze' }, 'baumwolle', 'grau'),
  k_sommerkleid: maedchen('kleid', { laenge: 'knie', form: 'glocke', aermel: 'puff', dessin: 'bluemchen', extras: ['schleife'] }, 'baumwolle', 'gelb'),
  k_strickkleid: maedchen('kleid', { laenge: 'knie', form: 'a-linie', aermel: 'lang', dessin: 'norweger' }, 'strick', 'marine'),
  k_nachthemd: maedchen('kleid', { laenge: 'midi', form: 'a-linie', aermel: 'lang', dessin: 'sterne', motiv: 'einhorn' }, 'baumwolle', 'hellblau'),
  k_dirndl: maedchen('kleid', { laenge: 'knie', form: 'glocke', aermel: 'puff', kragen: 'carree', dessin: 'karo', extras: ['schleife'], schleifeFarbe: '#c8372f' }, 'baumwolle', 'flaschengrün'),
  // ───────────── Kinder: Jacken
  k_jeansjacke: kind('jacke', { art: 'jeansjacke', motiv: 'stern' }, 'denim', 'jeansblau'),
  k_daunenweste: kind('jacke', { art: 'steppweste', motiv: 'fuchs', motivX: 40, motivY: 32, motivS: 9 }, 'nylon', 'orange'),
  k_dufflecoat: kind('jacke', { art: 'mantel', laenge: 'normal', dessin: 'schotten' }, 'wolle', 'marine'),
  k_blouson: kind('jacke', { art: 'bomber', motiv: 'rakete' }, 'nylon', 'olive'),
  k_skijacke: kind('jacke', { art: 'regenjacke', dessin: 'block' }, 'nylon', 'rot'),
  k_steppjacke: kind('jacke', { art: 'steppjacke', motiv: 'wolke', motivS: 9 }, 'nylon', 'gelb'),
  k_regenjacke: kind('jacke', { art: 'regenjacke', dessin: 'punkte' }, 'lack', 'gelb'),
  k_softshelljacke: kind('jacke', { art: 'funktion', motiv: 'bagger', motivS: 9 }, 'polyester', 'petrol'),
  k_parka: kind('jacke', { art: 'parka', dessin: 'camo' }, 'nylon', 'olive'),
  k_strickjacke: kind('jacke', { art: 'strickjacke', dessin: 'sterne' }, 'strick', 'gelb'),

  // ───────────── Teens & Young Adults: Oberteile
  t_tiedye: kl('oberteil', { aermel: 'kurz', kragen: 'rund', passform: 'boxy', dessin: 'tiedye' }, 'baumwolle', 'weiß'),
  t_printshirt: kl('oberteil', { aermel: 'kurz', kragen: 'rund', passform: 'oversize', motiv: 'grafik', motivS: 24 }, 'baumwolle', 'schwarz'),
  t_smileyshirt: kl('oberteil', { aermel: 'kurz', kragen: 'rund', passform: 'boxy', motiv: 'smiley', motivS: 18 }, 'baumwolle', 'flieder'),
  t_croplongsleeve: damen('oberteil', { aermel: 'lang', kragen: 'rund', laenge: 'crop', passform: 'tailliert', dessin: 'bretagne' }, 'rippe', 'weiß'),
  t_meshtop: damen('oberteil', { aermel: 'lang', kragen: 'rund', passform: 'tailliert', dessin: 'netzgrob' }, 'polyester', 'altrosa'),
  t_schachpulli: kl('oberteil', { aermel: 'lang', kragen: 'rund', passform: 'oversize', rippbund: true, strick: true, dessin: 'schach' }, 'strick', 'mint'),
  t_ziphoodie: kl('oberteil', { aermel: 'lang', kragen: 'kapuze', zip: true, kaenguru: true, rippbund: true, passform: 'oversize', dessin: 'block' }, 'baumwolle', 'grau'),
  t_tiedyehoodie: kl('oberteil', { aermel: 'lang', kragen: 'kapuze', kaenguru: true, rippbund: true, passform: 'oversize', dessin: 'tiedye' }, 'baumwolle', 'weiß'),
  t_cropsweat: damen('oberteil', { aermel: 'lang', kragen: 'rund', laenge: 'crop', passform: 'oversize', rippbund: true, motiv: 'herz', motivS: 8 }, 'baumwolle', 'altrosa'),
  t_collegesweat: kl('oberteil', { aermel: 'lang', kragen: 'rund', rippbund: true, passform: 'oversize', motiv: 'college', motivS: 22 }, 'baumwolle', 'creme'),
  t_raglanlong: kl('oberteil', { aermel: 'lang', kragen: 'rund', extras: ['raglan'], raglanFarbe: '#2a2c30', motiv: 'schrift', motivS: 18 }, 'baumwolle', 'weiß'),
  t_trikot: kl('oberteil', { aermel: 'kurz', kragen: 'v', passform: 'oversize', extras: ['trikot'], motiv: 'nummer', motivS: 22 }, 'polyester', 'rot'),
  t_basketballtank: kl('oberteil', { aermel: 'ohne', kragen: 'rund', armbuendchen: true, passform: 'oversize', laenge: 'lang', motiv: 'nummer', motivS: 22, dessin: 'netz' }, 'polyester', 'gelb'),
  t_bowlinghemd: kl('oberteil', { aermel: 'kurz', kragen: 'rund', passform: 'boxy', extras: ['revers'], dessin: 'block' }, 'viskose', 'creme'),
  t_flanellhemd: kl('oberteil', { aermel: 'lang', kragen: 'hemd', passform: 'oversize', brusttasche: true, dessin: 'flanell' }, 'baumwolle', 'rot'),
  t_cutouttop: damen('oberteil', { aermel: 'lang', kragen: 'carree', passform: 'tailliert', laenge: 'kurz', extras: ['cutout'] }, 'rippe', 'schwarz'),
  t_neckholder: damen('oberteil', { aermel: 'ohne', kragen: 'v', passform: 'tailliert', laenge: 'crop', extras: ['neckholder'], dessin: 'leo' }, 'viskose', 'camel'),
  t_bandeau: damen('oberteil', { aermel: 'traeger', kragen: 'carree', passform: 'tailliert', laenge: 'crop', extras: ['raffung'] }, 'rippe', 'koralle'),
  t_teddypulli: kl('oberteil', { aermel: 'lang', kragen: 'kapuze', kaenguru: true, passform: 'oversize', rippbund: true, dessin: 'fleece' }, 'teddy', 'camel'),
  t_fleecetroyer: kl('oberteil', { aermel: 'lang', kragen: 'troyer', passform: 'oversize', dessin: 'fleece', extras: ['brusttaschen'] }, 'polyester', 'flaschengrün'),
  t_camoshirt: kl('oberteil', { aermel: 'kurz', kragen: 'rund', passform: 'boxy', dessin: 'camo' }, 'baumwolle', 'khaki'),
  t_ringelcrop: damen('oberteil', { aermel: 'kurz', kragen: 'rund', laenge: 'crop', passform: 'tailliert', dessin: 'ringelbunt' }, 'baumwolle', 'weiß'),
  t_glitzertop: damen('oberteil', { aermel: 'traeger', kragen: 'v', passform: 'tailliert', dessin: 'glitzer' }, 'satin', 'lila'),
  // ───────────── Teens & Young Adults: Unterteile
  t_parachute: kl('hose', { passform: 'baggy', komfortbund: true, extras: ['parachute'] }, 'nylon', 'hellgrau'),
  t_cargojeans: kl('hose', { passform: 'baggy', cargo: true, saum: 'offen' }, 'denim', 'hellerdenim'),
  t_jorts: kl('hose', { passform: 'baggy', laenge: 'bermuda', saum: 'offen' }, 'denim', 'jeansblau'),
  t_rippedjeans: kl('hose', { passform: 'schmal', ripped: true, saum: 'offen', extras: ['kniepatch'], patchFarbe: '#e9e4dc' }, 'denim', 'hellerdenim'),
  t_flareleggings: damen('hose', { passform: 'flare', komfortbund: true }, 'rippe', 'schwarz'),
  t_sweatshorts: kl('hose', { passform: 'gerade', laenge: 'kurz', komfortbund: true, extras: ['kordel'], dessin: 'tiedye' }, 'baumwolle', 'weiß'),
  t_basketballshorts: kl('hose', { passform: 'weit', laenge: 'bermuda', komfortbund: true, extras: ['seitenband', 'kordel'] }, 'polyester', 'marine'),
  t_camocargo: kl('hose', { passform: 'baggy', cargo: true, komfortbund: true, dessin: 'camo' }, 'baumwolle', 'khaki'),
  t_trackpants: kl('hose', { passform: 'weit', komfortbund: true, extras: ['seitenstreifen'] }, 'nylon', 'schwarz'),
  t_sportleggings: damen('hose', { passform: 'leggings', dessin: 'block' }, 'polyester', 'lila'),
  t_tennisrock: damen('rock', { laenge: 'mini', form: 'plissee' }, 'polyester', 'weiß'),
  t_karominirock: damen('rock', { laenge: 'mini', form: 'a-linie', dessin: 'schotten' }, 'wolle', 'rot'),
  t_jeanslatzhose: kl('hose', { passform: 'weit', latz: true, saum: 'umschlag' }, 'denim', 'hellerdenim'),
  t_croppullunder: damen('oberteil', { aermel: 'ohne', kragen: 'v', laenge: 'crop', passform: 'gerade', strick: true, armbuendchen: true, dessin: 'bretagne' }, 'strick', 'creme'),
  t_longline: kl('oberteil', { aermel: 'kurz', kragen: 'rund', laenge: 'tunika', passform: 'oversize', motiv: 'blitz', motivS: 10 }, 'baumwolle', 'anthrazit'),
  t_croppolo: damen('oberteil', { aermel: 'kurz', kragen: 'polo', laenge: 'crop', passform: 'tailliert', dessin: 'bretagne' }, 'rippe', 'marine'),
  t_regenbogenpulli: kl('oberteil', { aermel: 'lang', kragen: 'rund', passform: 'oversize', rippbund: true, strick: true, dessin: 'regenbogen' }, 'strick', 'creme'),
  t_fleecejacke: kl('oberteil', { aermel: 'lang', kragen: 'stehkragen', zip: true, rippbund: true, dessin: 'fleece', extras: ['brusttaschen'] }, 'polyester', 'lila'),
  t_sweatweste: kl('oberteil', { aermel: 'ohne', kragen: 'kapuze', zip: true, kaenguru: true, armbuendchen: true, passform: 'oversize' }, 'baumwolle', 'olive'),
  t_karohose: kl('hose', { passform: 'weit', dessin: 'schotten' }, 'wolle', 'rot'),
  t_pyjamahose: kl('hose', { passform: 'jogger', komfortbund: true, dessin: 'herzen' }, 'baumwolle', 'rosa'),
  t_radler: damen('hose', { passform: 'leggings', laenge: 'kurz', extras: ['seitenstreifen'] }, 'polyester', 'schwarz'),
  t_leorock: damen('rock', { laenge: 'midi', form: 'gerade', dessin: 'leo' }, 'satin', 'camel'),
  t_skort: damen('rock', { laenge: 'mini', form: 'wickel', dessin: 'block' }, 'polyester', 'salbei'),
  t_jeanskleid: damen('kleid', { laenge: 'knie', form: 'a-linie', aermel: 'kurz', kragen: 'hemd' }, 'denim', 'jeansblau'),
  t_cropjeansjacke: kl('jacke', { art: 'jeansjacke', laenge: 'crop' }, 'denim', 'hellerdenim'),
  t_fleeceweste: kl('jacke', { art: 'steppweste', dessin: 'fleece' }, 'teddy', 'ecru'),
  t_camoshorts: kl('hose', { passform: 'weit', laenge: 'kurz', cargo: true, dessin: 'camo' }, 'baumwolle', 'khaki'),
  t_ringelhoodie: kl('oberteil', { aermel: 'lang', kragen: 'kapuze', kaenguru: true, rippbund: true, passform: 'oversize', dessin: 'bretagne' }, 'baumwolle', 'weiß'),
  t_schachshorts: kl('hose', { passform: 'gerade', laenge: 'kurz', komfortbund: true, extras: ['kordel'], dessin: 'schach' }, 'baumwolle', 'flieder'),
  t_leoshirt: kl('oberteil', { aermel: 'kurz', kragen: 'rund', passform: 'boxy', dessin: 'leo' }, 'baumwolle', 'sand'),
  t_sternepulli: kl('oberteil', { aermel: 'lang', kragen: 'rund', passform: 'oversize', rippbund: true, strick: true, dessin: 'sterne' }, 'strick', 'marine'),
  t_herzcrop: damen('oberteil', { aermel: 'kurz', kragen: 'carree', laenge: 'crop', passform: 'tailliert', dessin: 'herzen' }, 'baumwolle', 'weiß'),
  t_tuellmini: damen('rock', { laenge: 'mini', form: 'glocke' }, 'tuell', 'schwarz'),
  t_cargooverall: kl('hose', { passform: 'baggy', latz: true, cargo: true }, 'baumwolle', 'olive'),
  // ───────────── Teens & Young Adults: Kleider
  t_hoodiekleid: damen('kleid', { laenge: 'knie', form: 'gerade', aermel: 'lang', extras: ['taillenkordel'], motiv: 'schrift', motivS: 16 }, 'baumwolle', 'grau'),
  t_bodycon: damen('kleid', { laenge: 'midi', form: 'bleistift', aermel: 'ohne', kragen: 'carree' }, 'rippe', 'bordeaux'),
  t_babydoll: damen('kleid', { laenge: 'mini', form: 'glocke', aermel: 'traeger', dessin: 'bluemchen', extras: ['volant'] }, 'viskose', 'hellblau'),
  // ───────────── Teens & Young Adults: Jacken
  t_croppuffer: kl('jacke', { art: 'steppjacke', laenge: 'crop' }, 'nylon', 'flieder'),
  t_windbreaker: kl('jacke', { art: 'regenjacke', laenge: 'kurz', dessin: 'block' }, 'nylon', 'petrol'),
  t_coachjacket: kl('jacke', { art: 'harrington', motiv: 'schrift', motivX: 50, motivY: 34, motivS: 16 }, 'nylon', 'schwarz'),
  t_sherpajacke: kl('jacke', { art: 'teddy', laenge: 'kurz', dessin: 'block' }, 'teddy', 'ecru'),
  t_cropweste: kl('jacke', { art: 'steppweste', laenge: 'crop' }, 'nylon', 'schwarz'),
  t_kunstlederjacke: damen('jacke', { art: 'lederjacke', laenge: 'crop' }, 'leder', 'bordeaux'),
  t_karojacke: kl('jacke', { art: 'overshirt', dessin: 'schotten' }, 'wolle', 'rot'),
  t_satinbomber: kl('jacke', { art: 'bomber', motiv: 'blitz', motivS: 8 }, 'satin', 'flaschengrün'),

  // ───────────── Schuhe (Q28-Leisten mit eigenen Parametern)
  t_skateschuh: schuh('sneaker', 'sneaker', 'baumwolle', 'schwarz', { sohle: 0.085, sohleFarbe: '#f4f3ef', profil: false, kappe: 'gummi', lagen: [[0.05, 0.95, '#2a2c30']], schnuerung: [0.36, 0.66, 6] }),
  t_hightop: schuh('sneaker', 'sneaker', 'baumwolle', 'rot', { schaft: 0.56, schaftSchnuerung: 4, schnuerung: [0.3, 0.64, 6], polsterRand: true, kappe: 'gummi', sohleFarbe: '#f4f3ef', profil: false }),
  t_retrorunner: schuh('sneaker', 'sneaker', 'leder', 'grau', { zweiton: true, akzent: '#c8372f', overlays: true, sohleWelle: true, sohle: 0.1, sohleFarbe: '#ece6d8', lagen: [[0.1, 0.4, '#273659']] }),
  t_plateauboots: schuh('schnuerstiefel', 'halb', 'leder', 'schwarz', { sohle: 0.17, sohleFarbe: '#1d1b1c', schaft: 0.64 }),
  k_hallenschuh: { nur: 'kinder', ...schuh('sneaker', 'sneaker', 'leder', 'weiß', { sohleFarbe: '#c79a5a', schnuerung: false, zunge: false, klett: 3, klettFarbe: '#273659', kappe: 'gummi', kappeFarbe: '#c79a5a' }) },
  k_leuchtsneaker: { nur: 'kinder', ...schuh('sneaker', 'sneaker', 'leder', 'rosa', { schnuerung: false, zunge: false, klett: 2, klettFarbe: '#f4f3ef', sohle: 0.09, lagen: [[0.0, 0.2, '#e8506a'], [0.2, 0.4, '#f1cf4a'], [0.4, 0.6, '#5f9a4a'], [0.6, 0.8, '#4f7fae'], [0.8, 1, '#9a7bd0']] }) },
  k_riemchenschuh: { nur: 'kinder', ...schuh('ballerina', 'halb', 'lack', 'rot', { schleife: false, klett: 1, klettFarbe: '#7a1f1a', hoehe: 'kind', breite: 'breit' }) },
  k_krabbelschuh: { nur: 'kinder', ...schuh('lauflern', 'sneaker', 'leder', 'beige', { sohle: 0.02, sohleFarbe: '#8a6a4a', klett: 0, kappe: null, schaft: 0.36, polsterRand: false, gummiband: true, paar: true }) },

  // ───────────── Zubehör, Baby, Spielzeug, Zimmer (Zeichner q33-kind.js / q33-teen.js)
  ...KIND.silhouetten,
  ...TEEN.silhouetten,
};

export const ZEICHNER = { q33flat, ...KIND.zeichner, ...TEEN.zeichner };
