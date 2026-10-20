/** N03 – Erfolge: ausschließlich beobachtende, deterministische Spielziele. */
import { GRUPPEN } from './daten';
import { einkaufUebersicht, type EinkaufKennzahlen } from './einkauf';
import type { GameState } from './types';

export const ERFOLGE_AKTIV = true; // Fallback bis N13-Einstellungen integriert ist.
export type ErfolgGruppe = 'Sanierung' | 'Handel' | 'Menschen' | 'Formate' | 'Kurios';
export type ErfolgStufe = 'bronze' | 'silber' | 'gold';
export interface ErfolgStand {
  letztePruefung?: number;
  ohneSchliessung: number;
  ohneStreik: number;
  ohneInsolvenz: number;
  letzteGeschlossen: string[];
  letzteInsolvenzen: number;
  beworbeneBereiche: string[];
}
export interface ErfolgEintrag {
  id: string;
  titel: string;
  gruppe: ErfolgGruppe;
  stufe: ErfolgStufe;
  hinweis: string;
  geheim?: boolean;
  ziel: number;
  /** Prozentuale Erfüllung, auch für noch gesperrte Abzeichen. */
  fortschritt: number;
  freigeschaltet?: number;
}
type Kontext = {
  einkauf: EinkaufKennzahlen;
  ueberlebt: number;
  quartalsUmsatz: number;
  ressorts: number;
  loyalitaet: number;
  positivesHaus: number;
  positivesSporthaus: number;
  positiveStaedte: number;
  premiumSchutz: number;
  geschlossene: number;
  streikfrei: number;
  insolvenzfrei: number;
  marketingBereiche: number;
  formatFundusDb: number;
  formatVolkskaufSaniert: number;
};
type Definition = Omit<ErfolgEintrag, 'ziel' | 'fortschritt' | 'freigeschaltet'> & {
  ziel: number; wert: (s: GameState, k: Kontext) => number;
};
const d = (id: string, titel: string, gruppe: ErfolgGruppe, stufe: ErfolgStufe, hinweis: string,
  ziel: number, wert: Definition['wert'], geheim = false): Definition =>
  ({ id, titel, gruppe, stufe, hinweis, ziel, wert, ...(geheim ? { geheim: true } : {}) });
const bool = (test: (s: GameState, k: Kontext) => boolean): Definition['wert'] => (s, k) => Number(test(s, k));

