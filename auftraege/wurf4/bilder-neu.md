# Wurf 4: Bilder neu (gilt für Q38–Q42)

**Ummo 25.10.2026** zum Kontaktbogen Q39 (Low-Rise-Jeans, Ballon-Jeans, Caprihose …): „So kommen die mir nicht ins Spiel.“ Befund per Auswahl: **Form trifft den Typ nicht, Stil insgesamt zu billig, Details und Proportionen falsch.** Maßstab: **nah an der Referenz.** Entscheidung: **Typen ja, Bilder neu**, in kleinen Paketen mit Abnahme durch Ummo je Paket.

## 1. Rückbau in Q38–Q41 (je Chat auf dem eigenen Branch)
- Engine-Typen bleiben. Alle neuen Silhouetten, Zeichner und Bilddateien aus `render/src/kit/mode/q3x-*.js` / `erweiterung-q3x.js` raus.
- Jeder neue Typ bekommt `bildOffen: true` und bis zur Abnahme die nächstliegende **vorhandene** Silhouette (kein neues Bild).
- Haken (legt **Q38** an, Q39–Q41 rebasen darauf): optionales Feld `bildOffen?: true` an `SortimentTyp`; Typen mit `bildOffen` sind im Produktentwickler und in der Eigenmarken-Auswahl **nicht wählbar** und nicht im Startsortiment. Test dazu.
- Danach normal: Rebase auf main (Q37), CI, mergen, STATUS. So kommt kein Bild ins Spiel, das Ummo nicht gesehen hat.
- Q42: gleiche Regel, Typen und Varianten mit `bildOffen`.

## 2. Bildpakete B1, B2, … (eigene Chats, je Paket höchstens 10 Typen)
Paketliste: `daten/bildpakete.csv` (Spalte `paket`, `typ`, `auftrag`, `vorlage_boegen`). **B1 ist das Stilpaket**: erst wenn Ummo B1 abnimmt, starten weitere Pakete; B1 ist dann Stilreferenz für alle.

Arbeitsweise je Typ:
1. **Referenz zuerst:** die drei Bögen aus `vorlage_boegen` öffnen (private Repos `toenismeier/hartwig-ref-…`, nur lesen). Daraus eine **Maßzeile** im Code: Bundhöhe zur Hüfte, Weite an Bund, Hüfte, Knie, Saum, Länge, Schnittlinien, Taschen, Nähte, Verschlüsse, Saumabschluss. Was den Typ ausmacht, steht als erstes in der Maßzeile (Low-Rise: Bund deutlich unter Taille, kurze vordere Leibhöhe; Ballon-Jeans: Weite an Knie, schmal an Bund und Saum, **ohne** Bänder; Caprihose: Bund, wadenlang, gerades schmales Bein).
2. **Zeichnen auf Referenzniveau:** Flatlay frontal, echte Konfektionsproportion, sichtbare Nähte, Bund mit Gürtelschlaufen/Knopf wo vorhanden, Taschenbeutel und Ziernähte bei Denim, Stoffwurf und Schattierung aus `stoff.js`, gleiche Kontur wie Bestand. Keine Würste, keine gleichförmigen Röhren, keine erfundenen Details.
3. **Vergleichsbild** (nur lokal, nie ins Repo): Referenz-Freisteller links, eigene Zeichnung rechts, gleiche Höhe.
4. **Prüfung durch frischen Subagenten** (ohne Kontext) mit dem Vergleichsbild: Formtreue 1–5 (Silhouette, Proportion, Details) und Benennung aus einer Liste, in der die **Geschwistertypen** stehen (z. B. Ballon-Jeans / Ballonhose / Baggy-Jeans / Pumphose). Abnahme intern erst bei **Formtreue ≥ 4 und richtiger Benennung**, sonst neu zeichnen.
5. Model-Platz wie bisher.

Abgabe je Paket: Kontaktbogen **Referenz | Zeichnung** je Typ in 320 px und 64 px als Datei an Ummo, Tabelle Formtreue im PR. **Merge erst nach Ummos Ok.** Bei Ok: `bildOffen` für diese Typen entfernen, Bundle neu, STATUS.
