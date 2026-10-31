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
  technik: { klima: 0|1|2; licht: 0|1|2; brandschutz: 0|1|2; foerdertechnik?: 0|1|2 };
  /** Boden, Decke, Farbe: 0 abgewohnt, 1 in Ordnung, 2 neu. */
  oberflaeche?: 0|1|2;
  pflichten: { brandschutz: number; aufzug: number };
  gesperrt: boolean;
  /** Technische Nachrüstung steuert zusätzliche Dachaufbauten im Renderer. */
  klimaModernisiert?: boolean;
  /** Nur durch aktive Maßnahmen erzeugter, alternder Kaufquotenbonus. */
  modernisierungWirkung: number;
}
export interface UmbauProjekt {
  id: string; haus: string; etagen: number[]; stufe: UmbauStufe;
  /** Gewerk (Bauprogramm); ohne Gewerk gilt die Stufe. */
  gewerk?: Gewerk; programm?: string;
  /** Zustand vor Baubeginn für das Vorher/Nachher-Bild. */
  vorher?: Record<number, GewerkZustand>; nachher?: Record<number, GewerkZustand>;
  start: number; ende: number; kosten: number; qm: number; status: 'laufend'|'abgeschlossen';
}
export interface UmbauStand {
  projekte: UmbauProjekt[]; budget: number; verbraucht: number; jahr: number;
  vorlageJahr: number; zaehler: number;
  programme?: Bauprogramm[];
  /** Fassade/Eingang je Haus: 0 alt, 1 gepflegt, 2 erneuert. */
  fassade?: Record<string, 0|1|2>;
  budgetGesetzt?: boolean;
}
export const UMBAU_STUFEN: Record<UmbauStufe, {name:string; qm:number; min:number; max:number}> = {
  auffrischung: {name:'Auffrischung',qm:60,min:2,max:2},
  ladenbau: {name:'Ladenbau neu',qm:250,min:4,max:6},
  komplett: {name:'Komplettumbau',qm:900,min:16,max:30},
  technik: {name:'Technik',qm:120,min:3,max:8},
};
export type UmbauAktion =
  | { typ:'umbauPlanen'; haus:string; etage:number; stufe:UmbauStufe; gewerk?: Gewerk }
  | { typ:'bauprogrammStarten'; auftrag: BauprogrammAuftrag }
  | { typ:'bauprogrammStoppen'; id: string }
  | { typ:'umbauBudget'; betrag: number };
export const UMBAU_AKTIONEN = new Set<string>(['umbauPlanen','bauprogrammStarten','bauprogrammStoppen','umbauBudget']);

