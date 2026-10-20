import { fuehreAus, neuesSpiel, premiumUebersicht, wocheAbspielen } from '../src';
import type { GameState } from '../src';
import { eroeffneInsolvenz } from '../src/prozesse';
import { premiumAngebote } from '../src/premium';
import { botTief } from '../scripts/bot';

const HAUS=[
 ['P001','Palais Hartwig','Berlin',0.11],
 ['P002','Hartwig am Hofgarten','München',0.11],
 ['P003','Alsterhaus Hartwig','Hamburg',0.09],
 ['P004','Hartwig Königsallee','Düsseldorf',0.06],
] as const;
const premium=(s:GameState)=>s.haeuser.filter(h=>h.klasse==='premium');

describe('Kronjuwelen: Struktur und Zustände',()=>{
 test.each([1,2,3])('Seed %d hat genau vier Trophy Stores ohne neue Formate oder IDs',seed=>{
  const s=neuesSpiel(seed);
  expect(s.haeuser.length).toBeGreaterThanOrEqual(180);
  expect(premium(s)).toHaveLength(4);
  for(const [schluessel,name,stadt] of HAUS){
   const p=premium(s).find(h=>h.premiumSchluessel===schluessel);
   expect(p).toBeDefined();
   expect(p?.name).toBe(name);
   expect(p?.stadt).toBe(stadt);
   expect(p?.format).toBe('warenhaus');
   expect(p?.id).toMatch(/^(W|P)/);
   expect(p?.premiumImage).toBe(80);
  }
 });
 test('Bot C schließt beim Sanierungsplan kein Premiumhaus',()=>{
  for(const seed of [1,2,3]){
   const s=neuesSpiel(seed);
   for(let w=0;w<5;w++){botTief(s);wocheAbspielen(s);}
   expect(premium(s)).toHaveLength(4);
   expect(premium(s).every(h=>h.status==='offen')).toBe(true);
  }
 });
 test('Seed 1: bestehende Standorte werden umgewidmet',()=>{
  const s=neuesSpiel(1);
  if (s.haeuser.length === 180) expect(Object.fromEntries(premium(s).map(h=>[h.premiumSchluessel,h.id]))).toEqual({
   P001:'W003',P002:'W009',P003:'W006',P004:'W016',
  });
  else expect(premium(s).map(h=>h.id).length).toBe(4);
 });
 test('Globale Rabattaktion schützt Premium, ein explizit gewähltes Haus nicht',()=>{
  const s=neuesSpiel(1),h=premium(s)[0];
  s.marketing.aktionen=[];s.marketing.stand.referenz=[];
  expect(fuehreAus(s,{typ:'aktion',name:'Rabatt überall',rabatt:0.3,wochen:3,scope:{typ:'alle'}}).ok).toBe(true);
  wocheAbspielen(s);
  expect(h.premiumImage).toBeGreaterThanOrEqual(80);
  expect(fuehreAus(s,{typ:'premiumSchuetzen',an:false}).ok).toBe(true);
  wocheAbspielen(s);
  expect(h.premiumImage).toBeLessThan(80);
 });
 test('26-Wochen-Investition kostet Cash und verbessert Premium-Image und Substanz',()=>{
  const s=neuesSpiel(1),h=premium(s)[0];
  s.cash=5_000_000_000;
  h.substanz=60;h.premiumImage=65;
  const cash=s.cash;
  expect(fuehreAus(s,{typ:'premiumInvestition',haus:h.id,betrag:5_000_000}).ok).toBe(true);
  expect(s.cash).toBe(cash-5_000_000);
  // Parallele Aufträge dürfen die erste Investition nicht stillschweigend überschreiben.
  expect(fuehreAus(s,{typ:'premiumInvestition',haus:h.id,betrag:2_000_000}).ok).toBe(false);
  expect(s.cash).toBe(cash-5_000_000);
  for(let i=0;i<26;i++)wocheAbspielen(s);
  expect(h.substanz).toBeGreaterThan(60);
  expect(h.premiumImage).toBeGreaterThan(65);
 });
 test.each([1,2,3])('Seed %d: Premium-Angebote isolieren Zufallsstrom und Spiel-ID-Zähler',seed=>{
  const s=neuesSpiel(seed);
  eroeffneInsolvenz(s,'Angebots-ID-Prüfung');
  const rng=s.rng, zaehler=s.zaehler;
  premiumAngebote(s);
  expect(s.rng).toBe(rng);
  expect(s.zaehler).toBe(zaehler);
  const angebote=s.angebote.filter(a=>a.typ==='premiumVerkauf');
  expect(angebote).toHaveLength(4);
  expect(new Set(angebote.map(a=>a.id)).size).toBe(4);
  premiumAngebote(s);
  expect(s.angebote.filter(a=>a.typ==='premiumVerkauf')).toHaveLength(4);
  expect(s.rng).toBe(rng);
  expect(s.zaehler).toBe(zaehler);
 });
 test('Premium-Verkauf nur in Insolvenz, Verhandlung einmal, cashwirksam und aus Portfolio entfernt',()=>{
  const s=neuesSpiel(1);
  eroeffneInsolvenz(s,'Test');
  wocheAbspielen(s);
  const a=s.angebote.find(a=>a.typ==='premiumVerkauf'&&a.wunschHaeuser?.[0]===premium(s)[0].id);
  expect(a).toBeDefined();
  const alt=a!.kaufpreis!;
  expect(fuehreAus(s,{typ:'angebotVerhandeln',angebot:a!.id,haeuser:[]}).ok).toBe(true);
  expect(a!.kaufpreis).toBeGreaterThan(alt);
  const cash=s.cash, image=s.stakeholder.image;
  expect(fuehreAus(s,{typ:'angebotAnnehmen',angebot:a!.id}).ok).toBe(true);
  expect(s.cash).toBe(cash+a!.kaufpreis!);
  expect(s.stakeholder.image).toBeLessThan(image);
  expect(s.haeuser.find(h=>h.id===a!.wunschHaeuser![0])?.status).toBe('verkauft');
  expect(premiumUebersicht(s).find(h=>h.id===a!.wunschHaeuser![0])?.eigentuemer).toBeTruthy();
 });
});

