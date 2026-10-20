import type { GameState, Haus } from './types';
import { clamp, eur, melde, mio } from './util';
import { PARAM } from './welt';
import { lohnKosten } from './wirtschaft';
import { runwayWochen } from './stakeholder';
import { hqMoralZiel, hqRechtFaktor } from './hq';
import { schwierigkeit } from './schwierigkeit';

/** Schließungen je Spielstand in der laufenden Woche (für die abnehmende Imagewirkung einer Schließungswelle). */
const SCHLIESSUNGEN_WOCHE = new WeakMap<GameState, { woche: number; n: number }>();

export const abfindungJeFte = (s: GameState): number => (s.phase === 'insolvenz' ? PARAM.abfindungInsolvenz : PARAM.abfindungRegulaer);

export function einmalKosten(s: GameState, betrag: number): void {
  s.cash -= eur(betrag);
  s.einmalkostenWoche += eur(betrag);
}

export function gesamtFte(s: GameState): number {
  return s.haeuser.reduce((a, h) => a + h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen, 0);
}

function fteAnteil(s: GameState, h: Haus): number {
  return (h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen) / Math.max(1, gesamtFte(s));
}

/** Startet Interessenausgleich und Sozialplanverhandlung, danach Räumungsverkauf und Schließung. */
export function starteSchliessung(s: GameState, h: Haus, opts: { mietvertragEndetMit?: boolean } = {}): string | null {
  if (h.status !== 'offen') return `${h.name} ist nicht offen.`;
  if (h.standortgarantie) return `${h.name} steht unter Standortgarantie aus dem Sanierungstarifvertrag.`;
  const br = s.stakeholder.betriebsrat;
  const dauer = s.phase === 'insolvenz' ? 4 : Math.round(16 - (10 * br) / 100);
  h.status = 'schliessung_verhandlung';
  h.statusBis = s.woche + dauer;
  if (opts.mietvertragEndetMit) h.miete.bisWoche = Math.min(h.miete.bisWoche, s.woche + dauer + 6);
  s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - 60 * fteAnteil(s, h), 0, 100);
  melde(s, 'presse', `${h.name} soll schließen. Betriebsrat und Geschäftsführung verhandeln über Interessenausgleich und Sozialplan (ca. ${dauer} Wochen).`, { stadt: h.stadt, hausId: h.id });
  return null;
}

export function schliesseEndgueltig(s: GameState, h: Haus): void {
  const w = s.woche;
  const fte = h.personal.vollzeit + h.personal.teilzeit;
  // Die Rechtsabteilung verhandelt Sozialplan und Restmieten
  const sozialplan = fte * abfindungJeFte(s) * hqRechtFaktor(s);
  einmalKosten(s, sozialplan);
  const untermiete = h.flaechen.reduce((a, f) => a + (f.konzept === 'untermiete' && f.mieter ? f.mieter.mieteWoche : 0), 0);
  let wochen: number;
  if (s.phase === 'insolvenz') wochen = 13;
  else if (h.miete.vermieter === 'eigentuemer') wochen = 26;
  else wochen = 52;
  wochen = Math.max(0, Math.min(wochen, h.miete.bisWoche - w));
  h.restmieteWoche = eur(Math.max(0, h.miete.mieteWoche - untermiete) * hqRechtFaktor(s));
  h.restmieteBis = w + wochen;
  h.status = 'geschlossen';
  h.statusBis = undefined;
  h.personal.vollzeit = 0;
  h.personal.teilzeit = 0;
  h.personal.aushilfen = 0;
  h.flaechen = h.flaechen.map((f) => ({ ...f, konzept: 'leer', gruppe: undefined, mieter: undefined, lieferantId: undefined, umbauBis: undefined, umbauZiel: undefined }));
  // Kunden wandern teilweise zu Nachbarhäusern
  const nachbarn = s.haeuser.filter((x) => x !== h && x.stadt === h.stadt && x.format === h.format && x.status === 'offen');
  for (const n of nachbarn) n.transferBonus += 0.1 / nachbarn.length;
  const st = s.stakeholder;
  st.betriebsrat = clamp(st.betriebsrat - (s.phase === 'insolvenz' ? 15 : 30) * (fte / Math.max(1, gesamtFte(s) + fte)), 0, 100);
  // Image: jede Schließung kostet, eine Schließungswelle in derselben Woche je nach Schwierigkeit abnehmend
  const sw = SCHLIESSUNGEN_WOCHE.get(s);
  const k = sw && sw.woche === w ? sw.n : 0;
  SCHLIESSUNGEN_WOCHE.set(s, { woche: w, n: k + 1 });
  st.image = clamp(st.image - 1.5 * Math.pow(schwierigkeit(s).imageDaempfung, k), 0, 100);
  st.vermieter = clamp(st.vermieter - (h.miete.vermieter === 'dritt' ? 2 : 0), 0, 100);
  if (h.lage === '1a' && h.format === 'warenhaus') {
    const arvel = s.lieferanten.find((l) => l.id === 'arvel');
    if (arvel && arvel.aktiv) {
      arvel.vertrauen = clamp(arvel.vertrauen - 12, 0, 100);
      if (arvel.vertrauen < 30 && !arvel.rueckzug) {
        arvel.rueckzug = true;
        melde(s, 'warnung', 'Maison Arvel zieht sich aus allen Häusern außerhalb der 1a-Lagen zurück.');
      }
    }
  }
  melde(s, 'presse', `${h.name} schließt endgültig. Sozialplan ${mio(sozialplan)}, ${Math.round(fte)} Beschäftigte betroffen.`, { stadt: h.stadt, hausId: h.id });
}

