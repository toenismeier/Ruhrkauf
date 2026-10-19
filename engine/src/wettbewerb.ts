/** Wettbewerber als persistente, autonome Akteure. Eigener Mulberry32-Zufallsstrom. */
import { GRUPPEN, WETTBEWERBER_NAMEN, WETTBEWERB_UEBERSCHNEIDUNG, gruppenFuer } from './daten';
import { KOORDINATEN } from './standorte';
import type { GameState, GruppeId, Haus, Lage, Wettbewerber, WettbewerberArt } from './types';
import { clamp, eur, kw, melde } from './util';
import { neueEntscheidung, neuesAngebot } from './ereignisse';
import { schwierigkeit } from './schwierigkeit';

const ARTEN: WettbewerberArt[] = ['modehaus', 'fastfashion', 'premium', 'offprice', 'textildiscounter', 'elektronik', 'leer_ehemals'];
const START_ANZAHL = { metropole: [3, 5], grossstadt: [1, 3], mittelstadt: [0, 1] };
const START_FLAECHE = { metropole: [2600, 5200], grossstadt: [1800, 3800], mittelstadt: [1500, 2600] };

function zufall(s: GameState): number {
  let t = (s.wettbewerbRng = (s.wettbewerbRng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const z = (s: GameState, a: number, b: number): number => a + (b - a) * zufall(s);
const gz = (s: GameState, a: number, b: number): number => Math.floor(z(s, a, b + 1));
const chance = (s: GameState, p: number): boolean => zufall(s) < p;
const wahl = <T>(s: GameState, a: readonly T[]): T => a[Math.floor(zufall(s) * a.length)];

function entfernung(a: string, b: string): number {
  const p = KOORDINATEN[a], q = KOORDINATEN[b];
  if (!p || !q) return Infinity;
  const dy = (p[0] - q[0]) * 111;
  const dx = (p[1] - q[1]) * 111 * Math.cos(((p[0] + q[0]) / 2) * Math.PI / 180);
  return Math.hypot(dx, dy);
}
function lageFaktor(haus: Haus, w: Wettbewerber): number {
  if (haus.lage === w.lage) return 1;
  if (haus.lage === 'center' || w.lage === 'center') return 0.55;
  if (haus.lage === 'rand' || w.lage === 'rand') return 0.4;
  return 0.75;
}
function istMarktAktiv(w: Wettbewerber): boolean {
  return w.art !== 'leer_ehemals' && w.status !== 'geschlossen';
}
function wertJeGruppe(w: Wettbewerber, g: GruppeId, s: GameState): number {
  if (!istMarktAktiv(w)) return 0;
  const u = WETTBEWERB_UEBERSCHNEIDUNG[w.art][g] ?? 0;
  if (!u) return 0;
  const eroeffnung = w.status === 'eroeffnung' ? 1.5 : 1;
  const aktion = (w.aktionVon ?? Infinity) <= s.woche && (w.aktionBis ?? -1) > s.woche;
  const druck = w.status === 'raeumung' ? 0.6 : aktion ? w.preisdruck : 0;
  const abwehr = (w.abwehrBis ?? 0) > s.woche ? (w.abwehrFaktor ?? 1) : 1;
  return w.staerke * u * eroeffnung * (1 + druck) * abwehr;
}
function roh(s: GameState, h: Haus, g?: GruppeId): number {
  let sum = 0;
  for (const w of s.wettbewerber) {
    if (w.stadt !== h.stadt || !istMarktAktiv(w)) continue;
    const lage = lageFaktor(h, w);
    if (g) sum += wertJeGruppe(w, g, s) * lage;
    else {
      const gruppen = gruppenFuer(h.format);
      const gewicht = gruppen.reduce((a, x) => a + (h.potenzial[x] ?? 0) * (h.saettigungQm[x] ?? 0), 0);
      const summe = gruppen.reduce((a, x) => a + (h.potenzial[x] ?? 0) * (h.saettigungQm[x] ?? 0) * wertJeGruppe(w, x, s), 0);
      sum += lage * (gewicht ? summe / gewicht : 0);
    }
  }
  return sum * 0.65;
}
function leerzahl(s: GameState, stadt: string): number {
  return s.wettbewerber.filter((w) => w.stadt === stadt && w.art === 'leer_ehemals' && w.status !== 'geschlossen').length;
}

/** Der alte Zufallswert je Haus ist die historische Kalibrierung. Änderungen kommen ausschließlich aus realen Akteuren.
 * Ohne hausindividuellen Offset wäre der Auftrag für zwei gleich gelegene Häuser derselben Stadt mathematisch nicht lösbar. */
export function wettbewerbAus(s: GameState, h: Haus): number {
  if (s.wettbewerbDeaktiviert) return h.wettbewerbStart;
  return clamp(h.wettbewerbStart + roh(s, h) - (h.wettbewerbRohStart ?? roh(s, h)), 0, 1);
}
export function wettbewerbAusGruppe(s: GameState, h: Haus, g: GruppeId): number {
  if (s.wettbewerbDeaktiviert) return h.wettbewerbStart;
  return clamp(h.wettbewerbStart + roh(s, h, g) - (h.wettbewerbRohGruppenStart?.[g] ?? roh(s, h, g)), 0, 1);
}
export function wettbewerbNachfrageFaktor(s: GameState, h: Haus, g: GruppeId): number {
  const vor = 1 - 0.25 * h.wettbewerbStart;
  return (1 - 0.25 * wettbewerbAusGruppe(s, h, g)) / vor;
}
export function wettbewerbFrequenzFaktor(s: GameState, h: Haus): number {
  if (s.wettbewerbDeaktiviert) return 1;
  return clamp(1 - 0.02 * (leerzahl(s, h.stadt) - (h.wettbewerbLeerStart ?? 0)), 0.85, 1.08);
}

function neuerName(s: GameState, art: WettbewerberArt, stadt: string): string {
  const namen = WETTBEWERBER_NAMEN[art];
  const frei = namen.filter((n) => !s.wettbewerber.some((w) => w.name === n && entfernung(stadt, w.stadt) < 28));
  return frei.length ? wahl(s, frei) : namen[0] + ' ' + stadt;
}
function anlegen(s: GameState, stadt: string, art: WettbewerberArt, lage: Lage, qm: number, seit: number, inHaus?: string): Wettbewerber {
  const name = neuerName(s, art, stadt);
  const kette = name.endsWith(' ' + stadt) ? name.slice(0, -(stadt.length + 1)) : name;
  const w: Wettbewerber = {
    id: 'C' + String(++s.wettbewerbNaechsteId).padStart(3, '0'), name, kette, art, stadt, lage,
    grundflaecheQm: qm, staerke: z(s, 0.28, 0.85), preisdruck: 0,
    status: seit > 0 ? 'eroeffnung' : 'offen', seit, bis: seit > 0 ? seit + 4 : undefined,
    form: gz(s, 0, 4), inHartwigGebaeude: inHaus,
  };
  s.wettbewerber.push(w);
  return w;
}

/** Nur eigener RNG: der Hausgenerator und alle anderen Startdaten bleiben bitgenau erhalten. */
export function initialisiereWettbewerb(s: GameState): void {
  const staedte = [...new Set(s.haeuser.map((h) => h.stadt))];
  for (const stadt of staedte) {
    const hs = s.haeuser.filter((h) => h.stadt === stadt);
    const c = hs[0].cluster, [min, max] = START_ANZAHL[c], [qmMin, qmMax] = START_FLAECHE[c];
    const n = gz(s, min, max);
    for (let i = 0; i < n; i++) {
      const lage: Lage = chance(s, c === 'mittelstadt' ? 0.5 : 0.7) ? '1a' : 'b';
      const pool: WettbewerberArt[] = lage === '1a'
        ? ['modehaus', 'fastfashion', 'premium', 'leer_ehemals', 'modehaus', 'fastfashion']
        : ['offprice', 'elektronik', 'textildiscounter', 'leer_ehemals', 'offprice'];
      let art = wahl(s, pool);
      if (art === 'premium' && c !== 'metropole') art = 'modehaus';
      // Primär keine doppelten Arten pro Stadt.
      for (let j = 0; j < pool.length && s.wettbewerber.some((w) => w.stadt === stadt && w.art === art); j++) art = wahl(s, ARTEN);
      const qmHartwig = Math.max(0, ...hs.filter((h) => h.format === 'warenhaus' && h.lage !== 'center').map((h) => h.grundflaecheQm));
      const qm = Math.min(Math.round(z(s, qmMin, qmMax) / 100) * 100, qmHartwig ? Math.max(600, Math.round(0.8 * qmHartwig / 100) * 100) : qmMax);
      anlegen(s, stadt, art, lage, qm, 0);
    }
  }
  for (const h of s.haeuser) {
    h.wettbewerbRohStart = roh(s, h);
    h.wettbewerbRohGruppenStart = Object.fromEntries(gruppenFuer(h.format).map((g) => [g, roh(s, h, g)]));
    h.wettbewerbLeerStart = leerzahl(s, h.stadt);
  }
}

function betroffeneHaeuser(s: GameState, stadt: string): Haus[] {
  return s.haeuser.filter((h) => h.stadt === stadt && (h.status === 'offen' || h.status === 'schliessung_verhandlung'));
}
function eroeffnungsArt(s: GameState, stadt: string): WettbewerberArt {
  const hs = betroffeneHaeuser(s, stadt);
  const kandidaten = ARTEN.filter((a) => a !== 'leer_ehemals');
  const score = (art: WettbewerberArt): number => hs.reduce((sum, h) => sum + gruppenFuer(h.format).reduce((x, g) => {
    const qm = h.flaechen.filter((f) => f.gruppe === g && f.konzept !== 'leer').reduce((a, f) => a + f.qm, 0);
    return x + qm * GRUPPEN[g].qmUmsatz * (WETTBEWERB_UEBERSCHNEIDUNG[art][g] ?? 0);
  }, 0), 0) / (1 + s.wettbewerber.filter((w) => w.stadt === stadt && w.art === art && istMarktAktiv(w)).length);
  return [...kandidaten].sort((a, b) => score(b) - score(a))[0];
}
function neuEroeffnet(s: GameState, stadt: string, art: WettbewerberArt, inHaus?: string): Wettbewerber {
  const hs = s.haeuser.filter((h) => h.stadt === stadt), c = hs[0].cluster;
  const [qmMin, qmMax] = START_FLAECHE[c];
  const qm = inHaus ? (s.haeuser.find((h) => h.id === inHaus)?.grundflaecheQm ?? qmMin) : Math.round(z(s, qmMin, qmMax) / 100) * 100;
  const wb = anlegen(s, stadt, art, chance(s, 0.7) ? '1a' : 'b', qm, s.woche, inHaus);
  const h = betroffeneHaeuser(s, stadt)[0];
  const gruppe = h ? gruppenFuer(h.format).sort((a, b) => (WETTBEWERB_UEBERSCHNEIDUNG[art][b] ?? 0) - (WETTBEWERB_UEBERSCHNEIDUNG[art][a] ?? 0))[0] : 'damen';
  const prozent = h ? Math.round(Math.max(0, 1 - wettbewerbNachfrageFaktor(s, h, gruppe)) * 100) : 0;
  melde(s, 'presse', wb.name + ' (' + art + ') eröffnet in ' + stadt + (inHaus ? ' im ehemaligen ' + inHaus : '') + '. Erwarteter Nachfragerückgang ' + GRUPPEN[gruppe].name + ': rund ' + prozent + ' %.');
  if ((art === 'modehaus' || art === 'premium') && qm >= 2300) {
    neueEntscheidung(s, {
      typ: 'wettbewerb_eroeffnung', frist: s.woche + 3,
      titel: 'Großeröffnung ' + wb.name + ' in ' + stadt,
      text: 'Der neue Wettbewerber wirbt aktiv Stammkunden ab. Reagieren oder den Markteintritt hinnehmen?',
      optionen: [
        { id: 'aktion', label: 'Eröffnungsaktion dagegen (Marge)' },
        ...(s.marketing.kundenkarte ? [{ id: 'mailing', label: 'Stammkunden-Mailing (Budget)' }] : []),
        { id: 'nichts', label: 'Nichts tun' },
      ],
      standard: 'nichts', daten: { wettbewerber: wb.id },
    });
  }
  return wb;
}
function raeumung(s: GameState, w: Wettbewerber): void {
  w.status = 'raeumung'; w.seit = s.woche; w.bis = s.woche + 6; w.preisdruck = 0.6;
  melde(s, 'presse', w.name + ' schließt in ' + w.stadt + '. Sechs Wochen Räumungsverkauf; danach droht Leerstand.');
  const hs = betroffeneHaeuser(s, w.stadt).filter((h) => h.format === 'warenhaus');
  if (hs.length) {
    const angebot = neuesAngebot(s, {
      typ: 'uebernahme', frist: s.woche + 8, wettbewerberId: w.id, qmJeHaus: w.grundflaecheQm,
      mieteQmMonat: Math.round(z(s, 7, 17) * 10) / 10,
      titel: 'Standortübernahme ' + w.name + ' in ' + w.stadt,
      text: 'Freie Handelsfläche ' + w.grundflaecheQm + ' qm: als Hartwig Outlet oder Erweiterung anmietbar, Umbau 200–250 €/qm.',
    });
    melde(s, 'info', 'Übernahmeangebot ' + angebot.id + ' für ' + w.stadt + ' (8 Wochen gültig).');
  }
}
function istStadtAktion(s: GameState, stadt: string): boolean {
  return s.marketing.aktionen.some((a) => a.status !== 'abgesagt' && a.start === s.woche && s.haeuser.some((h) => h.stadt === stadt &&
    (a.scope.typ === 'alle' || (a.scope.typ === 'region' && a.scope.region === h.region) ||
      (a.scope.typ === 'cluster' && a.scope.cluster === h.cluster) || (a.scope.typ === 'format' && a.scope.format === h.format) ||
      (a.scope.typ === 'haeuser' && a.scope.ids.includes(h.id)))));
}
function stadtWachstum(s: GameState, stadt: string): boolean {
  const werte = s.wettbewerbStadtUmsatz[stadt] ?? [];
  if (werte.length < 65) return false;
  const neu = werte.slice(-13).reduce((a, b) => a + b, 0);
  const vorjahr = werte.slice(-65, -52).reduce((a, b) => a + b, 0);
  return vorjahr > 0 && neu / vorjahr > 1.08;
}

/** Wöchentlicher Statuslauf direkt nach ereignisse; Ereignisse beeinflussen das folgende Verkaufsgeschäft. */
export function wettbewerbWoche(s: GameState): void {
  if (s.wettbewerbDeaktiviert) return;
  const w = s.woche;
  if (!s.prognose) for (const stadt of new Set(s.haeuser.map((h) => h.stadt))) {
    const umsatz = s.haeuser.filter((h) => h.stadt === stadt && h.kpi?.woche === w && h.status !== 'geschlossen' && h.status !== 'verkauft')
      .reduce((a, h) => a + (h.kpi?.umsatz ?? 0), 0);
    const hist = s.wettbewerbStadtUmsatz[stadt] ?? (s.wettbewerbStadtUmsatz[stadt] = []);
    hist.push(umsatz);
    if (hist.length > 65) hist.shift();
  }
  for (const wb of s.wettbewerber) {
    if (wb.status === 'eroeffnung' && (wb.bis ?? 0) <= w) { wb.status = 'offen'; wb.bis = undefined; }
    if (wb.status === 'raeumung' && (wb.bis ?? 0) <= w) {
      wb.status = 'offen'; wb.art = 'leer_ehemals'; wb.preisdruck = 0; wb.seit = w; wb.bis = undefined;
      const hs = betroffeneHaeuser(s, wb.stadt);
      for (const h of hs) h.transferBonus += 0.02 / hs.length;
      melde(s, 'info', 'Ehemaliger Standort ' + wb.name + ' in ' + wb.stadt + ' steht leer; Kunden wechseln zu Hartwig.');
    }
    if ((wb.aktionBis ?? 0) <= w) { wb.preisdruck = 0; wb.aktionVon = undefined; wb.aktionBis = undefined; }
    if (wb.konterVon === w && wb.konterBis && wb.konterBis > w) {
      wb.preisdruck = wb.konterDruck ?? 0.4; wb.aktionVon = w; wb.aktionBis = wb.konterBis;
      melde(s, 'ereignis', wb.name + ' kontert in ' + wb.stadt + ' eine Hartwig-Aktion mit ' + Math.round(wb.preisdruck * 100) + ' % zusätzlichem Preisdruck.');
      wb.konterVon = undefined; wb.konterBis = undefined; wb.konterDruck = undefined;
    }
  }
  if (!s.prognose) {
    for (const h of s.haeuser.filter((h) => h.status === 'geschlossen' && !s.wettbewerbGeseheneSchliessungen.includes(h.id))) {
      s.wettbewerbGeseheneSchliessungen.push(h.id);
      h.wettbewerbSchliessungWoche = w;
      if (chance(s, 0.35)) s.wettbewerbNachnutzungen.push({ haus: h.id, woche: w + gz(s, 26, 78) });
    }
    for (const n of s.wettbewerbNachnutzungen.filter((n) => n.woche <= w)) {
      const h = s.haeuser.find((x) => x.id === n.haus);
      if (h && h.status === 'geschlossen') neuEroeffnet(s, h.stadt, wahl(s, ['offprice', 'textildiscounter', 'elektronik'] as const), h.id);
    }
    s.wettbewerbNachnutzungen = s.wettbewerbNachnutzungen.filter((n) => n.woche > w);
    const staedte = [...new Set(s.haeuser.map((h) => h.stadt))];
    for (const stadt of staedte) {
      const hs = s.haeuser.filter((h) => h.stadt === stadt);
      const gesamtkm = hs.reduce((a, h) => a + h.grundflaecheQm * Math.max(1, h.etagen.length), 0);
      const zu = hs.filter((h) => h.status === 'geschlossen').reduce((a, h) => a + h.grundflaecheQm * Math.max(1, h.etagen.length), 0);
      const kuerzlich = hs.some((h) => h.wettbewerbSchliessungWoche !== undefined && w - h.wettbewerbSchliessungWoche < 52);
      const faktor = gesamtkm > 0 && zu / gesamtkm > 0.5 && kuerzlich ? 3 : 1;
      const p = clamp(0.002 * (hs.reduce((a, h) => a + h.einzug.kaufkraft, 0) / hs.length) * (1 + zu / Math.max(1, gesamtkm)) * faktor, 0, 0.05);
      if (chance(s, p)) neuEroeffnet(s, stadt, eroeffnungsArt(s, stadt));
      const aktion = istStadtAktion(s, stadt);
      const wachstum = stadtWachstum(s, stadt);
      for (const wb of s.wettbewerber.filter((x) => x.stadt === stadt && x.status === 'offen' && x.art !== 'leer_ehemals')) {
        if (hs[0].einzug.kaufkraft < 0.9) wb.staerke *= 0.998;
        if (wb.staerke < 0.25 && hs[0].einzug.kaufkraft < 0.9 && chance(s, 0.003)) { raeumung(s, wb); continue; }
        if (aktion && chance(s, 0.4)) {
          const action = s.marketing.aktionen.find((a) => a.status !== 'abgesagt' && a.start === w);
          const ueberschnitt = !action?.bereiche?.length || action.bereiche.some((g) => (WETTBEWERB_UEBERSCHNEIDUNG[wb.art][g] ?? 0) > 0);
          if (ueberschnitt) { wb.konterVon = w + gz(s, 1, 2); wb.konterBis = wb.konterVon + Math.max(1, (action?.ende ?? w + 3) - w); wb.konterDruck = z(s, 0.3, 0.6); }
        }
        const saison = [1, 2, 3, 4, 26, 27, 28, 29, 30, 47, 52].includes(kw(w)) ? 1.9 : 0.78;
        const freq = wachstum ? 1.35 : 1;
        if (wb.aktionBis === undefined && chance(s, (6 / 52) * saison * freq)) {
          wb.aktionVon = w; wb.aktionBis = w + gz(s, 1, 3);
          wb.preisdruck = z(s, 0.1, 0.35);
        }
      }
    }
  }
  for (const h of s.haeuser) h.einzug.wettbewerb = wettbewerbAus(s, h);
}

export function wettbewerbUebersicht(s: GameState, stadt?: string) {
  return s.wettbewerber.filter((w) => !stadt || w.stadt === stadt).map((w) => ({
    id: w.id, name: w.name, kette: w.kette, art: w.art, stadt: w.stadt, lage: w.lage, staerke: w.staerke,
    status: w.status, preisdruck: w.preisdruck,
    wirkung: Object.fromEntries(Object.keys(WETTBEWERB_UEBERSCHNEIDUNG[w.art]).map((g) => {
      const h = s.haeuser.find((x) => x.stadt === w.stadt && gruppenFuer(x.format).includes(g as GruppeId));
      const faktor = h ? 0.25 * 0.65 * wertJeGruppe(w, g as GruppeId, s) * lageFaktor(h, w) / (1 - 0.25 * h.wettbewerbStart) : 0;
      return [g, -Math.round(faktor * 10_000) / 100];
    })),
  }));
}
export function wettbewerbFuerGrafik(s: GameState, stadt: string) {
  return s.wettbewerber.filter((w) => w.stadt === stadt).map((w) => ({
    id: w.id, name: w.name, art: w.art, form: w.form, lage: w.lage, grundflaecheQm: w.grundflaecheQm,
    status: w.status, inHartwigGebaeude: w.inHartwigGebaeude,
    rabatt: (w.aktionVon ?? Infinity) <= s.woche && (w.aktionBis ?? -1) > s.woche ? w.preisdruck : 0,
  }));
}

/** Übernahme einer Wettbewerbsfläche: eigenes Outlet oder Erweiterungsfläche. */
export function uebernehmeWettbewerber(s: GameState, id: string, modus: 'outlet' | 'erweiterung'): string | null {
  const wb = s.wettbewerber.find((w) => w.id === id);
  if (!wb || wb.status === 'geschlossen') return 'Wettbewerber-Standort nicht verfügbar.';
  const basis = s.haeuser.find((h) => h.stadt === wb.stadt && h.format === 'warenhaus' && h.status === 'offen');
  if (!basis) return 'Kein offenes Hartwig-Warenhaus am Standort.';
  const qm = wb.grundflaecheQm;
  const kosten = eur(qm * (modus === 'erweiterung' ? 250 : 200));
  if (s.cash + s.kreditlinie < kosten) return 'Nicht genug Liquidität für die Umbaukosten.';
  s.cash -= kosten;
  s.einmalkostenWoche += kosten;
  if (modus === 'erweiterung') {
    const g: GruppeId = 'damen';
    const idF = basis.id + '-wb-' + wb.id;
    basis.flaechen.push({ id: idF, etage: 0, qm, konzept: 'eigen', gruppe: g, umbauBis: s.woche + 8 });
    basis.potenzial[g] = (basis.potenzial[g] ?? 0) + qm * GRUPPEN[g].qmUmsatz;
    basis.miete.mieteWoche += eur(qm * 12 * 12 / 52);
  } else {
    const neu: Haus = structuredClone(basis);
    neu.id = 'O' + wb.id; neu.name = 'Hartwig Outlet ' + wb.stadt; neu.etagen = [0]; neu.grundflaecheQm = qm;
    neu.flaechen = [{ id: neu.id + '-f1', etage: 0, qm, konzept: 'offprice', umbauBis: s.woche + 8 }];
    neu.potenzial = {}; neu.saettigungQm = {};
    neu.personal.vollzeit = qm / 600; neu.personal.teilzeit = qm / 1000; neu.personal.aushilfen = qm / 3000;
    neu.miete = { mieteWoche: eur(qm * 11 * 12 / 52), bisWoche: s.woche + 260, netTyp: 'double', vermieter: 'dritt', vermieterName: wb.name, nebenkostenQmWoche: 1.2 };
    neu.kpi = undefined; neu.status = 'offen'; neu.statusBis = undefined; neu.transferBonus = 0;
    neu.wettbewerbStart = basis.einzug.wettbewerb;
    neu.wettbewerbRohStart = roh(s, neu);
    neu.wettbewerbRohGruppenStart = Object.fromEntries(gruppenFuer(neu.format).map((g) => [g, roh(s, neu, g)]));
    neu.wettbewerbLeerStart = leerzahl(s, neu.stadt);
    s.haeuser.push(neu);
  }
  wb.status = 'geschlossen';
  wb.seit = s.woche;
  melde(s, 'presse', 'Hartwig übernimmt den Standort ' + wb.name + ' in ' + wb.stadt + ' als ' + (modus === 'outlet' ? 'Outlet' : 'Erweiterungsfläche') + '.');
  return null;
}
