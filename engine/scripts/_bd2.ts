import { neuesSpiel, wocheAbspielen, portfolio } from '../src';
import { botTurnaround } from './bot';
const s = neuesSpiel(1, { schwierigkeit: 'mittel' });
const kand = new Map<string, number>(); const j5: Record<string,{u:number,e:number}> = {}; const j1: Record<string,{u:number,e:number}> = {};
for (let i=0;i<260;i++){ botTurnaround(s); wocheAbspielen(s);
  for (const h of s.haeuser) { if (!h.kpi||h.nurDaten||h.status!=='offen') continue; const g=h.kpi.guv?.ebitda??0;
    if (i<52){ (j1[h.id]??={u:0,e:0}); j1[h.id].u+=h.kpi.umsatz; j1[h.id].e+=g; }
    if (i>=208){ (j5[h.id]??={u:0,e:0}); j5[h.id].u+=h.kpi.umsatz; j5[h.id].e+=g; } } }
const neg = Object.entries(j1).filter(([id,v])=>v.e/v.u < -0.02 && !id.startsWith('O') && !id.startsWith('P'));
let posJ5=0, sumE5=0, sumU5=0;
for (const [id] of neg) { const v=j5[id]; if(!v) continue; sumE5+=v.e; sumU5+=v.u; if (v.e>0) posJ5++; }
console.log('Häuser Jahr 1 < -2 %:', neg.length, '| davon Jahr 5 positiv:', posJ5, '| ihr EBITDA Jahr 5', (sumE5/1e6).toFixed(1), 'Mio, Quote', (100*sumE5/sumU5).toFixed(2), '%');
const ges=Object.values(j5).reduce((a,v)=>({u:a.u+v.u,e:a.e+v.e}),{u:0,e:0}); console.log('Filialen gesamt Jahr 5', (100*ges.e/ges.u).toFixed(2), '%');
