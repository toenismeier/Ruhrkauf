// Vergleich Vorstand und Produktstrategie auf Basis Bot C (Schutzschirm, tiefe Sanierung), echte Liquidität.
// Vorstand: Start (gewachsen, nichts tun), gut (starke Leute, Boni, Delegation, gute Projekte), schwach (schwache Leute,
// Gehalt gekürzt, alles delegiert), unbesetzt (alle entlassen). Produkte: keine (Startsortiment), gut (Trend und Zielgruppe
// getroffen), schlecht (am Trend und an der Zielgruppe vorbei, zu billig entwickelt, gute Produkte ausgelistet).
// Aufruf: npx tsx scripts/vorstand-vergleich.ts [seeds, z. B. 1,2,3] [jahre, Standard 3]
import { fuehreAus, neuesSpiel, produktVorschau, wocheAbspielen, kandidaten, ARTIKELTYPEN, FARBEN, RESSORTS } from '../src';
import type { ArtikelTyp, Farbe, GameState, ProduktEntwurf, RessortId } from '../src';
import { sterneWirksam } from '../src/produkte';
import { botTief } from './bot';

const seeds = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const jahre = Number(process.argv[3] ?? 3);
type Bot = (s: GameState) => void;

// ------------------------------------------------------------------ Vorstand
const wert = (k: { fuehrung: number; fachwissen: number }) => 0.65 * k.fuehrung + 0.35 * k.fachwissen;

function besetze(s: GameState, r: RessortId, bester: boolean, aufschlag: number, haltebonus: number, erfolgsbonus: number): void {
  const l = kandidaten(s, r);
  if (!l || l.besetzt || !l.kandidaten.length) return;
  const k = [...l.kandidaten].sort((a, b) => (bester ? wert(b) - wert(a) : wert(a) - wert(b)))[0];
  fuehreAus(s, { typ: 'vorstandEinstellen', ressort: r, kandidat: k.id, gehalt: k.gehaltsforderung * aufschlag, haltebonus: haltebonus * k.gehaltsforderung, erfolgsbonus });
}

const vorstandGut: Bot = (s) => {
  const w = s.woche;
  if (w === 1) for (const r of ['cmo', 'cpo'] as RessortId[]) fuehreAus(s, { typ: 'vorstandEntlassen', ressort: r });
  // Offene Ressorts mit den Besten besetzen, bis jemand zusagt
  for (const r of RESSORTS) if (!s.vorstand.ressorts[r].person && w >= 1) besetze(s, r, true, 1.15, 0.4, 0.3);
  if (w === 3) for (const r of RESSORTS) {
    const p = s.vorstand.ressorts[r].person;
    if (p && p.gewachsen) fuehreAus(s, { typ: 'vorstandBonus', ressort: r, haltebonus: Math.round(p.gehalt * 0.4), halteWochen: 78, erfolgsbonus: 0.3 });
  }
  // Delegation dort, wo jemand mit Fachwissen sitzt
  for (const r of RESSORTS) {
    const res = s.vorstand.ressorts[r];
    if (!res.person) continue;
    const an = res.person.fachwissen >= 65;
    for (const b of ['produktentwicklung', 'bank', 'mietverhandlungen', 'onlinesortiment'] as const) if (b in res.delegation && res.delegation[b] !== an) fuehreAus(s, { typ: 'vorstandDelegation', ressort: r, bereich: b, an });
    // Tarifverhandlungen und Freigaben laufen bei soliden Leuten immer über das Ressort
    for (const b of ['betriebsrat', 'freigaben'] as const) if (b in res.delegation && !res.delegation[b] && res.person.fachwissen >= 50) fuehreAus(s, { typ: 'vorstandDelegation', ressort: r, bereich: b, an: true });
  }
  // Vorstandssitzung: Projekte guter Leute umsetzen
  for (const e of s.entscheidungen.filter((x) => x.typ === 'vorstand_sitzung')) {
    const p = s.vorstand.ressorts[e.daten.ressort as RessortId].person;
    fuehreAus(s, { typ: 'entscheiden', id: e.id, option: p && p.fachwissen >= 65 ? 'umsetzen' : 'vertagen' });
  }
  for (const e of s.entscheidungen.filter((x) => x.typ === 'vorstand_abwerbung')) fuehreAus(s, { typ: 'entscheiden', id: e.id, option: 'gegenangebot' });
};

