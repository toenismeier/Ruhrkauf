import { GRUPPEN, saisonFaktor } from './daten';
import type { Format, GameState, GruppeId } from './types';
import { clamp, eur, melde, neueId } from './util';
import { PARAM } from './welt';
import { einbuchen } from './einkauf';

export function bestandWert(s: GameState, g?: GruppeId): number {
  let x = 0;
  for (const k of s.bestand) if (!g || k.gruppe === g) x += k.wert;
  return x;
}

/** Zahlungsziel in Wochen für eine Gruppe, abhängig vom Lieferantenvertrauen. */
export function zielWochen(s: GameState, g: GruppeId): number {
  // Im Verfahren: erst Vorkasse, dann Lieferung auf Deckungszusage des Sachwalters mit kurzem Ziel
  if (s.phase === 'insolvenz' && s.insolvenz) return s.woche < s.insolvenz.seit + 4 ? 0 : 3;
  const ziel = (v: number) => (v >= 60 ? 9 : v >= 45 ? 7 : v >= 32 ? 4 : v >= 22 ? 2 : 0);
  let rest = 1;
  let w = 0;
  for (const l of s.lieferanten) {
    const a = l.gruppen[g];
    if (!a || !l.aktiv) continue;
    w += a * ziel(l.vertrauen);
    rest -= a;
  }
  w += Math.max(0, rest) * ziel(s.restLieferantenVertrauen);
  return Math.round(w);
}

export function kvLimit(s: GameState): number {
  // Im Verfahren ersetzen Deckungszusagen das Limit: gedeckt ist, was die Masse tragen kann
  if (s.phase === 'insolvenz') return Math.max(0, 0.6 * (s.cash + s.kreditlinie)) + 30_000_000;
  return s.kvLimitBasis * clamp((s.stakeholder.kreditversicherer - 20) / 45, 0, 1.25);
}

export function offeneWarenverbindlichkeiten(s: GameState): number {
  let x = 0;
  for (const v of s.verbindlichkeiten) if (v.art === 'ware') x += v.wert;
  return x;
}

/** Erwarteter Wareneinsatz (Einstand) einer Gruppe in Woche t. */
export function erwarteterEinsatz(s: GameState, g: GruppeId, t: number): number {
  return (s.basisUmsatz[g] ?? 0) * saisonFaktor(g, t) * (1 - GRUPPEN[g].marge);
}

/** Wareneingang: Bestellungen der Woche kommen an, Kreditversicherer-Limit greift hier. */
export function wareneingang(s: GameState, liquiditaetsReserve: number): { vorkasse: number; gekuerzt: number } {
  const w = s.woche;
  let vorkasse = 0;
  let gekuerzt = 0;
  const limit = kvLimit(s);
  let exposure = offeneWarenverbindlichkeiten(s);
  const heute = s.bestellungen.filter((b) => b.ankunft <= w);
  s.bestellungen = s.bestellungen.filter((b) => b.ankunft > w);
  for (const b of heute) {
    let wert = b.wert;
    if (!b.vorkasse) {
      const ziel = zielWochen(s, b.gruppe);
      const frei = Math.max(0, limit - exposure);
      const aufZiel = ziel > 0 ? Math.min(wert, frei) : 0;
      let rest = wert - aufZiel;
      if (rest > 0) {
        const liquide = s.cash + s.kreditlinie - liquiditaetsReserve;
        if (s.vorkasseAkzeptieren && liquide > 0) {
          const zahlbar = eur(Math.min(rest, liquide)); // ganze Euro (Cash bleibt ganzzahlig)
          s.cash -= zahlbar;
          vorkasse += zahlbar;
          rest -= zahlbar;
        }
        if (rest > 0) {
          wert -= rest;
          gekuerzt += rest;
        }
      }
      if (aufZiel > 0) {
        s.verbindlichkeiten.push({ id: neueId(s, 'v'), art: 'ware', gruppe: b.gruppe, wert: eur(aufZiel), faellig: w + ziel });
        exposure += aufZiel;
      }
    }
    if (wert > 0) einbuchen(s, b, wert);
  }
  if (gekuerzt > 1_000_000) melde(s, 'warnung', `Lieferanten halten Ware über ${(gekuerzt / 1e6).toFixed(1)} Mio. € zurück: Limit des Kreditversicherers ausgeschöpft.`);
  return { vorkasse: eur(vorkasse), gekuerzt: eur(gekuerzt) };
}

