# Q39: Neue Artikeltypen Unterteile und Kleider aus dem Referenzsortiment (Claude-Chat)

Branch `feat/q39-referenz`. Grundlage `auftraege/wurf4/README.md` (Regeln, Bilder nur als Vorlage, nie ins Repo).

## Umfang
- **50 neue Artikeltypen** aus `auftraege/wurf4/daten/q39-typen.csv` (Oberbegriffe: Hose,Jeans,Shorts,Rock,Kleid,Jumpsuit,Bademode), sortiert nach Häufigkeit im Referenzsortiment.
- Je Typ: Engine-Eintrag (Kategorie, Baumpfad, WGs, Saison, Preis, Materialien, Gruppe so, dass die Zielgruppen aus der CSV entstehen), eigene Silhouette im Hartwig-Stil, Model-Platz.
- Zeichenvorlage: die drei Bögen in Spalte `vorlage_boegen` aus den privaten Repos `toenismeier/hartwig-ref-…` lesen. Typische Merkmale in Spalte `typische_merkmale` (Länge, Passform, Ausschnitt, Ärmel, Stoff, Abteilung) sind die Vorgabe für die Silhouette.
- Kein Muster im Typnamen (Musterfeld aus Q37).
