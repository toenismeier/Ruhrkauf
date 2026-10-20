import { definition, inselModul } from './basis.js';
import { LOD } from '../basis.js';

export const INSEL_ALT_PUPPEN = definition("insel_alt_puppen", "Puppengruppe klassisch", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"allgemein","w":5}));
export const INSEL_ALT_NEUHEIT = definition("insel_alt_neuheit", "Kaufhausneuheiten", "allgemein", "insel", 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":2.5}));
export const INSEL_ALT_BETTW = definition("insel_alt_bettw", "Bettwäscheinsel", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":5}));
export const INSEL_ALT_GESCHENK = definition("insel_alt_geschenk", "Geschenkpodest", "allgemein", "insel", 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":2.5}));
export const INSEL_ALT_SCHUHE = definition("insel_alt_schuhe", "Schuhprobierinsel", "allgemein", "insel", 2, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"allgemein","w":2.5}));
export const INSEL_ALT_OSTERN = definition("insel_alt_ostern", "Saisoninsel", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"ware","pal":"outlet","w":5}));
export const INSEL_ALT_KINDER = definition("insel_alt_kinder", "Kinderwelt", "allgemein", "insel", 4, 2, 1.5, 260, (L,r,d,ctx) => inselModul(L,r,d,ctx, {"art":"puppen","pal":"kinder","w":5}));

export const VITRINE_ALT = definition('vitrine_alt','Glasvitrine Kaufhaus alt','allgemein','insel',2,2,1.5,260,(L,r,d,ctx)=>{
  L.box(2.35,0.20,1.1,0,0,1.25,'#765946');
  L.box(2.35,0.12,1.1,0,1.30,1.25,'#765946');
  if (LOD.stufe === 'fern' || d < 0.5) return;
  L.box(0.05,1.1,0.05,-1.08,0.2,0.72,'#80624a');
  L.box(0.05,1.1,0.05,1.08,0.2,0.72,'#80624a');
  L.box(0.05,1.1,0.05,-1.08,0.2,1.78,'#80624a');
  L.box(0.05,1.1,0.05,1.08,0.2,1.78,'#80624a');
  L.box(2.2,0.045,0.9,0,0.78,1.25,'#cadbe1');
  for(let i=0;i<5;i++) L.box(0.30,0.19,0.20,(i-2)*0.40,0.85,1.25,'#b89a66');
});
