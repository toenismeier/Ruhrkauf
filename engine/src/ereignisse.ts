import { CLUSTER_FAKTOR, GRUPPEN, LAGE_FAKTOR, MARKTMIETE, MIETER, PROJEKTNAMEN, gruppenFuer, type MieterDef } from './daten';
import type { Angebot, Entscheidung, GameState, GruppeId, Haus } from './types';
import { chance, clamp, eur, ganzZwischen, kw, melde, mio, neueId, waehle, zufall, zwischen } from './util';
import { einmalKosten, starteSchliessung } from './prozesse';
import { bestandWert } from './ware';
import { loeseVorstandEntscheidung } from './vorstand';
import { planungEntscheidung } from './planung';
import { hqAnfrageFaktor, hqMietendeFaktor, hqUntermietFaktor } from './hq';
import { schwierigkeit } from './schwierigkeit';
import { premiumAngebote } from './premium';
// O01 Organisation
import { organisationVorlageEntscheidung } from './organisation';

export function offeneHaeuser(s: GameState, format?: Haus['format']): Haus[] {
  return s.haeuser.filter((h) => h.status === 'offen' && (!format || h.format === format));
}

export function neueEntscheidung(s: GameState, e: Omit<Entscheidung, 'id' | 'woche'>): void {
  if (s.prognose) return;
  s.entscheidungen.push({ ...e, id: neueId(s, 'e'), woche: s.woche });
}

function neuesAngebot(s: GameState, a: Omit<Angebot, 'id' | 'woche' | 'status'>): Angebot {
  const x: Angebot = { ...a, id: neueId(s, 'a'), woche: s.woche, status: 'offen' };
  s.angebote.push(x);
  return x;
}

/** Saisonbereinigter Basisumsatz eines Hauses aus der letzten KPI. */
export function basisUmsatzHaus(h: Haus): number {
  let x = 0;
  for (const [g, P] of Object.entries(h.potenzial) as [GruppeId, number][]) {
    const qm = h.flaechen.filter((f) => f.gruppe === g && (f.konzept === 'eigen' || f.konzept === 'kommission')).reduce((a, b) => a + b.qm, 0);
    x += P * (1 - Math.exp(-qm / (h.saettigungQm[g] ?? 1)));
  }
  return x;
}

function attraktivitaet(h: Haus): number {
  const basis = 1 - 0.2 * h.wettbewerbStart;
  const relativ = (1 - 0.2 * h.einzug.wettbewerb) / basis;
  return h.einzug.kaufkraft * LAGE_FAKTOR[h.lage] * CLUSTER_FAKTOR[h.cluster] * basis * relativ;
}
export const hausAttraktivitaet = attraktivitaet;

function qmAufEtage(h: Haus, etage: number): number {
  return h.flaechen.filter((f) => f.etage === etage && f.konzept !== 'untermiete' && f.umbauBis === undefined).reduce((a, b) => a + b.qm, 0);
}

function untermietAnfrage(s: GameState): void {
  const kandidaten = offeneHaeuser(s).filter((h) => !s.angebote.some((a) => a.status === 'offen' && a.typ === 'untermiete' && a.wunschHaeuser?.[0] === h.id));
  if (!kandidaten.length) return;
  const h = waehle(s, kandidaten);
  const passende = MIETER.filter((m) => m.etagen.some((e) => h.etagen.includes(e) && qmAufEtage(h, e) >= m.qm[0]));
  if (!passende.length) return;
  const m: MieterDef = waehle(s, passende);
  const etage = waehle(s, m.etagen.filter((e) => h.etagen.includes(e) && qmAufEtage(h, e) >= m.qm[0]));
  const qm = Math.floor(Math.min(qmAufEtage(h, etage), zwischen(s, m.qm[0], m.qm[1])) / 50) * 50;
  const miete = Math.round(zwischen(s, m.mieteQmMonat[0], m.mieteQmMonat[1]) * attraktivitaet(h) * hqUntermietFaktor(s) * 10) / 10;
  const laufzeit = ganzZwischen(s, m.laufzeit[0], m.laufzeit[1]);
  const name = waehle(s, m.namen);
  neuesAngebot(s, {
    typ: 'untermiete', frist: s.woche + 6, mieterTyp: m.typ, mieterName: name, etage, qmJeHaus: qm,
    mieteQmMonat: miete, laufzeitJahre: laufzeit, umbauAnteilMieter: m.umbauAnteil, wunschHaeuser: [h.id], vorschlagHaeuser: [h.id], minHaeuser: 1,
    titel: `${name} will in ${h.name} einziehen`,
    text: `${name} fragt ${qm} qm im ${etage === -1 ? 'UG' : etage === 0 ? 'EG' : etage + '. OG'} an: ${miete.toFixed(2)} €/qm im Monat, ${laufzeit} Jahre Laufzeit, Mieter trägt ${Math.round(m.umbauAnteil * 100)} % des Umbaus.`,
  });
}

