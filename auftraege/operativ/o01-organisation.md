# O01: Organisation – Hauscluster, Leitungen, Bereiche, Berichtslinien

Branch `feat/op-organisation`. Zuerst lesen: `auftraege/operativ/README.md`, `engine/src/vorstand.ts`, `engine/src/hq.ts`.

## Ziel
Wie bei Coffee Inc 2 führt der Vorstand spezielle Abteilungen. Hartwig bekommt zwei Linien:
- die **Zentrale** mit Vorstand und Bereichsleitungen,
- den **Vertrieb**: Haus → Hauscluster → Region → CSO.

In beiden kann der Spieler selbst steuern oder delegieren. Fehlt ein Vorstand, berichten dessen Bereichsleitungen direkt an den Spieler: mehr Kontrolle, mehr Vorlagen im Posteingang.

## 1. Hauscluster (Vertrieb)
1. `engine/src/organisation.ts`, Funktion `bildeHauscluster(s)`, einmal am Ende von `neueWelt` aufgerufen. `welt.ts` bekommt nur diese eine Zeile.
2. **Fest nach Geografie:**
   - Innerhalb jeder der fünf Regionen werden die Häuser über die Koordinaten (`KOORDINATEN` in `standorte.ts`) zu Clustern mit 6 bis 12 Häusern gruppiert.
   - Verfahren: Start beim nördlichsten Haus, nächste Nachbarn bis zur Zielgröße, danach das nächste freie Haus. Deterministisch ohne Zufall.
   - Namen nach Raum („Ruhr West“, „Rheinland Süd“, „Oberbayern“), aus einer Namensliste je Region in `daten.ts`. Bei Doppelungen kommt eine Nummer dazu.
   - Ergebnis: rund 15 Cluster in der heutigen Welt, rund 55 in der Maßstab-Welt.
3. **Sondercluster „Premium & Flagships“:**
   - Die Premium-Häuser (`klasse: 'premium'`) sind fest darin.
   - Flagships wählt der Spieler aus den größten Hartwig-Häusern, höchstens 12, über die Aktion `{ typ: 'flagship'; haus: string; an: boolean }`.
   - Ein Wechsel kostet einmalig Unruhe: Stimmung des Hauspersonals −10, 8 Wochen.
   - Ein Flagship verlässt seinen geografischen Cluster für die Steuerung, zählt in Rankings aber weiter dort mit.
4. **Clusterleitung als Person:**
   - Name, Porträt (wie Vorstand, `kit/portraet.js`), Qualität 0..1, Gehalt, Stimmung, Wechselwille.
   - Aktionen: einstellen aus Kandidatenliste (3 Kandidaten, Qualität kostet Gehalt), ersetzen, Halteprämie.
   - Wirkung: Faktor auf alle Häuser des Clusters. Standard so normiert, dass die Start-Clusterleitungen im Mittel 1 ergeben.
   - Gute Hausleitungen können zur Clusterleitung befördert werden. Das Haus verliert seine Leitung, die Stellvertretung übernimmt.
5. **Regionalleitung:** Je Region eine Person, gleiche Mechanik. Ohne Regionalleitung berichten die Clusterleitungen der Region direkt an den CSO bzw. an den Spieler.

## 2. Bereiche (Zentrale)
1. **Bereichsliste** `BEREICHE` in `organisation.ts`, je Bereich: `id`, Name, Ressort, HQ-Abteilung (vorhandene `AbteilungId` aus `hq.ts` oder neu), Beschreibung:

   | Ressort | Bereiche |
   |---|---|
   | CFO | Konzerncontrolling, Vertriebscontrolling, Finanzen, Recht |
   | CPO | Einkauf Damen, Einkauf Herren & Kinder, Einkauf Beauty & Accessoires, Einkauf Wohnen & Spielwaren, Einkauf Food, Merchandise Planning, Allokation & Nachschub, Preis- & Reduzierungsmanagement, Eigenmarken |
   | CSO | Vertriebssteuerung, Store Operations, Flagship-Management |
   | COO | Logistik, Flächenmanagement, Immobilien, Bau & Ladenbau, Facility & Energie |
   | CHRO | Personaleinsatzplanung, Recruiting, Aus- & Weiterbildung, Arbeitsbeziehungen |
   | CMO | Marketing, CRM, VM & Deko |
   | CDO | E-Commerce, IT, BI & Daten |

   Der CRO (Restrukturierung) bleibt wie er ist (geparkt).
