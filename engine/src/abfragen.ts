import { warenHaus } from './merchandise';
import { GRUPPEN } from './daten';
// O01 Organisation: reine Datenprojektion für die Oberfläche.
export { organisationUebersicht } from './organisation';
import { runwayWochen } from './stakeholder';
import type { GameState, Haus } from './types';
import { eur, jahr, kw } from './util';
import { bestandWert, kvLimit, offeneWarenverbindlichkeiten } from './ware';
import { wettbewerbUebersicht, wettbewerbFuerGrafik } from './wettbewerb';
import { planungBericht, planWoche } from './planung';


/** Reine, deterministische Projektion des Spielstands für den zentralen Posteingang. */
export interface PostBezug {
  stadt?: string;
  hausIds?: string[];
  gebaeudeId?: string;
  wettbewerberId?: string;
  modul?: string;
}
export interface PostHandeln {
  id: string;
  art: 'entscheidung' | 'angebot';
  typ: string;
  titel: string;
  text: string;
  woche: number;
  frist: number;
  restWochen: number;
  optionen: { id: string; label: string }[];
  standard: string;
  bezug?: PostBezug;
  wert?: { betrag: number; einheit: string };
  dringend: boolean;
}
export type PostKategorie = 'Presse' | 'Häuser' | 'Finanzen' | 'Personal' | 'Konkurrenz' | 'Eigentümer' | 'IT';
export interface PostMeldung {
  id: string;
  woche: number;
  typ: GameState['meldungen'][number]['typ'];
  text: string;
  kategorie: PostKategorie;
  bezug?: PostBezug;
}
export interface PostErledigt {
  id: string;
  art: 'entscheidung' | 'angebot';
  titel: string;
  woche: number;
  ergebnis: string;
  standard: boolean;
  bezug?: PostBezug;
}
export interface Posteingang {
  handeln: PostHandeln[];
  meldungen: PostMeldung[];
  erledigt: PostErledigt[];
}

function hausBezug(s: GameState, ids: string[] = [], modul?: string): PostBezug | undefined {
  const hs = [...new Set(ids)].map((id) => s.haeuser.find((h) => h.id === id)).filter((h): h is Haus => !!h);
  return hs.length ? { stadt: hs[0].stadt, hausIds: hs.map((h) => h.id), ...(modul ? { modul } : {}) }
    : modul ? { modul } : undefined;
}

function meldungKategorie(typ: PostMeldung['typ'], text: string): PostKategorie {
  if (typ === 'eigentuemer') return 'Eigentümer';
  if (/konkurrenz|wettbewerb|mitbewerber|discounter|konkurrent|abwerb/i.test(text)) return 'Konkurrenz';
  if (/filialleiter|personal|beschäftig|mitarbeiter|betriebsrat|streik|verdi|tarif/i.test(text)) return 'Personal';
  if (/haus|häuser|standort|filiale|miete|vermieter|umbau|schließ|schliess|rolltreppe|brandschutz/i.test(text)) return 'Häuser';
  if (/kredit|liquid|kasse|bank|cash|kosten|zuschuss|insolvenz|euro|€|umsatz|ertrag|kapital/i.test(text) || typ === 'insolvenz') return 'Finanzen';
  return 'Presse';
}

