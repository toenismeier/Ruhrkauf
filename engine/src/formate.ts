/** Volkskauf und FUNDUS: getrennte Warenwirtschaft, echte Kostenstellen und Projekte. */
import type { GameState, Haus, HausKpi, Kohorte, Lage } from './types';
import { STAEDTE } from './daten';
import { clamp, eur, chance, zwischen, melde, type RngHalter } from './util';
import { simuliereHaus, hausKosten, leereKpi, nebenvertragsErtraege } from './wirtschaft';
import { guvAbschluss, type FilialGuV } from './filialguv';
import { wettbewerbStartwerte } from './wettbewerb';

export interface FormatPosten { quelle: 'markenposten' | 'altware'; wert: number; preisFaktor: number; alter: number; ladenhueter?: boolean }
export interface FormatProjekt { haus: string; start: number; bis: number; typ: 'umflaggen' | 'eroeffnen' }
export interface FormateStand {
  pool: FormatPosten[]; volkskaufBestand: number; projekte: FormatProjekt[];
  naechsteOutletId: number; altwareEingang: number; zukaufWoche: number;
  umsatzWoche: number; abverkaufWoche: number; abschriftenWoche: number;
  schwesterZentraleWoche: number;
  /** Verkaufsfläche der offenen FUNDUS-Häuser beim Start (Bezug für Zukauf und Altwarefluss). */
  outletQmStart?: number;
  /** Verkaufsfläche der Volkskauf-Häuser beim Start (Bezug für die Regionalführung). */
  volkskaufQmStart?: number;
}
export interface FormatBuchung {
  haus: Haus; kpi: HausKpi; guv: FilialGuV;
  kosten: ReturnType<typeof hausKosten>; neben: ReturnType<typeof nebenvertragsErtraege>;
}
export interface FormateWoche { buchungen: FormatBuchung[]; warenZukauf: number; abschriften: number; marketing: number; zentrale: number }

/** Wareneinsatzquote Volkskauf (Kalibrierung Abschnitt 6: EBITDA rund −3 %). */
const VK_EK=0.563;
const qm = (h: Haus) => h.flaechen.filter(f=>f.konzept!=='leer'&&f.konzept!=='untermiete').reduce((n,f)=>n+f.qm,0);
const basis = (h: Haus):number => Object.entries(h.potenzial).reduce((n,[g,p])=>{
  const fl=h.flaechen.filter(f=>f.gruppe===g).reduce((a,f)=>a+f.qm,0);
  return n+(p??0)*(1-Math.exp(-fl/Math.max(1,h.saettigungQm[g as keyof typeof h.saettigungQm]??1)));
},0);
const rng = (s:GameState):RngHalter => ({rng:s.formateRng??((s.seed^0x48f02a91)>>>0)});
export function formateZufall(s:GameState,p:number):boolean{
  const h=rng(s);const ja=chance(h,p);s.formateRng=h.rng;return ja;
}
export function formateZahl(s:GameState,a:number,b:number):number{
  const h=rng(s);const n=zwischen(h,a,b);s.formateRng=h.rng;return n;
}
/** Nach der Hartwig-Kalibrierung und der Haupt-Einkaufsinitialisierung ausführen. */
export function initialisiereFormate(s:GameState):void{
  const volks=s.haeuser.filter(h=>h.format==='schwester');
  const out=s.haeuser.filter(h=>h.format==='outlet');
  let volksUmsatz=0;
  for(const h of [...volks,...out]){
    h.nurDaten=false;wettbewerbStartwerte(s,h);
    const umsatz=h.format==='schwester'?basis(h)*0.72:qm(h)*72;
    const quote=h.format==='schwester'?0.165:0.115;
    const fte=Math.max(3,umsatz*quote/980);
    h.personal.vollzeit=fte*0.48;h.personal.teilzeit=fte*0.43;h.personal.aushilfen=fte*0.09;
    h.miete.mieteWoche=eur(umsatz*(h.format==='schwester'?0.121:h.lage==='rand'?0.05:0.08));
    if(h.format==='schwester'){
      volksUmsatz+=umsatz;
      h.einzug.alter*=1.1;
      h.substanz=clamp(h.substanz-18,15,60);h.substanzStart=h.substanz;
      const fl=h.personal.filialleiter;
      if(fl.skill>0.6){
        // O07: skill bleibt das Mittel der vier Stärken, daher proportional kappen.
        const k=0.6/fl.skill;fl.skill=0.6;
        if(fl.staerken)for(const key of Object.keys(fl.staerken) as (keyof typeof fl.staerken)[])fl.staerken[key]*=k;
        // Startzustand der Leitung: O07 misst Änderungen gegen diesen Wert.
        if(h.betrieb)h.betrieb.leitungStart=fl.skill;
      }
      for(const g of Object.keys(h.potenzial) as (keyof Haus['potenzial'])[])h.potenzial[g]!*=0.72;
    }
    h.nebenvertrag={
      werbeflaecheQm:Math.round(qm(h)*0.055),
      werbeEuroJeQmWoche:umsatz*0.006/Math.max(1,Math.round(qm(h)*0.055)),
      dienstleistungEuroJeBon:0.7,durchschnittsBonEuro:h.format==='outlet'?28:62,
    };
  }
  const outletUmsatz=out.reduce((n,h)=>n+qm(h)*72,0);
  const budget=eur(outletUmsatz*0.65/1.7);
  s.einkauf.offpriceZukauf??=budget;s.einkauf.altwareOutlet??=0.5;
  s.formate={pool:[{quelle:'markenposten',wert:budget*7,preisFaktor:1.7,alter:1}],
    volkskaufBestand:eur(volksUmsatz*VK_EK*8),projekte:[],
    naechsteOutletId:1+Math.max(66,...out.map(h=>Number(h.id.slice(1))||0)),
    altwareEingang:0,zukaufWoche:0,umsatzWoche:0,abverkaufWoche:0,abschriftenWoche:0,
    schwesterZentraleWoche:eur(volksUmsatz*0.004),outletQmStart:out.reduce((n,h)=>n+qm(h),0),volkskaufQmStart:volks.reduce((n,h)=>n+qm(h),0)};
}
/** Offene FUNDUS-Fläche relativ zum Start: Zukauf und Altwarefluss folgen dem Netz,
 * sonst laufen Ware und Abschriften nach Schließungen auf wenige Häuser auf. */
