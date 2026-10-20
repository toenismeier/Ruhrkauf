import { BERATER, GRUPPEN, MIETER } from './daten';
import { basisUmsatzHaus, beraterErgebnis, hausAttraktivitaet, loeseEntscheidung, offeneHaeuser, zufallsProjektname } from './ereignisse';
import { einmalKosten, eroeffneInsolvenz, starteSchliessung } from './prozesse';
import { runwayWochen } from './stakeholder';
import type {
  AktionsScope, BeraterTyp, Cluster, Flaeche, Format, GameState, GruppeId, Haus, Konzept, Untermieter,
} from './types';
import { chance, clamp, eur, mio, neueId, waehle, melde } from './util';
import { bestandWert, verbrauche } from './ware';
import { PARAM } from './welt';
import {
  abteilungSetzen, abteilungStufe, hqEtageKuendigen, hqGebaeudeKuendigen, hqMieten, hqVerhandlungsBonus, zentraleKuerzen,
  type AbteilungId, type Stufe,
} from './hq';
import { EINKAUF_AKTIONEN, einkaufAktion, type EinkaufAktion } from './einkauf';
import { VORSTAND_AKTIONEN, vorstandAktion, type VorstandAktion } from './vorstand';
import { PRODUKT_AKTIONEN, produktAktion, type ProduktAktion } from './produkte';
import { MARKETING_AKTIONEN, aktionKompatibel, kundenkarteKompatibel, marketingAktion, marketingBudgetKompatibel, type MarketingAktion } from './marketing';
import { uebernehmeWettbewerber } from './wettbewerb';
import { premiumInvestieren, premiumVerkaufen } from './premium';
import { testAktion, type TestAktion } from './testwerkzeuge';

export type SpielerAktion =
  | { typ: 'schliessen'; haus: string }
  | { typ: 'flaecheUmbauen'; haus: string; flaeche: string; konzept: Konzept; gruppe?: GruppeId }
  | { typ: 'flaecheTeilen'; haus: string; flaeche: string; qm: number }
  | { typ: 'geschaeftsmodell'; haeuser: string[] | 'alle'; gruppe: GruppeId; modell: 'eigen' | 'kommission' | 'konzession' }
  | { typ: 'aushilfen'; haeuser: string[] | 'alle'; quote: number }
  | { typ: 'personalabbau'; haeuser: string[] | 'alle'; prozent: number }
  | { typ: 'personalaufbau'; haeuser: string[] | 'alle'; prozent: number }
  | { typ: 'halteprämie'; haeuser: string[] | 'alle'; betrag: number }
  | { typ: 'tarif'; ziel: 'sanierung' | 'ohne'; garantieWochen?: number }
  | { typ: 'zentrale'; prozent: number }
  | { typ: 'marketingBudget'; quote: number }
  | { typ: 'aktion'; name?: string; rabatt: number; wochen: number; scope: AktionsScope; kontrollHaeuser?: string[]; start?: number }
  | { typ: 'premiumSchuetzen'; an: boolean }
  | { typ: 'premiumInvestition'; haus: string; betrag: number }
  | { typ: 'kundenkarte' }
  | { typ: 'orderLevel'; gruppe: GruppeId | 'alle'; level: number }
  | { typ: 'vorkasse'; erlaubt: boolean }
  | { typ: 'mieteVerhandeln'; haus: string; reduktion: number; tripleNet?: boolean }
  | { typ: 'angebotVerhandeln'; angebot: string; haeuser: string[] }
  | { typ: 'angebotAnnehmen'; angebot: string }
  | { typ: 'angebotUebernehmen'; angebot: string; modus: 'outlet' | 'erweiterung' }
  | { typ: 'angebotAblehnen'; angebot: string }
  | { typ: 'berater'; beraterTyp: BeraterTyp }
  | { typ: 'controlling'; stufe: 0 | 1 | 2 }
  | { typ: 'plan'; ebitda: number }
  | { typ: 'insolvenzAntrag' }
  | { typ: 'insolvenzplanQuote'; quote: number }
  | { typ: 'entscheiden'; id: string; option: string }
  // Hauptverwaltung
  | { typ: 'hqMieten'; angebot: string; etagen: number[] }
  | { typ: 'hqEtageKuendigen'; gebaeude: string; etage: number }
  | { typ: 'hqGebaeudeKuendigen'; gebaeude: string }
  | { typ: 'abteilungSetzen'; abteilung: AbteilungId; gebaeude: string; etage: number }
  | { typ: 'abteilungStufe'; abteilung: AbteilungId; stufe: Stufe }
  // Einkauf, Freigaben, Eigenmarken (src/einkauf.ts)
  | EinkaufAktion
  // Vorstand (src/vorstand.ts) und Produktentwicklung (src/produkte.ts)
  | VorstandAktion
  // Marketing: Kanäle, Hartwig Karte und App, CRM, Aktionskalender (src/marketing.ts)
  | MarketingAktion
  | ProduktAktion
  | TestAktion;

