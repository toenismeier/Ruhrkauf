// Q06 Marktbeobachtung: redaktioneller Relevanzfilter ohne Einfluss auf die Wettbewerbs-Simulation.
import { WETTBEWERB_UEBERSCHNEIDUNG, gruppenFuer } from './daten';
import { KOORDINATEN } from './standorte';
import { bereichsQualitaet } from './organisation';
import type { GameState, Haus, Meldung, Wettbewerber, WettbewerberArt } from './types';
import { clamp, eur } from './util';

export interface MarktbeobachtungWoche {
  woche: number;
  roh: number;
  einzeln: number;
  ueberblick: number;
  unterdrueckt: number;
}
export interface MarktbeobachtungStand {
  /** Stufe 0 = nicht eingerichtet; keine zusätzlichen Kosten in der Ausgangslage. */
  stufe: 0 | 1 | 2 | 3;
  fte: number;
  verlauf: MarktbeobachtungWoche[];
}
export const MARKT_FTE = [0, 6, 12, 20] as const;
export const MARKT_KOSTEN_JE_FTE = 1_750; // Personal, Sachkosten und Marktinformationen pro Woche.
const FORMATE: Record<WettbewerberArt, string> = {
  premium: 'Premium-Warenhaus', modehaus: 'Modehaus', fastfashion: 'Modekette',
  offprice: 'Off-Price-Anbieter', textildiscounter: 'Textildiscounter',
  elektronik: 'Elektronikmarkt', leer_ehemals: 'ehemalige Handelsfläche',
};

export function marktbeobachtungStart(s: GameState): void {
  s.marktbeobachtung ??= { stufe: 0, fte: 0, verlauf: [] };
}
export function marktbeobachtungKostenWoche(s: GameState): number {
  return (s.marktbeobachtung?.fte ?? 0) * MARKT_KOSTEN_JE_FTE;
}
export function marktbeobachtungStufe(s: GameState, stufe: number): { ok: boolean; text: string } {
  if (!Number.isInteger(stufe) || stufe < 0 || stufe > 3) return { ok: false, text: 'Stufe muss zwischen 0 und 3 liegen.' };
  marktbeobachtungStart(s);
  const x = s.marktbeobachtung!;
  const ziel = stufe as 0 | 1 | 2 | 3;
  if (ziel === x.stufe) return { ok: true, text: 'Die Marktbeobachtung ist bereits auf dieser Stufe.' };
  const neue = MARKT_FTE[ziel], alte = x.fte;
  // Einmalige Einstellungskosten verändern nur bei einer ausdrücklichen Spieleraktion die Bilanz.
  if (neue > alte) {
    const kosten = (neue - alte) * 4_000;
    if (s.cash + s.kreditlinie < kosten) return { ok: false, text: 'Nicht genügend Liquidität für die Einstellungskosten.' };
    s.cash -= kosten;
    s.einmalkostenWoche += kosten;
  }
  x.stufe = ziel;
  x.fte = neue;
  return { ok: true, text: ziel === 0 ? 'Marktbeobachtung aufgelöst: nur noch bedeutende Einzelmeldungen.'
    : `Marktbeobachtung auf Stufe ${ziel}: ${neue} FTE, ${marktbeobachtungKostenWoche(s).toLocaleString('de-DE')} € pro Woche.` };
}

