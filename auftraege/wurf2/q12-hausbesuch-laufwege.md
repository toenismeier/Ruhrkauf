# Q12: Hausbesuch – Laufgeschwindigkeit und Kollision

**Befund Ummo (21.10.):** „Die Leute bewegen sich unglaublich schnell und auch durch Regale durch. Sie scheinen sehr viel Lust beim Einkaufen zu haben.“ Bilder `testflight/wurf-2/01-hausbesuch-essen.png`, Bildfolge `17-hausbesuch-video-bildfolge.png`.

**Ziel:** Kunden gehen in Schrittgeschwindigkeit (rund 1,0–1,4 m/s, beim Stöbern langsamer, Stehenbleiben an Regalen, an der Kasse anstellen), Personal ruhiger. Laufwege nur über freie Gangflächen: Navigationsraster aus der Ladenbau-Belegung (Möbel, Rolltreppen, Aufzug, Wände, Säulen sind gesperrt), Wegsuche zwischen Zielen, keine Durchquerung von Möbeln. Gleichmäßige Geschwindigkeit unabhängig von der Bildrate (Zeitschritt, nicht Frames).

**Code:** `render/src/ui/hausbesuch.js` und das zugehörige Kit (Personen, Ladenbau-Belegung).

**Abnahme:** Prüfskript zählt über 60 Sekunden Simulation je Etage Kollisionen Person × Möbel-Grundfläche = 0 und mittlere Geschwindigkeit 0,8–1,4 m/s; Bildfolge für Claude als Katalog. Leistung im Hausbesuch nicht schlechter als heute.
