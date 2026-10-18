# Archetyp-Module (Plugin-Registry)

Regionsmodule erweitern Stadttypen, Flächen, Slots und Häuserreihen, ohne `stadtplan.js`, `stadt.js` oder `bauer.js` anzufassen.
Die vollständige, verbindliche Beschreibung (alle Felder von `E`, alle Hilfen `H`, vollständiges Beispiel) steht oben in
`src/kit/stadtplan.js`. Diese Datei ist die Kurzfassung.

## Ablage und Laden

- Ein Modul liegt in `src/kit/archetypen/<name>.js` und registriert sich beim Import (Seiteneffekt, keine Exporte nötig).
- `src/kit/archetypen/index.js` importiert alle Module. Neues Modul: dort eine Zeile `import './<name>.js';` ergänzen.
- `index.js` wird von `stadt.js` und `staedte.js` importiert. Wer `stadtplan()`, `baueStadt()`, `echterBauer()` oder
  `STADTLISTE` benutzt, kennt damit automatisch alle registrierten Typen.
- Ein Modul darf `stadtplan.js`, `bauer.js`, `basis.js` und eigene Bau-Dateien (z. B. `nordbauten.js`) importieren,
  aber **nie** `stadt.js`, `staedte.js` oder `archetypen/index.js` (Zirkelimport).

## API

```js
import { registriereArchetyp, PLAN_HILFE as H } from '../stadtplan.js';
import { registriereSlots, registriereStilProfil } from '../bauer.js';
```

### `registriereArchetyp(name, def)`

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `name` | ja | Anzeigename, z. B. `'Hansestadt'` |
| `gewicht` | nein | `[metropole, grossstadt, mittelstadt]`, Zufallsgewicht. `[0,0,0]` = nur über `staedte` |
| `entwurf(E, H)` | ja | baut Raster, Linien, Flächen, setzt `E.viertel` usw. (siehe stadtplan.js) |
| `basis` | nein | Name eines vorhandenen Archetyps, dessen Entwurf vorher läuft |
| `viertel` | nein | neue Viertelarten `{ name: { dk, var, stile, fachwerk } }` |
| `landmarken` | nein | neue Landmarken-Slots `{ 'slot:x': { art, breite, tiefe, gewicht } }` |
| `flaechen` | nein | neue Flächenarten `{ art: { parzelliere(ctx, E, b, H), boden(ctx, b, r, teile, B) } }` |
| | | optional je Art: `ohneGehwegPlatte: true` (stadt.js legt keine Gehwegplatte unter den Block) und `nachBau(ctx, b, wasser, B)` (läuft nach allen Slots; `wasser` = Liste der `erg.wasser`-Rechtecke `[x0, z0, x1, z1]` der Slots im Block, z. B. um den Boden unter abgesenktem Slot-Wasser auszusparen, Beispiel `archetypen/nord.js`) |
| `parzellierung(ctx, E, b, H)` | nein | eigener Bebauungsplan je bebautem Block, `true` = erledigt |
| `nachbearbeitung(ctx, E, b, H)` | nein | nach der Blockrandbebauung (Parzellen umwidmen, zusammenlegen) |
| `nachPlan(E, H, g)` | nein | einmal nach allen Blöcken (z. B. Heizwerk) |
| `stilProfil` | nein | Name eines Stilprofils für die normalen Stadthäuser (String oder `(p, E) => String`) |
| `staedte` | nein | `{ Stadtname: extra }`: diese Städte aus haeuser.json bekommen den Archetyp (extra wie in staedte.js) |
| `ddr` | nein | `true` = Stadt der ehemaligen DDR (Tatra-Bahnen, Ost-Autos) |

### `registriereSlots(map)` (bauer.js)

`{ 'slot:speicher': (S, scene, p) => ({ hoehe }) }`. Gilt für jeden `echterBauer()`, überschreibt gleichnamige Slots.

### `registriereStilProfil(name, fn)` (bauer.js)

`fn(p, nachbar, B)` wird für jedes normale Stadthaus, Eckhaus und Hofhaus aufgerufen, dessen Parzelle
`p.stilProfil === name` trägt (gesetzt über `def.stilProfil`). Profilname `'region:<region>'` (z. B. `'region:nord'`)
greift für alle Parzellen dieser Region ohne eigenes Profil. Rückgabe:

- `null` / `undefined`: Standard-Stadthaus (`zufallsStadthaus`)
- `{ stil, geschosse, region?, ... }`: `stadthaus()` mit diesen Optionen
- `{ bau(S, scene, q) }`: eigener Generator, Rückgabe `{ hoehe, stil?, farbe?, geschosse? }`

`nachbar` = `{ stil, farbe, geschosse }` des Vorgängers in der Reihe (oder `undefined`).
`p.viertel` sagt, in welchem Viertel das Haus steht.

## Wasser, Ufer, Brücken, Diagonalen

- Wasserflächen (beide Richtungen): `brueckeP` (Nebenstraßen), `brueckenAbstand` (m), `brueckenZahl` (genau n,
  gleichmäßig), `keineBruecke`. Ohne Brücke bleibt der Fluss durchgehend (kein Zerfall in Becken). `E.brueckenAbstand`
  gilt für alle Flüsse einer Stadt.
- Landflächen: `ohneUferstrasse: true | ['+z', …]` lässt die Straße zum angrenzenden Wasser weg, der Block reicht bis
  an die Kaikante (Speicherstadt, Hafenkai, Medienhafen; Beispiele `nord.js`, `west.js`).
- `E.diagonalen = (g) => [{ C, winkel, t0, t1, breite, gehweg }]`: diagonale Straßen durch die Blöcke (Karlsruher
  Fächer, `sued.js`), Parzellen werden gekürzt oder entfernt, Restflächen werden Zwickel.
- Bahn als Spalte: `nimm(E, { art: 'bahn', achse: 'z', seite: '+x' | '-x', bahnhofLinie: l })` (Gleise entlang z).

## Stadtrand, Küste, Berge

- `extra.umland: 'see'` legt die Küste in den Stadtrandgürtel (`stadtrand.js`); `extra.seeArt: 'binnen'` = Binnensee mit
  Waldufer, sonst Meer hinter einem 150-m-Landstreifen; `extra.kueste: '-x' | '+x' | '-z' | '+z'` erzwingt die Seite.
  Inaktive Zellen ovaler Städte werden Vorort, nie Wasser.
- `E.berge = [{ seite: '-x' | '-z', inhalt: 'wein' | 'wald' | 'alpen' | …, burg?: 'festung', u?, abstand? }]`: Berg im Gürtel
  ab der Kartenkante (ohne Kulisse in der Karte); Flächen `kulisse` (sued.js) setzen ihren Hang dort automatisch fort.

## Einkaufslage, Standorte

Ein Entwurf baut nur Raster und Flächen. Die Einkaufslage (Haupteinkaufsstraßen, Hartwig-Slots) legt `stadtplan()`
danach selbst an. Blöcke mit Standort-Slots laufen ebenfalls durch `parzellierung`/`nachbearbeitung`; dort ist
`H.slotsImBlock(ctx)` die Liste der Standort-Parzellen, die nicht verändert werden dürfen.

## Beispiel

Siehe `src/kit/archetypen/ost.js` (sechs Ost-Typen, Flächen `aufmarsch`, `hafen`, `brache`, `platte`, Stilprofil `ost`)
und das Minimalbeispiel oben in `src/kit/stadtplan.js`.