function entfernung(stadtA: string, stadtB: string): number {
  if (stadtA === stadtB) return 0;
  const a = KOORDINATEN[stadtA], b = KOORDINATEN[stadtB];
  if (!a || !b) return Infinity;
  return Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 111 * Math.cos((a[0] + b[0]) * Math.PI / 360));
}
function kette(w: Wettbewerber | undefined): string {
  return w ? w.name + ' (' + FORMATE[w.art] + ')' : 'Ein Wettbewerber';
}
function eigenerUmsatz(h: Haus): number {
  return Math.max(0, h.kpi?.umsatz ?? h.grundflaecheQm * Math.max(1, h.etagen.length) * 55);
}
function formatiereProzent(p: number): string {
  const n = Math.max(0.1, Math.round(p * 10) / 10);
  return n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
}
interface Beobachtung {
  quelle: Meldung;
  relevanz: number;
  betrag: number;
  lokalerEffekt: number;
  text: string;
  ort: string;
}
function bewerte(s: GameState, m: Meldung): Beobachtung | null {
  // Die verknüpften Wettbewerber bleiben unabhängig von der Sichtbarkeit im Posteingang aktiv.
  const w = [...s.wettbewerber].sort((a, b) => b.name.length - a.name.length).find((x) => m.text.includes(x.name));
  const ort = m.bezug?.stadt ?? w?.stadt ?? [...new Set(s.haeuser.map((h) => h.stadt))].find((x) => m.text.includes(x));
  if (!ort || !w) return null;
  const schliessung = /schließ|aufgegeb|Räumungsverkauf/i.test(m.text);
  const preiskampf = /kontert|rabattaktion|Preisdruck|preisaktion/i.test(m.text);
  const umzug = /verlegt|Standortwechsel/i.test(m.text);
  const alle = s.haeuser.filter((h) => h.status === 'offen' || h.status === 'schliessung_verhandlung');
  const gesamtUmsatz = Math.max(1, alle.reduce((n, h) => n + eigenerUmsatz(h), 0));
  let betrag = 0, umsatzBetroffen = 0, lokalerEffekt = 0;
  for (const h of alle) {
    const km = entfernung(h.stadt, ort);
    if (km > 30) continue;
    // Lokaler Wettbewerbsfaktor aus der existierenden Engine, nur als Schätzwert gelesen.
    const naehe = km === 0 ? 1 : 0.18 * (1 - km / 30);
    const gruppen = gruppenFuer(h.format);
    const ueberschneidung = gruppen.length ? gruppen.reduce((n, g) => n + (WETTBEWERB_UEBERSCHNEIDUNG[w.art][g] ?? 0), 0) / gruppen.length : 0;
    const druck = preiskampf ? Math.max(0, w.preisdruck) / (1 + Math.max(0, w.preisdruck)) : 1;
    const aenderung = 0.25 * 0.035 * w.staerke * ueberschneidung * naehe * druck
      * (umzug ? 0.5 : 1) / Math.max(0.75, 1 - 0.25 * h.wettbewerbStart);
    if (aenderung <= 0) continue;
    const umsatz = eigenerUmsatz(h);
    betrag += umsatz * aenderung;
    umsatzBetroffen += umsatz;
    if (km === 0) lokalerEffekt = Math.max(lokalerEffekt, aenderung);
  }
  // Keine 0%-Meldungen: ohne materielle Veränderung keine eigene Nachricht.
  if (betrag < 100 || lokalerEffekt < 0.0003 || umsatzBetroffen <= 0) return null;
  const umsatzAnteil = umsatzBetroffen / gesamtUmsatz;
  const relevanz = (betrag / gesamtUmsatz) * 100 + 0.02 * Math.min(1, umsatzAnteil / 0.025);
  const richtung = schliessung ? 'Entlastung' : 'Umsatzdruck';
  const aktion = schliessung ? 'gibt eine Fläche auf' : preiskampf ? 'verstärkt die Rabattaktionen'
    : umzug ? 'verlegt seine Verkaufsfläche' : 'verstärkt seine Präsenz';
  return {
    quelle: m, relevanz, betrag: schliessung ? betrag : -betrag, lokalerEffekt,
    ort, text: `${kette(w)} ${aktion} in ${ort}. ${richtung} bei betroffenen Hartwig-Häusern: ${formatiereProzent(lokalerEffekt * 100)}.`,
  };
}

export function marktbeobachtungUebersicht(s: GameState) {
  const x = s.marktbeobachtung ?? { stufe: 0 as const, fte: 0, verlauf: [] };
  const stelle = s.organisation?.bereiche.marktbeobachtung;
  const qualitaet = bereichsQualitaet(s, 'marktbeobachtung');
  return {
    stufe: x.stufe, fte: x.fte, kostenWoche: marktbeobachtungKostenWoche(s),
    leitung: stelle?.person?.name ?? 'unbesetzt', qualitaet,
    erfasst: x.verlauf.at(-1)?.roh ?? 0, gemeldet: (x.verlauf.at(-1)?.einzeln ?? 0) + (x.verlauf.at(-1)?.ueberblick ?? 0),
    verlauf: x.verlauf.slice(-52),
  };
}

