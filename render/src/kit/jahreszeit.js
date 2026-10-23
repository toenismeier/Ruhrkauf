// N06: Ausschließlich grafische Jahreszeiten. Keine Engine-Wirkung und kein Stadtplan-Neubau.
// Die normalen Props bleiben bestehen; nur Instanzfarben/Sichtbarkeit und eigene Overlays wechseln.
import { THREE, rng, Sammler } from './basis.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Bis N13 integriert ist, dient diese Konstante als abschaltbarer Feature-Schalter.
export const JAHRESZEITEN_AN = true;
const LAUB = new Set(['linde', 'kastanie', 'platane', 'birke', 'pappel', 'kugel']);
const PALETTEN = {
  fruehling: ['#a3d578', '#b9da82', '#92ce75', '#c1dc8b'],
  sommer: ['#4c944d', '#39864b', '#5a9f52', '#347d48'],
  herbst: ['#f0bd49', '#df7c34', '#c64c37', '#e5a33f'],
};
const OBERTEILE = ['#fff1bb', '#e7cdb4', '#e4a7a0', '#91c9d7', '#f0daa0'];
const R = (seed) => rng('jahreszeiten/' + seed);

export function jahreszeit(s) {
  const woche = Math.max(0, Math.floor(Number(s?.woche ?? 0)));
  const kw = woche % 52 + 1;
  const name = kw <= 9 || kw >= 49 ? 'winter' : kw <= 22 ? 'fruehling' : kw <= 35 ? 'sommer' : 'herbst';
  const jahr = (s?.startJahr ?? 2026) + Math.floor(woche / 52);
  const aktionen = (s?.marketing?.aktionen ?? []).filter((a) => a.start <= woche && woche < a.ende);
  const anlaesse = new Set(aktionen.map((a) => a.anlass).filter(Boolean));
  // Das Weihnachtsbild beginnt vor der Weihnachtsaktion mit dem Advent in KW 47.
  if (kw >= 47) anlaesse.add('weihnachten');
  const schnee = kw >= 2 && kw <= 7 && R((s?.seed ?? 0) + '/' + jahr + '/' + kw)() < 0.4;
  const wetter = s?.wetter?.art ?? s?.wetter?.typ ?? null;
  return { kw, jahr, name, anlaesse, schnee, regen: wetter === 'regen', hitze: wetter === 'hitze' };
}

function maschen(scene) {
  const baeume = [], figuren = [];
  scene.traverse((m) => {
    const art = m.userData?.jahreszeitArt;
    // Vorgerenderte Figuren (menschen.js): Oberteilfarben stehen im Instanzattribut iOben
    if (art === 'menschen' && m.userData.menschen) {
      const a = m.geometry.getAttribute('iOben');
      if (a) figuren.push({ m, art, menschen: a, farben: new Float32Array(a.array) });
      return;
    }
    if (!m.isInstancedMesh || !art || m.userData.jahreszeitSlot !== 0 || !m.instanceColor) return;
    const entry = { m, art, farben: new Float32Array(m.instanceColor.array) };
    if (LAUB.has(art)) baeume.push(entry);
    if (art.startsWith('figur')) figuren.push(entry);
  });
  return { baeume, figuren };
}

function zweigGeometrie() {
  // Einfacher kahler Baum: Stamm bleibt aus dem Original sichtbar, hier nur Äste.
  const teile = [];
  for (const [winkel, hoehe, laenge] of [[0, 3.45, 2.0], [1.25, 4.3, 2.1], [2.5, 4.0, 1.9], [3.75, 4.7, 1.8], [5.0, 3.6, 1.7]]) {
    const g = new THREE.BoxGeometry(0.17, laenge, 0.17);
    g.rotateZ(0.75); g.rotateY(winkel);
    g.translate(Math.sin(winkel) * 0.55, hoehe, Math.cos(winkel) * 0.55);
    teile.push(g);
  }
  const geo = mergeGeometries(teile, false);
  teile.forEach((g) => g.dispose());
  return geo;
}
const addBox = (S, x, y, z, w, h, d, farbe) => S.box(w, h, d, x, y, z, farbe);

