# Auftrag Spiel: Reise zwischen Städten und Wochenabschluss wie Coffee Inc 2

Branch `feat/spiel-reise-woche`, von `main`. Nur Oberfläche (`render/`), keine Rechenlogik in der Oberfläche. Engine-Daten über vorhandene Abfragen (`E.posteingang`, `E.cockpit` usw.), fehlende Werte als neue Abfrage in `engine/src/abfragen.ts`.

## Ausgangslage
- **Stadtwechsel heute:** `<select id="stadtwahl">` → Ladeschirm `#lade` → `baueStadtAusSpiel`. Das ist hart und unspielerisch.
- **Wochenwechsel heute:** Knopf „Woche weiter“ → `woche()` → kleiner `#wochenstreifen`. Es gibt keinen Moment, in dem die Woche abgeschlossen wird.
- **Vorbild:** Ummo hat beides in Coffee Inc 2 aufgenommen (Bildschirmvideo, iPhone, 27 s, 20.10.). Unten ist das Video im Millisekundenraster zerlegt. Die Zeiten sind gemessen, nicht geschätzt. Sie werden so übernommen, nur Inhalt und Motiv werden auf Hartwig übertragen.

## Teil A: Reise zwischen zwei Städten

### Vorbild (gemessen)
| Zeit ab Tippen | Dauer | Was passiert |
|---|---:|---|
| 0 bis 240 ms | 240 ms | **Kreis-Enthüllung aus dem Flughafen-Pin:** Ein dunkler Kreis (Panelfarbe) wächst vom angetippten Pin aus, bis er den Bildschirm füllt. Im Kreis skaliert das Panel von rund 55 % auf 100 % und blendet von stark abgedunkelt auf voll auf. Kurve ease-out. |
| 240 bis 500 ms | 260 ms | Panel steht. Kopfbild (Jet auf rotem Teppich) mit leichtem Zoom, Kopfzeile „Seattle-Tacoma International Airport“ mit ×, darunter Flagge und Stadt. |
| 500 bis 2.000 ms | 1.500 ms | **Schreibmaschine:** Willkommenstext der Assistentin („Welcome to … Tap the destination below to catch a flight.“), rund 60 Zeichen je Sekunde, Porträt rechts. |
| ab 1.000 ms | 300 ms | Das Panel schiebt sich nach oben, das Kopfbild wird kleiner. Darunter „DESTINATIONS“, gepunktete Weltkarte, Zielraster 2 Spalten × 3 Zeilen (rundes Stadtbild, Stadtname, Flughafen klein). Die Ziele blenden ein. |
| Tippen auf Ziel, +0 bis 150 ms | 150 ms | Überblendung Panel → Flugbild. |
| +150 bis 4.550 ms | 4.400 ms | **Flug:** Vollbild einer isometrischen Großstadt in hellem Dunst (rund 20 % Weiß darüber). Die Kamera fährt waagerecht nach links, insgesamt rund ein Drittel der Bildbreite, mit sanftem Anfahren und Abbremsen. Die Geschwindigkeit steigt von 30 auf 150 Punkte je Sekunde (bei 1.206 Punkten Breite) und fällt wieder, Maximum in der Mitte. |
| +700 bis 3.500 ms | 2.800 ms | **Flugzeug:** großes Sprite (rund 60 % Bildbreite), ohne Drehung, kommt links oben ins Bild und fliegt entlang der Iso-Achse nach rechts unten heraus. Gleichförmig, rund 0,5 Bildbreiten je Sekunde, also schneller als die Stadt darunter (Parallaxe). |
| ganze Flugdauer | | **Streckenzeile** im unteren Viertel, fest: „SEA ✈ SFO“ in großen grauen Kürzeln, darunter Stadtnamen klein und Flaggen. |
| +4.550 bis 4.950 ms | 400 ms | **Kreis-Schließen in den Ziel-Pin:** Die neue Stadt ist dahinter schon fertig gebaut. Das Flugbild schrumpft auf rund 80 %, dunkelt ab und verschwindet in einem schrumpfenden Kreis genau auf dem Flughafen-Pin der Zielstadt. Kurve ease-in. |
| danach | | Neue Stadt, Kopfleiste und Stadtchip unten („San Francisco“) unverändert sichtbar. |

Gesamt vom Antippen des Ziels bis zur bedienbaren neuen Stadt: rund 4,9 s. Der Flug verdeckt den Aufbau der neuen Stadt. Das ist der eigentliche Zweck.

