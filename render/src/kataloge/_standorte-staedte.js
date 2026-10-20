// Gemeinsame Einträge für standorte.js (ganze Stadt) und standorte-nah.js (Einkaufslage, Center).
//
// Wiederverwendbare Hilfen für andere Städte-Kataloge (nord-staedte, west-staedte usw.):
//
//   stadtRahmen(plan, o?) → THREE.Box3
//     Kamera-Box für die ganze Stadt: nur das bebaute Gebiet (Blöcke ohne Wasser, ohne See und Umland) samt
//     Straßenrand, Höhe bis zu den Kartenmarkern. In der Isometrie wird daraus eine Raute, die in einer
//     Querformat-Kachel (STADT_KACHEL, Seitenverhältnis rund 16:9) die Kachel fast ganz füllt. Hochformat-Kacheln
//     verschenken drei Viertel der Fläche, deshalb für ganze Städte immer STADT_KACHEL und rand ≈ 1.0 nehmen:
//       zeigeKatalog(eintraege, { spalten: 2, kachel: STADT_KACHEL, rand: 1.0 })
//     o: { rand = 6 (Meter um die Blöcke), hoehe = 40 (Platz für Marker), mitWasser = false,
//          hoehen (Map Parzelle → Höhe aus baueStadt(): hohe Kulissen wie Alpen, Berge, Hänge bleiben ganz im Bild) }
//
//   sichtFilter(box, o?) → (x0, z0, x1, z1, h) => boolean
//     Prüft, ob ein Bau auf [x0, x1] × [z0, z1] mit Höhe h (samt Schlagschatten) in einem Ausschnitt zu sehen ist,
//     den kameraFuer(kachel, box, rand) zeigt. o: { kachel = [720, 1280], rand = 1.15 }. Hochformat ist die
//     sichere Annahme: Bei breiteren Kacheln (bis 2:1) zeigt die Kamera höchstens denselben Ausschnitt.
//
//   ausschnittBauer(plan, bauer, box, o?) → bauer
//     Wickelt einen Bauer (echterBauer()) so, dass nur Parzellen im Ausschnitt gebaut werden. Häuser außerhalb,
//     deren Stil ein sichtbarer Nachbar erbt, laufen ohne Geometrie mit; so bleibt jedes sichtbare Haus genau
//     wie beim Bau der ganzen Stadt. Standorte und hohe Landmarken werden immer gebaut.
import { THREE, kameraFuer, KompaktSammler, setzeLod, entferneKleineSchilder } from '../kit/basis.js';
import { stadtplan, baueStadt, setzeMarker, ARCHETYPEN } from '../kit/stadt.js';
import { bauerFuer } from '../kit/stadt.js';
import { stadtDaten } from '../kit/staedte.js';
import { echterBauer } from '../kit/bauer.js';
import { nahMitte } from '../kit/stadtrand.js';

const ROLLE = { premium: 'P', warenhaus: 'W', sport: 'S', wettbewerber: 'K', outlet: 'O' };

/** Querformat für ganze Städte (die isometrische Raute ist rund doppelt so breit wie hoch). */
export const STADT_KACHEL = [1280, 720];

const KULISSE = /alpen|berg|hang|kulisse|burg/;
/** Kamera-Box um das bebaute Gebiet einer Stadt (siehe oben). */
export function stadtRahmen(plan, o = {}) {
  const rand = o.rand ?? 6, hoehe = o.hoehe ?? 40;
  const land = plan.bloecke.filter((b) => o.mitWasser || b.art !== 'wasser');
  const x0 = Math.min(...land.map((b) => b.x)) - rand, x1 = Math.max(...land.map((b) => b.x + b.w)) + rand;
  const z0 = Math.min(...land.map((b) => b.z)) - rand, z1 = Math.max(...land.map((b) => b.z + b.d)) + rand;
  let h = hoehe;
  if (o.hoehen) for (const p of plan.parzellen) if (KULISSE.test(p.typ)) h = Math.max(h, o.hoehen.get(p.id) ?? 0);
  return new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, h, z1));
}

