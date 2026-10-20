// Off-Price: dichte, sortierte Hängeware, keine Paletten, Wühltische oder Gitterboxen.
import { definition, wandModul, gondelModul, serviceModul, inselModul, palette, farbe, detail, textAuf } from './basis.js';
import { LOD } from '../basis.js';

function aufhaengung(L, r, d, ctx, doppelt = false, anWand = false) {
  const w = 5, hoehe = anWand ? 2.4 : 1.48, nr = anWand ? 1 : doppelt ? 2 : 1;
  if (anWand) { wandModul(L,r,d,ctx,{w,art:'textil',pal:'outlet',titel:'Mode und Größen'}); return; }
  const pal = palette('outlet');
  for(let j=0;j<nr;j++) {
    const z = doppelt ? 0.52+j*1.36 : 1.20;
    L.box(0.07,hoehe,0.08,-w/2+0.1,0,z,'#999fa6');
    L.box(0.07,hoehe,0.08,w/2-0.1,0,z,'#999fa6');
    L.box(w-0.22,0.055,0.07,0,hoehe-0.10,z,'#8a959d');
    if(LOD.stufe==='fern') { L.box(w-0.28,0.8,0.65,0,0.48,z,pal[j]);continue; }
    const f= Math.max(0.10,Math.min(1,ctx?.bestueckung ?? 1));
    const n=Math.floor(36*f);
    for(let i=0;i<n;i++) {
      const x=-w/2+0.2+(i+0.5)*(w-0.4)/36;
      L.box(0.075,0.70+(i%5)*0.055,0.48,x,0.12,z,farbe(r,pal));
    }
    for(let i=0;i<5;i++) {
      const x=-w/2+(i+0.5);
      L.box(0.65,0.24,0.05,x,1.24,z+0.02,'#e8e5e0');
      textAuf(L,['XS','S','M','L','XL'][i],x,1.36,z+0.06,0.53,0.16,'#313942','#e8e5e0');
    }
  }
}
function rundstaender(L,r,d,ctx) {
  const pal=palette('outlet');
  L.zyl(0.67,0.67,0.055,0,0,1.25,'#aab4bc',12);
  L.zyl(0.045,0.045,1.38,0,0,1.25,'#929da6',8);
  L.zyl(0.77,0.77,0.045,0,1.34,1.25,'#999fa6',18);
  if(LOD.stufe==='fern'){L.zyl(0.72,0.72,0.65,0,0.54,1.25,'#bd6c78',12);return;}
  for(let i=0;i<14;i++){
    const a=i*Math.PI*2/14,x=Math.cos(a)*0.60,z=1.25+Math.sin(a)*0.60;
    L.box(0.17,0.69+(i%3)*0.08,0.29,x,0.51,z,farbe(r,pal),a);
  }
}
function kassenWeg(L,r,d,art) {
  L.box(5,0.10,2.5,0,0,1.25,'#e8e6e1');
  if(LOD.stufe==='fern'){L.box(4.5,0.95,0.7,0,0.12,1,'#5b6570');return;}
  if(art==='kasse') {
    L.box(4.8,0.96,0.73,0,0.1,0.48,'#49515a');
    L.box(4.8,0.10,0.87,0,1.06,0.48,'#c7c6c2');
    for(let i=0;i<3;i++){
      const x=-1.55+i*1.55;
      L.box(0.4,0.28,0.12,x,1.16,0.48,'#30373d');
      L.box(0.7,0.18,0.2,x+0.2,1.16,0.74,'#b7bdc1');
    }
  } else {
    // Dreifacher Rücklauf der Kundenschlange mit niedrigen Absperrbändern und Impulsware.
    for(const z of [0.55,1.2,1.85]) {
      for(const x of [-2.15,0,2.15]) L.box(0.065,0.94,0.065,x,0.1,z,'#8c969f');
      L.box(4.3,0.06,0.045,0,0.87,z,'#bf4a50');
    }
    L.box(1.0,0.85,0.6,0,0.1,2.06,'#ede2d3');
    for(let i=0;i<5;i++) L.box(0.12,0.31,0.2,(i-2)*0.17,0.95,2.06,farbe(r,palette('outlet')));
  }
}
function wagen(L,r,d,art) {
  if(LOD.stufe==='fern'){L.box(2.0,0.60,1.5,0,0,1.25,'#9dabb5');return;}
  const n=art==='wagen'?3:5;
  for(let i=0;i<n;i++){
    const x = n===3?(i-1)*0.67:(i-2)*0.42;
    L.box(n===3?0.55:0.35,0.33,n===3?0.65:0.38,x,0.37,1.25,art==='wagen'?'#9dabb5':'#d8a451');
    L.box(n===3?0.55:0.34,0.07,0.07,x,0.7,0.95,'#454d54');
    if(art==='wagen') for(const q of [-0.2,0.2]) L.zyl(0.08,0.08,0.055,x+q,0.07,1.48,'#343c40',8);
  }
}
function rollwagen(L,r,d) {
  if(LOD.stufe==='fern'){L.box(2.2,1.3,0.9,0,0.2,1.25,'#9da7b0');return;}
  L.box(2.2,0.12,0.9,0,0.30,1.25,'#9da7b0');
  for (const x of [-0.95,0.95]) for(const z of [0.92,1.58]) L.zyl(0.12,0.12,0.05,x,0.10,z,'#40464c',8);
  L.box(0.07,1.05,0.08,-1.0,0.42,1.25,'#9da7b0');
  L.box(0.07,1.05,0.08,1.0,0.42,1.25,'#9da7b0');
  L.box(1.95,0.06,0.08,0,1.41,1.25,'#9da7b0');
  for(let i=0;i<13;i++) L.box(0.1,0.50,0.34,-0.85+i*0.14,0.76,1.25,farbe(r,palette('outlet')));
}

