import { definition, dekoModul } from './basis.js';
import { LOD } from '../basis.js';

export const DEKO_KLETTERWAND = definition("deko_kletterwand", "Kletterwand-Segment", "sport", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"klettern","titel":"Kletterwand-Segment","w":2.5}));
export const DEKO_MOTIVWAND = definition("deko_motivwand", "Sportmotiv-Bildwand", "sport", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"bild","titel":"Sportmotiv-Bildwand","w":2.5}));
export const DEKO_PFLANZKUEBEL = definition("deko_pflanzkuebel", "Pflanzkübel", "sport", "deko", 2, 1, 1.4, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"pflanze","titel":"Pflanzkübel","w":2.5}));
export const DEKO_SAISONBANNER = definition("deko_saisonbanner", "Saisonbanner", "sport", "deko", 2, 1, 2.8, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"banner","titel":"Saisonbanner","w":2.5}));
export const DEKO_SPORTBILD = definition("deko_sportbild", "Markenbildwand", "sport", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"bild","titel":"Markenbildwand","w":2.5}));
export const DEKO_ALT_WEGWEISER = definition("deko_alt_wegweiser", "Historischer Abteilungswegweiser", "allgemein", "deko", 2, 1, 2.8, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"banner","titel":"Rasterleuchten-Deckenband","w":2.5}));
export const DEKO_ALT_SCHAUBILD = definition("deko_alt_schaubild", "Kaufhausbildwand", "allgemein", "deko", 2, 1, 2.7, 80, (L,r,d,ctx) => dekoModul(L,r,d,ctx, {"art":"bild","titel":"Kaufhausbildwand","w":2.5}));

export const DEKO_ALT_RASTERDECKE = definition('deko_alt_rasterdecke','Rasterleuchten-Deckenband','allgemein','deko',4,1,3.3,80,(L,r,d,ctx)=>{
  L.box(5.0,0.17,0.60,0,3.0,0.3,'#9c9c96');
  if(LOD.stufe==='fern') return;
  for(let i=0;i<5;i++){
    L.box(0.78,0.045,0.46,-2+i,3.19,0.3,'#f4f3e5');
    L.box(0.08,0.06,0.52,-2.4+i,3.17,0.3,'#727d7d');
  }
});
