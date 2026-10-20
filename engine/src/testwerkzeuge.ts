// N14: ausschließlich explizite Testaktionen. Im normalen Spiel niemals aufgerufen.
import type { AngebotTyp, GameState, Stakeholder } from './types';
import type { SchwierigkeitId } from './schwierigkeit';
import { wocheAbspielen } from './engine';
import { eroeffneInsolvenz } from './prozesse';
import { testAngebotErzeugen, testZufallsereignis } from './ereignisse';
import { testWettbewerbEreignis } from './wettbewerb';
import { clamp } from './util';

export const TEST_EREIGNISSE = [
  { id: 'angebot:untermiete', name: 'Angebot: Untermiete' },
  { id: 'angebot:paket', name: 'Angebot: Mietpaket' },
  { id: 'angebot:stadt', name: 'Angebot: Stadtübernahme' },
  { id: 'angebot:sportverkauf', name: 'Angebot: Sportverkauf' },
  { id: 'angebot:sonderposten', name: 'Angebot: Sonderposten' },
  { id: 'angebot:uebernahme', name: 'Angebot: Wettbewerberübernahme' },
  { id: 'angebot:premiumVerkauf', name: 'Angebot: Premiumverkauf' },
  { id: 'ereignis:instandhaltung', name: 'Ereignis: Instandhaltung' },
  { id: 'ereignis:mietende', name: 'Ereignis: Mietende' },
  { id: 'ereignis:jahresgespraech', name: 'Ereignis: Lieferantengespräch' },
  { id: 'ereignis:lieferantenausfall', name: 'Ereignis: Lieferantenausfall' },
  { id: 'ereignis:containerstau', name: 'Ereignis: Containerstau' },
  { id: 'ereignis:konjunktur', name: 'Ereignis: Konjunkturschock' },
  { id: 'ereignis:streik', name: 'Ereignis: Streik' },
  { id: 'ereignis:filialleiter', name: 'Ereignis: Filialleiterabgang' },
  { id: 'ereignis:presse', name: 'Ereignis: Pressemeldung' },
  { id: 'wettbewerb:eroeffnung', name: 'Konkurrenz: Neueröffnung' },
  { id: 'wettbewerb:raeumung', name: 'Konkurrenz: Räumungsverkauf' },
  { id: 'wettbewerb:aktion', name: 'Konkurrenz: Rabattaktion' },
  { id: 'wettbewerb:konter', name: 'Konkurrenz: Konteraktion' },
  { id: 'wettbewerb:standortwechsel', name: 'Konkurrenz: Standortwechsel' },
  { id: 'wettbewerb:nachnutzung', name: 'Konkurrenz: Nachnutzung' },
] as const;

export type TestEreignisId = typeof TEST_EREIGNISSE[number]['id'];
export type TestAktion =
  | { typ: 'testWoche' }
  | { typ: 'testCash'; betrag: number }
  | { typ: 'testInsolvenz' }
  | { typ: 'testStakeholder'; feld: keyof Stakeholder; wert: number }
  | { typ: 'testSchwierigkeit'; stufe: SchwierigkeitId }
  | { typ: 'testEreignis'; ereignis: TestEreignisId };

type Ergebnis = { ok: boolean; text: string };
const ok = (text: string): Ergebnis => ({ ok: true, text });
const fehler = (text: string): Ergebnis => ({ ok: false, text });

export function testAktion(s: GameState, a: TestAktion): Ergebnis {
  if (s.prognose) return fehler('Im Vorschauklon sind Testaktionen gesperrt.');
  if (s.phase === 'zerschlagen') return fehler('Das Spiel ist beendet.');
  if (a.typ === 'testCash' && (!Number.isSafeInteger(a.betrag) || Math.abs(a.betrag) > 1_000_000_000_000_000))
    return fehler('Cash muss ein ganzer Eurobetrag sein.');
  if (a.typ === 'testStakeholder' && (!(a.feld in s.stakeholder) || !Number.isFinite(a.wert)))
    return fehler('Ungültiger Stakeholder oder Wert.');
  if (a.typ === 'testSchwierigkeit' && !['leicht', 'mittel', 'schwer'].includes(a.stufe))
    return fehler('Ungültige Schwierigkeit.');
  if (a.typ === 'testEreignis' && !TEST_EREIGNISSE.some((e) => e.id === a.ereignis))
    return fehler('Unbekanntes Testereignis.');

  // Erst nach erfolgreicher Validierung markieren; nicht in den normalen Balancing-Pfad eingreifen.
  s.testGenutzt = true;
  switch (a.typ) {
    case 'testWoche':
      wocheAbspielen(s);
      return ok('Testwoche ' + s.woche + ' abgeschlossen.');
    case 'testCash':
      s.cash = a.betrag;
      return ok('Cash auf ' + a.betrag + ' € gesetzt.');
    case 'testInsolvenz':
      if (s.phase === 'insolvenz') return ok('Das Insolvenzverfahren läuft bereits.');
      eroeffneInsolvenz(s, 'Test: Insolvenz manuell eröffnet');
      return ok('Insolvenzverfahren testweise eröffnet.');
    case 'testStakeholder':
      s.stakeholder[a.feld] = clamp(a.wert, 0, 100);
      return ok('Stakeholder ' + a.feld + ' = ' + s.stakeholder[a.feld] + '.');
    case 'testSchwierigkeit':
      s.schwierigkeit = a.stufe;
      return ok('Schwierigkeit ab sofort: ' + a.stufe + '. Startwerte werden nicht rückwirkend geändert.');
    case 'testEreignis': {
      const [quelle, art] = a.ereignis.split(':');
      const erzeugt = quelle === 'angebot'
        ? testAngebotErzeugen(s, art as AngebotTyp)
        : quelle === 'ereignis'
          ? testZufallsereignis(s, art)
          : testWettbewerbEreignis(s, art);
      return erzeugt ? ok('Testereignis ausgelöst: ' + a.ereignis + '.') : fehler('Für dieses Ereignis fehlen geeignete Standorte oder Voraussetzungen.');
    }
  }
}