// Fiktive Unternehmensgeschichte und rein beobachtendes Spielarchiv.
// Kein Zufallsstrom, keine Meldungen und keine Geschäftslogik werden verändert.
import type { GameState, HausStatus, Phase } from './types';

export const CHRONIK_AKTIV = true; // Bis die zentralen Nice-Einstellungen (N13) bereitstehen.

export interface GeschichtsStation {
  jahr: number;
  titel: string;
  text: string;
  motiv: string;
  familie: 1 | 2 | 3 | 4 | 5;
}
export const KONZERN_GESCHICHTE: readonly GeschichtsStation[] = [
  { jahr: 1886, titel: 'Eine Tuchhandlung in Essen', text: 'In einer kleinen Essener Ladenzeile beginnt die Familie Hartwig mit Tuchen, Kurzwaren und Maßstoffen. Ein rotes Schild über der Tür wird zum Erkennungszeichen.', motiv: 'Tuchballen und Schaufenster', familie: 1 },
  { jahr: 1898, titel: 'Das erste feste Kaufhaus', text: 'Hartwig bündelt mehrere Warenabteilungen unter einem Dach. Die Kundschaft findet nun neben Stoffen auch Haushaltswaren und Spielzeug.', motiv: 'Gründerzeitfassade', familie: 1 },
  { jahr: 1912, titel: 'Über das Ruhrgebiet hinaus', text: 'Ein zweites Haus eröffnet in Bochum, weitere Standorte werden geplant. Ein eigener Fuhrpark verbindet Lager und Verkaufshäuser.', motiv: 'Lieferwagen vor Warenhaus', familie: 1 },
  { jahr: 1926, titel: 'Neue Sachlichkeit', text: 'Klare Schaufenster und helle Verkaufsflächen ersetzen das alte Ladendekor. Die neu gegründete Hartwig Warenhausgesellschaft modernisiert auch den Einkauf.', motiv: 'Schaufensterband', familie: 2 },
  { jahr: 1937, titel: 'Ein schwieriges Jahrzehnt', text: 'Materialknappheit und staatliche Eingriffe begrenzen das Sortiment. Das Unternehmen konzentriert sich auf die Versorgung seiner bestehenden Häuser.', motiv: 'Leere Auslagen', familie: 2 },
  { jahr: 1945, titel: 'Zerstörung und Neubeginn', text: 'Mehrere Häuser sind durch den Krieg schwer beschädigt. Beschäftigte räumen Trümmer beiseite und richten provisorische Verkaufsräume ein.', motiv: 'Beschädigte Fassade', familie: 2 },
  { jahr: 1953, titel: 'Wiederaufbau', text: 'In Essen öffnet ein neues Haus mit breiten Fensterfronten und Rolltreppen. Hartwig investiert erneut in zentrale Lager und Ausbildung.', motiv: 'Nachkriegsfassade', familie: 3 },
  { jahr: 1964, titel: 'Das Wirtschaftswunder im Schaufenster', text: 'Haushaltsgeräte, Mode und Möbel werden zum Schwerpunkt. Die Hauptverwaltung zieht in einen deutlich größeren Bürokomplex.', motiv: 'Leuchtendes Kaufhaus', familie: 3 },
  { jahr: 1976, titel: 'Expansion in die Fläche', text: 'Hartwig eröffnet Häuser in Mittelstädten und neuen Einkaufszentren. Immer mehr Verkaufsfläche erhöht aber auch die Fixkosten.', motiv: 'Kachelfassade und Passage', familie: 4 },
  { jahr: 1988, titel: 'Die gläserne Modernisierung', text: 'Neue Fassaden und Ladenkonzepte sollen ein jüngeres Publikum gewinnen. Erste Versuche mit spezialisierten Sportabteilungen folgen.', motiv: 'Glasfassade', familie: 5 },
  { jahr: 1996, titel: 'Fusion mit Volkskauf', text: 'Hartwig übernimmt die fiktive Warenhauskette Volkskauf und führt Einkauf und Logistik zusammen. Unterschiedliche Hausgrößen und Konzepte bleiben eine Herausforderung.', motiv: 'Zwei historische Schilder', familie: 5 },
  { jahr: 2006, titel: 'Neue Konkurrenz', text: 'Spezialisierte Anbieter und wachsende Onlineangebote verschärfen den Wettbewerb. Die großen Innenstadtimmobilien lassen sich nur langsam anpassen.', motiv: 'Leere Ladenpassage', familie: 5 },
  { jahr: 2015, titel: 'Versuch eines Kurswechsels', text: 'Eigenmarken, modernisierte Filialen und digitale Angebote sollen die Ertragslage stabilisieren. Gleichzeitig beginnt die Überprüfung des übergroßen Standortnetzes.', motiv: 'Modernisiertes Schaufenster', familie: 5 },
  { jahr: 2022, titel: 'Sanierung auf Raten', text: 'Hohe Energiekosten und verändertes Kaufverhalten belasten viele Standorte. Einzelne Häuser werden verkleinert, doch die Verschuldung bleibt hoch.', motiv: 'Fassade mit Baugerüst', familie: 5 },
  { jahr: 2027, titel: 'Am Wendepunkt', text: 'Die Hartwig-Gruppe steht vor der Insolvenzreife und braucht eine grundlegende Neuordnung. Wie diese Geschichte weitergeht, entscheidet der Spieler.', motiv: 'Blick auf die Hauptverwaltung', familie: 5 },
];

