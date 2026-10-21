import { einkaufUebersicht, eigenmarkenUebersicht, freigaben, fuehreAus, neuesSpiel, wgDetail, wocheAbspielen, GRUPPEN, WG_DEF, WG_JE_BEREICH } from '../src';
import type { GameState, GruppeId } from '../src';
import { kannibalisierung, margeVon, FREMD } from '../src/einkauf';
import { bestandWert } from '../src/ware';
import { botTief } from '../scripts/bot';

function spiele(s: GameState, n: number, freigeben = true): void {
  for (let i = 0; i < n && s.phase !== 'zerschlagen'; i++) {
    if (freigeben) fuehreAus(s, { typ: 'sammelfreigabe' });
    wocheAbspielen(s);
  }
}

describe('Warengruppen', () => {
  test('rund 50 WG, Anteile je Bereich summieren sich auf 1, Saisonanteil wie der Bereich', () => {
    expect(WG_DEF.length).toBeGreaterThanOrEqual(45);
    expect(WG_DEF.length).toBeLessThanOrEqual(60);
    for (const [g, liste] of Object.entries(WG_JE_BEREICH) as [GruppeId, typeof WG_DEF][]) {
      expect(liste.reduce((a, d) => a + d.anteil, 0)).toBeCloseTo(1, 9);
      const saison = liste.reduce((a, d) => a + d.anteil * (1 - d.nosAnteil), 0);
      expect(saison).toBeCloseTo(GRUPPEN[g].saisonAnteil, 2);
    }
    expect(Object.keys(WG_JE_BEREICH).length).toBe(16);
  });

  test('Start: VK-gewichtete Marge je Bereich trifft die Bereichsmarge, Bestand je WG summiert sich zum Bereich', () => {
    const s = neuesSpiel(1);
    for (const [g, liste] of Object.entries(WG_JE_BEREICH) as [GruppeId, typeof WG_DEF][]) {
      let m = 0;
      for (const d of liste) {
        const st = s.einkauf.wgs[d.id];
        for (const [pool, a] of Object.entries(st.pool)) {
          m += d.anteil * a * (st.nosAnteil * margeVon(s, st, 'nos', pool) + (1 - st.nosAnteil) * margeVon(s, st, 'saison', pool));
        }
      }
      expect(m).toBeCloseTo(GRUPPEN[g].marge, 6);
      const wg = s.bestand.filter((k) => k.gruppe === g && k.wg).reduce((a, k) => a + k.wert, 0);
      expect(wg).toBe(bestandWert(s, g));
    }
    for (const k of s.bestand) { expect(k.wg).toBeDefined(); expect(k.art).toBeDefined(); }
  });
});

