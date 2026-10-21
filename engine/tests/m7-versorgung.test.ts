import { neuesSpiel, wocheAbspielen, fuehreAus, WG_DEF } from '../src';
import { einkaufDispo } from '../src/einkauf';
import { botRegulaer, botTief, botTurnaround, REGULAER_SCHLIESSUNGSQUOTE, schliessungsBudgetBotD } from '../scripts/bot';
import { schliessungsFolgekosten, schliesseEndgueltig, eroeffneInsolvenz } from '../src/prozesse';
import { aktualisiereStakeholder } from '../src/stakeholder';

describe('M7 – Versorgung und Turnaround im großen Maßstab', () => {
  test('Saison-Vororders sind nach Frist regulär automatisch freigegeben', () => {
    const s = neuesSpiel(1);
    expect(Object.values(s.einkauf.wgs).every((x) => x.st.modus.saison === 'auto')).toBe(true);
    expect(fuehreAus(s, { typ: 'freigabeGrenze', euro: 0 }).ok).toBe(true);
    // Die Herbst-/Winter-Orderrunde beginnt frühestens nach KW 2.
    let ids: string[] = [];
    for (let i = 0; i < 8 && ids.length === 0; i++) {
      wocheAbspielen(s);
      ids = s.einkauf.freigaben.filter((f) => f.art === 'saison').map((f) => f.id);
    }
    expect(ids.length).toBeGreaterThan(0);
    for (let i = 0; i < 4 && s.phase !== 'zerschlagen'; i++) wocheAbspielen(s);
    const imEinkauf = s.bestellungen.some((b) => ids.some((id) => b.id.startsWith(`b${id}-`)));
    expect(imEinkauf).toBe(true);
    expect(s.einkauf.protokoll.reduce((a, p) => a + p.verfallen, 0)).toBe(0);
  });

  test('expliziter Verfall-Modus und Ablehnung bleiben als Managemententscheidung erhalten', () => {
    const s = neuesSpiel(1);
    expect(fuehreAus(s, { typ: 'wgFreigabeModus', wg: 'damen', art: 'saison', modus: 'verfall' }).ok).toBe(true);
    expect(WG_DEF.filter((d) => d.bereich === 'damen').every((d) => s.einkauf.wgs[d.id].st.modus.saison === 'verfall')).toBe(true);
    expect(fuehreAus(s, { typ: 'freigabeGrenze', euro: 0 }).ok).toBe(true);
    wocheAbspielen(s);
    const id = s.einkauf.freigaben[0]?.id;
    expect(id).toBeDefined();
    expect(fuehreAus(s, { typ: 'freigabeAblehnen', ids: [id!] }).ok).toBe(true);
    expect(s.einkauf.freigaben.some((f) => f.id === id)).toBe(false);
  });

  test('Bedarfsplanung reagiert auf weggefallenes Portfolio statt auf den Startwert', () => {
    const s = neuesSpiel(1);
    const d = WG_DEF.find((d) => d.bereich === 'damen')!;
    const vorher = s.einkauf.wgs[d.id].basisVK;
    s.basisUmsatz.damen = (s.basisUmsatz.damen ?? 0) * 0.7;
    einkaufDispo(s);
    expect(s.einkauf.wgs[d.id].basisVK).toBeCloseTo(vorher * 0.7, 3);
    expect(s.einkauf.wgs[d.id].basisVK).toBeLessThan(vorher);
  });

  test('Bot D staffelt ausschließlich verlustbringende Häuser innerhalb des Schließungsbudgets', () => {
    const s = neuesSpiel(1);
    for (let i = 0; i < 4; i++) {
      botRegulaer(s);
      wocheAbspielen(s);
    }
    const vorher = new Map(s.haeuser.map((h) => [h.id, h.kpi?.guv?.ebitda]));
    const budget = schliessungsBudgetBotD(s);
    expect(budget.budget).toBeGreaterThanOrEqual(0);
    botRegulaer(s);
    const geschlossen = s.haeuser.filter((h) => h.status === 'schliessung_verhandlung');
    const ziel = Math.round(s.haeuser.filter((h) => !h.nurDaten && h.klasse !== 'premium').length * REGULAER_SCHLIESSUNGSQUOTE);
    expect(geschlossen.length).toBeLessThanOrEqual(Math.min(6, ziel));
    expect(geschlossen.every((h) => (vorher.get(h.id) ?? 0) < 0)).toBe(true);
    expect(s.haeuser.filter((h) => h.nurDaten || h.klasse === 'premium').every((h) => h.status === 'offen')).toBe(true);
    const gebunden = geschlossen.reduce((sum, h) =>
      sum + schliessungsFolgekosten(s, h, Math.max(0, (h.statusBis ?? s.woche) - s.woche) + 6).gesamt, 0);
    // Bereits eingeleitete Fälle müssen vollständig im Folge-Budget stehen.
    const nachher = schliessungsBudgetBotD(s);
    expect(nachher.bereitsGebunden).toBeGreaterThanOrEqual(gebunden - 1);
    expect(nachher.budget).toBeGreaterThanOrEqual(0);
  });

  test('Sozialplan und Restmieten sind echte Zahlungen und entsprechen dem Vorab-Budget', () => {
    const s = neuesSpiel(2);
    const h = s.haeuser.find((x) => !x.nurDaten && x.klasse !== 'premium')!;
    const vorher = schliessungsFolgekosten(s, h);
    const kasse = s.cash;
    schliesseEndgueltig(s, h);
    expect(kasse - s.cash).toBe(vorher.sozialplan);
    expect(h.restmieteWoche).toBe(vorher.restmieteWoche);
    expect(h.restmieteBis).toBe(s.woche + vorher.restmieteWochen);
    expect(vorher.gesamt).toBe(vorher.sozialplan + vorher.restmieteWoche * vorher.restmieteWochen);
  });

  test('Bot C nutzt erst operative Sanierung und löst den Schutzschirm nur in der Notlage aus', () => {
    const s = neuesSpiel(2, { schwierigkeit: 'mittel' });
    botTief(s);
    expect(Object.keys(s.filialProgramme ?? {})).toHaveLength(14);
    expect(s.phase).toBe('regulaer');
    for (let i = 0; i < 3; i++) wocheAbspielen(s);
    // Fehlende Deckung sämtlicher kurzfristiger Zahlungen führt
    // trotz der vorher gestarteten Programme zum Insolvenzantrag.
    s.cash = -s.kreditlinie - 1_000_000_000;
    botTief(s);
    expect(s.insolvenzenGesamt).toBe(1);
    expect(s.phase).toBe('insolvenz');
  });

  test('Bot C reagiert auch auf eine von der Engine ausgelöste Insolvenz mit echter Restrukturierung', () => {
    const s = neuesSpiel(3, { schwierigkeit: 'mittel' });
    botTief(s); // operative Programme, noch kein Schutzschirm
    wocheAbspielen(s);
    eroeffneInsolvenz(s, 'Zahlungsunfähigkeit im Test');
    const vorher = s.haeuser.filter((h) => h.status === 'schliessung_verhandlung').length;
    botTief(s);
    const nachher = s.haeuser.filter((h) => h.status === 'schliessung_verhandlung').length;
    expect(vorher).toBe(0);
    expect(nachher).toBeGreaterThan(0);
    expect(s.insolvenzenGesamt).toBe(1); // kein zweiter Antrag
    expect(s.phase).toBe('insolvenz');
  });

  test('Warenbesicherte Finanzierung erhöht nur bei Engpass die Kreditlinie', () => {
    const s = neuesSpiel(1, { schwierigkeit: 'mittel' });
    const gut = structuredClone(s);
    gut.stakeholder.bank = 60;
    gut.bestand.forEach((b) => { b.wert *= 2; });
    const basis = gut.kreditlinie;
    aktualisiereStakeholder(gut);
    expect(gut.kreditlinie).toBeLessThanOrEqual(basis * 1.1);
    const knapp = structuredClone(s);
    knapp.stakeholder.bank = 60;
    knapp.cash = 0;
    knapp.bestand.forEach((b) => { b.wert *= 2; });
    aktualisiereStakeholder(knapp);
    expect(knapp.kreditlinie).toBeGreaterThan(gut.kreditlinie);
    expect(knapp.cash).toBe(0); // Kreditrahmen statt Geldgutschrift
  });

  test('Bot T aktiviert weiterhin dieselben Programme und keine Schließung', () => {
    const s = neuesSpiel(1);
    botTurnaround(s);
    expect(Object.keys(s.filialProgramme ?? {})).toHaveLength(14);
    expect(s.haeuser.filter((h) => h.status !== 'offen')).toHaveLength(0);
    expect(s.insolvenzenGesamt).toBe(0);
  });
});
