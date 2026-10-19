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

// Unverwechselbare Bestandsbauten der Schwesterkette; keine Rolltreppe.
export const ALT_TREPPE_OFFEN = definition('alt_treppe_offen','Offene Haupttreppe alt','allgemein','service',4,4,3.8,260,(L,r,d,ctx)=>{
  L.box(5,0.14,5,0,0,2.5,'#ad9377');
  for(let i=0;i<9;i++) {
    L.box(2.35,0.10,0.45,-1.2,0.14+i*0.28,0.35+i*0.50,'#c0a07b');
    L.box(0.12,0.80+i*0.28,0.12,0.08,0.14,0.35+i*0.50,'#766049');
  }
  L.box(0.12,0.12,4.8,0.1,3.1,2.5,'#78624d');
});
export const ALT_FAHRSTUHL = definition('alt_fahrstuhl','Aufzug mit Gittertür','allgemein','service',4,2,3.4,260,(L,r,d,ctx)=>{
  L.box(3.5,3.2,0.12,0,0,0.06,'#8c8d8a');
  L.box(3.25,3.0,0.12,0,0,0.19,'#bbb4a5');
  for(let i=0;i<9;i++)L.box(0.055,2.8,0.09,-1.3+i*0.325,0.15,0.28,'#585f62');
  L.box(3.2,0.12,0.15,0,3.1,0.23,'#695441');
});
export const ALT_STUETZE_SPIEGEL = definition('alt_stuetze_spiegel','Spiegelstütze','allgemein','service',2,2,3.3,260,(L,r,d,ctx)=>{
  L.box(0.70,3.3,0.7,0,0,1.25,'#a08b75');
  L.box(0.58,2.0,0.025,0,0.65,1.61,'#cadde3');
  L.box(0.07,2.1,0.08,-0.33,0.60,1.63,'#786651');
  L.box(0.07,2.1,0.08,0.33,0.60,1.63,'#786651');
});
