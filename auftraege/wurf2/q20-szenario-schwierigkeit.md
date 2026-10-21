# Q20: Schwierigkeit je Startszenario eigens beschrieben

**Befund Ummo (21.10.):** „Für jedes Startszenario sind die Kategorien leicht, mittel, schwer mit derselben Begründung. Das muss man anpassen.“ Bild `testflight/wurf-2/12-start-szenario.png` (Schutzschirm zeigt die Standardtexte aus `engine/src/schwierigkeit.ts`).

**Ziel:** Je Szenario (Standard, Schutzschirm, Lockdown, Fusion, Investor, Aufbruch, Sandkasten) und je Stufe ein eigener Satz, der sagt, was sich in **diesem** Szenario ändert (z. B. Schutzschirm leicht: „Sachwalter kooperativ, Gläubiger stimmen eher zu“; Fusion schwer: „Betriebsrat streikbereit, Doppelstandorte teuer“). Wo ein Szenario eigene Regeln hat, wirken die Stufen auch darauf (Engine `szenarien.ts` × `schwierigkeit.ts`); Sandkasten ohne Stufenwahl.

**Abnahme:** Test: keine zwei Szenarien mit identischem Stufentext; Startbildschirm-Katalog je Szenario; `m7-wochenverlauf.ts` (Standard) unverändert.
