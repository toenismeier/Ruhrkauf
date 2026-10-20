// Links exakte 2D-Draufsicht der geplanten Flächen; rechts Bibliotheksmöbel in 3D.
// Nicht die alten Sportetagen: deren Umstellung und Vorher/Nachher ist Phase 4.
import { zeigeKatalog } from '../kit/katalog.js';
import { THREE } from '../kit/basis.js';
import { vorbereiten } from '../kit/innen.js';
import { ladenplan, baueLadenplan } from '../kit/ladenplan.js';
import { sportLadenEingabe } from '../kit/ladenbau-sport.js';
import { pruefeLadenplan } from '../kit/ladenbau-pruefung.js';
import haeuser from '../../haeuser.json';

// Sechs unterschiedliche Häuser, einschließlich mehrgeschossiger Verkaufsfläche und Fachmarkt-Box.
const faelle=[['S017',0],['S041',0],['S024',0],['S011',1],['S012',0],['S032',0]];
const farben=['#b9d7e2','#c7dcb9','#e4cea8','#e6b3be','#d6c5df','#b8d2ca','#e5dbad'];
const geb=(S,r,farbe,y=0,h=0.07)=>S.box(r.w,h,r.d,r.x+r.w/2,y+h/2,r.z+r.d/2,farbe);
const top=({breite,hoehe,mitte,THREE})=>{
  const blick=1.15*Math.max(mitte.x*2+8,mitte.z*2+8);
  const vw=Math.max(1,blick,((mitte.z*2+8)*breite)/hoehe);
  const vh=vw*hoehe/breite;
  const k=new THREE.OrthographicCamera(-vw/2,vw/2,vh/2,-vh/2,0.1,300);
  k.position.set(mitte.x,100,mitte.z);k.up.set(0,0,-1);
  k.lookAt(mitte.x,0,mitte.z);k.updateProjectionMatrix();return k;
};
const tiles=[];
for(const [id,etage] of faelle){
  const haus=haeuser.find(h=>h.id===id);if(!haus||!haus.etagen.includes(etage))continue;
  const eing=sportLadenEingabe(haus,etage);
  let plan;
  try{plan=ladenplan(eing.flaeche,'sport',eing.abteilungen,id+':'+etage)}
  catch(e){console.error('Diagnose '+id+': '+e.message);continue}
  const q=pruefeLadenplan(plan),etikett=id+' · '+(etage===0?'EG':etage+'. OG')+' · '+eing.flaeche.breite+'×'+eing.flaeche.tiefe+' m';
  tiles.push({
    titel:etikett+' · Draufsicht',hintergrund:'#26313a',kamera:top,
    bau(S,scene){
      vorbereiten(S,scene);
      geb(S,{x:0,z:0,w:plan.breite,d:plan.tiefe},'#e1ddd4',-0.1,0.08);
      plan.abteilungen.forEach((a,i)=>geb(S,a,farben[i%farben.length],0,0.045));
      plan.gaenge.forEach(a=>geb(S,a,a.typ==='haupt'?'#f8f7f2':'#ece8de',0.06,0.045));
      plan.hindernisse.forEach(a=>geb(S,a,'#59626b',0.09,0.065));
      plan.moebel.forEach(a=>geb(S,a,a.typ==='wand'?'#4d6470':a.typ==='kasse'?'#c8524d':a.inszenierung?'#d89848':'#7a8d98',0.10,0.065));
      this.unter=plan.abteilungen.length+' Räume · '+plan.moebel.length+' Möbel · '+q.fehler.length+' Regelverstöße';
      return new THREE.Box3(new THREE.Vector3(0,-0.2,0),new THREE.Vector3(plan.breite,0.4,plan.tiefe));
    }
  });
  tiles.push({
    titel:etikett+' · 3D',hintergrund:'#26313a',
    bau(S,scene){
      const r=baueLadenplan(S,scene,plan);
      this.unter=r.moebel+' Möbel · '+r.teile+' Teile · '+(100*q.messwerte.dichte).toFixed(1)+'% Dichte';
      return new THREE.Box3(new THREE.Vector3(0,-0.4,0),new THREE.Vector3(plan.breite,3.4,plan.tiefe));
    }
  });
}
zeigeKatalog(tiles,{titel:'Ladenplan-Diagnose: Plan-Draufsicht und 3D',spalten:2,kachel:[960,790]});
