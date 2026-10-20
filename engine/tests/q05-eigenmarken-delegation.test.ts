import { neuesSpiel, fuehreAus, wocheAbspielen, organisationUebersicht,
  BEREICHE, delegationsAufgaben, istAufgabeDelegiert, delegationsGrenze,
  neueVorlage, ARTIKELTYPEN, produktKatalog, ZUSATZ_ARTIKEL, eigenmarkenUebersicht,
  EM_VORLAGEN, eigenmarkeVorschau, produkte } from '../src';

describe('Q05: Delegation je Aufgabe', () => {
  test('Sammelschalter bleibt kompatibel; Einzelaufgaben überschreiben und können zurückgesetzt werden', () => {
    const s = neuesSpiel(1);
    expect(delegationsAufgaben('einkauf_damen').map((a) => a.id))
      .toEqual(expect.arrayContaining(['nachorder', 'limits', 'reduzierung', 'altware']));
    expect(fuehreAus(s, { typ: 'delegation', bereich: 'einkauf_damen', an: true }).ok).toBe(true);
    expect(istAufgabeDelegiert(s, 'nachorder', 'einkauf_damen')).toBe(true);
    expect(istAufgabeDelegiert(s, 'limits', 'einkauf_damen')).toBe(true);
    expect(fuehreAus(s, { typ: 'delegation', bereich: 'einkauf_damen', aufgabe: 'nachorder', an: false }).ok).toBe(true);
    expect(istAufgabeDelegiert(s, 'nachorder', 'einkauf_damen')).toBe(false);
    expect(istAufgabeDelegiert(s, 'limits', 'einkauf_damen')).toBe(true);
    expect(fuehreAus(s, { typ: 'delegation', bereich: 'einkauf_damen', an: true }).ok).toBe(true);
    expect(istAufgabeDelegiert(s, 'nachorder', 'einkauf_damen')).toBe(true);
    expect(fuehreAus(s, { typ: 'delegation', bereich: 'einkauf_damen', an: false }).ok).toBe(true);
    expect(istAufgabeDelegiert(s, 'limits', 'einkauf_damen')).toBe(false);
    const o = organisationUebersicht(s).bereiche.find((b) => b.id === 'einkauf_damen')!;
    expect(o.aufgaben).toHaveLength(4);
    expect(o.aufgaben.every((a) => !a.an)).toBe(true);
  });

  test('Cluster steuert Öffnungszeiten und Reparaturen unabhängig, Grenzen sind validiert', () => {
    const s = neuesSpiel(2), cluster = s.organisation!.hauscluster[0].id;
    expect(fuehreAus(s, { typ: 'delegation', hauscluster: cluster, aufgabe: 'reparaturen', an: true }).ok).toBe(true);
    expect(istAufgabeDelegiert(s, 'reparaturen', undefined, cluster)).toBe(true);
    expect(istAufgabeDelegiert(s, 'oeffnungszeiten', undefined, cluster)).toBe(false);
    expect(fuehreAus(s, { typ: 'delegationGrenze', hauscluster: cluster, aufgabe: 'reparaturen', betrag: 30000 }).ok).toBe(true);
    expect(delegationsGrenze(s, 'reparaturen', undefined, cluster)).toBe(30000);
    expect(fuehreAus(s, { typ: 'delegationGrenze', hauscluster: cluster, aufgabe: 'oeffnungszeiten', betrag: 30000 }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'delegation', bereich: 'einkauf_damen', aufgabe: 'unbekannt', an: true }).ok).toBe(false);
  });

  test('Aufgaben ohne Delegation erzeugen mehr Vorlagen als delegierte Aufgaben', () => {
    const s = neuesSpiel(3), id = 'marketing';
    expect(fuehreAus(s, { typ: 'delegation', bereich: id, aufgabe: 'aktionen', an: false }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'delegation', bereich: id, aufgabe: 'mailings', an: true }).ok).toBe(true);
    for (let i = 0; i < 9; i++) wocheAbspielen(s);
    const liste = s.entscheidungen.filter((e) => e.typ === 'organisation_vorlage' && e.daten.bereich === id);
    const aktionen = liste.filter((e) => e.daten.aufgabe === 'aktionen');
    const mailings = liste.filter((e) => e.daten.aufgabe === 'mailings');
    expect(aktionen.length).toBeGreaterThan(mailings.length);
    expect(aktionen.length).toBeGreaterThan(0);
  });

  test('Hohe Beträge gelangen trotz Delegation in den Posteingang; alte Spielstände benötigen keine neuen Felder', () => {
    const s = neuesSpiel(1), id = 'facility';
    expect(fuehreAus(s, { typ: 'delegation', bereich: id, aufgabe: 'reparaturen', an: true }).ok).toBe(true);
    const n = s.entscheidungen.length;
    neueVorlage(s, { bereich: id, aufgabe: 'reparaturen', betrag: 9000, titel: 'Kleinreparatur', text: 'Heizung' });
    expect(s.entscheidungen.length).toBe(n);
    neueVorlage(s, { bereich: id, aufgabe: 'reparaturen', betrag: 25000, titel: 'Großreparatur', text: 'Dach' });
    expect(s.entscheidungen.length).toBe(n + 1);
    delete s.organisation!.bereiche[id].aufgaben;
    delete s.organisation!.bereiche[id].grenzen;
    expect(istAufgabeDelegiert(s, 'reparaturen', id)).toBe(false);
    expect(BEREICHE.length).toBeGreaterThan(20);
  });
});

