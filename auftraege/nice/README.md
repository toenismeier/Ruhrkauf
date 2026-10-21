# Nice-to-have-Aufträge

Ummo, 20.10.: GPT soll auch die Nice-to-have-Sachen machen, so viel wie möglich. Diese Aufträge machen das Spiel runder, sind aber nicht nötig, um es zu spielen. Jeder Auftrag ist eigenständig und für einen eigenen GPT-Chat gedacht.

## Regeln für alle Nice-to-have-Aufträge
- Zuerst `auftraege/README.md` lesen. Alle Regeln dort gelten, vor allem „Ohne CI arbeiten“ und die gemeinsam berührten Dateien.
- **Eigene Module statt Umbau.** Neue Oberfläche in `render/src/ui/<modul>.js`, neue Grafik in `render/src/kit/<modul>.js`, neue Engine-Logik in `engine/src/<modul>.ts`. In `render/src/spiel.js` nur: ein Import, eine Zeile Registrierung (wie `posteingangModul`), eine Menükachel in `render/spiel.html`. In `engine/src/engine.ts` höchstens ein Aufruf je Woche (`<modul>Woche(s)`).
- **Abschaltbar.** Jedes Nice-to-have hat einen Schalter in den Einstellungen (`n13-einstellungen.md`; solange das Modul fehlt: Konstante oben im Modul). Ausgeschaltet ändert es nichts an Engine-Ergebnissen.
- **Engine-Kalibrierung bleibt unberührt.** Ausnahmen stehen im Auftrag ausdrücklich. `npx jest` bleibt grün, Bot C überlebt.
- **Keine echten Marken, Firmen, Personen, Musik oder Bilder.** Alles wird selbst gebaut, Klänge per Web Audio synthetisiert.
- Branch je Auftrag `feat/nice-<kurzname>` von `main`.
- **Abnahme:** lokal, Bilder nach `bilder/nice/<kurzname>/`, Protokoll in die PR.

## Übersicht und Reihenfolge
| Nr. | Auftrag | Branch | Hängt ab von | Umfang |
|---|---|---|---|---|
| N01 | `n01-statistik.md`: Verläufe und Diagramme | `feat/nice-statistik` | – | 1 Chat |
| N02 | `n02-spielende.md`: Spielende, Bilanz, Bestenliste | `feat/nice-spielende` | – | 1 bis 2 Chats |
| N03 | `n03-erfolge.md`: Erfolge und Abzeichen | `feat/nice-erfolge` | N02 (Bilanzseite zeigt Erfolge, darf vorher starten) | 1 Chat |
| N04 | `n04-einfuehrung.md`: Einführung mit der Assistentin | `feat/nice-einfuehrung` | `spiel-reise-und-wochenabschluss.md` (Porträt, Schreibmaschine; darf vorher starten) | 1 bis 2 Chats |
| N05 | `n05-ton.md`: Klang und Haptik | `feat/nice-ton` | – | 1 Chat |
| N06 | `n06-jahreszeiten.md`: Jahreszeiten und Aktionen in der Stadt | `feat/nice-jahreszeiten` | – | 2 Chats |
| N07 | `n07-belebte-stadt.md`: Passanten und Verkehr in Bewegung | `feat/nice-belebt` | `massstab-leistung.md` sinnvoll, darf vorher starten | 2 Chats |
| N08 | `n08-zeitung.md`: Der Handelsbote als Archiv | `feat/nice-zeitung` | `spiel-reise-und-wochenabschluss.md` (Zeitungskarte) | 1 Chat |
| N09 | `n09-szenarien.md`: Szenarien und Herausforderungen | `feat/nice-szenarien` | – | 2 Chats |
| N10 | `n10-hausbesuch.md`: Hausbesuch im Innenraum | `feat/nice-hausbesuch` | Ladenbau Phase 4 | 1 bis 2 Chats |
| N11 | `n11-app.md`: Auf dem iPhone installierbar, Spielstände | `feat/nice-app` | – | 1 Chat |
| N12 | `n12-chronik.md`: Konzernchronik und Archiv im HQ | `feat/nice-chronik` | – | 1 Chat |
| N13 | `n13-einstellungen.md`: Einstellungen und Barrierefreiheit | `feat/nice-einstellungen` | – (zuerst, die anderen hängen ihre Schalter hier ein) | 1 Chat |
| N14 | `n14-werkzeuge.md`: Testwerkzeuge für Ummo | `feat/nice-werkzeuge` | – | 1 Chat |

N13 und N14 zuerst. Danach ist alles parallel möglich.