/** Statuswechsel, Umbauten, Personalfluktuation, Substanz. */
export function prozesse(s: GameState): void {
  const w = s.woche;
  for (const h of s.haeuser) {
    if (h.status === 'schliessung_verhandlung' && (h.statusBis ?? 0) <= w) {
      h.status = 'raeumung';
      h.statusBis = w + 6;
      melde(s, 'presse', `„Alles muss raus“: Räumungsverkauf in ${h.name} beginnt.`, { stadt: h.stadt, hausId: h.id });
      for (const n of s.haeuser) if (n !== h && n.stadt === h.stadt && n.status === 'offen') n.transferBonus -= 0.04;
    } else if (h.status === 'raeumung' && (h.statusBis ?? 0) <= w) {
      for (const n of s.haeuser) if (n !== h && n.stadt === h.stadt && n.status === 'offen') n.transferBonus += 0.04;
      schliesseEndgueltig(s, h);
    }
    if (h.status === 'geschlossen' || h.status === 'verkauft') continue;

    for (const f of h.flaechen) {
      if (f.umbauBis !== undefined && f.umbauBis <= w) {
        if (f.umbauZiel) {
          f.konzept = f.umbauZiel.konzept;
          f.gruppe = f.umbauZiel.gruppe;
          f.mieter = f.umbauZiel.mieter;
          f.lieferantId = f.umbauZiel.lieferantId;
        }
        f.umbauBis = undefined;
        f.umbauZiel = undefined;
      }
      if (f.konzept === 'untermiete' && f.mieter && f.mieter.bisWoche <= w) {
        melde(s, 'info', `Untermieter ${f.mieter.name} in ${h.name} zieht aus.`, { stadt: h.stadt, hausId: h.id });
        f.konzept = 'leer';
        f.mieter = undefined;
      }
    }

    h.transferBonus *= 0.985;
    h.substanz = Math.max(0, h.substanz - 0.05);

    // Fluktuation: Gute gehen in der Krise zuerst
    const p = h.personal;
    const krise = s.phase === 'insolvenz' ? 0.001 : 0;
    const abgang = 0.0012 + krise + Math.max(0, (40 - s.stakeholder.betriebsrat) / 100) * 0.001;
    p.vollzeit *= 1 - abgang;
    p.teilzeit *= 1 - abgang;
    const fl = p.filialleiter;
    const zielMoral = 55 + hqMoralZiel(s) - (s.phase === 'insolvenz' ? 15 : 0) - (h.status === 'schliessung_verhandlung' ? 25 : 0);
    fl.moral = clamp(fl.moral + (zielMoral - fl.moral) * 0.05, 0, 100);
  }
  for (const l of s.lieferanten) if (l.ausfallBis !== undefined && l.ausfallBis <= w) l.ausfallBis = undefined;
  if (s.standortgarantieBis !== undefined && s.standortgarantieBis <= w) {
    s.standortgarantieBis = undefined;
    for (const h of s.haeuser) h.standortgarantie = false;
    melde(s, 'info', 'Die Standortgarantie aus dem Sanierungstarifvertrag ist ausgelaufen.');
  }
}

