import { definition, dekoModul } from './basis.js';

export const DEKO_KLETTERWAND = definition("deko_kletterwand", "Kletterwand-Segment", "sport", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"klettern","titel":"Kletterwand-Segment","w":2.5}));
export const DEKO_MOTIVWAND = definition("deko_motivwand", "Sportmotiv-Bildwand", "sport", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"bild","titel":"Sportmotiv-Bildwand","w":2.5}));
export const DEKO_PFLANZKUEBEL = definition("deko_pflanzkuebel", "Pflanzkübel", "sport", "deko", 2, 1, 1.4, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"pflanze","titel":"Pflanzkübel","w":2.5}));
export const DEKO_SAISONBANNER = definition("deko_saisonbanner", "Saisonbanner", "sport", "deko", 2, 1, 2.8, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"banner","titel":"Saisonbanner","w":2.5}));
export const DEKO_SPORTBILD = definition("deko_sportbild", "Markenbildwand", "sport", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"bild","titel":"Markenbildwand","w":2.5}));
export const DEKO_ALT_LEUCHTBAND = definition("deko_alt_leuchtband", "Rasterleuchten-Deckenband", "allgemein", "deko", 2, 1, 2.8, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"banner","titel":"Rasterleuchten-Deckenband","w":2.5}));
export const DEKO_ALT_SCHAUBILD = definition("deko_alt_schaubild", "Kaufhausbildwand", "allgemein", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"bild","titel":"Kaufhausbildwand","w":2.5}));
