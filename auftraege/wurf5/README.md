# Wurf 5: Schnittvarianten mit eigenem Bild (ab 02.11.2026)

## Ziel
Ummo 02.11.2026: Die Eigenmarke zeigt zu wenige Schnitte und Formen („Da muss doch mehr gehen“). Das Spiel zählt bisher Grundtypen; Länge, Passform, Ausschnitt und Ärmel stecken im Typ (Beispiele: Neckholderkleid 42 Artikel, Trägerkleid 29, Blouson 39, je ein Typ). Wurf 5 macht aus der Sonderauswertung Teens und Young Adults (Typ × Geschlecht × Variante) eigene **Schnittvarianten mit eigenem Freisteller** und legt die Typen an, die dort als „neu“ stehen.

## Entscheidungen (Ummo per Auswahl, 02.11.2026)
- **Freigabe vorbelegt:** Alle Zeilen der Sonderauswertung gelten als „ok“. Claude filtert Unsinn selbst heraus (Regeln unten), Ummo ändert nur Abweichungen. Merge eines Pakets erst nach Ummos Bildabnahme.
- **5 Claude-Chats** nach Kategorie (V1–V5), Pakete à höchstens 10 Varianten.
- **Nur Freisteller.** Models (Ganzkörper in der Detailansicht) sind nicht Teil von Wurf 5; die Model-Spalte aus `wurf4/bilder-neu.md` Abschnitt 4 entfällt hier. Der Model-Weg (Bildmodell oder Code) wird getrennt entschieden.
- **Bildverfahren wie B02–B30** (`wurf4/bilder-neu.md` Abschnitt 3): B-Bild aus dem Bildmodell, danach vtracer, Flächen auf `stoff.js`, umfärbbar. B01 ist Stilreferenz.

## Quelle (nur lesen, privat, nie ins Repo)
- Sonderauswertung: `C:\Users\Ummo\Desktop\Projekte\WH\Claude outputs\Referenzsortiment_Teens-YA_Produktliste.xlsx` (1.033 Produkte; Spalten Typ, Geschlecht, Variante, Artikelzahl Teens/Young, Spielstatus, vorgeschlagener Artikel, Ersatzkandidaten, Freigabe, Anmerkung Ummo).
- Kontaktbögen der Referenzartikel: private Repos `toenismeier/hartwig-ref-p01…p11`, Ordner `boegen/<Block>/<shop>_<artikel>.jpg`.
- Fremdfotos, B-Bilder und Zwischenstände bleiben in den privaten Repos. Ins Ruhrkauf-Repo kommt nur die umgezeichnete SVG-Endform.

## Stand Phase 0 (03.11.2026)
- Erledigt: Liste vorbelegt (`Referenzsortiment_Teens-YA_Produktliste_Wurf5.xlsx`), 1.033 Zeilen: 602 vorhanden (Bild im Spiel), 162 raus (94 Sammelposten seltener Varianten, 43 mit Q42 erledigt, 13 unter 3 Artikeln, 8 Merkmal ohne Angabe, 4 ohne Freisteller), **269 Varianten für den Bildlauf** in 29 Paketen (`daten/v-pakete.csv`, Spalte `name` = Bilddatei).
- Eingabebilder und Auftrag liegen auf Ummos Rechner: `C:\Users\Ummo\Desktop\Projekte\WH\Basis Eigenmarke\_claude_tmp\w5` (eingabe, auftrag.json, pod_w5/batch_w5/server_w5_2026-11-03.py). B-Lauf startet nur nach Ummos ausdrücklicher Freigabe.

## Phase 0 (Workstream-Chat, vor dem Start von V1–V5)
1. Liste vorbelegen: Freigabe „ok“, wo leer. Bereits gesetzte Einträge von Ummo (Freigabe 1, 33 Produkte) bleiben.
2. Unsinn raus (Spalte Freigabe „raus“ mit Grund in „Anmerkung Claude“): typische Damentypen bei Herren (Crop, Bolero, Peplum, Wickelbluse u. ä.), kurze Herren-Oberteile laufen als normale Länge, Wäsche und Clubwear für Teens nach E45, Mischprodukte (zwei verschiedene Artikel in einer Zeile), Varianten ohne erkennbaren Formunterschied zur Grundform (nur Farbe, Muster oder Material: das deckt das Musterfeld Q37 ab).
3. Pakete schneiden: `daten/v-pakete.csv` (Spalten `paket;chat;kategorie;zieltyp;variante;geschlecht;zielgruppen;artikel_teens;artikel_young;spielstatus;referenz;ersatz;boegen`), Pakete V1-01, V1-02 … je höchstens 10 Zeilen, nach Zieltyp gruppiert.
4. B-Bilder je Zeile auf eigenem RunPod-Pod (Qwen-Image-Edit-2509, Eingabe Originalfreisteller des Referenzartikels, Zusatz „Plain fabric only: absolutely no logo, no lettering“ von Anfang an), Ablage privat `toenismeier/hartwig-ref-p01-shirts-tops`, Ordner `bildpakete-w5/<paket>/B/<variante>.png`. Kosten vor dem Lauf an Ummo (Freigabeschritt 5); Pod nach jedem Lauf löschen.
5. Zusammengeführte Datei für Ummo: `C:\Users\Ummo\Desktop\Projekte\WH\Claude outputs\Referenzsortiment_Teens-YA_Produktliste_Wurf5.xlsx` (vorbelegt, mit „raus“-Gründen und Paketnummer).

