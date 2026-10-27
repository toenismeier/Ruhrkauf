// B16 (Wurf 4, Bildpaket): Silhouetten aus Fassung B + vtracer. Format wie erweiterung-b01.js.
// model = Platz am Model (parametrisch aus p), zeichner z:b16 -> b16-bilder.js
import { b16Zeichner } from './b16-bilder.js';

export const SILHOUETTEN = { "b16klebebh": { "gruppe": "waesche", "zeichner": "z:b16", "p": { "b16": "b16klebebh" }, "material": "baumwolle", "farbe": "beige", "model": null, "nur": "damen" }, "b16longlinebh": { "gruppe": "waesche", "zeichner": "z:b16", "p": { "b16": "b16longlinebh" }, "material": "satin", "farbe": "rosa", "model": null, "nur": "damen" }, "b16strumpfhalter": { "gruppe": "waesche", "zeichner": "z:b16", "p": { "b16": "b16strumpfhalter" }, "material": "satin", "farbe": "schwarz", "model": null, "nur": "damen" } };

export const ZEICHNER = { b16: b16Zeichner };
