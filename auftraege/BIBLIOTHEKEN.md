# Vorgemerkte Bibliotheken (Stand 26.10.2026)

In `render/package.json` aufgenommen, noch von keinem Code genutzt. Der Spiel-Bundle ändert sich erst, wenn ein Auftrag sie importiert. Leistung bleibt Abnahmekriterium.

| Paket | Zweck in Hartwig |
|---|---|
| `@three.ez/instanced-mesh` | InstancedMesh2: BVH-Culling je Instanz, Raycasting (Hauspins), LOD, Schatten-LOD für Bäume, Figuren, Fahrzeuge |
| `@three.ez/batched-mesh-extensions` | BatchedMesh mit LOD je Geometrie und BVH, Draw Calls senken |
| `recast-navigation` | Navmesh je Grundriss vorab erzeugen, Crowd im Hausbesuch (Figuren laufen nicht mehr durch Regale) |
| `yuka` | Steering, Pfad folgen, Passanten auf Gehwegen |
| `camera-controls` | Kamera: Begrenzung, Touch-Gesten, Trägheit, orthografisch |
| `three-fenestra` | Interior Mapping für Fenster und Schaufenster (Raum je Fenster deterministisch) |
| `gltfpack` (dev) | Meshes zusammenführen, Instancing, Vereinfachen für Fernstufen |
| `@gltf-transform/cli` (dev) | glTF prüfen, schweißen, komprimieren |

Werkzeuge und Referenz-Code auf Ummos Rechner: `C:\Users\Ummo\Desktop\Projekte\WH\werkzeuge` (bin: OSM2World, citygml-tools, gltfpack; referenz: tokyo, streets-gl, traffic-simulation-de, three-fenestra, KayKit-Pakete).

Lizenz traffic-simulation-de vor Übernahme von Code prüfen. Kaufassets (z. B. Synty) nie ins öffentliche Repo.

## Im Einsatz (01.11.2026, E51)
- `three-fenestra`: Pilot Fenster der Obergeschosse (`render/src/kit/fenster-innen.js`), Räume im Baukastenstil auf Canvas gezeichnet, Glas trüb vor und sauber nach einer Fassadenerneuerung. Ein Haus je Stadt, eine InstancedMesh (1 Draw Call), nur im Spiel (`fensterPilotAn`), Glasflächen aus `warenhaus.js` (`fensterOG`). Erfasst nur Fensterbänder in Glasfarbe (z. B. W012); Lamellen- und Vorhangfassaden noch nicht. iPhone-Messung durch Ummo offen.
- KayKit Furniture Bits (CC0, Kay Lousberg): 22 Modelle umgewandelt (`render/scripts/kaykit/umwandeln.py` → `render/src/kit/moebel/kaykit-daten.js`, 156 KB), flach eingefärbt nach Rollen (`kaykit.js`). Eingesetzt in Living (Sofa-, Bett-, Essinsel) und Zentrale (Lounge, Gesprächsecke, Empfang, Vorstandsempfang). Lizenz `render/src/kit/moebel/KAYKIT-LIZENZ.txt`. Kataloge `kaykit`, `kaykit-einsatz`.
- Spiel-Bündel +200 KB (26,46 → 26,66 MB).