## Workstreams
| Chat | Kategorie | Auftrag |
|---|---|---|
| V1 | Shirts und Tops inkl. Crop (73 Varianten, 8 Pakete). **Legt zuerst den Haken an** (unten) | `v1-oberteile.md` |
| V2 | Hosen, Jeans, Shorts, Röcke (78 Varianten, 8 Pakete) | `v2-unterteile.md` |
| V3 | Kleider, Blusen, Hemden (29 Varianten, 3 Pakete) | `v3-kleider.md` |
| V4 | Jacken, Mäntel, Blazer (44 Varianten, 5 Pakete) | `v4-jacken.md` |
| V5 | Pullover, Cardigans, Hoodies, Sweatshirts, Nachtwäsche, ein Schuh (45 Varianten, 5 Pakete) | `v5-rest.md` |

## Haken (V1, alle anderen rebasen darauf)
- `engine/src/sortiment/q42-varianten.ts` → `Schnittvariante` bekommt `bild?: ArtikelBild` und `bildOffen?: true`. Variante mit `bildOffen` ist im Produktentwickler nicht wählbar.
- Produktentwickler und Produktkarte zeigen bei gewählter Variante das Variantenbild, sonst das Bild des Zieltyps.
- Je Chat eine eigene Datei `engine/src/sortiment/w5-<kategorie>.ts` mit `VARIANTEN_W5_<KATEGORIE>`, eingehängt in `VARIANTEN`. Neue Typen (Spielstatus „neu“) als `TYPEN` wie Q38–Q42, im Index eingehängt.
- Bilder je Chat in `render/src/kit/mode/w5-<kategorie>.js` plus `w5-<kategorie>-zuordnung.json`, keine Änderung an bestehenden Silhouetten.
- Test je Chat: jede Zeile seiner Pakete ist als Variante oder Typ vorhanden, Zielgruppen wie Liste, Bild vorhanden oder `bildOffen`.

## Arbeitsweise je Paket (wie `wurf4/bilder-neu.md` Abschnitt 2 und 3, ohne Model)
1. Referenz zuerst: Bögen öffnen, Maßzeile im Code (was die Variante von der Grundform unterscheidet steht zuerst: Länge, Bundhöhe, Weite, Ausschnitt, Ärmel).
2. vtracer auf B, Flächen auf Stoffzonen, Kontur wie B01, Bodenschatten einheitlich. Logos, Etiketten und Schrift entfernen.
3. **Unterscheidbarkeit:** Variante und Grundform nebeneinander in 64 px. Ein frischer Subagent ohne Kontext muss sie mit einer Geschwisterliste (Grundform + alle Varianten des Zieltyps) richtig benennen. Abnahme intern erst bei Formtreue ≥ 4 und richtiger Benennung.
4. Bogen je Paket an Ummo: **Referenz | B | SVG im Spiel (2 Farben) | Grundform daneben**, 320 px und 64 px. Ablage `C:\Users\Ummo\Desktop\Projekte\WH\Claude outputs\Wurf5_<paket>_Bogen.png` und im PR (ohne Fremdfotos: im PR nur SVG und Grundform).
5. Merge erst nach Ummos Ok. Bei Ok: `bildOffen` raus, Bundle neu, CI über workflow_dispatch `quality.yml` grün, M7 unverändert, STATUS.md fortschreiben.
6. Varianten ohne B-Bild in brauchbarer Qualität bleiben `bildOffen` und kommen in `daten/w5-rest.csv` mit Grund.

## Regeln
- Deutsch, echte Umlaute, kurze Antworten, Pfade vollständig ab Laufwerk.
- Geschlecht nur aus dem Referenzartikel, Plausibilität selbst prüfen. Referenzshops gelten nur für Teens und Young Adults (keine Adults, keine Best Ager), außer Ummo sagt anderes.
- Keine RunPod-Läufe in V1–V5. B-Bilder liefert Phase 0; fehlt ein B-Bild oder ist es unbrauchbar, Zeile in `w5-rest.csv`, nicht selbst nachrendern.
- Je Chat ein Branch `feat/w5-<kategorie>`, ein offener PR.