2. **Bereichsleitung als Person** je Bereich, Mechanik wie die Clusterleitung. Abteilungen darunter bleiben Stufe und FTE wie heute in `hq.ts`.
3. **`bereichsQualitaet(s, b)`** = Leitung × Stufe der HQ-Abteilung × Vorstandsfaktor × `itDeckel(s, b)`, normiert auf 0..1.
   - Vorstandsfaktor: Ist der Ressortvorstand besetzt, hebt bzw. senkt er nach seiner Führung um ±15 %. Ist er nicht besetzt, gilt 1, und die Leitung berichtet an den Spieler.
   - `itDeckel` ist bis O03 ein Platzhalter, der 1 liefert.

## 3. Berichtslinien und Delegation
1. **`berichtetAn(s, b)`:** der Ressortvorstand, wenn besetzt, sonst `'spieler'`. Für Clusterleitungen: Regionalleitung, sonst CSO, sonst Spieler.
2. **Delegation je Bereich und je Cluster:** `{ typ: 'delegation'; bereich: BereichId; an: boolean }`. Die heutigen `DELEGATIONEN` in `vorstand.ts` werden den Bereichen zugeordnet (Tabelle in der PR), die Aktionen bleiben kompatibel.
3. **Vorlagen:** Bereiche und Clusterleitungen erzeugen Vorlagen (`neueVorlage`), etwa „Saisonbudget HW: 3 Optionen“ oder „Cluster Ruhr West: Springer für Essen“. Der Weg hängt an der Berichtslinie:
   - berichtet an einen Vorstand und delegiert: Der Vorstand entscheidet Routine selbst nach seiner Qualität, nur Grundsätzliches kommt gebündelt zum Spieler,
   - berichtet an den Spieler: jede Vorlage einzeln in den Posteingang.
   - Nach Ablauf der Frist läuft der Vorschlag der Leitung durch.
   - In diesem Auftrag erzeugt nur die Organisation selbst Vorlagen (Personalwechsel, Kandidaten). Die Fachaufträge O04 bis O09 hängen ihre Vorlagen an.
4. **Ein Beispiel durchspielen:** CPO entlassen → in der nächsten Woche kommen die Vorlagen der Einkaufsbereiche einzeln. CPO einstellen → gebündelt. Als Test.

## 4. Oberfläche
1. **Organigramm** (`render/src/ui/organisation.js`, Menükachel „Organisation“):
   - Zwei Reiter, Zentrale und Vertrieb.
   - Zentrale: Ressorts mit Vorstand, darunter die Bereiche als Karten (Porträt, Qualität als Balken, Stufe, delegiert ja/nein, Anzahl offener Vorlagen).
   - Vertrieb: Regionen, darunter Cluster mit Häuseranzahl, Umsatz, Ampel.
   - Unbesetzte Stellen rot mit „besetzen“.
2. **Karte:** Auf der Deutschlandkarte (Reise-Panel) Cluster als farbige Flächen bzw. Punktgruppen. In der Stadt zeigt der Stadtchip den Clusternamen.
3. **Personenkarte** für Cluster-, Regional- und Bereichsleitungen wie im Vorstandspanel.

## Abnahme
- Tests: Cluster deterministisch, jedes offene Haus in genau einem geografischen Cluster, Clustergröße 6 bis 12 (Ausnahme: Restcluster in kleinen Regionen, begründet), Premium immer im Sondercluster. Neutral im Standard (README Regel 1). Berichtslinien-Test aus 3.4.
- `spiel-render.js` 0 Abweichungen. Neue Prüfung: Organigramm öffnen, CPO entlassen, eine Woche, Vorlagen der Einkaufsbereiche im Posteingang.
