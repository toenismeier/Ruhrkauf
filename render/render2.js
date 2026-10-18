const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1680, height: 1768 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto(`file://${__dirname}/coffee.html`);
  await p.waitForFunction('window.fertig === true', null, { timeout: 300000 });
  await p.screenshot({ path: 'coffee.png' });
  await b.close();
})();
