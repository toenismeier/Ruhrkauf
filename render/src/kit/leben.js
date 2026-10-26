// N07: Belebte Stadt. Reines Render-Modul ohne Einfluss auf die Engine.
// Geometrie und Pfade stammen aus dem Stadtplan; Zufallsentscheidungen ausschließlich aus rng(seed).
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, rng } from './basis.js';
import { menschenGruppe, erscheinung, menschenZeit } from './menschen.js';

export const STANDARD_LEBEN = 'voll'; // Bis N13 eingebunden ist: voll | wenig | aus.
const MODI = ['voll', 'wenig', 'aus'];
const MAX_AUTO = 60, MAX_FUSS = 110, MAX_BUS = 8, MAX_BAHN = 6, MAX_LKW = 5;
const KLEINSTE_LUECKE = 6.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Kartenstädte: Straßenstücke beliebiger Richtung (achse 'r': Ursprung ax/az, Richtung ux/uz, Normale nx/nz, von = 0, bis = Länge)
// und Polylinien (achse 'p': pts, cum = Bogenlänge je Punkt; Normale = Richtung um 90° gedreht, wie bei 'r').
function stueck(s, u) {
  const c = s.cum; let lo = 0, hi = c.length - 1;
  u = Math.max(0, Math.min(c[hi], u));
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= u) lo = m; else hi = m; }
  const a = s.pts[lo], b = s.pts[hi], L = Math.max(1e-6, c[hi] - c[lo]), t = (u - c[lo]) / L;
  const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, ux, uz };
}
const koordinate = (s, u, v) => {
  if (s.achse === 'p') { const q = stueck(s, u); return { x: q.x - q.uz * v, z: q.z + q.ux * v }; }
  return s.achse === 'r' ? { x: s.ax + s.ux * u + s.nx * v, z: s.az + s.uz * u + s.nz * v }
    : s.achse === 'z' ? { x: s.mitte + v, z: u } : { x: u, z: s.mitte + v };
};
/** Lage eines Punkts zum Straßenstück: u entlang, v quer (gleiche Konvention wie koordinate). */
const lageZu = (s, p) => {
  if (s.achse === 'p') {
    let best = null;
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1], b = s.pts[i], L = Math.max(1e-6, s.cum[i] - s.cum[i - 1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      const t = Math.max(0, Math.min(L, (p.x - a[0]) * ux + (p.z - a[1]) * uz));
      const qx = a[0] + ux * t, qz = a[1] + uz * t, d = Math.hypot(p.x - qx, p.z - qz);
      if (!best || d < best.d) best = { d, u: s.cum[i - 1] + t, v: (p.x - qx) * -uz + (p.z - qz) * ux };
    }
    return best ?? { u: 0, v: 0 };
  }
  return s.achse === 'r' ? { u: (p.x - s.ax) * s.ux + (p.z - s.az) * s.uz, v: (p.x - s.ax) * s.nx + (p.z - s.az) * s.nz }
    : s.achse === 'z' ? { u: p.z, v: p.x - s.mitte } : { u: p.x, v: p.z - s.mitte };
};
const richtungsWinkel = (s, d, u = 0) => {
  if (s.achse === 'p') { const q = stueck(s, u); return Math.atan2(-q.uz * d, q.ux * d); }
  return s.achse === 'r' ? Math.atan2(-s.uz * d, s.ux * d) : s.achse === 'z' ? Math.atan2(-d, 0) : Math.atan2(0, d);
};
const sign = (s) => s.achse === 'z' ? -1 : 1;
const wegStart = (l) => l.dir > 0 ? l.s.von + 2 : l.s.bis - 2;
const wegEnde = (l) => l.dir > 0 ? l.s.bis - 2 : l.s.von + 2;
const punkt = (l, meter) => koordinate(l.s, wegStart(l) + l.dir * meter, l.v);
const laenge = (l) => Math.max(0, l.s.bis - l.s.von - 4);
const abstand = (a, b) => wurzelSumme(a.x - b.x, a.z - b.z);

