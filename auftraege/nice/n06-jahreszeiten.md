# N06: Jahreszeiten und Aktionen in der Stadt

## Ziel
Die Stadt sieht heute das ganze Jahr gleich aus. Coffee Inc 2 hat das auch nicht, aber für ein Warenhausspiel ist das Jahr der Takt: Weihnachten, Sommerschlussverkauf, Schulanfang.

## Umfang
1. **Jahreszeit aus der Woche:** `jahreszeit(s)` aus `kw` (Winter KW 1 bis 9 und 49 bis 52, Frühling 10 bis 22, Sommer 23 bis 35, Herbst 36 bis 48). Zusätzlich Anlass aus dem Aktionskalender (`marketing.ts`): WSV, SSV, Black Friday, Weihnachten, Ostern, Schulanfang.
2. **Stadt** (`render/src/kit/jahreszeit.js`, angewendet über die Brücke, ohne Neubau der Kacheln; nur Material- und Objektwechsel):
   - **Bäume:** Frühling hellgrün mit Blüten bei einem Teil der Bäume, Sommer sattgrün, Herbst Gelb/Orange/Rot gemischt, Winter kahl (Stamm und Äste als einfacher Körper).
   - **Schnee** in KW 2 bis 7 mit 40 % Wahrscheinlichkeit je Woche (Zufall über Seed): weiße Dächer und Gehwegränder, Straßen frei.
   - **Weihnachten** ab KW 47: Lichterketten über den Einkaufsstraßen, Weihnachtsmarkt (6 bis 12 Buden) auf dem größten Platz der Stadt, Tanne vor jedem Hartwig-Haus.
   - **Sommer:** Außengastronomie (Tische, Schirme) vor Cafés, Eiswagen, mehr Passanten in heller Kleidung.
3. **Häuser:**
   - Schaufenster je Anlass: Weihnachten rot-gold, WSV/SSV große Prozentzahlen nur bei Formaten mit Aktion (Hartwig, Volkskauf; FUNDUS bleibt beim Claim), Schulanfang Ranzen, Ostern Pastell.
   - Fassadenbanner der laufenden Aktion. `zustaende.js` hat Aktionsbanner: dort nur ergänzen.
4. **Engine:** Wetter als sichtbare Ursache. Hat die Engine Wettereinflüsse auf die Frequenz, zeigt die Stadt das Wetter (Regen als feine Linien, Hitze als helles Licht). Sonst nur Darstellung, keine neue Wirkung.
5. **Leistung:** Teilebudget je Stadt höchstens +8 %, Wechsel der Jahreszeit unter 150 ms.

## Abnahme
- Katalog `jahreszeiten.js`: Essen und eine Stadt im Süden in allen vier Jahreszeiten plus Weihnachten und Schnee.
- `pruef-staedte` 0 Fehler, Gestaltungsprüfung 0 Verstöße in allen Jahreszeiten (Prüfung mit Parameter `--jahreszeit`).
