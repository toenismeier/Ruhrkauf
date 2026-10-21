# Premiumhäuser – Arbeits- und Abnahmestand

Stand: 19.10.2026 · Branch: `feat/grafik-premium`

## Implementiert und nach GitHub übertragen

- Vier umgewidmete Premiumhäuser mit stabilen Haus-IDs (Seed-1-Snapshot): P001/W003 Berlin, P002/W009 München, P003/W006 Hamburg, P004/W016 Düsseldorf. Es bleiben 180 Häuser im Snapshot.
- Premium-Engine: Nachfrage, Sortimentsgewichtung, Konzession, Beratungskosten, Image, globaler Rabatt-Schutz, 26-wöchige Investition sowie Einzelverkauf in der Insolvenz mit Investor und Marktwert.
- Premium-Oberfläche: Hausdetail, Schutz, Investition, Verkaufsangebot; Kronenmarker auf der Karte.
- Grafik: vier eigenständige Fassaden, begehbarer/offener Lichthof im Modell (vier Flügel und Dachring), gläserne Dachfläche, Innenräume, Verkaufsschild mit Investorennamen und Eigentümerbeschriftung.
- Kataloge: `premium`, `premium-etagen`, `premium-stadt`; Geometrieprüfung im Skript `render/pruef-premium.js` für 12 Regelzustände plus zwei Verkaufsvarianten.
- Tests und Abnahmeskripte sind eingecheckt, aber **noch nicht erfolgreich ausgeführt**.

## Verifiziert (ohne Simulation)

- GitHub-Ref-Prüfung: Branch vorhanden, vor den letzten Commits fünf eigene Commits und nicht hinter `main`.
- JSON-Struktur gelesen: `render/haeuser.json` enthält 180 Häuser mit den vier oben genannten eindeutigen Premiumkennzeichnungen.
- GitHub-Commits für Geometrie und Investitionsschutz erstellt.

## Blockierte/offene Prüfungen

- Lokaler Checkout per `git ls-remote https://github.com/toenismeier/Ruhrkauf.git HEAD`: fehlgeschlagen (DNS: `Could not resolve host: github.com`). Daher keine vollständigen `npm ci`-Läufe in diesem Arbeitskontext möglich.
- **Noch nicht gelaufen:** `cd engine && npm ci && npm run typecheck && npm test && npm run check:premium`; zusätzlich Seeds 1–3, Bot C je 260 Wochen.
- **Noch nicht gelaufen:** `cd engine && npm run export:haeuser`, danach `cd render && npm ci && npm run build && node spiel-render.js && node pruef-staedte.js && node pruef-gestaltung.js && node pruef-premium.js`; Renderkataloge und Sichtprüfung in drei Runden fehlen.
- EBITDA-Margenziele von 11/11/9/6 %, Umsatzabweichung höchstens ±1,5 %, Marktwertanker etwa 3 Mrd. € sind **nicht empirisch abgenommen**.
- Nach Merge der Schwesterkette auf aktuellen `main` rebasen, Konflikte in gemeinsamen Renderer-Dateien lösen und alle lokalen Abnahmen wiederholen.
- **Kein Merge**, solange diese Punkte offen sind.


## Nachbesserung vom 20.10.2026 – Umsetzung, noch nicht abgenommen

- Rebase des Branches gegen `main` umgesetzt, gemeinsamer Code von Volkskauf/Wettbewerber und Premium aus beiden Seiten übernommen (Rebase-Commit `4cab111`).
- Engine: Rangproduktivität auf 1,98 / 1,67 / 1,42, Bot-C-Schließungsauswahl schließt Premium aus; Regressionstest und ausführlichere Kalibrierung ergänzt.
- Grafik: individuelle Dach-/Turmsilhouetten erweitert, Fensterrelief und Werksteinstruktur detailliert, Messingschrift größer, Fahnen und Auslagen überarbeitet. Umbau hat Kran/Plane/Zaun; Verkaufsprozess Investorenschild, eingeholte Fahnen und weniger Passanten. Neue Zustandskatalogdatei `premium-zustaende.js`, Geometrie-Soll 4.000–9.000 Teile.
- Noch **nicht ausgeführt**: `npm ci`, Engine-Typecheck/Jest, 52-Wochen-Umsatz- und Margenmessung, Bot-C-Verläufe, Render-Build, Spiel-Render, Stadt-/Gestaltungsprüfungen, Katalog-Rendering (drei Durchläufe), Bild-Sichtprüfung. Ursache: lokaler Container erreicht den privaten GitHub-Checkout nicht (`Could not resolve host: github.com`), GitHub-Actions laut Auftrag ohne Kontingent. Die alten Testergebnisse aus dem Auftrag dürfen nicht als aktuelle Abnahme ausgegeben werden.
- **Kein Merge nach `main`**, bevor Abnahme und korrigierende Iteration anhand konkreter Zahlen und Bilder vollständig grün sind.


