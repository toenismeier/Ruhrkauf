# N05: Klang und Haptik

## Ziel
Coffee Inc 2 wirkt durch kleine Geräusche lebendig. Hartwig ist heute stumm.

## Umfang
1. **Modul** `render/src/ui/ton.js` mit Web Audio. Alle Klänge werden synthetisiert (Oszillatoren, Rauschen, Hüllkurven), keine Audiodateien, keine fremden Samples.
2. **Klänge** (je eine kleine Funktion, Länge in Klammern):
   - Tippen (20 ms Klick), Panel auf (Wisch 120 ms), Panel zu.
   - Erfolg (Zweiklang aufwärts, 300 ms), Warnung (tiefer Doppelton).
   - Kasse beim Hochzählen im Wochenbericht: leises Ticken, Takt fällt mit der Zählkurve, am Ende ein Kassenklingeln.
   - Reise: Zuggeräusch als gefiltertes Rauschen mit Schienenstoß-Rhythmus (4,4 s, Lautstärke an der Kamerafahrt).
   - Insolvenz (dumpfer Schlag), Erfolg freigeschaltet (Glöckchen).
3. **Stadtklang:** leiser Teppich aus gefiltertem Rauschen, Lautstärke nach Zoomstufe. Nah: Fußgängerzone, Stimmengewirr als Formantrauschen. Fern: Verkehr.
4. **Musik:** eine generative, ruhige Hintergrundmusik (Pentatonik, langsame Akkorde, 70 BPM). Tonart wechselt mit der Lage: Dur bei positivem EBITDA13, Moll in der Insolvenz. Standard aus.
5. **Haptik:** `navigator.vibrate`, wo vorhanden. Auf dem iPhone in Safari gibt es das nicht: Schnittstelle `haptik(art)` vorsehen, die später die native Hülle (Capacitor oder WebView) belegt. Heute nichts tun, kein Fehler.
6. **Regeln:**
   - Audio erst nach der ersten Berührung starten (Vorgabe von iOS).
   - Stummschalter des iPhones respektieren: Web Audio folgt ihm nicht. Deshalb Standard „Klang an, Musik aus“ und gut sichtbar in den Einstellungen.
   - Schalter in N13: Klänge, Stadtklang, Musik, je mit Lautstärke.

## Abnahme
- Seite `render/ton-probe.html` mit Knopf je Klang.
- Keine Fehler in der Konsole ohne Audio-Gerät (Headless).
- `spiel-render.js` 0 Abweichungen.
