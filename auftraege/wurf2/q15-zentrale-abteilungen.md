# Q15: Zentrale – Abteilung als Etage (Vorlage Coffee Inc 2)

**Vorlage:** `testflight/vorlage-coffee/01.png`, `09.png`, `11.png` (Abteilungsseite mit Etagenszene, Personalregler, Gehalt, Mitarbeiterreihe, Skill/Moral, Leiste je Gebäude). Ummo 21.10.: „Bau die Workstreams jetzt.“

**Umsetzung bei Hartwig:** Jede Fachabteilung im Hartwig-Hochhaus (Zentrale, `render/src/ui/vorstand.js`/`organisation.js`, HQ-Grafik) bekommt eine eigene Seite:
- oben die **isometrische Etage** (Tische, Glasräume, Pflanzen) mit so vielen sitzenden Figuren wie FTE, leere Tische = offene Stellen; darüber die Leitung mit einem Satz zur Lage („Wir sind unterbesetzt“, „Läuft“);
- **FTE-Regler „16 / 32“** (Ist / Kapazität der Etage) und **Gehaltsniveau-Regler** (wirkt auf Moral, Fluktuation, Qualität – Engine O01/O04, neutral im Standard);
- **Mitarbeiterreihe** mit Sprechblasen: will mehr Gehalt, Ziel erreicht, wechselwillig, überlastet;
- **Skill und Moral der Leitung** als Balken;
- unten eine **Leiste je Gebäude** (Finanzen, Personal, Einkauf, Marketing, IT, Etage hinzufügen).
Delegation je Aufgabe (Q05) bleibt als Abschnitt auf derselben Seite.

**Abnahme (Claude rendert):** Katalog aller Abteilungen im iPhone-Format, Engine-Werte unverändert im Standard (`m7-wochenverlauf.ts` bestanden), Etagenszene mit ≤ 60 Draw Calls.
