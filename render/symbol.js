// Erzeugt iPhone-Icons und Startbilder deterministisch aus src/kit/app-symbol.js.
// Ausführung: cd render && node symbol.js  (benötigt Playwright-Chromium)
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const STARTBILDER = [
  [1170, 2532], [1179, 2556], [1290, 2796], [1242, 2688],
  [1125, 2436], [750, 1334], [1284, 2778], [1320, 2868], [1206, 2622],
];

async function symboleErzeugen() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'hartwig-symbol-'));
  let browser;
  try {
    const script = path.join(ordner, 'symbol.js');
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src/kit/app-symbol.js')],
      outfile: script, bundle: true, format: 'iife', logLevel: 'error'
    });
    const html = path.join(ordner, 'index.html');
    fs.writeFileSync(html, '<!doctype html><html><body><script src="./symbol.js"></script></body></html>');
    const optionen = {
      headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    };
    if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(optionen);
    const seite = await browser.newPage({ viewport: { width: 512, height: 512 } });
    await seite.goto('file://' + html, { waitUntil: 'load' });
    await seite.waitForFunction(() => window.appFertig === true);
    const fehler = await seite.evaluate(() => window.appFehler);
    if (fehler) throw new Error('App-Symbol: ' + fehler);
    const speichern = (datei, dataUrl) => {
      fs.mkdirSync(path.dirname(datei), { recursive: true });
      fs.writeFileSync(datei, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
      console.log('App-Bild:', path.relative(__dirname, datei));
    };
    for (const groesse of [180, 512]) {
      const png = await seite.evaluate(async (n) => {
        const img = new Image();
        img.src = window.appSymbol;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = c.height = n;
        c.getContext('2d').drawImage(img, 0, 0, n, n);
        return c.toDataURL('image/png');
      }, groesse);
      speichern(path.join(__dirname, 'app-icon-' + groesse + '.png'), png);
    }
    for (const [w, h] of STARTBILDER) {
      const png = await seite.evaluate(([a, b]) => window.appStartbild(a, b), [w, h]);
      speichern(path.join(__dirname, 'startbilder', 'start-' + w + 'x' + h + '.png'), png);
    }
  } finally {
    if (browser) await browser.close();
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}

module.exports = { symboleErzeugen, STARTBILDER };
if (require.main === module) {
  symboleErzeugen().catch((e) => { console.error(e); process.exitCode = 1; });
}
