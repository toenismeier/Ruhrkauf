import { definition, serviceModul } from './basis.js';

export const KASSE_SPORT_KLEIN = definition("kasse_sport_klein", "Sportkasse klein", "sport", "kasse", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const KASSE_SPORT_GROSS = definition("kasse_sport_gross", "Sportkasse groß", "sport", "kasse", 4, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":5}));
export const KASSE_SPORT_INFO = definition("kasse_sport_info", "Sportinformation", "sport", "kasse", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const KASSE_ALT_KASSE = definition("kasse_alt_kasse", "Kassentisch alt", "allgemein", "kasse", 4, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":5}));
export const KASSE_ALT_KASSE_KLEIN = definition("kasse_alt_kasse_klein", "Kassentisch alt klein", "allgemein", "kasse", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const KASSE_ALT_INFO = definition("kasse_alt_info", "Information alt", "allgemein", "kasse", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const KASSE_ALT_VITRINE = definition("kasse_alt_vitrine", "Kassenvitrine", "allgemein", "kasse", 4, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":5}));
