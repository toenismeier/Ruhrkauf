// O04 Personaleinsatz: vier Gruppen, Dienstplan Mo–Sa, Springer und saisonale Aushilfen.
// Alle Grundbesetzungen und Startkosten bleiben unangetastet. Abweichungen wirken
// ausschließlich relativ zur beim Spielstart gespeicherten Referenzplanung.
import { GRUPPEN, saisonFaktor } from './daten';
import type { GameState, GruppeId, Haus } from './types';
import { clamp, eur, melde } from './util';

export type PersonalGruppe = 'logistik' | 'verkauf' | 'kasse' | 'verwaltung';
export const PERSONAL_GRUPPEN: PersonalGruppe[] = ['logistik', 'verkauf', 'kasse', 'verwaltung'];
export const PERSONAL_NAMEN: Record<PersonalGruppe, string> = {
  logistik: 'Instore-Logistik', verkauf: 'Verkauf', kasse: 'Kasse', verwaltung: 'Verwaltung',
};
// Aufteilung der bisherigen Haus-FTE: Logistik 19 %, Verkauf 52 %, Kasse 19 %, Verwaltung 10 %.
// Die Aufteilung ist eine Kostenträgerrechnung, keine zusätzliche Einstellung.
export const PERSONAL_ANTEILE: Record<PersonalGruppe, number> = {
  logistik: 0.19, verkauf: 0.52, kasse: 0.19, verwaltung: 0.10,
};
export const PERSONAL_TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;
export interface PersonalTag { tag: string; bedarf: number; plan: number; referenz: number; springer: number; deckung: number }
export interface PersonalZeile { gruppe: PersonalGruppe; name: string; fte: number; tage: PersonalTag[]; bedarf: number; plan: number; deckung: number }
export interface PersonalPlan {
  woche: number; gruppen: Record<PersonalGruppe, PersonalZeile>;
  krank: number; urlaub: number; aushilfenStunden: number; zusatzkosten: number;
  verfuegbarkeit: number; kaufquote: number; fehlerkosten: number;
  springerSaldo: number; springerBewegungen: number; einarbeitung: number;
}
export interface PersonalHausStand {
  basisFte: number;
  basisQualitaet: number;
  anteile: Record<PersonalGruppe, number>;
  faktor: Record<PersonalGruppe, number>;
  samstagKasse: number;
  aushilfenQuote: number; // zusätzlich eingeplante Aushilfenstunden / planmäßige Stunden
  stimmung: number;
  einarbeitungBis: number;
  training: number;
  plan?: PersonalPlan;
}
export interface PersonalStand {
  weihnachten: Record<number, 'basis' | 'reserve' | 'sparsam' | 'spaet'>;
  springer: Record<string, boolean>;
  trainingInvestition: number;
  letzteVorlage: number;
  letzteWarnung: Record<string, number>;
}
export type PersonalAktion =
  | { typ: 'personalSteuern'; haus?: string; hauscluster?: string; gruppe: PersonalGruppe; faktor: number }
  | { typ: 'personalSamstagKasse'; haus?: string; hauscluster?: string; faktor: number }
  | { typ: 'personalAushilfen'; haus?: string; hauscluster?: string; quote: number }
  | { typ: 'personalSpringer'; hauscluster: string; an: boolean }
  | { typ: 'personalWeiterbildung'; hauscluster?: string; stufe: number };
