// Eigenständige Trophy-Store-Architektur. Kein Warenhaus-Familiengenerator.
// Vier historische Einzelbauten. Maße und Seed stammen aus der Engine, Farben aus dem Luxussegment.
import { THREE, rng, zw, schild } from './basis.js';
import { masse } from './warenhaus.js';
import { zustandNormal } from './zustaende.js';

export const PREMIUM_NAMEN = Object.freeze({
  P001: 'Palais Hartwig', P002: 'Hartwig am Hofgarten',
  P003: 'Alsterhaus Hartwig', P004: 'Hartwig Königsallee',
});
export const PREMIUM_MESSING = '#b8955a';
const BRONZE = '#665341', KUPFER = '#5f8f7a', DUNKEL = '#253b34';
const STEIN = { P001: '#e2d5c1', P002: '#e5d2b8', P003: '#eeeae0', P004: '#dad5cb' };
const GLAS = '#608394', GLAS_HELL = '#8bb2bd';

export function premiumMasse(haus) {
  const m = masse(haus);
  const p = haus.premiumSchluessel;
  // An den normalen Slot angeschlossen; die Monumentalwirkung entsteht aus Höhe und Architektur.
  return { w: m.w, d: m.d, n: Math.max(p === 'P001' ? 6 : 5, m.n), H: Math.max(p === 'P001' ? 6 : 5, m.n) * 4.45 + 6.6 };
}
function zylinder(S,x,z,r,y,h,f,seg=16,oben=r) {
  const geo = new THREE.CylinderGeometry(oben,r,h,seg).translate(x,y+h/2,z);
  S.add(geo,f);
}
function kuppel(S,x,z,r,y,f) {
  for(let i=0;i<5;i++) zylinder(S,x,z,r*(1-i*0.12),y+i*0.7,0.85,f,20,r*(1-(i+1)*0.12));
  zylinder(S,x,z,Math.max(0.5,r*0.35),y+3.4,1.1,PREMIUM_MESSING,14,0.25);
}
function fensterachsen(S,x,z,w,d,n,typ) {
  const eg=6.6, gh=4.45, raster=typ==='P004'?4.5:4.7;
  for (let seite=0;seite<2;seite++) {
    const len=seite===0?w:d;
    for (let i=0;i<n;i++) {
      const y=eg+i*gh+2.1, sep=seite===0?z+d+0.07:x+w+0.07;
      for(let u=3;u<len-2;u+=raster) {
        const mitte=(seite===0?x:z)+u;
        const br=Math.min(2.6,raster-1.4);
        if (seite===0) {
          S.box(br,2.6,0.18,mitte,y,sep,GLAS);
          S.box(br+0.35,0.18,0.48,mitte,y-1.4,sep+0.05,PREMIUM_MESSING);
          S.box(0.16,2.9,0.38,mitte,y,sep+0.08,typ==='P003'?'#f4f0e8':PREMIUM_MESSING);
        } else {
          S.box(0.18,2.6,br,sep,y,mitte,GLAS);
          S.box(0.48,0.18,br+0.35,sep+0.05,y-1.4,mitte,PREMIUM_MESSING);
          S.box(0.38,2.9,0.16,sep+0.08,y,mitte,typ==='P003'?'#f4f0e8':PREMIUM_MESSING);
        }
      }
      // Profilierte Geschossbänder, an beiden sichtbaren Fassaden.
      const yy=eg+(i+1)*gh;
      if (seite===0) S.box(w+0.6,0.34,0.62,x+w/2,yy,z+d+0.12,PREMIUM_MESSING);
      else S.box(0.62,0.34,d+0.6,x+w+0.12,yy,z+d/2,PREMIUM_MESSING);
    }
  }
}
function glasdach(S,x,z,w,d,y,typ) {
  const B=typ==='P001'?w*0.81:Math.min(w*0.48,29),T=Math.min(d*0.46,25), cx=x+w/2,cz=z+d/2;
  // Kein opaker Metallboden unter dem Glas: nur umlaufender Messingrahmen.
  const rahmen=0.65;
  for(const s of [-1,1]) {
    S.box(B+rahmen,0.45,rahmen,cx,y,cz+s*T/2,PREMIUM_MESSING);
    S.box(rahmen,0.45,T+rahmen,cx+s*B/2,y,cz,PREMIUM_MESSING);
  }
  S.box(B,0.18,T,cx,y+0.4,cz,GLAS_HELL);
  for(let u=-B/2;u<=B/2;u+=3.2) S.box(0.16,0.25,T,cx+u,y+0.6,cz,BRONZE);
  for(let u=-T/2;u<=T/2;u+=3.2) S.box(B,0.25,0.16,cx,y+0.6,cz+u,BRONZE);
  // erhöhte Längsachse des Wintergartens
  S.box(B*0.38,2.6,T*0.38,cx,y+1.65,cz,GLAS_HELL);
  return { x:cx,z:cz,B,T };
}
function vordach(S,x,z,w,d) {
  S.box(12,0.6,3.8,x+w/2,5.25,z+d+1.7,BRONZE);
  S.box(11.8,0.16,3.8,x+w/2,5.62,z+d+1.7,PREMIUM_MESSING);
  for(const a of [-5,5]) {
    S.box(0.27,5,0.27,x+w/2+a,2.5,z+d+3.1,PREMIUM_MESSING);
    S.box(0.6,0.35,0.6,x+w/2+a,0.45,z+d+3.1,BRONZE);
  }
}
function strassenleben(S,x,z,w,d,r,opt={}) {
  // Nur im Erdgeschoss: Wagenvorfahrt und hochwertige dunkle Limousinen.
  for(let i=0;i<2;i++) {
    const xx=x+w*0.28+i*w*0.43,zz=z+d+5.8;
    S.box(4.2,0.7,1.8,xx,0.7,zz,['#2b3338','#46515a','#5e625e'][i]);
    S.box(2.4,0.6,1.58,xx,1.25,zz,GLAS);
  }
  // Metallpfosten mit kleinen Fahnen an der Hauptfassade.
  for(let i=0;i<5;i++) {
    const xx=x+w*(0.12+0.76*i/4);
    S.box(0.13,5,0.13,xx,5.2,z+d+0.8,BRONZE);
    if (!opt.verkaufsprozess && !opt.insolvenz) {
      S.box(1.2,1.1,0.1,xx+0.6,7.25,z+d+0.8,opt.kaeufer?'#314c6a':DUNKEL);
      S.box(0.6,0.1,0.15,xx+0.5,7.15,z+d+0.87,PREMIUM_MESSING);
      S.box(0.28,0.38,0.17,xx+0.78,7.30,z+d+0.9,PREMIUM_MESSING); // Messing-Signet
    }
    // Während des Verkaufs sind die Fahnen sichtbar eingeholt: Seil am Mast.
    else S.box(0.07,2.8,0.07,xx+0.17,5.8,z+d+0.82,'#b8a588');
  }
  // Mehr Passanten als bei normalen Häusern, aber keine zufälligen Farben außer Seed-RNG.
  const gaeste = Math.min(130,Math.round((w+d)*0.96));
  for(let i=0;i<(opt.verkaufsprozess||opt.insolvenz?Math.ceil(gaeste/2):gaeste);i++) {
    const seite=r()>0.3;
    const xx=seite?x+zw(r,1,w):x+w+zw(r,0.8,2.6);
    const zz=seite?z+d+zw(r,0.8,3.4):z+zw(r,1,d);
    S.box(0.38,1.2,0.32,xx,1.05,zz,r()<0.65?'#2d3740':'#776858');
    S.box(0.3,0.32,0.32,xx,1.82,zz,'#c4a48a');
  }
}
function arkaden(S,x,z,w,d) {
  for(let u=2;u<w-3;u+=6) {
    S.box(0.8,5.7,0.9,x+u,3.0,z+d+0.8,STEIN.P002);
    S.box(5.5,0.5,1.2,x+u+2.8,6.1,z+d+0.8,PREMIUM_MESSING);
    // Arkadenzwickel als konstruktive Dreieckstücke statt bloßer Schaufenster.
    S.box(1.1,0.7,1.0,x+u+2.8,5.25,z+d+0.8,STEIN.P002);
  }
}
function dachterrasse(S,x,z,w,d,y,r) {
  const bx=x+w*0.64,bz=z+d*0.30;
  S.box(w*0.32,0.18,d*0.42,bx,y+0.2,bz,'#bea991');
  for(let i=0;i<5;i++) {
    const xx=x+w*0.51+i*w*0.07;
    S.box(0.12,2.9,0.12,xx,y+1.75,bz,BRONZE);
    zylinder(S,xx,bz,1.8,y+3.05,0.18,['#ebddc5','#f6f1e7'][i%2],10,0.3);
  }
}
function variante(S,typ,x,z,w,d,y,r) {
  if(typ==='P001') {
    // Berliner Kaiserzeit: monumentaler Rundturm am sichtbaren Eck, Bronze-Abdeckung.
    const cx=x+w-3,cz=z+d-3;
    zylinder(S,cx,cz,4.1,3.0,y+9.2-3.0,STEIN.P001,22);
    for(let i=0;i<6;i++) S.box(0.7,0.45,1.4,cx+3.65,6.5+i*4.45,cz,PREMIUM_MESSING);
    // Eckturm ragt über zwei Vollgeschosse über die Haupttraufe hinaus.
    for(let i=0;i<3;i++) zylinder(S,cx,cz,4.18-i*0.18,y+5+i*1.25,0.25,PREMIUM_MESSING,22);
    kuppel(S,cx,cz,4.3,y+9.2,BRONZE);
    S.box(w+0.4,0.8,0.9,x+w/2,y-2,z+d+0.1,STEIN.P001);
  } else if(typ==='P002') {
    // Kupferdach mit Gauben und Dachrestaurant / Terrasse.
    // Zwei steile Kupferdach-Flügel mit ausgesparter Terrasse; kein flacher Vollquader.
    for (const [ax,bw] of [[x+w*0.21,w*0.42],[x+w*0.88,w*0.24]]) {
      const steigung=8.2, half=d*0.5;
      for (const sign of [-1,1]) {
        const dach=new THREE.BoxGeometry(bw,0.5,Math.hypot(steigung,half));
        dach.rotateX(sign*Math.atan2(steigung,half));
        dach.translate(ax,y+steigung/2+1,z+d/2+sign*d/4);
        S.add(dach,KUPFER);
      }
    }
    for(let reihe=0;reihe<2;reihe++) for(let u=4;u<w-4;u+=7.5) {
      S.box(3.1,2.8,2.5,x+u,y+2+reihe*3,z+d-5-reihe*6,STEIN.P002);
      S.box(2.2,1.45,0.16,x+u,y+2+reihe*3,z+d-3.65-reihe*6,GLAS);
      S.box(3.6,0.28,2.9,x+u,y+3.55+reihe*3,z+d-5-reihe*6,KUPFER);
    }
    dachterrasse(S,x,z,w,d,y+2.7,r);
  } else if(typ==='P003') {
    // Hamburg: weiße Kolonnaden, große grün patinierte Kuppel.
    // Kuppel bewusst auf die sichtbare Fassadenecke versetzt, nicht in Dachmitte.
    // Sockel 6,2 m plus Kuppel/Laterne ca. 5 m: über 8 m über Haupttraufe.
    const radius=9.2,cx=x+w-radius-0.6,cz=z+d-radius-0.6;
    zylinder(S,cx,cz,radius,y,6.2,STEIN.P003,28);
    kuppel(S,cx,cz,radius,y+6.2,KUPFER);
    for(let u=3;u<w-3;u+=5.5) S.box(0.9,5.2,0.85,x+u,3.1,z+d+0.65,'#f5f1e9');
  } else {
    // Düsseldorf: 1920er Natursteinraster und markanter, flacher Baldachin.
    S.box(w+0.7,1.1,1.2,x+w/2,y-0.6,z+d+0.15,'#c1b8ac');
    S.box(13,0.9,5.0,x+w/2,5.3,z+d+2.4,BRONZE);
    S.box(13,0.16,5.0,x+w/2,5.85,z+d+2.4,PREMIUM_MESSING);
    // Rhythmus der vertikalen Naturstein-Lisenen des 1920er-Rasters.
    for(let u=2;u<w-1;u+=4.5) S.box(0.6,y-4.8,1.15,x+u,(y-4.8)/2+6.6,z+d+0.42,'#c5bcb1');
    for(let u=2;u<d-1;u+=4.5) S.box(1.15,y-4.8,0.6,x+w+0.42,(y-4.8)/2+6.6,z+u,'#c5bcb1');
  }
}
function statusBau(S,scene,typ,x,z,w,d,H,zust,haus,opt) {
  const hat=(s)=>zust.status===s||zust.zusatz.includes(s);
  if(hat('umbau')) {
    // Geöffnet während der Investition: einseitiges Gerüst, Staubschutzplane, Bauzaun, Kran.
    for(let u=0;u<w*0.44;u+=3.5){
      S.box(0.19,H*0.86,0.19,x+u,H*0.43,z+d+1.3,'#88959a');
      for(let y=4;y<H*0.88;y+=4.5) S.box(3.5,0.18,0.3,x+u+1.7,y,z+d+1.3,'#a2a8a6');
    }
    S.box(w*0.43,H*0.67,0.06,x+w*0.215,H*0.53,z+d+1.55,'#dad7cb');
    for(let u=0;u<w*0.43;u+=2.5) S.box(0.11,2,0.12,x+u,1.25,z+d+3.3,'#859490');
    S.box(0.35,H+15,0.35,x+w*0.9,(H+15)/2,z+d+5,'#dfb94a');
    S.box(w*0.65,0.45,0.5,x+w*0.64,H+14,z+d+5,'#dfb94a');
    S.box(0.1,9,0.1,x+w*0.32,H+10,z+d+5,'#7b756c');
  }
  if(hat('geschlossen')||hat('leer')||hat('verfall')||hat('abriss')) {
    for(let u=2;u<w-2;u+=5) S.box(4.1,3.2,0.12,x+u,2.1,z+d+0.55,'#797974');
  }
  if(hat('raeumung')||hat('offprice')||hat('teilschliessung')) {
    S.box(8,1,0.25,x+w*0.7,4.2,z+d+0.68,BRONZE);
    if(scene) schild(scene,'RÄUMUNG','+z',x+w*0.7,4.2,z+d+0.68,0.75,'#e5d7c4');
  }
  if(hat('neueroeffnung')) {
    S.box(11,0.9,0.3,x+w*0.5,7.2,z+d+0.5,DUNKEL);
    if(scene) schild(scene,'NEUERÖFFNUNG','+z',x+w*0.5,7.2,z+d+0.5,0.65,PREMIUM_MESSING);
  }
  if(hat('aktion') && !opt.verkaufsprozess) {
    // Keine schreienden Rabattplakate, nur kleine Aktionshinweise am Seiteneingang.
    S.box(4.2,1.1,0.2,x+w*0.8,2.4,z+d+0.65,DUNKEL);
    if(scene) schild(scene,'AKTION','+z',x+w*0.8,2.4,z+d+0.65,0.55,'#f0e7d8');
  }
  if(opt.verkaufsprozess) {
    S.box(8,1.9,0.25,x+w*0.22,2,z+d+1.2,'#293e37');
    if(scene) {
      schild(scene,'EXKLUSIVER VERKAUFSPROZESS','+z',x+w*0.22,2.7,z+d+1.3,0.62,'#e2d6c2');
      schild(scene,opt.investor||'Investorenprüfung','+z',x+w*0.22,1.75,z+d+1.3,0.5,'#e2d6c2');
    }
  }
  if(hat('untermiete')) {
    S.box(5.5,0.5,0.2,x+w*0.15,5.3,z+d+0.65,BRONZE);
  }
  if(hat('abriss')) {
    S.box(w*0.32,1,1,x+w*0.17,0.7,z+d+2.2,'#a09b90');
  }
  if(opt.kaeufer || opt.hartwig===false || haus.status==='verkauft') {
    if(scene) schild(scene,opt.kaeufer||haus.premiumEigentuemer||'NEUER EIGENTÜMER','+z',x+w/2,H-4,z+d+0.6,Math.max(1.65,Math.min(2,w/19)),PREMIUM_MESSING);
  } else if(!hat('geschlossen')&&!hat('verfall')&&!hat('leer')&&!hat('abriss')) {
    if(scene) schild(scene,PREMIUM_NAMEN[typ].toUpperCase(),'+z',x+w/2,H-4,z+d+0.6,Math.max(typ==='P001'?1.9:1.65,Math.min(2.2,w/20)),PREMIUM_MESSING);
  }
}


