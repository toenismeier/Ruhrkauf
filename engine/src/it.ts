// O03 IT: eigenständige Systemlandschaft, Implementierungsprojekte und clusterweiser Rollout.
// Alle Zufallsereignisse nutzen einen unabhängigen Seed-Strom; die bestehende Kalibrierung bleibt stabil.
import type { GameState, Haus, Region } from './types';
import { clamp, eur, melde, chance, type RngHalter } from './util';
import { einmalKosten } from './prozesse';

export type BereichId = string; // Gemeinsame Schnittstelle zu O01, ohne vorgezogenen Import.
export type ItSystemId = 'kasse' | 'warenwirtschaft' | 'planung' | 'personaleinsatz' | 'preisschilder' | 'app' | 'ecommerce' | 'datenplattform';
export type ProjektArt = 'kaufen' | 'entwickeln' | 'dienstleister';
export type Generation = 0 | 1 | 2 | 3 | 4;
export type ItPhase = 'konzept' | 'umsetzung' | 'rollout' | 'abgeschlossen';
export interface ItCluster { id: string; name: string; hausIds: string[] }
export interface Installation { generation: Generation; seitWoche: number }
export interface ItSystem {
  id: ItSystemId; generation: Generation; alter: number; basisAlter: number;
  kostenWoche: number; basisKosten: number; wartungGekuendigt: boolean;
  installationen: Record<string, Installation>;
  kasseAusbau?: { selbstbedienung: number; mobil: number };
}
export interface ItProjekt {
  id: string; system: ItSystemId; art: ProjektArt; zielGeneration: Generation;
  phase: ItPhase; phaseSeit: number; phaseRest: number;
  konzeptWochen: number; umsetzungWochen: number; rolloutWochen: number;
  clusterIds: string[]; erledigteCluster: string[];
  kostenPlan: number; kostenIst: number; wochenBudget: number;
  verzug: number; stoerungen: number; gestartet: number; beendet?: number;
}
export interface ItStand {
  systeme: Record<ItSystemId, ItSystem>;
  projekte: ItProjekt[];
  naechsteId: number;
  umsatzFaktoren: Record<string, number>;
  hausCluster: Record<string, string>; // vorberechnete Zuordnung, O(1) je Haus
  startprobleme: Record<string, number>; // Schlüssel System:Cluster, Ende exklusiv
  meldungen: number;
}
export interface ItProjektAktion {
  typ: 'itProjekt'; system: ItSystemId; art: ProjektArt; zielGeneration: Generation;
  clusterIds?: string[];
}
export type ItAktion = ItProjektAktion
  | { typ: 'itRolloutPlan'; projekt: string; clusterIds: string[] }
  | { typ: 'itKasseAusbau'; art: 'selbstbedienung' | 'mobil'; stufe: number };

export const IT_AKTIONEN = new Set<string>(['itProjekt', 'itRolloutPlan', 'itKasseAusbau']);
export const SYSTEME: Record<ItSystemId, { name: string; start: Generation; alter: number; kosten: number; bereiche: string[] }> = {
  kasse: { name: 'Kassensoftware', start: 2, alter: 14, kosten: 78000, bereiche: ['store_operations','vertriebssteuerung','flagship_management'] },
  warenwirtschaft: { name: 'Warenwirtschaft', start: 2, alter: 10, kosten: 62000, bereiche: ['allokation','logistik','einkauf_damen','einkauf_herren_kinder','einkauf_beauty','einkauf_wohnen','einkauf_food','preis_reduzierung'] },
  planung: { name: 'Planungssystem', start: 1, alter: 17, kosten: 42000, bereiche: ['merchandise_planning','konzerncontrolling','vertriebscontrolling'] },
  personaleinsatz: { name: 'Personaleinsatz-Software', start: 1, alter: 12, kosten: 25000, bereiche: ['personaleinsatz','store_operations'] },
  preisschilder: { name: 'Elektronische Preisschilder', start: 0, alter: 0, kosten: 0, bereiche: ['preis_reduzierung','store_operations','allokation'] },
  app: { name: 'App & Kundenkarte', start: 2, alter: 6, kosten: 39000, bereiche: ['crm','marketing'] },
  ecommerce: { name: 'E-Commerce-Plattform', start: 2, alter: 8, kosten: 60000, bereiche: ['ecommerce'] },
  datenplattform: { name: 'Datenplattform (BI)', start: 1, alter: 11, kosten: 47000, bereiche: ['bi_daten'] },
};
export const IT_IDS = Object.keys(SYSTEME) as ItSystemId[];