function weihnachtsmarkt(S, plan) {
  const plaetze = (plan.bloecke ?? []).filter((b) =>
    ['markt', 'platz'].includes(b.art) && (b.platz ?? b).w > 18 && (b.platz ?? b).d > 18
  ).sort((a, b) => (b.platz ?? b).w * (b.platz ?? b).d - (a.platz ?? a).w * (a.platz ?? a).d);
  const p = plaetze[0]?.platz ?? plaetze[0];
  if (!p) return 0;
  // Acht Buden am Platzrand, die Platzmitte bleibt für Brunnen und Fußgänger frei.
  const raster = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
  const schrittX = Math.min(8, p.w / 4), schrittZ = Math.min(9, p.d / 4);
  const startX = p.x + p.w / 2 - schrittX, startZ = p.z + p.d / 2 - schrittZ;
  for (let i = 0; i < raster.length; i++) {
    const [rx, rz] = raster[i];
    const x = startX + rx * schrittX, z = startZ + rz * schrittZ;
    const farbe = i % 2 ? '#a92f34' : '#245b43';
    addBox(S, x, .75, z, 3.4, 1.2, 2.7, '#936e4e');
    addBox(S, x, 2.15, z, 3.8, .25, 3.0, farbe);
    for (const dx of [-1.5, 1.5]) for (const dz of [-1.1, 1.1]) addBox(S, x + dx, 1.35, z + dz, .16, 2.6, .16, '#e0c49a');
    for (const dx of [-1.2, 0, 1.2]) addBox(S, x + dx, 2.38, z + 1.25, .18, .22, .18, '#ffe79a');
  }
  return raster.length;
}
function tanne(S, x, z, h = 6) {
  addBox(S, x, .9, z, .48, 1.8, .48, '#78533b');
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.ConeGeometry(2.25 - i * .46, 2.5, 7);
    geo.translate(x, 2.2 + i * 1.35, z);
    S.add(geo, '#286c44');
  }
  addBox(S, x, h + .15, z, .45, .45, .45, '#f6cf69');
}
function festSchmuck(S, plan) {
  // Quer über Einkaufsstraßen, nie zwischen Wohnhäusern mitten im Block.
  const einkauf = (plan.strassen ?? []).filter((s) => (s.typ === 'fussgaenger' || s.typ === 'haupt') && !s.bruecke);
  for (const s of einkauf.slice(0, 9)) {
    const ab = Math.max(14, s.breite - 3);
    for (let u = s.von + 12; u < s.bis - 9; u += 24) {
      const zAchse = s.achse === 'z';
      for (let i = 0; i <= 8; i++) {
        const v = -ab / 2 + i * ab / 8;
        const x = zAchse ? s.mitte + v : u, z = zAchse ? u : s.mitte + v;
        addBox(S, x, 6.2 - .4 * Math.sin(Math.PI * i / 8), z, .18, .16, .18, i % 3 ? '#ffe5a0' : '#dc6141');
      }
    }
  }
  for (const p of plan.parzellen ?? []) {
    const rolle = p.standort?.rolle;
    if (!['warenhaus', 'premium', 'sport'].includes(rolle)) continue;
    tanne(S, p.x + Math.min(p.w - 2, 3.5), p.z + Math.min(p.d - 2, 3.5));
  }
  weihnachtsmarkt(S, plan);
}

function sommerLeben(S, plan) {
  const fuss = (plan.strassen ?? []).filter((s) => s.typ === 'fussgaenger' && s.bis - s.von >= 30);
  const r = R(plan.seed + '/sommer');
  for (const seg of fuss.slice(0, 6)) {
    const zAchse = seg.achse === 'z';
    for (const richtung of [-1, 1]) {
      const u = seg.von + 9 + r() * Math.min(10, seg.bis - seg.von - 21);
      const v = richtung * (seg.breite / 2 - 4.5);
      const x = zAchse ? seg.mitte + v : u, z = zAchse ? u : seg.mitte + v;
      for (let i = 0; i < 2; i++) {
        const tx = x + (zAchse ? .0 : i * 2.8), tz = z + (zAchse ? i * 2.8 : 0);
        addBox(S, tx, .92, tz, 1.1, .11, 1.1, '#d9b98e');
        addBox(S, tx, .58, tz, .14, .5, .14, '#6b615a');
        for (const dx of [-.65, .65]) addBox(S, tx + dx, .59, tz, .32, .46, .38, '#637a78');
      }
      addBox(S, x + (zAchse ? 2.0 : 0), 2.65, z + (zAchse ? 0 : 2.0), .13, 4.5, .13, '#e6dfd4');
      const geo = new THREE.ConeGeometry(2.0, .7, 8);
      geo.translate(x + (zAchse ? 2 : 0), 4.75, z + (zAchse ? 0 : 2));
      S.add(geo, '#eed8b3');
    }
  }
  // Zusätzliche Passanten im Sommer: nur in den Einkaufsstraßen und außerhalb der Fahrbahn.
  // Gedämpftes Teilebudget: vier Figuren je Einkaufssegment, alle Geometrien zusammengefasst.
  for (const seg of fuss.slice(0, 3)) {
    const zAchse = seg.achse === 'z';
    for (let i = 0; i < 4; i++) {
      const u = seg.von + (i + 1) * (seg.bis - seg.von) / 5;
      const v = (i % 2 ? 1 : -1) * (seg.breite / 2 - 3.0);
      const x = zAchse ? seg.mitte + v : u, z = zAchse ? u : seg.mitte + v;
      addBox(S, x, 1.48, z, .42, .7, .36, OBERTEILE[i % OBERTEILE.length]);
      addBox(S, x, .63, z, .3, .88, .3, '#677b8b');
      addBox(S, x, 2.04, z, .29, .33, .3, '#e5b38f');
    }
  }
  const seg = fuss[0];
  if (seg) {
    const u = (seg.von + seg.bis) / 2, v = 0;
    const x = seg.achse === 'z' ? seg.mitte + v : u, z = seg.achse === 'z' ? u : seg.mitte + v;
    addBox(S, x, 1.2, z, 3.4, 2.1, 2.0, '#f0e7d8');
    addBox(S, x, 2.4, z, 3.7, .4, 2.3, '#e7a0ab');
    addBox(S, x + 1.75, 1.8, z, .26, .6, 1.9, '#c77d3c');
    for (let i = 0; i < 5; i++) addBox(S, x - 1.3 + i * .6, 2.75, z + 1.18, .23, .26, .12, ['#eccb68', '#a6d5ab', '#efad9f'][i % 3]);
  }
}

