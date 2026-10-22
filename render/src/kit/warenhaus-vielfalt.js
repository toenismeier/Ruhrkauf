// Q21: Eine stabile, vom Renderablauf unabhängige Warenhaus-Silhouette je Stadt.
// Die acht vorhandenen Fassadenvarianten jeder Familie bleiben der einzige Geometrie-Baukasten.
import { familieVon, istOstHaus } from './warenhaus.js';

const WEST = [1, 2, 3, 4, 5, 8, 9, 10, 11];
const OST = [8, 9, 10, 11, 3, 4, 5, 2, 1];
const normal = (n) => ((n % 8) + 8) % 8;

/**
 * Gibt je regulärem Hartwig-Haus { familie, fassade } zurück.
 * - Zunächst immer eine noch nicht verwendete Familie pro Stadt.
 * - Erst wenn alle geeigneten Familien vergeben sind, eine andere der acht
 *   Fassadenvarianten; Familie+Variante wiederholt sich erst nach 80 Häusern.
 * - Sortierung nach Haus-ID, unabhängig von Parzellen-/Render-Reihenfolge.
 * - Familie 6 bleibt echten Center-Standorten vorbehalten.
 * - Premiumhäuser haben eigene Modelle und werden nicht verändert.
 */
export function warenhausVielfalt(haeuser) {
  const gruppen = new Map();
  for (const h of haeuser) {
    if (h.format !== 'warenhaus' || h.klasse === 'premium') continue;
    if (!gruppen.has(h.stadt)) gruppen.set(h.stadt, []);
    gruppen.get(h.stadt).push(h);
  }
  const ergebnis = new Map();
  for (const [, liste] of gruppen) {
    const familien = new Set();
    const kombinationen = new Set();
    for (const h of [...liste].sort((a, b) => a.id.localeCompare(b.id, 'de'))) {
      const wunsch = familieVon(h);
      const kandidaten = [...new Set([wunsch, ...(istOstHaus(h) ? OST : WEST)])];
      // Center hat nur eine Mall-Kopfbauform. Weitere Häuser verwenden
      // Innenstadt-/Stadtteil-Bauformen statt identischer Parkplatz-Boxen.
      const familie = kandidaten.find((f) => !familien.has(f))
        ?? kandidaten.find((f) => [...Array(8).keys()].some((v) => !kombinationen.has(`${f}/${v}`)))
        ?? wunsch;
      const start = normal(h.fassade ?? 0);
      let fassade = start;
      for (let k = 0; k < 8; k++) {
        const v = (start + k) % 8;
        if (!kombinationen.has(`${familie}/${v}`)) { fassade = v; break; }
      }
      familien.add(familie);
      kombinationen.add(`${familie}/${fassade}`);
      ergebnis.set(h.id, { familie, fassade });
    }
  }
  return ergebnis;
}
