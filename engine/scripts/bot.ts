import { neuesSpiel, wocheAbspielen, fuehreAus, portfolio, hqUebersicht, ABTEILUNGEN, WG_DEF } from '../src';
import { standort } from '../src/hq';
import type { AbteilungId, Stufe } from '../src';
import type { GameState } from '../src';
import { mio } from '../src/util';
import { FILIAL_PROGRAMME, type FilialProgrammId } from '../src/filialguv';
import { schliessungsFolgekosten } from '../src/prozesse';
import { freieLiquiditaet, runwayWochen } from '../src/stakeholder';

/** Standard-Einkauf: alle offenen Orders der Woche freigeben (wie bisher ohne Freigabe-Eingang). */
export function einkaufStandard(s: GameState): void {
  if (!s.einkauf.freigaben.length) return;
  // Vororders um den Umsatzanteil der Häuser kürzen, die gerade geschlossen werden
  let offen = 0; let weg = 0;
  for (const h of s.haeuser) { const u = h.kpi?.umsatz ?? 0; if (h.status === 'offen') offen += u; else if (h.status === 'schliessung_verhandlung' || h.status === 'raeumung') weg += u; }
  const k = offen + weg > 0 ? weg / (offen + weg) : 0;
  if (k > 0.02) for (const f of s.einkauf.freigaben.filter((x) => x.typ === 'vororder')) fuehreAus(s, { typ: 'freigabeKuerzen', id: f.id, prozent: k });
  fuehreAus(s, { typ: 'sammelfreigabe' });
}

/** Die beiden noch nicht simulierten Formate dürfen niemals im Sanierungsbot geschlossen werden. */
function aktivesPortfolio(s: GameState) {
  const ids = new Set(s.haeuser.filter((h) => !h.nurDaten).map((h) => h.id));
  return portfolio(s).filter((x) => x.status === 'offen' && ids.has(x.id));
}

/** Schließungen als Quote des zu sanierenden Portfolios statt fixe Hauszahl. */
export const TIEF_SCHLIESSUNGSQUOTE = 50 / 180;
/** Ursprünglich 35 von 180 Häusern: Turnaround muss denselben Portfolioanteil bearbeiten. */
export const REGULAER_SCHLIESSUNGSQUOTE = 35 / 180;

export function botWoche(s: GameState, log = false): void {
  const w = s.woche;
  const tu = (a: Parameters<typeof fuehreAus>[1]) => { const r = fuehreAus(s, a); if (log) console.log(`  W${w} ${r.ok ? '✓' : '✗'} ${r.text}`); return r; };
  if (w === 0) {
    tu({ typ: 'berater', beraterTyp: 'sanierung' });
    tu({ typ: 'zentrale', prozent: 0.2 });
    tu({ typ: 'orderLevel', gruppe: 'alle', level: 0.9 });
    tu({ typ: 'marketingBudget', quote: 0.02 });
  }
  if (w === 4) {
    const p = aktivesPortfolio(s).sort((a, b) => a.db - b.db);
    for (const x of p.slice(0, 28)) tu({ typ: 'schliessen', haus: x.id });
    for (const x of p.filter((x) => x.mietquote > 0.14)) tu({ typ: 'mieteVerhandeln', haus: x.id, reduktion: 0.15 });
  }
  if (w === 5) tu({ typ: 'tarif', ziel: 'sanierung', garantieWochen: 52 });
  if (w % 52 === 44) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.2 });
  if (w % 52 === 2) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.1 });
  if (w % 13 === 0) { const q = s.quartale[s.quartale.length - 1]; if (q) tu({ typ: 'plan', ebitda: q.planStandard }); }
  for (const a of s.angebote.filter((x) => x.status === 'offen')) {
    if (a.typ === 'untermiete' || a.typ === 'paket' || a.typ === 'stadt') tu({ typ: 'angebotAnnehmen', angebot: a.id });
  }
  einkaufStandard(s);
}


