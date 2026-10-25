// Q37: Kategorie Anlass im Sortimentsbaum (eigene Äste je Anlass, die Artikeltypen bleiben zusätzlich an ihrem Stammplatz).
// Ein Produkt, das für einen Anlass entwickelt wird, trägt `anlass` und verkauft sich mit Saisonspitzen
// (Konfirmation März bis Juni, Abiball Mai bis Juli, Hochzeitsgäste bis September, Bälle und Feiern Herbst bis Winter,
// Volksfest September und Oktober). Ohne Anlass bleibt jedes Produkt wirtschaftlich unverändert.
// Neue Anlass-Typen (Q39 bis Q41) tragen das Feld `anlass` im Artikeltyp; vorhandene stehen in ANLASS_TYPEN.
// Keine Kinder-Festmode (keine Referenz). Anlassmode gilt ausdrücklich auch für Teens (E45), figurbetonte Partykleider nicht.

export const ANLAESSE = [
  { id: 'abiball', name: 'Abiball', monate: [5, 6, 7] },
  { id: 'tanzschulball', name: 'Tanzschulball und Feiern', monate: [10, 11, 12, 1] },
  { id: 'konfirmation', name: 'Konfirmation, Jugendweihe, Firmung', monate: [3, 4, 5, 6] },
  { id: 'feier', name: 'Oper, Familienfeier, Hochzeitsgast', monate: [5, 6, 7, 8, 9, 12] },
  { id: 'tracht', name: 'Volksfest und Tracht', monate: [9, 10] },
  { id: 'braut', name: 'Hochzeit (Braut)', monate: [3, 4, 5, 6, 7, 8, 9] },
  { id: 'zubehoer', name: 'Zubehör', monate: [] as number[] },
] as const;
export type AnlassId = (typeof ANLAESSE)[number]['id'];
export const ANLASS_NAME = Object.fromEntries(ANLAESSE.map((a) => [a.id, a.name])) as Record<AnlassId, string>;
export const istAnlass = (x: unknown): x is AnlassId => ANLAESSE.some((a) => a.id === x);

/** Vorhandene Artikeltypen je Anlass (Referenz: auftraege/wurf4/daten/anlass-zuordnung.csv, ergänzt um klassische Festteile). */
export const ANLASS_TYPEN: Record<AnlassId, readonly string[]> = {
  abiball: ['Abendkleid', 'Maxikleid', 'Satin-Slipdress', 'Jumpsuit', 'Stoffhose', 'Hemd', 'Blazer', 'Anzug', 'Anzugweste', 'Krawatte', 'Fliege', 'Einstecktuch',
    'Slingpumps', 'Pumps', 'Mule', 'Riemchensandale', 'Keilsandalette', 'Abendtasche', 'Clutch'],
  tanzschulball: ['Abendkleid', 'Minikleid', 'Maxikleid', 'Satin-Slipdress', 'Bodycon-Kleid', 'Etuikleid', 'Jumpsuit', 'Corsagen-Top', 'Neckholder-Top', 'Glitzer-Top',
    'Minirock', 'Satin-Midirock', 'Hemd', 'Stoffhose', 'Blazer', 'Anzug', 'Krawatte', 'Fliege', 'Slingpumps', 'Pumps', 'Mule', 'Riemchensandale', 'Clutch', 'Abendtasche'],
  konfirmation: ['Minikleid', 'Satin-Slipdress', 'Etuikleid', 'Jumpsuit', 'Bluse', 'Hemd', 'Stoffhose', 'Blazer', 'Anzug', 'Anzugweste', 'Krawatte', 'Fliege', 'Ballerina', 'Pumps'],
  feier: ['Etuikleid', 'Satin-Slipdress', 'Bodycon-Kleid', 'Maxikleid', 'Satin-Midirock', 'Corsagen-Top', 'Neckholder-Top', 'Bluse', 'Hemd', 'Stoffhose', 'Blazer',
    'Anzug', 'Anzughose', 'Anzugweste', 'Tweed-Sakko', 'Leinen-Sakko', 'Krawatte', 'Einstecktuch', 'Fliege', 'Slingpumps', 'Pumps', 'Mule', 'Riemchensandale',
    'Keilsandalette', 'Clutch', 'Abendtasche'],
  tracht: [],
  braut: [],
  zubehoer: ['Choker', 'Clutch', 'Abendtasche', 'Schultertasche', 'Ohrringe', 'Brosche', 'Armband', 'Gürtel', 'Handtasche', 'Parfum', 'Fliege', 'Einstecktuch', 'Krawatte'],
};

/** Für Teens nicht angeboten, auch wenn der Typ in einem Anlass steht (E45: figurbetontes Partykleid). */
export const ANLASS_NICHT_TEENS: ReadonlySet<string> = new Set(['Bodycon-Kleid']);

// Saisonkurve je Anlass: Spitzenmonate 1,8, sonst 0,55; auf ein Jahresmittel von 1 normiert (Wochen nach Kalender, wie saisonFaktor).
const SPITZE = 1.8;
const RUHE = 0.55;
function monatsKurve(monate: readonly number[]): number[] {
  const roh = Array.from({ length: 12 }, (_, i) => (monate.includes(i + 1) ? SPITZE : RUHE));
  const m = roh.reduce((a, b) => a + b, 0) / 12;
  return roh.map((x) => x / m);
}
const KURVEN: Record<AnlassId, number[]> = Object.fromEntries(ANLAESSE.map((a) => [a.id, a.monate.length ? monatsKurve(a.monate) : []])) as Record<AnlassId, number[]>;
// Zubehör begleitet alle Anlässe: Mittel der übrigen Kurven
KURVEN.zubehoer = Array.from({ length: 12 }, (_, i) => {
  const l = ANLAESSE.filter((a) => a.id !== 'zubehoer').map((a) => KURVEN[a.id][i]);
  return l.reduce((a, b) => a + b, 0) / l.length;
});

/** Nachfragefaktor eines Anlassprodukts in der Woche (Jahresmittel 1). */
export function anlassFaktor(anlass: AnlassId, woche: number): number {
  const k = KURVEN[anlass];
  if (!k?.length) return 1;
  const pos = (((woche % 52) + 52) % 52) / 52 * 12;
  const i = Math.floor(pos);
  const t = pos - i;
  return k[i % 12] + (k[(i + 1) % 12] - k[i % 12]) * t;
}

/** Spitzenmonate als Text („Mai bis Juli“). */
const MONAT = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export function anlassSaisonText(anlass: AnlassId): string {
  const a = ANLAESSE.find((x) => x.id === anlass);
  if (!a || !a.monate.length) return 'ganzjährig zu allen Anlässen';
  const m = [...a.monate].sort((x, y) => x - y);
  // zusammenhängende Läufe (Jahreswechsel berücksichtigt)
  const laeufe: number[][] = [];
  for (const x of m) { const l = laeufe[laeufe.length - 1]; if (l && (x === l[l.length - 1] + 1)) l.push(x); else laeufe.push([x]); }
  if (laeufe.length > 1 && laeufe[0][0] === 1 && laeufe[laeufe.length - 1].at(-1) === 12) laeufe[0] = [...laeufe.pop()!, ...laeufe[0]];
  return laeufe.map((l) => (l.length === 1 ? MONAT[l[0] - 1] : `${MONAT[l[0] - 1]} bis ${MONAT[l[l.length - 1] - 1]}`)).join(' und ');
}