// Relief besteht aus nachvollziehbaren Werksteinen, Gesimsen, Sprossen, Balustern
// und Dachornamenten. Die Anzahl ist bewusst je Haus budgetiert, keine Zufallsfüller.
function kostbareFassade(S,typ,x,z,w,d,n,H,start) {
  const achse=typ==='P004'?4.5:4.7, stein=STEIN[typ];
  const ornament=typ==='P004'?'#bcb5aa':typ==='P003'?'#e0ddcf':'#cbbda9';
  for(const seite of ['+z','+x']) {
    const len=seite==='+z'?w:d;
    for(let geschoss=0;geschoss<n;geschoss++) {
      const mitteY=6.6+geschoss*4.45+2.1;
      for(let u=3;u<len-2;u+=achse) {
        const ww=Math.min(2.6,achse-1.4), c=(seite==='+z'?x:z)+u;
        const vorne=seite==='+z'?z+d+0.39:x+w+0.39;
        const k=(breite,hoehe,tiefe,versatz,y,col)=>seite==='+z'?
          S.box(breite,hoehe,tiefe,c+versatz,y,vorne,col):
          S.box(tiefe,hoehe,breite,vorne,y,c+versatz,col);
        // Zweifach profilierter Architrav, Kassettendecke, Fensterlaibung.
        for(const dd of [-1,1]) {
          k(0.16,3.28,0.23,dd*(ww/2+0.19),mitteY,ornament);
          k(0.12,3.1,0.16,dd*(ww/2+0.34),mitteY,stein);
          k(0.18,0.28,0.38,dd*(ww/2+0.22),mitteY+1.68,PREMIUM_MESSING);
        }
        for(let z=0;z<4;z++) k(ww+0.58-z*0.11,0.13,0.36-z*0.04,0,mitteY+1.55+z*0.17,z%2?ornament:stein);
        for(let z=1;z<=4;z++) k(0.08,2.46,0.12,-ww/2+ww*z/5,mitteY+0.02,typ==='P004'?'#b4bab9':BRONZE);
        for(let z=1;z<=3;z++) k(ww,0.08,0.14,0,mitteY-1.12+z*0.69,'#c9bdac');
        for(let z=0;z<8;z++) k(0.15,0.54,0.18,-ww/2+(z+0.5)*ww/8,mitteY-1.23,typ==='P004'?stein:PREMIUM_MESSING);
        for(let z=0;z<3;z++) k(0.45,0.20,0.3,(-1+z)*ww/3,mitteY-1.65,stein);
      }
    }
  }
  // Kolossalpilaster: in Berlin über drei Geschosse, in Düsseldorf schlanke Lisenen.
  const abschnitte=typ==='P001'?3:typ==='P004'?n:2;
  for(const seite of ['+z','+x']) {
    const len=seite==='+z'?w:d;
    for(let u=1;u<len-1;u+=typ==='P001'?11.7:9.4){
      for(let g=0;g<abschnitte;g++) {
        const h=typ==='P001'?Math.min(n*4.45,13.35):Math.max(2.5,n*4.45/abschnitte);
        const yy=6.6+g*h+h/2;
        for(let f=0;f<4;f++){
          const v=u+(f-1.5)*0.28;
          if(seite==='+z')S.box(0.18,h,0.55,(x+v),yy,z+d+0.55,ornament);
          else S.box(0.55,h,0.18,x+w+0.55,yy,z+v,ornament);
        }
      }
    }
  }
  // Verzahnte Kalksteinquader/Klinkerscharen; keine glatte Quaderwand.
  // Dichte wird an der Sammler-Teilezahl gedeckelt, damit alle Häuser zwischen 4k und 9k liegen.
  const ziel=typ==='P001'?6400:typ==='P002'?5900:typ==='P003'?5600:5100;
  const a=Math.max(8,Math.floor(w/1.55)),b=Math.max(8,Math.floor(d/1.55));
  let t=0;
  while(S.anzahl-start<ziel&&t<12000){
    const reihe=Math.floor(t/(a+b)),spalte=t%(a+b);
    const yy=0.85+reihe*0.64;
    if(yy>H-0.5)break;
    if(spalte<a) {
      const xx=x+(spalte+0.5)*w/a+(reihe%2)*0.12;
      S.box(0.32,0.11,0.12,xx,yy,z+d+0.22,ornament);
    } else {
      const zz=z+(spalte-a+0.5)*d/b+(reihe%2)*0.12;
      S.box(0.12,0.11,0.32,x+w+0.22,yy,zz,ornament);
    }
    t++;
  }
  // Dachränder und Ballustraden bilden zusätzliche, architektonisch sinnvolle
  // Detailreserven, falls ein kleineres Haus weniger Fensterraster hat.
  for(let i=0;S.anzahl-start<ziel&&i<3000;i++){
    const seite=i%2, v=Math.floor(i/2),len=seite?w:d,step=0.34;
    const u=(v*step)%len, reihe=Math.floor(v*step/len);
    const yy=H-0.8+reihe*0.22;
    if(reihe>5)break;
    if(!seite)S.box(0.18,0.2,0.33,x+u,yy,z+d+0.4,PREMIUM_MESSING);
    else S.box(0.33,0.2,0.18,x+w+0.4,yy,z+u,PREMIUM_MESSING);
  }
}
function edleAuslagen(S,x,z,w,d,r) {
  for(let u=3;u<w-2;u+=5){
    // Zwei stilisierte Schaufensterpuppen pro Achse und punktuelle Lichtakzente.
    for(const v of [-0.65,0.65]){
      S.box(0.45,1.17,0.33,x+u+v,2.02,z+d+0.62,r()>0.5?'#d3b99b':'#667a78');
      S.box(0.23,0.35,0.24,x+u+v,2.81,z+d+0.63,'#dcccb4');
      S.box(0.10,0.20,0.1,x+u+v,3.15,z+d+0.61,PREMIUM_MESSING);
    }
    S.box(0.18,4.6,0.24,x+u-2.05,2.72,z+d+0.45,'#d8c89f');
    S.box(0.18,4.6,0.24,x+u+2.05,2.72,z+d+0.45,'#d8c89f');
  }
}
function platzbrunnen(S,x,z,w,d,typ) {
  if(typ!=='P003')return;
  const cx=x+w*0.78,cz=z+d+8.8;
  zylinder(S,cx,cz,3.6,0.12,0.62,'#c5c9c0',22);
  zylinder(S,cx,cz,2.9,0.77,0.08,'#71b4ba',22);
  zylinder(S,cx,cz,0.56,0.85,2.2,'#d8d4c6',12);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    S.box(0.13,0.75,0.13,cx+Math.cos(a)*2.2,1.4,cz+Math.sin(a)*2.2,'#b1d5d7');
  }
}

