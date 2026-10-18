// Kartensteuerung wie Coffee Inc (VORSTAND-MARKETING-VERTRAG.md, Abschnitt 5): Verschieben mit einem Finger oder der Maus,
// Wischen mit Trägheit, Pinch-Zoom um den Mittelpunkt der zwei Finger, Mausrad um den Mauszeiger, Antippen.
//
// Grenze: plan.kameraGrenze G (Rechteck der Stadt) plus Stadtrandgürtel G.sicht. Der sichtbare Bodenausschnitt (Parallelogramm
// der vier Bildecken auf y = 0) bleibt immer im Rechteck E = G erweitert um sicht, die Kameramitte bleibt in G. Bei der
// isometrischen Kamera (30 Grad, Blick nach -x -z) liegt die Bildecke (r, v) auf dem Boden bei
//   x = r / √2 − v √2,  z = −r / √2 − v √2   (r: halbe Bildbreite = halb · a, v: halbe Bildhöhe = halb).
// Damit reicht der Ausschnitt in x und z jeweils ext = halb · (a / √2 + √2) um die Mitte.
// Weitestes Herauszoomen: Bildbreite etwa ein Drittel von plan.breite (halb3 = breite / (6 a)), höchstens aber so weit, dass
// jede Ecke der Stadt bei diesem Zoom noch ins Bild geschoben werden kann (halbReich). So wischt man ganz herausgezoomt über
// die ganze Stadt, weiter heraus geht nicht.
const W2 = Math.SQRT2;

export const ausdehnung = (halb, a) => halb * (a / W2 + W2);
export function erweitert(G) {
  const m = G.sicht ?? 0;
  return { x0: G.x0 - m, z0: G.z0 - m, x1: G.x1 + m, z1: G.z1 + m };
}
/** Erlaubter Bereich der Kameramitte bei Zoom halb und Seitenverhältnis a (leer, wenn x0 > x1). */
export function mittelBereich(G, halb, a) {
  const E = erweitert(G), e = ausdehnung(halb, a);
  return { x0: Math.max(G.x0, E.x0 + e), x1: Math.min(G.x1, E.x1 - e), z0: Math.max(G.z0, E.z0 + e), z1: Math.min(G.z1, E.z1 - e) };
}
/** Liegt Punkt p bei einer Kameramitte im erlaubten Bereich im Bild? Raster über den Bereich (genau genug für die Grenze). */
function erreichbar(p, G, halb, a, rand = 0) {
  const A = mittelBereich(G, halb, a);
  if (A.x0 > A.x1 || A.z0 > A.z1) return false;
  const n = 48;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const cx = A.x0 + ((A.x1 - A.x0) * i) / n, cz = A.z0 + ((A.z1 - A.z0) * j) / n;
    const x = p.x - cx, z = p.z - cz, r = (x - z) / W2, v = -(x + z) / (2 * W2);
    if (Math.abs(r) <= halb * a - rand && Math.abs(v) <= halb - rand) return true;
  }
  return false;
}
/** Grenzen des Zooms für eine Stadt und ein Seitenverhältnis. */
export function zoomGrenzen(G, a, plan, min = 22) {
  const halb3 = (G.x1 - G.x0) / (6 * a);
  const ecken = [{ x: G.x0, z: G.z0 }, { x: G.x1, z: G.z0 }, { x: G.x0, z: G.z1 }, { x: G.x1, z: G.z1 }];
  let lo = min, hi = Math.max(min * 2, halb3 * 2);
  for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (ecken.every((p) => erreichbar(p, G, m, a))) lo = m; else hi = m; }
  const halbReich = lo;
  const max = Math.max(min * 2, Math.min(halb3, halbReich));
  return { min, max, halb3, halbReich, bindend: halb3 <= halbReich ? 'drittel' : 'ecken' };
}

/** Grenze anwenden: Zoom in [min, max], Mitte in den erlaubten Bereich. Gibt true zurück, wenn geklemmt wurde. */
export function klemmen(K, a) {
  const G = K.G;
  if (!G) return false;
  if (K._a !== a || K._G !== G) { const z = zoomGrenzen(G, a, null, K.min); K.max = z.max; K.zoom = z; K._a = a; K._G = G; }
  const h0 = K.halb, x0 = K.x, z0 = K.z;
  K.halb = Math.min(Math.max(K.halb, K.min), K.max);
  const A = mittelBereich(G, K.halb, a);
  K.x = A.x0 <= A.x1 ? Math.min(Math.max(K.x, A.x0), A.x1) : (G.x0 + G.x1) / 2;
  K.z = A.z0 <= A.z1 ? Math.min(Math.max(K.z, A.z0), A.z1) : (G.z0 + G.z1) / 2;
  return h0 !== K.halb || x0 !== K.x || z0 !== K.z;
}

