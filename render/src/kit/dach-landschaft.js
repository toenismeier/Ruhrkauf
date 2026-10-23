// Q36: Dachlandschaft großer Warenhausdächer (Vorlage Coffee Inc 2, Bild 15: abwechslungsreiche Dächer).
// Statt eines gleichmäßigen Rasters aus Lichtkuppeln: Technikzentrale mit Rückkühlern, Lichtbänder oder Sheds,
// Lüftungskanal mit Hauben, Wartungsweg, Dachzonen; Solarreihen bei jüngeren Häusern.
// Alles steht bündig auf der Dachfläche, hält 0,8 m Abstand zur Attika und liegt hinter den sichtbaren
// Dachkanten (+x, +z), damit Schriftzüge auf dem Dachrand frei bleiben.
// Nur Farben, die jedes Warenhausdach ohnehin trägt (keine zusätzlichen Draw Calls).
import { LOD } from './basis.js';

const F = { platte: '#d3d0c9', glas: '#e8eef0', glasAlt: '#c9cfd1', blech: '#c9cdd0', dunkel: '#5f666e', solar: '#3b4046' };

/**
 * @param S Sammler
 * @param dach { x0, z0, x1, z1, y }
 * @param r rng
 * @param o { baujahr, alt, reserviert(x, z, rad), protokoll, belegt[] }
 * @returns true, wenn die Dachlandschaft gebaut wurde (sonst bleibt es bei Lichtkuppeln)
 */