/** Bot B: Schutzschirm früh, dann Restrukturierung im Verfahren. */
export function botSchutzschirm(s: GameState, log = false): void {
  const w = s.woche;
  const tu = (a: Parameters<typeof fuehreAus>[1]) => { const r = fuehreAus(s, a); if (log) console.log(`  W${w} ${r.ok ? '✓' : '✗'} ${r.text}`); return r; };
  if (w === 3) {
    tu({ typ: 'orderLevel', gruppe: 'alle', level: 0.9 });
    tu({ typ: 'marketingBudget', quote: 0.02 });
    tu({ typ: 'insolvenzAntrag' });
    tu({ typ: 'zentrale', prozent: 0.25 });
    const p = aktivesPortfolio(s).sort((a, b) => a.db - b.db);
    for (const x of p.slice(0, 30)) tu({ typ: 'schliessen', haus: x.id });
    for (const x of p.slice(30).filter((x) => x.mietquote > 0.13)) tu({ typ: 'mieteVerhandeln', haus: x.id, reduktion: 0.2 });
    tu({ typ: 'insolvenzplanQuote', quote: 0.12 });
  }
  if (w === 12) tu({ typ: 'tarif', ziel: 'sanierung', garantieWochen: 52 });
  if (w % 52 === 44) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.2 });
  if (w % 52 === 2) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.1 });
  if (w % 13 === 0) { const q = s.quartale[s.quartale.length - 1]; if (q) tu({ typ: 'plan', ebitda: q.planStandard }); }
  for (const a of s.angebote.filter((x) => x.status === 'offen')) {
    if (a.typ === 'untermiete' || a.typ === 'paket' || a.typ === 'stadt') tu({ typ: 'angebotAnnehmen', angebot: a.id });
  }
  einkaufStandard(s);
}

/** Bot C: Sanierung zuerst; Schutzschirm erst, wenn die operative Rettung
 * trotz ausgeschöpfter Maßnahmen an der Liquidität zu scheitern droht.
 * Ein Insolvenzantrag in KW 4 bei ausreichender Zahlungsfähigkeit war
 * gerade KEINE "letzte Option", sondern führte zur Ablehnung in KW 24.
 */
export function botTief(s: GameState, log = false): void {
  botTurnaround(s, log);
  const umsatzWoche = s.historie.at(-1)?.umsatz
    ?? Object.values(s.basisUmsatz).reduce((sum, u) => sum + (u ?? 0), 0);
  const ueberfaellig = s.verbindlichkeiten.some((v) => v.ueberfaelligSeit !== undefined);
  const notlage = s.woche >= 3 && s.phase === 'regulaer'
    && s.insolvenzenGesamt === 0
    && runwayWochen(s) < 8
    && (freieLiquiditaet(s) < 2 * umsatzWoche || ueberfaellig);
  if (notlage) {
    // Nur im Liquiditätsnotfall; derselbe echte Schutzschirm mit Planquote,
    // Sozialplan, Lieferantenrisiko und Gläubigerversammlung bleibt erhalten.
    botTiefBasis(s, log, true, einkaufStandard, s.woche);
  } else if (s.phase === 'insolvenz') {
    botTiefBasis(s, log, true, einkaufStandard, -1);
  }
}

export function botTiefBasis(s: GameState, log: boolean, zentralePauschal: boolean,
  einkauf: (s: GameState) => void = einkaufStandard, antragWoche = 3): void {
  const w = s.woche;
  const tu = (a: Parameters<typeof fuehreAus>[1]) => { const r = fuehreAus(s, a); if (log) console.log(`  W${w} ${r.ok ? '✓' : '✗'} ${r.text}`); return r; };
  if (w === antragWoche) {
    tu({ typ: 'orderLevel', gruppe: 'alle', level: 0.88 });
    tu({ typ: 'marketingBudget', quote: 0.018 });
    tu({ typ: 'insolvenzAntrag' });
    if (zentralePauschal) tu({ typ: 'zentrale', prozent: 0.3 });
    // Premium-Kronjuwelen bleiben von der automatischen Schließung ausgenommen.
    const premiumIds = new Set(s.haeuser.filter((h) => h.klasse === 'premium').map((h) => h.id));
    const p = aktivesPortfolio(s).filter((x) => !premiumIds.has(x.id)).sort((a, b) => a.db / Math.max(1, a.umsatz) - b.db / Math.max(1, b.umsatz));
    const schliessungen = Math.round(p.length * TIEF_SCHLIESSUNGSQUOTE);
    for (const x of p.slice(0, schliessungen)) tu({ typ: 'schliessen', haus: x.id });
    for (const x of p.slice(schliessungen).filter((x) => x.mietquote > 0.12)) tu({ typ: 'mieteVerhandeln', haus: x.id, reduktion: 0.2 });
    for (const h of s.haeuser.filter((x) => x.status === 'offen' && x.kpi)) {
      const ist = h.kpi!.fteIst, bedarf = h.kpi!.fteBedarf;
      if (ist > bedarf * 1.02) tu({ typ: 'personalabbau', haeuser: [h.id], prozent: Math.min(0.2, (ist - bedarf) / ist) });
    }
    tu({ typ: 'tarif', ziel: 'sanierung', garantieWochen: 78 });
    tu({ typ: 'insolvenzplanQuote', quote: 0.1 });
  }
  if (w === 16 && s.tarif !== 'sanierung') tu({ typ: 'tarif', ziel: 'sanierung', garantieWochen: 78 });
  if (w % 52 === 44) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.2 });
  if (w % 52 === 2) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.1 });
  if (w % 13 === 0) { const q = s.quartale[s.quartale.length - 1]; if (q) tu({ typ: 'plan', ebitda: q.planStandard }); }
  for (const a of s.angebote.filter((x) => x.status === 'offen')) {
    if (a.typ === 'untermiete' || a.typ === 'paket' || a.typ === 'stadt') tu({ typ: 'angebotAnnehmen', angebot: a.id });
  }
  einkauf(s);
}

