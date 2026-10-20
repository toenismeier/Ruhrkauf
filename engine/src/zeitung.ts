// Der Handelsbote: redaktioneller Zufallsstrom ohne Eingriff in die Simulation.
// Nur Interviews verändern Stakeholder. Alte Spielstände benötigen keine Migration.
import type { Entscheidung, GameState, Meldung } from './types';
import { clamp, jahr, kw, waehle, type RngHalter } from './util';

export type ZeitungReiter = 'Top' | 'Handel' | 'Konzern' | 'Markt' | 'Politik';
export const ZEITUNG_REITER: ZeitungReiter[] = ['Top', 'Handel', 'Konzern', 'Markt', 'Politik'];
export type ZeitungsBild = 'haus' | 'konkurrenz' | 'markt' | 'politik';
export interface ZeitungArtikel {
  id: string;
  art: string;
  reiter: ZeitungReiter;
  titel: string;
  unterzeile: string;
  text: string;
  bild: ZeitungsBild;
}
export interface ZeitungAusgabe {
  woche: number;
  kw: number;
  jahr: number;
  nummer: number;
  aufmacher: ZeitungArtikel;
  meldungen: ZeitungArtikel[];
  reiter: ZeitungReiter[];
}
export interface ZeitungStand {
  aktiv: boolean;
  ausgaben: ZeitungAusgabe[];
  naechstesZitat?: { abWoche: number; text: string };
}

type Vorlage = {
  id: string;
  reiter: ZeitungReiter;
  bild: ZeitungsBild;
  titel: string;
  unter: string;
  kommentar: string;
  perspektive: string;
  muster?: RegExp;
};

