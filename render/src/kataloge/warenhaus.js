// Katalog: alle Fassadenfamilien × Größen/Varianten der Hartwig-Häuser plus jedes Status-Overlay.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus, FAMILIEN } from '../kit/warenhaus.js';

const EGW = ['beauty', 'accessoires', 'damen', 'food'], EGS = ['sporttextil', 'sportschuhe', 'rad', 'outdoor'];
function haus(id, baujahr, etagen, qm, fassade, extra = {}) {
  const format = extra.format ?? 'warenhaus';
  const gr = format === 'sport' ? EGS : EGW;
  const flaechen = gr.map((g, i) => ({ etage: 0, qm: 400 - i * 50, konzept: 'eigen', gruppe: g }));
  for (let e = 1; e < etagen; e++) flaechen.push({ etage: e, qm: 800, konzept: 'eigen', gruppe: 'damen' });
  return { id, name: id, format, lage: '1a', grundflaecheQm: qm, etagen: [-1, ...Array.from({ length: etagen }, (_, i) => i)], baujahr, fassade, substanz: 70, status: 'offen', flaechen, ...extra };
}
const liste = [
  [haus('K1a', 1905, 4, 4800, 0)], [haus('K1b', 1898, 6, 6000, 1)], [haus('K1c', 1912, 3, 2800, 3)], [haus('K1d', 1910, 2, 1800, 6)],
  [haus('K2a', 1928, 5, 4200, 0)], [haus('K2b', 1931, 6, 5200, 4)], [haus('K2c', 1935, 3, 2400, 3)], [haus('K2d', 1925, 2, 1500, 7)],
  [haus('K3a', 1956, 4, 4000, 0)], [haus('K3b', 1960, 5, 5000, 1)], [haus('K3c', 1952, 3, 2500, 2)], [haus('K3d', 1962, 2, 1600, 7)],
  [haus('K4a', 1972, 5, 6000, 0)], [haus('K4b', 1975, 4, 4500, 1)], [haus('K4c', 1969, 3, 3000, 3)], [haus('K4d', 1978, 6, 5600, 5)],
  [haus('K5a', 1985, 4, 4200, 0)], [haus('K5b', 1998, 5, 5200, 1)], [haus('K5c', 2006, 3, 3000, 3)], [haus('K5d', 1990, 2, 2000, 6)],
  [haus('K6a', 1995, 4, 4500, 0, { lage: 'center' })], [haus('K6b', 2008, 3, 3200, 3, { lage: 'center' })],
  [haus('K7a', 2005, 3, 3000, 0, { format: 'sport' })], [haus('K7b', 2010, 2, 2000, 2, { format: 'sport' })],
  [haus('K7c', 1998, 1, 1200, 1, { format: 'sport' })], [haus('K7d', 2012, 2, 2500, 4, { format: 'sport', lage: 'center' })],
  [haus('U1', 1974, 4, 4000, 2), { status: 'umbau' }, 'Status: Umbau'],
  [haus('U2', 1958, 4, 3800, 1), { status: 'raeumung' }, 'Status: Räumung'],
  [haus('U3', 1930, 4, 3600, 0), { status: 'leer' }, 'Status: leer'],
  [haus('U4', 1993, 4, 4200, 3), { status: 'geschlossen' }, 'Status: geschlossen'],
  [haus('U5', 1971, 4, 4200, 4), { untermieter: ['Preisfuchs', 'MVZ Stadtmitte'] }, 'Untermieter EG + OG'],
  [haus('U6', 1908, 4, 4000, 2, { substanz: 25 }), {}, 'Patina (Substanz 25)'],
  [haus('U7', 1976, 4, 4400, 6, { substanz: 22 }), { untermieter: ['FitWerk 24'] }, 'Patina + FitWerk 24'],
];
const teile = [];
let letzteSonne = null;
const eintraege = liste.map(([h, opt = {}, titel]) => ({
  titel: titel ?? `${FAMILIEN[h.format === 'sport' ? 7 : h.lage === 'center' ? 6 : 0] ?? ''} ${h.baujahr}`.trim(),
  unter: '',
  bau(S, scene) {
    // Schattenkarte der vorigen Kachel freigeben (sonst läuft bei vielen Kacheln der GPU-Speicher voll)
    if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
    letzteSonne = scene.userData.sonne;
    letzteSonne.shadow.mapSize.set(4096, 4096);
    const t0 = performance.now();
    const erg = warenhaus(S, scene, h, { x: 0, z: 0, ...opt });
    sockel(S, 0, 0, erg.w, erg.d, 5);
    teile.push(erg.teile);
    this.titel = titel ?? `F${erg.familie} ${FAMILIEN[erg.familie]} · ${h.baujahr}`;
    this.unter = `${h.etagen.filter((e) => e >= 0).length} Et. · ${h.grundflaecheQm} m² · Fassade ${h.fassade} · ${erg.teile} Teile · ${(performance.now() - t0).toFixed(0)} ms`;
    return new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(erg.w + 5, erg.hoehe, erg.d + 5));
  },
}));
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Hartwig: Warenhaus-Baukasten', spalten: 4, kachel: [480, 480] }), 50);
void teile;
