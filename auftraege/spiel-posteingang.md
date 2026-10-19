# Auftrag: Posteingang für Meldungen, Angebote und Entscheidungen

Branch `feat/spiel-posteingang`. Oberfläche im Prototyp (`render/`) plus schlanke Abfragen in der Engine. Läuft unabhängig von allen Grafik-Aufträgen.

## Ausgangslage
- Die Engine erzeugt laufend:
  - `s.meldungen: Meldung[]` (`{ woche, typ: 'presse' | 'info' | 'warnung' | 'ereignis' | 'eigentuemer' | 'insolvenz', text }`, über `util.ts melde()`),
  - `s.angebote: Angebot[]` (Typen `untermiete`, `paket`, `stadt`, `sportverkauf`, `sonderposten`, später weitere; Frist, Status `offen | angenommen | abgelehnt | verfallen`; Erzeugung in `ereignisse.ts`),
  - `s.entscheidungen: Entscheidung[]` (Titel, Text, Optionen, `standard`, Frist; bei Fristablauf löst `ereignisse.ts` mit dem Standard).
- Im Prototyp sieht der Spieler davon fast nichts:
  - `cockpit()` zählt nur `offeneEntscheidungen` und `offeneAngebote`,
  - Meldungen erscheinen höchstens als 3,5-Sekunden-Toast (`spiel.js meldung()`),
  - Entscheidungen werden nur im Vorstand-Panel gezeigt (`ui/vorstand.js`, nur die des Vorstands),
  - Angebote haben auf der Karte zum Teil einen Marker (`kit/hq.js angebotMarker`), aber kein Panel.
- Aktionen dafür gibt es schon: `angebotAnnehmen`, `angebotAblehnen`, `angebotVerhandeln` (`{ angebot, haeuser }`), `entscheiden` (`{ id, option }`).
- Vorbild Coffee Inc 2: Benachrichtigungen mit Zähler, Karten mit klaren Knöpfen, ein Tipp führt zum Ort des Geschehens.

## Ziel
Ein Posteingang, über den der Spieler jede Woche sieht, was passiert ist und was er entscheiden muss. Kein Angebot und keine Entscheidung verfällt mehr unbemerkt.

## Engine (nur Abfragen, keine Spiellogik ändern)
1. In `abfragen.ts` neu `posteingang(s)` mit drei Listen:
   - `handeln`: offene Entscheidungen und offene Angebote, sortiert nach Frist (dringendste zuerst). Je Eintrag: `id`, `art` (`entscheidung` | `angebot`), `typ`, `titel`, `text`, `woche`, `frist`, `restWochen`, `optionen` (bei Angeboten: Annehmen, Ablehnen, bei verhandelbaren Typen Verhandeln), `standard` (was bei Fristablauf passiert, als Klartext), `bezug` (`{ stadt?, hausIds?, gebaeudeId?, modul? }` für den Sprung), `wert` (Geldbetrag, wenn vorhanden: Einmalzahlung, Kaufpreis, Miete je Jahr), `dringend` (Frist in höchstens 1 Woche).
   - `meldungen`: die Meldungen der letzten 13 Wochen, neueste zuerst, mit `kategorie` (Presse, Häuser, Finanzen, Personal, Konkurrenz, Eigentümer) aus einer Zuordnung von `typ` und Stichworten, und `bezug` wie oben, soweit aus dem Text oder einer neuen optionalen Angabe ableitbar.
   - `erledigt`: angenommene, abgelehnte und verfallene Angebote sowie gelöste Entscheidungen der letzten 13 Wochen mit Ergebnis.
2. `melde()` bekommt einen optionalen vierten Parameter `bezug?: { stadt?: string; hausId?: string; modul?: string }`, der in `Meldung` gespeichert wird. Die wichtigsten Aufrufer ergänzen: Schließung, Streik, Filialleiter-Abgang, Instandhaltung, Mietende, Lieferantenereignisse, Angebote, Quartal und Eigentümer. Reine Ergänzung, keine Änderung an Logik oder Zufall.
3. Gelöste Entscheidungen merken: `loeseEntscheidung` legt einen Eintrag in einer neuen Liste `s.entscheidungsprotokoll` ab (Titel, gewählte Option, Woche, ob Standard durch Fristablauf). Auf 52 Wochen begrenzen.
4. Tests in `engine/tests/posteingang.test.ts`: Sortierung nach Frist, `standard` als Klartext vorhanden, verfallenes Angebot taucht in `erledigt` auf, Fristablauf erzeugt Protokolleintrag mit Kennzeichen Standard. Alle bestehenden Tests und Kalibrierungen unverändert grün (die Änderungen dürfen keine Zahl im Spiel verändern).