// ---- Gewerke (E48): einzeln planbar, Komplettumbau bündelt alles.
export type Gewerk = 'klima'|'licht'|'brandschutz'|'foerdertechnik'|'moebel'|'oberflaeche'|'fassade'|'komplett';
export type GewerkGruppe = 'technik'|'moebel'|'oberflaeche'|'fassade';
/** Zustand einer Etage je Gewerk: 0 schlecht, 1 mittel, 2 gut. */
export type GewerkZustand = Record<Exclude<Gewerk,'komplett'>, 0|1|2>;
export const GEWERKE: Record<Gewerk,{name:string;gruppe:GewerkGruppe|'komplett';ebene:'etage'|'haus';qm:number;min:number;max:number;kaufquote:number;frequenz:number;text:string}> = {
  klima:{name:'Klima und Lüftung',gruppe:'technik',ebene:'etage',qm:70,min:3,max:6,kaufquote:0.01,frequenz:0,text:'Energie sinkt, Sommer angenehmer'},
  licht:{name:'LED-Licht',gruppe:'technik',ebene:'etage',qm:35,min:2,max:3,kaufquote:0.01,frequenz:0,text:'Energie sinkt, Ware wirkt frischer'},
  brandschutz:{name:'Brandschutz',gruppe:'technik',ebene:'etage',qm:45,min:3,max:5,kaufquote:0,frequenz:0,text:'Pflicht erfüllt, Frist +10 Jahre'},
  foerdertechnik:{name:'Aufzug und Rolltreppe',gruppe:'technik',ebene:'etage',qm:40,min:4,max:8,kaufquote:0.005,frequenz:0,text:'Prüfung bestanden, obere Etagen besser erreichbar'},
  moebel:{name:'Möbel und Ladenbau',gruppe:'moebel',ebene:'etage',qm:250,min:4,max:6,kaufquote:0.08,frequenz:0,text:'neue Möbelgeneration, Kaufquote steigt'},
  oberflaeche:{name:'Boden, Decke, Farbe',gruppe:'oberflaeche',ebene:'etage',qm:60,min:2,max:2,kaufquote:0.02,frequenz:0,text:'Substanz +10, Etage wirkt gepflegt'},
  fassade:{name:'Fassade und Eingang',gruppe:'fassade',ebene:'haus',qm:30,min:8,max:14,kaufquote:0,frequenz:0.03,text:'Haus wirkt von außen neu, Frequenz steigt'},
  komplett:{name:'Komplettumbau',gruppe:'komplett',ebene:'haus',qm:900,min:16,max:30,kaufquote:0.10,frequenz:0.06,text:'alles neu, nur ganzes Haus'},
};
const BRUTTO=0.412;
export interface BauprogrammAuftrag {
  name?: string;
  cluster: string[];
  gewerk: Gewerk;
  /** Nur Etagen/Häuser bis zu diesem Zustand (0 = nur schlechte, 1 = schlechte und mittlere). */
  bisZustand: 0|1;
  /** Höchstens so viele Baustellen gleichzeitig. */
  parallel: number;
}
export interface Bauprogramm extends BauprogrammAuftrag {
  id: string; start: number; status:'laufend'|'abgeschlossen'|'gestoppt';
  warteschlange: {haus:string;etage:number}[]; gesamt: number; gestartet: number; kosten: number;
}

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
    for (const nr of h.etagen) {
      const e=h.etagenBau[nr];
      e.technik.foerdertechnik ??= (h.baujahr < 1975 ? 0 : h.baujahr < 2005 ? 1 : 2) as 0|1|2;
      e.oberflaeche ??= (e.substanz < 45 ? 0 : e.substanz < 72 ? 1 : 2) as 0|1|2;
    }
  }
  const st=s.umbau!;
  st.programme ??= [];
  st.fassade ??= {};
  for (const h of s.haeuser) st.fassade[h.id] ??= (h.substanz < 45 ? 0 : h.substanz < 75 ? 1 : 2) as 0|1|2;
  if (!st.budgetGesetzt && !st.budget) {
    // Startbudget: 0,6 % vom Jahresumsatz der offenen Häuser (Planung kann übersteuern).
    const umsatz=s.haeuser.filter(h=>h.status==='offen').reduce((a,h)=>a+Object.values(h.potenzial).reduce((x,y)=>x+(y??0),0),0)*52;
    st.budget=eur(umsatz*0.006);
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
  if (a.typ==='bauprogrammStarten') return bauprogrammStarten(s,a.auftrag);
  if (a.typ==='bauprogrammStoppen') return bauprogrammStoppen(s,a.id);
  if (a.typ==='umbauBudget') {
    s.umbau!.budget=Math.max(0,eur(a.betrag)); s.umbau!.budgetGesetzt=true;
    return {ok:true,text:'Baubudget '+s.umbau!.budget.toLocaleString('de-DE')+' € im Jahr.'};
  }
  if (a.gewerk) return gewerkStarten(s,a.haus,a.etage,a.gewerk);
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
    if (p.gewerk) { gewerkAbschliessen(s,h,p); continue; }
    for (const nr of p.etagen) {
      const e=h.etagenBau?.[nr]; if (!e) continue;
      if (p.stufe==='auffrischung') {e.substanz=clamp(e.substanz+10,0,100);e.technik.licht=Math.min(2,e.technik.licht+1) as 0|1|2;}
      if (p.stufe==='ladenbau') e.moebelGeneration=3;
      if (p.stufe==='komplett') {e.substanz=90;e.moebelGeneration=3;e.technik={klima:2,licht:2,brandschutz:2};e.klimaModernisiert=true;}
      if (p.stufe==='technik') {e.technik={klima:2,licht:2,brandschutz:2};e.pflichten={brandschutz:s.woche+520,aufzug:s.woche+520};e.gesperrt=false;e.klimaModernisiert=true;}
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
  bauprogrammeWoche(s);
  // O08/O06: Bereich legt im Januar ein nach Rendite sortiertes Programm vor.
  if (!s.prognose && s.woche%52===0 && stand.vorlageJahr!==jahr) {
    stand.vorlageJahr=jahr;
    const budget=(s as GameState & {planung?:{modernisierungBudget?:number;umbauBudget?:number}}).planung;
    stand.budget=budget?.modernisierungBudget ?? budget?.umbauBudget ?? stand.budget;
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

// ---------------------------------------------------------------------------
// E48: Gewerke, Bauprogramme über mehrere Cluster, Bestandsübersicht.

/** Zustand einer Etage je Gewerk (0 schlecht, 1 mittel, 2 gut). */
export function gewerkZustand(s:GameState,h:Haus,nr:number):GewerkZustand {
  const e=h.etagenBau![nr];
  return {klima:e.technik.klima,licht:e.technik.licht,brandschutz:e.technik.brandschutz,
    foerdertechnik:e.technik.foerdertechnik??1,moebel:(e.moebelGeneration-1) as 0|1|2,
    oberflaeche:e.oberflaeche??1,fassade:s.umbau?.fassade?.[h.id]??1};
}
/** Zustand einer Gewerk-Gruppe: Technik = schwächstes Technikgewerk. */
export function gruppenZustand(z:GewerkZustand,g:GewerkGruppe):0|1|2 {
  if (g==='technik') return Math.min(z.klima,z.licht,z.brandschutz,z.foerdertechnik) as 0|1|2;
  return z[g];
}
function zielZustand(s:GameState,h:Haus,nr:number,g:Gewerk):0|1|2 {
  const z=gewerkZustand(s,h,nr);
  if (g==='komplett') return Math.min(...(['technik','moebel','oberflaeche','fassade'] as GewerkGruppe[]).map(x=>gruppenZustand(z,x))) as 0|1|2;
  return z[g];
}
function gewerkEtagen(h:Haus,nr:number,g:Gewerk):number[] {
  return GEWERKE[g].ebene==='haus'?[...h.etagen]:[nr];
}
/** Kosten, Dauer und Wirkung eines Gewerks; Haus-Gewerke (Fassade, Komplett) gelten fürs ganze Haus. */
export function gewerkSchaetzung(s:GameState,hausId:string,nr:number,g:Gewerk) {
  const h=s.haeuser.find(x=>x.id===hausId), p=GEWERKE[g];
  if (!h || !p || !h.etagen.includes(nr)) return undefined;
  const etagen=gewerkEtagen(h,nr,g);
  const qm=g==='fassade'?Math.round(Math.sqrt(h.grundflaecheQm)*4*4*Math.max(1,h.etagen.filter(e=>e>=0).length))
    :etagen.reduce((v,e)=>v+flaechenQm(h,e),0);
  const q=clamp(bereichsQualitaet(s,'ladenbau'),0,1);
  const kosten=eur(qm*p.qm*(1+0.4*(1-q)));
  const basis=p.min+(p.max-p.min)*Math.min(1,qm/Math.max(1,h.grundflaecheQm*5));
  const wochen=Math.ceil(basis*(1+0.5*(1-q)));
  const umsatzWoche=h.kpi?.umsatz ?? Object.values(h.potenzial).reduce((a,b)=>a+(b??0),0);
  const anteil=etagen.reduce((v,e)=>v+flaechenQm(h,e),0)/Math.max(1,h.etagen.reduce((v,e)=>v+flaechenQm(h,e),0));
  // Fassade sperrt keine Fläche, behindert aber das ganze Haus leicht.
  const ausfall=eur(umsatzWoche*wochen*(g==='fassade'?0.05:anteil*0.6+(1-anteil)*0.05));
  const plusJahr=eur(umsatzWoche*52*(p.kaufquote*anteil+p.frequenz));
  // Rendite auf den Bruttogewinn des Mehrumsatzes (Referenz-Filial-GuV: 41,2 %).
  return {gewerk:g,etagen,qm,kosten,wochen,ausfall,plusJahr,ertragJahr:eur(plusJahr*BRUTTO),frequenz:p.frequenz,kaufquote:p.kaufquote,
    rendite:Math.round(plusJahr*BRUTTO/Math.max(1,kosten)*1000)/10};
}
function laeuftAuf(s:GameState,h:Haus,etagen:number[]):boolean {
  return (s.umbau?.projekte??[]).some(x=>x.status==='laufend'&&x.haus===h.id&&x.etagen.some(n=>etagen.includes(n)));
}
function gewerkStarten(s:GameState,hausId:string,nr:number,g:Gewerk,programm?:string):{ok:boolean;text:string} {
  const h=s.haeuser.find(x=>x.id===hausId), p=gewerkSchaetzung(s,hausId,nr,g);
  if (!h || !p || h.status!=='offen') return {ok:false,text:'Haus oder Etage nicht verfügbar.'};
  if (laeuftAuf(s,h,p.etagen)) return {ok:false,text:'Mindestens eine Etage befindet sich bereits im Umbau.'};
  if (h.premiumInvestition && h.premiumInvestition.bis>s.woche)
    return {ok:false,text:'Laufende Premium-Investition muss zuerst abgeschlossen werden.'};
  einmalKosten(s,p.kosten);
  s.umbau!.verbraucht+=p.kosten;
  const vorher:Record<number,GewerkZustand>={};
  for (const e of p.etagen) vorher[e]=gewerkZustand(s,h,e);
  const stufe:UmbauStufe=g==='komplett'?'komplett':g==='moebel'?'ladenbau':g==='oberflaeche'?'auffrischung':'technik';
  s.umbau!.projekte.push({id:'umbau-'+(++s.umbau!.zaehler),haus:h.id,etagen:p.etagen,stufe,gewerk:g,programm,
    start:s.woche,ende:s.woche+p.wochen,kosten:p.kosten,qm:p.qm,status:'laufend',vorher});
  if (!programm) melde(s,'info',GEWERKE[g].name+' in '+h.name+' gestartet ('+p.wochen+' Wochen).',{hausId:h.id,stadt:h.stadt,modul:'umbau'});
  return {ok:true,text:'Baustart '+h.name+': '+p.kosten.toLocaleString('de-DE')+' €, fertig in '+p.wochen+' Wochen.'};
}
function gewerkAbschliessen(s:GameState,h:Haus,p:UmbauProjekt):void {
  const g=p.gewerk!, wirkung=GEWERKE[g].kaufquote;
  for (const nr of p.etagen) {
    const e=h.etagenBau?.[nr]; if (!e) continue;
    const alle=g==='komplett';
    if (alle||g==='klima') {e.technik.klima=2;e.klimaModernisiert=true;}
    if (alle||g==='licht') e.technik.licht=2;
    if (alle||g==='brandschutz') {e.technik.brandschutz=2;e.pflichten.brandschutz=s.woche+520;}
    if (alle||g==='foerdertechnik') {e.technik.foerdertechnik=2;e.pflichten.aufzug=s.woche+520;}
    if (e.pflichten.brandschutz>s.woche && e.pflichten.aufzug>s.woche) e.gesperrt=false;
    if (alle||g==='moebel') e.moebelGeneration=3;
    if (alle||g==='oberflaeche') {e.oberflaeche=2;e.substanz=clamp(e.substanz+10,0,100);}
    if (alle) e.substanz=90;
    if (wirkung>0) e.modernisierungWirkung=Math.max(e.modernisierungWirkung,wirkung);
  }
  if (g==='fassade'||g==='komplett') {
    s.umbau!.fassade![h.id]=2;
    h.umbauFrequenz=Math.max(h.umbauFrequenz??0,GEWERKE[g].frequenz);
    h.substanz=Math.max(h.substanz,g==='komplett'?90:clamp(h.substanz+15,0,100));
    s.stakeholder.image=clamp(s.stakeholder.image+(g==='komplett'?0.8:0.3),0,100);
  }
  if (g!=='fassade' && p.etagen.length===h.etagen.length)
    h.substanz=Math.round(h.etagen.reduce((a,n)=>a+(h.etagenBau?.[n]?.substanz??h.substanz),0)/h.etagen.length);
  p.nachher={};
  for (const e of p.etagen) p.nachher[e]=gewerkZustand(s,h,e);
  p.status='abgeschlossen';
  if (!s.prognose) melde(s,'info',GEWERKE[g].name+' abgeschlossen: '+h.name+'.',
    {hausId:h.id,stadt:h.stadt,modul:'umbau',projekt:p.id});
}
function clusterHaeuser(s:GameState,ids:string[]):Haus[] {
  const org=(s as GameState & {organisation?:{hauscluster:{id:string;hausIds:string[]}[]}}).organisation;
  const set=new Set<string>();
  for (const c of org?.hauscluster??[]) if (ids.includes(c.id)) c.hausIds.forEach(i=>set.add(i));
  return s.haeuser.filter(h=>set.has(h.id)&&h.status==='offen');
}
/** Arbeitsliste eines Auftrags: schlechteste Etagen zuerst, Pflichtfristen vorn. */
function auftragsListe(s:GameState,a:BauprogrammAuftrag):{haus:string;etage:number}[] {
  initialisiereUmbau(s);
  const v:{haus:string;etage:number;z:number;frist:number}[]=[];
  for (const h of clusterHaeuser(s,a.cluster)) {
    const etagen=GEWERKE[a.gewerk].ebene==='haus'?[h.etagen[0]]:h.etagen;
    for (const nr of etagen) {
      const z=zielZustand(s,h,nr,a.gewerk);
      if (z>a.bisZustand) continue;
      const e=h.etagenBau![nr];
      v.push({haus:h.id,etage:nr,z,frist:Math.min(e.pflichten.brandschutz,e.pflichten.aufzug)});
    }
  }
  return v.sort((x,y)=>x.z-y.z||x.frist-y.frist||x.haus.localeCompare(y.haus)||x.etage-y.etage).map(({haus,etage})=>({haus,etage}));
}
/** Vorschau: Umfang, Kosten, Bauzeit in Wellen, Ausfall und Wirkung, Liquidität je Woche. */
export function bauprogrammSchaetzung(s:GameState,a:BauprogrammAuftrag) {
  const liste=auftragsListe(s,a), parallel=Math.max(1,Math.round(a.parallel));
  let kosten=0,ausfall=0,plusJahr=0;
  const dauer:{haus:string;w:number;k:number}[]=[];
  for (const x of liste) {
    const p=gewerkSchaetzung(s,x.haus,x.etage,a.gewerk); if(!p) continue;
    kosten+=p.kosten; ausfall+=p.ausfall; plusJahr+=p.plusJahr; dauer.push({haus:x.haus,w:p.wochen,k:p.kosten});
  }
  // Wellen: höchstens `parallel` Baustellen, je Haus eine Baustelle gleichzeitig.
  const frei:number[]=Array(parallel).fill(0), hausFrei=new Map<string,number>();
  const kostenWoche=new Map<number,number>();
  let ende=0;
  for (const d of dauer) {
    let slot=0; for (let i=1;i<frei.length;i++) if (frei[i]<frei[slot]) slot=i;
    const start=Math.max(frei[slot],hausFrei.get(d.haus)??0);
    frei[slot]=start+d.w; hausFrei.set(d.haus,start+d.w); ende=Math.max(ende,start+d.w);
    kostenWoche.set(start,(kostenWoche.get(start)??0)+d.k);
  }
  const haeuser=new Set(liste.map(x=>x.haus)).size;
  const spitze=Math.max(0,...kostenWoche.values());
  const budgetRest=Math.max(0,(s.umbau?.budget??0)-(s.umbau?.verbraucht??0));
  return {haeuser,etagen:GEWERKE[a.gewerk].ebene==='haus'?0:liste.length,auftraege:liste.length,kosten,wochen:ende,ausfall,plusJahr,
    spitzeWoche:spitze,budgetRest,ueberBudget:kosten>budgetRest,ertragJahr:eur(plusJahr*BRUTTO),
    rendite:Math.round(plusJahr*BRUTTO/Math.max(1,kosten)*1000)/10,amortisationJahre:plusJahr>0?Math.round(kosten/(plusJahr*BRUTTO)*10)/10:null};
}
function bauprogrammStarten(s:GameState,a:BauprogrammAuftrag):{ok:boolean;text:string} {
  if (!a.cluster?.length) return {ok:false,text:'Bitte mindestens einen Cluster wählen.'};
  if (!GEWERKE[a.gewerk]) return {ok:false,text:'Unbekanntes Gewerk.'};
  const liste=auftragsListe(s,a);
  if (!liste.length) return {ok:false,text:'In diesen Clustern ist nichts mehr zu tun.'};
  const st=s.umbau!;
  const id='bp-'+(++st.zaehler);
  const name=a.name||GEWERKE[a.gewerk].name+' · '+a.cluster.length+(a.cluster.length===1?' Cluster':' Cluster');
  const prog:Bauprogramm={...a,name,parallel:Math.max(1,Math.round(a.parallel)),id,start:s.woche,status:'laufend',
    warteschlange:liste,gesamt:liste.length,gestartet:0,kosten:0};
  st.programme!.push(prog);
  bauprogrammeWoche(s,id);
  melde(s,'info','Bauprogramm gestartet: '+name+' ('+liste.length+' Baustellen).',{modul:'umbau'});
  return {ok:true,text:'Bauprogramm gestartet: '+liste.length+' Baustellen, '+prog.parallel+' gleichzeitig.'};
}
function bauprogrammStoppen(s:GameState,id:string):{ok:boolean;text:string} {
  const p=s.umbau?.programme?.find(x=>x.id===id);
  if (!p||p.status!=='laufend') return {ok:false,text:'Programm läuft nicht.'};
  p.status='gestoppt'; p.warteschlange=[];
  return {ok:true,text:'Bauprogramm gestoppt. Laufende Baustellen werden fertig gebaut.'};
}
/** Startet je Woche neue Baustellen, bis die Zahl gleichzeitiger Baustellen erreicht ist. */
function bauprogrammeWoche(s:GameState,nur?:string):void {
  const st=s.umbau!;
  for (const p of st.programme??[]) {
    if (p.status!=='laufend'||(nur&&p.id!==nur)) continue;
    let aktiv=st.projekte.filter(x=>x.programm===p.id&&x.status==='laufend').length;
    const rest:typeof p.warteschlange=[];
    for (const x of p.warteschlange) {
      const h=s.haeuser.find(y=>y.id===x.haus);
      if (aktiv>=p.parallel||!h) {rest.push(x);continue;}
      if (h.status!=='offen'||zielZustand(s,h,x.etage,p.gewerk)>p.bisZustand) continue; // erledigt oder Haus zu
      const etagen=gewerkEtagen(h,x.etage,p.gewerk);
      if (laeuftAuf(s,h,etagen)||st.projekte.some(y=>y.programm===p.id&&y.status==='laufend'&&y.haus===h.id)) {rest.push(x);continue;}
      const r=gewerkStarten(s,x.haus,x.etage,p.gewerk,p.id);
      if (r.ok) {aktiv++;p.gestartet++;p.kosten+=st.projekte[st.projekte.length-1].kosten;} else rest.push(x);
    }
    p.warteschlange=rest;
    if (!rest.length&&!aktiv) {
      p.status='abgeschlossen';
      if (!s.prognose) melde(s,'info','Bauprogramm abgeschlossen: '+p.name+'.',{modul:'umbau'});
    }
  }
}
/** Bestand je Cluster: Anteil der Etagen in gutem Zustand je Gewerk-Gruppe, Fristen, Bedarf. */
export function bestandUebersicht(s:GameState) {
  initialisiereUmbau(s);
  const org=(s as GameState & {organisation?:{hauscluster:{id:string;name:string;hausIds:string[];sonder:boolean;region?:string}[]}}).organisation;
  const gruppen:GewerkGruppe[]=['technik','moebel','oberflaeche','fassade'];
  const zeile=(id:string,name:string,haeuser:Haus[],sonder=false,region?:string)=>{
    const z:Record<GewerkGruppe,[number,number,number]>={technik:[0,0,0],moebel:[0,0,0],oberflaeche:[0,0,0],fassade:[0,0,0]};
    let etagen=0,fristen=0,gesperrt=0,baustellen=0,bedarf=0;
    for (const h of haeuser) {
      z.fassade[s.umbau!.fassade![h.id]??1]++;
      if (laeuftAuf(s,h,h.etagen)) baustellen++;
      for (const nr of h.etagen) {
        const e=h.etagenBau![nr], gz=gewerkZustand(s,h,nr); etagen++;
        for (const g of gruppen) if (g!=='fassade') z[g][gruppenZustand(gz,g)]++;
        if (Math.min(e.pflichten.brandschutz,e.pflichten.aufzug)-s.woche<52) fristen++;
        if (e.gesperrt) gesperrt++;
        const q=flaechenQm(h,nr);
        bedarf+=(gz.moebel<2?q*GEWERKE.moebel.qm:0)+(gz.oberflaeche<2?q*GEWERKE.oberflaeche.qm:0)
          +(gz.klima<2?q*GEWERKE.klima.qm:0)+(gz.licht<2?q*GEWERKE.licht.qm:0)+(gz.brandschutz<2?q*GEWERKE.brandschutz.qm:0)+(gz.foerdertechnik<2?q*GEWERKE.foerdertechnik.qm:0);
      }
    }
    const gut=(g:GewerkGruppe)=>{const t=z[g][0]+z[g][1]+z[g][2];return t?Math.round(z[g][2]/t*100):0;};
    const schlecht=(g:GewerkGruppe)=>{const t=z[g][0]+z[g][1]+z[g][2];return t?Math.round(z[g][0]/t*100):0;};
    return {id,name,region,sonder,haeuser:haeuser.length,etagen,fristen,gesperrt,baustellen,bedarf:eur(bedarf),
      gut:Object.fromEntries(gruppen.map(g=>[g,gut(g)])) as Record<GewerkGruppe,number>,
      schlecht:Object.fromEntries(gruppen.map(g=>[g,schlecht(g)])) as Record<GewerkGruppe,number>,
      verteilung:z};
  };
  const cluster=(org?.hauscluster??[]).map(c=>zeile(c.id,c.name,s.haeuser.filter(h=>c.hausIds.includes(h.id)&&h.status==='offen'),c.sonder,c.region))
    .filter(c=>c.haeuser>0);
  const gesamt=zeile('alle','Konzern',s.haeuser.filter(h=>h.status==='offen'));
  const st=s.umbau!;
  return {gesamt,cluster,budget:st.budget,verbraucht:st.verbraucht,rest:Math.max(0,st.budget-st.verbraucht),
    programme:(st.programme??[]).slice().reverse().map(p=>({...p,warteschlange:p.warteschlange.length,
      laufend:st.projekte.filter(x=>x.programm===p.id&&x.status==='laufend').length,
      fertig:st.projekte.filter(x=>x.programm===p.id&&x.status==='abgeschlossen').length})),
    gewerke:GEWERKE};
}
/** Häuser eines Clusters mit Gruppenzuständen je Etage (Drilldown). */
export function bestandCluster(s:GameState,clusterId:string) {
  initialisiereUmbau(s);
  const org=(s as GameState & {organisation?:{hauscluster:{id:string;name:string;hausIds:string[]}[]}}).organisation;
  const c=org?.hauscluster.find(x=>x.id===clusterId);
  if (!c) return undefined;
  const gruppen:GewerkGruppe[]=['technik','moebel','oberflaeche','fassade'];
  const haeuser=s.haeuser.filter(h=>c.hausIds.includes(h.id)&&h.status==='offen').map(h=>{
    const etagen=h.etagen.slice().sort((a,b)=>b-a).map(nr=>{const gz=gewerkZustand(s,h,nr);const e=h.etagenBau![nr];
      return {etage:nr,zustand:Object.fromEntries(gruppen.map(g=>[g,gruppenZustand(gz,g)])) as Record<GewerkGruppe,0|1|2>,
        gewerke:gz,substanz:Math.round(e.substanz),gesperrt:e.gesperrt,frist:Math.min(e.pflichten.brandschutz,e.pflichten.aufzug),
        baustelle:(s.umbau?.projekte??[]).find(x=>x.haus===h.id&&x.status==='laufend'&&x.etagen.includes(nr))};});
    const anteil=(g:GewerkGruppe)=>Math.round(etagen.filter(e=>e.zustand[g]===2).length/Math.max(1,etagen.length)*100);
    return {id:h.id,name:h.name,stadt:h.stadt,format:(h as Haus&{format?:string}).format,etagen,
      gut:Object.fromEntries(gruppen.map(g=>[g,anteil(g)])) as Record<GewerkGruppe,number>};
  });
  return {id:c.id,name:c.name,haeuser};
}
/** Vorher/Nachher eines abgeschlossenen Projekts (Bild in der Meldung). */
export function umbauVorherNachher(s:GameState,projektId:string) {
  const p=s.umbau?.projekte.find(x=>x.id===projektId);
  if (!p||!p.vorher) return undefined;
  const h=s.haeuser.find(x=>x.id===p.haus);
  return {projekt:p,haus:h?{id:h.id,name:h.name,stadt:h.stadt}:undefined,gewerk:p.gewerk?GEWERKE[p.gewerk].name:UMBAU_STUFEN[p.stufe].name};
}
