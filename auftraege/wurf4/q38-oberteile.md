# Q38: Neue Artikeltypen Oberteile aus dem Referenzsortiment (Claude-Chat)

Branch `feat/q38-referenz`. Grundlage `auftraege/wurf4/README.md` (Regeln, Bilder nur als Vorlage, nie ins Repo).

## Umfang
- **50 neue Artikeltypen** aus `auftraege/wurf4/daten/q38-typen.csv` (Oberbegriffe: Shirt,Top,Bluse,Hemd,Pullover,Hoodie,Sweatshirt,Cardigan,Weste), sortiert nach Häufigkeit im Referenzsortiment.
- Je Typ: Engine-Eintrag (Kategorie, Baumpfad, WGs, Saison, Preis, Materialien, Gruppe so, dass die Zielgruppen aus der CSV entstehen), eigene Silhouette im Hartwig-Stil, Model-Platz.
- Zeichenvorlage: die drei Bögen in Spalte `vorlage_boegen` aus den privaten Repos `toenismeier/hartwig-ref-…` lesen. Typische Merkmale in Spalte `typische_merkmale` (Länge, Passform, Ausschnitt, Ärmel, Stoff, Abteilung) sind die Vorgabe für die Silhouette.
- Kein Muster im Typnamen (Musterfeld aus Q37).
