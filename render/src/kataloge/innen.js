import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import {
  raumKachel, vorbereiten, rueckwand, boden, rolltreppenKern, aufzug, treppenhaus, lager, kassentresen, infoCounter,
  stuetze, haengeschild, figur, abteilungsname, WANDHOEHE,
} from '../kit/innen.js';

const HG = '#26313a';
const kachel = (titel, gruppe, o = {}) => ({
  titel, hintergrund: HG,
  bau(S, scene) {
    const box = raumKachel(S, scene, gruppe, o);
    this.unter = `${o.unter ?? gruppe} · ${S.anzahl} Teile (2×2 Zellen)`;
    return box;
  },
});

const eintraege = [
  kachel('Damenmode', 'damen', { seed: 3 }),
  kachel('Herrenmode', 'herren', { seed: 4 }),
  kachel('Kindermode', 'kinder', { seed: 5 }),
  kachel('Wäsche & Dessous', 'waesche', { seed: 6 }),
  kachel('Beauty & Parfümerie', 'beauty', { seed: 7 }),
  kachel('Schuhe & Accessoires', 'accessoires', { seed: 8 }),
  kachel('Wohnen & Haushalt', 'wohnen', { seed: 9 }),
  kachel('Spielwaren', 'spielwaren', { seed: 10 }),
  kachel('Feinkost', 'food', { seed: 11 }),
  kachel('Sport (Warenhaus)', 'sport', { seed: 12 }),
  kachel('Sportschuhe', 'sportschuhe', { seed: 13 }),
  kachel('Sportbekleidung', 'sporttextil', { seed: 14 }),
  kachel('Outdoor', 'outdoor', { seed: 15 }),
  kachel('Fahrrad', 'rad', { seed: 16 }),
  kachel('Wintersport', 'wintersport', { seed: 17 }),
  kachel('Teamsport', 'teamsport', { seed: 18 }),
  kachel('Offprice – Rote Preise', 'offprice', { seed: 19, basis: 'damen', unter: 'offprice' }),
  kachel('Konzession – Shop-in-Shop', 'konzession', { seed: 0, unter: 'konzession (Lindqvist, Damen)' }),
  kachel('Konzession – Wohnen', 'konzession', { seed: 1, unter: 'konzession (Casa Orvieto)' }),
  kachel('Untermiete – Discounter', 'untermiete', { seed: 20, mieter: 'discounter', kunden: 6, unter: 'untermiete discounter' }),
  kachel('Untermiete – Fitness', 'untermiete', { seed: 21, mieter: 'fitness', kunden: 3, unter: 'untermiete fitness' }),
  kachel('Untermiete – Arztpraxis', 'untermiete', { seed: 22, mieter: 'arzt', kunden: 2, unter: 'untermiete arzt' }),
  kachel('Untermiete – Gastro', 'untermiete', { seed: 23, mieter: 'gastro', kunden: 3, unter: 'untermiete gastro' }),
  kachel('Leerstand', 'leer', { seed: 24 }),
  kachel('Umbau', 'umbau', { seed: 25 }),
  {
    titel: 'Rolltreppenkern', hintergrund: HG,
    bau(S, scene) {
      vorbereiten(S, scene);
      S.box(10.6, 0.5, 10.6, 4.7, -0.25, 4.7, '#3a434b');
      rolltreppenKern(S, 0, 0, {});
      rueckwand(S, 'x', 0, 10, 0); rueckwand(S, 'z', 0, 10, 0);
      for (let k = 0; k < 6; k++) figur(S, 1 + (k % 3) * 3.5, 4.3 + (k > 2 ? 5.2 : 0), k + 1, 'kunde');
      this.unter = `paarweise auf + ab mit Luftraum · ${S.anzahl} Teile`;
      return new THREE.Box3(new THREE.Vector3(-0.6, -2, -0.6), new THREE.Vector3(10, WANDHOEHE, 10));
    },
  },
  {
    titel: 'Treppenhaus und Aufzug', hintergrund: HG,
    bau(S, scene) {
      vorbereiten(S, scene);
      S.box(10.6, 0.5, 10.6, 4.7, -0.25, 4.7, '#3a434b');
      boden(S, 0, 0, 10, 10, 0, 'gang');
      treppenhaus(S, 0, 0, 5, 10);
      aufzug(S, 6.2, 0.4);
      rueckwand(S, 'x', 0, 10, 0); rueckwand(S, 'z', 0, 10, 0);
      figur(S, 7.5, 4.0, 3, 'kunde', { ry: Math.PI }); figur(S, 8.5, 6.5, 4, 'kunde'); figur(S, 6.5, 8.0, 5, 'security');
      this.unter = `Notausgang, Edelstahltüren · ${S.anzahl} Teile`;
      return new THREE.Box3(new THREE.Vector3(-0.6, 0, -0.6), new THREE.Vector3(10, WANDHOEHE, 10));
    },
  },
  {
    titel: 'Kasse, Info, Stützen', hintergrund: HG,
    bau(S, scene) {
      vorbereiten(S, scene);
      S.box(10.6, 0.5, 10.6, 4.7, -0.25, 4.7, '#3a434b');
      boden(S, 0, 0, 10, 10, 0, 'gang');
      kassentresen(S, 3.0, 2.6, 3);
      infoCounter(S, 6.8, 6.8, 4);
      stuetze(S, 5, 5); stuetze(S, 10, 10); stuetze(S, 0.35, 5); stuetze(S, 10, 0.35);
      rueckwand(S, 'x', 0, 10, 0); rueckwand(S, 'z', 0, 10, 0);
      haengeschild(S, scene, 'Kasse', 3.0, 3.7, 1.3, { farbe: '#d23c32' });
      figur(S, 2.0, 7.5, 9, 'leitung'); figur(S, 8.5, 3.0, 10, 'kunde');
      this.unter = `Kassentresen mit Schlange · ${S.anzahl} Teile`;
      return new THREE.Box3(new THREE.Vector3(-0.6, 0, -0.6), new THREE.Vector3(10, WANDHOEHE, 10));
    },
  },
  {
    titel: 'Lager an der Rückwand', hintergrund: HG,
    bau(S, scene) {
      vorbereiten(S, scene);
      S.box(10.6, 0.5, 10.6, 4.7, -0.25, 4.7, '#3a434b');
      lager(S, 0, 0, 10, 5, 0, 5);
      boden(S, 0, 5, 10, 5, 0, 'gang');
      rueckwand(S, 'x', 0, 10, 0); rueckwand(S, 'z', 0, 10, 0);
      figur(S, 3, 2.5, 11, 'lager'); figur(S, 7, 7.5, 12, 'lager', { pose: 'tragen' });
      this.unter = `Regale, Kartons, Hubwagen · ${S.anzahl} Teile`;
      return new THREE.Box3(new THREE.Vector3(-0.6, 0, -0.6), new THREE.Vector3(10, WANDHOEHE, 10));
    },
  },
  {
    titel: 'Hängeschilder', hintergrund: HG,
    bau(S, scene) {
      vorbereiten(S, scene);
      S.box(10.6, 0.5, 10.6, 4.7, -0.25, 4.7, '#3a434b');
      boden(S, 0, 0, 10, 10, 0, 'gang');
      rueckwand(S, 'x', 0, 10, 0); rueckwand(S, 'z', 0, 10, 0);
      ['waesche', 'beauty', 'accessoires', 'wohnen', 'spielwaren'].forEach((g, i) => haengeschild(S, scene, abteilungsname(g), 4.2 + (i % 2) * 1.2, 4.0, 1.2 + i * 1.9, { hoehe: 0.6 }));
      haengeschild(S, scene, 'Rote Preise', 8.4, 2.6, 8.8, { farbe: '#ffd400', schrift: '#d4212a', hoehe: 0.6 });
      this.unter = 'Deutsch, echte Umlaute';
      return new THREE.Box3(new THREE.Vector3(-0.6, 0, -0.6), new THREE.Vector3(10, WANDHOEHE, 10));
    },
  },
  {
    titel: 'Figuren: Kundschaft', hintergrund: HG, rand: 1.02,
    bau(S, scene) {
      vorbereiten(S, scene);
      S.box(10.6, 0.5, 6.6, 4.7, -0.25, 2.7, '#3a434b');
      boden(S, 0, 0, 10, 6, 0, 'gang');
      const posen = ['stehen', 'gehen', 'tasche', 'schauen', 'telefon', 'tragen'];
      let k = 0;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++, k++) figur(S, 0.8 + i * 1.35, 0.9 + j * 2.0, 100 + k, k % 7 === 6 ? 'kind' : 'kunde', { ry: 0.5, pose: posen[k % posen.length] });
      const n0 = S.anzahl;
      figur(S, 0, 0, 1, 'kunde', { y: -50 });
      this.unter = `stehen, gehen, Tasche, schauen, telefonieren, tragen, Kind · ${S.anzahl - n0} Teile je Figur`;
      return new THREE.Box3(new THREE.Vector3(-0.6, 0, -0.6), new THREE.Vector3(10, 2, 6));
    },
  },
  {
    titel: 'Figuren: Personal und Rollen', hintergrund: HG, rand: 1.02,
    bau(S, scene) {
      vorbereiten(S, scene);
      S.box(10.6, 0.5, 6.6, 4.7, -0.25, 2.7, '#3a434b');
      boden(S, 0, 0, 10, 6, 0, 'gang');
      const rollen = ['verkauf', 'kasse', 'info', 'leitung', 'beauty', 'theke', 'lager', 'security', 'handwerker', 'arzt', 'fitness', 'kunde'];
      rollen.forEach((ro, i) => figur(S, 0.9 + (i % 6) * 1.6, 1.4 + Math.floor(i / 6) * 2.6, 200 + i, ro, { ry: 0.6, pose: 'stehen' }));
      this.unter = 'Hartwig-Uniform, Namensschild-Farbe je Rolle';
      return new THREE.Box3(new THREE.Vector3(-0.6, 0, -0.6), new THREE.Vector3(10, 2, 6));
    },
  },
];

zeigeKatalog(eintraege, { titel: 'Innenausstattung – 5-m-Raster', spalten: 4, kachel: [520, 520] });