/** Einmal nach dem Wochenabschluss, unmittelbar vor dem Handelsboten. */
export function marktbeobachtungWoche(s: GameState): void {
  if (s.prognose) return;
  marktbeobachtungStart(s);
  const x = s.marktbeobachtung!;
  if (x.verlauf.some((v) => v.woche === s.woche)) return;
  const roh = s.meldungen.filter((m) => m.woche === s.woche && m.bezug?.modul === 'wettbewerb');
  const q = x.stufe ? clamp(bereichsQualitaet(s, 'marktbeobachtung'), 0.15, 1) : 0;
  const erkennungsschwelle = x.stufe ? 0.006 - 0.004 * q : 0.014;
  const erkannt = roh.map((m) => bewerte(s, m)).filter((v): v is Beobachtung => !!v && v.relevanz >= erkennungsschwelle)
    .sort((a, b) => b.relevanz - a.relevanz || (a.quelle.id ?? '').localeCompare(b.quelle.id ?? ''));
  const schwelle = x.stufe ? 0.035 - 0.014 * q : 0.055;
  // Mit Fachabteilung braucht es ein besonders großes Ereignis für eine zweite Einzelmeldung.
  const einzel = erkannt.filter((v) => v.relevanz >= schwelle).slice(0, x.stufe ? 1 : 4);
  // Originalmeldungen durch die fachlich geprüften Veröffentlichungen ersetzen.
  const ids = new Set(roh);
  s.meldungen = s.meldungen.filter((m) => !ids.has(m));
  const nachricht = (text: string, id: string, stadt?: string) => {
    s.meldungen.push({ id, woche: s.woche, typ: 'presse', text, bezug: { modul: 'wettbewerb', ...(stadt ? { stadt } : {}) } });
  };
  if (x.stufe && erkannt.length) {
    const top = erkannt.slice(0, 3);
    // Ein konsolidierter Wochenüberblick ist die einzige Routinemeldung.
    const details = top.map((e, i) => `${i + 1}. ${e.text}`).join(' ');
    const gesamt = erkannt.reduce((a, b) => a + b.betrag, 0);
    const rundung = q >= 0.8 ? 100 : q >= 0.5 ? 500 : 2_000;
    const wert = Math.round(Math.abs(gesamt) / rundung) * rundung;
    const spannweite = q >= 0.7 ? '' : ' (grobe Schätzung)';
    nachricht(`Wochenüberblick Wettbewerb: ${erkannt.length} relevante Marktbewegungen. ${details} Geschätzter Saldo für Hartwig: ${gesamt >= 0 ? '+' : '−'}${Math.max(rundung, wert).toLocaleString('de-DE')} € Wochenumsatz${spannweite}.`, `markt-${s.woche}`);
  }
  for (const e of einzel) {
    const ungenau = x.stufe === 0 || q < 0.45;
    const text = ungenau
      ? e.text.replace(/:\s*[0-9,]+\s*%/, ': etwa ' + formatiereProzent(e.lokalerEffekt * 100 * 0.7) + ' bis ' + formatiereProzent(e.lokalerEffekt * 100 * 1.3))
      : e.text;
    nachricht('Wettbewerbsbeobachtung: ' + text, `markt-${s.woche}-${e.quelle.id ?? einzel.indexOf(e)}`, e.ort);
  }
  x.verlauf.push({ woche: s.woche, roh: roh.length, einzeln: einzel.length,
    ueberblick: x.stufe && erkannt.length ? 1 : 0, unterdrueckt: roh.length - einzel.length });
  if (x.verlauf.length > 52) x.verlauf.splice(0, x.verlauf.length - 52);
  if (s.meldungen.length > 400) s.meldungen.splice(0, s.meldungen.length - 400);
}
