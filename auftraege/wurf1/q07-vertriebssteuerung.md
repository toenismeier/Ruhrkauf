# Q07: Vertriebssteuerung – Region bis Haus, je Format, mit Vorjahr

Branch `feat/q07-vertrieb`. 1 bis 2 Chats. **Start nach Merge von `feat/massstab-oberflaeche`** (Portfolio-Liste, Sammelaktionen, Cockpit je Format kommen von dort und werden hier genutzt, nicht neu gebaut).

## Befund Ummo (Wurf 1, 20.10.2026)
- In der Regionsübersicht (Organisation, Vertriebsseite) hängen unter einer Region Mini-Regionen (Hauscluster). Tippt man darauf, passiert nichts.
- Es gibt keinen Überblick über die Häuser; man sieht nur etwas, wenn man in ein einzelnes Haus tippt.
- Mietvertragsanfragen kommen einzeln, „ein ewiges Klickerei“; das soll gebündelt werden.
- Gewünscht: Tippt man auf eine Region, sieht man **getrennt nach Formaten** (Warenhaus Hartwig, Volkskauf, Sport, FUNDUS, also alle Vertriebsorganisationen), welches Haus gut und welches schlecht performt.
- **Vorjahreswerte, „ganz wichtig“.** Auch wenn es am Anfang noch keine gibt: Man soll einstellen können, zu welchem Zeitpunkt man startet.

## Umsetzung
1. **Drilldown Region → Hauscluster → Haus** in der Vertriebsseite der Organisation (`render/src/ui/organisation.js`):
   - Region antippen: Liste ihrer Hauscluster mit Kennzahlen; Cluster antippen: Liste seiner Häuser; Haus antippen: Haus-Sheet.
   - Umschalter oben je Format bzw. Vertriebsorganisation (Hartwig, Volkskauf, Sport, FUNDUS, Alle).
   - Je Zeile: Umsatz Woche, Umsatz lfd. Jahr, **Δ Vorjahr in % und €**, EBITDA und EBITDA-Quote, Δ Vorjahr, Plan-Abweichung (O06), Frequenz, Conversion, Bon (O02), Personalquote, Mietquote, Ampel. Sortierbar, Standard: schlechteste Abweichung zum Vorjahr oben.
   - Kopfzeile je Ebene: Summe der Ebene und Vergleich zum Cluster (Durchschnitt der Vergleichsgruppe; Begriff „Cluster“, nicht „Netz“).
   - Zeitraum wählbar: Woche, letzte 4 Wochen, Monat, Quartal, lfd. Jahr.
2. **Vorjahr ab dem ersten Tag:**
   - Beim neuen Spiel erzeugt die Engine eine **Vorjahreshistorie** von 52 Wochen je Haus (Umsatz, EBITDA und Treiber), deterministisch über den Seed: Vorlauf-Simulation mit den Startwerten und Standard-Entscheidungen der Leitungen, ohne Spieleraktionen. Sie liegt getrennt in `s.vorjahrHistorie`, damit Ergebnis- und Bot-Prüfungen sich nicht verschieben.
   - Planung (O06), Treiber (O02, heute `vorjahrGeschaetzt`) und Hausreporting (O07) nutzen diese Historie statt Schätzungen.
3. **Startzeitpunkt wählbar** im Startbildschirm neben der Schwierigkeit: Startmonat (Januar, April, Juli, Oktober; Standard Januar). Die Vorjahreshistorie läuft entsprechend bis zur Woche vor dem Start. Speicherstand merkt den Start.
4. **Mietvertragsanfragen bündeln:**
   - Im Posteingang eine Sammelvorlage „Mietverträge“ je Woche statt Einzelvorlagen: Liste aller offenen Anfragen (Haus, Format, Restlaufzeit, Angebot des Vermieters, Mietquote heute/neu, EBITDA des Hauses, Empfehlung der Immobilienabteilung).
   - Je Zeile annehmen, nachverhandeln, ablehnen bzw. kündigen; dazu „Empfehlungen für alle übernehmen“ und Mehrfachauswahl.
   - Delegierbar über Q05 (Aufgabe „Mietverträge“ der Immobilienabteilung mit Betragsgrenze).
5. Engine-Abfrage `vertriebUebersicht(s, { ebene, id, format, zeitraum })` in `engine/src/abfragen.ts` für alle drei Ebenen; Oberfläche liest nur daraus.

## Abnahme
- Bildfolge: Region West antippen → Cluster → Haus, je einmal für Hartwig und FUNDUS.
- Test: Summe der Häuser = Cluster = Region = Format-Kopfzeile im Cockpit (je Zeitraum).
- Test: Vorjahreshistorie bitgleich bei gleichem Seed und Startmonat; Bot C überlebt weiter 5 Jahre.
- 52 Wochen Seed 1: Zahl der Posteingangs-Vorlagen zu Mietverträgen vorher/nachher in die PR.
