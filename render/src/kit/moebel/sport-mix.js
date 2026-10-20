// Sortimentsspezifische, teilesparende Präsentation im 1,25-m-Gangraster.
// Gleiche Stellflächen wie die Gondeln, aber keine gleichförmigen Supermarktregale.
import { definition, palette, detail, wandModul } from './basis.js';
import { LOD } from '../basis.js';

const THEMEN = Object.freeze({
  sportschuhe: ['sitzbank','probiertisch','spiegel','schuhregal','anprobebank','schuhtisch'],
  sporttextil: ['kleiderstange','rundstaender','puppen','falttisch','haengung','saison'],
  outdoor: ['rucksaecke','zelt','wanderware','tisch','jacken','ausruestung'],
  rad: ['radreihe','helmstaender','werkbank','radzubehoer','sattel','radpodest'],
  fitness: ['geraete','hanteln','matten','training','zubehoer','ausstellung'],
  wintersport: ['ski','boards','skijacken','skischuhe','ausruestung','wintertisch'],
  teamsport: ['ballkorb','trikots','tordisplay','stollen','vereinsware','balltisch'],
});
const FARBEN = {
  sportschuhe:'laufen', sporttextil:'textil', outdoor:'outdoor', rad:'rad',
  fitness:'fitness', wintersport:'winter', teamsport:'team',
};
const basis=(L,w,farbe)=> {
  L.box(w-0.18,0.10,1.06,0,0,0.625,'#bfc9cc');
  L.box(w-0.24,0.07,0.94,0,0.12,0.625,farbe);
};
function baueMix(L,r,d,art,stil,w) {
  const pal=palette(FARBEN[art]), farbe=pal[Math.floor(r()*pal.length)];
  basis(L,w,farbe);
  if(LOD.stufe==='fern') {
    L.box(w-0.4,0.72,0.72,0,0.23,0.625,pal[1%pal.length]);
    return;
  }
  const n=Math.max(2,Math.floor(w/1.25));
  const xx=i=>(i-(n-1)/2)*(w-0.7)/n;
  if(/bank|sitz|matten|tisch|probier|falttisch|wintertisch|podest|ausstellung/.test(stil)){
    L.box(w-0.42,0.14,0.72,0,0.51,0.625,'#ded8cf');
    for(const x of [-w/2+0.36,w/2-0.36])L.box(0.10,0.51,0.10,x,0.03,0.625,'#525b64');
    if(/bank|sitz|matten/.test(stil))L.box(w-0.5,0.22,0.48,0,0.67,0.6,pal[2%pal.length]);
    else for(let i=0;i<n;i++)L.box(0.42,0.22,0.40,xx(i),0.69,0.63,pal[i%pal.length]);
  } else if(/spiegel/.test(stil)){
    for(let i=0;i<n;i++){
      L.box(0.14,1.12,0.12,xx(i),0.16,0.63,'#424c55');
      L.box(0.60,1.02,0.035,xx(i),0.21,0.71,'#9fc0ca');
      L.box(0.58,0.06,0.08,xx(i),1.21,0.70,'#586168');
    }
  } else if(/radreihe|radpodest|geraete|training/.test(stil)){
    for(let i=0;i<n;i++){
      const x=xx(i);
      L.zyl(0.24,0.24,0.11,x-0.21,0.20,0.65,'#283038',10);
      L.zyl(0.24,0.24,0.11,x+0.21,0.20,0.65,'#283038',10);
      L.box(0.50,0.10,0.12,x,0.55,0.65,pal[i%pal.length]);
      L.box(0.06,0.62,0.07,x,0.26,0.65,'#727e87');
      L.box(0.48,0.08,0.09,x,0.96,0.65,'#333b42');
    }
  } else if(/puppen/.test(stil)){
    for(let i=0;i<n;i++){
      const x=xx(i);
      L.box(0.32,0.52,0.22,x,0.62,0.62,pal[i%pal.length]);
      L.box(0.18,0.20,0.18,x,1.13,0.62,'#c6a68b');
      for(const dx of [-0.11,0.11])L.box(0.08,0.48,0.10,x+dx,0.15,0.62,'#343c44');
      for(const dx of [-0.23,0.23])L.box(0.07,0.40,0.10,x+dx,0.72,0.62,pal[i%pal.length]);
    }
  } else if(/rund|ballkorb|helm|hantel/.test(stil)){
    for(let i=0;i<n;i++){
      const x=xx(i);
      L.zyl(0.46,0.46,0.09,x,0.88,0.65,'#737c83',12);
      L.box(0.07,0.84,0.07,x,0.15,0.65,'#737c83');
      for(let j=0;j<4;j++)L.box(0.16,0.25,0.17,x+(j%2?0.21:-0.21),0.93,0.65+(j<2?-0.21:0.21),pal[(i+j)%pal.length]);
    }
  } else if(/zelt|tor|board|ski/.test(stil)){
    for(let i=0;i<n;i++){
      const x=xx(i);
      L.box(0.68,0.65,0.64,x,0.28,0.65,pal[i%pal.length]);
      L.box(0.08,0.48,0.08,x,0.76,0.65,'#e0e2e0');
      L.box(0.70,0.08,0.55,x,1.21,0.65,pal[(i+1)%pal.length]);
    }
  } else if(/stange|haengung|jacken|trikot/.test(stil)){
    L.box(w-0.36,0.07,0.08,0,1.19,0.62,'#5b6972');
    for(const x of [-w/2+0.28,w/2-0.28])L.box(0.08,1.15,0.08,x,0.08,0.62,'#707f89');
    for(let i=0;i<n*3;i++){
      const x=-w/2+0.27+(i+0.5)*(w-0.54)/(n*3);
      L.box((w-0.54)/(n*3)*0.72,0.70,0.26,x,0.43,0.65,pal[i%pal.length]);
    }
  } else {
    // Sortimentstische, Rucksäcke, Schuhe, Zubehör: erkennbare Warengruppen ohne 4 Fachböden.
    L.box(w-0.28,0.13,0.66,0,0.75,0.625,'#dfe5e5');
    for(let i=0;i<n*2;i++){
      const x=-w/2+0.3+(i+0.5)*(w-0.6)/(n*2);
      L.box((w-0.6)/(n*2)*0.8,0.37+(i%2)*0.10,0.34,x,0.85,0.65,pal[i%pal.length]);
    }
  }
  if(detail(d)&&/werkbank|radzubehoer|ausruestung/.test(stil))
    L.box(w-0.36,0.06,0.12,0,1.28,0.65,'#e6e6df');
}
const definitionen=[];
for(const [art,stile] of Object.entries(THEMEN))
  for(const stil of stile)
    for(const rasterB of [2,4]){
      const w=rasterB*1.25;
      const id='sport_mix_'+art+'_'+stil+'_'+rasterB;
      definitionen.push(definition(id,art+' · '+stil,'sport','gondel',rasterB,1,1.4,120,
        (L,r,d)=>baueMix(L,r,d,art,stil,w)));
    }
