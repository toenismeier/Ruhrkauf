// O07 Haus: neutraler Start, ehrliche/unehrliche Kommentare, Kosten, Gastronomie und Vertragsgrenzen.
import { neuesSpiel, fuehreAus, wocheAbspielen } from '../src';
import type { GameState, Haus } from '../src';
import {
  hausBetriebsFaktor, hausBetriebskosten, hausGastroErgebnis, hausKundenscore, hausAbschluss,
  hausStandard, initialisiereHausbetrieb, hausBeobachtung, hausKundenRanking, hausKandidaten,
} from '../src/haus';

function ersterBetrieb(s: GameState): Haus {
  return s.haeuser.find((h) => h.status === 'offen' && (h.betrieb?.restaurantQm ?? 0) > 0)!;
}
function kommentiere(s: GameState, h: Haus): void {
  s.woche = 52;
  // Der aufrufende Test bestimmt die Prüfqualität.
  h.personal.filialleiter.ehrlichkeit = 0;
  h.betrieb!.umsatzHistorie.push({ woche: 0, umsatz: 100_000 });
  h.kpi = {
    woche: 52, umsatz: 80_000, rohertrag: 30_000, konzessionserloes: 0,
    untermiete: 0, personal: 10_000, miete: 3_000, nebenkosten: 2_000,
    sonstige: 1_000, db: 14_000, fteBedarf: 100, fteIst: 70, umsatzJeGruppe: {},
  };
  hausAbschluss(s);
}

