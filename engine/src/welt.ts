import { initialisiereWare } from './merchandise';
import {
  CLUSTER_FAKTOR, GRUPPEN, LAGE_FAKTOR, LIEFERANTEN, NACHNAMEN, STAEDTE, STANDORT_ZUSATZ, VERMIETER, VORNAMEN,
  BERATER, PREMIUM_HAEUSER, gruppenFuer,
} from './daten';
import type { Cluster, Flaeche, Format, GameState, GruppeId, Haus, Kohorte, Lage, Region } from './types';
import { initialisierePlanung } from './planung';
import { chance, clamp, eur, ganzZwischen, waehle, zwischen, type RngHalter } from './util';
import { erzeugeHq, hqAktualisiere, neueHqAngebote } from './hq';
import { erzeugeEinkauf, initialisiereEinkauf } from './einkauf';
import { erzeugeEigenmarken } from './eigenmarken';
import { erzeugeVorstand, vorstandKostenWoche } from './vorstand';
import { erzeugeProdukte } from './produkte';
import { erzeugeMarketing, initialisiereMarketing } from './marketing';
import { SCHWIERIGKEIT, type SchwierigkeitId } from './schwierigkeit';
import { initialisiereWettbewerb } from './wettbewerb';
import { ALT_WARENHAUS_STAEDTE, ALT_SPORT_STAEDTE } from './massstab-alt';
import { kennzeichnePremium, premiumProfil } from './premium';
import { erzeugeEcommerce } from './ecommerce';
import { chronikInitialisieren } from './chronik';
import { szenarioStart, type SzenarioId, type SzenarioRegeln } from './szenarien';
import { bildeHauscluster } from './organisation';
import { marktbeobachtungStart } from './marktbeobachtung';
// O03 IT
import { initialisiereIt } from './it';
// O07 Haus
import { initialisiereHausbetrieb } from './haus';
import { initialisiereUmbau } from './umbau';

export interface Szenario {
  warenhaeuser: number;
  sporthaeuser: number;
  premiumhaeuser?: number;
  /** A/B-Vergleich: Premiumhäuser deaktivieren. */
  premiumDeaktiviert?: boolean;
  schwesterhaeuser?: number;
  outlethaeuser?: number;
  startCash: number;
  kreditlinie: number;
  firma: string;
  sportName: string;
  startJahr: number;
  /** Schwierigkeit (Standard mittel = Kalibrierung). */
  schwierigkeit?: SchwierigkeitId;
  /** Nur Nice-to-have: nicht gesetzt heißt unveränderte Standardpartie. */
  szenarioId?: SzenarioId;
  szenarioRegeln?: SzenarioRegeln;
}

/** Phase 2: wirtschaftliche Soll-Größen der aktiven Formate (Euro p.a., Seed 1–3).
 * Die Werte für A/B/C folgen 48/30/17 Mio. Euro je Haus und werden auf
 * 8.950 Mio. Euro Gesamtnetz skaliert. Schwester und FUNDUS sind nur Daten.
 */
export const UMSATZZIELE_JAHR1 = {
  A: 8_950_000_000 * (45 * 48) / (45 * 48 + 115 * 30 + 200 * 17),
  B: 8_950_000_000 * (115 * 30) / (45 * 48 + 115 * 30 + 200 * 17),
  C: 8_950_000_000 * (200 * 17) / (45 * 48 + 115 * 30 + 200 * 17),
  // P005 erhöht den alten Anker um 20.000 m² × 1,52 relativ zur Leistung von P001–P004.
  // Andere Klassen bleiben bei ihren Referenzwerten; keine Gutschrift in der GuV.
  premium: Math.round(820_000_000 * (1 + (20_000 * 1.52) /
    (30_000 * 1.55 * 2 + 18_000 * 1.52 + 14_000 * 1.45))),
  sport: 545_000_000,
} as const;

type AktiveKlasse = keyof typeof UMSATZZIELE_JAHR1;

/** Premium-Kalibrierung (Ummo 21.10.2026: „klar besser als Schnitt“, Ziel etwa +4 bis +6 % Haus-EBITDA). */
const PREMIUM_PERSONALQUOTE = 0.13;
const PREMIUM_MIETFAKTOR = 1.3;

function umsatzklasse(h: Haus): AktiveKlasse | undefined {
  if (h.nurDaten) return undefined;
  if (h.format === 'sport') return 'sport';
  if (h.klasse === 'premium') return 'premium';
  if (h.hausklasse) return h.hausklasse;
  throw new Error(`Aktivem Haus ${h.id} fehlt die Hausklasse`);
}

/** Die Hausgrößen bleiben unterschiedlich; nur die Nachfrage je Klasse wird
 * auf die Konzernziele normiert. Miete und Startpersonal ziehen proportional
 * zum Umsatzpotenzial nach. Keine Zuschüsse über die Spiel-GuV.
 */
