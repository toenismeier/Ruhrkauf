// Datenorientierter Ladenplaner. Geometrie entsteht erst in baueLadenplan().
// Koordinaten in Metern, x/z links-hinten, Eingang in der +z-Fassade.
import { rng } from './basis.js';
import { lokal, vorbereiten } from './innen.js';
import { moebel } from './moebel/index.js';
import { LADENBAU as R, ladeProfil, gangZellen, rechteckFlaeche, schneidet } from './ladenbau-regeln.js';

const U = R.raster;
const snap = n => Math.round(n/U)*U;
const down = n => Math.floor(n/U+1e-8)*U;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const num = (n,d=0) => Number.isFinite(Number(n)) ? Number(n) : d;
const quadrat = (x,z,w,d) => ({x,z,w,d});
const NORM = {sportschuhe:'sportschuhe',sporttextil:'sporttextil',outdoor:'outdoor',rad:'rad',wintersport:'wintersport',teamsport:'teamsport'};

function sortiment(a) {
  const m = new Map();
  for(let i=0;i<a.length;i++) {
    const f=a[i];
    const id = String(f.art ?? f.gruppe ?? f.id ?? f.name ?? 'abteilung_'+i).toLowerCase();
    const qm=Math.max(0,num(f.qm??f.flaecheQm??f.flaeche,0));
    if(qm<=0) continue;
    const k=NORM[id]??id;
    if(m.has(k)) m.get(k).qm+=qm;
    else m.set(k,{id:k, titel:String(f.titel??f.name??k),qm});
  }
  return [...m.values()];
}
function normiereFlaeche(f) {
  if(!f || typeof f!=='object') throw new Error('flaeche muss Außenmaße und Eingänge enthalten');
  const breite=down(num(f.breite??f.bw??f.w??f.B)), tiefe=down(num(f.tiefe??f.bd??f.d??f.T));
  if(breite<15 || tiefe<15) throw new Error('Laden für das 1,25-m-Raster zu klein');
  const es=f.eingaenge??(f.eingang?[f.eingang]:[]);
  const eingaenge=(es.length?es:[{x:breite/2,z:tiefe}]).map(p=>({
    x:clamp(snap(num(p.x,breite/2)),U,breite-U),
    z:clamp(snap(num(p.z,tiefe)),0,tiefe)
  }));
  const hindernisse=(f.hindernisse??[]).map((h,i)=>({
    id:h.id??'hindernis_'+i, typ:h.typ??'stuetze',
    x:down(num(h.x)),z:down(num(h.z)),
    w:Math.ceil(num(h.w??h.breite,U)/U)*U,
    d:Math.ceil(num(h.d??h.tiefe,U)/U)*U,
  }));
  return {breite,tiefe,eingaenge,hindernisse};
}
function hauptgangWaehlen(b,t,e,hindernisse) {
  const w=gangZellen(R.hauptgang)*U;
  const kandidaten=[];
  for(let x=2*U;x+w<=b-2*U;x+=U){
    const lauf=quadrat(x,0,w,t), v=hindernisse.reduce((s,h)=>s+(schneidet(lauf,h)?300+rechteckFlaeche(h):0),0);
    const orient=e.reduce((s,p)=>s+Math.abs(p.x-(x+w/2)),0);
    kandidaten.push({x,z:0,w,d:t,typ:'haupt',score:v+orient*0.8+Math.abs(x+w/2-b/2)});
  }
  kandidaten.sort((a,b)=>a.score-b.score||a.x-b.x);
  if(!kandidaten.length||kandidaten[0].score>=300) throw new Error('Kein hindernisfreier Hauptgang');
  const {score,...gang}=kandidaten[0];
  return gang;
}
function teilung(teile,abteile,schacht) {
  if(!teile.length) return [];
  const mind=3*U, frei=schacht.d-(teile.length-1)*2*U;
  if(frei<teile.length*mind) throw new Error('Zu viele Abteilungen für verfügbare Etagentiefe');
  const summe=teile.reduce((s,f)=>s+f.qm,0);
  const laengen=teile.map(f=>Math.max(3,Math.floor(f.qm/summe*frei/U)));
  let rest=Math.round(frei/U)-laengen.reduce((a,b)=>a+b,0);
  // Rundungsreste gehen an die größte Abteilung; bei Überschuss von kleinen abziehen.
  const groesste=teile.reduce((a,f,i)=>f.qm>teile[a].qm?i:a,0);
  if(rest>=0) laengen[groesste]+=rest;
  else for(const i of [...laengen.keys()].sort((a,b)=>laengen[b]-laengen[a])) {
    const weg=Math.min(-rest,Math.max(0,laengen[i]-3));
    laengen[i]-=weg; rest+=weg; if(rest>=0)break;
  }
  if(rest<0) throw new Error('Abteilungsflächen nicht aufteilbar');
  let z=schacht.z;const out=[];
  for(let i=0;i<teile.length;i++) {
    const f=teile[i],d=laengen[i]*U;
    out.push({...quadrat(schacht.x,z,schacht.w,d),id:f.id,titel:f.titel,qmSoll:f.qm});
    z+=d+2*U;
  }
  return out;
}
function item(id,x,z,winkel,abteilung=null,extra={}) {
  const m=moebel(id);
  if(!R.winkel.includes(winkel)) throw new Error('Ungültige Drehung: '+winkel);
  const mb=m.rasterB*U,mt=m.typ==='wand'?R.wandTiefe:m.rasterT*U;
  const gedreht=winkel===90||winkel===270;
  const w=gedreht?mt:mb,d=gedreht?mb:mt;
  return {id,typ:m.typ,x,z,w,d,winkel,abteilung,...extra};
}
function passe(m,f,verbote,luft=0) {
  return m.x>=-1e-8&&m.z>=-1e-8&&m.x+m.w<=f.breite+1e-8&&m.z+m.d<=f.tiefe+1e-8 &&
    !verbote.some(g=>schneidet(m,g,luft));
}
function passeIn(m,raum) {
  return m.x>=raum.x-1e-8&&m.z>=raum.z-1e-8&&m.x+m.w<=raum.x+raum.w+1e-8&&m.z+m.d<=raum.z+raum.d+1e-8;
}
function wandband(plan,profil) {
  const moebel=plan.moebel, rand=plan.hindernisse;
  const halb=profil.id==='sport'?'sport_schuh_halb':profil.id==='schwester'?'alt_holz_wand_halb':null;
  // Rückwand: 5-m-Module, wenn möglich ein letztes 2,5-m-Stück.
  for(let x=0;x+2.5<=plan.breite-1e-8;) {
    const rest=plan.breite-x, id=rest>=5?profil.wand:halb;
    if(!id){x+=2.5;continue;}
    const m=item(id,x,0,0,null,{band:'rueck',schildband:true});
    if(passe(m,plan,rand)) moebel.push(m);
    x+=m.w;
  }
  // Westwand: 90°; am gemeinsamen Winkel bleibt ein Abstand von 1,25 m.
  for(let z=U;z+2.5<=plan.tiefe-1e-8;) {
    const rest=plan.tiefe-z,id=rest>=5?profil.wand:halb;
    if(!id){z+=2.5;continue;}
    const m=item(id,0,z,90,null,{band:'west',schildband:true});
    if(passe(m,plan,rand)&&!moebel.some(w=>schneidet(w,m)))moebel.push(m);
    z+=m.d;
  }
}
function warenReihen(plan,profil,raum) {
  const art=profil.abteilungsMoebel[raum.id]??{};
  const id=art.gondel??profil.gondel,m=moebel(id);
  // Keine diagonalen oder zufälligen Inselstellungen.
  const laenge=m.rasterB*U,t=m.rasterT*U, gang=gangZellen(R.gondelGang)*U;
  const seitenLuft=raum.x<U*2?2*U:U;
  const startX=raum.x+seitenLuft;
  const endeX=raum.x+raum.w-(raum.x+raum.w>plan.breite-U?U:gang);
  for(let z=raum.z+gang; z+t+gang<=raum.z+raum.d+1e-8;z+=t+gang){
    for(let x=startX;x+laenge<=endeX+1e-8;x+=laenge){
      const g=item(id,x,z,0,raum.id);
      if(!passeIn(g,raum)||!passe(g,plan,[...plan.hindernisse,...plan.gaenge,...plan.moebel],0))continue;
      plan.moebel.push(g);
    }
  }
}
function kassenPlatz(plan,profil) {
  const id=profil.kasse,m=moebel(id),w=m.rasterB*U,d=m.rasterT*U;
  const main=plan.gaenge[0],xRechts=main.x+main.w+gangZellen(R.kassenVorfeld)*U;
  const xLinks=main.x-w-gangZellen(R.kassenVorfeld)*U;
  const xK=xRechts+w<=plan.breite-U?xRechts:xLinks;
  const zK=plan.tiefe-d-3*U;
  const mK=item(id,xK,zK,0,null,{amAusgang:true});
  const wR=quadrat(xK,zK+d,w,2*U);
  if(!passe(mK,plan,[...plan.hindernisse,...plan.gaenge,...plan.moebel])||
     !passe(wR,plan,[...plan.hindernisse,...plan.gaenge,...plan.moebel]))
    return; // Prüfung meldet fehlende Kasse; keine Scheinplatzierung über Hindernisse.
  plan.kassenVorfeld.push(wR);plan.moebel.push(mK);
}
function inszenierung(plan,profil,raum) {
  if(!profil.inszenierung)return;
  const a=profil.abteilungsMoebel[raum.id]??{};
  if(!a.insel)return;
  const m=moebel(a.insel),w=m.rasterB*U,d=m.rasterT*U;
  const xs=[raum.x+U,raum.x+raum.w-w-U],zs=[raum.z+U,raum.z+raum.d-d-U];
  for(const z of zs)for(const x of xs) {
    const i=item(a.insel,x,z,0,raum.id,{inszenierung:true});
    if(passeIn(i,raum)&&passe(i,plan,[...plan.hindernisse,...plan.gaenge,...plan.moebel,...plan.kassenVorfeld],0)) {
      plan.moebel.push(i);return;
    }
  }
}
/**
 * @param {object} flaeche Außenmaß, Eingänge, Hindernisse (Meter)
 * @param {'sport'|'outlet'|'schwester'|object} profil Formatprofil
 * @param {object[]} abteilungen Flächen aus haus.flaechen / Outlet-Pool, mit gruppe/art/id und qm
 * @param {number|string} seed Seed für deterministische Möbelgeometrie
 */
