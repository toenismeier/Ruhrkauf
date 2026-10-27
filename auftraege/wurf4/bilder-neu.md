# Wurf 4: Bilder neu (gilt für Q38–Q42)

**Ummo 25.10.2026** zum Kontaktbogen Q39 (Low-Rise-Jeans, Ballon-Jeans, Caprihose …): „So kommen die mir nicht ins Spiel.“ Befund per Auswahl: **Form trifft den Typ nicht, Stil insgesamt zu billig, Details und Proportionen falsch.** Maßstab: **nah an der Referenz.** Entscheidung: **Typen ja, Bilder neu**, in kleinen Paketen mit Abnahme durch Ummo je Paket.

## 1. Rückbau in Q38–Q41 (je Chat auf dem eigenen Branch)
- Engine-Typen bleiben. Alle neuen Silhouetten, Zeichner und Bilddateien aus `render/src/kit/mode/q3x-*.js` / `erweiterung-q3x.js` raus.
- Jeder neue Typ bekommt `bildOffen: true` und bis zur Abnahme die nächstliegende **vorhandene** Silhouette (kein neues Bild).
- Haken (legt **Q38** an, Q39–Q41 rebasen darauf): optionales Feld `bildOffen?: true` an `SortimentTyp`; Typen mit `bildOffen` sind im Produktentwickler und in der Eigenmarken-Auswahl **nicht wählbar** und nicht im Startsortiment. Test dazu.
- Danach normal: Rebase auf main (Q37), CI, mergen, STATUS. So kommt kein Bild ins Spiel, das Ummo nicht gesehen hat.
- Q42: gleiche Regel, Typen und Varianten mit `bildOffen`.

## 2. Bildpakete B1, B2, … (eigene Chats, je Paket höchstens 10 Typen)
Paketliste: `daten/bildpakete.csv` (Spalte `paket`, `typ`, `auftrag`, `vorlage_boegen`). **B01 ist das Stilpaket**: erst wenn Ummo B01 abnimmt, starten weitere Pakete; B01 ist dann Stilreferenz für alle.

### Verfahren (Ummo 25.10.2026: in B01 beide testen, Ummo wählt am Bogen)
Grundlage Merkposten O10 (Bildwerkzeuge). Je B01-Typ zwei Fassungen:
- **A: vtracer (MIT)**: bester Freisteller aus `vorlage_boegen` (Originalbild aus dem privaten Repo, bei Hintergrund vorher rembg, MIT) → vtracer → SVG. Dann **Stilschritt**: Kontur glätten und vereinfachen (keine Fotofalten, keine Logos, keine Schrift, keine Etiketten realer Marken), Flächen auf Hartwig-Palette, Schattierung und Licht von links aus `stoff.js`, Farbe/Material/Muster parametrisch umfärbbar. Ziel: echte Form, eigener Stil.
- **B: Bildmodell im Hartwig-Stil**: Qwen-Image-Edit (bzw. FLUX Kontext) auf Ummos RunPod, Eingabe derselbe Freisteller plus Stilvorgabe (Flatlay-Illustration, Hartwig-Palette, Licht von links, weicher Bodenschatten, freigestellt). Ohne LoRA im Test; LoRA erst, wenn Ummo B wählt. Läuft nicht im Bild-Chat (keine GPU), sondern über den Workstream-Chat mit Ummo; Ergebnisse kommen als Dateien in den privaten Repo-Ordner `hartwig-ref-p01/stiltest-b01/`.
- **Öffentlich/privat (Ummo):** Vektorisieren und Zwischenstände nur in den privaten Repos `hartwig-ref-…`. Ins Ruhrkauf-Repo kommt nur die vereinfachte, umgezeichnete Endform (A) bzw. das gewählte Endbild.
- **B01-Bogen an Ummo:** je Typ eine Zeile **Referenz | A | B** in 320 px und 64 px. Danach entscheidet Ummo das Verfahren für B02–B30; der Rest von Abschnitt 2 gilt für beide Verfahren (Maßzeile, Prüfung Formtreue ≥ 4, Geschwistertypen).

