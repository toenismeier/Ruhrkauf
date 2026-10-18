// Eigenmarken: gewachsene Hartwig-Marken und neue Marken für Zielgruppen. Marge, Nachfrage (Bekanntheit,
// Passung, Qualität, Stil), Mindestabnahme und Vorlauf je Beschaffung; Kannibalisierung der Fremdmarken.
// Vertrag: ../EINKAUF-VERTRAG.md, Abschnitt Eigenmarken.
import type { Cluster, GameState, GruppeId, Haus, Region } from './types';
import { clamp, eur, melde, mio } from './util';
import { WG, WG_DEF, type WgId } from './einkauf';

// ---------------------------------------------------------------------------------------------
// Datenmodell
// ---------------------------------------------------------------------------------------------

export type EmAlter = '10-13' | '13-17' | '18-29' | '30-49' | '50+' | '70+';
export type EmGeschlecht = 'damen' | 'herren' | 'unisex' | 'kinder';
export type EmKategorie = 'Bekleidung' | 'Schuhe' | 'Wäsche' | 'Accessoires' | 'Home' | 'Beauty';
export type Preislage = 'einstieg' | 'mitte' | 'gehoben';
export type Stil = 'klassisch' | 'modern' | 'sportlich' | 'trendig';
export type Beschaffung = 'fernost' | 'nahost' | 'europa';
export type EmStatus = 'aufbau' | 'aktiv' | 'neupositionierung' | 'eingestellt';

export interface Zielgruppe { alter: EmAlter; geschlecht: EmGeschlecht }

export interface Eigenmarke {
  id: string;
  name: string;
  farbe: string; // Hex, für Shop und Karten
  zielgruppe: Zielgruppe;
  kategorie: EmKategorie;
  preislage: Preislage;
  stil: Stil;
  qualitaet: number; // 1..5
  beschaffung: Beschaffung;
  budgetWoche: number; // Markenbudget € je Woche (läuft über Marketing)
  bekanntheit: number; // 0..100
  stilAktualitaet: number; // 0..100, sinkt ohne Pflege
  status: EmStatus;
  bis?: number; // Ende von Aufbau oder Neupositionierung
  seit: number;
  gewachsen: boolean; // Startmarke
  /** Ziel-Anteil je WG (Anteil am WG-Volumen). */
  wgAnteile: Record<WgId, number>;
  /** Wirksamer Anteil je WG (nähert sich dem Ziel um 3 Punkte je Woche). */
  wgIst: Record<WgId, number>;
  /** Geplante Positionierung während einer Neupositionierung. */
  neu?: Partial<Pick<Eigenmarke, 'name' | 'zielgruppe' | 'preislage' | 'stil' | 'qualitaet'>>;
}

export interface EigenmarkenStand { marken: Eigenmarke[]; zaehler: number }

export interface EigenmarkeEntwurf {
  name: string;
  farbe?: string;
  zielgruppe: Zielgruppe;
  kategorie: EmKategorie;
  preislage: Preislage;
  stil: Stil;
  qualitaet: number;
  beschaffung: Beschaffung;
  budgetWoche: number;
  wgAnteile: Record<WgId, number>;
}

// ---------------------------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------------------------

export const BESCHAFFUNG: Record<Beschaffung, { name: string; vorlauf: number; mindestabnahme: number; mehrmarge: number; produzent: string }> = {
  fernost: { name: 'Fernost', vorlauf: 22, mindestabnahme: 150_000, mehrmarge: 0.14, produzent: 'Golden Thread' },
  nahost: { name: 'Nahost und Osteuropa', vorlauf: 10, mindestabnahme: 60_000, mehrmarge: 0.105, produzent: 'Adria Konfektion' },
  europa: { name: 'Europa', vorlauf: 5, mindestabnahme: 20_000, mehrmarge: 0.075, produzent: 'Lindgren Manufaktur' },
};

export const EM_PARAM = {
  gruendungBasis: 1_200_000,
  gruendungJeWg: 250_000,
  aufbauZusatz: 6, // Wochen über den Beschaffungsvorlauf hinaus
  neupositionierungKosten: 800_000,
  neupositionierungWochen: 12,
  neupositionierungBekanntheit: 0.7, // Bekanntheit bleibt zu 70 %
  stilVerfall: 0.2, // Punkte Stil-Aktualität je Woche ohne Pflege
  bekanntheitTempo: 0.02,
  maxAnteilWg: 0.7,
  rampe: 0.03, // Anteilsänderung je Woche
  kapazitaet: [2, 4, 6, 8] as const, // sinnvoll führbare Marken nach Einkauf-Stufe 0..3
};

