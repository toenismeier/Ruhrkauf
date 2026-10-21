// Q01 Phase 1: Essen als wiedererkennbare Kartenstadt, Abnahmebilder in Spielansicht (iPhone-Hochformat).
// Rendern: cd render && node render-katalog.js karte-essen
// Grundlage: render/karten/essen.json (OpenStreetMap, © OpenStreetMap-Mitwirkende, ODbL), stilisiert im Raster des Kits.
import { THREE, setzeLod } from '../kit/basis.js';
import { stadtplan, baueStadt, setzeMarker } from '../kit/stadt.js';
import { stadtDaten } from '../kit/staedte.js';
import { echterBauer } from '../kit/bauer.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { ausschnittBauer, sichtFilter, schneideAus } from './_standorte-staedte.js';
import { stadtEintragAusSpiel } from '../kit/bruecke.js';
import { nahMitte } from '../kit/stadtrand.js';
import { neuesSpiel } from '../../../engine/src/index';

const mitteVon = (p) => p && { x: p.x + p.w / 2, z: p.z + p.d / 2 };
const ANSICHTEN = [
  { titel: 'Hauptbahnhof mit Gleisharfe', zoom: 95, ziel: (plan) => mitteVon(plan.parzellen.find((p) => p.typ === 'slot:bahnhof')) },
  { titel: 'Kettwiger Straße', zoom: 70, ziel: (plan) => { const L = plan.einkaufslage; return L && { x: L.xF - 4, z: (L.z0 + L.zF) / 2 }; } },
  { titel: 'Markt, Limbecker Straße, Rathaus', zoom: 85, ziel: (plan) => { const L = plan.einkaufslage; return L && { x: L.xF - 30, z: L.zF + 20 }; } },
  { titel: 'Münster', zoom: 60, ziel: (plan) => mitteVon(plan.parzellen.find((p) => p.typ === 'slot:kirche' && p.stil === 'romanisch')) },
  { titel: 'Rathaus (Hochhaus)', zoom: 75, ziel: (plan) => mitteVon(plan.parzellen.find((p) => p.typ === 'slot:rathaus')) },
  { titel: 'Limbecker Platz', zoom: 85, ziel: (plan) => mitteVon(plan.parzellen.find((p) => p.standort?.lage === 'center')) },
  { titel: 'Spielstart (wie im Spiel)', zoom: 60, ziel: (plan) => nahMitte(plan, 'einkauf', 62) },
  { titel: 'Nordrand: Zeche, Siedlung, Kanal', zoom: 120, ziel: (plan) => mitteVon(plan.parzellen.find((p) => p.typ === 'slot:ruhr_zeche')) },
];

// Standorte wie im Spiel (Engine-Welt mit 560 Häusern), nicht aus haeuser.json
const s = stadtEintragAusSpiel(neuesSpiel(1), 'Essen');
void stadtDaten;
const eintraege = ANSICHTEN.map((v) => ({
  titel: 'Essen · ' + v.titel, unter: '',
  bau(S, scene) {
    const t0 = performance.now();
    const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
    const L = plan.einkaufslage;
    const m = v.ziel(plan) ?? { x: L.xF - 8, z: L.zF - 8 };
    const box = new THREE.Box3(new THREE.Vector3(m.x - v.zoom, 0, m.z - v.zoom), new THREE.Vector3(m.x + v.zoom, 25, m.z + v.zoom));
    const bauer = ausschnittBauer(plan, echterBauer(), box);
    setzeLod('nah');
    let e;
    try { e = baueStadt(S, scene, plan, bauer); } finally { setzeLod('nah'); }
    schneideAus(S, scene, sichtFilter(box));
    setzeMarker(scene, plan, e, 'standorte', { markerGroesse: 11, leerstand: true });
    this.unter = `OSM-Grundlage, © OpenStreetMap-Mitwirkende, ODbL · ${Math.round(performance.now() - t0)} ms`;
    return box;
  },
}));
window.addEventListener('load', () => setTimeout(() =>
  zeigeKatalog(eintraege, { titel: 'Q01 Essen: Kettwiger Straße, Gleisharfe, Rathaus, Limbecker Platz', spalten: 2, kachel: [720, 1280], rand: 1.06 }), 20));