function paketDeal(s: GameState): void {
  const typen = MIETER.filter((m) => m.typ === 'discounter' || m.typ === 'fitness' || m.typ === 'drogerie');
  const m = waehle(s, typen);
  const etage = m.etagen[0];
  const n = m.typ === 'fitness' ? ganzZwischen(s, 6, 10) : ganzZwischen(s, 8, 14);
  const pool = offeneHaeuser(s, 'warenhaus').filter((h) => h.etagen.includes(etage) && qmAufEtage(h, etage) >= m.qm[0]);
  if (pool.length < n + 2) return;
  const wunsch = [...pool].sort((a, b) => attraktivitaet(b) - attraktivitaet(a)).slice(0, n).map((h) => h.id);
  const name = waehle(s, m.namen);
  const miete = Math.round(zwischen(s, m.mieteQmMonat[0], m.mieteQmMonat[1]) * 10) / 10;
  const qm = Math.round(zwischen(s, m.qm[0], m.qm[1]) / 50) * 50;
  neuesAngebot(s, {
    typ: 'paket', frist: s.woche + 6, mieterTyp: m.typ, mieterName: name, etage, qmJeHaus: qm, mieteQmMonat: miete,
    laufzeitJahre: ganzZwischen(s, m.laufzeit[0], m.laufzeit[1]), umbauAnteilMieter: m.umbauAnteil, wunschHaeuser: wunsch,
    vorschlagHaeuser: [...wunsch], minHaeuser: Math.max(4, n - 2), flexibilitaet: zwischen(s, 0.05, 0.2),
    titel: `${name} will ${n} Standorte`,
    text: `${name} möchte in ${n} Häusern jeweils rund ${qm} qm im ${etage === 0 ? 'Erdgeschoss' : etage === -1 ? 'Untergeschoss' : etage + '. OG'} anmieten, ${miete.toFixed(2)} €/qm im Monat. Gewünscht sind natürlich die besten Lagen.`,
  });
  melde(s, 'ereignis', `Paketanfrage: ${name} will ${n} Standorte.`, { modul: 'zentrale' });
}

function stadtAngebot(s: GameState): void {
  const pool = offeneHaeuser(s, 'warenhaus').filter((h) => h.cluster !== 'metropole' && h.kpi && h.kpi.db < 0);
  if (!pool.length) return;
  const h = [...pool].sort((a, b) => (a.kpi?.db ?? 0) - (b.kpi?.db ?? 0))[ganzZwischen(s, 0, Math.min(4, pool.length - 1))];
  const zahlung = eur(zwischen(s, 0, 2_500_000));
  neuesAngebot(s, {
    typ: 'stadt', frist: s.woche + 8, wunschHaeuser: [h.id], vorschlagHaeuser: [h.id], einmalzahlung: zahlung,
    titel: `Stadt ${h.stadt} will ${h.name} übernehmen`,
    text: `Die Stadt ${h.stadt} würde den Mietvertrag übernehmen und das Haus zu Bürgeramt und Bibliothek umbauen. ${zahlung > 0 ? `Sie zahlt ${mio(zahlung)} Ablöse.` : 'Eine Ablöse gibt es nicht.'} Die Restmiete entfällt.`,
  });
  melde(s, 'ereignis', `Die Stadt ${h.stadt} interessiert sich für ${h.name}.`, { stadt: h.stadt, hausId: h.id });
}

export function sportEbitdaJahr(s: GameState): number {
  return offeneHaeuser(s, 'sport').reduce((a, h) => a + (h.kpi?.db ?? 0), 0) * 52;
}

