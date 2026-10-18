# Hartwig auf dem iPhone testen

## 1. Entwicklungsstand bauen
Auf dem Rechner mit Node.js 20 oder neuer (Linux, WSL oder macOS) im Repository:

```bash
cd engine && npm ci && npm run typecheck && npm test -- --runInBand
cd ../render && npm ci && npm run build
```

Der Build erzeugt `render/spiel-bundle.js`. Die Engine wird direkt eingebuendelt; ein API-Server ist nicht erforderlich.

## 2. Im selben WLAN auf dem iPhone öffnen

Im Ordner `render` einen HTTP-Server starten:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Die lokale IPv4-Adresse des Rechners ermitteln (`ipconfig` unter Windows, `hostname -I` unter Linux).
Auf dem iPhone im selben WLAN in Safari **http://RECHNER-IP:4173/spiel.html** öffnen.
Im Windows-Firewall-Dialog ggf. das *private Netzwerk* erlauben. Server nur in einem vertrauenswürdigen WLAN verwenden.

Das Spiel ist sofort im mobilen Browser testbar. Eine signierte iOS-App oder ein App-Store-Release entsteht dabei noch nicht.

## 3. Spielstand und Messung

- Im Spiel über **Menü → Speichern** den Spielstand ablegen. Nach einem Neuladen im Startbildschirm **Fortsetzen** wählen. Nach Entscheidungen und jeder Spielwoche wird automatisch gespeichert.
- Im Menü **Performance** öffnen. Der 90-Frame-Test misst auf dem tatsächlich verwendeten iPhone Framerate, 95. Perzentil der Framezeit und Draw Calls.
- Eine Testsequenz durchspielen: neues Spiel starten, 52 Wochen simulieren, Einkauf/HQ/Marketing verändern, speichern, Safari schließen, wieder öffnen, fortsetzen und weitere 52 Wochen simulieren.
- Auf einem echten Gerät insbesondere Ruckler beim Zoomen, Wärmentwicklung, Speichern nach einem App-Wechsel und die Ladezeit einer neuen Stadt kontrollieren.

Der Spielstand liegt ausschließlich im Browser des Geräts (IndexedDB). Das Löschen von Safari-Websitedaten kann ihn entfernen. Der Speicherbereich ist je Origin getrennt, ein Spielstand aus einer anderen URL wird nicht automatisch übernommen.

## 4. Installation auf dem Home-Bildschirm und Offline-Modus

Safari: **Teilen → Zum Home-Bildschirm**. Web-App-Metadaten und Icon sind hinterlegt.
Die Service-Worker-Offline-Funktion erfordert **HTTPS** (oder localhost auf demselben Gerät). Über eine gewöhnliche HTTP-Adresse im WLAN lässt sich der Browser-Prototyp testen, aber kein zuverlässiger Offline-Modus aktivieren.

Da das Repository privat ist, wird **keine öffentliche GitHub-Pages-Seite** eingerichtet. Ein HTTPS-Deployment ist vor einem externen Test separat mit Zugriffsschutz zu konfigurieren.

## 5. Automatisierte Qualitätssicherung

GitHub Actions `.github/workflows/quality.yml` führt Typecheck, Engine-Tests, Browser-Build und mobilen Chromium-Smoke-Test aus. Der Chromium-Test ist nicht mit einem echten iPhone-Safari-Test gleichzusetzen. Browser-Screenshots werden als CI-Artefakte bereitgestellt.

```bash
cd render
npm test                    # Startbildschirm + Spielstart im mobilen Chromium
npm run smoke:panels        # erweitertes UI-Szenario
npm run smoke:karte         # Gesten und Zoom
```

Der lokale Browser-Test verwendet Playwright-Chromium; bei Bedarf `npx playwright install chromium`. `CHROMIUM_PATH` kann auf eine eigene ausführbare Chromium-Datei zeigen.

## Noch keine native App

Der aktuelle Meilenstein ist ein mobil spielbarer Web-Prototyp mit persistierten Spielständen und messbarer Rendering-Leistung. Ein späterer nativer iOS-Wrapper erfordert zusätzlich macOS, Xcode, Signierung und Gerätevalidierung. Diese Schritte sind in diesem Commit bewusst nicht als erledigt gekennzeichnet.
