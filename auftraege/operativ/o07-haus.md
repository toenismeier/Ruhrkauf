# O07: Haus als Betrieb

Branch `feat/op-haus`. Baut auf O01 (Hauscluster, Leitungen) und O02 (Treiber, Reporting). Zuerst lesen: `auftraege/operativ/README.md`, `o01`, `o02`.

## Ziel
Jedes Haus ist ein Betrieb mit Leitung, Standards, Kosten, Partnern und Umfeld. Bei 560 Häusern läuft das über Ausnahmen: Die Clusterleitungen führen, der Spieler sieht eine Beobachtungsliste und greift gezielt ein.

## Festlegungen von Ummo
- Hausleitungen mit **vier Stärken** (Personal, Ware, Kunde, Kosten) plus **Ehrlichkeit**, dazu Gehalt, Bonus, Stimmung, Wechselwille.
- **Hausstandards zentral je Hauscluster**, Flagships mit eigenem Standard. Einzelne Häuser nur als Ausnahme.
- **Gastronomie** selbst betreiben oder verpachten.

## 1. Hausleitung (`engine/src/haus.ts`)
1. Der bestehende `Filialleiter` (`name`, `skill`, `moral`) wird erweitert um `staerken: { personal, ware, kunde, kosten }` (0..1), `ehrlichkeit` (0..1), `gehalt`, `bonusAnteil`, `wechselwille`, `stellvertretung` (Name, Qualität). `skill` bleibt als Mittel der Stärken für Kompatibilität.
2. **Wirkung** (über Treiber, O02):
   - Personal → Einsatz im Haus (Faktor auf die Planwirkung aus O04),
   - Ware → Verfügbarkeit und Altwarepflege,
   - Kunde → Kaufquote,
   - Kosten → Betriebskosten.
   - Normiert, sodass die Startleitungen neutral wirken.
3. **Personalaktionen:** ersetzen (Kandidaten über die Clusterleitung), fördern (Weiterbildung hebt eine Stärke), Halteprämie, zur Clusterleitung befördern (O01).
4. Die bestehenden Jahresgespräche (`ereignisse.ts`) nutzen die neuen Felder.

## 2. Wochenkommentierung
- Jedes Haus mit Abweichung unter −5 % gegen Vorjahr bzw. Plan (wenn O06 da ist) meldet einen **Grund** und eine **Ad-hoc-Maßnahme**.
- **Gründe:** Wetter, Baustelle vor der Tür, Ware fehlt, Personal, Konkurrenzaktion, Kassenausfall, Stadtereignis, Sonstiges.
- **Wahrheit:** Die Engine kennt den echten Haupttreiber (O02 und Ereignisse). Eine ehrliche Leitung nennt ihn. Eine unehrliche nennt einen äußeren Grund (Wetter, Baustelle), wenn der echte Grund intern liegt (Personal, Ware).
- Das **Vertriebscontrolling** prüft nach seiner Qualität und markiert „plausibel“ bzw. „nicht plausibel, eigentlicher Treiber: Kaufquote“.
- **Ad-hoc-Maßnahmen** aus einer Liste je Grund (Aktion vor Ort, Springer anfordern, Ware umlagern, Öffnungszeit anpassen). Die Clusterleitung setzt sie nach Qualität um, mit kleiner Wirkung in den Folgewochen.
- **Anzeige** im Reporting (O02) als Spalte „Kommentar“ und als Liste „Kommentare der Woche“.

## 3. Hausstandards (Store Operations)
- **Standards je Hauscluster:** Öffnungszeiten (Mo bis Sa, Start wie heute), Sauberkeit (Stufe 1–3), Warenpräsentation (1–3), Kassenstandard (maximale Wartezeit, 1–3), Service-Angebote (siehe 5).
- Flagships haben einen eigenen Standard. Einzelne Häuser nur als Ausnahme (Aktion mit Begründung).
- **Kosten** über Personal (O04) und Betriebskosten. **Wirkung** über Kaufquote und Frequenz.
- **Mystery Shopping:** vierteljährlich ein Kundenscore je Haus (0–100) aus Standards, Personaldeckung, Verfügbarkeit, Sauberkeit und Substanz (O08). Als Rangliste und im Haussteckbrief.

