// E54 Bauprogramm: Bildkarten je Maßnahme. Je Karte zwei Kacheln mit gleicher Kamera (vorher | nachher),
// tests/umbau-karten.cjs setzt sie zu einem geteilten Kartenbild zusammen.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { etage, raster } from '../kit/grundriss.js';
import { warenhaus } from '../kit/warenhaus.js';
import { technikAufDach } from '../kit/umbau-aussen.js';
import haeuser from '../../haeuser.json';

const HG = '#2a2320';
const basis = haeuser.find((h) => h.id === 'W046') ?? haeuser.find((h) => h.format === 'warenhaus' && h.etagen.length >= 3);
const mit = (gen, technik = false) => ({
  ...structuredClone(basis),
  etagenBau: Object.fromEntries(basis.etagen.map((n) => [n, { moebelGeneration: gen, technik: { klima: technik ? 2 : 0 }, klimaModernisiert: technik }])),
});

// Farbe um: abgenutzt (Boden) oder verwittert (Fassade). Nur Teile, die `wahl(geometrie)` erfüllen.
function umfaerben(S, fn, wahl = () => true) {
  const neu = new Map();
  for (const [k, gs] of S.teile) {
    for (const g of gs) {
      const ziel = wahl(g) ? fn(k) : k;
      if (!neu.has(ziel)) neu.set(ziel, []);
      neu.get(ziel).push(g);
    }
  }
  S.teile = neu;
}
const hsl = (hex, f) => { const c = new THREE.Color(hex), o = {}; c.getHSL(o); f(o); c.setHSL(o.h, o.s, o.l); return '#' + c.getHexString(); };
const abgenutzt = (hex) => hsl(hex, (o) => { o.h = 0.08; o.s = Math.min(0.32, o.s * 0.5 + 0.14); o.l *= 0.66; });
const verwittert = (hex) => hsl(hex, (o) => { o.h = o.h * 0.6 + 0.07 * 0.4; o.s = o.s * 0.35 + 0.05; o.l = o.l * 0.68; });
const istBoden = (g) => { g.computeBoundingBox(); const b = g.boundingBox; return b.max.y < 0.09 && b.min.y > -0.05; };
const istWand = (g) => { g.computeBoundingBox(); const b = g.boundingBox; return b.max.y - b.min.y > 2.6 && Math.min(b.max.x - b.min.x, b.max.z - b.min.z) < 0.5; };
const bodenAlt = (S) => {
  let n = 0, ys = new Map();
  for (const gs of S.teile.values()) for (const g of gs) { g.computeBoundingBox(); const b = g.boundingBox; if (b.max.y - b.min.y < 0.08) { n++; const k = b.min.y.toFixed(2); ys.set(k, (ys.get(k) ?? 0) + 1); } }
  umfaerben(S, abgenutzt, istBoden);
};
const ROST = { '#c0c9ce': '#8a7a6a', '#687984': '#6b4f3a', '#778894': '#7a5b44', '#303d49': '#3a2a20' };

const teile = [];
/** Eine Karte: zwei Kacheln mit derselben Box, damit die Kamera gleich steht. */
function karte(name, vorher, nachher) {
  teile.push({ titel: name + ' · vorher', hintergrund: HG, bau: vorher });
  teile.push({ titel: name + ' · nachher', hintergrund: HG, bau: nachher });
}
const innen = (gen, ausschnitt, extra) => (S, scene) => {
  const r = etage(S, scene, mit(gen), 2, { ausschnitt, kunden: 6 });
  extra?.(S, r);
  return r.box;
};
// Frontecke (+x/+z): Ausschnitt so, dass die Teilung mitten durch die Fassade läuft.
const AUSSEN_BOX = (res) => new THREE.Box3(new THREE.Vector3(res.w * 0.35, -1, res.d * 0.35), new THREE.Vector3(res.w + 6, (res.dach ?? res.hoehe) + 3, res.d + 8));
const aussen = (substanz, opt, technik, alt = false) => (S, scene) => {
  const h = { ...mit(alt ? 1 : 3, technik), substanz };
  const res = warenhaus(S, scene, h, { x: 0, z: 0, passanten: true, ...opt });
  if (technik) technikAufDach(S, h, { x: 0, z: 0, w: res.w, d: res.d, hoehe: res.hoehe, dach: res.dach, platz: res.platz });
  if (alt) umfaerben(S, (k) => (['#d23c32', '#c8102e', '#e2231a'].includes(k) ? hsl(k, (o) => { o.s *= 0.6; o.l *= 0.85; }) : verwittert(k)));
  return AUSSEN_BOX(res);
};
// Dach: dieselben Geräte, vorher rostig (alte Kältetechnik), nachher neu. Ausschnitt mittig auf die Gerätereihe.
const dachBox = (S, scene, neu) => {
  const h = { ...mit(1, true), substanz: 60 };
  const res = warenhaus(S, scene, h, { x: 0, z: 0, passanten: false });
  technikAufDach(S, h, { x: 0, z: 0, w: res.w, d: res.d, hoehe: res.hoehe, dach: res.dach, platz: res.platz });
  if (!neu) umfaerben(S, (k) => ROST[k] ?? k);
  const y = res.dach ?? res.hoehe, [pu, pv] = res.platz ?? [0.62, 0.78];
  const cx = res.w * pu + 3.5, cz = res.d * pv;
  return new THREE.Box3(new THREE.Vector3(cx - 8, y - 1, cz - 5), new THREE.Vector3(cx + 8, y + 3, cz + 5));
};

