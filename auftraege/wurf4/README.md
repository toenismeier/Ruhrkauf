# Wurf 4: Referenzsortiment ins Spiel (Q37–Q41, Claude-Chats)

**Ummo 25.10.2026:** Neue Artikeltypen aus dem Realabgleich mit Bershka, Pull&Bear, Stradivarius, New Yorker und Viviry (7.454 Artikel, je Artikel ein Kontaktbogen, Auswertung Opus 5.5). Per Auswahl entschieden:
- **Neue Typen ab 3 Artikeln** im Referenzsortiment: 195 Typen (Q38–Q41). Die 131 seltenen Typen: 83 neue Typen und 35 Varianten in Q42, 13 draußen.
- **Alle 112 Freischaltungen** (Typ gibt es, Zielgruppe fehlt): Q37.
- **Musterfeld kommt** (auch für spätere Lizenz-Kooperationen, z. B. Disney): Q37.
- **Kategorie Anlass mit Unterkategorien** (eigene Eigenmarke möglich): Q37.
- Keine Kinder-Festmode (keine Quelle).

## Daten
- `daten/q38-typen.csv` … `daten/q41-typen.csv`: je neuer Typ Häufigkeit im Referenzsortiment, Zielgruppen (Teens 12–17, Young Adults 18–24, Adults ab 25; Typ zählt für eine Gruppe ab 30 % ihrer Artikel), Anteile, Preismedian, Shops, typische Merkmale und **drei Vorlage-Bögen**.
- `daten/q37-freischalten.csv`, `daten/q37-mustertypen.csv`, `daten/muster-anteile.csv`, `daten/anlass-zuordnung.csv`: Grundlage für Q37.
- Vorlage-Bögen liegen in **privaten** Repos `toenismeier/hartwig-ref-p01…p10` (Pfad `boegen/<Block>/<shop>_<artikel>.jpg`; Auswertung je Artikel in `auswertung/<Block>.csv`). Zugriff im Claude-Chat über das Repo-Werkzeug (nur lesen).

## Regeln für alle
- **Fremdbilder nie in dieses Repo** (öffentlich, E38). Die Bögen sind nur Zeichenvorlage: Schnitt, Proportion, Details abschauen, dann im eigenen Stil zeichnen. Keine Marken, Logos, Schriftzüge realer Firmen.
- Bildregeln wie `auftraege/wurf2/produktbilder-regeln.md` (ein Stil, Schnittmaße, Blindtest 64 px durch frischen Subagenten, Model-Platz).
- Neue Typen je Chat in eigener Datei `engine/src/sortiment/q38-oberteile.ts` usw. (Haken in `index.ts` wie Q33/Q34), Bilder in `render/src/kit/mode/q38-*.js` über `erweiterung-q38.js` usw.
- Namen vorher gegen main prüfen (`ARTIKELTYPEN` inkl. Sortimentsdateien), keine Dubletten. Nach Merge von Q37 gilt das Musterfeld: neue Typen ohne Muster im Namen.
- Zielgruppe über `G(kinder, jung, mitte, reif)` und Q33/Q34-Korrekturen so setzen, dass die Zielgruppen aus der CSV herauskommen (Test).
- Preis (mitte) am Preismedian ausrichten, Warenhaus-Niveau (Eigenmarke) darf leicht darüber liegen.
- Kalibrierung neutral: `engine/scripts/m7-wochenverlauf.ts` identisch mit main, neue Typen nur in der Auswahl, nicht im Startsortiment. Alte Spielstände laden.
- Abnahme: `npm test` in engine und render, Blindtest ≥ 95 %, Kontaktbogen aller neuen Bilder 64 px an Ummo, CI von Hand, selbst mergen, `auftraege/STATUS.md` nachziehen, App packen.

## Reihenfolge
Q37 zuerst (Musterfeld ändert Typnamen), Q38–Q41 starten parallel und rebasen auf Q37, sobald gemergt. Q42 startet nach Merge von Q37–Q41.
