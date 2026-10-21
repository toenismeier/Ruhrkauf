import { fuehreAus, neuesSpiel, premiumUebersicht, wocheAbspielen } from '../src';
import type { GameState } from '../src';
import { eroeffneInsolvenz } from '../src/prozesse';
import { premiumAngebote } from '../src/premium';
import { botTief } from '../scripts/bot';

const HAUS=[
 // #7 (Ummo 21.10.2026): Premium klar besser als der Schnitt (Filialebene −1,2 %), Ziel etwa +4 bis +6 %.
 ['P001','Palais Hartwig','Berlin',0.05],
 ['P002','Hartwig am Hofgarten','München',0.05],
 ['P003','Hartwig am Jungfernstieg','Hamburg',0.045],
 ['P004','Hartwig am Heine-Platz','Düsseldorf',0.035],
 ['P005','Hartwig Leipziger Platz','Berlin',0.045],
] as const;
const premium=(s:GameState)=>s.haeuser.filter(h=>h.klasse==='premium');

describe('Kronjuwelen: Struktur und Zustände',()=>{
 test.each([1,2,3])('Seed %d hat genau fünf Trophy Stores ohne neue Formate oder IDs',seed=>{
  const s=neuesSpiel(seed);
  expect(s.haeuser.length).toBeGreaterThanOrEqual(180);
  expect(premium(s)).toHaveLength(5);
  for(const [schluessel,name,stadt] of HAUS){
   const p=premium(s).find(h=>h.premiumSchluessel===schluessel);
   expect(p).toBeDefined();
   expect(p?.name).toBe(name);
   expect(p?.stadt).toBe(stadt);
   expect(p?.format).toBe('warenhaus');
   expect(p?.id).toMatch(/^(W|P)/);
   expect(p?.premiumImage).toBe(80);
   const flaeche = { P001:30_000, P002:30_000, P003:18_000, P004:14_000, P005:20_000 }[schluessel];
   const geschosse = { P001:6, P002:6, P003:5, P004:5, P005:5 }[schluessel];
   expect(p?.flaechen.reduce((sum, f) => sum + f.qm, 0)).toBe(flaeche);
   expect(p?.etagen).toHaveLength(geschosse);
   expect(p!.grundflaecheQm * geschosse).toBe(flaeche);
   expect(p?.flaechen.every(f => p!.etagen.includes(f.etage) && f.qm > 0)).toBe(true);
  }
 });
 test.each([1,2,3])('Seed %d: der Anfangsumsatz folgt Fläche und Premiumrang, nicht dem Zufallshaus',seed=>{
  const s=neuesSpiel(seed);
  const ertrag=(id:string)=>{
   const h=premium(s).find(h=>h.premiumSchluessel===id)!;
   return Object.entries(h.potenzial).reduce((sum,[g,p])=>{
    const qm=h.flaechen.filter(f=>f.gruppe===g&&f.konzept==='eigen').reduce((a,f)=>a+f.qm,0);
    return sum+(p??0)*(1-Math.exp(-qm/Math.max(1,h.saettigungQm[g as keyof typeof h.saettigungQm]??1)));
   },0);
  };
  // #7: Die Premiumklasse wird gemeinsam auf das Konzernziel normiert (ein Faktor
  // für alle fünf Häuser); das Verhältnis folgt weiter Fläche und Premiumrang.
  const basis=ertrag('P001')/(30_000*1.55);
  expect(ertrag('P002')/(30_000*1.55)/basis).toBeCloseTo(1,6);
  expect(ertrag('P003')/(18_000*1.52)/basis).toBeCloseTo(1,6);
  expect(ertrag('P004')/(14_000*1.45)/basis).toBeCloseTo(1,6);
  expect(ertrag('P005')/(20_000*1.52)/basis).toBeCloseTo(1,6);
 });
 test('P005 behält die anderen Standorte und deren Zufallsstammdaten unverändert',()=>{
  for (const seed of [1,2,3]){
   const ohneFuenftes=neuesSpiel(seed,{premiumhaeuser:4});
   const mitFuenftem=neuesSpiel(seed);
   expect(premium(ohneFuenftes).map(h=>h.premiumSchluessel)).toEqual(['P001','P002','P003','P004']);
   expect(premium(mitFuenftem).filter(h=>h.stadt==='Berlin').map(h=>h.premiumSchluessel))
    .toEqual(['P001','P005']);
   const signatur=(s:GameState)=>s.haeuser.filter(h=>h.klasse!=='premium')
    .map(h=>[h.id,h.stadt,h.baujahr,h.fassade,h.grundflaecheQm,h.flaechen.length]);
   expect(signatur(mitFuenftem)).toEqual(signatur(ohneFuenftes));
  }
 });
 test('Bot C schließt beim Sanierungsplan kein Premiumhaus',()=>{
  for(const seed of [1,2,3]){
   const s=neuesSpiel(seed);
   for(let w=0;w<5;w++){botTief(s);wocheAbspielen(s);}
   expect(premium(s)).toHaveLength(5);
   expect(premium(s).every(h=>h.status==='offen')).toBe(true);
  }
 });
 test('Seed 1: bestehende Standorte werden umgewidmet',()=>{
  const s=neuesSpiel(1);
  if (s.haeuser.length === 180) expect(Object.fromEntries(premium(s).map(h=>[h.premiumSchluessel,h.id]))).toEqual({
   P001:'W003',P002:'W009',P003:'W006',P004:'W016',
  });
  else expect(Object.fromEntries(premium(s).map(h=>[h.premiumSchluessel,h.id]))).toEqual({
   P001:'W361',P002:'W362',P003:'W363',P004:'W364',P005:'W365',
  });
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
  expect(angebote).toHaveLength(5);
  expect(new Set(angebote.map(a=>a.id)).size).toBe(4);
  premiumAngebote(s);
  expect(s.angebote.filter(a=>a.typ==='premiumVerkauf')).toHaveLength(5);
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
 // #7: Premiumhäuser sind zusätzliche Standorte des Ruhrkauf-Maßstabs (keine Umwidmung).
 // Ihr Bau verbraucht Zufallszahlen der Weltgenerierung; eine Welt ohne Premium ist daher
 // eine andere Welt und kein Umsatzvergleich mehr. Geprüft wird die Struktur.
 test.each([1,2,3])('Seed %d: ohne Premium bleiben alle übrigen Formate vollständig',seed=>{
  const basis=neuesSpiel(seed,{premiumDeaktiviert:true});
  const ist=neuesSpiel(seed);
  expect(premium(basis)).toHaveLength(0);
  const zahl=(s:GameState,f:string)=>s.haeuser.filter(h=>h.format===f&&h.klasse!=='premium').length;
  for(const f of ['warenhaus','sport','schwester','outlet']) expect(zahl(basis,f)).toBe(zahl(ist,f));
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
  // Ummo 21.10.2026: Premium klar besser als der Schnitt (Filialebene Referenz −1,2 %).
  const quoten=HAUS.map(([id])=>{const a=werte.get(id)!;expect(a.u).toBeGreaterThan(0);return a.db/a.u;});
  for(const q of quoten) expect(q).toBeGreaterThan(0.01);
  expect(quoten.reduce((a,q)=>a+q,0)/quoten.length).toBeGreaterThan(0.03);
  // Nachfrage-/Umsatz-Rangfolge ist Teil der Abnahme, zusätzlich zur Margenrangfolge.
  const u=(id:string)=>werte.get(id)!.u;
  expect(Math.min(u('P001'),u('P002'))).toBeGreaterThan(u('P003'));
  expect(u('P003')).toBeGreaterThan(u('P004'));
  expect(u('P005')).toBeGreaterThan(u('P003'));
  expect(Math.min(u('P001'),u('P002'))).toBeGreaterThan(u('P005'));
 });
});
