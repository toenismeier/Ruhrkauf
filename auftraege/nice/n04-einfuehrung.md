# N04: Einführung mit der Assistentin

## Ziel
Ein neuer Spieler versteht heute nicht, wo er anfangen soll. Coffee Inc 2 führt mit einer Assistentin (Porträt und Schreibmaschinentext) durch die ersten Schritte. Hartwig bekommt dasselbe: die Assistentin des Vorstands.

## Umfang
1. **Modul** `render/src/ui/einfuehrung.js`. Abfolge als Daten (`EINFUEHRUNG = [{ id, text, ziel, warte }]`), keine Logik in den Texten.
2. **Stil:** Bottom-Sheet mit Porträt rechts. Schreibmaschine mit 60 Zeichen je Sekunde; Tippen zeigt den ganzen Text. Wie im Wochenabschluss (`spiel-reise-und-wochenabschluss.md`); dessen Bausteine nutzen, wenn gemergt, sonst eigene und später zusammenlegen.
3. **Hervorhebung:** Das Ziel-Element (Knopf, Pin, Panelreiter) wird über eine Abdunklung mit Loch (`clip-path`) hervorgehoben, dazu ein pulsierender Ring (1,2 s Takt). Der Rest des Bildschirms ist nicht bedienbar, bis der Schritt erfüllt ist.
4. **Schritte** (rund 14):
   1. Begrüßung, Lage: Hartwig ist insolvenzreif.
   2. Karte verschieben und zoomen.
   3. Haus antippen.
   4. Kennzahlen lesen.
   5. Cockpit.
   6. Posteingang.
   7. Einkauf: eine Freigabe.
   8. Marketing: Aktionskalender.
   9. Vorstand.
   10. HQ.
   11. Insolvenzantrag erklären (nicht stellen).
   12. Woche abschließen.
   13. Wochenbericht lesen.
   14. Reise in eine andere Stadt.
   - Jeder Schritt wartet auf die echte Handlung (Ereignis aus dem Modul) oder auf „Weiter“.
5. **Steuerung:** Beim ersten Spielstart Frage „Einführung starten?“ (Ja / Später / Nie). In den Einstellungen (N13) „Einführung neu starten“. Fortschritt in `localStorage`.
6. **Kontext-Tipps** nach der Einführung: Beim ersten Öffnen jedes Panels einmal ein kurzer Satz der Assistentin („Hier steuern Sie …“), abschaltbar.

## Abnahme
- Durchlauf aller Schritte in `spiel-render.js` mit simulierten Tipps. Bild je Schritt nach `bilder/nice/einfuehrung/`.
- Ohne Einführung ändert sich nichts am Spiel.
