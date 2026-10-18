import { fuehreAus, hqFuerGrafik, hqUebersicht, neuesSpiel, wocheAbspielen, ABTEILUNGEN, HQ_PARAM } from '../src';
import type { GameState } from '../src';
import { hqKosten, platzQm, belegtQm, neueHqAngebote, sollFte, hqUmsatzFaktor, hqWkzFaktor, hqEinkaufKonditionen, standort } from '../src/hq';
import { PARAM } from '../src/welt';

function spiele(s: GameState, n: number): void {
  for (let i = 0; i < n && s.phase !== 'zerschlagen'; i++) wocheAbspielen(s);
}

/** Mietet das erste Angebot komplett und liefert die Gebäude-ID. */
function mieteErstesAngebot(s: GameState): string {
  const an = s.hq.angebote[0];
  expect(an).toBeDefined();
  const r = fuehreAus(s, { typ: 'hqMieten', angebot: an.id, etagen: an.gebaeude.etagen.map((e) => e.nr) });
  expect(r.ok).toBe(true);
  return an.gebaeude.id;
}

describe('HQ Startzustand und Flächenregel', () => {
  const s = neuesSpiel(1);
  test('alte Hauptverwaltung in Essen mit allen 10 Abteilungen und rund 25 % Leerfläche', () => {
    expect(s.hq.sitz).toBe('Essen');
    expect(s.hq.gebaeude.every((g) => g.stadt === 'Essen' && g.typ === 'nachkrieg')).toBe(true);
    expect(s.hq.abteilungen.map((a) => a.id).sort()).toEqual([...ABTEILUNGEN].sort());
    const u = hqUebersicht(s);
    const qm = u.gebaeude.reduce((a, g) => a + g.qmGemietet, 0);
    const belegt = u.gebaeude.reduce((a, g) => a + g.qmBelegt, 0);
    expect(1 - belegt / qm).toBeGreaterThan(0.2);
    expect(1 - belegt / qm).toBeLessThan(0.3);
    for (const g of s.hq.gebaeude) for (const e of g.etagen) expect(e.qm).toBeLessThanOrEqual(1400);
  });
  test('Bedarf je Abteilung = FTE × 14 qm, voll belegt auf gemieteten Etagen, keine Etage überbelegt', () => {
    for (const a of s.hq.abteilungen) expect(platzQm(s, a)).toBe(a.fte * HQ_PARAM.qmJeFte);
    for (const g of s.hq.gebaeude) for (const e of g.etagen) expect(belegtQm(s, g, e)).toBeLessThanOrEqual(e.qm);
    for (const id of ABTEILUNGEN) expect(s.hq.wirkung[id]).toBe(1);
  });
  test('Abteilung ohne Platz wirkt mit Stufe 0, Umzug ohne Platz wird abgelehnt', () => {
    const t = neuesSpiel(1);
    const an = t.hq.angebote.find((x) => x.gebaeude.etagen[0].qm < 14 * 150)!;
    expect(fuehreAus(t, { typ: 'hqMieten', angebot: an.id, etagen: [0] }).ok).toBe(true);
    const r = fuehreAus(t, { typ: 'abteilungSetzen', abteilung: 'verwaltung', gebaeude: an.gebaeude.id, etage: 0 });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/Zu wenig Platz/);
    // Etage räumen: Abteilung verliert ihre Fläche
    const v = t.hq.abteilungen.find((a) => a.id === 'verwaltung')!;
    const g = t.hq.gebaeude.find((x) => x.id === v.gebaeudeId)!;
    for (const nr of [...new Set(v.belegung!.map((b) => b.etage))]) expect(fuehreAus(t, { typ: 'hqEtageKuendigen', gebaeude: g.id, etage: nr }).ok).toBe(true);
    expect(t.hq.wirkung.verwaltung).toBe(0);
    expect(hqKosten(t).strafen).toBeGreaterThan(0);
  });
  test('Aufbau scheitert, wenn im Gebäude kein Platz ist', () => {
    const t = neuesSpiel(1);
    // Gebäude des Einkaufs ohne Reserve: jede Etage genau so groß wie belegt, leere Etagen gekündigt
    const ek = t.hq.abteilungen.find((a) => a.id === 'einkauf')!;
    const g = t.hq.gebaeude.find((x) => x.id === ek.gebaeudeId)!;
    for (const e of g.etagen) if (e.abteilungen.length === 0) fuehreAus(t, { typ: 'hqEtageKuendigen', gebaeude: g.id, etage: e.nr });
    for (const e of g.etagen) e.qm = belegtQm(t, g, e);
    const fte = ek.fte;
    const r = fuehreAus(t, { typ: 'abteilungStufe', abteilung: 'einkauf', stufe: 3 });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/kein Platz/);
    expect(ek.fte).toBe(fte);
    for (const g of t.hq.gebaeude) for (const e of g.etagen) expect(belegtQm(t, g, e)).toBeLessThanOrEqual(e.qm);
  });
});