/**
 * Q09: Keine horizontalen Schneetafeln mehr. Jede weiße Fläche ist ein echtes
 * Dach-Dreieck aus stadt.js (je Dachebene eingerückt), um 0,065 m entlang seiner Normale versetzt.
 * Der freie Dachrand lässt Traufe, Technik und Dachschrift sichtbar.
 * Ein gemeinsames Mesh für die ganze Stadt begrenzt die Draw Calls.
 */
function schneeMesh(dachFlaechen, material) {
  const punkte = [];
  for (const ecken of dachFlaechen ?? []) {
    if (!Array.isArray(ecken) || ecken.length !== 3) continue;
    const [a, b, c] = ecken;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const norm = Math.hypot(nx, ny, nz);
    if (!Number.isFinite(norm) || norm < 1e-6 || ny <= 0) continue;
    // Die Flächen kommen je Dachebene eingerückt aus stadt.js (dachEinruecken),
    // hier nur knapp über die Dachneigung anheben.
    for (const v of ecken) punkte.push(
      v[0] + nx / norm * .065,
      v[1] + ny / norm * .065,
      v[2] + nz / norm * .065
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(punkte, 3));
  if (punkte.length) geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'Schnee auf Dachflächen';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}
function randSchnee(S, plan) {
  // Gehwegränder, keine Schneegeometrie auf der Fahrbahn.
  for (const s of (plan.strassen ?? []).filter((q) => q.typ !== 'fussgaenger' && !q.bruecke).slice(0, 350)) {
    const l = s.bis - s.von;
    if (l < 4) continue;
    for (const sg of [-1, 1]) {
      const v = sg * (s.breite / 2 - .55);
      const u = (s.von + s.bis) / 2;
      const x = s.achse === 'z' ? s.mitte + v : u, z = s.achse === 'z' ? u : s.mitte + v;
      addBox(S, x, .36, z, s.achse === 'z' ? .6 : l, .1, s.achse === 'z' ? l : .6, '#eef2f2');
    }
  }
}
function regenOverlay(S, plan) {
  const r = R(plan.seed + '/regen');
  const x0 = plan.breite * .35, x1 = plan.breite * .65, z0 = plan.tiefe * .35, z1 = plan.tiefe * .65;
  for (let i = 0; i < 80; i++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    addBox(S, x, 9 + r() * 6, z, .035, 1.8 + r(), .035, '#a4d2e0');
  }
}

export function jahreszeitenStadt(scene, plan, hoehen, spielstand, aktiv = JAHRESZEITEN_AN, dachFlaechen = []) {
  // Die Instanzen sind im Grundgerüst bereits vollständig gebaut; sie werden nie erneut instanziiert.
  const { baeume, figuren } = maschen(scene);
  const wurzel = new THREE.Group(); wurzel.name = 'Jahreszeiten';
  const fest = new THREE.Group(), sommer = new THREE.Group(), schnee = new THREE.Group(), regen = new THREE.Group(), winter = new THREE.Group();
  const bauen = (gruppe, fn) => {
    // Späterer Wechsel verändert nur visible; zusammengefasste Meshes halten die Draw Calls klein.
    const S = new Sammler();
    fn(S); S.bauen(gruppe);
  };
  // Sammler spät gebunden, damit dieses Modul keinerlei globale Stadt-Generatoren konfiguriert.
  bauen(fest, (S) => festSchmuck(S, plan));
  bauen(sommer, (S) => sommerLeben(S, plan));
  bauen(schnee, (S) => randSchnee(S, plan));
  const dachMaterial = new THREE.MeshLambertMaterial({ color: '#ebefec', side: THREE.DoubleSide, depthWrite: true });
  const kachelDaecher = new Map();
  let dachMesh = schneeMesh(dachFlaechen, dachMaterial);
  schnee.add(dachMesh);
  const setzeDachKacheln = (eintraege) => {
    for (const [id, flaechen] of eintraege) {
      if (flaechen?.length) kachelDaecher.set(id, flaechen);
      else kachelDaecher.delete(id);
    }
    schnee.remove(dachMesh);
    dachMesh.geometry.dispose();
    dachMesh = schneeMesh([...dachFlaechen, ...[...kachelDaecher.values()].flat()], dachMaterial);
    schnee.add(dachMesh);
  };
  bauen(regen, (S) => regenOverlay(S, plan));
  const geo = zweigGeometrie(), mat = new THREE.MeshLambertMaterial({ color: '#806b50' });
  const matrix = new THREE.Matrix4();
  for (const { m } of baeume) {
    const aeste = new THREE.InstancedMesh(geo, mat, m.count);
    for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, matrix); aeste.setMatrixAt(i, matrix); }
    aeste.instanceMatrix.needsUpdate = true;
    aeste.castShadow = false;
    winter.add(aeste);
  }
  wurzel.add(fest, sommer, schnee, regen, winter);
  scene.add(wurzel);
  let letzteSaison = null, letzterSchluessel = null;
  const setze = (s = spielstand, ein = aktiv) => {
    const j = jahreszeit(s);
    const an = !!ein;
    const schluessel = [j.name, j.kw, j.schnee, j.regen, an].join('/');
    if (schluessel === letzterSchluessel) return j;
    letzterSchluessel = schluessel;
    if (letzteSaison !== (an ? j.name : 'aus')) {
      letzteSaison = an ? j.name : 'aus';
      for (const { m, art, farben } of baeume) {
        m.visible = !an || j.name !== 'winter';
        if (!an) m.instanceColor.array.set(farben);
        else {
          const r = R(plan.seed + '/' + art);
          for (let i = 0; i < m.count; i++) {
            const farbe = PALETTEN[j.name]?.[Math.floor(r() * PALETTEN[j.name].length)];
            if (farbe) {
              const c = new THREE.Color(j.name === 'fruehling' && r() < .28 ? '#e8c8d5' : farbe);
              m.setColorAt(i, c);
            }
          }
        }
        m.instanceColor.needsUpdate = true;
      }
      for (const { m, farben, menschen } of figuren) {
        if (menschen) {
          if (an && j.name === 'sommer') {
            const r = R(plan.seed + '/sommer/menschen');
            const c = new THREE.Color();
            for (let i = 0; i < menschen.count; i++) { c.set(OBERTEILE[Math.floor(r() * OBERTEILE.length)]); c.convertLinearToSRGB(); menschen.setXYZ(i, c.r, c.g, c.b); }
          } else menschen.array.set(farben);
          menschen.needsUpdate = true;
          continue;
        }
        if (an && j.name === 'sommer') {
          const r = R(plan.seed + '/sommer/figuren');
          for (let i = 0; i < m.count; i++) m.setColorAt(i, new THREE.Color(OBERTEILE[Math.floor(r() * OBERTEILE.length)]));
        } else m.instanceColor.array.set(farben);
        m.instanceColor.needsUpdate = true;
      }
    }
    winter.visible = an && j.name === 'winter';
    fest.visible = an && j.anlaesse.has('weihnachten');
    sommer.visible = an && j.name === 'sommer';
    schnee.visible = an && j.schnee;
    regen.visible = an && j.regen;
    return j;
  };
  setze(spielstand, aktiv);
  return {
    aktualisiere: setze,
    abschalten: () => setze(spielstand, false),
    registriereDachflaechen: (id, flaechen) => setzeDachKacheln([[id, flaechen]]),
    registriereDachflaechenMehrfach: (eintraege) => setzeDachKacheln(eintraege),
    aufraeumen() {
      wurzel.parent?.remove(wurzel);
      wurzel.traverse((m) => { if (m.geometry && m.geometry !== geo) m.geometry.dispose(); });
      geo.dispose(); mat.dispose(); dachMaterial.dispose();
    },
  };
}
