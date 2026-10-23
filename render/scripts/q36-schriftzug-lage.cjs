// Q36: Sichtprüfung der Hartwig-Schriftzüge aus der Spielkamera und Ablage der Ausweichlage in schriftzug-lage.json.
// Ist ein Schriftzug von Nachbarbauten verdeckt, werden der Reihe nach Verschiebungen entlang der Fassade,
// die Dachschrift und Dachschrift mit Verschiebung probiert; die erste vollständig sichtbare Lage wird gespeichert.
// Aufruf: cd render && node scripts/q36-schriftzug-lage.cjs [Stadt,Stadt] [--teil=1/2]
// Ergebnis je Teil in out/q36-lage-<teil>.json; zusammenführen mit --zusammen.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
if (args.includes('--zusammen')) {
  const lage = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'out')).filter((f) => /^q36-lage-.*\.json$/.test(f)).sort()) Object.assign(lage, JSON.parse(fs.readFileSync(path.join(ROOT, 'out', f), 'utf8')));
  const sortiert = Object.fromEntries(Object.keys(lage).sort().map((k) => [k, lage[k]]));
  fs.writeFileSync(path.join(ROOT, 'schriftzug-lage.json'), JSON.stringify(sortiert, null, 1) + '\n');
  console.log('schriftzug-lage.json: ' + Object.keys(sortiert).length + ' Häuser');
  process.exit(0);
}
const VERSUCHE = [
  ...[-4, 4, -8, 8, -12, 12, -16, 16, -22, 22].map((du) => ({ du })),
  { dach: true }, ...[-6, 6, -12, 12].map((du) => ({ dach: true, du })),
];

(async () => {
  const liste = args.find((a) => !a.startsWith('--'));
  const teil = args.find((a) => a.startsWith('--teil='))?.slice(7).split('/').map(Number);
  const optionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(optionen);
  const lage = {}, offen = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', (e) => console.error('Browser: ' + e.message));
    await page.goto('file://' + path.join(ROOT, 'spiel.html') + '?seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 0 });
    const alle = await page.evaluate(() => [...document.querySelectorAll('#stadtwahl option')].map((e) => e.value));
    const staedte = (liste ? liste.split(',') : alle).filter((_, i) => !teil || i % teil[1] === teil[0] - 1);
    for (const stadt of staedte) {
      // Ohne Ausweichlagen bauen: Ausgangspunkt ist immer der unveränderte Schriftzug.
      const pins = await page.evaluate((s) => { globalThis.Q36_LAGE = {}; window.spiel.stadt(s); return window.spiel.hauspinListe(); }, stadt);
      for (const p of pins.filter((q) => q.format === 'warenhaus')) {
        const pruefe = async () => {
          await page.evaluate(({ p }) => window.spiel.kamera({ x: p.dach.x, z: p.dach.z, halb: 60 }), { p });
          await page.waitForFunction(() => window.kachelnRuhig !== false, null, { timeout: 0, polling: 100 });
          return page.evaluate(({ p }) => window.spiel.pruefeSchriftzug(p.hausId, 60, 2000, true).fehler, { p });
        };
        let fehler = await pruefe();
        if (!fehler.length) continue;
        const seiten = [...new Set(fehler.map((f) => f.match(/HARTWIG (\+[xz])/)?.[1]).filter(Boolean))];
        const gewaehlt = {};
        for (const seite of seiten) {
          let ok = null;
          for (const v of VERSUCHE) {
            await page.evaluate(({ id, seite, v, gewaehlt }) => { globalThis.Q36_LAGE = { [id]: { ...gewaehlt, [seite]: v } }; window.spiel.sb.neuBauen(id); }, { id: p.hausId, seite, v, gewaehlt });
            fehler = await pruefe();
            if (!fehler.some((f) => f.includes('HARTWIG ' + seite))) { ok = v; break; }
          }
          if (ok) gewaehlt[seite] = ok; else offen.push(stadt + ' ' + p.hausId + ' ' + seite);
        }
        if (Object.keys(gewaehlt).length) lage[p.hausId] = gewaehlt;
        console.log(stadt + ';' + p.hausId + ';' + JSON.stringify(gewaehlt));
        await page.evaluate(() => { globalThis.Q36_LAGE = {}; });
      }
    }
  } finally { await browser.close(); }
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'out', 'q36-lage-' + (teil ? teil.join('-von-') : 'liste') + '.json'), JSON.stringify(lage, null, 1));
  for (const o of offen) console.error('OFFEN ' + o);
  console.log('Lagen: ' + Object.keys(lage).length + ', offen: ' + offen.length);
})().catch((e) => { console.error(e); process.exitCode = 1; });
