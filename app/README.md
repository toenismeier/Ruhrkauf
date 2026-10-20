# Hartwig als iOS-App (TestFlight)

Expo-Hülle mit WebView. Das Spiel aus `render/` wird in eine einzige Datei `spiel/spiel.html` gepackt und offline mitgeliefert. Spielstände liegen in IndexedDB am festen Ursprung `https://spiel.hartwig.app/`.

## Neuen Spielstand einpacken (vor jedem Build-Zug)
```
cd render && npm ci && npm run build
cd ../app && npm ci && npm run spiel && npm run typecheck && npm run smoke
```

## Automatische Auslieferung (EAS Workflows, `.eas/workflows/ausliefern.yml`)
Jeder Push auf `main` löst auf den Expo-Servern aus: Hülle unverändert → Update (App holt es beim Start), Hülle geändert → neuer Build und Übermittlung an TestFlight. Voraussetzung: GitHub-Repo im Expo-Projekt verbunden, Basisverzeichnis `app`.

## Build und Upload nach TestFlight von Hand (EAS, kein Mac nötig)
```
cd app && npx eas-cli@latest build --platform ios --profile production --auto-submit
```
Beim ersten Lauf fragt EAS nach Expo-Login, Apple-Login mit Zwei-Faktor, legt Zertifikat, Profil und die App in App Store Connect an und schreibt die Projekt-ID in `app.json` (danach committen).

## Regeln
- Engine und Grafik-Kit greifen nicht direkt aufs DOM zu (späterer Umstieg auf React Native mit nativem three).
- `.easignore` im Repo-Wurzelordner sorgt dafür, dass EAS nur `app/` hochlädt.