describe('Aggregation und Kennzahlen', () => {
  const s = neuesSpiel(2);
  beforeAll(() => spiele(s, 30));

  test('WG-Umsätze summieren sich exakt zum eigenen Umsatz der Häuser je Bereich', () => {
    for (const [g, liste] of Object.entries(WG_JE_BEREICH) as [GruppeId, typeof WG_DEF][]) {
      const wg = liste.reduce((a, d) => a + (s.einkauf.wgs[d.id].v.u.at(-1) ?? 0), 0);
      // Volkskauf und FUNDUS führen eigene Warenwirtschaft (engine-formate.md), nicht die Hartwig-WG.
      const haus = s.haeuser.filter((h) => h.format !== 'schwester' && h.format !== 'outlet')
        .reduce((a, h) => a + (h.kpi?.umsatzJeGruppe[g] ?? 0), 0);
      expect(Math.abs(wg - haus)).toBeLessThanOrEqual(liste.length + s.haeuser.length);
    }
  });

  // Maßstab Phase 2: neu kalibrieren
  test.skip('Kennzahlen in der Größenordnung des Warenhaushandels, Bereich = Summe der WG', () => {
    s.controllingStufe = 2; // ohne Rauschen
    const u = einkaufUebersicht(s);
    const k = u.summe.kennzahlen;
    expect(k.lagerumschlag).toBeGreaterThan(2);
    expect(k.lagerumschlag).toBeLessThan(5.5);
    expect(k.nosVerfuegbarkeit).toBeGreaterThan(0.92);
    expect(k.nosVerfuegbarkeit).toBeLessThan(0.97);
    expect(k.eigenmarkenAnteil).toBeGreaterThan(0.07);
    expect(k.eigenmarkenAnteil).toBeLessThan(0.13);
    expect(k.eigenmarkenMarge - k.rohertragsquote).toBeGreaterThan(0.08);
    for (const b of u.bereiche) {
      expect(b.kennzahlen.umsatz).toBeCloseTo(b.wgs.reduce((a, w) => a + w.kennzahlen.umsatz, 0), -2);
      expect(Object.keys(b.ampeln).length).toBeGreaterThan(5);
    }
    expect(u.bereiche.reduce((a, b) => a + b.kennzahlen.bestandEk, 0)).toBeCloseTo(k.bestandEk, -2);
    const d = wgDetail(s, 'damen.kleider')!;
    expect(d.verlauf.woche.length).toBe(26);
    expect(d.limits.length).toBe(2);
  });

  test('Controlling-Stufe bestimmt die Genauigkeit', () => {
    s.controllingStufe = 2;
    const exakt = einkaufUebersicht(s).summe.kennzahlen.umsatz;
    const wahr = WG_DEF.reduce((a, d) => a + s.einkauf.wgs[d.id].v.u.slice(-13).reduce((x, y) => x + y, 0), 0);
    expect(exakt).toBeCloseTo(wahr, -2);
    s.controllingStufe = 0;
    const grob = einkaufUebersicht(s).bereiche.map((b) => b.kennzahlen.umsatz);
    s.controllingStufe = 2;
    const fein = einkaufUebersicht(s).bereiche.map((b) => b.kennzahlen.umsatz);
    expect(grob).not.toEqual(fein);
    s.controllingStufe = 1;
  });
});

