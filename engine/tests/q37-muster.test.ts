// Q37: Musterfeld, Kategorie Anlass, Freischaltungen (auftraege/wurf4/q37-musterfeld-anlass.md).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fuehreAus, neuesSpiel, produkte, produktKatalog, produktVorschau, wocheAbspielen, migriereQ37, eigenmarkenUebersicht, EM_VORLAGEN } from '../src';
import type { GameState, Produkt } from '../src';
import { ARTIKELTYPEN, TYP, trendFuer, bewerte } from '../src/produkte';
import { MUSTER, MUSTER_INFO, musterFuer, MUSTER_ANTEILE } from '../src/muster';
import { ANLAESSE, ANLASS_TYPEN, anlassFaktor } from '../src/anlass';
import { MUSTER_ALIAS, TYP_UMBENANNT } from '../src/sortiment/q37-muster';
import { Q37_ZUSATZ } from '../src/sortiment/q37-zielgruppen';
import { saisonId } from '../src/einkauf';

const daten = (name: string) => readFileSync(resolve(__dirname, '../../auftraege/wurf4/daten', name), 'utf8').trim().split('\n').slice(1).map((l) => l.split(';'));
const spiele = (s: GameState, n: number) => { for (let i = 0; i < n; i++) { fuehreAus(s, { typ: 'sammelfreigabe' }); wocheAbspielen(s); } };
const s0 = neuesSpiel(1);
const K = produktKatalog(s0);
const typ = (n: string) => K.typen.find((t) => t.typ === n);
const ZG: Record<string, string> = { Teens: 'teens', 'Young Adults': 'young', Adults: 'adults' };

/** Zielgruppen der aufgelösten Muster-Typen auf main vor Q37 (produktKatalog, Seed 1). */
const VORHER: Record<string, string[]> = {
  'Print-Jumpsuit': ['teens', 'young', 'adults'], Punktekleid: ['young', 'adults', 'bestager'], Blumenkleid: ['teens', 'young', 'adults', 'bestager'],
  Blumenbluse: ['young', 'adults', 'bestager'], Ringelshirt: ['kinder', 'teens', 'young', 'adults', 'bestager'], 'Karo-Anzug': ['young', 'adults', 'bestager'],
  Karohemd: ['kinder', 'teens', 'young', 'adults', 'bestager'], Streifenhemd: ['young', 'adults', 'bestager'], 'Karo-Faltenrock': ['adults', 'bestager'],
  Karoschal: ['adults', 'bestager'], 'Batik-Shirt': ['teens', 'young'], 'Oversize-Printshirt': ['teens', 'young'], 'Schachbrett-Pullover': ['teens', 'young'],
  'Batik-Hoodie': ['teens', 'young'], 'Camouflage-Shirt': ['teens', 'young'], 'Ringel-Croptop': ['teens', 'young'], 'Camouflage-Cargohose': ['teens', 'young'],
  'Karo-Minirock': ['teens', 'young'], 'Regenbogen-Pullover': ['teens', 'young'], Karohose: ['teens', 'young'], 'Leo-Midirock': ['teens', 'young', 'adults'],
  'Camouflage-Shorts': ['teens', 'young'], 'Ringel-Hoodie': ['teens', 'young'], 'Schachbrett-Shorts': ['teens', 'young'], 'Leo-Shirt': ['teens', 'young'],
  'Sterne-Pullover': ['teens', 'young'], 'Herzchen-Croptop': ['teens', 'young'], 'Karo-Overshirt': ['teens', 'young'], Cargohose: ['teens', 'young', 'adults'],
};

