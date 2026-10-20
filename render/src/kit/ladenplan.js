// Datenorientierter Ladenplaner. Geometrie entsteht erst in baueLadenplan().
// Koordinaten in Metern, x/z links-hinten, Eingang in der +z-Fassade.
import { rng } from './basis.js';
import { lokal, vorbereiten, haengeschild } from './innen.js';
import { SPORT_BOEDEN, SPORT_SCHILDER, SPORT_NAMEN } from './sportabteilung.js';
import { SPORT_MIX_PROFILE, SPORT_MIX_WAENDE } from './moebel/sport-mix.js';
import { moebel } from './moebel/index.js';
import { LADENBAU as R, ladeProfil, gangZellen, rechteckFlaeche, schneidet } from './ladenbau-regeln.js';

const U = R.raster;
const snap = n => Math.round(n/U)*U;
const down = n => Math.floor(n/U+1e-8)*U;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const num = (n,d=0) => Number.isFinite(Number(n)) ? Number(n) : d;
const quadrat = (x,z,w,d) => ({x,z,w,d});
const NORM = {sportschuhe:'sportschuhe',sporttextil:'sporttextil',outdoor:'outdoor',rad:'rad',fahrrad:'rad',fitness:'fitness',wintersport:'wintersport',teamsport:'teamsport',ballsport:'teamsport'};

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
  // Das rückwärtige Treppen-/Lagerraster darf den Hauptgang nicht blockieren.
  // Der Lauf endet hinter diesem Funktionsband, bleibt aber bis zum Eingang durchgehend.
  const maxRueckversatz=Math.min(10*U,t-8*U);
  // Hinter dem rückwärtigen Wandband mindestens 1,9 m nutzbare Tiefe lassen.
  // Sonst durchstößt der Hauptgang die Verkaufswand, obwohl sie im Plan als belegt gilt.
  for(let z=2*U;z<=maxRueckversatz+1e-8;z+=U)
    for(let x=2*U;x+w<=b-2*U;x+=U) {
      const lauf=quadrat(x,z,w,t-z);
      if(hindernisse.some(h=>schneidet(lauf,h)))continue;
      const dist=e.reduce((s,p)=>s+Math.abs(p.x-(x+w/2)),0);
      kandidaten.push({...lauf,typ:'haupt',score:z*0.3+dist*0.8+Math.abs(x+w/2-b/2)});
    }
  kandidaten.sort((a,b)=>a.score-b.score||a.z-b.z||a.x-b.x);
  if(!kandidaten.length)throw new Error('Kein hindernisfreier Hauptgang');
  const {score,...gang}=kandidaten[0];
  return gang;
}
function teilung(teile,abteile,schacht) {
  if(!teile.length)return [];
  // Ein durchgehender Nebengang statt eines Gangs zwischen *jeder* Abteilung.
  // Alle Rechtecke besitzen ohnehin einen Anschluss zum Hauptgang.
  const gangIndex=teile.length>1?Math.floor((teile.length-1)/2):-1;
  const verfuegbar=schacht.d-(gangIndex>=0?2*U:0);
  // Auch kleine Sortimente benötigen zwei Möbelreihen für mindestens vier Präsentationsarten.
  const minZellen=Math.max(3,Math.min(7,Math.floor(verfuegbar/U/teile.length)));
  if(verfuegbar<teile.length*minZellen*U)throw new Error('Zu viele Abteilungen für Etagentiefe');
  const summe=teile.reduce((s,f)=>s+f.qm,0);
  const laengen=teile.map(f=>Math.max(minZellen,Math.floor(f.qm/summe*verfuegbar/U)));
  let rest=Math.round(verfuegbar/U)-laengen.reduce((a,b)=>a+b,0);
  const groesste=teile.reduce((a,f,i)=>f.qm>teile[a].qm?i:a,0);
  if(rest>=0)laengen[groesste]+=rest;
  else for(const i of [...laengen.keys()].sort((a,b)=>laengen[b]-laengen[a])){
    const weg=Math.min(-rest,Math.max(0,laengen[i]-minZellen));
    laengen[i]-=weg;rest+=weg;if(rest>=0)break;
  }
  if(rest<0)throw new Error('Abteilungen nicht aufteilbar');
  let z=schacht.z;const out=[];
  for(let i=0;i<teile.length;i++){
    const f=teile[i],d=laengen[i]*U;
    out.push({...quadrat(schacht.x,z,schacht.w,d),id:f.id,titel:f.titel,qmSoll:f.qm});
    z+=d+(i===gangIndex?2*U:0);
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
// Der Sortimentsschlüssel bestimmt die Präsentation; Fremdformate bleiben unverändert.
function sportMixId(plan,raum,breite) {
  const pool=SPORT_MIX_PROFILE[raum.id]?.[breite]??SPORT_MIX_PROFILE.sporttextil[breite];
  const index=plan.mixIndex[raum.id]??0;
  return pool[index%pool.length];
}
function mixGebaut(plan,raum) {plan.mixIndex[raum.id]=(plan.mixIndex[raum.id]??0)+1;}
function wandband(plan,profil) {
  const ziel=plan.moebel,verbote=[...plan.hindernisse,...plan.gaenge,...plan.kassenVorfeld,...plan.moebel];
  const halb=profil.id==='sport'?'sport_schuh_halb':profil.id==='schwester'?'alt_holz_wand_halb':null;
  const moduleFuer=(raum)=>[profil.id==='sport'&&raum?profil.abteilungsMoebel[raum.id]?.wand:profil.wand,halb].filter(Boolean);
  // Wandmodule werden dem angrenzenden Sortimentsrechteck zugeordnet.
  for(let x=0;x+2.5<=plan.breite+1e-8;) {
    const raum=plan.abteilungen.find(a=>a.z<=U+1e-8&&x+1.25>=a.x&&x+1.25<=a.x+a.w);
    let gesetzt=false;
    for(const id of moduleFuer(raum)) {
      const m=item(id,x,0,0,raum?.id??null,{band:'rueck',schildband:true});
      if(x+m.w<=plan.breite+1e-8&&passe(m,plan,verbote)) {
        ziel.push(m);x+=m.w;gesetzt=true;break;
      }
    }
    if(!gesetzt)x+=2.5;
  }
  for(let z=U;z+2.5<=plan.tiefe+1e-8;) {
    const raum=plan.abteilungen.find(a=>a.x<=U+1e-8&&z+1.25>=a.z&&z+1.25<=a.z+a.d);
    let gesetzt=false;
    for(const id of moduleFuer(raum)) {
      const m=item(id,0,z,90,raum?.id??null,{band:'west',schildband:true});
      if(z+m.d<=plan.tiefe+1e-8&&passe(m,plan,verbote)&&!ziel.some(w=>schneidet(w,m))) {
        ziel.push(m);z+=m.d;gesetzt=true;break;
      }
    }
    if(!gesetzt)z+=U;
  }
}
function warenReihen(plan,profil,raum) {
  const art=profil.abteilungsMoebel[raum.id]??{};
  const idHaupt=art.gondel??profil.gondel;
  const kurz=profil.id==='sport'?'gondel_schuhe':profil.id==='outlet'?'outlet_beauty':'gondel_spielzeug';
  const module=profil.id==='sport'
    ? [{breite:4},{breite:2}]
    : [idHaupt,kurz].filter((id,i,a)=>a.indexOf(id)===i)
      .sort((a,b)=>moebel(b).rasterB-moebel(a).rasterB).map(id=>({id,breite:moebel(id).rasterB}));
  const startX=raum.x+0.625,endeX=raum.x+raum.w-0.625;
  const gang=Math.ceil(R.gondelGang/R.suchRaster)*R.suchRaster;
  const bankTiefe=2*U,schritt=bankTiefe+gang;
  for(let z=raum.z+0.625;z+bankTiefe+0.625<=raum.z+raum.d+1e-8;z+=schritt) {
    let x=startX;
    while(x+2.5<=endeX+1e-8) {
      let platziert=false;
      for(const gruppe of module) {
        const w=gruppe.breite*U;
        if(x+w>endeX+1e-8)continue;
        const modelle=[0,1].map(j=>{
          const id=profil.id==='sport'
            ? (SPORT_MIX_PROFILE[raum.id]??SPORT_MIX_PROFILE.sporttextil)[gruppe.breite][((plan.mixIndex[raum.id]??0)+j)%6]
            : gruppe.id;
          const m=item(id,x,z+j*U,j?180:0,raum.id,{reihenGruppe:Math.round(z/U)});
          if(profil.id==='sport')m.moebelart=id.slice(0,id.lastIndexOf('_'));
          return m;
        });
        const frei=modelle.map(m=>passeIn(m,raum)&&passe(m,plan,
          [...plan.hindernisse,...plan.gaenge,...plan.moebel,...plan.kassenVorfeld]));
        if(!frei[0]&&!frei[1])continue;
        for(let j=0;j<2;j++)if(frei[j] &&
          !plan.moebel.some(q=>schneidet(q,modelle[j]))){
          plan.moebel.push(modelle[j]);
          if(profil.id==='sport')mixGebaut(plan,raum);
        }
        x+=w;platziert=true;break;
      }
      if(!platziert)x+=U;
    }
  }
}
function kassenPlatz(plan,profil) {
  const id=profil.kasse,def=moebel(id),w=def.rasterB*U,d=def.rasterT*U;
  const main=plan.gaenge[0],vorfeld=gangZellen(R.kassenVorfeld)*U;
  const xs=[main.x+main.w+U,main.x-w-U,main.x+main.w+2*U,main.x-w-2*U];
  // Erst Eingangsnähe, danach sämtliche zulässigen Seitenspuren absuchen.
  // Sonst kann bei fest eingebauter Sport-Inszenierung die einzige Kasse fehlen.
  for(let x=U;x+w<=plan.breite-U;x+=U)xs.push(x);
  const stellen=[...new Set(xs)].filter(x=>x>=U&&x+w<=plan.breite-U);
  for(let z=plan.tiefe-d-3*U;z>=U;z-=U)
    for(const x of stellen){
      const k=item(id,x,z,0,null,{amAusgang:true});
      const frei=quadrat(x,z+d,w,vorfeld);
      const verbote=[...plan.hindernisse,...plan.gaenge,...plan.moebel];
      if(passe(k,plan,verbote)&&passe(frei,plan,verbote)){
        plan.kassenVorfeld.push(frei);plan.moebel.push(k);return;
      }
    }
  plan.hinweise.push('Kasse wegen Hindernissen nicht platzierbar');
}
function inszenierung(plan,profil,raum) {
  if(!profil.inszenierung)return;
  const art=profil.abteilungsMoebel[raum.id]??{};
  if(!art.insel)return;
  const varianten=[art.insel];
  if(profil.id==='sport'&&raum.id==='outdoor'&&art.insel==='sport_insel_zelt')
    varianten.push('sport_insel_zelt_klein');
  // Große Themenbühne bevorzugen, bei knappen Randflächen in dasselbe
  // 1,25-m-Raster auf eine kompakte, aber sortimentsbezogene Bühne ausweichen.
  for(const id of varianten) {
    const def=moebel(id),w=def.rasterB*U,d=def.rasterT*U;
    const xs=[raum.x+U,raum.x+raum.w-w-U],zs=[raum.z+U,raum.z+raum.d-d-U];
    for(let z=raum.z;z+d<=raum.z+raum.d+1e-8;z+=U)zs.push(z);
    for(let x=raum.x;x+w<=raum.x+raum.w+1e-8;x+=U)xs.push(x);
    for(const z of new Set(zs))for(const x of new Set(xs)) {
      const i=item(id,x,z,0,raum.id,{inszenierung:true});
      if(passeIn(i,raum)&&passe(i,plan,
        [...plan.hindernisse,...plan.gaenge,...plan.moebel,...plan.kassenVorfeld],0)){
        plan.moebel.push(i);return;
      }
    }
  }
}

// Sportbekleidung benötigt echte Rundständer und Puppengruppen, nicht nur
// generisch durchrotierte Tische. Die Stellflächen bleiben unverändert.
function sichereSportBekleidung(plan) {
  if(plan.profil!=='sport')return;
  for(const raum of plan.abteilungen.filter(a=>a.id==='sporttextil')) {
    const ms=plan.moebel.filter(m=>m.abteilung===raum.id &&
      m.id.startsWith('sport_mix_sporttextil_')&&!m.inszenierung);
    for(const art of ['rundstaender','puppen']) {
      if(ms.some(m=>m.id.includes('_'+art+'_')))continue;
      const platz=ms.find(m=>!/_(rundstaender|puppen)_/.test(m.id));
      if(!platz)continue;
      const rasterB=moebel(platz.id).rasterB;
      const id='sport_mix_sporttextil_'+art+'_'+rasterB;
      // Gleicher Footprint und gleiche Höhe wie das ersetzte Möbel.
      moebel(id);
      platz.id=id;platz.moebelart=id.slice(0,id.lastIndexOf('_'));
    }
  }
}
function belegteOutletFlaeche(plan) {
  const r=R.suchRaster,nx=Math.round(plan.breite/r),nz=Math.round(plan.tiefe/r);
  const raster=new Uint8Array(nx*nz);
  for(const m of plan.moebel) {
    const x0=Math.max(0,Math.floor((m.x+1e-8)/r)),x1=Math.min(nx,Math.ceil((m.x+m.w-1e-8)/r));
    const z0=Math.max(0,Math.floor((m.z+1e-8)/r)),z1=Math.min(nz,Math.ceil((m.z+m.d-1e-8)/r));
    for(let z=z0;z<z1;z++)for(let x=x0;x<x1;x++)raster[z*nx+x]=1;
  }
  return raster.reduce((n,v)=>n+v,0)*r*r;
}
function verdichteOutlet(plan) {
  if(plan.profil!=='outlet')return;
  const flaeche=plan.breite*plan.tiefe-
    plan.hindernisse.reduce((s,h)=>s+rechteckFlaeche(h),0);
  // Dichte auf dem Suchraster (Flächenunion), nicht die aufsummierten
  // Möbel-Footprints. An Stoßkanten kann es Überdeckungen geben.
  for(let i=plan.moebel.length-1;i>=0&&belegteOutletFlaeche(plan)>0.485*flaeche;i--) {
    if(plan.moebel[i].id==='outlet_doppelstange')plan.moebel.splice(i,1);
  }
  const varianten=['outlet_rundstaender','outlet_beauty'];
  for(let n=0;n<85;n++) {
    const frei=schwerpunkte(plan),gross=frei[0]?.size??0;
    if(gross<=R.leerflaecheMax&&belegteOutletFlaeche(plan)>=0.36*flaeche)break;
    let gesetzt=false;
    for(const f of frei) {
      if(f.size<Math.min(gross,3.125))break;
      for(const id of varianten) {
        const def=moebel(id),w=def.rasterB*U,d=def.rasterT*U;
        if(belegteOutletFlaeche(plan)+w*d>0.49*flaeche)continue;
        const z0=Math.ceil((f.z-1e-8)/U)*U,x0=Math.ceil((f.x-1e-8)/U)*U;
        for(let z=z0;z+d<=f.z+f.size+1e-8&&!gesetzt;z+=U)
          for(let x=x0;x+w<=f.x+f.size+1e-8&&!gesetzt;x+=U) {
            const raum=plan.abteilungen.find(a=>x>=a.x-1e-8&&z>=a.z-1e-8&&
              x+w<=a.x+a.w+1e-8&&z+d<=a.z+a.d+1e-8);
            if(!raum)continue;
            const m=item(id,x,z,0,raum.id,{ausgleich:true});
            if(!passeIn(m,raum)||!passe(m,plan,
              [...plan.hindernisse,...plan.gaenge,...plan.moebel,...plan.kassenVorfeld]))continue;
            if(m.typ==='gondel'&&plan.moebel.some(q=>{
              if(q.typ!=='gondel'||q.abteilung!==m.abteilung||q.winkel!==m.winkel)return false;
              const xO=m.x<q.x+q.w-1e-8&&m.x+m.w>q.x+1e-8;
              const zO=m.z<q.z+q.d-1e-8&&m.z+m.d>q.z+1e-8;
              const dist=m.winkel%180===0?
                Math.max(q.z-m.z-m.d,m.z-q.z-q.d):
                Math.max(q.x-m.x-m.w,m.x-q.x-q.w);
              return (m.winkel%180===0?xO:zO)&&dist>=0&&dist<R.gondelGang-1e-8;
            }))continue;
            plan.moebel.push(m);gesetzt=true;
          }
        if(gesetzt)break;
      }
      if(gesetzt)break;
    }
    if(!gesetzt)break;
  }
}
function schwerpunkte(plan) {
  const r=R.suchRaster,nx=Math.round(plan.breite/r),nz=Math.round(plan.tiefe/r);
  const block=new Uint8Array(nx*nz),prev=new Int16Array(nx+1),jetzt=new Int16Array(nx+1);
  for(const m of [...plan.hindernisse,...plan.moebel,
    ...(plan.profil==='outlet'?plan.gaenge:[])]) {
    const x0=Math.max(0,Math.floor((m.x+1e-8)/r)),x1=Math.min(nx,Math.ceil((m.x+m.w-1e-8)/r));
    const z0=Math.max(0,Math.floor((m.z+1e-8)/r)),z1=Math.min(nz,Math.ceil((m.z+m.d-1e-8)/r));
    for(let z=z0;z<z1;z++)for(let x=x0;x<x1;x++)block[z*nx+x]=1;
  }
  const felder=[];
  for(let z=1;z<=nz;z++){
    for(let x=1;x<=nx;x++)if(!block[(z-1)*nx+x-1]){
      jetzt[x]=1+Math.min(jetzt[x-1],prev[x],prev[x-1]);
      if(jetzt[x]>=6)felder.push({x:(x-jetzt[x])*r,z:(z-jetzt[x])*r,size:jetzt[x]*r});
    }
    prev.set(jetzt);jetzt.fill(0);
  }
  felder.sort((a,b)=>b.size-a.size||a.z-b.z||a.x-b.x);
  return felder;
}
// Dezente Neuheiten-Inseln nur an einem Reihenende oder neben dem Kundenlauf;
// sie schließen verbliebene Freiflächen, ohne die Gondelachsen aufzulösen.
function verdichteLadenplan(plan,profil){
  if(!profil.insel)return;
  const kurz=profil.id==='sport'?null:'gondel_spielzeug';
  const varianten=[{id:profil.insel,winkel:0,gruppe:'insel'},
    {id:kurz,winkel:90,gruppe:'kopf'},{id:kurz,winkel:0,gruppe:'kopf'}];
  const zaehler=new Map();
  const verfuegbar=plan.breite*plan.tiefe-
    plan.hindernisse.reduce((s,h)=>s+rechteckFlaeche(h),0);
  let besetzt=plan.moebel.reduce((s,m)=>s+rechteckFlaeche(m),0);
  for(let durchlauf=0;durchlauf<110;durchlauf++){
    const felder=schwerpunkte(plan),gross=felder[0]?.size??0;
    if(gross<=R.leerflaecheMax&&besetzt>=R.moebelAnteilMin*verfuegbar)break;
    let eingefuegt=false;
    for(const f of felder){
      if(f.size<(gross>R.leerflaecheMax?5:2.5))break;
      for(const art of varianten){
        const id=art.id??sportMixId(plan,plan.abteilungen.find(a=>f.x>=a.x&&f.z>=a.z&&f.x<a.x+a.w&&f.z<a.z+a.d)??plan.abteilungen[0],2);
        const def=moebel(id),gedreht=art.winkel===90;
        const w=(gedreht?def.rasterT:def.rasterB)*U;
        const d=(gedreht?def.rasterB:def.rasterT)*U;
        if(besetzt+w*d>0.49*verfuegbar)continue;
        const x0=Math.ceil((f.x-1e-8)/U)*U,z0=Math.ceil((f.z-1e-8)/U)*U;
        for(let z=z0;z+d<=f.z+f.size+1e-8&&!eingefuegt;z+=U)
          for(let x=x0;x+w<=f.x+f.size+1e-8&&!eingefuegt;x+=U){
            const raum=plan.abteilungen.find(r=>x>=r.x&&z>=r.z&&x+w<=r.x+r.w&&z+d<=r.z+r.d);
            if(!raum)continue;
            const key=raum.id+':'+art.gruppe;
            if((zaehler.get(key)||0)>=(art.gruppe==='insel'?6:12))continue;
            const moebelId=profil.id==='sport'&&art.gruppe==='kopf'?sportMixId(plan,raum,2):id;
            const m=item(moebelId,x,z,art.winkel,raum.id,{ausgleich:true,kopf:art.gruppe==='kopf'});
            if(profil.id==='sport'&&art.gruppe==='kopf')m.moebelart=moebelId.slice(0,moebelId.lastIndexOf('_'));
            if(!passeIn(m,raum)||!passe(m,plan,
              [...plan.hindernisse,...plan.gaenge,...plan.moebel,...plan.kassenVorfeld]))continue;
            const nah=plan.moebel.some(q=>q.typ==='gondel'&&q.abteilung===raum.id&&
              Math.hypot(Math.max(0,q.x-x-w,x-q.x-q.w),
                         Math.max(0,q.z-z-d,z-q.z-q.d))<=3*U);
            const gangNah=plan.gaenge.some(g=>schneidet(m,g,2*U));
            if(!nah&&!gangNah)continue;
            if(m.typ==='gondel'&&plan.moebel.some(q=>{
              if(q.typ!=='gondel'||q.abteilung!==raum.id||q.winkel!==m.winkel)return false;
              const xO=m.x<q.x+q.w-1e-8&&m.x+m.w>q.x+1e-8;
              const zO=m.z<q.z+q.d-1e-8&&m.z+m.d>q.z+1e-8;
              const dist=m.winkel%180===0?
                Math.max(q.z-m.z-m.d,m.z-q.z-q.d):
                Math.max(q.x-m.x-m.w,m.x-q.x-q.w);
              return (m.winkel%180===0?xO:zO)&&dist>=0&&dist<R.gondelGang-1e-8;
            }))continue;
            plan.moebel.push(m);if(profil.id==='sport'&&art.gruppe==='kopf')mixGebaut(plan,raum);
            zaehler.set(key,(zaehler.get(key)||0)+1);
            besetzt+=w*d;eingefuegt=true;
          }
        if(eingefuegt)break;
      }
      if(eingefuegt)break;
    }
    if(!eingefuegt)break;
  }
  // Wenn die größte freie Prüffläche im breiten Hauptgang liegt,
  // verbleibende Möbeldichte an bestehenden Gondelreihen ergänzen.
  if(besetzt<R.moebelAnteilMin*verfuegbar){
    const def=moebel(profil.id==='sport'?SPORT_MIX_PROFILE.sporttextil[2][0]:kurz);
    for(const raum of plan.abteilungen){
      for(let z=raum.z;z+def.rasterT*U<=raum.z+raum.d+1e-8;z+=U)
        for(let x=raum.x;x+def.rasterB*U<=raum.x+raum.w+1e-8;x+=U){
          if(besetzt>=R.moebelAnteilMin*verfuegbar)break;
          const id=profil.id==='sport'?sportMixId(plan,raum,2):kurz;
          const m=item(id,x,z,0,raum.id,{ausgleich:true,kopf:true});
          if(profil.id==='sport')m.moebelart=id.slice(0,id.lastIndexOf('_'));
          if(!passeIn(m,raum)||!passe(m,plan,
            [...plan.hindernisse,...plan.gaenge,...plan.moebel,...plan.kassenVorfeld]))continue;
          const nahe=plan.moebel.some(q=>q.typ==='gondel'&&q.abteilung===raum.id&&
            Math.hypot(Math.max(0,q.x-x-m.w,x-q.x-q.w),
                       Math.max(0,q.z-z-m.d,z-q.z-q.d))<=3*U);
          if(!nahe)continue;
          const zuEng=plan.moebel.some(q=>{
            if(q.typ!=='gondel'||q.abteilung!==raum.id||q.winkel!==0)return false;
            const xO=m.x<q.x+q.w-1e-8&&m.x+m.w>q.x+1e-8;
            const dist=Math.max(q.z-m.z-m.d,m.z-q.z-q.d);
            return xO&&dist>=0&&dist<R.gondelGang-1e-8;
          });
          if(zuEng)continue;
          plan.moebel.push(m);if(profil.id==='sport')mixGebaut(plan,raum);
          besetzt+=m.w*m.d;
        }
    }
  }
}

// Randabteilungen erhalten Ergänzungswände nur, wenn die Stellreihen weniger
// als vier Präsentationsarten bieten oder ein Typ mehr als 40 % ausmacht.
function sichereSportMix(plan) {
  if(plan.profil!=='sport')return;
  const verbote=()=>[...plan.hindernisse,...plan.gaenge,...plan.moebel,...plan.kassenVorfeld];
  for(const raum of plan.abteilungen){
    const passend=()=>plan.moebel.filter(m=>m.abteilung===raum.id);
    const gueltig=()=>{
      const ms=passend(),t=new Map();
      for(const m of ms){const art=m.moebelart??m.id;t.set(art,(t.get(art)??0)+1);}
      return t.size>=4 && [...t.values()].every(n=>n<=0.4*ms.length+1e-8);
    };
    if(gueltig())continue;
    const ids=SPORT_MIX_WAENDE[raum.id]??SPORT_MIX_WAENDE.sporttextil;
    const kandidaten=[];
    for(let z=raum.z;z+2.5<=raum.z+raum.d+1e-8;z+=U)
      for(const x of [raum.x,raum.x+raum.w-R.wandTiefe])
        kandidaten.push({x,z,winkel:90});
    for(let x=raum.x;x+2.5<=raum.x+raum.w+1e-8;x+=U)
      for(const z of [raum.z,raum.z+raum.d-R.wandTiefe])
        kandidaten.push({x,z,winkel:0});
    let gesetzt=0;
    for(const k of kandidaten){
      if(gueltig()||gesetzt>=8)break;
      const id=ids[gesetzt%ids.length];
      const m=item(id,k.x,k.z,k.winkel,raum.id,{innenwand:true,moebelart:id});
      if(!passeIn(m,raum)||!passe(m,plan,verbote()))continue;
      plan.moebel.push(m);gesetzt++;
    }
    if(!gueltig())plan.hinweise.push('Sortimentsmix nicht erreichbar: '+raum.id);
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
    wandOeffnungen:[],hinweise:[],mixIndex:{}};
  // Vom Eingang zum Hauptgang ein rechtwinkliges, breit genuges Frontstück.
  for(const e of f.eingaenge)if(e.x<haupt.x||e.x>haupt.x+haupt.w) {
    const x=Math.min(e.x,haupt.x),x2=Math.max(e.x,haupt.x+haupt.w),d=haupt.w;
    plan.gaenge.push({...quadrat(x,plan.tiefe-d,x2-x,d),typ:'haupt'});
  }
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
      if(rs[j+1].z>z+1e-8) {
        const quer={...quadrat(zone.x,z,zone.w,rs[j+1].z-z),typ:'neben'};
        if(!plan.hindernisse.some(h=>schneidet(h,quer)))plan.gaenge.push(quer);
      }
    }
  }
  // Erst die vollständige Erschließung, dann Kasse und Wandband setzen:
  // nachträglich erzeugte Quergänge dürfen keine bereits gebauten Möbel überfahren.
  kassenPlatz(plan,p);
  wandband(plan,p);
  // Markeninszenierungen zuerst freihalten, bevor die Präsentationsreihen entstehen.
  for(const raum of plan.abteilungen)inszenierung(plan,p,raum);
  for(const raum of plan.abteilungen)warenReihen(plan,p,raum);
  verdichteLadenplan(plan,p);
  sichereSportMix(plan);
  sichereSportBekleidung(plan);
  verdichteOutlet(plan);
  // Farbige Abteilungsrechtecke unter dem Gangbelag erhalten die Sporthaus-Identität.
  plan.boeden.push({...quadrat(0,0,plan.breite,plan.tiefe),typ:'flaeche',farbe:p.boden.flaeche});
  if(p.id==='sport')for(const a of plan.abteilungen)
    plan.boeden.push({...quadrat(a.x,a.z,a.w,a.d),typ:'flaeche',abteilung:a.id,farbe:SPORT_BOEDEN[a.id]??p.boden.flaeche});
  for(const g of plan.gaenge)plan.boeden.push({...g,typ:'gang',farbe:p.boden.gang});
  for(const i of plan.moebel.filter(m=>m.inszenierung).slice(0,Math.floor(plan.breite*plan.tiefe*R.akzentAnteilMax/(2.5*2.5))))
    if(p.boden.akzent)plan.boeden.push({...quadrat(i.x,i.z,i.w,i.d),typ:'akzent',farbe:p.boden.akzent,unter:i.id});
  delete plan.mixIndex;
  return plan;
}
/** Umsetzung der Plan-Daten in die bestehende Three.js-Sammler-API. */
export function baueLadenplan(S,scene,plan,o={}) {
  const p=ladeProfil(plan.profil),y=o.y??0,dichte=o.dichte??1;
  const versatzX=o.x??0,versatzZ=o.z??0;
  if(o.vorbereiten!==false)vorbereiten(S,scene);
  const n0=S.anzahl;
  // Für Etagenkatalog-Ausschnitte nur Möbel und Bodenteile im sichtbaren Schnitt bauen.
  const sicht=o.ausschnitt??null;
  const beschraenke=(r)=>{
    if(!sicht)return r;
    const x0=Math.max(r.x,sicht.x0),z0=Math.max(r.z,sicht.z0);
    const x1=Math.min(r.x+r.w,sicht.x1),z1=Math.min(r.z+r.d,sicht.z1);
    return x1>x0&&z1>z0?{x:x0,z:z0,w:x1-x0,d:z1-z0}:null;
  };
  // Sortimentsspezifische Fläche, darüber die durchgängigen Laufwege.
  // Geschossdecken aus dem Bestand besitzen Öffnungen für Treppen und Lufträume.
  // Bodenauflagen dürfen diese Aussparungen nicht nachträglich wieder verschließen.
  const ohneLoch=(b,h)=>{
    const x0=Math.max(b.x,h.x),x1=Math.min(b.x+b.w,h.x+h.w);
    const z0=Math.max(b.z,h.z),z1=Math.min(b.z+b.d,h.z+h.d);
    if(x1<=x0||z1<=z0)return [b];
    return [
      {x:b.x,z:b.z,w:b.w,d:z0-b.z},
      {x:b.x,z:z1,w:b.w,d:b.z+b.d-z1},
      {x:b.x,z:z0,w:x0-b.x,d:z1-z0},
      {x:x1,z:z0,w:b.x+b.w-x1,d:z1-z0},
    ].filter(q=>q.w>0.001&&q.d>0.001);
  };
  for(const b of plan.boeden) {
    const hoehe=b.typ==='gang'?0.038:b.typ==='akzent'?0.045:0.03;
    let stuecke=[beschraenke(b)].filter(Boolean);
    for(const h of o.bodenAussparungen??[])stuecke=stuecke.flatMap(q=>ohneLoch(q,h));
    for(const q of stuecke)S.box(q.w,hoehe,q.d,q.x+q.w/2+versatzX,y-hoehe/2+(b.typ==='gang'?0.010:b.typ==='akzent'?0.016:b.abteilung?0.004:0),q.z+q.d/2+versatzZ,b.farbe);
  }
  if(plan.profil==='sport'&&scene)for(const a of plan.abteilungen) {
    const raumbild=beschraenke(a);
    if(!raumbild)continue;
    const x=a.x+a.w/2+versatzX;
    const z=a.z+a.d/2+versatzZ;
    haengeschild(S,scene,SPORT_NAMEN[a.id]??a.titel,x,y+3.35,z,
      {farbe:SPORT_SCHILDER[a.id]??'#314754',hoehe:0.48});
  }
  if(plan.profil==='outlet'&&scene)for(const a of plan.abteilungen) {
    if(!beschraenke(a))continue;
    haengeschild(S,scene,a.titel,a.x+a.w/2+versatzX,y+3.18,
      a.z+a.d/2+versatzZ,{farbe:'#8c1d40',hoehe:0.43});
  }
  for(let j=0;j<plan.moebel.length;j++){
    const m=plan.moebel[j];
    if(sicht&&(m.x<sicht.x0-1e-8||m.z<sicht.z0-1e-8||
      m.x+m.w>sicht.x1+1e-8||m.z+m.d>sicht.z1+1e-8))continue;
    const def=moebel(m.id),w=def.rasterB*U;
    const winkel=m.winkel*Math.PI/180;
    const ox=m.winkel===90?m.x:m.winkel===270?m.x+m.w:m.x+w/2;
    const oz=m.winkel===90?m.z+m.d/2:m.winkel===180?m.z+m.d:m.z;
    def.bau(lokal(S,ox+versatzX,y,oz+versatzZ,winkel),rng(String(plan.seed)+':'+j+':'+m.id),dichte,
      {seed:String(plan.seed)+':'+j,bestueckung:o.bestueckung??1,profil:p.id});
  }
  return {teile:S.anzahl-n0,moebel:plan.moebel.length,abteilungen:plan.abteilungen.length};
}
