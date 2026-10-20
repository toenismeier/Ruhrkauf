import { GRUPPEN, saisonFaktor } from './daten';
import { ereignisse } from './ereignisse';
import { premiumWoche } from './premium';
import { wettbewerbWoche } from './wettbewerb';
import { eroeffneInsolvenz, glaeubigerversammlung, lohnSumme, prozesse, quartalsBewertung, setzePlanWoche, zerschlagungDurchMasseunzulaenglichkeit } from './prozesse';
import { aktualisiereStakeholder } from './stakeholder';
import type { Format, GameState, GruppeId, HausKpi, WochenKpi } from './types';
import { clamp, eur, melde, mio, normal, zwischen } from './util';
import { wareneingang } from './ware';
import { einkaufAltern, einkaufBuchen, einkaufDispo, einkaufFristen, einkaufNachfrage, einkaufVerbrauch, kannibalisierung, verbraucheAltwareWg } from './einkauf';
import { eigenmarkenWoche, istVerkaufsaktiv } from './eigenmarken';
import { neueWelt, PARAM, STANDARD_SZENARIO, type Szenario } from './welt';
import { hqControllingExzellenz, hqEinkaufKonditionen, hqRestmieteWoche, hqWkzFaktor, hqWoche } from './hq';
import { hausKosten, leereKpi, rundeKpi, simuliereHaus, type HausRoh } from './wirtschaft';
import { vorstandWoche } from './vorstand';
import { produkteBuchen, produkteWoche } from './produkte';
import { marketingAbschluss, marketingKosten, marketingRng, marketingVorbereiten, messeAktionen } from './marketing';

/** Neues Spiel; `szenario` kann auch nur Teile setzen, z. B. { schwierigkeit: 'schwer' }. */
export function neuesSpiel(seed = 1, szenario: Partial<Szenario> = STANDARD_SZENARIO): GameState {
  return neueWelt(seed, { ...STANDARD_SZENARIO, ...szenario });
}

const beendet = (s: GameState): boolean => s.phase === 'zerschlagen';

function quartalsStart(s: GameState): void {
  if (s.prognose || s.woche % 13 !== 0) return;
  const p = vorschau(s, 13);
  s.quartale.push({ nr: s.quartale.length, start: s.woche, planStandard: eur(p.reduce((a, b) => a + b.ebitda, 0)), ebitdaIst: 0 });
}