// Redaktionelle Vorlagen: 30 ereignisgebundene und 16 regelmäßige Artikelarten.
// Die Quelle wird als Tatsachensatz übernommen, der Kommentar bleibt stets fiktiv.
const EREIGNISSE: Vorlage[] = [
  ['konkurrenz_neu','Handel','konkurrenz','Neue Konkurrenz in der Innenstadt','Ein Anbieter investiert in Verkaufsfläche.','Der lokale Handel stellt sich auf einen veränderten Wettbewerb ein.','Die kommenden Wochen dürften zeigen, wie stark sich die Kundschaft neu verteilt.',/wettbewerb.*(eröffn|neu)|konkurrenz.*(eröffn|neu)|konkurrent.*(eröffn|neu)/i],
  ['konkurrenz_zu','Handel','konkurrenz','Wettbewerber gibt Standort auf','Die Einkaufslandschaft verändert sich erneut.','Ein frei werdendes Geschäft verändert die Lage in der Innenstadt.','Die Nachnutzung dürfte von Kaufkraft und Immobilienangebot abhängen.',/wettbewerb.*schließ|konkurrenz.*schließ|konkurrent.*schließ|wettbewerb.*aufgegeben/i],
  ['konkurrenz_aktion','Handel','konkurrenz','Preiskampf auf der Einkaufsstraße','Aktionen erhöhen den Druck auf den Handel.','Preisnachlässe können kurzfristig Frequenz anziehen.','Für die langfristige Profitabilität bleibt die Handelsspanne entscheidend.',/wettbewerb.*(aktion|rabatt)|konkurrenz.*(aktion|rabatt)|preiskampf/i],
  ['konkurrenz_uebernahme','Handel','konkurrenz','Kaufhausfläche wechselt den Betreiber','Ein Wettbewerber sichert sich neue Präsenz.','Leerstände werden zunehmend als strategische Chance behandelt.','Beobachter erwarten neue Konzepte an den bisherigen Standorten.',/wettbewerb.*übernehm|konkurrenz.*übernehm|nachnutzung.*wettbewerb/i],
  ['konkurrenz_preise','Handel','konkurrenz','Der Preis entscheidet nicht allein','Der Wettbewerb sucht neue Kundengruppen.','Standortqualität und Sortiment bleiben zentrale Erfolgsfaktoren.','Ein hoher Werbedruck ersetzt keine tragfähige Kalkulation.',/wettbewerb.*preis|preisdruck|konkurrenz.*preise/i],
  ['haus_schliessung','Konzern','haus','Hartwig bereitet Schließung vor','Beschäftigte und Eigentümer warten auf Klarheit.','Das Unternehmen muss wirtschaftliche und soziale Folgen abwägen.','Vor Ort beginnt die Suche nach einer tragfähigen Perspektive.',/hartwig.*schließ|haus.*schließ|soll schließen|schließung.*haus/i],
  ['haus_raeumung','Konzern','haus','Räumungsverkauf am Standort','Ein Kaufhaus geht in die letzte Verkaufsphase.','Die Restbestände werden schrittweise abgebaut.','Für den Standort gewinnt die künftige Nutzung an Bedeutung.',/räumungsverkauf|räumung/i],
  ['haus_umbau','Konzern','haus','Hartwig investiert in die Fläche','Umbauten verändern das Erscheinungsbild.','Die Geschäftsführung setzt auf eine bessere Flächenleistung.','Ob die Maßnahme trägt, zeigen erst die kommenden Wochen.',/umbau|modernisier|renovier/i],
  ['haus_miete','Konzern','haus','Mieten im Fokus der Sanierung','Immobilienkosten werden neu bewertet.','Hohe Fixkosten schränken die Gestaltungsspielräume ein.','Verhandlungen mit Vermietern bleiben ein Schlüssel der Restrukturierung.',/vermieter|mietvertrag|miete.*verhandel/i],
  ['haus_personal','Konzern','haus','Personaleinsatz auf dem Prüfstand','Filialen reagieren auf die Ertragslage.','Eine tragfähige Besetzung bleibt für Beratung und Verkauf erforderlich.','Die Interessen der Beschäftigten müssen in die Planung einfließen.',/personalabbau|personalaufbau|beschäftigte.*abbau/i],
  ['glaeubiger','Politik','politik','Gläubiger entscheiden über Zukunft','Im Verfahren rückt der Insolvenzplan in den Mittelpunkt.','Die Beteiligten bewerten Finanzierung und operative Aussichten.','Eine Einigung würde neue Handlungsspielräume schaffen.',/gläubigerversammlung|insolvenzplan|gläubiger.*versammlung/i],
  ['insolvenzantrag','Politik','politik','Hartwig unter Insolvenzschutz','Die Sanierung tritt in eine kritische Phase.','Das Verfahren soll den Geschäftsbetrieb stabilisieren.','Für Lieferanten und Beschäftigte kommt es auf belastbare Zusagen an.',/insolvenzantrag|schutzschirm|insolvenzverfahren/i],
  ['insolvenz_gescheitert','Politik','politik','Sanierung steht vor dem Aus','Die Gläubigerlage verschärft sich.','Die Geschäftsführung muss die nächsten Schritte sorgfältig prüfen.','Für die betroffenen Standorte ist die Unsicherheit groß.',/zerschlag|masseunzulänglichkeit|insolvenz.*gescheitert/i],
  ['betriebsrat','Politik','politik','Betriebsrat verlangt Perspektiven','Arbeitnehmervertretung und Vorstand verhandeln.','Die Beschäftigten erwarten konkrete Antworten auf offene Fragen.','Ein belastbarer Sozialdialog kann weitere Konflikte vermeiden.',/betriebsrat|interessenausgleich/i],
  ['sozialplan','Politik','politik','Sozialplan wird verhandelt','Die Gespräche über Ausgleichsmaßnahmen laufen.','Die Finanzierung der Regelungen bleibt ein zentraler Punkt.','Die Parteien stehen unter erheblichem Zeitdruck.',/sozialplan|abfindung/i],
  ['streik','Politik','politik','Arbeitskampf belastet den Handel','Beschäftigte fordern eine Einigung.','Ausfälle treffen den Betrieb unmittelbar.','Die Konfliktparteien müssen an den Verhandlungstisch zurückfinden.',/streik|arbeitskampf/i],
  ['tarif','Politik','politik','Tarifrunde vor neuer Entscheidung','Die Personalpolitik steht im Blickpunkt.','Tarifliche Vereinbarungen wirken über Jahre nach.','Die wirtschaftliche Belastbarkeit bestimmt den Verhandlungsspielraum.',/tarif/i],
  ['quartal','Konzern','haus','Quartalszahlen prägen die Debatte','Umsatz und Ergebnis rücken in den Mittelpunkt.','Die Investoren achten auf Kosten, Marge und Liquidität.','Ein einzelnes Quartal entscheidet jedoch noch nicht über den Trend.',/quartal|ebitda|ergebnis.*umsatz/i],
  ['liquiditaet','Konzern','markt','Liquidität bleibt entscheidend','Kasse und Kreditlinie bestimmen das Tempo.','Kurzfristige Zahlungsmittel sind Voraussetzung für jede Sanierung.','Auch die Lieferanten verfolgen die Entwicklung aufmerksam.',/liquidität|kreditlinie|kassenbestand|zahlungsunfähig/i],
  ['bank','Markt','markt','Banken verlangen Verlässlichkeit','Finanzierung wird zum Prüfstein.','Kreditgeber erwarten einen nachvollziehbaren Geschäftsplan.','Entscheidend ist die Fähigkeit, Verpflichtungen fristgerecht zu bedienen.',/bank|kreditgeber/i],
  ['lieferanten','Markt','markt','Lieferanten achten auf Zahlungsziele','Die Beschaffung bleibt unter Beobachtung.','Vertrauen und Warenverfügbarkeit hängen eng zusammen.','Eine stabile Lieferkette stärkt die Verkaufsfähigkeit der Häuser.',/lieferant|warenkredit|vorkasse/i],
  ['vorstand','Konzern','haus','Bewegung in der Konzernspitze','Neue Aufgaben für das Management.','An der Unternehmensspitze werden Zuständigkeiten neu geordnet.','Der Handel erwartet klare Entscheidungen und nachvollziehbare Prioritäten.',/vorstand|ressort|geschäftsführung|berufen|abberufen/i],
  ['eigenmarken','Handel','haus','Eigenmarken sollen Profil schärfen','Der Konzern arbeitet am Sortiment.','Eigene Marken versprechen mehr Differenzierung im Wettbewerb.','Entscheidend bleibt die Akzeptanz bei den Kundinnen und Kunden.',/eigenmarke|marke gegründet|markenstrategie/i],
  ['sortiment','Handel','haus','Sortiment wird neu gewichtet','Flächen müssen wirtschaftlicher werden.','Die Mischung aus Mode, Wohnen und Service wird regelmäßig überprüft.','Die Nachfrage vor Ort liefert die wichtigsten Hinweise.',/sortiment|warengruppe|sortimentsmix/i],
  ['marketing','Handel','haus','Werbung als Hebel der Wende','Der Handel wirbt um neue Frequenz.','Aktionen können kurzfristig die Umsätze stützen.','Eine nachhaltige Bindung der Kundschaft ist wichtiger als reine Rabattsignale.',/marketing|kampagne|kundenkarte|coupon/i],
  ['verkauf','Handel','haus','Kaufkraft entscheidet über Standorte','Verkaufsflächen geraten unter Druck.','Die Umsatzentwicklung fällt regional unterschiedlich aus.','Eine flexible Flächenplanung gewinnt an Bedeutung.',/umsatzrückgang|umsatzplus|absatz|verkauf/i],
  ['immobilie','Markt','markt','Handelsimmobilien im Wandel','In den Innenstädten entstehen neue Konzepte.','Die Nutzung großer Flächen wird vielerorts überprüft.','Mischformen aus Handel und Dienstleistung gewinnen an Gewicht.',/immobilie|leerstand|innenstadt/i],
  ['kosten','Konzern','haus','Kostendisziplin bleibt Schlüssel','Fixkosten müssen zur Nachfrage passen.','Sanierung erfordert mehr als kurzfristige Einsparungen.','Die Wirkung einer Maßnahme zeigt sich in der Ergebnisrechnung.',/kosten|einspar|sparprogramm/i],
  ['ecommerce','Handel','markt','Online und Fläche rücken zusammen','Der Handel sucht neue Vertriebskanäle.','Digitale Services sollen den stationären Einkauf ergänzen.','Die Wirtschaftlichkeit hängt vom Kundennutzen ab.',/online|e-commerce|ecommerce|app/i],
  ['presse','Top','haus','Hartwig bleibt Gesprächsthema','Die Entwicklungen bewegen die Branche.','Die Marktteilnehmer verfolgen die Restrukturierung aufmerksam.','Die nächste Bilanz wird zeigen, ob die Strategie trägt.',/./i],
].map(([id, reiter, bild, titel, unter, kommentar, perspektive, muster]) =>
  ({ id: id as string, reiter: reiter as ZeitungReiter, bild: bild as ZeitungsBild, titel: titel as string,
     unter: unter as string, kommentar: kommentar as string, perspektive: perspektive as string, muster: muster as RegExp }));

