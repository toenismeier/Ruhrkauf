// Q33: Applikationen und Drucke für Kinder- und Jugendmode (Dino, Stern, Herz, Regenbogen …).
// motiv(name, x, y, s) zeichnet das Motiv mittig bei (x, y), s = Breite in Bildeinheiten (Brustmotiv Kind ≈ 0,4 der Brustbreite).
// Eigene feste Farben mit heller Kante, damit das Motiv auf jeder Stofffarbe lesbar bleibt.

const f = (n) => Math.round(n * 100) / 100;
const KANTE = '#fbf7ee';
const g = (x, y, s, inhalt) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s / 20)})">${inhalt}</g>`;
const pf = (d, c, w = 1.4) => `<path d="${d}" fill="${c}" stroke="${KANTE}" stroke-width="${w}" stroke-linejoin="round"/>`;
const sternPfad = (r, ri = 0.45) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * ri : r; p.push(`${f(rr * Math.cos(a))} ${f(rr * Math.sin(a))}`); } return `M${p.join(' L')} Z`; };

export const MOTIVE = {
  // Dinosaurier (Langhals) im Profil, Rückenzacken
  dino: () => pf('M-10 6 Q-9 -2 -2 -1 Q1 -9 6 -10 Q10 -10 9 -7 Q6 -6 5 -2 Q8 2 7 7 L5 7 L5 4 L0 4 L0 7 L-2 7 L-2 4 Q-6 5 -10 6 Z', '#5f9a4a')
    + `<path d="M-6 -1.5 l1.5 -2.5 l1.5 2 l1.5 -2.5 l1.2 2" fill="#3f7a34"/><circle cx="7" cy="-8.4" r="0.7" fill="#1d1b1c"/>`,
  stern: () => pf(sternPfad(10), '#f1cf4a'),
  herz: () => pf('M0 9 C-14 0 -9 -11 0 -4 C9 -11 14 0 0 9 Z', '#e8506a'),
  regenbogen: () => ['#c8372f', '#e8833a', '#f1cf4a', '#5f8f7a', '#4f6f9a'].map((c, i) => `<path d="M${-10 + i * 1.7} 6 A${10 - i * 1.7} ${10 - i * 1.7} 0 0 1 ${10 - i * 1.7} 6" fill="none" stroke="${c}" stroke-width="1.8"/>`).join('')
    + `<path d="M-12 6 q2 -3 5 -1 q3 -1 4 2 Z M12 6 q-2 -3 -5 -1 q-3 -1 -4 2 Z" fill="#fff"/>`,
  rakete: () => pf('M0 -11 Q6 -5 5 5 L-5 5 Q-6 -5 0 -11 Z', '#e8eef2') + pf('M-5 1 L-9 8 L-5 6 Z M5 1 L9 8 L5 6 Z', '#c8372f', 1) + `<circle cx="0" cy="-3" r="2.4" fill="#4f6f9a" stroke="#fff" stroke-width="0.8"/><path d="M-3 6 Q0 13 3 6 Z" fill="#f1a43a"/>`,
  auto: () => pf('M-11 4 L-11 -1 L-6 -2 L-3 -7 L5 -7 L8 -2 L11 -1 L11 4 Z', '#c8372f') + `<path d="M-2 -6 L4 -6 L6 -2 L-4 -2 Z" fill="#cfe2ee"/><circle cx="-6" cy="4.5" r="3" fill="#2a2c30" stroke="#fff" stroke-width="0.8"/><circle cx="6" cy="4.5" r="3" fill="#2a2c30" stroke="#fff" stroke-width="0.8"/>`,
  bagger: () => pf('M-11 6 L-11 0 L-3 0 L-3 -6 L3 -6 L3 0 L4 0 L4 6 Z', '#f1b43a') + `<path d="M3 -3 L10 -9 L12 -6 L8 -1" fill="none" stroke="#e39a2a" stroke-width="2.2" stroke-linecap="round"/><path d="M8 -1 l4 0 l-1 4 l-4 0 Z" fill="#7a6a5a"/><rect x="-12" y="6" width="17" height="4" rx="2" fill="#3a3532"/><path d="M-1 -5 h3 v4 h-3 Z" fill="#cfe2ee"/>`,
  wal: () => pf('M-11 0 Q-10 -8 0 -8 Q10 -8 9 2 Q7 7 -2 7 Q-8 7 -11 3 L-13 -3 L-10 -1 Z', '#4f7fae') + `<path d="M-6 3 Q0 6 7 3" stroke="#fff" stroke-width="0.9" fill="none"/><circle cx="4" cy="-2" r="0.8" fill="#1d1b1c"/><path d="M2 -9 q-1 -3 -3 -3 M2 -9 q1 -3 3 -3" stroke="#6fb7d9" stroke-width="1" fill="none"/>`,
  sonne: () => `<g stroke="#f1a43a" stroke-width="1.6" stroke-linecap="round">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${f(8.5 * Math.cos(i * 0.785))} ${f(8.5 * Math.sin(i * 0.785))} L${f(11.5 * Math.cos(i * 0.785))} ${f(11.5 * Math.sin(i * 0.785))}"/>`).join('')}</g>` + pf('M-6.5 0 A6.5 6.5 0 1 1 6.5 0 A6.5 6.5 0 1 1 -6.5 0 Z', '#f1cf4a'),
  blume: () => [0, 1, 2, 3, 4].map((i) => `<ellipse cx="${f(5.5 * Math.cos(i * 1.2566 - 1.57))}" cy="${f(5.5 * Math.sin(i * 1.2566 - 1.57))}" rx="4.4" ry="4.4" fill="#f2a0b8" stroke="${KANTE}" stroke-width="1"/>`).join('') + `<circle r="3.6" fill="#f1cf4a" stroke="${KANTE}" stroke-width="1"/>`,
  fuchs: () => pf('M-9 -9 L-4 -3 L4 -3 L9 -9 L9 0 Q6 8 0 10 Q-6 8 -9 0 Z', '#e07a3a') + `<path d="M-6 1 Q-3 3 0 10 Q3 3 6 1 Q3 4 0 4 Q-3 4 -6 1 Z" fill="#fbf7ee"/><circle cx="-3.4" cy="-0.5" r="0.9" fill="#1d1b1c"/><circle cx="3.4" cy="-0.5" r="0.9" fill="#1d1b1c"/><circle cx="0" cy="8.6" r="1.1" fill="#1d1b1c"/>`,
  hase: () => pf('M-4 -2 L-6 -14 Q-4 -16 -2 -14 L-1 -4 L1 -4 L2 -14 Q4 -16 6 -14 L4 -2 Q8 2 6 7 Q3 10 0 10 Q-3 10 -6 7 Q-8 2 -4 -2 Z', '#e9e4dc') + `<circle cx="-2.4" cy="3" r="0.8" fill="#1d1b1c"/><circle cx="2.4" cy="3" r="0.8" fill="#1d1b1c"/><path d="M-1 5.4 h2 l-1 1.2 Z" fill="#e8506a"/>`,
  katze: () => pf('M-9 -8 L-5 -3 L5 -3 L9 -8 L9 3 Q7 9 0 9 Q-7 9 -9 3 Z', '#5a5f66') + `<circle cx="-3.5" cy="1" r="1.3" fill="#d6e08a"/><circle cx="3.5" cy="1" r="1.3" fill="#d6e08a"/><path d="M-1 4 h2 l-1 1.2 Z M-9 5 h5 M-9 7 l5 -1 M9 5 h-5 M9 7 l-5 -1" stroke="#fbf7ee" stroke-width="0.5" fill="#e8a0a8"/>`,
  einhorn: () => pf('M-8 10 Q-9 0 -3 -3 L-1 -5 Q4 -6 7 -2 Q9 1 7 3 L3 2 Q1 6 2 10 Z', '#f6f1fa') + `<path d="M-1 -5 L2 -14 L3 -5 Z" fill="#f1cf4a" stroke="#fff" stroke-width="0.6"/><path d="M-3 -3 Q-8 -2 -9 4 Q-10 8 -7 10 Q-8 4 -5 2 Z" fill="#c4a0dc"/><circle cx="3.4" cy="-1.2" r="0.8" fill="#1d1b1c"/>`,
  ball: () => `<circle r="10" fill="#fbf7ee" stroke="#2a2c30" stroke-width="0.8"/><path d="${sternPfad(4.2, 0.81)}" fill="#2a2c30"/>` + [0, 1, 2, 3, 4].map((i) => `<path d="M${f(4.2 * Math.cos(i * 1.2566 - 1.57))} ${f(4.2 * Math.sin(i * 1.2566 - 1.57))} L${f(9.6 * Math.cos(i * 1.2566 - 1.57))} ${f(9.6 * Math.sin(i * 1.2566 - 1.57))}" stroke="#2a2c30" stroke-width="0.8"/>`).join(''),
  anker: () => `<g fill="none" stroke="${KANTE}" stroke-width="3.6" stroke-linecap="round"><path d="M0 -8 V9 M-5 -4 H5 M-9 3 Q0 14 9 3"/><circle cx="0" cy="-10" r="2.4"/></g><g fill="none" stroke="#c8372f" stroke-width="1.8" stroke-linecap="round"><path d="M0 -8 V9 M-5 -4 H5 M-9 3 Q0 14 9 3"/><circle cx="0" cy="-10" r="2.4"/></g>`,
  wolke: () => pf('M-10 5 Q-13 0 -8 -2 Q-8 -8 -1 -7 Q3 -11 7 -6 Q12 -6 11 0 Q14 4 9 6 Z', '#dfeaf3'),
  pailletten: () => { // Wendepailletten-Herz: Raster kleiner Scheiben
    let z = '';
    for (let y = -9; y <= 9; y += 2.2) for (let x = -12; x <= 12; x += 2.2) {
      const xx = x + (Math.round(y / 2.2) % 2 ? 1.1 : 0);
      const innen = Math.pow(xx * xx / 100 + (y / 10) * (y / 10) - 1, 3) - (xx * xx / 100) * Math.pow(-y / 10, 3) < 0;
      if (innen) z += `<circle cx="${f(xx)}" cy="${f(y)}" r="1.15" fill="${(x + y) % 3 ? '#e9e4ec' : '#c9b6d9'}" stroke="#8f86a0" stroke-width="0.25"/>`;
    }
    return z;
  },
  // Collegebuchstaben: großer Blockbuchstabe mit Kontrastkante
  college: () => `<text x="0" y="8" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="26" fill="#c8372f" stroke="${KANTE}" stroke-width="1.6" paint-order="stroke">B</text>`,
  // Rückennummer/Trikot: große Zahl
  nummer: () => `<text x="0" y="8.5" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="${KANTE}" stroke="#2a2c30" stroke-width="0.6" paint-order="stroke">10</text>`,
  // Großer Grafikdruck: Kreis mit Palmen und Sonnenuntergang (Streetwear-Print)
  grafik: () => `<circle r="10" fill="#f1a43a"/><rect x="-10" y="1" width="20" height="2" fill="#e8506a"/><rect x="-10" y="4.5" width="20" height="1.6" fill="#e8506a"/><path d="M-4 10 Q-3 0 -5 -5 M-5 -5 q-4 -1 -6 2 M-5 -5 q4 -2 6 1 M-5 -5 q-1 -3 -4 -4 M-5 -5 q3 -3 5 -2" stroke="#1d1b1c" stroke-width="1" fill="none"/>`,
  // Schriftzug als Balken (keine echten Wörter)
  schrift: () => `<rect x="-12" y="-6" width="24" height="5" rx="1" fill="${KANTE}"/><rect x="-9" y="1.5" width="18" height="3" rx="1" fill="${KANTE}" opacity="0.8"/><path d="M-10 -3.6 h3 M-5.6 -3.6 h4 M-0.4 -3.6 h3 M4 -3.6 h5" stroke="#2a2c30" stroke-width="1.6"/>`,
  smiley: () => pf('M-9 0 A9 9 0 1 1 9 0 A9 9 0 1 1 -9 0 Z', '#f1cf4a') + `<circle cx="-3" cy="-2.5" r="1.3" fill="#1d1b1c"/><circle cx="3" cy="-2.5" r="1.3" fill="#1d1b1c"/><path d="M-5 2 Q0 7 5 2" stroke="#1d1b1c" stroke-width="1.2" fill="none"/>`,
  blitz: () => pf('M2 -12 L-7 2 L-1 2 L-3 12 L7 -2 L1 -2 Z', '#f1cf4a'),
};

export function motiv(name, x, y, s) {
  const m = MOTIVE[name];
  return m ? g(x, y, s, m()) : '';
}