/** Bot T: Turnaround ausschließlich mit operativen Hebeln, ohne Schließung und Insolvenz. */
export function botTurnaround(s: GameState, log = false): void {
  const w = s.woche;
  const tu = (a: Parameters<typeof fuehreAus>[1]) => {
    const r = fuehreAus(s, a);
    if (log) console.log(`  W${w} ${r.ok ? '✓' : '✗'} ${r.text}`);
    return r;
  };
  if (w === 0) {
    tu({ typ: 'berater', beraterTyp: 'sanierung' });
    // Reale HQ-FTE werden gegen Abfindung reduziert, keine Gutschrift.
    tu({ typ: 'zentrale', prozent: 0.12 });
    tu({ typ: 'marketingBudget', quote: 0.018 });
    for (const programm of Object.keys(FILIAL_PROGRAMME) as FilialProgrammId[]) {
      tu({ typ: 'filialProgramm', programm });
    }
    tu({ typ: 'wgServicegrad', wg: 'alle', ziel: 0.98 });
    tu({ typ: 'wgLimit', wg: 'alle', faktor: 1.00 });
  }
  if (w === 8) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.10 });
  if (w % 13 === 0) {
    const q = s.quartale.at(-1);
    if (q) tu({ typ: 'plan', ebitda: q.planStandard });
  }
  // Echte Drittumsätze durch bestehende Mietangebote, keine Buchung ohne Vertrag.
  for (const a of s.angebote.filter((x) => x.status === 'offen')) {
    if (a.typ === 'untermiete' || a.typ === 'paket') tu({ typ: 'angebotAnnehmen', angebot: a.id });
  }
  einkaufStandard(s);
}

/** Liquiditätsgestaffelte Schließungsstrategie: keine gebündelten Sozialpläne
 * ohne Deckung für Abfindungen und (absehbare) Restmieten.
 * Die Prüfung ist eine Managementregel des Bots, keine Insolvenz-Sperre.
 */
export function schliessungsBudgetBotD(s: GameState): {
  freieMittel: number; reserve: number; bereitsGebunden: number; budget: number;
} {
  const freieMittel = freieLiquiditaet(s);
  const wochenUmsatz = s.historie.at(-1)?.umsatz
    ?? Object.values(s.basisUmsatz).reduce((sum, u) => sum + (u ?? 0), 0);
  const faellig = s.verbindlichkeiten.filter((v) => v.faellig <= s.woche + 4)
    .reduce((sum, v) => sum + v.wert, 0);
  // Die nächsten Wochen müssen unabhängig vom Sozialplan finanzierbar bleiben.
  // Der Zufluss aus künftigen Umsätzen wird vorsichtig NICHT vorweggenommen.
  const reserve = Math.max(2 * wochenUmsatz, 0.35 * faellig);
  const bereitsGebunden = s.haeuser.filter((h) =>
    h.status === 'schliessung_verhandlung' || h.status === 'raeumung')
    .reduce((sum, h) => {
      const bis = Math.max(0, (h.statusBis ?? s.woche) - s.woche)
        + (h.status === 'schliessung_verhandlung' ? 6 : 0);
      return sum + schliessungsFolgekosten(s, h, bis).gesamt;
    }, 0);
  const budget = Math.max(0, (freieMittel - reserve) * 0.35 - bereitsGebunden);
  return { freieMittel, reserve, bereitsGebunden, budget };
}