export function outletKapazitaet(s:GameState):number{
  const f=s.formate;if(!f)return 0;
  const offen=s.haeuser.filter(h=>h.format==='outlet'&&!h.nurDaten&&h.status==='offen').reduce((n,h)=>n+qm(h),0);
  f.outletQmStart??=Math.max(1,offen);
  return clamp(offen/Math.max(1,f.outletQmStart),0,2);
}
/** Volkskauf-Regionalführung: 40 % fix, 60 % schrumpfen mit dem offenen Netz
 * (Schließung oder Umflaggen spart anteilig Regionalleitung). */
function volkskaufZentraleFaktor(s:GameState,offen:Haus[]):number{
  const f=s.formate!;const jetzt=offen.reduce((n,h)=>n+qm(h),0);
  f.volkskaufQmStart??=Math.max(1,jetzt);
  return 0.4+0.6*clamp(jetzt/Math.max(1,f.volkskaufQmStart),0,1);
}
export function formateProjekteWoche(s:GameState):void{
  const stand=s.formate;if(!stand)return;
  for(const p of stand.projekte.filter(p=>p.bis<=s.woche)){
    const h=s.haeuser.find(h=>h.id===p.haus);if(!h)continue;
    if(p.typ==='umflaggen'){
      h.format='warenhaus';h.hausklasse='C';h.name='Hartwig '+h.stadt;
      for(const g of Object.keys(h.potenzial) as (keyof Haus['potenzial'])[])h.potenzial[g]!*=1.125;
      h.formatIntegrationBis=s.woche+52;
    } else {h.nurDaten=false;wettbewerbStartwerte(s,h);}
    melde(s,'info',h.name+': Formatprojekt abgeschlossen.',{stadt:h.stadt,hausId:h.id});
  }
  stand.projekte=stand.projekte.filter(p=>p.bis>s.woche);
  for(const h of s.haeuser){
    if(h.formatIntegrationBis===undefined||h.formatIntegrationBis<=s.woche)continue;
    // Zum Abschluss der einjährigen Nachfrageerholung insgesamt rund +8 %.
    for(const g of Object.keys(h.potenzial) as (keyof Haus['potenzial'])[])h.potenzial[g]!*=1.0015;
  }
}
export function outletKandidaten(s:GameState):{stadt:string;lage:Lage;qm:number;mieteWoche:number;investition:number;umsatzWoche:number}[]{
  return STAEDTE.filter(([stadt])=>s.haeuser.some(h=>h.stadt===stadt&&h.format==='warenhaus'&&h.status==='offen')
   &&!s.haeuser.some(h=>h.stadt===stadt&&h.format==='outlet')).map(([stadt,,cluster])=>{
      const qm=cluster==='metropole'?4500:cluster==='grossstadt'?3400:2400;
      const lage:Lage=cluster==='mittelstadt'?'rand':'b';
      const umsatzWoche=eur(qm*72);
      return {stadt,lage,qm,mieteWoche:eur(umsatzWoche*(lage==='rand'?0.05:0.08)),investition:qm*120,umsatzWoche};
    });
}
export function outletEroeffnen(s:GameState,stadt:string):string|null{
  const k=outletKandidaten(s).find(k=>k.stadt===stadt);
  if(!k)return 'Kein freier geeigneter FUNDUS-Standort in dieser Stadt.';
  if(s.cash+s.kreditlinie<k.investition)return 'Zu wenig Liquidität für die Eröffnung.';
  const muster=s.haeuser.find(h=>h.format==='outlet');
  if(!muster||!s.formate)return 'FUNDUS-Musterhaus fehlt.';
  const id='O'+String(s.formate.naechsteOutletId++).padStart(3,'0');
  const st=STAEDTE.find(([stadt])=>stadt===k.stadt)!;
  const f=k.qm/Math.max(1,qm(muster));
  const neu:Haus={...muster,id,name:'FUNDUS '+stadt,stadt,region:st[1],cluster:st[2],lage:k.lage,
    einzug:{...muster.einzug,kaufkraft:st[3]},nurDaten:true,status:'offen',
    etagen:[0,1],grundflaecheQm:Math.round(k.qm/2),
    flaechen:muster.flaechen.map((fl,i)=>({...fl,id:id+'-f'+(i+1),qm:Math.round(fl.qm*f),etage:i%2})),
    miete:{...muster.miete,mieteWoche:k.mieteWoche},
    personal:{...muster.personal,filialleiter:{...muster.personal.filialleiter}},
    potenzial:{...muster.potenzial},saettigungQm:{...muster.saettigungQm},kpi:undefined,verlauf:[],
  };
  s.haeuser.push(neu);s.formate.projekte.push({haus:id,start:s.woche,bis:s.woche+12,typ:'eroeffnen'});
  s.cash-=k.investition;s.einmalkostenWoche+=k.investition;
  s.kapitalflussOffen??={investitionen:0,finanzierung:0};s.kapitalflussOffen.investitionen-=k.investition;
  return null;
}
export function schwesterUmflaggen(s:GameState,id:string):string|null{
  const h=s.haeuser.find(h=>h.id===id&&h.format==='schwester'&&h.status==='offen');
  if(!h)return 'Offenes Volkskauf-Haus nicht gefunden.';
  if((s.hq.abteilungen.find(a=>a.id==='immobilien')?.stufe??0)<1)return 'Immobilienabteilung ab Stufe 1 erforderlich.';
  if(s.formate?.projekte.some(p=>p.haus===id))return 'Umflaggen läuft bereits.';
  const kosten=eur(qm(h)*180);if(s.cash+s.kreditlinie<kosten)return 'Umbaukosten sind nicht gedeckt.';
  const dauer=20+Number(id.slice(1))%11;
  s.cash-=kosten;s.einmalkostenWoche+=kosten;
  s.kapitalflussOffen??={investitionen:0,finanzierung:0};s.kapitalflussOffen.investitionen-=kosten;
  s.formate?.projekte.push({haus:id,start:s.woche,bis:s.woche+dauer,typ:'umflaggen'});
  return null;
}
function verkauf(pool:FormatPosten[],quelle:FormatPosten['quelle'],ziel:number):{umsatz:number;einsatz:number}{
  let rest=ziel,umsatz=0,einsatz=0;
  for(const p of pool.filter(p=>p.quelle===quelle).sort((a,b)=>b.alter-a.alter)){
    const ek=Math.max(0,Math.min(p.ladenhueter?p.wert*0.06:p.wert,rest/Math.max(0.1,p.preisFaktor)));
    p.wert-=ek;einsatz+=ek;umsatz+=ek*p.preisFaktor;rest-=ek*p.preisFaktor;
    if(rest<=0)break;
  }
  return {umsatz,einsatz};
}
export function formateWoche(s:GameState):FormateWoche{
  const f=s.formate;if(!f)return {buchungen:[],warenZukauf:0,abschriften:0,marketing:0,zentrale:0};
  const aktive=s.haeuser.filter(h=>!h.nurDaten&&h.status==='offen'&&(h.format==='schwester'||h.format==='outlet'));
  const out=aktive.filter(h=>h.format==='outlet');
  const volks=aktive.filter(h=>h.format==='schwester');
  const budget=out.length?Math.max(0,eur((s.einkauf.offpriceZukauf??0)*outletKapazitaet(s))):0;
  const stufe=s.hq.abteilungen.find(a=>a.id==='einkauf')?.stufe??0;
  const preisFaktor=clamp(0.56+stufe*0.02,0.5,0.7)/clamp(0.378-stufe*0.013,0.3,0.4);
  if(budget)f.pool.push({quelle:'markenposten',wert:budget,preisFaktor,alter:0});
  f.zukaufWoche=budget;
  let abschriften=0;
  for(const p of f.pool){p.alter++;if(p.alter>30){
    const a=p.wert*(p.quelle==='markenposten'?0.015:0.03);p.wert-=a;abschriften+=a;
  }}
  const nachfrage=aktive.map(haus=>{
    const roh=simuliereHaus(s,haus);
    const normal=haus.format==='outlet'?roh.offprice*3.65*clamp(2-haus.einzug.kaufkraft,0.8,1.2)/Math.max(0.1,1.6-0.6*haus.einzug.kaufkraft):
      Object.values(roh.eigen).reduce((n,x)=>n+(x?.umsatz??0),0);
    const bau=f.projekte.some(p=>p.haus===haus.id&&p.typ==='umflaggen');
    return {haus,nachfrage:normal*(bau?0.55:1)};
  });
  const volksNachfrage=nachfrage.filter(x=>x.haus.format==='schwester').reduce((n,x)=>n+x.nachfrage,0);
  const warenVerfuegbar=Math.min(1,f.volkskaufBestand/Math.max(1,volksNachfrage*VK_EK));
  let warenZukauf=budget;
  const buchungen:FormatBuchung[]=[];
  f.abverkaufWoche=0;
  for(const {haus,nachfrage:n} of nachfrage){
    let umsatz=0,ek=0;
    if(haus.format==='schwester'){
      umsatz=n*warenVerfuegbar;ek=umsatz*VK_EK;f.volkskaufBestand-=ek;
    }else{
      const marke=verkauf(f.pool,'markenposten',n*0.79);
      const alt=verkauf(f.pool,'altware',n*0.21);
      umsatz=marke.umsatz+alt.umsatz;ek=marke.einsatz+alt.einsatz;
      f.abverkaufWoche+=ek;
    }
    const kpi=leereKpi(s.woche);kpi.umsatz=eur(umsatz);kpi.rohertrag=eur(umsatz-ek);
    // Allokation nur tatsächlich realisierter Verkäufe auf bespielte Flächen.
    const fl=haus.flaechen.filter(f=>f.konzept==='eigen'||f.konzept==='offprice');
    const qmGesamt=fl.reduce((n,f)=>n+f.qm,0);
    for(const f of fl)if(f.gruppe){
      kpi.umsatzJeGruppe[f.gruppe]=eur((kpi.umsatzJeGruppe[f.gruppe]??0)+kpi.umsatz*f.qm/Math.max(1,qmGesamt));
    }
    const kosten=hausKosten(s,haus,umsatz,umsatz);
    const neben=nebenvertragsErtraege(haus,umsatz,s.woche);
    kpi.personal=eur(kosten.personal);kpi.miete=eur(kosten.miete);
    kpi.nebenkosten=eur(kosten.nebenkosten);kpi.sonstige=eur(kosten.sonstige+kosten.logistik);
    kpi.fteIst=haus.personal.vollzeit+haus.personal.teilzeit+haus.personal.aushilfen;
    kpi.fteBedarf=kpi.fteIst;
    const guv=kosten.guv;guv.umsatz=kpi.umsatz;guv.bruttogewinn=kpi.rohertrag;
    guv.wareneinsatz=guv.umsatz-guv.bruttogewinn;
    guv.werbeflaechen=neben.werbeflaechen;guv.dienstleistungen=neben.dienstleistungen;
    guv.uebrigeErtraege=guv.werbeflaechen+guv.dienstleistungen;
    guv.werbung=eur(umsatz*(haus.format==='outlet'?0.014:0.018));
    for(const key of Object.keys(guv) as (keyof FilialGuV)[])guv[key]=eur(guv[key]);
    guvAbschluss(guv);kpi.guv=guv;kpi.db=guv.ebitda;haus.kpi=kpi;
    buchungen.push({haus,kpi,guv,kosten,neben});
  }
  const vkZukauf=eur(Math.max(0,volksNachfrage*VK_EK*6-f.volkskaufBestand));
  f.volkskaufBestand+=vkZukauf;warenZukauf+=vkZukauf;
  f.pool=f.pool.filter(p=>p.wert>1);f.abschriftenWoche=eur(abschriften);
  f.umsatzWoche=eur(buchungen.filter(b=>b.haus.format==='outlet').reduce((n,b)=>n+b.kpi.umsatz,0));
  const outletBedarf=nachfrage.filter(x=>x.haus.format==='outlet').reduce((n,x)=>n+x.nachfrage,0);
  if(out.length&&f.umsatzWoche<outletBedarf*0.72&&s.woche%4===0)
    melde(s,'warnung','FUNDUS: Leere Flächen, es fehlen passende Markenposten oder Altware.');
  if(out.length&&f.pool.reduce((n,p)=>n+p.wert,0)>Math.max(1,f.abverkaufWoche)*15&&s.woche%4===0)
    melde(s,'warnung','FUNDUS: Warenüberhang und Abschriftenrisiko.');
  return {buchungen,warenZukauf:eur(warenZukauf),abschriften:eur(abschriften),
    marketing:buchungen.reduce((n,b)=>n+b.guv.werbung,0),
    zentrale:volks.length?eur(f.schwesterZentraleWoche*volkskaufZentraleFaktor(s,volks)):0};
}
export function outletUebersicht(s:GameState){
  const f=s.formate;const pool=f?.pool??[];
  const bestand=eur(pool.reduce((n,p)=>n+p.wert,0));
  const vk=f?.abverkaufWoche??0;
  return {haeuser:s.haeuser.filter(h=>h.format==='outlet'&&!h.nurDaten&&h.status==='offen').length,
    poolWert:bestand,reichweite:bestand/Math.max(1,vk),abverkaufsquote:vk/Math.max(1,bestand+vk),
    abschriften:f?.abschriftenWoche??0,markenposten:eur(pool.filter(p=>p.quelle==='markenposten').reduce((n,p)=>n+p.wert,0)),
    altware:eur(pool.filter(p=>p.quelle==='altware').reduce((n,p)=>n+p.wert,0)),
    zukaufBudget:s.einkauf.offpriceZukauf??0,altwareQuote:s.einkauf.altwareOutlet??0.5,
    altwareEingang:f?.altwareEingang??0,umsatz:f?.umsatzWoche??0};
}
export function schwesterUebersicht(s:GameState){
  const hs=s.haeuser.filter(h=>h.format==='schwester'&&h.status==='offen');
  return {haeuser:hs.length,umsatz:eur(hs.reduce((n,h)=>n+(h.kpi?.umsatz??0),0)),
    ebitda:eur(hs.reduce((n,h)=>n+(h.kpi?.guv?.ebitda??0),0)),
    bestand:s.formate?.volkskaufBestand??0,umbauten:s.formate?.projekte.filter(p=>p.typ==='umflaggen').length??0};
}
