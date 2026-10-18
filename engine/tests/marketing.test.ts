import {
  aktionsAuswertung, aktionskalender, crmKampagnen, fuehreAus, kanaele, kundenkarte, marketingKosten, marketingUebersicht, neuesSpiel, wocheAbspielen,
  KANAELE, STARTKALENDER,
} from '../src';
import type { GameState } from '../src';
import { crmVersand, delegiereAktionskalender, delegiereCrm, delegiereKanalbudget, marketingAltwareFaktor, marketingHausFaktor, marketingVorbereiten, umsatzBezug } from '../src/marketing';

const spiele = (s: GameState, n: number) => { for (let i = 0; i < n; i++) { fuehreAus(s, { typ: 'sammelfreigabe' }); wocheAbspielen(s); } };
const summe = (s: GameState, von: number, bis: number, f: (k: GameState['historie'][number]) => number) => s.historie.filter((k) => k.woche >= von && k.woche < bis).reduce((a, k) => a + f(k), 0);

describe('Marketing', () => {
  test('Ausgangslage: Standardplan wirkt neutral, netto exakt die bisherige Werbequote', () => {
    const s = neuesSpiel(1);
    spiele(s, 6);
    for (const h of s.haeuser.slice(0, 20)) expect(marketingHausFaktor(s, h)).toBe(1);
    const k = s.historie[s.historie.length - 1];
    const mk = marketingKosten(s, k.umsatz);
    expect(mk.netto / k.umsatz).toBeCloseTo(0.025, 9);
    expect(mk.brutto / k.umsatz).toBeGreaterThan(0.03);
    expect(mk.brutto / k.umsatz).toBeLessThan(0.04);
    expect(s.marketing.stand.ist).toEqual(s.marketing.stand.plan);
  });

  test('Größenordnungen: Prospekt größter Block, Kartenanteil, Öffnung und Einlösung realistisch', () => {
    const s = neuesSpiel(2);
    spiele(s, 14);
    const kn = kanaele(s).kanaele;
    const prospekt = kn.find((x) => x.id === 'prospekt')!;
    for (const x of kn) if (x.id !== 'prospekt') expect(prospekt.budgetWoche).toBeGreaterThan(x.budgetWoche * 3);
    const karte = kundenkarte(s);
    expect(karte.umsatzAnteil).toBeGreaterThan(0.3);
    expect(karte.umsatzAnteil).toBeLessThan(0.5);
    expect(karte.app.aktiveNutzer).toBeLessThan(karte.app.downloads);
    const crm = crmKampagnen(s).kampagnen;
    const news = crm.find((c) => c.name === 'Hartwig Newsletter')!;
    expect(news.summe.oeffnungsrate).toBeGreaterThan(0.15);
    expect(news.summe.oeffnungsrate).toBeLessThan(0.3);
    const geb = crm.find((c) => c.name === 'Geburtstagsgruß')!;
    expect(geb.summe.einloesequote).toBeGreaterThan(0.02);
    expect(geb.summe.einloesequote).toBeLessThan(0.08);
    const u = marketingUebersicht(s);
    expect(u.werbequoteNetto).toBeCloseTo(0.025, 6);
    expect(u.frequenzWoche).toBeGreaterThan(1_000_000);
  });

  test('Aktionskalender: alle Warenhaus-Klassiker, Folgejahr ab KW 40', () => {
    const s = neuesSpiel(1);
    const k = aktionskalender(s);
    const anl = new Set(k.eintraege.map((e) => e.anlass));
    for (const a of ['wsv', 'ssv', 'midseason', 'blackfriday', 'weihnachten', 'ostern', 'muttertag', 'beauty', 'waesche', 'schulanfang', 'jubilaeum', 'mwst', 'friends', 'personalkauf']) expect(anl.has(a as never)).toBe(true);
    expect(k.eintraege.length).toBe(STARTKALENDER.length);
    expect(k.anlaesse.some((a) => a.id === 'raeumung')).toBe(true);
    s.woche = 39; // Planung des Folgejahres (Kalender, ohne die ganze Simulation)
    spiele(s, 1);
    expect(aktionskalender(s, s.startJahr + 1).eintraege.length).toBe(STARTKALENDER.length);
  });

  test('Zusätzliche Aktion: Mehrumsatz, Margenverlust, Mitnahme, Gewöhnung, Auswertung mit Kontrollhäusern', () => {
    const s = neuesSpiel(5);
    spiele(s, 6);
    const ohne = structuredClone(s);
    const kontroll = s.haeuser.filter((h) => h.format === 'warenhaus').slice(0, 8).map((h) => h.id);
    const r = fuehreAus(s, { typ: 'aktionPlanen', name: 'Frühlingsrabatt', mechanik: 'rabatt_alles', rabatt: 0.25, wochen: 2, kontrollHaeuser: kontroll, sonderwerbung: 800_000 });
    expect(r.ok).toBe(true);
    const id = (r as { id?: string }).id!;
    spiele(s, 3); spiele(ohne, 3);
    const a = s.marketing.aktionen.find((x) => x.id === id)!;
    expect(a._mehrumsatzWahr).toBeGreaterThan(0);
    expect(a._rohertragseffektWahr).toBeLessThan(0);
    expect(summe(s, 6, 8, (k) => k.umsatz)).toBeGreaterThan(summe(ohne, 6, 8, (k) => k.umsatz));
    expect(s.marketing.gewoehnung).toBeGreaterThan(ohne.marketing.gewoehnung);
    const e = aktionsAuswertung(s, id) as unknown as Record<string, number | string | boolean>;
    expect(e.gemessen).toBe(true);
    expect(e.hinweis).toBeDefined();
    expect(Number(e.mitnahme)).toBeGreaterThan(0);
    expect(Number(e.vorzieheffekt)).toBeGreaterThan(0);
    expect(Number(e.mehrumsatzVon)).toBeLessThan(Number(e.mehrumsatzBis));
    // Nach der Aktion fehlt vorgezogene Nachfrage
    expect(s.marketing.stand.ist.vorzug.damen ?? 0).toBeGreaterThan(s.marketing.stand.plan.vorzug.damen ?? 0);
  });

  test('Bereichsaktion kannibalisiert, Sale baut Altware ab, Absage spart Marge', () => {
    const s = neuesSpiel(3);
    spiele(s, 2);
    const r = fuehreAus(s, { typ: 'aktionPlanen', anlass: 'beauty', start: 3, rabatt: 0.25 });
    expect(r.ok).toBe(true);
    spiele(s, 3);
    const a = s.marketing.aktionen.find((x) => x.id === (r as { id?: string }).id)!;
    expect(a._wahr!.kanni).toBeLessThan(0);
    // WSV läuft im Standard bis KW 4: ohne Sale weniger Altwarenabbau
    const t = neuesSpiel(3);
    fuehreAus(t, { typ: 'aktionAbsagen', id: 'k0-1' }); // abgesagt vor Start nicht möglich, Start in Woche 0: vorzeitig beendet
    spiele(t, 1);
    marketingVorbereiten(t); // Woche 1: im Standardplan läuft der WSV noch
    expect(marketingAltwareFaktor(t, 'damen')).toBeLessThan(1);
    // Black Friday absagen: weniger Umsatz in der Woche, bessere Rohertragsquote
    const b = neuesSpiel(4);
    b.cash = 5e9;
    const bf = b.marketing.aktionen.find((x) => x.anlass === 'blackfriday')!;
    b.woche = bf.start - 2;
    const c = structuredClone(b);
    expect(fuehreAus(c, { typ: 'aktionAbsagen', id: bf.id }).ok).toBe(true);
    spiele(b, 3); spiele(c, 3);
    const w = bf.start;
    expect(summe(c, w, w + 1, (k) => k.umsatz)).toBeLessThan(summe(b, w, w + 1, (k) => k.umsatz));
    expect(summe(c, w, w + 1, (k) => k.rohertrag) / summe(c, w, w + 1, (k) => k.umsatz)).toBeGreaterThan(summe(b, w, w + 1, (k) => k.rohertrag) / summe(b, w, w + 1, (k) => k.umsatz));
  });

  test('Kanäle: Kürzung senkt die Nachfrage, TV baut Marke und Image auf, Dauerbeschallung nutzt ab', () => {
    const s = neuesSpiel(1);
    expect(fuehreAus(s, { typ: 'kanalBudget', kanal: 'alle', faktor: 0.5 }).ok).toBe(true);
    spiele(s, 8);
    expect(marketingHausFaktor(s, s.haeuser[0])).toBeLessThan(0.995);
    const t = neuesSpiel(1);
    const plan = structuredClone(t);
    expect(fuehreAus(t, { typ: 'kanalBudget', kanal: 'tv', faktor: 3 }).ok).toBe(true);
    expect(fuehreAus(t, { typ: 'kanalBudget', kanal: 'radio', faktor: 3, regionen: { West: 2 } }).ok).toBe(true);
    spiele(t, 26); spiele(plan, 26);
    expect(t.marketing.stand.ist.marke).toBeGreaterThan(t.marketing.stand.plan.marke + 0.5);
    expect(t.stakeholder.image).toBeGreaterThan(plan.stakeholder.image);
    expect(t.marketing.stand.ist.kanaele.tv.abnutzung).toBeGreaterThan(0.05);
    expect(t.historie[t.historie.length - 1].marketing).toBeGreaterThan(plan.historie[plan.historie.length - 1].marketing);
  });

  test('Hartwig Karte und App: Stufen, Punkte und Anmeldeaktion heben den Kartenanteil, kosten aber', () => {
    const s = neuesSpiel(2);
    const plan = structuredClone(s);
    expect(fuehreAus(s, { typ: 'kundenkarteSetzen', stufen: true, punkteSatz: 0.01, anmeldepraemie: 10, anmeldeWochen: 12, datenBudgetWoche: 40_000 }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'appSetzen', relaunch: true, appCoupons: true }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'appSetzen', relaunch: true }).ok).toBe(false);
    spiele(s, 20); spiele(plan, 20);
    const k = kundenkarte(s); const p = kundenkarte(plan);
    expect(k.umsatzAnteil).toBeGreaterThan(p.umsatzAnteil + 0.02);
    expect(k.mitglieder).toBeGreaterThan(p.mitglieder);
    expect(k.app.qualitaet).toBeGreaterThan(p.app.qualitaet + 0.2);
    expect(k.datenqualitaet).toBeGreaterThan(p.datenqualitaet);
    expect(k.kostenWoche.summe).toBeGreaterThan(p.kostenWoche.summe * 1.5);
  });

  test('CRM: Kampagne mit Ergebnis, zu viel Versand ermüdet, Stopp wirkt', () => {
    const s = neuesSpiel(1);
    const r = fuehreAus(s, { typ: 'crmKampagneAnlegen', name: 'Reaktivierung', segment: { typ: 'inaktive' }, kanal: 'mail', angebot: { typ: 'coupon', prozent: 0.15, mindestbon: 40 }, frequenz: 'woechentlich' });
    expect(r.ok).toBe(true);
    const r2 = fuehreAus(s, { typ: 'crmKampagneAnlegen', name: 'Alle nochmal', segment: { typ: 'alle' }, kanal: 'mail', angebot: { typ: 'coupon', prozent: 0.1, mindestbon: 0 }, frequenz: 'woechentlich' });
    expect(r2.ok).toBe(true);
    const oeffnungVorher = crmVersand(s, s.marketing.stand.ist, s.marketing.stand.ist.crm[0]).geoeffnet;
    spiele(s, 8);
    const I = s.marketing.stand.ist;
    expect(I.ermuedung.mail).toBeGreaterThan(s.marketing.stand.plan.ermuedung.mail + 0.1);
    expect(crmVersand(s, I, I.crm[0]).geoeffnet).toBeLessThan(oeffnungVorher);
    expect(I.karte.optInMail).toBeLessThan(s.marketing.stand.plan.karte.optInMail);
    const z = crmKampagnen(s).kampagnen.find((c) => c.id === (r as { id?: string }).id)!;
    expect(z.summe.sendungen).toBe(8);
    expect(z.auswertung!.mehrumsatzVon).toBeLessThan(z.auswertung!.mehrumsatzBis);
    expect(fuehreAus(s, { typ: 'crmKampagneStoppen', id: z.id }).ok).toBe(true);
    spiele(s, 1);
    expect(crmKampagnen(s).kampagnen.find((c) => c.id === z.id)!.summe.sendungen).toBe(8);
  });

  test('Kompatibel: Werbebudget, Kundenkarte, Delegation', () => {
    const s = neuesSpiel(1);
    expect(fuehreAus(s, { typ: 'marketingBudget', quote: 0.018 }).ok).toBe(true);
    const f = s.marketing.stand.ist.kanaele.tv.quote / KANAELE.find((d) => d.id === 'tv')!.quote;
    expect(f).toBeLessThan(0.72);
    for (const d of KANAELE) expect(s.marketing.stand.ist.kanaele[d.id].quote / d.quote).toBeCloseTo(f, 10);
    const U = umsatzBezug(s);
    expect(marketingKosten(s, U).netto / U).toBeCloseTo(0.018, 9);
    expect(fuehreAus(s, { typ: 'kundenkarte' }).ok).toBe(true);
    expect(s.marketing.stand.ist.karte.stufen).toBe(true);
    expect(fuehreAus(s, { typ: 'kundenkarte' }).ok).toBe(false);
    const h = { rng: 7 };
    s.woche = 1;
    delegiereKanalbudget(s, 1, h);
    expect(s.marketing.budgetQuote).toBe(0.024);
    s.woche = 4;
    delegiereCrm(s, 0.9, h);
    delegiereAktionskalender(s, 0.9, h);
    spiele(s, 2);
  });
});