function sportVerkauf(s: GameState): void {
  if (!offeneHaeuser(s, 'sport').length) return;
  const sportBestand = gruppenFuer('sport').reduce((a, g) => a + bestandWert(s, g), 0);
  const dist = s.phase === 'insolvenz' ? 0.6 : s.stakeholder.kreditversicherer < 40 ? 0.8 : 1;
  const preis = eur((Math.max(30_000_000, sportEbitdaJahr(s) * zwischen(s, 4.5, 7)) * dist + sportBestand * 0.7));
  neuesAngebot(s, {
    typ: 'sportverkauf', frist: s.woche + 8, kaufpreis: preis,
    titel: `Investor will ${s.firma.sportName} kaufen`,
    text: `Ein Finanzinvestor bietet ${mio(preis)} für die komplette Sportkette inklusive Ware. Personal, Mietverträge und Bestand gehen mit.`,
  });
  melde(s, 'ereignis', `Kaufangebot für ${s.firma.sportName}: ${mio(preis)}.`);
}

function sonderposten(s: GameState): void {
  const g = waehle(s, ['damen', 'herren', 'accessoires', 'wohnen', 'sporttextil', 'outdoor', 'kinder'] as GruppeId[]);
  const wert = eur(zwischen(s, 2_000_000, 9_000_000));
  neuesAngebot(s, {
    typ: 'sonderposten', frist: s.woche + 2, gruppe: g, wert, _passt: chance(s, 0.6),
    titel: `Sonderposten ${GRUPPEN[g].name}`,
    text: `Die Ware einer insolventen Marke wird angeboten: Verkaufswert entspricht ${mio(wert * 2)} Einstand, Preis ${mio(wert)} gegen Vorkasse. Ob sie zu den Häusern passt, zeigt sich erst im Abverkauf.`,
  });
}

function instandhaltung(s: GameState, h: Haus): void {
  const art = waehle(s, [['Rolltreppen', 300_000, 700_000], ['Dachsanierung', 700_000, 1_600_000], ['Brandschutz', 500_000, 1_200_000], ['Klimaanlage', 400_000, 900_000]] as [string, number, number][]);
  const kosten = eur(zwischen(s, art[1], art[2]) * schwierigkeit(s).ereignisse);
  if (h.miete.netTyp === 'triple') {
    neueEntscheidung(s, {
      typ: 'instandhaltung', frist: s.woche + 3, titel: `${art[0]} in ${h.name}`,
      text: `Triple-Net: Die Kosten von ${mio(kosten)} trägst du. Verschieben senkt die Substanz deutlich.`,
      optionen: [{ id: 'zahlen', label: `Zahlen (${mio(kosten)})` }, { id: 'verschieben', label: 'Verschieben' }],
      standard: 'zahlen', daten: { haus: h.id, kosten },
    });
  } else {
    h.substanz = clamp(h.substanz + 8, 0, 100);
    melde(s, 'info', `${art[0]} in ${h.name}: Der Vermieter trägt die Kosten (${h.miete.netTyp === 'net' ? 'Net' : 'Double-Net'}-Vertrag).`, { stadt: h.stadt, hausId: h.id });
  }
}

function mietende(s: GameState, h: Haus): void {
  // Die Immobilienabteilung verhandelt die Anschlussmiete
  const markt = eur((basisUmsatzHaus(h) * MARKTMIETE[h.lage] * zwischen(s, 0.85, 1.15)) * hqMietendeFaktor(s));
  if (h.miete.keineVerlaengerung) {
    melde(s, 'warnung', `Der Vermieter von ${h.name} verlängert nicht. Der Vertrag endet in 26 Wochen.`, { stadt: h.stadt, hausId: h.id });
    return;
  }
  neueEntscheidung(s, {
    typ: 'mietende', frist: s.woche + 8, titel: `Mietvertrag ${h.name} läuft aus`,
    text: `Der Vertrag endet in 26 Wochen. Aktuell ${mio(h.miete.mieteWoche * 52)} im Jahr, der Vermieter bietet ${mio(markt * 52)} für weitere 5 Jahre.`,
    optionen: [{ id: 'verlaengern', label: 'Verlängern' }, { id: 'nachverhandeln', label: 'Nachverhandeln' }, { id: 'auslaufen', label: 'Auslaufen lassen und schließen' }],
    standard: 'verlaengern', daten: { haus: h.id, markt },
  });
}

