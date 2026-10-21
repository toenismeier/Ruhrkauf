# Q16: Marketing – Kanäle als Karten, Markenbekanntheit, Marktanteil je Stadt

**Vorlage:** `testflight/vorlage-coffee/02.png` bis `06.png`.

**Umsetzung bei Hartwig:**
1. **Marktanteilsring je Stadt:** Hartwig, Volkskauf, FUNDUS, Wettbewerber (Wettbewerber-Engine) als Ring, Wahrzeichen der Stadt in der Mitte, Städte zum Durchwischen; Stadtsymbole als Auswahlreihe.
2. **Markenbekanntheit je Stadt** als Balken 0–100 (Image je Stadt aus der Engine; wo es nur Konzern-Image gibt, Stadtwert aus Image × Marketingdruck × Präsenz ableiten, neutral im Standard).
3. **Kanäle als wischbare Karten** je Stadt/Region: Prospekt, Plakat, TV, Online, Radio, Mailing/Kundenkarte. Je Karte Illustration mit Hartwig-Logo, zwei Sätze Erklärung, „betreut von Inhouse / Agentur“, Teamzuweisung „+1“, **Wochenbudget-Regler**. Engine-Kanallogik (`engine/src/marketing*.ts`) nutzen, keine zweite Logik.
Illustrationen als Katalogmodul; Claude rendert.

**Abnahme:** Katalog im iPhone-Format, Budgetänderung wirkt identisch wie die bisherige Kanalsteuerung (Test), Werbequote im Standard 1,8 %.
