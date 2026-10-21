// N11: App-Signet aus dem unveränderten Hartwig-Grafik-Kit (iso 45°/30°).
import { THREE, KompaktSammler, neueSzene, renderer, kameraFuer } from './basis.js';
import { warenhaus } from './warenhaus.js';

const haus = {
  id: 'hartwig-app-symbol', stadt: 'Essen', format: 'warenhaus', lage: 'innenstadt',
  baujahr: 1961, fassade: 2, substanz: 94, grundflaecheQm: 1550,
  etagen: [0, 1, 2, 3, 4], status: 'offen', flaechen: []
};
try {
  const scene = neueSzene('#4fb6c2');
  const S = new KompaktSammler();
  const result = warenhaus(S, scene, haus, { x: 0, z: 0, vorplatz: false, passanten: false });
  S.bauen(scene, false);
  const ren = renderer(512, 512);
  ren.shadowMap.enabled = false;
  const box = new THREE.Box3(
    new THREE.Vector3(-4, 0, -4),
    new THREE.Vector3(result.w + 5, result.hoehe + 7, result.d + 5)
  );
  ren.render(scene, kameraFuer(512, 512, box, 1.20));

  const bild = document.createElement('canvas');
  bild.width = bild.height = 512;
  const ctx = bild.getContext('2d');
  ctx.fillStyle = '#d23c32';
  ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(32, 32, 448, 448, 66);
  ctx.clip();
  ctx.fillStyle = '#4fb6c2';
  ctx.fillRect(32, 32, 448, 448);
  ctx.drawImage(ren.domElement, 32, 32, 448, 448);
  ctx.restore();
  ctx.fillStyle = '#d23c32';
  ctx.fillRect(72, 395, 368, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HARTWIG', 256, 431);
  window.appSymbol = bild.toDataURL('image/png');

  window.appStartbild = (breite, hoehe) => {
    const c = document.createElement('canvas');
    c.width = breite; c.height = hoehe;
    const g = c.getContext('2d');
    g.fillStyle = '#4fb6c2'; g.fillRect(0, 0, breite, hoehe);
    const seite = Math.round(Math.min(breite * 0.55, hoehe * 0.35, 570));
    const x = Math.round((breite - seite) / 2), y = Math.round((hoehe - seite) / 2 - hoehe * 0.055);
    g.drawImage(bild, x, y, seite, seite);
    g.textAlign = 'center'; g.fillStyle = '#ffffff';
    g.font = 'bold ' + Math.round(seite * 0.13) + 'px Arial, sans-serif';
    g.fillText('HARTWIG', breite / 2, y + seite + seite * 0.27);
    return c.toDataURL('image/png');
  };
  window.appFertig = true;
} catch (e) {
  window.appFehler = e.stack || e.message;
  window.appFertig = true;
}
