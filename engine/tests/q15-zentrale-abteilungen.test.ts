import { fuehreAus, hqUebersicht, neuesSpiel, wocheAbspielen } from '../src';
import { abteilungArbeitsklima, abteilungKapazitaet, belegtQm, hqKosten } from '../src/hq';

describe('Q15 Abteilungsseiten: Wirtschaftslogik', () => {
  test('Standardgehalt ist strikt neutral und die Abfrage ist rein lesend', () => {
    const s = neuesSpiel(1);
    const vorher = {
      kosten: s.zentrale.kostenWoche,
      cash: s.cash,
      wirkung: { ...s.hq.wirkung },
      mitarbeiter: s.hq.abteilungen.map((a) => a.fte),
    };
    const u = hqUebersicht(s);
    expect(u.abteilungen).toHaveLength(s.hq.abteilungen.length);
    for (const a of s.hq.abteilungen) {
      const k = u.abteilungen.find((x) => x.id === a.id)!;
      expect(k.gehaltFaktor).toBe(1);
      expect(k.qualitaet).toBe(1);
      expect(k.kapazitaetFte).toBeGreaterThanOrEqual(a.fte);
      expect(k.moral).toBe(72);
      expect(k.fluktuation).toBe(.08);
      expect(abteilungArbeitsklima(a).qualitaet).toBe(1);
      expect(abteilungKapazitaet(s, a)).toBe(k.kapazitaetFte);
    }
    expect(s.zentrale.kostenWoche).toBe(vorher.kosten);
    expect(s.cash).toBe(vorher.cash);
    expect(s.hq.wirkung).toEqual(vorher.wirkung);
    expect(s.hq.abteilungen.map((a) => a.fte)).toEqual(vorher.mitarbeiter);
  });

  test('Gehaltsregler verändert Personalkosten, Moral, Fluktuation und Qualität', () => {
    const s = neuesSpiel(1);
    const vor = hqKosten(s).personal;
    const start = s.hq.wirkung.marketing;
    expect(fuehreAus(s, { typ: 'abteilungGehalt', abteilung: 'marketing', faktor: 1.1 }).ok).toBe(true);
    const a = hqUebersicht(s).abteilungen.find((x) => x.id === 'marketing')!;
    expect(a.gehaltFaktor).toBe(1.1);
    expect(a.moral).toBeGreaterThan(72);
    expect(a.fluktuation).toBeLessThan(.08);
    expect(a.qualitaet).toBeGreaterThan(1);
    expect(hqKosten(s).personal).toBeGreaterThan(vor);
    expect(s.hq.wirkung.marketing).toBeGreaterThanOrEqual(start);
    expect(fuehreAus(s, { typ: 'abteilungGehalt', abteilung: 'marketing', faktor: .8 }).ok).toBe(true);
    const billig = hqUebersicht(s).abteilungen.find((x) => x.id === 'marketing')!;
    expect(billig.moral).toBeLessThan(72);
    expect(billig.fluktuation).toBeGreaterThan(.08);
    expect(billig.qualitaet).toBeLessThan(1);
    expect(hqKosten(s).personal).toBeLessThan(vor);
    expect(fuehreAus(s, { typ: 'abteilungGehalt', abteilung: 'marketing', faktor: 1.13 }).ok).toBe(false);
  });

  test('Neue FTE müssen räumlich Platz finden, Entlassungen kosten Abfindungen', () => {
    const s = neuesSpiel(1);
    const a = s.hq.abteilungen.find((x) => x.id === 'controlling')!;
    const vorher = a.fte;
    expect(fuehreAus(s, { typ: 'abteilungFte', abteilung: 'controlling', fte: -1 }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'abteilungFte', abteilung: 'controlling', fte: abteilungKapazitaet(s, a) + 1 }).ok).toBe(false);
    const kosten = s.cash;
    expect(fuehreAus(s, { typ: 'abteilungFte', abteilung: 'controlling', fte: vorher - 1 }).ok).toBe(true);
    expect(a.fte).toBe(vorher - 1);
    expect(s.cash).toBeLessThan(kosten);
    expect(s.hq.gebaeude.every((g) => g.etagen.every((e) => belegtQm(s, g, e) <= e.qm))).toBe(true);
    expect(fuehreAus(s, { typ: 'abteilungFte', abteilung: 'controlling', fte: vorher }).ok).toBe(true);
    expect(a.fte).toBe(vorher);
    expect(a.einarbeitungBis).toBe(s.woche + 8);
  });

  test('Unveränderte Gehälter verursachen keine zusätzlichen Abgänge', () => {
    const s = neuesSpiel(1);
    const a = s.hq.abteilungen.find((x) => x.id === 'marketing')!;
    const start = a.fte;
    for (let i = 0; i < 8; i++) wocheAbspielen(s);
    expect(a.fte).toBe(start);
    expect(a.abgangRest).toBeUndefined();
  });
});
