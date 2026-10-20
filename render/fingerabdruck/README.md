# Q03 – Stadt-Fingerabdrücke

Für jede der **112 Städte** auf `main` liegen nach dem initialen Referenzlauf zwei gemeinsam zu versionierende Dateien vor:

- `<stadt-id>.json` – Seed, festes Bildprofil, sortierte Liste der Stadtplankacheln (Bauer, Lage, Drehung, Variante, Zentimeter-Rundung) und Planprüfsumme; Geometriestatistik je Parzelle (Teile, Dreiecke, Bounding Box) einschließlich des Umgebungssummensatzes; SHA-256-Prüfsummen.
- `bilder/<stadt-id>.png` – Startansicht mit **512 × 1024 Pixeln**, LOD `fern`, ISO-Kamera (Zoom 60), Einkaufszentrum als Fokus, Schattenkarte 2048. Dieselbe Darstellung wird bei der Prüfung neu gerendert.

Die Stadt-ID ist der kleingeschriebene, ASCII-kompatible Stadtname (`duesseldorf`, `muenster`, `koeln`, `essen`). Die Reihenfolge der Datensätze und die Geometrie-Bounding-Boxen sind deterministisch; Koordinaten werden auf Zentimeter gerundet.

## Lokale Prüfung

Vom Repository-Stamm:

```bash
cd render
npm ci
npx playwright install chromium
node pruef-fingerabdruck.js                  # Standard: alle 112, keine Referenzänderung
node pruef-fingerabdruck.js --pruefen essen  # einzelne Stadt prüfen
node tests/fingerabdruck-smoke.cjs            # reine Node-Prüfung
```

**Die erste Erzeugung der Referenzen aus dem unveränderten Stand der Stadtbauer von `main` ist ein bewusst freizugebender Arbeitsschritt:**

```bash
cd render
node pruef-fingerabdruck.js --neu --alle
git add fingerabdruck/*.json fingerabdruck/bilder/*.png
node pruef-fingerabdruck.js
node pruef-fingerabdruck.js --gegenprobe essen
```

Die beiden letzten Befehle müssen grün enden. Die Gegenprobe injiziert ausschließlich beim Aufruf eines Hausbauers in Essen eine zusätzliche Geometrie: **Essen wird erwartungsgemäß rot**, eine unveränderte Kontrollstadt **bleibt grün**. Der Modus verändert keine gespeicherten Referenzen und ist kein Ersatz für die reguläre Prüfung.

Ein späteres, absichtliches Neusetzen ist **nur explizit mit den betroffenen Stadt-IDs** zulässig:

```bash
node pruef-fingerabdruck.js --neu essen bochum
node pruef-fingerabdruck.js
```

Kein implizites Erzeugen oder Aktualisieren in `--pruefen`. Fehlende, beschädigte oder veraltete Referenzen lassen die Prüfung mit Exit-Code 1 scheitern. Abweichungen werden getrennt als Stadtplan, Geometrie (mit bis zu vier betroffenen Parzellen) und Bild gemeldet.

## Bildtoleranz und Zeitbudget

Ein Pixel zählt als verändert, wenn mindestens ein RGB-Kanal um **mehr als 18** abweicht. Der Bildvergleich erlaubt höchstens **2,0 %** veränderte Pixel bei einem durchschnittlichen Kanalfehler von höchstens **1,5**. Bilder unterschiedlicher Größe sind immer fehlerhaft. Das Bild selbst wird **nicht** als exakter PNG-Bytevergleich geprüft; die referenzierte PNG-Datei wird durch SHA-256 gegen die JSON-Datei abgesichert.

Die Prüfung arbeitet in Gruppen von fünf Städten mit höchstens zwei parallelen Chromium-Prozessen. Der vollständige lokale Prüflauf muss unter **300 Sekunden** bleiben; sonst ist der Exit-Code 1. Für lokale Umgebungen ohne vorinstallierten Playwright-Browser `CHROMIUM_PATH` setzen.

## Merge-Gate und CI-Sperre

Der Workflow `.github/workflows/quality.yml` enthält den Job **Stadt-Fingerabdruck (112 Städte)**. Solange GitHub Actions keine Jobs starten kann, übernimmt Claude die **lokale** Ausführung und dokumentiert Laufzeit und Resultate im Pull Request. **Ohne sämtliche 112 JSON- und PNG-Referenzen, grünen Prüflauf und erfolgreiche Gegenprobe ist Q03 nicht mergefähig.** Der erste Referenzlauf erfolgt vor dem Merge und die erzeugten Dateien werden im selben Q03-Branch eingecheckt.

Jeder folgende PR muss bei einer Stadtänderung alle betroffenen Stadt-IDs und den konkreten Änderungsgrund nennen. Nur diese Referenzen werden mit `--neu <stadt-id …>` bewusst erneuert. Ohne Nennung ist der Merge untersagt.
