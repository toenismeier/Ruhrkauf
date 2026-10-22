// Q21: Eine stabile, vom Renderablauf unabhängige Warenhaus-Silhouette je Stadt.
// Die acht vorhandenen Fassadenvarianten jeder Familie bleiben der einzige Geometrie-Baukasten.
import { familieVon, istOstHaus, VARIANTEN } from './warenhaus.js';

const WEST = [1, 2, 3, 4, 5, 8, 9, 10, 11];
const OST = [8, 9, 10, 11, 3, 4, 5, 2, 1];
// #31: Familie 5 hat 12, Familie 6 hat 16 Fassadenvarianten (VARIANTEN), alle übrigen 8.
const stadtHash = (t) => [...String(t)].reduce((a, c) => (a * 31 + c.codePointAt(0)) >>> 0, 7);
const normal = (n, N = 8) => ((n % N) + N) % N;

/**
 * Gibt je regulärem Hartwig-Haus { familie, fassade } zurück.
 * - Zunächst immer eine noch nicht verwendete Familie pro Stadt.
 * - Erst wenn alle geeigneten Familien vergeben sind, eine andere der acht
 *   Fassadenvarianten; Familie+Variante wiederholt sich erst nach 80 Häusern.
 * - Sortierung nach Haus-ID, unabhängig von Parzellen-/Render-Reihenfolge.
 * - Familie 6 bleibt echten Center-Standorten vorbehalten.
 * - Premiumhäuser haben eigene Modelle und werden nicht verändert.
 */
/** Zulässige Familien eines regulären Hartwig-Hauses in Vorzugsreihenfolge (Engine-Wunsch zuerst). */
export function familienKandidaten(h) {
  const basis = istOstHaus(h) ? OST : WEST, rot = stadtHash(h.stadt) % basis.length;
  return [...new Set([familieVon(h), ...basis.slice(rot), ...basis.slice(0, rot)])];
}

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
      // #31: Ausweichfamilien je Stadt rotiert, damit dichte Regionen (Ruhrgebiet) nicht alle auf Familie 1/2 landen
      // und die 50-km-Kopienregel mit acht Varianten je Familie erfüllbar bleibt.
      const kandidaten = familienKandidaten(h);
      // Center hat nur eine Mall-Kopfbauform. Weitere Häuser verwenden
      // Innenstadt-/Stadtteil-Bauformen statt identischer Parkplatz-Boxen.
      // #31: vom Export festgelegte Familie (fassaden-verteilen.js, Kopienregel) hat Vorrang, solange sie in der Stadt frei ist.
      const familie = (h.familie != null && !familien.has(h.familie) ? h.familie : null)
        ?? kandidaten.find((f) => !familien.has(f))
        ?? kandidaten.find((f) => [...Array(VARIANTEN(f)).keys()].some((v) => !kombinationen.has(`${f}/${v}`)))
        ?? wunsch;
      const N = VARIANTEN(familie);
      const start = normal(h.fassade ?? 0, N);
      let fassade = start;
      for (let k = 0; k < N; k++) {
        const v = (start + k) % N;
        if (!kombinationen.has(`${familie}/${v}`)) { fassade = v; break; }
      }
      familien.add(familie);
      kombinationen.add(`${familie}/${fassade}`);
      ergebnis.set(h.id, { familie, fassade });
    }
  }
  return ergebnis;
}