/** Exakt 30 Ziele in fünf Gruppen, darunter vier geheime. Keine Berechnung verändert den Spielstand. */
export const ERFOLGE: readonly Definition[] = [
  d('plan-angenommen', 'Neustart', 'Sanierung', 'silber', 'Lass einen Insolvenzplan annehmen.', 1, bool(s => s.meldungen.some(m => m.text.startsWith('Insolvenzplan angenommen')))),
  d('erstes-plusquartal', 'Schwarze Zahlen', 'Sanierung', 'silber', 'Erreiche ein Quartal mit positivem EBITDA.', 1, bool(s => s.quartale.some(q => q.start + 13 <= s.woche && q.ebitdaIst > 0))),
  d('schliessungsfrei', '52 Wochen Stabilität', 'Sanierung', 'gold', 'Halte ein Jahr ohne neue Hausschließung durch.', 52, (_s, k) => k.geschlossene),
  d('erste-26', 'Halbes Jahr', 'Sanierung', 'bronze', 'Halte 26 Wochen durch.', 26, (_s, k) => k.ueberlebt),
  d('erste-104', 'Zwei Jahre Zukunft', 'Sanierung', 'silber', 'Halte 104 Wochen durch.', 104, (_s, k) => k.ueberlebt),
  d('erste-260', 'Fünfjahresplan', 'Sanierung', 'gold', 'Führe das Unternehmen fünf Jahre.', 260, (_s, k) => k.ueberlebt),

  d('umschlag-vier', 'Schnelle Regale', 'Handel', 'gold', 'Steigere den jährlichen Lagerumschlag über 4.', 4.01, (_s, k) => k.einkauf.lagerumschlag),
  d('altware-zehn', 'Frisches Sortiment', 'Handel', 'silber', 'Senke die Altware unter 10 % bei mindestens 13 gespielten Wochen.', 1, bool((s, k) => s.woche >= 13 && k.einkauf.altwarenanteil < .1)),
  d('eigenmarken-25', 'Unsere Handschrift', 'Handel', 'gold', 'Erreiche 25 % Eigenmarkenanteil.', .25, (_s, k) => k.einkauf.eigenmarkenAnteil),
  d('nos-95', 'Immer lieferfähig', 'Handel', 'silber', 'Erreiche 95 % NOS-Verfügbarkeit nach 13 Wochen.', 1, bool((s, k) => s.woche >= 13 && k.einkauf.nosVerfuegbarkeit >= .95)),
  d('quartalsumsatz', 'Große Kasse', 'Handel', 'bronze', 'Erziele mindestens 250 Mio. € Umsatz in 13 Wochen.', 250_000_000, (_s, k) => k.quartalsUmsatz),
  d('rohertrag-40', 'Marge zählt', 'Handel', 'gold', 'Erziele eine Rohertragsquote von 40 % nach 13 Wochen.', 1, bool((s, k) => s.woche >= 13 && k.einkauf.rohertragsquote >= .4)),

  d('vorstand-komplett', 'Alle an Bord', 'Menschen', 'silber', 'Besetze alle acht Vorstandsressorts.', 8, (_s, k) => k.ressorts),
  d('betriebsrat-70', 'Vertrauensbasis', 'Menschen', 'silber', 'Erreiche einen Betriebsratswert über 70.', 70.01, s => s.stakeholder.betriebsrat),
  d('streikfrei-52', 'Ein Jahr Arbeitsfrieden', 'Menschen', 'gold', 'Bleibe 52 Wochen ohne Streik.', 52, (_s, k) => k.streikfrei),
  d('betriebsrat-80', 'Starke Sozialpartnerschaft', 'Menschen', 'gold', 'Erreiche einen Betriebsratswert über 80.', 80.01, s => s.stakeholder.betriebsrat),
  d('loyalitaet-70', 'Rückhalt im Vorstand', 'Menschen', 'silber', 'Erreiche durchschnittlich 70 Loyalitätspunkte im Vorstand.', 70, (_s, k) => k.loyalitaet),
  d('sechs-ressorts', 'Führungsteam', 'Menschen', 'bronze', 'Halte mindestens sechs Ressorts 26 Wochen nach Spielstart besetzt.', 1, bool((s, k) => s.woche >= 26 && k.ressorts >= 6)),

  d('fundus-profitabel', 'FUNDUS trägt sich', 'Formate', 'gold', 'Erziele mit FUNDUS einen positiven Deckungsbeitrag.', 1, (_s, k) => Number(k.formatFundusDb > 0)),
  d('volkskauf-saniert', 'Volkskauf saniert', 'Formate', 'gold', 'Sanierung der Volkskauf-Häuser abgeschlossen.', 1, (_s, k) => k.formatVolkskaufSaniert),
  d('premium-verkauft', 'Kronjuwel veräußert', 'Formate', 'silber', 'Verkaufe ein Premium-Haus.', 1, bool(s => s.haeuser.some(h => h.klasse === 'premium' && h.status === 'verkauft'))),
  d('sport-plus', 'Sportlicher Erfolg', 'Formate', 'bronze', 'Mindestens ein Sporthaus erwirtschaftet positiven Deckungsbeitrag.', 1, (_s, k) => Number(k.positivesSporthaus > 0)),
  d('zehn-haeuser-plus', 'Zehn Zugpferde', 'Formate', 'silber', 'Zehn Häuser mit positivem Deckungsbeitrag.', 10, (_s, k) => k.positivesHaus),
  d('premium-geschuetzt', 'Kronjuwelen bewahrt', 'Formate', 'bronze', 'Schütze die Premium-Häuser über 52 Wochen.', 1, bool((s, k) => s.woche >= 52 && k.premiumSchutz === 1)),

  d('weihnachtsquartal', 'Weihnachtswunder', 'Kurios', 'gold', 'Übertreffe im vierten Quartal den Plan um 20 %.', 1, bool(s => s.quartale.some(q => q.nr % 4 === 3 && q.start + 13 <= s.woche &&
    q.ebitdaIst - (q.plan ?? q.planStandard) >= .2 * Math.abs(q.plan ?? q.planStandard))), true),
  d('bibliothek', 'Kultur im Kaufhaus', 'Kurios', 'gold', 'Vermiete eine Hausfläche an eine Bibliothek.', 1,
    bool(s => s.haeuser.some(h => h.flaechen.some(f => f.konzept === 'untermiete' && /bibliothek/i.test(f.mieter?.name ?? '')))), true),
  d('alle-beworben', 'Alles im Prospekt', 'Kurios', 'gold', 'Bewirb alle 16 Sortimentsbereiche einmal gezielt.', Object.keys(GRUPPEN).length, (_s, k) => k.marketingBereiche, true),
  d('fuenf-staedte', 'Starke Standorte', 'Kurios', 'silber', 'Erziele in fünf Städten einen positiven Haus-Deckungsbeitrag.', 5, (_s, k) => k.positiveStaedte),
  d('liquiditaet', 'Volle Kriegskasse', 'Kurios', 'silber', 'Erreiche 250 Mio. € freie Liquidität.', 250_000_000, s => s.cash + s.kreditlinie),
  d('insolvenzfrei', 'Ruhe nach dem Sturm', 'Kurios', 'gold', 'Bleibe 52 Wochen ohne neuen Insolvenzantrag.', 52, (_s, k) => k.insolvenzfrei, true),
];

