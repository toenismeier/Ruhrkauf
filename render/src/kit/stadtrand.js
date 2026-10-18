// Stadtrandgürtel (reine Daten, keine Geometrie): Vororte, Siedlungen, Gewerbe, Felder und Wald rund um die Karte.
//
// GESTALTUNG.md 4: Die Kamera sieht beim freien Verschieben nie eine nackte Kartenkante. Rings um die Karte liegt
// deshalb ein Gürtel von RING Metern, der das Straßenraster der Stadt fortsetzt:
//   - Die z-Straßen der ersten und letzten Reihe und die x-Straßen der ersten und letzten Spalte laufen nach außen weiter.
//   - Parallel zur Kartenkante liegen neue Ringstraßen im Abstand eines Vorortblocks; direkt an der Kante eine
//     Randlinie: Straße dort, wo die Stadt keine Randstraße hat (Umland, Wasser am Kartenrand), sonst Grünstreifen.
//   - Zonen nach Abstand zur Karte: dichte Vororte (Reihenhäuser, Mehrfamilienzeilen, Gewerbe), Siedlung
//     (Einfamilienhäuser, Kleingärten), Felder mit Höfen, außen Wald.
//   - Flüsse, die die Kartenkante queren, laufen als Band mit Uferstraßen und Brücken bis zum Gürtelrand weiter.
//     Liegt ein Fluss am Kartenrand (Ufer = Kartenkante), bekommt das Gegenufer eine Uferstraße mit Bebauung.
//   - Seestädte (umland 'see'): eine Küstenseite ist Wasser (Meer bis zum Gürtelrand, Binnensee mit Waldufer),
//     die übrigen Seiten sind Vorort.
// Ergebnis plan.aussen = { R, strassen, kreuzungen, bloecke, wasser, gruen } und plan.kameraGrenze (Rechteck, in dem
// der Kamera-Mittelpunkt im Spiel bleiben muss; sichtbar bleibt dann höchstens plan.kameraGrenze.sicht Meter darüber).
import { rng, zw, waehle } from './basis.js';
import { bergHoehe } from './gelaende.js';

/** Breite des Gürtels in Metern (Nahkamera Zoom 80 sieht von der Kartenkante rund 420 m nach außen). */
export const RING = 480;
const RS = { breite: 17, gehweg: 3 };
/** Zonengrenzen (Abstand zur Karte in m): dicht, Siedlung, Felder, dahinter Wald. */
const ZONEN = { mittelstadt: [110, 220, 330], grossstadt: [150, 270, 380], metropole: [200, 330, 420] };
const SEE_TIEFE = 290;   // Binnensee: Wasser bis zu diesem Abstand, dahinter Waldufer
const KUESTE_LAND = 150; // Meer: Hafen- und Vorortstreifen vor der Küste, Wasser erst dahinter (Wasser nah ≤ 15 %)

const SEITEN = ['-x', '+x', '-z', '+z'];
const vereinige = (ivs, luecke = 2) => {
  const s = ivs.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const [a, b] of s) { const l = out[out.length - 1]; if (l && a <= l[1] + luecke) l[1] = Math.max(l[1], b); else out.push([a, b]); }
  return out;
};
const abzug = ([a, b], cuts) => {
  let rest = [[a, b]];
  for (const [c, d] of cuts) rest = rest.flatMap(([u, v]) => (d <= u || c >= v ? [[u, v]] : [[u, Math.min(v, c)], [Math.max(u, d), v]].filter(([p, q]) => q - p > 0.01)));
  return rest;
};
const deckt = (ivs, t) => ivs.some(([a, b]) => t >= a - 0.01 && t <= b + 0.01);

/**
 * P: Plan aus baueRaster (breite, tiefe, zLinien, xLinien, spalten, reihen, strassen, kreuzungen, bloecke, umland,
 * umlandArt, seed, typ) und o: { kueste ('-x'|'+x'|'-z'|'+z'), seeArt ('meer'|'binnen') }.
 */
