# Hartwig auf dem iPhone testen

## 1. Entwicklungsstand bauen
Auf dem Rechner mit Node.js 20 oder neuer (Linux, WSL oder macOS) im Repository:

```bash
cd engine && npm ci && npm run typecheck && npm test -- --runInBand
cd ../render && npm ci && npm run build
```

Der Build erzeugt `render/spiel-bundle.js`. Die Engine wird direkt eingebuendelt; ein API-Server ist nicht erforderlich.

## 2. Im selben WLAN auf dem iPhone öffnen

Im Ordner `render` den Prototyp bauen und fuer das private WLAN bereitstellen:

```bash
npm run iphone
```

Der Startbefehl zeigt die erkannten lokalen IP-Adressen und die zugehoerigen URLs an.
Auf dem iPhone im selben WLAN in Safari **http://RECHNER-IP:4173/spiel.html** öffnen.
Im Windows-Firewall-Dialog ggf. das *private Netzwerk* erlauben. Server nur in einem vertrauenswürdigen WLAN verwenden.
Bei WSL2 mit NAT kann die angezeigte WSL-Adresse vom iPhone aus unerreichbar sein. Dann den Server ueber Node unter Windows oder WSL im Mirrored-Network-Modus starten.

Das Spiel ist sofort im mobilen Browser testbar. Eine signierte iOS-App oder ein App-Store-Release entsteht dabei noch nicht.

## 3. Vier Spielstände und Performance

Hartwig speichert ausschließlich lokal im Browser mit **IndexedDB**. Es gibt **Autospeichern** und **drei benannte Speicherplätze**. Im Menü **Spielstände** können die Plätze beschrieben, geladen, exportiert, importiert oder gelöscht werden. Beim Start werden alle vier Plätze mit Datum, gespielter Woche, Szenario, Liquidität und einer JPEG-Vorschau angezeigt. **Fortsetzen** lädt weiterhin den letzten Autosave.

- Nach Entscheidungen, Ortswechseln und jeder Woche wird automatisch gespeichert; beim Verlassen der App wird zusätzlich ein Speichervorgang angestoßen.
- Im Menü **Spielstände** einen der Plätze 1 bis 3 benennen und mit **Speichern** eine Momentaufnahme anlegen. Laden ersetzt die aktuell laufende Partie im Browser; die anderen Plätze bleiben unberührt.
- Unter **Export** wird eine gzip-komprimierte Datei mit der Endung **`.hartwig`** heruntergeladen. Sie enthält den vollständigen Spielstand samt Metadaten, also vertraulich behandeln.
- Für einen Gerätewechsel die Datei per AirDrop, Dateien-App oder einem eigenen sicheren Transferweg aufs andere iPhone bringen. Dort Hartwig öffnen, bei einem freien Platz **Import** wählen, die `.hartwig`-Datei auswählen und anschließend **Laden**. Beim Import auf einen belegten Platz ist die Überschreibung zu bestätigen. Vor dem Wechsel empfiehlt sich ein Export als Sicherung.
- Bei knappem Gerätespeicher meldet Hartwig einen Speicherfehler und fordert zum Export beziehungsweise Freigeben von Speicherplatz auf. Keine Speicherdateien löschen, bevor sie gesichert wurden.
- Safari-Websitedaten zu löschen kann **sämtliche lokalen Spielstände** entfernen. Zwischen verschiedenen Origins (HTTP, HTTPS, anderer Hostname) werden Spielstände nicht automatisch übertragen.

Im Menü **Performance** den 90-Frame-Test ausführen. Ein realistischer iPhone-Test umfasst 52 Wochen, Einkaufs-/HQ-/Marketing-Aktionen, manuelles Speichern, App schließen und wieder öffnen, Fortsetzen und weitere 52 Wochen. Ruckler beim Zoomen, Temperatur, Speichern nach dem App-Wechsel und Wechsel zwischen Städten dokumentieren.

## 4. Installation auf dem iPhone und Offline-Modus

