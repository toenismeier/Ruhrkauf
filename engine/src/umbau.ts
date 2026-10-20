// O08 Umbau: etagenbezogene Substanz, Pflichtprüfungen und Modernisierungsprogramme.
// Keine Zufallsaufrufe; alle Ausgangsfaktoren = 1, bis tatsächlich gebaut wird.
import type { GameState, Haus, GruppeId } from './types';
import { clamp, eur, melde } from './util';
import { einmalKosten } from './prozesse';
import { bereichsQualitaet, neueVorlage } from './organisation';

export type UmbauStufe = 'auffrischung' | 'ladenbau' | 'komplett' | 'technik';
export type MoebelGeneration = 1 | 2 | 3;
export interface BauEtage {
  substanz: number;
  substanzStart: number;
  moebelGeneration: MoebelGeneration;
  moebelGenerationStart: MoebelGeneration;
  technik: { klima: 0|1|2; licht: 0|1|2; brandschutz: 0|1|2 };
  pflichten: { brandschutz: number; aufzug: number };
  gesperrt: boolean;
  /** Nur durch aktive Maßnahmen erzeugter, alternder Kaufquotenbonus. */
  modernisierungWirkung: number;
}
export interface UmbauProjekt {
  id: string; haus: string; etagen: number[]; stufe: UmbauStufe;
  start: number; ende: number; kosten: number; qm: number; status: 'laufend'|'abgeschlossen';
}
export interface UmbauStand {
  projekte: UmbauProjekt[]; budget: number; verbraucht: number; jahr: number;
  vorlageJahr: number; zaehler: number;
}
export const UMBAU_STUFEN: Record<UmbauStufe, {name:string; qm:number; min:number; max:number}> = {
  auffrischung: {name:'Auffrischung',qm:60,min:2,max:2},
  ladenbau: {name:'Ladenbau neu',qm:250,min:4,max:6},
  komplett: {name:'Komplettumbau',qm:900,min:16,max:30},
  technik: {name:'Technik',qm:120,min:3,max:8},
};
export type UmbauAktion = { typ:'umbauPlanen'; haus:string; etage:number; stufe:UmbauStufe };
export const UMBAU_AKTIONEN = new Set<string>(['umbauPlanen']);

