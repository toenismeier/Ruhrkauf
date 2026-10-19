// Sichtabnahme in echtem Spielzoom: isoKamera aus basis.js mit Zoom/Mitte aus stadtrand.js/nahMitte.
// Sechs Familien × vier Zustände, zusätzlich S003 als Teilezahl-Referenz.
import { THREE, Sammler, neueSzene, renderer, sonneAuf, isoKamera, sockel } from '../kit/basis.js';
import { nahMitte } from '../kit/stadtrand.js';
import { sporthaus, familieSport, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const sport=haeuser.filter(h=>h.format==='sport');
const gruppen=[];
for(let fam=1;fam<=6;fam++){
 const h=sport.find(x=>familieSport(x)===fam&&(x.etagen??[]).includes(1))??sport.find(x=>familieSport(x)===fam);
 if(!h)continue;
 gruppen.push({fam,id:h.id,haus:{...h,lage:'1a',substanz:75,grundflaecheQm:Math.max(2200,h.grundflaecheQm),etagen:h.etagen.length>1?h.etagen:[0,1]}});
}
// S003 bleibt in seinen echten Dimensionen; hier ist der Vergleich der Teilezahl verbindlich.
const s003=sport.find(x=>x.id==='S003');
if(s003)gruppen.push({fam:familieSport(s003),id:'S003 · Referenz',haus:{...s003,substanz:75}});
const varianten=[
 {titel:'Normal',sub:75,status:'offen'},
 {titel:'Abverkauf',sub:75,status:'aktion',aktion:'sale',rabatt:0.35},
 {titel:'Substanz 25',sub:25,status:'offen'},
 {titel:'Abverkauf + Substanz 25',sub:25,status:'aktion',aktion:'sale',rabatt:0.35},
];
const W=390,H=844,LABEL=52,COLS=4,HEAD=95;
const canvas=document.createElement('canvas');
canvas.width=COLS*W;canvas.height=HEAD+gruppen.length*(H+LABEL);
const ctx=canvas.getContext('2d');
ctx.fillStyle='#17212d';ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle='#ffffff';ctx.font='bold 34px Arial';
ctx.fillText('Hartwig Sport · echter Spielzoom (nahMitte / Zoom 62)',16,49);
ctx.fillStyle='#abb8c6';ctx.font='18px Arial';
ctx.fillText('Vergleich ohne Rückgriff auf Kamera-Fit; gleicher Standpunkt und gleiche Maße pro Zeile',16,78);
const rend=renderer(W,H),stats=[],errors=[];
let idx=0;
function zeichne(){
 const total=gruppen.length*varianten.length;
 if(idx>=total){
  window.fertig=true;window.bild=canvas.toDataURL('image/png');window.fehler=errors;
  console.log('SPORTNAH_STAT '+JSON.stringify(stats));return;
 }
 const gi=Math.floor(idx/4),vi=idx%4,g=gruppen[gi],v=varianten[vi],haus={...g.haus,substanz:v.sub};
 const X=350,Z=350,ex=vi*W,ey=HEAD+gi*(H+LABEL);
 let scene;
 try{
  scene=neueSzene('#4fb6c2');const S=new Sammler();
  const er=sporthaus(S,scene,haus,{familie:g.fam,x:X,z:Z,status:v.status,aktion:v.aktion,rabatt:v.rabatt});
  sockel(S,X,Z,er.w,er.d,5);
  S.bauen(scene);
  const mitte=nahMitte({breite:800,tiefe:800,kameraGrenze:{x0:0,x1:800,z0:0,z1:800}},'einkauf',62,{punkt:[(X+er.w*0.52)/800,(Z+er.d*0.52)/800]});
  const ziel=new THREE.Vector3(mitte.x,Math.max(3,er.hoehe*0.30),mitte.z);
  sonneAuf(scene,ziel,115);
  const cam=isoKamera(W,H,mitte.zoom,ziel);
  rend.render(scene,cam);
  ctx.drawImage(rend.domElement,ex,ey,W,H);
  stats.push({fam:g.fam,id:g.id,status:v.titel,teile:er.teile,zoom:mitte.zoom});
 }catch(e){
  errors.push(g.id+' / '+v.titel+': '+e.message);
  ctx.fillStyle='#892c2c';ctx.fillRect(ex,ey,W,H);
 }
 if(scene){const seen=new Set();scene.traverse(m=>{if(m.geometry)m.geometry.dispose();const ms=Array.isArray(m.material)?m.material:[m.material];for(const mat of ms){if(!mat||seen.has(mat))continue;seen.add(mat);for(const k of Object.keys(mat))if(mat[k]?.isTexture)mat[k].dispose();mat.dispose();}});scene.clear();}
 ctx.fillStyle='#17212d';ctx.fillRect(ex,ey+H,W,LABEL);
 ctx.fillStyle='#ffffff';ctx.font='bold 20px Arial';ctx.fillText(v.titel,ex+10,ey+H+23);
 ctx.fillStyle='#a2b4c5';ctx.font='15px Arial';ctx.fillText('F'+g.fam+' '+FAMILIEN_SPORT[g.fam]+' · '+g.id,ex+10,ey+H+43);
 idx++;window.fortschritt=idx;setTimeout(zeichne,25);
}
setTimeout(zeichne,80);
