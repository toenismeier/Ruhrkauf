/** Vier eigenständige Hartwig-Kronjuwelen. Kein neues Format: Einkauf und Marketing bleiben Warenhaus. */
import { GRUPPEN, PREMIUM_HAEUSER } from './daten';
import type { Angebot, GameState, GruppeId, Haus } from './types';
import { clamp, eur, melde, mio } from './util';

// Festes Raum- und Betriebsprofil je Kronjuwel. Keine Seed-/Hausgrößenabhängigkeit.
// Die Produktivitätsfaktoren wirken auf die Flächenleistung, nicht direkt auf die KPI.
const PREMIUM_PROFIL = {
  P001: { qm: 30_000, etagen: [-1, 0, 1, 2, 3, 4], produktivitaet: 1.55, service: 0.012, mietQuote: 0.057 },
  P002: { qm: 30_000, etagen: [-1, 0, 1, 2, 3, 4], produktivitaet: 1.55, service: 0.016, mietQuote: 0.057 },
  P003: { qm: 18_000, etagen: [-1, 0, 1, 2, 3], produktivitaet: 1.52, service: 0.037, mietQuote: 0.060 },
  P004: { qm: 14_000, etagen: [-1, 0, 1, 2, 3], produktivitaet: 1.45, service: 0.041, mietQuote: 0.065 },
} as const;
type PremiumId = keyof typeof PREMIUM_PROFIL;
export const premiumProfil = (id?: string) => id && Object.prototype.hasOwnProperty.call(PREMIUM_PROFIL, id)
  ? PREMIUM_PROFIL[id as PremiumId] : undefined;
// Wochenleistung eines normalen Referenzquadratmeters; individuelle Standort-RNGs
// sollen die Kronjuwelen nicht um zig Millionen Euro pro Jahr auseinanderziehen.
const EURO_JE_QM_WOCHE = 40;

const MIX: Partial<Record<GruppeId, number>> = {
  beauty: 1.55, accessoires: 1.55, damen: 1.25, food: 1.45,
  spielwaren: 0.55, wohnen: 0.6,
};
const IMMOBILIE: Record<string, number> = { P001: 900_000_000, P002: 900_000_000, P003: 600_000_000, P004: 145_000_000 };
const KAEUFER = [
  { typ: 'Luxusgruppe', name: 'Luxusgruppe Valens' },
  { typ: 'Family Office', name: 'Family Office Merian' },
  { typ: 'Staatsfonds', name: 'Staatsfonds Aurum' },
] as const;

function grundumsatz(h: Haus): number {
  return Object.entries(h.potenzial).reduce((sum, [g, p]) => {
    const qm = h.flaechen.filter((f) => f.gruppe === g && f.konzept === 'eigen').reduce((a, f) => a + f.qm, 0);
    return sum + (p ?? 0) * (1 - Math.exp(-qm / Math.max(1, h.saettigungQm[g as GruppeId] ?? 1)));
  }, 0);
}

/** Bewahrt die bestehende Flächenstruktur/IDs, normiert aber Gesamtfläche, Stockwerke
 * und Sortimentsanteile. Kein RNG-Verbrauch; Konzern-Nachfragebasis bleibt kalibrierbar. */
