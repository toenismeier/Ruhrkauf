// Q30: Katalog der gemeinsamen Bausteine (für Q31 und zur Sichtprüfung). Ergebnis: out/q30/komponenten-<bereich>.png
// Aufruf: node tests/komponenten-katalog.cjs
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { stilpruefungLaden } = require('./q30-stil.cjs');
const wurzel = path.join(__dirname, '..');
const eintrag = `
import * as K from './src/ui/komponenten.js';
import { portraetSVG } from './src/kit/portraet.js';
const person = portraetSVG({ geschlecht: 'w', alter: 44, haar: 'dutt', haarfarbe: 'dunkelbraun', hautton: 'hell', kleidung: 'blazer', kleidungFarbe: 'anthrazit', seed: 7 }, 72);
const demo = (b) => '<div class="hk-flaeche-demo" data-bereich="' + b + '" style="width:390px">' + K.bereich(b)
 + K.sprecher({ text: '<b>Zwei Abteilungen sind unterbesetzt.</b> Damen und Herren fehlen zusammen 6 Stellen.', person, ton: 'engpass' })
 + K.rumpf(K.gross([{ label: 'Umsatz Woche', wert: '1,2 Mio. €', unter: K.abweichung(42000, '+42 Tsd. €', 0.036) }, { label: 'Haus-EBITDA', wert: '−18 Tsd. €', ton: 'schlecht', unter: K.abweichung(-9000, '−9 Tsd. €', -1) }])
 + K.balken([{ label: 'KW 5', a: 1100, b: 40 }, { label: 'KW 6', a: 1180, b: 60 }, { label: 'KW 7', a: 1050, b: -20 }, { label: 'KW 8', a: 1150, b: 0 }, { label: 'KW 9', a: 1200, b: -18 }], ['Umsatz', 'Ergebnis'])
 + K.tabelle({ titel: 'Filial-GuV', spalten: ['KW 8', 'KW 9'], zeilen: [{ name: 'Umsatz', werte: ['1.150', '1.200'], roh: [1150, 1200] }, { name: 'Wareneinsatz', werte: ['−690', '−720'], roh: [-690, -720] }, { name: 'Personal', werte: ['−300', '−310'], roh: [-300, -310] }, { name: 'Miete', werte: ['0', '0'], roh: [0, 0] }], summe: { name: 'Deckungsbeitrag', werte: ['160', '170'], roh: [160, 170] }, pruefen: true })
 + K.abschnitt('Liste', '3 Einträge') + K.liste([K.zeile({ was: 'Damen', unter: '2. OG · 3.100 qm', wert: '412 Tsd. €', wertUnter: '+3 %' }), K.zeile({ was: 'Herren', unter: '1. OG', wert: '−4 %', ton: 'schlecht' }), K.zeile({ was: 'Zur Clusterleitung', tippbar: true })])
 + K.abschnitt('Bedienung') + K.stepper({ wert: '24', unter: 'Verkaufskräfte', label: 'Personal' }) + '<div style="height:8px"></div>'
 + K.seg([['w', 'Woche'], ['q', 'Quartal'], ['j', 'Jahr']], 'w', () => '') + '<div class="hk-liste" style="margin-top:8px">' + K.schalter({ text: 'Delegieren an Filialleitung', unter: 'Personal und Kosten', an: true }) + K.schalter({ text: 'Sonntagsöffnung', an: false }) + '</div>'
 + '<div class="hk-knopfreihe">' + K.knopf('Umbau starten') + K.knopf('Vergleichen', '', 'zweit') + '</div>' + K.knopf('Alle Häuser', '', 'text')
 + K.skala('Führung', 78) + K.skala('Fachwissen', 41)
 + K.hinweis('Mietvertrag läuft in 3 Wochen aus.', 'achtung') + K.hinweis('Aktion konnte nicht gestartet werden: Budget fehlt 120 Tsd. €.', 'fehler')
 + K.leer('Diese Woche keine Vorgänge.', 'Posteingang leer') + ' ' + K.marke('Premium') + ' ' + K.marke('Umbau', 'achtung'))
 + K.reiterUnten([['ueberblick', 'Haus'], ['personal', 'Personal'], ['sortiment', 'Sortiment'], ['marketing', 'Marketing'], ['finanzen', 'Finanzen'], ['umbau', 'Umbau']], 'finanzen', () => '') + '</div>';
document.body.innerHTML = '<div style="display:flex;gap:16px;align-items:flex-start">' + demo('haus') + demo('zentrale') + demo('betrieb') + demo('papier') + '</div>';
document.querySelectorAll('.hk-reiter').forEach((r) => { r.style.position = 'static'; });
window.fertig = true;`;
(async () => {
  const out = path.join(wurzel, 'out', 'q30');
  fs.mkdirSync(out, { recursive: true });
  await esbuild.build({ stdin: { contents: eintrag, resolveDir: wurzel, loader: 'js' }, bundle: true, outfile: path.join(out, 'katalog.js'), format: 'iife', logLevel: 'error' });
  fs.writeFileSync(path.join(out, 'katalog.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../../src/ui/komponenten.css"><style>*{box-sizing:border-box}body{margin:0;background:#111;font-family:-apple-system,"DejaVu Sans",Arial,sans-serif}</style><body></body><script src="katalog.js"></script>');
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1640, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log('FEHLER', e.message));
  await p.goto('file://' + path.join(out, 'katalog.html'));
  await p.waitForFunction('window.fertig === true');
  await stilpruefungLaden(p);
  const v = await p.evaluate(() => window.hartwigStilpruefung('.hk-flaeche-demo'));
  await p.screenshot({ path: path.join(out, 'komponenten.png'), fullPage: true });
  console.log('Katalog:', path.join(out, 'komponenten.png'), v.length ? 'Verstöße: ' + v.join(' | ') : '0 Verstöße');
  await b.close();
  if (v.length) process.exitCode = 1;
})();
