// N06: Deterministische Daten, passive Darstellung, Umschalten ohne Neubau.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const THREE = require('three');
const ausgabe = path.join(__dirname, '..', 'out', '.jahreszeiten-tests.cjs');
fs.mkdirSync(path.dirname(ausgabe), { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '..', 'src', 'kit', 'jahreszeit.js')],
  bundle: true, platform: 'node', format: 'cjs', outfile: ausgabe, logLevel: 'silent',
});
const { jahreszeit, jahreszeitenStadt } = require(ausgabe);
const spiel = (kw, seed = 19, zusatz = {}) => ({ woche: kw - 1, seed, startJahr: 2026, marketing: { aktionen: [] }, ...zusatz });
for (const [kw, erwartet] of [
  [1, 'winter'], [9, 'winter'], [10, 'fruehling'], [22, 'fruehling'],
  [23, 'sommer'], [35, 'sommer'], [36, 'herbst'], [48, 'herbst'],
  [49, 'winter'], [52, 'winter'],
]) assert.equal(jahreszeit(spiel(kw)).name, erwartet, 'KW ' + kw);
assert.equal(jahreszeit(spiel(47)).anlaesse.has('weihnachten'), true);
assert.equal(jahreszeit(spiel(46)).anlaesse.has('weihnachten'), false);
const laufend = { name: 'Winterschlussverkauf', anlass: 'wsv', start: 0, ende: 2 };
assert.equal(jahreszeit(spiel(1, 1, { marketing: { aktionen: [laufend] } })).anlaesse.has('wsv'), true);
assert.equal(jahreszeit(spiel(3, 1, { marketing: { aktionen: [laufend] } })).anlaesse.has('wsv'), false);
const unveraendert = spiel(13, 3);
const vor = JSON.stringify(unveraendert);
jahreszeit(unveraendert);
assert.equal(JSON.stringify(unveraendert), vor, 'saisonale Abfrage bleibt rein');
let schnee = 0;
for (let seed = 0; seed < 1000; seed++) {
  const a = jahreszeit(spiel(4, seed));
  assert.equal(a.schnee, jahreszeit(spiel(4, seed)).schnee, 'Schnee muss deterministisch sein');
  if (a.schnee) schnee++;
  assert.equal(jahreszeit(spiel(8, seed)).schnee, false, 'Außerhalb KW 2–7 kein Schnee');
}
assert.ok(schnee >= 350 && schnee <= 450, 'Schneewahrscheinlichkeit ~40 %: ' + schnee + '/1000');

// Bestehende Instanzen werden nur umgefärbt/ein- und ausgeblendet.
// Die Testszene hat absichtlich keinen Stadtplan und keine Engine.
const scene = new THREE.Scene();
const laub = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 'white' }), 5);
laub.userData.jahreszeitArt = 'linde';
laub.userData.jahreszeitSlot = 0;
for (let i = 0; i < 5; i++) {
  laub.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 4, 0, 0));
  laub.setColorAt(i, new THREE.Color('#69a651'));
}
const figur = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 'white' }), 3);
figur.userData.jahreszeitArt = 'figurGehend';
figur.userData.jahreszeitSlot = 0;
for (let i = 0; i < 3; i++) {
  figur.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 4, 0, 0));
  figur.setColorAt(i, new THREE.Color('#2f63b5'));
}
scene.add(laub, figur);
const ausgangLaub = Array.from(laub.instanceColor.array);
const ausgangFigur = Array.from(figur.instanceColor.array);
const plan = { seed: 21, strassen: [], parzellen: [], bloecke: [] };
const darstellung = jahreszeitenStadt(scene, plan, new Map(), spiel(13));
assert.equal(laub.visible, true);
assert.notDeepEqual(Array.from(laub.instanceColor.array), ausgangLaub, 'Frühling färbt Laub');
darstellung.aktualisiere(spiel(27));
assert.notDeepEqual(Array.from(figur.instanceColor.array), ausgangFigur, 'Sommer hellt Kleidung auf');
darstellung.aktualisiere(spiel(3));
assert.equal(laub.visible, false, 'Winter zeigt kahle Äste statt Laub');
darstellung.aktualisiere(spiel(3), false);
assert.equal(laub.visible, true, 'Feature aus: Laub wieder sichtbar');
assert.deepEqual(Array.from(laub.instanceColor.array), ausgangLaub, 'Feature aus: Originalfarben Laub');
assert.deepEqual(Array.from(figur.instanceColor.array), ausgangFigur, 'Feature aus: Originalfarben Figuren');
darstellung.aufraeumen();
assert.equal(scene.children.length, 2, 'Saison-Gruppen rückstandsfrei entfernt');
// Q09: Schnee ist an die echten Dreiecksflächen gebunden und niemals ein
// Rechteck auf der pauschalen Gebäudehöhe. Ohne Browser/Rendering überprüfbar.
const dach1 = [[0, 12, 0], [0, 12, 10], [10, 12, 0]];
const dach2 = [[20, 15, 0], [20, 18, 10], [30, 15, 0]];
const kachelDach = [[40, 9, 0], [40, 9, 10], [50, 9, 0]];
const dachSzene = new THREE.Scene();
const winterDach = jahreszeitenStadt(dachSzene, plan, new Map(), spiel(3), true, [dach1, dach2]);
const dachGruppe = dachSzene.getObjectByName('Jahreszeiten');
const dachMesh = () => dachGruppe.getObjectByName('Schnee auf Dachflächen');
assert.equal(dachMesh().geometry.attributes.position.count, 6, 'ein Dreieck je echte Dachfläche');
function pruefeDachabstand(dach, ersteEcke) {
  const g = dachMesh().geometry.attributes.position;
  const [a, b, c] = dach;
  const u = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const v = new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
  const normale = u.cross(v).normalize();
  for (let i = ersteEcke; i < ersteEcke + 3; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(g, i);
    const abstand = p.clone().sub(new THREE.Vector3(...a)).dot(normale);
    assert.ok(abstand > 0.055 && abstand < 0.075, 'Schnee maximal 0,075 m über der Dachneigung: ' + abstand);
  }
}
pruefeDachabstand(dach1, 0);
pruefeDachabstand(dach2, 3);
winterDach.registriereDachflaechen('k1', [kachelDach]);
assert.equal(dachMesh().geometry.attributes.position.count, 9, 'Kacheldach ergänzt, ein Mesh/Draw Call');
winterDach.registriereDachflaechen('k1', []);
assert.equal(dachMesh().geometry.attributes.position.count, 6, 'Kacheltausch entfernt altes Dach statt es zu duplizieren');
winterDach.aufraeumen();
assert.equal(dachSzene.children.length, 0, 'keine zurückbleibenden Schneemeshes');
console.log('Jahreszeiten: KW-Grenzen, Aktionskalender, 40 % Schnee, deterministische Grafik, Schalter und Farben und dachgebundenen Schnee OK');
