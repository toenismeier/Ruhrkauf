// Deterministisches, selbst gezeichnetes Abzeichen je Gruppe und Schwierigkeit.
// Die PNG-Daten-URL wird pro Gruppe/Stufe im Cache gehalten.
const cache = new Map();
const metalle = {
  bronze: ['#6d3f28', '#dba26f', '#a5673e'],
  silber: ['#556573', '#f0f3f5', '#9aa6b0'],
  gold: ['#8c611b', '#fff2a4', '#d1a02e'],
};
function symbol(g, c) {
  c.save();
  c.translate(64, 62);
  c.strokeStyle = '#26313a';
  c.fillStyle = '#26313a';
  c.lineWidth = 5;
  c.lineJoin = 'round'; c.lineCap = 'round';
  switch (g) {
    case 'Sanierung': // Aufwärtspfeil
      c.beginPath(); c.moveTo(-26, 22); c.lineTo(-8, 5); c.lineTo(4, 14); c.lineTo(26, -18); c.stroke();
      c.beginPath(); c.moveTo(11, -18); c.lineTo(28, -19); c.lineTo(26, -3); c.stroke(); break;
    case 'Handel': // Einkaufskorb
      c.strokeRect(-23, -6, 46, 31);
      c.beginPath(); c.moveTo(-13, -6); c.lineTo(-5, -22); c.lineTo(5, -22); c.lineTo(13, -6); c.stroke();
      for (const x of [-9, 0, 9]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 17); c.stroke(); } break;
    case 'Menschen': // Köpfe und Schultern
      for (const [x, y, r] of [[0, -15, 12], [-22, 0, 8], [22, 0, 8]]) {
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      c.beginPath(); c.arc(0, 37, 27, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-32, 23); c.lineTo(-19, 14); c.moveTo(32, 23); c.lineTo(19, 14); c.stroke(); break;
    case 'Formate': // drei verbundene Häuser
      for (const [x, h] of [[-26, 27], [-7, 41], [14, 34]]) {
        c.strokeRect(x, 24 - h, 19, h);
        c.fillRect(x + 7, 24 - h + 7, 5, 6);
      } break;
    default: // Stern für Kurios
      c.beginPath();
      for (let n = 0; n < 10; n++) {
        const a = -Math.PI / 2 + n * Math.PI / 5, r = n % 2 ? 13 : 29;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (!n) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath(); c.fill();
  }
  c.restore();
}
export function abzeichen(gruppe, stufe = 'bronze') {
  const key = gruppe + ':' + stufe;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const farben = metalle[stufe] ?? metalle.bronze;
  const rand = x.createRadialGradient(39, 31, 7, 64, 64, 64);
  rand.addColorStop(0, farben[1]); rand.addColorStop(.76, farben[2]); rand.addColorStop(1, farben[0]);
  x.fillStyle = '#26313a'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
  x.fillStyle = rand; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill();
  x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.55)';
  x.beginPath(); x.arc(64, 64, 49, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; x.strokeStyle = farben[0];
  x.beginPath(); x.arc(64, 64, 44, 0, Math.PI * 2); x.stroke();
  symbol(gruppe, x);
  const png = c.toDataURL('image/png');
  cache.set(key, png);
  return png;
}
