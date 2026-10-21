import { definition, wandModul, inselModul, detail } from './basis.js';
export const SPORT_SCHUH_MARKEN = definition("sport_schuh_marken", "Markenschuhe", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"schuhe","pal":"laufen","titel":"Markenschuhe","alt":false,"akzent":"#bd393a","variante":"marken","w":5}));
export const SPORT_SCHUH_LAUFEN = definition("sport_schuh_laufen", "Laufschuhe", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"schuhe","pal":"laufen","titel":"Laufschuhe","alt":false,"akzent":"#2b79b8","variante":"laufen","w":5}));
export const SPORT_SCHUH_KINDER = definition("sport_schuh_kinder", "Kindersportschuhe", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"schuhe","pal":"kinder","titel":"Kindersportschuhe","alt":false,"akzent":"#ef9a32","variante":"kinder","w":5}));
export const SPORT_SCHUH_HALB = definition("sport_schuh_halb", "Sportschuhe 2,5 m", 'sport', 'wand', 2, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"schuhe","pal":"laufen","titel":"Sportschuhe 2,5 m","alt":false,"w":2.5}));
export const SPORT_KARTONWAND = definition("sport_kartonwand", "Kartonwand Schuhe", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"kartons","pal":"laufen","titel":"Kartonwand Schuhe","alt":false,"w":5}));
export const SPORT_TEXTIL_HAENGUNG = definition("sport_textil_haengung", "Sporttextil Hängung", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"textil","pal":"textil","titel":"Sporttextil Hängung","alt":false,"w":5}));
export const SPORT_TEXTIL_FALT = definition("sport_textil_falt", "Sporttextil gefaltet", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"textil","titel":"Sporttextil gefaltet","alt":false,"w":5}));
export const SPORT_TEXTIL_MIX = definition("sport_textil_mix", "Textilmix", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"textil","pal":"textil","titel":"Textilmix","alt":false,"w":5}));
export const SPORT_TEXTIL_TRAINING = definition("sport_textil_training", "Trainingsbekleidung", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"textil","pal":"fitness","titel":"Trainingsbekleidung","alt":false,"w":5}));
export const SPORT_TRIKOT_VEREIN = definition("sport_trikot_verein", "Vereinstrikots", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"trikot","pal":"team","titel":"Vereinstrikots","alt":false,"w":5}));
export const SPORT_TRIKOT_NATIONAL = definition("sport_trikot_national", "Nationaltrikots", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"trikot","pal":"team","titel":"Nationaltrikots","alt":false,"w":5}));
export const SPORT_TRIKOT_LAENDER = definition("sport_trikot_laender", "Internationale Trikots", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"trikot","pal":"team","titel":"Internationale Trikots","alt":false,"w":5}));
export const SPORT_JACKEN = definition("sport_jacken", "Sportjacken", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"jacken","pal":"textil","titel":"Sportjacken","alt":false,"w":5}));
export const SPORT_JACKEN_OUTDOOR = definition("sport_jacken_outdoor", "Outdoorjacken", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"jacken","pal":"outdoor","titel":"Outdoorjacken","alt":false,"w":5}));
export const SPORT_WANDERSCHUH = definition("sport_wanderschuh", "Wanderschuhe", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"schuhe","pal":"outdoor","titel":"Wanderschuhe","alt":false,"w":5}));
export const SPORT_RUCKSACK = definition("sport_rucksack", "Rucksäcke", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"rucksack","pal":"outdoor","titel":"Rucksäcke","alt":false,"w":5}));
export const SPORT_RUCKSACK_KLEIN = definition("sport_rucksack_klein", "Tagesrucksäcke", 'sport', 'wand', 2, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"rucksack","pal":"outdoor","titel":"Tagesrucksäcke","alt":false,"w":2.5}));
export const SPORT_SCHLAFSACK = definition("sport_schlafsack", "Schlafsäcke", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"outdoor","titel":"Schlafsäcke","alt":false,"w":5}));
export const SPORT_ISOMATTE = definition("sport_isomatte", "Isomatten", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"outdoor","titel":"Isomatten","alt":false,"w":5}));
export const SPORT_ZELTZUBEHOER = definition("sport_zeltzubehoer", "Zeltzubehör", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"outdoor","titel":"Zeltzubehör","alt":false,"w":5}));
export const SPORT_KANU_ZUBEHOER = definition("sport_kanu_zubehoer", "Paddel und Zubehör", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"outdoor","titel":"Paddel und Zubehör","alt":false,"w":5}));
export const SPORT_RAD = definition("sport_rad", "Fahrradwand", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"rad","pal":"rad","titel":"Fahrradwand","alt":false,"w":5}));
export const SPORT_RAD_EINSTIEG = definition("sport_rad_einstieg", "Einsteigerfahrräder", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"rad","pal":"rad","titel":"Einsteigerfahrräder","alt":false,"w":5}));
export const SPORT_HELM = definition("sport_helm", "Fahrradhelme", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"helm","pal":"rad","titel":"Fahrradhelme","alt":false,"w":5}));
export const SPORT_HELM_KINDER = definition("sport_helm_kinder", "Kinderhelme", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"helm","pal":"kinder","titel":"Kinderhelme","alt":false,"w":5}));
export const SPORT_RAD_ZUBEHOER = definition("sport_rad_zubehoer", "Radzubehör", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"rad","titel":"Radzubehör","alt":false,"w":5}));
export const SPORT_SKI = definition("sport_ski", "Skiwand", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ski","pal":"winter","titel":"Skiwand","alt":false,"w":5}));
export const SPORT_SKI_KINDER = definition("sport_ski_kinder", "Kinderski", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ski","pal":"winter","titel":"Kinderski","alt":false,"w":5}));
export const SPORT_BOARD = definition("sport_board", "Snowboards", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"board","pal":"winter","titel":"Snowboards","alt":false,"w":5}));
export const SPORT_SKIJACKEN = definition("sport_skijacken", "Skijacken", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"jacken","pal":"winter","titel":"Skijacken","alt":false,"w":5}));
export const SPORT_BALL = definition("sport_ball", "Bälle", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ball","pal":"team","titel":"Bälle","alt":false,"w":5}));
export const SPORT_STOLLEN = definition("sport_stollen", "Stollenschuhe", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"stollen","pal":"team","titel":"Stollenschuhe","alt":false,"w":5}));
export const SPORT_FITNESS_ZUBEHOER = definition("sport_fitness_zubehoer", "Fitnesszubehör", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"fitness","titel":"Fitnesszubehör","alt":false,"w":5}));
export const SPORT_TRINKFLASCHEN = definition("sport_trinkflaschen", "Trinkflaschen", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"fitness","titel":"Trinkflaschen","alt":false,"w":5}));
export const SPORT_VEREINSARTIKEL = definition("sport_vereinsartikel", "Vereinsartikel", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"team","titel":"Vereinsartikel","alt":false,"w":5}));
export const SPORT_LAUFZUBEHOER = definition("sport_laufzubehoer", "Laufzubehör", 'sport', 'wand', 4, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"ware","pal":"laufen","titel":"Laufzubehör","alt":false,"w":5}));
export const SPORT_MARKENBAND_10 = definition("sport_markenband_10", "Markenwand 10 m", 'sport', 'wand', 8, 1, 3, 220, (L,r,d,ctx) => wandModul(L,r,d,ctx, {"art":"textil","pal":"textil","titel":"Markenwand 10 m","alt":false,"w":10}));
export const SPORT_INSEL_NEUHEIT = definition("sport_insel_neuheit", "Neuheitenpodest", 'sport', 'insel', 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"laufen","w":2.5}));
export const SPORT_INSEL_PUPPEN_LAUFEN = definition("sport_insel_puppen_laufen", "Laufpuppen", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"laufen","w":5}));
export const SPORT_INSEL_PUPPEN_FUSSBALL = definition("sport_insel_puppen_fussball", "Fußballpuppen", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"team","w":5}));
export const SPORT_INSEL_PUPPEN_OUTDOOR = definition("sport_insel_puppen_outdoor", "Outdoorpuppen", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"outdoor","w":5}));
export const SPORT_INSEL_PUPPEN_WINTER = definition("sport_insel_puppen_winter", "Winterpuppen", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"winter","w":5}));
export const SPORT_INSEL_LAUFANALYSE = definition("sport_insel_laufanalyse", "Laufanalyse", 'sport', 'insel', 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"laufanalyse","pal":"laufen","w":2.5}));
export const SPORT_INSEL_FITNESS = definition("sport_insel_fitness", "Fitnessinsel", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"fitness","pal":"fitness","w":5}));
// Kompakte, maßhaltige Zeltpräsentation für kleine Outdoor-Randabteilungen.
export const SPORT_INSEL_ZELT_KLEIN = definition("sport_insel_zelt_klein", "Outdoor-Zelt kompakt", 'sport', 'insel', 2, 2, 1.5, 260,
  (L,r,d,ctx) => inselModul(L,r,d,ctx,{art:'zelt',pal:'outdoor',w:2.5}));
