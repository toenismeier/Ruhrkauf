// Sechs echte Städte mit allen Standorten (Hartwig rot, Hartwig Sport grün, Wettbewerber grau), jeweils ganze Stadt.
// Querformat-Kacheln mit stadtRahmen(): die Stadt füllt die Kachel.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
// Metropolen mit den meisten Häusern, Großstädte mit 2 Warenhäusern + Sport, Großstadt 1 + 1, Mittelstadt mit 1
const eintraege = ['Berlin', 'München', 'Bremen', 'Essen', 'Kiel', 'Flensburg'].map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Standorte: sechs Städte', spalten: 2, kachel: STADT_KACHEL, rand: 1.03 }), 20));
