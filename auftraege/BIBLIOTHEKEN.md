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