export function dachLandschaft(S, dach, r, o = {}) {
  const { x0, z0, x1, z1, y } = dach;
  const W = x1 - x0, D = z1 - z0;
  if (W < 26 || D < 20) return false;
  const belegt = o.belegt ?? [];
  const rand = 0.8;
  const frei = (x, z, w, d, abstand = 0.8) => x - w / 2 >= x0 + rand && x + w / 2 <= x1 - rand && z - d / 2 >= z0 + rand && z + d / 2 <= z1 - rand
    && !belegt.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + abstand && Math.abs(q.z - z) < (q.d + d) / 2 + abstand)
    && !o.reserviert?.(x, z, Math.max(w, d) / 2);
  const merke = (art, x, z, w, d, h) => {
    belegt.push({ x, z, w, d });
    o.protokoll?.push({ art, x, z, w, d, h, unten: y, dach: { x0, z0, x1, z1, y, steil: false } });
  };
  const box = (w, h, d, x, yy, z, f) => S.box(w, h, d, x, yy, z, f);
  const fern = LOD.stufe === 'fern'; // Fernstufe (Gesamtansicht): Kleinteile entfallen, Zufall und Belegung bleiben gleich
  const langX = W >= D;
  // Achsen: a = Längsachse, b = Querachse. Hinten = kleine Koordinaten (vom Betrachter abgewandt).
  const A0 = langX ? x0 : z0, A1 = langX ? x1 : z1, B0 = langX ? z0 : x0, B1 = langX ? z1 : x1;
  const LA = A1 - A0, LB = B1 - B0;
  const pos = (a, b) => (langX ? [a, b] : [b, a]);
  const mass = (la, lb) => (langX ? [la, lb] : [lb, la]);
  const bj = o.baujahr ?? 1970;

  // 1. Dachzone: abgesetzte Folienfläche über einen Teil des Dachs (bricht die gleichförmige Kiesfläche).
  {
    const anteilA = 0.35 + r() * 0.25, anteilB = 0.45 + r() * 0.2;
    const la = LA * anteilA, lb = LB * anteilB;
    const a = r() < 0.5 ? A0 + rand + la / 2 : A1 - rand - la / 2, b = B1 - rand - lb / 2;
    const [x, z] = pos(a, b), [w, d] = mass(la, lb);
    if (!fern) box(w, 0.05, d, x, y + 0.025, z, F.platte); // flach, kein Belegungseintrag (begehbar)
  }

  // Querzonen: hinten Technik (bis 0,32), Kanal mit Weg (um 0,38), vorne Lichtbänder (0,48 bis 0,92).
  // 2. Technikzentrale in einer hinteren Ecke, daneben Rückkühler und Treppenhaus.
  const zoneHinten = B0 + LB * 0.32;
  const pd = Math.min(11, Math.max(6, zoneHinten - B0 - rand - 1.6)), pw = Math.min(16, Math.max(8, LA * 0.2)), ph = 3.2 + r() * 1.0;
  const aP = A0 + rand + 1.2 + pw / 2 + (r() < 0.5 ? 0 : LA * 0.12), bP = B0 + rand + 0.8 + pd / 2;
  {
    const [x, z] = pos(aP, bP), [w, d] = mass(pw, pd);
    if (frei(x, z, w, d, 0)) {
      box(w, ph, d, x, y + ph / 2, z, F.blech);
      box(w + 0.3, 0.22, d + 0.3, x, y + ph + 0.11, z, F.platte);
      if (!fern) { box(w * 0.7, 0.9, 0.12, x, y + ph * 0.55, z + d / 2 + 0.06, F.dunkel); box(0.12, 0.9, d * 0.6, x + w / 2 + 0.06, y + ph * 0.55, z, F.dunkel); }
      merke('technikzentrale', x, z, w + 0.3, d + 0.3, ph + 0.22);
    }
  }
  // Rückkühler: Rahmen mit Ventilatoren, in Längsrichtung neben der Zentrale
  const nVent = 3 + Math.floor(r() * 3), kl = nVent * 2.2 + 0.6, kb = 2.8;
  const aK = aP + pw / 2 + 2.0 + kl / 2, bK = B0 + rand + 0.8 + kb / 2 + r() * Math.max(0, pd - kb - 1);
  {
    const [x, z] = pos(aK, bK), [w, d] = mass(kl, kb);
    if (frei(x, z, w, d)) {
      box(w, 1.5, d, x, y + 0.75, z, F.blech);
      for (let i = 0; i < nVent; i++) {
        const [vx, vz] = pos(aK - kl / 2 + 0.3 + 1.1 + i * 2.2, bK);
        if (!fern) box(1.7, 0.1, 1.7, vx, y + 1.55, vz, F.dunkel);
      }
      merke('rueckkuehler', x, z, w, d, 1.6);
    }
  }
  // Treppenhaus mit Tür (Dachzugang) auf der anderen Seite der Zentrale oder dahinter
  {
    const aT = aP - pw / 2 - 2.6 >= A0 + rand + 2 ? aP - pw / 2 - 2.6 : aK + kl / 2 + 3.0, bT = B0 + rand + 0.8 + 1.9;
    const [x, z] = pos(aT, bT);
    if (frei(x, z, 3.6, 3.6)) {
      box(3.6, 3.0, 3.6, x, y + 1.5, z, F.platte);
      if (!fern) box(3.8, 0.2, 3.8, x, y + 3.1, z, F.dunkel);
      if (!fern) box(langX ? 1.1 : 0.08, 2.1, langX ? 0.08 : 1.1, x + (langX ? 0.6 : 1.84), y + 1.05, z + (langX ? 1.84 : 0.6), F.dunkel);
      merke('treppenhaus', x, z, 3.8, 3.8, 3.2);
    }
  }
  // Zweites Lüftungsgerät am anderen Ende der Technikzone
  {
    const gl = Math.min(9, LA * 0.14), gb = Math.min(4, zoneHinten - B0 - rand - 1.2), gh = 2.2;
    const a = A1 - rand - 2 - gl / 2 - r() * LA * 0.1, b = B0 + rand + 0.8 + gb / 2;
    const [x, z] = pos(a, b), [w, d] = mass(gl, gb);
    if (gb > 2 && frei(x, z, w, d)) {
      box(w, gh, d, x, y + gh / 2, z, F.blech);
      if (!fern) box(langX ? w * 0.8 : 0.1, 0.5, langX ? 0.1 : d * 0.8, x + (langX ? 0 : w / 2 + 0.05), y + gh * 0.6, z + (langX ? d / 2 + 0.05 : 0), F.dunkel);
      for (const k of [-0.3, 0.3]) { const [hx, hz] = pos(a + k * gl, b); if (!fern) box(1.2, 0.8, 1.2, hx, y + gh + 0.4, hz, F.blech); }
      merke('lueftungsgeraet', x, z, w, d, gh + 0.8);
    }
  }

  // 3. Lüftungskanal mit Hauben über die ganze Länge, daneben der Wartungsweg.
  {
    const bL = B0 + LB * 0.37, a0 = A0 + rand + 3, a1 = A1 - rand - 3, la = a1 - a0;
    const [x, z] = pos(a0 + la / 2, bL), [w, d] = mass(la, 1.1);
    if (frei(x, z, w, d, 0.3)) {
      box(w, 0.9, d, x, y + 0.45, z, F.blech);
      for (let a = a0 + 3 + r() * 3; a < a1 - 2; a += 8 + r() * 5) {
        const [hx, hz] = pos(a, bL);
        if (!fern) { box(1.3, 0.7, 1.3, hx, y + 1.25, hz, F.blech); box(1.5, 0.12, 1.5, hx, y + 1.66, hz, F.dunkel); }
      }
      merke('lueftungskanal', x, z, w, d, 1.72);
    }
    const [wx, wz] = pos(a0 + la / 2, bL + 1.7), [ww, wd] = mass(la, 1.1);
    if (frei(wx, wz, ww, wd, 0.1)) { if (!fern) box(ww, 0.06, wd, wx, y + 0.03, wz, F.platte); merke('wartungsweg', wx, wz, ww, wd, 0.06); }
  }

  // 4. Lichtbänder (Sheds bei Nachkriegsbauten) im vorderen Dachteil, dazu Rauchabzugsklappen.
  const sheds = bj >= 1950 && bj < 1980 && r() < 0.5;
  const bV0 = B0 + LB * 0.47, bV1 = B1 - rand - 2.5;
  if (sheds) {
    const n = Math.max(3, Math.min(8, Math.floor((LA - 6) / 7.5)));
    const lb = (bV1 - bV0) * (0.75 + r() * 0.2), bM = (bV0 + bV1) / 2;
    const schritt = (LA - 6) / n;
    for (let i = 0; i < n; i++) {
      const a = A0 + 3 + schritt * (i + 0.5);
      const [x, z] = pos(a, bM), [w, d] = mass(2.8, lb);
      if (!frei(x, z, w, d)) continue;
      box(w, 1.0, d, x, y + 0.5, z, F.platte);
      const [gx, gz] = pos(a + 1.05, bM), [gw, gd] = mass(0.6, lb - 0.4);
      box(gw, 0.8, gd, gx, y + 1.4, gz, o.alt ? F.glasAlt : F.glas);
      merke('shed', x, z, w, d, 1.8);
    }
  } else {
    const n = Math.max(2, Math.min(4, Math.floor((bV1 - bV0) / 6.5)));
    const la = (LA - 8) * (0.62 + r() * 0.3), aM = A0 + 4 + (LA - 8 - la) * r() + la / 2;
    for (let i = 0; i < n; i++) {
      const b = bV0 + 1.5 + i * ((bV1 - bV0 - 3) / Math.max(1, n - 1));
      const [x, z] = pos(aM, b), [w, d] = mass(la, 2.8);
      if (!frei(x, z, w, d, 0.4)) continue;
      box(w, 0.35, d, x, y + 0.175, z, F.dunkel);
      const [gw, gd] = mass(la - 0.6, 2.0);
      box(gw, 0.5, gd, x, y + 0.6, z, o.alt ? F.glasAlt : F.glas);
      merke('lichtband', x, z, w, d, 0.85);
      // Rauchabzugsklappen am Bandende
      const [kx, kz] = pos(aM + la / 2 + 1.6, b), [kw, kd] = mass(1.4, 1.4);
      if (frei(kx, kz, kw, kd, 0.3)) { if (!fern) box(kw, 0.55, kd, kx, y + 0.27, kz, F.dunkel); merke('rwa', kx, kz, kw, kd, 0.55); }
    }
  }

  // 5. Solarreihen bei jüngeren Häusern (ab 1990) oder einem Drittel der übrigen, hinten zwischen den Geräten.
  if (bj >= 1990 || r() < 0.35) {
    const la = Math.min(LA * 0.28, 20), reihen = 3;
    const a = A0 + LA * (0.55 + r() * 0.1);
    for (let i = 0; i < reihen; i++) {
      const b = B0 + rand + 1.6 + i * 2.5;
      if (b + 1 > zoneHinten + 1) break;
      const [x, z] = pos(a, b), [w, d] = mass(la, 1.8);
      if (!frei(x, z, w, d, 0.4)) continue;
      box(w, 0.14, d, x, y + 0.55, z, F.solar);
      const [sw, sd] = mass(la - 0.4, 0.3);
      if (!fern) box(sw, 0.48, sd, x, y + 0.24, z, F.dunkel);
      merke('solar', x, z, w, d, 0.62);
    }
  }
  return true;
}