const HINTERGRUND: Vorlage[] = [
  ['textil','Markt','markt','Textilumsätze bleiben umkämpft','Die Branche sucht nach Wachstum.','Der Verkauf von Bekleidung bleibt konjunkturabhängig.','Das Kaufverhalten hat sich dauerhaft verändert.'],
  ['frequenz','Markt','markt','Innenstadtfrequenz im Wandel','Der Handel zählt seine Besucher.','Die Zahl der Passanten allein erklärt noch keine Umsätze.','Angebot und Aufenthaltsqualität beeinflussen den Standort.'],
  ['kaufkraft','Markt','markt','Kaufkraft wird neu verteilt','Haushalte wägen ihre Ausgaben ab.','Waren des täglichen Bedarfs konkurrieren mit größeren Anschaffungen.','Der stationäre Handel muss auf veränderte Prioritäten reagieren.'],
  ['mieten','Markt','markt','Mietniveau unter Beobachtung','Eigentümer und Händler verhandeln.','Große Handelsflächen stellen die Immobilienmärkte vor Aufgaben.','Langfristige Verträge brauchen tragfähige Geschäftsmodelle.'],
  ['stadt','Handel','haus','Innenstadt sucht ihren Mittelpunkt','Warenhäuser bleiben wichtige Frequenzbringer.','Die Wirkung eines großen Geschäfts reicht über dessen eigene Fläche hinaus.','Nachbarschaft und Gastronomie profitieren von lebendigen Straßen.'],
  ['kunden','Handel','haus','Kunden wünschen Orientierung','Service wird zum Unterscheidungsmerkmal.','Persönliche Beratung und eine klare Sortimentsführung bleiben gefragt.','Wer die Wünsche vor Ort kennt, kann zielgerichteter investieren.'],
  ['logistik','Handel','markt','Lieferketten werden belastbarer','Planung soll Engpässe vermeiden.','Bestände binden Kapital und können zugleich den Umsatz absichern.','Verlässliche Nachlieferungen sind ein Wettbewerbsvorteil.'],
  ['saison','Handel','haus','Saisonware steht im Fokus','Einkäufer überprüfen die Planung.','Die Bestellung von Mode erfordert lange Vorlaufzeiten.','Ein ausgewogenes Lager verringert das Risiko von Abschriften.'],
  ['personal','Politik','politik','Beschäftigung im Handel im Blick','Fachkräfte bleiben eine Schlüsselressource.','Der Strukturwandel verändert die Anforderungen an die Belegschaften.','Weiterbildung und verlässliche Planung gewinnen an Bedeutung.'],
  ['kommunen','Politik','politik','Kommunen sprechen über Innenstadt','Stadtentwicklung und Handel sind eng verknüpft.','Großimmobilien prägen das Gesicht ihrer Umgebung.','Eine nachhaltige Nutzung benötigt Partner aus Wirtschaft und Verwaltung.'],
  ['kredit','Markt','markt','Finanzmärkte prüfen die Risiken','Kredite sind nicht unbegrenzt verfügbar.','Liquiditätsplanung gehört zum Kerngeschäft einer Handelsgruppe.','Transparenz kann das Vertrauen der Geldgeber erhöhen.'],
  ['digital','Handel','markt','Digitale Dienste im Geschäft','Kaufhaus und Smartphone wachsen zusammen.','Digitale Informationen können die Beratung ergänzen.','Der Mehrwert muss für Kundinnen und Kunden unmittelbar erkennbar sein.'],
  ['quartalsblick','Konzern','haus','Hartwig legt Quartal hinter sich','Die Ergebnisrechnung dient als Gradmesser.','Umsatz und Rentabilität müssen gemeinsam bewertet werden.','Der Vorstand wird die Maßnahmen daran messen lassen.'],
  ['weihnachten','Handel','haus','Weihnachtsgeschäft erreicht die Häuser','Die letzten Wochen des Jahres zählen besonders.','Geschenke und Wintermode erhöhen die Bedeutung der Warenverfügbarkeit.','Gut vorbereitete Teams können jetzt den Unterschied machen.'],
  ['winter','Markt','markt','Winterwetter verändert Einkaufswege','Saisonale Schwankungen gehören zum Geschäft.','Kalte Tage beeinflussen die Nachfrage nach Bekleidung und Wohnen.','Die Warendisposition muss sich frühzeitig darauf einstellen.'],
  ['sommer','Handel','haus','Sommersaison fordert den Einzelhandel','Sortimente werden leichter und saisonaler.','Aktionen und Freizeitangebote verändern die Kundenfrequenz.','Eine gute Planung hält die Bestände im Gleichgewicht.'],
].map(([id, reiter, bild, titel, unter, kommentar, perspektive]) =>
  ({ id: id as string, reiter: reiter as ZeitungReiter, bild: bild as ZeitungsBild, titel: titel as string,
     unter: unter as string, kommentar: kommentar as string, perspektive: perspektive as string }));

