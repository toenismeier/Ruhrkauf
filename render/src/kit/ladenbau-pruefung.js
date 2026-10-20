// Prüfsemantik für den datenbasierten Ladenplan. Raster 0,625 m.
// Datenpläne werden geprüft; bestehende Etagen müssen in Phase 4 erst auf den Planer umgestellt werden.
import { LADENBAU as R, schneidet, rechteckFlaeche } from './ladenbau-regeln.js';
const S = R.suchRaster;
const EPS=1e-8;
const unique = x=>[...new Set(x)];
const zaehle = (matrix,wert) => matrix.reduce((n,x)=>n+(x===wert?1:0),0);
function unionLength(intervalle, max) {
  let e=0,k=0;
  for(const [a,b] of intervalle.map(([a,b])=>[Math.max(0,a),Math.min(max,b)]).filter(p=>p[1]>p[0]).sort((p,q)=>p[0]-q[0])){
    if(a>k){e+=k>0?0:0;k=a;} // bisherigen Abschnitt im Kumulat nicht doppelt zählen
    if(b>k){e+=b-Math.max(k,a);k=b;}
  }
  return e;
}
function raster(plan) {
  const nx=Math.ceil(plan.breite/S),nz=Math.ceil(plan.tiefe/S);
  const block=new Uint8Array(nx*nz),mob=new Uint8Array(nx*nz),ob=new Uint8Array(nx*nz);
  const set=(r,arr,v=1)=> {
    const ix0=Math.max(0,Math.floor((r.x+EPS)/S)),ix1=Math.min(nx,Math.ceil((r.x+r.w-EPS)/S));
    const iz0=Math.max(0,Math.floor((r.z+EPS)/S)),iz1=Math.min(nz,Math.ceil((r.z+r.d-EPS)/S));
    for(let z=iz0;z<iz1;z++)for(let x=ix0;x<ix1;x++)arr[z*nx+x]=v;
  };
  for(const o of plan.hindernisse){set(o,ob);set(o,block);}
  for(const m of plan.moebel){set(m,mob);set(m,block);}
  return {nx,nz,block,mob,ob,set};
}
function suche(plan,g) {
  const {nx,nz,block}=g,seen=new Uint8Array(nx*nz),queue=new Int32Array(nx*nz);
  let anfang=0,ende=0;
  const p=plan.eingaenge[0],ex=Math.max(0,Math.min(nx-1,Math.floor(p.x/S))),ez=Math.max(0,Math.min(nz-1,Math.floor((p.z-0.5*S)/S)));
  let start=ez*nx+ex;
  if(block[start]) {
    // Bis zwei Meter neben der Eingangstür darf ein freier Eingangszugang gesucht werden.
    const nahe=[];
    for(let d=-4;d<=4;d++){const xx=ex+d;if(xx>=0&&xx<nx&&!block[ez*nx+xx])nahe.push([Math.abs(d),ez*nx+xx]);}
    nahe.sort((a,b)=>a[0]-b[0]);
    if(!nahe.length)return {seen,anzahl:0,start:false};
    start=nahe[0][1];
  }
  queue[ende++]=start;seen[start]=1;
  while(anfang<ende) {
    const i=queue[anfang++],x=i%nx,z=Math.floor(i/nx);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;
      const q=zz*nx+xx;if(!seen[q]&&!block[q]){seen[q]=1;queue[ende++]=q;}
    }
  }
  return {seen,anzahl:ende,start:true};
}
function erreichbar(reach,g,r,puffer=0) {
  const {nx,nz,block}=g,seen=reach.seen;
  const a=Math.max(0,Math.floor((r.x-puffer)/S)),b=Math.min(nx,Math.ceil((r.x+r.w+puffer)/S));
  const c=Math.max(0,Math.floor((r.z-puffer)/S)),d=Math.min(nz,Math.ceil((r.z+r.d+puffer)/S));
  for(let z=c;z<d;z++)for(let x=a;x<b;x++)if(seen[z*nx+x]&&!block[z*nx+x])return true;
  return false;
}
function groessteLeere(g) {
  const {nx,nz,block}=g;let max=0;
  const vorher=new Int32Array(nx+1),jetzt=new Int32Array(nx+1);
  for(let z=1;z<=nz;z++) {
    for(let x=1;x<=nx;x++){
      if(block[(z-1)*nx+x-1])jetzt[x]=0;
      else {jetzt[x]=1+Math.min(jetzt[x-1],vorher[x],vorher[x-1]);if(jetzt[x]>max)max=jetzt[x];}
    }
    vorher.set(jetzt);jetzt.fill(0);
  }
  return max*S;
}
function wanddeckung(plan) {
  // Nur wirklich gesperrte Wandabschnitte aus dem Nenner entfernen.
  // Die frühere Subtraktion der *gesamten* Ausnahmen vom belegten Band
  // hat dort Belegung als Null gezählt, wo ein Lager das Wandmodul ersetzte.
  const exempt=plan.hindernisse.filter(h=>/^(treppe|rt|lager|umkleide|service|aufzug|wc|werkstatt|luft|turm|radbuehne)/.test(String(h.typ)));
  const intervalle=(typ,max)=>({
    ausnahmen:exempt.filter(h=>typ==='west'?h.x<=S:h.z<=S).map(h=>typ==='west'?[h.z,h.z+h.d]:[h.x,h.x+h.w]),
    band:plan.moebel.filter(m=>m.typ==='wand'&&m.band===typ).map(m=>typ==='west'?[m.z,m.z+m.d]:[m.x,m.x+m.w]),
    max
  });
  let deckung=0,laenge=0;
  for(const t of [intervalle('west',plan.tiefe),intervalle('rueck',plan.breite)]) {
    const grenzen=[0,t.max,...t.band.flat(),...t.ausnahmen.flat()]
      .map(v=>Math.max(0,Math.min(t.max,v))).sort((a,b)=>a-b);
    for(let i=1;i<grenzen.length;i++){
      const a=grenzen[i-1],b=grenzen[i],m=(a+b)/2;
      if(b<=a+EPS||t.ausnahmen.some(v=>v[0]<=m&&v[1]>=m))continue;
      laenge+=b-a;
      if(t.band.some(v=>v[0]<=m&&v[1]>=m))deckung+=b-a;
    }
  }
  return laenge>EPS?deckung/laenge:1;
}

