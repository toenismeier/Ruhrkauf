# Status aller Workstreams (Stand 21.10.2026, 06:30)

Legende: **abnahmefähig** = PR offen, GPT fertig, wartet auf Claudes lokale Prüfung und Merge · **in Arbeit** = Branch ohne PR, GPT arbeitet · **offen** = nicht gestartet · **gemergt** = in `main`.
Pflege: Claude schreibt diese Datei nach jedem Merge und jedem Start fort.

## Grafik und Städte
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q03 Stadt-Fingerabdruck | – | gemergt (#41) | Gate aktiv: 112 Referenzen (Chrome 130 wie CI); Städte jetzt über JS-Engines deterministisch (Mischen, `wurzelSumme`) |
| Q02 Grafikqualität (Gleise, Oberleitung, Züge, Dächer, Startbild, Flächenvielfalt, Prüfregeln) | – | gemergt (#43) | Prüfregeln 112/112 Städte 0; Dreiecke in allen Städten weniger, Draw Calls 109 Städte weniger/gleich, 3 Städte +1/+2; Fingerabdrücke aller Städte neu (Dachaufbauten Warenhaus); Essen ohne Bahnsteige im Plan, Hbf mit Zügen kommt mit Q01 |
| Maßstab Städte (220 Städte, Standortverteilung) | `feat/massstab-staedte` #31 | in Arbeit (WIP) | fertigstellen; Q01 Essen läuft entkoppelt (Ummo 21.10.) |
| Q01 Städte aus Kartendaten (Essen zuerst) | `feat/q01-essen` | **startet 21.10. (entkoppelt)** | Phase 1 Essen; Ummo beurteilt Essen auf dem iPhone vor Phase 2 |
| Maßstab Leistung (iPhone-Ziele, Ausgangswert Berlin, Spielstand 7,5 MB) | – | offen | Start nach Städte Phase 2 |
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
| Engine-Formate (Wirtschaft Volkskauf, FUNDUS/Off-Price) | `feat/engine-formate` | **startet 21.10.** | Auftrag mit Stand 21.10. (TK-Maxx-Prinzip, Referenz-GuV, Bot T/D) |
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
6. Engine-Formate jetzt startklar.
7. Danach Build-Zug: Spiel einpacken, Update aufs iPhone, Messung.
