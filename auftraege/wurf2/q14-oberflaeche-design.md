# Q14: Oberfläche gesamt – hochwertig statt „KI-generiert“

**Befund Ummo (21.10.):** „Du musst wirklich nochmal im Detail dir das gesamte User-Interface anschauen. Das sieht wirklich sehr KI-generiert aus. Das sieht wirklich sehr lieblos aus, als ob das da jemand zusammengeschustert hätte.“ Vorlage bleibt Coffee Inc 2 (E01): ruhig, klar, wenige Elemente, große lesbare Zahlen, eigene Bildsprache.

**Konkrete Mängel aus `testflight/wurf-2/` (Claude, Auswahl, nicht abschließend):**
- Reiter im Hausdetail abgeschnitten („Über“, „Leitu“, „Perso“, „Koste“, „Komm“) – `09`, `13`.
- Chip „Aktion undefined“ im Hausdetail – `09`, `13` (`AKTION_NAME` ohne Eintrag, `spiel.js` ~Zeile 785).
- Interne IDs sichtbar: „Hauscluster hc-ost-2 / hc-west-9“ statt „Raum Berlin“ – `09`, `13`.
- Kopfzeile „Warenhaus und Hartwig …“ und Kennzahlen „1.000.000 M…“ abgeschnitten – `02`, `08`.
- Zentrale: Zeile „11. Etage 1.250 qm“ überlagert sich mit „Kündigen“, Spalten laufen ineinander – `06`.
- Verlaufsdiagramme mit nur einem Punkt zeigen leere Achsen „KW 1 … KW 1“ – `14`.
- Reiseziele mit „?“-Platzhaltern statt Stadtbildern, Deutschlandkarte mit winzigen Punkten ohne Beschriftung – `07`.
- Organisation: lange Listen gleichförmiger Karten mit Fortschrittsbalken ohne Bedeutung – `05`.
- Allgemein: zu viele gleich gewichtete weiße Karten, uneinheitliche Abstände, Schriftgrößen und Knopfstile, Emoji-/Platzhalter-Icons, Toasts überdecken Kopfzeilen.

**Vorgehen:**
1. **Gestaltungssystem** in `render/src/ui/` festschreiben (Datei `render/GESTALTUNG-UI.md`): Typoskala (max. 4 Größen), Abstände (4er-Raster), Farben (Markenrot nur für Primäraktion und Warnung), Karten-, Listen-, Reiter-, Knopf- und Zahlenstile, Icons aus einem einheitlichen Satz (kein Emoji).
2. Alle Panels darauf umstellen, beginnend mit Cockpit, Hausdetail, Posteingang, Organisation, Zentrale, Reise, Eigenmarken. Zahlen kürzen statt abschneiden (Mio./Mrd. passend), Reiter scrollbar mit vollen Namen oder Icons + Kurzname.
3. Leere Zustände bewusst gestalten (z. B. Verlauf erst ab zwei Wochen, sonst kurzer Text).
4. Keine Funktionsänderung, nur Darstellung; alle Smoketests und `spiel-render.js` grün.

**Abnahme (Claude rendert):** Vorher/Nachher-Katalog aller Panels im iPhone-Format (390 × 844), Ummo beurteilt auf dem iPhone. Kein Text abgeschnitten, keine interne ID sichtbar, kein „undefined“.