const ALTER_PREF: Record<EmAlter, number> = { '70+': 1.0, '50+': 0.6, '30-49': 0, '18-29': -0.6, '13-17': -0.8, '10-13': -0.7 };
const PREIS_PREF: Record<Preislage, number> = { einstieg: -1, mitte: 0, gehoben: 1 };
const JUNG = new Set<EmAlter>(['10-13', '13-17', '18-29']);
const REIF = new Set<EmAlter>(['50+', '70+']);

export const ZIELGRUPPEN_TEXT: Record<EmAlter, string> = { '10-13': 'Tweens', '13-17': 'Teens', '18-29': 'Young Adults', '30-49': '30 bis 49', '50+': '50 plus', '70+': '70 plus' };

/** Vorschläge für den Gründungsassistenten. */
export const EM_VORLAGEN: { titel: string; entwurf: Omit<EigenmarkeEntwurf, 'name' | 'wgAnteile' | 'budgetWoche'>; wgs: WgId[] }[] = [
  { titel: '70 plus', entwurf: { zielgruppe: { alter: '70+', geschlecht: 'unisex' }, kategorie: 'Bekleidung', preislage: 'mitte', stil: 'klassisch', qualitaet: 4, beschaffung: 'nahost' }, wgs: ['damen.blusen', 'damen.strick', 'herren.strick', 'herren.hosen'] },
  { titel: '50 plus Damen', entwurf: { zielgruppe: { alter: '50+', geschlecht: 'damen' }, kategorie: 'Bekleidung', preislage: 'mitte', stil: 'modern', qualitaet: 3, beschaffung: 'nahost' }, wgs: ['damen.blusen', 'damen.strick', 'damen.hosen', 'damen.gg', 'damen.kleider'] },
  { titel: '50 plus Herren', entwurf: { zielgruppe: { alter: '50+', geschlecht: 'herren' }, kategorie: 'Bekleidung', preislage: 'mitte', stil: 'modern', qualitaet: 3, beschaffung: 'nahost' }, wgs: ['herren.casual', 'herren.hemden', 'herren.hosen', 'herren.strick'] },
  { titel: 'Schuhe', entwurf: { zielgruppe: { alter: '30-49', geschlecht: 'unisex' }, kategorie: 'Schuhe', preislage: 'mitte', stil: 'klassisch', qualitaet: 3, beschaffung: 'europa' }, wgs: ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.schuhe'] },
  { titel: 'Teens und Tweens', entwurf: { zielgruppe: { alter: '13-17', geschlecht: 'unisex' }, kategorie: 'Bekleidung', preislage: 'einstieg', stil: 'trendig', qualitaet: 2, beschaffung: 'fernost' }, wgs: ['damen.young', 'kinder.maedchen', 'kinder.jungen'] },
  { titel: 'Young Adults', entwurf: { zielgruppe: { alter: '18-29', geschlecht: 'unisex' }, kategorie: 'Bekleidung', preislage: 'einstieg', stil: 'trendig', qualitaet: 2, beschaffung: 'fernost' }, wgs: ['damen.young', 'damen.denim', 'herren.casual', 'sporttextil.freizeit'] },
];

// ---------------------------------------------------------------------------------------------
// Startmarken (fiktiv, gewachsen, teils veraltet)
// ---------------------------------------------------------------------------------------------

function startMarke(id: string, name: string, farbe: string, z: Zielgruppe, kategorie: EmKategorie, preislage: Preislage, stil: Stil, qualitaet: number, beschaffung: Beschaffung, bekanntheit: number, stilAktualitaet: number, wg: Record<WgId, number>): Eigenmarke {
  return { id, name, farbe, zielgruppe: z, kategorie, preislage, stil, qualitaet, beschaffung, budgetWoche: 0, bekanntheit, stilAktualitaet, status: 'aktiv', seit: -1040, gewachsen: true, wgAnteile: { ...wg }, wgIst: { ...wg } };
}

export function erzeugeEigenmarken(): EigenmarkenStand {
  return {
    zaehler: 4,
    marken: [
      startMarke('em1', 'Lisanne', '#8c5a7a', { alter: '50+', geschlecht: 'damen' }, 'Bekleidung', 'mitte', 'klassisch', 3, 'fernost', 38, 30,
        { 'damen.blusen': 0.4, 'damen.strick': 0.4, 'damen.hosen': 0.35, 'damen.gg': 0.5, 'damen.jacken': 0.25, 'damen.kleider': 0.25 }),
      startMarke('em2', 'Brehm & Sohn', '#2f4a6b', { alter: '50+', geschlecht: 'herren' }, 'Bekleidung', 'mitte', 'klassisch', 3, 'nahost', 45, 55,
        { 'herren.business': 0.35, 'herren.hemden': 0.45, 'herren.hosen': 0.35, 'herren.strick': 0.35, 'herren.casual': 0.2 }),
      startMarke('em3', 'Casa Linde', '#6f8f4e', { alter: '30-49', geschlecht: 'unisex' }, 'Home', 'einstieg', 'modern', 3, 'fernost', 30, 60,
        { 'wohnen.heimtextil': 0.45, 'wohnen.bett': 0.5, 'wohnen.tisch': 0.25, 'wohnen.deko': 0.3 }),
      startMarke('em4', 'Pünktchen', '#d9822b', { alter: '30-49', geschlecht: 'kinder' }, 'Bekleidung', 'einstieg', 'klassisch', 2, 'fernost', 35, 45,
        { 'kinder.baby': 0.45, 'kinder.maedchen': 0.35, 'kinder.jungen': 0.35 }),
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Wirkungen
// ---------------------------------------------------------------------------------------------

export const istVerkaufsaktiv = (m: Eigenmarke): boolean => m.status === 'aktiv' || m.status === 'neupositionierung';

/** Mehrmarge gegenüber Fremdware in Prozentpunkten (als Anteil). */
export function mehrmarge(m: Pick<Eigenmarke, 'beschaffung' | 'preislage' | 'qualitaet'>): number {
  return BESCHAFFUNG[m.beschaffung].mehrmarge + (m.preislage === 'einstieg' ? -0.01 : m.preislage === 'gehoben' ? 0.02 : 0) - 0.012 * (m.qualitaet - 3);
}

/** Passung einer Zielgruppe und Preislage zu einem Haus (0..1). */
/** Altersstruktur der Regionen (Ost und Nord älter, Süd jünger), zusätzlich zum Einzugsgebiet. */
const REGION_ALTER: Record<Region, number> = { Ost: 0.06, Nord: 0.02, West: 0, Mitte: 0, Süd: -0.03 };

export function passungHaus(m: Pick<Eigenmarke, 'zielgruppe' | 'preislage'>, h: Pick<Haus, 'einzug' | 'cluster' | 'region'>): number {
  const zA = (h.einzug.alter + REGION_ALTER[h.region] - 1.03) / 0.12;
  const zK = (h.einzug.kaufkraft - 1) / 0.15;
  const pa = ALTER_PREF[m.zielgruppe.alter];
  const pp = PREIS_PREF[m.preislage];
  const cl: Record<Cluster, number> = JUNG.has(m.zielgruppe.alter)
    ? { metropole: 0.1, grossstadt: 0, mittelstadt: -0.1 }
    : REIF.has(m.zielgruppe.alter) ? { metropole: -0.04, grossstadt: 0, mittelstadt: 0.05 } : { metropole: 0, grossstadt: 0, mittelstadt: 0 };
  return clamp(0.55 + 0.2 * pa * zA + 0.15 * pp * zK + cl[h.cluster], 0.1, 1);
}

/** Passung der Marke zur Warengruppe (Geschlecht, Alter, Kategorie): 0 = nicht zulässig. */
export function passungWg(m: Pick<Eigenmarke, 'zielgruppe' | 'kategorie'>, wg: WgId): number {
  const d = WG[wg];
  if (!d || !d.eigenmarkenfaehig || d.kategorie !== m.kategorie) return 0;
  const g = d.geschlecht;
  const mg = m.zielgruppe.geschlecht;
  if (g !== 'unisex' && mg !== 'unisex' && g !== mg) return 0;
  if (g === 'kinder' && mg !== 'kinder' && !JUNG.has(m.zielgruppe.alter)) return 0;
  if (mg === 'kinder' && g !== 'kinder' && g !== 'unisex') return 0;
  let f = 1;
  if (d.jung) f *= JUNG.has(m.zielgruppe.alter) ? 1.15 : REIF.has(m.zielgruppe.alter) ? 0.6 : 0.9;
  if (d.reif) f *= REIF.has(m.zielgruppe.alter) ? 1.1 : JUNG.has(m.zielgruppe.alter) ? 0.7 : 1;
  return f;
}

/** Sinnvoll führbare Marken nach wirksamer Einkauf-Stufe der Zentrale. */
export function emKapazitaet(s: GameState): number {
  const L = clamp(s.hq?.wirkung.einkauf ?? 1, 0, 3);
  const k = EM_PARAM.kapazitaet;
  const i = Math.min(2, Math.floor(L));
  return k[i] + (k[i + 1] - k[i]) * (L - i);
}

/** Malus, wenn mehr Marken geführt werden, als der Einkauf pflegen kann. */
export function emUeberlastung(s: GameState): number {
  const n = s.eigenmarken.marken.filter((m) => m.status !== 'eingestellt').length;
  return Math.max(0, n - emKapazitaet(s));
}

/** Attraktivität der Marke in einem Haus gegenüber Fremdware (= 1). Ohne Passung zur WG. */
export function attraktivitaet(s: GameState, m: Eigenmarke, h: Pick<Haus, 'einzug' | 'cluster' | 'region'>): number {
  const bek = 0.6 + 0.4 * (m.bekanntheit / 100);
  const pass = 0.5 + passungHaus(m, h);
  const qual = 0.85 + 0.05 * m.qualitaet;
  const stil = 0.55 + 0.45 * (m.stilAktualitaet / 100);
  const umbau = m.status === 'neupositionierung' ? 0.9 : 1;
  const last = Math.pow(0.95, emUeberlastung(s));
  return bek * pass * qual * stil * umbau * last;
}

/** Wochenschritt der Marken: Status, Anteilsrampe, Bekanntheit, Stil-Aktualität. umsatzVK = Markenumsatz der Woche. */
export function eigenmarkenWoche(s: GameState, umsatzVK: Record<string, number>): void {
  const w = s.woche;
  const L = clamp(s.hq?.wirkung.einkauf ?? 1, 0, 3);
  const ueber = emUeberlastung(s);
  for (const m of s.eigenmarken.marken) {
    if (m.status === 'aufbau' && m.bis !== undefined && w >= m.bis) {
      m.status = 'aktiv';
      m.bis = undefined;
      melde(s, 'info', `Eigenmarke ${m.name} ist in den Häusern angekommen.`);
    }
    if (m.status === 'neupositionierung' && m.bis !== undefined && w >= m.bis) {
      Object.assign(m, m.neu ?? {});
      m.neu = undefined;
      m.status = 'aktiv';
      m.bis = undefined;
      m.stilAktualitaet = 100;
      melde(s, 'info', `Eigenmarke ${m.name} ist neu positioniert.`);
    }
    // Anteilsrampe (Ware und Fläche brauchen Zeit)
    for (const wg of new Set([...Object.keys(m.wgAnteile), ...Object.keys(m.wgIst)])) {
      const ziel = istVerkaufsaktiv(m) ? (m.wgAnteile[wg] ?? 0) : 0;
      const ist = m.wgIst[wg] ?? 0;
      const neu = ist < ziel ? Math.min(ziel, ist + EM_PARAM.rampe) : Math.max(ziel, ist - EM_PARAM.rampe);
      if (neu <= 1e-6 && ziel === 0) delete m.wgIst[wg];
      else m.wgIst[wg] = neu;
    }
    if (!istVerkaufsaktiv(m)) continue;
    const vk = umsatzVK[m.id] ?? 0;
    const praesenz = Math.min(1, vk / 1_500_000);
    const budgetF = Math.pow(clamp(m.budgetWoche / (0.03 * vk + 30_000), 0, 1.5), 0.7);
    const ziel = 10 + 35 * praesenz + 40 * Math.min(1, budgetF);
    m.bekanntheit = clamp(m.bekanntheit + (ziel - m.bekanntheit) * EM_PARAM.bekanntheitTempo, 0, 100);
    // Stil veraltet; Budget und ein starker Einkauf bremsen, Überlastung beschleunigt
    const pflege = 1 - 0.6 * Math.min(1, budgetF);
    const einkauf = 1.25 - 0.15 * L;
    m.stilAktualitaet = clamp(m.stilAktualitaet - EM_PARAM.stilVerfall * pflege * einkauf * (1 + 0.25 * ueber), 0, 100);
  }
}

// ---------------------------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------------------------

export interface EmErgebnis { ok: boolean; text: string }
const ok = (text: string): EmErgebnis => ({ ok: true, text });
const fehler = (text: string): EmErgebnis => ({ ok: false, text });

export function marke(s: GameState, id: string): Eigenmarke | undefined {
  return s.eigenmarken.marken.find((m) => m.id === id);
}

/** Prüft WG-Anteile einer Marke; gibt Fehlertext oder undefined zurück. */
function pruefeAnteile(s: GameState, m: Pick<Eigenmarke, 'id' | 'zielgruppe' | 'kategorie'>, anteile: Record<WgId, number>): string | undefined {
  for (const [wg, a] of Object.entries(anteile)) {
    if (!WG[wg]) return `Warengruppe ${wg} gibt es nicht.`;
    if (a < 0 || a > EM_PARAM.maxAnteilWg) return `Anteil je Warengruppe zwischen 0 und ${Math.round(EM_PARAM.maxAnteilWg * 100)} %.`;
    if (a > 0 && passungWg(m, wg) === 0) return `${WG[wg].name} passt nicht zur Marke (Kategorie oder Zielgruppe).`;
    const andere = s.eigenmarken.marken.filter((x) => x.id !== m.id && x.status !== 'eingestellt').reduce((x, y) => x + (y.wgAnteile[wg] ?? 0), 0);
    if (andere + a > EM_PARAM.maxAnteilWg + 1e-9) return `${WG[wg].name}: Eigenmarken zusammen höchstens ${Math.round(EM_PARAM.maxAnteilWg * 100)} %.`;
  }
  return undefined;
}

export function gruendungsKosten(anzahlWg: number): number {
  return EM_PARAM.gruendungBasis + EM_PARAM.gruendungJeWg * anzahlWg;
}

export function aufbauWochen(b: Beschaffung): number {
  return BESCHAFFUNG[b].vorlauf + EM_PARAM.aufbauZusatz;
}

export function eigenmarkeGruenden(s: GameState, e: EigenmarkeEntwurf, kosten: (x: number) => void): EmErgebnis {
  const name = (e.name ?? '').trim();
  if (name.length < 2) return fehler('Bitte einen Markennamen angeben.');
  if (s.eigenmarken.marken.some((m) => m.name.toLowerCase() === name.toLowerCase() && m.status !== 'eingestellt')) return fehler('Diesen Markennamen gibt es schon.');
  const q = Math.round(e.qualitaet);
  if (q < 1 || q > 5) return fehler('Qualität 1 bis 5.');
  if (!BESCHAFFUNG[e.beschaffung]) return fehler('Unbekannte Beschaffung.');
  const wgs = Object.entries(e.wgAnteile).filter(([, a]) => a > 0);
  if (!wgs.length) return fehler('Mindestens eine Warengruppe mit Anteil angeben.');
  const id = `em${++s.eigenmarken.zaehler}`;
  const f = pruefeAnteile(s, { id, zielgruppe: e.zielgruppe, kategorie: e.kategorie }, e.wgAnteile);
  if (f) { s.eigenmarken.zaehler--; return fehler(f); }
  if (s.phase === 'insolvenz' && s.cash + s.kreditlinie < gruendungsKosten(wgs.length) * 3) return fehler('Im Verfahren gibt der Sachwalter dafür kein Geld frei.');
  const k = gruendungsKosten(wgs.length);
  kosten(k);
  const wochen = aufbauWochen(e.beschaffung);
  const m: Eigenmarke = {
    id, name, farbe: e.farbe ?? FARBEN[s.eigenmarken.zaehler % FARBEN.length], zielgruppe: { ...e.zielgruppe }, kategorie: e.kategorie,
    preislage: e.preislage, stil: e.stil, qualitaet: q, beschaffung: e.beschaffung, budgetWoche: Math.max(0, eur(e.budgetWoche)),
    bekanntheit: 10, stilAktualitaet: 100, status: 'aufbau', bis: s.woche + wochen, seit: s.woche, gewachsen: false,
    wgAnteile: Object.fromEntries(wgs), wgIst: {},
  };
  s.eigenmarken.marken.push(m);
  const ueber = s.eigenmarken.marken.filter((x) => x.status !== 'eingestellt').length > emKapazitaet(s);
  melde(s, 'presse', `${s.firma.name} startet die Eigenmarke ${name} für ${ZIELGRUPPEN_TEXT[e.zielgruppe.alter]}.`);
  return ok(`Eigenmarke ${name} gegründet: ${mio(k)} Einmalkosten, Ware in ${wochen} Wochen in den Häusern.${ueber ? ' Achtung: Mehr Marken, als der Einkauf sauber führen kann.' : ''}`);
}

export function eigenmarkeNeupositionieren(s: GameState, id: string, neu: NonNullable<Eigenmarke['neu']>, kosten: (x: number) => void): EmErgebnis {
  const m = marke(s, id);
  if (!m || m.status === 'eingestellt') return fehler('Marke nicht gefunden.');
  if (m.status !== 'aktiv') return fehler('Die Marke ist gerade im Aufbau oder in der Neupositionierung.');
  if (neu.qualitaet !== undefined && (neu.qualitaet < 1 || neu.qualitaet > 5)) return fehler('Qualität 1 bis 5.');
  const probe = { ...m, ...neu };
  const f = pruefeAnteile(s, probe, m.wgAnteile);
  if (f) return fehler(`${f} Bitte zuerst die Warengruppen anpassen.`);
  kosten(EM_PARAM.neupositionierungKosten);
  m.neu = { ...neu };
  m.status = 'neupositionierung';
  m.bis = s.woche + EM_PARAM.neupositionierungWochen;
  m.bekanntheit *= EM_PARAM.neupositionierungBekanntheit;
  return ok(`${m.name} wird neu positioniert: ${mio(EM_PARAM.neupositionierungKosten)}, ${EM_PARAM.neupositionierungWochen} Wochen, ein Teil der Stammkundschaft geht verloren.`);
}

/** Einstellen: Anteile fallen weg, Restbestand wird Altware (Offprice, Abschrift). */
export function eigenmarkeEinstellen(s: GameState, id: string): EmErgebnis {
  const m = marke(s, id);
  if (!m || m.status === 'eingestellt') return fehler('Marke nicht gefunden.');
  m.status = 'eingestellt';
  m.wgAnteile = {};
  let rest = 0;
  for (const k of s.bestand) if (k.marke === id) { k.ladenhueter = true; rest += k.wert; }
  s.einkauf.freigaben = s.einkauf.freigaben.filter((f) => f.marke !== id);
  for (const l of s.lieferanten) if (l.aktiv) l.vertrauen = clamp(l.vertrauen + 1, 0, 100);
  melde(s, 'info', `Eigenmarke ${m.name} eingestellt.`);
  return ok(`${m.name} eingestellt. Restbestand ${mio(rest)} geht in Offprice und Abschrift.`);
}

export function eigenmarkeAnteil(s: GameState, id: string, wg: WgId, anteil: number): EmErgebnis {
  const m = marke(s, id);
  if (!m || m.status === 'eingestellt') return fehler('Marke nicht gefunden.');
  const a = clamp(anteil, 0, EM_PARAM.maxAnteilWg);
  const f = pruefeAnteile(s, m, { [wg]: a });
  if (f) return fehler(f);
  if (a === 0) delete m.wgAnteile[wg];
  else m.wgAnteile[wg] = a;
  return ok(`${m.name} in ${WG[wg].name}: Ziel ${Math.round(a * 100)} %.`);
}

export function eigenmarkeSetzen(s: GameState, id: string, w: { budgetWoche?: number; qualitaet?: number; beschaffung?: Beschaffung }): EmErgebnis {
  const m = marke(s, id);
  if (!m || m.status === 'eingestellt') return fehler('Marke nicht gefunden.');
  const teile: string[] = [];
  if (w.budgetWoche !== undefined) { m.budgetWoche = Math.max(0, eur(w.budgetWoche)); teile.push(`Budget ${Math.round(m.budgetWoche / 1000)} Tsd. € je Woche`); }
  if (w.qualitaet !== undefined) { m.qualitaet = clamp(Math.round(w.qualitaet), 1, 5); teile.push(`Qualität ${m.qualitaet}`); }
  if (w.beschaffung !== undefined) {
    if (!BESCHAFFUNG[w.beschaffung]) return fehler('Unbekannte Beschaffung.');
    m.beschaffung = w.beschaffung;
    teile.push(`Beschaffung ${BESCHAFFUNG[w.beschaffung].name}`);
  }
  return ok(`${m.name}: ${teile.join(', ') || 'unverändert'}.`);
}

const FARBEN = ['#8c5a7a', '#2f4a6b', '#6f8f4e', '#d9822b', '#7a3e3e', '#3e7a74', '#b5953f', '#5b4b8a', '#a64d79', '#4d7ea6'];

// ---------------------------------------------------------------------------------------------
// Abfragen
// ---------------------------------------------------------------------------------------------

export interface MarkenKarte {
  id: string; name: string; farbe: string; status: EmStatus; bis?: number; gewachsen: boolean;
  zielgruppe: Zielgruppe; zielgruppeText: string; kategorie: EmKategorie; preislage: Preislage; stil: Stil; qualitaet: number;
  beschaffung: Beschaffung; beschaffungName: string; vorlaufWochen: number; mindestabnahme: number;
  budgetWoche: number; bekanntheit: number; stilAktualitaet: number; attraktivitaet: number;
  umsatz13: number; umsatzAnteil: number; rohertrag13: number; rohertragsquote: number; mehrmarge: number;
  passung: number; passungRegion: Partial<Record<Region, number>>;
  wgs: { wg: WgId; name: string; bereich: GruppeId; anteilZiel: number; anteilIst: number }[];
  neu?: Eigenmarke['neu'];
  hinweise: string[];
}

export interface EigenmarkenUebersicht {
  woche: number;
  kapazitaet: number;
  gefuehrt: number;
  anteilUmsatz: number; // Eigenmarkenumsatz am eigenen Warenumsatz, 13 Wochen
  mehrmargeSchnitt: number;
  marken: MarkenKarte[];
  /** Je Bereich: Marken mit VK-Anteil (für den Shop in der Hausgrafik). */
  jeBereich: Partial<Record<GruppeId, { marke: string; name: string; farbe: string; anteil: number }[]>>;
  vorlagen: typeof EM_VORLAGEN;
  kosten: { gruendungBasis: number; gruendungJeWg: number; neupositionierung: number; neupositionierungWochen: number };
  beschaffung: typeof BESCHAFFUNG;
}

function passungSchnitt(s: GameState, m: Pick<Eigenmarke, 'zielgruppe' | 'preislage'>): { gesamt: number; region: Partial<Record<Region, number>> } {
  const sum: Partial<Record<Region, [number, number]>> = {};
  let a = 0; let n = 0;
  for (const h of s.haeuser) {
    if (h.status !== 'offen' || h.format !== 'warenhaus') continue;
    const p = passungHaus(m, h);
    a += p; n++;
    const r = (sum[h.region] ??= [0, 0]);
    r[0] += p; r[1]++;
  }
  const region: Partial<Record<Region, number>> = {};
  for (const [r, [x, k]] of Object.entries(sum) as [Region, [number, number]][]) region[r] = Math.round((x / k) * 100);
  return { gesamt: n ? Math.round((a / n) * 100) : 0, region };
}

function attraktivitaetSchnitt(s: GameState, m: Eigenmarke): number {
  let a = 0; let n = 0;
  for (const h of s.haeuser) if (h.status === 'offen' && h.format === 'warenhaus') { a += attraktivitaet(s, m, h); n++; }
  return n ? a / n : 0;
}

export function markenKarte(s: GameState, m: Eigenmarke): MarkenKarte {
  const kz = s.einkauf.markenKpi[m.id] ?? { u: [], r: [] };
  const u13 = kz.u.slice(-13).reduce((a, b) => a + b, 0);
  const r13 = kz.r.slice(-13).reduce((a, b) => a + b, 0);
  const gesamt13 = s.einkauf.eigenUmsatz.slice(-13).reduce((a, b) => a + b, 0);
  const p = passungSchnitt(s, m);
  const hinweise: string[] = [];
  if (m.stilAktualitaet < 40) hinweise.push('Stil wirkt veraltet');
  if (m.bekanntheit < 25) hinweise.push('Kaum bekannt');
  if (p.gesamt < 45) hinweise.push('Passt schlecht zu den Einzugsgebieten');
  if (BESCHAFFUNG[m.beschaffung].vorlauf >= 20) hinweise.push('Lange Vorläufe, hohe Mindestabnahme');
  if (emUeberlastung(s) > 0) hinweise.push('Einkauf führt mehr Marken, als er pflegen kann');
  const wgs = new Set([...Object.keys(m.wgAnteile), ...Object.keys(m.wgIst)]);
  return {
    id: m.id, name: m.name, farbe: m.farbe, status: m.status, bis: m.bis, gewachsen: m.gewachsen,
    zielgruppe: { ...m.zielgruppe }, zielgruppeText: `${ZIELGRUPPEN_TEXT[m.zielgruppe.alter]}, ${m.zielgruppe.geschlecht}`,
    kategorie: m.kategorie, preislage: m.preislage, stil: m.stil, qualitaet: m.qualitaet,
    beschaffung: m.beschaffung, beschaffungName: BESCHAFFUNG[m.beschaffung].name, vorlaufWochen: BESCHAFFUNG[m.beschaffung].vorlauf, mindestabnahme: BESCHAFFUNG[m.beschaffung].mindestabnahme,
    budgetWoche: m.budgetWoche, bekanntheit: Math.round(m.bekanntheit), stilAktualitaet: Math.round(m.stilAktualitaet),
    attraktivitaet: Math.round(attraktivitaetSchnitt(s, m) * 100) / 100,
    umsatz13: eur(u13), umsatzAnteil: gesamt13 > 0 ? u13 / gesamt13 : 0, rohertrag13: eur(r13), rohertragsquote: u13 > 0 ? r13 / u13 : 0,
    mehrmarge: mehrmarge(m), passung: p.gesamt, passungRegion: p.region,
    wgs: [...wgs].filter((wg) => WG[wg]).map((wg) => ({ wg, name: WG[wg].name, bereich: WG[wg].bereich, anteilZiel: m.wgAnteile[wg] ?? 0, anteilIst: Math.round((m.wgIst[wg] ?? 0) * 1000) / 1000 })),
    neu: m.neu ? { ...m.neu } : undefined,
    hinweise,
  };
}

export function eigenmarkenUebersicht(s: GameState): EigenmarkenUebersicht {
  const marken = s.eigenmarken.marken.filter((m) => m.status !== 'eingestellt').map((m) => markenKarte(s, m));
  const gesamt13 = s.einkauf.eigenUmsatz.slice(-13).reduce((a, b) => a + b, 0);
  const em13 = marken.reduce((a, m) => a + m.umsatz13, 0);
  const jeBereich: EigenmarkenUebersicht['jeBereich'] = {};
  for (const [g, liste] of Object.entries(s.einkauf.emJeBereich) as [GruppeId, Record<string, number>][]) {
    const out = Object.entries(liste).map(([id, anteil]) => { const m = marke(s, id); return m ? { marke: id, name: m.name, farbe: m.farbe, anteil: Math.round(anteil * 1000) / 1000 } : undefined; })
      .filter((x): x is { marke: string; name: string; farbe: string; anteil: number } => !!x && x.anteil > 0).sort((a, b) => b.anteil - a.anteil);
    if (out.length) jeBereich[g] = out;
  }
  const mm = em13 > 0 ? marken.reduce((a, m) => a + m.mehrmarge * m.umsatz13, 0) / em13 : 0;
  return {
    woche: s.woche, kapazitaet: Math.round(emKapazitaet(s) * 10) / 10, gefuehrt: marken.length,
    anteilUmsatz: gesamt13 > 0 ? em13 / gesamt13 : 0, mehrmargeSchnitt: mm, marken, jeBereich, vorlagen: EM_VORLAGEN,
    kosten: { gruendungBasis: EM_PARAM.gruendungBasis, gruendungJeWg: EM_PARAM.gruendungJeWg, neupositionierung: EM_PARAM.neupositionierungKosten, neupositionierungWochen: EM_PARAM.neupositionierungWochen },
    beschaffung: BESCHAFFUNG,
  };
}

export interface EigenmarkeVorschau {
  ok: boolean; fehler?: string; mehrmarge: number; passung: number; passungRegion: Partial<Record<Region, number>>;
  attraktivitaet: number; kosten: number; aufbauWochen: number; vorlaufWochen: number; mindestabnahme: number;
  kapazitaetFrei: number; passendeWgs: { wg: WgId; name: string; bereich: GruppeId; passung: number }[];
}

/** Für den Gründungsassistenten: Kennwerte eines Entwurfs, ohne etwas zu verändern. */
export function eigenmarkeVorschau(s: GameState, e: EigenmarkeEntwurf): EigenmarkeVorschau {
  const probe: Eigenmarke = {
    id: '_probe', name: e.name, farbe: '#000', zielgruppe: e.zielgruppe, kategorie: e.kategorie, preislage: e.preislage, stil: e.stil,
    qualitaet: clamp(Math.round(e.qualitaet), 1, 5), beschaffung: e.beschaffung, budgetWoche: e.budgetWoche, bekanntheit: 45, stilAktualitaet: 100,
    status: 'aktiv', seit: s.woche, gewachsen: false, wgAnteile: e.wgAnteile, wgIst: {},
  };
  const f = pruefeAnteile(s, probe, e.wgAnteile);
  const p = passungSchnitt(s, probe);
  const n = s.eigenmarken.marken.filter((m) => m.status !== 'eingestellt').length;
  return {
    ok: !f, fehler: f, mehrmarge: mehrmarge(probe), passung: p.gesamt, passungRegion: p.region,
    attraktivitaet: Math.round(attraktivitaetSchnitt(s, probe) * 100) / 100,
    kosten: gruendungsKosten(Object.values(e.wgAnteile).filter((a) => a > 0).length),
    aufbauWochen: aufbauWochen(e.beschaffung), vorlaufWochen: BESCHAFFUNG[e.beschaffung].vorlauf, mindestabnahme: BESCHAFFUNG[e.beschaffung].mindestabnahme,
    kapazitaetFrei: Math.round((emKapazitaet(s) - n) * 10) / 10,
    passendeWgs: WG_DEF.filter((d) => s.basisUmsatz[d.bereich] !== undefined && passungWg(probe, d.id) > 0).map((d) => ({ wg: d.id, name: d.name, bereich: d.bereich, passung: Math.round(passungWg(probe, d.id) * 100) / 100 })),
  };
}
