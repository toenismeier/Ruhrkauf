# FUNDUS – Grafik-Auftrag: Arbeits- und Abnahmestand

Stand: 19.10.2026 · Branch: `feat/grafik-outlet` · Basis: `main`

## Implementiert
- `render/haeuser-outlet.json`: 20 Filialen (O001–O020), 14 Außenring / 6 Innenstadt, 20 Städte mit NRW-Schwerpunkt.
- `render/src/kit/outlet.js`: drei Bauformen, weinrote eigene Marke und Claim, durchscheinende Schaufenster, Innenplatzhalter mit Größen- und Warenabteilungen sowie Kassen-/Wagenzone, Zustandsdekoration und Neueröffnungs-Schlange.
- `render/src/kit/outlet-standorte.js`: Platzierung eigener `slot:outlet`-Parzellen in Gewerbeblöcken von `plan.aussen`.
- Additive Anbindung in `bauer.js`, `bruecke.js`, `stadtplan.js`, `stadt.js` und `staedte.js`; Engine und `basis.js` unangetastet.
- Kataloge: `outlets`, `outlet-lagen`, `outlet-vergleich`; alle 20 im Hauskatalog ergänzt.
- Regeln in `render/GESTALTUNG.md` und zusätzliche Kennzahlen im bestehenden Gestaltungsprüfskript; dedizierte Prüfung `node pruef-outlet.js`.

## Verifiziert (statisch, ohne Checkout)
- Syntaxprüfung der neu angelegten Grafik-, Katalog- und Prüfmodule über JavaScript-Parser bestanden.
- JSON valide, 20 einzigartige Städte und IDs, 14 rand + 6 b, Baujahre 1998–2016, Substanz 40–84.
- Keine Innenstadtfiliale überschreitet 80 % der größten Hartwig-Grundfläche ihrer Stadt.
- `main...feat/grafik-outlet`: am 19.10. keine Commits hinter `main`.


## GitHub Actions (Draft-PR #11)
- Run: https://github.com/toenismeier/Ruhrkauf/actions/runs/39266640123
- Ergebnis: zwei Jobs (`Mobiler Browser-Smoketest`, `Engine und TypeScript`) mit `failure` nach rund 3–4 Sekunden; weder Runnername noch ausgeführte Steps vorhanden. Job-Logs über die GitHub-API nicht verfügbar.
- **Kein valides Build- oder Testergebnis.** Den Run nicht als bestandene Prüfung interpretieren; Ursache (Runner/Billing/Actions) außerhalb dieser Sitzung klären und lokale Tests ausführen.

## Abnahme offen – vor Merge zwingend
1. Lokal im Repo: `cd render && npm ci && npm run build && node spiel-render.js && node pruef-outlet.js && node pruef-staedte.js`.
2. Gestaltung in allen 112 Städten: `cd render && node pruef-gestaltung.js "$(node -p "require('./haeuser.json').map(h=>h.stadt).filter((v,i,a)=>a.indexOf(v)===i).join(',')")"` (alternativ je Stadt/Prüfbatch). Bestehende Gestaltungsgrenzwerte müssen weiterhin 0 Verstöße erreichen.
3. Kataloge rendern und **visuell prüfen**, besonders transparente Fronten/Lesbarkeit, Familienvariation, Format-Abgrenzung und Teilebudget:
   `node render-katalog.js outlets`
   `node render-katalog.js outlet-lagen`
   `node render-katalog.js outlet-vergleich`
   `node render-katalog.js alle-haeuser`.
   Ergebnisse nach `bilder/` übernehmen. Mindestens drei visuelle Korrekturdurchläufe nach Renderbefund.
4. Fern-LOD (`setzeLod('fern')`) und 3.000-Teile-Limit anhand real gebauter Geometrie messen.
5. `cd engine && npm ci && npm run typecheck && npx jest`; GitHub-CI grün bestätigen.

**Wichtig:** Browser-Renderings, PNG-Dateien, vollständige Runtime-Tests und CI-Grünstatus sind in dieser Sitzung **nicht** nachgewiesen. Deshalb weder Merge noch Abnahmefreigabe. Nach Merge der Schwesterkette Branch gegen `main` abgleichen, bei Konflikten Änderungen in gemeinsamen Dateien ausschließlich ergänzend zusammenführen.