export const SPORT_INSEL_ZELT = definition("sport_insel_zelt", "Zelt aufgebaut", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"zelt","pal":"outdoor","w":5}));
export const SPORT_INSEL_KANU = definition("sport_insel_kanu", "Kanu auf Ständer", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"kanu","pal":"outdoor","w":5}));
export const SPORT_INSEL_EBIKE = definition("sport_insel_ebike", "E-Bike-Podest", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"rad","pal":"rad","w":5}));
export const SPORT_INSEL_RADREIHE = definition("sport_insel_radreihe", "Radreihe", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"rad","pal":"rad","w":5}));
export const SPORT_INSEL_SKISCHUH = definition("sport_insel_skischuh", "Skischuh-Anprobe", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"winter","w":5}));
export const SPORT_INSEL_TOR = definition("sport_insel_tor", "Torinsel", 'sport', 'insel', 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"tor","pal":"team","w":2.5}));
export const SPORT_INSEL_BEFLOCKUNG = definition("sport_insel_beflockung", "Beflockungsinsel", 'sport', 'insel', 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"team","w":2.5}));
export const SPORT_INSEL_ANPROBE = definition("sport_insel_anprobe", "Schuhanprobe", 'sport', 'insel', 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"laufen","w":2.5}));
export const SPORT_INSEL_OUTDOOR_PODEST = definition("sport_insel_outdoor_podest", "Outdoor-Neuheiten", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"outdoor","w":5}));
export const SPORT_INSEL_TRIKOTPOD = definition("sport_insel_trikotpod", "Trikot-Podest", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"team","w":5}));
export const SPORT_INSEL_TRAINING = definition("sport_insel_training", "Trainingsfläche", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"fitness","pal":"fitness","w":5}));
export const SPORT_INSEL_WINTERPOD = definition("sport_insel_winterpod", "Wintersportpodest", 'sport', 'insel', 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"winter","w":5}));