function normierePremiumFlaechen(h: Haus, p: NonNullable<ReturnType<typeof premiumProfil>>): void {
  const alteEtagen = [...h.etagen].sort((a, b) => a - b);
  const neueEtagen: number[] = [...p.etagen];
  const anzahl = Math.max(1, alteEtagen.length - 1);
  for (const f of h.flaechen) {
    const index = Math.max(0, alteEtagen.indexOf(f.etage));
    f.etage = neueEtagen[Math.round(index / anzahl * (neueEtagen.length - 1))];
  }
  h.etagen = neueEtagen;
  h.grundflaecheQm = p.qm / neueEtagen.length;

  // Die zehn Warenhausgruppen behalten dieselben Flächen-IDs und denselben Mix
  // innerhalb einer Gruppe. Nur die seedabhängigen Gruppengrößen verschwinden.
  const gruppen = Object.keys(h.potenzial) as GruppeId[];
  const gewicht = gruppen.reduce((a, g) => a + GRUPPEN[g].anteilFlaeche, 0);
  for (const g of gruppen) {
    const bereiche = h.flaechen.filter(f => f.gruppe === g);
    const altQm = bereiche.reduce((a, f) => a + f.qm, 0);
    if (!altQm) continue;
    const zielQm = Math.round(p.qm * GRUPPEN[g].anteilFlaeche / gewicht);
    let rest = zielQm;
    for (let i = 0; i < bereiche.length; i++) {
      const f = bereiche[i];
      const neuQm = i === bereiche.length - 1 ? rest : Math.max(1, Math.round(zielQm * f.qm / altQm));
      f.qm = neuQm;
      rest -= neuQm;
    }
  }
  // Rundungsrest genau einmal ausgleichen, damit die Gebäudefläche seedunabhängig ist.
  const rest = p.qm - h.flaechen.reduce((a, f) => a + f.qm, 0);
  const ausgleich = h.flaechen.find(f => f.gruppe === 'damen') ?? h.flaechen[0];
  if (ausgleich) ausgleich.qm += rest;

  // Feste Sättigung/Flächenleistung statt der ursprünglich je Seed ausgewürfelten
  // Werte: Rank und Sortiment, nicht das zufällig umgewidmete Warenhaus, entscheiden.
  for (const g of gruppen) {
    const qm = h.flaechen.filter(f => f.gruppe === g).reduce((a, f) => a + f.qm, 0);
    if (!qm) continue;
    h.saettigungQm[g] = qm * 0.75;
    h.potenzial[g] = qm * GRUPPEN[g].qmUmsatz * (MIX[g] ?? 1)
      / (1 - Math.exp(-qm / h.saettigungQm[g]!));
  }
}

