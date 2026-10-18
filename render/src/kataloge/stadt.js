// Katalog Stadtgerüst: Straßentypen, Kreuzungen, Sonderflächen, Props, Marker, Parzellierung.
import { THREE, rng, sockel, FARBEN } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { rasterPlan, baueStadt, platzhalterBauer, parzellenBauer, Instanzer, auto, baumSetzen, figur, kartenMarker, zuVermieten, brunnen, YG } from '../kit/stadt.js';

const box = (x0, z0, x1, z1, h = 12) => new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, h, z1));
const N = (n) => Array(n).fill('neben');

/** Kleiner Rasterplan, Ausschnitt per Funktion (plan, erg) → Box3. */
// flache Randbebauung, damit der Straßenraum frei sichtbar bleibt
const niedrig = { stadthaus: (S, sc, p) => platzhalterBauer.stadthaus(S, sc, { ...p, geschosse: 1, stil: 'nachkrieg' }), eck: (S, sc, p) => platzhalterBauer.stadthaus(S, sc, { ...p, geschosse: 1, stil: 'nachkrieg' }) };
function mini(titel, unter, seed, cfg, ausschnitt, bauer = platzhalterBauer) {
  return {
    titel, unter,
    bau(S, scene) {
      const plan = rasterPlan(seed, { typ: 'grossstadt', ...cfg });
      const e = baueStadt(S, scene, plan, bauer);
      this.unter = `${unter} · ${e.teileStrasse} Teile, ${e.instanzen} Inst.`;
      return ausschnitt(plan, e);
    },
  };
}
const umSegZ = (k, h = 6) => (plan) => { const L = plan.zLinien[k], m = plan.reihen.z[0] + plan.reihen.d[0] / 2; return box(L.x - 20, m - 22, L.x + 20, m + 22, h); };
const umKreuzung = (k, l, r = 30) => (plan) => { const x = plan.zLinien[k].x, z = plan.xLinien[l].z; return box(x - r, z - r, x + r, z + r, 10); };
const umBlock = (n, rand = 6, h = 16) => (plan) => { const b = plan.bloecke[n]; return box(b.x - rand, b.z - rand, b.x + b.w + rand, b.z + b.d + rand, h); };

