// N02: Spielende und Endwertung. Keine Zufallszüge und keine Wirkung auf die laufende Simulation.
import { KONZERN_KAEUFER, PREMIUM_HAEUSER } from './daten';
import { premiumMarktwert } from './premium';
import { istSandkasten } from './sandkasten';
import type { Angebot, EndArt, Endwertung, GameState, SpielendeKennzahlen } from './types';
import { eur, melde, mio } from './util';

const faktor: Record<'leicht' | 'mittel' | 'schwer', number> = { leicht: 0.8, mittel: 1, schwer: 1.3 };
export const SPIELENDE_AKTIV = true;
const aktiv = (s: GameState) => SPIELENDE_AKTIV && !s.spielendeDeaktiviert && !istSandkasten(s);

export function ebitdaJahr(s: GameState): number {
  return eur(s.historie.slice(-52).reduce((sum, k) => sum + k.ebitda, 0));
}

/** Nur der Immobilienanteil der Premiumhäuser, damit operatives EBITDA nicht doppelt zählt. */
export function immobilienWert(s: GameState): number {
  return eur(s.haeuser.filter(h => h.klasse === 'premium' && h.status === 'offen').reduce((sum, h) => {
    const rang = PREMIUM_HAEUSER.find(p => p.id === h.premiumSchluessel)?.rang ?? 3;
    const multiple = rang === 1 ? 18 : rang === 2 ? 15 : 11;
    const operativ = Math.max(0, (h.kpi?.db ?? 0) * 52) * multiple;
    return sum + Math.max(0, premiumMarktwert(h) - operativ);
  }, 0));
}

/** Verkaufspreis: sechsfaches positives EBITDA der letzten 52 Wochen plus Immobilien. */
export function unternehmenswert(s: GameState): number {
  return eur(Math.max(0, ebitdaJahr(s)) * 6 + immobilienWert(s));
}

function startwerte(s: GameState) {
  return {
    haeuser: s.spielendeStart?.haeuser ?? s.haeuser.length,
    fte: s.spielendeStart?.fte ?? s.historie[0]?.fte ?? s.haeuser.reduce((sum, h) => sum + h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen, 0),
  };
}

/** Offen gelegte Wertungsformel: jede Komponente entspricht genau einer Berechnungszeile. */
export function endwertung(s: GameState): Endwertung {
  const start = startwerte(s);
  const offen = s.haeuser.filter(h => h.status === 'offen').length;
  const fte = Math.round(s.haeuser.reduce((sum, h) => sum + h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen, 0));
  const geschlossen = s.haeuser.filter(h => h.status === 'geschlossen' || h.status === 'raeumung' || h.status === 'schliessung_verhandlung').length;
  const entlassen = Math.max(0, Math.round(start.fte - fte));
  const st = s.stakeholder;
  const stakeholder = (st.bank + st.kreditversicherer + st.vermieter + st.betriebsrat + st.eigentuemer) / 5;
  const teile = [
    { id: 'haeuser', name: 'Gerettete Häuser', wert: offen, punkte: offen * 250 },
    { id: 'arbeitsplaetze', name: 'Gerettete Arbeitsplätze (FTE)', wert: fte, punkte: fte * 40 },
    { id: 'wert', name: 'Unternehmenswert', wert: unternehmenswert(s), punkte: Math.round(unternehmenswert(s) / 100_000) },
    { id: 'image', name: 'Image', wert: Math.round(st.image), punkte: Math.round(st.image * 200) },
    { id: 'stakeholder', name: 'Stakeholder', wert: Math.round(stakeholder), punkte: Math.round(stakeholder * 150) },
    { id: 'schliessungen', name: 'Schließungen', wert: geschlossen, punkte: -geschlossen * 400 },
    { id: 'entlassungen', name: 'Arbeitsplatzabbau (FTE)', wert: entlassen, punkte: -entlassen * 20 },
  ];
  const grundpunkte = teile.reduce((sum, x) => sum + x.punkte, 0);
  const schwierigkeit = s.schwierigkeit ?? 'mittel';
  const multiplikator = faktor[schwierigkeit];
  return { teile, grundpunkte, multiplikator, punkte: Math.max(0, Math.round(grundpunkte * multiplikator)), schwierigkeit };
}

export function endKennzahlen(s: GameState): SpielendeKennzahlen {
  const start = startwerte(s);
  return {
    geretteteHaeuser: s.haeuser.filter(h => h.status === 'offen').length,
    startHaeuser: start.haeuser,
    fte: Math.round(s.haeuser.reduce((sum, h) => sum + h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen, 0)),
    startFte: Math.round(start.fte),
    ebitda52: ebitdaJahr(s),
    unternehmenswert: unternehmenswert(s),
    umsatz52: eur(s.historie.slice(-52).reduce((sum, x) => sum + x.umsatz, 0)),
    image: Math.round(s.stakeholder.image),
  };
}

/** Speichert das Ende als unveränderlichen Schnappschuss. */
export function spielBeenden(s: GameState, art: EndArt, kaeufer?: string): void {
  if (s.prognose || s.ende || !aktiv(s)) return;
  s.ende = { art, woche: s.woche, kennzahlen: endKennzahlen(s), wertung: endwertung(s), ...(kaeufer ? { kaeufer } : {}) };
}

export function spielendePruefen(s: GameState): void {
  if (!aktiv(s) || s.prognose || s.ende) return;
  if (s.phase === 'zerschlagen') { spielBeenden(s, 'zerschlagen'); return; }
  if (!s.spielendeFortgesetzt && s.woche >= 260 && s.phase === 'regulaer' &&
    // E22/E26: Sanierung gelingt auch außergerichtlich, eine Insolvenz ist keine Voraussetzung.
    !s.insolvenz && s.historie.length >= 52 && ebitdaJahr(s) > 0) {
    spielBeenden(s, 'saniert');
  }
}

/** Deterministisch jährlich ab Woche 156; ohne Verbrauch des Simulation-RNG. */
export function konzernVerkaufAnbieten(s: GameState): void {
  if (!aktiv(s) || s.prognose || s.ende || s.phase !== 'regulaer') return;
  if (s.woche < 156 || (s.woche - 156) % 52 !== 0) return;
  const id = 'konzern-' + s.woche;
  if (s.angebote.some(a => a.id === id)) return;
  const index = ((s.seed + Math.floor((s.woche - 156) / 52)) % KONZERN_KAEUFER.length + KONZERN_KAEUFER.length) % KONZERN_KAEUFER.length;
  const k = KONZERN_KAEUFER[index];
  const kaufpreis = unternehmenswert(s);
  const an: Angebot = {
    id, typ: 'konzernVerkauf', woche: s.woche, frist: s.woche + 8,
    titel: 'Übernahmeangebot für den Hartwig-Konzern',
    text: k.name + ' (' + k.typ + ') bietet ' + mio(kaufpreis) +
      '. Grundlage: sechsfaches EBITDA der letzten 52 Wochen plus Immobilienwert. Annahme beendet das Spiel.',
    status: 'offen', kaufpreis, konzernKaeuferTyp: k.typ, konzernKaeuferName: k.name,
  };
  s.angebote.push(an);
  melde(s, 'eigentuemer', 'Ein Übernahmeangebot für den gesamten Konzern liegt vor.', { modul: 'vorstand' });
}