export function posteingang(s: GameState): Posteingang {
  const grenze = s.woche - 12; // aktuelle plus zwölf vorangegangene Wochen
  const handeln: PostHandeln[] = [];
  for (const e of s.entscheidungen) {
    const restWochen = Math.max(0, e.frist - s.woche);
    const option = e.optionen.find((o) => o.id === e.standard);
    const hausId = typeof e.daten.haus === 'string' ? e.daten.haus : undefined;
    const modul = e.typ.startsWith('personal_') ? 'personal' : e.typ.startsWith('planung_') ? 'planung' : e.typ === 'organisation_vorlage' ? 'organisation' : e.typ.startsWith('vorstand_') ? 'vorstand' : e.typ.startsWith('it_') ? 'it' : e.typ === 'jahresgespraech' || e.typ === 'nordline_dtc' ? 'einkauf' : undefined;
    handeln.push({
      id: e.id, art: 'entscheidung', typ: e.typ, titel: e.titel, text: e.text,
      woche: e.woche, frist: e.frist, restWochen, optionen: e.optionen,
      standard: option ? option.label : e.standard,
      bezug: hausBezug(s, hausId ? [hausId] : [], modul),
      wert: typeof e.daten.kosten === 'number' ? { betrag: e.daten.kosten, einheit: 'einmalig' } : undefined,
      dringend: restWochen <= 1,
    });
  }
  for (const a of s.angebote.filter((a) => a.status === 'offen')) {
    const restWochen = Math.max(0, a.frist - s.woche);
    const ids = a.vorschlagHaeuser?.length ? a.vorschlagHaeuser : a.wunschHaeuser ?? [];
    const wert = a.einmalzahlung !== undefined ? { betrag: a.einmalzahlung, einheit: 'Ablöse, einmalig' }
      : a.kaufpreis !== undefined ? { betrag: a.kaufpreis, einheit: 'Kaufpreis, einmalig' }
      : a.wert !== undefined ? { betrag: a.wert, einheit: 'Warenwert, einmalig' }
      : a.mieteQmMonat !== undefined && a.qmJeHaus !== undefined
        ? { betrag: Math.round(a.mieteQmMonat * a.qmJeHaus * 12 * ids.length), einheit: 'Miete pro Jahr' } : undefined;
    handeln.push({
      id: a.id, art: 'angebot', typ: a.typ, titel: a.titel, text: a.text, woche: a.woche, frist: a.frist, restWochen,
      optionen: [{ id: 'annehmen', label: 'Annehmen' }, { id: 'ablehnen', label: 'Ablehnen' },
        ...(a.typ === 'paket' ? [{ id: 'verhandeln', label: 'Verhandeln' }] : [])],
      standard: 'Angebot verfällt',
      bezug: hausBezug(s, ids, a.typ === 'sonderposten' ? 'einkauf' : undefined), wert, dringend: restWochen <= 1,
    });
  }
  handeln.sort((a, b) => a.frist - b.frist || a.woche - b.woche || a.id.localeCompare(b.id));
  const meldungen = s.meldungen.map((m, i) => ({ m, i })).filter(({ m }) => m.woche >= grenze).reverse().map(({ m, i }) => {
    const ids = m.bezug?.hausId ? [m.bezug.hausId] : [];
    const gefunden = ids.length ? ids : s.haeuser.filter((h) => m.text.includes(h.name)).map((h) => h.id).slice(0, 8);
    const bezug = hausBezug(s, gefunden, m.bezug?.modul);
    const konkurrenz = s.wettbewerber.find((w) => m.text.includes(w.name));
    return {
      id: m.id ?? `alt-${m.woche}-${i}`, woche: m.woche, typ: m.typ, text: m.text,
      kategorie: konkurrenz ? 'Konkurrenz' : m.bezug?.modul === 'it' ? 'IT' : meldungKategorie(m.typ, m.text),
      bezug: { ...bezug, ...(m.bezug?.stadt ? { stadt: m.bezug.stadt } : {}), ...(konkurrenz ? { stadt: konkurrenz.stadt, wettbewerberId: konkurrenz.id } : {}) },
    };
  });
  const erledigt: PostErledigt[] = [
    ...s.angebote.filter((a) => a.status !== 'offen' && (a.erledigtWoche ?? a.woche) >= grenze).map((a) => ({
      id: a.id, art: 'angebot' as const, titel: a.titel, woche: a.erledigtWoche ?? a.woche,
      ergebnis: a.status === 'angenommen' ? 'Angenommen' : a.status === 'abgelehnt' ? 'Abgelehnt' : 'Frist abgelaufen',
      standard: a.status === 'verfallen', bezug: hausBezug(s, a.wunschHaeuser ?? []),
    })),
    ...(s.entscheidungsprotokoll ?? []).filter((p) => p.woche >= grenze).map((p) => ({
      id: p.id, art: 'entscheidung' as const, titel: p.titel, woche: p.woche,
      ergebnis: p.ergebnis, standard: p.standard, bezug: hausBezug(s, p.hausId ? [p.hausId] : []),
    })),
  ].sort((a, b) => b.woche - a.woche || a.id.localeCompare(b.id));
  return { handeln, meldungen, erledigt };
}