function kalibriereStandortumsatz(haeuser: Haus[]): void {
  const basis = new Map<Haus, number>();
  const summen: Record<AktiveKlasse, number> = { A: 0, B: 0, C: 0, premium: 0, sport: 0 };
  for (const haus of haeuser) {
    const klasse = umsatzklasse(haus);
    if (!klasse) continue;
    let x = 0;
    for (const [g, p] of Object.entries(haus.potenzial) as [GruppeId, number][]) {
      const qm = haus.flaechen.filter((f) => f.gruppe === g).reduce((a, f) => a + f.qm, 0);
      x += p * (1 - Math.exp(-qm / (haus.saettigungQm[g] ?? 1)));
    }
    basis.set(haus, x);
    summen[klasse] += x;
  }
  for (const haus of haeuser) {
    const klasse = umsatzklasse(haus);
    if (!klasse) continue;
    const faktor = UMSATZZIELE_JAHR1[klasse] / (52 * Math.max(1, summen[klasse]));
    const alt = basis.get(haus) ?? 0;
    const qm = haus.flaechen.filter((f) => f.konzept === 'eigen').reduce((a, f) => a + f.qm, 0);
    const bedarfAlt = qm / PARAM.qmJeFte + alt / PARAM.umsatzJeFte;
    const bedarfNeu = qm / PARAM.qmJeFte + (alt * faktor) / PARAM.umsatzJeFte;
    const personalFaktor = bedarfNeu / Math.max(1, bedarfAlt);
    for (const g of Object.keys(haus.potenzial) as GruppeId[]) haus.potenzial[g]! *= faktor;
    haus.miete.mieteWoche = eur(haus.miete.mieteWoche * faktor);
    haus.personal.vollzeit *= personalFaktor;
    haus.personal.teilzeit *= personalFaktor;
    haus.personal.aushilfen *= personalFaktor;
    // M7: Hartwig folgt der realen Referenz für Personal und Miete. Die
    // Hausgröße (und damit die Kostenbasis) bleibt individuell. Statt einer
    // GuV-Gutschrift werden reale FTE und Mietverträge umgerechnet.
    const jahresBasis = (alt * faktor) * 52;
    const realisierung = haus.klasse === 'premium' ? 1.06 : haus.format === 'sport' ? 0.95 : 1;
    // Näherung an realisierten Umsatz; als Kalibrierannahme explizit dokumentiert.
    const wocheBasis = jahresBasis / 52 * 1.02 * realisierung;
    const zielPersonal = wocheBasis * 0.16 * (haus.klasse === 'premium' ? 1.08 : haus.format === 'sport' ? 0.94 : 1);
    const istPersonal = haus.personal.vollzeit * PARAM.lohnVollzeit
      + haus.personal.teilzeit * PARAM.lohnTeilzeit + haus.personal.aushilfen * PARAM.lohnAushilfe;
    const profil = haus.klasse === 'premium' ? premiumProfil(haus.premiumSchluessel) : undefined;
    // Premium (Ummo 21.10.): klar besser als der Schnitt. Höhere Flächenproduktivität
    // senkt die Personalquote; die eigene Immobilie trägt einen kalkulatorischen Mietansatz.
    const premiumPersonal = profil ? PREMIUM_PERSONALQUOTE / 0.16 / 1.08 * (1.55 / profil.produktivitaet) : 1;
    const besetzung = profil ? (zielPersonal * premiumPersonal) / Math.max(1, istPersonal)
      : Math.max(0.4, Math.min(1.4, zielPersonal / Math.max(1, istPersonal)));
    haus.personal.vollzeit *= besetzung;
    haus.personal.teilzeit *= besetzung;
    haus.personal.aushilfen *= besetzung;
    haus.miete.mieteWoche = eur(profil ? wocheBasis * profil.mietQuote * PREMIUM_MIETFAKTOR
      : wocheBasis * 0.112 * (haus.format === 'sport' ? 0.96 : 1));
    // Bestehende Entgeltverträge: Verkaufspartner buchen Werbeträger auf
    // bespielter Eigen-/Kommissionsfläche, Dienstleister vergüten die
    // tatsächlich am POS abgewickelten Servicevorgänge. WKZ und die aus
    // O07 entstehenden Konzessions-/Untermietverträge bleiben separat.
    // Der Vertragspreis folgt dem Standortpotenzial, die spätere Vergütung
    // folgt jedoch ausschließlich genutzter Fläche bzw. echten Bons.
    const werbeBasisQm = haus.flaechen.filter((f) =>
      f.konzept === 'eigen' || f.konzept === 'kommission' || f.konzept === 'offprice')
      .reduce((sum, f) => sum + f.qm, 0);
    const werbeflaecheQm = Math.round(werbeBasisQm * 0.075);
    haus.nebenvertrag = {
      werbeflaecheQm,
      werbeEuroJeQmWoche: wocheBasis * 0.00875 / Math.max(1, werbeflaecheQm),
      dienstleistungEuroJeBon: 1.03,
      durchschnittsBonEuro: 88,
    };
    // Verträge vom Typ net enthalten NK; bei anderen Verträgen werden
    // tatsächlich abgerechnete €/qm umgestellt, keine simulierte Ertragsposition.
    if (haus.miete.netTyp !== 'net') {
      const qm = haus.flaechen.filter((f) => f.konzept !== 'untermiete').reduce((a, f) => a + f.qm, 0);
      haus.miete.nebenkostenQmWoche = wocheBasis * 0.019 / Math.max(1, qm);
    }
  }
}

export const STANDARD_SZENARIO: Szenario = {
  warenhaeuser: 360,
  sporthaeuser: 44,
  premiumhaeuser: 5,
  schwesterhaeuser: 86,
  outlethaeuser: 66,
  // Liquidität analog zum 3,3-fachen Umsatz gegenüber dem alten 130er-Maßstab.
  startCash: 400_000_000,
  kreditlinie: 300_000_000,
  firma: 'Hartwig & Brehm Warenhaus AG',
  sportName: 'Hartwig Sport',
  startJahr: 2027,
};