### Umsetzung Hartwig
- **Motiv:** Der Vorstand reist mit dem ICE. Statt Flughafen ist es der Hauptbahnhof jeder Stadt (Gleisband ist in `stadtplan.js` vorhanden). Der Bahnhof bekommt einen eigenen Pin (Symbol Zug), wie die Haus-Pins.
- **Panel „Hauptbahnhof <Stadt>“:**
  - Kopfbild: ICE am Bahnsteig, statt rotem Teppich ein roter Läufer in Hartwig-Rot.
  - Schreibmaschinentext der Assistentin: „Willkommen am Hauptbahnhof <Stadt>. Wohin soll es gehen?“
  - Darunter „REISEZIELE“, eine gepunktete Deutschlandkarte mit allen Städten mit eigenen Häusern als Punkte, die aktuelle Stadt rot.
  - Zielraster 2 Spalten mit rundem Stadtbild (Katalogausschnitt der Stadt), Stadtname und Zahl der Häuser je Format (Hartwig, Volkskauf, Sport, FUNDUS als kleine Zahlen).
  - Sortierung: zuletzt besuchte zuerst, dann nach Umsatz. Suchfeld oben, weil es bis zu 220 Städte werden (`massstab-oberflaeche.md`).
- **Reisebild:**
  - Vorgerenderte Iso-Stadtlandschaft als Bild. Einmal mit dem Kit gerendert, keine echte Szene, damit es flüssig läuft. Zwei bis drei Varianten (Ruhrgebiet, Altstadt, Hafenstadt), die Wahl richtet sich nach der Zielstadt.
  - Dunstschicht, Kamerafahrt und Zeiten exakt wie oben.
  - Statt Flugzeug ein ICE (weiß mit rotem Streifen, Iso-Ansicht, rund 70 % Bildbreite lang), der entlang der Iso-Achse durchs Bild fährt. Zeiten und Geschwindigkeit wie das Flugzeug.
  - Streckenzeile mit den Kfz-Kennzeichen der Städte als Kürzel, zum Beispiel „E 🚆 D“ mit Zugsymbol statt Flugzeug, darunter die Stadtnamen und das Landeswappen statt der Flagge.
- **Ladezeit verstecken:** Mit dem Tippen auf das Ziel startet `baueStadtAusSpiel(ziel)` hinter dem Reisebild (Kacheln in Ruhe nachbauen lassen). Das Schließen beginnt frühestens nach 4.400 ms **und** erst, wenn die Stadt steht. Dauert der Aufbau länger, läuft die Kamerafahrt langsam weiter (keine Standbilder).
- **Kreis-Schließen** auf den Bahnhofs-Pin der Zielstadt, Kamera vorher auf den Bahnhof zentrieren.
- Der bisherige `<select>` bleibt als Notweg im Menü („Stadt direkt wählen“), ohne Reise.

## Teil B: Wochenabschluss

### Vorbild (gemessen)
| Zeit | Dauer | Was passiert |
|---|---:|---|
| Tippen auf Wochenknopf, +0 bis 200 ms | 200 ms | Hintergrund dunkelt auf rund 60 % ab, gleichzeitig blendet der Dialog „DONE THIS WEEK?“ ein (Karte mittig, Porträt der Assistentin rechts, Frage, YES/NO in Orange, × oben). |
| Tippen auf YES, +0 bis 300 ms | 300 ms | Dialog und Abdunklung blenden aus, ease-out. |
| +300 bis 480 ms | 180 ms | Stillstand, die Stadt steht unverändert. Hier wird die Woche gerechnet. |
| +480 bis 860 ms | 380 ms | Überblendung von der Stadt auf den Vollbildschirm „WEEKLY RESULTS“ (dunkles Blaugrau, Logo links, Titel mittig). Die Spaltentitel „WEEKLY REVENUE“ und „WEEKLY NET INCOME“ blenden mit ein. |
| +900 ms bis rund 11,9 s | 11.000 ms | **Hochzählen:** Beide Zahlen zählen gleichzeitig von 0 auf den Endwert, als ganze Euro mit Tausenderpunkten. Kurve ease-out quadratisch: Wert = Ende × (1 − (1 − t/T)²) mit T = 11 s. Gemessen nach 1 s 15 %, nach 2 s 30 %, nach 4 s 55 %, nach 6 s 82 %, nach 8 s 93,5 %, nach 10 s 99,2 %. |
| Ende Zählen +0 bis 200 ms | 200 ms | × oben rechts erscheint. Unter den Zahlen blendet die Veränderung zur Vorwoche ein (klein, „−236.381 € (0 %)“). Darunter der Kapitalfluss (Operativ, Investition, Finanzierung, Netto, rechtsbündig) und die Zeitungskarte „THE CAFE STREET JOURNAL“ (Datum, Reiter Top/Retail/Business/Market/Politics, Schlagzeile, zwei Kurzmeldungen mit Bild). |
| +200 bis 350 ms | 150 ms | Bildschirm dunkelt ab, ein **Bottom-Sheet** „COMPANY INCIDENT“ fährt von unten hoch (Logo, Firmenname, Porträt rechts). |
| +350 bis 1.850 ms | 1.500 ms | Schreibmaschine im Sheet, rund 70 Zeichen je Sekunde. Unten „Case 1 of 1“. |
| Ende Text | sofort | „Case 1 of 1“ wird durch den grünen Knopf CLOSE ersetzt. |
| Tippen auf CLOSE, +0 bis 200 ms | 200 ms | Sheet fährt nach unten, die Abdunklung geht weg. Der Wochenbericht mit der Zeitung bleibt stehen, bis × getippt wird. |

