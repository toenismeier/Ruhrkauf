# Q09: Schnee – schwebende weiße Platten

**Befund Ummo (21.10.):** „Der Schnee ist komplett fehl am Platz. Wo auch immer der sein soll, ist er nicht.“ Bilder `testflight/wurf-2/15-essen-schnee-kw2.png`, `16-essen-schnee-kw3.png`, `11-berlin-2.png`: In KW 1–3 (Winter, N06 Jahreszeiten) liegen große, flache, weiße Rechtecke über ganzen Gebäudeblöcken und Warenhäusern, deutlich über den Dächern, ohne Bezug zur Dachform (Satteldach, Flachdach, Hof). Teilweise verdecken sie das Warenhaus komplett.

**Ziel:** Schnee liegt sichtbar *auf* den jeweiligen Dachflächen (Satteldach: beide Dachflächen, Flachdach: Dachfläche innerhalb der Attika, Dachaufbauten aus Q02 bleiben sichtbar), leicht auf Gehwegen/Grün, nie als eigene schwebende Ebene. Lieber dezent als falsch. Warenhausdächer und Schriftzüge bleiben lesbar.

**Code:** `render/src/kit/jahreszeit.js`, `render/src/kit/stadt.js` (Schneeschicht), Katalog `render/src/kataloge/jahreszeiten.js`.

**Abnahme (Claude rendert):** Katalog Winter für Essen, Berlin, Hamburg, München (Altbau, Flachdach, Warenhaus, Sport, FUNDUS); keine Fläche oberhalb Dachhöhe + 0,3 m; Draw Calls und Dreiecke Winter höchstens +5 % gegenüber Sommer; Fingerabdruck unverändert (Sommerbild).