export function wocheAbspielen(s: GameState): WochenKpi {
  if (s.phase === 'zerschlagen') throw new Error('Spiel beendet: Die Kette ist zerschlagen.');
  const w = s.woche;

  prozesse(s);
  premiumWoche(s);
  hqWoche(s);
  quartalsStart(s);
  // Vorstand (Loyalität, Abwerbung, Sitzung, Ressort-KI) und Produktentwicklung (Einführungen)
  vorstandWoche(s);
  produkteWoche(s);
  // Marketing: Kanäle, Karte, CRM-Versand, laufende Aktionen der Woche (vor der Nachfrage)
  marketingVorbereiten(s);

  const lohn = lohnSumme(s);
  einkaufFristen(s);
  wareneingang(s, lohn * 2);

  // 1. Nachfrage aller Häuser; Eigenmarken und Sortimentsmix je Warengruppe wirken auf die Bruttonachfrage
  const roh: HausRoh[] = s.haeuser.map((h) => simuliereHaus(s, h));
  const nachfrage = einkaufNachfrage(s, roh);

  // 2. Bestand begrenzt den Abverkauf eigener Ware
  const bedarf: Partial<Record<GruppeId, number>> = {};
  const bruttoSumme: Partial<Record<GruppeId, number>> = {};
  for (const r of roh) for (const [g, v] of Object.entries(r.eigen) as [GruppeId, { brutto: number }][]) {
    bruttoSumme[g] = (bruttoSumme[g] ?? 0) + v.brutto;
    bedarf[g] = (bedarf[g] ?? 0) + v.brutto * (1 - GRUPPEN[g].marge);
  }
  for (const g of Object.keys(bedarf) as GruppeId[]) {
    // Bestellbasis: saisonbereinigte Nachfrage (vor Bestandsgrenze)
    const sf = saisonFaktor(g, w);
    s.basisUmsatz[g] = 0.85 * (s.basisUmsatz[g] ?? 0) + 0.15 * ((bruttoSumme[g] ?? 0) / Math.max(0.05, sf));
  }
  for (const g of Object.keys(s.basisUmsatz) as GruppeId[]) {
    if (bedarf[g] === undefined) s.basisUmsatz[g] = 0.85 * (s.basisUmsatz[g] ?? 0);
  }

  // 2./3. Bestand je Warengruppe und Art begrenzt den Abverkauf; Wareneinsatz je Bereich
  const { verfuegbar, einsatz } = einkaufVerbrauch(s, nachfrage);

  // Offprice je Format
  const offUmsatz: Record<Format, number> = { warenhaus: 0, sport: 0 };
  for (const r of roh) offUmsatz[r.haus.format] += r.offprice;
  const offEinsatz: Record<Format, { gebucht: number; zukauf: number }> = {
    warenhaus: verbraucheAltwareWg(s, 'warenhaus', offUmsatz.warenhaus * 0.7),
    sport: verbraucheAltwareWg(s, 'sport', offUmsatz.sport * 0.7),
  };

  // 4. Hausergebnisse
  const k: WochenKpi = {
    woche: w, umsatz: 0, rohertrag: 0, abschriften: 0, konzession: 0, untermiete: 0, wkz: 0, personal: 0, miete: 0, nebenkosten: 0,
    sonstige: 0, logistik: 0, zentrale: 0, marketing: 0, beratung: 0, ebitda: 0, sondereffekte: 0, cash: 0, kreditFrei: 0, bestand: 0, offeneHaeuser: 0, fte: 0,
  };
  const umsatzEigenJe: Partial<Record<GruppeId, number>> = {};
  let kommissionAuszahlung = 0;
  let restmieten = 0;
  let personalCash = 0;
  const insolvenzgeld = s.insolvenz !== undefined && w < s.insolvenz.insolvenzgeldBis;
  for (const r of roh) {
    const h = r.haus;
    const kpi: HausKpi = leereKpi(w);
    let umsatzEigen = 0;
    for (const [g, v] of Object.entries(r.eigen) as [GruppeId, { brutto: number; umsatz: number }][]) {
      const f = verfuegbar[g] ?? 1;
      const u = v.umsatz * f;
      const anteil = (bruttoSumme[g] ?? 0) > 0 ? v.brutto / (bruttoSumme[g] ?? 1) : 0;
      const e = (einsatz[g] ?? 0) * anteil;
      umsatzEigen += u;
      umsatzEigenJe[g] = (umsatzEigenJe[g] ?? 0) + u;
      kpi.umsatz += u;
      kpi.rohertrag += u - e + (h.klasse === 'premium' && (g === 'beauty' || g === 'accessoires') ? u * 0.03 : 0);
      kpi.umsatzJeGruppe[g] = (kpi.umsatzJeGruppe[g] ?? 0) + u;
    }
    for (const [g, u] of Object.entries(r.kommission) as [GruppeId, number][]) {
      kpi.umsatz += u;
      kpi.rohertrag += u * PARAM.kommissionsMarge;
      kommissionAuszahlung += u * (1 - PARAM.kommissionsMarge);
      kpi.umsatzJeGruppe[g] = (kpi.umsatzJeGruppe[g] ?? 0) + u;
    }
    if (r.offprice > 0) {
      const oe = offEinsatz[h.format];
      const t = offUmsatz[h.format] > 0 ? r.offprice / offUmsatz[h.format] : 0;
      kpi.umsatz += r.offprice;
      kpi.rohertrag += r.offprice - (oe.gebucht + oe.zukauf) * t;
      umsatzEigen += r.offprice;
    }
    kpi.konzessionserloes = r.konzessionUmsatz * PARAM.konzessionsQuote;
    kpi.untermiete = r.untermiete;
    const kosten = hausKosten(s, h, umsatzEigen, kpi.umsatz);
    kpi.personal = kosten.personal;
    kpi.miete = h.status === 'geschlossen' ? 0 : kosten.miete;
    if (h.status === 'geschlossen') restmieten += kosten.miete;
    kpi.nebenkosten = kosten.nebenkosten;
    kpi.sonstige = kosten.sonstige + kosten.logistik;
    kpi.db = kpi.rohertrag + kpi.konzessionserloes + kpi.untermiete - kpi.personal - kpi.miete - kpi.nebenkosten - kpi.sonstige;
    kpi.fteBedarf = r.fteBedarf;
    kpi.fteIst = h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen;
    if (h.status !== 'geschlossen' && h.status !== 'verkauft') h.kpi = rundeKpi(kpi);

    k.umsatz += kpi.umsatz;
    k.rohertrag += kpi.rohertrag;
    k.konzession += kpi.konzessionserloes;
    k.untermiete += kpi.untermiete;
    k.personal += kpi.personal;
    k.miete += kpi.miete;
    k.nebenkosten += kpi.nebenkosten;
    k.sonstige += kosten.sonstige;
    k.logistik += kosten.logistik;
    k.fte += kpi.fteIst;
    if (h.status === 'offen' || h.status === 'schliessung_verhandlung' || h.status === 'raeumung') k.offeneHaeuser += 1;
    if (!insolvenzgeld) personalCash += kpi.personal;

    // Aktionsmessung (verdeckt, je Aktion und Gruppe, nach Warenverfügbarkeit)
    messeAktionen(s, r.aktionsMessung, verfuegbar, PARAM.kommissionsMarge);
  }

  // Werbekostenzuschüsse auf Einkaufsvolumen
  for (const l of s.lieferanten) {
    if (!l.aktiv) continue;
    for (const [g, a] of Object.entries(l.gruppen) as [GruppeId, number][]) {
      // Eigenmarken verdrängen Fremdmarken: weniger Zuschüsse, etwas weniger Vertrauen
      const kan = kannibalisierung(s, g);
      k.wkz += (einsatz[g] ?? 0) * a * l.wkzQuote * (1 - kan);
      if (kan > 0 && !s.prognose) l.vertrauen = clamp(l.vertrauen - 0.3 * kan * a, 0, 100);
    }
  }
  // Einkauf in der Zentrale: Zuschüsse und Konditionen auf den Wareneinsatz
  const einsatzSumme = Object.values(einsatz).reduce((a, b) => a + (b ?? 0), 0);
  k.wkz = k.wkz * hqWkzFaktor(s) + einsatzSumme * hqEinkaufKonditionen(s);

  // 5. Zentrale Kosten (aus der Hauptverwaltung, inkl. Controlling) und Restmieten gekündigter Büros
  k.zentrale = s.zentrale.kostenWoche;
  restmieten += hqRestmieteWoche(s);
  const markenBudget = s.eigenmarken.marken.reduce((x, m) => x + (istVerkaufsaktiv(m) || m.status === 'aufbau' ? m.budgetWoche : 0), 0);
  // Werbung netto (Kanäle, Karte, App, CRM, Sonderwerbung abzüglich Lieferantenbeteiligung) plus Markenbudgets der Eigenmarken
  const mk = marketingKosten(s, k.umsatz);
  k.marketing = mk.netto + markenBudget;
  k.beratung = s.berater.filter((b) => w >= b.start && w < b.ende).reduce((x, b) => x + b.wochenSatz, 0);

  // 6. Abschriften und Gewöhnung
  k.abschriften = einkaufAltern(s);
  k.rohertrag -= k.abschriften;
  eigenmarkenWoche(s, einkaufBuchen(s, umsatzEigenJe));
  produkteBuchen(s);
  s.marketing.gewoehnung = Math.max(0, s.marketing.gewoehnung * 0.99);

  k.ebitda = k.rohertrag + k.konzession + k.untermiete + k.wkz - k.personal - k.miete - k.nebenkosten - k.sonstige - k.logistik - k.zentrale - k.marketing - k.beratung;
  k.sondereffekte = s.einmalErloeseWoche - s.einmalkostenWoche - restmieten;
  marketingAbschluss(s, k.umsatz, mk);

  // 7. Disposition: NOS, Nachorder, Vororder, Freigabe-Eingang
  einkaufDispo(s);

  // 8. Zahlungen: erst Pflichtzahlungen, dann Lieferanten
  const zinsen = Math.max(0, -s.cash) * (PARAM.zinsSatz / 52);
  const einzahlung = k.umsatz + k.konzession + k.untermiete + k.wkz;
  const pflicht = kommissionAuszahlung + personalCash + k.miete + restmieten + k.nebenkosten + k.sonstige + k.logistik + k.zentrale + k.marketing + k.beratung + zinsen + offEinsatz.warenhaus.zukauf + offEinsatz.sport.zukauf;
  s.cash += eur(einzahlung - pflicht);
  if (insolvenzgeld && s.insolvenz) s.insolvenz.altVerbindlichkeiten += eur(k.personal);

  if (s.cash + s.kreditlinie < 0) {
    if (s.phase === 'regulaer') eroeffneInsolvenz(s, 'Zahlungsunfähigkeit: Löhne und Mieten nicht gedeckt');
    else if (s.phase === 'insolvenz') zerschlagungDurchMasseunzulaenglichkeit(s);
  }
  if (!beendet(s)) lieferantenZahlungen(s);

  // 9. Stakeholder, Ereignisse, Aktionsauswertung
  aktualisiereStakeholder(s);
  ereignisse(s);
  wettbewerbWoche(s);
  werteAktionenAus(s);

  if (s.insolvenz && w + 1 >= s.insolvenz.versammlung) glaeubigerversammlung(s);

  for (const key of Object.keys(k) as (keyof WochenKpi)[]) if (typeof k[key] === 'number') (k[key] as number) = eur(k[key] as number);
  k.fte = Math.round(k.fte);
  k.cash = eur(s.cash);
  k.kreditFrei = eur(s.cash + s.kreditlinie);
  k.bestand = eur(s.bestand.reduce((a, b) => a + b.wert, 0));
  s.historie.push(k);
  if (s.historie.length > 520) s.historie.splice(0, s.historie.length - 520);

  if (!s.prognose && w % 13 === 12 && !beendet(s)) quartalsBewertung(s);
  // Einmaleffekte, die ab jetzt anfallen (Aktionen des Spielers), zählen zur nächsten Woche
  s.einmalkostenWoche = 0;
  s.einmalErloeseWoche = 0;
  s.woche += 1;
  return k;
}

