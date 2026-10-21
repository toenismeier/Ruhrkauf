import { neuesSpiel, wocheAbspielen, fuehreAus } from '../src';
import { hausKosten, lohnKosten, nebenvertragsErtraege, personalEinsatz } from '../src/wirtschaft';
import { botTurnaround } from '../scripts/bot';
import {
  REFERENZ_FILIAL_GUV, FILIAL_PROGRAMME, GUV_KOSTEN, guvAbschluss,
  leereFilialGuV, programmErsparnis,
} from '../src/filialguv';

describe('M7 Abschnitt 17: Kostenstellen statt Schein-Gutschriften', () => {
  test('alle Referenzwerte inklusive widersprüchlichem Total bleiben exakt erhalten', () => {
    const ref = Object.fromEntries(REFERENZ_FILIAL_GUV.map((p) => [p.id, p.ist]));
    expect(ref).toEqual({
      umsatz: 100.0, wareneinsatz: -58.8, bruttogewinn: 41.2, uebrigeErtraege: 2.3,
      personal: -16.0, fremdkraefte: -0.7, miete: -11.2, mietnebenkosten: -1.5,
      logistik: -6.3, werbung: -1.8, unterhalt: -1.9, zahlungsverkehr: -0.2,
      facilityManagement: -1.7, energie: -2.4, it: -0.3, administration: -0.2,
      uebrigeAufwendungen: -0.4, opex: -42.4, ebitda: -1.2,
    });
    const summe = REFERENZ_FILIAL_GUV.filter((x) => GUV_KOSTEN.some((k) => k === x.id))
      .reduce((a, x) => a + x.ist, 0);
    expect(summe).toBeCloseTo(-44.6, 9);
    expect(41.2 + 2.3 + summe).toBeCloseTo(-1.1, 9);
  });

  test('jede simulierte Filialposition ist im Haus, Konzern und Cashflow enthalten', () => {
    const s = neuesSpiel(1);
    const k = wocheAbspielen(s);
    const g = k.filialGuV!;
    expect(g).toBeDefined();
    // Rundung je Haus und Kostenart: beim Konsolidieren sind wenige
    // Hundert Euro Abweichung zum nur einmal gerundeten Konzern-KPI möglich.
    const konsolidierungsToleranz = s.haeuser.filter((h) => !h.nurDaten).length * 14;
    expect(Math.abs(g.umsatz - k.umsatz)).toBeLessThan(konsolidierungsToleranz);
    expect(g.wareneinsatz).toBe(g.umsatz - g.bruttogewinn);
    expect(g.opex).toBe(GUV_KOSTEN.reduce((x, p) => x + g[p], 0));
    expect(g.ebitda).toBe(g.bruttogewinn + g.uebrigeErtraege - g.opex);
    expect(Math.abs(k.ebitda - (g.ebitda - k.zentrale - k.beratung))).toBeLessThan(konsolidierungsToleranz);
    expect(Math.abs(k.rohertrag - g.bruttogewinn)).toBeLessThan(konsolidierungsToleranz);
    expect(Math.abs(k.abschriften - g.abschriften)).toBeLessThan(konsolidierungsToleranz);
    expect(s.haeuser.some((h) => h.kpi?.guv?.energie && h.kpi?.guv?.logistik)).toBe(true);
  });

  test('alle Programme kosten Geld, besitzen Vorlauf und können nicht doppelt gestartet werden', () => {
    const s = neuesSpiel(2);
    const alt = s.cash;
    const r = fuehreAus(s, { typ: 'filialProgramm', programm: 'energie' });
    expect(r.ok).toBe(true);
    expect(s.cash).toBeLessThan(alt);
    expect(s.filialProgramme!.energie!.wirksamAb).toBe(FILIAL_PROGRAMME.energie.vorlauf);
    expect(programmErsparnis(s, 'energie')).toBe(0);
    expect(fuehreAus(s, { typ: 'filialProgramm', programm: 'energie' }).ok).toBe(false);
    s.woche = FILIAL_PROGRAMME.energie.vorlauf;
    expect(programmErsparnis(s, 'energie')).toBe(FILIAL_PROGRAMME.energie.ersparnis);
  });

  test('Energieprogramm senkt nach Vorlauf nur den realen Kostenansatz', () => {
    const s = neuesSpiel(3);
    const h = s.haeuser.find((x) => !x.nurDaten)!;
    const vor = hausKosten(s, h, 300000, 350000);
    s.filialProgramme = { energie: { start: 0, wirksamAb: 0 } };
    const nach = hausKosten(s, h, 300000, 350000);
    expect(nach.guv.energie).toBeCloseTo(vor.guv.energie * (1 - FILIAL_PROGRAMME.energie.ersparnis));
    expect(nach.guv.personal).toBe(vor.guv.personal);
    expect(nach.guv.miete).toBe(vor.guv.miete);
    expect(nach.guv.uebrigeErtraege).toBe(0);
  });

  test('Bot T startet ausschließlich nicht-schließende Maßnahmen', () => {
    const s = neuesSpiel(3);
    const vorher = s.haeuser.filter((h) => !h.nurDaten && h.status === 'offen').length;
    botTurnaround(s);
    expect(Object.keys(s.filialProgramme ?? {})).toHaveLength(Object.keys(FILIAL_PROGRAMME).length);
    expect(s.haeuser.filter((h) => !h.nurDaten && h.status === 'offen')).toHaveLength(vorher);
    expect(s.insolvenzenGesamt).toBe(0);
    expect(s.phase).toBe('regulaer');
    expect(s.insolvenz).toBeUndefined();
  });

  test('Abschnitt 18: KW 1 erzielt Erträge aus nachvollziehbaren Verträgen ohne Änderung der Kostenreferenz', () => {
    const s = neuesSpiel(1, { schwierigkeit: 'mittel' });
    const k = wocheAbspielen(s);
    const g = k.filialGuV!;
    expect(g.werbeflaechen).toBeGreaterThan(0);
    expect(g.dienstleistungen).toBeGreaterThan(0);
    expect(g.werbeflaechen).toBe(k.werbeflaechen);
    expect(g.dienstleistungen).toBe(k.dienstleistungen);
    expect(g.uebrigeErtraege).toBeGreaterThan(g.werbeflaechen + g.dienstleistungen);
    expect(100 * g.uebrigeErtraege / g.umsatz).toBeGreaterThan(1.9);
    expect(100 * g.uebrigeErtraege / g.umsatz).toBeLessThan(2.75);
    expect(100 * g.uebrigeAufwendungen / g.umsatz).toBeCloseTo(0.4, 1);
    expect(Math.abs(k.ebitda - (g.ebitda - k.zentrale - k.beratung)))
      .toBeLessThan(s.haeuser.filter((h) => !h.nurDaten).length * 14);
  });

  test('Werbeplätze und Serviceleistungen entstehen nur bei tatsächlicher Nutzung', () => {
    const s = neuesSpiel(2);
    const h = s.haeuser.find((x) => x.nebenvertrag)!;
    const vorher = nebenvertragsErtraege(h, 440_000, s.woche);
    expect(vorher.werbeflaechen).toBeGreaterThan(0);
    expect(vorher.dienstleistungen).toBeGreaterThan(0);
    expect(nebenvertragsErtraege(h, 0, s.woche).dienstleistungen).toBe(0);
    h.flaechen.forEach((f) => { f.konzept = 'leer'; });
    expect(nebenvertragsErtraege(h, 0, s.woche)).toEqual({ werbeflaechen: 0, dienstleistungen: 0 });
    h.status = 'geschlossen';
    expect(nebenvertragsErtraege(h, 440_000, s.woche)).toEqual({ werbeflaechen: 0, dienstleistungen: 0 });
  });

  test('Saisonale Einsatzplanung verändert nur variable Stunden und dieselben FTE bedienen die Nachfrage', () => {
    const s = neuesSpiel(3);
    const h = s.haeuser.find((x) => !x.nurDaten)!;
    const start = personalEinsatz(h);
    const startLohn = lohnKosten(s, h);
    h.personal.umsatzReferenzWoche = 300_000;
    h.kpi = { woche: 0, umsatz: 180_000, rohertrag: 0, konzessionserloes: 0, untermiete: 0,
      personal: 0, miete: 0, nebenkosten: 0, sonstige: 0, db: 0, fteBedarf: 0, fteIst: 0, umsatzJeGruppe: {} };
    const schwach = personalEinsatz(h);
    expect(schwach.vollzeit).toBe(start.vollzeit);
    expect(schwach.teilzeit).toBeLessThan(start.teilzeit);
    expect(schwach.aushilfen).toBeLessThan(start.aushilfen);
    expect(lohnKosten(s, h)).toBeLessThan(startLohn);
    h.kpi.umsatz = 390_000;
    expect(lohnKosten(s, h)).toBeGreaterThan(startLohn);
    expect(h.personal.teilzeit).toBeGreaterThan(0); // Kein Vertrags-FTE-Abbau.
  });

  test('GuV-Summenbildung führt keine unsichtbaren Erträge ein', () => {
    const g = leereFilialGuV();
    g.bruttogewinn = 41_200;
    g.uebrigeErtraege = 2_300;
    g.personal = 16_000;
    g.miete = 11_200;
    guvAbschluss(g);
    expect(g.ebitda).toBe(41_200 + 2_300 - 27_200);
  });
});
