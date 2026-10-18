// Katalog: jede Wettbewerber-Art in drei Größen (Slots 24×22, 46×36, 78×58) mit je eigenem Namen/Seed.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { wettbewerber, ARTEN, NAMEN } from '../kit/wettbewerber.js';

const GROESSEN = [[24, 22], [46, 36], [78, 58]];
const REGIONEN = ['nord', 'sued', 'ost'];
let letzteSonne = null;
const eintraege = [];
// Bauform je Art und Größe verschieden (klein immer Block, da Kopfturm und Vorbau erst ab 30 m Breite gehen),
// Seeds je Art verschieden. Die Rotunde (Bauform 2) baut wettbewerber() nur bei passendem Seed, daher Seed dafür suchen.
const FORM_MITTEL_GROSS = [1, 4, 3, 2, 4, 1, 2, 3, 1, 3, 4, 2, 3, 1];
const rotundeErlaubt = (seed) => (Math.imul(seed >>> 0, 2654435761) >>> 0) % 4 === 0;
const seedVon = (a, i, form) => { let s = 11 + i * 7 + a * 31; if (form === 2) while (!rotundeErlaubt(s)) s++; return s; };
for (const [a, art] of ARTEN.entries()) GROESSEN.forEach(([w, d], i) => eintraege.push({
  titel: art,
  bau(S, scene) {
    if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
    letzteSonne = scene.userData.sonne;
    const form = i === 0 ? 0 : FORM_MITTEL_GROSS[a * 2 + i - 1];
    const erg = wettbewerber(S, scene, { x: 0, z: 0, w, d, seed: seedVon(a, i, form), form, art, name: NAMEN[art][i], region: REGIONEN[i] });
    sockel(S, 0, 0, w, d, 4);
    this.titel = `${erg.name} · ${art}`;
    this.unter = `${REGIONEN[i]} · Bauform ${erg.form} · Slot ${w}×${d} · ${erg.teile} Teile · Höhe ${erg.hoehe.toFixed(1)} m`;
    return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(w + 4, erg.hoehe, d + 4));
  },
}));
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Wettbewerber: alle Arten in drei Größen', spalten: 3, kachel: [620, 520] }), 50);
