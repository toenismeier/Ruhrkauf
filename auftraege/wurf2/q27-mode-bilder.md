# Q27: Mode-Bilder und Model nachschärfen, neue Mode-Silhouetten (Claude-Chat 1)

Branch `feat/q27-mode-bilder`. Regeln: `produktbilder-regeln.md`.

## 1. Bestehendes nachschärfen
- T-Shirt/Shirts: Ärmel nach Maß (schräg abfallend, nicht stummelig), Halsbündchen. Jacken: Ärmel mit Ellbogenknick und Weite, Regenjacke/Parka mit echter Kapuze, Kordel, Taschenpatten. Shorts und Culotte mit sichtbarer Beintrennung.
- Model: Kleider ohne sichtbare Taillennaht, Hände, leichte Haltung (Spielbein), Schuhe am Model passend zum Outfit, Pyjama/Wäsche nicht am Model.
- Kinderbody neu (statt `alt:`), Kinderkleid prüfen.

## 2. Neue Silhouetten (mindestens)
- **Damen:** Jumpsuit, Hosenanzug (Blazer + Hose als Set-Bild), Puffärmelbluse, Off-Shoulder-Top, Corsage-Top, Twinset, Kaftan/Kimono, Pullunder, Cropped-Cardigan, Teddyjacke, Poncho, Tüllrock, Lederrock, Paperbag-Hose, Badeanzug, Bikini, Blusenkleid, Strickweste.
- **Herren:** Anzug (Set), Sakko, Anzugweste, Henley, Troyer, Rugbyshirt, Cargo-Shorts, Badeshorts, Chino-Shorts, Harrington-Jacke, Fieldjacket, Funktionsjacke, Hemdjacke/Shacket.
- **Kinder:** Strampler, Body langarm, Latzkleid, Matschhose, Schneeanzug, Schlafsack, Leggings-Set, Kinderbadeanzug, Kapuzenjacke.
- **Teens:** Track-Jacket, Track-Pants, Oversize-Hemd, Cargo-Rock, Mini-Kleid, Corsage.

## 3. Artikeltypen (Phase 2, nach Q11)
`engine/src/sortiment/q27-mode.ts`, mindestens 100 neue Mode-Artikeltypen (Damen, Herren, Kinder, Teens) mit Bild-Parametern; legt den gemeinsamen Haken an (siehe Regeln).
