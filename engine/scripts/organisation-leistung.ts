// O01 Laufzeit: Mittelwert der reinen Engine-Wochen auf Seed 1.
// Gegen den aktuellen main-Mittelwert bei gleicher Node-Version vergleichen; Ziel <= +10 ms.
import { neuesSpiel, wocheAbspielen, fuehreAus } from '../src';
const s=neuesSpiel(1);
s.cash=5_000_000_000;
const samples:number[]=[];
for(let i=0;i<52;i++){
  fuehreAus(s,{typ:'sammelfreigabe'});
  const t=Date.now();
  wocheAbspielen(s);
  samples.push(performance.now()-t);
}
const avg=samples.reduce((a,b)=>a+b,0)/samples.length;
console.log(JSON.stringify({seed:1,wochen:samples.length,mittelwertMs:Number(avg.toFixed(3)),medianMs:Number([...samples].sort((a,b)=>a-b)[26].toFixed(3)),hinweis:'Vorher-Nachher-Differenz separat auf main messen'},null,2));
