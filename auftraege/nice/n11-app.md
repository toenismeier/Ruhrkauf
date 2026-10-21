# N11: Auf dem iPhone installierbar, Spielstände

## Ziel
Ummo spielt auf dem iPhone. Das Spiel soll sich wie eine App verhalten: Symbol auf dem Home-Bildschirm, Vollbild, offline spielbar, mehrere Spielstände.

## Umfang
1. **Web-App:**
   - `render/manifest.webmanifest`: Name „Hartwig“, Hochformat, Vollbild (`display: standalone`), Farben aus `GESTALTUNG.md`.
   - App-Symbol 180 × 180 und 512 × 512, gerendert aus dem Kit: Iso-Ausschnitt eines Hartwig-Hauses mit Signet. Skript `render/symbol.js` erzeugt die PNGs.
   - Startbilder für die gängigen iPhone-Größen (`apple-touch-startup-image`).
2. **Offline:** Service Worker `render/sw.js`, cacht `spiel.html`, Bundle, Manifest und Symbole. Neue Version: Hinweis „Neue Version verfügbar, neu laden“. Kein Cache für Spielstände.
3. **Spielstände:**
   - Drei Plätze plus Autospeichern, mit Name, Datum, Woche, Szenario, Cash und Vorschaubild (kleiner Kartenausschnitt als JPEG-Daten-URL).
   - Speicher heute in `ui/speicher.js`: dort erweitern, IndexedDB statt `localStorage`, weil die Stände mit 560 Häusern groß werden. Alles in `try/catch`, Meldung bei vollem Speicher.
   - Export als Datei (gzip, `.hartwig`) und Import über Dateiauswahl, damit Ummo Stände zwischen Geräten mitnimmt oder Fehlerfälle schickt.
4. **Ausrichtung und sichere Ränder:** `env(safe-area-inset-*)` überall prüfen (Notch, Home-Balken, Dynamic Island).
5. **Doku:** Abschnitt in `MOBIL-TEST.md`: Installieren auf dem iPhone (Safari → Teilen → Zum Home-Bildschirm), Aktualisieren, Spielstand übertragen.

## Abnahme
- Lighthouse-PWA-Prüfung lokal (Playwright, Chromium) ohne Fehler bei Installierbarkeit.
- Test: speichern, Seite neu laden, laden, gleicher Stand. Export und Import, gleicher Stand. Offline neu laden (Service Worker), Spiel startet.
