# Q36: Stadt- und Hausgrafik nach Wurf 3 (Claude-Chat)

Branch `feat/q36-stadt-haus-grafik`. Befunde `testflight/wurf-3/BEFUNDE.md` 17 (Büsten), 21, 22.

## Umfang
1. **Schriftzug „HARTWIG“** am Haus darf nie zerstückelt oder von Nachbargebäuden/Fassadenelementen überdeckt sein (Aachen: „A‿TWIG“). Schriftzug an Fassadenlänge anpassen, sonst kürzer (Logo „H“). Prüfregel über alle 112 Städte: Schriftzug vollständig sichtbar aus der Standardkamera.
2. **Dach:** große Warenhausdächer nicht leer-gleichförmig: Lichtbänder/Oberlichter, Technikzentrale, Lüftungsreihen, Wartungswege, ggf. Dachparkdeck je Baujahr/Familie (Coffee-Vorlage 15: abwechslungsreiche Dächer). Leistung beachten (Draw Calls/Dreiecke je Stadt nicht schlechter als main, Instancing).
3. **Pin:** sitzt auf der Fassade/Dachkante über dem Eingang, nicht frei schwebend mitten über dem Dach (vgl. Q22).
4. **Hausbesuch-Büsten:** riesige hautfarbene Kugeln (Schaufensterbüsten/Köpfe) durch maßstabsgerechte Büsten/Puppen ersetzen.

## Abnahme
Vorher/Nachher Aachen, Essen, Berlin, Bielefeld aus Standardkamera und Nahzoom; Prüfregeln 112/112 Städte 0; Fingerabdrücke nur für geänderte Städte neu, mit Begründung; Leistung je Stadt nicht schlechter als main; `npm test`, CI von Hand, selbst mergen, STATUS.