describe('HQ Kosten', () => {
  test('Start trifft die bisherige Kalibrierung (Zentralkostenquote 0,034 auf den Basisumsatz)', () => {
    for (const seed of [1, 2, 3]) {
      const s = neuesSpiel(seed);
      const basis = Object.values(s.basisUmsatz).reduce((a, b) => a + (b ?? 0), 0);
      expect(Math.abs(s.zentrale.kostenWoche - basis * PARAM.zentraleQuote)).toBeLessThanOrEqual(1);
      expect(s.zentrale.kostenWoche).toBe(s.zentrale.kostenStart);
      const k = hqKosten(s);
      expect(Math.round(k.personal + k.sach + k.reise + k.miete + k.nebenkosten + k.strafen)).toBe(Math.round(k.gesamt));
      expect(k.reise).toBeGreaterThan(0);
      expect(k.miete).toBeGreaterThan(0);
      expect(k.nebenkosten).toBeGreaterThan(0);
    }
  });
  test('Zentralkosten fließen unverändert in die Wochen-GuV', () => {
    const s = neuesSpiel(1);
    const z = s.zentrale.kostenWoche;
    wocheAbspielen(s);
    expect(s.historie[0].zentrale).toBe(z);
  });
  test('Abbau auf Soll senkt Personalkosten, kostet Abfindung und Betriebsrat', () => {
    const s = neuesSpiel(1);
    const vorher = hqKosten(s).personal;
    const cash = s.cash;
    const br = s.stakeholder.betriebsrat;
    const r = fuehreAus(s, { typ: 'abteilungStufe', abteilung: 'verwaltung', stufe: 1 });
    expect(r.ok).toBe(true);
    const v = s.hq.abteilungen.find((a) => a.id === 'verwaltung')!;
    expect(v.fte).toBe(Math.round(sollFte(s, 'verwaltung', 1)));
    expect(hqKosten(s).personal).toBeLessThan(vorher);
    expect(s.cash).toBeLessThan(cash);
    expect(s.stakeholder.betriebsrat).toBeLessThan(br);
    expect(s.hq.wirkung.verwaltung).toBe(1); // Überbesetzung abgebaut, Wirkung bleibt
    expect(platzQm(s, v)).toBe(v.fte * 14); // Fläche wird mit frei
  });
  test('Gekündigte Etage spart Miete', () => {
    const s = neuesSpiel(1);
    const g = s.hq.gebaeude[0];
    const leer = [...g.etagen].sort((a, b) => belegtQm(s, g, a) - belegtQm(s, g, b))[0];
    const vorher = hqKosten(s).miete;
    expect(fuehreAus(s, { typ: 'hqEtageKuendigen', gebaeude: g.id, etage: leer.nr }).ok).toBe(true);
    expect(hqKosten(s).miete).toBeLessThan(vorher);
    expect(s.hq.restmieten).toHaveLength(1);
  });
});