export function itCluster(s: GameState): ItCluster[] {
  // O01 liefert die geografischen Cluster; Sondercluster nicht doppelt abrechnen.
  const mitOrg = s as GameState & { organisation?: { hauscluster: ItCluster[] } };
  const o = mitOrg.organisation?.hauscluster.filter(c => c.id !== 'premium-flagships' && c.hausIds.length > 0);
  if (o?.length) return o.map(c => ({ id: c.id, name: c.name, hausIds: [...c.hausIds] }));
  // Vor O01-Merge: deterministische, unveränderliche Übergangseinteilung ohne Stadt-Hardcodes.
  const gruppen: ItCluster[] = [];
  const regionen: Region[] = ['Nord','Ost','West','Mitte','Süd'];
  for (const region of regionen) {
    const ids = s.haeuser.filter(h => h.region === region).map(h => h.id).sort();
    for (let i=0; i<ids.length; i+=9) gruppen.push({ id: 'it-'+region+'-'+(i/9+1), name: region+' '+(i/9+1), hausIds: ids.slice(i,i+9) });
  }
  return gruppen;
}
export function initialisiereIt(s: GameState): void {
  if (s.it) return;
  const systeme = {} as Record<ItSystemId, ItSystem>;
  for (const id of IT_IDS) {
    const d = SYSTEME[id];
    systeme[id] = {
      id, generation: d.start, alter: d.alter, basisAlter: d.alter,
      kostenWoche: d.kosten, basisKosten: d.kosten, wartungGekuendigt: false,
      installationen: {},
      ...(id === 'kasse' ? { kasseAusbau: { selbstbedienung: 0, mobil: 0 } } : {}),
    };
  }
  s.it = { systeme, projekte: [], naechsteId: 0, umsatzFaktoren: {}, hausCluster: {}, startprobleme: {}, meldungen: 0 };
}
const system = (s: GameState, id: ItSystemId): ItSystem | undefined => s.it?.systeme[id];
export function generationInCluster(s: GameState, id: ItSystemId, clusterId: string): Generation {
  const x = system(s,id);
  return x?.installationen[clusterId]?.generation ?? x?.generation ?? SYSTEME[id].start;
}
export function itAlter(s: GameState, id: ItSystemId, clusterId?: string): number {
  const x = system(s,id);
  if (!x) return SYSTEME[id].alter + s.woche / 52;
  const i = clusterId ? x.installationen[clusterId] : undefined;
  return i ? Math.max(0,(s.woche-i.seitWoche)/52) : x.alter + s.woche/52;
}
/** Wöchentliche Ausfallrate je System; der Anstieg ist vor allem bei Altsystemen progressiv. */
export function ausfallRisiko(generation: Generation, alter: number): number {
  if (generation === 0) return 0;
  return clamp(0.00015 + Math.pow(Math.max(0, alter-4)/20, 2) * (5-generation) * 0.002, 0, 0.065);
}
function benoetigteSysteme(bereich: BereichId): ItSystemId[] {
  const direkt = IT_IDS.filter(id => SYSTEME[id].bereiche.includes(bereich));
  // Bereichsnamen O01 und ältere HQ-Abteilungsbezeichnungen verstehen.
  if (!direkt.length) {
    if (bereich.includes('einkauf')) return ['warenwirtschaft'];
    if (bereich.includes('controlling')) return ['planung','datenplattform'];
    if (bereich.includes('personal')) return ['personaleinsatz'];
  }
  return direkt;
}
function deckelGeneration(g: Generation): number { return [0.72,0.81,0.88,0.95,1][g]; }
/** O01-Schnittstelle: 0..1. Die Basissysteme deckeln heute keine der vorhandenen Leitungskompetenzen. */
export function itDeckel(s: GameState, bereich: BereichId): number {
  const benoetigt = benoetigteSysteme(bereich);
  if (!benoetigt.length) return 1;
  const clusters = itCluster(s), n = clusters.reduce((a,c)=>a+c.hausIds.length,0) || 1;
  let min = 1;
  for (const id of benoetigt) {
    const d = SYSTEME[id];
    let kapazitaet = 0;
    for (const c of clusters) kapazitaet += deckelGeneration(generationInCluster(s,id,c.id)) * c.hausIds.length/n;
    if (!clusters.length) kapazitaet = deckelGeneration(system(s,id)?.generation ?? d.start);
    min = Math.min(min, kapazitaet);
  }
  const bi = ['merchandise_planning','allokation','konzerncontrolling','vertriebscontrolling','bi_daten'].includes(bereich);
  if (bi) {
    const g = clusters.length ? clusters.reduce((a,c)=>a+generationInCluster(s,'datenplattform',c.id)*c.hausIds.length/n,0) : (system(s,'datenplattform')?.generation ?? 1);
    min = Math.min(1, min * (1 + Math.max(0,g-1)*0.05));
  }
  return clamp(min,0,1);
}
export function itDeckelGrund(s: GameState, bereich: BereichId): string | undefined {
  const ids = benoetigteSysteme(bereich);
  if (!ids.length) return undefined;
  const clusters = itCluster(s), n = clusters.reduce((a,c)=>a+c.hausIds.length,0) || 1;
  const wert = ids.map(id=>({
    id, deckel: clusters.length ? clusters.reduce((a,c)=>a+deckelGeneration(generationInCluster(s,id,c.id))*c.hausIds.length/n,0) : deckelGeneration(system(s,id)?.generation ?? SYSTEME[id].start)
  })).sort((a,b)=>a.deckel-b.deckel)[0];
  return wert && wert.deckel < 0.995 ? SYSTEME[wert.id].name+' (Generation '+(system(s,wert.id)?.generation ?? SYSTEME[wert.id].start)+')' : undefined;
}
function projektKosten(art: ProjektArt, ziel: Generation, clusterCount: number): number {
  const millionen = { kaufen: 1.8, entwickeln: 4.2, dienstleister: 0.8 }[art];
  return eur((millionen + ziel * 0.65) * 1000000 * (0.35 + clusterCount*0.65/18));
}
export function itProjektPlan(s: GameState, id: ItSystemId, art: ProjektArt, ziel: Generation, anzahl: number) {
  const faktor = { kaufen: 1, entwickeln: 1.9, dienstleister: 0.75 }[art];
  const konzept = Math.ceil(3*faktor), umsetzung = Math.ceil((6+ziel*3)*faktor);
  const rollout = Math.max(1,anzahl);
  return { konzept, umsetzung, rollout, gesamt: konzept+umsetzung+rollout, kosten: projektKosten(art,ziel,anzahl) };
}
function qualitaet(s: GameState): number {
  const o = (s as GameState & { organisation?: { bereiche: Record<string,{person?:{qualitaet:number}}> } }).organisation;
  const q = o?.bereiche?.it?.person?.qualitaet;
  const cdo = s.vorstand?.ressorts.cdo?.person;
  return clamp((q ?? 0.58)*0.7+(cdo ? cdo.fachwissen/100 : 0.5)*0.3,0,1);
}
function vorlage(s: GameState, titel: string, text: string, frist = 3): void {
  if (s.prognose) return;
  s.entscheidungen.push({
    id: 'it-v-'+(++s.it!.meldungen), typ: 'it_meilenstein', woche: s.woche, frist: s.woche+frist,
    titel, text, optionen: [{id:'bestaetigen',label:'Bericht zur Kenntnis nehmen'},{id:'delegieren',label:'IT-Leitung weiterarbeiten lassen'}],
    standard:'delegieren', daten: { modul:'it' },
  });
  melde(s,'info',titel+': '+text,{modul:'it'});
}
export function itAktion(s: GameState, a: ItAktion): {ok:boolean;text:string} {
  initialisiereIt(s);
  const it = s.it!;
  if (a.typ === 'itKasseAusbau') {
    if (!Number.isInteger(a.stufe) || a.stufe<0 || a.stufe>2) return {ok:false,text:'Ungültige Ausbaustufe.'};
    const x=it.systeme.kasse;
    if (x.generation<2 || (a.art==='mobil' && x.generation<3)) return {ok:false,text:'Kassensoftware muss zunächst modernisiert werden.'};
    if (!x.kasseAusbau) x.kasseAusbau={selbstbedienung:0,mobil:0};
    if (a.stufe<=x.kasseAusbau[a.art]) return {ok:false,text:'Ausbaustufe muss steigen.'};
    einmalKosten(s,eur((a.stufe-x.kasseAusbau[a.art]) * (a.art==='mobil'?1800000:3100000)));
    x.kasseAusbau[a.art]=a.stufe;
    return {ok:true,text:'Kassenausbau beauftragt.'};
  }
  if (a.typ === 'itRolloutPlan') {
    const p=it.projekte.find(p=>p.id===a.projekt);
    if (!p || p.phase==='abgeschlossen' || p.erledigteCluster.length) return {ok:false,text:'Rollout-Reihenfolge nicht mehr änderbar.'};
    const gueltig = new Set(itCluster(s).map(c=>c.id));
    if (!a.clusterIds.length || new Set(a.clusterIds).size!==a.clusterIds.length || a.clusterIds.some(id=>!gueltig.has(id))) return {ok:false,text:'Ungültige Cluster-Auswahl.'};
    if (a.clusterIds.some(id=>generationInCluster(s,p.system,id)>=p.zielGeneration)) return {ok:false,text:'Im gewählten Cluster ist diese Generation bereits vorhanden.'};
    p.clusterIds=[...a.clusterIds];p.rolloutWochen=a.clusterIds.length;
    return {ok:true,text:'Rollout-Auswahl und Reihenfolge gespeichert.'};
  }
  if (!IT_IDS.includes(a.system)) return {ok:false,text:'Unbekanntes IT-System.'};
  if (!['kaufen','entwickeln','dienstleister'].includes(a.art)) return {ok:false,text:'Unbekannte Projektart.'};
  if (!Number.isInteger(a.zielGeneration) || a.zielGeneration<1 || a.zielGeneration>4) return {ok:false,text:'Ungültige Zielgeneration.'};
  if (a.art==='kaufen' && a.zielGeneration>3 || a.art==='dienstleister' && a.zielGeneration!==3) return {ok:false,text:'Diese Generation ist für die gewählte Projektart nicht verfügbar.'};
  if (it.projekte.some(p=>p.system===a.system && p.phase!=='abgeschlossen')) return {ok:false,text:'Für das System läuft bereits ein Projekt.'};
  const gueltig = new Set(itCluster(s).map(c=>c.id));
  const clusterIds = a.clusterIds ? [...a.clusterIds] : [...gueltig];
  if (!clusterIds.length || new Set(clusterIds).size!==clusterIds.length || clusterIds.some(id=>!gueltig.has(id))) return {ok:false,text:'Ungültige Cluster-Auswahl.'};
  if (clusterIds.some(id=>generationInCluster(s,a.system,id)>=a.zielGeneration)) return {ok:false,text:'Zielgeneration muss in jedem gewählten Cluster höher sein.'};
  const plan=itProjektPlan(s,a.system,a.art,a.zielGeneration,clusterIds.length);
  const p:ItProjekt={
    id:'it-p-'+(++it.naechsteId),system:a.system,art:a.art,zielGeneration:a.zielGeneration,
    phase:'konzept',phaseSeit:s.woche,phaseRest:plan.konzept,konzeptWochen:plan.konzept,umsetzungWochen:plan.umsetzung,
    rolloutWochen:plan.rollout,clusterIds,erledigteCluster:[],kostenPlan:plan.kosten,kostenIst:0,
    wochenBudget:eur(plan.kosten/plan.gesamt),verzug:0,stoerungen:0,gestartet:s.woche,
  };
  it.projekte.push(p);
  vorlage(s,'IT-Projekt beauftragt',SYSTEME[a.system].name+': '+a.art+', Generation '+a.zielGeneration+', '+clusterIds.length+' Cluster, Planbudget '+plan.kosten.toLocaleString('de-DE')+' €.');
  return {ok:true,text:'Projekt '+p.id+' gestartet.'};
}
function itZufall(s: GameState, schluessel: number): RngHalter {
  // LCG-Mix je Woche, ohne Veränderung von GameState.rng und damit des bisherigen Spielverlaufs.
  return {rng: (Math.imul(s.seed ^ 0x4e4f4f31,1664525)+Math.imul(s.woche+1,1013904223)+Math.imul(schluessel,2246822519))>>>0};
}
function stoerung(s: GameState, cluster: ItCluster, faktor: number): void {
  const verluste=s.it!.umsatzFaktoren;
  for (const id of cluster.hausIds) verluste[id]=Math.min(verluste[id]??1,faktor);
}
function upgrade(s: GameState, p: ItProjekt, cluster: ItCluster): void {
  const x=s.it!.systeme[p.system];
  x.installationen[cluster.id]={generation:p.zielGeneration,seitWoche:s.woche};
  s.it!.startprobleme[p.system+':'+cluster.id]=s.woche+4;
  const r=itZufall(s,311+p.erledigteCluster.length);
  const probs=0.11*(1-qualitaet(s)*0.7);
  const defekte=cluster.hausIds.length ? (chance(r,probs)?1+Math.floor(cluster.hausIds.length*0.18):0):0;
  p.stoerungen+=defekte;
  if(defekte) stoerung(s,cluster,0.97);
  p.erledigteCluster.push(cluster.id);
  vorlage(s,'Rollout '+SYSTEME[p.system].name,cluster.name+' fertig, '+defekte+' Störungen, '+p.erledigteCluster.length+'/'+p.clusterIds.length+' Cluster umgestellt.');
}
function beende(s: GameState, p: ItProjekt): void {
  p.phase='abgeschlossen';p.phaseRest=0;p.beendet=s.woche;
  const x=s.it!.systeme[p.system];
  if (itCluster(s).every(c=>generationInCluster(s,p.system,c.id)>=p.zielGeneration)) {
    x.generation=p.zielGeneration;x.alter=0;
    // Installationen halten weiterhin den Einführungstermin je Cluster fest.
  }
  const faktor={kaufen:1,entwickeln:0.75,dienstleister:2.1}[p.art];
  x.kostenWoche=eur(x.basisKosten * (1+0.17*(p.zielGeneration-SYSTEME[p.system].start))*faktor);
  vorlage(s,'IT-Projekt abgeschlossen',SYSTEME[p.system].name+' Generation '+p.zielGeneration+'. Istkosten '+p.kostenIst.toLocaleString('de-DE')+' €, Plan '+p.kostenPlan.toLocaleString('de-DE')+' €.');
}
/** Ein Aufruf pro Spielwoche (engine.ts). Wirtschaftlich neutral vor Spielermaßnahmen. */
export function itWoche(s: GameState): void {
  initialisiereIt(s);
  const it=s.it!;
  it.umsatzFaktoren={};
  const clusters=itCluster(s);
  it.hausCluster={};
  for (const cluster of clusters) for (const id of cluster.hausIds) it.hausCluster[id]=cluster.id;
  const delta=IT_IDS.reduce((sum,id)=>sum+it.systeme[id].kostenWoche-it.systeme[id].basisKosten,0);
  s.zentrale.kostenWoche+=delta;
  const q=qualitaet(s);
  for (const p of it.projekte) {
    if(p.phase==='abgeschlossen') continue;
    const zuf=itZufall(s,100+Number(p.id.slice(5)));
    const risiko=clamp(0.1*(1-q)+0.025*(p.art==='entwickeln'?2:1),0,0.16);
    if(!s.prognose && chance(zuf,risiko)) {
      p.verzug++;p.phaseRest++;const mehr=eur(p.wochenBudget*0.12);p.kostenPlan+=mehr;
    }
    const ausgabe=eur(p.wochenBudget*(1+(p.verzug>0?0.09:0)));
    einmalKosten(s,ausgabe);p.kostenIst+=ausgabe;
    p.phaseRest--;
    if(p.phaseRest>0) continue;
    if(p.phase==='konzept') {
      p.phase='umsetzung';p.phaseSeit=s.woche+1;p.phaseRest=p.umsetzungWochen;
      vorlage(s,'IT-Konzept freigegeben',SYSTEME[p.system].name+' geht in die Umsetzung.');
    } else if(p.phase==='umsetzung') {
      p.phase='rollout';p.phaseSeit=s.woche+1;p.phaseRest=1;
      vorlage(s,'Rollout beginnt',SYSTEME[p.system].name+' wird Cluster für Cluster umgestellt.');
    } else if(p.phase==='rollout') {
      const next=clusters.find(c=>c.id===p.clusterIds[p.erledigteCluster.length]);
      if(next) upgrade(s,p,next);
      if(p.erledigteCluster.length===p.clusterIds.length) beende(s,p);
      else p.phaseRest=1;
    }
  }
  // Ein unabhängiger RNG-Strom pro IT-System und Cluster schützt die vorhandenen Seeds.
  for (let i=0;i<IT_IDS.length;i++){
    const id=IT_IDS[i],x=it.systeme[id];
    if(x.generation===0 && !Object.keys(x.installationen).length) continue;
    for (let j=0;j<clusters.length;j++){
      const c=clusters[j],g=generationInCluster(s,id,c.id),alter=itAlter(s,id,c.id);
      if(g===0) continue;
      const risiko=ausfallRisiko(g,alter)*(1-0.45*q)*(x.wartungGekuendigt?2.5:1);
      if(!s.prognose && chance(itZufall(s,5000+i*100000+j),risiko)){
        if(id==='kasse'||id==='warenwirtschaft'||id==='ecommerce') stoerung(s,c,id==='kasse'?0.65:0.85);
        melde(s,'warnung',id==='kasse' ? 'Kassenausfall am Samstag in Cluster '+c.name+'. Umsatzausfälle durch gestörte Kassensysteme.' : SYSTEME[id].name+': Ausfall in Cluster '+c.name+'. Der operative Betrieb ist eingeschränkt.',{modul:'it'});
      }
      if(it.startprobleme[id+':'+c.id]>s.woche && !s.prognose) {
        if(chance(itZufall(s,9000+i*100000+j),0.22*(1-q*0.5))) stoerung(s,c,id==='kasse'?0.89:0.97);
      }
    }
    // Lieferantenkündigung erst für sehr alte Plattformen, selten und nicht beliebig wiederholbar.
    if(x.alter+s.woche/52>21 && !x.wartungGekuendigt && !s.prognose && chance(itZufall(s,19000+i),0.001)){
      x.wartungGekuendigt=true;melde(s,'warnung','Wartung für '+SYSTEME[id].name+' wurde vom Lieferanten abgekündigt.',{modul:'it'});
    }
  }
  if(!s.prognose && chance(itZufall(s,22001),0.0008*(1-0.7*q)*Math.max(0.4,1-0.1*generationInCluster(s,'datenplattform',clusters[0]?.id??'')))){
    // Selten, aber spürbar; gute IT und moderne Datenplattform mildern den Umsatzschaden.
    const f=1-0.10*(1-q*0.6);
    for(const c of clusters)stoerung(s,c,f);
    melde(s,'warnung','Cyberangriff auf die Unternehmenssysteme. IT und Datenplattform begrenzen den Schaden.',{modul:'it'});
  }
}
export function itHausFaktor(s: GameState, h: Haus): number {
  const it=s.it;
  if(!it)return 1;
  const id=it.hausCluster?.[h.id];
  if(!id)return it.umsatzFaktoren[h.id] ?? 1;
  // O03: Modernisierung fördert Kassenfluss, Kundenbindung und Bestandsverfügbarkeit.
  // Differenz zur Ausgangsgeneration sorgt für den neutralen Startwert von exakt 1.
  const kasse=Math.max(0,generationInCluster(s,'kasse',id)-SYSTEME.kasse.start);
  const app=Math.max(0,generationInCluster(s,'app',id)-SYSTEME.app.start);
  const ware=Math.max(0,generationInCluster(s,'warenwirtschaft',id)-SYSTEME.warenwirtschaft.start);
  const kAusbau=it.systeme.kasse.kasseAusbau;
  const qualitaet=1 + kasse*0.005 + app*0.004 + ware*0.002
    + (kasse>0 ? (kAusbau?.selbstbedienung??0)*0.002+(kAusbau?.mobil??0)*0.001 : 0);
  return qualitaet * (it.umsatzFaktoren[h.id] ?? 1);
}
export function itUebersicht(s: GameState) {
  const clusters=itCluster(s), it=s.it;
  const systeme=IT_IDS.map(id=>{
    const x=it?.systeme[id],g=x?.generation??SYSTEME[id].start,alter=itAlter(s,id);
    const verteilung=clusters.map(c=>({
      id:c.id,name:c.name,haeuser:c.hausIds.length,
      generation:generationInCluster(s,id,c.id),
      startproblemeBis:it?.startprobleme[id+':'+c.id],
    }));
    return {id,name:SYSTEME[id].name,generation:g,alter,
      kostenWoche:x?.kostenWoche??SYSTEME[id].kosten,
      risiko:ausfallRisiko(g,alter),wartungGekuendigt:x?.wartungGekuendigt??false,
      kasseAusbau:x?.kasseAusbau,verteilung};
  });
  return {
    woche:s.woche,qualitaet:qualitaet(s),systeme,
    projekte:(it?.projekte??[]).map(p=>({
      ...p, fortschritt: p.phase==='abgeschlossen'?1:
        clamp((p.phase==='konzept' ? p.konzeptWochen-p.phaseRest :
          p.phase==='umsetzung' ? p.konzeptWochen+p.umsetzungWochen-p.phaseRest :
          p.konzeptWochen+p.umsetzungWochen+p.erledigteCluster.length)/(p.konzeptWochen+p.umsetzungWochen+p.rolloutWochen),0,1),
    })),
    cluster:clusters.map(c=>({id:c.id,name:c.name,haeuser:c.hausIds.length})),
    betriebskostenWoche:systeme.reduce((a,x)=>a+x.kostenWoche,0),
  };
}
