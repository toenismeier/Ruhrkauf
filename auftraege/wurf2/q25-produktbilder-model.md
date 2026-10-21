# Q25: Produktbilder und Model (macht Claude)

**Ummo (21.10.2026):** „Die Grafiken sind absoluter Rotz, auch schon die bestehenden, gerade Jeans-Shorts: das ist eher Radler-Shorts in Jeansstoff.“ „Deutlich bessere Produktbilder und eventuell ein Model, das die dann trägt.“ Home/Living „so verstaubt“. Entscheidung Ummo: **Claude baut die Bilder** (rendert und sieht das Ergebnis), Darstellung **beides**: freigestelltes Produkt in der Liste, Model in der Detailansicht.

## Umfang
- `render/src/kit/mode/`: Silhouetten-Bibliothek (Oberteile, Unterteile, Kleider, Jacken, Schuhe, Taschen, Accessoires, Home/Living) mit Parametern (Ärmel, Länge, Kragen, Passform, Muster, Material, Farbe) → `silhouetten.json` als Schnittstelle für Q24.
- **Model**: Figur je Geschlecht × Zielgruppe (Kind, Teen, Young Adult, Adult, Best Ager) mit passender Proportion, Haltung, Haar; Kleidung als Ebenen (Unterteil, Oberteil, Jacke, Schuhe, Accessoire).
- Stil: moderne flache Modeillustration, sauberes Licht von links, Materialstruktur (Denim, Strick, Leinen, Leder, Satin), keine Marken.
- Musterbilder an Ummo vor dem Ausrollen.
