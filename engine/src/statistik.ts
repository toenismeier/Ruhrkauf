// N01: ausschließlich lesbare Zeitreihen, ohne Eingriff in die Wirtschaftssimulation.
import type { GameState, Haus, HausKpi, WochenKpi } from './types';

export const STATISTIK_AKTIV = true; // Bis N13 Einstellungen gemergt ist.
const GRENZE_BYTES = 2_000_000;
const HAUS_WOCHEN = 156;
export type StatistikEbene = 'konzern' | 'format' | 'region' | 'stadt' | 'haus';
export type StatistikKennzahl = 'umsatz' | 'ebitda' | 'cash' | 'db' | 'frequenz' | 'personalFte' | 'stimmung';
export interface StatistikFilter {
  ebene: StatistikEbene;
  id?: string;
  kennzahl: StatistikKennzahl;
  wochen: 13 | 52 | 'alle' | number;
}
export interface StatistikPunkt { woche: number; wert: number; vorjahr?: number; plan?: number }
export interface StatistikReihe { ebene: StatistikEbene; id?: string; kennzahl: StatistikKennzahl; punkte: StatistikPunkt[]; einheit: 'euro' | 'anzahl' | 'index'; hinweis?: string }

export function statistikHaus(s: GameState, h: Haus, k: HausKpi): void {
  if (!STATISTIK_AKTIV || s.statistikDeaktiviert || s.prognose) return;
  if (!h.verlauf) h.verlauf = [];
  const w = k.woche;
  // Oberhalb von 2 MB nur vierwöchentlich verankern, jüngste Woche immer anzeigen.
  if (s.statistik?.sparsam && w > 52 && h.verlauf.length) {
    const letzter = h.verlauf[h.verlauf.length - 1];
    if (letzter.woche > 52 && letzter.woche % 4 !== 0) h.verlauf.pop();
  }
  // Frequenz ist noch kein eigener Engine-Zähler: Umsatz/45 € als Kontakt-Schätzwert.
  h.verlauf.push({ woche: w, umsatz: Math.round(k.umsatz), db: Math.round(k.db),
    frequenz: Math.round(Math.max(0, k.umsatz) / 45), personalFte: Math.round(k.fteIst) });
  while (h.verlauf.length && w - h.verlauf[0].woche >= HAUS_WOCHEN) h.verlauf.shift();
}

export function statistikWoche(s: GameState, k: WochenKpi): void {
  if (!STATISTIK_AKTIV || s.statistikDeaktiviert || s.prognose) return;
  if (!s.statistik) s.statistik = { sparsam: false, stimmung: [] };
  const a = s.stakeholder;
  const lief = s.lieferanten.filter(x => x.aktiv);
  const lieferanten = (lief.reduce((sum, l) => sum + l.vertrauen, 0) + s.restLieferantenVertrauen) / (lief.length + 1);
  s.statistik.stimmung.push({ woche: k.woche, wert: Math.round((a.bank + a.kreditversicherer + lieferanten) / 3) });
  if (s.statistik.stimmung.length > 520) s.statistik.stimmung.splice(0, s.statistik.stimmung.length - 520);
  if (k.woche === 52 && !s.statistik.sparsam) {
    s.statistik.sparsam = JSON.stringify(s).length > GRENZE_BYTES;
  }
}

function passendeHaeuser(s: GameState, ebene: StatistikEbene, id?: string): Haus[] {
  if (ebene === 'haus') return s.haeuser.filter(h => h.id === id);
  if (ebene === 'stadt') return s.haeuser.filter(h => h.stadt === id);
  if (ebene === 'region') return s.haeuser.filter(h => h.region === id);
  if (ebene === 'format') return s.haeuser.filter(h => {
    const format = String(h.format);
    if (id === 'Hartwig') return format === 'warenhaus' && h.klasse !== 'premium';
    if (id === 'Sport') return format === 'sport';
    if (id === 'Volkskauf') return format === 'volkskauf';
    if (id === 'FUNDUS') return format === 'fundus' || format === 'outlet';
    if (id === 'Premium') return h.klasse === 'premium';
    return format === id;
  });
  return s.haeuser;
}

export function verlauf(s: GameState, filter: StatistikFilter): StatistikReihe {
  const { ebene, id, kennzahl } = filter;
  const einheit = ['umsatz', 'ebitda', 'cash', 'db'].includes(kennzahl) ? 'euro' : kennzahl === 'stimmung' ? 'index' : 'anzahl';
  const ergebnis: StatistikReihe = { ebene, id, kennzahl, punkte: [], einheit };
  if (kennzahl === 'frequenz') ergebnis.hinweis = 'Kundenfrequenz geschätzt aus Umsatz / 45 €; kein gemessener Besucherzähler.';
  const letzteWoche = s.historie.length ? s.historie[s.historie.length - 1].woche : s.woche - 1;
  const beginn = filter.wochen === 'alle' ? -Infinity : letzteWoche - Math.max(1, Number(filter.wochen) || 52) + 1;
  const werte = new Map<number, number>();
  if (ebene === 'konzern' && kennzahl === 'stimmung') {
    for (const p of s.statistik?.stimmung ?? []) werte.set(p.woche, p.wert);
  } else if (ebene === 'konzern' && ['umsatz', 'ebitda', 'cash', 'personalFte'].includes(kennzahl)) {
    for (const k of s.historie) {
      const wert = kennzahl === 'personalFte' ? k.fte : k[kennzahl as 'umsatz' | 'ebitda' | 'cash'];
      werte.set(k.woche, wert);
    }
  } else if (!['cash', 'ebitda', 'stimmung'].includes(kennzahl)) {
    const haeuser = passendeHaeuser(s, ebene, id);
    for (const h of haeuser) for (const p of h.verlauf ?? []) {
      werte.set(p.woche, (werte.get(p.woche) ?? 0) + p[kennzahl as 'umsatz' | 'db' | 'frequenz' | 'personalFte']);
    }
  }
  const alle = [...werte.keys()].sort((a, b) => a - b);
  for (const w of alle) {
    if (w < beginn) continue;
    const punkt: StatistikPunkt = { woche: w, wert: werte.get(w)! };
    if (werte.has(w - 52)) punkt.vorjahr = werte.get(w - 52);
    if (ebene === 'konzern' && kennzahl === 'ebitda') {
      const q = s.quartale.find(x => w >= x.start && w < x.start + 13);
      if (q) punkt.plan = (q.plan ?? q.planStandard) / 13;
    }
    ergebnis.punkte.push(punkt);
  }
  return ergebnis;
}