function lieferantenZahlungen(s: GameState): void {
  const w = s.woche;
  const faellig = s.verbindlichkeiten.filter((v) => v.faellig <= w).sort((a, b) => a.faellig - b.faellig);
  let unbezahlt = false;
  for (const v of faellig) {
    if (s.cash - v.wert >= -s.kreditlinie) {
      s.cash -= v.wert;
      v.wert = 0;
    } else {
      unbezahlt = true;
      if (v.ueberfaelligSeit === undefined) v.ueberfaelligSeit = w;
      if (v.gruppe) for (const l of s.lieferanten) if (l.gruppen[v.gruppe]) l.verspaetungen += 0.25;
    }
  }
  s.verbindlichkeiten = s.verbindlichkeiten.filter((v) => v.wert > 0);
  if (unbezahlt) {
    if (s.zahlungsstockungSeit === undefined) {
      s.zahlungsstockungSeit = w;
      melde(s, 'warnung', 'Zahlungsstockung: Fällige Lieferantenrechnungen können nicht beglichen werden.', { modul: 'einkauf' });
    }
    if (w - s.zahlungsstockungSeit >= 3 && s.phase === 'regulaer') eroeffneInsolvenz(s, 'Zahlungsunfähigkeit: Lieferanten seit drei Wochen nicht bezahlt');
  } else s.zahlungsstockungSeit = undefined;
}