// Sonne wie in basis.sonneAuf: Versatz (-40, 120, 90) zum Ziel, Schatten fällt um h · (1/3, -3/4) versetzt.
const SCHATTEN_X = 40 / 120, SCHATTEN_Z = -90 / 120;
/** Sichtprüfung für einen Kamera-Ausschnitt (siehe oben). */
export function sichtFilter(box, o = {}) {
  const [kw, kh] = o.kachel ?? [720, 1280];
  const cam = kameraFuer(kw, kh, box, Math.max(1.15, o.rand ?? 1.15));
  cam.updateMatrixWorld();
  const m = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const v = new THREE.Vector3(), g = 1.04;
  return (x0, z0, x1, z1, h) => {
    let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
    const pkt = (x, y, z) => { v.set(x, y, z).applyMatrix4(m); ax = Math.min(ax, v.x); bx = Math.max(bx, v.x); ay = Math.min(ay, v.y); by = Math.max(by, v.y); };
    for (const x of [x0, x1]) for (const z of [z0, z1]) { pkt(x, 0, z); pkt(x, h, z); pkt(x + h * SCHATTEN_X, 0, z + h * SCHATTEN_Z); }
    return bx >= -g && ax <= g && by >= -g && ay <= g;
  };
}

// Immer bauen: Standorte (Marker, Leerstand) und Bauten, die weit über ihre Parzelle hinaus sichtbar sind
const IMMER = new Set(['slot:warenhaus', 'slot:premium', 'slot:sport', 'slot:wettbewerber', 'slot:dominante', 'slot:kirche', 'slot:hochhaus', 'slot:rathaus', 'slot:heizwerk', 'slot:dom', 'slot:fernsehturm', 'slot:wasserturm', 'slot:nord_kirche', 'slot:nord_kontorhaus']);
const HAEUSER = new Set(['stadthaus', 'eck', 'hofhaus']);
const HOEHE = 70;   // vorsichtige Höchsthöhe normaler Bauten (Punkthochhaus 16 Geschosse rund 50 m)
class LeerSammler { constructor() { this.teile = new Map(); this.anzahl = 0; } box() { this.anzahl++; } quader() { this.anzahl++; } add() { this.anzahl++; } bauen() {} }
const LEER_SZENE = { add() {}, remove() {}, traverse() {}, userData: {}, children: [] };

/** Bauer, der nur Parzellen im Ausschnitt baut (siehe oben). */
export function ausschnittBauer(plan, bauer, box, o = {}) {
  const sicht = sichtFilter(box, o);
  const imBild = new Set(), mitlauf = new Set();
  const nachId = new Map(plan.parzellen.map((p) => [p.id, p]));
  for (const q of plan.aussen?.bauten ?? []) imBild.add(q.id);   // Burg am Berg im Stadtrandgürtel
  for (const p of plan.parzellen) if (IMMER.has(p.typ) || p.standort || sicht(p.x, p.z, p.x + p.w, p.z + p.d, HOEHE)) imBild.add(p.id);
  for (const id of imBild) {
    let q = nachId.get(nachId.get(id)?.nachbar);
    while (q && HAEUSER.has(q.typ) && !imBild.has(q.id) && !mitlauf.has(q.id)) { mitlauf.add(q.id); q = nachId.get(q.nachbar); }
  }
  const leer = new LeerSammler();
  const cache = new Map();
  const wickel = (f) => (S, scene, p) => {
    if (imBild.has(p.id)) return f(S, scene, p);
    if (mitlauf.has(p.id)) f(leer, LEER_SZENE, p);
    return { hoehe: 12 };
  };
  const statistik = () => ({ gebaut: imBild.size, mitlauf: mitlauf.size, gesamt: plan.parzellen.length });
  return new Proxy(bauer, { get(t, k) {
    if (k === 'statistik') return statistik;
    if (typeof k !== 'string') return undefined;
    if (!cache.has(k)) cache.set(k, wickel(bauerFuer(t, k)));
    return cache.get(k);
  } });
}

/**
 * Wirft nach baueStadt() alle Geometrie aus Sammler und Szene, die im Ausschnitt nicht zu sehen ist und keinen
 * Schatten hineinwirft: Straßen, Gehwege, Höfe, Bäume, Autos und Figuren der übrigen Stadt. Reihenfolge und
 * Zufall bleiben unberührt, das Bild ändert sich nicht, nur Render- und Schattenpass werden kleiner.
 */
