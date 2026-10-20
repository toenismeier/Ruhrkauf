import { THREE, rng } from '../basis.js';
import { boden, lokal, vorbereiten } from '../innen.js';

export function moebelKachel(m, seed=1) {
  return {
    titel:m.titel, hintergrund:'#26313a',
    bau(S,scene) {
      vorbereiten(S,scene);
      // Einheitliche 5×5-m-Bodenplatte, auch wenn das Wandmodul 10 m lang ist.
      const breite=Math.max(5,m.rasterB*1.25), tiefe=Math.max(5,m.rasterT*1.25);
      S.box(breite+0.14,0.16,tiefe+0.14,0,-0.16,tiefe/2,'#434c54');
      boden(S,-breite/2,0,breite,tiefe,-0.08,'gang',0.1);
      m.bau(lokal(S,0,0,0,0),rng(seed),1,{seed});
      this.unter=`${m.id} · ${m.rasterB}×${m.rasterT} Raster · ${S.anzahl} Teile`;
      return new THREE.Box3(new THREE.Vector3(-breite/2-0.2,-0.35,-0.2),new THREE.Vector3(breite/2+0.2,Math.max(3.2,m.hoehe),tiefe+0.2));
    }
  };
}
export function reihenKachel(titel,eintraege,typ) {
  return {
    titel,hintergrund:'#26313a',
    bau(S,scene) {
      vorbereiten(S,scene);
      const w=eintraege.reduce((a,m)=>a+m.rasterB*1.25,0),t=typ==='wand'?5:5;
      S.box(w+0.15,0.18,t+0.15,0,-0.18,t/2,'#434c54');
      boden(S,-w/2,0,w,t,-0.08,'gang',0.1);
      let links=-w/2;
      for(let i=0;i<eintraege.length;i++) {
        const m=eintraege[i], b=m.rasterB*1.25;
        m.bau(lokal(S,links+b/2,0,typ==='wand'?0:1.1,0),rng(61+i),1,{seed:61+i});
        links+=b;
      }
      this.unter=`${eintraege.length} Module · ${w.toFixed(2)} × ${t} m · ${S.anzahl} Teile`;
      return new THREE.Box3(new THREE.Vector3(-w/2-0.3,-0.35,-0.3),new THREE.Vector3(w/2+0.3,3.35,t+0.3));
    }
  };
}
