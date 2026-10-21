// N07-Bildfolge und Benchmark: cd render && node tests/leben-bilder.cjs
// Echte iPhone-Safari-Messwerte müssen separat auf dem Gerät aufgenommen werden.
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

async function main() {
  const render = path.resolve(__dirname, '..');
  const ziel = path.resolve(render, '../bilder/nice/belebt');
  fs.mkdirSync(ziel, { recursive: true });
  execFileSync(process.execPath, ['spiel-render.js', '--bundle'], { cwd: render, stdio: 'inherit' });
  const o = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) o.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(o);
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    page.on('pageerror', (e) => console.error('Browserfehler:', e.message));
    await page.goto('file://' + path.join(render, 'spiel.html') + '?stadt=Essen&seed=1&leben=aus', { waitUntil: 'load' });
    await page.waitForFunction(() => window.bereit && window.spiel?.leben, null, { timeout: 120000 });
    await page.waitForFunction(() => window.spiel.kachelnRuhig(), null, { timeout: 120000 });
    for (const [name, halb] of [['nah', 32], ['mittel', 76]]) {
      await page.evaluate((h) => {
        window.spiel.leben.pause(true);
        const wahl = document.getElementById('leben-modus');
        wahl.value = 'voll';
        wahl.dispatchEvent(new Event('change', { bubbles: true }));
        window.spiel.kamera({ halb: h });
      }, halb);
      await page.waitForTimeout(400);
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.spiel.leben.schritt(.1));
        await page.waitForTimeout(100);
        await page.locator('#karte').screenshot({ path: path.join(ziel, 'essen-' + name + '-' + String(i).padStart(2, '0') + '.png') });
      }
      console.log('Bildfolge Essen', name, '10 × 100 ms');
    }
    await page.evaluate(() => { window.spiel.leben.setzen('voll'); window.spiel.leben.pause(false); });
    await page.evaluate(() => window.spiel.performanceMessen());
    const diagnose = await page.evaluate(() => window.spiel.letzteDiagnose);
    fs.writeFileSync(path.join(ziel, 'performance-chromium.json'),
      JSON.stringify({ umgebung: 'Playwright/Chromium, kein iPhone-Safari-Messwert', ...diagnose }, null, 2) + '\n');
    console.log('Chromium-Benchmark:', diagnose?.vergleich);
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
