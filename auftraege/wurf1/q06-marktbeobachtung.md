# Q06: Fachabteilung Marktbeobachtung – nur relevante Meldungen

Branch `feat/q06-marktbeobachtung`. 1 Chat. **Start nach Merge von N08 Zeitung (`feat/nice-zeitung`)**, baut auf dessen Zeitung auf.

## Befund Ummo (Wurf 1, 20.10.2026)
- Zeitung und Posteingang sind voll mit Wettbewerbermeldungen, die „keinen interessieren“, z. B. „KLEIDERKISTE kontert in Kempten eine Hartwig-Aktion mit 34 % zusätzlichem Preisdruck“, „NOVA kontert in Koblenz …“, „Haus Bellmann (premium) eröffnet in Iserlohn. Erwarteter Nachfragerückgang Beauty: rund 0 %.“ Ummo: „Da muss es eine Fachabteilung für geben.“
- Die Zeitung selbst ist richtig gedacht (wie bei Coffee Inc), aber es sind viel zu viele irrelevante Themen. Die Bildfläche des Aufmachers ist leer (das Bild ist Teil von N08).
- Textfehler: Rohwert „(premium)“ im Satz, „rund 0 %“ als Meldung.

## Umsetzung
1. **Abteilung Marktbeobachtung** in der Zentrale (Bereich unter Strategie bzw. CSO, wie die Bereiche aus O01): Stufe, FTE, Kosten, Leitung mit Qualität.
2. **Relevanzfilter** für Wettbewerbs- und Marktmeldungen in der Engine: Relevanz je Meldung aus Umsatzanteil der betroffenen eigenen Häuser, Stärke des Effekts (Nachfrage, Preisdruck) und Nähe. Unter einer Schwelle keine Einzelmeldung.
   - Ohne Abteilung: nur Meldungen mit großem Effekt, keine Bündelung, Effekte ungenau (Spanne).
   - Mit Abteilung: gebündelter **Wochenüberblick Wettbewerb** (eine Meldung je Woche: die 3 wichtigsten Bewegungen, Summe der Effekte auf eigene Häuser), Einzelmeldung nur oberhalb der Schwelle, Effekte genauer; bessere Leitung findet mehr und schätzt genauer.
3. **Zeitung:** Aufmacher und Spalten nur aus relevanten Meldungen; Effekte von rund 0 % erscheinen nie. Formatnamen statt Rohwerten („Premium-Warenhaus“ statt „(premium)“). „Kontert … mit 52 % zusätzlichem Preisdruck“ in verständliche Sprache mit Wirkung auf eigene Häuser.
4. **Posteingang:** Wettbewerbsmeldungen in die Kategorie Konkurrenz (Folgeschritt aus `spiel-posteingang.md`), standardmäßig eingeklappt.

## Abnahme
- 52 Wochen Seed 1: Anzahl Wettbewerbsmeldungen je Woche ohne/mit Abteilung in die PR (Ziel mit Abteilung im Mittel höchstens 1 bis 2 je Woche).
- Bilder von drei Zeitungsausgaben.
- Engine-Tests grün, Bot C überlebt weiter 5 Jahre.
