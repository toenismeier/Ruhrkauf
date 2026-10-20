# N07: Passanten und Verkehr in Bewegung

## Ziel
Coffee Inc 2 lebt davon, dass sich in der Stadt etwas bewegt. Bei Hartwig stehen Passanten und Autos heute still.

## Umfang
1. **Modul** `render/src/kit/leben.js`, eigener Takt über `requestAnimationFrame`. Nur sichtbare Kacheln, nur ab mittlerer Zoomstufe.
2. **Autos:**
   - 20 bis 60 Autos je sichtbarem Ausschnitt, fahren auf den Fahrspuren des Stadtplans (`stadtplan.js` kennt Straßen und Richtungen), biegen an Kreuzungen zufällig ab.
   - Ampeln sind nicht nötig, aber kein Auto fährt durch ein anderes (Abstand halten auf derselben Spur).
   - Busse auf Hauptstraßen, Straßenbahn auf Magistralen, wenn die Stadt Gleise hat.
3. **Fußgänger:**
   - Laufen auf Gehwegen und in Fußgängerzonen, gehen in Häuser hinein und kommen mit Tüten heraus.
   - Menge und Tütenanteil je Haus nach Frequenz und Umsatz der letzten Woche aus der Engine: Ein starkes Haus zieht sichtbar mehr Leute an.
   - Tütenfarbe nach Format (Hartwig-Rot, Volkskauf, FUNDUS-Weinrot, Sport).
4. **Lieferverkehr:** Ein Lkw fährt an die Anlieferung eines Hauses, wenn in dieser Woche eine Order ankommt (Einkauf). Höchstens einer je Haus und Woche.
5. **Technik:**
   - Instanzen (`InstancedMesh`) für Autos und Fußgänger, Bewegung im Vertex-Shader oder über Matrix-Updates nur für sichtbare Instanzen.
   - Budget: höchstens 2 ms je Bild auf dem iPhone, sonst Anzahl halbieren (automatisch).
   - Steht die Karte still und ist der Bildschirm 30 s unberührt: Bewegung auf 15 Bilder je Sekunde drosseln (Akku).
6. **Schalter** in N13: Leben in der Stadt (voll / wenig / aus).

## Abnahme
- Video oder Bildfolge (10 Bilder im 100-ms-Abstand) von Essen nah und mittel.
- Bildrate mit und ohne Leben auf dem iPhone (`performanceMessen`) in der PR.
- `spiel-render.js` 0 Abweichungen, Prüfung läuft mit „Leben aus“.
