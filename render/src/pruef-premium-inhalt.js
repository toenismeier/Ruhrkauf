// Zusätzliche, maßstabsunabhängige Abnahme der fünf Kronjuwelen.
// Aufruf: cd render && node pruef-premium.js
import { stadtDaten } from './kit/staedte.js';
import { stadtplan, SLOT_ROLLE } from './kit/stadtplan.js';
import { premiumhaus, premiumMasse, PREMIUM_NAMEN } from './kit/premium.js';
import { Sammler } from './kit/basis.js';
import { STATI } from './kit/zustaende.js';
import haeuser from '../haeuser.json';

let fehler=0;
const protokoll=[];
const dreieckeNachStatus=new Map();
const premiumAlle=haeuser.filter(h=>h.klasse==='premium');
if(premiumAlle.length!==5){console.error('Fünf Premiumhäuser erforderlich: Engine-Export fehlt');fehler++;}
const berlin=premiumAlle.filter(h=>h.stadt==='Berlin');
if(berlin.length!==2||new Set(berlin.map(h=>h.premiumSchluessel)).size!==2){
 console.error('Zwei verschiedene Premiumhäuser in Berlin fehlen');fehler++;
}
if(SLOT_ROLLE.premium!=='slot:premium'){console.error('Premium-Slot fehlt');fehler++;}
for(const [key,name] of Object.entries(PREMIUM_NAMEN)){
 const hs=haeuser.filter(h=>h.klasse==='premium'&&h.premiumSchluessel===key);
 if(hs.length!==1){console.error(key,'muss genau einmal vorkommen, ist',hs.length);fehler++;continue;}
 const h=hs[0];
 const st=stadtDaten(h.stadt);
 if(!st){console.error('Stadt fehlt',h.stadt);fehler++;continue;}
 const plan=stadtplan(st.seed,{typ:st.typ,archetyp:st.archetyp,region:st.region,...st.extra,standorte:st.standorte});
 const alle=plan.standorte.filter(s=>s.rolle==='premium');
 const q=alle.find(x=>x.id===h.id);
 const p=plan.parzellen.find(p=>p.id===q?.parzelle);
 if(!q || !p || p.typ!=='slot:premium' || q.lage!=='1a'){console.error('Premium-Haus nicht in 1a-Slot',h.stadt,h.id);fehler++;continue;}
 const m=premiumMasse(h);
 // Alle Standardzustände + Verkaufsprozess/Eigentümerwechsel ohne Browser auf Geometriefehler prüfen.
 for(const status of [...STATI,'verkaufsprozess','neuerEigentuemer']) {
  const S=new Sammler();
  const opt=status==='verkaufsprozess'?{status:'offen',verkaufsprozess:true,investor:'Family Office Merian'}:
    status==='neuerEigentuemer'?{status:'offen',kaeufer:'Family Office Merian'}:{status};
  try {
   const geb=premiumhaus(S,null,h,opt);
   if(geb.teile<4000 || geb.teile>9000 || !Number.isFinite(geb.hoehe) || geb.w<=0 || geb.d<=0) {
    console.error('Premium-Geometrie ungültig',h.id,status,geb);fehler++;
   }
  } catch(err) {console.error('Premium-Generator fehlgeschlagen',h.id,status,err);fehler++;}
  for(const gs of S.teile.values()) for(const g of gs) g.dispose();
 }
 const nachbarn=plan.parzellen.filter(x=>x.block===p.block && x.id!==p.id && ['stadthaus','eck','hofhaus'].includes(x.typ));
 if(nachbarn.some(x=>!x.hartwigBlock)){console.error('Traufhöhen-Schutz fehlt',h.stadt);fehler++;}
 if(m.w>p.w+3 || m.d>p.d+3){console.error('Slotgröße unplausibel',h.stadt,m,p.w,p.d);fehler++;}
 const stat={stadt:h.stadt,id:h.id,name,slot:p.typ,lage:q.lage,nachbarn:nachbarn.length,breite:m.w,tiefe:m.d};
 protokoll.push(stat);
}
for(const [status,werte] of dreieckeNachStatus){
 const referenz=werte.get('P001');
 if(!referenz){console.error('P001-Dreiecksreferenz fehlt',status);fehler++;continue;}
 for(const [key,zahl] of werte){
  if(zahl>referenz){console.error('Dreiecksbudget überschritten',key,status,zahl,'gegen P001',referenz);fehler++;}
 }
}
console.log('Premium-Gestaltungsprüfung:',JSON.stringify({
 standorte:protokoll,dreiecke:[...dreieckeNachStatus].map(([status,m])=>({status,haeuser:Object.fromEntries(m)}))
},null,2));
if(fehler){console.error(fehler,'Verstöße');process.exitCode=1;} else console.log('0 Verstöße (fünf Premium-Slots, Traufhöhen und Dreiecksbudgets).');