describe('HQ Angebote', () => {
  test('jedes Quartal 2 bis 4 freie Gebäude in Städten mit Hartwig-Häusern, Metropolen teurer', () => {
    const s = neuesSpiel(3);
    const staedte = new Set(s.haeuser.map((h) => h.stadt));
    const cluster = new Map(s.haeuser.map((h) => [h.stadt, h.cluster]));
    const preise: Record<string, number[]> = { metropole: [], grossstadt: [], mittelstadt: [] };
    for (let q = 0; q < 40; q++) {
      s.hq.angebote = [];
      neueHqAngebote(s);
      expect(s.hq.angebote.length).toBeGreaterThanOrEqual(2);
      expect(s.hq.angebote.length).toBeLessThanOrEqual(4);
      for (const a of s.hq.angebote) {
        expect(staedte.has(a.gebaeude.stadt)).toBe(true);
        expect(a.gebaeude.etagen.every((e) => !e.gemietet)).toBe(true);
        preise[cluster.get(a.gebaeude.stadt)!].push(a.gebaeude.mieteQmMonat);
      }
    }
    const m = (x: number[]) => x.reduce((a, b) => a + b, 0) / Math.max(1, x.length);
    expect(m(preise.metropole)).toBeGreaterThan(m(preise.grossstadt) * 1.3);
  });
  test('neue Angebote erscheinen im Quartalstakt und verfallen nach ihrer Frist', () => {
    const s = neuesSpiel(2);
    const start = s.hq.angebote.map((a) => a.id);
    spiele(s, 14); // Woche 13 bringt die neuen Angebote, die alten laufen ab
    expect(s.hq.angebote.some((a) => start.includes(a.id))).toBe(false);
    expect(s.hq.angebote.length).toBeGreaterThanOrEqual(2);
  });
});

describe('HQ Umzug und Kündigung', () => {
  test('Umzug: Einmalkosten, vier Wochen halbe Wirkung, danach voll', () => {
    const s = neuesSpiel(1);
    const gid = mieteErstesAngebot(s);
    const cash = s.cash;
    const r = fuehreAus(s, { typ: 'abteilungSetzen', abteilung: 'recht', gebaeude: gid, etage: 0 });
    expect(r.ok).toBe(true);
    expect(s.cash).toBeLessThan(cash);
    const a = s.hq.abteilungen.find((x) => x.id === 'recht')!;
    expect(a.gebaeudeId).toBe(gid);
    expect(a.umzugBis).toBe(s.woche + 4);
    // zwei Städte: etwas Verteilungsverlust, dazu halbe Wirkung
    const verteilung = hqUebersicht(s).verteilungsFaktor * standort(s, s.hq.gebaeude.find((g) => g.id === gid)!.stadt).wirkungsFaktor;
    expect(s.hq.wirkung.recht).toBeCloseTo(0.5 * verteilung, 5);
    spiele(s, 4);
    expect(s.hq.wirkung.recht).toBeCloseTo(0.5 * verteilung, 5); // Wochen 0 bis 3 mit halber Wirkung
    spiele(s, 1);
    expect(s.hq.wirkung.recht).toBeCloseTo(verteilung, 5);
    expect(hqFuerGrafik(s).gebaeude.find((g) => g.id === gid)!.etagen[0].abteilungen.map((x) => x.id)).toContain('recht');
  });
  test('Kündigung: Restmiete wie bei Häusern (52 Wochen, im Verfahren 13), Sitz zieht mit', () => {
    const s = neuesSpiel(1);
    s.cash = 5e9;
    const gid = mieteErstesAngebot(s);
    const neu = s.hq.gebaeude.find((g) => g.id === gid)!;
    const reihe = [...s.hq.abteilungen].sort((a, b) => b.fte - a.fte);
    for (const a of reihe) {
      const r = fuehreAus(s, { typ: 'abteilungSetzen', abteilung: a.id, gebaeude: gid, etage: 0 });
      if (!r.ok) break;
    }
    const alt = s.hq.gebaeude.filter((g) => g.id.startsWith('hq-essen'));
    for (const g of alt) expect(fuehreAus(s, { typ: 'hqGebaeudeKuendigen', gebaeude: g.id }).ok).toBe(true);
    expect(s.hq.gebaeude.map((g) => g.id)).toEqual([gid]);
    expect(s.hq.restmieten).toHaveLength(2);
    for (const r of s.hq.restmieten) expect(r.bis - s.woche).toBe(52);
    // Abteilungen, die nicht ins neue Haus passten, haben keinen Platz mehr und wirken nicht
    for (const a of s.hq.abteilungen) if (a.gebaeudeId === undefined) expect(s.hq.wirkung[a.id]).toBe(0);
    expect(s.hq.sitz).toBe(neu.stadt);
    const z = s.zentrale.kostenWoche;
    wocheAbspielen(s);
    const k = s.historie[s.historie.length - 1];
    expect(k.sondereffekte).toBeLessThanOrEqual(-s.hq.restmieten.reduce((x, r) => x + r.mieteWoche, 0));
    expect(z).toBeGreaterThan(0);
    // im Verfahren nur 13 Wochen
    const t = neuesSpiel(1);
    t.phase = 'insolvenz';
    expect(fuehreAus(t, { typ: 'hqGebaeudeKuendigen', gebaeude: 'hq-essen' }).ok).toBe(true);
    expect(t.hq.restmieten[0].bis - t.woche).toBe(13);
  });
});