export function stadtrandPlan(P, o = {}) {
  const R = RING, B = P.breite, T = P.tiefe;
  const r = rng(P.seed * 7717 + 3);
  const nx = P.spalten.w.length, nz = P.reihen.d.length;
  const [D1, D2, D3] = ZONEN[P.typ] ?? ZONEN.grossstadt;
  const wasserB = P.bloecke.filter((b) => b.art === 'wasser');
  // ---------- Küste (Seestädte) ----------
  let kueste = null;
  const kontakt = (b, s) => (s === '-x' ? b.x < 0.5 : s === '+x' ? b.x + b.w > B - 0.5 : s === '-z' ? b.z < 0.5 : b.z + b.d > T - 0.5);
  const entlang = (b, s) => (s[1] === 'x' ? [b.z, b.z + b.d] : [b.x, b.x + b.w]);
  const quer = (b, s) => (s[1] === 'x' ? b.w : b.d);
  const parallel = (b, s) => b.form === 'see' || entlang(b, s)[1] - entlang(b, s)[0] > quer(b, s) * 1.2;
  if (P.umlandArt === 'see') {
    kueste = o.kueste ?? null;
    if (!kueste) {
      const punkte = { '-x': 0, '+x': 0, '-z': 0, '+z': 0 };
      for (const b of wasserB) for (const s of SEITEN) if (kontakt(b, s)) { const [a, e] = entlang(b, s); punkte[s] += parallel(b, s) ? e - a : 0.1 * (e - a); }
      kueste = SEITEN.reduce((m, s) => (punkte[s] > punkte[m] ? s : m), '-x');
    }
  }
  const binnen = o.seeArt === 'binnen';
  // ---------- Berge: Kulissen am Kartenrand (sued.js) bzw. Bergseiten der Archetypen (o.berge) setzen sich als glatte
  // Hänge im Gürtel fort; dort gibt es keine Vororte (GESTALTUNG.md 2) ----------
  const BERG = { wald: [26, 80], wein: [22, 55], kessel: [30, 70], alpen: [34, 230], voralpen: [18, 90], alpen_fern: [0, 200] };
  const berge = { seed: P.seed, R, seiten: {} };
  for (const b of P.bloecke) {
    if (b.art !== 'kulisse' || !b.lage || b.inhalt === 'halbhoehe') continue;
    const s = b.lage === 'links' ? '-x' : '-z';
    if (berge.seiten[s]) continue;
    const [H0, Hr] = BERG[b.inhalt] ?? BERG.wald;
    const kulisseHoch = b.inhalt !== 'alpen_fern';
    berge.seiten[s] = { kante: kulisseHoch ? (s === '-z' ? b.z : b.x) : 0, front: kulisseHoch ? (s === '-z' ? b.z + b.d : b.x + b.w) : 0, H0, Hr, inhalt: b.inhalt, u0: 0, u1: s === '-z' ? B : T };
  }
  for (const e of o.berge ?? []) if (!berge.seiten[e.seite]) berge.seiten[e.seite] = { kante: 0, front: 0, H0: 0, Hr: (BERG[e.inhalt] ?? BERG.wald)[1], inhalt: e.inhalt, u0: 0, u1: e.seite === '-z' ? B : T };
  // Burg auf dem Berg im Gürtel (Koblenz: Festung am Gegenufer) mit ebenem Plateau
  const ringBauten = [];
  for (const e of o.berge ?? []) if (e.burg) {
    const s = e.seite, um = e.u ?? (s === '-z' ? B / 2 : T / 2), ab = e.abstand ?? 110, gr = 84;
    const x = s === '-x' ? -ab - gr : um - gr / 2, z = s === '-z' ? -ab - gr : um - gr / 2;
    berge.plateaus = [...(berge.plateaus ?? [])];
    const y = bergHoehe({ ...berge, plateaus: [] }, x + gr / 2, z + gr / 2);
    berge.plateaus.push({ x0: x + 6, z0: z + 6, x1: x + gr - 6, z1: z + gr - 6, y });
    ringBauten.push({ id: 'aussen-burg', typ: 'slot:sued_burg', variante: e.burg, x, z, w: gr, d: gr, front: [s === '-x' ? '+x' : '+z'], seed: P.seed * 3 + 7, region: P.region, berg: berge, landmarke: true });
  }
  for (const p of P.parzellen ?? []) { const b = P.bloecke.find((q) => q.id === p.block); if (b?.art === 'kulisse') p.berg = berge; }
  const bergSeiten = Object.keys(berge.seiten);
  // ---------- Wasser an der Kartenkante: Ufer (parallel) oder Fortsetzung als Band (quer) ----------
  const ufer = { '-x': [], '+x': [], '-z': [], '+z': [] }, baender = [];
  for (const b of wasserB) for (const s of SEITEN) {
    if (!kontakt(b, s) || bergSeiten.includes(s)) continue;
    const iv = entlang(b, s);
    if (parallel(b, s)) ufer[s].push(iv);
    else baender.push({ s, a: iv[0], b: iv[1], form: b.form === 'see' ? 'fluss' : b.form });
  }
  // ---------- Randlinie: Straße, wo die Stadt an der Kante keine Straße hat ----------
  const L = { '-x': T, '+x': T, '-z': B, '+z': B };
  const randStrasse = (s, q) => (s === '-x' ? q.achse === 'z' && q.mitte - q.breite / 2 < 0.5 : s === '+x' ? q.achse === 'z' && q.mitte + q.breite / 2 > B - 0.5
    : s === '-z' ? q.achse === 'x' && q.mitte - q.breite / 2 < 0.5 : q.achse === 'x' && q.mitte + q.breite / 2 > T - 0.5);
  const noetig = {};
  for (const s of SEITEN) {
    const gedeckt = [];
    for (const q of P.strassen) if (randStrasse(s, q)) gedeckt.push([q.von, q.bis]);
    for (const k of P.kreuzungen) {
      const an = s === '-x' ? k.x - k.bx / 2 < 0.5 : s === '+x' ? k.x + k.bx / 2 > B - 0.5 : s === '-z' ? k.z - k.bz / 2 < 0.5 : k.z + k.bz / 2 > T - 0.5;
      if (an) gedeckt.push(s[1] === 'x' ? [k.z - k.bz / 2, k.z + k.bz / 2] : [k.x - k.bx / 2, k.x + k.bx / 2]);
    }
    for (const w of baender) if (w.s === s) gedeckt.push([w.a, w.b]);
    let n = abzug([0, L[s]], vereinige(gedeckt, 3)).filter(([a, b]) => b - a > 20);
    n = n.map(([a, b]) => [a < 1 ? -R : a, b > L[s] - 1 ? L[s] + R : b]);
    noetig[s] = n;
  }
  // ---------- Linien ----------
  // Ringlinien parallel zur Kante: c = Mittellinie, kante = Randlinie (Straße nur auf noetig[s], sonst Grünstreifen)
  const ringLinien = {};
  for (const s of SEITEN) {
    const dir = s[0] === '-' ? -1 : 1, rand = s === '-x' || s === '-z' ? 0 : s === '+x' ? B : T;
    const liste = [{ c: rand + (dir * RS.breite) / 2, ...RS, kante: true, seite: s, n: 0 }];
    let p = RS.breite, n = 1;
    for (;;) {
      p += Math.round(zw(r, 64, 90));
      if (p + RS.breite > R - 30) break;
      liste.push({ c: rand + dir * (p + RS.breite / 2), ...RS, seite: s, n: n++ });
      p += RS.breite;
    }
    ringLinien[s] = liste;
  }
  // Meeresküste: Ringlinien nur im Landstreifen, letzte Linie als Uferpromenade an der Kaimauer
  if (kueste && !binnen) {
    const dir = kueste[0] === '-' ? -1 : 1, rand = kueste === '-x' || kueste === '-z' ? 0 : kueste === '+x' ? B : T;
    const ab = (l) => Math.abs(l.c - rand) + l.breite / 2;
    ringLinien[kueste] = ringLinien[kueste].filter((l) => ab(l) < KUESTE_LAND - 40);
    ringLinien[kueste].push({ c: rand + dir * (KUESTE_LAND - RS.breite / 2), ...RS, seite: kueste, n: 99, ufer: true });
  }
  // Fortgesetzte Stadtlinien: z-Straßen der Randreihen, x-Straßen der Randspalten
  const fort = (q, s) => ({ c: q.mitte, breite: Math.min(q.breite, 24), gehweg: Math.min(q.gehweg, 4), haupt: q.typ === 'haupt', baumart: q.baumart, stadt: true, seite: s });
  const dedupe = (l) => l.sort((a, b) => a.c - b.c).filter((x, i, a) => !i || Math.abs(x.c - a[i - 1].c) > 1);
  const spaltenAus = (j, s) => dedupe(P.strassen.filter((q) => q.achse === 'z' && q.index === j && !q.eingeschoben && !q.bruecke && q.typ !== 'fussgaenger').map((q) => fort(q, s)));
  const xStrasse = (l) => P.strassen.filter((q) => q.achse === 'x' && Math.abs(q.mitte - P.xLinien[l].z) < 0.6 && !q.bruecke && q.typ !== 'fussgaenger');
  const lRand0 = P.spalten.x[0] + P.spalten.w[0], lRand1 = P.spalten.x[nx - 1];
  const reihenAus = (links, s) => {
    const out = [];
    for (let l = 0; l <= nz; l++) { const q = xStrasse(l).find((v) => (links ? v.von < lRand0 + 1 : v.bis > lRand1 - 1)); if (q) out.push(fort(q, s)); }
    return dedupe(out);
  };
  const stadtLinien = { '-z': spaltenAus(0, '-z'), '+z': spaltenAus(nz - 1, '+z'), '-x': reihenAus(true, '-x'), '+x': reihenAus(false, '+x') };
  // Lücken über 110 m (Randreihe ist Wasser, Park, Bahn) mit Vorortstraßen füllen, nicht im Wasserband
  for (const s of SEITEN) {
    const l = stadtLinien[s], Ls = L[s], neu = [];
    const kanten = [{ c: 0, breite: 0 }, ...l, { c: Ls, breite: 0 }];
    for (let q = 0; q + 1 < kanten.length; q++) {
      const a = kanten[q].c + kanten[q].breite / 2, e = kanten[q + 1].c - kanten[q + 1].breite / 2;
      const n = Math.floor((e - a) / 85);
      if (e - a < 110 || n < 1) continue;
      for (let k = 1; k <= n; k++) {
        const c = a + ((e - a) * k) / (n + 1);
        if (baender.some((w) => w.s === s && c > w.a - 12 && c < w.b + 12)) continue;
        neu.push({ c, ...RS, seite: s, n: k, fuell: true });
      }
    }
    stadtLinien[s] = dedupe([...l, ...neu]);
  }
  // ---------- Regionen ----------
  const reg = [
    { n: '-z', x0: 0, x1: B, z0: -R, z1: 0, X: stadtLinien['-z'], Z: ringLinien['-z'] },
    { n: '+z', x0: 0, x1: B, z0: T, z1: T + R, X: stadtLinien['+z'], Z: ringLinien['+z'] },
    { n: '-x', x0: -R, x1: 0, z0: 0, z1: T, X: ringLinien['-x'], Z: stadtLinien['-x'] },
    { n: '+x', x0: B, x1: B + R, z0: 0, z1: T, X: ringLinien['+x'], Z: stadtLinien['+x'] },
    { n: '-x-z', x0: -R, x1: 0, z0: -R, z1: 0, X: ringLinien['-x'], Z: ringLinien['-z'] },
    { n: '+x-z', x0: B, x1: B + R, z0: -R, z1: 0, X: ringLinien['+x'], Z: ringLinien['-z'] },
    { n: '-x+z', x0: -R, x1: 0, z0: T, z1: T + R, X: ringLinien['-x'], Z: ringLinien['+z'] },
    { n: '+x+z', x0: B, x1: B + R, z0: T, z1: T + R, X: ringLinien['+x'], Z: ringLinien['+z'] },
  ];
  const wasser = [];
  const abstandRand = (x0, z0, x1, z1) => Math.max(Math.max(0, -x1, x0 - B), Math.max(0, -z1, z0 - T));
  // Küste: Region(en) der Küstenseite werden Wasser (Binnensee nur bis SEE_TIEFE, dahinter Waldufer)
  if (kueste) {
    const ax = kueste[1];
    // Binnensee: Wasser von der Kartenkante bis SEE_TIEFE; Meer: von KUESTE_LAND bis zum Gürtelrand
    const a0 = binnen ? 0 : KUESTE_LAND, a1 = binnen ? SEE_TIEFE : R;
    const wx0 = kueste === '-x' ? -a1 : kueste === '+x' ? B + a0 : -R, wx1 = kueste === '-x' ? -a0 : kueste === '+x' ? B + a1 : B + R;
    const wz0 = kueste === '-z' ? -a1 : kueste === '+z' ? T + a0 : -R, wz1 = kueste === '-z' ? -a0 : kueste === '+z' ? T + a1 : T + R;
    wasser.push({ x: wx0, z: wz0, w: wx1 - wx0, d: wz1 - wz0, form: 'see', kueste: true, binnen, naturufer: binnen ? kueste : null, seed: P.seed * 3 + 1 });
    for (const g of reg) {
      if (!g.n.includes(kueste)) continue;
      if (!binnen) { if (ax === 'x') { if (kueste === '-x') g.x0 = -a0; else g.x1 = B + a0; } else if (kueste === '-z') g.z0 = -a0; else g.z1 = T + a0; continue; }
      if (ax === 'x') { if (kueste === '-x') g.x1 = -a1; else g.x0 = B + a1; }
      else if (kueste === '-z') g.z1 = -a1; else g.z0 = T + a1;
    }
    // Querbänder in Küstenregionen entfallen (gehören zum Meer)
  }
  // Querbänder: Wasserstreifen von der Kante bis zum Gürtelrand
  for (const w of baender) {
    const R0 = kueste ? (binnen ? SEE_TIEFE : 0) : 0;
    void R0;
    const Lw = w.s === kueste ? (binnen ? 0 : KUESTE_LAND) : R;   // an der Küste bis zum Meer
    if (Lw <= 0) continue;
    const rect = w.s === '-z' ? { x: w.a, z: -Lw, w: w.b - w.a, d: Lw } : w.s === '+z' ? { x: w.a, z: T, w: w.b - w.a, d: Lw }
      : w.s === '-x' ? { x: -Lw, z: w.a, w: Lw, d: w.b - w.a } : { x: B, z: w.a, w: Lw, d: w.b - w.a };
    wasser.push({ ...rect, form: w.form, band: w.s, seed: P.seed * 5 + wasser.length });
  }
  const imWasser = (x0, z0, x1, z1) => wasser.some((w) => {
    const ox = Math.min(x1, w.x + w.w) - Math.max(x0, w.x), oz = Math.min(z1, w.z + w.d) - Math.max(z0, w.z);
    return ox > 0.5 * (x1 - x0) && oz > 0.5 * (z1 - z0);
  });
  // ---------- Zellen ----------
  const zerlege = (a0, a1, lines) => {
    const out = [];
    let start = a0, links = null;
    for (const l of lines.filter((q) => q.c > a0 && q.c < a1).sort((p, q) => p.c - q.c)) {
      const e = l.c - l.breite / 2;
      if (e - start > 1) out.push({ a: start, b: e, links, rechts: l });
      start = l.c + l.breite / 2; links = l;
    }
    if (a1 - start > 1) out.push({ a: start, b: a1, links, rechts: null });
    return out;
  };
  for (const g of reg) if (bergSeiten.some((s) => g.n.includes(s))) g.weg = true;
  const zellen = [];
  for (const g of reg) {
    if (g.weg || g.x1 - g.x0 < 2 || g.z1 - g.z0 < 2) continue;
    g.xi = zerlege(g.x0, g.x1, g.X); g.zi = zerlege(g.z0, g.z1, g.Z);
    for (const X of g.xi) for (const Z of g.zi) {
      const c = { g, X, Z, x: X.a, z: Z.a, w: X.b - X.a, d: Z.b - Z.a };
      c.wasser = imWasser(c.x, c.z, c.x + c.w, c.z + c.d);
      const d = abstandRand(c.x, c.z, c.x + c.w, c.z + c.d) + zw(r, -35, 35);
      c.zone = c.wasser ? 'wasser' : d < D1 ? 'dicht' : d < D2 ? 'siedlung' : d < D3 ? 'feld' : 'wald';
      zellen.push(c);
    }
  }
  const bebaut = (c) => !!c && ['dicht', 'siedlung'].includes(c.zone);   // vor der Sonderwahl (Straßen)
  // Zellen an einer Linie in einer Region: Seite '-' = vor der Linie, '+' = dahinter
  const zelleAn = (g, achse, l, seite, t) => zellen.find((c) => c.g === g && (achse === 'x'
    ? (seite === '-' ? c.X.rechts === l : c.X.links === l) && t > c.z && t < c.z + c.d
    : (seite === '-' ? c.Z.rechts === l : c.Z.links === l) && t > c.x && t < c.x + c.w));
  // ---------- Straßenstücke ----------
  const strassen = [], gruen = [];
  const stueck = (l, achse, von, bis, art, g) => {
    // achse 'z': Linie mit konstantem x (Straße entlang z)
    if (bis - von < 1) return null;
    const s = { id: 'a' + strassen.length, achse, mitte: l.c, von, bis, breite: l.breite, gehweg: l.gehweg, typ: l.haupt && l.breite >= 20 ? 'haupt' : 'neben', art: null,
      mittel: 0, tram: false, mittelstreifen: false, bruecke: art === 'bruecke', parken: r() < 0.5 ? 1 : -1, baeume: false, baumart: l.baumart ?? 'linde', belag: 'asphalt', rand: true, linie: l, region: g.n };
    strassen.push(s);
    return s;
  };
  for (const g of reg) {
    if (!g.xi) continue;
    // Linien entlang z (konstantes x): Stücke je z-Intervall
    for (const l of g.X) {
      if (l.c <= g.x0 || l.c >= g.x1) continue;
      for (const Z of g.zi) {
        const t = (Z.a + Z.b) / 2;
        const a = zelleAn(g, 'x', l, '-', t), b = zelleAn(g, 'x', l, '+', t);
        const nass = a?.wasser || b?.wasser;
        const ueber = imWasser(l.c - l.breite / 2, Z.a, l.c + l.breite / 2, Z.b);
        let art = null;
        if (ueber) art = (l.kante || l.n % 4 === 1) && abstandRand(l.c, Z.a, l.c, Z.b) < D2 ? 'bruecke' : null;
        else if (l.kante) art = deckt(noetig[l.seite], t) || nass ? 'strasse' : 'gruen';
        else if (l.stadt) art = l.haupt || nass || bebaut(a) || bebaut(b) || abstandRand(l.c, Z.a, l.c, Z.b) < D2 ? 'strasse' : null;
        else art = nass || bebaut(a) || bebaut(b) || (l.n % 3 === 1 && abstandRand(l.c, Z.a, l.c, Z.b) < D3) ? 'strasse' : null;
        if (a?.wasser && b?.wasser) art = null;
        if (art === 'strasse' || art === 'bruecke') stueck(l, 'z', Z.a, Z.b, art, g);
        else if (art === 'gruen') gruen.push({ x: l.c - l.breite / 2, z: Z.a, w: l.breite, d: Z.b - Z.a, seite: l.seite, achse: 'z' });
      }
    }
    for (const l of g.Z) {
      if (l.c <= g.z0 || l.c >= g.z1) continue;
      for (const X of g.xi) {
        const t = (X.a + X.b) / 2;
        const a = zelleAn(g, 'z', l, '-', t), b = zelleAn(g, 'z', l, '+', t);
        const nass = a?.wasser || b?.wasser;
        const ueber = imWasser(X.a, l.c - l.breite / 2, X.b, l.c + l.breite / 2);
        let art = null;
        if (ueber) art = (l.kante || l.n % 4 === 1) && abstandRand(X.a, l.c, X.b, l.c) < D2 ? 'bruecke' : null;
        else if (l.kante) art = deckt(noetig[l.seite], t) || nass ? 'strasse' : 'gruen';
        else if (l.stadt) art = l.haupt || nass || bebaut(a) || bebaut(b) || abstandRand(X.a, l.c, X.b, l.c) < D2 ? 'strasse' : null;
        else art = nass || bebaut(a) || bebaut(b) || (l.n % 3 === 1 && abstandRand(X.a, l.c, X.b, l.c) < D3) ? 'strasse' : null;
        if (art === 'strasse' || art === 'bruecke') stueck(l, 'x', X.a, X.b, art, g);
        else if (art === 'gruen') gruen.push({ x: X.a, z: l.c - l.breite / 2, w: X.b - X.a, d: l.breite, seite: l.seite, achse: 'x' });
      }
    }
  }
  // ---------- Kreuzungen ----------
  const kreuzungen = [];
  const amEnde = (l, achse, wert, seite) => strassen.find((s) => s.linie === l && s.achse === achse && (seite === '-' ? Math.abs(s.bis - wert) < 0.6 : Math.abs(s.von - wert) < 0.6));
  for (const g of reg) {
    if (!g.xi) continue;
    for (const lx of g.X) {
      if (lx.c <= g.x0 || lx.c >= g.x1) continue;
      for (const lz of g.Z) {
        if (lz.c <= g.z0 || lz.c >= g.z1) continue;
        const arme = { '-z': amEnde(lx, 'z', lz.c - lz.breite / 2, '-'), '+z': amEnde(lx, 'z', lz.c + lz.breite / 2, '+'), '-x': amEnde(lz, 'x', lx.c - lx.breite / 2, '-'), '+x': amEnde(lz, 'x', lx.c + lx.breite / 2, '+') };
        const liste = Object.values(arme).filter(Boolean);
        if (!liste.length) continue;
        if (imWasser(lx.c - lx.breite / 2, lz.c - lz.breite / 2, lx.c + lx.breite / 2, lz.c + lz.breite / 2)) continue;
        kreuzungen.push({ id: 'ak' + kreuzungen.length, x: lx.c, z: lz.c, bx: lx.breite, bz: lz.breite, gx: lx.gehweg, gz: lz.gehweg, arme,
          ampel: false, zebra: liste.length >= 3 && liste.some((s) => s.typ === 'haupt'), gepflastert: false, sackgasse: liste.length === 1, rand: true });
      }
    }
  }
  // Grünstreifen-Kreuzungen: Querstraße läuft durch den Grünstreifen bis zur Stadtstraße (Kreuzungsfeld als Straßenstück)
  // (durch amEnde oben als Arm erfasst; ohne Querlinie entsteht kein Feld)
  // ---------- Blöcke ----------
  const randInfo = (c) => {
    const rd = {};
    const seg = (achse, l, t) => l && strassen.find((s) => s.linie === l && s.achse === achse && t >= s.von - 0.5 && t <= s.bis + 0.5);
    const tx = c.z + c.d / 2, tz = c.x + c.w / 2;
    for (const [sd, achse, l, t] of [['-x', 'z', c.X.links, tx], ['+x', 'z', c.X.rechts, tx], ['-z', 'x', c.Z.links, tz], ['+z', 'x', c.Z.rechts, tz]]) {
      const s = seg(achse, l, t);
      rd[sd] = s && !s.bruecke ? { gehweg: s.gehweg, strasse: true, seg: s.id, haupt: s.typ === 'haupt' } : { gehweg: 0, strasse: false };
    }
    return rd;
  };
  const bloecke = [];
  for (const c of zellen) {
    if (c.wasser) continue;
    let zone = c.zone;
    const rb = rng(Math.floor(r() * 1e9));
    const rand = randInfo(c);
    const fronten = Object.keys(rand).filter((k) => rand[k].strasse);
    if ((zone === 'dicht' || zone === 'siedlung') && !fronten.length) zone = 'feld';
    if (zone === 'dicht' && Object.values(rand).some((q) => q.haupt) && rb() < 0.3) zone = 'gewerbe';
    else if (zone === 'dicht' && rb() < 0.08) zone = 'gewerbe';
    else if (zone === 'siedlung' && rb() < 0.1) zone = 'kleingarten';
    else if (rb() < 0.09 && Math.min(c.w, c.d) >= 56 && (zone === 'dicht' || zone === 'siedlung')) zone = 'sonder';
    else if (zone === 'feld' && rb() < 0.12) zone = 'hof';
    else if (zone === 'feld' && rb() < 0.12) zone = 'wald';
    if (zone === 'feld' || zone === 'wald' || zone === 'hof') for (const k of Object.keys(rand)) rand[k] = { ...rand[k], gehweg: 0 };
    const blk = { id: 'ab' + bloecke.length, x: c.x, z: c.z, w: c.w, d: c.d, zone, rand, fronten, region: c.g.n, seed: Math.floor(rb() * 1e9) };
    if (zone === 'sonder') blk.sonder = Object.values(rand).some((q) => q.haupt) && rb() < 0.5 ? 'tankstelle' : waehle(rb, ['supermarkt', 'schule', 'kirche', 'supermarkt']);
    if (['dicht', 'siedlung', 'gewerbe', 'hof', 'sonder'].includes(zone)) Object.assign(blk, belege(blk, rb));
    bloecke.push(blk);
  }
  // Umland innerhalb der Karte (inaktive Zellen ovaler Städte): Vorortblöcke an den Stadtstraßen
  for (const u0 of P.umland ?? []) {
    if (u0.art !== 'land') continue;
    // Uferstraße zwischen Vorortblock und Stadtwasser (GESTALTUNG.md 4: keine nackte Wasserkante)
    const u = { ...u0 };
    for (const w of wasserB) {
      const oz = Math.min(u.z + u.d, w.z + w.d) - Math.max(u.z, w.z) - 0, ox = Math.min(u.x + u.w, w.x + w.w) - Math.max(u.x, w.x);
      const ufer = (achse, mitte, von, bis) => strassen.push({ id: 'a' + strassen.length, achse, mitte, von, bis, breite: RS.breite, gehweg: RS.gehweg, typ: 'neben', art: null, mittel: 0, tram: false, mittelstreifen: false, bruecke: false, parken: 1, baeume: false, baumart: 'linde', belag: 'asphalt', rand: true, linie: null, region: 'innen' });
      const B2 = RS.breite;
      const gL = u.x - (w.x + w.w), gR = w.x - (u.x + u.w), gO = u.z - (w.z + w.d), gU = w.z - (u.z + u.d);
      if (oz > 5 && gL > -1.5 && gL < 16) { const x1 = w.x + w.w + B2; ufer('z', w.x + w.w + B2 / 2, Math.max(u.z, w.z), Math.min(u.z + u.d, w.z + w.d)); u.w -= x1 - u.x; u.x = x1; }
      else if (oz > 5 && gR > -1.5 && gR < 16) { ufer('z', w.x - B2 / 2, Math.max(u.z, w.z), Math.min(u.z + u.d, w.z + w.d)); u.w = w.x - B2 - u.x; }
      else if (ox > 5 && gO > -1.5 && gO < 16) { const z1 = w.z + w.d + B2; ufer('x', w.z + w.d + B2 / 2, Math.max(u.x, w.x), Math.min(u.x + u.w, w.x + w.w)); u.d -= z1 - u.z; u.z = z1; }
      else if (ox > 5 && gU > -1.5 && gU < 16) { ufer('x', w.z - B2 / 2, Math.max(u.x, w.x), Math.min(u.x + u.w, w.x + w.w)); u.d = w.z - B2 - u.z; }
    }
    if (u.w < 20 || u.d < 20) continue;
    const rand = {};
    for (const sd of SEITEN) rand[sd] = { gehweg: 2.5, strasse: true };
    const blk = { id: 'ab' + bloecke.length, x: u.x, z: u.z, w: u.w, d: u.d, zone: 'dicht', rand, fronten: [...SEITEN], region: 'innen', innen: true, seed: u.seed };
    Object.assign(blk, belege(blk, rng(u.seed + 3)));
    bloecke.push(blk);
  }
  const kameraGrenze = { x0: 0, z0: 0, x1: B, z1: T, sicht: R - 40 };
  return { aussen: { R, strassen, kreuzungen, bloecke, wasser, gruen, kueste, binnen, kuesteAb: kueste && !binnen ? KUESTE_LAND : 0, bauten: ringBauten }, kameraGrenze, berge: bergSeiten.length ? berge : null };
}

