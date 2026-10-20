import { fuehreAus, neuesSpiel, portfolio, vorschau, wocheAbspielen, gruppenFuer } from '../src';
import type { GameState, WochenKpi } from '../src';
import { botTief } from '../scripts/bot';
import { bestandWert, kvLimit } from '../src/ware';
import { eroeffneInsolvenz } from '../src/prozesse';
import { hausAttraktivitaet } from '../src/ereignisse';

function spiele(s: GameState, n: number, freigeben = false): WochenKpi[] {
  const out: WochenKpi[] = [];
  for (let i = 0; i < n && s.phase !== 'zerschlagen'; i++) {
    if (freigeben) fuehreAus(s, { typ: 'sammelfreigabe' });
    out.push(wocheAbspielen(s));
  }
  return out;
}

describe('Welt', () => {
  const s = neuesSpiel(1);
  test('130 Warenhäuser und 50 Sporthäuser', () => {
    expect(s.haeuser.filter((h) => h.format === 'warenhaus')).toHaveLength(130);
    expect(s.haeuser.filter((h) => h.format === 'sport')).toHaveLength(50);
  });
  test('jedes Haus hat Etagen, Flächen und Potenzial je Sortiment', () => {
    for (const h of s.haeuser) {
      expect(h.etagen.length).toBeGreaterThan(0);
      expect(h.flaechen.length).toBeGreaterThan(0);
      for (const f of h.flaechen) expect(h.etagen).toContain(f.etage);
      for (const g of new Set(h.flaechen.map((f) => f.gruppe!))) {
        expect(gruppenFuer(h.format)).toContain(g);
        expect(h.potenzial[g]).toBeGreaterThan(0);
      }
    }
  });
  test('Geldbeträge sind ganze Euro', () => {
    for (const h of s.haeuser) expect(Number.isInteger(h.miete.mieteWoche)).toBe(true);
    for (const k of s.bestand) expect(Number.isInteger(k.wert)).toBe(true);
  });
});

describe('Simulation', () => {
  test('deterministisch bei gleichem Seed', () => {
    const a = neuesSpiel(42);
    const b = neuesSpiel(42);
    const ka = spiele(a, 30);
    const kb = spiele(b, 30);
    expect(ka).toEqual(kb);
    expect(a.meldungen).toEqual(b.meldungen);
  });

  test('keine NaN-Werte in 104 Wochen', () => {
    const s = neuesSpiel(3);
    for (const k of spiele(s, 104)) for (const v of Object.values(k)) if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
  });

  test('Ausgangslage: Verlust im Jahr, Gewinn im Weihnachtsquartal', () => {
    const s = neuesSpiel(1);
    s.cash = 5e9; // Liquidität ausblenden
    const k = spiele(s, 52, true); // Ausgangslage: der Einkauf gibt alle Orders frei
    const q = [0, 1, 2, 3].map((i) => k.slice(i * 13, i * 13 + 13).reduce((a, b) => a + b.ebitda, 0));
    const jahr = q.reduce((a, b) => a + b, 0);
    const umsatz = k.reduce((a, b) => a + b.umsatz, 0);
    expect(jahr / umsatz).toBeLessThan(-0.01);
    expect(jahr / umsatz).toBeGreaterThan(-0.08);
    expect(q[3]).toBeGreaterThan(0);
    expect(q[0]).toBeLessThan(0);
  });

  test('ohne Eingriff folgt die Insolvenz binnen zwei Jahren', () => {
    const s = neuesSpiel(1);
    spiele(s, 104);
    expect(s.insolvenzenGesamt).toBeGreaterThanOrEqual(1);
  });

  test('tiefe Sanierung überlebt fünf Jahre', () => {
    const s = neuesSpiel(1);
    for (let i = 0; i < 260 && s.phase !== 'zerschlagen'; i++) { botTief(s); wocheAbspielen(s); }
    expect(s.phase).toBe('regulaer');
    expect(s.woche).toBe(260);
  });

  test('Vorschau verändert den Spielstand nicht', () => {
    const s = neuesSpiel(5);
    spiele(s, 3);
    const vorher = JSON.stringify(s);
    const v = vorschau(s, 13);
    expect(v).toHaveLength(13);
    expect(JSON.stringify(s)).toBe(vorher);
  });
});

