// Packt den Browser-Prototyp (render/spiel.html + Bundle + CSS + Icon) in eine einzige HTML-Datei für die App.
// Aufruf: npm run spiel   (vorher in render/: npm run build)
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const hier = dirname(fileURLToPath(import.meta.url));
const render = join(hier, '..', '..', 'render');
const ziel = join(hier, '..', 'spiel', 'spiel.html');

let html = readFileSync(join(render, 'spiel.html'), 'utf8');
const bundle = readFileSync(join(render, 'spiel-bundle.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const icon = 'data:image/svg+xml;base64,' + readFileSync(join(render, 'icon.svg')).toString('base64');

const ersetze = (muster, neu, name) => {
  if (!muster.test(html)) throw new Error('Nicht gefunden: ' + name);
  html = html.replace(muster, () => neu);
};
ersetze(/<script[^>]*src="\.?\/?spiel-bundle\.js"[^>]*><\/script>/, '<script>window.HARTWIG_APP = true;</script>\n<script>' + bundle + '</script>', 'Bundle');
// Alle Stylesheets aus src/ui einbetten (Reise/Woche und die Module aus N01–N09).
const cssMuster = /<link[^>]*rel="stylesheet"[^>]*href="\.\/(src\/ui\/[\w-]+\.css)"[^>]*>/g;
if (!cssMuster.test(html)) throw new Error('Nicht gefunden: CSS');
// @import innerhalb der Stylesheets mit einbetten (z. B. marketing-q16.css → management.css), jede Datei nur einmal
const eingebettet = new Set();
const cssLesen = (datei) => {
  if (eingebettet.has(datei)) return '';
  eingebettet.add(datei);
  const ordner = datei.replace(/[^/]+$/, '');
  return readFileSync(join(render, datei), 'utf8').replace(/@import\s+url\(['"]?\.\/([\w-]+\.css)['"]?\)\s*;?/g, (_, n) => cssLesen(ordner + n));
};
html = html.replace(cssMuster, (_, datei) => '<style>' + cssLesen(datei) + '</style>');
if (/@import\s+url\(['"]?\.\//.test(html)) throw new Error('Nicht eingebettet: @import');
ersetze(/<link[^>]*rel="manifest"[^>]*>/, '', 'Manifest');
html = html.replace(/\.\/icon\.svg/g, icon);

writeFileSync(ziel, html);
console.log('spiel/spiel.html', (statSync(ziel).size / 1048576).toFixed(1), 'MB');