/** Letzter tatsächlich verbuchter Wochenkapitalfluss, auch für ältere Spielstände lesbar. */
export function kapitalfluss(s: GameState) {
  const k = s.historie[s.historie.length - 1];
  if (!k) return { woche: s.woche - 1, operativ: 0, investitionen: 0, finanzierung: 0, sonstiges: 0, netto: 0, bestand: s.cash };
  if (k.kapitalfluss) return k.kapitalfluss;
  // Alte Spielstände haben keinen Zahlungsarten-Nachweis. Nichts als operativ ausweisen, was nicht belegt ist.
  const vorher = s.historie[s.historie.length - 2]?.cash ?? k.cash;
  return { woche: k.woche, operativ: 0, investitionen: 0, finanzierung: 0,
    sonstiges: k.cash - vorher, netto: k.cash - vorher, bestand: k.cash };
}

export interface Cockpit {
  kw: number;
  jahr: number;
  phase: GameState['phase'];
  cash: number;
  kreditFrei: number;
  runwayWochen: number;
  ebitdaWoche: number;
  ebitda13: number;
  umsatzWoche: number;
  vertrauen: number; // Mittel aus Bank, Kreditversicherer, Lieferanten
  image: number;
  offeneEntscheidungen: number;
  offeneAngebote: number;
}

export function cockpit(s: GameState): Cockpit {
  const letzte = s.historie[s.historie.length - 1];
  const h13 = s.historie.slice(-13);
  const lief = s.lieferanten.filter((l) => l.aktiv);
  const lv = (lief.reduce((a, l) => a + l.vertrauen, 0) + s.restLieferantenVertrauen) / (lief.length + 1);
  return {
    kw: kw(s.woche),
    jahr: jahr(s),
    phase: s.phase,
    cash: s.cash,
    kreditFrei: s.cash + s.kreditlinie,
    runwayWochen: Math.round(runwayWochen(s)),
    ebitdaWoche: letzte?.ebitda ?? 0,
    ebitda13: h13.reduce((a, b) => a + b.ebitda, 0),
    umsatzWoche: letzte?.umsatz ?? 0,
    vertrauen: Math.round((s.stakeholder.bank + s.stakeholder.kreditversicherer + lv) / 3),
    image: Math.round(s.stakeholder.image),
    offeneEntscheidungen: s.entscheidungen.length,
    offeneAngebote: s.angebote.filter((a) => a.status === 'offen').length,
  };
}

export interface PortfolioZeile {
  id: string;
  name: string;
  format: Haus['format'];
  region: Haus['region'];
  cluster: Haus['cluster'];
  lage: Haus['lage'];
  status: Haus['status'];
  qm: number;
  umsatz: number;
  db: number;
  mietquote: number;
  personalquote: number;
  flaechenproduktivitaet: number; // €/qm/Woche
}

/** Hauskennzahlen, wie das Controlling sie liefert: je schwächer die Besetzung, desto mehr Rauschen. */
export function portfolio(s: GameState): PortfolioZeile[] {
  const rausch = [0.12, 0.04, 0][s.controllingStufe];
  return s.haeuser
    .filter((h) => h.status !== 'verkauft')
    .map((h) => {
      const k = h.kpi;
      const qm = h.flaechen.reduce((a, f) => a + f.qm, 0);
      // deterministisches Rauschen je Haus und Woche
      const seed = (h.id.charCodeAt(1) * 31 + h.id.charCodeAt(3) * 17 + s.woche * 7) % 100;
      const f = 1 + rausch * ((seed / 100) * 2 - 1);
      const umsatz = k?.umsatz ?? 0;
      const db = k ? k.db + Math.abs(umsatz) * (f - 1) * 0.5 : 0;
      return {
        id: h.id, name: h.name, format: h.format, region: h.region, cluster: h.cluster, lage: h.lage, status: h.status, qm,
        umsatz: eur(umsatz), db: eur(db),
        mietquote: umsatz > 0 ? (k?.miete ?? 0) / umsatz : 0,
        personalquote: umsatz > 0 ? (k?.personal ?? 0) / umsatz : 0,
        flaechenproduktivitaet: qm > 0 ? umsatz / qm : 0,
      };
    });
}

