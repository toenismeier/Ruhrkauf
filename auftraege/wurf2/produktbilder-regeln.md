# Produktbilder Phase 2 – gemeinsame Regeln für Q27, Q28, Q29 (Claude-Chats)

**Ummo (22.10.2026):** „Erstens zu wenig Produkte. Zweitens manche sehen echt schräg aus. Auch die Loafers oder BHs.“ Entscheidung per Auswahl: drei Claude-Chats, und die Bild-Chats legen ihre neuen Artikeltypen gleich in der Engine an (Q24 bei GPT behält nur Bedienung und Teamleistung).

## Ausgangslage (main nach Q25, #67)
- Bibliothek `render/src/kit/mode/`: `stoff.js` (Farben, Materialien, `flaeche`), `model.js` (Figuren je Geschlecht × Zielgruppe, abgenommen 21.10.), `flatlay.js` (parametrische Oberteile, Hosen, Röcke, Kleider, Jacken), `dinge.js` (Home, Taschen, Caps, Loafer, Sandale, Schal, Gürtel), `silhouetten.js` → `silhouetten.json` (106 Silhouetten, Schnittstelle), `produkt.js` (`produktSVG`, `modelFuerProdukt`, `bildFuer`).
- Noch alte Zeichner aus `render/src/kit/produktbild.js` (Zeichner `alt:` in `silhouetten.js`): Sneaker, Pumps, Stiefel, Handtasche, Mütze, Socken, Pyjama, Unterwäsche, BH, Creme, Parfum, Kinderbody, Plüschtier. Diese wirken stilfremd und werden ersetzt.
- Model-Stil ist abgenommen: Alltagsproportionen (ca. 7,5 Kopflängen, nicht „slender“), Phänotyp eines deutschen Warenhauses, Kinder normal gebaut, je Bein/Arm eine Farbe. Nicht ändern ohne Ummo.

## Dateien je Chat (Konflikte vermeiden)
- Eigene Silhouetten und Zeichner nur in `render/src/kit/mode/erweiterung-q27.js` / `-q28.js` / `-q29.js` (`SILHOUETTEN` mit `zeichner: 'z:<name>'`, `ZEICHNER`); gleiche id überschreibt den Basiseintrag (so ersetzt Q28 z. B. `bh`, ohne `silhouetten.js` anzufassen). Große Zeichner dürfen in eigene Dateien daneben (`mode/q28-schuhe.js` usw.).
- Gemeinsame Dateien (`stoff.js`, `model.js`, `flatlay.js`, `produkt.js`, `silhouetten.js`) ändert nur **Q27**; Q28/Q29 melden Bedarf (z. B. neues Muster) im PR und lösen ihn bis dahin in der eigenen Datei.
- `silhouetten.json` ist erzeugt: bei Konflikten nicht von Hand mischen, sondern `node scripts/silhouetten-json.mjs` neu laufen lassen. Ebenso `render/spiel-bundle.js` neu bauen.

## Qualitätsregeln (gelten für jedes Bild)
1. **Ein Stil:** nur `stoff.js` (`materialDefs`, `flaeche`), Licht von links, weiche Bodenschatten, gleiche Konturstärke. Keine neuen `alt:`-Zeichner.
2. **Schnittmaße statt Augenmaß:** je Silhouette eine Maßzeile im Code-Kommentar (z. B. Ärmelwinkel, Länge zu Breite, Saumweite) nach echter Konfektion; Bild muss diese Proportion zeigen.
3. **Ansicht:** Bekleidung frontal als Flatlay; Schuhe und Taschen schräg von vorn (Dreiviertel), nie platt von der Seite; Beauty und Home als Produktfoto-Anmutung mit Standfläche.
4. **Details, die ein Kunde erkennt:** Säume, Bündchen, Knopfleisten, Nähte, Schnürung, Ösen, Profilsohle, Bügel, Spitze, Etikett. Keine Marken, keine Logos realer Firmen, keine echten Namen.
5. **Füllung der Kachel:** Motiv füllt 70–85 % der Kachelhöhe (`zoom` in `produkt.js`), auch in 64 px erkennbar.
6. **Variation:** Muster (`uni`, `streifen`, `karo`, `blumen`, ggf. neu: `print`, `punkte`) und Detailparameter, damit zwei Artikeltypen derselben Silhouette sichtbar verschieden sind.
7. **Blindtest (Abnahme-Pflicht):** Kontaktbogen aller eigenen Silhouetten in 64 px und 160 px rendern; ein frischer Subagent (ohne Kontext, Agent-Tool) benennt jedes Bild ohne Beschriftung. Jedes Bild, das nicht richtig benannt wird, wird neu gezeichnet, bis 100 % erkannt werden. Ergebnis als Tabelle im PR.
8. **Model:** Jede Bekleidungs-, Schuh-, Taschen- und Kopfbedeckungs-Silhouette hat einen Model-Platz und erscheint am Model richtig (Prüfbild je Zielgruppe × Geschlecht, wo sinnvoll).

## Neue Artikeltypen in der Engine (Phase 2, erst nach Merge Q11 #57)
- Je Chat eine eigene Datei: `engine/src/sortiment/q27-mode.ts`, `q28-zubehoer.ts`, `q29-home.ts` mit `export const NAMEN = [...] as const` und `export const TYPEN: SortimentTyp[]` (`SortimentTyp` = `TypDef` mit `typ` aus `NAMEN` und Pflichtfeld `bild: { silhouette, …Parameter }` aus `silhouetten.json`).
- Den gemeinsamen Haken legt **Q27** an (`engine/src/sortiment/index.ts`, Erweiterung von `ArtikelTyp` und `ARTIKELTYPEN` in `produkte.ts`, `bild` im Katalog und in `produktKarte`, Render reicht `bild` an `produktbildSVG(…, { bild })` und `modelbildSVG` durch). Q28/Q29 tragen nur in ihre Datei und ihre Importzeile ein; wer vor Q27 fertig ist, wartet mit Phase 2 oder baut auf dem Q27-Branch auf.
- Je Artikeltyp: Kategorie und Baumpfad (Q11 `sortimentsPfad`), WGs, Saison, Preis (mitte), Materialien, `gruppe` (Passung kinder/jung/mitte/reif) so, dass zielgruppengerecht: kein Twinset für Teens, keine Baggy-Cargo für Best Ager, Kinderartikel nur Kinder. Ziel gesamt ≥ 300 Artikeltypen, jede Zielgruppe ≥ 40.
- **Kalibrierung neutral:** Eigenmarkenanteil und Marge im Standard unverändert (`npx tsx scripts/m7-wochenverlauf.ts` wie main), alte Spielstände laden.

## Abnahme je Chat
`cd render && npm test` (inkl. `tests/silhouetten.test.mjs`, neue Silhouetten werden automatisch geprüft), `node scripts/silhouetten-json.mjs` eingecheckt, `cd engine && npm run typecheck && npm test`, Blindtest 100 %, Abnahmebild (Kontaktbogen + Models) an Ummo per Datei in den Chat, Draft-PR gegen `main`, CI von Hand (`gh api -X POST repos/toenismeier/Ruhrkauf/actions/workflows/quality.yml/dispatches -f ref=<branch>`), nach grüner CI selbst mergen, `auftraege/STATUS.md` nachziehen. Bundle (`render/spiel-bundle.js`) neu bauen und mit committen.
