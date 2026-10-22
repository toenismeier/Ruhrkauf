/** Q13: Finanzierung ohne Budgetgrenze, aber mit echten Zahlungs- und Ergebnisbuchungen. */
import type { GameState } from './types';

/** Auch alte Sandkasten-Spielstände anhand ihrer Szenario-ID erkennen. */
export function istSandkasten(s: GameState): boolean {
  return s.szenario?.id === 'sandkasten' || s.szenario?.regeln?.sandkasten === true;
}

/** Nur Freigaben von Zahlungen umgehen; Cash und Kapitalfluss bleiben endlich und rechnerisch echt. */
export function liquiditaetReicht(s: GameState, betrag: number): boolean {
  return istSandkasten(s) || s.cash + s.kreditlinie >= betrag;
}
