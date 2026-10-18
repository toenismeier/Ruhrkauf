// Massenproduktion: alle 180 Häuser aus haeuser.json.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus, FAMILIEN } from '../kit/warenhaus.js';
import haeuser from '../../haeuser.json';

const stat = [];
const t0 = performance.now();
let letzteSonne = null;
const eintraege = haeuser.map((h) => ({
  titel: h.name,
  unter: `${h.baujahr} · ${h.etagen.filter((e) => e >= 0).length} Et. · ${h.grundflaecheQm} m²`,
  bau(S, scene) {
    // Schattenkarte der vorigen Kachel freigeben (sonst läuft bei vielen Kacheln der GPU-Speicher voll)
    if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
    letzteSonne = scene.userData.sonne;
    letzteSonne.shadow.mapSize.set(2048, 2048);
    const t = performance.now();
    const erg = warenhaus(S, scene, h, { x: 0, z: 0 });
    stat.push({ id: h.id, fam: erg.familie, teile: erg.teile, w: erg.w, d: erg.d, h: +erg.hoehe.toFixed(1), ms: +(performance.now() - t).toFixed(1) });
    sockel(S, 0, 0, erg.w, erg.d, 4);
    return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(erg.w + 4, erg.hoehe, erg.d + 4));
  },
}));
// Erst nach dem load-Ereignis rechnen, sonst läuft page.goto des Renderers in sein 30-s-Limit.
setTimeout(() => {
  const t1 = performance.now();
  zeigeKatalog(eintraege, { titel: 'Hartwig – alle 180 Häuser', spalten: 10, kachel: [300, 300] });
  const bauMs = stat.reduce((a, s) => a + s.ms, 0);
  console.log(`STAT gesamt ${(performance.now() - t1).toFixed(0)} ms, davon Geometrie ${bauMs.toFixed(0)} ms, max Teile ${Math.max(...stat.map((s) => s.teile))}`);
  console.log('STATJSON ' + JSON.stringify(stat));
  void FAMILIEN; void t0;
}, 50);
