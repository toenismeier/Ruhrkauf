# Q31: Oberfläche Teil 2 – Management-Panels auf das Gestaltungssystem (Claude-Chat)

Branch `feat/q31-oberflaeche-management`. Hintergrund und Regeln wie `q30-oberflaeche-spiel.md` (Ummo 22.10.2026, per Auswahl: Claude-Chats nach Bereichen).

## Umfang (Zentrale-Fachbereiche)
Einkauf (`einkauf.js`, Ware/WG-Detail), Eigenmarken und Produktentwicklung (`eigenmarken.js`, `produkte.js`, `produkte-q24.js`), Marketing (`marketing.js`, `marketing-q16.js`), IT und IT-Produkte (`it.js`, `it-produkte.js`), E-Commerce (`ecommerce.js`), Planung, Reporting, Vorstand, App/Spielstände (`app.js`).

## Regeln
- Baut auf den gemeinsamen Bausteinen aus Q30 auf (`render/src/ui/komponenten.css`); bis Q30 sie gemergt hat, mit der Bestandsaufnahme und Vorher-Bildern beginnen. `spiel.html`/`spiel.js` nicht ändern, Bedarf an Q30 melden.
- Eigenmarken: Produktbilder kommen aus `render/src/kit/mode/` (Q25, Q27–Q29), nicht anfassen; nur Rahmen, Raster, Hierarchie.
- Sonst wie Q30: keine Engine-Änderung, Vorher/Nachher je Panel bei 390 × 844 selbst ansehen, Zwischenstand an Ummo, `npm test`, `spiel-render.js --nur-panels` 0 Abweichungen, CI von Hand, selbst mergen, STATUS nachziehen.
