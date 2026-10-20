// Gesonderte reproduzierbare Abnahme: cd engine && npx tsx scripts/premium-kalibrierung.ts
import { neuesSpiel, wocheAbspielen, premiumUebersicht } from '../src';
import { botTief } from './bot';

const ziele:Record<string,number>={P001:.11,P002:.11,P003:.09,P004:.06};
let fehler=0;
for(const seed of [1,2,3]){
 const normal=neuesSpiel(seed,{premiumDeaktiviert:true}),premium=neuesSpiel(seed);
 for(const s of [normal,premium]){s.cash=5e9;s.wettbewerbEreignisseDeaktiviert=true;}
 let umsatzAlt=0,umsatzNeu=0;
 const kpi=new Map<string,{u:number;db:number}>();
 for(let w=0;w<52;w++){
  umsatzAlt+=wocheAbspielen(normal).umsatz;
  umsatzNeu+=wocheAbspielen(premium).umsatz;
  for(const p of premiumUebersicht(premium)){
   const k=kpi.get(p.schluessel!)??{u:0,db:0};
   k.u+=p.umsatz;k.db+=p.ebitda;kpi.set(p.schluessel!,k);
  }
 }
 const delta=100*(umsatzNeu/umsatzAlt-1);
 if(Math.abs(delta)>1.5)fehler++;
 console.log(`Seed ${seed} | Konzernumsatz Jahr 1: ${delta.toFixed(3)} % gegenüber Kontrolllauf`);
 console.log('Haus  | Umsatz Mio. EUR | EBITDA Mio. EUR | EBITDA-Marge % | Ziel % | Abweichung PP');
 for(const [id,k] of kpi){
  const m=k.db/k.u;
  console.log([id,(k.u/1e6).toFixed(2),(k.db/1e6).toFixed(2),(100*m).toFixed(2),(100*ziele[id]).toFixed(0),(100*(m-ziele[id])).toFixed(2)].join(' | '));
  if(Math.abs(m-ziele[id])>.02)fehler++;
 }
 const bot=neuesSpiel(seed);
 for(let w=0;w<260 && bot.phase!=='zerschlagen';w++){
  botTief(bot);
  wocheAbspielen(bot);
 }
 console.log('Bot C:',bot.woche,'Wochen; Phase',bot.phase,'Cash',bot.cash);
 if(bot.woche<260){
  console.log('Bot C Insolvenzursache / letzte Warnungen:',bot.meldungen.filter(m=>['insolvenz','warnung','eigentuemer'].includes(m.typ)).slice(-8).map(m=>`W${m.woche}: ${m.text}`).join(' | '));
  console.log('Premiumstatus:',bot.haeuser.filter(h=>h.klasse==='premium').map(h=>`${h.premiumSchluessel}: ${h.status}`).join(', '));
 }
 if(bot.woche<260)fehler++;
}
if(fehler){console.error('Abnahme nicht erfüllt:',fehler,'Verstöße');process.exitCode=1;}