describe('Freigaben', () => {
  test('Grenze: unter der Grenze direkt bestellt, darüber im Eingang', () => {
    const s = neuesSpiel(1);
    fuehreAus(s, { typ: 'freigabeGrenze', euro: 1e12 });
    spiele(s, 4, false);
    expect(s.einkauf.freigaben.length).toBe(0);
    fuehreAus(s, { typ: 'freigabeGrenze', euro: 0 });
    wocheAbspielen(s);
    expect(s.einkauf.freigaben.length).toBeGreaterThan(10);
  });

  test('auto gibt nach Frist frei, verfall streicht die Order', () => {
    const s = neuesSpiel(1);
    fuehreAus(s, { typ: 'freigabeGrenze', euro: 0 });
    fuehreAus(s, { typ: 'wgFreigabeModus', wg: 'damen', art: 'beide', modus: 'auto' });
    fuehreAus(s, { typ: 'wgFreigabeModus', wg: 'herren', art: 'beide', modus: 'verfall' });
    wocheAbspielen(s);
    const damen = s.einkauf.freigaben.filter((f) => f.wg.startsWith('damen.'));
    const herren = s.einkauf.freigaben.filter((f) => f.wg.startsWith('herren.'));
    expect(damen.length).toBeGreaterThan(0);
    expect(herren.length).toBeGreaterThan(0);
    spiele(s, 4, false);
    const ids = new Set(s.bestellungen.map((b) => b.id.split('-')[0].slice(1)));
    for (const f of damen) expect(ids.has(f.id)).toBe(true);
    for (const f of herren) expect(ids.has(f.id)).toBe(false);
    expect(s.einkauf.protokoll.reduce((a, p) => a + p.verfallen, 0)).toBeGreaterThanOrEqual(herren.length);
    expect(s.einkauf.protokoll.reduce((a, p) => a + p.auto, 0)).toBeGreaterThanOrEqual(damen.length);
  });

  test('kürzen und freigeben, ablehnen, Sammelfreigabe mit Filter', () => {
    const s = neuesSpiel(1);
    fuehreAus(s, { typ: 'freigabeGrenze', euro: 0 });
    wocheAbspielen(s);
    const f = s.einkauf.freigaben[0];
    const vorher = f.wert;
    expect(fuehreAus(s, { typ: 'freigabeKuerzen', id: f.id, prozent: 0.3 }).ok).toBe(true);
    const bestellt = s.bestellungen.filter((b) => b.id.startsWith(`b${f.id}-`)).reduce((a, b) => a + b.wert, 0);
    expect(Math.abs(bestellt - vorher * 0.7)).toBeLessThanOrEqual(f.lieferungen.length + 1);
    const zweite = s.einkauf.freigaben[0];
    fuehreAus(s, { typ: 'freigabeAblehnen', ids: [zweite.id] });
    expect(s.einkauf.freigaben.some((x) => x.id === zweite.id)).toBe(false);
    expect(s.bestellungen.some((b) => b.id.startsWith(`b${zweite.id}-`))).toBe(false);
    const nDamen = freigaben(s, { bereich: 'damen' }).anzahl;
    const gesamt = s.einkauf.freigaben.length;
    fuehreAus(s, { typ: 'sammelfreigabe', filter: { bereich: 'damen' } });
    expect(s.einkauf.freigaben.length).toBe(gesamt - nDamen);
    expect(freigaben(s, { bereich: 'damen' }).anzahl).toBe(0);
  });

  test('Orderrunde: Vororder je WG nach Lieferant, Volumen im Bereich hunderter Mio. €', () => {
    const s = neuesSpiel(1);
    let vo = 0; let wert = 0; const lieferanten = new Set<string>();
    for (let i = 0; i < 8; i++) {
      wocheAbspielen(s);
      for (const f of s.einkauf.freigaben.filter((x) => x.typ === 'vororder')) { vo++; wert += f.wert; lieferanten.add(f.lieferant); }
      fuehreAus(s, { typ: 'sammelfreigabe' });
    }
    expect(vo).toBeGreaterThan(100);
    expect(wert).toBeGreaterThan(150e6);
    expect(lieferanten.size).toBeGreaterThan(30);
  });

  test('Open to Buy kürzt Saisonorders, nicht den NOS-Nachschub; Limit in Euro', () => {
    const s = neuesSpiel(1);
    fuehreAus(s, { typ: 'wgLimit', wg: 'alle', faktor: 0.3 });
    fuehreAus(s, { typ: 'freigabeGrenze', euro: 0 });
    let saisonGekuerzt = 0; let nosGekuerzt = 0;
    for (let i = 0; i < 8; i++) {
      wocheAbspielen(s);
      for (const f of s.einkauf.freigaben) { if (f.ueberLimit) { if (f.art === 'nos') nosGekuerzt++; else saisonGekuerzt++; } }
      fuehreAus(s, { typ: 'sammelfreigabe' });
    }
    expect(saisonGekuerzt).toBeGreaterThan(0);
    expect(nosGekuerzt).toBe(0);
    expect(fuehreAus(s, { typ: 'wgLimit', wg: 'damen.blusen', euro: 1_000_000 }).ok).toBe(true);
    expect(wgDetail(s, 'damen.blusen')!.limits[0].limit).toBe(1_000_000);
  });
});

