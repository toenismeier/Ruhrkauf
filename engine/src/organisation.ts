// O08 Übergangsschnittstelle zu O01. Wird beim Rebase durch die vollständige Organisation ersetzt.
import type { GameState } from './types';
import type { RessortId } from './vorstand';
export type BereichId = string;
export interface Hauscluster { id: string; name: string; hausIds: string[] }
export interface VorlageEingabe {
  titel: string; text: string; bereich?: BereichId; hauscluster?: string; frist?: number;
  optionen?: { id: string; label: string }[]; standard?: string; grundsaetzlich?: boolean;
}
export function bereichsQualitaet(_s: GameState, _b: BereichId): number { return 0.7; }
export function berichtetAn(_s: GameState, _b: BereichId): 'spieler' | RessortId { return 'spieler'; }
export function hausclusterVon(_s: GameState, _hausId: string): Hauscluster | undefined { return undefined; }
export function clusterleitungQualitaet(_s: GameState, _hcId: string): number { return 0.7; }
export function neueVorlage(s: GameState, v: VorlageEingabe): void {
  if (s.prognose) return;
  s.entscheidungen.push({
    id: 'umbau-v-' + (++s.zaehler), typ: 'organisation_vorlage', woche: s.woche, frist: s.woche + (v.frist ?? 3),
    titel: v.titel, text: v.text, optionen: v.optionen ?? [{id:'vorschlag',label:'Vorschlag übernehmen'},{id:'ablehnen',label:'Ablehnen'}],
    standard: v.standard ?? 'vorschlag', daten: { bereich:v.bereich ?? '', hauscluster:v.hauscluster ?? '' },
  });
}
