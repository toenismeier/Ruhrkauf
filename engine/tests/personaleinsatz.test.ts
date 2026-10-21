import { fuehreAus, neuesSpiel } from '../src';
import { treiberFaktor } from '../src/treiber';
import type { GameState, Haus } from '../src/types';
import {
  PERSONAL_ANTEILE, PERSONAL_GRUPPEN, initialisierePersonaleinsatz,
  personaleinsatzWoche, personalHaus, personalUebersicht,
  personalVerkaufsFaktor, personalVerfuegbarkeit, personalZusatzkosten,
} from '../src/personaleinsatz';
import { lohnKosten } from '../src/wirtschaft';

const plan = (s: GameState, h: Haus) => personalHaus(s, h.id)!;
const fehler = (s: GameState, h: Haus): number =>
  PERSONAL_GRUPPEN.reduce((a, g) => a + plan(s, h).gruppen[g].tage.reduce(
    (b, d) => b + Math.abs(d.plan - d.bedarf), 0), 0);

describe('O04 Personaleinsatz', () => {
  test('Start: vier Gruppen und FTE-Anteile ohne neue Lohnkosten oder Nachfragewirkung', () => {
    const s = neuesSpiel(1);
    const summe = Object.values(PERSONAL_ANTEILE).reduce((a, b) => a + b, 0);
    expect(summe).toBeCloseTo(1, 12);
    expect(s.personaleinsatz).toBeDefined();
    for (const h of s.haeuser) {
      const p = plan(s, h);
      expect(Object.keys(p.gruppen).sort()).toEqual([...PERSONAL_GRUPPEN].sort());
      for (const g of PERSONAL_GRUPPEN) {
        expect(p.gruppen[g].tage.map((t) => t.tag)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']);
      }
      expect(p.zusatzkosten).toBe(0);
      expect(personalZusatzkosten(h)).toBe(0);
      expect(personalVerfuegbarkeit(h)).toBe(1);
      expect(personalVerkaufsFaktor(h, h.format === 'sport' ? 'sportschuhe' : 'beauty')).toBeCloseTo(1, 8);
      // Volkskauf/FUNDUS sind bis Engine-Formate reine Datenhäuser ohne Personal (#7).
      if (!h.nurDaten) expect(lohnKosten(s, h)).toBeGreaterThan(0);
    }
  });

  test('Weniger Kassenstunden samstags reduzieren nur am Samstag die Deckung und die Kaufquote', () => {
    const s = neuesSpiel(2);
    const h = s.haeuser.find((h) => h.format === 'warenhaus')!;
    const vorher = plan(s, h);
    const mo = vorher.gruppen.kasse.tage[0].plan;
    const sa = vorher.gruppen.kasse.tage[5].plan;
    const quote = vorher.kaufquote;
    expect(fuehreAus(s, { typ: 'personalSamstagKasse', haus: h.id, faktor: 0.55 }).ok).toBe(true);
    const nachher = plan(s, h);
    expect(nachher.gruppen.kasse.tage[0].plan).toBe(mo);
    expect(nachher.gruppen.kasse.tage[5].plan).toBeLessThan(sa);
    expect(nachher.kaufquote).toBeLessThan(quote);
    expect(personalVerkaufsFaktor(h, 'beauty') * treiberFaktor(h).kaufquote).toBeLessThan(1);
    expect(nachher.zusatzkosten).toBe(0);
  });

  test('Höhere Planungsqualität reduziert die Abweichung gegen den Tagesbedarf', () => {
    const s = neuesSpiel(3);
    const h = s.haeuser[0];
    const vorher = fehler(s, h);
    const stelle = s.organisation!.bereiche.personaleinsatz as { person?: { qualitaet: number } | null };
    stelle.person = { ...(stelle.person ?? {}), qualitaet: 1 } as { qualitaet: number };
    personaleinsatzWoche(s);
    expect(fehler(s, h)).toBeLessThan(vorher);
  });

  test('Springer verschieben Stunden ausschließlich innerhalb desselben Hausclusters', () => {
    const s = neuesSpiel(4);
    const hs = s.haeuser.filter((h) => h.region === 'West').slice(0, 3);
    expect(hs).toHaveLength(3);
    hs[0].hauscluster = 'hc-test';
    hs[1].hauscluster = 'hc-test';
    hs[2].hauscluster = 'hc-fremd';
    initialisierePersonaleinsatz(s);
    expect(fuehreAus(s, { typ: 'personalSteuern', haus: hs[0].id, gruppe: 'kasse', faktor: 0.5 }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'personalSteuern', haus: hs[1].id, gruppe: 'kasse', faktor: 1.5 }).ok).toBe(true);
    const alt = plan(s, hs[0]).gruppen.kasse.tage[5].plan;
    const fremd = plan(s, hs[2]).gruppen.kasse.tage[5].plan;
    expect(fuehreAus(s, { typ: 'personalSpringer', hauscluster: 'hc-test', an: true }).ok).toBe(true);
    expect(plan(s, hs[0]).gruppen.kasse.tage[5].plan).toBeGreaterThan(alt);
    expect(plan(s, hs[2]).gruppen.kasse.tage[5].plan).toBe(fremd);
    const a = plan(s, hs[0]).springerSaldo;
    const b = plan(s, hs[1]).springerSaldo;
    expect(a + b).toBeCloseTo(0, 7);
    expect(plan(s, hs[2]).springerSaldo).toBe(0);
    expect(personalUebersicht(s, 'hc-test')[0].haeuser).toHaveLength(2);
  });

  test('Weihnachtsvorlage mit Frist, Reserve und zusätzlichen Samstagstunden', () => {
    const s = neuesSpiel(5);
    s.woche = 39;
    const vorherRng = s.rng;
    personaleinsatzWoche(s);
    expect(s.rng).toBe(vorherRng);
    const e = s.entscheidungen.find((x) => x.typ === 'personal_weihnachten')!;
    expect(e).toBeDefined();
    expect(e.frist).toBe(43);
    expect(e.optionen).toHaveLength(3);
    expect(fuehreAus(s, { typ: 'entscheiden', id: e.id, option: 'reserve' }).ok).toBe(true);
    s.woche = 48;
    personaleinsatzWoche(s);
    const h = s.haeuser[0];
    const reserve = plan(s, h);
    const basis = structuredClone(s);
    basis.personaleinsatz!.weihnachten[0] = 'basis';
    personaleinsatzWoche(basis);
    expect(reserve.zusatzkosten).toBeGreaterThan(plan(basis, basis.haeuser[0]).zusatzkosten);
    expect(reserve.gruppen.kasse.tage[5].plan).toBeGreaterThan(plan(basis, basis.haeuser[0]).gruppen.kasse.tage[5].plan);
  });

  test('Saisonal höhere Ausfälle im Winter und Urlaub im Sommer', () => {
    const s = neuesSpiel(7);
    const h = s.haeuser[0];
    s.woche = 4;
    personaleinsatzWoche(s);
    const winter = plan(s, h);
    s.woche = 30;
    personaleinsatzWoche(s);
    const sommer = plan(s, h);
    expect(winter.krank).toBeGreaterThan(sommer.krank);
    expect(sommer.urlaub).toBeGreaterThan(winter.urlaub);
  });

  test('Ungültige Übersteuerung wird ohne Mutation abgewiesen', () => {
    const s = neuesSpiel(8);
    const h = s.haeuser[0];
    const vorher = JSON.stringify(h.personaleinsatz);
    expect(fuehreAus(s, { typ: 'personalSteuern', haus: h.id, gruppe: 'kasse', faktor: 10 }).ok).toBe(false);
    expect(JSON.stringify(h.personaleinsatz)).toBe(vorher);
  });
});
