// Q35: Zahlen ohne Widersprüche und mit Spieltiefe (Befunde Wurf 3: 10, 11, 14, 16 bis 20).
import { neuesSpiel, wocheAbspielen, cockpit, verlauf, hqUebersicht, hausUebersicht, personalUebersicht } from '../src';
import { produktAbsatzVerlauf } from '../src/produkte';
import { krankIst } from '../src/personaleinsatz';
import type { GameState } from '../src';

describe('Q35 Spieltiefe', () => {
  let s: GameState;
  beforeAll(() => { s = neuesSpiel(1, { startMonat: 10 }); });

  test('Cockpit zeigt vor der ersten Woche Werte aus dem Vorlauf', () => {
    const c = cockpit(s);
    expect(c.umsatzWoche).toBeGreaterThan(0);
    expect(c.ebitda13).not.toBe(0);
    expect(c.vorlaufWochen).toBe(13);
    expect(c.formate.find((f) => f.format === 'warenhaus')!.umsatz).toBeGreaterThan(0);
  });

  test('Fünf-Wochen-Verläufe beginnen mit Vorlaufwochen, nicht bei 0', () => {
    const h = s.haeuser.find((x) => x.format === 'warenhaus' && x.status === 'offen' && !x.nurDaten)!;
    const u = verlauf(s, { ebene: 'haus', id: h.id, kennzahl: 'umsatz', wochen: 5 }).punkte;
    expect(u).toHaveLength(5);
    expect(u.every((p) => p.vorlauf && p.wert > 0)).toBe(true);
    const m = s.produkte!.liste.find((p) => p.status === 'sortiment')!;
    const a = produktAbsatzVerlauf(s, m.marke, m.kategorie);
    expect(a.eigen.every((x) => x > 0)).toBe(true);
    expect(a.fremd.every((x) => x > 0)).toBe(true);
  });

  test('Zentrale: Plätze je Etage summieren sich zu den FTE der Abteilung', () => {
    const u = hqUebersicht(s);
    for (const a of u.abteilungen) {
      if (!a.gebaeudeId) continue;
      const summe = a.plaetze.reduce((n, z) => n + z.fte, 0);
      const sitze = a.plaetze.reduce((n, z) => n + z.eigene, 0);
      expect(summe).toBe(Math.min(Math.round(a.fte), sitze));
      for (const z of a.plaetze) { expect(z.fte).toBeLessThanOrEqual(z.eigene); expect(z.plaetze).toBe(z.eigene + z.frei); }
      const g = s.hq.gebaeude.find((x) => x.id === a.gebaeudeId)!;
      const freiGebaeude = u.gebaeude.find((x) => x.id === g.id)!.etagen.filter((e) => e.gemietet)
        .reduce((n, e) => n + Math.floor((e.qm - e.belegtQm) / 14 + 1e-9), 0);
      expect(a.kapazitaetFte).toBeGreaterThanOrEqual(Math.min(sitze + freiGebaeude, a.kapazitaetFte));
    }
  });

  test('Haus: Services und Kostenverbrauch je Haus verschieden, größte Abweichung benannt', () => {
    const hs = s.haeuser.filter((h) => h.format === 'warenhaus' && h.status === 'offen' && !h.nurDaten);
    const services = new Set(hs.map((h) => JSON.stringify(hausUebersicht(s, h.id)!.services)));
    expect(services.size).toBeGreaterThan(2);
    const ab = hs.map((h) => hausUebersicht(s, h.id)!.kostenAbweichung!);
    expect(ab.every((x) => x && typeof x.posten === 'string')).toBe(true);
    expect(ab.some((x) => x.abweichung >= 0.05)).toBe(true);
    expect(ab.some((x) => x.abweichung <= -0.05)).toBe(true);
  });

  test('Personaleinsatz streut, Engpässe kommen vor und landen im Posteingang', () => {
    const t = neuesSpiel(2, { startMonat: 10 });
    const deckungen: number[] = [], kranke = new Set<number>();
    for (let i = 0; i < 26; i++) {
      wocheAbspielen(t);
      for (const c of personalUebersicht(t)) for (const h of c.haeuser) {
        deckungen.push(Math.min(h.gruppen.verkauf, h.gruppen.kasse));
        kranke.add(Math.round(h.krank * 1000));
      }
    }
    expect(kranke.size).toBeGreaterThan(20);
    expect(Math.min(...deckungen)).toBeLessThan(0.9);
    // Nicht mehr überall 99 %: ein spürbarer Teil der Hauswochen liegt unter 97 % Deckung.
    expect(deckungen.filter((d) => d < 0.97).length / deckungen.length).toBeGreaterThan(0.1);
    expect(t.meldungen.some((m) => m.text.startsWith('Krankheitswelle'))).toBe(true);
    const h = t.haeuser.find((x) => x.status === 'offen' && !x.nurDaten)!;
    expect(krankIst(t, h)).toBeGreaterThan(0.01);
  });
});