/** Bestehende 1a-Häuser regelbasiert umwidmen; Haus-IDs bleiben für Spielstände und HQ erhalten. */
export function kennzeichnePremium(haeuser: Haus[]): void {
  // Ab Engine-Maßstab Phase 1 existieren die vier Premiumhäuser bereits als zusätzliche Einträge.
  // Dann keinesfalls noch vier reguläre Häuser umwidmen.
  const vorhanden = PREMIUM_HAEUSER.every((p) => haeuser.some((h) =>
    h.premiumSchluessel === p.id || (h.klasse === 'premium' && h.stadt === p.stadt)));
  if (vorhanden) {
    for (const p of PREMIUM_HAEUSER) {
      const h = haeuser.find((x) => x.premiumSchluessel === p.id || (x.klasse === 'premium' && x.stadt === p.stadt));
      if (!h) continue;
      h.klasse = 'premium'; h.premiumSchluessel = p.id; h.name = p.name;
      h.premiumImage ??= 80;
      // Feste Premium-Grundrisse (Fläche, Geschosse) wie im Premium-Workstream;
      // Umsatz, Miete und Personal normiert anschließend kalibriereStandortumsatz.
      const profil = premiumProfil(p.id)!;
      normierePremiumFlaechen(h, profil);
      // Flächenproduktivität des Premiumrangs; die Klassensumme normiert kalibriereStandortumsatz.
      for (const g of Object.keys(h.potenzial) as GruppeId[]) h.potenzial[g] = (h.potenzial[g] ?? 0) * profil.produktivitaet;
      h.lage = '1a';
      h.miete.vermieter = 'eigentuemer';
      h.miete.vermieterName = 'Hartwig Immobilien';
      h.substanz = Math.max(78, h.substanz);
    }
    return;
  }
  const ursprung = haeuser.reduce((a, h) => a + grundumsatz(h), 0);
  for (const p of PREMIUM_HAEUSER) {
    const kandidaten = haeuser.filter((h) => h.format === 'warenhaus' && h.stadt === p.stadt && h.klasse !== 'premium');
    const h = [...kandidaten].sort((a, b) =>
      (b.lage === '1a' ? 1 : 0) - (a.lage === '1a' ? 1 : 0) ||
      b.grundflaecheQm * b.etagen.length - a.grundflaecheQm * a.etagen.length ||
      a.id.localeCompare(b.id))[0];
    if (!h) continue;
    h.name = p.name;
    h.klasse = 'premium';
    h.premiumSchluessel = p.id;
    h.premiumImage = 80;
    h.lage = '1a';
    const profil = premiumProfil(p.id)!;
    normierePremiumFlaechen(h, profil);
    h.miete.vermieter = 'eigentuemer';
    h.miete.vermieterName = 'Hartwig Immobilien';
    // Die eigene Immobilie hat einen stabilen, rangbezogenen kalkulatorischen
    // Mietansatz; ein zufälliger Altvertrag darf die Rangmarge nicht dominieren.
    const sollUmsatzWoche = profil.qm * EURO_JE_QM_WOCHE * profil.produktivitaet;
    h.miete.mieteWoche = eur(sollUmsatzWoche * profil.mietQuote);
    h.miete.bisWoche = 15 * 52;
    h.miete.keineVerlaengerung = false;
    // Beratung/FTE auf die feste Grundfläche und normale Referenzleistung
    // dimensionieren: 15 % Premium-Zuschlag, Mehrverkauf aus Flächenproduktivität.
    // Der Bonus erhöht die Leistung pro FTE, nicht die Lohnkosten proportional.
    const normalUmsatzWoche = profil.qm * EURO_JE_QM_WOCHE;
    const fte = 1.15 * (profil.qm / 500 + normalUmsatzWoche / 8_800);
    h.personal.vollzeit = fte * 0.50;
    h.personal.teilzeit = fte * 0.40;
    h.personal.aushilfen = fte * 0.10;
    h.substanz = Math.max(78, h.substanz);
    h.substanzStart = h.substanz;
    // Hochpreisige Shop-in-Shops bleiben im Format Warenhaus und folgen dem vorhandenen Konzessionskonzept.
    for (const g of ['beauty', 'accessoires'] as GruppeId[]) {
      const f = h.flaechen.find((f) => f.gruppe === g && f.konzept === 'eigen' && f.qm > 250);
      if (f) {
        const qm = Math.round(f.qm * 0.07);
        f.qm -= qm;
        h.flaechen.push({ ...f, id: f.id + '-luxus', qm, konzept: 'konzession' });
      }
    }
    // Shop-in-Shops entziehen der Eigenware Fläche. Den Produktivitätswert auf
    // die verbleibende Eigenfläche kalibrieren statt die Margen per KPI zu setzen.
    const faktor = sollUmsatzWoche / Math.max(1, grundumsatz(h));
    for (const g of Object.keys(h.potenzial) as GruppeId[])
      h.potenzial[g] = (h.potenzial[g] ?? 0) * faktor;
  }
  // Konzernkalibrierung: der Umsatzanstieg der Kronjuwelen wird ohne Änderung der Gesamtbasis
  // auf alle regulären Häuser proportional verteilt; kein neuer Standort und kein RNG-Verbrauch.
  const praemie = haeuser.filter((h) => h.klasse === 'premium').reduce((a, h) => a + grundumsatz(h), 0);
  const regulaer = haeuser.filter((h) => h.klasse !== 'premium');
  const sum = regulaer.reduce((a, h) => a + grundumsatz(h), 0);
  const kompensation = Math.max(0.5, (ursprung - praemie) / Math.max(1, sum));
  for (const h of regulaer) for (const g of Object.keys(h.potenzial) as GruppeId[]) h.potenzial[g] = (h.potenzial[g] ?? 0) * kompensation;
}