/** Bot D: außergerichtlich, aber konsequent. */
export function botRegulaer(s: GameState, log = false): void {
  botRegulaerBasis(s, log, 0.25);
}

/** Bot D mit wählbarer Pauschalkürzung der Zentrale (0 = keine). */
export function botRegulaerBasis(s: GameState, log: boolean, zentralePauschal: number): void {
  botTurnaround(s, log);
  const w = s.woche;
  const tu = (a: Parameters<typeof fuehreAus>[1]) => { const r = fuehreAus(s, a); if (log) console.log(`  W${w} ${r.ok ? '✓' : '✗'} ${r.text}`); return r; };
  if (w === 0) {
    tu({ typ: 'berater', beraterTyp: 'sanierung' });
    // Zusätzlicher HQ-Abbau nur, wenn die Barliquidität samt Linie
    // mindestens fünf Wochenumsätze deckt; Bot T hat bereits 12 % reduziert.
    const wochenUmsatz = Object.values(s.basisUmsatz).reduce((sum, u) => sum + (u ?? 0), 0);
    if (zentralePauschal > 0 && freieLiquiditaet(s) >= 5 * wochenUmsatz)
      tu({ typ: 'zentrale', prozent: zentralePauschal });
    // Die Warensteuerung von Bot T bleibt erhalten: pauschale Kürzungen
    // von 15 % erzeugten Fehlmengen und machten die Schließungen unprofitabel.
    tu({ typ: 'marketingBudget', quote: 0.018 });
  }
  if (w >= 4 && w < 104 && w % 4 === 0) {
    // Maximal der ursprüngliche Portfolioanteil, aber verteilt über Zeit.
    // Geschlossen wird nur bei negativem FILIAL-EBITDA: auch ein schwacher
    // Standort mit positivem operativem Beitrag darf nicht Umsatz vernichten.
    const pool = s.haeuser.filter((h) => !h.nurDaten && h.klasse !== 'premium');
    const ziel = Math.round(pool.length * REGULAER_SCHLIESSUNGSQUOTE);
    const inArbeit = pool.filter((h) => h.status !== 'offen').length;
    const verlustIds = new Set(pool.filter((h) => (h.kpi?.guv?.ebitda ?? 0) < 0).map((h) => h.id));
    const p = aktivesPortfolio(s)
      .filter((x) => verlustIds.has(x.id) && x.db < 0 && x.umsatz > 0)
      .sort((a, b) => a.db / a.umsatz - b.db / b.umsatz);
    let budget = schliessungsBudgetBotD(s).budget;
    let beauftragt = 0;
    for (const x of p) {
      if (inArbeit + beauftragt >= ziel || beauftragt >= 6) break;
      const h = s.haeuser.find((h) => h.id === x.id)!;
      const dauer = Math.round(16 - (10 * s.stakeholder.betriebsrat) / 100) + 6;
      const kosten = schliessungsFolgekosten(s, h, dauer).gesamt;
      if (kosten > budget) continue;
      if (tu({ typ: 'schliessen', haus: x.id }).ok) {
        budget -= kosten;
        beauftragt++;
      }
    }
    if (w === 4) {
      for (const x of aktivesPortfolio(s).filter((x) => x.mietquote > 0.12))
        tu({ typ: 'mieteVerhandeln', haus: x.id, reduktion: 0.15 });
      // Zusätzliche Abfindungen für Filialpersonal erst bei gesicherter
      // Liquidität; Bot T erreicht die Personaleinsparung bereits über O04.
    }
  }
  if (w === 4) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.16 });
  if (w % 52 === 44) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.22 });
  if (w % 52 === 2 && w > 4) tu({ typ: 'aushilfen', haeuser: 'alle', quote: 0.16 });
  if (w % 13 === 0) { const q = s.quartale[s.quartale.length - 1]; if (q) tu({ typ: 'plan', ebitda: q.planStandard }); }
  for (const a of s.angebote.filter((x) => x.status === 'offen')) {
    if (a.typ === 'untermiete' || a.typ === 'paket' || a.typ === 'stadt') tu({ typ: 'angebotAnnehmen', angebot: a.id });
  }
  einkaufStandard(s);
}