export function verkehrsnetz(plan) {
  const spuren = [], fusswege = [], trams = [], haupt = [];
  for (const s of plan?.strassen ?? []) {
    if (s.bis - s.von < (s.achse === 'r' || s.achse === 'p' ? 4 : 14) || s.bruecke && s.typ === 'fussgaenger') continue;
    const fb = s.breite - 2 * s.gehweg, ps = sign(s);
    if (s.achse === 'p') {
      // Kartenstadt: echte Fahrspuren (Versatz links von der Bandmitte → Normale zeigt nach rechts, also v = −links)
      if (s.typ !== 'fussgaenger') (s.spurenKarte ?? []).forEach((sp, i) => {
        const l = { s, dir: sp.dir, v: -sp.links, id: s.id + ':' + i, naechste: [] };
        spuren.push(l); if (s.typ === 'haupt') haupt.push(l);
      });
      const quer = s.typ === 'fussgaenger' ? 3.0 : (s.fahrbahn ?? fb) / 2 + 1.6;
      // Gehweglinie nur, wenn sie (abseits der Kreuzungsenden) nirgends auf Fahrbahn oder Gleis liegt
      // Gehweglinie mit 1 m Abstand zur gezeichneten Fahrbahn: vom Standardversatz nach außen suchen (Fahrbahnen sind oft breiter als das Netzband)
      const neben = (v) => { if (!plan.aufFahrbahn) return true; const L = s.bis - s.von, rand = Math.min(6, L / 5), innen = -Math.sign(v) * 1.4;
        for (let u = s.von + rand; u <= s.bis - rand; u += 2.5) { const q = koordinate(s, u, v), r = koordinate(s, u, v + innen); if (plan.aufFahrbahn(q.x, q.z) || plan.aufFahrbahn(r.x, r.z)) return false; } return true; };
      for (const seite of [-1, 1]) {
        if (!(s.fussSeiten?.[seite < 0 ? 0 : 1] ?? true) && !plan.aufFahrbahn) continue;
        const v = [0.4, 1.2, 2.0, 2.8].map((d) => seite * (quer + d)).find((vv) => neben(vv));
        if (v !== undefined) fusswege.push({ s, dir: 1, v, id: s.id + ':f:' + seite });
      }
      continue;
    }
    if (s.typ !== 'fussgaenger' && !s.leitwand) {
      const seiten = s.typ === 'haupt'
        ? [((s.mittel || 6) / 2 + (fb / 2 - (s.mittel || 6) / 2) * .35), ((s.mittel || 6) / 2 + (fb / 2 - (s.mittel || 6) / 2) * .73)]
        : [Math.max(1.3, fb / 4)];
      for (const dir of s.einbahn ? [1] : [1, -1]) for (let i = 0; i < seiten.length; i++) {
        const v = ps * dir * seiten[i];
        const l = { s, dir, v, id: s.id + ':' + dir + ':' + i, naechste: [] };
        spuren.push(l);
        if (s.typ === 'haupt') haupt.push(l);
      }
      if (s.tram && (s.art === 'magistrale' || s.typ === 'haupt'))
        for (const dir of [1, -1]) trams.push({ s, dir, v: -ps * dir * 1.6, id: 'tram:' + s.id + ':' + dir, naechste: [] });
    }
    for (const seite of [-1, 1]) {
      const v = s.typ === 'fussgaenger' ? seite * Math.max(1.5, fb * .29) : seite * (s.breite / 2 - s.gehweg / 2);
      fusswege.push({ s, dir: 1, v, id: s.id + ':f:' + seite });
    }
  }
  // Die am Stadtplan hinterlegten Kreuzungsarme verknüpfen die vorhandenen gerichteten Spuren.
  // Kreuzungen je Straßenstück einmal nachschlagen (vorher Suche über alle Kreuzungen je Spur: quadratisch bei Kartenstädten)
  const knotenJe = new Map();
  for (const k of plan?.kreuzungen ?? []) for (const a of Object.values(k.arme ?? {})) if (a) { if (!knotenJe.has(a.id)) knotenJe.set(a.id, []); knotenJe.get(a.id).push(k); }
  const verbinde = (liste) => {
    const proSegment = new Map();
    for (const l of liste) {
      if (!proSegment.has(l.s.id)) proSegment.set(l.s.id, []);
      proSegment.get(l.s.id).push(l);
    }
    for (const l of liste) {
      const end = punkt(l, laenge(l));
      const knoten = [...(knotenJe.get(l.s.id) ?? [])].sort((a, b) => abstand(a, end) - abstand(b, end))[0];
      if (!knoten || abstand(knoten, end) > Math.max(33, l.s.breite)) continue;
      for (const a of Object.values(knoten.arme ?? {})) {
        if (!a || a.id === l.s.id || a.typ === 'fussgaenger') continue;
        for (const n of proSegment.get(a.id) ?? []) {
          const start = punkt(n, 0);
          if (abstand(knoten, start) <= Math.max(33, a.breite) && abstand(start, end) < 65) l.naechste.push(n);
        }
      }
    }
  };
  verbinde(spuren);
  verbinde(trams);
  return { spuren, fusswege, trams, haupt };
}

/** Sichtbare Käuferfrequenz basiert ausschließlich auf dem letzten tatsächlich gebuchten Wochenumsatz. */
export function hausGewicht(haus, median = 1) {
  if (haus?.status !== 'offen' && haus?.status !== 'raeumung') return 0;
  const umsatz = Math.max(0, haus?.kpi?.umsatz ?? 0);
  const lage = haus.lage === '1a' ? 1.25 : haus.lage === 'rand' ? .7 : 1;
  return clamp((umsatz ? Math.sqrt(umsatz / Math.max(1, median)) : .65) * lage * (1 + clamp(haus.transferBonus ?? 0, -.5, 1)), .25, 3.5);
}

const FORMAT_FARBE = { warenhaus: '#d23c32', sport: '#327cb4', schwester: '#397e69',
  volkskauf: '#397e69', outlet: '#752d52', fundus: '#752d52' };
const autoFarben = ['#d04a3f', '#2f63b5', '#ece8e1', '#28303a', '#b09a52', '#598b6c', '#9f6f83'];
function formatFarbe(h) {
  return FORMAT_FARBE[h?.format] ?? (h?.id?.startsWith('V') ? '#397e69' : '#d23c32');
}

function instanzen(scene, geometrie, max, name) {
  const m = new THREE.InstancedMesh(geometrie, new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.FrontSide, vertexColors: !!geometrie.attributes.color }), max);
  m.name = 'leben:' + name;
  m.count = 0;
  m.frustumCulled = false; // Sichtbarkeit wird bereits je Instanz/Kamera begrenzt.
  m.castShadow = false;
  scene.add(m);
  return m;
}
/** Fahrzeugmodell aus mehreren farbigen Quadern (Vertexfarben), Länge entlang x, Mitte im Ursprung. */
function modell(teile) {
  const P = [], C = [], N = [];
  for (const [w, h, d, x, y, z, farbe] of teile) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, z);
    const c = new THREE.Color(farbe), pos = g.attributes.position.array, nor = g.attributes.normal.array;
    for (let i = 0; i < pos.length; i += 3) { P.push(pos[i], pos[i + 1], pos[i + 2]); N.push(nor[i], nor[i + 1], nor[i + 2]); C.push(c.r, c.g, c.b); }
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
const FENSTER = '#3d4a55';
// Gelenkbus: weiß mit Fensterband, grünem Sockelstreifen und Dachaufbau
const BUS = () => modell([[11.6, 2.4, 2.55, 0, -0.25, 0, '#f1efe9'], [11.2, 0.95, 2.6, 0.1, 0.35, 0, FENSTER], [0.08, 1.4, 2.2, 5.82, 0.2, 0, FENSTER],
  [11.6, 0.35, 2.6, 0, -1.2, 0, '#3f8f5a'], [3.4, 0.35, 1.6, -2.5, 1.12, 0, '#d4d2cc'], [0.2, 2.6, 2.62, 0.4, -0.1, 0, '#cfcbc1']]);
