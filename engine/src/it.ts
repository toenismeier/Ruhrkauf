// O01/O03 Schnittstelle: solange O03 nicht umgesetzt ist, sind IT-Effekte neutral.
import type { GameState } from './types';
import type { BereichId } from './organisation';
export function itDeckel(_s: GameState, _bereich: BereichId): number { return 1; }