describe('Q37 Musterfeld', () => {
  test('16 Muster, Lizenzmotiv vorbereitet und gesperrt, Uni bei jedem Typ', () => {
    expect(K.muster.map((m) => m.name)).toEqual([...MUSTER]);
    expect(MUSTER).toHaveLength(16);
    expect(K.muster.find((m) => m.name === 'Lizenzmotiv')!.gesperrt).toMatch(/Lizenzgeber/);
    for (const t of K.typen) { expect(t.muster[0]).toBe('Uni'); expect(new Set(t.muster).size).toBe(t.muster.length); }
    expect(typ('Lippenstift')!.muster).toEqual(['Uni']);
    expect(typ('Hoodie')!.muster).toEqual(expect.arrayContaining(['Batik', 'Ringel', 'Schriftzug', 'Lizenzmotiv']));
    expect(typ('Anzug')!.muster).toEqual(['Uni', 'Streifen', 'Karo']);
  });

  test('28 Muster-Typen gehen in Grundtyp plus Muster auf, Zielgruppen wandern mit', () => {
    const zeilen = daten('q37-mustertypen.csv');
    expect(zeilen.length).toBe(30);
    const namen = new Set(ARTIKELTYPEN.map((t) => t.typ));
    for (const [alt, grund] of zeilen) {
      const a = MUSTER_ALIAS[alt];
      expect(a).toBeDefined();
      expect(namen.has(alt)).toBe(false);
      const g = TYP[a.typ];
      expect(g).toBeDefined();
      // Grundtyp wie in der Liste (Ausnahme: Cargohose ist jetzt Cargo-Hose)
      expect(a.typ).toBe(TYP_UMBENANNT[grund] ?? grund);
      expect(musterFuer(g)).toContain(a.muster);
      for (const z of VORHER[alt] ?? []) expect(typ(a.typ)!.zielgruppen).toContain(z);
    }
  });

  test('Dublette Cargohose aufgelöst, Cargo-Hose übernimmt WGs und Zielgruppen', () => {
    expect(TYP.Cargohose).toBeUndefined();
    expect(TYP['Cargo-Hose'].wgs).toEqual(expect.arrayContaining(['herren.hosen', 'damen.young', 'herren.casual']));
    for (const z of VORHER.Cargohose) expect(typ('Cargo-Hose')!.zielgruppen).toContain(z);
  });

  test('Produkt mit Muster: Name, Preisaufschlag, Prüfung erlaubter und gesperrter Muster', () => {
    const s = neuesSpiel(1);
    const em2 = s.produkte.liste.find((p) => p.marke === 'em2' && p.typ === 'Hemd')!;
    fuehreAus(s, { typ: 'produktAuslisten', produkt: em2.id });
    const basis = { marke: 'em2', typ: 'Hemd' as const, farbe: 'marine' as const, material: 'Baumwolle' as const, dauer: 12, budgetWoche: 20_000 };
    const uni = produktVorschau(s, basis);
    const karo = produktVorschau(s, { ...basis, muster: 'Karo' });
    expect(karo.ok).toBe(true);
    expect(karo.name).toBe('Hemd marine kariert');
    expect(karo.normpreis).toBeGreaterThan(uni.normpreis);
    expect(produktVorschau(s, { ...basis, muster: 'Leo' }).fehler).toMatch(/Hemd gibt es nicht/);
    expect(produktVorschau(s, { ...basis, typ: 'T-Shirt', muster: 'Lizenzmotiv' }).fehler).toMatch(/Lizenzgeber/);
    const r = fuehreAus(s, { typ: 'produktEntwickeln', entwurf: { ...basis, muster: 'Karo' } });
    expect(r.ok).toBe(true);
    const p = s.produkte.liste[s.produkte.liste.length - 1];
    expect(p.muster).toBe('Karo');
    const karte = produkte(s).marken.find((m) => m.marke === 'em2')!.produkte.find((x) => x.id === p.id)!;
    expect(karte.muster).toBe('Karo');
    expect(karte.musterBild).toBe(MUSTER_INFO.Karo.bild);
    // Uni bleibt ohne Feld (alte Spielstände und Grundsortiment unverändert)
    expect(s.produkte.liste.filter((x) => x.basis || x.start < 0).every((x) => x.muster === undefined && x.anlass === undefined)).toBe(true);
  });

  test('Trend je Muster, Saison und Zielgruppe an der Referenz: Blumen im Sommer, Karo im Winter, Uni nie Trend', () => {
    expect(MUSTER_ANTEILE.jung.sommer.Blumen).toBeGreaterThan(0.05);
    expect(MUSTER_ANTEILE.jung.winter.Blumen).toBeLessThan(0.01);
    expect(MUSTER_ANTEILE.mitte.winter.Karo).toBeGreaterThan(0.07);
    expect(MUSTER_ANTEILE.jung.sommer.Schriftzug).toBeGreaterThan(0.15);
    const zaehl = { sommerBlumen: 0, winterBlumen: 0, sommerKaro: 0, winterKaro: 0 };
    for (let seed = 1; seed <= 12; seed++) {
      const s = neuesSpiel(seed);
      for (let sid = 0; sid < 24; sid++) {
        const t = trendFuer(s, sid);
        for (const g of ['jung', 'mitte'] as const) {
          const m = t.gruppen[g].muster;
          expect(m).toHaveLength(2);
          expect(m).not.toContain('Uni');
          expect(m).not.toContain('Lizenzmotiv');
          const sommer = sid % 2 === 0;
          if (m.includes('Blumen')) zaehl[sommer ? 'sommerBlumen' : 'winterBlumen']++;
          if (m.includes('Karo')) zaehl[sommer ? 'sommerKaro' : 'winterKaro']++;
        }
      }
    }
    expect(zaehl.sommerBlumen).toBeGreaterThan(zaehl.winterBlumen * 2);
    expect(zaehl.winterKaro).toBeGreaterThan(zaehl.sommerKaro);
  });

  test('Muster im Trend bringt Sterne, Muster außerhalb der Zielgruppe kostet Passung, ohne Muster unverändert', () => {
    const s = neuesSpiel(1);
    const m = s.eigenmarken.marken.find((x) => x.id === 'em2')!;
    const sid = saisonId(s.woche + 12);
    const trend = trendFuer(s, sid);
    const g = trend.gruppen.mitte;
    const t = ARTIKELTYPEN.find((x) => musterFuer(x).includes(g.muster[0]) && x.kategorie === 'oberteile')!;
    const e = { typ: t.typ, farbe: 'marine' as const, material: t.materialien[0], preislage: m.preislage, qualitaet: m.qualitaet, dauer: 12, budgetWoche: 20_000, zielgruppe: 'adults' as const };
    const ohne = bewerte(s, m, e, 0.5, trend);
    expect(bewerte(s, m, { ...e, muster: 'Uni' }, 0.5, trend)).toEqual(ohne);
    expect(bewerte(s, m, { ...e, muster: g.muster[0] }, 0.5, trend).trend).toBeGreaterThan(ohne.trend);
  });
});

