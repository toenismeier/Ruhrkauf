import { neuesSpiel, wocheAbspielen, fuehreAus, WG_DEF } from '../src';
import { einkaufDispo } from '../src/einkauf';
import { botRegulaer, REGULAER_SCHLIESSUNGSQUOTE } from '../scripts/bot';

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

  test('Bot D skaliert Schließungen proportional, lässt Datenhäuser und Premium unangetastet', () => {
    const s = neuesSpiel(1);
    for (let i = 0; i < 4; i++) {
      botRegulaer(s);
      wocheAbspielen(s);
    }
    const portfolio = s.haeuser.filter((h) => h.status === 'offen' && !h.nurDaten && h.klasse !== 'premium');
    const erwartet = Math.round(portfolio.length * REGULAER_SCHLIESSUNGSQUOTE);
    botRegulaer(s);
    const schliessungen = s.haeuser.filter((h) => h.status === 'schliessung_verhandlung' || h.status === 'raeumung');
    expect(schliessungen).toHaveLength(erwartet);
    expect(s.haeuser.filter((h) => h.nurDaten || h.klasse === 'premium').every((h) => h.status === 'offen')).toBe(true);
  });
});