function werteAktionenAus(s: GameState): void {
  if (s.prognose) return;
  const r = marketingRng(s); // eigener Zufallsstrom, damit der Aktionskalender die übrige Simulation nicht verschiebt
  const breite = hqControllingExzellenz(s) ? 0.08 : [0.45, 0.25, 0.12][s.controllingStufe];
  const bias = [0.15, 0.03, 0][s.controllingStufe];
  for (const a of s.marketing.aktionen) {
    if (a.ausgewertet || a.ende !== s.woche + 1) continue;
    const m = a._mehrumsatzWahr;
    const kontrolle = a.kontrollHaeuser.length >= 5;
    const b = breite * (kontrolle ? 0.5 : 1);
    const stoer = zwischen(r, 0, 1) < 0.25;
    const zentrum = m * (1 + bias * (kontrolle ? 0.3 : 1) + normal(r) * b * 0.35) + (stoer ? Math.abs(m) * zwischen(r, -0.15, 0.15) : 0);
    const halb = Math.abs(m) * b * (stoer ? 1.3 : 1);
    a.ausgewertet = {
      marketingBericht: eur(Math.abs(m) * zwischen(r, 1.3, 1.9)),
      schaetzungVon: eur(zentrum - halb),
      schaetzungBis: eur(zentrum + halb),
      hinweis: stoer ? 'Störfaktoren in der Messung (Wetter, Ferienverschiebung, Nachbarschließung).' : kontrolle ? 'Gemessen gegen Kontrollhäuser.' : 'Gemessen gegen Vorjahr und Trend.',
    };
    melde(s, 'info', `Aktion „${a.name}“ ausgewertet. Marketing meldet ${mio(a.ausgewertet.marketingBericht)} Mehrumsatz, Controlling schätzt ${mio(a.ausgewertet.schaetzungVon)} bis ${mio(a.ausgewertet.schaetzungBis)}.`, { modul: 'marketing' });
  }
}

setzePlanWoche((klon) => wocheAbspielen(klon).ebitda);

export interface VorschauWoche { woche: number; cash: number; kreditFrei: number; ebitda: number; umsatz: number }

/** Liquiditätsvorschau: spielt einen Klon ohne Zufallsereignisse weiter. */
export function vorschau(s: GameState, wochen = 13): VorschauWoche[] {
  const klon: GameState = structuredClone(s);
  klon.prognose = true;
  const out: VorschauWoche[] = [];
  for (let i = 0; i < wochen; i++) {
    if (klon.phase === 'zerschlagen') break;
    const k = wocheAbspielen(klon);
    out.push({ woche: k.woche, cash: k.cash, kreditFrei: k.kreditFrei, ebitda: k.ebitda, umsatz: k.umsatz });
  }
  return out;
}
