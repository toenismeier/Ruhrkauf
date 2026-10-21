// O09 E-Commerce: kleine Abholstation am Eingang plus Paketboxen im Erdgeschoss.
// Eigenständige, additive Kit-Erweiterung ohne Eingriff in die Warenhaus-Fassaden.
import { schild } from './basis.js';

export function abholstation(S, scene, opt) {
  const x = opt.x ?? 0, z = opt.z ?? 0, w = opt.w ?? 36, d = opt.d ?? 25;
  const rot = '#c52e2c', weiss = '#f6f2e9', metall = '#657382', karton = '#b88f59';
  // Beschriftung parallel zur sichtbaren Süd-Fassade, knapp neben der Eingangstür.
  const u = x + Math.min(w - 2, Math.max(3, w * 0.65));
  S.quader(u - 2.0, 2.65, z + d + 0.12, u + 2.0, 3.35, z + d + 0.29, rot);
  schild(scene, 'Abholstation', '+z', u, 2.85 + (S.y0 ?? 0), z + d + 0.48, 0.31, weiss, rot);
  // Wetterfester Paketbox-Terminal an der Außenwand.
  const b = x + Math.min(w - 1.5, Math.max(4, w * 0.77));
  S.quader(b - 0.8, 0.1, z + d + 0.18, b + 0.8, 2.15, z + d + 0.9, metall);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const l = b - 0.65 + j * 0.72;
    S.quader(l, 0.35 + i * 0.56, z + d + 0.91, l + 0.62, 0.83 + i * 0.56, z + d + 0.94, weiss);
  }
  // Gut sichtbare Paketboxen im EG, aus der Schaufensterperspektive.
  for (let i = 0; i < 4; i++) {
    const lx = x + w * 0.44 + (i % 2) * 0.75;
    const ly = 0.15 + Math.floor(i / 2) * 0.55;
    S.quader(lx, ly, z + d - 1.0, lx + 0.62, ly + 0.5, z + d - 0.35, karton);
  }
  return { teile: 1 + 1 + 1 + 6 + 4, schild: 'Abholstation' };
}