describe('Q37 Kategorie Anlass', () => {
  test('eigener Ast mit Unterkategorien, Typen bleiben an ihrem Stammplatz', () => {
    const a = K.baum.find((x) => x.id === 'anlass')!;
    expect(a.name).toBe('Anlass');
    const namen = a.unterkategorien.map((u) => u.name);
    for (const n of ['Abiball', 'Tanzschulball und Feiern', 'Konfirmation, Jugendweihe, Firmung', 'Oper, Familienfeier, Hochzeitsgast', 'Zubehör']) expect(namen).toContain(n);
    expect(K.anlaesse.map((x) => x.id)).toEqual(['abiball', 'tanzschulball', 'konfirmation', 'feier', 'tracht', 'braut', 'zubehoer']);
    for (const liste of Object.values(ANLASS_TYPEN)) for (const n of liste) expect(TYP[n]).toBeDefined();
    const stamm = K.baum.filter((x) => x.id !== 'anlass').find((x) => x.unterkategorien.some((u) => u.typen.includes('Abendkleid')))!;
    expect(stamm.id).toBe('kleider');
    expect(a.unterkategorien.find((u) => u.name === 'Abiball')!.typen).toContain('Abendkleid');
    // keine Kinder-Festmode
    expect(a.unterkategorien.flatMap((u) => u.typen).some((n) => /^Kinder/.test(n) || TYP[n].kategorie === 'kinder')).toBe(false);
  });

  test('Anlassmode für Teens (E45), figurbetontes Partykleid nicht über den Anlass', () => {
    for (const n of ['Abendkleid', 'Anzug', 'Krawatte', 'Etuikleid', 'Clutch']) expect(typ(n)!.zielgruppen).toContain('teens');
    expect(Q37_ZUSATZ.get('Bodycon-Kleid')?.has('teens') ?? false).toBe(false);
  });

  test('Saisonspitzen: Jahresmittel 1, Konfirmation im Frühjahr, Abiball im Sommer, Tracht im Herbst', () => {
    for (const a of ANLAESSE) {
      let sum = 0; for (let w = 0; w < 52; w++) sum += anlassFaktor(a.id, w);
      expect(sum / 52).toBeCloseTo(1, 1);
    }
    const kw = (monat: number) => Math.round((monat - 0.5) / 12 * 52);
    expect(anlassFaktor('konfirmation', kw(4))).toBeGreaterThan(1.3);
    expect(anlassFaktor('konfirmation', kw(10))).toBeLessThan(0.8);
    expect(anlassFaktor('abiball', kw(6))).toBeGreaterThan(anlassFaktor('abiball', kw(11)) * 2);
    expect(anlassFaktor('tracht', kw(9.5))).toBeGreaterThan(1.3);
    expect(anlassFaktor('tanzschulball', kw(11.5))).toBeGreaterThan(anlassFaktor('tanzschulball', kw(7)) * 2);
  });

  test('Produkt für einen Anlass: nur passende Typen, Anlass auf der Karte, Marke mit Schwerpunkt Anlass', () => {
    const s = neuesSpiel(1);
    const vorlage = EM_VORLAGEN.find((v) => v.entwurf.schwerpunkt === 'anlass')!;
    expect(vorlage).toBeDefined();
    const r = fuehreAus(s, { typ: 'eigenmarkeGruenden', entwurf: { ...vorlage.entwurf, name: 'Festtag', budgetWoche: 10_000, wgAnteile: Object.fromEntries(vorlage.wgs.map((w) => [w, 0.2])) } });
    expect(r.ok).toBe(true);
    const m = s.eigenmarken.marken.find((x) => x.name === 'Festtag')!;
    expect(m.schwerpunkt).toBe('anlass');
    expect(eigenmarkenUebersicht(s).marken.find((x) => x.id === m.id)!.schwerpunktName).toBe('Anlass und Festmode');
    const e = { marke: m.id, typ: 'Abendkleid' as const, farbe: 'bordeaux' as const, material: TYP.Abendkleid.materialien[0], dauer: 12, budgetWoche: 20_000, zielgruppe: 'teens' as const };
    expect(produktVorschau(s, { ...e, anlass: 'tracht' }).fehler).toMatch(/gehört nicht zum Anlass/);
    const mit = produktVorschau(s, { ...e, anlass: 'abiball' });
    expect(mit.ok).toBe(true);
    expect(mit.hinweise.join(' ')).toMatch(/Mai bis Juli/);
    expect(mit.teile!.zielgruppe).toBeGreaterThan(produktVorschau(s, e).teile!.zielgruppe);
    expect(fuehreAus(s, { typ: 'produktEntwickeln', entwurf: { ...e, anlass: 'abiball' } }).ok).toBe(true);
    const p = s.produkte.liste[s.produkte.liste.length - 1];
    expect(p.anlass).toBe('abiball');
    expect(produkte(s).marken.find((x) => x.marke === m.id)!.produkte.find((x) => x.id === p.id)!.anlassName).toBe('Abiball');
  });
});

