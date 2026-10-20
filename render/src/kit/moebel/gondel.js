import { definition, gondelModul } from './basis.js';

export const GONDEL_SCHUHE = definition("gondel_schuhe", "Schuhgondel", "sport", "gondel", 2, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"schuhe","pal":"laufen","w":2.5}));
export const GONDEL_TEXTIL = definition("gondel_textil", "Faltgondel", "sport", "gondel", 4, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"textil","pal":"textil","w":5}));
export const GONDEL_BAELLE = definition("gondel_baelle", "Ballgondel", "sport", "gondel", 2, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"ball","pal":"team","w":2.5}));
export const GONDEL_TRINKEN = definition("gondel_trinken", "Trinkflaschen", "sport", "gondel", 2, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"ware","pal":"fitness","w":2.5}));
export const GONDEL_RIEGEL = definition("gondel_riegel", "Sportnahrung", "sport", "gondel", 2, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"fitness","w":2.5}));
export const GONDEL_SOCKEN = definition("gondel_socken", "Sportsocken", "sport", "gondel", 2, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"textil","pal":"textil","w":2.5}));
export const GONDEL_FITNESS = definition("gondel_fitness", "Fitnesskleingeräte", "sport", "gondel", 3, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"fitness","w":3.75}));
export const GONDEL_RAD = definition("gondel_rad", "Radzubehör", "sport", "gondel", 4, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"rad","w":5}));
export const GONDEL_SKI = definition("gondel_ski", "Skizubehör", "sport", "gondel", 3, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"winter","w":3.75}));
export const GONDEL_OUTDOOR = definition("gondel_outdoor", "Outdoorzubehör", "sport", "gondel", 4, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"outdoor","w":5}));
export const GONDEL_KINDER = definition("gondel_kinder", "Kindersport", "sport", "gondel", 3, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"textil","pal":"kinder","w":3.75}));
export const GONDEL_TRIKOT = definition("gondel_trikot", "Trikotgondel", "sport", "gondel", 4, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"textil","pal":"team","w":5}));
export const GONDEL_HELM = definition("gondel_helm", "Helmzubehör", "sport", "gondel", 2, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"rad","w":2.5}));
export const GONDEL_KURZWAREN = definition("gondel_kurzwaren", "Kurzwaren klassisch", "allgemein", "gondel", 4, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"allgemein","w":5}));
export const GONDEL_GESCHENKE = definition("gondel_geschenke", "Geschenkgondel", "allgemein", "gondel", 3, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"outlet","w":3.75}));
export const GONDEL_WAESCHE = definition("gondel_waesche", "Wäschegondel", "allgemein", "gondel", 4, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"textil","pal":"outlet","w":5}));
export const GONDEL_SPIELZEUG = definition("gondel_spielzeug", "Spielwarengondel", "allgemein", "gondel", 2, 1, 1.4, 120, (L,r,d,ctx) => gondelModul(L,r,d,ctx, {"art":"pakete","pal":"kinder","w":2.5}));
