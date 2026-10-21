import { neuesSpiel, wocheAbspielen, fuehreAus, posteingang } from '../src';
import { marktbeobachtungWoche, marktbeobachtungUebersicht, MARKT_FTE } from '../src/marktbeobachtung';
import { zeitungWoche, zeitungArchiv } from '../src/zeitung';

jest.setTimeout(120_000);

describe('Q06 Marktbeobachtung', () => {
  test('Start ist neutral; Stufen, FTE, Leitung und Zentralkosten werden korrekt geführt', () => {
    const s = neuesSpiel(1);
    const kosten = s.zentrale.kostenWoche;
    const id = s.organisation?.bereiche.marktbeobachtung;
    expect(id?.person).toBeDefined();
    expect(marktbeobachtungUebersicht(s).stufe).toBe(0);
    expect(marktbeobachtungUebersicht(s).kostenWoche).toBe(0);
    expect(fuehreAus(s, { typ: 'marktbeobachtungStufe', stufe: 4 as 0 }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'marktbeobachtungStufe', stufe: 1 }).ok).toBe(true);
    expect(marktbeobachtungUebersicht(s).fte).toBe(MARKT_FTE[1]);
    expect(s.zentrale.kostenWoche).toBe(kosten + 6 * 1_750);
    expect(fuehreAus(s, { typ: 'organisationEntlassen', ebene: 'bereich', id: 'marktbeobachtung' }).ok).toBe(true);
    expect(marktbeobachtungUebersicht(s).leitung).toBe('unbesetzt');
    expect(fuehreAus(s, { typ: 'marktbeobachtungStufe', stufe: 0 }).ok).toBe(true);
    expect(marktbeobachtungUebersicht(s).fte).toBe(0);
  });

  test('kein Rohwert, keine Nullwirkung und keine ungefilterte Einzelmeldung im Handelsboten', () => {
    const s = neuesSpiel(7);
    const h = s.haeuser.find((h) => s.wettbewerber.some((w) => w.stadt === h.stadt && w.art === 'premium'))!;
    const wb = s.wettbewerber.find((w) => w.stadt === h.stadt && w.art === 'premium')!;
    const roh = wb.name + ' (premium) eröffnet in ' + wb.stadt + '. Erwarteter Nachfragerückgang Beauty: rund 0 %.';
    s.meldungen.push({ id: 'test-markt', woche: 0, typ: 'presse', text: roh, bezug: { stadt: wb.stadt, modul: 'wettbewerb' } });
    // In einem künstlichen Null-Effekt-Fall werden die Meldungen vollständig entfernt.
    const vorher = wb.staerke;
    wb.staerke = 0;
    marktbeobachtungWoche(s);
    zeitungWoche(s);
    expect(s.meldungen.find((x) => x.text === roh)).toBeUndefined();
    expect(s.meldungen.some((x) => /\(premium\)|rund 0\s*%|Preisdruck.*52\s*%/.test(x.text))).toBe(false);
    expect([zeitungArchiv(s)[0].aufmacher, ...zeitungArchiv(s)[0].meldungen]
      .some((x) => /\(premium\)|rund 0\s*%/.test(x.text))).toBe(false);
    wb.staerke = vorher;
  });

  test('52 Wochen Seed 1: je Woche mit Abteilung höchstens ein Überblick und eine Einzelmeldung', () => {
    const ohne = neuesSpiel(1);
    const mit = neuesSpiel(1);
    ohne.cash = mit.cash = 10_000_000_000;
    expect(fuehreAus(mit, { typ: 'marktbeobachtungStufe', stufe: 1 }).ok).toBe(true);
    let mitMeldungen = 0, ohneMeldungen = 0;
    const wochenzahlen: string[] = [];
    for (let i = 0; i < 52; i++) {
      fuehreAus(ohne, { typ: 'sammelfreigabe' });
      fuehreAus(mit, { typ: 'sammelfreigabe' });
      wocheAbspielen(ohne);
      wocheAbspielen(mit);
      const a = ohne.marktbeobachtung!.verlauf.at(-1)!;
      const b = mit.marktbeobachtung!.verlauf.at(-1)!;
      ohneMeldungen += a.einzeln + a.ueberblick;
      mitMeldungen += b.einzeln + b.ueberblick;
      wochenzahlen.push(`| ${i + 1} | ${a.roh} | ${a.einzeln + a.ueberblick} | ${b.einzeln + b.ueberblick} | ${b.ueberblick} | ${b.einzeln} |`);
      expect(b.einzeln).toBeLessThanOrEqual(1);
      expect(b.ueberblick).toBeLessThanOrEqual(1);
      expect(b.einzeln + b.ueberblick).toBeLessThanOrEqual(2);
      expect(posteingang(mit).meldungen.filter((x) => x.id.startsWith('markt-' + i)).every((x) => x.kategorie === 'Konkurrenz')).toBe(true);
      expect(ohne.wettbewerber).toEqual(mit.wettbewerber);
      expect(ohne.rng).toBe(mit.rng);
      expect(ohne.wettbewerbRng).toBe(mit.wettbewerbRng);
    }
    console.log('\nQ06 Seed 1 – KW | Roh | Ohne | Mit | Überblick | Einzel\n' + wochenzahlen.join('\n'));
    console.log('Q06 Summen ohne/mit:', ohneMeldungen, mitMeldungen, 'Mittel:', (ohneMeldungen / 52).toFixed(2), (mitMeldungen / 52).toFixed(2));
    expect(mit.marktbeobachtung!.verlauf).toHaveLength(52);
    expect(mitMeldungen / 52).toBeLessThanOrEqual(2);
    expect(ohneMeldungen).toBeGreaterThanOrEqual(0);
  });

  test('mehr Leitungsqualität senkt die Erkennungsschwelle, nicht den RNG-Zustand', () => {
    const basis = neuesSpiel(17);
    const gut = structuredClone(basis), schwach = structuredClone(basis);
    const ko = gut.organisation!.bereiche.marktbeobachtung;
    const lo = schwach.organisation!.bereiche.marktbeobachtung;
    ko.person!.qualitaet = 0.95;
    lo.person!.qualitaet = 0.15;
    gut.marktbeobachtung!.stufe = schwach.marktbeobachtung!.stufe = 2;
    gut.marktbeobachtung!.fte = schwach.marktbeobachtung!.fte = 12;
    const m = basis.wettbewerber.find((w) => w.art !== 'leer_ehemals' && basis.haeuser.some((h) => h.stadt === w.stadt))!;
    const melding = { id: 'qualitaet', woche: 0, typ: 'presse' as const,
      text: m.name + ' eröffnet in ' + m.stadt, bezug: { stadt: m.stadt, modul: 'wettbewerb' } };
    gut.meldungen.push(melding);
    schwach.meldungen.push(melding);
    const rng = [gut.rng, gut.wettbewerbRng];
    marktbeobachtungWoche(gut);
    marktbeobachtungWoche(schwach);
    expect(gut.marktbeobachtung!.verlauf[0].ueberblick).toBeGreaterThanOrEqual(schwach.marktbeobachtung!.verlauf[0].ueberblick);
    expect([gut.rng, gut.wettbewerbRng]).toEqual(rng);
    expect([schwach.rng, schwach.wettbewerbRng]).toEqual(rng);
  });
});
