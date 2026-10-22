# Status aller Workstreams (Stand 21.10.2026, 06:30)

Legende: **abnahmefähig** = PR offen, GPT fertig, wartet auf Claudes lokale Prüfung und Merge · **in Arbeit** = Branch ohne PR, GPT arbeitet · **offen** = nicht gestartet · **gemergt** = in `main`.
Pflege: Claude schreibt diese Datei nach jedem Merge und jedem Start fort.

## Grafik und Städte
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q03 Stadt-Fingerabdruck | – | gemergt (#41) | Gate aktiv: 112 Referenzen (Chrome 130 wie CI); Städte jetzt über JS-Engines deterministisch (Mischen, `wurzelSumme`) |
| Q02 Grafikqualität (Gleise, Oberleitung, Züge, Dächer, Startbild, Flächenvielfalt, Prüfregeln) | – | gemergt (#43) | Prüfregeln 112/112 Städte 0; Dreiecke in allen Städten weniger, Draw Calls 109 Städte weniger/gleich, 3 Städte +1/+2; Fingerabdrücke aller Städte neu (Dachaufbauten Warenhaus); Essen ohne Bahnsteige im Plan, Hbf mit Zügen kommt mit Q01 |
| Maßstab Städte (220 Städte, Standortverteilung) | `feat/massstab-staedte` #31 | **abgenommen, Merge gehalten** (ed226e7) | Claude-Nacharbeit: Export 560, Städte 0, Standortregeln 0 (Center-Abstand), Kopien 0 (Fassadenverteilung), Volkskauf im Spiel nicht mehr als Hartwig, Gestaltung nicht schlechter als main, 220 Fingerabdrücke. 91 alte Städte schwerer als main → Merge erst zusammen mit Maßstab Leistung (Ummo 22.10.) |
| Q01 Städte aus Kartendaten (Essen zuerst) | – | **Phase 1 gemergt 21.10.** (#48, 238c8df) | GPT-Stand (OSM-Klötze) von Claude ersetzt: Lage nach OSM, Bebauung im Kit-Raster (Hbf mit Gleisharfe, Kettwiger Straße, Markt, Limbecker Platz, Münster, Rathaus-Hochhaus, Start am Hbf); nur Essen-Fingerabdruck neu. **Wartet: Ummo beurteilt Essen auf dem iPhone, dann Phase 2** |
| Maßstab Leistung (iPhone-Ziele, Ausgangswert Berlin, Spielstand 7,5 MB) | `feat/massstab-leistung` (von #31) | **startet 22.10.** | Abnahme: jede Stadt ≤ main (`massstab-leistung-basis.csv`), dann Merge #31 + Leistung zusammen |
| N07 Belebte Stadt (fließender Verkehr, Passanten) | – | gemergt | Bildrate mit/ohne Leben auf dem iPhone messen |
| N06 Jahreszeiten (Weihnachtsdeko, Fassaden) | – | gemergt | – |
| N10 Hausbesuch (Innenraum) | – | gemergt | – |
| Ladenbau Phase 1 bis 5 | – | gemergt | – |

## Spiel, Oberfläche, Engine
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q04 Spiel-Befunde Wurf 1 | – | gemergt (#40) | – |
| Q05 Eigenmarken und Delegation je Aufgabe | – | gemergt (#42) | – |
| Maßstab Engine Phase 1/2 (#7, 560 Häuser) | main | **gemergt 21.10.** (b5534a0) | Abnahme `nachbesserung-massstab.md` Abschnitt 20; Premium klar über Schnitt (E28) |
| Maßstab Oberfläche (Deutschlandkarte, Häuserliste, Sammelaktionen) | main | **gemergt 21.10.** (bf215bc) | – |
| Engine-Formate (Wirtschaft Volkskauf, FUNDUS/Off-Price) | main | **gemergt 21.10.** (#50, 74a5704) | Mittel, 52 Wochen: Volkskauf −2,7 bis −3,6 %, FUNDUS −1,0 bis −1,5 % EBITDA (Claude nachkalibriert); FUNDUS-Zukauf und Altwarefluss folgen der offenen Fläche; Umsatzanteile (je rund 7 % statt 11/9 %) folgen in Maßstab Phase 3. Offen: M7-Kriterium „Bot D ≥ Bot T“ scheitert schon auf main (Bot D mittel 3,39 % vs. Bot T 4,11 %), Bot D wird als nächster Schritt nachgezogen |
| Q09 Schnee (schwebende Platten) | – | **gemergt 21.10.** (#54, 390b69d) | Schnee liegt auf echten Dachflächen, je Dachebene eingerückt (Claude-Fix: kein Kreuzmuster auf Satteldächern); Winter-Dreiecke unter main, Draw Calls gleich; Fingerabdrücke 112/112 unverändert |
| Q10 Kamera bleibt über Haus | – | **gemergt 21.10.** (#53, 7af4959) | Hausdetail lässt oben Kartenstreifen frei (62 dvh), Kamera bleibt am Haus bei Kachelnachladen, Woche, Scroll, Resize; Mobil-Smoke Berlin 3 Häuser ≤ 40 px; Fingerabdrücke 112/112 unverändert |
| Q11 Eigenmarken Sortiment (Bilder, Kategorien, Zielgruppen) | `feat/q11-eigenmarken-sortiment` | **startet 21.10.** | `auftraege/wurf2/` |
| Q12 Hausbesuch Laufwege | – | **gemergt 21.10.** (#56) | Wegsuche auf Ladenbau-Belegung, 9 Etagen (Warenhaus, Sport, FUNDUS) je 60 s: 0 Kollisionen, 1,17–1,21 m/s, bildratenunabhängig; Claude-Fixes: zweiter Hausbesuch/Hauswechsel scheiterte (Kontext zerstört), Sporthaus-Etagen mit Etagenbau warfen Fehler (`etageNr`); Fingerabdrücke 112/112 unverändert |
| Q13 Sandkasten unbegrenzt | `feat/q13-sandkasten` | **startet 21.10.** | `auftraege/wurf2/` |
| Q14 Oberfläche gesamt (Gestaltungssystem) | `feat/q14-oberflaeche-design` #51 | GPT fertig gemeldet | Prüfung durch QA Grafik nach Merge Q11 (Engine-QA-Chat) |
| Q15 Zentrale Abteilungsseiten | `feat/q15-zentrale-abteilungen` | **startet 21.10.** | `auftraege/wurf2/` |
| Q16 Marketing-Kanäle und Marktanteil | `feat/q16-marketing-kanaele` | **startet 21.10.** | `auftraege/wurf2/` |
| Q17 Eigenmarken-Produktkarten (nach Q11) | `feat/q17-eigenmarken-karten` | **startet 21.10.** | `auftraege/wurf2/` |
| Q18 Handelsbote Gestaltung | `feat/q18-handelsbote` | **startet 21.10.** | `auftraege/wurf2/` |
| Q19 IT-Produkte als Karten | `feat/q19-it-produkte` | **startet 21.10.** | `auftraege/wurf2/` |
| Q20 Schwierigkeit je Szenario | `feat/q20-szenario-schwierigkeit` | **startet 21.10.** | `auftraege/wurf2/` |
| Q21 Warenhaus-Vielfalt je Stadt | `feat/q21-warenhaus-vielfalt` | **startet 21.10.** | `auftraege/wurf2/` |
| Q22 Hauspins und Premium erkennbar | `feat/q22-hauspins` | **startet 21.10.** | `auftraege/wurf2/` |
| Q23 Reise Karte und Liste | `feat/q23-reise-karte` | **startet 21.10.** | `auftraege/wurf2/` |
| Q24 Eigenmarken Deep Dive (nach Q11) | `feat/q24-eigenmarken-deep-dive` | **startet nach Q11; nur noch Bedienung + Teamleistung, Artikeltypen kommen aus Q27–Q29** | `auftraege/wurf2/` |
| Q25 Produktbilder und Model (Claude) | `q25/feat/q25-produktbilder` (PR #67) | **gemergt 21.10. (97c21aa), CI grün; Model-Stil von Ummo abgenommen; 106 Silhouetten, Model je Produkt** | `auftraege/wurf2/` |
| Q27 Mode-Bilder + Mode-Artikeltypen (Claude-Chat) | `feat/q27-mode-bilder` | **startet 22.10.; Phase 2 Artikeltypen nach Merge Q11 #57** | `auftraege/wurf2/` |
| Q28 Schuhe, Taschen, Accessoires, Wäsche (Claude-Chat) | `feat/q28-zubehoer-bilder` | **startet 22.10.** | `auftraege/wurf2/` |
| Q29 Home/Living, Beauty, Spielwaren (Claude-Chat) | `feat/q29-home-beauty-bilder` | **startet 22.10.** | `auftraege/wurf2/` |
| Q26 Meldungen und Speichern | `feat/q26-meldungen-speichern` | **startet 21.10.** | `auftraege/wurf2/` |
| Q08 Fünf Premiumhäuser | `feat/q08-premium-fuenf` | **startet 21.10.** | `auftraege/wurf1/q08-premium-fuenf.md` (Ummo E29) |
| Q06 Marktbeobachtung (Meldungen filtern) | main | **gemergt 21.10.** (#47) | – |
| Q07 Vertriebssteuerung (Region bis Haus, Vorjahr, Startmonat, Mietverträge) | `feat/q07-vertriebssteuerung` | **startet 21.10.** | – |
| Reise und Wochenabschluss 1 und 2 | – | gemergt | – |

## Operatives Paket
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| O01 Organisation, O02 Umsatztreiber, O03 IT, O04 Personal, O05 Ware, O06 Planung, O07 Haus, O08 Umbau | – | gemergt | – |
| O09 E-Commerce | main | **gemergt 21.10.** (#46) | – |

## Nice-to-haves
| N | PR | Status |
|---|---|---|
| N01 Statistik #26, N02 Spielende #20, N03 Erfolge #21, N04 Einführung #19, N05 Ton #18, N06 Jahreszeiten #24, N07 Belebte Stadt #29, N08 Zeitung #28, N09 Szenarien #30, N10 Hausbesuch #27, N11 App #33, N12 Chronik #25, N13 Einstellungen #16, N14 Werkzeuge #22 | – | gemergt (alle 14) |

## App und Auslieferung
| Punkt | Status |
|---|---|
| iOS-Hülle, TestFlight-Wurf 1 | gemergt, läuft auf Ummos iPhone |
| Automatische Auslieferung (Push auf main → Update, Hülle geändert → TestFlight) | verbunden (Base directory `/app`); läuft im Build-Zug Di/Fr 18 Uhr, außer der Reihe nur von Hand |
| GitHub-Billing für CI | erledigt 20.10.; CI auf main grün |
| `feat/iphone-playtest-ci` (Stand 18.10.) | veraltet, ohne PR; nach Merge der Nice-to-haves prüfen und verwerfen |

## Reihenfolge, sobald der Nice-Chat fertig ist
1. Q03 Fingerabdruck mergen (Gate scharf).
2. Q04 und Q05 prüfen und mergen.
3. Q02 prüfen (Rendern, Leistung, Fingerabdrücke nur für geänderte Städte neu).
4. ~~O09 E-Commerce (#46) und Q06 Marktbeobachtung (#47)~~ gemergt 21.10.
5. ~~#7 Maßstab Engine~~ gemergt 21.10. #23 Oberfläche gemergt 21.10., Q07 gestartet. Neu: fünf Premiumhäuser (E29, eigener Auftrag).
5. Maßstab Städte fertig und mergen; danach Q01 Essen starten.
6. ~~Engine-Formate~~ gemergt 21.10. (#50); danach Bot D (Schließungslogik) nachziehen.
7. Danach Build-Zug: Spiel einpacken, Update aufs iPhone, Messung.