/**
 * Verbraucht Ware zum Einstand (FIFO, älteste zuerst). Gibt den gebuchten Wareneinsatz zurück
 * (bei Sonderposten-Kohorten niedriger als der verbrauchte Wert).
 */
export function verbrauche(s: GameState, g: GruppeId, wertVoll: number): number {
  let rest = wertVoll;
  let gebucht = 0;
  const ks = s.bestand.filter((k) => k.gruppe === g && !k.ladenhueter).sort((a, b) => b.alter - a.alter);
  for (const k of ks) {
    if (rest <= 0) break;
    const nimm = Math.min(k.wert, rest);
    k.wert -= nimm;
    rest -= nimm;
    gebucht += nimm * k.kostenFaktor;
  }
  s.bestand = s.bestand.filter((k) => k.wert > 0.5);
  return gebucht;
}

/** Offprice zieht Altware aller Gruppen eines Formats, Rest wird als Sonderposten zugekauft. */
export function verbraucheAltware(s: GameState, f: Format, wertVoll: number): { gebucht: number; zukauf: number } {
  let rest = wertVoll;
  let gebucht = 0;
  const ks = s.bestand.filter((k) => GRUPPEN[k.gruppe].format === f && (k.alter >= 16 || k.ladenhueter)).sort((a, b) => b.alter - a.alter);
  for (const k of ks) {
    if (rest <= 0) break;
    const nimm = Math.min(k.wert, rest);
    k.wert -= nimm;
    rest -= nimm;
    gebucht += nimm * k.kostenFaktor;
  }
  s.bestand = s.bestand.filter((k) => k.wert > 0.5);
  return { gebucht, zukauf: rest };
}

/** Alterung und Abschriften auf Saisonware. */
export function altere(s: GameState): number {
  let ab = 0;
  for (const k of s.bestand) {
    k.alter += 1;
    let q = 0;
    if (k.ladenhueter) q = 0.06;
    else if (k.alter > 39) q = 0.08;
    else if (k.alter > 16) q = 0.03 * k.saisonAnteil;
    else if (k.alter > 8) q = 0.012 * k.saisonAnteil;
    const x = k.wert * q;
    k.wert -= x;
    ab += x * k.kostenFaktor;
  }
  s.bestand = s.bestand.filter((k) => k.wert > 0.5);
  return ab;
}

/** Ordert für die Zukunft (Order-up-to mit Einkaufsregler je Gruppe). */
export function bestelle(s: GameState): void {
  const w = s.woche;
  const ziel = PARAM.bestandsReichweite;
  for (const g of Object.keys(s.basisUmsatz) as GruppeId[]) {
    const level = s.orderLevel[g] ?? 1;
    const lead = GRUPPEN[g].vorlauf;
    const a = w + lead;
    const eA = erwarteterEinsatz(s, g, a);
    if (eA <= 0) continue;
    let pipeline = 0;
    for (const b of s.bestellungen) if (b.gruppe === g && b.ankunft < a) pipeline += b.wert;
    let verbrauch = 0;
    for (let t = w; t < a; t++) verbrauch += erwarteterEinsatz(s, g, t);
    const projiziert = bestandWert(s, g) + pipeline - verbrauch;
    let zielBestand = 0;
    for (let t = a; t < a + ziel; t++) zielBestand += erwarteterEinsatz(s, g, t);
    const order = clamp(level * eA + 0.3 * (level * zielBestand - projiziert), 0, 3 * eA * level);
    if (order > 1000) s.bestellungen.push({ id: neueId(s, 'b'), gruppe: g, wert: eur(order), ankunft: a, vorkasse: false });
  }
}