const vorstandSchwach: Bot = (s) => {
  const w = s.woche;
  if (w === 1) for (const r of RESSORTS) if (s.vorstand.ressorts[r].person) fuehreAus(s, { typ: 'vorstandEntlassen', ressort: r });
  for (const r of RESSORTS) if (!s.vorstand.ressorts[r].person && w >= 1) besetze(s, r, false, 1.0, 0, 0);
  if (w === 20) for (const r of RESSORTS) { const p = s.vorstand.ressorts[r].person; if (p) fuehreAus(s, { typ: 'vorstandGehalt', ressort: r, gehalt: Math.round(p.gehalt * 0.85) }); }
  for (const r of RESSORTS) {
    const res = s.vorstand.ressorts[r];
    if (!res.person) continue;
    for (const [b, an] of Object.entries(res.delegation)) if (!an) fuehreAus(s, { typ: 'vorstandDelegation', ressort: r, bereich: b, an: true });
  }
  for (const e of s.entscheidungen.filter((x) => x.typ === 'vorstand_sitzung')) fuehreAus(s, { typ: 'entscheiden', id: e.id, option: 'umsetzen' });
};

const vorstandUnbesetzt: Bot = (s) => {
  if (s.woche === 1) for (const r of RESSORTS) if (s.vorstand.ressorts[r].person) fuehreAus(s, { typ: 'vorstandEntlassen', ressort: r });
};

// ------------------------------------------------------------------ Produkte
const TYPEN = ARTIKELTYPEN.map((t) => t.typ);
const FARBLISTE = Object.keys(FARBEN) as Farbe[];

function bestesProdukt(s: GameState, marke: string, gut: boolean): ProduktEntwurf | undefined {
  let best: { e: ProduktEntwurf; st: number } | undefined;
  for (const typ of TYPEN) {
    const t = ARTIKELTYPEN.find((x) => x.typ === typ)!;
    for (const material of t.materialien) for (const farbe of FARBLISTE) {
      const e: ProduktEntwurf = gut
        ? { marke, typ: typ as ArtikelTyp, farbe, material, dauer: 12, budgetWoche: 30_000 }
        : { marke, typ: typ as ArtikelTyp, farbe, material, dauer: 4, budgetWoche: 5_000 };
      const v = produktVorschau(s, e);
      if (!v.ok) continue;
      const st = gut ? v.sterneErwartet + v.teile!.zielgruppe * 0.01 : -v.sterneErwartet;
      if (!best || st > best.st) best = { e, st };
    }
  }
  return best?.e;
}

function produktStrategie(gut: boolean): Bot {
  return (s) => {
    if (s.woche % 4 !== 1 || s.woche < 1) return;
    for (const m of s.eigenmarken.marken.filter((x) => x.status === 'aktiv')) {
      if (s.produkte.liste.some((p) => p.marke === m.id && p.status === 'entwicklung')) continue;
      const liste = s.produkte.liste.filter((p) => p.marke === m.id && p.status === 'sortiment').sort((a, b) => sterneWirksam(s, a) - sterneWirksam(s, b));
      // Gut: schwächstes Produkt raus, wenn es unter 3,5 Sternen liegt; schlecht: bestes raus
      const raus = gut ? liste.find((p) => sterneWirksam(s, p) < 3.5) : liste[liste.length - 1];
      let e = bestesProdukt(s, m.id, gut);
      if (!e && raus) { fuehreAus(s, { typ: 'produktAuslisten', produkt: raus.id }); e = bestesProdukt(s, m.id, gut); }
      else if (e && raus && !gut) fuehreAus(s, { typ: 'produktAuslisten', produkt: raus.id });
      if (e) {
        const v = produktVorschau(s, e);
        if (gut && raus && v.sterneErwartet <= sterneWirksam(s, raus)) continue;
        fuehreAus(s, { typ: 'produktEntwickeln', entwurf: e });
      }
    }
    if (!gut && s.woche === 9) for (const p of s.produkte.liste.filter((x) => x.status === 'sortiment')) fuehreAus(s, { typ: 'produktPreis', produkt: p.id, preis: p.preis * 1.3 });
  };
}

// ------------------------------------------------------------------ Lauf
interface Kz { umsatz: number; rohertrag: number; ebitda: number; zentrale: number; sonder: number; em: number; emRe: number; sterne: number; abgaenge: number; ueberlebt: number; image: number; bank: number }