/** Rückgabe mit Messwerten, kein globaler Zustand und kein stilles Herausfiltern roter Fälle. */
export function pruefeLadenplan(plan,{teile=null}={}) {
  const fehler=[],warnungen=[],add=(art,text)=>fehler.push(art+': '+text);
  if(!plan||plan.version!==1)throw new Error('Ungültiges Planformat');
  const g=raster(plan),reach=suche(plan,g);
  const flaeche=plan.breite*plan.tiefe,verfuegbar=flaeche-zaehle(g.ob,1)*S*S;
  const belegt=zaehle(g.mob,1)*S*S;
  const dichte=verfuegbar>0?belegt/verfuegbar:0;
  const wand=wanddeckung(plan),leer=groessteLeere(g);
  const boeden=unique(plan.boeden.map(b=>b.typ)),akzent=plan.boeden.filter(b=>b.typ==='akzent').reduce((n,b)=>n+rechteckFlaeche(b),0)/flaeche;
  const dekoflaeche=plan.moebel.filter(m=>m.typ==='deko').reduce((n,m)=>n+rechteckFlaeche(m),0)/flaeche;
  if(!reach.start)add('Wege','Eingang blockiert');
  for(const a of plan.abteilungen) {
    if(!erreichbar(reach,g,a,R.nebengang))add('Wege','Abteilung '+a.id+' nicht erreichbar');
    if(!plan.gaenge.some(k=> {
      const links=Math.abs(a.x+a.w-k.x)<EPS||Math.abs(k.x+k.w-a.x)<EPS;
      const quer=Math.abs(a.z+a.d-k.z)<EPS||Math.abs(k.z+k.d-a.z)<EPS;
      return (links&&a.z<k.z+k.d&&a.z+a.d>k.z)||(quer&&a.x<k.x+k.w&&a.x+a.w>k.x);
    }))add('Anschluss','Abteilung '+a.id+' grenzt nicht an einen Gang');
  }
  for(const m of plan.moebel.filter(m=>m.typ==='kasse'||m.typ==='service'))
    if(!erreichbar(reach,g,m,R.kassenVorfeld))add('Wege',m.id+' nicht erreichbar');
  for(const h of plan.hindernisse)
    for(const k of plan.gaenge)if(schneidet(h,k))add('Wege','Hindernis '+h.id+' liegt im Gang');
  for(const m of plan.moebel) {
    if(!R.winkel.includes(m.winkel))add('Drehung',m.id+' '+m.winkel);
    if(m.x<-EPS||m.z<-EPS||m.x+m.w>plan.breite+EPS||m.z+m.d>plan.tiefe+EPS)add('Geometrie',m.id+' außerhalb Fläche');
    if(plan.hindernisse.some(h=>schneidet(h,m)))add('Geometrie',m.id+' kollidiert mit Hindernis');
    // Möbel in Gangrechtecken entwerten die nominelle Mindestbreite.
    // Das muss zusätzlich zur punktweisen 0,625-m-Erreichbarkeit geprüft werden.
    if(plan.gaenge.some(gang=>schneidet(gang,m)))add('Wege',m.id+' blockiert einen Gang');
  }
  for(let i=0;i<plan.abteilungen.length;i++)for(let j=i+1;j<plan.abteilungen.length;j++)
    if(schneidet(plan.abteilungen[i],plan.abteilungen[j]))add('Fläche','Abteilungen überlappen');
  if(new Set(plan.abteilungen.map(a=>a.id)).size!==plan.abteilungen.length)add('Fläche','doppelte Abteilungen');
  for(const g of plan.gaenge){
    const breite=Math.min(g.w,g.d);
    if(breite+EPS<(g.typ==='haupt'?R.hauptgang:R.nebengang))add('Gang','zu schmal: '+breite);
  }
  for(const v of plan.kassenVorfeld)if(plan.moebel.some(m=>schneidet(m,v)))add('Kasse','Vorfeld möbliert');
  if(!plan.moebel.some(m=>m.typ==='kasse'))add('Kasse','Kasse fehlt');
  if(wand+EPS<R.wandBelegungMin)add('Wand',Math.round(1000*wand)/10+' % statt 85 %');
  if(boeden.length>R.bodenArtenMax)add('Böden',boeden.length+' Arten');
  if(plan.profil==='outlet'&&boeden.length>2)add('Böden','FUNDUS: max. 2');
  if(akzent>R.akzentAnteilMax+EPS)add('Böden','Akzent '+(akzent*100).toFixed(1)+' %');
  if(dekoflaeche>R.dekoAnteilMax+EPS)add('Deko',(dekoflaeche*100).toFixed(1)+' %');
  if(dichte+EPS<R.moebelAnteilMin||dichte>R.moebelAnteilMax+EPS)
    add('Dichte',(dichte*100).toFixed(1)+' % statt 35–50 %');
  if(leer>R.leerflaecheMax+EPS)add('Leerfläche',leer.toFixed(2)+' m statt 6 m');
  for(const a of plan.abteilungen){
    const ins=plan.moebel.filter(m=>m.abteilung===a.id&&m.inszenierung);
    if(ins.length>R.inszenierungenJeAbteilungMax)add('Insel',a.id+': '+ins.length+' Inszenierungen');
    if(plan.profil==='outlet'&&ins.length)add('Format','FUNDUS ohne Inszenierung');
  }
  if(teile!==null&&teile>R.budgetEtage)add('Budget',teile+' Teile');
  if(teile===null)warnungen.push('Teilezahl nicht aus Geometrie gemessen');
  // Gangabstände zwischen parallelen, versetzten Gondelreihen.
  const gondeln=plan.moebel.filter(m=>m.typ==='gondel');
  for(let i=0;i<gondeln.length;i++)for(let j=i+1;j<gondeln.length;j++){
    const a=gondeln[i],b=gondeln[j];if(a.abteilung!==b.abteilung||a.winkel!==b.winkel)continue;
    const xUeber=a.x<b.x+b.w-EPS&&a.x+a.w>b.x+EPS;
    const zUeber=a.z<b.z+b.d-EPS&&a.z+a.d>b.z+EPS;
    if(a.winkel%180===0&&xUeber&&!zUeber){
      const dist=Math.max(b.z-a.z-a.d,a.z-b.z-b.d);
      if(dist>=0&&dist+EPS<R.gondelGang)add('Gondelabstand',a.abteilung+': '+dist.toFixed(2));
    } else if(a.winkel%180===90&&zUeber&&!xUeber){
      const dist=Math.max(b.x-a.x-a.w,a.x-b.x-b.w);
      if(dist>=0&&dist+EPS<R.gondelGang)add('Gondelabstand',a.abteilung+': '+dist.toFixed(2));
    }
  }
  return {fehler,warnungen,messwerte:{
    abteilungen:plan.abteilungen.length,moebel:plan.moebel.length,
    flaecheQm:flaeche,verkaufsflaecheQm:verfuegbar,dichte,
    wandbelegung:wand,groessteLeerflaecheM:leer,
    bodenarten:boeden.length,akzentanteil:akzent,dekoanteil:dekoflaeche,
    erreichbareSuchzellen:reach.anzahl,teile
  }};
}