export const ZEITUNG_ARTIKELARTEN = [...EREIGNISSE, ...HINTERGRUND].map((x) => x.id);

function stand(s: GameState): ZeitungStand {
  return (s.zeitung ??= { aktiv: true, ausgaben: [] });
}
export const zeitungAktiv = (s: GameState): boolean => s.zeitung?.aktiv !== false;
export const zeitungArchiv = (s: GameState): ZeitungAusgabe[] => s.zeitung?.ausgaben ?? [];
export const zeitungAktuelle = (s: GameState): ZeitungAusgabe | null => zeitungArchiv(s).at(-1) ?? null;
export function zeitungEinstellen(s: GameState, aktiv: boolean): void {
  stand(s).aktiv = aktiv;
  if (!aktiv) s.entscheidungen = s.entscheidungen.filter((e) => e.typ !== 'interview');
}

function ausVorlage(v: Vorlage, woche: number, zusatz: string, nummer: number): ZeitungArtikel {
  return {
    id: `z-${woche}-${nummer}`, art: v.id, reiter: v.reiter, titel: v.titel, unterzeile: v.unter,
    text: [zusatz, v.kommentar, v.perspektive].filter(Boolean).join(' '), bild: v.bild,
  };
}

export function zeitungInterviewAntwort(s: GameState, e: Entscheidung, option: string): void {
  if (!zeitungAktiv(s) || e.typ !== 'interview') return;
  const wirkung = {
    offensiv: { image: 2, betriebsrat: -2, bank: -1, kreditversicherer: -1, zitat: 'Wir treiben den Umbau konsequent voran und werden unsere Ziele erreichen.' },
    sachlich: { image: 1, betriebsrat: 1, bank: 1, kreditversicherer: 1, zitat: 'Wir gehen Schritt für Schritt vor und messen jede Maßnahme an belastbaren Zahlen.' },
    ausweichend: { image: -2, betriebsrat: -1, bank: -2, kreditversicherer: -2, zitat: 'Zu einzelnen Punkten möchten wir uns gegenwärtig nicht äußern.' },
  }[option as 'offensiv' | 'sachlich' | 'ausweichend'];
  if (!wirkung) return;
  for (const feld of ['image', 'betriebsrat', 'bank', 'kreditversicherer'] as const) {
    s.stakeholder[feld] = clamp(s.stakeholder[feld] + wirkung[feld], 0, 100);
  }
  stand(s).naechstesZitat = { abWoche: s.woche, text: `Im Interview sagt die Hartwig-Geschäftsführung: „${wirkung.zitat}“` };
}