export function initialisiereUmbau(s: GameState): void {
  s.umbau ??= { projekte:[], budget:0, verbraucht:0, jahr:0, vorlageJahr:-1, zaehler:0 };
  for (const h of s.haeuser) {
    h.etagenBau ??= {};
    const alt = h.baujahr < 1995 || h.substanz < 43 ? 1 : h.baujahr < 2010 || h.substanz < 70 ? 2 : 3;
    for (const nr of h.etagen) if (!h.etagenBau[nr]) {
      const technik = (h.baujahr < 1970 ? 0 : h.baujahr < 2005 ? 1 : 2) as 0|1|2;
      h.etagenBau[nr] = {
        substanz:h.substanz, substanzStart:h.substanz,
        moebelGeneration:alt, moebelGenerationStart:alt,
        technik:{klima:technik,licht:technik,brandschutz:Math.max(1,technik) as 1|2},
        // Pflichttermine frühestens nach mehr als fünf Spieljahren, damit das Startspiel neutral bleibt.
        pflichten:{brandschutz:312 + ((h.baujahr + nr + 99) % 104),
          aufzug:338 + ((h.baujahr + nr + 127) % 104)},
        gesperrt:false, modernisierungWirkung:0,
      };
    }
  }
}
function flaechenQm(h: Haus, nr: number): number {
  return Math.max(1, h.flaechen.filter(f=>f.etage===nr).reduce((a,f)=>a+f.qm,0) || h.grundflaecheQm);
}
export function umbauSchaetzung(s: GameState, hausId: string, nr: number, stufe: UmbauStufe) {
  const h=s.haeuser.find(x=>x.id===hausId), p=UMBAU_STUFEN[stufe];
  if (!h || !p || !h.etagen.includes(nr)) return undefined;
  const etagen=stufe==='komplett'?[...h.etagen]:[nr], qm=etagen.reduce((v,e)=>v+flaechenQm(h,e),0);
  const q=clamp(bereichsQualitaet(s,'ladenbau'),0,1);
  const kosten=eur(qm*p.qm*(1+0.4*(1-q)));
  const basis=p.min+(p.max-p.min)*Math.min(1,qm/Math.max(1,h.grundflaecheQm*5));
  const wochen=Math.ceil(basis*(1+0.5*(1-q)));
  const plus=stufe==='ladenbau'?0.08:stufe==='komplett'?0.10:stufe==='auffrischung'?0.02:0.01;
  return {etagen,qm,kosten,wochen,frequenz:stufe==='komplett'?0.06:0,kaufquote:plus,
    rendite:Math.round((h.kpi?.umsatz ?? Object.values(h.potenzial).reduce((a,b)=>a+(b??0),0))*plus*52/Math.max(1,kosten)*1000)/10};
}
export function umbauAktion(s:GameState,a:UmbauAktion):{ok:boolean;text:string} {
  initialisiereUmbau(s);
  const h=s.haeuser.find(x=>x.id===a.haus), p=umbauSchaetzung(s,a.haus,a.etage,a.stufe);
  if (!h || !p || h.status!=='offen') return {ok:false,text:'Haus oder Etage nicht verfügbar.'};
  if (s.umbau!.projekte.some(x=>x.status==='laufend' && x.haus===h.id && x.etagen.some(n=>p.etagen.includes(n))))
    return {ok:false,text:'Mindestens eine Etage befindet sich bereits im Umbau.'};
  if (h.premiumInvestition && h.premiumInvestition.bis>s.woche)
    return {ok:false,text:'Laufende Premium-Investition muss zuerst abgeschlossen werden.'};
  einmalKosten(s,p.kosten);
  s.umbau!.verbraucht+=p.kosten;
  const projekt:UmbauProjekt={id:'umbau-'+(++s.umbau!.zaehler),haus:h.id,etagen:p.etagen,stufe:a.stufe,
    start:s.woche,ende:s.woche+p.wochen,kosten:p.kosten,qm:p.qm,status:'laufend'};
  s.umbau!.projekte.push(projekt);
  melde(s,'info',UMBAU_STUFEN[a.stufe].name+' in '+h.name+' gestartet ('+p.etagen.length+' Etage(n), '+p.wochen+' Wochen).',{hausId:h.id,stadt:h.stadt,modul:'umbau'});
  return {ok:true,text:'Baustart '+h.name+': '+p.kosten.toLocaleString('de-DE')+' €, fertig in '+p.wochen+' Wochen.'};
}
function laufend(s:GameState,h: Haus, w=s.woche):UmbauProjekt[] {
  return (s.umbau?.projekte ?? []).filter(p=>p.haus===h.id && p.status==='laufend' && p.start<=w && p.ende>w);
}
/** Eigene Bauarbeiten reduzieren 60 % des Etagenumsatzes und 5 % auf übrigen Flächen. */
export function umbauNachfrageFaktor(s:GameState,h:Haus,g:GruppeId | null):number {
  if (!h.etagenBau) return 1;
  const baustellen=laufend(s,h), gesamt= h.flaechen.filter(f=>(g===null ? f.konzept==='offprice' : f.gruppe===g && ['eigen','kommission','konzession'].includes(f.konzept)) && !h.etagenBau?.[f.etage]?.gesperrt);
  const qm=gesamt.reduce((a,f)=>a+f.qm,0);
  if (!qm) return 1;
  let sum=0;
  for (const f of gesamt) {
    const e=h.etagenBau[f.etage], imBau=baustellen.some(p=>p.etagen.includes(f.etage));
    const behinderung=imBau?0.4:baustellen.length?0.95:1;
    sum+=f.qm*behinderung*(1+(e?.modernisierungWirkung??0));
  }
  return sum/qm;
}
export function umbauFrequenzFaktor(h:Haus):number {
  return 1+(h.umbauFrequenz??0);
}
export function umbauWoche(s:GameState):void {
  initialisiereUmbau(s);
  const stand=s.umbau!;
  const jahr=Math.floor(s.woche/52);
  if (jahr!==stand.jahr) {stand.jahr=jahr;stand.verbraucht=0;}
  for (const h of s.haeuser) {
    if (!h.etagenBau) continue;
    for (const nr of h.etagen) {
      const e=h.etagenBau[nr];
      // Gleicher Substanzverfall wie bislang am Haus, ohne zusätzlichen Startnachfrageeffekt.
      e.substanz=Math.max(0,e.substanz-0.05);
      if (e.modernisierungWirkung>0) e.modernisierungWirkung=Math.max(0,e.modernisierungWirkung-0.00015);
      for (const pflicht of ['brandschutz','aufzug'] as const) {
        const frist=e.pflichten[pflicht];
        if (!s.prognose && s.woche===frist-12) melde(s,'warnung',
          'Behörde setzt Frist: '+pflicht+' in '+h.name+', '+nr+'. Etage bis Woche '+frist+'.',
          {hausId:h.id,stadt:h.stadt,modul:'umbau'});
        if (!e.gesperrt && s.woche>frist) {
          e.gesperrt=true;
          if (!s.prognose) melde(s,'warnung','Behördliche Sperrung: '+h.name+', Etage '+nr+'. '+pflicht+' überfällig.',
            {hausId:h.id,stadt:h.stadt,modul:'umbau'});
        }
      }
    }
    if (h.umbauFrequenz) h.umbauFrequenz=Math.max(0,h.umbauFrequenz-0.0001);
  }
  for (const p of stand.projekte) if (p.status==='laufend' && s.woche>=p.ende) {
    const h=s.haeuser.find(x=>x.id===p.haus);
    if (!h) continue;
    for (const nr of p.etagen) {
      const e=h.etagenBau?.[nr]; if (!e) continue;
      if (p.stufe==='auffrischung') {e.substanz=clamp(e.substanz+10,0,100);e.technik.licht=Math.min(2,e.technik.licht+1) as 0|1|2;}
      if (p.stufe==='ladenbau') e.moebelGeneration=3;
      if (p.stufe==='komplett') {e.substanz=90;e.moebelGeneration=3;e.technik={klima:2,licht:2,brandschutz:2};}
      if (p.stufe==='technik') {e.technik={klima:2,licht:2,brandschutz:2};e.pflichten={brandschutz:s.woche+520,aufzug:s.woche+520};e.gesperrt=false;}
      e.modernisierungWirkung=Math.max(e.modernisierungWirkung,
        p.stufe==='ladenbau'?0.08:p.stufe==='komplett'?0.10:p.stufe==='auffrischung'?0.02:0.01);
    }
    if (p.stufe==='komplett') {
      h.umbauFrequenz=0.06;
      s.stakeholder.image=clamp(s.stakeholder.image+0.8,0,100);
    }
    // Haus-Substanz bleibt mit dem vorhandenen Verfall und der Fassadenpatina gekoppelt.
    h.substanz=p.etagen.length===h.etagen.length?Math.round(
      h.etagen.reduce((a,n)=>a+(h.etagenBau?.[n]?.substanz??h.substanz),0)/h.etagen.length):h.substanz;
    p.status='abgeschlossen';
    if (!s.prognose) melde(s,'info',UMBAU_STUFEN[p.stufe].name+' abgeschlossen: '+h.name+'.',
      {hausId:h.id,stadt:h.stadt,modul:'umbau'});
  }
  // O08/O06: Bereich legt im Januar ein nach Rendite sortiertes Programm vor.
  if (!s.prognose && s.woche%52===0 && stand.vorlageJahr!==jahr) {
    stand.vorlageJahr=jahr;
    const budget=(s as GameState & {planung?:{modernisierungBudget?:number;umbauBudget?:number}}).planung;
    stand.budget=budget?.modernisierungBudget ?? budget?.umbauBudget ?? 0;
    const v=umbauProgramm(s).slice(0,5), auswahl:typeof v=[];
    let rest=stand.budget;
    for (const x of v) if (x.kosten>0 && x.kosten<=rest) {auswahl.push(x);rest-=x.kosten;}
    neueVorlage(s,{bereich:'ladenbau',titel:'Modernisierungsprogramm '+(s.startJahr+jahr),
      text:'Bau & Ladenbau priorisiert nach jährlicher Rendite: '+v.map(x=>x.name+' '+x.etage+' ('+x.rendite+' %)').join(', ')+'. Budget: '+stand.budget.toLocaleString('de-DE')+' €.',
      frist:4,optionen:[{id:'annehmen',label:'Modernisierungsprogramm freigeben'},{id:'zurueckstellen',label:'Zurückstellen'}],standard:'annehmen'});
    const e=s.entscheidungen[s.entscheidungen.length-1];
    if (e?.woche===s.woche && e.typ==='organisation_vorlage' && e.daten.bereich==='ladenbau') {
      e.daten.umbauProgramm=JSON.stringify(auswahl.map(x=>({haus:x.haus,etage:x.etage,stufe:x.stufe})));
    }
  }
}
export function umbauProgramm(s:GameState) {
  const v:{haus:string;name:string;etage:number;stufe:UmbauStufe;kosten:number;rendite:number}[]=[];
  for (const h of s.haeuser) if (h.status==='offen') for (const nr of h.etagen) {
    const e=h.etagenBau?.[nr]; if(!e || e.gesperrt)continue;
    const stufe:UmbauStufe=e.moebelGeneration<3?'ladenbau':'auffrischung';
    const p=umbauSchaetzung(s,h.id,nr,stufe);
    if(p&&!s.umbau?.projekte.some(x=>x.status==='laufend'&&x.haus===h.id&&x.etagen.includes(nr)))
      v.push({haus:h.id,name:h.name,etage:nr,stufe,kosten:p.kosten,rendite:p.rendite});
  }
  return v.sort((a,b)=>b.rendite-a.rendite || a.haus.localeCompare(b.haus) || a.etage-b.etage);
}
export function umbauProgrammEntscheiden(s:GameState,programm:string):void {
  let liste:{haus:string;etage:number;stufe:UmbauStufe}[]=[];
  try {liste=JSON.parse(programm);} catch {return;}
  for(const a of liste) umbauAktion(s,{typ:'umbauPlanen',...a});
}
export function umbauUebersicht(s:GameState) {
  initialisiereUmbau(s);
  const st=s.umbau!;
  return {budget:st.budget,verbraucht:st.verbraucht,rest:Math.max(0,st.budget-st.verbraucht),
    jahr:s.startJahr+Math.floor(s.woche/52),programm:umbauProgramm(s).slice(0,30),
    laufend:st.projekte.filter(x=>x.status==='laufend'),abgeschlossen:st.projekte.filter(x=>x.status==='abgeschlossen').slice(-20),
    premiumInvestitionen:s.haeuser.filter(x=>x.premiumInvestition&&x.premiumInvestition.bis>s.woche).length};
}
export function umbauHaus(s:GameState,id:string) {
  initialisiereUmbau(s);
  const h=s.haeuser.find(x=>x.id===id);if(!h)return undefined;
  return h.etagen.map(nr=>({etage:nr,...h.etagenBau![nr],qm:flaechenQm(h,nr),
    projekt:(s.umbau?.projekte??[]).find(x=>x.haus===id&&x.status==='laufend'&&x.etagen.includes(nr)),
    schaetzungen:(Object.keys(UMBAU_STUFEN) as UmbauStufe[]).map(stufe=>({stufe,...umbauSchaetzung(s,id,nr,stufe)!}))}));
}