/** Kosten- und Strukturparameter, zentral für das Balancing. */
export const PARAM = {
  lohnVollzeit: 1_050, // € je FTE und Woche inkl. Nebenkosten
  lohnTeilzeit: 990,
  lohnAushilfe: 600,
  // M7 Referenz: Produktivität zum Start dem Ziel 16 % Personalquote
  // anpassen. Die früheren 430 qm / 6.300 € je FTE führten bei
  // 16 % Lohnkosten zu Unterbesetzung und künstlich fehlendem Umsatz.
  // Personalbedarf UND Anfangs-FTE werden mit derselben Norm ermittelt.
  qmJeFte: 620,
  umsatzJeFte: 9_000,
  sonstigeQuote: 0.016,
  sonstigeQm: 0.45,
  // Filial-GuV Referenz: Distribution/Transport/Filiallogistik 6,3 %.
  logistikQuote: 0.063,
  nebenkostenQm: [1.0, 1.5] as [number, number],
  // Die Zentrale nutzt bei 408 aktiven Häusern Größenvorteile.
  zentraleQuote: 0.030,
  marketingQuote: 0.018, // IST Werbung Filialebene 1,8 % statt historisch 2,5 %
  zinsSatz: 0.08,
  konzessionsQuote: 0.22,
  kommissionsMarge: 0.25,
  bestandsReichweite: 11,
  kvLimitBasis: 1_260_000_000,
  abfindungRegulaer: 28_000,
  abfindungInsolvenz: 7_500,
};

function grossFuerCluster(h: RngHalter, c: Cluster, f: Format, hausklasse?: 'A' | 'B' | 'C' | 'premium'): number {
  if (hausklasse === 'premium') return Math.round(zwischen(h, 18000, 28000) / 100) * 100;
  if (hausklasse === 'A') return Math.round(zwischen(h, 15000, 25000) / 100) * 100;
  if (hausklasse === 'B') return Math.round(zwischen(h, 8000, 15000) / 100) * 100;
  if (hausklasse === 'C') return Math.round(zwischen(h, 3500, 8000) / 100) * 100;
  if (f === 'outlet') return Math.round(zwischen(h, 1800, 5000) / 100) * 100;
  if (f === 'schwester') return Math.round(zwischen(h, 4000, 10000) / 100) * 100;
  if (f === 'sport') return Math.round(zwischen(h, 1500, 5500) / 50) * 50;
  if (c === 'metropole') return Math.round(zwischen(h, 14000, 28000) / 100) * 100;
  if (c === 'grossstadt') return Math.round(zwischen(h, 8000, 17000) / 100) * 100;
  return Math.round(zwischen(h, 5000, 9500) / 100) * 100;
}

function lageFuer(h: RngHalter, c: Cluster, f: Format): Lage {
  const r = zwischen(h, 0, 1);
  if (f === 'sport') return r < 0.55 ? '1a' : r < 0.85 ? 'center' : 'b';
  if (f === 'outlet') return r < 0.7 ? 'rand' : 'b';
  if (f === 'schwester') return r < 0.65 ? '1a' : r < 0.9 ? 'b' : 'center';
  if (c === 'metropole') return r < 0.75 ? '1a' : 'center';
  if (c === 'grossstadt') return r < 0.6 ? '1a' : r < 0.85 ? 'b' : 'center';
  return r < 0.4 ? '1a' : r < 0.8 ? 'b' : r < 0.9 ? 'center' : 'rand';
}

function fit(g: GruppeId, kaufkraft: number, alter: number, wettbewerb: number): number {
  const d = GRUPPEN[g];
  return Math.pow(kaufkraft, d.kkElast) * Math.pow(alter, d.alterElast) * (1 - 0.25 * wettbewerb);
}

export const gruppenFit = fit;

