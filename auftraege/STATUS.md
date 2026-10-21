# Status aller Workstreams (Stand 21.10.2026, 06:30)

Legende: **abnahmefähig** = PR offen, GPT fertig, wartet auf Claudes lokale Prüfung und Merge · **in Arbeit** = Branch ohne PR, GPT arbeitet · **offen** = nicht gestartet · **gemergt** = in `main`.
Pflege: Claude schreibt diese Datei nach jedem Merge und jedem Start fort.

## Grafik und Städte
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q03 Stadt-Fingerabdruck | – | gemergt (#41) | Gate aktiv: 112 Referenzen (Chrome 130 wie CI); Städte jetzt über JS-Engines deterministisch (Mischen, `wurzelSumme`) |
| Q02 Grafikqualität (Gleise, Oberleitung, Züge, Dächer, Startbild, Flächenvielfalt, Prüfregeln) | `feat/q02-grafik-qualitaet` #43 | abnahmefähig | Claude rendert Vorher/Nachher, misst Leistung, prüft Regeln über alle Städte |
| Maßstab Städte (220 Städte, Standortverteilung) | `feat/massstab-staedte` #31 | in Arbeit (WIP) | fertigstellen; Voraussetzung für Q01 |
| Q01 Städte aus Kartendaten (Essen zuerst) | – | offen | Kartendaten Essen liegen in `render/karten/` (Phase 0 erledigt); Start nach Merge Maßstab Städte |
| Maßstab Leistung (iPhone-Ziele, Ausgangswert Berlin, Spielstand 7,5 MB) | – | offen | Start nach Städte Phase 2 |
| N07 Belebte Stadt (fließender Verkehr, Passanten) | – | gemergt | Bildrate mit/ohne Leben auf dem iPhone messen |
| N06 Jahreszeiten (Weihnachtsdeko, Fassaden) | – | gemergt | – |
| N10 Hausbesuch (Innenraum) | – | gemergt | – |
| Ladenbau Phase 1 bis 5 | – | gemergt | – |

## Spiel, Oberfläche, Engine
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q04 Spiel-Befunde Wurf 1 | `feat/q04-spiel-befunde` #40 | abnahmefähig | prüfen, mergen |
| Q05 Eigenmarken und Delegation je Aufgabe | `feat/q05-eigenmarken-delegation` #42 | abnahmefähig | prüfen, mergen |
| Maßstab Engine Phase 1/2 (#7, 560 Häuser) | `feat/engine-massstab` #7 | abnahmefähig (Phase 1), Phase 2 offen | Abnahme; neu Abschnitt 11 in `nachbesserung-massstab.md`: Q1-Verlauf abschwächen (Ummo 20.10.) |
| Maßstab Oberfläche (Deutschlandkarte, Häuserliste, Sammelaktionen) | `feat/massstab-oberflaeche` #23 | abnahmefähig | Prüfung; Voraussetzung für Q07 |
| Engine-Formate (Wirtschaft Volkskauf, FUNDUS/Off-Price) | – | offen | Start nach #7 Phase 2 |
| Q06 Marktbeobachtung (Meldungen filtern) | – | offen | startklar (N08 gemergt) |
| Q07 Vertriebssteuerung (Region bis Haus, Vorjahr, Startmonat, Mietverträge) | – | offen | Start nach Merge Maßstab Oberfläche |
| Reise und Wochenabschluss 1 und 2 | – | gemergt | – |

## Operatives Paket
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| O01 Organisation, O02 Umsatztreiber, O03 IT, O04 Personal, O05 Ware, O06 Planung, O07 Haus, O08 Umbau | – | gemergt | – |
| O09 E-Commerce | `feat/op-ecommerce` #46 | abnahmefähig (rebased, konfliktfrei) | prüfen, mergen |

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
4. O09 E-Commerce (#46) und Q06 Marktbeobachtung (#47) prüfen und mergen.
5. #7 Maßstab Engine (Abnahme nach `nachbesserung-massstab.md` Abschnitt 14, Messung durch Claude) und Maßstab Oberfläche abnehmen; danach Q07 starten.
5. Maßstab Städte fertig und mergen; danach Q01 Essen starten.
6. Nach N08: Q06 starten. Nach #7 Phase 2: Engine-Formate.
7. Danach Build-Zug: Spiel einpacken, Update aufs iPhone, Messung.
