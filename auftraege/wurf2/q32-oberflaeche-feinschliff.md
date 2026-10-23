# Q32: Oberfläche Feinschliff nach Wurf 3 (Claude-Chat)

Branch `feat/q32-feinschliff`. Grundlage: `testflight/wurf-3/BEFUNDE.md` (Bilder 01–20, Ummo 23.10.2026 bestätigt), Punkte 1–6, 12–15 (Darstellung), 16/17/18 (Doppelungen, Links), 20 (Platz), 23. Regeln aus `q30-oberflaeche-spiel.md` (Gegen den KI-Look) und `coffee-muster.md` gelten weiter.

## Umfang
1. **Seitlicher Überlauf (Ursache finden, nicht je Panel flicken):** Produktentwicklung, CDO einstellen, Freigaben. Karussell/Blatt dürfen nie breiter als der Bildschirm sein. Neue Prüfung in `spiel-render.js --nur-panels`: `scrollWidth > clientWidth` je Panel und Karussellkarte = Fehler.
2. **Lesbarkeit:** Kategorie- und Artikelnamen in „Neues Produkt“ (weiß auf hell), Unterzeilen ohne Namen. Prüfung Kontrast WCAG AA für jeden sichtbaren Text ins Prüfskript.
3. **Rest-Altlook:** Zentrale-Abteilungsseiten (Controlling u. a., `zentrale-abteilungen.js`), Hausbesuch-Kopf, helle Kacheln im Produktassistenten auf den dunklen Look. Stilprüfung so erweitern, dass helle Flächen > 20 % im dunklen Blatt auffallen.
4. **Farbrollen:** Rot nur noch für Gefahr/Verlust und Kündigen; Hauptaktion und Bedienelemente (Stepper, aktiver Reiter) in einer eigenen Hartwig-Akzentfarbe. Kosten nie grün; Abweichungen grün/rot nach Wirkung aufs Ergebnis.
5. **Texte:** keine internen Kürzel (Q05 usw.) im Spiel (Prüfung: Muster `\bQ\d{2}\b`, `hc-`, `undefined`), Gebäudename einheitlich, keine doppelten Titel (Raum Berlin, Hausbesuch), Dezimalkomma überall (`20.5` → `20,5`), keine verwaisten unterstrichenen Links, Hinweise nicht unter der Reiterleiste.
6. **CDO/Karussell:** Angebot gehört immer zur sichtbaren Karte.
7. **Stadt-HUD:** Kennzahlenkacheln dürfen höchstens ein Sechstel der Höhe belegen (z. B. einklappbar auf eine Zeile, Antippen öffnet); Chipleiste unten ohne abgeschnittene Chips (Ausblendverlauf oder volle Chips).
8. **Teamstimmen/Avatare:** keine Platzhalter-Personensymbole oder Initialen; Figuren aus dem Kit wie in Personal/Vorstand.

## Abnahme
Vorher/Nachher aller betroffenen Panels bei 390 × 844 selbst ansehen; Bildprüfung mit 7 Fragen; `cd render && npm test`, `node spiel-render.js --nur-panels` (0 Abweichungen, 0 Stil-, Überlauf-, Kontrastverstöße), App-Paket nicht anfassen (packt Claude-Workstream). CI von Hand, selbst mergen, `auftraege/STATUS.md` nachziehen. Keine Engine-Änderung.