function bauFlaechen(h: RngHalter, id: string, f: Format, vkQm: number, etagen: number[]): Flaeche[] {
  if (f === 'schwester') {
    // Vollständiger, flächengewichteter Warenhausmix als Stammdaten.
    // Keine RNG-Aufrufe: Volkskauf verändert nicht die übrigen Standortparameter.
    const gruppen = gruppenFuer(f);
    const summeAnteile = gruppen.reduce((sum, g) => sum + GRUPPEN[g].anteilFlaeche, 0);
    let verbleibend = vkQm;
    return gruppen.map((g, i) => {
      const qm = i === gruppen.length - 1
        ? verbleibend
        : Math.max(1, Math.round(vkQm * GRUPPEN[g].anteilFlaeche / summeAnteile));
      verbleibend -= qm;
      return { id: `${id}-f${i + 1}`, etage: etagen[i % etagen.length], qm, konzept: 'eigen' as const, gruppe: g };
    });
  }
  if (f === 'outlet') {
    // FUNDUS ist bis Phase 3 nur Stammdatensatz, benötigt aber bereits reale
    // Abteilungsflächen für den Grafik-/Ladenbau. "schuhe" ist ein reines
    // Render-Sortiment und noch keine simulierte Warengruppe.
    const sortimente = ['damen', 'herren', 'kinder', 'schuhe', 'accessoires', 'wohnen', 'beauty'] as const;
    return sortimente.map((gruppe, i) => ({
      id: `${id}-f${i + 1}`, etage: etagen[i % etagen.length],
      qm: Math.round(vkQm / sortimente.length), konzept: 'eigen' as const,
      gruppe: gruppe as GruppeId,
    }));
  }
  const gruppen = gruppenFuer(f);
  // Anteile leicht variieren
  const roh = gruppen.map((g) => GRUPPEN[g].anteilFlaeche * zwischen(h, 0.75, 1.25));
  const sum = roh.reduce((a, b) => a + b, 0);
  const qm = roh.map((x) => (x / sum) * vkQm);
  // Etagen von oben nach unten befüllen, Reihenfolge wie im Warenhaus typisch
  const reihenfolgeWH: GruppeId[] = ['food', 'beauty', 'accessoires', 'damen', 'waesche', 'herren', 'kinder', 'sport', 'spielwaren', 'wohnen'];
  const reihenfolgeSport: GruppeId[] = ['sportschuhe', 'sporttextil', 'outdoor', 'teamsport', 'rad', 'wintersport'];
  const reihenfolge = f === 'sport' ? reihenfolgeSport : reihenfolgeWH;
  // EG zuerst, dann OGs, UG zuletzt (Food ins UG wenn vorhanden)
  const etagenOrdnung = [...etagen.filter((e) => e >= 0).sort((a, b) => a - b), ...etagen.filter((e) => e < 0)];
  const proEtage = vkQm / etagen.length;
  const fl: Flaeche[] = [];
  let etIdx = 0;
  let frei = proEtage;
  let n = 0;
  const reihe = [...reihenfolge];
  if (f === 'warenhaus' && etagen.includes(-1)) {
    // Food ins UG
    reihe.splice(reihe.indexOf('food'), 1);
  }
  const qmVon = (g: GruppeId) => qm[gruppen.indexOf(g)];
  const platziere = (g: GruppeId, menge: number, etage?: number) => {
    let rest = menge;
    if (etage !== undefined) {
      fl.push({ id: `${id}-f${++n}`, etage, qm: Math.round(rest), konzept: 'eigen', gruppe: g });
      return;
    }
    while (rest > 1 && etIdx < etagenOrdnung.length) {
      const e = etagenOrdnung[etIdx];
      if (f === 'warenhaus' && e === -1) { etIdx++; frei = proEtage; continue; }
      const nimm = Math.min(rest, frei);
      fl.push({ id: `${id}-f${++n}`, etage: e, qm: Math.round(nimm), konzept: 'eigen', gruppe: g });
      rest -= nimm;
      frei -= nimm;
      if (frei <= 1) { etIdx++; frei = proEtage; }
    }
    if (rest > 1) {
      const letzte = fl[fl.length - 1];
      letzte.qm += Math.round(rest);
    }
  };
  if (f === 'warenhaus' && etagen.includes(-1)) {
    const ug = proEtage;
    const food = qmVon('food');
    platziere('food', food, -1);
    if (ug - food > 200) platziere('wohnen', ug - food, -1);
  }
  for (const g of reihe) {
    let menge = qmVon(g);
    if (g === 'wohnen' && f === 'warenhaus' && etagen.includes(-1)) menge = Math.max(0, menge - (proEtage - qmVon('food')));
    if (menge > 1) platziere(g, menge);
  }
  return fl.filter((x) => x.qm > 0);
}

function name(h: RngHalter): string {
  return `${waehle(h, VORNAMEN)} ${waehle(h, NACHNAMEN)}`;
}

