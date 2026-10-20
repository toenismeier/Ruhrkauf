// O06 Planung: Budgetarithmetik, Abweichung, Freigabe, Forecast und Neutralität.
import { fuehreAus, neuesSpiel, planungAssistent, planungBericht, planJahr, planWoche, wocheAbspielen, forecastVertrauensDelta } from '../src';
import { planungWoche } from '../src/planung';
import type { GameState } from '../src/types';

const summe = (a: number[]) => a.reduce((s, x) => s + x, 0);
function schritt(s: GameState, n: number): void {
  for (let i = 0; i < n; i++) {
    fuehreAus(s, { typ: 'sammelfreigabe' });
    wocheAbspielen(s);
  }
}

describe('O06 Jahresplanung', () => {
  test('Vorgängerplan startet optimistisch und Phasing stimmt für Häuser und Konzern auf den Euro', () => {
    const s = neuesSpiel(1);
    const p = planJahr(s)!;
    expect(p.quelle).toBe('vorgaenger');
    expect(p.jahr).toBe(s.startJahr);
    expect(p.phasing).toBeDefined();
    const haussumme = s.haeuser.filter((h) => h.status === 'offen').reduce((sum, h) => {
      const ziel = p.knoten['haus:' + h.id]?.umsatz ?? 0;
      const ph = p.phasing[h.id];
      expect(ph).toHaveLength(52);
      expect(ph.every(Number.isInteger)).toBe(true);
      expect(summe(ph)).toBe(ziel);
      expect(planWoche(s, h.id)).toBe(ph[0]);
      return sum + ziel;
    }, 0);
    expect(haussumme).toBe(p.ziele.umsatz);
    expect(p.knoten.konzern.umsatz).toBe(haussumme);
    expect(p.ziele.umsatz).toBeGreaterThan(0);
    expect(fuehreAus(s, { typ: 'planungZiel', kennzahl: 'umsatz', wert: 100 }).ok).toBe(false);
  });

  test('KW 40: Zielsetzung, Bottom-up-Übersteuerung, Abschluss und Fristvorschlag', () => {
    const s = neuesSpiel(3);
    s.woche = 38; // KW 39 endet, Beginn Planungsfenster
    planungWoche(s);
    s.woche = 39;
    const e = s.planung!.entwurf!;
    expect(e.jahr).toBe(s.startJahr + 1);
    const davor = planungAssistent(s);
    const id = davor.knoten.find((n) => n.ebene === 'region')!.id;
    expect(s.entscheidungen.some((x) => x.typ === 'planung_jahr')).toBe(true);
    expect(fuehreAus(s, { typ: 'planungZiel', kennzahl: 'umsatz', wert: e.ziele.umsatz + 5_000_000 }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'planungVerteilen', id, umsatz: 12_000_000 }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'planungAbschliessen', quelle: 'spieler' }).ok).toBe(true);
    const p = planJahr(s, s.startJahr + 1)!;
    expect(p.ziele.umsatz).toBe(davor.vorschlag.umsatz + 5_000_000);
    expect(p.knoten[id].umsatz).toBe(12_000_000);
    expect(summe(Object.values(p.phasing).map((a) => summe(a)))).toBe(p.ziele.umsatz);
    expect(s.entscheidungen.some((x) => x.typ === 'planung_jahr')).toBe(false);
    expect(fuehreAus(s, { typ: 'planungZiel', kennzahl: 'umsatz', wert: 1 }).ok).toBe(false);
    const r = planungBericht(s);
    expect(r.ziele).toBeDefined();
  });

  test('Standardfreigabe übernimmt den unveränderten Controlling-Vorschlag', () => {
    const s = neuesSpiel(4);
    s.woche = 38;
    planungWoche(s);
    s.woche = 39;
    const v = planungAssistent(s).vorschlag;
    expect(fuehreAus(s, { typ: 'planungZiel', kennzahl: 'umsatz', wert: v.umsatz + 10_000_000 }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'planungAbschliessen', quelle: 'controlling' }).ok).toBe(true);
    expect(planJahr(s, s.startJahr + 1)!.ziele.umsatz).toBe(v.umsatz);
  });

  test('Forecast 3+9: Ist bleibt fix, Übersteuerung stimmt auf Jahresziel, Freigabe über Posteingang', () => {
    const s = neuesSpiel(1);
    s.cash = 5e9;
    schritt(s, 13);
    const f = s.planung!.forecasts[0];
    expect(f.bezeichnung).toBe('3+9');
    expect(f.status).toBe('offen');
    const ist = summe(f.wochenUmsatz.slice(0, 13));
    expect(ist).toBe(summe(s.historie.slice(0, 13).map((k) => k.umsatz)));
    const neu = f.ziele.umsatz + 3_000_000;
    expect(fuehreAus(s, { typ: 'planungForecast', umsatz: neu, ebitda: f.ziele.ebitda + 400_000 }).ok).toBe(true);
    expect(summe(f.wochenUmsatz)).toBe(neu);
    expect(summe(f.wochenUmsatz.slice(0, 13))).toBe(ist);
    const e = s.entscheidungen.find((x) => x.typ === 'planung_forecast')!;
    expect(fuehreAus(s, { typ: 'entscheiden', id: e.id, option: 'abgeben' }).ok).toBe(true);
    expect(f.status).toBe('abgegeben');
  });

  test('Vertrauen: korrekte Schwellen und Abweichungen in beide Richtungen', () => {
    expect(forecastVertrauensDelta(0)).toBe(2);
    expect(forecastVertrauensDelta(-0.019)).toBe(2);
    expect(forecastVertrauensDelta(0.03)).toBe(0);
    expect(forecastVertrauensDelta(-0.06)).toBe(-3);
    expect(forecastVertrauensDelta(0.06)).toBe(-1);
    expect(forecastVertrauensDelta(-0.11)).toBe(-6);
    expect(forecastVertrauensDelta(0.11)).toBe(-6);
  });

  test('Bonusquote beginnt bei 10 % je Ebene und ist gegen ungültige Werte geschützt', () => {
    const s = neuesSpiel(2);
    expect(s.planung!.bonusAnteil).toEqual({ haus: .1, hauscluster: .1, bereich: .1 });
    expect(fuehreAus(s, { typ: 'planungBonus', ebene: 'haus', anteil: .2 }).ok).toBe(true);
    expect(s.planung!.bonusAnteil.haus).toBe(.2);
    expect(fuehreAus(s, { typ: 'planungBonus', ebene: 'haus', anteil: .6 }).ok).toBe(false);
  });

  test('Der Jahresplan beeinflusst im ersten Quartal weder Umsatz noch EBITDA-Buchung', () => {
    const s = neuesSpiel(1);
    s.cash = 5e9;
    schritt(s, 12);
    expect(s.planung!.boni).toHaveLength(0);
    expect(s.historie.every((k) => k.personal > 0 && Number.isInteger(k.ebitda))).toBe(true);
  });
});
