# O07 Haus – Implementierungsstand (feat/op-haus)

Basis: `main` (Commit `9a893bdb` vom 20.10.2026). O01, O02, O04, O05, O06 und O08 liegen zur Auftragsbearbeitung noch auf getrennten Feature-Branches. **O07 wurde nicht in `main` gemergt.**

## Umsetzung
- `engine/src/haus.ts`: eigene Hausbetriebszustände mit vier Hausleitungsstärken, Ehrlichkeit, Stimmung, Fluktuationsneigung, Stellvertretung, Vergütung, Kandidaten, Coaching, Beförderungs-Vormerkung, Jahresgesprächen, zentralen Clusterstandards, Einzelhaus-Ausnahmen, Services, Betriebskosten, Konzessionen, Gastronomie und Stadtumfeld. Initialisierung ohne zusätzlichen Zug aus dem Hauptzufallsstrom; neue Stadtereignisse erst nach 52 Wochen.
- Engine: neue Aktionen in `aktionen.ts`, Abfragen in `abfragen.ts`, API in `index.ts`, Wochenintegration in `engine.ts`, Nachfrage in `wirtschaft.ts`, Entscheidungsvorlagen in `ereignisse.ts`, neue Mieter in `daten.ts`.
- Wochenkommentare: Abweichung unter −5 % gegenüber Vorjahr oder O06-Wochenplan, echter Treiber soweit durch Personal-/Ereignisdaten erkennbar, Ausreden bei unehrlicher Leitung, Controllingprüfung, automatisierte kurzfristige Maßnahmen abhängig von der Clusterleitungsqualität.
- Kundenscore aus Standards, Personalbesetzung, Sicherheit/Reinigung/Services und Substanz. Energiepreisänderung bis ±20 %, längerfristige städtische Ereignisse, Rolltreppen-/Aufzugsausfall nach Instandhaltungskürzungen und Sonntagsverkauf mit Antragslogik.
- `render/src/ui/haus.js`: Haussteckbrief mit sieben Reitern; Beobachtungsliste, Wochenkommentare, Kundenscore-Rangliste; integrierte Aktionen. `render/spiel-render.js --nur-haus` prüft die sieben Reiter und erzeugt Screenshots und `out/haus-o07-pruefung.json`.

## Reproduzierbare Abnahme
Aus `engine/`:
```sh
npm ci
npm run typecheck
npm test -- --runInBand
npm run check:haus
npm run check:haus:560
```

Aus `render/`:
```sh
npm ci
npm run build
npm run smoke:haus
```

**Prüfstatus:** Die JavaScript-Dateien `render/src/spiel.js`, `render/src/ui/haus.js` und `render/spiel-render.js` wurden syntaktisch mit dem Parser geprüft. TypeScript-Typprüfung, Jest-Läufe, Playwright-Render-Tests sowie zeitliche und finanzielle A/B-Messung konnten in der Ausführungsumgebung nicht gestartet werden; diese Prüfungen sind ausdrücklich **offen**, die Kommandos und Tests liegen bereit.

## Integration nach Merge der operativen Basis
1. **O01:** `h.hauscluster`, `s.organisation.flagships` und Qualität der Clusterleitung werden optional gelesen. Beförderungen sind auf O07 als Kandidatur vorgemerkt; die O01-Stellenbesetzung muss nach gemeinsamer Integration über `organisationBefoerdern` verbunden werden.
2. **O02:** O07 zeigt vorhandene `h.treiberVerlauf`-Kennzahlen. Die eigene Wochenkommentar-Liste ist nutzbar; die ausdrücklich geforderte zusätzliche Kommentarspalte im **O02-Reporting** muss nach Merge in dessen bestehende UI aufgenommen werden. Der O02-Haupttreiber für Wahrheitsprüfung ist über O02-Treibervergleich noch detaillierter zu ermitteln.
3. **O04/O05:** Personalstärke und Sicherheitskürzung sind als Faktoren bzw. dokumentierte Inventurdifferenzen vorhanden. Die direkten Schnittstellen zur Personalplanwirkung und O05-Altware-/Bestandsführung müssen nach Merge umgesetzt werden.
4. **O06:** Wochenplanzahlen werden optional aus `s.planung.jahre[].phasing` gelesen; bis dahin gilt der eigene O07-Vorjahresvergleich.
5. **O08:** Energieeinsparung aus LED-/Klimatechnik liest optional die neuen `h.etagenBau`-Technikstufen. Ohne O08-Daten bleibt der Startwert neutral.
6. **Performance:** Der synthetische 560-Häuser-Benchmark nutzt bis zum Merge der Maßstab-Welt 510 Warenhäuser und 50 Sporthäuser; er ist eine Lastprobe, keine vollständige Formatkalibrierung.
