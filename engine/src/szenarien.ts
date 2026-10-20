/** Freiwillige Szenarien. Kein Einfluss auf die Standardkalibrierung. */
import type { GameState, Haus } from './types';
import type { Szenario } from './welt';
import { eroeffneInsolvenz } from './prozesse';
import { eur, melde } from './util';

export type SzenarioId = 'standard' | 'schutzschirm' | 'lockdown' | 'fusion' | 'investor' | 'aufbruch' | 'sandkasten';

export interface SzenarioRegeln {
  schutzschirmFrist?: number;
  lockdown?: { beginn: number; dauer: number; frequenz: number; staatshilfe: number };
  fusionDoppelStaedte?: number;
  immobilienInvestor?: boolean;
  aufbruchKonkurrenz?: number;
  sandkasten?: boolean;
}

export interface SzenarioStand {
  id: SzenarioId;
  regeln: SzenarioRegeln;
  wertStart?: number;
  umsatzZiel?: number;
  fusionHausIds?: string[];
  immobilienVerkaeufe?: number[];
  hilfeGenutzt?: boolean;
  streikErlebt?: boolean;
  erreicht?: boolean;
  gescheitert?: boolean;
}

export interface SzenarioKarte {
  id: SzenarioId;
  name: string;
  beschreibung: string;
  schwierigkeit: string;
  ziel: string;
  /** Keine fremden Marken und keine Bilder aus dem Netz. */
  bild: string;
  start: Partial<Szenario>;
}

export const SZENARIEN: readonly SzenarioKarte[] = [
  { id: 'standard', name: 'Die Sanierung', beschreibung: 'Hartwig steckt in der Krise. Das bekannte Ausgangsszenario.', schwierigkeit: 'Mittel', ziel: '260 Wochen überleben', bild: 'sanierung', start: {} },
  { id: 'schutzschirm', name: 'Schutzschirm', beschreibung: 'Das Verfahren ist eröffnet. Der Plan muss in 12 Wochen angenommen sein.', schwierigkeit: 'Sehr schwer', ziel: 'Insolvenzplan fristgerecht durchsetzen', bild: 'schutzschirm', start: { szenarioRegeln: { schutzschirmFrist: 12 } } },
  { id: 'lockdown', name: 'Geschlossene Innenstädte', beschreibung: 'Ab Woche 8 sinkt die Frequenz zehn Wochen lang um 70 %. Staatshilfe wird angeboten.', schwierigkeit: 'Schwer', ziel: 'Bis Woche 18 zahlungsfähig bleiben', bild: 'lockdown', start: { szenarioRegeln: { lockdown: { beginn: 8, dauer: 10, frequenz: 0.3, staatshilfe: 140_000_000 } } } },
  { id: 'fusion', name: 'Die Fusion', beschreibung: '30 zusätzliche Volkskauf-Altstandorte überschneiden sich mit Hartwig.', schwierigkeit: 'Schwer', ziel: 'Doppelstandorte ohne Streik abbauen', bild: 'fusion', start: { szenarioRegeln: { fusionDoppelStaedte: 30 }, startCash: 230_000_000 } },
  { id: 'investor', name: 'Der neue Eigentümer', beschreibung: 'Ein Immobilieninvestor fordert jährlich mindestens einen Hausverkauf.', schwierigkeit: 'Schwer', ziel: 'Unternehmenswert in fünf Jahren verdoppeln', bild: 'investor', start: { szenarioRegeln: { immobilienInvestor: true }, startCash: 260_000_000 } },
  { id: 'aufbruch', name: 'Aufbruch', beschreibung: 'Solide finanzierte Kette, aber starke Konkurrenz.', schwierigkeit: 'Mittel', ziel: 'In drei Jahren Umsatzmarktführer werden', bild: 'aufbruch', start: { startCash: 900_000_000, kreditlinie: 300_000_000, szenarioRegeln: { aufbruchKonkurrenz: 0.86 } } },
  { id: 'sandkasten', name: 'Sandkasten', beschreibung: 'Unbegrenzte Mittel, kein Insolvenzrisiko und keine Wertung.', schwierigkeit: 'Frei', ziel: 'Ohne Zeitlimit experimentieren', bild: 'sandkasten', start: { szenarioRegeln: { sandkasten: true } } },
];

export function szenarioKonfiguration(id: string): Partial<Szenario> {
  const karte = SZENARIEN.find((x) => x.id === id);
  if (!karte || karte.id === 'standard') return {};
  return { ...karte.start, szenarioId: karte.id };
}

export function szenarioName(s: GameState): string {
  return SZENARIEN.find((x) => x.id === (s.szenario?.id ?? 'standard'))?.name ?? SZENARIEN[0].name;
}

function hausWert(h: Haus): number {
  return eur(Math.max(5_000_000, h.grundflaecheQm * 4_500));
}

