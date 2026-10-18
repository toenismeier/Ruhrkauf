import type { GameState, MeldungTyp } from './types';

export interface RngHalter { rng: number }

/** mulberry32: deterministisch, Zustand liegt im Spielstand. */
export function zufall(h: RngHalter): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const zwischen = (h: RngHalter, a: number, b: number): number => a + (b - a) * zufall(h);
export const ganzZwischen = (h: RngHalter, a: number, b: number): number => Math.floor(zwischen(h, a, b + 1));
export const chance = (h: RngHalter, p: number): boolean => zufall(h) < p;

export function waehle<T>(h: RngHalter, arr: readonly T[]): T {
  return arr[Math.floor(zufall(h) * arr.length)];
}

export function normal(h: RngHalter): number {
  const u = Math.max(1e-12, zufall(h));
  const v = zufall(h);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
export const eur = (x: number): number => Math.round(x);
export const summe = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export function neueId(s: GameState, prefix: string): string {
  s.zaehler += 1;
  return `${prefix}${s.zaehler}`;
}

export function melde(s: GameState, typ: MeldungTyp, text: string): void {
  if (s.prognose) return;
  s.meldungen.push({ woche: s.woche, typ, text });
  if (s.meldungen.length > 400) s.meldungen.splice(0, s.meldungen.length - 400);
}

export const kw = (woche: number): number => (woche % 52) + 1;
export const jahr = (s: GameState, woche = s.woche): number => s.startJahr + Math.floor(woche / 52);
export const monat = (woche: number): number => Math.min(11, Math.floor((woche % 52) / (52 / 12)));

export function mio(x: number): string {
  return `${(x / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio. €`;
}
