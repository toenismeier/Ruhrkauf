# Q05: Eigenmarken ausbauen und Delegation je Aufgabe

Branch `feat/q05-eigenmarken-delegation`. 1 bis 2 Chats. Grundlage: `EINKAUF-VERTRAG.md`, `VORSTAND-MARKETING-VERTRAG.md`, `auftraege/operativ/o01-organisation.md`.

## Befunde Ummo (Wurf 1)
- Neue Eigenmarke (neue Brand) lässt sich nicht gründen. „Neues Produkt“ ist sichtbar und funktioniert, darum geht es nicht. Im Code gibt es den Assistenten „+ Marke gründen“ (`render/src/ui/eigenmarken.js`, `emGruenden`), im Spiel findet ihn Ummo nicht.
- Viel zu wenige Eigenmarken-Produkte, die man entwickeln kann.
- Man kann nicht auswählen, was man delegiert. Heute gibt es nur „Delegiert ja/nein“ je Bereich bzw. Cluster.

## Umsetzung
1. **Marke gründen auffindbar:** Einstieg „+ Neue Eigenmarke“ an allen Stellen, an denen Eigenmarken erscheinen (Einkauf-Panel, Produkte/Produktgestaltung, Marketing). Den Weg im iPhone-Profil bis zur fertigen Marke durchspielen und als Bildfolge in die PR. Prüfen, ob die gegründete Marke danach in Produktentwicklung, Einkauf und Engine (Umsatz, Bekanntheit, Aufbauzeit) wirkt; Lücken schließen.
2. **Mehr Produkte:** Produktkatalog für Eigenmarken auf mindestens 12 Produkttypen je Kategorie (Bekleidung Damen, Herren, Kinder, Schuhe, Accessoires, Heimtextil, Haushalt, Beauty), jeweils mit Varianten (Schnitt, Material, Farbe, Preislage). Beispiele aus der Vorgabe: Jeans-Shorts für Kinder, mintgrüne Kaschmirpullover für 60+. Neue Produkte je Saison aus dem Trendbericht.
3. **Delegation je Aufgabe:** Statt nur ja/nein je Bereich eine Liste der Aufgaben je Bereich bzw. Cluster mit eigenem Schalter, zum Beispiel:
   - Einkauf: Nachorder, Limits, Reduzierung, Altwarenabgabe an FUNDUS,
   - Personal: Einsatzplanung, Aushilfen, Einstellungen,
   - Haus/Cluster: Öffnungszeiten, Ad-hoc-Maßnahmen, Reparaturen bis Betrag X,
   - Marketing: Aktionen, Mailings.
   Engine: Delegation als Menge je Aufgabe (`{ typ: 'delegation'; bereich; aufgabe; an }`), alte Aktion bleibt kompatibel (ja/nein = alle Aufgaben). Nicht delegierte Aufgaben erzeugen Vorlagen im Posteingang, delegierte entscheidet die Leitung nach ihrer Qualität (Regel aus O01). Betragsgrenzen je Aufgabe einstellbar, wo sinnvoll.

## Abnahme
- Bildfolge Marke gründen bis zum ersten Umsatz der neuen Marke.
- Test: Delegation einzelner Aufgaben ändert die Zahl der Vorlagen im Posteingang wie erwartet.
- Engine-Tests grün, Bot C überlebt weiter 5 Jahre (`scripts/bot.ts`), `spiel-render.js` 0 Abweichungen.
