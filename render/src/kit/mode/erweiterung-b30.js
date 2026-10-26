// B30 (Wurf 4): Silhouetten aus Fassung B + vtracer. Format wie erweiterung-b01.js.
// model = Platz am Model, Teile über modelTeile (fest je Silhouette); zeichner z:b30 -> b30-bilder.js
// Zuordnung Artikeltyp -> Silhouette: b30-zuordnung.json (angebunden nach Merge des Q-Auftrags).
import { b30Zeichner } from './b30-bilder.js';

export const SILHOUETTEN = { "b30buegelloserbh": { "gruppe": "waesche", "zeichner": "z:b30", "p": { "b30": "b30buegelloserbh", "farben": [ "gleich" ], "materialien": [ "baumwolle" ] }, "material": "baumwolle", "farbe": "sand", "model": null, "nur": "damen" }, "b30harnessbody": { "gruppe": "waesche", "zeichner": "z:b30", "p": { "b30": "b30harnessbody", "umriss": true, "farben": [ "gleich" ], "materialien": [ "satin" ] }, "material": "satin", "farbe": "marine", "model": null, "nur": "damen" }, "b30tshirtbh": { "gruppe": "waesche", "zeichner": "z:b30", "p": { "b30": "b30tshirtbh", "farben": [ "gleich" ], "materialien": [ "satin" ] }, "material": "satin", "farbe": "beige", "model": null, "nur": "damen" } };

const MODEL = {};
for (const [id, mt] of Object.entries(MODEL)) SILHOUETTEN[id].modelTeile = (p, farbe, material) => ({ ...mt, farbe, material, muster: undefined });

export const ZEICHNER = { b30: b30Zeichner };