describe('HQ Kompatibilität und Wirkungen', () => {
  test("Aktion 'zentrale' kürzt alle Abteilungen anteilig", () => {
    const s = neuesSpiel(1);
    const vorher = Object.fromEntries(s.hq.abteilungen.map((a) => [a.id, a.fte]));
    const kosten = s.zentrale.kostenWoche;
    const br = s.stakeholder.betriebsrat;
    const r = fuehreAus(s, { typ: 'zentrale', prozent: 0.2 });
    expect(r.ok).toBe(true);
    for (const a of s.hq.abteilungen) expect(a.fte).toBe(vorher[a.id] - Math.round(vorher[a.id] * 0.2));
    expect(s.zentrale.kostenWoche).toBeLessThan(kosten * 0.85);
    expect(s.zentrale.kostenWoche).toBeGreaterThan(kosten * 0.75);
    expect(s.stakeholder.betriebsrat).toBeCloseTo(br - 6, 5);
    expect(s.zentrale.fte).toBe(s.hq.abteilungen.reduce((x, a) => x + a.fte, 0));
    expect(r.text).toMatch(/Zentrale um 20 % verkleinert/);
    // mehr als 30 % geht wie bisher nicht in einem Schritt
    const t = neuesSpiel(1);
    fuehreAus(t, { typ: 'zentrale', prozent: 0.6 });
    expect(t.zentrale.fte).toBeGreaterThan(s.zentrale.fte * 0.85);
  });
  test("Aktion 'controlling' setzt die Stufe der Abteilung", () => {
    const s = neuesSpiel(1);
    expect(fuehreAus(s, { typ: 'controlling', stufe: 0 }).ok).toBe(true);
    expect(s.controllingStufe).toBe(1); // Abbau wirkt verzögert
    spiele(s, 40);
    expect(s.controllingStufe).toBe(0);
    expect(fuehreAus(s, { typ: 'controlling', stufe: 2 }).ok).toBe(true);
    spiele(s, 9); // acht Wochen Einarbeitung
    expect(s.controllingStufe).toBe(2);
  });
  test('Stufen wirken in die richtige Richtung', () => {
    const s = neuesSpiel(1);
    s.hq.wirkung.ecommerce = 0;
    s.hq.wirkung.vm = 0;
    expect(hqUmsatzFaktor(s)).toBeLessThan(1);
    s.hq.wirkung.ecommerce = 2;
    s.hq.wirkung.vm = 2;
    expect(hqUmsatzFaktor(s)).toBeGreaterThan(1);
    s.hq.wirkung.einkauf = 3;
    expect(hqWkzFaktor(s)).toBeGreaterThan(1);
    expect(hqEinkaufKonditionen(s)).toBeGreaterThan(0);
  });
  test('hqFuerGrafik liefert reines JSON im Vertragsformat', () => {
    const s = neuesSpiel(1);
    const j = hqFuerGrafik(s);
    expect(JSON.parse(JSON.stringify(j))).toEqual(j);
    expect(Object.keys(j).sort()).toEqual(['angebote', 'gebaeude', 'sitz']);
    for (const g of j.gebaeude) {
      expect(Object.keys(g).sort()).toEqual(['etagen', 'id', 'name', 'stadt', 'typ']);
      for (const e of g.etagen) {
        expect(Object.keys(e).sort()).toEqual(['abteilungen', 'gemietet', 'nr', 'qm']);
        for (const a of e.abteilungen) expect(Object.keys(a).sort()).toEqual(['fte', 'id', 'stufe']);
      }
    }
    for (const a of j.angebote) expect(Object.keys(a).sort()).toEqual(['etagen', 'id', 'stadt', 'typ']);
    const fte = j.gebaeude.flatMap((g) => g.etagen.flatMap((e) => e.abteilungen)).reduce((x, a) => x + a.fte, 0);
    expect(Math.abs(fte - s.zentrale.fte)).toBeLessThanOrEqual(10);
  });
  test('Kahlschlag spart sofort, die Wirkung bricht verzögert ein', () => {
    const s = neuesSpiel(1);
    const kosten = s.zentrale.kostenWoche;
    for (const id of ABTEILUNGEN) fuehreAus(s, { typ: 'abteilungStufe', abteilung: id, stufe: 0 });
    expect(s.zentrale.kostenWoche).toBeLessThan(kosten * 0.6);
    expect(s.hq.wirkung.einkauf).toBeGreaterThan(0.9);
    spiele(s, 4);
    const nach4 = s.hq.wirkung.einkauf;
    expect(nach4).toBeLessThan(1);
    expect(nach4).toBeGreaterThan(0.6);
    spiele(s, 40);
    expect(s.hq.wirkung.einkauf).toBeLessThan(0.2);
  });
  test('Standort: Ruhrgebiet und Rheinland nah an den Häusern, abgelegene Städte mit Nachteil', () => {
    const s = neuesSpiel(1);
    const essen = standort(s, 'Essen');
    for (const stadt of ['Dortmund', 'Köln', 'Düsseldorf']) expect(standort(s, stadt).wirkungsFaktor).toBeGreaterThan(0.99);
    for (const stadt of ['Lübeck', 'Rostock', 'Flensburg']) {
      const x = standort(s, stadt);
      expect(x.wirkungsFaktor).toBeLessThan(0.92);
      expect(x.reiseJeFte).toBeGreaterThan(essen.reiseJeFte * 1.5);
    }
    expect(standort(s, 'Düsseldorf').recruitingFaktor).toBeLessThan(essen.recruitingFaktor);
    expect(standort(s, 'Düsseldorf').lohnFaktor).toBeGreaterThan(essen.lohnFaktor);
    expect(standort(s, 'Gütersloh').wirkungsFaktor).toBeLessThan(0.96);
  });
  test('Spielertexte ohne Gedankenstriche', () => {
    const s = neuesSpiel(1);
    const texte = [JSON.stringify(hqUebersicht(s)), ...ABTEILUNGEN.map((id) => fuehreAus(s, { typ: 'abteilungStufe', abteilung: id, stufe: 2 }).text)];
    for (const t of texte) expect(t).not.toMatch(/[–—]/);
  });
});