Hinweis zur Messung: Zwischen 14,8 s und 15,8 s im Video fehlen Bilder (Aufnahmeruckler). Die Zählkurve ist um diese Sekunde bereinigt.

### Umsetzung Hartwig
- **Dialog „Woche abschließen?“:** Porträt der Assistentin des Vorstands. Text „Sind Sie mit dieser Woche fertig?“, darunter bei Bedarf die heutige Ablaufwarnung („2 Vorgänge laufen ab, Standard wird gewählt“) als eigene Zeile statt `window.confirm`. Knöpfe „Ja“ und „Nein“.
- **Rechnen:** `woche()` läuft im 180-ms-Stillstand. Dauert sie länger (große Welt), wartet die Überblendung, bis sie fertig ist.
- **Wochenbericht:** Vollbildschirm im Hartwig-Stil (Farben aus `GESTALTUNG.md`), Titel „KW 31 · Wochenergebnis“.
  - Zwei Zahlen zählen hoch: **Umsatz der Woche** und **EBITDA der Woche**. EBITDA darf negativ sein und zählt dann von 0 ins Minus, in Rot.
  - Danach: Veränderung zur Vorwoche, Kapitalfluss (Cash operativ, Investitionen, Finanzierung, Cash netto, Cash-Bestand), das Insolvenzbarometer, wenn das Verfahren läuft.
  - **Zeitung:** fiktive Wirtschaftszeitung, Name „Der Handelsbote“, mit Datum (KW), Reitern Top/Handel/Konzern/Markt/Politik und Schlagzeile. Die Inhalte kommen aus den Presse- und Wettbewerbsmeldungen der Woche (`E.posteingang(s).meldungen`, Kategorie Presse und Konkurrenz): eine Schlagzeile, zwei Kurzmeldungen. Bilder: Iso-Ausschnitt des betroffenen Hauses oder Wettbewerbers aus dem Kit.
  - **Vorfälle:** Neue Entscheidungen und Angebote der Woche (`handeln`, neu seit Vorwoche) erscheinen nacheinander als Bottom-Sheet „VORFALL“ mit Porträt der zuständigen Person (Vorstand, Betriebsrat, Bank), Schreibmaschinentext und „Vorgang 1 von N“. Knöpfe nach dem Text: „Später“ (bleibt im Posteingang) und „Ansehen“ (öffnet den Vorgang). Mehr als 3 Vorgänge: nur die drei wichtigsten, der Rest als Hinweis „+N weitere im Posteingang“.
  - Der bisherige `#wochenstreifen` entfällt im normalen Spiel. Er bleibt nur im Bot-Modus und für `spiel-render.js`.
- **Überspringen:** Einmal Tippen während des Zählens springt auf den Endwert (Coffee Inc zeigt das im Video nicht, bei 11 s ist es für Hartwig aber Pflicht). Einstellung im Menü: „Wochenbericht: voll / kurz (2 s) / aus“, Standard voll.

## Technik
- Neues Modul `render/src/ui/reise.js` und `render/src/ui/wochenbericht.js`, eingebunden wie die anderen Module über `oeffneModul`. Kein three.js in den Panels außer den vorgerenderten Bildern.
- Alle Zeiten als Konstanten oben im Modul, mit dem Messwert aus dieser Datei als Kommentar.
- Animationen mit CSS-Transitions bzw. `requestAnimationFrame`, Kreis-Enthüllung mit `clip-path: circle(r at x y)` und dem Bildschirmpunkt des Pins.
- `prefers-reduced-motion`: Kreis und Kamerafahrt durch 150-ms-Überblendung ersetzen, Zählen aus.
- `spiel-render.js`: Schalter `--ohne-animation` (Standard in der Prüfung), damit die Prüfläufe nicht 15 s je Woche warten. Zusätzlich je ein Prüfschritt: Reise Essen → Düsseldorf (Endstadt richtig, Kamera auf Bahnhof, keine Konsolenfehler) und ein Wochenabschluss mit Bericht und einem Vorfall (Zahlen = Engine-Werte, Zeitung zeigt Meldungen der Woche).

## Abnahme
- Bildschirmaufnahme bzw. Bildfolgen im 100-ms-Raster für beide Abläufe in `bilder/reise/` und `bilder/wochenbericht/`, je Schritt der Tabellen mindestens ein Bild.
- Zeiten mit `performance.now()` protokollieren und gegen die Tabellen legen, Abweichung höchstens ±10 %. Protokoll in die PR.
- 60 Bilder je Sekunde auf dem iPhone während Flug und Zählen (Messung mit `spiel.performanceMessen`).
- Typecheck, Tests, Build, `spiel-render.js` 0 Abweichungen, `pruef-staedte` 0 Fehler. Ohne CI arbeiten wie in `auftraege/README.md`.