// Straßenbahn: drei Glieder, weiß mit rotem Band, durchgehendem Fensterband und Stromabnehmer
const BAHN = () => modell([[6.1, 2.7, 2.6, -6.4, -0.3, 0, '#f3f1ec'], [5.9, 2.7, 2.6, 0, -0.3, 0, '#f3f1ec'], [6.1, 2.7, 2.6, 6.4, -0.3, 0, '#f3f1ec'],
  [18.6, 1.0, 2.66, 0, 0.35, 0, FENSTER], [18.8, 0.4, 2.66, 0, -1.35, 0, '#c8372f'], [1.2, 0.5, 0.4, 0, 1.3, 0, '#55595e'], [0.1, 1.2, 2.2, 9.46, 0.3, 0, FENSTER]]);
// Lieferwagen: weißer Kofferaufbau, rotes Fahrerhaus mit Scheibe
const LKW = () => modell([[5.6, 2.9, 2.5, -1.2, 0.05, 0, '#efede6'], [2.2, 2.3, 2.4, 2.9, -0.25, 0, '#c8372f'], [0.08, 0.9, 2.1, 4.0, 0.25, 0, FENSTER],
  [8.0, 0.35, 2.5, 0, -1.35, 0, '#4b4f54']]);
/** Abstand Punkt–Strecke und Strecke–Strecke (Abbiegewege dürfen sich nicht kreuzen). */
function punktStrecke(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / l2, 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
function streckenAbstand(a, b, c, d) {
  const k = (p, q, r) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  if (k(a, b, c) * k(a, b, d) < 0 && k(c, d, a) * k(c, d, b) < 0) return 0;
  return Math.min(punktStrecke(a, c, d), punktStrecke(b, c, d), punktStrecke(c, a, b), punktStrecke(d, a, b));
}
const dummy = new THREE.Object3D();
function matrix(mesh, i, pos, winkel, groesse, farbe) {
  dummy.position.set(pos.x, pos.y, pos.z);
  dummy.rotation.set(0, winkel, 0);
  dummy.scale.set(groesse[0], groesse[1], groesse[2]);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
  if (farbe) mesh.setColorAt(i, farbe);
}
function fertig(m, n) {
  m.count = n;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

export function lebenModul({ canvas, scene: szene, camera: kamera, K: zoom, spiel, zeichnen, sparsam = false }) {
  let modus = STANDARD_LEBEN, scene = null, plan = null, netz = null, r = rng(1);
  let autos = [], fuss = [], busse = [], bahnen = [], lkw = [], hauspunkte = [], sichtSpuren = [];
  let meshes = {}, leute = null, uhr = 0, raf = 0, zuletzt = 0, letzterKontakt = 0, letzteAuswahl = -1, pause = false;
  let frameKosten = [], limitFaktor = 1, langsameFrames = 0, aufnahme = false;
  const farbe = (c) => new THREE.Color(c);
  const projektion = new THREE.Vector3();
  const sichtbar = (p, rand = 1.35) => {
    const k = zoom(); if (!k) return false;
    // Grobe Sichtbarkeitsprüfung vor dem exakten Projektions-Test spart CPU.
    if (Math.abs(p.x - k.x) + Math.abs(p.z - k.z) > k.halb * 5) return false;
    const c = kamera(); if (!c) return false;
    const v = projektion.set(p.x, 0.5, p.z).project(c);
    return Math.abs(v.x) < rand && Math.abs(v.y) < rand;
  };
  function waehle(liste) { return liste[Math.floor(r() * liste.length)]; }
  function meshBauen() {
    meshes = {
      auto: instanzen(scene, new THREE.BoxGeometry(4.2, 1.4, 1.8), MAX_AUTO, 'auto'),
      glas: instanzen(scene, new THREE.BoxGeometry(2.1, .7, 1.6), MAX_AUTO, 'autoglas'),
      bus: instanzen(scene, BUS(), MAX_BUS, 'bus'),
      tram: instanzen(scene, BAHN(), MAX_BAHN, 'tram'),
      lkw: instanzen(scene, LKW(), MAX_LKW, 'lieferwagen'),
    };
    // Passanten: vorgerenderte Figuren (menschen.js), ein Draw Call
    leute = menschenGruppe(MAX_FUSS, 'leben:passanten');
    scene.add(leute.mesh);
  }
  function loeschen() {
    anhalten();
    if (scene) for (const m of Object.values(meshes)) {
      m.parent?.remove(m); m.geometry.dispose(); m.material.dispose();
    }
    if (leute) { leute.mesh.parent?.remove(leute.mesh); leute.dispose(); leute = null; }
    meshes = {}; scene = null; plan = null; netz = null; autos = []; fuss = []; busse = []; bahnen = []; lkw = []; hauspunkte = [];
    zuletzt = 0; letzteAuswahl = -1;
  }
  function hausStandorte() {
    const s = spiel();
    if (!s || !plan) return [];
    // GameState enthält keinen ausgewählten Städtenamen, deshalb Zuordnung über plan.standorte.
    const punkte = [];
    for (const st of plan.standorte ?? []) {
      const h = (s.haeuser ?? []).find((x) => x.id === st.id || x.id === st.hausId);
      const p = plan.parzellen.find((p) => p.id === st.parzelle);
      if (!h || !p || !netz?.fusswege.length) continue;
      const mitte = { x: p.x + p.w / 2, z: p.z + p.d / 2 };
      const f = netz.fusswege.filter((w) => Math.abs(lageZu(w.s, mitte).v) < 65)
        .map((w) => ({ w, u: clamp(lageZu(w.s, mitte).u, w.s.von + 3, w.s.bis - 3) }));
      f.sort((a, b) => abstand(koordinate(a.w.s, a.u, a.w.v), mitte) - abstand(koordinate(b.w.s, b.u, b.w.v), mitte));
      if (!f.length) continue;
      const a = f[0], weg = koordinate(a.w.s, a.u, a.w.v);
      // Eingang auf der zur Straße gerichteten Hauskante, nicht mitten durch das Gebäude.
      const ein = (a.w.s.achse === 'r' || a.w.s.achse === 'p')
        ? { x: clamp(weg.x, p.x, p.x + p.w), z: clamp(weg.z, p.z, p.z + p.d) }   // nächster Punkt der Hauskante zum Gehweg
        : a.w.s.achse === 'z'
        ? { x: a.w.s.mitte < mitte.x ? p.x : p.x + p.w, z: clamp(a.u, p.z + 1, p.z + p.d - 1) }
        : { x: clamp(a.u, p.x + 1, p.x + p.w - 1), z: a.w.s.mitte < mitte.z ? p.z : p.z + p.d };
      // Kunden nur vom Gehweg direkt vor dem Haus; liegt der nächste Gehweg jenseits der Fahrbahn, liefen sie über die Straße
      if ((a.w.s.achse === 'p') && abstand(weg, ein) > 9) continue;
      punkte.push({ h, p, mitte, weg, ein, lane: a.w, u: a.u });
    }
    const umsaetze = punkte.map((p) => p.h.kpi?.umsatz ?? 0).filter((x) => x > 0).sort((a, b) => a - b);
    const median = umsaetze[Math.floor(umsaetze.length / 2)] ?? 1;
    for (const p of punkte) p.gewicht = hausGewicht(p.h, median);
    return punkte;
  }
  function neueFussgaenger(wege) {
    if (!wege.length) return null;
    const aktive = hauspunkte.filter((x) => x.gewicht && sichtbar(x.weg, 1.7));
    let haus = null;
    // Nur ein Teil hat ein Haus als Ziel; die übrigen bummeln über alle sichtbaren Wege der Stadt
    if (aktive.length && r() < .3) {
      const sum = aktive.reduce((a, b) => a + b.gewicht, 0);
      let v = r() * sum;
      haus = aktive.find((a) => (v -= a.gewicht) <= 0) ?? aktive.at(-1);
    }
    const weg = haus?.lane ?? waehle(wege);
    // Auch Kunden starten irgendwo auf ihrem Weg und laufen erst zum Haus (kein Pulk am Eingang)
    const anfang = r() * laenge(weg);
    const geschw = 0.95 + r() * .6;
    // Querversatz auf dem Gehweg, damit nicht alle auf einer Linie laufen
    const breit = weg.s.typ === 'fussgaenger' ? 1.6 : weg.s.achse === 'p' ? 0.3 : Math.max(0, (weg.s.gehweg ?? 3) / 2 - 0.6);
    return { weg, m: anfang, quer: (r() * 2 - 1) * breit, dir: r() < .5 ? -1 : 1, geschw,
      haus, phase: 'weg', lauf: 0, tuete: false, aussehen: erscheinung(r, { kinder: .07 }), ph: r() * 8, tempo: geschw / 1.25 };
  }
  function neuerWagen(lanes, art = 'auto') {
    if (!lanes.length) return null;
    const lane = waehle(lanes);
    return { lane, m: r() * laenge(lane), geschw: art === 'tram' ? 7 + r() * 2 : art === 'bus' ? 5 + r() * 2 : 6 + r() * 5,
      farbe: farbe(waehle(autoFarben)), art, sprung: null };
  }
  function aktualisiereAuswahl() {
    if (!netz || !scene || modus === 'aus') return;
    const k = zoom(), neu = Math.round(k.x / 18) + ':' + Math.round(k.z / 18) + ':' + Math.round(k.halb / 9) + ':' + modus + ':' + limitFaktor;
    if (neu === letzteAuswahl) return;
    letzteAuswahl = neu;
    if (k.halb > 110) { autos = []; fuss = []; busse = []; bahnen = []; return; }
    const lanes = netz.spuren.filter((l) => sichtbar(punkt(l, laenge(l) * .5), 1.6));
    sichtSpuren = lanes;
    const wege = netz.fusswege.filter((l) => sichtbar(punkt(l, laenge(l) * .5), 1.5));
    const busLanes = lanes.filter((l) => l.s.typ === 'haupt');
    const tramLanes = netz.trams.filter((l) => l.s.art === 'magistrale' && sichtbar(punkt(l, laenge(l) * .5), 1.5));
    const dichte = (modus === 'wenig' ? .5 : 1) * limitFaktor;
    // Höchstens ein Wagen je 30 m sichtbarer Fahrspur, sonst stehen bei nahem Zoom Kolonnen Stoßstange an Stoßstange
    const spurMeter = lanes.reduce((n, l) => n + laenge(l), 0);
    const sollAuto = lanes.length ? Math.min(MAX_AUTO, Math.round(spurMeter / 30), Math.max(1, Math.round((20 + 40 * clamp((110 - k.halb) / 88, 0, 1)) * dichte))) : 0;
    // Passanten nach sichtbarer Gehweglänge (ein Mensch je 9 m), nicht pauschal 100 auf wenige Meter Gehweg
    const wegMeter = wege.reduce((n, l) => n + laenge(l), 0);
    const sollFuss = wege.length ? Math.min(Math.round(100 * dichte), Math.round(wegMeter / 9)) : 0;
    const anpassen = (arr, n, liste, art, sonstige = []) => {
      const weiter = arr.filter((a) => a?.lane && liste.includes(a.lane)).slice(0, n);
      for (let i = 0; i < n * 18 && weiter.length < n; i++) {
        const a = neuerWagen(liste, art);
        if (!a) break;
        // Bei knappen Straßen lieber weniger Wagen, statt zwei in dieselbe Spur zu setzen.
        const qa = positionWagen(a);
        // Busse und Bahnen nie in Kolonne: 90 m Abstand zum nächsten großen Fahrzeug
        if ((art === 'bus' || art === 'tram') && [...weiter, ...busse, ...bahnen].some((b) => b !== a && (b.art === 'bus' || b.art === 'tram') && (() => { const qb = positionWagen(b); return Math.hypot(qa.x - qb.x, qa.z - qb.z) < 90; })())) continue;
        if ([...weiter, ...sonstige].some((b) => (b.lane === a.lane &&
            Math.abs(b.m - a.m) < (a.art === 'tram' || b.art === 'tram' ? 22 :
              a.art === 'bus' || b.art === 'bus' ? 14 : KLEINSTE_LUECKE)) || (() => { const qb = positionWagen(b); return Math.hypot(qa.x - qb.x, qa.z - qb.z) < 8; })())) continue;
        weiter.push(a);
      }
      return weiter;
    };
    autos = anpassen(autos, sollAuto, lanes, 'auto');
    busse = anpassen(busse, Math.min(3, Math.round(busLanes.length / 12 * dichte)), busLanes, 'bus', autos);
    bahnen = anpassen(bahnen, Math.min(2, Math.round(tramLanes.length / 6 * dichte)), tramLanes, 'tram');
    fuss = fuss.filter((a) => wege.includes(a.weg)).slice(0, sollFuss);
    while (fuss.length < sollFuss) { const f = neueFussgaenger(wege); if (!f) break; fuss.push(f); }
  }
  /** Wagen auf eine freie Stelle einer sichtbaren Spur setzen (kein anderer Wagen innerhalb von 8 m). */
  function neuEinsetzen(a, liste, lage) {
    for (let i = 0; i < 16 && sichtSpuren.length; i++) {
      const l = waehle(sichtSpuren), m = r() * laenge(l), q = punkt(l, m);
      if (liste.some((b) => b !== a && (lage?.get(b) ?? positionWagen(b)) && Math.hypot((lage?.get(b) ?? positionWagen(b)).x - q.x, (lage?.get(b) ?? positionWagen(b)).z - q.z) < 8)) continue;
      a.lane = l; a.m = m; a.sprung = null; a.gegen = undefined; a.warte = 0; return true;
    }
    return false;
  }
  function bewegungWagen(liste, dt) {
    // Vorderes Fahrzeug je Spur zuerst; Folgende werden hinter dem Sicherheitsabstand begrenzt.
    const belegung = new Map();
    const sortiert = [...liste].sort((a, b) => b.m - a.m);
    // Positionen zu Beginn des Takts: Wagen anderer Spuren (Kreuzungen, Einmündungen) dürfen sich nicht durchdringen
    const lage = new Map(liste.map((a) => [a, positionWagen(a)]));
    const laengeVon = (a) => (a.art === 'tram' ? 19 : a.art === 'bus' ? 11.6 : 4.5);
    for (const a of sortiert) {
      // Unsichtbar wegen Überlappung: nach 0,5 s an freier Stelle neu einsetzen
      if (a.verdeckt && ((a.vz = (a.vz ?? 0) + dt) > 0.5)) { a.vz = 0; neuEinsetzen(a, liste, lage); }
      const key = a.lane.id;
      const voraus = belegung.get(key);
      let ziel = a.m + a.geschw * dt;
      // Nur ein Wagen vor diesem bremst (ein gerade auf diese Spur gewechselter Wagen steht bei m = 0 dahinter)
      if (voraus && voraus.m >= a.m) ziel = Math.min(ziel, voraus.m - (a.art === 'tram' || voraus.art === 'tram' ? 22 : a.art === 'bus' || voraus.art === 'bus' ? 14 : KLEINSTE_LUECKE));
      let steht = false;
      if (ziel > a.m && (a.quer ?? 0) < 3) {
        const pa = lage.get(a), hx = Math.cos(pa.winkel), hz = -Math.sin(pa.winkel);
        for (const b of liste) {
          if (b === a || b.lane === a.lane) continue;
          const pb = lage.get(b), dx = pb.x - pa.x, dz = pb.z - pa.z, vor = dx * hx + dz * hz, seit = Math.abs(dx * hz - dz * hx);
          // Wagen b steht vor a im Fahrweg (vorn bis halbe Längen plus 2 m, seitlich unter 2,4 m): a hält an
          if (vor > 0 && vor < (laengeVon(a) + laengeVon(b)) / 2 + 2 && seit < 2.4) { ziel = a.m; steht = true; break; }
        }
        // Gegenseitiges Warten an Kreuzungen höchstens 3 s, dann wird der Wagen an freier Stelle neu eingesetzt
        a.quer = ziel === a.m ? (a.quer ?? 0) + dt : 0;
        if (a.quer >= 3 && neuEinsetzen(a, liste, lage)) { a.quer = 0; belegung.set(a.lane.id, a); continue; }
      } else if (ziel > a.m) a.quer = 0;
      if (ziel >= laenge(a.lane)) {
        // Zielspur frei: kein Wagen am Spuranfang, und kein Wagen (auch anderer Spuren oder im Abbiegen) im Umkreis von 7 m um den Einfahrpunkt
        const von = punkt(a.lane, laenge(a.lane));
        const frei = (n) => { const q = punkt(n, 0); return !liste.some((b) => b !== a && ((b.lane === n && b.m < KLEINSTE_LUECKE * 2) || Math.hypot(lage.get(b).x - q.x, lage.get(b).z - q.z) < 7 ||
          punktStrecke(lage.get(b), von, q) < 3.5 || (b.sprung && streckenAbstand(b.sprung.von, b.sprung.nach, von, q) < 4))); };
        const moeglich = a.lane.naechste.filter(frei);
        let nach = moeglich.length ? waehle(moeglich) : null;
        // Kein freier Anschluss: auf der Gegenspur derselben Straße wenden, sofern dort Platz ist
        if (!nach && a.lane.s.achse === 'p') {
          const g = (a.gegen ??= netz.spuren.find((l) => l.s === a.lane.s && l.dir === -a.lane.dir) ?? null);
          if (g && frei(g)) nach = g;
        }
        if (nach) { a.sprung = { von: punkt(a.lane, laenge(a.lane)), nach: punkt(nach, 0), fort: 0 }; a.lane = nach; a.m = 0; a.gegen = undefined; a.warte = 0; }
        else {
          a.m = Math.max(0, laenge(a.lane) - .5);   // warten, bis vorn frei ist
          // Nach 4 s ohne Lücke (Stau-Kreis an Kreuzungen): Wagen an freier Stelle einer anderen sichtbaren Spur neu einsetzen
          if ((a.warte = (a.warte ?? 0) + dt) > 4) neuEinsetzen(a, liste, lage);
        }
      } else a.m = Math.max(a.m, ziel);   // nie rückwärts
      if (!a.sprung || a.m > 0) belegung.set(a.lane.id, a);
      if (a.sprung && !steht) { a.sprung.fort += a.geschw * dt; if (a.sprung.fort >= abstand(a.sprung.von, a.sprung.nach)) a.sprung = null; }
    }
  }
  function positionWagen(a) {
    const p = punkt(a.lane, a.m), q = punkt(a.lane, Math.min(laenge(a.lane), a.m + 1));
    if (a.sprung) {
      const t = clamp(a.sprung.fort / Math.max(.01, abstand(a.sprung.von, a.sprung.nach)), 0, 1);
      const { von, nach } = a.sprung;
      return { x: von.x + (nach.x - von.x) * t, y: .95, z: von.z + (nach.z - von.z) * t,
        winkel: Math.atan2(-(nach.z - von.z), nach.x - von.x) };
    }
    return { ...p, y: .95, winkel: (q.z - p.z || q.x - p.x) ? Math.atan2(-(q.z - p.z), q.x - p.x) : richtungsWinkel(a.lane.s, a.lane.dir, wegStart(a.lane) + a.lane.dir * a.m) };
  }
  function fussBewegen(dt) {
    for (const f of fuss) {
      if (f.phase === 'weg') {
        f.m += f.dir * f.geschw * dt;
        if (f.m < 0 || f.m > laenge(f.weg)) { f.dir *= -1; f.m = clamp(f.m, 0, laenge(f.weg)); }
        if (f.haus && !f.tuete && Math.abs((f.weg.s.von + f.m) - f.haus.u) < 1.5) {
          f.phase = 'hinein'; f.lauf = 0;
        }
      } else {
        f.lauf += dt;
        if (f.phase === 'hinein' && f.lauf >= .9) { f.phase = 'drinnen'; f.lauf = 0; }
        else if (f.phase === 'drinnen' && f.lauf >= 1 + r() * .4) {
          f.phase = 'heraus'; f.lauf = 0;
          f.tuete = r() < clamp(.24 + f.haus.gewicht * .15, .2, .83);
          f.aussehen = { ...f.aussehen, tasche: formatFarbe(f.haus.h) };
        } else if (f.phase === 'heraus' && f.lauf >= .9) { f.phase = 'weg'; f.lauf = 0; f.haus = null; }
      }
    }
  }
  function fussPosition(f) {
    const p = koordinate(f.weg.s, f.weg.s.von + f.m, f.weg.v + (f.quer ?? 0));
    if (!f.haus || f.phase === 'weg') return p;
    const t = f.phase === 'hinein' ? clamp(f.lauf / .9, 0, 1) : f.phase === 'heraus' ? 1 - clamp(f.lauf / .9, 0, 1) : 1;
    return { x: p.x + (f.haus.ein.x - p.x) * t, z: p.z + (f.haus.ein.z - p.z) * t };
  }
  /** Sichtschutz gegen Durchdringung: Fahrzeuge, die ein bereits gezeichnetes überlappen, werden nicht gezeichnet (und neu eingesetzt). */
  const LAENGE = { auto: 4.2, bus: 11.6, tram: 19, lkw: 8 };
  function ueberlappt(p, L, B, q) {
    const hx = Math.cos(p.winkel), hz = -Math.sin(p.winkel), dx = q.x - p.x, dz = q.z - p.z;
    return Math.abs(dx * hx + dz * hz) < (L + q.L) / 2 + 1.2 && Math.abs(dx * hz - dz * hx) < (B + q.B) / 2 + 0.5;   // mit Luft: in der Iso-Ansicht wirken knappe Abstände wie ineinander
  }
  function zeichneInstanzen() {
    if (!meshes.auto) return;
    let n = 0;
    // Gezeichnete Fahrzeuge (Lage, Länge, Breite): große zuerst, dann Lkw, dann Autos
    const belegt = [];
    const pruefe = (p, L, B) => { for (const q of belegt) if (ueberlappt(p, L, B, q) || ueberlappt(q, q.L, q.B, { ...p, L, B })) return false; belegt.push({ ...p, L, B }); return true; };
    for (const a of [...bahnen, ...busse]) { const p = positionWagen(a); a.verdeckt = sichtbar(p) && !pruefe(p, LAENGE[a.art], 2.65); }
    for (const a of lkw) { if (a.fort > 12) continue; belegt.push({ ...a.start, winkel: a.winkel, L: 8, B: 2.6 }); }
    for (const a of autos) {
      const p = positionWagen(a); if (!sichtbar(p)) continue;
      if (!pruefe(p, 4.2, 1.8)) { a.verdeckt = true; continue; }
      a.verdeckt = false;
      matrix(meshes.auto, n, p, p.winkel, [1, 1, 1], a.farbe);
      matrix(meshes.glas, n, { ...p, y: 1.8 }, p.winkel, [1, 1, 1], farbe('#718d9d')); n++;
    }
    fertig(meshes.auto, n); fertig(meshes.glas, n);
    const grosse = (liste, key, palette) => {
      let m = 0;
      for (const a of liste) { const p = positionWagen(a); if (!sichtbar(p) || a.verdeckt) continue; matrix(meshes[key], m++, { ...p, y: 1.65 }, p.winkel, [1, 1, 1], palette); }
      fertig(meshes[key], m);
    };
    grosse(busse, 'bus', farbe('#ffffff'));
    grosse(bahnen, 'tram', farbe('#ffffff'));
    n = 0;
    for (const f of fuss) {
      const p = fussPosition(f);
      if (f.phase === 'drinnen' || !sichtbar(p) || !leute) continue;
      if (belegt.some((q) => ueberlappt(q, q.L, q.B, { x: p.x, z: p.z, L: 0.5, B: 0.5 }))) continue;   // nicht durch Fahrzeuge laufen
      if (plan?.aufFahrbahn?.(p.x, p.z)) continue;   // nie auf Fahrbahn oder Gleis zeichnen
      // Blickrichtung: entlang des Wegs, beim Hinein/Heraus zum bzw. vom Eingang
      let winkel;
      if (f.haus && f.phase !== 'weg') {
        const w = koordinate(f.weg.s, f.weg.s.von + f.m, f.weg.v), e = f.haus.ein;
        winkel = f.phase === 'hinein' ? Math.atan2(-(e.z - w.z), e.x - w.x) : Math.atan2(-(w.z - e.z), w.x - e.x);
      } else {
        winkel = richtungsWinkel(f.weg.s, f.dir, f.weg.s.von + f.m);
      }
      leute.setze(n++, p.x, .3, p.z, winkel, f.aussehen, f.tuete ? 'gehen_tasche' : 'gehen', f.ph, 1, f.tempo);
    }
    if (leute) leute.fertig(n);
    n = 0;
    for (const a of lkw) {
      if (a.fort > 12) continue; // Lkw hat nach der Entladung die Anlieferung wieder verlassen.
      const p = a.start;   // hält am Fahrbahnrand; nicht über Gehweg und Fassade fahren
      if (!sichtbar(p)) continue;
      matrix(meshes.lkw, n++, { ...p, y: 1.7 }, a.winkel, [1, 1, 1], farbe('#ffffff'));
    }
    fertig(meshes.lkw, n);
  }
  function schritt(dt) {
    const t0 = performance.now();
    aktualisiereAuswahl();
    uhr += dt; menschenZeit(uhr);
    bewegungWagen([...autos, ...busse], dt); bewegungWagen(bahnen, dt);
    fussBewegen(dt);
    for (const a of lkw) a.fort += dt;
    zeichneInstanzen();
    const ms = performance.now() - t0;
    frameKosten.push(ms); if (frameKosten.length > 60) frameKosten.shift();
    // iPhone: adaptives Stufenbudget mit Hysterese; unter 2 ms wieder hochfahren.
    const mittel = frameKosten.reduce((a, b) => a + b, 0) / frameKosten.length;
    if (mittel > 2) langsameFrames++; else langsameFrames = Math.max(0, langsameFrames - 1);
    if (langsameFrames >= 12 && limitFaktor > .25) { limitFaktor *= .5; langsameFrames = 0; letzteAuswahl = -1; }
    else if (frameKosten.length === 60 && mittel < .85 && limitFaktor < 1 && !aufnahme) { limitFaktor = Math.min(1, limitFaktor * 2); letzteAuswahl = -1; }
    return ms;
  }
  function takt(zeit) {
    raf = 0;
    if (pause || !scene || modus === 'aus' || document.hidden) return;
    const still = zeit - letzterKontakt > 30000;
    if (still && zeit - zuletzt < 1000 / 15) { raf = requestAnimationFrame(takt); return; }
    const dt = zuletzt ? clamp((zeit - zuletzt) / 1000, 0, .07) : 0;
    zuletzt = zeit;
    if (zoom().halb <= 110) { schritt(dt); zeichnen(); }
    else if (Object.values(meshes).some((m) => m.count) || leute?.mesh.geometry.instanceCount) { autos = []; fuss = []; busse = []; bahnen = []; zeichneInstanzen(); zeichnen(); }
    raf = requestAnimationFrame(takt);
  }
  function starten() { if (!raf && scene && !pause && modus !== 'aus' && !document.hidden) { zuletzt = 0; raf = requestAnimationFrame(takt); } }
  function anhalten() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function stadtSetzen(neu) {
    loeschen();
    scene = szene(); plan = neu;
    if (!scene || !plan) return;
    netz = verkehrsnetz(plan); r = rng((plan.seed ?? 1) * 37 + 907);
    hauspunkte = hausStandorte();
    meshBauen();
    letzterKontakt = performance.now();
    aktualisiereAuswahl(); zeichneInstanzen(); starten();
  }
  function woche(neueBestellungen = 0) {
    if (!scene) return;
    hauspunkte = hausStandorte();
    // Der Einkauf bestellt zentral, nicht je Filiale. Eine Lieferung wird repräsentativ
    // den Häusern dieser Stadt zugeteilt, höchstens ein Lkw pro Haus und Woche.
    const anzahl = Math.min(MAX_LKW, Math.max(0, Math.floor(neueBestellungen)));
    const rang = [...hauspunkte].filter((h) => h.gewicht > 0).sort((a, b) => b.gewicht - a.gewicht);
    lkw = rang.slice(0, anzahl).map((h) => {
      const s = netz.spuren.filter((l) => l.s.typ !== 'fussgaenger')
        .sort((a, b) => abstand(punkt(a, laenge(a) / 2), h.mitte) - abstand(punkt(b, laenge(b) / 2), h.mitte))[0];
      const p = s ? koordinate(s.s, clamp(lageZu(s.s, h.mitte).u, s.s.von + 4, s.s.bis - 4),
        Math.sign(lageZu(s.s, h.mitte).v) * (s.s.achse === 'p' ? Math.max(1.2, (s.s.fahrbahn ?? 6) / 2 - 1.4) : s.s.breite / 2 - .8)) : h.weg;
      const ziel = h.weg; // Vom Fahrbahnrand bis zur Hausanlieferung und zurück.
      return { start: p, ziel, fort: 0, winkel: s ? richtungsWinkel(s.s, 1) : 0, hausId: h.h.id };
    });
    letzteAuswahl = -1; zeichneInstanzen();
    if (modus !== 'aus') zeichnen();
  }
  function setzen(wert) {
    if (!MODI.includes(wert)) return modus;
    modus = wert;
    letzteAuswahl = -1;
    if (modus === 'aus') {
      anhalten(); autos = []; fuss = []; busse = []; bahnen = []; lkw = [];
      for (const m of Object.values(meshes)) { m.count = 0; m.instanceMatrix.needsUpdate = true; }
      leute?.fertig(0);
      if (scene) zeichnen();
    } else { letzterKontakt = performance.now(); aktualisiereAuswahl(); zeichneInstanzen(); starten(); }
    return modus;
  }
  function kontakt() { letzterKontakt = performance.now(); }
  function sichtbarkeit() { if (document.hidden) { anhalten(); zuletzt = 0; } else starten(); }
  canvas.addEventListener('pointerdown', kontakt, { passive: true });
  canvas.addEventListener('wheel', kontakt, { passive: true });
  document.addEventListener('visibilitychange', sichtbarkeit);
  return {
    stadt: stadtSetzen, woche, setzen, get modus() { return modus; },
    kamera: () => { letzteAuswahl = -1; kontakt(); },
    pause: (an) => { pause = !!an; if (pause) anhalten(); else starten(); },
    kontakt, zu: loeschen,
    /** Debug-API und Abnahme: 10 Zeitpunkte im 100-ms-Abstand mit externen Canvas-Screenshots. */
    schritt: (dt = .1, bild = true) => { const ms = schritt(dt); if (bild) zeichnen(); return ms; },
    status: () => ({ modus, autos: autos.length, passanten: fuss.length, busse: busse.length,
      strassenbahnen: bahnen.length, lieferwagen: lkw.length,
      netzSpuren: netz?.spuren.length ?? 0, budget: limitFaktor,
      updateMittelMs: +(frameKosten.reduce((a,b)=>a+b,0) / Math.max(1,frameKosten.length)).toFixed(2),
      akkuFps: performance.now() - letzterKontakt > 30000 ? 15 : 60 }),
    /** Abnahme: Fahrzeugpaare, die sich näher als d Meter kommen (gestapelte Autos). */
    stapel: () => { const w = [...autos, ...busse, ...bahnen], p = w.map(positionWagen), L = (a) => (a.art === 'tram' ? 19 : a.art === 'bus' ? 11.6 : 4.5); let n = 0;
      // Überlappung der Fahrzeugumrisse (Längs- und Querabstand in Fahrtrichtung von i)
      for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
        const hx = Math.cos(p[i].winkel), hz = -Math.sin(p[i].winkel), dx = p[j].x - p[i].x, dz = p[j].z - p[i].z;
        if (Math.abs(dx * hx + dz * hz) < (L(w[i]) + L(w[j])) / 2 - 0.3 && Math.abs(dx * hz - dz * hx) < 1.9) n++;
      }
      return { paare: n, wagen: p.length }; },
    spurBelegung: (id) => [...autos, ...busse].map((a, i) => (a._n ??= Math.random().toString(36).slice(2, 6), a)).filter((a) => a.lane.id === id).map((a) => a._n + '@' + a.m.toFixed(1) + (a.sprung ? 'S' : '')).join(' '),
    gezeichnetStapel: () => { const w = [...bahnen, ...busse, ...autos].filter((a) => !a.verdeckt && sichtbar(positionWagen(a))), p = w.map((a) => ({ ...positionWagen(a), L: LAENGE[a.art], B: a.art === 'auto' ? 2 : 2.65, art: a.art }));
      const out = []; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (ueberlappt(p[i], p[i].L, p[i].B, p[j]) || ueberlappt(p[j], p[j].L, p[j].B, p[i])) out.push([p[i].art, p[j].art, Math.round(p[i].x), Math.round(p[i].z), Math.round(p[j].x), Math.round(p[j].z)]);
      return out; },
    fussAufFahrbahn: () => { if (!plan?.aufFahrbahn) return { maske: false }; let n = 0, m = 0;
      for (const f of fuss) { if (f.phase !== 'weg') continue; const p = fussPosition(f); if (!sichtbar(p)) continue; m++; if (plan.aufFahrbahn(p.x, p.z)) n++; }
      return { maske: true, auf: n, sichtbar: m }; },
    stapelDetail: () => { const w = [...autos, ...busse, ...bahnen], p = w.map(positionWagen), L = (a) => (a.art === 'tram' ? 19 : a.art === 'bus' ? 11.6 : 4.5), out = [];
      for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
        const hx = Math.cos(p[i].winkel), hz = -Math.sin(p[i].winkel), dx = p[j].x - p[i].x, dz = p[j].z - p[i].z;
        if (Math.abs(dx * hx + dz * hz) < (L(w[i]) + L(w[j])) / 2 - 0.3 && Math.abs(dx * hz - dz * hx) < 1.9)
          out.push([i, j].map((k) => ({ lane: w[k].lane.id, dir: w[k].lane.dir, m: +w[k].m.toFixed(1), L: +laenge(w[k].lane).toFixed(1), sprung: !!w[k].sprung, art: w[k].art, quer: +(w[k].quer ?? 0).toFixed(1), warte: +(w[k].warte ?? 0).toFixed(1), winkel: +p[k].winkel.toFixed(2) })));
      }
      return out; },
  };
}