export type ChronikArt = 'insolvenz' | 'plan' | 'haus' | 'vorstand' | 'erfolg' | 'quartal';
export interface ChronikEintrag {
  id: string;
  woche: number;
  art: ChronikArt;
  text: string;
  bezug: string;
}
export interface ChronikStand {
  phase: Phase;
  insolvenzen: number;
  haeuser: Record<string, HausStatus>;
  vorstand: Record<string, string>;
  bestesQuartal: number | null;
  letztesQuartal: number;
}

function standVon(s: GameState, alt?: ChronikStand): ChronikStand {
  return {
    phase: s.phase,
    insolvenzen: s.insolvenzenGesamt,
    haeuser: Object.fromEntries(s.haeuser.map(h => [h.id, h.status])),
    vorstand: Object.fromEntries(Object.entries(s.vorstand?.ressorts ?? {}).map(([id, r]) => [id, r.person?.id ?? ''])),
    bestesQuartal: alt?.bestesQuartal ?? null,
    letztesQuartal: alt?.letztesQuartal ?? -1,
  };
}

/** Für neue Spielstände; ältere Spielstände werden beim ersten Abgleich ohne erfundene Ereignisse migriert. */
export function chronikInitialisieren(s: GameState): void {
  if (!CHRONIK_AKTIV || s.prognose) return;
  s.chronik ??= [];
  s.chronikStand ??= standVon(s);
}

function eintragen(s: GameState, art: ChronikArt, text: string, bezug: string, woche: number): void {
  const chronik = s.chronik ?? (s.chronik = []);
  chronik.push({ id: `chronik-${chronik.length + 1}`, woche, art, text, bezug });
}

/** Rein lesender Vergleich mit dem letzten bekannten Zustand, ohne Eingriff in den Simulations-RNG. */
export function chronikAktualisieren(s: GameState, ereignisWoche = s.woche): void {
  if (!CHRONIK_AKTIV || s.prognose) return;
  if (!s.chronikStand) { chronikInitialisieren(s); return; }
  const alt = s.chronikStand;
  if (s.insolvenzenGesamt > alt.insolvenzen) {
    eintragen(s, 'insolvenz', `Insolvenzantrag: ${s.insolvenz?.grund ?? 'Das Verfahren wurde eröffnet.'}`, 'insolvenz', ereignisWoche);
  }
  if (alt.phase === 'insolvenz' && s.phase === 'regulaer') {
    eintragen(s, 'plan', 'Die Gläubiger haben den Insolvenzplan angenommen. Die Sanierung wird fortgesetzt.', 'insolvenz', ereignisWoche);
  }
  for (const h of s.haeuser) {
    if ((h.status === 'geschlossen' || h.status === 'verkauft') && alt.haeuser[h.id] !== h.status) {
      eintragen(s, 'haus', `${h.name} (${h.stadt}) wurde ${h.status === 'verkauft' ? 'verkauft' : 'geschlossen'}.`, h.id, ereignisWoche);
    }
  }
  for (const [id, ressort] of Object.entries(s.vorstand?.ressorts ?? {})) {
    const person = ressort.person;
    if (person && person.id !== (alt.vorstand[id] ?? '')) {
      eintragen(s, 'vorstand', `${person.name} übernimmt das Ressort ${id.toUpperCase()}.`, id, ereignisWoche);
    }
  }
  const q = s.quartale.find(q => q.start + 12 === ereignisWoche && q.start + 13 <= s.woche && q.nr > alt.letztesQuartal);
  let bestesQuartal = alt.bestesQuartal;
  let letztesQuartal = alt.letztesQuartal;
  if (q) {
    if (bestesQuartal === null || q.ebitdaIst > bestesQuartal) {
      eintragen(s, 'quartal', `Neues bestes Quartal: Quartal ${q.nr + 1} mit ${q.ebitdaIst.toLocaleString('de-DE')} € EBITDA.`, `quartal-${q.nr}`, ereignisWoche);
      bestesQuartal = q.ebitdaIst;
    }
    letztesQuartal = q.nr;
  }
  s.chronikStand = { ...standVon(s, alt), bestesQuartal, letztesQuartal };
}

/** Anschluss für N03: Erfolge werden nur einmal mit ihrem stabilen Schlüssel protokolliert. */
export function chronikErfolg(s: GameState, id: string, titel: string): void {
  if (!CHRONIK_AKTIV || s.prognose || !id) return;
  chronikInitialisieren(s);
  if ((s.chronik ?? []).some(e => e.art === 'erfolg' && e.bezug === id)) return;
  eintragen(s, 'erfolg', `Erfolg freigeschaltet: ${titel}.`, id, s.woche);
}

export function chronikUebersicht(s: GameState) {
  return { geschichte: KONZERN_GESCHICHTE, spiel: [...(s.chronik ?? [])].reverse() };
}