export interface Ergebnis { ok: boolean; text: string }
const ok = (text: string): Ergebnis => ({ ok: true, text });
const fehler = (text: string): Ergebnis => ({ ok: false, text });

function haus(s: GameState, id: string): Haus | undefined {
  return s.haeuser.find((h) => h.id === id);
}

function auswahl(s: GameState, ids: string[] | 'alle'): Haus[] {
  if (ids === 'alle') return offeneHaeuser(s);
  return ids.map((id) => haus(s, id)).filter((h): h is Haus => !!h && h.status === 'offen');
}

const etageName = (e: number) => (e === -1 ? 'UG' : e === 0 ? 'EG' : `${e}. OG`);

/** Umbaukosten in €/qm und Dauer in Wochen. */
export function umbauParameter(von: Konzept, nach: Konzept): { qm: number; wochen: number } {
  if (nach === 'leer') return { qm: 15, wochen: 1 };
  if (nach === 'offprice') return { qm: 90, wochen: 3 };
  if (nach === 'untermiete') return { qm: 320, wochen: 10 };
  if (von === 'leer') return { qm: 250, wochen: 8 };
  return { qm: 180, wochen: 6 };
}

/** Schneidet qm auf einer Etage frei: erst Leerstand, dann die schwächsten Sortimente. */
export function flaecheFreimachen(s: GameState, h: Haus, etage: number, qm: number): Flaeche[] | null {
  const rang = (f: Flaeche) => (f.konzept === 'leer' ? 0 : f.konzept === 'offprice' ? 1 : f.konzept === 'eigen' && f.gruppe ? 2 + GRUPPEN[f.gruppe].qmUmsatz : 1000);
  const kand = h.flaechen.filter((f) => f.etage === etage && f.konzept !== 'untermiete' && f.umbauBis === undefined).sort((a, b) => rang(a) - rang(b));
  if (kand.reduce((a, b) => a + b.qm, 0) < qm) return null;
  let rest = qm;
  const out: Flaeche[] = [];
  for (const f of kand) {
    if (rest <= 0) break;
    if (f.qm <= rest + 50) { out.push(f); rest -= f.qm; }
    else {
      const n: Flaeche = { ...f, id: `${h.id}-f${neueId(s, '')}`, qm: Math.round(rest) };
      f.qm -= Math.round(rest);
      h.flaechen.push(n);
      out.push(n);
      rest = 0;
    }
  }
  return out;
}

function scopeHaeuser(s: GameState, sc: AktionsScope): Haus[] {
  return offeneHaeuser(s).filter((h) =>
    sc.typ === 'alle' || (sc.typ === 'format' && sc.format === h.format) || (sc.typ === 'region' && sc.region === h.region) ||
    (sc.typ === 'cluster' && sc.cluster === h.cluster) || (sc.typ === 'haeuser' && sc.ids.includes(h.id)));
}

function letzterUmsatz(s: GameState): number {
  return s.historie.length ? s.historie[s.historie.length - 1].umsatz : offeneHaeuser(s).reduce((a, h) => a + basisUmsatzHaus(h), 0);
}

