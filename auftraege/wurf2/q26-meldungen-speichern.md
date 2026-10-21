# Q26: Meldungsleiste und „Speichern fehlgeschlagen“

**Befund Ummo (21.10.2026):** „Oben der Balken ‚Speichern fehlgeschlagen‘ und so. Der ist deutlich zu lange eingeblendet und wenn man draufklickt, soll der weg.“

**Ziel:**
1. **Ursache finden und beheben**, warum in der App „Speichern fehlgeschlagen“ erscheint (IndexedDB am Ursprung `https://spiel.hartwig.app/`, Größe des Spielstands seit #7 mit 560 Häusern, `structuredClone`, Quota, Version 2). Fehlertext mit Grund in der Diagnose (N14) protokollieren.
2. **Meldungen:** Standarddauer 2,5 s, Fehler 4 s; Antippen schließt sofort; Meldungen stapeln sich nicht über die Kopfzeile; gleiche Meldung nicht wiederholt anzeigen.

**Code:** `render/src/ui/speicher.js`, `render/src/spiel.js` (`meldung`), `app/scripts/app-smoke.cjs`.

**Abnahme:** App-Smoke speichert nach 52 Wochen mit 560 Häusern ohne Fehler (Zeit und Größe ausgeben), Mobil-Smoketest: Meldung verschwindet nach Antippen.
