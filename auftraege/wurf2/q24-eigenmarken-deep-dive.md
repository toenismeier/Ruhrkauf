# Q24: Eigenmarken Deep Dive – Sortiment, Damen/Herren, Zielgruppen, Teamleistung

**Start nach Merge von Q11.** Bilder macht Claude (Q25), GPT liefert Sortiment, Engine und Bedienung.

**Ummo (21.10.2026):** Eigenmarken sind „die margenstarken Brummer“. „Deutlich, deutlich mehr Produkte in der Eigenmarke.“ „Button, dass du umschalten kannst zwischen Männer, Frauen.“ „Zielgruppengerechte Kleidung: Teens and Tweens kriegt natürlich andere Produkte als jetzt die Best-Ager.“ „Dass die alle denselben Effekt haben bei allen Marken, also 51 von 100 in der Performance durch die Teams, das sollte man anpassen.“ Die Produkte „sehen wirklich so Asbach-uralt aus“, Home/Living „so verstaubt“.

## 1. Sortiment (Engine, `engine/src/produkt-sortiment.ts`, `produkte.ts`)
- Achsen: **Abteilung** (Damen, Herren, Kinder, Home/Living, Accessoires, Beauty) × **Zielgruppe** (Kinder, Teens & Tweens, Young Adults, Adults, Best Ager) × **Kategorie** × **Artikeltyp**. Mindestens **300 Artikeltypen**, jeder mit Zielgruppen, für die er sinnvoll ist (kein Twinset für Teens, keine Baggy-Cargo für Best Ager).
- Beispiele zielgruppengerecht (nicht abschließend, ausbauen):
  - Teens & Tweens Damen: Crop-Top, Babytee, Oversize-Hoodie, Baggy-Jeans, Cargo-Hose, Plisseeminirock, Puffer-Weste, Bucket-Hat. Herren: Boxy-Tee, Hoodie, Baggy-Jeans, Track-Pants, Varsity-Jacke, Cap.
  - Young Adults: Slip-Dress, Wide-Leg-Jeans, Leinenhemd, Overshirt, Trenchcoat kurz, Strickweste, Straight-Jeans, Tote-Bag.
  - Adults: Etuikleid, Bundfaltenhose, Blazer, Seidenbluse, Kaschmirpullover, Wollmantel, Chino, Business-Hemd, Anzug, Loafer.
  - Best Ager: Twinset, Stretch-Hose mit Komfortbund, Steppweste, Strickjacke mit Knopfleiste, Tunika, Popeline-Bluse, Cordhose, Regenjacke, Bequemschuh.
  - Kinder: Body, Latzhose, Regenmatschhose, Strumpfhose, Kapuzenpulli, Schlafanzug, Kinderjeans, Mütze-Schal-Set.
  - Home/Living (modern, nicht verstaubt): Bettwäsche-Sets (Satin, Leinen, Renforcé), Frottier, Waffelpiqué-Handtücher, Plaids, Kissenhüllen (Bouclé, Cord), Duftkerzen, Steingutgeschirr, Gläser, Karaffen, Körbe, Leinenservietten, Bilderrahmen, Teppiche.
- Je Artikeltyp: Preislage je Zielgruppe, Saisonalität, Material-/Farbauswahl, Nachfrage je Haus über Kundenalter und Stadt (Engine-Kundschaft), Marge. **Kalibrierung:** Eigenmarkenanteil und Marge im Standard unverändert (`m7-wochenverlauf.ts` bestanden).
- **Bildschnittstelle für Q25 (Pflicht):** jeder Artikeltyp hat `bild: { silhouette, aermel?, laenge?, kragen?, passform?, muster? }` aus einer festen Liste in `render/src/kit/mode/silhouetten.json` (legt Claude in Q25 an; bis dahin Platzhalter-Namen verwenden und die Liste im PR dokumentieren). Keine eigenen Bildfunktionen in Q24.

## 2. Bedienung (`render/src/ui/produkte.js`, `eigenmarken.js`)
- Oben **Umschalter Damen | Herren | Kinder | Home** (Segment), darunter Zielgruppe als Chips, dann Kategorien zum Aufklappen (Q11), dann Artikeltypen als Raster.
- Detailansicht eines Produkts mit Model-Bild (Q25), Material, Farbe, Preis, Zielgruppe.

## 3. Teamleistung je Marke statt pauschal 51/100
- Heute zeigt jede Marke „51 von 100“. Neu: Leistung je Marke aus **Designteam** (Größe, Erfahrung je Kategorie), **Zielgruppen-Fit** (passt die Marke zur Zielgruppe des Artikels), **Trendtreffer** (Saison, Modegrad), **Lieferantenqualität**, **HQ-Stufe Einkauf/Produktentwicklung**. Sichtbar als Aufschlüsselung („Team 62 · Zielgruppe 80 · Trend 45“). Neutral kalibriert: Mittelwert über Marken wie heute.

## Abnahme (Claude misst und rendert)
`npm run typecheck`, `npm test` (neue Tests: ≥ 300 Artikeltypen, jede Zielgruppe ≥ 40 Typen, keine Teens-Artikel bei Best Ager und umgekehrt gemäß Liste, Teamleistung unterscheidet sich zwischen Marken), `m7-wochenverlauf.ts` bestanden, Bedienung im iPhone-Format.
