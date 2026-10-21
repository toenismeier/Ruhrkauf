// Q01: handgebaute Leitbauten Essens auf den OSM-Positionen.
// Eigene Teilebudgets: Rathaus < 500, Bahnhof < 650, Kirchen < 300,
// Einkaufszentrum < 400, Straßenmöblierung < 300 Teile.
import { rng, FARBEN } from '../basis.js';

const fall = (k, id) => k.wahrzeichen.find(q => q.id === id)?.pos;
function turm(S, x, z, breite, tiefe, hoehe, farbe, fenster, geschosse) {
  S.box(breite, hoehe, tiefe, x, hoehe / 2, z, farbe);
  S.box(breite + .6, 1.1, tiefe + .6, x, hoehe + .55, z, '#737e83');
  const geschosshoehe = (hoehe - 6) / geschosse;
  for (let e = 0; e < geschosse; e++) {
    const y = 4.8 + geschosshoehe * e;
    for (let i = 0; i < Math.min(9, Math.floor(breite / 3.5)); i++) {
      const u = x - breite / 2 + 2.3 + i * (breite - 4.6) / Math.max(1, Math.min(9, Math.floor(breite / 3.5)) - 1);
      S.box(1.65, 1.55, .17, u, y, z + tiefe / 2 + .1, fenster);
    }
    for (let i = 0; i < Math.min(6, Math.floor(tiefe / 4)); i++) {
      const u = z - tiefe / 2 + 2.2 + i * (tiefe - 4.4) / Math.max(1, Math.min(6, Math.floor(tiefe / 4)) - 1);
      S.box(.17, 1.55, 1.5, x + breite / 2 + .1, y, u, fenster);
    }
  }
}
function rathaus(S, [x, z]) {
  // Charakteristischer Essener Verwaltungsturm (106 m) mit gestuftem Sockel.
  S.box(79, 8, 62, x, 4, z, '#c2c6c5');
  S.box(48, 8, 43, x + 4, 12, z - 7, '#a3b2b7');
  turm(S, x + 12, z - 11, 32, 31, 106, '#a9b9be', '#536f7b', 24);
  S.box(34, 3, 33, x + 12, 106.8, z - 11, '#707e86');
  for (let i = 0; i < 4; i++) S.box(28, .4, .7, x + 10, 27 + i * 23, z + 4.8, '#d4dcda');
}
function hbf(S, [x, z]) {
  // Front zur Innenstadt im Norden; Gleisharfe liegt unmittelbar dahinter.
  S.box(106, 11, 35, x, 5.5, z + 19, '#d8d4cd');
  S.box(108, 1.5, 38, x, 11.8, z + 18, '#71787a');
  S.box(69, 8, 7, x, 5, z + 38, '#5b7580');
  S.box(56, 3.3, 1, x, 7.8, z + 41.5, '#91bcc2');
  for (let i = 0; i < 12; i++) {
    const xx = x - 49 + i * 9;
    S.box(3.8, 4.5, .25, xx, 4.6, z + 36.9, '#52727d');
    S.box(.35, 3.7, .6, xx + 4, 4.8, z + 37, '#e4e5df');
  }
  // Breite Dachhalle folgt der Bahnsteigebene, kein künstlich verlängertes Gleis.
  for (let i = 0; i < 4; i++) {
    S.box(150, .55, 16, x + 38, 7.9, z + 58 + i * 20, '#d4dad6');
    for (let j = 0; j < 9; j++) S.box(.35, 7.5, .35, x - 34 + j * 18, 4, z + 49 + i * 20, '#777f83');
  }
}
function kirche(S, [x, z], gross = true) {
  const b = gross ? 28 : 20, d = gross ? 47 : 31, h = gross ? 24 : 18;
  S.box(b, h, d, x, h / 2, z, '#c6aa89');
  S.box(b + 3, 2.2, d + 3, x, h + .8, z, '#665b55');
  const xs = gross ? [-11, 11] : [0];
  for (const dx of xs) {
    const H = gross ? 51 : 36;
    S.box(10, H, 11, x + dx, H / 2, z - d / 2 + 3, '#bca185');
    S.box(11, 2, 12, x + dx, H + .3, z - d / 2 + 3, '#716c65');
    S.box(2, 7, 2, x + dx, H + 4, z - d / 2 + 3, '#76756e');
  }
  for (let i = 0; i < 5; i++) S.box(.2, 5, 2.5, x + b / 2 + .2, 8 + i * 3.1, z - 17 + i * 8, '#586d74');
}
function limbecker(S, [x, z]) {
  // Flächiger, gerundeter Einkaufskomplex mit heller, geschwungener Front.
  S.box(133, 19, 173, x, 9.5, z, '#d3d7d0');
  S.box(128, 1.2, 166, x, 20, z, '#858b85');
  for (let i = 0; i < 9; i++) {
    const a = -.85 + i * .21;
    S.box(8, 12, 31, x + Math.sin(a) * 67, 8, z + Math.cos(a) * 73, '#e3dfce', -a);
    S.box(7.2, 3.5, .3, x + Math.sin(a) * 71, 7, z + Math.cos(a) * 88, '#6c9297', -a);
  }
  S.box(31, 6.5, 2, x + 8, 5.5, z + 88, '#557884');
  for (let i = 0; i < 5; i++) S.box(1, 10, 1, x - 60 + i * 32, 25, z + 15, '#c2c5bc');
}
function buergerBau(S, [x, z], farbe) {
  S.box(34, 15, 25, x, 7.5, z, farbe);
  S.box(36, 1, 27, x, 15.8, z, '#666e70');
  for (let k = 0; k < 4; k++) for (let i = 0; i < 5; i++)
    S.box(2.4, 2.2, .25, x - 12 + i * 6, 3.8 + k * 3.1, z + 12.7, '#64808c');
}
function ketttwiger(S, k) {
  const r = rng(786231);
  let n = 0;
  for (const s of k.strassen) {
    if (s.klasse !== 'fuss' || !/Kettwiger Straße/i.test(s.name ?? '')) continue;
    for (let i = 1; i < s.punkte.length; i++) {
      const a = s.punkte[i - 1], b = s.punkte[i];
      const len = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (len < 8 || n > 40) continue;
      const anzahl = Math.min(3, Math.floor(len / 18));
      for (let q = 0; q < anzahl; q++) {
        const t = (q + .5) / anzahl, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        // Fußgängerzone: Leuchten, Pflanzkübel, Bänke mit unregelmäßiger Folge.
        const seite = (n % 2 ? -1 : 1) * 3.8, xx = x + seite;
        S.box(2.5, .65, 1.7, xx, .5, z, '#a6a39b');
        if (n % 3 === 0) {
          S.box(.27, 5.4, .27, xx + 1.5, 2.85, z, '#5b6669');
          S.box(1.6, .34, .65, xx + 1.5, 5.5, z, '#d4c9a7');
        } else {
          S.box(1.8, 1.1, 1.8, xx, .8, z, '#c6bca8');
          S.box(1.35, 1.5 + r() * .6, 1.35, xx, 2.1, z, FARBEN.baum[n % 3]);
        }
        n++;
      }
    }
  }
}
export function wahrzeichenEssen(S, scene, karte) {
  const r = fall(karte, 'essen-rathaus'), h = fall(karte, 'essen-hbf'), m = fall(karte, 'essen-muenster');
  const l = fall(karte, 'essen-limbecker'), markt = fall(karte, 'essen-marktkirche');
  if (r) rathaus(S, r);
  if (h) hbf(S, h);
  if (m) kirche(S, m, true);
  if (markt) kirche(S, markt, false);
  if (l) limbecker(S, l);
  for (const [id, farbe] of [['essen-grillo', '#d0bba3'], ['essen-synagoge', '#c19a80']]) {
    const p = fall(karte, id); if (p) buergerBau(S, p, farbe);
  }
  ketttwiger(S, karte);
  void scene;
}
