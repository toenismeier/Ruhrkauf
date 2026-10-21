// Q25: Stoffe und Farben für Model und Produktbilder. Reine Funktionen, kein DOM.

export const FARBEN = {
  'weiß': '#f4f3ef', offwhite: '#ece6d8', creme: '#e9dcc0', sand: '#d6c19a', beige: '#c9b08a', camel: '#b8864e', cognac: '#9a5a2e', braun: '#6a4630',
  grau: '#a2a6ab', hellgrau: '#c9ccd0', anthrazit: '#474c53', schwarz: '#2a2c30', marine: '#273659', hellblau: '#a9c8e8', jeansblau: '#4d6f9a', hellerdenim: '#87a3c3', dunkeldenim: '#2f4466',
  petrol: '#1f6b78', mint: '#9fd9bf', salbei: '#9fb393', olive: '#757a45', khaki: '#a49a6c', flaschengruen: '#2c5a40', senf: '#cc9f2e',
  gelb: '#f1cf4a', orange: '#e8833a', koralle: '#ec7a6a', rot: '#c8372f', bordeaux: '#76263a', rosa: '#f2b8cc', altrosa: '#d29a9c', flieder: '#c4b0dc', lila: '#7a4f9a', terrakotta: '#c0643f', ecru: '#efe7d6', mint: '#9fd9bf', 'mintgrün': '#9fd9bf', mintgruen: '#9fd9bf', 'flaschengrün': '#2c5a40', 'hellgrün': '#a8cf8e', natur: '#e6dcc6', silber: '#c9ced3', gold: '#c9a24a',
};

function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export const mische = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
export const hell = (c, t) => (t < 0 ? dunkel(c, -t) : mische(c, '#ffffff', t));
export const dunkel = (c, t) => mische(c, '#1a1612', t);
export const helligkeit = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const farbeVon = (f) => FARBEN[f] ?? FARBEN[String(f ?? '').toLowerCase()] ?? (/^#[0-9a-f]{3,6}$/i.test(String(f)) ? f : FARBEN.grau);

let zaehler = 0;
// Legt Muster/Verläufe für ein Teil an und gibt den Stoffkontext zurück.
export function materialDefs(farbe, material = 'baumwolle', defs, muster) {
  const c = farbeVon(farbe);
  const id = 's' + (++zaehler).toString(36) + Math.random().toString(36).slice(2, 5);
  const hl = helligkeit(c);
  const m = String(material).toLowerCase();
  const K = { id, c, m, cL: hell(c, 0.16), cD: dunkel(c, hl > 0.8 ? 0.12 : 0.22), cK: dunkel(c, hl > 0.8 ? 0.25 : 0.42), denim: m === 'denim', naht: '#d99a3a', defs };
  const dl = hl > 0.55 ? '#000' : '#fff';
  let tex = null;
  if (m === 'denim') tex = `<pattern id="${id}t" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M0 0 V2" stroke="#fff" stroke-opacity="0.22" stroke-width="0.7"/></pattern>`;
  else if (m === 'strick' || m === 'kaschmir' || m === 'merino') tex = `<pattern id="${id}t" width="3.2" height="3" patternUnits="userSpaceOnUse"><path d="M0 0 L1.6 2 L3.2 0" stroke="#000" stroke-opacity="0.16" stroke-width="0.5" fill="none"/></pattern>`;
  else if (m === 'rippe') tex = `<pattern id="${id}t" width="2.2" height="4" patternUnits="userSpaceOnUse"><path d="M1.1 0 V4" stroke="#000" stroke-opacity="0.14" stroke-width="0.8"/></pattern>`;
  else if (m === 'leinen') tex = `<pattern id="${id}t" width="3.4" height="2.8" patternUnits="userSpaceOnUse"><path d="M0 0.7 H3.4" stroke="#000" stroke-opacity="0.09" stroke-width="0.4"/><path d="M2 0 V2.8" stroke="${dl}" stroke-opacity="0.1" stroke-width="0.4"/></pattern>`;
  else if (m === 'cord') tex = `<pattern id="${id}t" width="2.4" height="4" patternUnits="userSpaceOnUse"><path d="M1.2 0 V4" stroke="#000" stroke-opacity="0.2" stroke-width="1"/></pattern>`;
  else if (m === 'boucle') tex = `<pattern id="${id}t" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="0.8" cy="0.9" r="0.7" fill="#fff" fill-opacity="0.25"/><circle cx="2.2" cy="2.2" r="0.6" fill="#000" fill-opacity="0.12"/></pattern>`;
  else if (m === 'frottee' || m === 'waffel') tex = `<pattern id="${id}t" width="2.6" height="2.6" patternUnits="userSpaceOnUse"><rect x="0.3" y="0.3" width="2" height="2" rx="0.4" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="0.5"/></pattern>`;
  if (muster === 'streifen') tex = `<pattern id="${id}t" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="2.4" fill="${hl > 0.6 ? '#273659' : '#f4f3ef'}" opacity="0.85"/></pattern>`;
  if (muster === 'karo') tex = `<pattern id="${id}t" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="3" fill="#000" opacity="0.16"/><rect width="3" height="8" fill="#000" opacity="0.16"/></pattern>`;
  if (muster === 'blumen') tex = `<pattern id="${id}t" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="#fff" opacity="0.7"/><circle cx="8" cy="7.5" r="1.2" fill="#f1cf4a" opacity="0.8"/></pattern>`;
  if (tex) defs.push(tex);
  K.tex = tex ? `url(#${id}t)` : null;
  K.glanz = ['satin', 'seide', 'leder', 'lack'].includes(m);
  if (K.glanz) defs.push(`<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0.2" stop-color="#fff" stop-opacity="0"/><stop offset="0.38" stop-color="#fff" stop-opacity="0.32"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  defs.push(`<linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.2"/></linearGradient>`);
  return K;
}

// Eine Stofffläche: Grundfarbe, Struktur, Licht, Glanz, feine Kontur.
export function flaeche(K, d, o = {}) {
  const c = o.ton ? (o.ton > 0 ? hell(K.c, o.ton) : dunkel(K.c, -o.ton)) : K.c;
  const t = [`<path d="${d}" fill="${c}"/>`];
  if (K.tex) t.push(`<path d="${d}" fill="${K.tex}"/>`);
  t.push(`<path d="${d}" fill="url(#${K.id}l)"/>`);
  if (o.schatten) t.push(`<path d="${d}" fill="#000" opacity="0.07"/>`);
  if (K.glanz) t.push(`<path d="${d}" fill="url(#${K.id}g)"/>`);
  t.push(`<path d="${d}" fill="none" stroke="${K.cK}" stroke-width="0.6" stroke-linejoin="round" opacity="0.55"/>`);
  return t.join('');
}