export const OUTLET_DOPPELSTANGE = definition('outlet_doppelstange',"Doppel-Kleiderstange 5 m",'outlet','insel',4,2,1.5,260,(L,r,d,ctx)=>aufhaengung(L,r,d,ctx,true));
export const OUTLET_WANDSTANGE = definition('outlet_wandstange',"Wandkleiderstange",'outlet','wand',4,1,3,220,(L,r,d,ctx)=>aufhaengung(L,r,d,ctx,false,true));
export const OUTLET_RUNDSTAENDER = definition('outlet_rundstaender',"Rundständer",'outlet','insel',2,2,1.5,260,(L,r,d,ctx)=>rundstaender(L,r,d,ctx));
export const OUTLET_HOME = definition('outlet_home',"Home-Gondel",'outlet','gondel',4,1,1.4,120,(L,r,d,ctx)=>gondelModul(L,r,d,ctx,{w:5,pal:'outlet',art:'pakete'}));
export const OUTLET_ACCESSOIRES = definition('outlet_accessoires',"Accessoires-Gondel",'outlet','gondel',4,1,1.4,120,(L,r,d,ctx)=>gondelModul(L,r,d,ctx,{w:5,pal:'outlet',art:'pakete'}));
export const OUTLET_BEAUTY = definition('outlet_beauty',"Beauty-Gondel",'outlet','gondel',2,1,1.4,120,(L,r,d,ctx)=>gondelModul(L,r,d,ctx,{w:2.5,pal:'outlet',art:'pakete'}));
export const OUTLET_SCHUH_KARTONS = definition('outlet_schuh_kartons',"Schuhe nach Größen",'outlet','wand',4,1,3,220,(L,r,d,ctx)=>wandModul(L,r,d,ctx,{w:5,art:'kartons',pal:'outlet',titel:'Schuhe und Größen'}));
export const OUTLET_TASCHENWAND = definition('outlet_taschenwand',"Taschenwand",'outlet','wand',4,1,3,220,(L,r,d,ctx)=>wandModul(L,r,d,ctx,{w:5,art:'taschen',pal:'outlet',titel:'Taschen'}));
export const OUTLET_HOMEWAND = definition('outlet_homewand',"Home-Wandregal",'outlet','wand',4,1,3,220,(L,r,d,ctx)=>wandModul(L,r,d,ctx,{w:5,art:'ware',pal:'outlet',titel:'Wohnen'}));
export const OUTLET_KASSENZEILE = definition('outlet_kassenzeile',"Kassenzeile",'outlet','kasse',4,2,1.5,260,(L,r,d,ctx)=>kassenWeg(L,r,d,'kasse'));
export const OUTLET_WARTESCHLANGE = definition('outlet_warteschlange',"Kassen-Schlangenführung",'outlet','insel',4,2,1.5,260,(L,r,d,ctx)=>kassenWeg(L,r,d,'schlange'));
export const OUTLET_EINKAUFSWAGEN = definition('outlet_einkaufswagen',"Einkaufswagenstation",'outlet','insel',2,2,1.5,260,(L,r,d,ctx)=>wagen(L,r,d,'wagen'));
export const OUTLET_KORB = definition('outlet_korb',"Korbstation",'outlet','insel',2,2,1.5,260,(L,r,d,ctx)=>wagen(L,r,d,'korb'));
export const OUTLET_UMKLEIDE = definition('outlet_umkleide',"Umkleidereihe",'outlet','service',4,2,2.4,260,(L,r,d,ctx)=>serviceModul(L,r,d,ctx,{w:5,art:'umkleide',kabinen:4}));
export const OUTLET_ROLLWAGEN = definition('outlet_rollwagen',"Nachräum-Rollwagen",'outlet','insel',2,2,1.5,260,(L,r,d,ctx)=>rollwagen(L,r,d));