export function fuehreAus(s: GameState, a: SpielerAktion): Ergebnis {
  if (a.typ.startsWith('test')) return testAktion(s, a as TestAktion);
  if (s.phase === 'zerschlagen') return fehler('Die Kette ist zerschlagen.');
  const w = s.woche;
  const inso = s.phase === 'insolvenz';
  if (EINKAUF_AKTIONEN.has(a.typ)) return einkaufAktion(s, a as EinkaufAktion, (x) => einmalKosten(s, x));
  if (VORSTAND_AKTIONEN.has(a.typ)) return vorstandAktion(s, a as VorstandAktion);
  if (PRODUKT_AKTIONEN.has(a.typ)) return produktAktion(s, a as ProduktAktion);
  if (MARKETING_AKTIONEN.has(a.typ)) return marketingAktion(s, a as MarketingAktion, (x) => einmalKosten(s, x));
  switch (a.typ) {
    case 'premiumSchuetzen':
      s.premiumSchuetzen = a.an;
      return ok(a.an ? 'Premiumhäuser sind vor pauschalen Rabattaktionen geschützt.' : 'Premiumschutz deaktiviert.');
    case 'premiumInvestition': {
      const fehlerText = premiumInvestieren(s, a.haus, a.betrag);
      return fehlerText ? fehler(fehlerText) : ok('Premium-Investition gestartet (26 Wochen).');
    }
    case 'schliessen': {
      const h = haus(s, a.haus);
      if (!h) return fehler('Haus nicht gefunden.');
      const f = starteSchliessung(s, h);
      return f ? fehler(f) : ok(`Schließung von ${h.name} eingeleitet.`);
    }

    case 'flaecheUmbauen': {
      const h = haus(s, a.haus);
      const f = h?.flaechen.find((x) => x.id === a.flaeche);
      if (!h || !f || h.status !== 'offen') return fehler('Fläche nicht gefunden oder Haus nicht offen.');
      if (f.umbauBis !== undefined) return fehler('Die Fläche ist bereits im Umbau.');
      if (a.konzept === 'untermiete' || a.konzept === 'konzession' || a.konzept === 'kommission') return fehler('Untermiete läuft über Angebote, Konzession und Kommission über das Geschäftsmodell.');
      if (a.konzept === 'eigen') {
        if (!a.gruppe || GRUPPEN[a.gruppe].format !== h.format) return fehler('Bitte eine passende Warengruppe angeben.');
        if (h.potenzial[a.gruppe] === undefined) {
          // Neue Gruppe im Haus: Potenzial aus Standort ableiten
          const ref = GRUPPEN[a.gruppe].qmUmsatz * hausAttraktivitaet(h);
          h.saettigungQm[a.gruppe] = f.qm * 0.8;
          h.potenzial[a.gruppe] = (ref * f.qm) / (1 - Math.exp(-1 / 0.8));
        }
      }
      const p = umbauParameter(f.konzept, a.konzept);
      const kosten = p.qm * f.qm;
      einmalKosten(s, kosten);
      f.umbauBis = w + p.wochen;
      f.umbauZiel = { konzept: a.konzept, gruppe: a.konzept === 'eigen' ? a.gruppe : undefined };
      return ok(`Umbau ${etageName(f.etage)} in ${h.name}: ${f.qm} qm zu ${a.konzept === 'eigen' ? GRUPPEN[a.gruppe as GruppeId].name : a.konzept}, ${mio(kosten)}, ${p.wochen} Wochen.`);
    }

    case 'flaecheTeilen': {
      const h = haus(s, a.haus);
      const f = h?.flaechen.find((x) => x.id === a.flaeche);
      if (!h || !f) return fehler('Fläche nicht gefunden.');
      if (a.qm < 100 || a.qm >= f.qm - 100) return fehler('Teilfläche muss mindestens 100 qm groß sein und 100 qm Rest lassen.');
      const n: Flaeche = { ...f, id: `${h.id}-f${neueId(s, '')}`, qm: Math.round(a.qm), mieter: f.mieter ? { ...f.mieter } : undefined };
      f.qm -= Math.round(a.qm);
      h.flaechen.push(n);
      return ok(`Fläche geteilt: ${f.qm} qm und ${n.qm} qm (${n.id}).`);
    }

    case 'geschaeftsmodell': {
      const g = a.gruppe;
      const partner = s.lieferanten.find((l) => l.aktiv && (l.gruppen[g] ?? 0) > 0);
      const vertrauen = partner ? partner.vertrauen : s.restLieferantenVertrauen;
      if (a.modell !== 'eigen' && vertrauen < 35) return fehler(`${partner ? partner.name : 'Die Lieferanten'} lehnen ab: Vertrauen zu gering.`);
      const hs = auswahl(s, a.haeuser).filter((h) => h.format === GRUPPEN[g].format);
      const gesamtG = s.haeuser.reduce((x, h) => x + (h.kpi?.umsatzJeGruppe[g] ?? 0), 0);
      let umgestellt = 0;
      let abgelehnt = 0;
      let erloes = 0;
      let fteWeg = 0;
      for (const h of hs) {
        const flaechen = h.flaechen.filter((f) => f.gruppe === g && f.umbauBis === undefined && f.konzept !== a.modell && (f.konzept === 'eigen' || f.konzept === 'kommission' || f.konzept === 'konzession'));
        if (!flaechen.length) continue;
        if (a.modell === 'konzession' && hausAttraktivitaet(h) < 0.85) { abgelehnt++; continue; }
        const warVorher = flaechen[0].konzept;
        if (warVorher === 'eigen' && gesamtG > 0) {
          const anteil = (h.kpi?.umsatzJeGruppe[g] ?? 0) / gesamtG;
          const wert = bestandWert(s, g) * anteil;
          verbrauche(s, g, wert);
          erloes += wert * (a.modell === 'kommission' ? 0.9 : 0.8);
        }
        if (a.modell === 'konzession') {
          const qm = flaechen.reduce((x, f) => x + f.qm, 0);
          const fte = qm / PARAM.qmJeFte + (h.kpi?.umsatzJeGruppe[g] ?? 0) / PARAM.umsatzJeFte;
          const p = h.personal;
          const fest = p.vollzeit + p.teilzeit;
          const weg = Math.min(fte, fest * 0.5);
          if (fest > 0) { p.vollzeit -= (weg * p.vollzeit) / fest; p.teilzeit -= (weg * p.teilzeit) / fest; }
          fteWeg += weg;
        }
        for (const f of flaechen) {
          f.umbauBis = w + 2;
          f.umbauZiel = { konzept: a.modell, gruppe: g, lieferantId: partner?.id };
        }
        umgestellt++;
      }
      s.cash += eur(erloes);
      s.einmalErloeseWoche += eur(erloes);
      if (!umgestellt) return fehler(abgelehnt ? `Der Partner lehnt alle ${abgelehnt} Standorte ab.` : 'Keine passenden Flächen gefunden.');
      return ok(`${GRUPPEN[g].name} in ${umgestellt} Häusern auf ${a.modell} umgestellt${abgelehnt ? `, ${abgelehnt} Standorte abgelehnt` : ''}. Ware für ${mio(erloes)} übernommen${fteWeg > 0 ? `, ${Math.round(fteWeg)} FTE wechseln per Betriebsübergang` : ''}.`);
    }

    case 'aushilfen': {
      const q = clamp(a.quote, 0, 0.5);
      const hs = auswahl(s, a.haeuser);
      for (const h of hs) {
        const fest = h.personal.vollzeit + h.personal.teilzeit;
        h.personal.aushilfen = (q / (1 - q)) * fest;
      }
      if (q > 0.25) s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - 3, 0, 100);
      return ok(`Aushilfenquote in ${hs.length} Häusern auf ${Math.round(q * 100)} % gesetzt.`);
    }

    case 'personalabbau': {
      if (s.tarif === 'sanierung' && s.standortgarantieBis !== undefined) return fehler('Der Sanierungstarifvertrag schließt betriebsbedingte Kündigungen aus.');
      const p = clamp(a.prozent, 0, 0.4);
      const hs = auswahl(s, a.haeuser);
      let fte = 0;
      for (const h of hs) {
        const x = h.personal;
        const weg = (x.vollzeit + x.teilzeit) * p;
        const tz = Math.min(x.teilzeit, weg * 0.6);
        x.teilzeit -= tz;
        x.vollzeit -= weg - tz;
        fte += weg;
      }
      const abf = fte * (inso ? PARAM.abfindungInsolvenz : PARAM.abfindungRegulaer);
      einmalKosten(s, abf);
      s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - Math.min(20, fte / 60), 0, 100);
      melde(s, 'presse', `${s.firma.name} streicht ${Math.round(fte)} Stellen in den Filialen.`);
      return ok(`${Math.round(fte)} FTE abgebaut, Abfindungen ${mio(abf)}.`);
    }

    case 'personalaufbau': {
      const p = clamp(a.prozent, 0, 0.5);
      const hs = auswahl(s, a.haeuser);
      let fte = 0;
      for (const h of hs) { const add = (h.personal.vollzeit + h.personal.teilzeit) * p; h.personal.teilzeit += add; fte += add; }
      einmalKosten(s, fte * 1500);
      return ok(`${Math.round(fte)} FTE Teilzeit eingestellt.`);
    }

    case 'halteprämie': {
      const hs = auswahl(s, a.haeuser);
      const betrag = Math.max(0, a.betrag);
      for (const h of hs) h.personal.filialleiter.moral = clamp(h.personal.filialleiter.moral + Math.min(35, betrag / 1000), 0, 100);
      einmalKosten(s, betrag * hs.length);
      return ok(`Halteprämie für ${hs.length} Filialleitungen, gesamt ${mio(betrag * hs.length)}.`);
    }

    case 'tarif': {
      if (a.ziel === 'ohne') {
        if (s.tarif === 'ohne') return fehler('Bereits ohne Tarifbindung.');
        s.tarif = 'ohne';
        s.tarifAusstiegSeit = w;
        s.standortgarantieBis = undefined;
        for (const h of s.haeuser) h.standortgarantie = false;
        s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - 30, 0, 100);
        s.stakeholder.image = clamp(s.stakeholder.image - 5, 0, 100);
        melde(s, 'presse', `Tarifflucht: ${s.firma.name} verlässt den Flächentarif. Verdi kündigt Widerstand an.`);
        return ok('Tarifbindung beendet.');
      }
      if (s.tarif === 'sanierung') return fehler('Sanierungstarif läuft bereits.');
      if (s.tarifVersuch !== undefined && w - s.tarifVersuch < 13) return fehler('Die Gewerkschaft verhandelt frühestens 13 Wochen nach dem letzten Versuch erneut.');
      s.tarifVersuch = w;
      const garantie = clamp(a.garantieWochen ?? 52, 26, 156);
      const p = s.stakeholder.betriebsrat / 100 + (runwayWochen(s) < 20 ? 0.2 : 0) + (garantie / 52) * 0.12 + (inso ? 0.15 : 0);
      if (!chance(s, clamp(p, 0.05, 0.95))) {
        s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - 3, 0, 100);
        return ok('Die Gewerkschaft lehnt den Sanierungstarifvertrag ab.');
      }
      s.tarif = 'sanierung';
      s.standortgarantieBis = w + garantie;
      for (const h of s.haeuser) h.standortgarantie = h.status === 'offen';
      s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat + 5, 0, 100);
      melde(s, 'presse', `Einigung: Beschäftigte verzichten auf Teile von Urlaubs- und Weihnachtsgeld, im Gegenzug Standortgarantie für ${garantie} Wochen.`);
      return ok(`Sanierungstarif vereinbart: Personalkosten -7 %, Standortgarantie ${garantie} Wochen für alle offenen Häuser.`);
    }

    case 'zentrale':
      // Kompatibel: kürzt alle Abteilungen der Hauptverwaltung anteilig
      return zentraleKuerzen(s, a.prozent);

    case 'hqMieten': return hqMieten(s, a.angebot, a.etagen);
    case 'hqEtageKuendigen': return hqEtageKuendigen(s, a.gebaeude, a.etage);
    case 'hqGebaeudeKuendigen': return hqGebaeudeKuendigen(s, a.gebaeude);
    case 'abteilungSetzen': return abteilungSetzen(s, a.abteilung, a.gebaeude, a.etage);
    case 'abteilungStufe': return abteilungStufe(s, a.abteilung, a.stufe);

    case 'marketingBudget': return marketingBudgetKompatibel(s, a.quote);

    // bisherige Rabattaktion: jetzt ein Eintrag im Aktionskalender (Rabatt auf alles mit Sonderwerbung)
    case 'aktion': return aktionKompatibel(s, a);

    case 'kundenkarte': return kundenkarteKompatibel(s, (x) => einmalKosten(s, x));

    case 'orderLevel': {
      const lv = clamp(a.level, 0, 1.5);
      const gs = a.gruppe === 'alle' ? (Object.keys(s.orderLevel) as GruppeId[]) : [a.gruppe];
      for (const g of gs) s.orderLevel[g] = lv;
      return ok(`Einkaufsregler ${a.gruppe === 'alle' ? 'aller Gruppen' : GRUPPEN[a.gruppe].name} auf ${Math.round(lv * 100)} %.`);
    }

    case 'vorkasse':
      s.vorkasseAkzeptieren = a.erlaubt;
      return ok(a.erlaubt ? 'Ware wird bei Bedarf gegen Vorkasse bezogen.' : 'Keine Vorkasse: Lieferungen über dem Limit entfallen.');

    case 'mieteVerhandeln': {
      const h = haus(s, a.haus);
      if (!h || h.status !== 'offen') return fehler('Haus nicht offen.');
      if (h.miete.verhandeltWoche !== undefined && w - h.miete.verhandeltWoche < 26) return fehler('Mit diesem Vermieter wurde vor weniger als 26 Wochen verhandelt.');
      h.miete.verhandeltWoche = w;
      const r = clamp(a.reduktion, 0, 0.5);
      const db = h.kpi?.db ?? 0;
      const triple = !!a.tripleNet && h.miete.netTyp !== 'triple';
      let erreicht = 0;
      if (h.miete.vermieter === 'eigentuemer') {
        // Neutral: stimmt zu, wenn die Zahlen es tragen
        if (db < 0 && r <= 0.25) erreicht = r;
        else if (r <= 0.05) erreicht = r;
        if (triple) erreicht = Math.max(erreicht, 0.12);
      } else {
        // Die Immobilienabteilung der Zentrale verbessert die Verhandlungsposition
        const p = 0.15 + 0.5 * (s.stakeholder.vermieter / 100) + (db < 0 ? 0.2 : 0) - 1.5 * Math.max(0, r - 0.1) + (inso ? 0.25 : 0) + (triple ? 0.2 : 0) + hqVerhandlungsBonus(s);
        if (chance(s, clamp(p, 0.02, 0.95))) erreicht = r;
        else if (chance(s, 0.3)) erreicht = r / 2;
        if (r > 0.2 && erreicht === 0 && chance(s, 0.2)) {
          h.miete.keineVerlaengerung = true;
          melde(s, 'warnung', `Der Vermieter von ${h.name} reagiert verstimmt und kündigt an, den Vertrag nicht zu verlängern.`);
        }
        s.stakeholder.vermieter = clamp(s.stakeholder.vermieter - 1.5, 0, 100);
      }
      if (erreicht <= 0) return ok(`${h.miete.vermieterName} lehnt eine Mietsenkung für ${h.name} ab.`);
      h.miete.mieteWoche = eur(h.miete.mieteWoche * (1 - erreicht));
      if (triple) { h.miete.netTyp = 'triple'; if (h.miete.nebenkostenQmWoche === 0) h.miete.nebenkostenQmWoche = 1.2; }
      return ok(`${h.miete.vermieterName} akzeptiert ${Math.round(erreicht * 100)} % Mietsenkung für ${h.name}${triple ? ' gegen Umstellung auf Triple-Net' : ''}. Neue Jahresmiete ${mio(h.miete.mieteWoche * 52)}.`);
    }

    case 'angebotVerhandeln': {
      const an = s.angebote.find((x) => x.id === a.angebot && x.status === 'offen');
      if (an?.typ === 'premiumVerkauf') {
        if (s.phase !== 'insolvenz') return fehler('Premiumverkauf nur in Insolvenz.');
        if (an.vorschlagHaeuser?.length) return fehler('Dieses Angebot wurde bereits verhandelt.');
        an.kaufpreis = eur((an.kaufpreis ?? 0) * 1.04);
        an.vorschlagHaeuser = [...(an.wunschHaeuser ?? [])];
        return ok(`Nachverhandelt: ${mio(an.kaufpreis)} Kaufpreis.`);
      }
      if (!an || an.typ !== 'paket') return fehler('Nur Paket- und Premiumangebote lassen sich verhandeln.');
      const hs = a.haeuser.map((id) => haus(s, id)).filter((h): h is Haus => !!h && h.status === 'offen' && h.etagen.includes(an.etage ?? 0));
      if (hs.length < (an.minHaeuser ?? 1)) return ok(`${an.mieterName}: „Unter ${an.minHaeuser} Standorten lohnt sich das für uns nicht.“`);
      const wunsch = (an.wunschHaeuser ?? []).map((id) => haus(s, id)).filter((h): h is Haus => !!h);
      const wert = (xs: Haus[]) => xs.reduce((x, h) => x + hausAttraktivitaet(h), 0);
      const ratio = wert(hs) / Math.max(0.01, wert(wunsch.slice(0, hs.length)));
      const flex = an.flexibilitaet ?? 0.2;
      an.vorschlagHaeuser = hs.map((h) => h.id);
      if (ratio >= 1 - flex) return ok(`${an.mieterName} ist mit der Standortliste einverstanden (${hs.length} Häuser).`);
      if (ratio >= 1 - flex - 0.08) {
        an.mieteQmMonat = Math.round((an.mieteQmMonat ?? 0) * 0.9 * 10) / 10;
        an.flexibilitaet = Math.max(0, flex - 0.03);
        return ok(`${an.mieterName} akzeptiert die Liste nur mit 10 % weniger Miete: ${an.mieteQmMonat?.toFixed(2)} €/qm.`);
      }
      an.flexibilitaet = Math.max(0, flex - 0.03);
      an.vorschlagHaeuser = [...(an.wunschHaeuser ?? [])];
      return ok(`${an.mieterName}: „Das sind nicht die Standorte, über die wir gesprochen haben.“ Die Wunschliste gilt weiter.`);
    }

    case 'angebotUebernehmen': {
      const an = s.angebote.find((x) => x.id === a.angebot && x.status === 'offen' && x.typ === 'uebernahme');
      if (!an || !an.wettbewerberId) return fehler('Kein offenes Übernahmeangebot gefunden.');
      const grund = uebernehmeWettbewerber(s, an.wettbewerberId, a.modus, an.mieteQmMonat);
      if (grund) return fehler(grund);
      an.status = 'angenommen';
      return ok('Wettbewerberstandort übernommen als ' + (a.modus === 'outlet' ? 'Outlet.' : 'Erweiterung.'));
    }

    case 'angebotAblehnen': {
      const an = s.angebote.find((x) => x.id === a.angebot && x.status === 'offen');
      if (!an) return fehler('Angebot nicht gefunden.');
      an.status = 'abgelehnt'; an.erledigtWoche = w;
      return ok(`${an.titel}: abgelehnt.`);
    }

    case 'angebotAnnehmen': {
      const an = s.angebote.find((x) => x.id === a.angebot && x.status === 'offen');
      if (!an) return fehler('Angebot nicht gefunden oder abgelaufen.');
      if (an.typ === 'premiumVerkauf') {
        const grund = premiumVerkaufen(s, an);
        return grund ? fehler(grund) : ok(`Premiumhaus verkauft: ${mio(an.kaufpreis ?? 0)} fließen zu.`);
      }
      if (an.typ === 'uebernahme') {
        if (!an.wettbewerberId) return fehler('Wettbewerber fehlt.');
        const grund = uebernehmeWettbewerber(s, an.wettbewerberId, 'outlet', an.mieteQmMonat);
        if (grund) return fehler(grund);
        an.status = 'angenommen';
        return ok('Konkurrenzfläche als eigenes Outlet übernommen.');
      }
      if (an.typ === 'untermiete' || an.typ === 'paket') {
        const def = MIETER.find((m) => m.typ === an.mieterTyp);
        const ids = an.vorschlagHaeuser ?? [];
        const ergebnisse: string[] = [];
        let erfolgreich = 0;
        let kostenGesamt = 0;
        for (const id of ids) {
          const h = haus(s, id);
          if (!h || h.status !== 'offen') continue;
          if (h.miete.vermieter === 'dritt' && !chance(s, 0.45 + 0.5 * (s.stakeholder.vermieter / 100))) { ergebnisse.push(`${h.name}: keine Zustimmung des Vermieters`); continue; }
          const qm = an.qmJeHaus ?? 0;
          const fl = flaecheFreimachen(s, h, an.etage ?? 0, qm);
          if (!fl) { ergebnisse.push(`${h.name}: nicht genug Fläche`); continue; }
          const p = umbauParameter('eigen', 'untermiete');
          const kosten = p.qm * qm * (1 - (an.umbauAnteilMieter ?? 0));
          kostenGesamt += kosten;
          const ende = w + p.wochen + (an.laufzeitJahre ?? 10) * 52;
          const gesamtMiete = (qm * (an.mieteQmMonat ?? 0) * 12) / 52;
          for (const f of fl) {
            const mieter: Untermieter = { name: an.mieterName ?? 'Mieter', typ: an.mieterTyp ?? 'discounter', mieteWoche: eur((gesamtMiete * f.qm) / qm), bisWoche: ende, frequenzBonus: ((def?.frequenzBonus ?? 0.02) * f.qm) / qm, dealId: an.id };
            f.umbauBis = w + p.wochen;
            f.umbauZiel = { konzept: 'untermiete', mieter };
          }
          if (ende > h.miete.bisWoche) {
            h.miete.bisWoche = ende;
            ergebnisse.push(`${h.name}: Hauptmietvertrag bis ${Math.floor(ende / 52) + s.startJahr} verlängert (Laufzeitkonflikt)`);
          }
          erfolgreich++;
        }
        einmalKosten(s, kostenGesamt);
        an.status = erfolgreich ? 'angenommen' : 'abgelehnt'; an.erledigtWoche = w;
        if (!erfolgreich) return fehler(`Kein Standort umsetzbar. ${ergebnisse.join('; ')}`);
        melde(s, 'presse', `${an.mieterName} zieht in ${erfolgreich} Häuser von ${s.firma.name} ein.`);
        return ok(`${an.mieterName} in ${erfolgreich} Häusern, Umbau ${mio(kostenGesamt)}. ${ergebnisse.join('; ')}`);
      }
      if (an.typ === 'stadt') {
        const h = haus(s, an.wunschHaeuser?.[0] ?? '');
        if (!h) return fehler('Haus nicht gefunden.');
        const f = starteSchliessung(s, h, { mietvertragEndetMit: true });
        if (f) return fehler(f);
        s.cash += an.einmalzahlung ?? 0;
        s.einmalErloeseWoche += an.einmalzahlung ?? 0;
        s.stakeholder.image = clamp(s.stakeholder.image + 3, 0, 100);
        an.status = 'angenommen'; an.erledigtWoche = w;
        melde(s, 'presse', `Neues Leben für ${h.name}: Die Stadt übernimmt das Haus.`);
        return ok(`Die Stadt übernimmt ${h.name}. Keine Restmiete, Ablöse ${mio(an.einmalzahlung ?? 0)}.`);
      }
      if (an.typ === 'sportverkauf') {
        const preis = an.kaufpreis ?? 0;
        for (const h of s.haeuser.filter((x) => x.format === 'sport' && x.status !== 'geschlossen')) {
          h.status = 'verkauft';
          h.personal.vollzeit = 0; h.personal.teilzeit = 0; h.personal.aushilfen = 0;
          for (const n of s.haeuser) if (n.format === 'warenhaus' && n.stadt === h.stadt) n.transferBonus -= 0.02;
        }
        const sportGruppen = Object.keys(s.basisUmsatz).filter((g) => GRUPPEN[g as GruppeId].format === 'sport') as GruppeId[];
        s.bestand = s.bestand.filter((k) => !sportGruppen.includes(k.gruppe));
        s.bestellungen = s.bestellungen.filter((b) => !sportGruppen.includes(b.gruppe));
        for (const g of sportGruppen) { delete s.basisUmsatz[g]; delete s.orderLevel[g]; }
        s.cash += preis;
        s.einmalErloeseWoche += preis;
        an.status = 'angenommen'; an.erledigtWoche = w;
        melde(s, 'presse', `${s.firma.sportName} geht für ${mio(preis)} an einen Finanzinvestor.`);
        return ok(`Sportkette verkauft: ${mio(preis)} fließen zu.`);
      }
      if (an.typ === 'sonderposten') {
        const wert = an.wert ?? 0;
        if (s.cash + s.kreditlinie < wert) return fehler('Nicht genug Liquidität für die Vorkasse.');
        s.cash -= wert;
        const g = an.gruppe as GruppeId;
        s.bestand.push({ gruppe: g, wert: wert * 2, alter: an._passt ? 2 : 20, saisonAnteil: GRUPPEN[g].saisonAnteil, kostenFaktor: 0.5, ladenhueter: !an._passt });
        an.status = 'angenommen'; an.erledigtWoche = w;
        return ok(`Sonderposten ${GRUPPEN[g].name} für ${mio(wert)} gekauft.`);
      }
      return fehler('Unbekannter Angebotstyp.');
    }

    case 'berater': {
      const def = BERATER.find((b) => b.typ === a.beraterTyp);
      if (!def) return fehler('Unbekannte Beratung.');
      if (s.berater.some((b) => b.typ === a.beraterTyp && b.ende > w)) return fehler('Diese Art Mandat läuft bereits.');
      const name = waehle(s, def.haeuser);
      const projekt = zufallsProjektname(s);
      s.berater.push({ id: neueId(s, 'c'), typ: a.beraterTyp, haus: name, projektname: projekt, start: w, ende: w + def.dauer, wochenSatz: def.wochenSatz, _qualitaet: s.beraterQualitaet[name] ?? 0.5 });
      s.stakeholder.bank = clamp(s.stakeholder.bank + def.bankBonus, 0, 100);
      s.stakeholder.eigentuemer = clamp(s.stakeholder.eigentuemer + def.eigentuemerBonus, 0, 100);
      melde(s, 'presse', `${name} soll ${s.firma.name} retten: Projekt „${projekt}“ startet.`);
      return ok(`${name} beauftragt (Projekt ${projekt}), ${mio(def.wochenSatz)} pro Woche für ${def.dauer} Wochen.`);
    }

    case 'controlling': {
      // Kompatibel: setzt die Stufe der Abteilung Controlling in der Hauptverwaltung
      const r = abteilungStufe(s, 'controlling', a.stufe);
      if (!r.ok) return r;
      return ok(`${['Controlling auf Minimalbesetzung: billig, aber ungenau.', 'Controlling in Normalbesetzung.', 'Controlling ausgebaut: präzise Schätzungen, höhere Kosten.'][a.stufe]} ${r.text}`);
    }

    case 'plan': {
      const q = s.quartale[s.quartale.length - 1];
      if (!q || w - q.start > 3) return fehler('Der Quartalsplan kann nur in den ersten vier Wochen eines Quartals eingereicht werden.');
      q.plan = eur(a.ebitda);
      return ok(`Plan für Quartal ${q.nr + 1} eingereicht: EBITDA ${mio(q.plan)} (Prognose ${mio(q.planStandard)}).`);
    }

    case 'insolvenzAntrag': {
      if (inso) return fehler('Das Verfahren läuft bereits.');
      const frueh = runwayWochen(s) > 8;
      eroeffneInsolvenz(s, frueh ? 'Eigenantrag im Schutzschirmverfahren' : 'Eigenantrag');
      if (frueh) { s.stakeholder.image = clamp(s.stakeholder.image + 5, 0, 100); s.stakeholder.bank = clamp(s.stakeholder.bank + 5, 0, 100); }
      return ok('Insolvenzantrag gestellt.');
    }

    case 'insolvenzplanQuote': {
      if (!s.insolvenz) return fehler('Kein laufendes Verfahren.');
      s.insolvenz.quote = clamp(a.quote, 0.02, 0.5);
      return ok(`Insolvenzplan mit Quote ${Math.round(s.insolvenz.quote * 100)} % = ${mio(s.insolvenz.quote * s.insolvenz.altVerbindlichkeiten)}.`);
    }

    case 'entscheiden': {
      const f = loeseEntscheidung(s, a.id, a.option);
      return f ? fehler(f) : ok('Entschieden.');
    }
  }
  return fehler('Unbekannte Aktion.');
}

export { beraterErgebnis };
export type { Cluster, Format };