function jahresgespraech(s: GameState): void {
  const termine: Record<string, number> = { hallberg: 6, arvel: 10, nordline: 14, kessler: 18, goldenthread: 22 };
  for (const l of s.lieferanten) {
    if (!l.aktiv || termine[l.id] !== kw(s.woche)) continue;
    neueEntscheidung(s, {
      typ: 'jahresgespraech', frist: s.woche + 2, titel: `Jahresgespräch mit ${l.name}`,
      text: `${l.beschreibung} Vertrauen aktuell ${Math.round(l.vertrauen)}.`,
      optionen: [
        { id: 'mengenzusage', label: 'Mengenzusage gegen mehr Zuschuss' },
        { id: 'platzierung', label: 'Bessere Platzierung anbieten' },
        { id: 'hart', label: 'Hart auf Konditionen verhandeln' },
      ],
      standard: 'platzierung', daten: { lieferant: l.id },
    });
  }
}

function lieferantenEreignisse(s: GameState): void {
  for (const l of s.lieferanten) {
    if (!l.aktiv) continue;
    if (l.id === 'hallberg' && (l.verspaetungen > 1.5 || s.phase === 'insolvenz') && chance(s, l.fragilitaet)) {
      l.aktiv = false;
      l.ausfallBis = s.woche + Math.max(4, Math.round(12 * schwierigkeit(s).ereignisse));
      melde(s, 'presse', 'Hallberg & Söhne meldet Insolvenz an. „Ein großer Kunde hat uns mitgerissen.“', { modul: 'einkauf' });
      melde(s, 'warnung', 'Herrenware von Hallberg fällt für rund 12 Wochen aus, danach übernehmen andere Lieferanten.');
    }
    if (l.id === 'nordline' && !l.dtc && chance(s, 0.003)) {
      neueEntscheidung(s, {
        typ: 'nordline_dtc', frist: s.woche + 4, titel: 'Nordline stellt auf Direktvertrieb um',
        text: 'Nordline kürzt die Zuteilung für den Handel. Gegen eine Investition in Markenflächen bleibst du A-Partner.',
        optionen: [{ id: 'akzeptieren', label: 'Kürzung akzeptieren' }, { id: 'investieren', label: 'Markenflächen finanzieren (3,5 Mio. €)' }],
        standard: 'akzeptieren', daten: {},
      });
    }
    if (l.id === 'goldenthread' && chance(s, 0.006)) {
      let verschoben = 0;
      const neu = [];
      for (const b of s.bestellungen) {
        if ((b.gruppe === 'damen' || b.gruppe === 'kinder') && b.ankunft <= s.woche + 6) {
          const teil = eur(b.wert * Math.min(0.6, 0.3 * schwierigkeit(s).ereignisse));
          b.wert -= teil;
          verschoben += teil;
          neu.push({ ...b, id: neueId(s, 'b'), wert: teil, ankunft: b.ankunft + 6 });
        }
      }
      s.bestellungen.push(...neu);
      if (verschoben > 0) melde(s, 'warnung', `Containerstau: Eigenmarkenware von Golden Thread über ${mio(verschoben)} kommt sechs Wochen später.`);
    }
    if (l.id === 'arvel' && l.rueckzug && l.vertrauen > 60) {
      l.rueckzug = false;
      melde(s, 'info', 'Maison Arvel kehrt in die B-Lagen zurück.');
    }
  }
  jahresgespraech(s);
}

const SATIRE = [
  'Branchenkenner: „Das Warenhaus ist tot.“ Zum 14. Mal in diesem Jahrzehnt.',
  'Lokalzeitung: Rolltreppe im Haus defekt, Kunden nehmen es „mit Humor“.',
  'Wirtschaftsblatt fragt: Braucht es Warenhäuser noch? Leser antworten mit 2.000 Kommentaren, gekauft hat keiner.',
  'Ein Influencer filmt sich beim Einkauf in der Kurzwarenabteilung. 3 Mio. Aufrufe, Umsatz unverändert.',
  'Studie: Innenstädte brauchen Ankermieter. Studie zur Studie folgt.',
  'Politik fordert Rettungsplan für die Innenstadt. Konkrete Mittel: keine.',
];

