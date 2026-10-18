// Seite für pruef-render.js: baut eine Stadt (aus location.hash) als ganze Stadt und rendert sie in eine kleine Kachel.
// Ergebnis in window.ergebnis: { stadt, erfolg, dreiecke, drawcalls, teile, verworfen, instanzen, ms, heapMB, fehler }.
import { THREE, Sammler, neueSzene, renderer, kameraFuer, sonneAuf } from './kit/basis.js';
import { standortEintrag } from './kataloge/_standorte-staedte.js';
import { stadtplan, bauerFuer } from './kit/stadt.js';
import { stadtDaten } from './kit/staedte.js';
import { echterBauer } from './kit/bauer.js';

/** Modus zeit: jede Parzelle einzeln bauen und die Zeit je Bauer (Typ und Variante) messen, ohne Rendern. */
function zeitMessung(name) {
  const s = stadtDaten(name);
  const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
  const bauer = echterBauer(), stat = {};
  for (const p of plan.parzellen) {
    const S = new Sammler(), scene = new THREE.Scene(), t0 = performance.now();
    bauerFuer(bauer, p.typ)(S, scene, p);
    const dt = performance.now() - t0, k = p.typ + (p.variante ? ':' + p.variante : '');
    const e = stat[k] ?? (stat[k] = { n: 0, summe: 0, max: 0 });
    e.n++; e.summe += dt; e.max = Math.max(e.max, dt);
  }
  return stat;
}

const [name, groesse, modus] = decodeURIComponent(location.hash.slice(1)).split('|');
const [kw, kh] = (groesse ?? '640x360').split('x').map(Number);
window.addEventListener('load', () => setTimeout(() => {
  const t0 = performance.now();
  const erg = { stadt: name, erfolg: false, kachel: `${kw}x${kh}` };
  if (modus === 'zeit') { try { erg.zeit = zeitMessung(name); erg.erfolg = true; } catch (err) { erg.fehler = String(err?.stack ?? err).slice(0, 300); } erg.ms = Math.round(performance.now() - t0); window.ergebnis = erg; return; }
  try {
    const e = standortEintrag(name, 'stadt', 62, null, '', { statistik: true });
    const scene = neueSzene();
    const S = new Sammler();
    const box = e.bau(S, scene);
    S.bauen(scene);
    sonneAuf(scene, box.getCenter(new THREE.Vector3()), box.getSize(new THREE.Vector3()).length() * 0.8 + 10);
    const r = renderer(kw, kh);
    r.info.autoReset = true;
    r.render(scene, kameraFuer(kw, kh, box, 1.0));
    let inst = 0, dreieckeGeo = 0, dreieckeInst = 0; const proto = {};
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      if (o.isInstancedMesh) { inst += o.count; dreieckeGeo += n * o.count; dreieckeInst += n * o.count; proto[n] = (proto[n] ?? 0) + n * o.count; } else dreieckeGeo += n;
    });
    Object.assign(erg, { erfolg: true, dreiecke: Math.round(dreieckeGeo), dreieckeGerendert: r.info.render.triangles, dreieckeInst: Math.round(dreieckeInst), proto, drawcalls: r.info.render.calls, teile: S.anzahl, instanzen: inst, unter: e.unter, statistik: e.statistik, verworfen: e.verworfen });
    window.bild = r.domElement.toDataURL('image/png');
  } catch (err) { erg.fehler = String(err?.stack ?? err).slice(0, 300); }
  erg.ms = Math.round(performance.now() - t0);
  erg.heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  window.ergebnis = erg;
}, 20));