export function eroeffneInsolvenz(s: GameState, grund: string): void {
  if (s.phase !== 'regulaer' || s.szenario?.regeln.sandkasten) return;
  const w = s.woche;
  let alt = 0;
  for (const v of s.verbindlichkeiten) alt += v.wert;
  if (s.cash < 0) {
    alt += -s.cash;
    s.cash = 0;
  }
  s.verbindlichkeiten = [];
  s.phase = 'insolvenz';
  s.insolvenzenGesamt += 1;
  s.zahlungsstockungSeit = undefined;
  s.insolvenz = { seit: w, versammlung: w + 20, altVerbindlichkeiten: eur(alt), insolvenzgeldBis: w + 12, quote: 0.1, grund };
  s.kreditlinie = 25_000_000; // Massekredit
  const st = s.stakeholder;
  st.kreditversicherer = clamp(st.kreditversicherer - 20, 0, 100);
  st.bank = clamp(st.bank - 15, 0, 100);
  st.image = clamp(st.image - 15, 0, 100);
  st.betriebsrat = clamp(st.betriebsrat - 5, 0, 100);
  for (const l of s.lieferanten) {
    l.vertrauen = clamp(l.vertrauen - 15, 0, 100);
    // Hallberg hängt an unseren Zahlungen
    if (l.id === 'hallberg' && l.aktiv) l.verspaetungen += 2;
  }
  s.restLieferantenVertrauen = clamp(s.restLieferantenVertrauen - 15, 0, 100);
  const nr = s.insolvenzenGesamt;
  melde(s, 'insolvenz', `Insolvenzantrag gestellt (${grund}). Altverbindlichkeiten ${mio(alt)} sind eingefroren, Insolvenzgeld deckt die Löhne für 12 Wochen.`);
  melde(s, 'presse', nr === 1 ? `${s.firma.name} ist insolvent.` : `${s.firma.name} ist zum ${nr}. Mal insolvent. Experten zeigen sich „wenig überrascht“.`);
}

/** Gläubigerversammlung über den Insolvenzplan. */
export function glaeubigerversammlung(s: GameState): void {
  const ins = s.insolvenz;
  if (!ins) return;
  // Der Plan wird an der integrierten Planung gemessen: EBITDA der nächsten 52 Wochen
  let planEbitda: number;
  if (s.prognose) planEbitda = s.historie.slice(-13).reduce((a, b) => a + b.ebitda, 0) * 4;
  else {
    const klon: GameState = structuredClone(s);
    klon.prognose = true;
    klon.insolvenz = undefined;
    klon.phase = 'regulaer';
    planEbitda = 0;
    for (let i = 0; i < 52 && klon.phase === 'regulaer'; i++) planEbitda += planWoche(klon);
  }
  const planBonus = planEbitda > 0 ? 15 : planEbitda > schwierigkeit(s).versammlungSchwelle ? 5 : -10;
  const quoteBonus = 60 * (ins.quote - 0.1);
  const zahlung = ins.quote * ins.altVerbindlichkeiten;
  const st = s.stakeholder;
  const lieferanten = (s.lieferanten.filter((l) => l.aktiv).reduce((a, l) => a + l.vertrauen, 0) + s.restLieferantenVertrauen * 2) / (s.lieferanten.filter((l) => l.aktiv).length + 2);
  const gruppen: [string, number][] = [
    ['Banken', st.bank], ['Kreditversicherer', st.kreditversicherer], ['Lieferanten', lieferanten],
    ['Vermieter', st.vermieter], ['Arbeitnehmer', st.betriebsrat],
  ];
  const ja = gruppen.filter(([, v]) => v + planBonus + quoteBonus >= 42).map(([n]) => n);
  const nein = gruppen.filter(([n]) => !ja.includes(n)).map(([n]) => n);
  const sofort = zahlung * 0.4;
  const finanzierbar = s.cash >= sofort;
  if (ja.length >= 3 && finanzierbar) {
    s.cash -= eur(sofort);
    // Rest der Quote in zwei Raten nach 26 und 52 Wochen
    s.verbindlichkeiten.push({ id: `q1-${s.woche}`, art: 'sonstiges', wert: eur(zahlung * 0.3), faellig: s.woche + 26 });
    s.verbindlichkeiten.push({ id: `q2-${s.woche}`, art: 'sonstiges', wert: eur(zahlung * 0.3), faellig: s.woche + 52 });
    s.phase = 'regulaer';
    s.insolvenz = undefined;
    st.kreditversicherer = Math.max(st.kreditversicherer, 42);
    st.bank = Math.max(st.bank, 38);
    st.image = clamp(st.image + 6, 0, 100);
    for (const l of s.lieferanten) l.vertrauen = Math.max(l.vertrauen, 42);
    s.restLieferantenVertrauen = Math.max(s.restLieferantenVertrauen, 45);
    s.kreditlinieBasis = Math.round(s.kreditlinieBasis * 0.6);
    s.kreditlinie = Math.round(s.kreditlinieBasis * 0.5);
    melde(s, 'info', `Integrierte Planung: EBITDA der nächsten 52 Wochen ${mio(planEbitda)}.`);
    melde(s, 'insolvenz', `Insolvenzplan angenommen (Zustimmung: ${ja.join(', ')}). Quote ${Math.round(ins.quote * 100)} % = ${mio(zahlung)}, davon ${mio(sofort)} sofort, der Rest in zwei Raten. Das Verfahren ist aufgehoben.`);
    melde(s, 'presse', `Gläubiger stimmen zu: ${s.firma.name} bekommt eine weitere Chance.`);
  } else {
    s.phase = 'zerschlagen';
    melde(s, 'info', `Integrierte Planung: EBITDA der nächsten 52 Wochen ${mio(planEbitda)}.`);
    const grund = !finanzierbar ? `Die erste Rate der Quote (${mio(sofort)}) ist nicht finanzierbar.` : `Abgelehnt von: ${nein.join(', ')}.`;
    melde(s, 'insolvenz', `Insolvenzplan gescheitert. ${grund} Die Kette wird zerschlagen.`);
    melde(s, 'presse', `Aus für ${s.firma.name}: Die letzten Häuser schließen.`);
  }
}

