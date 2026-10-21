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
const css = readFileSync(join(render, 'src', 'ui', 'reise-woche.css'), 'utf8');
const icon = 'data:image/svg+xml;base64,' + readFileSync(join(render, 'icon.svg')).toString('base64');

const ersetze = (muster, neu, name) => {
  if (!muster.test(html)) throw new Error('Nicht gefunden: ' + name);
  html = html.replace(muster, () => neu);
};
ersetze(/<script[^>]*src="\.?\/?spiel-bundle\.js"[^>]*><\/script>/, '<script>window.HARTWIG_APP = true;</script>\n<script>' + bundle + '</script>', 'Bundle');
ersetze(/<link[^>]*href="\.\/src\/ui\/reise-woche\.css"[^>]*>/, '<style>' + css + '</style>', 'CSS');
ersetze(/<link[^>]*rel="manifest"[^>]*>/, '', 'Manifest');
html = html.replace(/\.\/icon\.svg/g, icon);

writeFileSync(ziel, html);
console.log('spiel/spiel.html', (statSync(ziel).size / 1048576).toFixed(1), 'MB');