/** Bodenpunkte der vier Bildecken (für die Messung). */
export function bildecken(K, a) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sr, sv]) => {
    const r = sr * K.halb * a, v = sv * K.halb;
    return { x: K.x + r / W2 - v * W2, z: K.z - r / W2 - v * W2 };
  });
}

/**
 * Zeiger, Pinch, Mausrad und Trägheit. o = { canvas, K, setzen(), aufBoden(px, py), tippen(e), seitenverhaeltnis() }.
 * setzen() klemmt und zeichnet (spiel.js kameraSetzen).
 */
export function karteSteuerung(o) {
  const { canvas, K } = o;
  const zeiger = new Map();
  let start = null, pinch = null, bewegt = 0, spur = [], lauf = null;
  const info = { los: null, schwung: 0 };
  const stopp = () => { if (lauf) cancelAnimationFrame(lauf.id); lauf = null; };
  const mitte = () => { const [a, b] = [...zeiger.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; };
  /** Bodenpunkt p unter den Bildschirmpunkt (px, py) legen. */
  const festhalten = (p, px, py) => { const q = o.aufBoden(px, py); if (p && q) { K.x += p.x - q.x; K.z += p.z - q.z; } };

  canvas.addEventListener('pointerdown', (e) => {
    stopp();
    canvas.setPointerCapture(e.pointerId);
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    bewegt = zeiger.size > 1 ? 99 : 0;
    spur = [];
    if (zeiger.size === 1) start = { p: o.aufBoden(e.clientX, e.clientY), x: e.clientX, y: e.clientY };
    if (zeiger.size === 2) { const m = mitte(); pinch = { d: m.d, halb: K.halb, p: o.aufBoden(m.x, m.y) }; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!zeiger.has(e.pointerId)) return;
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (zeiger.size === 2 && pinch) {
      const m = mitte();
      K.halb = pinch.halb * pinch.d / Math.max(10, m.d);
      o.setzen();
      festhalten(pinch.p, m.x, m.y);
      o.setzen();
      return;
    }
    if (!start?.p) return;
    bewegt = Math.max(bewegt, Math.hypot(e.clientX - start.x, e.clientY - start.y));
    const x0 = K.x, z0 = K.z;
    festhalten(start.p, e.clientX, e.clientY);
    o.setzen();
    const t = e.timeStamp;
    spur.push({ t, x: K.x, z: K.z, dx: K.x - x0, dz: K.z - z0 });
    while (spur.length > 2 && t - spur[0].t > 100) spur.shift();
  });
  const loslassen = (e) => {
    if (!zeiger.has(e.pointerId)) return;
    zeiger.delete(e.pointerId);
    if (zeiger.size < 2) pinch = null;
    if (zeiger.size === 0) {
      if (bewegt < 6 && start) o.tippen(e);
      else if (spur.length >= 2) {
        const a = spur[0], b = spur[spur.length - 1], dt = Math.max(8, b.t - a.t), alter = e.timeStamp - b.t;
        info.los = { dt: Math.round(dt), alter: Math.round(alter), v: Math.hypot(b.x - a.x, b.z - a.z) / dt, proben: spur.length };
        if (alter < 200) schwung((b.x - a.x) / dt, (b.z - a.z) / dt);
      }
      start = null;
    } else { const [a] = [...zeiger.values()]; start = { p: o.aufBoden(a.x, a.y), x: a.x, y: a.y }; spur = []; }
  };
  /** Trägheit: Geschwindigkeit in Weltmetern je ms (aus den Zeitstempeln der Eingaben), Reibung mit Halbwertszeit 180 ms. */
  function schwung(vx, vz) {
    stopp();
    if (Math.hypot(vx, vz) * 16 < K.halb * 0.002) return;
    lauf = { vx, vz, t: performance.now(), id: 0 };
    info.schwung++;
    const schritt = (t) => {
      if (!lauf) return;
      const dt = Math.min(40, t - lauf.t); lauf.t = t;
      K.x += lauf.vx * dt; K.z += lauf.vz * dt;
      const vorX = K.x, vorZ = K.z;
      o.setzen();
      if (K.x !== vorX) lauf.vx = 0;
      if (K.z !== vorZ) lauf.vz = 0;
      const f = Math.pow(0.5, dt / 180);
      lauf.vx *= f; lauf.vz *= f;
      if (Math.hypot(lauf.vx, lauf.vz) * 16 < K.halb * 0.0015) { lauf = null; return; }
      lauf.id = requestAnimationFrame(schritt);
    };
    lauf.id = requestAnimationFrame(schritt);
  }
  canvas.addEventListener('pointerup', loslassen);
  canvas.addEventListener('pointercancel', loslassen);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopp();
    const p = o.aufBoden(e.clientX, e.clientY);
    K.halb *= Math.exp(e.deltaY * 0.0015);
    o.setzen();
    festhalten(p, e.clientX, e.clientY);
    o.setzen();
  }, { passive: false });
  return { stopp, schwung, info, get laeuft() { return !!lauf; } };
}
