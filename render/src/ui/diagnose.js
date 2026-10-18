// Realer Mobil-Benchmark: 90 aktiv gerenderte Frames, nicht nur die theoretische Display-Refresh-Rate.
// Messung erfolgt auf dem Geraet, auf dem das Spiel gerade laeuft. Keine Telemetrie.
const runde = (x) => Math.round(x * 10) / 10;
const perzentil = (a, p) => a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)];
export async function messen({ renderer, scene, camera, info }) {
  if (!scene || !camera) throw new Error('Bitte zuerst ein Spiel starten.');
  const renderMs = [], frameMs = [];
  let vorher = 0;
  for (let i = 0; i < 90; i++) {
    const zeit = await new Promise((resolve) => requestAnimationFrame(resolve));
    if (vorher) frameMs.push(zeit - vorher);
    vorher = zeit;
    const start = performance.now();
    renderer.render(scene(), camera());
    renderMs.push(performance.now() - start);
  }
  const sort = (a) => [...a].sort((x, y) => x - y);
  const f = sort(frameMs), r = sort(renderMs);
  const frameMittel = frameMs.reduce((a, b) => a + b, 0) / frameMs.length;
  const extra = info ? info() : {};
  return {
    frames: renderMs.length,
    fps: runde(1000 / frameMittel),
    frameP95Ms: runde(perzentil(f, 0.95)),
    renderMittelMs: runde(renderMs.reduce((a, b) => a + b, 0) / renderMs.length),
    renderP95Ms: runde(perzentil(r, 0.95)),
    frameUeber33ms: frameMs.filter((x) => x > 33.4).length,
    drawCalls: renderer.info.render.calls,
    dreiecke: renderer.info.render.triangles,
    geometrien: renderer.info.memory.geometries,
    texturen: renderer.info.memory.textures,
    pixelRatio: renderer.getPixelRatio(),
    ...extra,
  };
}
