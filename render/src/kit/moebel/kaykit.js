// Wohnmöbel aus KayKit Furniture Bits (CC0, Kay Lousberg) im flachen Stil des Baukastens.
// Die Originalfarben sind Rollen (Stoff, Kissen, Holz, Weiß, Metall, Grün); jede Rolle bekommt eine Farbe aus unserer Palette,
// damit Wohnen und Zentrale nicht wie ein Fremdpaket aussehen und keine zusätzlichen Farben (Draw Calls) entstehen.
import { THREE, dunkler, heller } from '../basis.js';
import { KAYKIT } from './kaykit-daten.js';

// Originalfarbe → [Rolle, hell (true) oder dunkel]
const ROLLE = {
  '#84b4d8': ['stoff', 1], '#5484b4': ['stoff', 0],
  '#f0c06c': ['kissen', 1], '#e49054': ['kissen', 0],
  '#9c6c54': ['holz', 1], '#84483c': ['holz', 0], '#b48460': ['holz', 1], '#9c6054': ['holz', 0], '#cc783c': ['topf', 1], '#904830': ['topf', 0],
  '#cc9c78': ['holzHell', 1], '#d8c090': ['holzHell', 1],
  '#f0f0f0': ['weiss', 1], '#c0cccc': ['weiss', 0], '#e4e4d8': ['schirm', 1], '#ccc0b4': ['schirm', 0],
  '#9ca8a8': ['metall', 1], '#6c6c78': ['metall', 0],
  '#9cc060': ['gruen', 1], '#78b448': ['gruen', 1], '#3c9084': ['gruen', 0], '#309054': ['gruen', 0],
};
/** Standardfarben je Rolle (Werte aus innen.js HOLZ und den Wohnen-Paletten). */
export const KAYKIT_STANDARD = { stoff: '#5f7f8c', kissen: '#e9b44c', holz: '#b98d61', holzHell: '#d8bf98', topf: '#b5745a', weiss: '#f6f3ee', schirm: '#f6e8b0', metall: '#2a2d31', gruen: '#6fa860' };
/** Grundmaße der Modelle in Metern nach Skalierung 0,75 (Breite x, Tiefe z). */
export const KAYKIT_MODELLE = Object.keys(KAYKIT);

const cache = new Map();
function entpacke(b64, Typ) {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Typ(u8.buffer);
}
function gruppen(name) {
  if (!cache.has(name)) {
    const roh = KAYKIT[name];
    if (!roh) throw new Error('KayKit-Modell fehlt: ' + name);
    cache.set(name, roh.map(([farbe, p, i]) => {
      const pos = entpacke(p, Int16Array), idx = entpacke(i, Uint16Array);
      const f = new Float32Array(pos.length);
      for (let k = 0; k < pos.length; k++) f[k] = pos[k] / 1000;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(f, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      return { farbe, geo: g.toNonIndexed() };
    }));
  }
  return cache.get(name);
}

/** KayKit-Modell in den lokalen Rahmen L (innen.js lokal) setzen.
 *  farben: Rollen überschreiben, z. B. { stoff: '#b5745a' }. s: Maßstab (Standard 0,75: Sofa 2,25 m breit). */
export function kaykit(L, name, lx, ly, lz, ry = 0, { farben = {}, s = 0.75 } = {}) {
  for (const { farbe, geo } of gruppen(name)) {
    const [rolle, hell] = ROLLE[farbe] ?? ['weiss', 1];
    const basis = farben[rolle] ?? KAYKIT_STANDARD[rolle];
    const f = hell ? basis : dunkler(basis, rolle === 'weiss' || rolle === 'schirm' ? 0.06 : 0.08);
    const g = geo.clone().scale(s, s, s);
    g.computeVertexNormals();
    L.geo(g, lx, ly, lz, f, ry);
  }
}
export { heller as kaykitHeller };
