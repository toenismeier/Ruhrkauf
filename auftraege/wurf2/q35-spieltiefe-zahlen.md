# Q35: Zahlen, Widersprüche und Spieltiefe nach Wurf 3 (Claude-Chat)

Branch `feat/q35-spieltiefe`. Befunde `testflight/wurf-3/BEFUNDE.md` 10, 11, 14 (Zahlen), 16–20 (Werte). Grundsatz: Jede Seite zeigt einen echten Befund oder eine Entscheidung; nichts steht überall auf 99 % oder 100 %.

## Umfang
1. **Verläufe mit Vorgeschichte:** Produktentwicklung (Eigenmarke gegen Fremdmarke) und alle 5-Wochen-Diagramme nutzen die Vorjahres-/Vorlaufhistorie (Q07), keine Nulllinie bis KW 40.
2. **Widersprüche:** „Alle Etagen belegt“ gegen „79 % belegt“; Plätze je Etage gegen FTE je Abteilung (Controlling 71/89 Plätze, 195/434 FTE); Hausbesuch „2 Beschäftigte · 20,5 FTE“ (sichtbare Figuren gegen FTE erklären oder angleichen). Je Paar eine Quelle, Test, dass Anzeige und Engine übereinstimmen.
3. **Personaleinsatz lebt:** Besetzung, Krankenstand, Aushilfen je Haus und Woche streuen (Saison, Größe, Region, Zufall mit festem Seed); Engpässe kommen vor und erzeugen Befunde/Posteingang. Kein Haus dauerhaft überall 99 %.
4. **Haus-Fläche/Kosten:** Startzustand je Haus unterschiedlich (Services je Format und Größe, Budgets mit Abweichungen); Befundzeile der Filialleitung nennt die größte Abweichung.
5. **Freigaben-Stau:** 200 offene Orders/496,5 Mio. € in KW 41 sind kein Spiel. Orders unterhalb der Freigabegrenze laufen automatisch; Grenze am Start so, dass je Woche etwa 5–15 Freigaben bleiben; Orders bündeln je Bereich.
6. **Cockpit:** „EBITDA 13 Wo.“ und „Umsatz“ zeigen ab Woche 1 Werte (aus Vorlauf), nicht „noch offen“.

## Regeln
Engine-Änderungen nur mit Messung: `engine/scripts/m7-wochenverlauf.ts` vor/nach, Abweichungen der GuV begründen (Ziel: Filial-GuV und Bot-T-Ergebnisse aus E26 bleiben im Rahmen). Keine Oberflächen-Umgestaltung (macht Q32), nur Werte und Texte der Befunde. Vorher/Nachher-Bilder der betroffenen Panels selbst ansehen.

## Abnahme
`npm test` engine + render, `spiel-render.js --nur-panels` 0 Abweichungen, Wochenverlauf-Vergleich im PR, CI von Hand, selbst mergen, STATUS.