export function ereignisse(s: GameState): void {
  if (s.prognose) return;
  const w = s.woche;
  premiumAngebote(s);
  // Makro
  const zyklus = 0.035 * Math.sin((2 * Math.PI * w) / 260 + s.makro.phase);
  if (s.makro.schockBis !== undefined && s.makro.schockBis <= w) { s.makro.schockBis = undefined; s.makro.schockStaerke = 0; }
  if (s.makro.schockBis === undefined && chance(s, 0.004)) {
    s.makro.schockStaerke = zwischen(s, 0.04, 0.08) * schwierigkeit(s).ereignisse;
    s.makro.schockBis = w + ganzZwischen(s, 26, 52);
    melde(s, 'presse', waehle(s, ['Energiepreise explodieren, Konsumklima bricht ein.', 'Rezession: Verbraucher halten sich zurück.', 'Zollstreit drückt auf die Kauflaune.']));
  }
  s.makro.konjunktur = 1 + zyklus - s.makro.schockStaerke;

  if (chance(s, 0.3 * hqAnfrageFaktor(s))) untermietAnfrage(s);
  if (!s.angebote.some((a) => a.status === 'offen' && a.typ === 'paket') && chance(s, 0.025)) paketDeal(s);
  if (chance(s, 0.008)) stadtAngebot(s);
  if (!s.angebote.some((a) => a.status === 'offen' && a.typ === 'sportverkauf') && chance(s, 0.006)) sportVerkauf(s);
  if (chance(s, 0.02)) sonderposten(s);

  for (const h of offeneHaeuser(s)) {
    if (chance(s, 0.0008 * (1 + (100 - h.substanz) / 50))) instandhaltung(s, h);
    if (h.miete.bisWoche - 26 === w) mietende(s, h);
    if (h.miete.keineVerlaengerung && h.miete.bisWoche - 10 === w) starteSchliessung(s, h, { mietvertragEndetMit: true });
    if (h.miete.bisWoche === w && h.status === 'offen') {
      // Stillschweigende Verlängerung zum Marktpreis, wenn nichts entschieden wurde
      h.miete.bisWoche = w + 260;
      h.miete.mieteWoche = eur(basisUmsatzHaus(h) * MARKTMIETE[h.lage] * hqMietendeFaktor(s));
    }
    const fl = h.personal.filialleiter;
    if (fl.moral < 40 && fl.skill > 0.6 && chance(s, 0.02)) {
      // Wettbewerber werden nur bei passender aktiver Kette als Abwerber gewertet.
      // Im Deaktivierungs-Test bleibt die ursprüngliche Regel unverändert.
      const kandidaten = s.wettbewerber.filter((x) => x.stadt === h.stadt && ['modehaus', 'premium', 'fastfashion'].includes(x.art)
        && (x.status === 'offen' || x.status === 'eroeffnung'));
      // Der Interim-Skill wurde früher immer gezogen, sobald der Abgangstest positiv war.
      // RNG-Draw auch ohne lokale Konkurrenz verbrauchen, damit alle übrigen Ereignisse identisch bleiben.
      const interimSkill = zwischen(s, 0.3, 0.65);
      if (!s.wettbewerbDeaktiviert && !s.wettbewerbEreignisseDeaktiviert && !kandidaten.length) continue;
      const ziel = kandidaten[0]?.name;
      melde(s, 'warnung', `Filialleiter${fl.name.endsWith('a') || fl.name.endsWith('e') ? 'in' : ''} ${fl.name} verlässt ${h.name} und geht ${ziel ? 'zu ' + ziel : 'zur Konkurrenz'}.`, { stadt: h.stadt, hausId: h.id });
      h.personal.filialleiter = { name: `Interim (${fl.name.split(' ')[1]}-Nachfolge)`, skill: interimSkill, moral: 50, interimBis: w + 4 };
    }
  }

  lieferantenEreignisse(s);

  // Streiks
  const ausstieg = s.tarifAusstiegSeit !== undefined && w - s.tarifAusstiegSeit < 26;
  const pStreik = (s.stakeholder.betriebsrat < 25 ? 0.04 : 0) + (ausstieg ? 0.05 : 0);
  if (pStreik > 0 && chance(s, kw(w) >= 47 ? pStreik * 2 : pStreik)) {
    // Schwierigkeit skaliert die Schwere (Zahl der Häuser, Image), nicht das Eintreten: gleiche Zufallsfolge auf allen Stufen
    const betroffen = offeneHaeuser(s).filter(() => zufall(s) < 0.3 * schwierigkeit(s).ereignisse);
    const dauer = ganzZwischen(s, 1, 2);
    for (const h of betroffen) h.streikBis = w + dauer;
    s.stakeholder.image = clamp(s.stakeholder.image - schwierigkeit(s).ereignisse, 0, 100);
    melde(s, 'presse', `Verdi ruft zum Streik auf: ${betroffen.length} Häuser betroffen.`, { modul: 'zentrale' });
  }

  if (chance(s, 0.04)) melde(s, 'presse', waehle(s, SATIRE));

  // Fristen
  for (const a of s.angebote) if (a.status === 'offen' && a.frist <= w) {
    a.status = 'verfallen';
    a.erledigtWoche = w;
  }
  s.angebote = s.angebote.filter((a) => a.status === 'offen' || w - (a.erledigtWoche ?? a.woche) < 13);
  const faellig = s.entscheidungen.filter((e) => e.frist <= w);
  for (const e of faellig) loeseEntscheidung(s, e.id, e.standard, true);

  // Berater
  for (const b of s.berater) if (!b.ergebnis && b.ende <= w) beraterErgebnis(s, b.id);
}