/** Gebäude mit den gleichen Rückgabefeldern wie warenhaus(). */
export function premiumhaus(S,scene,haus,opt={}) {
  const start=S.anzahl;
  const typ=haus.premiumSchluessel ?? Object.keys(PREMIUM_NAMEN).find((key)=>PREMIUM_NAMEN[key]===haus.name) ?? 'P004';
  const m=premiumMasse(haus),{w,d,n,H}=m,x=opt.x??0,z=opt.z??0,r=rng(haus.id+'/premium/'+typ);
  const stein=STEIN[typ],eg=6.6,gh=4.45;
  const zust=zustandNormal({...opt,status:opt.status??haus.status??'offen',seed:haus.id});
  // Korpus; beide Sichtseiten durchgehend architektonisch ausgearbeitet.
  S.box(w,eg,d,x+w/2,eg/2,z+d/2,BRONZE);
  // Vier massive Flügel statt eines Vollblocks: das gläserne Atrium bleibt bis zum EG offen.
  const lichtW=Math.min(w*0.48,29),lichtD=Math.min(d*0.46,25);
  const seitenW=(w-lichtW)/2,seitenD=(d-lichtD)/2;
  const mitteX=x+w/2,mitteZ=z+d/2,fluegelY=eg+n*gh/2;
  S.box(seitenW,n*gh,d,x+seitenW/2,fluegelY,mitteZ,stein);
  S.box(seitenW,n*gh,d,x+w-seitenW/2,fluegelY,mitteZ,stein);
  S.box(lichtW,n*gh,seitenD,mitteX,fluegelY,z+seitenD/2,stein);
  S.box(lichtW,n*gh,seitenD,mitteX,fluegelY,z+d-seitenD/2,stein);
  S.box(w+0.9,0.7,d+0.9,x+w/2,eg-0.25,z+d/2,PREMIUM_MESSING);
  fensterachsen(S,x,z,w,d,n,typ);
  // Luxuriös inszenierte Schaufenster mit Bronzerahmen, Podest, Vitrinen.
  for(let u=3;u<w-2;u+=5) {
    S.box(3.5,4.3,0.24,x+u,2.7,z+d+0.11,GLAS_HELL);
    S.box(3.7,0.28,0.55,x+u,0.95,z+d+0.28,PREMIUM_MESSING);
    S.box(0.85,1.4,0.65,x+u,1.8,z+d+0.43,u%2?'#ede1cf':'#b0a58b');
  }
  for(let u=3;u<d-2;u+=5) {
    S.box(0.24,4.3,3.5,x+w+0.11,2.7,z+u,GLAS_HELL);
    S.box(0.55,0.28,3.7,x+w+0.28,0.95,z+u,PREMIUM_MESSING);
  }
  // Dach als vier umlaufende Schenkel; ein massiver Deckel würde das Atrium verdecken.
  const dach=typ==='P002'?KUPFER:BRONZE;
  S.box(seitenW+0.5,1,d+1,x+seitenW/2,H+0.5,mitteZ,dach);
  S.box(seitenW+0.5,1,d+1,x+w-seitenW/2,H+0.5,mitteZ,dach);
  S.box(lichtW,1,seitenD+0.5,mitteX,H+0.5,z+seitenD/2,dach);
  S.box(lichtW,1,seitenD+0.5,mitteX,H+0.5,z+d-seitenD/2,dach);
  glasdach(S,x,z,w,d,H+1.0,typ);
  vordach(S,x,z,w,d);
  variante(S,typ,x,z,w,d,H+1.0,r);
  // Berlin: vier tatsächlich beflaggte Traufmasten statt leerer Antennen-Silhouette.
  // Im Verkaufsprozess werden Mast und Tuch vollständig eingeholt, nicht leer gezeigt.
  if(typ==='P001' && !opt.verkaufsprozess && !opt.insolvenz && haus.status!=='verkauft') {
    for(let i=0;i<4;i++){
      const fx=x+w*(0.16+i*0.22),fz=z+d-1.5;
      S.box(0.18,4.8,0.18,fx,H+3.8,fz,BRONZE);
      S.box(1.9,1.2,0.13,fx+0.95,H+5.45,fz,DUNKEL);
      S.box(0.43,0.38,0.17,fx+0.86,H+5.55,fz+0.12,PREMIUM_MESSING);
    }
  }
  if(typ==='P002') arkaden(S,x,z,w,d);
  edleAuslagen(S,x,z,w,d,r);
  platzbrunnen(S,x,z,w,d,typ);
  kostbareFassade(S,typ,x,z,w,d,n,H,start);
  strassenleben(S,x,z,w,d,r,{...opt,insolvenz:haus.status==='insolvenz'});
  statusBau(S,scene,typ,x,z,w,d,H,zust,haus,opt);
  const hoehe=H+(zust.hat('umbau')?20:typ==='P003'?13:typ==='P001'?16:typ==='P002'?12:6);
  return {hoehe,w,d,familie:'premium',teile:S.anzahl-start,status:zust.status};
}