describe('Q05: Produktvielfalt und Eigenmarken', () => {
  test('Mindestens zwölf eigenständige Typen je Sparte, alle im Katalog und Saisons vorhanden', () => {
    const s = neuesSpiel(1);
    const k = produktKatalog(s);
    expect(k.sparten).toHaveLength(8);
    for (const sp of k.sparten) {
      expect(sp.typen.length).toBeGreaterThanOrEqual(12);
      expect(new Set(sp.typen).size).toBe(sp.typen.length);
      for (const typ of sp.typen) {
        expect(k.typen.find((t) => t.typ === typ)).toBeDefined();
        expect(ARTIKELTYPEN.find((t) => t.typ === typ)!.materialien.length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(Object.values(ZUSATZ_ARTIKEL).flat().length).toBeGreaterThanOrEqual(96);
    expect(k.farben.some((f) => f.name === 'mintgrün')).toBe(true);
    expect(k.materialien.some((m) => m.name === 'Kaschmir')).toBe(true);
    expect(k.preislagen).toHaveLength(3);
  });

  test('Neue Marke wird angelegt und der Produktentwicklung zugänglich; Aufbauzeit und Bekanntheit aus Engine', () => {
    const s = neuesSpiel(1);
    const v = EM_VORLAGEN.find((x) => x.titel === 'Young Adults')!;
    const entwurf = { ...v.entwurf, name: 'Jungwelle', farbe: '#2f63b5', budgetWoche: 15000,
      zielgruppe: { ...v.entwurf.zielgruppe },
      wgAnteile: Object.fromEntries(v.wgs.slice(0, 2).map((wg) => [wg, 0.15])) };
    const vors = eigenmarkeVorschau(s, entwurf);
    expect(vors.ok).toBe(true);
    expect(fuehreAus(s, { typ: 'eigenmarkeGruenden', entwurf }).ok).toBe(true);
    const m = s.eigenmarken.marken.find((q) => q.name === 'Jungwelle')!;
    expect(m.status).toBe('aufbau');
    expect(m.bis).toBe(s.woche + vors.aufbauWochen);
    expect(m.bekanntheit).toBe(10);
    expect(eigenmarkenUebersicht(s).marken.some((q) => q.id === m.id)).toBe(true);
    wocheAbspielen(s);
    expect(produkte(s).marken.some((q) => q.marke === m.id && q.produkte.length > 0)).toBe(true);
    expect(produkte(s).marken.find((q) => q.marke === m.id)!.kategorien.length).toBeGreaterThan(0);
  });
});