/** Wird nach Abschluss der gesamten Simulationswoche einmal aufgerufen. */
export function zeitungWoche(s: GameState): void {
  if (s.prognose || !zeitungAktiv(s)) return;
  const w = s.woche;
  const z = stand(s);
  if (z.ausgaben.some((a) => a.woche === w)) return;
  // Unabhängig von s.rng, s.wettbewerbRng und dem globalen ID-Zähler.
  const r: RngHalter = { rng: (Math.imul(s.seed >>> 0, 0x9e3779b1) ^ Math.imul(w + 1, 0x85ebca6b) ^ 0xa174e51d) >>> 0 };
  const artikel: ZeitungArtikel[] = [];
  const meldungen = s.meldungen.filter((m) => m.woche === w && (m.typ === 'presse' || m.typ === 'insolvenz' || m.typ === 'eigentuemer' || /wettbewerb|konkurrenz|gläubiger|betriebsrat|schließ|vorstand|streik|quartal/i.test(m.text)));
  for (const m of meldungen.slice().sort((a, b) => Number(b.typ === 'insolvenz' || /gläubigerversammlung|insolvenzplan/i.test(b.text)) - Number(a.typ === 'insolvenz' || /gläubigerversammlung|insolvenzplan/i.test(a.text))).slice(0, 4)) {
    const v = EREIGNISSE.find((x) => x.muster!.test(m.text))!;
    artikel.push(ausVorlage(v, w, m.text, artikel.length));
  }
  if (z.naechstesZitat && z.naechstesZitat.abWoche <= w) {
    const vorlage: Vorlage = { id: 'interview', reiter: 'Konzern', bild: 'haus', titel: 'Hartwig-Vorstand im Gespräch', unter: 'Die Geschäftsführung bezieht Stellung.', kommentar: 'Das Interview stößt in der Branche auf Aufmerksamkeit.', perspektive: 'Wie die angekündigten Maßnahmen greifen, wird sich in den nächsten Wochen zeigen.' };
    artikel.unshift(ausVorlage(vorlage, w, z.naechstesZitat.text, 50));
    delete z.naechstesZitat;
  }
  const pflicht = w % 13 === 12 ? 'quartalsblick' : w % 52 >= 45 ? 'weihnachten' : w % 52 < 8 ? 'winter' : w % 52 >= 22 && w % 52 <= 34 ? 'sommer' : '';
  if (pflicht) artikel.push(ausVorlage(HINTERGRUND.find((x) => x.id === pflicht)!, w, '', 60));
  const pool = HINTERGRUND.filter((x) => x.id !== pflicht);
  while (artikel.length < 5 && pool.length) {
    const v = waehle(r, pool);
    pool.splice(pool.indexOf(v), 1);
    artikel.push(ausVorlage(v, w, '', 100 + artikel.length));
  }
  // Reproduzierbare Priorisierung: Gläubiger-/Insolvenzmeldungen haben Vorrang.
  artikel.sort((a, b) => Number(b.art === 'glaeubiger' || b.art.startsWith('insolvenz')) - Number(a.art === 'glaeubiger' || a.art.startsWith('insolvenz')));
  const ausgabe: ZeitungAusgabe = {
    woche: w, kw: kw(w), jahr: jahr(s, w), nummer: w + 1,
    aufmacher: artikel[0], meldungen: artikel.slice(1, 7), reiter: ZEITUNG_REITER,
  };
  z.ausgaben.push(ausgabe);
  if (z.ausgaben.length > 104) z.ausgaben.splice(0, z.ausgaben.length - 104);

  // Ein redaktioneller Interviewtermin alle zehn Wochen, erst nach Woche 8.
  // Keine neueId und kein neueEntscheidung: beides würde den Hauptstrom verändern.
  if (w >= 8 && (w + 1) % 10 === 0 && !s.entscheidungen.some((e) => e.typ === 'interview')) {
    s.entscheidungen.push({
      id: `zeitung-interview-${w}`, typ: 'interview', woche: w, frist: w + 2,
      titel: 'Interviewanfrage des Handelsboten',
      text: 'Die Redaktion bittet die Hartwig-Geschäftsführung um eine Aussage zur Entwicklung des Unternehmens. Welchen Ton wählen Sie?',
      optionen: [
        { id: 'offensiv', label: 'Offensiv: Wir gestalten die Zukunft' },
        { id: 'sachlich', label: 'Sachlich: Maßnahmen und Zahlen erklären' },
        { id: 'ausweichend', label: 'Ausweichend: Kein Kommentar' },
      ],
      standard: 'sachlich', daten: { ausgabe: w + 1 },
    });
  }
}