export function hausDetail(s: GameState, id: string) {
  const h = s.haeuser.find((x) => x.id === id);
  if (!h) return undefined;
  const etagen = h.etagen.map((e) => ({
    etage: e,
    flaechen: h.flaechen.filter((f) => f.etage === e).map((f) => ({
      id: f.id, qm: f.qm, konzept: f.konzept, gruppe: f.gruppe ? GRUPPEN[f.gruppe].name : undefined,
      mieter: f.mieter?.name, umbauBis: f.umbauBis,
      umsatzQm: f.gruppe && h.kpi?.umsatzJeGruppe[f.gruppe] ? (h.kpi.umsatzJeGruppe[f.gruppe] ?? 0) / Math.max(1, h.flaechen.filter((x) => x.gruppe === f.gruppe).reduce((a, b) => a + b.qm, 0)) : 0,
    })),
  }));
  return { haus: h, etagen, waren: warenHaus(s, h), wettbewerber: wettbewerbUebersicht(s, h.stadt) };
}

export function warenwirtschaft(s: GameState) {
  return Object.keys(s.basisUmsatz).map((g) => ({
    gruppe: g,
    name: GRUPPEN[g as keyof typeof GRUPPEN].name,
    bestand: eur(bestandWert(s, g as keyof typeof GRUPPEN)),
    orderLevel: s.orderLevel[g as keyof typeof GRUPPEN] ?? 1,
  })).concat([]).map((x) => x);
}

export function kreditversicherung(s: GameState) {
  return { limit: eur(kvLimit(s)), genutzt: eur(offeneWarenverbindlichkeiten(s)) };
}

/** Hauptverwaltung: Gebäude, Etagen mit Belegung und Auslastung, Abteilungen mit Stufe, FTE, Kosten und Wirkung, offene Angebote. */
export { hqUebersicht, hqFuerGrafik } from './hq';

/** Einkauf: Übersicht nach Bereich und WG, WG-Detail, Freigabe-Eingang. */
export { einkaufUebersicht, wgDetail, freigaben } from './einkauf';
// O05 Ware
export { warenUebersicht, warenHaus, fundusFrequenzFaktor } from './merchandise';
/** Eigenmarken: Markenkarten, Shop-Anteile je Bereich, Vorschau für den Gründungsassistenten. */
export { eigenmarkenUebersicht, eigenmarkeVorschau } from './eigenmarken';
/** Vorstand: Ressortkarten, Profil, Kandidatenkarussell. */
export { vorstandUebersicht, vorstandProfil, kandidaten, angebotsChance } from './vorstand';
/** Produktentwicklung: Produktkarten je Marke, Katalog, Trendbericht, Vorschau für den Assistenten. */
export { produkte, produktKatalog, trendbericht, produktVorschau } from './produkte';
/** Marketing: Übersicht, Kanäle, Hartwig Karte und App, CRM-Kampagnen, Aktionskalender, Aktionsauswertung. */
export { marketingUebersicht, kanaele, kundenkarte, crmKampagnen, aktionskalender, aktionsAuswertung } from './marketing';

/** Wettbewerbsübersicht und Übergabeobjekte für das spätere Stadtbild. */
export { wettbewerbUebersicht, wettbewerbFuerGrafik } from './wettbewerb';

// O03 IT: Datenmodell und Systemlandkarte liegen ausschließlich in der Engine.
export { itUebersicht, itDeckelGrund } from './it';

/** Kronjuwelen mit Marktwert, Image und operativer Performance. */
export { premiumUebersicht } from './premium';

// N01: Verlauf je Ebene, Vorjahr und Eigentümer-Quartalsplan.
export { verlauf, type StatistikFilter, type StatistikReihe, type StatistikPunkt } from './statistik';

// O02 Umsatztreiber: ausschließlich lesende Projektionen, keine Berechnung in der UI.
export { hausTreiber, umsatzbruecke, ranking, reporting, setzeTreiber, treiberFaktor } from './treiber';
// O06 Planung: Anzeigeabfragen ausschließlich aus der Engine.
export { planungBericht, planWoche };
// O07 Haus: Betriebssteckbrief, Mystery-Shopping-Rangliste, Beobachtung und Wochenkommentare.
export { hausUebersicht, hausBeobachtung, hausKommentareDerWoche, hausKundenRanking, hausKandidaten, hausKundenscore } from './haus';
// O08 Umbau
export { umbauUebersicht, umbauHaus, umbauSchaetzung, UMBAU_STUFEN } from './umbau';
// O04 Personal: Anzeigeprojektionen, keine Personalberechnung in der Oberfläche.
export { personalHaus, personalUebersicht } from './personaleinsatz';