export function ladenplan(flaeche, profil, abteilungen, seed=1) {
  const p=ladeProfil(profil),a=sortiment(abteilungen??[]),f=normiereFlaeche(flaeche);
  if(!a.length)throw new Error('Ladenplan braucht Abteilungsflächen');
  const haupt=hauptgangWaehlen(f.breite,f.tiefe,f.eingaenge,f.hindernisse);
  const plan={version:1,profil:p.id,seed,breite:f.breite,tiefe:f.tiefe,
    eingaenge:f.eingaenge,hindernisse:f.hindernisse,gaenge:[haupt],
    abteilungen:[],moebel:[],kassenVorfeld:[],boeden:[],
    wandOeffnungen:[],hinweise:[]};
  // Vom Eingang zum Hauptgang ein rechtwinkliges, breit genuges Frontstück.
  for(const e of f.eingaenge)if(e.x<haupt.x||e.x>haupt.x+haupt.w) {
    const x=Math.min(e.x,haupt.x),x2=Math.max(e.x,haupt.x+haupt.w),d=haupt.w;
    plan.gaenge.push({...quadrat(x,plan.tiefe-d,x2-x,d),typ:'haupt'});
  }
  kassenPlatz(plan,p);
  wandband(plan,p);
  // Flächen links und rechts des Hauptgangs mit reservierter Hinterwandzone.
  const links=quadrat(U,U,haupt.x-U,plan.tiefe-2*U);
  const rechts=quadrat(haupt.x+haupt.w,U,plan.breite-haupt.x-haupt.w-U,plan.tiefe-2*U);
  const l=[],r=[];let ql=0,qr=0;
  for(const z of [...a].sort((u,v)=>v.qm-u.qm||u.id.localeCompare(v.id,'de'))) {
    if((ql/Math.max(U,links.w))<=(qr/Math.max(U,rechts.w))){l.push(z);ql+=z.qm;}
    else {r.push(z);qr+=z.qm;}
  }
  plan.abteilungen.push(...teilung(l,a,links),...teilung(r,a,rechts));
  // Nebengänge als 2,5-m-Verbindungen zwischen den Abteilungsrechtecken.
  for(const [zone,grp] of [[links,l],[rechts,r]]) {
    if(zone.w<=0)continue;
    const rs=plan.abteilungen.filter(x=>x.x===zone.x);
    for(let j=0;j<rs.length-1;j++) {
      const x=rs[j],z=x.z+x.d;
      plan.gaenge.push({...quadrat(zone.x,z,zone.w,2*U),typ:'neben'});
    }
  }
  for(const raum of plan.abteilungen)warenReihen(plan,p,raum);
  for(const raum of plan.abteilungen)inszenierung(plan,p,raum);
  // Die Bodentypen sind definitionsgemäß etagenweit, nie je Sortiment.
  plan.boeden.push({...quadrat(0,0,plan.breite,plan.tiefe),typ:'flaeche',farbe:p.boden.flaeche});
  for(const g of plan.gaenge)plan.boeden.push({...g,typ:'gang',farbe:p.boden.gang});
  for(const i of plan.moebel.filter(m=>m.inszenierung).slice(0,Math.floor(plan.breite*plan.tiefe*R.akzentAnteilMax/(2.5*2.5))))
    if(p.boden.akzent)plan.boeden.push({...quadrat(i.x,i.z,i.w,i.d),typ:'akzent',farbe:p.boden.akzent,unter:i.id});
  return plan;
}
/** Umsetzung der Plan-Daten in die bestehende Three.js-Sammler-API. */
export function baueLadenplan(S,scene,plan,o={}) {
  const p=ladeProfil(plan.profil),y=o.y??0,dichte=o.dichte??1;
  if(o.vorbereiten!==false)vorbereiten(S,scene);
  const n0=S.anzahl;
  // Flächen zuerst, die Gangflächen zuletzt darüber; keine neuen Bodenarten je Abteilung.
  for(const b of plan.boeden) {
    const hoehe=b.typ==='gang'?0.038:b.typ==='akzent'?0.045:0.03;
    S.box(b.w,hoehe,b.d,b.x+b.w/2,y-hoehe/2+(b.typ==='gang'?0.01:b.typ==='akzent'?0.016:0),b.z+b.d/2,b.farbe);
  }
  for(let j=0;j<plan.moebel.length;j++){
    const m=plan.moebel[j],def=moebel(m.id),w=def.rasterB*U;
    const winkel=m.winkel*Math.PI/180;
    const ox=m.winkel===90?m.x:m.winkel===270?m.x+m.w:m.x+w/2;
    const oz=m.winkel===90?m.z+m.d/2:m.winkel===180?m.z+m.d:m.z;
    def.bau(lokal(S,ox,y,oz,winkel),rng(String(plan.seed)+':'+j+':'+m.id),dichte,
      {seed:String(plan.seed)+':'+j,bestueckung:o.bestueckung??1,profil:p.id});
  }
  return {teile:S.anzahl-n0,moebel:plan.moebel.length,abteilungen:plan.abteilungen.length};
}
