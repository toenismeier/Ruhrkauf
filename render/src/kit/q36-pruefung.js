// Q36: Sichtbarkeit des Schriftzugs aus der Spielkamera.
// Zwei Durchgänge mit Kennfarben: (1) ganze Szene, Schriftzug-Buchstaben farbcodiert, alles andere schwarz;
// (2) nur die Buchstaben. Verhältnis der Pixel je Buchstabe = sichtbarer Anteil.
import { THREE } from './basis.js';

const SCHWARZ = new THREE.MeshBasicMaterial({ color: 0x000000 });

// Nur die Glyphe zählt (Alpha der Schrifttextur), nicht die durchsichtige Fläche um den Buchstaben.
function kennMaterial(farbe, map) {
  if (!map) return new THREE.MeshBasicMaterial({ color: farbe, side: THREE.DoubleSide });
  return new THREE.ShaderMaterial({
    uniforms: { farbe: { value: farbe }, map: { value: map } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 farbe; uniform sampler2D map; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(farbe, 1.0); }',
  });
}
function kennfarbe(i) { return new THREE.Color(((i >> 16) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255); }

/**
 * @returns {Array<{ hausId, text, i, sichtbar }>} je Buchstabe der sichtbare Anteil (0..1); Buchstaben außerhalb des Bildes fehlen.
 */
export function schriftzugSichtbarkeit(ren, scene, cam, w, h, filter = () => true) {
  const buchstaben = [], merk = [];
  scene.traverse((o) => {
    if (o.userData?.schriftzug && o.isMesh && filter(o)) buchstaben.push(o);
  });
  if (!buchstaben.length) return [];
  const kenn = new Map();
  buchstaben.forEach((m, k) => kenn.set(m, k + 1));
  // Materialien tauschen, alles Nicht-Mesh ausblenden.
  scene.traverse((o) => {
    if (o === scene) return;
    if (o.isMesh) {
      const k = kenn.get(o);
      merk.push([o, 'material', o.material]);
      o.material = k ? kennMaterial(kennfarbe(k), o.material?.map) : SCHWARZ;
    } else if (o.isSprite && o.userData?.hausId && !o.userData.premiumName && o.visible) {
      // Hauspins zählen als Verdeckung (liegen ohne Tiefentest über allem).
      merk.push([o, 'material', o.material]);
      o.material = new THREE.SpriteMaterial({ map: o.material.map, color: 0x000000, alphaTest: 0.5, depthTest: false, depthWrite: false });
    } else if (o.isSprite || o.isLine || o.isPoints) { merk.push([o, 'visible', o.visible]); o.visible = false; }
  });
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 0 });
  const pixel = new Uint8Array(w * h * 4);
  const zaehle = () => {
    ren.setRenderTarget(rt); ren.setClearColor(0x000000, 1); ren.clear(); ren.render(scene, cam);
    ren.readRenderTargetPixels(rt, 0, 0, w, h, pixel); ren.setRenderTarget(null);
    const n = new Map();
    for (let p = 0; p < pixel.length; p += 4) {
      const k = (pixel[p] << 16) | (pixel[p + 1] << 8) | pixel[p + 2];
      if (k) n.set(k, (n.get(k) ?? 0) + 1);
    }
    return n;
  };
  const alteSchatten = ren.shadowMap.enabled, alterHintergrund = scene.background, alterNebel = scene.fog;
  ren.shadowMap.enabled = false; scene.background = null; scene.fog = null;
  try {
    const ganz = zaehle();
    // Nur Buchstaben: alle anderen Meshes aus.
    const aus = [];
    scene.traverse((o) => { if ((o.isMesh || o.isSprite) && !kenn.has(o) && o.visible) { aus.push(o); o.visible = false; } });
    // Elterngruppen bleiben sichtbar; Buchstaben liegen in Hausgruppen.
    const frei = zaehle();
    for (const o of aus) o.visible = true;
    const erg = [];
    for (const [m, k] of kenn) {
      const f = frei.get(k) ?? 0;
      if (f < 4) continue; // nicht im Bild
      erg.push({ hausId: m.userData.hausId, text: m.userData.schriftzug.text, seite: m.userData.schriftzug.seite, wort: !!m.userData.schriftzug.wort, i: m.userData.schriftzug.i, sichtbar: (ganz.get(k) ?? 0) / f });
    }
    return erg;
  } finally {
    for (const [o, feld, wert] of merk.reverse()) {
      if (feld === 'material' && o.material !== SCHWARZ) o.material.dispose();
      o[feld] = wert;
    }
    ren.shadowMap.enabled = alteSchatten; scene.background = alterHintergrund; scene.fog = alterNebel;
    rt.dispose();
  }
}

/** Bewertung je Haus: vollständig sichtbar (alle ≥ 0,9) oder bewusst ganz verdeckt (alle ≤ 0,1, z. B. Gerüstplane). */
export function bewerteSchriftzug(buchstaben, grenze = 0.9) {
  const je = new Map();
  for (const b of buchstaben) { const k = b.hausId + '|' + b.text + ' ' + b.seite; if (!je.has(k)) je.set(k, []); je.get(k).push(b); }
  const fehler = [];
  for (const [k, liste] of je) {
    const soll = [...liste[0].text].filter((c) => c !== ' ').length;
    if (liste[0].wort) { // ganzer Schriftzug als eine Fläche: ein verdeckter Buchstabe wären rund 1/7
      const v = Math.min(...liste.map((b) => b.sichtbar));
      if (v < 0.97 && v > 0.1) fehler.push(k.replace('|', ' „') + '“: Schriftzug nur zu ' + Math.round(v * 100) + ' % sichtbar');
      continue;
    }
    if (liste.length < soll) { fehler.push(k.replace('|', ' „') + '“: nur ' + liste.length + ' von ' + soll + ' Buchstaben vorhanden'); continue; }
    const verdeckt = liste.filter((b) => b.sichtbar < grenze);
    if (!verdeckt.length) continue;
    if (liste.every((b) => b.sichtbar <= 0.1)) continue;
    fehler.push(k.replace('|', ' „') + '“: ' + verdeckt.length + ' von ' + liste.length + ' Buchstaben verdeckt (min. '
      + Math.round(Math.min(...verdeckt.map((b) => b.sichtbar)) * 100) + ' % sichtbar)');
  }
  return fehler;
}