## 4. Betriebskosten
- Posten je Haus: Energie, Reinigung, Sicherheit, Instandhaltung, Versicherung. Startwerte so, dass die Summe der heutigen `sonstige`-Kosten entspricht.
- **Energie:** Preis schwankt (Ereignis Energiepreis, ±20 %). LED und Klimatechnik als Investition (O08 Technikstufe) senken den Verbrauch.
- **Kürzungen mit Nebenwirkung:**
  - Reinigung: Kundenscore sinkt,
  - Sicherheit: Inventurdifferenz steigt (O05),
  - Instandhaltung: Ausfälle (Rolltreppe, Aufzug, Klima), Substanz sinkt schneller.

## 5. Flächenmix, Partner, Services
1. **Konzessionäre:**
   - Die heutigen Konzessionsflächen bekommen Verträge mit Umsatzmiete in % (Start nach heutigem `konzessionserloes`), Laufzeit und Exklusivität.
   - Verhandlung bei Vertragsende als Vorlage.
   - Neue Konzessionäre als Angebot, zum Beispiel Markenshop, Uhren, Optiker. Fiktive Namen, keine echten Marken.
2. **Gastronomie:** Je Haus mit Restaurantfläche **selbst betreiben** oder **verpachten**.
   - Selbst: eigener Umsatz und eigene Marge, Personal, Frequenzbonus, Risiko.
   - Verpachten: feste Pacht, kleinerer Frequenzbonus.
   - Wechsel nur zum Vertragsende bzw. mit Umbauzeit.
3. **Frequenzbringer** als Untermieter aus der vorhandenen Logik (`MieterTyp`), ergänzt um Bäckerei, Post/Paketshop und Bibliothek.
4. **Services:** Kundendienst, Änderungsschneiderei, Geschenkverpackung (Wirkung vor allem KW 48 bis 52), Abholstation (Grundlage für O09). Kleine Kosten, Wirkung auf Kundenscore und Bon.

## 6. Umfeld der Stadt
- **Ereignisse je Stadt:** Stadtfest (Frequenz +), Baustelle vor dem Haus (Frequenz −, 4 bis 20 Wochen), Parkhaus geschlossen, ÖPNV-Streik, verkaufsoffener Sonntag (beantragt, siehe unten).
- **Innenstadtfrequenz** je Stadt als Trend, der alle Häuser der Stadt trifft.
- **Verkaufsoffene Sonntage:** je Stadt höchstens 4 im Jahr, Antrag als Aktion, Genehmigung mit Wahrscheinlichkeit nach Stadtgröße. Gegenwind von Gewerkschaft und Kirche als Meldung, Betriebsrat −2. Wirkung: Umsatz am Sonntag, Personal aus O04.
- Diese Ereignisse liefern die echten Gründe für die Wochenkommentierung.

## 7. Haussteckbrief und Beobachtungsliste
- **Haussteckbrief:** das Hausdetail wird zur Seite mit Reitern:
  - Überblick: Kennzahlen, Treiber, Plan, Kundenscore,
  - Leitung,
  - Personal (O04),
  - Ware (O05),
  - Fläche und Partner,
  - Kosten,
  - Kommentare.
- **Beobachtungsliste** auf dem Startbildschirm: Häuser mit großer Abweichung, schlechtem Kundenscore, unbesetzter Leitung oder nicht plausiblen Kommentaren. Je Zeile ein Haupthinweis und ein Sprung ins Haus.

## Abnahme
- Tests:
  - Neutral im Standard.
  - Unehrliche Leitung mit internem Treiber meldet einen äußeren Grund.
  - Gutes Vertriebscontrolling deckt das häufiger auf.
  - Kürzung Reinigung senkt den Kundenscore.
  - Gastronomie selbst vs. Pacht rechnet beides richtig.
- `spiel-render.js`: Haussteckbrief, alle Reiter, Werte gleich Engine.
