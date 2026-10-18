import type { GameState } from './types';
import { clamp, melde } from './util';
import { hqBetriebsratZiel, hqControllingExzellenz, hqVerwaltungMalus } from './hq';

/** Freie Liquidität: Kasse plus ungenutzte Kreditlinie. */
export function freieLiquiditaet(s: GameState): number {
  return s.cash + s.kreditlinie;
}

/** Startannahme für die Jahres-Run-Rate, solange noch keine 52 Wochen Historie vorliegen. */
const PRIOR_EBITDA_WOCHE = -2_200_000;

/** Reichweite in Wochen auf Basis der EBITDA-Jahres-Run-Rate (so schauen Bank und Kreditversicherer). */
export function runwayWochen(s: GameState): number {
  const h = s.historie.slice(-52);
  const summe = h.reduce((a, b) => a + b.ebitda + b.sondereffekte, 0) + (52 - h.length) * PRIOR_EBITDA_WOCHE;
  const burn = -summe / 52;
  if (burn <= 0) return 52;
  return clamp(freieLiquiditaet(s) / burn, 0, 52);
}

function annaehern(ist: number, ziel: number, rate: number): number {
  return clamp(ist + (ziel - ist) * rate, 0, 100);
}

export function aktualisiereStakeholder(s: GameState): void {
  const st = s.stakeholder;
  const runway = runwayWochen(s);
  const ueberfaellig = s.verbindlichkeiten.some((v) => v.ueberfaelligSeit !== undefined);
  const h = s.historie.slice(-8);
  const h0 = s.historie.slice(-16, -8);
  const avg = (xs: typeof h) => (xs.length ? xs.reduce((a, b) => a + b.ebitda, 0) / xs.length : 0);
  const trend = h.length && h0.length ? clamp((avg(h) - avg(h0)) / 2_000_000, -1, 1) : 0;
  const ebitdaGut = avg(h) > 0 ? 8 : 0;
  const inso = s.phase === 'insolvenz';
  const beraterBonus = s.berater.filter((b) => b.ende > s.woche - 26).length > 0 ? 6 : 0;
  // Zentrale: exzellentes Controlling schafft Vertrauen, eine unterbesetzte Verwaltung kostet es
  const reporting = (hqControllingExzellenz(s) ? 3 : 0) - hqVerwaltungMalus(s);

  const kvZiel = 25 + 40 * clamp(runway / 26, 0, 1) + 6 * trend + ebitdaGut + 0.15 * (st.image - 50) - (ueberfaellig ? 25 : 0) - (inso ? 10 : 0) + (hqControllingExzellenz(s) ? 3 : 0);
  st.kreditversicherer = annaehern(st.kreditversicherer, kvZiel, 0.05);

  const bankZiel = 25 + 35 * clamp(runway / 26, 0, 1) + 8 * trend + ebitdaGut + beraterBonus - (ueberfaellig ? 20 : 0) + reporting;
  st.bank = annaehern(st.bank, bankZiel, 0.03);

  st.betriebsrat = annaehern(st.betriebsrat, (s.tarif === 'ohne' ? 25 : 50) + hqBetriebsratZiel(s), 0.01);
  st.image = annaehern(st.image, 50, 0.01);
  st.vermieter = annaehern(st.vermieter, 50 - (ueberfaellig ? 15 : 0), 0.01);

  // Lieferanten
  for (const l of s.lieferanten) {
    if (!l.aktiv) continue;
    l.verspaetungen *= 0.97;
    const eigene = 72 - 14 * Math.min(4, l.verspaetungen) - (inso ? 15 : 0);
    const ziel = (l.kvSensitivitaet * st.kreditversicherer + eigene) / (1 + l.kvSensitivitaet);
    l.vertrauen = annaehern(l.vertrauen, ziel, 0.03 + 0.06 * (1 - l.geduld));
  }
  const restZiel = (st.kreditversicherer + 70 - (ueberfaellig ? 25 : 0) - (inso ? 15 : 0)) / 2;
  s.restLieferantenVertrauen = annaehern(s.restLieferantenVertrauen, restZiel, 0.05);

  // Kreditlinie folgt dem Bankvertrauen
  if (s.phase === 'regulaer') {
    const ziel = s.kreditlinieBasis * clamp((st.bank - 15) / 40, 0, 1.25);
    const alt = s.kreditlinie;
    s.kreditlinie = Math.round(alt + (ziel - alt) * 0.25);
    if (alt - s.kreditlinie > 5_000_000) melde(s, 'warnung', `Die Hausbank reduziert die Kreditlinie auf ${(s.kreditlinie / 1e6).toFixed(0)} Mio. €.`);
  }
}
