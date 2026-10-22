/** Q16: mobilformatiger Abnahmekatalog der eigenen Werbemotive und Stadtanalyse.
 * Rendering ausschließlich durch Claude:
 * cd render && node render-katalog.js marketing-q16 out/katalog-marketing-q16.png
 */
import { kanalBildSVG, stadtSymbolSVG, MARKETING_KANAL_INFO } from '../kit/marketing-bilder.js';

const SZENEN = [
  { name: 'Marktanteile · Essen', typ: 'stadt', id: 'Essen' },
  { name: 'Prospekt und Beilage', typ: 'kanal', id: 'prospekt' },
  { name: 'Plakat', typ: 'kanal', id: 'plakat' },
  { name: 'TV', typ: 'kanal', id: 'tv' },
  { name: 'Online (Suche, Display)', typ: 'kanal', id: 'online' },
  { name: 'Radio', typ: 'kanal', id: 'radio' },
  { name: 'Mailing und Kundenkarte', typ: 'kanal', id: 'crm' },
];
const W = 390, H = 844, C = document.createElement('canvas');
C.width = W * SZENEN.length; C.height = H;
const g = C.getContext('2d');
window.fehler = []; window.fertig = false;
const schrift = (font, color = '#242424') => { g.font = font; g.fillStyle = color; };
function text(t, x, y, font = '16px Arial', color) { schrift(font, color); g.fillText(t, x, y); }
function rect(x, y, w, h, farbe, radius = 0) {
  g.fillStyle = farbe; g.beginPath(); g.roundRect(x, y, w, h, radius); g.fill();
}
function linie(x, y, w) { rect(x, y, w, 1, '#e2e1dd'); }
function bild(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG konnte nicht geladen werden'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
async function szene(e, index) {
  const ox = index * W;
  g.save(); g.translate(ox, 0);
  rect(0, 0, W, H, '#f5f4f1');
  rect(0, 0, W, 55, '#fff');
  text('HARTWIG', 20, 37, 'bold 19px Arial', '#b32632');
  text('Marketing', 262, 36, 'bold 16px Arial');
  rect(14, 73, 362, 48, '#fff', 10);
  text(e.name, 27, 103, 'bold 17px Arial');
  rect(14, 136, 362, 660, '#fff', 10);
  if (e.typ === 'stadt') {
    text('Marktposition je Stadt', 32, 167, 'bold 20px Arial');
    text('Modellschätzung aus bestehenden Häusern', 32, 190, '13px Arial', '#62666a');
    const anteile = [0.52, 0.16, 0.08, 0.24], farben = ['#b32632', '#6c7980', '#b68b47', '#a6a6a3'];
    let start = -Math.PI / 2;
    for (let i = 0; i < anteile.length; i++) {
      g.beginPath(); g.arc(195, 310, 90, start, start + Math.PI * 2 * anteile[i]); g.strokeStyle = farben[i]; g.lineWidth = 24; g.stroke();
      start += Math.PI * 2 * anteile[i];
    }
    const im = await bild(stadtSymbolSVG(e.id)); g.drawImage(im, 158, 264, 74, 68);
    text('Essen', 175, 350, 'bold 14px Arial');
    const labels = ['Hartwig und Sport', 'Volkskauf', 'FUNDUS', 'Wettbewerber'];
    for (let i = 0; i < 4; i++) {
      const y = 424 + i * 43;
      rect(32, y - 11, 10, 10, farben[i], 2);
      text(labels[i], 52, y, '14px Arial');
      text((anteile[i] * 100).toFixed(0) + ' %', 302, y, 'bold 15px Arial');
      linie(32, y + 12, 326);
    }
    text('Markenbekanntheit', 32, 645, 'bold 18px Arial');
    text('68 / 100', 32, 684, 'bold 28px Arial');
    rect(32, 702, 326, 12, '#e7e4df', 6); rect(32, 702, 221.7, 12, '#b32632', 6);
    text('Vorschauwerte · keine Spieldaten', 32, 753, '12px Arial', '#62666a');
  } else {
    g.drawImage(await bild(kanalBildSVG(e.id)), 63, 156, 264, 225);
    text(e.name, 32, 417, 'bold 19px Arial');
    const desc = MARKETING_KANAL_INFO[e.id] ?? ['Werbung über den ausgewählten Kanal. Wirksam über das vorhandene Budget.', 'Inhouse'];
    // Der erste Satz wird als Vorschau gezeigt; die App zeigt stets beide Sätze.
    const saetze = desc[0].split('. ').map((s) => s.endsWith('.') ? s : s + '.');
    for (let i = 0; i < Math.min(2, saetze.length); i++) {
      const woerter = saetze[i].split(' ');
      let zeile = '', y = 451 + i * 42;
      for (const wort of woerter) {
        const probe = zeile ? zeile + ' ' + wort : wort;
        schrift('13px Arial');
        if (g.measureText(probe).width > 320 && zeile) {
          text(zeile, 32, y, '13px Arial', '#62666a');
          zeile = wort; y += 19;
        } else zeile = probe;
      }
      if (zeile) text(zeile, 32, y, '13px Arial', '#62666a');
    }
    linie(32, 505, 326);
    text('Betreut von ' + desc[1], 32, 535, '14px Arial');
    rect(284, 512, 75, 44, '#fff', 6); g.strokeStyle = '#e2e1dd'; g.strokeRect(284, 512, 75, 44);
    text('+1', 309, 541, 'bold 17px Arial');
    linie(32, 580, 326);
    text('Wochenbudget', 32, 614, '14px Arial');
    text('60.000 €', 255, 614, 'bold 16px Arial');
    rect(32, 639, 326, 8, '#e7e4df', 4); rect(32, 639, 150, 8, '#b32632', 4);
    rect(172, 631, 24, 24, '#fff', 12);
    g.strokeStyle = '#b32632'; g.lineWidth = 2; g.strokeRect(172, 631, 24, 24);
    text('Regionaler Faktor: 1,0 ×', 32, 694, '13px Arial', '#62666a');
    text('Vorschauwerte · keine Spieldaten', 32, 753, '12px Arial', '#62666a');
  }
  text('Q16 · iPhone 390 × 844', 17, 822, '12px Arial', '#62666a');
  g.restore();
}
(async () => {
  for (let i = 0; i < SZENEN.length; i++) {
    try { await szene(SZENEN[i], i); }
    catch (e) { window.fehler.push(SZENEN[i].name + ': ' + e.message); }
  }
  window.bild = C.toDataURL('image/png');
  window.fertig = true;
})();
