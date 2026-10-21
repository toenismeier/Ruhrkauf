# O04: Personal – Einsatz in vier Gruppen

Branch `feat/op-personal`. Baut auf O01 (Bereich Personaleinsatzplanung, Hauscluster) und O02 (Treiber Kaufquote). Zuerst lesen: `auftraege/operativ/README.md`, `o01`, `o02`.

## Ziel
Personal ist der größte operative Hebel nach der Ware. Jedes Haus hat vier Personalgruppen. Die Personal-Abteilung plant den Einsatz je Woche mit Wochentagsprofil. Wie gut sie das tut, hängt an ihrer Qualität. Der Spieler kann übersteuern.

## 1. Engine (`engine/src/personaleinsatz.ts`)
1. **Gruppen je Haus:**

   | Gruppe | Treibt | Engpass zeigt sich als |
   |---|---|---|
   | Instore-Logistik | Ware vom Hauslager auf die Fläche, Umetikettieren, Saisonwechsel | Verfügbarkeit auf der Fläche sinkt (Faktor für O05), Altware bleibt hängen |
   | Verkauf | Beratung → Kaufquote, stark in beratungsintensiven Gruppen (Feld `beratung` in `daten.ts`) | Kaufquote sinkt |
   | Kasse | Wartezeit → Kaufabbrüche | Kaufquote sinkt an Spitzentagen |
   | Verwaltung | Hausleitung, Personal-, Kassenbüro; weitgehend fix | Fehler, Inventurdifferenzen |

   Die heutigen FTE (`haus.personal`) werden beim Start nach festen Anteilen auf die vier Gruppen verteilt (Startwerte in der PR begründen), die Kosten bleiben gleich.
2. **Bedarf je Gruppe** aus Frequenz und Umsatz (O02), Fläche, Anlieferungen, Reduzierungen:
   - verteilt auf ein **Wochentagsprofil** Mo bis Sa (Samstag Spitze, Montag schwach, Dezember stärker),
   - plus Krankenstand (saisonal, Grippewelle Januar/Februar) und Urlaub (Sommer).
3. **Einsatzplan** je Haus und Woche: Stunden je Gruppe und Tag, dazu Aushilfen.
   - Den Vorschlag macht der Bereich Personaleinsatzplanung. `bereichsQualitaet` bestimmt, wie genau er die Frequenz je Tag trifft und wie gut er Spitzen deckt.
   - Der Spieler kann je Hauscluster oder Haus übersteuern: mehr oder weniger Stunden je Gruppe, Aushilfenquote.
4. **Wirkung über die Treiber** (O02):
   - Unterdeckung Verkauf senkt die Kaufquote nach Beratungsintensität.
   - Unterdeckung Kasse senkt die Kaufquote an Spitzentagen.
   - Unterdeckung Instore-Logistik senkt die Verfügbarkeit (Quelle `'personal'`).
   - Überdeckung kostet nur Geld.
5. **Springerpool je Hauscluster:** Ein Teil der Stunden lässt sich zwischen Häusern des Clusters verschieben. Die Clusterleitung macht das nach ihrer Qualität, der Spieler kann es anweisen.
6. **Öffnungszeiten** kommen aus O07 (Standards), solange nicht da: feste Startwerte.
7. **Saison Weihnachten:** Aushilfen für den Dezember müssen bis KW 44 eingeplant sein (Vorlage des Bereichs im Oktober), sonst sind sie knapp und teurer.
8. **Personalwirtschaft:** Fluktuation nach Stimmung, Einarbeitung neuer Kräfte (4 Wochen halbe Wirkung), Aus- und Weiterbildung als Bereich, der die Wirkung je Stunde hebt.

## 2. Oberfläche
- Im Hausdetail ein Reiter „Personal“: vier Gruppen als Balken Bedarf gegen Plan je Wochentag, Engpässe rot, Regler zum Übersteuern.
- Seite „Personaleinsatz“ je Hauscluster: Tabelle der Häuser mit Deckungsgrad je Gruppe, Springerbewegungen, Aushilfen, Krankenstand.
- Vorlagen des Bereichs: „Aushilfen Weihnachten: 3 Optionen“, „Cluster Ruhr West: Kasse samstags unterdeckt“.

## Abnahme
- Tests: Neutral im Standard. Weniger Kassenstunden am Samstag senkt die Kaufquote an Samstagen. Höhere Bereichsqualität trifft das Profil besser (Abweichung Bedarf gegen Plan sinkt). Springer verschieben nur innerhalb des Clusters.
- Bot C: Strategie unverändert, überlebt 5 Jahre.
