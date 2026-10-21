// O05 Ware: deterministische Fachtests, unabhängig von Rendering und externem CI.
import { neuesSpiel, fuehreAus, wocheAbspielen, warenUebersicht, fundusFrequenzFaktor } from '../src';
import type { GameState, GruppeId } from '../src';
import { clusterListe, preisFaktorHaus, wareWoche, warenHaus } from '../src/merchandise';

const bestand = (s: GameState) => s.bestand.reduce((n, k) => n + k.wert, 0);
const gruppenBestand = (s: GameState, g: GruppeId, hc: string) =>
  s.bestand.filter(k => k.gruppe === g && k.hauscluster === hc).reduce((n, k) => n + k.wert, 0);

describe('O05 Bestand je Hauscluster', () => {
  test.each([1, 2, 3])('Seed %s: Startbestand exakt aggregiert und jeder Kohorte zugeordnet', seed => {
    const s = neuesSpiel(seed);
    const u = warenUebersicht(s);
    expect(u.cluster.length).toBeGreaterThanOrEqual(5);
    expect(u.clusterbestand).toBeCloseTo(bestand(s), -1);
    expect(u.konzernbestand).toBeCloseTo(bestand(s), -1);
    // Standard: konzernweit gepoolt (Laufzeit); mit Übernahme der Steuerung jede Kohorte zugeordnet.
    expect(s.bestand.some(k => !!k.hauscluster)).toBe(false);
    expect(fuehreAus(s, { typ: 'allokationQualitaet', qualitaet: 1 }).ok).toBe(true);
    expect(warenUebersicht(s).clusterbestand).toBe(u.clusterbestand);
    expect(s.bestand.every(k => !!k.hauscluster)).toBe(true);
    const ids = new Set(clusterListe(s).map(c => c.id));
    expect(s.bestand.every(k => ids.has(k.hauscluster!))).toBe(true);
  });
  test('Standard ohne Steuerungseingriff bleibt wirtschaftlich kompatibel', () => {
    const s = neuesSpiel(1);
    const vorher = bestand(s);
    expect(s.ware?.steuerungAktiv).toBe(false);
    expect(s.ware?.allokationQualitaet).toBe(1);
    wocheAbspielen(s);
    const u = warenUebersicht(s);
    expect(u.konzernbestand).toBe(u.clusterbestand);
    expect(s.ware?.steuerungAktiv).toBe(false);
    expect(vorher).toBeGreaterThan(0);
    expect(s.historie[0].umsatz).toBeGreaterThan(0);
  });
  test('Schwache Allokation verschiebt Bestand messbar zwischen Clustern', () => {
    const s = neuesSpiel(2);
    const g: GruppeId = 'damen';
    expect(fuehreAus(s, { typ: 'allokationQualitaet', qualitaet: 1 }).ok).toBe(true);
    const vorher = Object.fromEntries(clusterListe(s).map(c => [c.id, gruppenBestand(s, g, c.id)]));
    const total = bestand(s);
    expect(fuehreAus(s, { typ: 'allokationQualitaet', qualitaet: 0.1 }).ok).toBe(true);
    const nachher = Object.fromEntries(clusterListe(s).map(c => [c.id, gruppenBestand(s, g, c.id)]));
    expect(bestand(s)).toBe(total);
    expect(Object.keys(vorher).some(id => Math.abs(nachher[id] - vorher[id]) > 10_000)).toBe(true);
    expect(Object.keys(vorher).some(id => nachher[id] < vorher[id])).toBe(true);
    expect(Object.keys(vorher).some(id => nachher[id] > vorher[id])).toBe(true);
  });
});

