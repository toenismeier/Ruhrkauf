// Katalog-Harness: rendert viele Einträge als Kacheln auf ein Blatt.
import { THREE, Sammler, neueSzene, renderer, kameraFuer, sonneAuf } from './basis.js';

/**
 * eintraege: [{ titel, unter?, bau(S, scene) -> optional THREE.Box3, hintergrund? }]
 * opts: { titel, spalten = 4, kachel = [480, 480], rand = 1.1 }
 */
export function zeigeKatalog(eintraege, opts = {}) {
  const spalten = opts.spalten ?? 4;
  const [kw, kh] = opts.kachel ?? [480, 480];
  const kopf = 90, beschriftung = 54;
  const zeilen = Math.ceil(eintraege.length / spalten);
  const blatt = document.createElement('canvas');
  blatt.width = spalten * kw;
  blatt.height = kopf + zeilen * (kh + beschriftung);
  const g = blatt.getContext('2d');
  g.fillStyle = '#1d262e'; g.fillRect(0, 0, blatt.width, blatt.height);
  g.fillStyle = '#ffffff'; g.font = 'bold 40px "DejaVu Sans", Arial'; g.fillText(opts.titel ?? 'Katalog', 24, 58);
  g.fillStyle = '#8fa1ae'; g.font = '22px "DejaVu Sans", Arial'; g.fillText(`${eintraege.length} Einträge`, blatt.width - 220, 58);
  const r = renderer(kw, kh);
  const fehler = [];
  const raeume = (scene) => {
    // Geometrien, Materialien und Texturen freigeben, sonst läuft bei vielen großen Kacheln der Speicher voll
    const texs = new Set();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) { for (const k in m) { const v = m[k]; if (v && v.isTexture) texs.add(v); } m.dispose(); }
      if (o.isInstancedMesh && o.dispose) o.dispose();
    });
    for (const t of texs) t.dispose();
    const sm = scene.userData.sonne?.shadow?.map; if (sm) { sm.dispose(); scene.userData.sonne.shadow.map = null; }
    r.renderLists.dispose();
    scene.clear();
  };
  const eineKachel = (e, i) => {
    const x = (i % spalten) * kw, y = kopf + Math.floor(i / spalten) * (kh + beschriftung);
    try {
      const scene = neueSzene(e.hintergrund ?? opts.hintergrund ?? '#4fb6c2');
      const S = new Sammler();
      let box = e.bau(S, scene);
      S.bauen(scene);
      if (!box) box = new THREE.Box3().setFromObject(scene);
      const mitte = box.getCenter(new THREE.Vector3());
      sonneAuf(scene, mitte, box.getSize(new THREE.Vector3()).length() * 0.8 + 10);
      const cam = kameraFuer(kw, kh, box, opts.rand ?? e.rand ?? 1.1);
      r.render(scene, cam);
      g.drawImage(r.domElement, x, y, kw, kh);
      raeume(scene);
    } catch (err) {
      fehler.push(`${e.titel}: ${err.message}`);
      g.fillStyle = '#5a2020'; g.fillRect(x, y, kw, kh);
      g.fillStyle = '#fff'; g.font = '18px sans-serif'; g.fillText(String(err.message).slice(0, 50), x + 10, y + 30);
    }
    g.fillStyle = '#161d23'; g.fillRect(x, y + kh, kw, beschriftung);
    g.fillStyle = '#ffffff'; g.font = 'bold 20px "DejaVu Sans", Arial'; g.fillText(e.titel, x + 14, y + kh + 24, kw - 28);
    if (e.unter) { g.fillStyle = '#8fa1ae'; g.font = '16px "DejaVu Sans", Arial'; g.fillText(e.unter, x + 14, y + kh + 45, kw - 28); }
    g.strokeStyle = '#11161b'; g.lineWidth = 2; g.strokeRect(x, y, kw, kh + beschriftung);
  };
  // Kacheln nacheinander mit kurzer Pause, damit der Browser zwischendurch Speicher freigeben kann
  let i = 0;
  const weiter = () => {
    if (i < eintraege.length) { eineKachel(eintraege[i], i); i++; window.fortschritt = i; setTimeout(weiter, 30); return; }
    window.fehler = fehler;
    window.bild = blatt.toDataURL('image/png');
    window.fertig = true;
  };
  weiter();
}