/** Zielstufen der HQ-Strategien. */
type Ziele = Record<AbteilungId, Stufe>;
const ALLE = (st: Stufe): Ziele => Object.fromEntries(ABTEILUNGEN.map((id) => [id, st])) as Ziele;
export const HQ_GUT: Ziele = { ...ALLE(1), controlling: 2, ecommerce: 2 };
export const HQ_AUSBAU: Ziele = { ...HQ_GUT, einkauf: 3, immobilien: 3 };
export const HQ_KAHLSCHLAG: Ziele = { ...ALLE(0), verwaltung: 1 };

/** Grobe Bewertung eines Wirkungsverlusts durch den Standort in € je Woche und Punkt Wirkungsfaktor. */
const WERT_WIRKUNG = 1_000_000;

/** Wochenkosten der Zentrale in einer Stadt mit gegebener Fläche (Raum, Reise, Lohnniveau, bewerteter Wirkungsverlust). */
function standortKosten(s: GameState, stadt: string, raumWoche: number): number {
  const u = hqUebersicht(s);
  const st = standort(s, stadt);
  const lohn = u.kosten.personal * st.lohnFaktor / Math.max(0.01, standort(s, u.sitz).lohnFaktor);
  return raumWoche + u.fte * st.reiseJeFte + lohn + (1 - st.wirkungsFaktor) * WERT_WIRKUNG;
}

/** Sucht das Bürogebäude mit den niedrigsten Gesamtkosten, in das die ganze Zentrale passt. */
function bestesBuero(s: GameState): { id: string; etagen: number[] } | undefined {
  const u = hqUebersicht(s);
  const bedarf = u.abteilungen.reduce((a, x) => a + x.qmBedarf, 0) * 1.08;
  const jetzt = standortKosten(s, u.sitz, u.gebaeude.reduce((a, g) => a + g.kostenWoche, 0));
  let best: { id: string; etagen: number[]; kosten: number } | undefined;
  for (const an of u.angebote) {
    const etagen: number[] = [];
    let qm = 0;
    let raum = 0;
    for (const e of an.etagen) { if (qm >= bedarf) break; etagen.push(e.nr); qm += e.qm; raum += e.kostenWoche; }
    if (qm < bedarf) continue;
    const k = standortKosten(s, an.stadt, raum);
    if (!best || k < best.kosten) best = { id: an.id, etagen, kosten: k };
  }
  // Umzug nur, wenn er sich klar lohnt (Herrichtung, Umzug und Restmiete wollen verdient sein)
  return best && best.kosten < jetzt - 25_000 ? best : undefined;
}

function zieheUm(s: GameState, tu: (a: Parameters<typeof fuehreAus>[1]) => { ok: boolean }, gid: string): void {
  const reihe = [...s.hq.abteilungen].sort((a, c) => c.fte - a.fte);
  for (const a of reihe) {
    const u = hqUebersicht(s).gebaeude.find((x) => x.id === gid)!;
    const frei = u.etagen.find((e) => e.gemietet && e.qm - e.belegtQm >= 100);
    if (frei) tu({ typ: 'abteilungSetzen', abteilung: a.id, gebaeude: gid, etage: frei.nr });
  }
}

/** HQ-Teil einer Strategie: Stufen setzen, Leerstand abbauen, bei Gelegenheit umziehen. */
export function hqStrategie(s: GameState, ziele: Ziele, log = false): void {
  const w = s.woche;
  const tu = (a: Parameters<typeof fuehreAus>[1]) => { const r = fuehreAus(s, a); if (log) console.log(`  W${w} ${r.ok ? '✓' : '✗'} ${r.text}`); return r; };
  // Im Schutzschirm sind Abfindungen günstig: Überbesetzung sofort abbauen, Ausbau nach den Schließungen
  if (w === 5) for (const id of ABTEILUNGEN) tu({ typ: 'abteilungStufe', abteilung: id, stufe: Math.min(1, ziele[id]) as Stufe });
  if (w === 18 || (w > 52 && w % 52 === 30)) for (const id of ABTEILUNGEN) tu({ typ: 'abteilungStufe', abteilung: id, stufe: ziele[id] });
  if (w >= 13 && w % 13 === 0) {
    // Umzug in ein passendes Gebäude, wenn es sich lohnt
    const b = bestesBuero(s);
    const alt = s.hq.gebaeude.map((g) => g.id);
    if (b && tu({ typ: 'hqMieten', angebot: b.id, etagen: b.etagen }).ok) {
      const gid = s.hq.gebaeude[s.hq.gebaeude.length - 1].id;
      zieheUm(s, tu, gid);
      for (const id of alt) if (!s.hq.abteilungen.some((a) => a.gebaeudeId === id)) tu({ typ: 'hqGebaeudeKuendigen', gebaeude: id });
    }
  }
  // Leerstand abbauen: leere Etagen kündigen (bis auf eine Reserve je Gebäude)
  if (w === 19 || (w > 19 && w % 13 === 6)) {
    for (const g of [...s.hq.gebaeude]) {
      const leer = g.etagen.filter((e) => e.gemietet && e.abteilungen.length === 0).sort((a, b) => b.nr - a.nr);
      for (const e of leer.slice(0, Math.max(0, leer.length - 1))) tu({ typ: 'hqEtageKuendigen', gebaeude: g.id, etage: e.nr });
    }
  }
}