export const PERSONAL_AKTIONEN = new Set<string>([
  'personalSteuern', 'personalSamstagKasse', 'personalAushilfen',
  'personalSpringer', 'personalWeiterbildung',
]);
export interface PersonalCluster {
  id: string; name: string; haeuser: {
    id: string; name: string; gruppen: Record<PersonalGruppe, number>;
    krank: number; aushilfen: number; springer: number;
  }[];
  springerAktiv: boolean; bewegungen: number;
}
const fte = (h: Haus): number => h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen;
const aktiv = (h: Haus): boolean => h.status === 'offen' || h.status === 'raeumung' || h.status === 'schliessung_verhandlung';
const rund = (n: number) => Math.round(n * 10) / 10;
const gruppeHauscluster = (h: Haus, s: GameState): string => {
  // O01: Premiumhäuser und vom Spieler gewählte Flagships gehören zum Sondercluster.
  const org = s as GameState & { organisation?: { flagships: string[] } };
  if (org.organisation && (h.klasse === 'premium' || org.organisation.flagships.includes(h.id)))
    return 'premium-flagships';
  return h.hauscluster || 'region-' + h.region;
};
function clusterName(s: GameState, id: string): string {
  const org = s as GameState & { organisation?: { hauscluster: { id: string; name: string }[] } };
  return org.organisation?.hauscluster.find((x) => x.id === id)?.name ?? id.replace('region-', '');
}
/** O01-Adapter: liest genau dessen Bereich/Stellenstruktur, ohne das parallele Modul zu duplizieren. */
function qualitaet(s: GameState): number {
  const org = s as GameState & { organisation?: {
    bereiche?: Record<string, { person?: { qualitaet: number }; basis?: number }>;
  } };
  const st = org.organisation?.bereiche?.personaleinsatz;
  if (!st) return 0.7;
  const hqWirkung = (s.hq as { wirkung?: Record<string, number> }).wirkung?.personal ?? 1;
  const chro = s.vorstand?.ressorts?.chro?.person;
  const fuehrung = chro ? clamp(1 + (chro.fuehrung / 100 - 0.5) * 0.3, 0.85, 1.15) : 1;
  return clamp((st.person?.qualitaet ?? 0.35) * hqWirkung * fuehrung, 0, 1);
}
function clusterQualitaet(s: GameState, id: string): number {
  const org = s as GameState & { organisation?: { hauscluster: {
    id: string; stelle: { person?: { qualitaet: number } };
  }[] } };
  return clamp(org.organisation?.hauscluster.find((x) => x.id === id)?.stelle.person?.qualitaet ?? 0.65, 0, 1);
}
function profil(s: GameState, gruppe: PersonalGruppe): number[] {
  // Normalisiert auf 1, da hier Anteile an den 40 Wochenstunden verteilt werden.
  const p = [0.105, 0.137, 0.147, 0.157, 0.191, 0.263];
  const dezember = s.woche % 52 >= 47 && s.woche % 52 <= 51;
  if (dezember) { p[0] -= 0.035; p[5] += 0.035; }
  if (gruppe === 'kasse') { p[0] -= 0.015; p[5] += 0.015; }
  if (gruppe === 'logistik') { p[0] += 0.065; p[5] -= 0.065; }
  if (gruppe === 'verwaltung') { p[0] += 0.025; p[5] -= 0.065; p[1] += 0.04; }
  return p;
}
function ausfall(s: GameState): { krank: number; urlaub: number } {
  const kw = s.woche % 52;
  return {
    krank: kw <= 8 ? 0.086 : kw >= 44 ? 0.067 : 0.045,
    urlaub: kw >= 26 && kw <= 35 ? 0.14 : kw >= 51 ? 0.10 : 0.055,
  };
}
function dienstplan(s: GameState, h: Haus): PersonalPlan {
  const st = h.personaleinsatz!;
  const aus = ausfall(s), q = qualitaet(s);
  const neu = st.einarbeitungBis > s.woche;
  const relativ = st.basisFte ? fte(h) / st.basisFte : 1;
  const dezember = s.woche % 52 >= 47 && s.woche % 52 <= 51;
  const jahr = Math.floor(s.woche / 52);
  const weihnachten = s.personaleinsatz?.weihnachten[jahr] ?? 'basis';
  // Der Wochenbedarf wächst mit Saison und Warenbewegung. Die Standardplanung
  // deckt diese schwankende Last mit dem bereits in den Löhnen enthaltenen Dienstplan.
  const saison = clamp(0.75 + 0.25 * saisonFaktor('damen', s.woche), 0.7, 1.35);
  const liefer = 1 + h.flaechen.filter((f) => f.konzept === 'offprice').length * 0.03;
  const gruppen = {} as Record<PersonalGruppe, PersonalZeile>;
  let extra = 0;
  for (const g of PERSONAL_GRUPPEN) {
    const p = profil(s, g);
    const basis = st.basisFte * 40 * PERSONAL_ANTEILE[g] * saison *
      (g === 'logistik' ? liefer : 1);
    const tage = p.map((anteil, i) => {
      const bedarf = basis * anteil / (1 - aus.krank - aus.urlaub);
      // Gleiche Basis-Prognose wie beim Start: Neutralität bei q = basisQualitaet.
      // Vorzeichen und Ausmaß der Tagesfehler sind deterministisch, ohne RNG-Verbrauch.
      const richtung = Math.sin((h.id.length * 13 + h.id.charCodeAt(1) * 7 + i * 11 + s.woche % 52) * 0.41);
      const fehler = richtung * 0.19;
      const bezug = 1 + fehler * (1 - st.basisQualitaet);
      const genau = 1 + fehler * (1 - q);
      let plan = bedarf * relativ * (neu ? 0.75 : 1) * st.faktor[g] * genau * (1 + st.training * 0.035);
      if (g === 'kasse' && i === 5) plan *= st.samstagKasse;
      if (g === 'kasse' && dezember && weihnachten === 'sparsam') plan *= 0.88;
      if (g === 'kasse' && dezember && weihnachten === 'spaet') plan *= 0.78;
      if (g === 'verkauf' && dezember && weihnachten === 'spaet') plan *= 0.86;
      const referenz = bedarf * bezug;
      extra += Math.max(0, (st.faktor[g] - 1) * bedarf) + (g === 'kasse' && i === 5 ? Math.max(0, st.samstagKasse - 1) * bedarf : 0);
      return { tag: PERSONAL_TAGE[i], bedarf: rund(bedarf), plan: rund(plan), referenz: rund(referenz), springer: 0, deckung: bedarf ? plan / bedarf : 1 };
    });
    const bedarf = tage.reduce((a, t) => a + t.bedarf, 0);
    const plan = tage.reduce((a, t) => a + t.plan, 0);
    gruppen[g] = { gruppe: g, name: PERSONAL_NAMEN[g], fte: rund(fte(h) * PERSONAL_ANTEILE[g]),
      tage, bedarf: rund(bedarf), plan: rund(plan), deckung: bedarf ? plan / bedarf : 1 };

  }
  const ahQuote = st.aushilfenQuote;
  const gesamt = Object.values(gruppen).reduce((a, g) => a + g.bedarf, 0);
  const aushilfenStunden = gesamt * ahQuote;
  // Zusatzkräfte überwiegend freitags und samstags im Verkauf und an der Kasse.
  for (const g of ['verkauf', 'kasse'] as PersonalGruppe[]) {
    const z = gruppen[g], anteil = g === 'kasse' ? 0.45 : 0.55;
    z.tage[4].plan += rund(aushilfenStunden * anteil * 0.35);
    z.tage[5].plan += rund(aushilfenStunden * anteil * 0.65);
    z.plan = rund(z.tage.reduce((a, t) => a + t.plan, 0));
  }
  // Vergütungen als Zusatzkosten, niemals eine Änderung der bisherigen Basislöhne.
  const basisStunden = Math.max(1, st.basisFte * 40);
  const normalLohn = (h.personal.vollzeit * 860 + h.personal.teilzeit * 690 + h.personal.aushilfen * 490) / basisStunden;
  const aufschlag = dezember && weihnachten === 'spaet' ? 1.55 : 1;
  const zusatzkosten = eur(aushilfenStunden * 490 / 40 * aufschlag + extra * normalLohn * 0.5 +
    (dezember && weihnachten === 'reserve' ? gesamt * 0.02 * 490 / 40 : 0));
  const plan: PersonalPlan = { woche: s.woche, gruppen, krank: aus.krank, urlaub: aus.urlaub,
    aushilfenStunden: rund(aushilfenStunden), zusatzkosten, verfuegbarkeit: 1,
    kaufquote: 1, fehlerkosten: 0, springerSaldo: 0, springerBewegungen: 0,
    einarbeitung: neu ? 0.5 : 1 };
  berechneWirkung(h, plan);
  return plan;
}
function berechneWirkung(h: Haus, p: PersonalPlan): void {
  // Ausschließlich Unterdeckung wirkt auf Verkäufe; Überdeckung erhöht nur die Kosten.
  const defizit = (g: PersonalGruppe, i: number) => {
    const t = p.gruppen[g].tage[i];
    // Gegen den unveränderten Startplan normiert. Prognosefehler in der
    // Ausgangslage bleiben sichtbar, verändern Umsatz und EBITDA aber nicht.
    return Math.max(0, 1 - t.plan / Math.max(0.01, t.referenz));
  };
  const gewicht = [0.105, 0.137, 0.147, 0.157, 0.191, 0.263];
  const verkauf = gewicht.reduce((a, w, i) => a + w * defizit('verkauf', i), 0);
  const kasse = gewicht.reduce((a, w, i) => a + w * defizit('kasse', i) * (i === 5 ? 1.6 : 0.38), 0);
  const logistik = gewicht.reduce((a, w, i) => a + w * defizit('logistik', i), 0);
  const verwaltung = gewicht.reduce((a, w, i) => a + w * defizit('verwaltung', i), 0);
  p.kaufquote = clamp(1 - 0.33 * verkauf - 0.40 * kasse, 0.65, 1);
  p.verfuegbarkeit = clamp(1 - 0.5 * logistik, 0.7, 1);
  p.fehlerkosten = eur((h.kpi?.umsatz ?? 0) * 0.004 * verwaltung);
  for (const z of Object.values(p.gruppen)) {
    z.plan = rund(z.tage.reduce((a, t) => a + t.plan, 0));
    z.deckung = z.bedarf ? z.plan / z.bedarf : 1;
    for (const t of z.tage) t.deckung = t.bedarf ? t.plan / t.bedarf : 1;
  }
}
function neuPlanen(s: GameState): void {
  const gruppen = new Map<string, Haus[]>();
  for (const h of s.haeuser) {
    if (!aktiv(h) || !h.personaleinsatz) continue;
    h.personaleinsatz.plan = dienstplan(s, h);
    const id = gruppeHauscluster(h, s);
    if (!gruppen.has(id)) gruppen.set(id, []);
    gruppen.get(id)!.push(h);
  }
  // Ein Springer darf ausschließlich zwischen Häusern desselben Hausclusters wechseln.
  for (const [id, hs] of gruppen) {
    if (!s.personaleinsatz?.springer[id] || hs.length < 2) continue;
    const guete = clusterQualitaet(s, id);
    for (const g of ['kasse', 'verkauf', 'logistik'] as PersonalGruppe[]) for (let tag = 0; tag < 6; tag++) {
      const bedarf = (h: Haus) => h.personaleinsatz!.plan!.gruppen[g].tage[tag].bedarf;
      const plan = (h: Haus) => h.personaleinsatz!.plan!.gruppen[g].tage[tag].plan;
      const empfaenger = hs.filter((h) => bedarf(h) > plan(h) + 0.1)
        .sort((a, b) => (bedarf(b) - plan(b)) - (bedarf(a) - plan(a)) || a.id.localeCompare(b.id));
      const geber = hs.filter((h) => plan(h) > bedarf(h) + 0.1).sort((a, b) => a.id.localeCompare(b.id));
      for (const ziel of empfaenger) for (const start of geber) {
        if (start.id === ziel.id) continue;
        const frei = plan(start) - bedarf(start), fehlt = bedarf(ziel) - plan(ziel);
        const cap = 0.12 * bedarf(start) * guete;
        const stunden = rund(Math.max(0, Math.min(frei, fehlt, cap)));
        if (!stunden) continue;
        const von = start.personaleinsatz!.plan!, nach = ziel.personaleinsatz!.plan!;
        von.gruppen[g].tage[tag].plan -= stunden;
        nach.gruppen[g].tage[tag].plan += stunden;
        von.gruppen[g].tage[tag].springer -= stunden;
        nach.gruppen[g].tage[tag].springer += stunden;
        von.springerSaldo -= stunden; nach.springerSaldo += stunden;
        von.springerBewegungen++; nach.springerBewegungen++;
      }
    }
    for (const h of hs) berechneWirkung(h, h.personaleinsatz!.plan!);
  }
  // O02-Adapter: nur wenn der Treiberbestand vorhanden ist, das Quellenprotokoll setzen.
  // In wirtschaft.ts wird der Gruppeneffekt dann relativ zu diesem Globalfaktor angewendet.
  for (const h of s.haeuser) {
    if (!h.personaleinsatz?.plan || !h.treiber) continue;
    const q = h.personaleinsatz.plan.kaufquote;
    (h.treiberQuellen ??= {});
    if (q < 0.999999) (h.treiberQuellen.personal ??= {}).kaufquote = q;
    else if (h.treiberQuellen.personal) {
      delete h.treiberQuellen.personal.kaufquote;
      if (!Object.keys(h.treiberQuellen.personal).length) delete h.treiberQuellen.personal;
    }
    const v = { frequenz: 1, kaufquote: 1, bon: 1 };
    for (const x of Object.values(h.treiberQuellen))
      for (const k of ['frequenz', 'kaufquote', 'bon'] as const) v[k] *= x[k] ?? 1;
    h.treiber = v;
  }
}
/** Vor erster Woche und nach jeder Spieleraktion neu berechnen, ohne Zufall zu verbrauchen. */
export function initialisierePersonaleinsatz(s: GameState): void {
  if (!s.personaleinsatz) s.personaleinsatz = {
    weihnachten: {}, springer: {}, trainingInvestition: 0, letzteVorlage: -1, letzteWarnung: {},
  };
  const q = qualitaet(s);
  for (const h of s.haeuser) if (!h.personaleinsatz) {
    h.personaleinsatz = {
      basisFte: Math.max(0.1, fte(h)), basisQualitaet: q, anteile: { ...PERSONAL_ANTEILE },
      faktor: { logistik: 1, verkauf: 1, kasse: 1, verwaltung: 1 }, samstagKasse: 1,
      aushilfenQuote: 0, stimmung: 70, einarbeitungBis: -1, training: 0,
    };
  }
  neuPlanen(s);
}
export function personaleinsatzWoche(s: GameState): void {
  if (!s.personaleinsatz) initialisierePersonaleinsatz(s);
  const ps = s.personaleinsatz!;
  // Vorlage im Oktober, Entscheidung spätestens in KW 44. Ohne Antwort gilt der
  // Vorschlag des Bereichs (Basisplanung), inklusive impliziter Standard-Aushilfen.
  const jahr = Math.floor(s.woche / 52), kw = s.woche % 52;
  if (!s.prognose && kw === 39 && ps.letzteVorlage !== jahr) {
    ps.letzteVorlage = jahr;
    s.entscheidungen.push({
      id: 'personal-weihnachten-' + jahr, typ: 'personal_weihnachten',
      titel: 'Aushilfen Weihnachten: drei Optionen',
      text: 'Dezember-Spitzen frühzeitig absichern. Entscheidung bis KW 44, danach werden Aushilfen teurer und knapper.',
      woche: s.woche, frist: s.woche + 4, standard: 'basis', daten: { jahr },
      optionen: [{ id: 'reserve', label: 'Reserve erhöhen (zusätzliche Kosten)' },
        { id: 'basis', label: 'Bedarfsgerecht planen (Empfehlung)' },
        { id: 'sparsam', label: 'Sparsam planen (Risiko an der Kasse)' }],
    });
  }
  for (const h of s.haeuser) {
    const st = h.personaleinsatz;
    if (!aktiv(h) || !st || s.prognose) continue;
    const ratio = st.basisFte ? fte(h) / st.basisFte : 1;
    // Nur signifikante Eingriffe verändern die Stimmung. Bestehende Startwerte bleiben neutral.
    if (ratio < 0.75) st.stimmung = clamp(st.stimmung - 0.35, 0, 100);
    else if (ratio > 0.98) st.stimmung = clamp(st.stimmung + 0.08, 0, 100);
    // Bei stark beschädigter Mitarbeiterbindung seltene, deterministische Fluktuation.
    if (st.stimmung < 32 && (s.woche + h.id.length * 7) % 17 === 0) {
      h.personal.teilzeit = Math.max(0, h.personal.teilzeit * 0.98);
      st.einarbeitungBis = s.woche + 4;
      melde(s, 'warnung', h.name + ': erhöhte Fluktuation. Neue Kräfte sind vier Wochen nur halb produktiv.', { hausId: h.id, modul: 'personal' });
    }
  }
  neuPlanen(s);
  // Warnung nur bei spielerisch relevanten Engpässen, maximal einmal in acht Wochen.
  if (!s.prognose) for (const [id, hs] of gruppiereCluster(s)) {
    const kritisch = hs.filter((h) => (h.personaleinsatz?.plan?.gruppen.kasse.tage[5].deckung ?? 1) < 0.84);
    if (!kritisch.length || (ps.letzteWarnung[id] ?? -100) > s.woche - 8) continue;
    ps.letzteWarnung[id] = s.woche;
    s.entscheidungen.push({
      id: 'personal-kasse-' + id + '-' + s.woche, typ: 'personal_kasse',
      titel: 'Cluster ' + clusterName(s, id) + ': Kasse samstags unterdeckt',
      text: kritisch.length + ' Häuser melden Kaufabbrüche wegen Warteschlangen.',
      woche: s.woche, frist: s.woche + 2, standard: 'springer', daten: { cluster: id },
      optionen: [{ id: 'springer', label: 'Springerpool nutzen (Empfehlung)' },
        { id: 'aushilfen', label: 'Zusätzliche Aushilfen' },
        { id: 'behalten', label: 'Dienstplan beibehalten' }],
    });
  }
}
function gruppiereCluster(s: GameState): Map<string, Haus[]> {
  const m = new Map<string, Haus[]>();
  for (const h of s.haeuser) if (aktiv(h)) {
    const id = gruppeHauscluster(h, s);
    if (!m.has(id)) m.set(id, []);
    m.get(id)!.push(h);
  }
  return m;
}
/** Rückgabe null bei erfolgreicher Anwendung; Entscheidung selbst wird durch ereignisse.ts protokolliert. */
export function loesePersonalEntscheidung(s: GameState, typ: string, daten: Record<string, string | number | boolean>, option: string): void {
  if (!s.personaleinsatz) initialisierePersonaleinsatz(s);
  if (typ === 'personal_weihnachten') {
    s.personaleinsatz!.weihnachten[Number(daten.jahr)] = option as 'basis' | 'reserve' | 'sparsam';
  } else if (typ === 'personal_kasse') {
    const id = String(daten.cluster);
    if (option === 'springer') s.personaleinsatz!.springer[id] = true;
    if (option === 'aushilfen') for (const h of gruppiereCluster(s).get(id) ?? [])
      if (h.personaleinsatz) h.personaleinsatz.aushilfenQuote = Math.max(h.personaleinsatz.aushilfenQuote, 0.08);
  }
  neuPlanen(s);
}
/** Einziger Engine-Einbaupunkt für Nachfrage: gruppenspezifische Kaufquote aus O04. */
export function personalVerkaufsFaktor(h: Haus, gruppe: GruppeId): number {
  const p = h.personaleinsatz?.plan;
  if (!p) return 1;
  const beratung = GRUPPEN[gruppe]?.beratung ?? 0.5;
  const v = p.gruppen.verkauf.tage.reduce((a, t) => a +
    (Math.max(0, 1 - t.plan / Math.max(0.01, t.referenz)) / 6), 0);
  const faktor = clamp(1 - (0.15 + 0.38 * beratung) * v, 0.65, 1) *
    clamp(p.kaufquote / Math.max(0.000001, 1 - 0.33 * v), 0.65, 1);
  // O02 wendet den globalen Kaufquotenfaktor später selbst an.
  return h.treiber ? faktor / Math.max(0.65, p.kaufquote) : faktor;
}
export function personalOffpriceFaktor(h: Haus): number {
  const p = h.personaleinsatz?.plan;
  return p ? (h.treiber ? 1 : p.kaufquote) : 1;
}
export function personalZusatzkosten(h: Haus): number {
  return h.personaleinsatz?.plan?.zusatzkosten ?? 0;
}
export function personalFehlerkosten(h: Haus): number {
  return h.personaleinsatz?.plan?.fehlerkosten ?? 0;
}
export function personalVerfuegbarkeit(h: Haus): number {
  return h.personaleinsatz?.plan?.verfuegbarkeit ?? 1;
}
function auswahl(s: GameState, a: { haus?: string; hauscluster?: string }): Haus[] {
  if (a.haus) return s.haeuser.filter((h) => h.id === a.haus && aktiv(h));
  if (a.hauscluster) return s.haeuser.filter((h) => gruppeHauscluster(h, s) === a.hauscluster && aktiv(h));
  return [];
}
export function personalAktion(s: GameState, a: PersonalAktion): { ok: boolean; text: string } {
  if (!s.personaleinsatz) initialisierePersonaleinsatz(s);
  if (a.typ === 'personalSpringer') {
    if (!gruppiereCluster(s).has(a.hauscluster)) return { ok: false, text: 'Hauscluster nicht gefunden.' };
    s.personaleinsatz!.springer[a.hauscluster] = a.an;
    neuPlanen(s);
    return { ok: true, text: 'Springerpool ' + (a.an ? 'aktiviert.' : 'deaktiviert.') };
  }
  if (a.typ === 'personalWeiterbildung') {
    if (!Number.isFinite(a.stufe) || a.stufe < 0 || a.stufe > 3) return { ok: false, text: 'Stufe 0 bis 3 wählen.' };
    const hs = a.hauscluster ? auswahl(s, { hauscluster: a.hauscluster }) : s.haeuser.filter(aktiv);
    if (!hs.length) return { ok: false, text: 'Keine Häuser ausgewählt.' };
    for (const h of hs) h.personaleinsatz!.training = a.stufe;
    s.einmalkostenWoche += eur(hs.length * a.stufe * 1700);
    neuPlanen(s);
    return { ok: true, text: 'Weiterbildung für ' + hs.length + ' Häuser beauftragt.' };
  }
  const hs = auswahl(s, a);
  if (!hs.length) return { ok: false, text: 'Offenes Haus oder Hauscluster nicht gefunden.' };
  const wert = a.typ === 'personalAushilfen' ? a.quote : a.faktor;
  const min = a.typ === 'personalAushilfen' ? 0 : 0.4, max = a.typ === 'personalAushilfen' ? 0.3 : 1.6;
  if (!Number.isFinite(wert) || wert < min || wert > max)
    return { ok: false, text: 'Wert außerhalb des zulässigen Bereichs.' };
  for (const h of hs) {
    const st = h.personaleinsatz!;
    if (a.typ === 'personalSteuern') st.faktor[a.gruppe] = wert;
    else if (a.typ === 'personalSamstagKasse') st.samstagKasse = wert;
    else st.aushilfenQuote = wert;
  }
  neuPlanen(s);
  return { ok: true, text: 'Personaleinsatz in ' + hs.length + ' Häusern angepasst.' };
}
export function personalHaus(s: GameState, hausId: string): PersonalPlan | undefined {
  return s.haeuser.find((h) => h.id === hausId)?.personaleinsatz?.plan;
}
export function personalUebersicht(s: GameState, cluster?: string): PersonalCluster[] {
  return [...gruppiereCluster(s)].filter(([id]) => !cluster || id === cluster).map(([id, hs]) => ({
    id, name: clusterName(s, id), springerAktiv: !!s.personaleinsatz?.springer[id],
    bewegungen: hs.reduce((n, h) => n + (h.personaleinsatz?.plan?.springerBewegungen ?? 0), 0),
    haeuser: hs.map((h) => {
      const p = h.personaleinsatz?.plan;
      return { id: h.id, name: h.name,
        gruppen: Object.fromEntries(PERSONAL_GRUPPEN.map((g) => [g, p?.gruppen[g].deckung ?? 1])) as Record<PersonalGruppe, number>,
        krank: p?.krank ?? 0, aushilfen: p?.aushilfenStunden ?? 0, springer: p?.springerSaldo ?? 0 };
    }),
  }));
}