## Fortschreibung 20.10.2026 – Rebase und Abschnitt 5

**Repository-Abgleich:** `feat/grafik-premium` basiert wieder auf `main` (Basis `105beffbb`); laut GitHub-Vergleich 0 Commits zurück, 16 voraus. Die fünf älteren Premium-Commits wurden als inhaltliche Übernahme auf `main` neu aufgebaut; dabei wurden 28 Premium-eigene Dateien übernommen und neun gemeinsam geänderte Renderer-Dateien konfliktbewusst mit FUNDUS, Volkskauf und Ladenbau zusammengeführt. `main` blieb unverändert, PR #12 bleibt Draft.

**Engine zuerst:**
- Flächenproduktivität Ränge 1 / 2 / 3: **2,20 / 1,84 / 1,57**, zuvor 1,98 / 1,67 / 1,42.
- Zusätzliche Servicequote: P001/P002 **4,5 %**, P003 **4,3 %**, P004 **3,0 %** des Hausumsatzes; bisher 6,0 / 5,8 / 4,5 %. Konzessions- und Personalbestand sowie die Testtoleranzen blieben unverändert.
- `premiumAngebote` nutzt eigenständige deterministische IDs statt des globalen `neueId`-Zählers; dazu Regressionstest auf unberührten `rng` und `zaehler` für drei Seeds. Hier wird **keine** Änderung am Votum der Gläubiger vorgenommen: das Votum stützt sich weiterhin auf Planung, Quote, Finanzierbarkeit und Stakeholderwerte.
- `engine/scripts/premium-kalibrierung.ts` dokumentiert künftig je Seed den A/B-Konzernumsatz, die Hausumsätze und Margen vor/nach Premium-Umwidmung, W12-Konzern-EBITDA/BR, die Planentscheidung und die Bot-C-Laufzeit. Grenzwerte unverändert: 11 / 11 / 9 / 6 % ±2 PP; Jahresumsatz ±1,5 %; Bot C 260 Wochen.

**Grafische Restpunkte aus Abschnitt 5:** P001 besitzt zusätzlich vier beflaggte Traufmasten mit dunklem Tuch und Messing-Signet (im Verkaufsprozess vollständig entfernt). P003 hat jetzt eine grüne Kuppel mit größerem Radius auf der sichtbaren Gebäudeecke, die konstruktiv mindestens 8 m über die Traufe ragt. Karten-/Slot-Verzweigungen nach dem Rebase auch für Premium kontrolliert, ohne FUNDUS zu verdrängen.

**Abnahme ausdrücklich offen:** In dieser Laufzeit scheitert `git ls-remote` bereits am DNS (`Could not resolve host: github.com`); ein vollständiger privater Repo-Checkout, die `npm ci`-Prüfungen, Jest, Typecheck, `check:premium`, Bot C und Grafik-Rendering waren daher **nicht ausführbar**. Die im Auftrag erwähnten vier roten Jest-Tests sind Vorbefund, keine Neu-Messung. Der hier vorgenommene Parameterabgleich ist **kein nachgewiesener grüner Testlauf**. Nächster Schritt mit lokalem Checkout:

```bash
cd engine
npm ci && npm run typecheck && npx jest --runInBand && npm run check:premium
for seed in 1 2 3; do npx tsx scripts/bot.ts "$seed" 260 --tief; done
npx tsx scripts/kalibrierung.ts 1
npm run export:haeuser
cd ../render
npm ci && npm run build && node spiel-render.js && node pruef-staedte.js && node pruef-gestaltung.js && node pruef-premium.js
for runde in 1 2 3; do
  for katalog in premium premium-zustaende premium-etagen premium-stadt; do
    node render-katalog.js "$katalog"
  done
done
```

**Kein Merge** nach `main`, bis die tatsächlichen Margen, das Konzernumsatzdelta, Bot C, Render-/Gestaltungsprüfungen und die Bildkontrolle grün sind. Grafikexport `render/haeuser.json` ist nach Engine-Neukalibrierung frisch zu erzeugen.
