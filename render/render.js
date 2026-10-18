const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const stil of process.argv.slice(2)) {
    const p = await b.newPage({ viewport: { width: 720, height: 1600 } });
    p.on('console', (m) => console.log(stil, m.type(), m.text()));
    p.on('pageerror', (e) => console.log(stil, 'ERR', e.message));
    await p.goto(`file://${__dirname}/index.html?stil=${stil}`);
    await p.waitForFunction('window.fertig === true', null, { timeout: 120000 });
    await p.screenshot({ path: `out-${stil}.png`, fullPage: true });
    console.log('ok', stil);
  }
  await b.close();
})();
