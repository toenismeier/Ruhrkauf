# Q13: Sandkasten mit unbegrenztem Geld

**Befund Ummo (21.10.):** „Beim Sandbox-Szenario müssen wir das Geld ein bisschen hochschrauben oder auf Unlimited setzen. Das ist ja sonst kein Sandbox.“ Bilder `testflight/wurf-2/08-berlin-wasser.png`, `12-start-szenario.png`: Cash zeigt „1.000.000 M…“, Kreditrahmen „2.000.000 M…“ (abgeschnitten, wirkt wie eine begrenzte Summe).

**Ziel:** Im Sandkasten ist Geld unbegrenzt: Cash und Kreditrahmen zeigen „unbegrenzt“ (bzw. ∞), keine Aktion scheitert an Liquidität, Kapitalfluss/GuV laufen normal weiter (Ergebnisse sichtbar), keine Insolvenz, keine Wertung. Spielstandliste zeigt „Sandkasten · unbegrenzt“ statt „Cash 1.000.000 Mrd. €“.

**Code:** `engine/src/szenarien.ts` (`sandkasten`), Cockpit/Startbildschirm in `render/src/spiel.js`, `render/src/ui/speicher.js`.

**Abnahme:** Test Sandkasten 52 Wochen mit teuren Aktionen (Umbau, Schließungen, IT-Projekte) ohne Liquiditätsfehler; Anzeigen „unbegrenzt“ im Cockpit, Startbildschirm und Spielstandliste.