Arbeitsweise je Typ:
1. **Referenz zuerst:** die drei Bögen aus `vorlage_boegen` öffnen (private Repos `toenismeier/hartwig-ref-…`, nur lesen). Daraus eine **Maßzeile** im Code: Bundhöhe zur Hüfte, Weite an Bund, Hüfte, Knie, Saum, Länge, Schnittlinien, Taschen, Nähte, Verschlüsse, Saumabschluss. Was den Typ ausmacht, steht als erstes in der Maßzeile (Low-Rise: Bund deutlich unter Taille, kurze vordere Leibhöhe; Ballon-Jeans: Weite an Knie, schmal an Bund und Saum, **ohne** Bänder; Caprihose: Bund, wadenlang, gerades schmales Bein).
2. **Zeichnen auf Referenzniveau:** Flatlay frontal, echte Konfektionsproportion, sichtbare Nähte, Bund mit Gürtelschlaufen/Knopf wo vorhanden, Taschenbeutel und Ziernähte bei Denim, Stoffwurf und Schattierung aus `stoff.js`, gleiche Kontur wie Bestand. Keine Würste, keine gleichförmigen Röhren, keine erfundenen Details.
3. **Vergleichsbild** (nur lokal, nie ins Repo): Referenz-Freisteller links, eigene Zeichnung rechts, gleiche Höhe.
4. **Prüfung durch frischen Subagenten** (ohne Kontext) mit dem Vergleichsbild: Formtreue 1–5 (Silhouette, Proportion, Details) und Benennung aus einer Liste, in der die **Geschwistertypen** stehen (z. B. Ballon-Jeans / Ballonhose / Baggy-Jeans / Pumphose). Abnahme intern erst bei **Formtreue ≥ 4 und richtiger Benennung**, sonst neu zeichnen.
5. Model-Platz wie bisher, **mit Model-Prüfung** (Abschnitt 4).

Abgabe je Paket: Kontaktbogen **Referenz | Zeichnung** je Typ in 320 px und 64 px als Datei an Ummo, Tabelle Formtreue im PR. **Merge erst nach Ummos Ok.** Bei Ok: `bildOffen` für diese Typen entfernen, Bundle neu, STATUS.

## 3. Entscheidung Verfahren (Ummo 25.10.2026 nach B01-Bogen)
**B, danach vtracer auf B.** Das Bildmodell (Qwen-Image-Edit-2509, eigener RunPod-Pod, Eingabe Originalfreisteller) liefert die saubere Zeichnung; vtracer macht daraus SVG, Flächen werden auf `stoff.js` gemappt und sind im Code umfärbbar (Farbe, Material, Musterfeld Q37). A (vtracer direkt aufs Foto) ist verworfen (unruhig, skizzenhaft).
- B-Bilder erzeugt der Workstream-Chat für alle Pakete und legt sie privat ab: `toenismeier/hartwig-ref-p01-shirts-tops`, Ordner `bildpakete/<paket>/B/<typ>.png` (Eingabe in `bildpakete/<paket>/original/`). B01 liegt in `stiltest-b01/B/`.
- Bild-Chat je Paket: vtracer auf B, Flächen den Stoffzonen zuordnen (Grundfarbe, Schatten, Licht, Kontur, Details wie Knöpfe/Schnallen als feste Farben), Kontur 1 Stärke wie B, Bodenschatten einheitlich, Model-Platz. Prüfung wie Abschnitt 2 (Formtreue ≥ 4 gegen Referenz, Geschwistertypen). Bogen je Typ **Referenz | B | SVG im Spiel (2 Farben)** an Ummo, Merge nur nach Ok.
- Im SVG-Schritt entfernen: Etiketten im Kragen, Aufnäher, Schriftzüge und Stickerei-Schrift, die das Bildmodell trotz Vorgabe übernommen hat (z. B. B02 Lagenlook-Hemd, Resorthemd). Fehlt die Kontur (B02 Bolero), ergänzen.
- B01 ist Stilreferenz, sobald Ummo die SVG-Fassung von B01 abnimmt.

## 4. Model-Prüfung (Pflicht je Paket, Ummo 27.10.2026)
Anlass: B01-Prüfung am Model am 27.10. Das Model (`modelSVG`) zeichnet die Kleidung aus den alten Grundformen und übernimmt aus B nur Farbe, Material und einige Parameter. Im Blindtest durch einen frischen Subagenten waren 2 von 10 B01-Teilen am Model richtig erkannt. Die Ballonjeans erscheint als gerade Jeans, die Low-Rise-Jeans mit hohem Bund, die Hotpants als Bermuda. Beim Strickpullover fehlen Streifen und Polokragen, der Blouson zeigt keine Bomberform, Mary Jane ist kaum sichtbar, die Baguette-Tasche ist ein Viereck.
- Abnahmebogen je Typ: **Referenz | B | SVG im Spiel | am Model** (Zielgruppe, die den Typ trägt).
- Blindtest am Model durch frischen Subagenten mit Geschwisterliste wie Abschnitt 2. Abnahme nur bei richtiger Benennung **am Model**.
- Fällt ein Typ am Model durch, wird er im PR als Model-Befund ausgewiesen. Er wird nicht gemergt, als wäre er fertig. Wie das Model die B-Zeichnung übernimmt, ist offen (O10: 2D-Ebene je Teil oder Bildmodell auf MPFB-Körper). Bis dahin wird kein Paket ohne Model-Spalte vorgelegt.