function lauf(seed: number, extra: Bot): Kz[] {
  const s = neuesSpiel(seed);
  let abg = 0;
  for (let i = 0; i < jahre * 52 && s.phase !== 'zerschlagen'; i++) {
    botTief(s);
    extra(s);
    const vorher = RESSORTS.filter((r) => s.vorstand.ressorts[r].person).length;
    wocheAbspielen(s);
    abg += Math.max(0, vorher - RESSORTS.filter((r) => s.vorstand.ressorts[r].person).length);
  }
  return Array.from({ length: jahre }, (_, j) => {
    const h = s.historie.filter((k) => k.woche >= j * 52 && k.woche < (j + 1) * 52);
    const sum = (f: (k: (typeof h)[number]) => number) => h.reduce((a, k) => a + f(k), 0);
    const ein = s.einkauf.markenKpi;
    const em = Object.values(ein).reduce((a, x) => a + (j === jahre - 1 ? x.u.reduce((y, z) => y + z, 0) : 0), 0);
    const emRe = Object.values(ein).reduce((a, x) => a + (j === jahre - 1 ? x.r.reduce((y, z) => y + z, 0) : 0), 0);
    const ps = s.produkte.liste.filter((p) => p.status === 'sortiment');
    return {
      umsatz: sum((k) => k.umsatz), rohertrag: sum((k) => k.rohertrag), ebitda: sum((k) => k.ebitda), zentrale: sum((k) => k.zentrale), sonder: sum((k) => k.sondereffekte),
      em, emRe, sterne: ps.length ? ps.reduce((a, p) => a + sterneWirksam(s, p), 0) / ps.length : 0, abgaenge: abg, ueberlebt: s.phase === 'zerschlagen' ? 0 : 1,
      image: s.stakeholder.image, bank: s.stakeholder.bank,
    };
  });
}

function tabelle(titel: string, strategien: [string, Bot][]): void {
  const erg: Record<string, Kz[]> = {};
  for (const [name, bot] of strategien) {
    for (const seed of seeds) {
      const r = lauf(seed, bot);
      const z = (erg[name] ??= r.map(() => ({ umsatz: 0, rohertrag: 0, ebitda: 0, zentrale: 0, sonder: 0, em: 0, emRe: 0, sterne: 0, abgaenge: 0, ueberlebt: 0, image: 0, bank: 0 })));
      r.forEach((x, j) => { for (const k of Object.keys(x) as (keyof Kz)[]) z[j][k] += (k === 'ueberlebt' ? x[k] : x[k] / seeds.length); });
    }
  }
  const m = (x: number) => (x / 1e6).toFixed(1).padStart(7);
  const basis = erg[strategien[0][0]];
  console.log(`\n${titel} (Mittel Seeds ${seeds.join(', ')}, Mio. €; Δ gegen ${strategien[0][0]}; Eigenmarken und Sterne im Jahr ${jahre})`);
  console.log('Strategie'.padEnd(12), ...Array.from({ length: jahre }, (_, j) => `| J${j + 1} Umsatz  EBITDA  ΔEBITDA `), '| RE-Quote J' + jahre, '| Zentrale J' + jahre, '| Σ Sonder', '| EM-Umsatz  EM-RE-Q | Sterne | Abgänge | Image | Bank | überlebt');
  for (const [name] of strategien) {
    const r = erg[name];
    const j = jahre - 1;
    console.log(name.padEnd(12), ...r.map((x, i) => `| ${m(x.umsatz)} ${m(x.ebitda)} ${m(x.ebitda - basis[i].ebitda)} `),
      `| ${((r[j].rohertrag / r[j].umsatz) * 100).toFixed(1).padStart(5)} %`, `| ${m(r[j].zentrale)}`, `| ${m(r.reduce((a, x) => a + x.sonder, 0))}`,
      `| ${m(r[j].em)}  ${((r[j].emRe / Math.max(1, r[j].em)) * 100).toFixed(1)} %`, `| ${r[j].sterne.toFixed(2)}`, `| ${r[j].abgaenge.toFixed(1).padStart(4)}`, `| ${r[j].image.toFixed(0)}`, `| ${r[j].bank.toFixed(0)}`, `| ${r[j].ueberlebt}/${seeds.length}`);
  }
}

const nichts: Bot = () => undefined;
export { vorstandGut, vorstandSchwach, vorstandUnbesetzt, produktStrategie };
if (require.main === module) {
  const nur = process.argv[4];
  if (!nur || nur === 'vorstand') tabelle('Vorstand', [['Start', nichts], ['gut', vorstandGut], ['schwach', vorstandSchwach], ['unbesetzt', vorstandUnbesetzt]]);
  if (!nur || nur === 'produkte') tabelle('Produktstrategie', [['keine', nichts], ['gut', produktStrategie(true)], ['schlecht', produktStrategie(false)]]);
}