function bauHaus(h: RngHalter, idx: number, stadt: string, region: Region, cluster: Cluster, kk: number, f: Format, sz: Szenario, nr: number, option: { hausklasse?: 'A' | 'B' | 'C'; premiumSchluessel?: string; outletLage?: Lage; lage?: Lage } = {}): Haus {
  const id = `${({ warenhaus: 'W', sport: 'S', schwester: 'K', outlet: 'O' } as Record<Format, string>)[f]}${String(idx).padStart(3, '0')}`;
  const nurDaten = f === 'schwester' || f === 'outlet';
  const lage = option.lage ?? option.outletLage ?? lageFuer(h, cluster, f);
  const vkQm = grossFuerCluster(h, cluster, f, option.premiumSchluessel ? 'premium' : option.hausklasse);
  // Etagenzahl nach Stadtgröße; die Grundfläche folgt daraus (Warenhäuser haben 3 bis 7 Ebenen)
  const nEtagenZufall = f === 'sport' || f === 'outlet' ? ganzZwischen(h, 1, 3)
    : option.hausklasse === 'C' ? ganzZwischen(h, 3, 5)
    : cluster === 'metropole' ? ganzZwischen(h, 5, 7) : cluster === 'grossstadt' ? ganzZwischen(h, 4, 6) : ganzZwischen(h, 3, 5);
  // Zufallsaufruf oben absichtlich erhalten: FUNDUS besitzt einen unabhängigen
  // RNG-Strom; die übrigen Stammdaten bleiben bei geänderter Bauform stabil.
  const nEtagen = f === 'outlet'
    ? (lage === 'b' ? 2 + (idx % 2) : idx % 2 === 0 ? 2 : 1)
    : nEtagenZufall;
  const grundflaeche = Math.max(f === 'sport' || f === 'outlet' ? 600 : 1000, Math.round(vkQm / nEtagen / 100) * 100);
  const hatUG = f === 'warenhaus' && nEtagen >= 3 && chance(h, 0.7);
  const etagen: number[] = [];
  if (hatUG) etagen.push(-1);
  for (let e = 0; etagen.length < nEtagen; e++) etagen.push(e);
  const einzug = {
    kaufkraft: clamp(kk * zwischen(h, 0.92, 1.08), 0.7, 1.4),
    alter: zwischen(h, 0.85, 1.2) * (cluster === 'mittelstadt' ? 1.05 : cluster === 'metropole' ? 0.95 : 1),
    wettbewerb: clamp(zwischen(h, 0, 1) * (lage === 'center' ? 1.2 : 1), 0, 1),
  };
  const flaechen = bauFlaechen(h, id, f, vkQm, etagen);
  const potenzial: Partial<Record<GruppeId, number>> = {};
  const saettigungQm: Partial<Record<GruppeId, number>> = {};
  let basisUmsatz = 0;
  for (const g of gruppenFuer(f)) {
    const qmG = flaechen.filter((x) => x.gruppe === g).reduce((a, b) => a + b.qm, 0);
    if (qmG <= 0) continue;
    const sQm = GRUPPEN[g].qmUmsatz * fit(g, einzug.kaufkraft, einzug.alter, einzug.wettbewerb) * LAGE_FAKTOR[lage] * CLUSTER_FAKTOR[cluster] * (nurDaten ? 1 : zwischen(h, 0.82, 1.15));
    // Neue Sortimentspotenziale dürfen den historischen RNG-Strom der Grafik-Exporte nicht verschieben.
    const satF = nurDaten ? 0.75 : zwischen(h, 0.45, 1.1); // < 1 = Fläche überdimensioniert
    const Q = qmG * satF;
    const sat = 1 - Math.exp(-qmG / Q);
    potenzial[g] = (sQm * qmG) / sat;
    saettigungQm[g] = Q;
    basisUmsatz += sQm * qmG;
  }
  // Miete: Quote am Umsatz, teils aus besseren Zeiten
  const vermieterEig = f === 'warenhaus' ? chance(h, 0.35) : chance(h, 0.1);
  const netTyp = vermieterEig ? (chance(h, 0.7) ? 'triple' : 'double') : (() => { const r = zwischen(h, 0, 1); return r < 0.3 ? 'net' : r < 0.8 ? 'double' : 'triple'; })();
  let mietQuote = zwischen(h, 0.065, 0.135);
  if (chance(h, 0.18)) mietQuote += zwischen(h, 0.04, 0.09); // Altverträge
  if (netTyp === 'net') mietQuote += 0.02;
  if (netTyp === 'triple') mietQuote -= 0.012;
  const fteBedarf = vkQm / PARAM.qmJeFte + basisUmsatz / PARAM.umsatzJeFte;
  const fteIst = nurDaten ? 0 : fteBedarf * zwischen(h, 1.0, 1.22);
  const vz = fteIst * zwischen(h, 0.42, 0.58);
  const ah = fteIst * zwischen(h, 0.06, 0.14);
  const substanzBasis = Math.round(zwischen(h, 30, 90));
  const substanz = f === 'outlet' ? clamp(substanzBasis, 40, 85) : substanzBasis;
  const zusatz = waehle(h, STANDORT_ZUSATZ[lage]);
  const premiumName = PREMIUM_HAEUSER.find((p) => p.schluessel === option.premiumSchluessel)?.name;
  const formatName = f === 'schwester' ? 'Volkskauf' : f === 'outlet' ? 'FUNDUS' : f === 'warenhaus' ? sz.firma.split(' ')[0] : sz.sportName;
  return {
    id,
    name: premiumName ?? (f === 'outlet' ? `${formatName} ${stadt}${nr > 1 ? ' ' + zusatz : ''}` : `${formatName} ${stadt}${nr > 1 ? ' ' + zusatz : lage === '1a' ? '' : ' ' + zusatz}`),
    stadt, region, cluster, lage, format: f, einzug, wettbewerbStart: einzug.wettbewerb, etagen,
    ...(option.hausklasse ? { hausklasse: option.hausklasse } : {}),
    ...(option.premiumSchluessel ? { klasse: 'premium' as const, premiumSchluessel: option.premiumSchluessel } : {}),
    ...(nurDaten ? { nurDaten: true } : {}),
    grundflaecheQm: grundflaeche,
    // O02 Umsatztreiber: alle drei Hebel starten neutral.
    treiber: { frequenz: 1, kaufquote: 1, bon: 1 },
    treiberQuellen: {},
    treiberVerlauf: [],
    baujahr: (() => {
      const r = zwischen(h, 0, 1);
      const basis = f === 'sport' ? ganzZwischen(h, 1975, 2015)
        : r < 0.2 ? ganzZwischen(h, 1895, 1930)
        : r < 0.32 ? ganzZwischen(h, 1931, 1954) : ganzZwischen(h, 1955, 2008);
      // Handelsboxen sind Neubauten; innerstädtische Geschäftshäuser umgenutzt.
      return f === 'outlet' ? (lage === 'b' ? 1965 + basis % 21 : 1998 + basis % 19) : basis;
    })(),
    fassade: ganzZwischen(h, 0, 7),
    flaechen,
    miete: {
      mieteWoche: nurDaten ? 0 : eur(basisUmsatz * mietQuote),
      bisWoche: ganzZwischen(h, 26, 15 * 52),
      netTyp,
      vermieter: vermieterEig ? 'eigentuemer' : 'dritt',
      vermieterName: vermieterEig ? 'Brehm Immobilien GmbH & Co. KG' : waehle(h, VERMIETER),
      nebenkostenQmWoche: netTyp === 'net' ? 0 : zwischen(h, PARAM.nebenkostenQm[0], PARAM.nebenkostenQm[1]),
    },
    personal: {
      vollzeit: vz,
      teilzeit: fteIst - vz - ah,
      aushilfen: ah,
      filialleiter: { name: name(h), skill: zwischen(h, 0.3, 0.9), moral: zwischen(h, 45, 75) },
    },
    substanz,
    substanzStart: substanz,
    status: 'offen',
    potenzial,
    saettigungQm,
    transferBonus: 0,
  };
}