describe('O05 Steuerung', () => {
  test('Durchsetzen deaktiviert lokale Reduzierung, Freigabe stellt sie wieder her', () => {
    const s = neuesSpiel(1), c = clusterListe(s)[0], g: GruppeId = 'damen';
    const h = c.haeuser.find(h => (h.potenzial[g] ?? 0) > 0)!;
    expect(h).toBeDefined();
    expect(fuehreAus(s, { typ: 'reduzierungLokal', gruppe: g, hauscluster: c.id, punkte: 10 }).ok).toBe(true);
    expect(preisFaktorHaus(s, h, g)).toBeLessThan(1);
    expect(fuehreAus(s, { typ: 'reduzierungZentral', gruppe: g, hauscluster: c.id, an: true }).ok).toBe(true);
    expect(preisFaktorHaus(s, h, g)).toBe(1);
    expect(fuehreAus(s, { typ: 'reduzierungLokal', gruppe: g, hauscluster: c.id, punkte: 5 }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'reduzierungZentral', gruppe: g, hauscluster: c.id, an: false }).ok).toBe(true);
    expect(preisFaktorHaus(s, h, g)).toBeLessThan(1);
  });
  test('Open-to-Buy und Vororderquote einer Saison können geändert werden', () => {
    const s = neuesSpiel(1), p = warenUebersicht(s).plaene[0];
    const r = fuehreAus(s, { typ: 'merchandisePlan', wg: p.wg, saison: p.saison,
      budget: p.budget + 150000, vororderquote: 0.75, zielabverkauf: 0.8, breite: 0.7 });
    expect(r.ok).toBe(true);
    expect(s.einkauf.wgs[p.wg].st.limitEuro).toBe(p.budget + 150000);
    expect(s.einkauf.wgs[p.wg].st.vororderquote).toBe(0.75);
    expect(warenUebersicht(s).plaene[0].zielabverkauf).toBe(0.8);
  });
  test('FUNDUS-Eigenwarequote bis 25 % neutral, 50 % senkt Frequenz um 15 %', () => {
    const s = neuesSpiel(1);
    s.ware!.fundusFremd = 600000;
    s.ware!.fundusEigen = 200000; // 25 %
    expect(fundusFrequenzFaktor(s)).toBe(1);
    s.ware!.fundusEigen = 600000; // 50 %
    expect(fundusFrequenzFaktor(s)).toBeCloseTo(0.85, 10);
  });
  test('FUNDUS-Abfluss ist auf Altware begrenzt und bucht genau einen Erlös', () => {
    const s = neuesSpiel(1);
    const k = s.bestand.find(k => k.art === 'saison' && k.alter > 16)!;
    const vorher = bestand(s);
    const wert = Math.min(10000, k.wert);
    expect(fuehreAus(s, { typ: 'fundusAbfluss', gruppe: k.gruppe, wert }).ok).toBe(true);
    expect(bestand(s)).toBeCloseTo(vorher - wert, 0);
    expect(s.ware!.fundusEigen).toBe(wert);
    expect(s.einmalErloeseWoche).toBe(Math.round(wert * 0.7));
  });
  test('Umlagerung kostet Logistik, benötigt 1–2 Wochen und bewahrt EK-Wert inkl. Transit', () => {
    const s = neuesSpiel(3), c = clusterListe(s);
    const k = [...s.bestand].sort((a, b) => b.wert - a.wert)[0];
    const vorher = bestand(s);
    const r = fuehreAus(s, { typ: 'umlagerung', gruppe: k.gruppe, von: c[0].id, nach: c[1].id, wert: 1000 });
    expect(r.ok).toBe(true);
    expect(s.einmalkostenWoche).toBeGreaterThan(0);
    expect(s.ware!.umlagerungen).toHaveLength(1);
    expect(bestand(s)).toBe(vorher - 1000);
    s.woche = s.ware!.umlagerungen[0].ankunft;
    wareWoche(s);
    expect(s.ware!.umlagerungen).toHaveLength(0);
    expect(bestand(s)).toBe(vorher);
  });
  test('Flächensteuerung setzt einen Umbau von 2 bis 6 Wochen an', () => {
    const s = neuesSpiel(1);
    const h = s.haeuser.find(h => h.format === 'warenhaus' &&
      h.flaechen.some(f => f.konzept === 'eigen' && f.qm >= 100 && f.gruppe))!;
    const f = h.flaechen.find(f => f.konzept === 'eigen' && f.qm >= 100 && f.gruppe)!;
    const nach = Object.keys(s.basisUmsatz).find(g => g !== f.gruppe && (s.haeuser[0].format === 'warenhaus')) as GruppeId;
    const total = h.flaechen.reduce((a, f) => a + f.qm, 0);
    expect(fuehreAus(s, { typ: 'flaechenZuteilung', haus: h.id, von: f.gruppe!, nach, qm: 100 }).ok).toBe(true);
    expect(h.flaechen.reduce((a, f) => a + f.qm, 0)).toBe(total);
    const neu = h.flaechen.find(f => f.id.includes('-ware-'))!;
    expect(neu.umbauBis! - s.woche).toBeGreaterThanOrEqual(2);
    expect(neu.umbauBis! - s.woche).toBeLessThanOrEqual(6);
  });
  test('Jahresinventur meldet Rangfolge und zeigt Werte im Hausdetail', () => {
    const s = neuesSpiel(2);
    s.woche = 5;
    wareWoche(s);
    const h = s.haeuser.find(h => h.status === 'offen')!;
    expect(warenHaus(s, h).inventur?.woche).toBe(5);
    expect(s.meldungen.some(m => m.text.includes('Inventur KW 6'))).toBe(true);
  });
});

describe('O05 Organisation und Posteingang', () => {
  test('Saisonvorschlag erscheint mit Frist und Bereich im Posteingang', () => {
    const s = neuesSpiel(1);
    wocheAbspielen(s);
    const vorlage = s.entscheidungen.find(e => e.typ === 'organisation_vorlage' && e.titel.startsWith('Saisonbudget'));
    expect(vorlage).toBeDefined();
    expect(vorlage!.frist).toBe(2);
    expect(vorlage!.daten.bereich).toBe('merchandise_planning');
    expect(s.ware!.vorlagen).toHaveLength(1);
  });
  test('Delegation aktiviert den qualitätsabhängigen WG-Budgetvorschlag', () => {
    const s = neuesSpiel(1);
    const alt = s.einkauf.wgs['damen.kleider'].st.limitEuro;
    expect(fuehreAus(s, { typ: 'delegation', bereich: 'merchandise_planning', an: true }).ok).toBe(true);
    wocheAbspielen(s);
    const sid = s.ware!.vorlagen[0].saison;
    const plan = s.ware!.plaene[`damen.kleider|${sid}`];
    expect(plan).toBeDefined();
    expect(plan.budget).toBeGreaterThan(0);
    expect(s.einkauf.wgs['damen.kleider'].st.limitEuro).toBe(plan.budget);
    expect(s.ware!.allokationStart).toBeGreaterThan(0);
  });
  test('Zentraler Kalender wirkt auf den Verkaufspreis nur nach Aktivierung', () => {
    const s = neuesSpiel(1), h = s.haeuser.find(h => (h.potenzial.damen ?? 0) > 0)!;
    expect(preisFaktorHaus(s, h, 'damen')).toBe(1);
    expect(fuehreAus(s, { typ: 'reduzierungZentral', gruppe: 'damen', an: true }).ok).toBe(true);
    s.ware!.saisonAbschlag = { damen: 0.25 };
    expect(preisFaktorHaus(s, h, 'damen')).toBeCloseTo(0.98, 8);
    expect(fuehreAus(s, { typ: 'reduzierungLokal', gruppe: 'damen', hauscluster: h.hauscluster!, punkte: 10 }).ok).toBe(false);
  });
});