/** Nachfragewirkung des lokalen Premium-Images, bei Start 80 exakt neutral. */
/** Service, Concierge, Warenpräsentation und Sicherheit als zusätzlicher Betriebsaufwand. */
export function premiumServiceQuote(h: Haus): number {
  return h.klasse === 'premium' ? (premiumProfil(h.premiumSchluessel)?.service ?? 0) : 0;
}

export function premiumImageFaktor(h: Haus): number {
  return h.klasse === 'premium' ? clamp(0.65 + 0.35 * (h.premiumImage ?? 80) / 80, 0.65, 1.0875) : 1;
}

export function premiumWoche(s: GameState): void {
  for (const h of s.haeuser.filter((h) => h.klasse === 'premium' && h.status === 'offen')) {
    const inv = h.premiumInvestition;
    if (inv && s.woche < inv.bis) {
      h.substanz = clamp(h.substanz + inv.substanzProWoche, 0, 100);
      h.premiumImage = clamp((h.premiumImage ?? 80) + inv.imageProWoche, 0, 100);
    }
    const aktiv = s.marketing.aktionen.filter((a) =>
      a.status !== 'abgesagt' && a.start <= s.woche && s.woche < a.ende &&
      !a.kontrollHaeuser?.includes(h.id) &&
      (a.scope.typ === 'alle' ? s.premiumSchuetzen === false :
        a.scope.typ === 'haeuser' ? a.scope.ids.includes(h.id) :
        a.scope.typ === 'format' ? a.scope.format === 'warenhaus' :
        a.scope.typ === 'region' ? a.scope.region === h.region : a.scope.cluster === h.cluster));
    const imageVerlust = aktiv.reduce((a, x) => a + Math.min(2.5, x.rabatt * 5), 0);
    h.premiumImage = clamp((h.premiumImage ?? 80) - imageVerlust + (aktiv.length ? 0 : 0.05), 0, 100);
  }
}

export function premiumMarktwert(h: Haus): number {
  if (h.klasse !== 'premium') return 0;
  const rang = PREMIUM_HAEUSER.find((p) => p.id === h.premiumSchluessel)?.rang ?? 3;
  const ebitda = (h.kpi?.db ?? 0) * 52;
  const multiplex = rang === 1 ? 18 : rang === 2 ? 15 : 11;
  return eur(Math.max(0, ebitda) * multiplex + (IMMOBILIE[h.premiumSchluessel ?? ''] ?? 0) *
    (0.85 + 0.15 * (h.substanz / 100)) * (0.8 + 0.2 * ((h.premiumImage ?? 80) / 80)));
}

export function premiumUebersicht(s: GameState) {
  return s.haeuser.filter((h) => h.klasse === 'premium').map((h) => {
    const umsatz = h.kpi?.umsatz ?? 0, ebitda = h.kpi?.db ?? 0;
    return {
      id: h.id, schluessel: h.premiumSchluessel, name: h.name, stadt: h.stadt, status: h.status,
      umsatz: eur(umsatz), ebitda: eur(ebitda), marge: umsatz > 0 ? ebitda / umsatz : 0,
      image: h.premiumImage ?? 80, substanz: h.substanz, marktwert: premiumMarktwert(h),
      schutz: s.premiumSchuetzen !== false, eigentuemer: h.premiumEigentuemer,
    };
  });
}

