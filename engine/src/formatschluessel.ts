/** Formattrennung (E53, Etappe 1): jedes Haus gehört genau einem von fünf Steuerungsformaten.
 * Premium ist technisch ein Warenhaus mit klasse 'premium', wird aber überall als eigenes Format geführt. */
import type { Haus, Region } from './types';

export type FormatSchluessel = 'hartwig' | 'premium' | 'volkskauf' | 'sport' | 'fundus';
export const FORMAT_SCHLUESSEL: readonly FormatSchluessel[] = ['hartwig', 'premium', 'volkskauf', 'sport', 'fundus'];
export const FORMAT_NAME: Readonly<Record<FormatSchluessel, string>> = {
  hartwig: 'Hartwig', premium: 'Premium', volkskauf: 'Volkskauf', sport: 'Hartwig Sport', fundus: 'FUNDUS',
};
/** Titel der obersten Führungskraft je Format (unter dem CSO). */
export const FORMAT_LEITUNG: Readonly<Record<FormatSchluessel, string>> = {
  hartwig: 'Vertriebsleitung Hartwig', premium: 'Leitung Premium', volkskauf: 'Geschäftsführung Volkskauf',
  sport: 'Leitung Hartwig Sport', fundus: 'Leitung FUNDUS',
};

export function formatVon(h: Pick<Haus, 'format' | 'klasse'>): FormatSchluessel {
  if (h.klasse === 'premium') return 'premium';
  return h.format === 'schwester' ? 'volkskauf' : h.format === 'outlet' ? 'fundus' : h.format === 'sport' ? 'sport' : 'hartwig';
}

/** Eigener Regionszuschnitt je Format (Ummo 02.11.2026). Premium hat keine Regionen. */
export const FORMAT_REGIONEN: Readonly<Record<FormatSchluessel, Readonly<Record<Region, string>> | null>> = {
  hartwig: { Nord: 'Nord', Ost: 'Ost', West: 'West', Mitte: 'Mitte', Süd: 'Süd' },
  premium: null,
  volkskauf: { West: 'West', Nord: 'Nord-Ost', Ost: 'Nord-Ost', Süd: 'Süd-Mitte', Mitte: 'Süd-Mitte' },
  sport: { Nord: 'Nord-Ost', Ost: 'Nord-Ost', West: 'Süd-West', Süd: 'Süd-West', Mitte: 'Süd-West' },
  fundus: { West: 'West', Süd: 'Süd', Nord: 'Nord-Ost-Mitte', Ost: 'Nord-Ost-Mitte', Mitte: 'Nord-Ost-Mitte' },
};
/** Regionen eines Formats in fester Reihenfolge. */
export function formatRegionen(f: FormatSchluessel): string[] {
  const m = FORMAT_REGIONEN[f];
  return m ? [...new Set(Object.values(m))] : [];
}
/** Schlüssel einer Formatregion, z. B. "volkskauf:Süd-Mitte". */
export const regionSchluessel = (f: FormatSchluessel, r: string): string => f + ':' + r;
export function formatRegionVon(h: Pick<Haus, 'format' | 'klasse' | 'region'>): string | undefined {
  const f = formatVon(h), m = FORMAT_REGIONEN[f];
  return m ? regionSchluessel(f, m[h.region]) : undefined;
}
export function regionName(schluessel: string): string {
  const [f, r] = schluessel.split(':') as [FormatSchluessel, string];
  return (FORMAT_NAME[f] ?? f) + ' ' + (r ?? '');
}