// ---------- Belegung der Vorortblöcke (Daten, damit pruef-gestaltung.js freie Flächen messen kann) ----------
// GESTALTUNG.md 1 gilt auch am Stadtrand: keine leeren Blockinnenflächen. Reihen- und Einfamilienhäuser stehen in
// parallelen Reihen mit Parzellen bis 15 m Tiefe (Wohnweg zwischen zwei Reihen), Mehrfamilienzeilen im Abstand von
// 16 m mit Stellplätzen davor. Rückgabe je Block: bauten [{ art, x, z, ry, s, w, d }] (x, z = Mitte, w × d = Grundriss
// in Weltachsen), flaechen [{ art: 'weg' | 'stellplatz' | 'hof', x, z, w, d }], hecken [[x0, z0, x1, z1]], baeume [[x, z, art]].
const FACE = { '+v': 0, '-v': Math.PI };
function belege(b, r) {
  // Reihen entlang x (Front ±z) oder entlang z (Front ±x): meist entlang der langen Seite, aber wechselnd (keine Teppiche)
  const quer = r() < (b.w >= b.d ? 0.72 : 0.28);
  const U0 = quer ? b.x : b.z, U1 = quer ? b.x + b.w : b.z + b.d, V0 = quer ? b.z : b.x, V1 = quer ? b.z + b.d : b.x + b.w;
  const welt = (u, v) => (quer ? [u, v] : [v, u]);
  const rot = (f) => (quer ? FACE[f] : f === '+v' ? Math.PI / 2 : -Math.PI / 2);
  const rect = (u0, v0, u1, v1) => { const [x0, z0] = welt(u0, v0), [x1, z1] = welt(u1, v1); return { x: Math.min(x0, x1), z: Math.min(z0, z1), w: Math.abs(x1 - x0), d: Math.abs(z1 - z0) }; };
  const out = { bauten: [], flaechen: [], hecken: [], baeume: [] };
  const bau = (art, u, v, bw, bd, f, s = 1) => { const [x, z] = welt(u, v); const R = rect(u - bw / 2, v - bd / 2, u + bw / 2, v + bd / 2); out.bauten.push({ art, x, z, ry: rot(f), s, w: R.w, d: R.d }); };
  const flaeche = (art, u0, v0, u1, v1) => { if (u1 - u0 > 0.5 && v1 - v0 > 0.5) out.flaechen.push({ art, ...rect(u0, v0, u1, v1) }); };
  const hecke = (u0, v0, u1, v1) => { const R = rect(u0, v0, u1, v1); out.hecken.push([R.x, R.z, R.x + R.w, R.z + R.d]); };
  const baum = (u, v, art) => { const [x, z] = welt(u, v); out.baeume.push([x, z, art]); };
  const Lu = U1 - U0, Lv = V1 - V0;
  if (b.zone === 'gewerbe') {
    // Hallen in Reihen (an Hauptstraßen groß), Lieferhof davor, Stellplätze an der Straße
    const gross = Object.values(b.rand).some((q) => q.haupt) || r() < 0.3;
    const tief = gross ? 28 : 18, hof = 10;
    let v = V0 + 3;
    if (gross && Lv > tief + hof + 22) { flaeche('stellplatz', U0 + 2, v, U1 - 2, v + 14); v += 16; }
    while (v + tief + hof <= V1 - 3) {
      const n = Math.max(1, Math.round(Lu / (gross ? 70 : 40))), bw = (Lu - 6 - (n - 1) * 6) / n;
      for (let k = 0; k < n; k++) { const u = U0 + 3 + k * (bw + 6) + bw / 2; const sx = Math.min(gross ? 2.4 : 1.6, bw / 30); bau('halle', u, v + tief / 2, 30 * sx, tief, '+v', [sx, gross ? 1.25 : 1, tief / 18]); }
      flaeche('hof', U0 + 2, v + tief, U1 - 2, v + tief + hof);
      v += tief + hof + 2;
    }
    if (V1 - 3 - v > 6) flaeche('stellplatz', U0 + 2, v, U1 - 2, V1 - 2);
    return out;
  }
  if (b.zone === 'sonder') {
    // Einzelne Gemeinbauten im Vorort: Supermarkt, Schule mit Sportplatz, Kirche, Tankstelle (an Hauptstraßen)
    const um = (U0 + U1) / 2, vm = (V0 + V1) / 2;
    if (b.sonder === 'supermarkt') {
      const sx = Math.min(1.5, (Lu - 10) / 30), sz = Math.min(1.7, (Lv - 30) / 18);
      bau('halle', um, V0 + 3 + (18 * sz) / 2, 30 * sx, 18 * sz, '+v', [sx, 0.75, sz]);
      flaeche('stellplatz', U0 + 2, V0 + 6 + 18 * sz, U1 - 2, V1 - 2);
      // seitlich der Halle: Anlieferung und Stellplätze (sonst bleibt neben dem Markt Rasen)
      const hw = 15 * sx;
      if (um - hw - 2 - U0 > 8) flaeche('stellplatz', U0 + 2, V0 + 3, um - hw - 2, V0 + 4 + 18 * sz);
      if (U1 - (um + hw + 2) > 8) flaeche('hof', um + hw + 2, V0 + 3, U1 - 2, V0 + 4 + 18 * sz);
    } else if (b.sonder === 'schule') {
      const sx = Math.min(1.6, (Lu * 0.55) / 24);
      bau('zeile', U0 + 3 + 12 * sx, V0 + 9, 24 * sx, 12, '-v', [sx, 1, 1]);
      bau('zeile', U0 + 9, V0 + 21 + 10, 12, 20, '+v', [0.5, 1, 1.7]);
      flaeche('hof', U0 + 18, V0 + 16, U0 + 6 + 24 * sx, V1 - 4);
      flaeche('sportplatz', U0 + 10 + 24 * sx, V0 + 4, U1 - 3, V1 - 4);
    } else if (b.sonder === 'kirche') {
      flaeche('hof', um - 22, vm - 16, um + 22, vm + 16);
      bau('dorfkirche', um, vm, 30, 11, '+v');
      // beiderseits des Kirchplatzes: Gemeindehaus und Parkplatz statt Rasen
      if (um - 24 - U0 > 10) { flaeche('stellplatz', U0 + 2, vm - 15, um - 24, vm + 15); }
      if (U1 - (um + 24) > 10) { const w2 = Math.min(22, U1 - um - 30); if (w2 > 8) bau('zeile', um + 26 + w2 / 2, vm, w2, 12, '+v', [w2 / 24, 0.8, 1]); if (U1 - (um + 28 + w2) > 8) flaeche('stellplatz', um + 28 + w2, vm - 15, U1 - 2, vm + 15); }
      for (let i = 0; i < 6; i++) baum(um + zw(r, -20, 20), vm + (i % 2 ? 13 : -13), 'linde');
      out.frei = [vm - 19, vm + 19];
    } else {
      // Tankstelle an der Ecke, dahinter Werkstatt
      flaeche('hof', U0 + 2, V1 - 26, U0 + 36, V1 - 2);
      bau('tankstelle', U0 + 18, V1 - 14, 16, 10, '+v');
      bau('halle', U0 + 52, V1 - 12, 24, 18, '+v', [0.8, 0.7, 1]);
      // daneben Waschstraße bzw. Autohandel bis zur Blockecke
      if (U1 - (U0 + 66) > 8) flaeche('stellplatz', U0 + 66, V1 - 26, U1 - 2, V1 - 2);
      out.frei = [V1 - 28, V1];
    }
    if (b.sonder === 'supermarkt' || b.sonder === 'schule') return out;
  }
  if (b.zone === 'hof') {
    const um = U0 + Lu * zw(r, 0.3, 0.6), vm = V0 + Lv * zw(r, 0.3, 0.6);
    flaeche('hof', um - 20, vm - 18, um + 20, vm + 18);
    bau('efh', um - 9, vm - 9, 9, 8, '+v');
    bau('scheune', um + 8, vm + 6, 18, 12, '+v');
    for (let i = 0; i < 5; i++) baum(um + zw(r, -18, 18), vm + zw(r, 14, 18), 'linde');
    return out;
  }
  const dicht = b.zone === 'dicht';
  const zeilen = dicht && Lv >= 44 && r() < 0.4;
  if (zeilen) {
    // Mehrfamilienzeilen parallel, Front +v, je Zeile Stellplätze davor, 16 m Abstand
    const D = 12, P = 28;
    const n = Math.max(1, Math.floor((Lv - 8 - D) / P) + 1);
    const rest = Lv - 8 - D - (n - 1) * P;
    for (let k = 0; k < n; k++) {
      const v = V0 + 4 + rest / 2 + k * P;
      // Zeilenstücke von rund 24 m mit 6 m Durchgang, gestreckt bis zur Blockbreite
      const m = Math.max(1, Math.round((Lu - 4 + 6) / 30)), sx = Math.min(1.4, Math.max(0.75, (Lu - 4 - (m - 1) * 6) / (m * 24))), bw = 24 * sx;
      for (let q = 0; q < m; q++) bau('zeile', U0 + 2 + q * (bw + 6) + bw / 2, v + D / 2, bw, D, '+v', [sx, 1, 1]);
      if (k < n - 1) {
        flaeche('stellplatz', U0 + 3, v + D + 1.5, U1 - 3, v + D + 7);
        for (let u = U0 + 6; u < U1 - 4; u += 9) baum(u, v + D + 11, waehle(r, ['linde', 'kugel', 'birke']));
        flaeche('weg', U0 + 2, v + D + 13, U1 - 2, v + D + 15);
      }
    }
    return out;
  }
  // Reihen- bzw. Einfamilienhäuser: Außenreihen zur Straße, innen Reihenpaare an einem Wohnweg
  const efh = !dicht;
  const D = efh ? 8 : 10, garten = efh ? 6 : 5, vor = 3, weg = 4.5;
  const reihe = (v0, f) => {
    // f = Blickrichtung (+v oder -v); v0 = Vorderkante der Baulinie (zur Straße bzw. zum Weg)
    const vc = f === '+v' ? v0 - D / 2 : v0 + D / 2;
    if (efh) {
      const lot = zw(r, 14, 17), n = Math.max(1, Math.floor((Lu - 2) / lot)), lw = (Lu - 2) / n;
      for (let k = 0; k < n; k++) {
        const u = U0 + 1 + k * lw + lw / 2;
        const bung = r() < 0.15;
        const dv = zw(r, -1.4, 1.4) * (f === '+v' ? 1 : -1);   // versetzte Baulinie
        bau(bung ? 'bungalow' : 'efh', u - 2 + zw(r, -1, 1), vc - Math.abs(dv) * (f === '+v' ? 1 : -1), bung ? 11 : 9, bung ? 9 : 8, f);
        if (!bung && lw >= 14) bau('garage', u + lw / 2 - 2.4, vc + (f === '+v' ? 1 : -1), 3.4, 6, f);
        const gv = f === '+v' ? [vc - D / 2 - garten, vc - D / 2] : [vc + D / 2, vc + D / 2 + garten];
        if (k > 0) hecke(u - lw / 2 - 0.3, gv[0], u - lw / 2 + 0.3, gv[1]);
        baum(u + zw(r, -4, 4), (gv[0] + gv[1]) / 2, waehle(r, ['kugel', 'linde', 'birke', 'nadel']));
      }
    } else {
      const n = Math.floor((Lu - 2) / 6), takt = 4 + Math.floor(r() * 6);
      let u = U0 + 1 + (Lu - 2 - n * 6) / 2;
      for (let k = 0; k < n; k++) {
        if (k > 0 && k % takt === 0) { u += 6; continue; }   // Durchgang, Rhythmus je Reihe
        bau('reihenhaus', u + 3, vc, 6, D, f);
        const gv = f === '+v' ? [vc - D / 2 - garten, vc - D / 2] : [vc + D / 2, vc + D / 2 + garten];
        hecke(u - 0.2, gv[0], u + 0.2, gv[1]);
        u += 6;
      }
    }
  };
  const tiefe = vor + D + garten;          // eine Reihe mit Vorgarten und Garten (≤ 15 m Parzelle)
  // Streifen [A, B] (quer zu den Reihen) füllen: Außenreihen an beiden Kanten, innen Reihenpaare am Wohnweg,
  // Reste als Garagenhof oder Baumreihe. Sonderbauten (Kirche, Tankstelle) lassen nur ihren Teil frei.
  const fuelle = (A, B) => {
    const L = B - A;
    if (L < tiefe - 1) { if (L > 6) for (let u = U0 + 5; u < U1 - 4; u += 8) baum(u + zw(r, -2, 2), (A + B) / 2, waehle(r, ['kugel', 'linde', 'birke'])); return; }
    if (L < 2 * tiefe) {
      const f = A === V0 ? '-v' : B === V1 ? '+v' : (b.fronten.includes(quer ? '+z' : '+x') ? '+v' : '-v');
      reihe(f === '+v' ? B - vor : A + vor, f);
      return;
    }
    reihe(A + vor, '-v');
    reihe(B - vor, '+v');
    const paar = 2 * (D + garten + 2) + weg;
    let v = A + tiefe, frei = B - tiefe - v;
    const np = Math.floor(frei / paar);
    const luft = np ? (frei - np * paar) / (np + 1) : frei;
    for (let k = 0; k < np; k++) {
      v += luft;
      const vw = v + garten + D + 2;
      reihe(vw, '+v');
      flaeche('weg', U0 + 1, vw, U1 - 1, vw + weg);
      reihe(vw + weg, '-v');
      v += paar;
    }
    // Restfläche zwischen den Gärten: Garagenhof
    if (luft > 14) for (let k = 0; k <= np; k++) {
      const va = A + tiefe + k * (paar + luft), vb = va + luft;
      flaeche('hof', U0 + 4, va + 1, U1 - 4, vb - 1);
      for (let u = U0 + 6; u < U1 - 6; u += 3.6) bau('garage', u, (va + vb) / 2, 3.4, 6, '+v');
    } else if (luft > 3) for (let k = 0; k <= np; k++) {
      const vm = A + tiefe + k * (paar + luft) + luft / 2;
      for (let u = U0 + 5; u < U1 - 4; u += 8) baum(u + zw(r, -2, 2), vm, waehle(r, ['kugel', 'linde', 'birke']));
    }
  };
  if (out.frei) { const [a, e] = out.frei; delete out.frei; if (a - V0 > 4) fuelle(V0, a); if (V1 - e > 4) fuelle(e, V1); return out; }
  fuelle(V0, V1);
  return out;
}

