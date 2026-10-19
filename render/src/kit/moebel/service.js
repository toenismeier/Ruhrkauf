import { definition, serviceModul } from './basis.js';

export const SERVICE_RADWERKSTATT = definition("service_radwerkstatt", "Radwerkstatt", "sport", "service", 4, 2, 1.9, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"werkstatt","w":5}));
export const SERVICE_SKISERVICE = definition("service_skiservice", "Skiservice", "sport", "service", 4, 2, 1.9, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"skiwerkstatt","w":5}));
export const SERVICE_LAUFBERATUNG = definition("service_laufberatung", "Laufberatung", "sport", "service", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const SERVICE_SKISCHUHBANK = definition("service_skischuhbank", "Sitzbank Skischuhe", "sport", "service", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"bank","w":2.5}));
export const SERVICE_ANPROBEBANK = definition("service_anprobebank", "Sitzbank Sportschuhe", "sport", "service", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"bank","w":2.5}));
export const SERVICE_UMKLEIDE_2 = definition("service_umkleide_2", "Umkleide 2 Kabinen", "sport", "service", 4, 2, 2.4, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"umkleide","kabinen":2,"w":5}));
export const SERVICE_UMKLEIDE_4 = definition("service_umkleide_4", "Umkleide 4 Kabinen", "sport", "service", 4, 2, 2.4, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"umkleide","kabinen":4,"w":5}));
export const SERVICE_REPARATUR = definition("service_reparatur", "Reparaturannahme", "sport", "service", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const SERVICE_SERVICE_BEFL = definition("service_service_befl", "Trikotbeflockung", "sport", "service", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"beflockung","w":2.5}));
export const SERVICE_ALT_TREPPE = definition("service_alt_treppe", "Treppe offen, Rezeption", "allgemein", "service", 4, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":5}));
export const SERVICE_ALT_SPIEGEL = definition("service_alt_spiegel", "Stütze mit Spiegel", "allgemein", "service", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const SERVICE_ALT_AUFZUG = definition("service_alt_aufzug", "Aufzug-Vorraum alt", "allgemein", "service", 4, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":5}));
export const SERVICE_ALT_UMKLEIDE = definition("service_alt_umkleide", "Umkleidereihe alt", "allgemein", "service", 4, 2, 2.4, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"umkleide","kabinen":4,"w":5}));
export const SERVICE_ALT_BERATUNG = definition("service_alt_beratung", "Beratung klassisch", "allgemein", "service", 2, 2, 1.5, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"info","w":2.5}));
export const SERVICE_ALT_WARENAUSGABE = definition("service_alt_warenausgabe", "Warenausgabe", "allgemein", "service", 4, 2, 1.9, 260, (L,r,d,ctx) => serviceModul(L,r,d,ctx, {"art":"werkstatt","w":5}));