export function premiumInvestieren(s: GameState, id: string, betrag: number): string | null {
  const h = s.haeuser.find((x) => x.id === id && x.klasse === 'premium' && x.status === 'offen');
  if (!h) return 'Premium-Haus nicht verfügbar.';
  if (!Number.isSafeInteger(betrag) || betrag < 500_000 || betrag > 100_000_000) return 'Investition von 0,5 bis 100 Mio. € wählen.';
  if (h.premiumInvestition && s.woche < h.premiumInvestition.bis) return 'Eine Premium-Investition läuft bereits. Bitte zunächst die 26 Wochen abwarten.';
  if (s.cash + s.kreditlinie < betrag) return 'Nicht genügend Liquidität.';
  s.cash -= betrag;
  s.einmalkostenWoche += betrag;
  s.kapitalflussOffen ??= { investitionen: 0, finanzierung: 0 };
  s.kapitalflussOffen.investitionen -= betrag;
  h.premiumInvestition = {
    bis: s.woche + 26, substanzProWoche: Math.min(30, betrag / 3_000_000) / 26,
    imageProWoche: Math.min(15, betrag / 5_000_000) / 26,
  };
  melde(s, 'info', `Premium-Investition in ${h.name}: ${mio(betrag)} über 26 Wochen.`, { stadt: h.stadt, hausId: h.id });
  return null;
}

/** Insolvenz: jedes offene Premium-Haus kann einzeln angeboten werden. Kein reiner Zinsertrag, Immobilie enthalten. */
export function premiumAngebote(s: GameState): void {
  if (s.phase !== 'insolvenz' || s.prognose) return;
  for (const h of s.haeuser.filter((x) => x.klasse === 'premium' && x.status === 'offen')) {
    if (s.angebote.some((a) => a.typ === 'premiumVerkauf' && a.wunschHaeuser?.[0] === h.id)) continue;
    const p = PREMIUM_HAEUSER.find((x) => x.id === h.premiumSchluessel);
    const kaeufer = KAEUFER[(p?.rang ?? 3) === 1 ? (h.premiumSchluessel === 'P001' ? 0 : 1) : (p?.rang ?? 3) === 2 ? 2 : 1];
    const kaufpreis = premiumMarktwert(h);
    s.angebote.push({
      // Eigenständige deterministische IDs: keine Veränderung des globalen ID-Zählers
      // und kein zusätzlicher Zug aus dem gemeinsamen Ereignis-Zufallsstrom.
      id: `premium-${h.premiumSchluessel ?? h.id}-${s.woche}`, typ: 'premiumVerkauf', woche: s.woche, frist: s.woche + 10 + ((p?.rang ?? 3) * 3),
      status: 'offen', titel: `Kaufangebot für ${h.name}`,
      text: `${kaeufer.name} bietet ${mio(kaufpreis)} inklusive Immobilie. Der Verkauf entzieht Hartwig ein Kronjuwel.`,
      kaufpreis, wunschHaeuser: [h.id], premiumKaeuferTyp: kaeufer.typ, premiumKaeuferName: kaeufer.name,
    });
    melde(s, 'presse', `Ein Investor bietet für ${h.name}.`, { stadt: h.stadt, hausId: h.id });
  }
}

export function premiumVerkaufen(s: GameState, an: Angebot): string | null {
  if (an.typ !== 'premiumVerkauf' || s.phase !== 'insolvenz') return 'Premium-Verkauf nur im Insolvenzverfahren.';
  const h = s.haeuser.find((x) => x.id === an.wunschHaeuser?.[0] && x.klasse === 'premium' && x.status === 'offen');
  if (!h) return 'Premium-Haus nicht verfügbar.';
  h.status = 'verkauft';
  h.premiumEigentuemer = an.premiumKaeuferName ?? 'Neuer Eigentümer';
  h.personal.vollzeit = 0; h.personal.teilzeit = 0; h.personal.aushilfen = 0;
  s.cash += an.kaufpreis ?? 0;
  s.einmalErloeseWoche += an.kaufpreis ?? 0;
  s.stakeholder.image = clamp(s.stakeholder.image - 8, 0, 100);
  s.stakeholder.eigentuemer = clamp(s.stakeholder.eigentuemer - 12, 0, 100);
  an.status = 'angenommen'; an.erledigtWoche = s.woche;
  melde(s, 'presse', `${h.name} ist an ${h.premiumEigentuemer} verkauft worden.`, { stadt: h.stadt, hausId: h.id });
  return null;
}
