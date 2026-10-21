// Q19 – IT-Produktseiten: vorhandene CRM-, Online- und Kassenwerte, Neutralität und Aktionen.
import { neuesSpiel, wocheAbspielen, fuehreAus, itProdukte } from '../src';
import { itHausFaktor, itWoche } from '../src/it';
import { itProduktTeamKosten } from '../src/it-produkte';

describe('Q19 IT-Produkte', () => {
  test('Start: vier digitale Produkte, keine neuen Kosten und keine Nachfrageänderung', () => {
    const s = neuesSpiel(1);
    const produkte = itProdukte(s);
    expect(produkte.map(p => p.id)).toEqual(['kundenkarte', 'hartwig_app', 'kasse', 'mobile_pay']);
    for (const p of produkte) {
      expect(p.aktiv).toBe(true);
      expect(p.team).toBe(0);
      expect(p.beschreibung).toHaveLength(2);
      expect(p.version).toMatch(/^\d+\.0$/);
      expect(p.sterne).toBeGreaterThanOrEqual(0);
      expect(p.sterne).toBeLessThanOrEqual(5);
      expect(p.verlauf).toHaveLength(0);
    }
    expect(itProduktTeamKosten(s)).toBe(0);
    itWoche(s);
    expect(itHausFaktor(s, s.haeuser.find(h => h.format === 'warenhaus')!)).toBe(1);
  });

  test('Fünf-Wochen-Verlauf und Vorwochenvergleich kommen aus den bestehenden Daten', () => {
    const s = neuesSpiel(2);
    for (let i=0; i<6; i++) wocheAbspielen(s);
    const daten = itProdukte(s);
    const karte = daten.find(p => p.id === 'kundenkarte')!;
    const app = daten.find(p => p.id === 'hartwig_app')!;
    const kasse = daten.find(p => p.id === 'kasse')!;
    const mobil = daten.find(p => p.id === 'mobile_pay')!;
    for (const p of daten) {
      expect(p.verlauf).toHaveLength(5);
      expect(p.verlauf.map(x=>x.woche)).toEqual([...p.verlauf.map(x=>x.woche)].sort((a,b)=>a-b));
      expect(p.verlauf.at(-1)?.wert).toBe(p.kennzahl);
      expect(p.aenderung).toBe(p.kennzahl - p.verlauf[p.verlauf.length-2].wert);
    }
    const crm = s.marketing.stand.ist.karte;
    expect(karte.kennzahl).toBe(Math.round(crm.mitglieder * crm.aktivQuote));
    expect(app.kennzahl).toBe(Math.round(crm.app.aktiveNutzer));
    expect(kasse.kennzahl).toBeGreaterThan(0);
    expect(mobil.kennzahl).toBe(0); // Noch keine mobile Ausbaustufe
    expect(app.details.some(([name])=>name==='Click & Collect')).toBe(true);
    expect(app.details.some(([name])=>name==='Online-Shop')).toBe(true);
  });

  test('Teams werden ausschließlich in Dreierschritten zugeteilt und verursachen Zusatzkosten', () => {
    const s = neuesSpiel(3);
    const basis = s.zentrale.kostenWoche;
    expect(fuehreAus(s, { typ:'itProduktTeam', produkt:'hartwig_app', anzahl:2 }).ok).toBe(false);
    expect(fuehreAus(s, { typ:'itProduktTeam', produkt:'hartwig_app', anzahl:-3 }).ok).toBe(false);
    expect(fuehreAus(s, { typ:'itProduktTeam', produkt:'hartwig_app', anzahl:3 }).ok).toBe(true);
    expect(itProdukte(s).find(p=>p.id==='hartwig_app')?.team).toBe(3);
    expect(itProduktTeamKosten(s)).toBe(4_200);
    itWoche(s);
    expect(s.zentrale.kostenWoche - basis).toBe(4_200);
    expect(fuehreAus(s, { typ:'itProduktTeam', produkt:'hartwig_app', anzahl:-3 }).ok).toBe(true);
    expect(itProduktTeamKosten(s)).toBe(0);
  });

  test('Abschalten und Reaktivieren steuern die vorhandenen IT-Hebel', () => {
    const s = neuesSpiel(4);
    itWoche(s);
    const h = s.haeuser.find(x=>x.format==='warenhaus')!;
    const vorher = itHausFaktor(s,h);
    expect(fuehreAus(s,{typ:'itProduktAktiv',produkt:'kundenkarte',an:false}).ok).toBe(true);
    expect(itHausFaktor(s,h)).toBeLessThan(vorher);
    expect(itProdukte(s).find(x=>x.id==='kundenkarte')?.kennzahl).toBe(0);
    expect(fuehreAus(s,{typ:'itProduktAktiv',produkt:'kundenkarte',an:true}).ok).toBe(true);
    expect(itHausFaktor(s,h)).toBe(vorher);
    expect(fuehreAus(s,{typ:'itProduktAktiv',produkt:'mobile_pay',an:false}).ok).toBe(true);
    expect(itProdukte(s).find(x=>x.id==='mobile_pay')?.aktiv).toBe(false);
  });

  test('Vor Q19 gespeicherte IT-Zustände ohne Produkthistorie bleiben lesbar', () => {
    const s = neuesSpiel(5);
    delete s.it!.produkte;
    delete s.it!.produktVerlauf;
    expect(itProdukte(s)).toHaveLength(4);
    expect(itProdukte(s).every(p=>p.aktiv && p.team===0)).toBe(true);
    expect(itProdukte(s).every(p=>p.verlauf.length===0)).toBe(true);
  });
});
