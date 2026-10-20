/** Vier eigenständige Hartwig-Kronjuwelen. Kein neues Format: Einkauf und Marketing bleiben Warenhaus. */
import { PREMIUM_HAEUSER } from './daten';
import type { Angebot, GameState, GruppeId, Haus } from './types';
import { clamp, eur, melde, mio, neueId } from './util';

// Mehrproduktivität trägt die hohen Service- und Personalkosten; Rangfolge bleibt bewusst gestaffelt.
// Anpassung nach Wettbewerber-Merge: gegen Seed 1–3 erneut zu kalibrieren.
const RANGFAKTOR: Record<number, number> = { 1: 1.98, 2: 1.67, 3: 1.42 };
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
    h.miete.vermieter = 'eigentuemer';
    h.miete.vermieterName = 'Hartwig Immobilien';
    h.miete.mieteWoche = eur(h.miete.mieteWoche * (p.rang === 1 ? 0.65 : p.rang === 2 ? 0.75 : 0.85));
    const alt = grundumsatz(h);
    const ziel = RANGFAKTOR[p.rang];
    const gewichtet = Object.entries(h.potenzial).reduce((a, [g, n]) => {
      const qm = h.flaechen.filter((f) => f.gruppe === g && f.konzept === 'eigen').reduce((v, f) => v + f.qm, 0);
      return a + (n ?? 0) * (1 - Math.exp(-qm / Math.max(1, h.saettigungQm[g as GruppeId] ?? 1))) * (MIX[g as GruppeId] ?? 1);
    }, 0);
    const norm = alt * ziel / Math.max(1, gewichtet);
    for (const g of Object.keys(h.potenzial) as GruppeId[]) h.potenzial[g] = (h.potenzial[g] ?? 0) * norm * (MIX[g] ?? 1);
    // Erhöhter Beratungsanspruch: 15 % mehr FTE.
    h.personal.vollzeit *= 1.15;
    h.personal.teilzeit *= 1.15;
    h.personal.aushilfen *= 1.15;
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
  if (h.klasse !== 'premium') return 0;
  return h.premiumSchluessel === 'P003' ? 0.058 : h.premiumSchluessel === 'P004' ? 0.045 : 0.06;
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
      id: neueId(s, 'a'), typ: 'premiumVerkauf', woche: s.woche, frist: s.woche + 10 + ((p?.rang ?? 3) * 3),
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