export function beraterErgebnis(s: GameState, id: string): void {
  const b = s.berater.find((x) => x.id === id);
  if (!b) return;
  const offen = offeneHaeuser(s).filter((h) => h.kpi);
  const nachDb = [...offen].sort((a, c) => (a.kpi?.db ?? 0) - (c.kpi?.db ?? 0));
  const anzahl = Math.max(5, Math.round(offen.length * 0.15));
  const liste: string[] = [];
  for (let i = 0; i < anzahl && i < nachDb.length; i++) {
    const treffer = zufall(s) < b._qualitaet;
    const h = treffer ? nachDb[i] : waehle(s, offen);
    if (!liste.includes(h.id)) liste.push(h.id);
  }
  const folien = ganzZwischen(s, 60, 220);
  const fazit = b._qualitaet > 0.7
    ? 'Die Empfehlungen sind konkret und mit Zahlen hinterlegt.'
    : b._qualitaet > 0.4 ? 'Solide Analyse, an einigen Stellen erkennbar aus anderen Projekten übernommen.'
    : 'Kernaussage auf Folie 3: „Kosten senken, Umsatz steigern.“ Der Rest ist Anhang.';
  b.ergebnis = { empfohleneSchliessungen: liste, folien, fazit };
  melde(s, 'ereignis', `${b.haus} legt das Abschlussdeck zu Projekt ${b.projektname} vor: ${folien} Folien, ${liste.length} Schließungsempfehlungen. ${fazit}`);
}

export function zufallsProjektname(s: GameState): string {
  return waehle(s, PROJEKTNAMEN);
}

