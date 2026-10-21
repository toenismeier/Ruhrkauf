# N14 · Testwerkzeuge (intern)

Dieses Panel ist **kein regulärer Bestandteil der Spieloberfläche**. Es erscheint nur nach fünf schnellen Tipps auf das Datum in der Kopfleiste (innerhalb von 1,8 Sekunden) oder mit dem URL-Parameter `?werkzeuge=1`. Die Menükachel „Testwerkzeuge“ wird erst danach angezeigt. Solange N13 nicht in `main` liegt, steuert `WERKZEUGE_AKTIV` oben in `src/ui/werkzeuge.js` das Feature.

## Bedienung

- Im Panel 1, 4, 13 oder 52 Wochen mit oder ohne Bot C vorspulen. Der Fortschritt wird live angezeigt; bei Spielende wird vorzeitig abgebrochen.
- Cash, Stakeholder und Schwierigkeit verändern oder ein Insolvenzverfahren und die aufgelisteten Angebote/Konkurrenzereignisse auslösen.
- FPS (aktives Rendern, gleitendes Zweitseundenfenster), Szenenteile, letzte Engine-Wochenlaufzeit und, soweit der Browser den Wert bereitstellt, JS-Heap kontrollieren.
- **Bericht kopieren**: kompletter Spielstand, Seed, Woche, Version, User-Agent sowie die letzten 20 Konsolenfehler als `RUHRKAUF-TEST-1:gzip:<Base64>`. Es gibt keine automatische Übertragung. Bei verweigerter Clipboard-Berechtigung steht der vollständige Text im Eingabefeld zur manuellen Kopie.
- **Bericht laden**: den gesamten Text einfügen. Vor dem Ersetzen werden Format und Spielstand geprüft. Anschließend ist dieselbe Simulationswoche mit identischem Cash wiederhergestellt.

Jede gültige Testaktion setzt `spiel.testGenutzt = true`. Teststände werden in der Kopfleiste, auch bei Zerschlagung, als **Testspiel** gekennzeichnet und dürfen nicht mit regulären Ergebnissen verglichen werden. Das Panel verwendet ausschließlich getrennte `test*`-Aktionen über `fuehreAus`. In einem regulären Spiel wird dieser Pfad nie aktiviert.

## Abnahme

```bash
cd engine
npm ci
npm run typecheck
npx jest
npx tsx scripts/kalibrierung.ts 1
npx tsx scripts/bot.ts 1 260 --tief
npx tsx scripts/bot.ts 2 260 --tief
npx tsx scripts/bot.ts 3 260 --tief

cd ../render
npm ci
npm run build
npm run smoke:werkzeuge
node spiel-render.js
```

`smoke:werkzeuge` testet die versteckte Menükachel, fünf Datumstipps, 13 Bot-C-Wochen, das Testspiel-Kennzeichen, Konsolenfehler und den roten Fehlerpunkt, die gzip-Roundtrip-Dekodierung, einen neuen Spielstart mit anschließendem Laden des Berichts sowie die URL-Freischaltung. Bei verfügbarer Playwright-Chromium-Installation entstehen Screenshots und `pruefung.json` in `bilder/nice/werkzeuge/`.

**Hinweis:** Ein Bericht enthält den vollständigen Spielstand und den User-Agent des Geräts. Nur bewusst und an vertrauenswürdige Empfänger weitergeben.
