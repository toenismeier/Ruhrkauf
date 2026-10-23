// Q35: Anzeige und Engine stimmen je Widerspruchspaar überein (Start Oktober, Bielefeld).
// Aufruf: node spiel-render.js --bundle && node tests/q35-zahlen.cjs
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const opt = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) opt.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(opt);
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const seitenFehler = [];
  p.on('pageerror', (e) => seitenFehler.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=Bielefeld&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  const fehler = await p.evaluate(async () => {
    const f = [];
    const S = window.spiel, warte = (ms) => new Promise((r) => setTimeout(r, ms));
    const zahl = (t) => Number(String(t).replace(/\./g, '').replace(',', '.'));
    S.schliessePanel(); S.neuesSpiel(1, 'Bielefeld', 'mittel', 'standard', 10);
    await warte(300);
    // 6: Cockpit zeigt ab Spielstart Werte
    const cockpit = document.getElementById('cockpit').textContent;
    if (/noch offen/.test(cockpit)) f.push('Cockpit zeigt „noch offen“');
    S.woche(false); await warte(300);
    const s = S.s, E = S.E;
    // 2a: Zentrale-Befund aus derselben Fläche wie „x % belegt“
    S.oeffneHq(); await warte(200);
    const befund = document.querySelector('#pinhalt').textContent;
    if (/Alle gemieteten Etagen sind (voll )?belegt/.test(befund) && /\b([1-8]?\d) % belegt/.test(befund)) f.push('Zentrale: „alle belegt“ neben Auslastung unter 90 %');
    // 2b: Controlling – Plätze der Etage und FTE der Abteilung aus abteilungPlaetze
    window.hqKlick('abteilung', 'controlling'); await warte(200);
    const txt = document.querySelector('#pinhalt').innerText;
    const m = /Auf dieser Etage belegt[^]*?\b(\d+) von (\d+)\b/.exec(txt);
    if (!m) f.push('Controlling: Etagenzeile fehlt');
    else {
      const a = E.hqUebersicht(S.s).abteilungen.find((x) => x.id === 'controlling');
      if (!a) f.push('Controlling: Engine-Abteilung fehlt');
      else {
        const summe = a.plaetze.reduce((n, z) => n + z.fte, 0), ohne = Math.round(a.fte) - summe;
        if (ohne && !txt.includes(ohne + ' ohne Arbeitsplatz')) f.push(`Controlling: Etagen-FTE ${summe} ≠ ${a.fte} ohne Hinweis`);
        if (!a.plaetze.some((z) => z.fte === Number(m[1]) && z.plaetze === Number(m[2]))) f.push(`Controlling: Anzeige ${m[0]} nicht in der Engine`);
      }
    }
    // 2c: Hausbesuch – im Dienst ≤ FTE, Komma statt Punkt
    const id = s.haeuser.find((h) => h.stadt === 'Bielefeld' && h.format === 'warenhaus').id;
    S.schliessePanel(); S.oeffneHausbesuch(id); await warte(2500);
    const unter = document.querySelector('.hb-unter')?.textContent ?? '';
    const hb = /(\d+) im Dienst.* von ([\d,]+) FTE/.exec(unter);
    if (!hb) f.push('Hausbesuch: Zeile „im Dienst von … FTE“ fehlt: ' + unter);
    else if (Number(hb[1]) > zahl(hb[2])) f.push('Hausbesuch: mehr im Dienst als FTE');
    if (/\d\.\d FTE/.test(unter)) f.push('Hausbesuch: Dezimalpunkt');
    document.querySelector('.hb button')?.click();
    // 5: Freigaben – Zahl im Kopf gleich Engine, spielbar
    for (let i = 0; i < 3; i++) S.woche(false);
    S.einkauf.oeffne('freigaben'); await warte(200);
    const n = S.s.einkauf.freigaben.length;
    if (n > 25) f.push(`Freigaben: ${n} offen`);
    if (!document.querySelector('#pinhalt').textContent.includes(`${n} Orders`)) f.push('Freigaben: Anzahl in der Anzeige weicht ab');
    return f;
  });
  for (const x of [...fehler, ...seitenFehler]) console.log('FEHLER', x);
  console.log(`Q35 Zahlen: ${fehler.length + seitenFehler.length} Fehler`);
  await b.close();
  if (fehler.length || seitenFehler.length) process.exit(1);
})();
