# N10: Hausbesuch im Innenraum

## Ziel
Heute zeigt das Hausdetail Etagenschnitte als Bild. Ein Hausbesuch macht das Haus erlebbar: Etage im Vollbild, verschiebbar, mit Menschen und Stimmen. Das baut auf dem Ladenbau auf.

## Umfang
1. **Einstieg:** Im Hausdetail der Knopf „Haus besuchen“. Modul `render/src/ui/hausbesuch.js`, eigene three.js-Szene mit der Etage aus `grundriss.js` bzw. `sportgrundriss.js` (Ladenplan), Iso-Kamera wie die Stadt, verschiebbar und zoombar (`ui/karte.js` wiederverwenden).
2. **Etagenwahl** am rechten Rand (UG bis oberste Etage), Wechsel mit kurzer Fahrt nach oben bzw. unten (300 ms).
3. **Leben:** Kunden laufen zwischen den Abteilungen, Verkäufer stehen an Kassen und Theken. Anzahl nach Frequenz und Personal (FTE) aus der Engine.
4. **Stimmen:** Antippen eines Kunden zeigt eine Sprechblase aus den Kennzahlen der Abteilung:
   - Altware hoch: „Das hängt hier schon seit dem Frühjahr.“
   - Fehlmengen: „Meine Größe ist wieder nicht da.“
   - Personal knapp: „Hier ist ja nie jemand.“
   - Gut sortiert: „Endlich mal wieder schöne Sachen.“
   - Rund 40 Sätze in Gruppen. Auswahl deterministisch aus Woche und Abteilung.
5. **Filialleitung:** Antippen der Info-Theke zeigt die Filialleitung (Porträt aus `portraet.js`, Name aus der Engine, falls vorhanden) mit drei Sätzen zur Lage des Hauses, aus Kennzahlen gebaut.
6. **Abteilung antippen** springt in den Einkauf zur Warengruppe dieser Abteilung.

## Abnahme
- Bilder: ein Hartwig-A-Haus, ein Sporthaus, ein FUNDUS je Etage. Bildfolge einer Etagenfahrt.
- Bildrate auf dem iPhone über 45 Bilder je Sekunde in der größten Etage.
- `spiel-render.js` 0 Abweichungen.