## Oberfläche
1. **Neues Modul `render/src/ui/posteingang.js`** im Stil der vorhandenen Module (`einkauf.js`, `vorstand.js`): `posteingangModul({ E, s, panel, meldung, nachAktion })` mit `oeffne()`, `zu()`, `aktiv()`, `neuZeichnen()`, `badge()`.
2. **Einstieg:**
   - Neue Kachel „Posteingang“ im Menü (`spiel.html`, `#menue .kacheln`) an erster Stelle, mit Badge = Zahl der Einträge in `handeln`, rot, wenn einer `dringend` ist.
   - Zusätzlich ein kleines Briefsymbol mit Zähler oben neben dem Cockpit, ein Tipp öffnet den Posteingang direkt.
3. **Aufbau des Panels** (Hochformat 390 × 844, Panelstil wie die anderen Module):
   - Reiter „Zu tun“, „Meldungen“, „Erledigt“.
   - „Zu tun“: Karten mit Titel, Restzeit („noch 2 Wochen“, bei 1 Woche rot), Kurztext (ausklappbar), Wert, Satz „Ohne Entscheidung: …“, Knöpfe der Optionen. Verhandeln öffnet die Hausauswahl (vorhandene `vorschlagHaeuser`, Häuser an- und abwählen, dann `angebotVerhandeln`).
   - „Meldungen“: Liste mit Kategorie-Symbol, Woche und Text, Filter nach Kategorie, Tipp springt zum Bezug.
   - „Erledigt“: was entschieden wurde und mit welchem Ergebnis.
4. **Sprung zum Ort:**
   - `bezug.stadt` wechselt die Stadt (vorhandene Stadtauswahl `wahl` und `baueStadtAusSpiel`) und fährt die Kamera auf das Haus (`oeffneHaus`).
   - `bezug.modul` öffnet Einkauf, Vorstand, Marketing oder Zentrale.
   - Angebote mit Hausbezug zeigen auf der Karte einen Marker (vorhandenes `angebotMarker` nutzen), Tipp darauf öffnet die Angebotskarte.
5. **Wochenwechsel:**
   - Nach „Woche weiter“ (`spiel.js woche()`) erscheint unten ein Streifen „KW 23: 2 neue Angebote, 1 Entscheidung, 5 Meldungen“. Tipp öffnet den Posteingang, sonst blendet er nach 6 Sekunden aus.
   - Ist eine Entscheidung oder ein Angebot mit Restzeit 0 offen (verfällt mit diesem Wochenwechsel), fragt „Woche weiter“ einmal nach: „1 Entscheidung läuft ab: Standard wird gewählt. Trotzdem weiter?“ Abschaltbar in den Einstellungen, Zustand im Spielstand (`ui/speicher.js`).
   - Bot-Modus (`woche(true)`) und Prüfskripte überspringen die Rückfrage.
6. **Toasts:** Der vorhandene Toast (`meldung()`) bleibt für Rückmeldungen auf eigene Aktionen. Engine-Meldungen gehen nicht mehr in den Toast, sondern nur in den Posteingang.
7. **Texte:** deutsch, kurz und konkret, mit echten Umlauten. Geld über die vorhandenen Formatierer (`ui/format.js`). Kein Fachjargon ohne Erklärung; Zahlen immer mit Einheit.
8. **Speicher:** Gelesen/ungelesen je Meldung und der Reiterzustand werden über `ui/speicher.js` mitgespeichert.

## Prüfung und Abnahme
- `spiel-render.js` erweitern: Posteingang öffnen, Zähler gleich `posteingang(s).handeln.length`, jede Karte entspricht einem Eintrag, Klick auf Annehmen, Ablehnen und Entscheiden ändert den Spielstand wie die Engine-Aktion (Vergleich gegen einen Klon mit `fuehreAus`). 0 Abweichungen.
- `render/tests/mobil-smoke.js` um Öffnen des Posteingangs und eine Entscheidung erweitern.
- Bildschirmbilder `bilder/posteingang.png`, `bilder/posteingang-meldungen.png`, `bilder/posteingang-wochenstreifen.png` (Seed 1, Bot C, Woche 30) erzeugen und ansehen. Bedienung muss mit dem Daumen gehen: Knöpfe mindestens 44 px hoch.
- `cd engine && npm run typecheck && npm test`, `cd render && npm run build && node spiel-render.js`. CI grün.
- Nach Merge von `feat/engine-wettbewerber`: Kategorie „Konkurrenz“ mit deren Meldungen und Entscheidungen befüllen (kleiner Folge-Commit auf `main`).
