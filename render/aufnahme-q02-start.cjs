// Q02: echte Startsequenz aufzeichnen und Zeitstempel der Screenshots messen.
// Aufruf nach "node spiel-render.js --bundle": node aufnahme-q02-start.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const dir = path.join(__dirname, 'out', 'q02-start');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(__dirname, 'spiel.html'), { waitUntil: 'load' });
    // N09: zuerst Szenario wählen.
    await p.click('.sz-karte[data-szenario=standard]');
    await p.waitForSelector('#startknopf');
    const beginn = Date.now(), messungen = [];
    await p.click('#startknopf', { noWaitAfter: true });
    for (const soll of [0, 500, 1000, 2000, 3000, 5000, 8000]) {
      const warte = soll - (Date.now() - beginn);
      if (warte > 0) await new Promise((resolve) => setTimeout(resolve, warte));
      const pfad = path.join(dir, 'start-' + String(soll).padStart(4, '0') + '.png');
      await p.screenshot({ path: pfad, animations: 'disabled' });
      const status = await p.evaluate(() => ({
        bereit: !!window.bereit, phase: window.spiel?.q02Start?.phase ?? 'unbekannt',
        zeit: window.spiel?.q02Start?.zeit ?? null,
        teile: window.spiel?.teileStand?.() ?? null,
      })).catch((e) => ({ fehler: e.message }));
      messungen.push({ sollMs: soll, istMs: Date.now() - beginn, datei: pfad, ...status });
    }
    fs.writeFileSync(path.join(dir, 'messung.json'), JSON.stringify(messungen, null, 2));
    console.log(JSON.stringify(messungen, null, 2));
    if (!messungen.some((v) => v.bereit)) console.warn('Stadt innerhalb von 3 Sekunden noch nicht bereit – Hardware und Baseline vergleichen.');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