// O04 Personal
import { initialisierePersonaleinsatz } from './personaleinsatz';

export function neueWelt(seed: number, sz: Szenario = STANDARD_SZENARIO): GameState {
  const h: RngHalter = { rng: seed >>> 0 };
  const haeuser: Haus[] = [];
  // Jeder Standort ist explizit zugewiesen. Keine Rundlauf-Auffüllung über die Stadtliste.
  const stadtVon = new Map(STAEDTE.map((st) => [st[0], st] as const));
  const belegung = new Map<string, { hartwig: number; sport: number }>(STAEDTE.map((st) => [st[0], { hartwig: 0, sport: 0 }]));
  const regulare: { stadt: string; nr: number }[] = [];
  const sport: { stadt: string; nr: number }[] = [];
  const fuegeRegulaerEin = (stadt: string) => {
    const b = belegung.get(stadt)!;
    b.hartwig++;
    regulare.push({ stadt, nr: b.hartwig });
  };
  // Erste 130 Warenhaus-IDs behalten ihren historischen Ort.
  for (const stadt of ALT_WARENHAUS_STAEDTE.slice(0, sz.warenhaeuser)) fuegeRegulaerEin(stadt);
  // S001-S044 bleiben in derselben Reihenfolge: nur zwei historische dritte
  // Sporthäuser (Berlin/München) werden wegen der Grenze von 2 umverlegt.
  const alteSport = ALT_SPORT_STAEDTE.slice(0, sz.sporthaeuser);
  const sportHistorisch = new Map<string, number>();
  for (const stadt of alteSport) sportHistorisch.set(stadt, (sportHistorisch.get(stadt) ?? 0) + 1);
  for (const stadt of alteSport) {
    const b = belegung.get(stadt)!;
    const st = stadtVon.get(stadt)!;
    const ziel = b.sport < st[4].sport ? stadt : STAEDTE.find(([ort, , , , menge]) =>
      belegung.get(ort)!.sport < menge.sport && menge.sport > (sportHistorisch.get(ort) ?? 0))?.[0];
    if (!ziel) throw new Error('Kein Ersatzstandort für bestehendes Sporthaus');
    const bz = belegung.get(ziel)!;
    bz.sport++;
    sport.push({ stadt: ziel, nr: bz.sport });
  }
  for (const [stadt, , , , menge] of STAEDTE) {
    const b = belegung.get(stadt)!;
    while (sport.length < sz.sporthaeuser && b.sport < menge.sport) { b.sport++; sport.push({ stadt, nr: b.sport }); }
  }
  if (sport.length !== sz.sporthaeuser) throw new Error('Sport-Standortnetz inkonsistent');
  for (const [stadt, , , , menge] of STAEDTE) {
    const b = belegung.get(stadt)!;
    while (regulare.length < sz.warenhaeuser && b.hartwig < menge.hartwig) fuegeRegulaerEin(stadt);
  }
  if (regulare.length !== sz.warenhaeuser) throw new Error('Hartwig-Standortnetz inkonsistent');
  // A: Metropolen und die 20 größten Großstädte; B: ausschließlich Großstädte.
  // Die verbleibenden Häuser werden C, überwiegend in Mittelstädten.
  const top20 = new Set(STAEDTE.filter((st) => st[2] === 'grossstadt').slice(0, 20).map((st) => st[0]));
  const a = new Set(regulare.filter((r) => stadtVon.get(r.stadt)![2] === 'metropole'));
  for (const r of regulare) {
    if (a.size >= 45) break;
    if (top20.has(r.stadt)) a.add(r);
  }
  if (a.size !== 45) throw new Error('Nicht genügend A-Standorte in den 20 größten Großstädten');
  const b = new Set(regulare.filter((r) => !a.has(r) && stadtVon.get(r.stadt)![2] === 'grossstadt').slice(0, 115));
  if (b.size !== 115) throw new Error('Nicht genügend B-Standorte in Großstädten');
  for (const r of regulare) {
    const [stadt, region, cluster, kk] = stadtVon.get(r.stadt)!;
    const premiumInStadt = PREMIUM_HAEUSER.some((p) => p.stadt === stadt);
    const lage: Lage = r.nr === 1 && !premiumInStadt ? '1a' : r.nr % 2 === 0 ? 'b' : 'center';
    haeuser.push(bauHaus(h, haeuser.filter((x) => x.format === 'warenhaus').length + 1, stadt, region, cluster, kk, 'warenhaus', sz, r.nr, { hausklasse: a.has(r) ? 'A' : b.has(r) ? 'B' : 'C', lage }));
  }
  // Premium bildet fünf eigenständige Häuser außerhalb der 360 regulären.
  // P005 nutzt einen separaten RNG-Strom, damit Sport, Volkskauf und andere
  // Städte durch das neue Berliner Haus keine neuen Seed-Zahlen erhalten.
  let p = 0;
  const p005Rng: RngHalter = { rng: (seed ^ 0xb31e1a5) >>> 0 };
  for (const premium of PREMIUM_HAEUSER) {
    if (sz.premiumDeaktiviert || p >= (sz.premiumhaeuser ?? 0)) break;
    const [stadt, region, cluster, kk] = stadtVon.get(premium.stadt)!;
    const quelle = premium.schluessel === 'P005' ? p005Rng : h;
    haeuser.push(bauHaus(quelle, sz.warenhaeuser + ++p, stadt, region, cluster, kk, 'warenhaus', sz, 1, { premiumSchluessel: premium.schluessel, lage: '1a' }));
  }
  let si = 0;
  for (const r of sport) {
    const [stadt, region, cluster, kk] = stadtVon.get(r.stadt)!;
    haeuser.push(bauHaus(h, ++si, stadt, region, cluster, kk, 'sport', sz, r.nr));
  }
  let ki = 0; let oi = 0;
  // FUNDUS hat einen eigenen deterministischen RNG-Strom: Export und Standorte
  // bleiben stabil, auch wenn sich Hartwig/Volkskauf-Bauparameter ändern.
  const fundusRng: RngHalter = { rng: (seed ^ 0xf00d5eed) >>> 0 };
  for (const [stadt, region, cluster, kk, menge] of STAEDTE) {
    for (let i = 1; i <= menge.volkskauf && ki < (sz.schwesterhaeuser ?? 0); i++)
      haeuser.push(bauHaus(h, ++ki, stadt, region, cluster, kk, 'schwester', sz, i));
    for (let i = 1; i <= menge.fundus && oi < (sz.outlethaeuser ?? 0); i++)
      haeuser.push(bauHaus(fundusRng, ++oi, stadt, region, cluster, kk, 'outlet', sz, i, { outletLage: oi <= 46 ? 'rand' : 'b' }));
  }

  // Premiumfelder initialisieren, ohne bereits existierende Premiumhäuser umzuwidmen.
  if (!sz.premiumDeaktiviert && (sz.premiumhaeuser ?? 0) > 0) kennzeichnePremium(haeuser);
  kalibriereStandortumsatz(haeuser);

  if (sz.szenarioRegeln?.fusionDoppelStaedte) {
    const staedte = [...new Set(haeuser.filter((x) => x.format === 'warenhaus').map((x) => x.stadt))]
      .slice(0, sz.szenarioRegeln.fusionDoppelStaedte);
    let wh = haeuser.filter((x) => x.format === 'warenhaus').length;
    for (const stadt of staedte) {
      const eintrag = STAEDTE.find((x) => x[0] === stadt);
      if (!eintrag) continue;
      const [, region, cluster, kk] = eintrag;
      const alt = bauHaus(h, ++wh, stadt, region, cluster, kk, 'warenhaus', sz, 2, { hausklasse: 'C', lage: 'b' });
      alt.name = 'Volkskauf ' + stadt;
      alt.fusionUrsprung = 'volkskauf';
      haeuser.push(alt);
    }
  }

  // Bestand: Reichweite in Wochen je Gruppe, mit Altersstruktur
  const bestand: Kohorte[] = [];
  const basisUmsatz: Partial<Record<GruppeId, number>> = {};
  for (const x of haeuser) {
    // Schwesterkette und FUNDUS besitzen Gruppen, aber bis Phase 3 keinen Umsatz/Warenbestand.
    if (x.nurDaten) continue;
    for (const [g, P] of Object.entries(x.potenzial) as [GruppeId, number][]) {
      const qmG = x.flaechen.filter((f) => f.gruppe === g).reduce((a, b) => a + b.qm, 0);
      const ist = P * (1 - Math.exp(-qmG / (x.saettigungQm[g] as number)));
      basisUmsatz[g] = (basisUmsatz[g] ?? 0) + ist;
    }
  }
  for (const [g, u] of Object.entries(basisUmsatz) as [GruppeId, number][]) {
    const d = GRUPPEN[g];
    const wochenEinsatz = u * (1 - d.marge);
    const gesamt = wochenEinsatz * PARAM.bestandsReichweite;
    // 6 Kohorten: frisch bis alt
    const verteilung = [0.24, 0.22, 0.2, 0.15, 0.11, 0.08];
    const alter = [1, 5, 9, 14, 20, 30];
    verteilung.forEach((v, i) => bestand.push({ gruppe: g, wert: eur(gesamt * v), alter: alter[i], saisonAnteil: d.saisonAnteil, kostenFaktor: 1 }));
  }

  const beraterQualitaet: Record<string, number> = {};
  for (const b of BERATER) for (const n of b.haeuser) beraterQualitaet[n] = zwischen(h, 0.2, 0.95);

  const umsatzWoche = Object.values(basisUmsatz).reduce((a, b) => a + (b ?? 0), 0);
  const zentrale = eur(umsatzWoche * PARAM.zentraleQuote);

  const s: GameState = {
    version: 2,
    seed,
    rng: h.rng,
    woche: 0,
    startJahr: sz.startJahr,
    firma: { name: sz.firma, sportName: sz.sportName },
    phase: 'regulaer',
    insolvenzenGesamt: 0,
    erfolge: {},
    schwierigkeit: sz.schwierigkeit ?? 'mittel',
    cash: Math.round(sz.startCash * SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].startCash),
    kreditlinie: Math.round(sz.kreditlinie * SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].kreditlinie),
    kreditlinieBasis: Math.round(sz.kreditlinie * SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].kreditlinie),
    haeuser,
    spielendeStart: {
      haeuser: haeuser.length,
      fte: haeuser.reduce((sum, haus) => sum + haus.personal.vollzeit + haus.personal.teilzeit + haus.personal.aushilfen, 0),
    },
    premiumSchuetzen: true,
    wettbewerber: [],
    wettbewerbRng: (seed ^ 0x9e3779b9) >>> 0,
    wettbewerbNaechsteId: 0,
    wettbewerbStadtUmsatz: {},
    wettbewerbNachnutzungen: [],
    wettbewerbGeseheneSchliessungen: [],
    bestand,
    bestellungen: [],
    verbindlichkeiten: [],
    orderLevel: Object.fromEntries(Object.keys(basisUmsatz).map((g) => [g, 1])),
    basisUmsatz,
    vorkasseAkzeptieren: true,
    lieferanten: LIEFERANTEN.map((l) => ({ ...l, geduld: clamp(l.geduld + SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].lieferantenGeduld, 0, 1), gruppen: { ...l.gruppen }, aktiv: true, verspaetungen: 0 })),
    restLieferantenVertrauen: 55,
    stakeholder: { bank: 50, kreditversicherer: 58, vermieter: 50, betriebsrat: 50, image: 45, eigentuemer: 50 },
    kvLimitBasis: PARAM.kvLimitBasis,
    tarif: 'flaeche',
    zentrale: { kostenWoche: zentrale, kostenStart: zentrale, fte: Math.round(zentrale / 1500) },
    marketing: { budgetQuote: PARAM.marketingQuote, gewoehnung: 0.15, kundenkarte: false, aktionen: [], stand: undefined as unknown as GameState['marketing']['stand'] },
    controllingStufe: 1,
    berater: [],
    beraterQualitaet,
    angebote: [],
    entscheidungen: [],
    entscheidungsprotokoll: [],
    quartale: [],
    eigentuemer: { strikes: 0, kapitalZugefuehrt: 0 },
    makro: { konjunktur: 1, schockStaerke: 0, phase: zwischen(h, 0, Math.PI * 2) },
    meldungen: [],
    historie: [],
    filialProgramme: {},
    zaehler: 0,
    einmalkostenWoche: 0,
    einmalErloeseWoche: 0,
    hq: undefined as unknown as GameState['hq'],
    einkauf: undefined as unknown as GameState['einkauf'],
    eigenmarken: erzeugeEigenmarken(),
    vorstand: undefined as unknown as GameState['vorstand'],
    produkte: undefined as unknown as GameState['produkte'],
  };
  // Hauptverwaltung: alte, zu große Zentrale in Essen, kalibriert auf die bisherige Zentralkostenquote
  s.hq = erzeugeHq(s, zentrale);
  // Vorstand: Gehälter sind Teil der bisherigen Zentralkosten (Sachkosten je FTE entsprechend niedriger)
  s.vorstand = erzeugeVorstand(s);
  s.hq.sachJeFte -= vorstandKostenWoche(s) / s.hq.abteilungen.reduce((a, x) => a + x.fte, 0);
  hqAktualisiere(s);
  s.zentrale.fte = Math.round(s.hq.abteilungen.reduce((a, x) => a + x.fte, 0));
  neueHqAngebote(s);
  initialeVerbindlichkeiten(s);
  // Einkauf: Warengruppen, Eigenmarken, Bestand und Pipeline je WG (ersetzt die Bereichskohorten)
  s.einkauf = erzeugeEinkauf(s);
  initialisiereEinkauf(s);
  // Produktentwicklung: Startsortiment der Eigenmarken (Basis für Nachfrage und Marge)
  s.produkte = erzeugeProdukte(s);
  // Marketing: Kanäle, Hartwig Karte und App, CRM, Startkalender (Standardplan = Ausgangslage)
  s.marketing.stand = erzeugeMarketing(s);
  initialisiereMarketing(s);
  // O09: Marketing-Referenz zu Beginn speichern.
  s.ecommerce = erzeugeEcommerce(s);
  initialisiereWettbewerb(s);
  chronikInitialisieren(s);
  szenarioStart(s, sz);
  bildeHauscluster(s); // O01 Organisation: geografische Cluster und Leitungen einmal initialisieren.
  marktbeobachtungStart(s); // Q06: im Standard inaktiv, keine Zusatzkosten.
  // O03 IT: neutraler Ausgangszustand, keine Änderung am bestehenden Zufallsstrom.
  initialisiereIt(s);
  // O06 Planung: Vorjahresbudget des Vorgängers (+3 % Umsatz).
  initialisierePlanung(s);
  // O07 Haus: erst nach der Weltgenerierung, ohne Zufall aus dem Haupt-RNG.
  initialisiereHausbetrieb(s);
  // O08 Umbau
  initialisiereUmbau(s);
  s.kapitalflussStartCash = s.cash;
  // O04 Personal: neutraler Referenzplan auf Basis der bisherigen FTE.
  initialisierePersonaleinsatz(s);
  // O05 Ware
  initialisiereWare(s);
  return s;
}

/** Offene Warenverbindlichkeiten und Pipeline zum Start (eingeschwungener Zustand). */
function initialeVerbindlichkeiten(s: GameState): void {
  for (const [g, u] of Object.entries(s.basisUmsatz) as [GruppeId, number][]) {
    const d = GRUPPEN[g];
    const wochenEinsatz = u * (1 - d.marge);
    for (let w = 1; w <= 8; w++) {
      s.verbindlichkeiten.push({ id: `v0-${g}-${w}`, art: 'ware', gruppe: g, wert: eur(wochenEinsatz), faellig: w - 1 });
    }
    for (let w = 0; w < d.vorlauf; w++) {
      s.bestellungen.push({ id: `b0-${g}-${w}`, gruppe: g, wert: eur(wochenEinsatz), ankunft: w, vorkasse: false });
    }
  }
}