1. Hartwig in **Safari** über eine **HTTPS-Adresse** öffnen.
2. In Safari **Teilen → Zum Home-Bildschirm** auswählen. Die installierte Web-App zeigt das Hartwig-App-Symbol und startet im Hochformat ohne Safari-Adressleiste.
3. Solange das Gerät online ist, die Web-App **einmal vollständig laden**, damit der Service Worker Spieloberfläche, Bundle, Manifest, Symbole und Stylesheet vorhält.
4. Anschließend Flugmodus aktivieren und die installierte App erneut starten: Das Spiel sollte offline öffnen und vorhandene IndexedDB-Spielstände laden. Die PWA besitzt keinen externen API-Server.

Bei einer neuen veröffentlichten Version erscheint nach der Service-Worker-Aktualisierung der Hinweis **„Neue Version verfügbar“ → „Neu laden“**. Hartwig speichert die aktuelle Partie vor dem Versionswechsel. Die bestehenden lokalen Spielstände bleiben erhalten. Falls kein Hinweis erscheint, die App bei bestehender Verbindung neu öffnen. Die Service-Worker-Cache-Version in `render/sw.js` bei Änderungen der Offline-Shell erhöhen.

**Wichtig:** Service Worker funktionieren unter **HTTPS** oder lokal auf `localhost` beziehungsweise `127.0.0.1`. Die HTTP-LAN-Vorschau aus Abschnitt 2 ist zum Spielen geeignet, auf dem iPhone aber **nicht** für einen zuverlässigen Offline-Test. Für einen externen Test wird ein geschützter HTTPS-Host benötigt; das private Repository wird nicht automatisch öffentlich bereitgestellt. Auf echten iPhones müssen Standalone-Modus, Startbilder, Safe Areas, Download-/Dateiauswahl und verfügbarer Gerätespeicher zusätzlich manuell überprüft werden.

## 5. Automatisierte Qualitätssicherung

GitHub Actions `.github/workflows/quality.yml` führt Typecheck, Engine-Tests, Browser-Build und mobilen Chromium-Smoke-Test aus. Der Chromium-Test ist nicht mit einem echten iPhone-Safari-Test gleichzusetzen. Browser-Screenshots werden als CI-Artefakte bereitgestellt.

```bash
cd render
npm test                    # Startbildschirm + Spielstart im mobilen Chromium
npm run smoke:panels        # erweitertes UI-Szenario
npm run smoke:karte         # Gesten und Zoom
```

Die N11-App-Prüfung ist in `npm test` enthalten und kann separat mit `npm run smoke:app` gestartet werden. Sie prüft Manifest und PNG-Icons, vier IndexedDB-Plätze mit JPEG-Vorschau, identischen Spielzustand nach Laden, gzip-Export und -Import sowie einen echten Offline-Neustart nach Service-Worker-Installation. Der Test schreibt einen Screenshot nach `bilder/nice/app/offline.png`.

Für die App-Bilder erzeugt `npm run symbol` die Icons (`render/app-icon-180.png`, `render/app-icon-512.png`) und Startbilder unter `render/startbilder/` aus dem bestehenden isometrischen Hartwig-Kit. `npm run build` erzeugt fehlende oder veraltete App-Grafiken automatisch.

Für eine ergänzende Lighthouse-Installierbarkeitsprüfung nach dem Build den lokalen Server mit `node dev-server.js` starten, die localhost-Seite in Chromium öffnen und in DevTools/Lighthouse prüfen, ob ein korrektes Web-App-Manifest, ein 512er PNG-Icon, ein Service Worker und eine offline ladbare Startseite vorhanden sind. Ein automatisierter Chromium-Smoke-Test ersetzt nicht die Prüfung mit einem echten iPhone.

Der lokale Browser-Test verwendet Playwright-Chromium; bei Bedarf `npx playwright install chromium`. `CHROMIUM_PATH` kann auf eine eigene ausführbare Chromium-Datei zeigen.

## Noch keine native App

Der aktuelle Meilenstein ist ein mobil spielbarer Web-Prototyp mit persistierten Spielständen und messbarer Rendering-Leistung. Ein späterer nativer iOS-Wrapper erfordert zusätzlich macOS, Xcode, Signierung und Gerätevalidierung. Diese Schritte sind in diesem Commit bewusst nicht als erledigt gekennzeichnet.
