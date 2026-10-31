// Gedrehte Parzellen (Kartenstädte): Spielhäuser stehen in der Flucht der echten Straße statt achsparallel.
// Eine Parzelle bleibt das Rechteck p.x, p.z, p.w, p.d um ihre Mitte; p.rot (Bogenmaß, Drehung um die Hochachse wie
// THREE.rotateY) dreht es um diese Mitte. Lokale +z-Seite = Front zur Straße. Ohne p.rot ändert sich nichts.
import { THREE } from './basis.js';

export const mitteVon = (p) => [p.x + p.w / 2, p.z + p.d / 2];

/** Lokale Koordinaten (Mitte = 0) → Welt. */
export function inWelt(p, lx, lz) {
  const [cx, cz] = mitteVon(p), c = Math.cos(p.rot ?? 0), s = Math.sin(p.rot ?? 0);
  return [cx + lx * c + lz * s, cz - lx * s + lz * c];
}

/** Welt → lokale Koordinaten (Mitte = 0). */
export function inLokal(p, x, z) {
  const [cx, cz] = mitteVon(p), c = Math.cos(p.rot ?? 0), s = Math.sin(p.rot ?? 0), dx = x - cx, dz = z - cz;
  return [dx * c - dz * s, dx * s + dz * c];
}

/** Punkt liegt auf der (gedrehten) Parzelle, mit Rand. */
export function aufParzelle(p, x, z, rand = 0) {
  const [lx, lz] = inLokal(p, x, z);
  return Math.abs(lx) <= p.w / 2 + rand && Math.abs(lz) <= p.d / 2 + rand;
}

/** Ecken der gedrehten Parzelle in der Welt. */
export function ecken(p, rand = 0) {
  const a = p.w / 2 + rand, b = p.d / 2 + rand;
  return [[-a, -b], [a, -b], [a, b], [-a, b]].map(([u, v]) => inWelt(p, u, v));
}

/** Achsparallele Hülle [x0, z0, x1, z1] der gedrehten Parzelle. */
export function huelle(p, rand = 0) {
  const e = ecken(p, rand);
  return [Math.min(...e.map((q) => q[0])), Math.min(...e.map((q) => q[1])), Math.max(...e.map((q) => q[0])), Math.max(...e.map((q) => q[1]))];
}

/** Ein Punkt, der beim Bau um die Parzellenmitte mitgedreht werden muss (z. B. Pin-Anker). */
export function drehePunkt(p, x, z) {
  if (!p?.rot) return [x, z];
  const [cx, cz] = mitteVon(p);
  const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - cx, dz = z - cz;
  return [cx + dx * c + dz * s, cz - dx * s + dz * c];
}

export function drehMatrix(p) {
  if (!p?.rot) return null;
  const [cx, cz] = mitteVon(p);
  return new THREE.Matrix4().makeTranslation(cx, 0, cz).multiply(new THREE.Matrix4().makeRotationY(p.rot)).multiply(new THREE.Matrix4().makeTranslation(-cx, 0, -cz));
}

/**
 * Baut einen achsparallelen Hausbauer gedreht: Geometrie des Sammlers wird beim Einfügen gedreht, Szenenobjekte landen in
 * einer gedrehten Gruppe, Figuren (menschenFuer) werden über S._drehung mitgedreht. bauen(S, scene) → Ergebnis des Bauers.
 */
export function gedreht(p, S, scene, bauen) {
  const M = drehMatrix(p);
  if (!M) return bauen(S, scene);
  const S2 = new Proxy(S, {
    get(t, k) {
      if (k === 'add') return (g, farbe) => { g.applyMatrix4(M); return t.add(g, farbe); };
      if (k === '_drehung') return { p, M };
      const v = t[k];
      return typeof v === 'function' && k !== 'constructor' ? function (...a) { return v.apply(this === S2 ? S2 : this, a); } : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  let G = scene;
  if (scene?.add) { G = new THREE.Group(); G.applyMatrix4(M); G.updateMatrixWorld(true); scene.add(G); }
  return bauen(S2, G);
}
