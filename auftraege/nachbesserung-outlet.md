# Nachbesserung: FUNDUS (PR #11)

Branch `feat/grafik-outlet` (weiterarbeiten). Grundlage bleibt `auftraege/grafik-outlet.md`.

## Befund (19.10., lokal geprüft)
- Technik grün: Typecheck, 100/100 Tests, `spiel-render.js` 0 Abweichungen.
- **Optik nicht abgenommen.** Katalog `outlets` und `outlet-vergleich` angesehen:
  - Alle 20 Häuser sehen gleich aus. Die drei Bauformen (Retail-Park-Box, zweigeschossiger Fachmarkt, Innenstadt-Geschäftshaus) sind in der Iso-Ansicht nicht zu unterscheiden: überall dieselbe flache, graue Kiste mit dünnem weinrotem Band.
  - Schriftzug „FUNDUS“ ist winzig und in Katalogauflösung nicht lesbar. Das Claim-Band fehlt bzw. ist nicht sichtbar.
  - Die Billig-Wettbewerber (Kaufkiste, Wühlwerk, Resteparadies) wirken im Vergleich markanter als die eigene Kette. Das ist umgekehrt gewollt: FUNDUS soll wie ein Markenladen aussehen, nur voller.
  - 450 bis 550 Teile je Haus, deutlich unter dem Spielraum aus `KIT.md`.
  - `main` enthält inzwischen Volkskauf (#2) und Wettbewerber im Spiel (#10). Vor dem nächsten Push auf `main` rebasen. Erwartete Konflikte gibt es nur in `bruecke.js` und `stadtplan.js` (`SLOT_ROLLE`, `bauer`-Objekt in `spielBauer`). Dort beide Seiten behalten.

## 1. Markenauftritt (wichtigster Punkt)
- Fassadenband in `#8c1d40` mindestens 3,5 m hoch, über die ganze Front und um die Ecke gezogen.
- Schriftzug „FUNDUS“ in Weiß, Versalhöhe mindestens 2,4 m bei Boxen und 2,0 m bei Innenstadthäusern, auf beiden sichtbaren Seiten. Er muss im Katalog `outlet-vergleich` ohne Zoom lesbar sein, mindestens so gut wie „KAUFKISTE“.
- Claim-Band darunter in Hellgrau oder Creme mit dunkelroter Schrift: „Marken. Bis zu 60 % unter dem empfohlenen Preis.“
- Eingangsportal: ein vorspringender Windfang oder Kubus in Hausfarbe (rund 8 × 4 m, 6 m hoch) mit Schriftzug, der die Box gliedert.
- Pylon an der Zufahrt mindestens 9 m hoch, mit „FUNDUS“ gut lesbar.

## 2. Drei Bauformen, auf den ersten Blick verschieden
1. **Retail-Park-Box:** eingeschossig, 6 bis 7 m hoch. Das Glas-Vordach läuft über die ganze Front. Parkplatz voll, Wagenhäuschen, Pylon. Dach mit Lüftungsaggregaten und Oberlichtern, nicht leer.
2. **Zweigeschossiger Fachmarkt:** 10 bis 11 m hoch, OG mit geschlossener Fassade aus Paneelen, EG Glas, sichtbare Rolltreppe hinter einer zweigeschossigen Glasecke. Parkplatz auf einer Seite, Anlieferung auf der anderen.
3. **Innenstadt-Geschäftshaus:** zwei bis drei Geschosse Laden, darüber ein bis zwei Bürogeschosse mit Lochfassade (70er/80er, Waschbeton oder Rasterfassade), Schaufensterzone im EG, kein Parkplatz, Passanten auf dem Gehweg. Es darf auch eine umgenutzte ehemalige Warenhausfläche sein: dann alter Warenhauskörper, neue Fassadenverkleidung in Hausfarbe nur im EG und am Schriftzugband.
- Innerhalb einer Bauform variieren Länge, Tiefe, Dachaufbauten, Lage des Eingangs, Farbe der Paneele (drei Grautöne) und Parkplatzform über `rng(seed)`.

## 3. Schaufenster und Betrieb
- Schaufenster mit Puppen, Taschen, Schuhen und Deko-Inseln. Sie sind in der Iso-Ansicht als farbige Flächen erkennbar, wie bei Volkskauf.
- Passanten mit weinroten Tüten. Bei Neueröffnung eine Schlange vor dem Eingang.
- Teilebudget: 900 bis 1.800 Teile je Haus. Werte in `KIT.md` eintragen.

## 4. Zustände
- Die Zustände sind gut erkennbar, bitte so lassen. Zu prüfen ist nur, dass „aktion“ und „offprice“ beim Format FUNDUS nicht wie ein Rabattplakatfeld aussehen. Statt Plakaten ein zweites Claim-Band „Neue Ware jede Woche“.

## 5. Abnahme
- Kataloge `outlets`, `outlet-vergleich`, `outlet-lagen` in mindestens drei Runden rendern und jedes Bild ansehen. Die Bilder mit Protokoll nach `bilder/` legen.
- Abnahmefrage: Kann jemand, der den Katalog zum ersten Mal sieht, die drei Bauformen benennen und FUNDUS lesen, ohne zu zoomen? Und wirkt FUNDUS hochwertiger als Kaufkiste?
- Lokal: Typecheck, Tests, Build, `spiel-render.js` 0 Abweichungen, `pruef-staedte` 0 Fehler, `pruef-gestaltung` 0 Verstöße.
- Ohne CI arbeiten wie in `auftraege/README.md`.
