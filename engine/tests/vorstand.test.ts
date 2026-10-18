import { fuehreAus, kandidaten, neuesSpiel, vorstandProfil, vorstandUebersicht, wocheAbspielen, ABTEILUNGEN, RESSORTS, hqFuerGrafik } from '../src';
import type { GameState } from '../src';
import { hqKosten } from '../src/hq';

const spiele = (s: GameState, n: number) => { for (let i = 0; i < n; i++) { fuehreAus(s, { typ: 'sammelfreigabe' }); wocheAbspielen(s); } };
const GEDANKENSTRICH = /[–—]/;

describe('Vorstand', () => {
  test('Start: sechs gewachsene Vorstände, CRO und CDO unbesetzt, Wirkung und Zentralkosten unverändert', () => {
    const s = neuesSpiel(1);
    const u = vorstandUebersicht(s);
    expect(u.besetzt).toBe(6);
    expect(u.ressorts.filter((r) => !r.besetzt).map((r) => r.id).sort()).toEqual(['cdo', 'cro']);
    for (const id of ABTEILUNGEN) expect(s.hq.wirkung[id]).toBe(1);
    expect(s.zentrale.kostenWoche).toBe(s.zentrale.kostenStart);
    expect(hqKosten(s).vorstand).toBeGreaterThan(40_000);
    for (const r of u.ressorts.filter((x) => x.person)) {
      const p = r.person!;
      expect(p.fuehrung).toBeGreaterThanOrEqual(40);
      expect(p.fuehrung).toBeLessThanOrEqual(60);
      expect(['w', 'm']).toContain(p.portraet.geschlecht);
      expect(p.portraet.hautton).toBeGreaterThanOrEqual(0);
      expect(p.portraet.hautton).toBeLessThanOrEqual(5);
    }
    expect(u.ressorts.filter((r) => r.person?.portraet.geschlecht === 'w').length).toBeGreaterThanOrEqual(2);
    for (const r of RESSORTS) expect(kandidaten(s, r)!.kandidaten.length).toBeGreaterThanOrEqual(3);
    expect(hqFuerGrafik(s).vorstand?.ressorts.length).toBe(8);
  });

  test('Einstellen mit gutem Angebot stärkt die Abteilungen des Ressorts, besetztes Ressort wird nicht doppelt besetzt', () => {
    const s = neuesSpiel(2);
    const l = kandidaten(s, 'cro')!;
    const k = [...l.kandidaten].sort((a, b) => b.fuehrung - a.fuehrung)[0];
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) {
      const kk = kandidaten(s, 'cro')!.kandidaten.sort((a, b) => b.fuehrung - a.fuehrung)[0] ?? k;
      ok = fuehreAus(s, { typ: 'vorstandEinstellen', ressort: 'cro', kandidat: kk.id, gehalt: kk.gehaltsforderung * 1.4, haltebonus: 200_000 }).ok;
      if (!ok) wocheAbspielen(s);
    }
    expect(ok).toBe(true);
    spiele(s, 13);
    expect(s.hq.wirkung.immobilien).toBeGreaterThan(1);
    expect(s.hq.wirkung.recht).toBeGreaterThan(1);
    const kk = kandidaten(s, 'cro')!.kandidaten[0];
    expect(fuehreAus(s, { typ: 'vorstandEinstellen', ressort: 'cro', kandidat: kk.id, gehalt: kk.gehaltsforderung }).ok).toBe(false);
  });

  test('Entlassen kostet Abfindung, das Ressort wirkt schwächer, Delegation nur mit Person', () => {
    const s = neuesSpiel(1);
    const abf = vorstandProfil(s, 'cpo')!.abfindung!;
    const cash = s.cash;
    const r = fuehreAus(s, { typ: 'vorstandEntlassen', ressort: 'cpo' });
    expect(r.ok).toBe(true);
    expect(cash - s.cash).toBe(abf);
    expect(s.hq.wirkung.einkauf).toBeLessThan(1);
    expect(s.hq.wirkung.produkt).toBeLessThan(1);
    expect(fuehreAus(s, { typ: 'vorstandDelegation', ressort: 'cpo', bereich: 'freigaben', an: true }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'vorstandDelegation', ressort: 'cfo', bereich: 'gibtsnicht', an: true }).ok).toBe(false);
  });

  test('Gehalt kürzen senkt die Loyalität, Bonus setzt Halte- und Erfolgsbonus', () => {
    const s = neuesSpiel(1);
    const p = s.vorstand.ressorts.cmo.person!;
    const l0 = p.loyalitaet;
    fuehreAus(s, { typ: 'vorstandGehalt', ressort: 'cmo', gehalt: p.gehalt * 0.8 });
    expect(p.loyalitaet).toBeLessThan(l0 - 20);
    fuehreAus(s, { typ: 'vorstandBonus', ressort: 'cmo', haltebonus: 150_000, halteWochen: 52, erfolgsbonus: 0.3 });
    expect(p.haltebonus).toBe(150_000);
    expect(p.halteBis).toBe(s.woche + 52);
    expect(p.erfolgsbonus).toBe(0.3);
    expect(vorstandUebersicht(s).kostenWoche).toBeGreaterThan(Math.round((s.vorstand.ressorts.cfo.person!.gehalt + p.gehalt) / 52));
  });

  test('Delegation: der CPO arbeitet den Freigabe-Eingang ab', () => {
    const s = neuesSpiel(1);
    fuehreAus(s, { typ: 'vorstandDelegation', ressort: 'cpo', bereich: 'freigaben', an: true });
    s.vorstand.ressorts.cpo.person!.fachwissen = 100;
    for (let i = 0; i < 6; i++) wocheAbspielen(s);
    expect(s.vorstand.protokoll.some((p) => p.ressort === 'cpo')).toBe(true);
    // Ohne Delegation verfallen Saisonorders, mit guter Delegation werden sie bestellt
    const t = neuesSpiel(1);
    for (let i = 0; i < 6; i++) wocheAbspielen(t);
    const best = (x: GameState) => x.bestellungen.reduce((a, b) => a + b.wert, 0);
    expect(best(s)).toBeGreaterThan(best(t));
  });

  test('Vorstandssitzung je Quartal mit Bericht je Ressort und Entscheidung; Umsetzen kostet und wirkt', () => {
    const s = neuesSpiel(3);
    spiele(s, 7);
    const sitz = s.vorstand.sitzungen[0];
    expect(sitz.woche).toBe(6);
    expect(sitz.berichte.length).toBe(8);
    const e = s.entscheidungen.find((x) => x.typ === 'vorstand_sitzung')!;
    expect(e).toBeDefined();
    const cash = s.cash;
    fuehreAus(s, { typ: 'entscheiden', id: e.id, option: 'umsetzen' });
    expect(s.cash).toBeLessThan(cash);
    expect(s.vorstand.boosts.length).toBeGreaterThan(0);
    expect(GEDANKENSTRICH.test(JSON.stringify(sitz) + e.text + e.titel)).toBe(false);
  });

  test('Abwerbung: wer unzufrieden ist, bekommt Angebote; ohne Gegenangebot geht er nach der Frist', () => {
    const s = neuesSpiel(1);
    const p = s.vorstand.ressorts.coo.person!;
    p.seitWoche = -100;
    p.gehalt = 150_000;
    let e;
    for (let i = 0; i < 60 && !e; i++) { p.loyalitaet = 0; wocheAbspielen(s); e = s.entscheidungen.find((x) => x.typ === 'vorstand_abwerbung'); }
    expect(e).toBeDefined();
    fuehreAus(s, { typ: 'entscheiden', id: e!.id, option: 'ziehen' });
    for (let i = 0; i < 5; i++) wocheAbspielen(s);
    expect(s.vorstand.ressorts.coo.person).toBeUndefined();
    expect(s.hq.wirkung.logistik).toBeLessThan(1);
  });

  test('Deterministisch und Spielertexte ohne Gedankenstriche', () => {
    const a = neuesSpiel(5); const b = neuesSpiel(5);
    spiele(a, 8); spiele(b, 8);
    expect(JSON.stringify(vorstandUebersicht(a))).toBe(JSON.stringify(vorstandUebersicht(b)));
    const texte = JSON.stringify([vorstandUebersicht(a), ...RESSORTS.map((r) => vorstandProfil(a, r)), ...RESSORTS.map((r) => kandidaten(a, r))]);
    expect(GEDANKENSTRICH.test(texte)).toBe(false);
  });
});