describe('O07 Haus als Betrieb', () => {
  test('alle Häuser haben Leiterprofile und Betriebszustände ohne neue Haupt-RNG-Ziehung', () => {
    const s = neuesSpiel(1);
    expect(s.hausbetrieb).toBeDefined();
    for (const h of s.haeuser) {
      expect(h.betrieb).toBeDefined();
      const l = h.personal.filialleiter;
      expect(l.staerken).toBeDefined();
      expect(l.skill).toBeCloseTo(Object.values(l.staerken!).reduce((a,b)=>a+b,0)/4, 10);
      expect(l.ehrlichkeit).toBeGreaterThanOrEqual(0);
      expect(l.ehrlichkeit).toBeLessThanOrEqual(1);
      expect(Number.isInteger(l.gehalt)).toBe(true);
      expect(hausBetriebsFaktor(s, h)).toBeCloseTo(1, 12);
      expect(hausBetriebskosten(s,h,100_000)).toBeCloseTo(100_000, 6);
    }
  });
  test('Initialisierung alter Spielstände idempotent', () => {
    const s = neuesSpiel(2);
    const alte = JSON.stringify(s.hausbetrieb);
    initialisiereHausbetrieb(s);
    expect(JSON.stringify(s.hausbetrieb)).toBe(alte);
  });
  test('neue Haushebel verändern Umsatz erst nach Aktion, nicht beim Start', () => {
    const a=neuesSpiel(3), b=neuesSpiel(3);
    const h=a.haeuser[0], ha=b.haeuser[0];
    expect(hausBetriebsFaktor(a,h)).toBe(hausBetriebsFaktor(b,ha));
    expect(fuehreAus(a,{typ:'hausLeitungFoerdern',haus:h.id,staerke:'kunde'}).ok).toBe(true);
    expect(hausBetriebsFaktor(a,h)).toBeGreaterThan(hausBetriebsFaktor(b,ha));
  });
  test('unehrliche Leitung mit internem Treiber meldet externen Grund', () => {
    const s=neuesSpiel(7), h=s.haeuser[0];
    s.controllingStufe = 2;
    kommentiere(s,h);
    const c=h.betrieb!.kommentare[0];
    expect(c.wahrerGrund).toBe('personal');
    expect(['wetter','baustelle']).toContain(c.grund);
    expect(c.abweichung).toBeCloseTo(-0.2);
    expect(c.vergleich).toBe('vorjahr');
  });
  test('gutes Vertriebscontrolling deckt falsche Kommentare häufiger auf', () => {
    let niedrig = 0, hoch = 0;
    for (let seed=1; seed<=40; seed++) {
      const gut=neuesSpiel(seed), schwach=neuesSpiel(seed);
      gut.controllingStufe=2;
      schwach.controllingStufe=0;
      kommentiere(gut,gut.haeuser[0]);
      kommentiere(schwach,schwach.haeuser[0]);
      const a=gut.haeuser[0].betrieb!.kommentare[0];
      const b=schwach.haeuser[0].betrieb!.kommentare[0];
      expect(a.grund).toBe(b.grund);
      if(!a.plausibel) hoch++;
      if(!b.plausibel) niedrig++;
    }
    expect(hoch).toBeGreaterThan(niedrig);
    expect(hoch).toBeGreaterThan(0);
  });
  test('Kürzung Reinigung senkt den Mystery-Shopping-Kundenscore', () => {
    const s=neuesSpiel(4), h=s.haeuser[0];
    const vor=hausKundenscore(s,h);
    expect(fuehreAus(s,{typ:'hausKostenSetzen',haus:h.id,posten:'reinigung',faktor:0.6}).ok).toBe(true);
    expect(hausKundenscore(s,h)).toBeLessThan(vor);
    expect(hausBetriebskosten(s,h,100_000)).toBeLessThan(100_000);
  });
  test('Gastronomie Eigenbetrieb und Pacht buchen unterschiedliche Erlöse und Kosten', () => {
    const s=neuesSpiel(5), h=ersterBetrieb(s);
    const start=hausGastroErgebnis(s,h,400_000);
    expect(start).toEqual({umsatz:0,rohertrag:0,personal:0,sonstige:0,pacht:0});
    expect(fuehreAus(s,{typ:'hausGastronomie',haus:h.id,modus:'selbst'}).ok).toBe(true);
    const selbst=hausGastroErgebnis(s,h,400_000);
    expect(selbst.umsatz).toBeGreaterThan(0);
    expect(selbst.rohertrag).toBeGreaterThan(selbst.personal+selbst.sonstige);
    expect(selbst.pacht).toBe(0);
    expect(fuehreAus(s,{typ:'hausGastronomie',haus:h.id,modus:'pacht'}).ok).toBe(false);
    s.woche=h.betrieb!.gastroVertragBis;
    expect(fuehreAus(s,{typ:'hausGastronomie',haus:h.id,modus:'pacht'}).ok).toBe(true);
    const pacht=hausGastroErgebnis(s,h,400_000);
    expect(pacht.pacht).toBeGreaterThan(0);
    expect(pacht.umsatz).toBe(0);
    expect(pacht.personal).toBe(0);
  });
  test('Hausstandard gilt je Cluster und Einzelabweichung benötigt eine Begründung',()=>{
    const s=neuesSpiel(8), h=s.haeuser.find(x=>x.klasse!=='premium')!, cluster=h.region;
    const start=hausStandard(s,h).sauberkeit;
    expect(fuehreAus(s,{typ:'hausStandardSetzen',cluster,feld:'sauberkeit',wert:3}).ok).toBe(true);
    expect(hausStandard(s,h).sauberkeit).toBe(3);
    expect(fuehreAus(s,{typ:'hausStandardSetzen',haus:h.id,cluster,feld:'sauberkeit',wert:1}).ok).toBe(false);
    expect(hausStandard(s,h).sauberkeit).toBe(3);
    expect(fuehreAus(s,{typ:'hausStandardSetzen',haus:h.id,cluster,feld:'sauberkeit',wert:1,begruendung:'Lokale Reinigungslage'}).ok).toBe(true);
    expect(hausStandard(s,h).sauberkeit).toBe(1);
    expect(hausStandard(s,s.haeuser.find(x=>x.region===h.region && x.id!==h.id && x.klasse!=='premium')!).sauberkeit).toBe(3);
    expect(start).toBe(2);
  });
  test('Beobachtung, Kandidaten und Kundenscore sind deterministisch',()=>{
    const a=neuesSpiel(11),b=neuesSpiel(11);
    expect(hausKandidaten(a,a.haeuser[0].id)).toEqual(hausKandidaten(b,b.haeuser[0].id));
    expect(hausKundenRanking(a)).toEqual(hausKundenRanking(b));
    expect(hausBeobachtung(a)).toEqual(hausBeobachtung(b));
  });
  test('Simulation bleibt mit Hausbetrieb deterministisch',()=>{
    const a=neuesSpiel(15),b=neuesSpiel(15);
    for(let i=0;i<8;i++){
      expect(wocheAbspielen(a)).toEqual(wocheAbspielen(b));
    }
  });
});