/** Wendet eine Entscheidung an. Wird auch bei Fristablauf mit der Standardoption aufgerufen. */
export function loeseEntscheidung(s: GameState, id: string, option: string, standardGewählt = false): string | null {
  const e = s.entscheidungen.find((x) => x.id === id);
  if (!e) return 'Entscheidung nicht gefunden.';
  if (!e.optionen.some((o) => o.id === option)) return 'Unbekannte Option.';
  s.entscheidungen = s.entscheidungen.filter((x) => x.id !== id);
  // Nur protokollieren: keinerlei Änderung an Wirkung, Zufallsfolge oder Entscheidungen.
  (s.entscheidungsprotokoll ??= []).push({
    id: e.id, typ: e.typ, titel: e.titel, option,
    ergebnis: e.optionen.find((o) => o.id === option)?.label ?? option,
    woche: s.woche, standard: standardGewählt,
    hausId: typeof e.daten.haus === 'string' ? e.daten.haus : undefined,
  });
  s.entscheidungsprotokoll = s.entscheidungsprotokoll.filter((p) => s.woche - p.woche <= 52);
  if (e.typ.startsWith('vorstand_')) { loeseVorstandEntscheidung(s, e, option); return null; }
  if (e.typ === 'organisation_vorlage') { organisationVorlageEntscheidung(s,e,option); return null; }
  // O06 Planung: automatische Fristentscheidung entspricht Freigabe des Controllings.
  if (e.typ.startsWith('planung_')) { planungEntscheidung(s, e, option); return null; }
  const d = e.daten;
  const haus = typeof d.haus === 'string' ? s.haeuser.find((h) => h.id === d.haus) : undefined;
  switch (e.typ) {
    case 'wettbewerb_eroeffnung': {
      const wb = s.wettbewerber.find((x) => x.id === d.wettbewerber);
      if (!wb) return null;
      if (option === 'aktion') {
        einmalKosten(s, 180_000);
        wb.abwehrBis = s.woche + 4;
        wb.abwehrFaktor = 0.55;
        melde(s, 'info', 'Eröffnungsaktion gegen ' + wb.name + ': kurzfristiger Kundenschutz, geringere Marge.');
      } else if (option === 'mailing' && s.marketing.kundenkarte) {
        einmalKosten(s, 65_000);
        wb.abwehrBis = s.woche + 4;
        wb.abwehrFaktor = 0.7;
        melde(s, 'info', 'Stammkunden-Mailing gegen ' + wb.name + ' verschickt.');
      }
      return null;
    }
    case 'instandhaltung':
      if (!haus) return null;
      if (option === 'zahlen') { einmalKosten(s, Number(d.kosten)); haus.substanz = clamp(haus.substanz + 10, 0, 100); }
      else haus.substanz = clamp(haus.substanz - 12, 0, 100);
      return null;
    case 'mietende': {
      if (!haus) return null;
      const markt = Number(d.markt);
      if (option === 'verlaengern') { haus.miete.mieteWoche = markt; haus.miete.bisWoche += 260; }
      else if (option === 'nachverhandeln') {
        const p = 0.3 + 0.5 * (s.stakeholder.vermieter / 100);
        if (chance(s, p)) { haus.miete.mieteWoche = eur(markt * 0.88); haus.miete.bisWoche += 260; melde(s, 'info', `${haus.name}: Vermieter akzeptiert 12 % unter Angebot.`); }
        else if (chance(s, 0.25)) { haus.miete.keineVerlaengerung = true; melde(s, 'warnung', `${haus.name}: Der Vermieter bricht die Gespräche ab und vermietet neu.`); }
        else { haus.miete.mieteWoche = markt; haus.miete.bisWoche += 260; melde(s, 'info', `${haus.name}: Vermieter bleibt hart, Verlängerung zum Angebot.`); }
      } else {
        haus.miete.keineVerlaengerung = true;
        starteSchliessung(s, haus, { mietvertragEndetMit: true });
      }
      return null;
    }
    case 'jahresgespraech': {
      const l = s.lieferanten.find((x) => x.id === d.lieferant);
      if (!l) return null;
      if (option === 'mengenzusage') {
        l.wkzQuote += 0.008; l.vertrauen = clamp(l.vertrauen + 6, 0, 100);
        for (const g of Object.keys(l.gruppen) as GruppeId[]) s.orderLevel[g] = Math.max(s.orderLevel[g] ?? 1, 1.05);
      } else if (option === 'platzierung') l.vertrauen = clamp(l.vertrauen + 4, 0, 100);
      else { l.wkzQuote += 0.004; l.vertrauen = clamp(l.vertrauen - 8, 0, 100); }
      return null;
    }
    case 'nordline_dtc': {
      const l = s.lieferanten.find((x) => x.id === 'nordline');
      if (!l) return null;
      if (option === 'investieren') { einmalKosten(s, 3_500_000); l.vertrauen = clamp(l.vertrauen + 10, 0, 100); }
      else { l.dtc = true; l.wkzQuote = Math.max(0, l.wkzQuote - 0.01); melde(s, 'info', 'Nordline kürzt die Zuteilung an die Sporthäuser.'); }
      return null;
    }
    default:
      return null;
  }
}

export { neuesAngebot };
