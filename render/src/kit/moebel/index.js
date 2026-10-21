// Zentraler Index für Ladenplaner, Kataloge und Validierung; pro Möbel genau eine ID.
import * as wand from './wand.js';
import * as gondel from './gondel.js';
import * as insel from './insel.js';
import * as kasse from './kasse.js';
import * as deko from './deko.js';
import * as sport from './sport.js';
import * as outlet from './outlet.js';
import * as service from './service.js';
import { SPORT_MIX_MOEBEL } from './sport-mix.js';
export * from './basis.js';
export * from './wand.js';
export * from './gondel.js';
export * from './insel.js';
export * from './kasse.js';
export * from './deko.js';
export * from './sport.js';
export * from './outlet.js';
export * from './service.js';
export * from './sport-mix.js';
export const ALLE_MOEBEL = Object.freeze(
  [wand, gondel, insel, kasse, deko, sport, outlet, service]
    .flatMap((m) => Object.values(m).filter((v) => v && typeof v === 'object' && typeof v.bau === 'function' && typeof v.id === 'string'))
    .concat(SPORT_MIX_MOEBEL)
    .sort((a,b) => a.id.localeCompare(b.id,'de'))
);
if (new Set(ALLE_MOEBEL.map(m=>m.id)).size !== ALLE_MOEBEL.length) {
  throw new Error('Doppelte Möbel-IDs');
}
export const MOEBEL = Object.freeze(Object.fromEntries(ALLE_MOEBEL.map(m=>[m.id,m])));
export function moebel(id) { const eintrag=MOEBEL[id]; if(!eintrag) throw new Error('Unbekanntes Möbel: '+id); return eintrag; }
