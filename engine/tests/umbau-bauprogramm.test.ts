// E48 Bauprogramm: Gewerke, mehrere Cluster, Wellen, Bestandsübersicht, Vorher/Nachher.
import { fuehreAus, neuesSpiel, wocheAbspielen } from '../src';
import { bestandUebersicht, bestandCluster, bauprogrammSchaetzung, gewerkSchaetzung, umbauVorherNachher, GEWERKE } from '../src/umbau';

describe('E48 Bauprogramm', () => {
  test('Startlage: Budget gesetzt, Übersicht je Cluster vollständig', () => {
    const s = neuesSpiel(1);
    const u = bestandUebersicht(s);
    expect(u.budget).toBeGreaterThan(0);
    expect(u.cluster.length).toBeGreaterThan(20);
    expect(u.cluster.reduce((a, c) => a + c.haeuser, 0)).toBeGreaterThanOrEqual(u.gesamt.haeuser);
    for (const g of ['technik', 'moebel', 'oberflaeche', 'fassade'] as const) {
      expect(u.gesamt.gut[g]).toBeGreaterThanOrEqual(0);
      expect(u.gesamt.gut[g]).toBeLessThanOrEqual(100);
    }
    expect(u.programme).toHaveLength(0);
  });

  test('Einzelgewerk: Fassade gilt fürs ganze Haus, Möbel nur für die Etage', () => {
    const s = neuesSpiel(1);
    const h = s.haeuser.find((x) => x.status === 'offen' && x.etagen.length >= 3)!;
    expect(gewerkSchaetzung(s, h.id, h.etagen[1], 'moebel')!.etagen).toEqual([h.etagen[1]]);
    expect(gewerkSchaetzung(s, h.id, h.etagen[1], 'fassade')!.etagen).toEqual(h.etagen);
    const r = fuehreAus(s, { typ: 'umbauPlanen', haus: h.id, etage: h.etagen[1], stufe: 'ladenbau', gewerk: 'licht' });
    expect(r.ok).toBe(true);
    const p = s.umbau!.projekte.at(-1)!;
    expect(p.gewerk).toBe('licht');
    for (let i = 0; i < 12 && p.status === 'laufend'; i++) wocheAbspielen(s);
    expect(p.status).toBe('abgeschlossen');
    expect(h.etagenBau![h.etagen[1]].technik.licht).toBe(2);
    const v = umbauVorherNachher(s, p.id)!;
    expect(v.projekt.vorher![h.etagen[1]].licht).toBeLessThanOrEqual(v.projekt.nachher![h.etagen[1]].licht);
  });

  test('Programm über mehrere Cluster hält die Zahl gleichzeitiger Baustellen und hebt den Bestand', () => {
    const s = neuesSpiel(2);
    const u = bestandUebersicht(s);
    const cluster = u.cluster.filter((c) => !c.sonder).slice(0, 3).map((c) => c.id);
    const auftrag = { cluster, gewerk: 'moebel' as const, bisZustand: 0 as const, parallel: 4 };
    const v = bauprogrammSchaetzung(s, auftrag);
    expect(v.auftraege).toBeGreaterThan(4);
    expect(v.wochen).toBeGreaterThan(GEWERKE.moebel.min);
    const vorher = cluster.map((id) => u.cluster.find((c) => c.id === id)!.gut.moebel);
    expect(fuehreAus(s, { typ: 'bauprogrammStarten', auftrag }).ok).toBe(true);
    for (let i = 0; i < 20; i++) {
      wocheAbspielen(s);
      const laufend = s.umbau!.projekte.filter((p) => p.programm && p.status === 'laufend');
      expect(laufend.length).toBeLessThanOrEqual(4);
      expect(new Set(laufend.map((p) => p.haus)).size).toBe(laufend.length);
    }
    const nachher = bestandUebersicht(s);
    expect(cluster.some((id, i) => nachher.cluster.find((c) => c.id === id)!.gut.moebel > vorher[i])).toBe(true);
    expect(bestandCluster(s, cluster[0])!.haeuser.length).toBeGreaterThan(0);
    const prog = nachher.programme[0];
    expect(fuehreAus(s, { typ: 'bauprogrammStoppen', id: prog.id }).ok).toBe(true);
    expect(bestandUebersicht(s).programme[0].status).toBe('gestoppt');
  });

  test('Ohne Programm bleibt der Spielverlauf unverändert (neutral)', () => {
    const a = neuesSpiel(3), b = neuesSpiel(3);
    bestandUebersicht(b);
    for (let i = 0; i < 6; i++) { wocheAbspielen(a); wocheAbspielen(b); }
    expect(b.cash).toBe(a.cash);
  });
});