const eintraege = [
  mini('Hauptstraße mit Straßenbahn', '24 m, Rasengleis, Oberleitung', 3, { spalten: [40, 40], reihen: [80], zLinien: ['neben', 'haupt', 'neben'], xLinien: N(2), tram: ['z1'] }, umSegZ(1), niedrig),
  mini('Hauptstraße als Allee', '24 m, Mittelstreifen mit Bäumen', 4, { spalten: [40, 40], reihen: [80], zLinien: ['neben', 'haupt', 'neben'], xLinien: N(2) }, umSegZ(1), niedrig),
  mini('Nebenstraße', '14 m, Parkstreifen', 5, { spalten: [40, 40], reihen: [80], zLinien: N(3), xLinien: N(2) }, umSegZ(1), niedrig),
  mini('Gasse', '12 m, Altstadt', 6, { typ: 'mittelstadt', spalten: [40, 40], reihen: [80], zLinien: ['neben', 'gasse', 'neben'], xLinien: N(2) }, umSegZ(1), niedrig),
  mini('Fußgängerzone', '12 m, Pflaster, Möblierung', 7, { spalten: [40, 40], reihen: [80], zLinien: ['neben', 'fz', 'neben'], xLinien: N(2), fz: ['z1:0'] }, umSegZ(1), niedrig),
  mini('Kreuzung Haupt × Haupt', 'Ampeln, Zebrastreifen, Gleise', 8, { spalten: [40, 40], reihen: [40, 40], zLinien: ['neben', 'haupt', 'neben'], xLinien: ['neben', 'haupt', 'neben'], tram: ['z1'] }, umKreuzung(1, 1, 34), niedrig),
  mini('Kreuzung Neben × Neben', 'Zebrastreifen, Haltelinien', 9, { spalten: [40, 40], reihen: [40, 40], zLinien: N(3), xLinien: N(3) }, umKreuzung(1, 1, 26), niedrig),
  mini('Marktplatz', 'Brunnen, Stände, Rathaus-Slot', 10, { spalten: [64, 30], reihen: [56], zLinien: N(3), xLinien: N(2), flaechen: [{ art: 'markt', i0: 0, i1: 0, j0: 0, j1: 0 }] }, umBlock(0, 8, 22)),
  mini('Kirchplatz', 'Kirchen-Slot, Bäume', 11, { spalten: [64, 30], reihen: [60], zLinien: N(3), xLinien: N(2), flaechen: [{ art: 'kirche', i0: 0, i1: 0, j0: 0, j1: 0 }] }, umBlock(0, 8, 30)),
  mini('Park', 'Wege, Teich, Spielplatz', 12, { spalten: [96], reihen: [84], zLinien: N(2), xLinien: N(2), flaechen: [{ art: 'park', i0: 0, i1: 0, j0: 0, j1: 0 }] }, umBlock(0, 6, 10)),
  mini('Kanal mit Brücken', '32 m, Ufermauer, Geländer', 13, { spalten: [36, 32, 36], reihen: [44, 44], zLinien: N(4), xLinien: N(3), bruecken: 'alle', flaechen: [{ art: 'wasser', form: 'kanal', i0: 1, i1: 1, j0: 0, j1: 1 }] },
    (plan) => { const z = plan.xLinien[1].z, x = plan.spalten.x[1] + 16; return box(x - 34, z - 34, x + 34, z + 34, 8); }),
  mini('Fluss mit Hauptstraßenbrücke', '66 m, Ausflugsschiffe', 14, { spalten: [36, 66, 36], reihen: [50, 50], zLinien: N(4), xLinien: ['neben', 'haupt', 'neben'], flaechen: [{ art: 'wasser', form: 'fluss', i0: 1, i1: 1, j0: 0, j1: 1 }] },
    (plan) => { const z = plan.xLinien[1].z, x = plan.spalten.x[1] + 33; return box(x - 46, z - 46, x + 46, z + 46, 8); }),
  mini('Bahngelände', 'Gleise, Bahnsteige, Bahnhof-Slot', 15, { spalten: [80, 80], reihen: [64], zLinien: N(3), xLinien: N(2), flaechen: [{ art: 'bahn', i0: 0, i1: 1, j0: 0, j1: 0 }] }, umBlock(0, 4, 30)),
  mini('Parzellierung (Daten)', 'rot Warenhaus, braun Ecke, grün Sonder', 16, { spalten: [92, 70], reihen: [72, 64], zLinien: N(3), xLinien: N(3), warenhaus: { i: 0, j: 0, W: 62, D: 44 }, hochhaus: 6 },
    (plan) => box(0, 0, plan.breite, plan.tiefe, 8), parzellenBauer),
  mini('Blockrand mit Platzhaltern', 'gleicher Plan, Platzhalter-Bauer', 16, { spalten: [92, 70], reihen: [72, 64], zLinien: N(3), xLinien: N(3), warenhaus: { i: 0, j: 0, W: 62, D: 44 }, hochhaus: 6 },
    (plan) => box(0, 0, plan.breite, plan.tiefe, 20)),
  mini('Blockrand Altstadt', 'Fachwerk, schmale Parzellen', 17, { typ: 'mittelstadt', spalten: [54, 48], reihen: [50], zLinien: ['neben', 'gasse', 'neben'], xLinien: N(2), kern: { i: 0.5, j: 0 } },
    (plan) => box(0, 0, plan.breite, plan.tiefe, 16)),
  {
    titel: 'Autos', unter: 'Kleinwagen, Limousine, Kombi, Lieferwagen, Taxi, Bus, Straßenbahn',
    bau(S, scene) {
      const I = new Instanzer(), r = rng(3);
      S.box(46, 0.2, 26, 0, -0.1, 0, FARBEN.asphalt);
      const typen = ['kleinwagen', 'limousine', 'kombi', 'lieferwagen', 'taxi'];
      typen.forEach((t, i) => { auto(I, -16 + i * 7.5, 0, 8, -Math.PI / 2, r, t); auto(I, -16 + i * 7.5, 0, 2, -Math.PI / 2, r, t); });
      I.setze('bus', -8, 0, -4, 0, 1, ['#f1c232']);
      I.setze('strassenbahn', 4, 0, -9.5, 0, 1, ['#c8322b']);
      I.bauen(scene);
      return box(-22, -12, 22, 12, 4);
    },
  },
  {
    titel: 'Bäume', unter: 'Linde, Kastanie, Platane, Pappel, Nadelbaum, Kugelbaum, Busch',
    bau(S, scene) {
      const I = new Instanzer(), r = rng(4);
      sockel(S, -18, -4, 36, 8, 2);
      ['linde', 'kastanie', 'platane', 'pappel', 'nadel', 'kugel', 'busch'].forEach((a, i) => baumSetzen(I, a, -16 + i * 5.4, 0.3, 0, r, 0.8, a !== 'busch'));
      I.bauen(scene);
      return box(-20, -6, 20, 6, 9);
    },
  },
  {
    titel: 'Licht, Signale, Masten', unter: 'Laternen, Ampeln, Oberleitungsmast',
    bau(S, scene) {
      const I = new Instanzer();
      sockel(S, -14, -4, 28, 8, 2);
      [['laterne', 0], ['doppellaterne', 0], ['altlaterne', 0], ['ampel', 0], ['ampelausleger', 0], ['olmast', Math.PI / 2]].forEach(([a, ry], i) => I.setze(a, -9 + i * 3.4, 0.3, a === 'ampelausleger' ? -2 : 0, ry));
      I.bauen(scene);
      return box(-10, -4, 10, 4, 8);
    },
  },
  {
    titel: 'Stadtmöbel', unter: 'Bank, Poller, Litfaßsäule, Fahrräder, Haltestelle, Marktstand, Brunnen',
    bau(S, scene) {
      const I = new Instanzer(), r = rng(5);
      sockel(S, -14, -8, 28, 16, 2);
      I.setze('bank', -11, YG, 4, 0); I.setze('poller', -8, YG, 4, 0); I.setze('poller', -7, YG, 4, 0);
      I.setze('litfass', -4, YG, 4, 0, 1, ['#e0b23c', '#d04a3f', '#2f63b5']);
      I.setze('muelleimer', -1.5, YG, 4, 0); I.setze('fahrradstaender', 2.5, YG, 4, 0, 1, ['#d04a3f', '#2f63b5', '#5b8f5a']);
      I.setze('kuebel', 7, YG, 4, 0, 1, ['#d96a8a']); I.setze('schirm', 10.5, YG, 4, 0, 1, ['#3f7d56']);
      I.setze('haltestelle', -8, YG, -4, 0);
      I.setze('marktstand', -1.5, YG, -4, 0, 1, ['#c9483e', '#e0b23c']); I.setze('marktstand', 2, YG, -4, 0, 1, ['#2f6f8f', '#7cb369']);
      brunnen(S, 9, -3.5, YG, 0.7);
      for (let i = 0; i < 6; i++) figur(I, zw(r, -12, 12), YG, zw(r, -7, 7), r);
      I.bauen(scene);
      return box(-15, -9, 15, 9, 5);
    },
  },
  {
    titel: 'Fußgänger', unter: 'stehend, gehend, mit Tasche (je Teil eigene Farbe)',
    bau(S, scene) {
      const I = new Instanzer(), r = rng(6);
      sockel(S, -5, -3, 10, 6, 1);
      for (let i = 0; i < 14; i++) figur(I, -4.5 + (i % 7) * 1.5, YG, i < 7 ? 1.4 : -1.4, r, Math.PI / 4 + (i % 3) * 0.3);
      I.bauen(scene);
      return box(-6, -3, 6, 3, 2.4);
    },
  },
  {
    titel: 'Kartenmarker', unter: 'Hartwig, Hartwig Sport, Wettbewerber, Bank, „Zu vermieten“',
    bau(S, scene) {
      sockel(S, -24, -6, 48, 12, 2);
      for (let i = 0; i < 5; i++) S.quader(-22 + i * 9.5, 0, -4, -15 + i * 9.5, 8 + (i % 3) * 3, 4, ['#efe6d6', '#dde1e4', '#e3d3bd'][i % 3]);
      ['hartwig', 'hartwigSport', 'wettbewerber', 'bank'].forEach((a, i) => kartenMarker(scene, { x: -18.5 + i * 9.5, z: 0, hoehe: 8 + (i % 3) * 3 }, a, { groesse: 9 }));
      zuVermieten(scene, 19.5, 14, 0, 8);
      return box(-24, -6, 24, 6, 26);
    },
  },
];
function zw(r, a, b) { return a + (b - a) * r(); }

window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Stadtgerüst: Straßenraum, Flächen, Props', spalten: 4, kachel: [560, 560] }), 20));
