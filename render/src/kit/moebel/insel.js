import { definition, inselModul } from './basis.js';

export const INSEL_ALT_PUPPEN = definition("insel_alt_puppen", "Puppengruppe klassisch", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"allgemein","w":5}));
export const INSEL_ALT_NEUHEIT = definition("insel_alt_neuheit", "Kaufhausneuheiten", "allgemein", "insel", 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":2.5}));
export const INSEL_ALT_BETTW = definition("insel_alt_bettw", "Bettwäscheinsel", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":5}));
export const INSEL_ALT_GESCHENK = definition("insel_alt_geschenk", "Geschenkpodest", "allgemein", "insel", 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":2.5}));
export const INSEL_ALT_SCHUHE = definition("insel_alt_schuhe", "Schuhprobierinsel", "allgemein", "insel", 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":2.5}));
export const INSEL_ALT_OSTERN = definition("insel_alt_ostern", "Saisoninsel", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"outlet","w":5}));
export const INSEL_ALT_KINDER = definition("insel_alt_kinder", "Kinderwelt", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"kinder","w":5}));