describe('E49 Wirkung von Alter, Fristen und Gewerken', () => {
  test('Erstes Spieljahr neutral, danach kosten alte Möbel Kaufquote; Möbel neu holt sie zurück', () => {
    const s = neuesSpiel(1);
    const h = s.haeuser.find((x) => x.status === 'offen' && x.etagen.some((n) => x.etagenBau![n].moebelGeneration === 1))!;
    const nr = h.etagen.find((n) => h.etagenBau![n].moebelGeneration === 1)!;
    s.woche = 52; wocheAbspielen(s);
    expect(h.etagenBau![nr].malusMoebel ?? 0).toBeGreaterThan(0);
    for (const n of h.etagen) h.etagenBau![n].malusMoebel = 0.03;
    const vor = gewerkSchaetzung(s, h.id, nr, 'moebel')!.plusJahr;
    for (const n of h.etagen) h.etagenBau![n].malusMoebel = 0;
    expect(vor).toBeGreaterThan(gewerkSchaetzung(s, h.id, nr, 'moebel')!.plusJahr);
    h.etagenBau![nr].malusMoebel = 0.03;
    expect(fuehreAus(s, { typ: 'umbauPlanen', haus: h.id, etage: nr, stufe: 'ladenbau', gewerk: 'moebel' }).ok).toBe(true);
    const p = s.umbau!.projekte.at(-1)!;
    for (let i = 0; i < 14 && p.status === 'laufend'; i++) wocheAbspielen(s);
    expect(h.etagenBau![nr].malusMoebel).toBe(0);
  });

  test('Häuser vor 1975 haben Fristen ab dem zweiten Jahr; Vorlage beauftragt Brandschutz, versäumter Aufzug legt still', () => {
    const s = neuesSpiel(1);
    const alt = s.haeuser.filter((x) => x.status === 'offen' && x.baujahr < 1975);
    expect(alt.length).toBeGreaterThan(0);
    for (const h of alt) for (const n of h.etagen) expect(h.etagenBau![n].pflichten.brandschutz).toBeGreaterThanOrEqual(66);
    const h = alt[0];
    for (const n of h.etagen) h.etagenBau![n].pflichten.brandschutz = s.woche + 12;
    wocheAbspielen(s);
    const v = s.entscheidungen.find((e) => e.typ === 'organisation_vorlage' && String(e.daten.aktion).includes('pflichtBauen') && String(e.daten.aktion).includes(h.id));
    const delegiert = s.umbau!.projekte.some((p) => p.haus === h.id && p.gewerk === 'brandschutz');
    expect(!!v || delegiert).toBe(true);
    if (!delegiert) expect(fuehreAus(s, { typ: 'pflichtBauen', haus: h.id, pflicht: 'brandschutz' }).ok).toBe(true);
    for (let i = 0; i < 12; i++) wocheAbspielen(s);
    expect(h.etagen.every((n) => h.etagenBau![n].pflichten.brandschutz > s.woche)).toBe(true);
    expect(h.etagen.every((n) => !h.etagenBau![n].gesperrt)).toBe(true);
    // Aufzug versäumen: obere Etagen werden schlechter erreichbar
    const h2 = alt.find((x) => x.etagen.some((n) => n >= 1) && x.id !== h.id)!;
    for (const n of h2.etagen) h2.etagenBau![n].pflichten.aufzug = s.woche - 1;
    wocheAbspielen(s);
    expect(h2.etagen.every((n) => h2.etagenBau![n].aufzugStill)).toBe(true);
  });
});