/** Bot C ohne Pauschalkürzung plus gute HQ-Strategie: Abbau auf Soll (vor allem Verwaltung und VM), Controlling ausbauen, Leerstand abbauen, Umzug bei Gelegenheit. */
export function botHq(s: GameState, log = false): void {
  botTiefBasis(s, log, false);
  hqStrategie(s, HQ_GUT, log);
}

/** Bot C ohne Pauschalkürzung, Zentrale bleibt unverändert. */
export function botHqKeine(s: GameState, log = false): void {
  botTiefBasis(s, log, false);
}

/** Kahlschlag: alle Abteilungen auf Stufe 0, nur die Verwaltung bleibt auf Pflichtniveau. */
export function botHqKahlschlag(s: GameState, log = false): void {
  botTiefBasis(s, log, false);
  hqStrategie(s, HQ_KAHLSCHLAG, log);
}

/** Gute Strategie plus Ausbau Einkauf und Immobilien auf Stufe 3. */
export function botHqAusbau(s: GameState, log = false): void {
  botTiefBasis(s, log, false);
  hqStrategie(s, HQ_AUSBAU, log);
}

// ---------------------------------------------------------------------------------------------
// Einkaufsstrategien (alle auf Basis Bot C: Schutzschirm, tiefe Sanierung)
// ---------------------------------------------------------------------------------------------

const BEKLEIDUNG = ['damen', 'herren', 'kinder', 'accessoires', 'waesche', 'sporttextil', 'outdoor'] as const;

/** NOS-Pflege und Limitdisziplin: Servicegrad 98 % in NOS-starken WG, Open to Buy 92 % vom Plan (bremst den Planoptimismus der Saisonware), frühe Reduzierung in Mode. */
export function botEinkaufNos(s: GameState, log = false): void {
  if (s.woche === 3) {
    for (const d of WG_DEF) fuehreAus(s, { typ: 'wgServicegrad', wg: d.id, ziel: d.nosAnteil >= 0.5 ? 0.98 : 0.95 });
    fuehreAus(s, { typ: 'wgLimit', wg: 'alle', faktor: 0.92 });
    for (const g of BEKLEIDUNG) fuehreAus(s, { typ: 'wgReduzierung', wg: g, strategie: 'frueh' });
  }
  botTiefBasis(s, log, true);
}

