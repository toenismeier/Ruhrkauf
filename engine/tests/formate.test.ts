import { neuesSpiel, wocheAbspielen, fuehreAus, outletUebersicht, schwesterUebersicht, outletKandidaten } from '../src';
import { outletVersorgung } from '../src/einkauf';
import { formateProjekteWoche, formateZufall } from '../src/formate';

jest.setTimeout(120_000);

describe('Engine-Formate Volkskauf und FUNDUS', () => {
  test('561 Häuser, 86 aktive Volkskauf und 66 aktive FUNDUS mit Filial-GuV',()=>{
    const s=neuesSpiel(1);
    expect(s.haeuser).toHaveLength(561);
    expect(s.haeuser.filter(h=>h.format==='schwester'&&!h.nurDaten)).toHaveLength(86);
    expect(s.haeuser.filter(h=>h.format==='outlet'&&!h.nurDaten)).toHaveLength(66);
    expect(s.haeuser.filter(h=>h.format==='outlet').every(h=>h.flaechen.every(f=>f.konzept==='offprice'))).toBe(true);
    wocheAbspielen(s);
    expect(s.haeuser.find(h=>h.format==='schwester')?.kpi?.guv).toBeDefined();
    expect(s.haeuser.find(h=>h.format==='outlet')?.kpi?.guv).toBeDefined();
    expect(schwesterUebersicht(s).haeuser).toBe(86);
    expect(outletUebersicht(s).haeuser).toBe(66);
  });
  test('Altwarequote null sperrt Transfer, volle Quote speist den Pool',()=>{
    const s=neuesSpiel(1);
    s.bestand.push({gruppe:'damen',wert:100_000,alter:80,saisonAnteil:1,kostenFaktor:1,art:'saison',ladenhueter:true});
    expect(fuehreAus(s,{typ:'altwareOutlet',quote:0}).ok).toBe(true);
    expect(outletVersorgung(s)).toBe(0);
    expect(s.formate?.altwareEingang).toBe(0);
    expect(fuehreAus(s,{typ:'altwareOutlet',quote:1}).ok).toBe(true);
    expect(outletVersorgung(s)).toBeGreaterThan(0);
    expect(s.formate?.pool.some(p=>p.quelle==='altware')).toBe(true);
  });
  test('Markenposten-Zukaufbudget ist validiert und wird gebucht',()=>{
    const s=neuesSpiel(1);
    expect(fuehreAus(s,{typ:'offpriceZukauf',budget:-1}).ok).toBe(false);
    expect(fuehreAus(s,{typ:'offpriceZukauf',budget:1_000_000}).ok).toBe(true);
    wocheAbspielen(s);
    expect(s.formate?.zukaufWoche).toBe(1_000_000);
  });
  test('Umflaggen setzt Immobilienkompetenz voraus und kostet 180 Euro je Quadratmeter',()=>{
    const s=neuesSpiel(1);
    const h=s.haeuser.find(h=>h.format==='schwester')!;
    const abteilung=s.hq.abteilungen.find(a=>a.id==='immobilien')!;
    abteilung.stufe=0;
    expect(fuehreAus(s,{typ:'schwesterUmflaggen',haus:h.id}).ok).toBe(false);
    abteilung.stufe=1;
    const cash=s.cash;
    const qm=h.flaechen.filter(f=>f.konzept!=='leer'&&f.konzept!=='untermiete').reduce((n,f)=>n+f.qm,0);
    expect(fuehreAus(s,{typ:'schwesterUmflaggen',haus:h.id}).ok).toBe(true);
    expect(s.cash).toBe(cash-qm*180);
    const p=s.formate!.projekte.find(p=>p.haus===h.id)!;
    expect(p.bis-p.start).toBeGreaterThanOrEqual(20);
    expect(p.bis-p.start).toBeLessThanOrEqual(30);
    s.woche=p.bis;formateProjekteWoche(s);
    expect(h.format).toBe('warenhaus');
  });
  test('Verkauf der gesamten Volkskauf-Kette bucht den Kaufpreis',()=>{
    const s=neuesSpiel(1);
    s.angebote.push({id:'invest-volkskauf',woche:0,status:'offen',typ:'kettenverkauf',frist:10,titel:'Investor',text:'Kaufangebot',kaufpreis:50_000_000});
    const cash=s.cash;
    expect(fuehreAus(s,{typ:'angebotAnnehmen',angebot:'invest-volkskauf'}).ok).toBe(true);
    expect(s.haeuser.filter(h=>h.format==='schwester').every(h=>h.status==='verkauft')).toBe(true);
    expect(s.cash).toBe(cash+50_000_000);
  });
  test('Neue FUNDUS-Kandidaten sind unbesetzte Städte',()=>{
    const s=neuesSpiel(1);
    for(const k of outletKandidaten(s))expect(s.haeuser.some(h=>h.stadt===k.stadt&&h.format==='outlet')).toBe(false);
  });
  test('Format-Zufallsfolge ist vom Haupt-RNG getrennt',()=>{
    const a=neuesSpiel(1),b=neuesSpiel(1),vorher=a.rng;
    for(let i=0;i<100;i++)formateZufall(a,0.2);
    expect(a.rng).toBe(vorher);
    expect(a.formateRng).not.toBe(b.formateRng);
  });
});
