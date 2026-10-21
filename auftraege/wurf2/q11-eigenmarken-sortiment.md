# Q11: Eigenmarken – richtige Produktbilder, Kategoriebaum, Zielgruppen

**Befund Ummo (21.10.):** „Bei der Eigenmarke hast du da falsche Produktfotos. Und mir fehlen da auch, dass du da quasi aufklappen kannst, Kategorie, was du entwickeln möchtest, Top, Bluse, kurzgeschnittenes Top, Unterteile, Röcke, Jeanshosen, Stoffhosen, Leinenhosen und das dann aufgeteilt nach Kindern, Teens and Tweens, Young Adults, Adults, Oldies, jetzt natürlich nicht Oldies genannt.“
Bilder `testflight/wurf-2/03-neues-produkt-1.png`, `04-neues-produkt-2.png`: Wickelkleid, Feinstrickpullover, Longcardigan, Rundhalspullover, Henley-Shirt zeigen ein T-Shirt; Trenchcoat und Bouclé-Jacke eine Steppjacke; Tunikabluse/Oversize-Bluse ein Hemd; A-Linien-Kleid und Kleid dasselbe Bild. Alles in einer flachen Liste.

**Ziel:**
1. **Eigenes Bild je Artikeltyp.** Kein Artikeltyp teilt sein Bild mit einem anderen. Bilder im bestehenden Stil der Produktbilder (Kit-Icons), Silhouette muss den Typ erkennbar machen (Wickelkleid ≠ T-Shirt).
2. **Kategoriebaum zum Aufklappen**, mindestens: Oberteile (T-Shirt, Top, Crop-Top, Bluse, Hemd, Polo, Pullover, Strick, Cardigan), Unterteile (Jeans, Stoffhose, Leinenhose, Chino, Cargo, Shorts, Röcke nach Form), Kleider, Jacken und Mäntel, Accessoires, Kinder-spezifisch (Body, Plüsch). Tippen auf eine Kategorie klappt die Artikeltypen auf.
3. **Zielgruppe als eigene Stufe:** Kinder, Teens & Tweens, Young Adults, Adults, Best Ager (Name für „Oldies“). Zielgruppe beeinflusst Preislage, Passform, Nachfrage je Haus (Kundschaft/Alter aus der Engine) und Marge; im Standard neutral kalibriert.
4. Engine: Produktkatalog in `engine/src` um Kategorie und Zielgruppe erweitern; bestehende Eigenmarken und Spielstände bleiben gültig (Version 2), Abnahme Eigenmarken-Tests grün.

**Code:** `render/src/ui/produkte.js`, `render/src/ui/eigenmarken.js`, Produktbilder im Kit, Engine-Produktkatalog.

**Abnahme (Claude rendert):** Katalogbild aller Artikeltypen (jedes Bild einzigartig), Ablauf Kategorie → Artikeltyp → Zielgruppe im iPhone-Format, `npm test` grün, `m7-wochenverlauf.ts` bestanden.