/** Konservativer operativer Konzernwert und im Besitz befindliche Immobilien, in Euro. */
export function unternehmensWert(s: GameState): number {
  const immobiliensumme = s.haeuser.filter((h) => h.miete.vermieter === 'eigentuemer' && h.status !== 'verkauft' && h.status !== 'geschlossen')
    .reduce((sum, h) => sum + hausWert(h), 0);
  const ertrag = s.historie.slice(-52).reduce((sum, k) => sum + k.ebitda, 0);
  const hochrechnung = s.historie.length ? ertrag * 52 / Math.min(52, s.historie.length) : 0;
  return eur(Math.max(0, s.cash) + immobiliensumme + Math.max(0, hochrechnung) * 5);
}

export function szenarioStart(s: GameState, sz: Szenario): void {
  if (!sz.szenarioId || sz.szenarioId === 'standard') return;
  const regeln = structuredClone(sz.szenarioRegeln ?? {});
  const lauf: SzenarioStand = { id: sz.szenarioId, regeln };
  s.szenario = lauf;
  if (regeln.fusionDoppelStaedte) lauf.fusionHausIds = s.haeuser.filter((h) => h.fusionUrsprung === 'volkskauf').map((h) => h.id);
  if (regeln.immobilienInvestor) {
    lauf.immobilienVerkaeufe = [];
    lauf.wertStart = unternehmensWert(s);
  }
  if (regeln.aufbruchKonkurrenz) {
    const umsatz = Object.values(s.basisUmsatz).reduce((sum, wert) => sum + (wert ?? 0), 0);
    lauf.umsatzZiel = Math.round(umsatz * 1.2);
  }
  if (regeln.schutzschirmFrist) {
    eroeffneInsolvenz(s, 'Schutzschirm zum Spielstart');
    if (s.insolvenz) s.insolvenz.versammlung = s.woche + regeln.schutzschirmFrist;
  }
  if (regeln.sandkasten) {
    s.cash = 1_000_000_000_000_000;
    s.kreditlinie = 1_000_000_000_000_000;
  }
}

/** In der normalen Partie immer Faktor 1: keine zusätzliche Simulation und kein RNG-Verbrauch. */
export function szenarioFrequenz(s: GameState): number {
  const r = s.szenario?.regeln;
  if (!r) return 1;
  if (r.lockdown && s.woche >= r.lockdown.beginn && s.woche < r.lockdown.beginn + r.lockdown.dauer) return r.lockdown.frequenz;
  return r.aufbruchKonkurrenz ?? 1;
}

export function szenarioWoche(s: GameState): void {
  const lauf = s.szenario;
  if (!lauf || s.prognose) return;
  const lockdown = lauf.regeln.lockdown;
  if (lockdown && s.woche === lockdown.beginn && !s.angebote.some((a) => a.typ === 'staatshilfe')) {
    s.angebote.push({
      id: 'sz-staatshilfe-' + s.woche, typ: 'staatshilfe', woche: s.woche,
      frist: s.woche + 4, status: 'offen', titel: 'Staatliche Überbrückungshilfe',
      text: 'Einmalige Hilfe zur Deckung laufender Kosten bei geschlossenen Innenstädten. Annehmen oder ablehnen.',
      einmalzahlung: lockdown.staatshilfe,
    });
    melde(s, 'warnung', 'Innenstädte geschlossen: zehn Wochen mit 70 % weniger Kundenfrequenz. Die Überbrückungshilfe liegt im Posteingang.');
  }
  if (lauf.regeln.immobilienInvestor && s.woche > 0 && s.woche % 52 === 0 &&
      !(lauf.immobilienVerkaeufe ?? []).some((w) => w >= s.woche - 52 && w < s.woche)) {
    s.stakeholder.eigentuemer = Math.max(0, s.stakeholder.eigentuemer - 10);
    melde(s, 'eigentuemer', 'Der Investor beanstandet das vergangene Jahr: kein Immobilienverkauf.');
  }
  if (lauf.fusionHausIds?.length && s.haeuser.some((h) => h.streikBis !== undefined && h.streikBis > s.woche)) lauf.streikErlebt = true;
  if (lauf.regeln.sandkasten) s.cash = Math.max(s.cash, 1_000_000_000_000_000);
}

/** Nur im Investor-Szenario verfügbar: Verkauf mit Rückmietung, operative Filiale bleibt offen. */
export function immobilieVerkaufen(s: GameState, hausId: string): string | null {
  if (s.szenario?.id !== 'investor') return 'Immobilien-Sale-and-Leaseback ist nur in „Der neue Eigentümer“ verfügbar.';
  const h = s.haeuser.find((x) => x.id === hausId);
  if (!h || h.status !== 'offen' || h.miete.vermieter !== 'eigentuemer') return 'Nur offene, eigene Immobilien können verkauft werden.';
  const wert = hausWert(h);
  h.miete.vermieter = 'dritt';
  h.miete.vermieterName = 'Immobilienfonds Nord';
  h.miete.mieteWoche = eur(h.miete.mieteWoche + wert * 0.06 / 52);
  s.cash += wert;
  s.einmalErloeseWoche += wert;
  s.szenario.immobilienVerkaeufe = [...(s.szenario.immobilienVerkaeufe ?? []), s.woche];
  melde(s, 'presse', h.name + ' im Sale-and-Leaseback verkauft. Erlös ' + Math.round(wert / 1_000_000) + ' Mio. €.');
  return null;
}