// Brandschutz: Sprinklerleitungen unter der Decke, Feuerlöscher, Notausgangsschilder, Brandschutztor.
function brandschutz(S, r) {
  const b = r.box, y = 3.7, rot = '#c8102e';
  for (let z = b.min.z + 2.5; z < b.max.z - 1; z += 5) {
    S.box(b.max.x - b.min.x - 2, 0.12, 0.12, (b.min.x + b.max.x) / 2, y, z, rot);
    for (let x = b.min.x + 2; x < b.max.x - 1; x += 3.5) S.box(0.08, 0.35, 0.08, x, y - 0.2, z, '#d9d9d9');
  }
  for (let x = b.min.x + 4; x < b.max.x - 2; x += 9) {
    S.box(0.3, 0.75, 0.3, x, 0.45, b.min.z + 1.1, rot);
    S.box(0.2, 0.12, 0.2, x, 0.88, b.min.z + 1.1, '#222');
  }
  for (const x of [b.min.x + 6, b.max.x - 6]) S.box(1.4, 0.55, 0.08, x, 3.1, b.min.z + 0.7, '#1e9e4a');
  S.box(5, 3.4, 0.2, b.min.x + 1.5, 1.7, (b.min.z + b.max.z) / 2, '#8d9399');
}
// Stillgelegte Rolltreppe: hohe gelb-schwarze Absperrwände quer vor beiden Enden beider Läufe.
function rolltreppeAus(S) {
  const ra = raster(mit(1), 2), x = ra.kx * 5, z = ra.kz * 5;
  for (const lx of [x + 0.2, x + 10.0]) {
    S.box(0.1, 1.5, 3.6, lx, 0.8, z + 7.1, '#f2c200');
    for (let i = 0; i < 4; i++) S.box(0.12, 0.22, 3.6, lx, 0.25 + i * 0.4, z + 7.1, '#1b1b1b');
    S.box(0.14, 0.9, 1.6, lx, 2.1, z + 7.1, '#f2c200');
  }
}

const nur = (globalThis.location?.search.match(/nur=([^&]+)/)?.[1] ?? '').split(',').filter(Boolean);
const AUSWAHL = (n) => !nur.length || nur.includes(n);

if (AUSWAHL('komplett')) karte('Komplettumbau', aussen(30, {}, false, true), aussen(92, { status: 'neueroeffnung' }, true));
if (AUSWAHL('moebel')) karte('Möbel und Ladenbau', innen(1, { anker: 'eingang' }), innen(3, { anker: 'eingang' }));
if (AUSWAHL('oberflaeche')) karte('Boden, Decke, Farbe', innen(3, { anker: 'ecke' }, (S) => { bodenAlt(S); umfaerben(S, verwittert, istWand); }), innen(3, { anker: 'ecke' }));
if (AUSWAHL('klima')) karte('Klima und Lüftung', (S, sc) => dachBox(S, sc, false), (S, sc) => dachBox(S, sc, true));
if (AUSWAHL('licht')) karte('LED-Licht', innen(3, { anker: 'eingang' }), innen(3, { anker: 'eingang' }));
if (AUSWAHL('brandschutz')) karte('Brandschutz', innen(3, { anker: 'ecke' }), innen(3, { anker: 'ecke' }, brandschutz));
if (AUSWAHL('foerdertechnik')) karte('Aufzug und Rolltreppe', innen(1, { anker: 'kern' }, rolltreppeAus), innen(3, { anker: 'kern' }));
if (AUSWAHL('fassade')) karte('Fassade und Eingang', aussen(30, {}, false, true), aussen(92, {}, false));

zeigeKatalog(teile, { titel: 'Bauprogramm · Bildkarten', spalten: 2, kachel: [720, 480] });
