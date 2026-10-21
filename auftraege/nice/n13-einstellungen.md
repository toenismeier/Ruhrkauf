# N13: Einstellungen und Barrierefreiheit

## Ziel
Eine Einstellungsseite, an der sich alle anderen Nice-to-haves mit ihren Schaltern einhängen, dazu Grundlagen für Lesbarkeit und Bedienung.

## Umfang
1. **Modul** `render/src/ui/einstellungen.js`, Menükachel „Einstellungen“ (Zahnrad).
2. **Speicher:** Einstellungen in `localStorage` unter `hartwig.einstellungen.v1`. Lesen und Schreiben in `try/catch`, Standardwerte, wenn der Speicher fehlt. Nicht im Spielstand, sie gelten geräteweit.
3. **API für andere Module:**
   - `einstellung(schluessel)` liefert den Wert, `meldeSchalter({ schluessel, titel, gruppe, art: 'schalter'|'auswahl'|'regler', optionen, standard })` registriert einen Schalter.
   - Jedes Modul ruft `meldeSchalter` beim Laden auf, die Seite baut sich daraus. Bei jeder Änderung wird ein `CustomEvent('einstellung', { detail: { schluessel, wert } })` auf `window` gefeuert.
4. **Eigene Einstellungen:**
   - Gruppe Darstellung:
     - Schriftgröße (klein / normal / groß, über CSS-Variable `--schrift` an `:root`),
     - Zahlen kompakt („12,4 Mio. €“) oder voll („12.403.221 €“), über `ui/format.js`,
     - Animationen (voll / reduziert / aus; reduziert gilt auch automatisch bei `prefers-reduced-motion`),
     - Farbschwäche-Modus: Ampeln und Plus/Minus zusätzlich mit Symbol (▲ ▼ ●) statt nur mit Farbe, Rot/Grün durch Blau/Orange ersetzt.
   - Gruppe Spiel:
     - Warnung vor ablaufenden Vorgängen (an/aus, ersetzt `postUi.warnen`),
     - Wochenbericht (voll / kurz / aus, aus `spiel-reise-und-wochenabschluss.md`),
     - Autospeichern (an/aus).
   - Gruppe Über: Version (Git-Kurzhash beim Bündeln in `spiel-bundle.js` schreiben), Hinweis „Alle Namen sind frei erfunden.“
5. **Barrierefreiheit:**
   - Alle Knöpfe mit `aria-label`, Panels mit `role="dialog"` und Fokus auf den Titel beim Öffnen.
   - Tippflächen mindestens 44 × 44 px. Ein Prüfskript `render/pruef-bedienung.js` findet in `spiel.html` nach dem Start und in jedem Panel alle sichtbaren Knöpfe unter 44 px und alle Knöpfe ohne Beschriftung.

## Abnahme
- Bilder der Einstellungsseite in allen drei Schriftgrößen. Bilder des Cockpits mit Farbschwäche-Modus.
- `pruef-bedienung.js`: 0 Funde.
- `spiel-render.js` 0 Abweichungen. Tests grün.