/** Wird von der Engine gesetzt, um Zirkelimporte zu vermeiden. */
let planWoche: (s: GameState) => number = () => 0;
export function setzePlanWoche(f: (s: GameState) => number): void {
  planWoche = f;
}

export function zerschlagungDurchMasseunzulaenglichkeit(s: GameState): void {
  s.phase = 'zerschlagen';
  melde(s, 'insolvenz', 'Masseunzulänglichkeit: Auch die laufenden Kosten im Verfahren sind nicht mehr gedeckt. Die Kette wird zerschlagen.');
}

/** Eigentümer bewertet das Quartal: neutral, nur nach Zahlen. */
export function quartalsBewertung(s: GameState): void {
  const q = s.quartale[s.quartale.length - 1];
  if (!q) return;
  const ist = s.historie.filter((k) => k.woche >= q.start && k.woche < q.start + 13).reduce((a, b) => a + b.ebitda, 0);
  q.ebitdaIst = eur(ist);
  const plan = q.plan ?? q.planStandard;
  const tol = Math.max(2_000_000, 0.12 * Math.abs(plan));
  const st = s.stakeholder;
  const ambitioniert = plan >= q.planStandard;
  if (ist >= plan - 0.25 * tol) {
    st.eigentuemer = clamp(st.eigentuemer + 8 + (ambitioniert ? 4 : 0), 0, 100);
    s.eigentuemer.strikes = 0;
    let txt = `Quartal ${q.nr + 1}: Plan erreicht (Ist ${mio(ist)}, Plan ${mio(plan)}).`;
    // Der Eigentümer schießt nur nach, wenn die Liquidität es braucht und die Sanierung sichtbar wirkt
    const vorjahr = s.quartale.find((x) => x.nr === q.nr - 4);
    const besser = vorjahr ? ist > vorjahr.ebitdaIst : ist > q.planStandard + 0.1 * Math.abs(q.planStandard);
    if (!besser) txt += ' Ohne sichtbare Verbesserung gegenüber dem Vorjahr gibt es kein frisches Geld.';
    if (s.phase === 'regulaer' && besser && (runwayWochen(s) < 26 || s.cash + s.kreditlinie < 150_000_000)) {
      const kapital = eur(12_000_000 * (st.eigentuemer / 50) * (ambitioniert ? 1 : 0.5));
      s.cash += kapital;
      s.einmalErloeseWoche += kapital;
      s.eigentuemer.kapitalZugefuehrt += kapital;
      txt += ` Der Eigentümer schießt ${mio(kapital)} nach.`;
    }
    melde(s, 'eigentuemer', txt, { modul: 'vorstand' });
  } else if (ist >= plan - tol) {
    st.eigentuemer = clamp(st.eigentuemer - 2, 0, 100);
    melde(s, 'eigentuemer', `Quartal ${q.nr + 1}: Plan knapp verfehlt (Ist ${mio(ist)}, Plan ${mio(plan)}). Kein frisches Geld, neue Frist.`, { modul: 'vorstand' });
  } else {
    st.eigentuemer = clamp(st.eigentuemer - 12, 0, 100);
    s.eigentuemer.strikes += 1;
    melde(s, 'eigentuemer', `Quartal ${q.nr + 1}: Plan klar verfehlt (Ist ${mio(ist)}, Plan ${mio(plan)}). Verwarnung ${s.eigentuemer.strikes}/2.`, { modul: 'vorstand' });
    if (s.eigentuemer.strikes >= 2 && s.phase === 'regulaer') {
      if (runwayWochen(s) < 13) {
        s.eigentuemer.forderung = 'insolvenzantrag';
        melde(s, 'eigentuemer', 'Der Eigentümer stellt keine weiteren Mittel bereit und verlangt den Insolvenzantrag.', { modul: 'vorstand' });
        eroeffneInsolvenz(s, 'Eigentümer verweigert weitere Mittel');
      } else {
        melde(s, 'eigentuemer', 'Der Eigentümer prüft Alternativen. Ein weiteres verfehltes Quartal beendet seine Unterstützung.', { modul: 'vorstand' });
      }
    }
  }
}

export function lohnSumme(s: GameState): number {
  return s.haeuser.reduce((a, h) => a + (h.status === 'geschlossen' ? 0 : lohnKosten(s, h)), 0);
}
