// O08 Umbau: Etagen, neutrale Startlage, Kaufquote, Pflichtfristen und Modernisierungsprogramm.
import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';
import { umbauHaus, umbauSchaetzung, umbauUebersicht, umbauNachfrageFaktor, umbauWoche } from '../src/umbau';

describe('O08 Etagenmodernisierung',()=>{
  test.each([1,2,3])('Seed %i startet neutral und ohne Baustellen',seed=>{
    const s=neuesSpiel(seed);
    expect(umbauUebersicht(s).laufend).toHaveLength(0);
    for(const h of s.haeuser){
      expect(Object.keys(h.etagenBau??{})).toHaveLength(h.etagen.length);
      expect(h.umbauFrequenz??0).toBe(0);
      expect(h.etagen.every(n=>h.etagenBau![n].modernisierungWirkung===0)).toBe(true);
      expect(h.etagen.every(n=>!h.etagenBau![n].gesperrt)).toBe(true);
    }
    const erste=s.haeuser.find(x=>x.status==='offen')!;
    expect(umbauNachfrageFaktor(s,erste,erste.flaechen.find(f=>f.gruppe)?.gruppe??null)).toBe(1);
    const vor=JSON.stringify(umbauUebersicht(s).programm);
    expect(vor).toBe(JSON.stringify(umbauUebersicht(s).programm));
  });

  test('Auffrischung erhöht Substanz nach Fertigstellung, nicht vorher',()=>{
    const s=neuesSpiel(1), h=s.haeuser.find(x=>x.status==='offen')!, nr=h.etagen[0];
    const alt=h.etagenBau![nr].substanz;
    const p=umbauSchaetzung(s,h.id,nr,'auffrischung')!;
    expect(p.kosten).toBeGreaterThan(0);
    const r=fuehreAus(s,{typ:'umbauPlanen',haus:h.id,etage:nr,stufe:'auffrischung'});
    expect(r.ok).toBe(true);
    expect(h.etagenBau![nr].substanz).toBe(alt);
    const projekt=umbauUebersicht(s).laufend[0];
    s.woche=projekt.ende;umbauWoche(s);
    expect(h.etagenBau![nr].substanz).toBeGreaterThan(alt);
    expect(umbauUebersicht(s).laufend).toHaveLength(0);
  });

  test('Ladenbau neu verbessert Kaufquote ausschließlich der betreffenden Etage',()=>{
    const s=neuesSpiel(2), h=s.haeuser.find(x=>x.status==='offen'&&x.etagen.length>=3)!, nr=h.etagen[1];
    const g=h.flaechen.find(f=>f.etage===nr&&f.gruppe)?.gruppe!;
    expect(g).toBeDefined();
    const vorher=umbauNachfrageFaktor(s,h,g);
    const r=fuehreAus(s,{typ:'umbauPlanen',haus:h.id,etage:nr,stufe:'ladenbau'});
    expect(r.ok).toBe(true);
    expect(umbauNachfrageFaktor(s,h,g)).toBeLessThan(vorher);
    const projekt=umbauUebersicht(s).laufend[0];s.woche=projekt.ende;umbauWoche(s);
    expect(h.etagenBau![nr].moebelGeneration).toBe(3);
    expect(umbauNachfrageFaktor(s,h,g)).toBeGreaterThan(vorher);
    expect(umbauNachfrageFaktor(s,h,'does-not-exist' as never)).toBe(1);
  });

  test('Komplettumbau betrifft alle Etagen, erzeugt Frequenz- und Imageeffekt',()=>{
    const s=neuesSpiel(3),h=s.haeuser.find(x=>x.status==='offen'&&x.etagen.length>=3)!;
    const alt=s.stakeholder.image;
    expect(fuehreAus(s,{typ:'umbauPlanen',haus:h.id,etage:h.etagen[0],stufe:'komplett'}).ok).toBe(true);
    const p=umbauUebersicht(s).laufend[0];
    expect(p.etagen).toHaveLength(h.etagen.length);
    expect(fuehreAus(s,{typ:'umbauPlanen',haus:h.id,etage:h.etagen[1],stufe:'technik'}).ok).toBe(false);
    s.woche=p.ende;umbauWoche(s);
    expect(h.umbauFrequenz).toBeGreaterThan(0);
    expect(s.stakeholder.image).toBeGreaterThan(alt);
    expect(h.etagen.every(n=>h.etagenBau![n].moebelGeneration===3&&h.etagenBau![n].substanz===90)).toBe(true);
  });

  test('Überfällige Pflicht schließt Etage und Technik öffnet sie wieder',()=>{
    const s=neuesSpiel(1),h=s.haeuser.find(x=>x.status==='offen')!,nr=h.etagen[0];
    h.etagenBau![nr].pflichten.brandschutz=4;
    s.woche=5;umbauWoche(s);
    expect(h.etagenBau![nr].gesperrt).toBe(true);
    const r=fuehreAus(s,{typ:'umbauPlanen',haus:h.id,etage:nr,stufe:'technik'});
    expect(r.ok).toBe(true);
    const p=umbauUebersicht(s).laufend[0];s.woche=p.ende;umbauWoche(s);
    expect(h.etagenBau![nr].gesperrt).toBe(false);
    expect(h.etagenBau![nr].pflichten.brandschutz).toBeGreaterThan(s.woche);
  });

  test('Baukosten werden sofort gebucht; Jahresprogramm trägt Frist im Posteingang',()=>{
    const s=neuesSpiel(3),h=s.haeuser.find(x=>x.status==='offen')!;
    const cash=s.cash;
    const p=umbauSchaetzung(s,h.id,h.etagen[0],'auffrischung')!;
    fuehreAus(s,{typ:'umbauPlanen',haus:h.id,etage:h.etagen[0],stufe:'auffrischung'});
    expect(s.cash).toBe(cash-p.kosten);
    expect(umbauUebersicht(s).verbraucht).toBe(p.kosten);
    umbauWoche(s);
    expect(s.entscheidungen.some(e=>e.typ==='organisation_vorlage'&&e.daten.bereich==='ladenbau'&&e.frist>s.woche)).toBe(true);
  });
});
