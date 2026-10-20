import { neuesSpiel, fuehreAus, wocheAbspielen, BEREICHE, bereichsQualitaet,
  berichtetAn, hausclusterVon, hausclusterFaktor, clusterleitungQualitaet, organisationUebersicht } from '../src';
import { KOORDINATEN } from '../src/standorte';

describe('O01 Organisation', () => {
  test.each([1,2,3])('Deterministische geografische Cluster und neutrale Ausgangslage (Seed %s)', (seed) => {
    const a=neuesSpiel(seed), b=neuesSpiel(seed);
    expect(a.organisation).toEqual(b.organisation);
    const geo=a.organisation!.hauscluster.filter((c)=>!c.sonder);
    expect(geo.length).toBeGreaterThanOrEqual(15);
    const ids=geo.flatMap((c)=>c.hausIds);
    expect(ids.length).toBe(a.haeuser.filter((h)=>h.status==='offen').length);
    expect(new Set(ids).size).toBe(ids.length);
    for(const c of geo){
      expect(c.hausIds.length).toBeGreaterThanOrEqual(6);
      expect(c.hausIds.length).toBeLessThanOrEqual(12);
      for(const id of c.hausIds){
        const h=a.haeuser.find((h)=>h.id===id)!;
        expect(h.hauscluster).toBe(c.id);
        expect(h.region).toBe(c.region);
        expect(KOORDINATEN[h.stadt]).toBeDefined();
        expect(hausclusterFaktor(a,h)).toBe(1);
      }
      expect(clusterleitungQualitaet(a,c.id)).toBeGreaterThan(0);
    }
    const premium=a.haeuser.filter((h)=>h.klasse==='premium');
    for(const h of premium) expect(hausclusterVon(a,h.id)?.id).toBe('premium-flagships');
    expect(a.organisation!.hauscluster.find((c)=>c.sonder)?.hausIds.sort()).toEqual(premium.map((h)=>h.id).sort());
    expect(organisationUebersicht(a).bereiche).toHaveLength(BEREICHE.length);
    expect(a.organisation?.flagships).toEqual([]);
  });

  test('Flagships nur große Warenhäuser, Limit zwölf, Unruhe acht Wochen und geografisches Ranking bleibt bestehen', () => {
    const s=neuesSpiel(1);
    const h=s.haeuser.filter((x)=>x.format==='warenhaus'&&!x.klasse).sort((a,b)=>b.grundflaecheQm*b.etagen.length-a.grundflaecheQm*a.etagen.length)[0];
    const geo=h.hauscluster;
    const moral=h.personal.filialleiter.moral;
    expect(fuehreAus(s,{typ:'flagship',haus:h.id,an:true}).ok).toBe(true);
    expect(h.hauscluster).toBe(geo);
    expect(hausclusterVon(s,h.id)?.sonder).toBe(true);
    expect(h.personal.filialleiter.moral).toBe(moral-10);
    expect(s.organisation!.unruhe[h.id].bis).toBe(8);
    expect(fuehreAus(s,{typ:'flagship',haus:h.id,an:false}).ok).toBe(true);
    expect(hausclusterVon(s,h.id)?.id).toBe(geo);
    expect(s.organisation?.flagships).toHaveLength(0);
    expect(fuehreAus(s,{typ:'flagship',haus:s.haeuser.find((x)=>x.klasse==='premium')!.id,an:true}).ok).toBe(false);
    const nachGroesse=s.haeuser.filter((x)=>x.format==='warenhaus'&&!x.klasse)
      .sort((a,b)=>b.grundflaecheQm*b.etagen.length-a.grundflaecheQm*a.etagen.length);
    expect(fuehreAus(s,{typ:'flagship',haus:nachGroesse[nachGroesse.length-1].id,an:true}).ok).toBe(false);
  });

  test('Bereichs- und Clusterleitung, Kandidaten und Delegation', () => {
    const s=neuesSpiel(2), o=s.organisation!, id='merchandise_planning';
    const q=bereichsQualitaet(s,id);
    expect(berichtetAn(s,id)).toBe('cpo');
    expect(fuehreAus(s,{typ:'delegation',bereich:id,an:true}).ok).toBe(true);
    expect(o.bereiche[id].delegiert).toBe(true);
    expect(fuehreAus(s,{typ:'organisationEntlassen',ebene:'bereich',id}).ok).toBe(true);
    expect(bereichsQualitaet(s,id)).toBeLessThan(q);
    const k=o.bereiche[id].kandidaten[0];
    expect(fuehreAus(s,{typ:'organisationBesetzen',ebene:'bereich',id,kandidat:k.id}).ok).toBe(true);
    expect(o.bereiche[id].person?.name).toBe(k.name);
    expect(fuehreAus(s,{typ:'organisationHaltepraemie',ebene:'bereich',id,betrag:10000}).ok).toBe(true);
  });

  test('CPO entlassen: Einkaufsbereiche berichten einzeln; besetzen: Vorstand erhält Bündel', () => {
    const s=neuesSpiel(4), vorher=s.vorstand.ressorts.cpo.person!;
    expect(fuehreAus(s,{typ:'vorstandEntlassen',ressort:'cpo'}).ok).toBe(true);
    expect(berichtetAn(s,'einkauf_damen')).toBe('spieler');
    wocheAbspielen(s);
    const einkaufsbereiche=BEREICHE.filter((b)=>b.ressort==='cpo');
    const einzeln=s.entscheidungen.filter((e)=>e.typ==='organisation_vorlage'&&e.daten.bereich);
    expect(einzeln.filter((e)=>e.titel.includes('ohne CPO'))).toHaveLength(einkaufsbereiche.length);
    s.vorstand.ressorts.cpo.person=vorher; // Wiederbesetzung isoliert von Angebotswahrscheinlichkeit prüfen
    wocheAbspielen(s);
    expect(s.entscheidungen.some((e)=>e.typ==='organisation_vorlage'&&e.titel.includes('CPO: Vorlagen gebündelt'))).toBe(true);
    const vorlage=einzeln[0];
    for(let i=0;i<4;i++)wocheAbspielen(s);
    expect(s.entscheidungen.find((e)=>e.id===vorlage.id)).toBeUndefined();
    expect(s.entscheidungsprotokoll?.some((e)=>e.id===vorlage.id&&e.standard)).toBe(true);
  });

  test('Bestehende Vorstandsdelegationen bleiben in allen Ressorts kompatibel', () => {
    const s=neuesSpiel(1);
    expect(fuehreAus(s,{typ:'vorstandDelegation',ressort:'cpo',bereich:'freigaben',an:true}).ok).toBe(true);
    const einkauf=organisationUebersicht(s).bereiche.find((b)=>b.id==='merchandise_planning')!;
    expect(einkauf.delegiert).toBe(true);
    expect(fuehreAus(s,{typ:'delegation',bereich:'merchandise_planning',an:false}).ok).toBe(true);
    expect(s.vorstand.ressorts.cpo.delegation.freigaben).toBe(false);
    s.vorstand.ressorts.cro.delegation.mietverhandlungen=true;
    expect(organisationUebersicht(s).bereiche.find((b)=>b.id==='immobilien')?.delegiert).toBe(true);
  });

  test('Auch die Maßstab-Welt mit 560 Häusern bildet Cluster ohne harte Stadtgrenzen',()=>{
    const s=neuesSpiel(1,{warenhaeuser:500,sporthaeuser:60});
    const geo=s.organisation!.hauscluster.filter((c)=>!c.sonder);
    const ids=geo.flatMap((c)=>c.hausIds);
    expect(ids.length).toBe(560);
    expect(new Set(ids).size).toBe(560);
    for(const c of geo){
      expect(c.hausIds.length).toBeGreaterThanOrEqual(6);
      expect(c.hausIds.length).toBeLessThanOrEqual(12);
    }
  });

  test('Hausleitung wird befördert und die Stellvertretung übernimmt',()=>{
    const s=neuesSpiel(3), h=s.haeuser.find((h)=>h.personal.filialleiter.skill>=0.7 && h.status==='offen' && h.klasse!=='premium')!;
    const c=hausclusterVon(s,h.id)!;
    const n=h.personal.filialleiter.name;
    expect(fuehreAus(s,{typ:'organisationBefoerdern',haus:h.id,hauscluster:c.id}).ok).toBe(true);
    expect(c.stelle.person?.name).toBe(n);
    expect(h.personal.filialleiter.name).toContain('Stellvertretung');
  });
});