// Phase 4: Abverkauf im oberen OG. Maßhaltige Gondeltypen statt freier Wühltische im Laufweg.
// Nur für Hartwig Sport; FUNDUS hat ausdrücklich keine Wühltische oder Gitterboxen.
export const SPORT_ABVERKAUF_TISCH = definition("sport_abverkauf_tisch", "Sport-Abverkaufstisch", 'sport', 'gondel', 4, 1, 1.4, 120, (L,r,d) => {
  L.box(4.8, 0.16, 1.1, 0, 0.82, 0.625, '#cdd3d7');
  for (const x of [-2.2, 2.2]) for (const z of [0.15, 1.1]) L.box(0.09, 0.82, 0.09, x, 0, z, '#727b83');
  if (!detail(d)) return;
  for (let i = 0; i < 12; i++) {
    const x = -2.05 + (i % 6) * 0.82, z = i < 6 ? 0.34 : 0.84;
    L.box(0.65, 0.20, 0.35, x, 1.0, z, ['#b7474d','#d5b86b','#497b9f','#7c8e62'][Math.floor(r()*4)]);
  }
});
export const SPORT_ABVERKAUF_GITTER = definition("sport_abverkauf_gitter", "Sport-Abverkaufskorb", 'sport', 'gondel', 4, 1, 1.4, 120, (L,r,d) => {
  L.box(4.8, 0.12, 1.0, 0, 0.25, 0.625, '#737f89');
  for (const x of [-2.3, 2.3]) for (const z of [0.18, 1.07]) L.box(0.06, 0.92, 0.06, x, 0.25, z, '#a7b4bd');
  if (!detail(d)) return;
  for (let i = 0; i < 9; i++) L.box(0.42, 0.20, 0.55, -1.9 + i*0.47, 0.37, 0.625,
    ['#c44743','#4b83a4','#dfbb67','#566b53'][Math.floor(r()*4)]);
});
