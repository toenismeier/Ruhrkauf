# Status aller Workstreams (Stand 20.10.2026, 18:30)

Legende: **abnahmefähig** = PR offen, GPT fertig, wartet auf Claudes lokale Prüfung und Merge · **in Arbeit** = Branch ohne PR, GPT arbeitet · **offen** = nicht gestartet · **gemergt** = in `main`.
Pflege: Claude schreibt diese Datei nach jedem Merge und jedem Start fort.

## Grafik und Städte
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q03 Stadt-Fingerabdruck | `feat/q03-fingerabdruck` #41 | abnahmefähig | zuerst prüfen und mergen, danach gilt das Gate für alle Grafik-PRs |
| Q02 Grafikqualität (Gleise, Oberleitung, Züge, Dächer, Startbild, Flächenvielfalt, Prüfregeln) | `feat/q02-grafik-qualitaet` #43 | abnahmefähig | Claude rendert Vorher/Nachher, misst Leistung, prüft Regeln über alle Städte |
| Maßstab Städte (220 Städte, Standortverteilung) | `feat/massstab-staedte` #31 | in Arbeit (WIP) | fertigstellen; Voraussetzung für Q01 |
| Q01 Städte aus Kartendaten (Essen zuerst) | – | offen | Kartendaten Essen liegen in `render/karten/` (Phase 0 erledigt); Start nach Merge Maßstab Städte |
| Maßstab Leistung (iPhone-Ziele, Ausgangswert Berlin) | – | offen | Start nach Städte Phase 2 |
| N07 Belebte Stadt (fließender Verkehr, Passanten) | `feat/nice-belebt` #29 | abnahmefähig | Prüfung im Nice-Chat; Bildrate mit/ohne Leben auf dem iPhone messen |
| N06 Jahreszeiten (Weihnachtsdeko, Fassaden) | `feat/nice-jahreszeiten` #24 | abnahmefähig | Prüfung im Nice-Chat |
| N10 Hausbesuch (Innenraum) | `feat/nice-hausbesuch` #27 | abnahmefähig | Prüfung im Nice-Chat |
| Ladenbau Phase 1 bis 5 | – | gemergt | – |

## Spiel, Oberfläche, Engine
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q04 Spiel-Befunde Wurf 1 | `feat/q04-spiel-befunde` #40 | abnahmefähig | prüfen, mergen |
| Q05 Eigenmarken und Delegation je Aufgabe | `feat/q05-eigenmarken-delegation` #42 | abnahmefähig | prüfen, mergen |
| Maßstab Engine Phase 1/2 (#7, 560 Häuser) | `feat/engine-massstab` #7 | abnahmefähig (Phase 1), Phase 2 offen | Abnahme; neu Abschnitt 11 in `nachbesserung-massstab.md`: Q1-Verlauf abschwächen (Ummo 20.10.) |
| Maßstab Oberfläche (Deutschlandkarte, Häuserliste, Sammelaktionen) | `feat/massstab-oberflaeche` #23 | abnahmefähig | Prüfung; Voraussetzung für Q07 |
| Engine-Formate (Wirtschaft Volkskauf, FUNDUS/Off-Price) | – | offen | Start nach #7 Phase 2 |
| Q06 Marktbeobachtung (Meldungen filtern) | – | offen | Start nach Merge N08 |
| Q07 Vertriebssteuerung (Region bis Haus, Vorjahr, Startmonat, Mietverträge) | – | offen | Start nach Merge Maßstab Oberfläche |
| Reise und Wochenabschluss 1 und 2 | – | gemergt | – |

## Operatives Paket
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| O01 Organisation, O02 Umsatztreiber, O03 IT, O06 Planung, O07 Haus, O08 Umbau | – | gemergt | – |
| O04 Personal | `feat/op-personal` #39 | abnahmefähig | prüfen, mergen |
| O05 Ware | `feat/op-ware` | in Arbeit | GPT fertigstellen, PR öffnen |
| O09 E-Commerce | `feat/op-ecommerce` | in Arbeit | GPT fertigstellen, PR öffnen |

## Nice-to-haves (Prüfung läuft im Nice-Chat)
| N | PR | Status |
|---|---|---|
| N01 Statistik #26, N02 Spielende #20, N03 Erfolge #21, N04 Einführung #19, N05 Ton #18, N08 Zeitung #28, N09 Szenarien #30, N11 App #33, N12 Chronik #25, N13 Einstellungen #16, N14 Werkzeuge #22 | offen | abnahmefähig |

## App und Auslieferung
| Punkt | Status |
|---|---|
| iOS-Hülle, TestFlight-Wurf 1 | gemergt, läuft auf Ummos iPhone |
| Automatische Auslieferung (Push auf main → Update, Hülle geändert → TestFlight) | eingebaut; wartet auf Ummo: GitHub im Expo-Projekt verbinden (Base directory `app`) |
| GitHub-Billing für CI | wartet auf Ummo |
| `feat/iphone-playtest-ci` (Stand 18.10.) | veraltet, ohne PR; nach Merge der Nice-to-haves prüfen und verwerfen |

## Reihenfolge, sobald der Nice-Chat fertig ist
1. Q03 Fingerabdruck mergen (Gate scharf).
2. Q04, Q05, O04 prüfen und mergen.
3. Q02 prüfen (Rendern, Leistung, Fingerabdrücke nur für geänderte Städte neu).
4. #7 Maßstab Engine und Maßstab Oberfläche abnehmen; danach Q07 starten.
5. Maßstab Städte fertig und mergen; danach Q01 Essen starten.
6. Nach N08: Q06 starten. Nach #7 Phase 2: Engine-Formate.
7. Danach Build-Zug: Spiel einpacken, Update aufs iPhone, Messung.