export interface SzenarioZiel {
  id: SzenarioId;
  name: string;
  text: string;
  fortschritt: number;
  erreicht: boolean;
  gescheitert: boolean;
  wertung: boolean;
  details: string;
}

export function szenarioZiel(s: GameState): SzenarioZiel {
  const id = s.szenario?.id ?? 'standard';
  const karte = SZENARIEN.find((x) => x.id === id) ?? SZENARIEN[0];
  let fortschritt = 0, erreicht = false, gescheitert = s.phase === 'zerschlagen', details = '';
  const w = s.woche;
  switch (id) {
    case 'standard':
      fortschritt = Math.min(1, w / 260);
      erreicht = w >= 260 && !gescheitert;
      details = w + ' von 260 Wochen überstanden'; break;
    case 'schutzschirm':
      fortschritt = Math.min(1, w / 12);
      erreicht = s.phase === 'regulaer' && s.insolvenzenGesamt > 0 && w <= 12;
      gescheitert ||= w >= 12 && !erreicht;
      details = s.phase === 'insolvenz' ? 'Gläubigerversammlung spätestens Woche 12' : 'Verfahren: ' + s.phase; break;
    case 'lockdown':
      fortschritt = Math.min(1, w / 18);
      erreicht = w >= 18 && s.phase === 'regulaer' && s.cash + s.kreditlinie >= 0;
      gescheitert ||= s.phase !== 'regulaer' || s.cash + s.kreditlinie < 0;
      details = 'Liquiditätsreserve ' + Math.round((s.cash + s.kreditlinie) / 1_000_000) + ' Mio. €'; break;
    case 'fusion': {
      const ids = s.szenario?.fusionHausIds ?? [];
      const offen = ids.filter((hid) => s.haeuser.find((h) => h.id === hid)?.status !== 'geschlossen');
      fortschritt = ids.length ? (ids.length - offen.length) / ids.length : 0;
      erreicht = !!ids.length && !offen.length && !s.szenario?.streikErlebt && s.phase === 'regulaer';
      gescheitert ||= !!s.szenario?.streikErlebt || (w >= 156 && !erreicht);
      details = (ids.length - offen.length) + ' von ' + ids.length + ' Doppelstandorten bereinigt; ' + (s.szenario?.streikErlebt ? 'Streik aufgetreten' : 'kein Streik'); break;
    }
    case 'investor': {
      const basis = Math.max(1, s.szenario?.wertStart ?? 1);
      const jetzt = unternehmensWert(s);
      const verkaeufe = s.szenario?.immobilienVerkaeufe ?? [];
      const jahre = Math.min(5, Math.floor(w / 52));
      const alleJahre = Array.from({ length: jahre }, (_, i) => verkaeufe.some((v) => v >= i * 52 && v < (i + 1) * 52)).every(Boolean);
      fortschritt = Math.min(1, jetzt / (2 * basis));
      erreicht = w >= 260 && jetzt >= 2 * basis && alleJahre && !gescheitert;
      gescheitert ||= w >= 260 && !erreicht;
      details = 'Unternehmenswert ' + Math.round(jetzt / 1_000_000) + ' / ' + Math.round(2 * basis / 1_000_000) + ' Mio. € · ' + verkaeufe.length + ' Hausverkäufe'; break;
    }
    case 'aufbruch': {
      const ziel = s.szenario?.umsatzZiel ?? 1;
      const ist = s.historie.length ? s.historie.slice(-13).reduce((a, k) => a + k.umsatz, 0) / Math.min(13, s.historie.length) : 0;
      fortschritt = Math.min(1, ist / ziel);
      erreicht = w >= 156 && ist >= ziel && !gescheitert;
      gescheitert ||= w >= 156 && !erreicht;
      details = 'Wochenumsatz ' + Math.round(ist / 1_000_000) + ' / ' + Math.round(ziel / 1_000_000) + ' Mio. €'; break;
    }
    case 'sandkasten':
      return { id, name: karte.name, text: karte.ziel, fortschritt: 0, erreicht: false, gescheitert: false, wertung: false, details: 'Freies Spiel ohne Punktwertung' };
  }
  return { id, name: karte.name, text: karte.ziel, fortschritt: Math.max(0, fortschritt), erreicht: !!(s.szenario?.erreicht || erreicht), gescheitert: !!(s.szenario?.gescheitert || gescheitert), wertung: true, details };
}

export function szenarioNachWoche(s: GameState): void {
  if (!s.szenario || s.prognose || s.szenario.erreicht || s.szenario.gescheitert) return;
  const ziel = szenarioZiel(s);
  s.szenario.erreicht = ziel.erreicht;
  s.szenario.gescheitert = ziel.gescheitert;
  if (ziel.erreicht) melde(s, 'info', 'Szenarioziel erreicht: ' + ziel.text);
  if (ziel.gescheitert) melde(s, 'warnung', 'Szenarioziel verfehlt: ' + ziel.text);
}
