# O05: Ware – Merchandise Planning, Clusterbestand, Allokation, Reduzierung

Branch `feat/op-ware`. Baut auf O01 (Bereiche, Hauscluster) und O02 (Treiber). Zuerst lesen: `auftraege/operativ/README.md`, `EINKAUF-VERTRAG.md`, `engine/src/einkauf.ts`.

## Ziel
Heute führt die Engine den Bestand je Warengruppe als Altersjahrgänge nur für den ganzen Konzern. Die Reduzierung ist ein Modus je Warengruppe. Künftig läuft die Ware durch eine Kette:

Merchandise Planning → Einkauf → Allokation & Nachschub → Hauscluster → Instore-Logistik → Fläche → Preis & Reduzierung → Abverkauf oder Abfluss an FUNDUS.

Jedes Glied gehört einem Bereich mit Qualität.

## Festlegungen von Ummo
- Der Bestand wird **je Hauscluster** geführt. Die Häuser bekommen ihren Anteil.
- Hartwig-Altware kann an **FUNDUS** abgegeben werden, **mit Grenze**: Zu viel Eigenware macht FUNDUS profillos.
- Reduzierung **zentral mit lokalem Spielraum** für Clusterleitungen. Die Zentrale kann ihren Kalender aber **durchsetzen**, also den lokalen Spielraum sperren.

## 1. Merchandise Planning
- Je Warengruppe und Saison: Budget (Open-to-Buy), Zielmarge, Zielabverkauf, Sortimentsbreite (wenige Artikel tief oder viele flach), Aufteilung Vororder/Nachorder.
- Der Bereich schlägt vor (Vorlage zur Saisonplanung, etwa 30 Wochen vor Saison, im Takt der heutigen Orderrunden). Die Qualität bestimmt, wie gut die Budgets zum späteren Bedarf passen. Ein schwacher Bereich bucht zu viel in schwache Gruppen.
- Mit O06 kommt das Budget aus der Jahresplanung, bis dahin aus dem heutigen `limitFaktor`.
- Die bestehende Einkaufssteuerung (`steuerung` je Warengruppe) bleibt die Schnittstelle. Merchandise Planning setzt deren Werte, wenn delegiert.

## 2. Bestand je Hauscluster
- `s.bestand` (Kohorten) bekommt das Feld `hauscluster`. Die Summe über alle Cluster entspricht dem heutigen Konzernbestand (Test).
- Laufzeit: Kohorten je Cluster zusammenfassen, wo Alter, Gruppe und Art gleich sind. Grenze aus README Regel 5 einhalten, auch in der Maßstab-Welt prüfen (Messung in der PR).
- Der Umsatz eines Hauses je Gruppe ist begrenzt durch seinen Anteil am Clusterbestand × Verfügbarkeit auf der Fläche (Instore-Logistik, O04).

## 3. Allokation & Nachschub
- **Erstverteilung** der Saisonware auf die Cluster nach Profil: Umsatzanteil, Stadtgröße, Flagships mit mehr Sortimentsbreite.
- **NOS-Nachschub** aus dem Zentrallager je Cluster.
- Die Qualität bestimmt den Verteilfehler. Ein schwacher Bereich schickt Ware in den falschen Cluster: Fehlmengen in Cluster A und Altware in Cluster B gleichzeitig.
- **Umlagerung zwischen Clustern:** als Vorschlag des Bereichs oder als Aktion `{ typ: 'umlagerung'; gruppe; von; nach; wert }`. Sie kostet Logistik und dauert 1 bis 2 Wochen. Innerhalb eines Clusters ist Ware frei verfügbar.

## 4. Preis & Reduzierung
1. **Reduzierungskalender** je Warengruppe und Saison: Stufen −20 %, −30 %, −50 %, dann Räumung, dazu der Mid-Season-Sale.
   - Zeitpunkt nach Abverkaufsquote. Gutes Preismanagement reduziert früh und gezielt, schwaches alles auf einmal im Schlussverkauf.
   - Ersetzt den heutigen Modus `reduzierung`. Der Standard bildet das heutige Verhalten exakt nach.
2. **Lokaler Spielraum:** Clusterleitungen dürfen bis zu einer Grenze (Start 10 Prozentpunkte) lokal nachreduzieren. Gute Leitungen reagieren auf Lage (Wetter, Konkurrenzeröffnung), schwache verschenken Marge.
3. **Durchsetzen:** Aktion `{ typ: 'reduzierungZentral'; gruppe?; hauscluster?; an: boolean }` sperrt den Spielraum je Warengruppe, je Cluster oder überall. Kostet Stimmung der betroffenen Clusterleitungen (−5, bei guten Leitungen −10).
4. **Umetikettieren** braucht Instore-Logistik-Stunden (O04). Mit elektronischen Preisschildern (O03) entfällt das.
5. Reduzierungen wirken über den Treiber Bon (O02), Preis je Teil.

## 5. Abfluss an FUNDUS
- Hartwig-Altware (ab Alter laut `EINKAUF-VERTRAG.md`) kann an FUNDUS gehen statt in die Räumung: weniger Abschrift bei Hartwig.
- **Grenze:** Eigenware-Anteil am FUNDUS-Bestand bis 25 % ohne Wirkung. Darüber sinkt die Frequenz der FUNDUS-Häuser (Profilverlust), bei 50 % um 15 %.
- Solange FUNDUS keine eigene Wirtschaft hat (`engine-formate.md` offen): Abfluss bucht die Ware aus und nur den Erlös in die Hartwig-Rechnung, Frequenzwirkung als vorbereiteter Faktor.

## 6. Fläche und Inventur
- **Flächenzuteilung:** Quadratmeter je Abteilung und Haus verschieben, Aktion über den Bereich Flächenmanagement, 2 bis 6 Wochen Umbauzeit.
  - Kennzahl Flächenproduktivität je Abteilung.
  - Der Ladenbau (`render/src/kit/ladenplan.js`) nutzt die neuen Flächen beim nächsten Neubau der Szene.
- **Inventur:** Jahresinventur im Februar (KW 6).
  - Inventurdifferenz je Haus aus Diebstahl, Bruch und Buchungsfehlern.
  - Senkt sich durch Verwaltungspersonal (O04), Warensicherung (Investition je Haus) und Warenwirtschaft (O03).
  - Ergebnis als Meldung mit Rangliste der Häuser.

## 7. Oberfläche
- **Einkauf** (bestehendes Panel) bekommt die Reiter Merchandise Planning (Budgets je Saison) und Allokation (Bestand je Cluster als Heatmap: Reichweite, Altware, Fehlmengen).
- **Reduzierungskalender** als Zeitleiste je Warengruppe mit Stufen, lokalen Abweichungen der Cluster und Schalter „zentral durchsetzen“.
- **Hausdetail:** Verfügbarkeit auf der Fläche, Altwareanteil, letzte Inventurdifferenz.

## Abnahme
- Tests:
  - Neutral im Standard.
  - Summe Clusterbestand = Konzernbestand.
  - Schwache Allokation erzeugt messbar gleichzeitige Fehlmengen und Altware.
  - Durchsetzen sperrt lokale Reduzierung.
  - FUNDUS-Abfluss über 25 % senkt die FUNDUS-Frequenz.
- `spiel-render.js`: Einkaufsprüfung 0 Abweichungen (Prüfwerte erweitern).