const leererVerlauf = (s: GameState): ErfolgStand => ({
  ohneSchliessung: 0, ohneStreik: 0, ohneInsolvenz: 0,
  letzteGeschlossen: s.haeuser.filter(h => ['geschlossen', 'verkauft'].includes(h.status)).map(h => h.id),
  letzteInsolvenzen: s.insolvenzenGesamt, beworbeneBereiche: [],
});
const aktiv = (s: GameState) => ERFOLGE_AKTIV && s.erfolgeAktiv !== false;

/** Nur Erfolge-Zustand; weder RNG noch Cash, Personal, Prognose oder sonstiges Balancing werden verändert. */
export function erfolgeWoche(s: GameState): string[] {
  if (s.prognose || !aktiv(s)) return [];
  const v = s.erfolgeVerlauf ?? (s.erfolgeVerlauf = leererVerlauf(s));
  if (v.letztePruefung === s.woche) return [];
  v.letztePruefung = s.woche;
  s.erfolge ??= {};
  const geschlossen = s.haeuser.filter(h => ['geschlossen', 'verkauft'].includes(h.status)).map(h => h.id);
  v.ohneSchliessung = geschlossen.some(id => !v.letzteGeschlossen.includes(id)) ? 0 : v.ohneSchliessung + 1;
  v.letzteGeschlossen = geschlossen;
  v.ohneStreik = s.haeuser.some(h => h.streikBis !== undefined && h.streikBis >= s.woche - 1) ? 0 : v.ohneStreik + 1;
  v.ohneInsolvenz = s.insolvenzenGesamt > v.letzteInsolvenzen ? 0 : v.ohneInsolvenz + 1;
  v.letzteInsolvenzen = s.insolvenzenGesamt;
  const zielBereiche = new Set(Object.keys(GRUPPEN));
  const erreicht = new Set(v.beworbeneBereiche);
  for (const a of s.marketing.aktionen) if (a.start <= s.woche - 1 && a.ende > s.woche - 1 && !a.standard)
    for (const g of a.bereiche ?? (a.wg ? [a.wg.split('.')[0]] : [])) if (zielBereiche.has(g)) erreicht.add(g);
  v.beworbeneBereiche = [...erreicht].sort();
  const neu: string[] = [];
  const k = kontext(s);
  for (const def of ERFOLGE) {
    if (Object.prototype.hasOwnProperty.call(s.erfolge, def.id)) continue;
    if (def.wert(s, k) >= def.ziel) {
      s.erfolge[def.id] = s.woche;
      neu.push(def.id);
    }
  }
  return neu;
}

/** Die Abfrage ist read-only und erzeugt auch bei älteren Spielständen keine Einträge. */
export function erfolgeUebersicht(s: GameState): ErfolgEintrag[] {
  if (!aktiv(s)) return [];
  const k = kontext(s);
  return ERFOLGE.map(({ wert, ...d }) => ({
    ...d, fortschritt: Math.min(1, Math.max(0, wert(s, k) / d.ziel)),
    ...(s.erfolge && Object.prototype.hasOwnProperty.call(s.erfolge, d.id) ? { freigeschaltet: s.erfolge[d.id] } : {}),
  }));
}

function kontext(s: GameState): Kontext {
  const v = s.erfolgeVerlauf;
  const hausPlus = s.haeuser.filter(h => h.status === 'offen' && (h.kpi?.db ?? 0) > 0);
  const ress = Object.values(s.vorstand.ressorts);
  const besetzt = ress.filter(r => !!r.person);
  // Die Format-Engine wird separat angebunden. Ohne echte Engine-Daten keine erfundenen Erfolge.
  const formate = s.formatErfolge;
  return {
    einkauf: einkaufUebersicht(s).summe.kennzahlen,
    ueberlebt: s.woche,
    quartalsUmsatz: s.historie.slice(-13).reduce((sum, k) => sum + k.umsatz, 0),
    ressorts: besetzt.length,
    loyalitaet: besetzt.length ? besetzt.reduce((sum, r) => sum + (r.person?.loyalitaet ?? 0), 0) / besetzt.length : 0,
    positivesHaus: hausPlus.length,
    positivesSporthaus: hausPlus.filter(h => h.format === 'sport').length,
    positiveStaedte: new Set(hausPlus.map(h => h.stadt)).size,
    premiumSchutz: Number(s.premiumSchuetzen !== false),
    geschlossene: v?.ohneSchliessung ?? 0,
    streikfrei: v?.ohneStreik ?? 0,
    insolvenzfrei: v?.ohneInsolvenz ?? 0,
    marketingBereiche: v?.beworbeneBereiche.length ?? 0,
    formatFundusDb: formate?.fundusDb ?? 0,
    formatVolkskaufSaniert: Number(formate?.volkskaufSaniert === true),
  };
}