export function schneideAus(S, scene, sicht) {
  const bb = new THREE.Box3();
  const drin = (b) => sicht(b.min.x, b.min.z, b.max.x, b.max.z, Math.max(0, b.max.y));
  for (const [k, gs] of S.teile) {
    const rest = gs.filter((g) => { g.computeBoundingBox(); return drin(g.boundingBox); });
    S.teile.set(k, rest.length ? rest : gs.slice(0, 1));   // Farbe behalten (gleiche Zeichenreihenfolge)
  }
  const m = new THREE.Matrix4(), c = new THREE.Color();
  scene.traverse((o) => {
    if (!o.isInstancedMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    let n = 0;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      if (!drin(bb.copy(o.geometry.boundingBox).applyMatrix4(m))) continue;
      if (n !== i) { o.setMatrixAt(n, m); if (o.instanceColor) { o.getColorAt(i, c); o.setColorAt(n, c); } }
      n++;
    }
    o.count = n;
    o.instanceMatrix.needsUpdate = true;
    if (o.instanceColor) o.instanceColor.needsUpdate = true;
    o.computeBoundingSphere();
  });
}

/**
 * ansicht: 'stadt' (ganze Stadt) | 'einkauf' (Einkaufslage nah) | 'center' (erstes Center/Rand nah). zoom = halbe Kantenlänge.
 * o: { kachel } Kachelgröße des Katalogs für den Ausschnitt (Standard Hochformat 720 × 1280, gilt auch für Quadrate),
 *    lod: Detailstufe (Standard 'fern' für die ganze Stadt, 'nah' für Ausschnitte; siehe KIT.md).
 */
export function standortEintrag(name, ansicht = 'stadt', zoom = 62, zustand = null, zusatzTitel = '', o = {}) {
  const s = stadtDaten(name);
  return {
    titel: `${s.name} · ${ARCHETYPEN[s.archetyp].name}${ansicht === 'stadt' ? '' : ansicht === 'center' ? ' · Center' : ' · Einkaufslage'}${zusatzTitel}`, unter: '',
    bau(S, scene) {
      const t0 = performance.now();
      const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
      const t1 = performance.now();
      let box = null;
      if (ansicht === 'stadt') box = stadtRahmen(plan);
      else {
        // Gemeinsame Nahkamera mit pruef-gestaltung.js (stadtrand.js nahMitte): Mitte in plan.kameraGrenze, der
        // Stadtrandgürtel deckt den Blick über die Kartenkante
        const nm = nahMitte(plan, ansicht === 'center' ? 'center' : 'einkauf', zoom, o);
        const m = { x: nm.x, z: nm.z }; zoom = nm.zoom;
        box = new THREE.Box3(new THREE.Vector3(m.x - zoom, 0, m.z - zoom), new THREE.Vector3(m.x + zoom, 25, m.z + zoom));
      }
      const roh = echterBauer(zustand ? { zustand } : {});
      const bauer = ansicht === 'stadt' ? roh : ausschnittBauer(plan, roh, box, o);
      // Ganze Stadt: Detailstufe 'fern' (KIT.md) und sparsamer Sammler, sonst volle Details
      const ganz = ansicht === 'stadt', T = ganz ? new KompaktSammler() : S;
      if (ganz && o.statistik) T.statistik = new Map();
      setzeLod(ganz ? (o.lod ?? 'fern') : (o.lod ?? 'nah'));
      let e;
      try {
        e = baueStadt(T, scene, plan, bauer);
        if (ganz) { if (T.statistik) this.statistik = [...T.statistik].sort((a, b) => b[1][1] - a[1][1]); T.bauen(scene); S.anzahl = T.anzahl; this.verworfen = T.verworfen; entferneKleineSchilder(scene); }
      } finally { setzeLod('nah'); }
      if (!ganz) schneideAus(S, scene, sichtFilter(box, o));
      if (ganz) box = stadtRahmen(plan, { hoehen: e.hoehen });
      const gr = ansicht === 'stadt' ? Math.max(24, plan.breite / 15) : 11;
      setzeMarker(scene, plan, e, 'standorte', { markerGroesse: gr, leerstand: ansicht !== 'stadt' });
      const zaehl = plan.standorte.map((p) => ROLLE[p.rolle] + p.lage).join(' ');
      const st = bauer.statistik?.();
      this.unter = `${s.typ} · ${s.region} · ${Math.round(plan.breite)}×${Math.round(plan.tiefe)} m · ${zaehl} · Plan ${Math.round(t1 - t0)} ms, gesamt ${Math.round(performance.now() - t0)} ms${st ? ` · ${st.gebaut}/${st.gesamt} Parzellen` : ''}`;
      return box;
    },
  };
}