describe('Ein-Jahres-Kalibrierung',()=>{
 test.each([1,2,3])('Seed %d: Umsatzabweichung Konzern zum unveränderten Szenario <=1,5 %',seed=>{
  const basis=neuesSpiel(seed,{premiumDeaktiviert:true});
  const ist=neuesSpiel(seed);
  // Finanzierung und Wettbewerb für beide Probeläufe identisch halten.
  for(const s of [basis,ist]){s.cash=5_000_000_000;s.wettbewerbEreignisseDeaktiviert=true;}
  let alt=0,neu=0;
  for(let w=0;w<52;w++){
   alt+=wocheAbspielen(basis).umsatz;
   neu+=wocheAbspielen(ist).umsatz;
  }
  expect(Math.abs(neu/alt-1)).toBeLessThanOrEqual(0.015);
 });
 test.each([1,2,3])('Seed %d: operative Premium-Margen und Rangfolge',seed=>{
  const s=neuesSpiel(seed);
  s.cash=5_000_000_000;s.wettbewerbEreignisseDeaktiviert=true;
  const werte=new Map<string,{u:number;db:number}>();
  for(let w=0;w<52;w++){
   wocheAbspielen(s);
   for(const h of premium(s)){
    const a=werte.get(h.premiumSchluessel!)??{u:0,db:0};
    a.u+=h.kpi?.umsatz??0;a.db+=h.kpi?.db??0;werte.set(h.premiumSchluessel!,a);
   }
  }
  for(const [id,,,ziel] of HAUS){
   const a=werte.get(id)!;
   expect(a.u).toBeGreaterThan(0);
   expect(Math.abs(a.db/a.u-ziel)).toBeLessThanOrEqual(0.02);
  }
 });
});
