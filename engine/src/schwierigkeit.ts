// Schwierigkeit: beim Spielstart wählbar, gebündelte Hebel. Stufe mittel ist die Kalibrierung der Ausgangslage.
import type { GameState } from './types';

export type SchwierigkeitId = 'leicht' | 'mittel' | 'schwer';

export interface SchwierigkeitParam {
  name: string;
  beschreibung: string;
  /** Imagewirkung einer Schließungswelle: jede weitere Schließung derselben Woche kostet diesen Faktor mal die vorige (1 = keine Dämpfung). */
  imageDaempfung: number;
  /** Faktor auf Startkasse und Kreditlinie. */
  startCash: number;
  kreditlinie: number;
  /** Zuschlag auf die Geduld der Lieferanten (0..1, additiv). */
  lieferantenGeduld: number;
  /** Zuschlag auf den Zielwert des Kreditversicherers (Punkte). */
  kvZiel: number;
  /** Faktor auf die Schwere negativer Zufallsereignisse (Lieferantenausfall, Containerstau, Konjunkturschock, Instandhaltung, Streik). Eintreten und Zufallsfolge sind auf allen Stufen gleich. */
  ereignisse: number;
  /** Operative Kaufneigung relativ zur mittleren Krisenlage (kein EBITDA-Zuschuss). */
  kaufneigung: number;
  /** Plan-EBITDA, ab dem die Gläubigerversammlung den Plan als tragfähig wertet (€, 52 Wochen). */
  versammlungSchwelle: number;
}

export const SCHWIERIGKEIT: Record<SchwierigkeitId, SchwierigkeitParam> = {
  leicht: {
    name: 'Leicht', beschreibung: 'Mehr Kasse und Kreditlinie, geduldige Lieferanten und Kreditversicherer, seltener Pech, Schließungswellen kosten wenig Image.',
    imageDaempfung: 0.9, startCash: 1.15, kreditlinie: 1.15, lieferantenGeduld: 0.1, kvZiel: 4, ereignisse: 0.6, kaufneigung: 1.035, versammlungSchwelle: -35_000_000,
  },
  mittel: {
    name: 'Mittel', beschreibung: 'Die übliche Lage einer Warenhauskette in der Krise.',
    imageDaempfung: 0.955, startCash: 1, kreditlinie: 1, lieferantenGeduld: 0, kvZiel: 0, ereignisse: 1, kaufneigung: 1, versammlungSchwelle: -25_000_000,
  },
  schwer: {
    name: 'Schwer', beschreibung: 'Knappe Kasse, nervöse Lieferanten und Kreditversicherer, mehr Pech, jede Schließung kostet voll Image, strenge Gläubiger.',
    imageDaempfung: 1, startCash: 0.9, kreditlinie: 0.9, lieferantenGeduld: -0.1, kvZiel: -4, ereignisse: 1.4, kaufneigung: 0.945, versammlungSchwelle: -17_000_000,
  },
};

/** Für die Oberfläche: Auswahl beim Spielstart. */
export const SCHWIERIGKEITEN: { id: SchwierigkeitId; name: string; beschreibung: string }[] =
  (Object.keys(SCHWIERIGKEIT) as SchwierigkeitId[]).map((id) => ({ id, name: SCHWIERIGKEIT[id].name, beschreibung: SCHWIERIGKEIT[id].beschreibung }));

export const schwierigkeit = (s: GameState): SchwierigkeitParam => SCHWIERIGKEIT[s.schwierigkeit ?? 'mittel'];
