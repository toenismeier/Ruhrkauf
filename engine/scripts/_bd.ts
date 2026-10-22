import { neuesSpiel, wocheAbspielen } from '../src';
import { botRegulaer, botTurnaround } from './bot';
const seed = Number(process.argv[2]); const bot = process.argv[3]==='T'?botTurnaround:botRegulaer;
const s = neuesSpiel(seed, { schwierigkeit: 'mittel' }); let u=0,e=0;
for (let i=0;i<260&&s.phase!=='zerschlagen';i++){ bot(s); const k=wocheAbspielen(s); if(i>=208){u+=k.umsatz;e+=k.ebitda;} }
console.log(process.argv[4]??'', seed, (100*e/u).toFixed(2));
