# E53 Formattrennung, Etappe 1: Fundament

Stand 02.11.2026, umgesetzt von Claude auf `feat/formate-fundament`.

## Ziel (Ummo)
Formate werden überall getrennt ansprechbar: Hartwig, Premium, Volkskauf, Hartwig Sport, FUNDUS. Format ist die erste
Dimension jedes Hauses, jeder Kennzahl und jeder Entscheidung. Etappe 1 legt das Fundament, die Etappen 2 bis 5
(Ware/Einkauf, Markt/Kunde, Betrieb/Steuerung, Formatwähler auf allen Seiten) bauen darauf auf.

## Gesetzt (Ummo, 02.11.2026)
- Eigene Regionen, Regionalleitungen und Cluster je Format. Zuschnitt:
  Hartwig Nord, Ost, West, Mitte, Süd; Volkskauf West, Nord-Ost, Süd-Mitte; Sport Nord-Ost, Süd-West;
  FUNDUS West, Süd, Nord-Ost-Mitte; Premium ohne Regionen (eigene Führung, Sondercluster mit den Flagships).
- Volkskauf neu verteilt: West 30, Süd 19, Nord 14, Mitte 13, Ost 10 (vorher 68 im Westen).
  28 Kleinststädte haben danach kein eigenes Haus mehr und bleiben ohne eigenes Haus auf der Karte (220 Städte).
- Zentrale gemeinsam, Umlage auf die Formate; vorerst nach Umsatzanteil.
- Keine Nachkalibrierung der Formatumsätze auf die Ruhrkauf-Ziele (Ummo: „Die Ziele von den Millionen werden aber noch nicht nachgezogen“).

## Umgesetzt
- `engine/src/formatschluessel.ts`: `formatVon`, Formatnamen, Leitungstitel, Regionszuschnitt je Format.
- `engine/src/organisation.ts`: Formatleitungen, Regionalleitungen je Formatregion (`format:Region`), formatreine Cluster,
  `ordneHausZu` (neue FUNDUS, Umflaggen, Wettbewerber-Übernahme), `migriereFormatOrganisation` für alte Spielstände
  (Leitungskosten neutral, Clusterbestand zurück in den Pool, verwaiste lokale Reduzierungen entfernt).
- `engine/src/formatguv.ts`: `konzernNachFormaten` (52 Wochen, Vorlauf vor Spielstart, Umlage Zentrale).
- Fehler: Statistik fand Volkskauf nicht; FUNDUS-Kaufquote; Startplan und Personalreferenz vor Aktivierung von
  Volkskauf und FUNDUS (jetzt danach); FUNDUS-Vorjahr mit halber Nachfrage; neue FUNDUS-Häuser im Cluster des Musterhauses;
  Format-Erfolge nie erreichbar; Wettbewerber-Übernahme als Outlet blieb ein Hartwig-Warenhaus (jetzt FUNDUS-Haus).
- Oberfläche: Organisation › Vertrieb zeigt „Konzern nach Formaten“; Antippen öffnet Format → Formatleitung → Regionen →
  Cluster; Premium mit Flagship-Auswahl. Statistik-Formatvergleich mit Premium. Ältere Spielstände werden beim Laden migriert.

## Offen für die nächsten Etappen
- Vertriebssteuerung unter der Formattafel rechnet Regionen noch formatübergreifend (Etappe 4/5, Formatwähler).
- Verursachungsgerechte Umlage der Zentrale.