describe('Mechaniken', () => {
  test('Schließung: Verhandlung, Räumung, Sozialplan, Restmiete', () => {
    const s = neuesSpiel(2);
    s.cash = 5e9; // Insolvenz ausblenden, sonst gilt die verkürzte Restmiete
    spiele(s, 2);
    const h = s.haeuser.find((x) => x.format === 'warenhaus' && x.miete.vermieter === 'dritt' && x.miete.bisWoche > 120)!;
    expect(fuehreAus(s, { typ: 'schliessen', haus: h.id }).ok).toBe(true);
    expect(h.status).toBe('schliessung_verhandlung');
    const dauer = (h.statusBis ?? 0) - s.woche;
    spiele(s, dauer + 1); // Statuswechsel greift zu Beginn der Folgewoche
    expect(h.status).toBe('raeumung');
    const umsatzVorher = s.historie[s.historie.length - 1].umsatz;
    expect(umsatzVorher).toBeGreaterThan(0);
    spiele(s, 6);
    expect(h.status).toBe('geschlossen');
    expect(h.personal.vollzeit).toBe(0);
    expect(h.restmieteBis! - s.woche).toBeGreaterThan(40);
    expect(fuehreAus(s, { typ: 'schliessen', haus: h.id }).ok).toBe(false);
  });

  test('Sanierungstarif sperrt Schließungen offener Häuser', () => {
    const s = neuesSpiel(4);
    s.stakeholder.betriebsrat = 100;
    const r = fuehreAus(s, { typ: 'tarif', ziel: 'sanierung', garantieWochen: 52 });
    expect(r.ok).toBe(true);
    if (s.tarif === 'sanierung') expect(fuehreAus(s, { typ: 'schliessen', haus: s.haeuser[0].id }).ok).toBe(false);
  });

  test('Aktionsauswertung: Marketing übertreibt, gutes Controlling trifft den echten Wert', () => {
    const s = neuesSpiel(6);
    expect(fuehreAus(s, { typ: 'controlling', stufe: 2 }).ok).toBe(true);
    spiele(s, 2);
    expect(s.controllingStufe).toBe(2);
    const kontroll = s.haeuser.filter((h) => h.format === 'warenhaus').slice(0, 8).map((h) => h.id);
    expect(fuehreAus(s, { typ: 'aktion', rabatt: 0.2, wochen: 2, scope: { typ: 'format', format: 'warenhaus' }, kontrollHaeuser: kontroll }).ok).toBe(true);
    spiele(s, 3);
    const a = s.marketing.aktionen[0];
    expect(a.ausgewertet).toBeDefined();
    const e = a.ausgewertet!;
    expect(e.marketingBericht).toBeGreaterThan(Math.abs(a._mehrumsatzWahr));
    expect(e.schaetzungVon).toBeLessThan(e.schaetzungBis);
    expect(a._mehrumsatzWahr).toBeGreaterThan(0);
    expect(a._rohertragseffektWahr).toBeLessThan(0); // Rabatt kostet Marge
  });

  test('Kreditversicherer: sinkendes Vertrauen senkt das Limit', () => {
    const s = neuesSpiel(1);
    const hoch = kvLimit(s);
    s.stakeholder.kreditversicherer = 30;
    expect(kvLimit(s)).toBeLessThan(hoch / 2);
    s.stakeholder.kreditversicherer = 15;
    expect(kvLimit(s)).toBe(0);
  });

  test('Untermiete: Fläche geht in den Umbau und bringt danach Miete', () => {
    const s = neuesSpiel(8);
    spiele(s, 1);
    let an = s.angebote.find((a) => a.typ === 'untermiete' && a.status === 'offen');
    for (let i = 0; i < 20 && !an; i++) { spiele(s, 1); an = s.angebote.find((a) => a.typ === 'untermiete' && a.status === 'offen'); }
    expect(an).toBeDefined();
    const h = s.haeuser.find((x) => x.id === an!.vorschlagHaeuser![0])!;
    h.miete.vermieter = 'eigentuemer'; // Zustimmung sicher
    const r = fuehreAus(s, { typ: 'angebotAnnehmen', angebot: an!.id });
    expect(r.ok).toBe(true);
    const qm = h.flaechen.filter((f) => f.umbauZiel?.konzept === 'untermiete').reduce((a, f) => a + f.qm, 0);
    expect(qm).toBeGreaterThanOrEqual((an!.qmJeHaus ?? 0) - 1);
    spiele(s, 11);
    expect(h.kpi!.untermiete).toBeGreaterThan(0);
  });

  test('Paketdeal: Tausch gegen schwache Häuser wird abgelehnt', () => {
    const s = neuesSpiel(9);
    s.cash = 5e9;
    let an;
    for (let i = 0; i < 400 && !an && s.phase !== 'zerschlagen'; i++) { spiele(s, 1); an = s.angebote.find((a) => a.typ === 'paket' && a.status === 'offen'); }
    expect(an).toBeDefined();
    const schwach = s.haeuser
      .filter((h) => h.status === 'offen' && h.format === 'warenhaus' && h.etagen.includes(an!.etage!) && !an!.wunschHaeuser!.includes(h.id))
      .sort((a, b) => hausAttraktivitaet(a) - hausAttraktivitaet(b))
      .slice(0, an!.wunschHaeuser!.length)
      .map((h) => h.id);
    const r = fuehreAus(s, { typ: 'angebotVerhandeln', angebot: an!.id, haeuser: schwach });
    expect(r.text).toMatch(/nicht die Standorte|unter/i);
    expect(an!.vorschlagHaeuser).toEqual(an!.wunschHaeuser);
  });

  test('Mietverhandlung: neutraler Eigentümer senkt bei negativem DB', () => {
    const s = neuesSpiel(10);
    spiele(s, 2);
    const h = s.haeuser.find((x) => x.miete.vermieter === 'eigentuemer' && x.status === 'offen')!;
    h.kpi = { ...h.kpi!, db: -50_000 };
    const vorher = h.miete.mieteWoche;
    expect(fuehreAus(s, { typ: 'mieteVerhandeln', haus: h.id, reduktion: 0.2 }).ok).toBe(true);
    expect(h.miete.mieteWoche).toBeLessThan(vorher * 0.81);
    expect(fuehreAus(s, { typ: 'mieteVerhandeln', haus: h.id, reduktion: 0.2 }).ok).toBe(false); // Cooldown
  });

  test('Konzession: Lieferant übernimmt Ware, Personal geht per Betriebsübergang', () => {
    const s = neuesSpiel(11);
    spiele(s, 2);
    const ids = s.haeuser.filter((h) => h.format === 'warenhaus' && h.lage === '1a').slice(0, 10).map((h) => h.id);
    const fteVorher = ids.reduce((a, id) => { const p = s.haeuser.find((h) => h.id === id)!.personal; return a + p.vollzeit + p.teilzeit; }, 0);
    const bestVorher = bestandWert(s, 'beauty');
    const cashVorher = s.cash;
    const r = fuehreAus(s, { typ: 'geschaeftsmodell', haeuser: ids, gruppe: 'beauty', modell: 'konzession' });
    expect(r.ok).toBe(true);
    expect(bestandWert(s, 'beauty')).toBeLessThan(bestVorher);
    expect(s.cash).toBeGreaterThan(cashVorher);
    const fteNach = ids.reduce((a, id) => { const p = s.haeuser.find((h) => h.id === id)!.personal; return a + p.vollzeit + p.teilzeit; }, 0);
    expect(fteNach).toBeLessThan(fteVorher);
    spiele(s, 3);
    const h = s.haeuser.find((x) => x.id === ids[0])!;
    expect(h.kpi!.konzessionserloes).toBeGreaterThan(0);
  });

  test('Sonderposten, der nicht passt, verkauft sich nur über Offprice', () => {
    const s = neuesSpiel(12);
    s.angebote.push({ id: 'sp', typ: 'sonderposten', woche: 0, frist: 5, titel: 'x', text: 'x', gruppe: 'damen', wert: 4_000_000, _passt: false, status: 'offen' });
    expect(fuehreAus(s, { typ: 'angebotAnnehmen', angebot: 'sp' }).ok).toBe(true);
    const k = s.bestand.find((x) => x.ladenhueter)!;
    const wert = k.wert;
    spiele(s, 4);
    // nur Abschriften, kein Abverkauf ohne Offprice-Fläche
    expect(k.wert).toBeLessThan(wert);
    expect(k.wert).toBeGreaterThan(wert * 0.7);
  });

  test('Insolvenz: Insolvenzgeld entlastet die Kasse, Altverbindlichkeiten sind eingefroren', () => {
    const s = neuesSpiel(13);
    spiele(s, 2);
    eroeffneInsolvenz(s, 'Test');
    expect(s.phase).toBe('insolvenz');
    expect(s.verbindlichkeiten).toHaveLength(0);
    expect(s.insolvenz!.altVerbindlichkeiten).toBeGreaterThan(100_000_000);
    const alt = s.insolvenz!.altVerbindlichkeiten;
    spiele(s, 1);
    expect(s.insolvenz!.altVerbindlichkeiten).toBeGreaterThan(alt); // Insolvenzgeld wird Insolvenzforderung
  });

  test('Sportverkauf entfernt die Sportkette samt Ware', () => {
    const s = neuesSpiel(14);
    spiele(s, 2);
    s.angebote.push({ id: 'sv', typ: 'sportverkauf', woche: 2, frist: 10, titel: 'x', text: 'x', kaufpreis: 80_000_000, status: 'offen' });
    const cash = s.cash;
    expect(fuehreAus(s, { typ: 'angebotAnnehmen', angebot: 'sv' }).ok).toBe(true);
    expect(s.cash).toBe(cash + 80_000_000);
    expect(s.haeuser.filter((h) => h.format === 'sport' && h.status !== 'verkauft')).toHaveLength(0);
    expect(bestandWert(s, 'sportschuhe')).toBe(0);
    spiele(s, 2);
    expect(portfolio(s).some((p) => p.format === 'sport')).toBe(false);
  });

  test('Quartalsplan des Eigentümers wird gemessen', () => {
    const s = neuesSpiel(15);
    spiele(s, 1);
    expect(s.quartale).toHaveLength(1);
    expect(fuehreAus(s, { typ: 'plan', ebitda: s.quartale[0].planStandard }).ok).toBe(true);
    spiele(s, 12);
    expect(s.meldungen.some((m) => m.typ === 'eigentuemer' && m.text.startsWith('Quartal 1'))).toBe(true);
  });
});