describe('Q37 Freischaltungen', () => {
  test('jede Zeile der Liste: Typ für die zusätzlichen Zielgruppen sichtbar', () => {
    const zeilen = daten('q37-freischalten.csv');
    expect(zeilen.length).toBe(112);
    for (const [n, fuer] of zeilen) {
      const t = typ(MUSTER_ALIAS[n]?.typ ?? n);
      expect(t).toBeDefined();
      for (const z of fuer.split(',')) expect({ typ: n, z, sichtbar: t!.zielgruppen.includes(ZG[z] as never) }).toEqual({ typ: n, z, sichtbar: true });
    }
  });

  test('freigeschaltete Kinderartikel lassen sich von Erwachsenenmarken entwickeln, Passung wie typischer Artikel', () => {
    expect(TYP.Stoppersocken.wgs).toContain('waesche.struempfe');
    expect(TYP['Bommelmütze'].wgs).toContain('accessoires.lederwaren');
    expect(TYP['Federmäppchen'].wgs).toContain('accessoires.lederwaren');
    const m = s0.eigenmarken.marken.find((x) => x.id === 'em2')!;
    const e = { typ: 'Stoppersocken' as const, farbe: 'marine' as const, material: TYP.Stoppersocken.materialien[0], preislage: 'mitte' as const, qualitaet: 3, dauer: 12, budgetWoche: 20_000 };
    // ohne Freischaltung wäre die Passung des Typs 0 (Kinderartikel), freigeschaltet wie ein typischer Artikel (0,6)
    expect(bewerte(s0, m, { ...e, zielgruppe: 'adults' }, 0.5, undefined).zielgruppe).toBeGreaterThan(bewerte(s0, m, { ...e, zielgruppe: 'bestager' }, 0.5, undefined).zielgruppe + 0.2);
  });
});

describe('Q37 Migration alter Spielstände', () => {
  test('Spielstand nach 52 Wochen mit alten Muster-Typen: umgeschrieben, spielbar, Umsätze erhalten', () => {
    const s = neuesSpiel(2);
    spiele(s, 52);
    const vorlage = s.produkte.liste.find((p) => p.status === 'sortiment' && p.marke === 'em2')!;
    const alt: [string, string][] = [['Karohemd', 'Hemd'], ['Batik-Hoodie', 'Hoodie'], ['Cargohose', 'Cargo-Hose'], ['Leo-Midirock', 'Midirock'], ['Schachbrett-Pullover', 'Strickpullover']];
    for (const [i, [n]] of alt.entries()) {
      const p: Produkt = { ...structuredClone(vorlage), id: `alt${i}`, typ: n as never, name: `${n} marine`, umsatz: [1000, 2000], verkauf: [10, 20] };
      s.produkte.liste.push(p);
    }
    const geladen: GameState = JSON.parse(JSON.stringify(s));
    expect(migriereQ37(geladen)).toBe(alt.length);
    for (const [i, [n, grund]] of alt.entries()) {
      const p = geladen.produkte.liste.find((x) => x.id === `alt${i}`)!;
      expect(p.typ).toBe(grund);
      expect(p.name).toBe(`${n} marine`);
      expect(p.umsatz.slice(0, 2)).toEqual([1000, 2000]);
      expect(p.muster).toBe(MUSTER_ALIAS[n]?.muster);
    }
    expect(migriereQ37(geladen)).toBe(0);
    expect(() => spiele(geladen, 4)).not.toThrow();
    expect(() => produkte(geladen)).not.toThrow();
    expect(geladen.produkte.liste.every((p) => TYP[p.typ])).toBe(true);
  });
});
