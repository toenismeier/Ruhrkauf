# Q10: Kamera bleibt über dem gewählten Haus

**Befund Ummo (21.10.):** „Wenn man ein Berliner Haus auswählt, springt er immer in der Ansicht zurück und bleibt nicht über dem Haus.“ (Berlin, mehrere Hartwig-Häuser; vermutlich auch andere Metropolen mit vielen Häusern, Stadtkacheln werden nachgeladen.)

**Ziel:** Antippen eines Hauses fährt die Kamera auf das Haus und sie bleibt dort, solange das Hausdetail offen ist, auch wenn Kacheln nachgeladen werden, eine Woche läuft oder das Panel scrollt. Nach dem Schließen bleibt die Kamera an dieser Stelle (kein Zurückspringen auf den Stadtmittelpunkt).

**Vorgehen:** Ursache finden (Kachel-Nachladen setzt Kamera zurück? `zeichnen()`/`grafikNachziehen()` nach Aktion? Stadtwechsel-Logik?). Kamera-Ziel als Zustand führen, nur durch Nutzergeste oder bewusste Aktionen (Reise, Stadtwechsel) ändern.

**Code:** `render/src/spiel.js` (Hausklick, Kamera, Kacheln), `render/src/ui/haus.js`.

**Abnahme:** Neuer Mobil-Smoketest: Berlin, drei verschiedene Häuser nacheinander antippen, je 2 Sekunden warten, Kameramitte liegt jeweils innerhalb von 40 px um den Hauspin; nach Schließen unverändert. Claude prüft auf dem iPhone-Format.