/** Eigenmarken-Offensive: gewachsene Marken pflegen und neu positionieren, Young-Adults-Marke gründen, Einkauf auf Stufe 2. */
export function botEinkaufEigenmarken(s: GameState, log = false): void {
  const w = s.woche;
  const tu = (a: Parameters<typeof fuehreAus>[1]) => { const r = fuehreAus(s, a); if (log) console.log(`  W${w} ${r.ok ? '✓' : '✗'} ${r.text}`); return r; };
  if (w === 4) {
    tu({ typ: 'eigenmarkeNeupositionieren', marke: 'em1', neu: { stil: 'modern', qualitaet: 3 } });
    tu({ typ: 'eigenmarkeNeupositionieren', marke: 'em4', neu: { stil: 'modern' } });
    for (const m of ['em1', 'em2', 'em3', 'em4']) tu({ typ: 'eigenmarkeSetzen', marke: m, budgetWoche: 35_000 });
  }
  if (w === 6) {
    tu({ typ: 'eigenmarkeGruenden', entwurf: { name: 'Vida', zielgruppe: { alter: '18-29', geschlecht: 'unisex' }, kategorie: 'Bekleidung', preislage: 'einstieg', stil: 'trendig', qualitaet: 2, beschaffung: 'nahost', budgetWoche: 45_000, wgAnteile: { 'damen.young': 0.4, 'damen.denim': 0.3, 'herren.casual': 0.25, 'sporttextil.freizeit': 0.3 } } });
  }
  if (w === 20) {
    tu({ typ: 'abteilungStufe', abteilung: 'einkauf', stufe: 2 });
    for (const [wg, a] of [['herren.casual', 0.3], ['herren.hemden', 0.55], ['damen.blusen', 0.5], ['wohnen.tisch', 0.35]] as [string, number][]) {
      const m = wg.startsWith('herren') ? 'em2' : wg.startsWith('damen') ? 'em1' : 'em3';
      const andere = s.eigenmarken.marken.filter((x) => x.id !== m && x.status !== 'eingestellt').reduce((x, y) => x + (y.wgAnteile[wg] ?? 0), 0);
      tu({ typ: 'eigenmarkeAnteil', marke: m, wg, anteil: Math.min(a, 0.7 - andere) });
    }
  }
  botTiefBasis(s, log, true);
}

/**
 * Kahlschlag Limit: Open to Buy 80 % vom Plan, Servicegrad 90 %, kleine Vororder. Spart Ware, kostet Umsatz.
 * Ab Woche 26, also nach der Gläubigerversammlung: schon im Verfahren drückt der Kahlschlag das Plan-EBITDA
 * unter -25 Mio. € und der Insolvenzplan scheitert (ab = 3 zeigt das).
 */
export function botEinkaufKahlschlag(s: GameState, log = false, ab = 26): void {
  if (s.woche === ab) {
    fuehreAus(s, { typ: 'wgLimit', wg: 'alle', faktor: 0.8 });
    fuehreAus(s, { typ: 'wgServicegrad', wg: 'alle', ziel: 0.9 });
    fuehreAus(s, { typ: 'wgVororderquote', wg: 'alle', quote: 0.45 });
  }
  botTiefBasis(s, log, true);
}

if (require.main === module) {
  const s = neuesSpiel(Number(process.argv[2] ?? 1), { schwierigkeit: process.argv.includes('--leicht') ? 'leicht' : process.argv.includes('--schwer') ? 'schwer' : 'mittel' });
  const n = Number(process.argv[3] ?? 260);
  const b = process.argv.includes('--ek-nos') ? botEinkaufNos : process.argv.includes('--ek-em') ? botEinkaufEigenmarken : process.argv.includes('--ek-kahlschlag-frueh') ? (x: GameState, l?: boolean) => botEinkaufKahlschlag(x, l, 3) : process.argv.includes('--ek-kahlschlag') ? botEinkaufKahlschlag : process.argv.includes('--hq') ? botHq : process.argv.includes('--hq-ausbau') ? botHqAusbau : process.argv.includes('--hq-kahlschlag') ? botHqKahlschlag : process.argv.includes('--hq-keine') ? botHqKeine : process.argv.includes('--regulaer') ? botRegulaer : process.argv.includes('--turnaround') ? botTurnaround : process.argv.includes('--tief') ? botTief : process.argv.includes('--schirm') ? botSchutzschirm : botWoche;
  for (let i = 0; i < n && s.phase !== 'zerschlagen'; i++) {
    b(s, process.argv.includes('-v'));
    const k = wocheAbspielen(s);
    if (k.woche % 13 === 12) console.log(`W${k.woche} ${s.phase} Häuser ${k.offeneHaeuser} Umsatz ${mio(k.umsatz)} EBITDA13 ${mio(s.historie.slice(-13).reduce((a, b) => a + b.ebitda, 0))} Cash ${mio(k.cash)} frei ${mio(k.kreditFrei)} KV ${s.stakeholder.kreditversicherer.toFixed(0)} Bank ${s.stakeholder.bank.toFixed(0)} BR ${s.stakeholder.betriebsrat.toFixed(0)}`);
  }
  console.log('Ende:', s.phase, 'Woche', s.woche, 'Insolvenzen', s.insolvenzenGesamt);
  for (const m of s.meldungen.filter((m) => ['insolvenz', 'eigentuemer', 'warnung'].includes(m.typ)).slice(-12)) console.log(`  [W${m.woche} ${m.typ}] ${m.text}`);
}
