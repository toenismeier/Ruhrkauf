import { neuesSpiel, SCHWIERIGKEITEN, schwierigkeitenFuerSzenario, szenarioKonfiguration, SZENARIEN } from '../src';
import { SZENARIO_STUFENTEXTE } from '../src/schwierigkeit';
import { immobilieVerkaufen, szenarioFrequenz, szenarioWoche } from '../src/szenarien';
import { glaeubigerversammlung } from '../src/prozesse';

describe('Q20 Schwierigkeit je Startszenario', () => {
  const gewertet = SZENARIEN.filter((s) => s.id !== 'sandkasten');

  test('18 eindeutige Beschreibungen, je Szenario drei individuelle Karten', () => {
    const alle = gewertet.flatMap((s) => schwierigkeitenFuerSzenario(s.id).map((stufe) => stufe.beschreibung));
    expect(alle).toHaveLength(18);
    expect(new Set(alle).size).toBe(18);
    for (const s of gewertet) {
      expect(schwierigkeitenFuerSzenario(s.id).map((x) => x.id)).toEqual(SCHWIERIGKEITEN.map((x) => x.id));
      for (const stufe of SCHWIERIGKEITEN) {
        expect(SZENARIO_STUFENTEXTE[s.id][stufe.id].length).toBeGreaterThan(55);
      }
    }
    expect(schwierigkeitenFuerSzenario('sandkasten')).toEqual([]);
  });

  test('Mittel bleibt für alle sieben Startszenarien exakt unverändert', () => {
    for (const karte of SZENARIEN) {
      const konfiguration = karte.id === 'standard' ? {} : { ...karte.start, szenarioId: karte.id };
      expect(szenarioKonfiguration(karte.id, 'mittel')).toEqual(konfiguration);
      expect(szenarioKonfiguration(karte.id)).toEqual(konfiguration);
    }
    for (const seed of [1, 2, 3]) {
      expect(neuesSpiel(seed, szenarioKonfiguration('standard', 'mittel'))).toEqual(neuesSpiel(seed));
    }
  });

  test('Schutzschirm: die Gläubigerversammlung reagiert auf die besondere Zustimmungsregel', () => {
    const abstimmung = (stufe: 'leicht' | 'mittel' | 'schwer') => {
      const s = neuesSpiel(1, { ...szenarioKonfiguration('schutzschirm', stufe), schwierigkeit: stufe });
      expect(s.insolvenz?.versammlung).toBe(12);
      // Gleiche Planbasis für alle Stufen: nur der Sonderbonus kippt das Votum.
      s.prognose = true;
      s.cash = 1_000_000_000;
      s.stakeholder.bank = 32;
      s.stakeholder.kreditversicherer = 32;
      s.stakeholder.vermieter = 32;
      s.stakeholder.betriebsrat = 32;
      s.restLieferantenVertrauen = 32;
      for (const l of s.lieferanten) l.vertrauen = 32;
      glaeubigerversammlung(s);
      return s.phase;
    };
    expect(abstimmung('leicht')).toBe('regulaer');
    expect(abstimmung('mittel')).toBe('zerschlagen');
    expect(abstimmung('schwer')).toBe('zerschlagen');
  });

  test('Lockdown: reale Frequenz und Überbrückungshilfe entsprechen dem Starttext', () => {
    for (const [stufe, frequenz, hilfe] of [
      ['leicht', 0.4, 170_000_000], ['mittel', 0.3, 140_000_000], ['schwer', 0.2, 110_000_000],
    ] as const) {
      const s = neuesSpiel(1, { ...szenarioKonfiguration('lockdown', stufe), schwierigkeit: stufe });
      s.woche = 8;
      expect(szenarioFrequenz(s)).toBe(frequenz);
      szenarioWoche(s);
      expect(s.angebote.find((a) => a.typ === 'staatshilfe')?.einmalzahlung).toBe(hilfe);
      expect(s.meldungen.some((m) => m.text.includes(Math.round((1 - frequenz) * 100) + ' %'))).toBe(true);
      s.woche = 18;
      expect(szenarioFrequenz(s)).toBe(1);
    }
  });

  test('Fusion: exakt 30 zusätzliche Häuser, Mieten und Betriebsrat nach Stufe', () => {
    const werte = (stufe: 'leicht' | 'mittel' | 'schwer') => {
      const s = neuesSpiel(1, { ...szenarioKonfiguration('fusion', stufe), schwierigkeit: stufe });
      const alt = s.haeuser.filter((h) => h.fusionUrsprung === 'volkskauf');
      return { anzahl: alt.length, miete: alt.reduce((n, h) => n + h.miete.mieteWoche, 0), br: s.stakeholder.betriebsrat };
    };
    const leicht = werte('leicht'), mittel = werte('mittel'), schwer = werte('schwer');
    expect(leicht.anzahl).toBe(30);
    expect(mittel.anzahl).toBe(30);
    expect(schwer.anzahl).toBe(30);
    expect(leicht.miete).toBeLessThan(mittel.miete);
    expect(schwer.miete).toBeGreaterThan(mittel.miete);
    expect([leicht.br, mittel.br, schwer.br]).toEqual([60, 50, 38]);
  });

  test('Investor: Rückmietrendite und Jahressanktion sind wirklich abgestuft', () => {
    const werte = (stufe: 'leicht' | 'mittel' | 'schwer') => {
      const s = neuesSpiel(1, { ...szenarioKonfiguration('investor', stufe), schwierigkeit: stufe });
      const haus = s.haeuser.find((h) => h.status === 'offen' && h.miete.vermieter === 'eigentuemer')!;
      const alt = haus.miete.mieteWoche;
      // Nur die Szenariofunktion, gleiche Immobilie und gleicher Immobilienwert.
      expect(immobilieVerkaufen(s, haus.id)).toBeNull();
      const zusatz = haus.miete.mieteWoche - alt;
      const ohneVerkauf = neuesSpiel(1, { ...szenarioKonfiguration('investor', stufe), schwierigkeit: stufe });
      ohneVerkauf.woche = 52;
      szenarioWoche(ohneVerkauf);
      return { zusatz, strafe: 50 - ohneVerkauf.stakeholder.eigentuemer };
    };
    const leicht = werte('leicht'), mittel = werte('mittel'), schwer = werte('schwer');
    expect(leicht.zusatz).toBeLessThan(mittel.zusatz);
    expect(schwer.zusatz).toBeGreaterThan(mittel.zusatz);
    expect([leicht.strafe, mittel.strafe, schwer.strafe]).toEqual([6, 10, 16]);
  });

  test('Aufbruch: der Konkurrenzabschlag folgt der Stufe, Sandkasten bleibt frei', () => {
    const f = (stufe: 'leicht' | 'mittel' | 'schwer') =>
      szenarioFrequenz(neuesSpiel(1, { ...szenarioKonfiguration('aufbruch', stufe), schwierigkeit: stufe }));
    expect([f('leicht'), f('mittel'), f('schwer')]).toEqual([0.95, 0.86, 0.78]);
    expect(szenarioKonfiguration('sandkasten', 'schwer')).toEqual(szenarioKonfiguration('sandkasten', 'mittel'));
  });
});
