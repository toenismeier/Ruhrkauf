import { readFileSync, writeFileSync } from 'node:fs';
import { initSync, JsStreetNetwork } from './node_modules/osm2streets-js/osm2streets_js.js';
initSync(readFileSync('node_modules/osm2streets-js/osm2streets_js_bg.wasm'));
const xml = readFileSync(process.argv[2], 'utf8');
const t0 = Date.now();
const opt = { debug_each_step: false, dual_carriageway_experiment: false, sidepath_zipping_experiment: false,
  inferred_sidewalks: true, inferred_kerbs: true, date_time: undefined, override_driving_side: '', osm2lanes: false };
const net = new JsStreetNetwork(xml, '', opt);
const out = { plain: net.toGeojsonPlain(), lanes: net.toLanePolygonsGeojson(), marks: net.toLaneMarkingsGeojson(), imarks: net.toIntersectionMarkingsGeojson() };
for (const [k, v] of Object.entries(out)) { writeFileSync(`o2s-${k}.geojson`, v); const j = JSON.parse(v); const typen = {}; for (const f of j.features) { const t = f.properties?.type ?? f.properties?.kind ?? f.geometry.type; typen[t] = (typen[t] ?? 0) + 1; } console.log(k, j.features.length, JSON.stringify(typen).slice(0, 400)); }
console.log('ms', Date.now() - t0);
