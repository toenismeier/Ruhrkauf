# Status aller Workstreams (Stand 23.10.2026)

Legende: **abnahmefähig** = PR offen, GPT fertig, wartet auf Claudes lokale Prüfung und Merge · **in Arbeit** = Branch ohne PR, GPT arbeitet · **offen** = nicht gestartet · **gemergt** = in `main`.
Pflege: Claude schreibt diese Datei nach jedem Merge und jedem Start fort.

## Grafik und Städte
| Workstream | Branch / PR | Status | Nächster Schritt |
|---|---|---|---|
| Q03 Stadt-Fingerabdruck | – | gemergt (#41) | Gate aktiv: 112 Referenzen (Chrome 130 wie CI); Städte jetzt über JS-Engines deterministisch (Mischen, `wurzelSumme`) |
| Q02 Grafikqualität (Gleise, Oberleitung, Züge, Dächer, Startbild, Flächenvielfalt, Prüfregeln) | – | gemergt (#43) | Prüfregeln 112/112 Städte 0; Dreiecke in allen Städten weniger, Draw Calls 109 Städte weniger/gleich, 3 Städte +1/+2; Fingerabdrücke aller Städte neu (Dachaufbauten Warenhaus); Essen ohne Bahnsteige im Plan, Hbf mit Zügen kommt mit Q01 |
| Maßstab Städte (220 Städte, Standortverteilung) | `feat/massstab-staedte` #31 | **gemergt 22.10. zusammen mit #71** | 220 Städte, Export 561 Häuser (nach Q08), Städte 0, Standortregeln 0, Kopien 0 (Familie und Fassade gemeinsam verteilt, Q21-Vielfalt eingebunden), Gestaltung 46 Städte mit je 1 Verstoß (vorher 47), 220 Fingerabdrücke neu |
| Q01 Städte aus Kartendaten (Essen zuerst) | – | **Phase 1 gemergt 21.10.** (#48, 238c8df) | GPT-Stand (OSM-Klötze) von Claude ersetzt: Lage nach OSM, Bebauung im Kit-Raster (Hbf mit Gleisharfe, Kettwiger Straße, Markt, Limbecker Platz, Münster, Rathaus-Hochhaus, Start am Hbf); nur Essen-Fingerabdruck neu. **Wartet: Ummo beurteilt Essen auf dem iPhone, dann Phase 2** |
| Maßstab Leistung (iPhone-Ziele, Ausgangswert Berlin, Spielstand 7,5 MB) | `feat/massstab-leistung` #71 | **gemergt 22.10.** | Claude: Sammelgeometrie mit Vertexfarben in 120-m-Raumzellen statt ein Mesh je Farbe (Bild unverändert). `pruef-massstab-leistung` 220/220, 0 über Limit. Spiel 390×844 gegen main: Berlin 548→247 Draw Calls / 3,80→1,51 Mio. Dreiecke, Essen 710→250 / 3,86→1,22, Gütersloh 698→271 / 2,40→1,25, Recklinghausen 961→327 / 2,58→1,26, Hamburg 690→225 / 4,66→1,78, München 461→257 / 4,33→1,44. GPT-Hebel 1 und 2 behalten, Hebel 3 und 4 zurückgenommen (kein Messgewinn, weniger Detail). Offen aus dem alten Auftrag: Stadtaufbauzeit, Woche-weiter-Neubau, Spielstand |
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
| Engine-Formate (Wirtschaft Volkskauf, FUNDUS/Off-Price) | main | **gemergt 21.10.** (#50, 74a5704) | Mittel, 52 Wochen: Volkskauf −2,7 bis −3,6 %, FUNDUS −1,0 bis −1,5 % EBITDA (Claude nachkalibriert); FUNDUS-Zukauf und Altwarefluss folgen der offenen Fläche; Umsatzanteile (je rund 7 % statt 11/9 %) folgen in Maßstab Phase 3. M7 seit 22.10. komplett bestanden: Bot D schließt nach 26-Wochen-Ergebnis (#75), mittel 4,79 % gegen Bot T 4,69 % |
| Q09 Schnee (schwebende Platten) | – | **gemergt 21.10.** (#54, 390b69d) | Schnee liegt auf echten Dachflächen, je Dachebene eingerückt (Claude-Fix: kein Kreuzmuster auf Satteldächern); Winter-Dreiecke unter main, Draw Calls gleich; Fingerabdrücke 112/112 unverändert |
| Q10 Kamera bleibt über Haus | – | **gemergt 21.10.** (#53, 7af4959) | Hausdetail lässt oben Kartenstreifen frei (62 dvh), Kamera bleibt am Haus bei Kachelnachladen, Woche, Scroll, Resize; Mobil-Smoke Berlin 3 Häuser ≤ 40 px; Fingerabdrücke 112/112 unverändert |
| Q11 Eigenmarken Sortiment (Bilder, Kategorien, Zielgruppen) | main | **gemergt 22.10.** (#57, 5aefc30) | Kategoriebaum und Zielgruppen; 7 neue Artikeltypen (139 gesamt). Bilder aus kit/mode (Q25-Fassung von produktbild.js), Q11-Eigenzeichner entfernt; alle 139 Typen mit eigener Silhouette, A-Linien-Rock noch auf `rock` (Q27 Phase 2). Freigabe für Q14, Q17, Q24, Q27–Q29 Phase 2 |
| Q12 Hausbesuch Laufwege | – | **gemergt 21.10.** (#56) | Wegsuche auf Ladenbau-Belegung, 9 Etagen (Warenhaus, Sport, FUNDUS) je 60 s: 0 Kollisionen, 1,17–1,21 m/s, bildratenunabhängig; Claude-Fixes: zweiter Hausbesuch/Hauswechsel scheiterte (Kontext zerstört), Sporthaus-Etagen mit Etagenbau warfen Fehler (`etageNr`); Fingerabdrücke 112/112 unverändert |
| Q13 Sandkasten unbegrenzt | main | **gemergt 22.10.** (#55, 5db9b8b) | Sandkasten ohne Liquiditätsgrenze bei echter GuV und Kapitalfluss; FUNDUS-Eröffnung, Volkskauf-Umflaggen und Wettbewerber-Flächenumbau ebenfalls ohne Grenze (Claude) |
| Q14 Oberfläche gesamt (Gestaltungssystem) | `feat/q14-oberflaeche-design` #51 | **gemergt 22.10.** | GESTALTUNG-UI.md, Tokens, Hausreiter, Organisation, Posteingang, Reise. Claude-Abnahme: Syntaxfehler Organisation (Spiel startete nicht), interne IDs in IT, Wortbrüche in Knöpfen, Kündigen-Knopf Zentrale, Einkauf-Eingaben, Cash-Kachel und Achsen Statistik, Vorstandsnamen, Erfolgsmeldung über der unteren Leiste, Aktion-Chip, Cockpit kompakt (Q10-Smoketest), Markenuntertitel auf dem iPhone aus. Vorher/Nachher 19 Panels bei 390 × 844; Ummo beurteilt auf dem iPhone |
| Q15 Zentrale Abteilungsseiten | `feat/q15-zentrale-abteilungen` (#65) | **gemergt 22.10. (47cd64f)**; Claude: Leitungssatz nach Personalbedarf statt freien Plätzen | `auftraege/wurf2/` |
| Q16 Marketing-Kanäle und Marktanteil | `feat/q16-marketing-kanaele` (#64) | **gemergt 22.10. (12bbab8)**; Claude: öffnet mit aktueller Stadt | `auftraege/wurf2/` |
| Q17 Eigenmarken-Produktkarten (nach Q11) | main | **gemergt 22.10.** (#72) | Produktkarten mit VK-Regler, Preis in allen Häusern / Hauspreis, Absatzübersicht Eigen- vs. Fremdmarke (5 Wochen), Linienprofil; auf Q24 aufgesetzt. Claude: doppelte VK-Beschriftung entfernt, Absatz in Stück |
| Q18 Handelsbote Gestaltung | `feat/q18-handelsbote` | **gemergt 22.10. (#60)**: Serifenkopf, sechs Rubriken, 53 isometrische Motive je Artikelart; Claude: Schildtexte gestaucht, alle Reiter auf 375 px sichtbar; Fingerabdruck unverändert | `auftraege/wurf2/` |
| Q19 IT-Produkte als Karten | `feat/q19-it-produkte` (#63) | **gemergt 22.10. (48ba00c)**; Claude: Abnahmetest repariert, Mobile Pay ohne Ausbau „noch nicht eingeführt“ | `auftraege/wurf2/` |
| Q20 Schwierigkeit je Szenario | `feat/q20-szenario-schwierigkeit` (#58) | **gemergt 22.10. (4cf811a)** | `auftraege/wurf2/` |
| Q21 Warenhaus-Vielfalt je Stadt | `feat/q21-warenhaus-vielfalt` | **gemergt 22.10. (#62)**: jedes Hartwig-Haus einer Stadt eigene Familie/Variante, neue Lage Stadtteilzentrum, Mall-Parkhausvariante; Fingerabdrücke von 106 Städten neu (Warenhausparzellen); Leistung gleich oder leichter als main, Ausnahme Köln +3 Draw Calls bei −4,6 % Dreiecken und Magdeburg +70 Dreiecke (von Ummo als gleichwertig freigegeben) | `auftraege/wurf2/` |
| Q22 Hauspins und Premium erkennbar | `feat/q22-hauspins` | **gemergt 22.10. (#59)**: Pins am Dach, Krone und Name bei Premium, Abzeichen Aktion/Umbau/Warnung; Fingerabdruck unverändert | `auftraege/wurf2/` |
| Q23 Reise Karte und Liste | `feat/q23-reise-karte` | **gemergt 22.10. (#61)**: Deutschlandkarte mit 16 Ländern, Liste als eigenes Blatt bis zur letzten Stadt; Claude: große Städte oben, Berlin auf 375 px antippbar; Fingerabdruck unverändert | `auftraege/wurf2/` |
| Q24 Eigenmarken Deep Dive (nach Q11) | main | **gemergt 22.10.** (#73, 40c431b) | Bedienung Abteilung × Zielgruppe × Kategoriebaum, rein aus dem Engine-Katalog; geprüft mit 318 Typen (179 aus `engine/src/sortiment`, Q27/Q29), alle erreichbar, keiner im Fallback. Teamleistung je Marke. Claude: Bilder der Sortimenttypen in Katalog/Detail, Test auf freie Kategorie, Beschriftung „Designer“ |
| Q25 Produktbilder und Model (Claude) | `q25/feat/q25-produktbilder` (PR #67) | **gemergt 21.10. (97c21aa), CI grün; Model-Stil von Ummo abgenommen; 106 Silhouetten, Model je Produkt** | `auftraege/wurf2/` |
| Q27 Mode-Bilder + Mode-Artikeltypen (Claude-Chat) | main | **abgeschlossen 22.10.**: Phase 1 Bilder #69 (5e11375, 47 Silhouetten, Model mit Händen/Spielbein, Blindtest 100 %), Haken `engine/src/sortiment` #74 (a66f482), Phase 2 #77 (5223fcb, CI grün): 108 Mode-Artikeltypen mit Bild und Baumplatz, kalibrierungsneutral (m7-wochenverlauf identisch) | `auftraege/wurf2/` |
| Q28 Schuhe, Taschen, Accessoires, Wäsche (Claude-Chat) | #70, #78 | **abgeschlossen 22.10.**: Phase 1 Bilder gemergt (d90a530, 58 Silhouetten, Blindtest 58/58 auch in 64 px); Phase 2 gemergt (e5f84ee): 63 Artikeltypen in `engine/src/sortiment/q28-zubehoer.ts` (21 Schuhe, 10 Taschen, 14 Accessoires, 18 Wäsche, je mit `pfad` und `bild`), Wochenverlauf identisch mit main | Bedarf an Q27 aus #70 (Model-Sets, Rucksack-Platz, `bildFuer`) |
| Q29 Home/Living, Beauty, Spielwaren (Claude-Chat) | – | **gemergt 22.10.: Phase 1 #68 (58 Bilder, Blindtest 58/58), Phase 2 #76 (05002930, 71 Artikeltypen mit festem Baumpfad), CI grün, M7 identisch mit main** | Bedarf an Q27: Muster `punkte`/`print` in `stoff.js`, `NAMEN`/`REGELN` in `produkt.js` auf neue Silhouetten |
| Q30 Oberfläche Teil 2: Spiel-Panels (Claude-Chat) | #80 Bausteine, #83 Panels | **gemergt 22.10. (#80, #83)**: Bausteine (#80: dunkle Tokens je Bereich, `komponenten.css/js`, Stilprüfung verbotener Muster in `spiel-render.js --nur-panels`), alle Spiel-Panels umgestellt (#83): Cockpit, Menü, Haus mit Befund der Filialleitung und Etagenschnitt, Posteingang als Umlaufmappen, Wochenbericht, Zeitung, Reise, Deutschland/Häuser, Organisation, Zentrale, Personal, Umbau, Chronik, Statistik, Erfolge, Einstellungen, Wettbewerber, Hausbesuch, Einführung, Start, Spielende. Nach Merge von Q31: 44 Panels (Q30 + Q31) Stilprüfung 0, 469 Werte 0 Abweichungen, CI grün. Q31-Bedarf erfüllt (volle Höhe, Karussell, Erfolgsmeldung über der Kopfleiste statt über dem Blatt) | Ummo beurteilt auf dem iPhone; Ware im Einkauf bei Q31 |
| Q31 Oberfläche Teil 2: Management-Panels (Claude-Chat) | `feat/q31-oberflaeche-management` | **gemergt 22.10.** (#81 Teil 1, #82 c1871e9) nach Q30-Bausteinen #80 | Einkauf (Warenbuch, Orderbuch), Eigenmarken (Kollektionstafel), Produktentwicklung, Merchandise/Allokation/Reduzierung (Bücher), Marketing (Werbeplan, Kampagnenkalender), IT (Generationenleiter), Online (Paketschein), Planung (Planblatt), Reporting (Wasserfall), Vorstand (Sitzungstisch), Spielstände (Aktenregal) im dunklen Zentrale-Look. Summentest `tests/q31-summen.cjs` in `npm test`, Stilprüfung 13 Panels 0 Verstöße, Bildlauf `tests/q31-bilder.cjs` inkl. schlechter Tage. Offen an Q30: Erfolgsbanner überdeckt Panelinhalt. Ummo beurteilt auf dem iPhone |
| Q32 Oberfläche Feinschliff (Claude-Chat) | `feat/q32-feinschliff` (#86) | **gemergt 23.10. (26b35d6), CI grün** | Überlaufursache behoben (#pinhalt ohne Rand im dunklen Blatt + -12-px-Anschnitte), Karussell-Index über Kartenmitte (CDO-Angebot = sichtbare Karte). Farbrollen: Hartwig-Petrol #1F6F8B für Bedienung und Hauptaktion, Rot nur Gefahr, Kosten neutral. Altlook ersetzt: Neues Produkt, Zentrale-Abteilungen (Kit-Porträts, Etagenschnitt), Hausbesuch-Kopf, Reporting-Tabelle. Texte: Dezimalkomma, kein (Q05), ein Gebäudename, keine Doppeltitel, keine Unterstreichungen. Cockpit einzeilig einklappbar, Chipleiste blendet aus. Neue Prüfungen in `--nur-panels` (Überlauf, WCAG AA, helle Flächen, Rot, Kürzel, Dezimalpunkt, Titel, Reiterleiste, HUD); 469 Werte 0 Abweichungen, 56 Panels 0 Verstöße. Ummo beurteilt auf dem iPhone |
| Q33 Sortiment jung: Kinder, Teens, Young Adults ≥ 180 je Zielgruppe (Claude-Chat) | #87 | **gemergt 23.10. (#87)**: sichtbar / eigene Bilder Kinder 190/189, Teens & Tweens 253/250, Young Adults 404/398 (Tests `engine/tests/q33-sortiment.test.ts`, `render/tests/q33-sortiment.test.mjs`). 198 neue Typen (`q33-jung.ts`), 217 Silhouetten (`render/src/kit/mode/q33-*.js`), Sichtbarkeit je Zielgruppe und Baumplatz (`q33-zielgruppen.ts`, Katalog liefert `zielgruppen`). Reiter Kinder nur Kinder und Teens & Tweens, Ast „Baby und Spielzeug“ statt „Kinder und Baby“, „Neues Produkt“ zeigt nur Entwickelbares (`produkte().entwickelbar`): Pünktchen unter Kinder 149 Kinder- und 81 Teens-Typen. Blindtest 205/209, Fehlgriffe neu gezeichnet. Wochenverlauf identisch mit main (286/286), CI grün. Kontaktbögen `bilder/q33-kontakt-*.png` | Ummo beurteilt Kontaktbögen |
| Q34 Sortiment erwachsen: Adults, Best Ager ≥ 180 + Schuhbilder (Claude-Chat) | #84 | **gemergt 23.10. (#84)**: Adults 380, Best Ager 344 Typen, jeder mit eigenem Bild (Test `engine/tests/q34-sortiment.test.ts`: kein Bild-SVG doppelt über alle 445 Typen, Schuhformen farbneutral eindeutig). 64 neue Typen (`q34-erwachsen.ts`), Bild- und Zielgruppenkorrekturen für 130 Typen (`q34-zielgruppen.ts`, Haken `SORTIMENT_KORREKTUREN` für Q33), 22 neue Leisten und 4 Sandalenformen in `q28-schuhe.js`, 27 Freisteller `q34-zubehoer.js`. Blindtest 364/380, Nachbesserungen erkannt. Wochenverlauf byte-gleich mit main, CI grün. Bedarf an Q27: Steppung (Steppjacke, -weste, -mantel) und Poncho in 64 px schwer erkennbar | Ummo beurteilt Kontaktbögen |
| Q35 Zahlen, Widersprüche, Spieltiefe (Claude-Chat) | #85 | **gemergt 23.10. (6350f29)**, CI grün: Verläufe und Cockpit ab Spielstart aus dem Vorlauf; Zentrale, Controlling (`abteilungPlaetze`) und Hausbesuch je eine Quelle, Test `render/tests/q35-zahlen.cjs`; Personaleinsatz streut (Krankenstand je Haus und Woche, regionale Krankheitswellen mit Posteingang, 3 Punkte Mehrarbeitspuffer); Services und Kostenverbrauch je Haus verschieden (netzweit neutral), Befund nennt größte Abweichung; Freigaben: Grenze 1 Mio. €, Sammelorders je Bereich und Typ, erste Woche disponiert der Vorgänger (Okt-Start 2 bis 19 offen statt 200). M7: Bot T 9/9 gleich oder besser, ohne Eingriffe −0,15 bis −0,3 PP | Offen (schon auf main nicht bestanden): „Bot D mittel ≥ Bot T“ (4,33 % gegen 4,64 %), Bot-D-Schließregel als eigener Auftrag |
| Q36 Stadt- und Hausgrafik (Claude-Chat) | #88 | **gemergt 23.10. (986eba6), CI grün** | Schriftzug als ganzes Wort (nie zerstückelt), Ausweichlage bei Verdeckung durch Nachbarn (`render/schriftzug-lage.json`, 11 Häuser, Werkzeug `scripts/q36-schriftzug-lage.cjs`); Dachlandschaft (Technikzentrale, Rückkühler, Sheds/Lichtbänder, Lüftungskanal, Solar) statt Kuppelraster; Pin auf Dachkante über dem Eingang, nie auf dem Schriftzug; Hausbesuch-Figuren maßstabsgerecht. Prüfregel `pruef-q36.js` 220/220 Städte 0; Q02-Gestaltung gleich main; Leistung alle 220 Städte gleich/besser (−945 Draw Calls, −42.790 Dreiecke); 187 Fingerabdrücke neu (Warenhausdach/Schriftzug). Bilder `bilder/q36/` |
| Q26 Meldungen und Speichern | `feat/q26-meldungen-speichern` (#66) | **gemergt 22.10. (e18e09c)**; Ursache Speichern: 22,4 MB Rohstand nach 52 Wochen → jetzt gepackt + gzip 3,35 MB | `auftraege/wurf2/` |
| Q08 Fünf Premiumhäuser | main | **gemergt 22.10.** (#49, 685b42b) | 561 Häuser; P005 „Hartwig Leipziger Platz“ (Berlin, eigener Bau neben P001); P003/P004 fiktiv umbenannt. Haus-EBITDA Jahr 1 mittel +1,8 bis +6,7 %. Fingerabdrücke neu: München (P002 sechs Geschosse), Hamburg, Düsseldorf (Namen) |
| Q06 Marktbeobachtung (Meldungen filtern) | main | **gemergt 21.10.** (#47) | – |
| Q07 Vertriebssteuerung (Region bis Haus, Vorjahr, Startmonat, Mietverträge) | main | **gemergt 22.10.** (#52, dad3d98) | Drilldown Region → Cluster → Haus je Format, 52 Wochen Vorjahr, Startmonat Jan/Apr/Jul/Okt, Mietverträge als Sammelvorlage. Claude: Typfehler Mietvertrags-Delegation, Vorjahr über Stützwochen (Spielstart 1,3 → 0,5 s), Vorjahr auch für Volkskauf/FUNDUS, Formatzeilen aus dem Cockpit, Häuserleiste nach unten (Karte war auf dem iPhone nicht mehr antippbar); M7 unverändert gegenüber main |
| Reise und Wochenabschluss 1 und 2 | – | gemergt | – |

## Wurf 4: Referenzsortiment (Stand 25.10.2026)
Aufträge `auftraege/wurf4/` (README mit Regeln und Daten). Reihenfolge: Q37 zuerst, Q38–Q41 parallel, rebasen auf Q37.

| Auftrag | Inhalt | Stand |
|---|---|---|
| Q37 Musterfeld, Anlass, Freischaltungen | Musterfeld mit 16 Mustern + Trends, 28 Muster-Typen → Grundtyp + Muster, Kategorie Anlass (7 Unterkategorien), 112 Freischaltungen, Cargo-Dublette | offen |
| Q38 Oberteile | 50 neue Typen | offen |
| Q39 Unterteile und Kleider | 50 neue Typen | offen |
| Q40 Jacken, Schuhe, Wäsche | 45 neue Typen | offen |
| Q41 Accessoires, Taschen, Schmuck, Beauty | 50 neue Typen | offen |

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
6. ~~Engine-Formate~~ gemergt 21.10. (#50); ~~Bot D~~ gemergt 22.10. (#75), M7 bestanden.
7. Danach Build-Zug: Spiel einpacken, Update aufs iPhone, Messung.