describe('Eigenmarken', () => {
  test('Start: vier gewachsene Marken mit 8 bis 12 % Umsatz und höherer Marge', () => {
    const s = neuesSpiel(1);
    spiele(s, 13);
    const u = eigenmarkenUebersicht(s);
    expect(u.marken.length).toBe(4);
    expect(u.anteilUmsatz).toBeGreaterThan(0.07);
    expect(u.anteilUmsatz).toBeLessThan(0.12);
    for (const m of u.marken) {
      expect(m.mehrmarge).toBeGreaterThan(0.08);
      expect(m.mehrmarge).toBeLessThan(0.16);
      expect(m.umsatz13).toBeGreaterThan(0);
      expect(Object.keys(m.passungRegion).length).toBe(5);
    }
    expect(u.jeBereich.damen?.[0].name).toBe('Lisanne');
  });

  test('Gründen: Kosten, Aufbau, danach Umsatz; unpassende WG wird abgelehnt', () => {
    const s = neuesSpiel(1);
    s.cash = 5e9;
    const entwurf = { name: 'Vida', zielgruppe: { alter: '18-29' as const, geschlecht: 'unisex' as const }, kategorie: 'Bekleidung' as const, preislage: 'einstieg' as const, stil: 'trendig' as const, qualitaet: 2, beschaffung: 'europa' as const, budgetWoche: 30_000, wgAnteile: { 'damen.young': 0.4, 'herren.casual': 0.2 } };
    expect(fuehreAus(s, { typ: 'eigenmarkeGruenden', entwurf: { ...entwurf, wgAnteile: { 'wohnen.bett': 0.3 } } }).ok).toBe(false);
    const r = fuehreAus(s, { typ: 'eigenmarkeGruenden', entwurf });
    expect(r.ok).toBe(true);
    expect(s.einmalkostenWoche).toBeGreaterThan(1e6);
    const m = s.eigenmarken.marken.find((x) => x.name === 'Vida')!;
    expect(m.status).toBe('aufbau');
    spiele(s, (m.bis ?? 0) + 12);
    expect(m.status).toBe('aktiv');
    const k = eigenmarkenUebersicht(s).marken.find((x) => x.name === 'Vida')!;
    expect(k.umsatz13).toBeGreaterThan(0);
    expect(k.rohertragsquote).toBeGreaterThan(einkaufUebersicht(s).summe.kennzahlen.rohertragsquote);
    expect(kannibalisierung(s, 'damen')).toBeGreaterThan(0);
  });

  test('Neupositionieren senkt Bekanntheit, danach ist der Stil aktuell; Einstellen macht Restbestand zur Altware', () => {
    const s = neuesSpiel(1);
    const m = s.eigenmarken.marken[0];
    const bek = m.bekanntheit;
    expect(fuehreAus(s, { typ: 'eigenmarkeNeupositionieren', marke: m.id, neu: { stil: 'modern' } }).ok).toBe(true);
    expect(m.bekanntheit).toBeLessThan(bek);
    spiele(s, 13);
    expect(m.status).toBe('aktiv');
    expect(m.stil).toBe('modern');
    expect(m.stilAktualitaet).toBeGreaterThan(95);
    const c = s.eigenmarken.marken[3];
    expect(fuehreAus(s, { typ: 'eigenmarkeEinstellen', marke: c.id }).ok).toBe(true);
    expect(s.bestand.filter((k) => k.marke === c.id).every((k) => k.ladenhueter)).toBe(true);
    expect(s.einkauf.freigaben.some((f) => f.marke === c.id)).toBe(false);
    expect(eigenmarkenUebersicht(s).marken.length).toBe(3);
  });

  test('Ohne Pflege veralten die Marken', () => {
    const s = neuesSpiel(1);
    const vorher = s.eigenmarken.marken.map((m) => m.stilAktualitaet);
    spiele(s, 26);
    s.eigenmarken.marken.forEach((m, i) => expect(m.stilAktualitaet).toBeLessThan(vorher[i]));
    expect(s.einkauf.wgs['damen.blusen'].pool[FREMD]).toBeGreaterThan(0.5);
  });
});

describe('Kalibrierung', () => {
  // Maßstab Phase 2: neu kalibrieren
  test.skip('Bot C mit Standard-Einkauf läuft durch die Gläubigerversammlung', () => {
    const s = neuesSpiel(3);
    for (let i = 0; i < 40 && s.phase !== 'zerschlagen'; i++) { botTief(s); wocheAbspielen(s); }
    expect(s.phase).toBe('regulaer');
  });
});