/**
 * Gemeinsame Kamera der Nahausschnitte (Katalog standortEintrag und pruef-gestaltung.js): Bildmitte und Zoom.
 * ansicht 'einkauf' (Kreuz der Einkaufslage), 'center' (erstes Center bzw. Fachmarktlage, mittig) oder o.punkt
 * ([0..1, 0..1] relativ zur Karte). Die Mitte bleibt in plan.kameraGrenze (wie im Spiel beim freien Verschieben);
 * der Stadtrandgürtel deckt den Blick darüber hinaus. Kleine Städte zoomen etwas näher (min(Breite, Tiefe) / 6,5).
 */
export function nahMitte(plan, ansicht = 'einkauf', zoom = 62, o = {}) {
  let x, z;
  if (ansicht === 'center') {
    const st = plan.standorte.find((p) => p.lage === 'center') ?? plan.standorte.find((p) => p.lage === 'rand');
    const b = st && plan.bloecke.find((q) => q.id === st.block);
    [x, z] = b ? [b.x + b.w / 2, b.z + b.d / 2] : [plan.breite / 2, plan.tiefe / 2];
  } else if (o.punkt) [x, z] = [plan.breite * o.punkt[0], plan.tiefe * o.punkt[1]];
  else { const L = plan.einkaufslage; [x, z] = L ? [L.xF - 8, L.zF - 8] : [plan.breite / 2, plan.tiefe / 2]; }
  const G = plan.kameraGrenze ?? { x0: 0, z0: 0, x1: plan.breite, z1: plan.tiefe };
  if (!o.ungeklemmt) { x = Math.min(Math.max(x, G.x0), G.x1); z = Math.min(Math.max(z, G.z0), G.z1); }
  return { x, z, zoom: Math.min(zoom, Math.min(plan.breite, plan.tiefe) / 6.5) };
}
