# O09: E-Commerce als Kanal

Branch `feat/op-ecommerce`. Baut auf O03 (E-Commerce-Plattform, Warenwirtschaft) und O05 (Clusterbestand). Zuerst lesen: `auftraege/operativ/README.md`, `o03`, `o05`.

## Ziel
Festlegung von Ummo: hartwig.de wird ein **eigener Kanal, mit den Häusern verknüpft**: Click & Collect, Versand aus dem Haus, Retouren, Fulfillment eigen oder Dienstleister, Kannibalisierung der Häuser.

## 1. Engine (`engine/src/ecommerce.ts`)
1. **Onlineumsatz** je Woche und Warengruppe. Bestimmt durch:
   - Sortimentsbreite online (Anteil des Bestands online sichtbar),
   - Verfügbarkeit (Zentrallager plus Häuser bei Versand aus dem Haus),
   - Plattformgeneration (O03),
   - Marketing (Kanäle Online, CRM, App),
   - Preis,
   - Lieferzeit.
   - Startwert: Onlineanteil 8 % am Hartwig-Umsatz. Die Ausgangslage bleibt neutral: Der Onlineumsatz ist im Start bereits im heutigen Umsatz enthalten und wird nur ausgewiesen (Aufteilung, keine Erhöhung).
2. **Fulfillment:**
   - **Dienstleister** (Start): Kosten je Paket, Kapazität mit Spitzenpreisen im Dezember.
   - **Eigenes Lager:** Investition, niedrigere Stückkosten, Fixkosten.
   - Wechsel als Projekt mit Laufzeit, vergleichbar O03.
3. **Click & Collect:** Bestellung online, Abholung im Haus.
   - Braucht die Abholstation (O07 Services) und Instore-Logistik-Stunden (O04).
   - Bringt Frequenz ins Haus: Ein Teil der Abholer kauft zusätzlich (Treiber Frequenz und Kaufquote).
4. **Versand aus dem Haus (Ship-from-Store):** Onlinebestellungen werden aus dem Clusterbestand (O05) bedient.
   - Höhere Verfügbarkeit online, Abbau von Altware in den Häusern.
   - Kostet Instore-Logistik-Stunden. Je Cluster einschaltbar.
5. **Retouren:** Quote je Warengruppe (Damen hoch, Beauty niedrig), Kosten je Retoure.
   - Retoure im Haus möglich, dann Ware zurück in den Clusterbestand, plus Frequenz.
6. **Kannibalisierung:** Ein Teil des Onlinewachstums kommt aus den Häusern derselben Region, stärker bei Häusern mit schlechtem Kundenscore. Ausgewiesen in der Umsatzbrücke (O02) als eigener Effekt „Online“.
7. **Kennzahlen:** Onlineumsatz, Anteil, Conversion online, Retourenquote, Kosten je Bestellung, Deckungsbeitrag online, Click-&-Collect-Anteil.
8. Der Bereich E-Commerce (O01) und der CDO steuern nach ihrer Qualität: Sortiment online, Lieferversprechen, Aktionen online.

## 2. Oberfläche
- Seite „Online“ (`render/src/ui/ecommerce.js`): Kennzahlen, Verlauf, Fulfillment-Modell, Schalter je Cluster für Versand aus dem Haus, Click-&-Collect-Häuser.
- Im Haussteckbrief: Abholungen, Versand aus dem Haus, Retouren im Haus.
- Grafik: An Häusern mit Abholstation ein kleines Schild „Abholstation“ am Eingang und Paketboxen im EG (Kit-Erweiterung, Katalog `abholstation.js`, Claude rendert).

## Abnahme
- Tests:
  - Neutral im Standard (Onlineanteil nur ausgewiesen).
  - Versand aus dem Haus senkt die Altware im Cluster und kostet Instore-Stunden.
  - Kannibalisierung erscheint in der Brücke.
  - Fulfillment-Wechsel ändert die Kosten je Paket.
- Bot C unverändert überlebensfähig.