export const SPORT_MIX_MOEBEL=Object.freeze(definitionen);
export const SPORT_MIX_PROFILE=Object.freeze(Object.fromEntries(
  Object.entries(THEMEN).map(([art,stile])=>[art,Object.freeze(Object.fromEntries(
    [2,4].map(b=>[b,Object.freeze(stile.map(stil=>'sport_mix_'+art+'_'+stil+'_'+b))])
  ))])
));

// Schmale, sortimentsbezogene Innenwandpräsentationen für Randabteilungen:
// Stellfläche 2,50 × 0,60 m, nicht als Ersatz für die Außenwanddeckung.
const WANDWARE=Object.freeze({
  sportschuhe:['schuhe','stollen','ware','schuhe'],
  sporttextil:['textil','jacken','trikot','ware'],
  outdoor:['rucksack','jacken','ware','schuhe'],
  rad:['rad','helm','ware','rad'],
  fitness:['ware','textil','ware','schuhe'],
  wintersport:['ski','board','jacken','ware'],
  teamsport:['trikot','ball','stollen','ware'],
});
export const SPORT_MIX_WAENDE=Object.freeze(Object.fromEntries(
  Object.entries(WANDWARE).map(([art,arten])=>[art,Object.freeze(arten.map((ware,i)=>{
    const id='sport_mix_wand_'+art+'_'+i;
    const titel=(THEMEN[art]?.[i]??art)+' · Wand';
    definitionen.push(definition(id,titel,'sport','wand',2,1,3,220,
      (L,r,d,ctx)=>wandModul(L,r,d,ctx,{art:ware,pal:FARBEN[art],titel,w:2.5})));
    return id;
  }))])
));
