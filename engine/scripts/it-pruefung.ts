// O03 IT: reproduzierbare lokale Abnahme. Aufruf: npx tsx scripts/it-pruefung.ts
import { performance } from 'node:perf_hooks';
import { neuesSpiel, wocheAbspielen } from '../src/engine';
import { fuehreAus } from '../src/aktionen';
import { initialisiereIt, itCluster, itDeckel, itWoche } from '../src/it';

function runde(n: number): number { return Math.round(n*1000)/1000; }
const s=neuesSpiel(1),cluster=itCluster(s);
const vor=itDeckel(s,'merchandise_planning');
const original=structuredClone(s);
const neu=structuredClone(s);
const empty=performance.now();
for(let w=0;w<52;w++){original.woche=w;}
const ohne=performance.now()-empty;
const start=performance.now();
for(let w=0;w<52;w++){neu.woche=w;itWoche(neu);}
const mit=performance.now()-start;
console.log('O03 IT-Laufzeit, isoliert je Woche (52 Wochen, Seed 1)',runde((mit-ohne)/52),'ms');
console.log('O03 Neutralfaktor (Systeme unverändert)',itDeckel(neu,'merchandise_planning')===vor);
console.log('O03 Keine Projekte vor Spieleraktion',s.it?.projekte.length===0);
console.log('O03 Clusterzahl',cluster.length);
console.log('O03 Projekte starten und Rollout-Zeit');
const projekt=neuesSpiel(1);
const akt=fuehreAus(projekt,{typ:'itProjekt',system:'planung',art:'kaufen',zielGeneration:3,clusterIds:[cluster[0].id]});
if(!akt.ok)throw Error(akt.text);
let vergangen=0;
while(projekt.it!.projekte[0].phase!=='abgeschlossen'&&vergangen<100){itWoche(projekt);projekt.woche++;vergangen++;}
if(projekt.it!.projekte[0].phase!=='abgeschlossen')throw Error('Rollout nach 100 Wochen offen');
console.log('O03 abgeschlossen nach',vergangen,'Wochen, Deckel',runde(vor),'->',runde(itDeckel(projekt,'merchandise_planning')));
for(let seed=1;seed<=3;seed++){
  const game=neuesSpiel(seed);
  let umsatz=0,ebitda=0,n=0;
  for(;n<52;n++){try{const k=wocheAbspielen(game);umsatz+=k.umsatz;ebitda+=k.ebitda;}catch{break;}}
  console.log('Seed',seed, 'Wochen',n,'Umsatz',Math.round(umsatz),'EBITDA',Math.round(ebitda));
}
