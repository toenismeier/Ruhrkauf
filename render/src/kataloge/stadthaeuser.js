import { sockel } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { stadthaus, haeuserzeile } from '../kit/stadthaeuser.js';

const NAMEN = {
  gruenderzeit: 'Gründerzeit', jugendstil: 'Jugendstil', backstein: 'Backstein', fachwerk: 'Fachwerk',
  fuenfziger: '50er', siebziger: '70er', neubau: 'Neubau', barock: 'Barock', ddr_platte: 'DDR-Platte',
  bauhaus: 'Bauhaus', wiederaufbau: 'Wiederaufbau',
};

// Jede Kachel bekommt von neueSzene() eine 4096er-Schattenkarte, die der Katalog nicht freigibt.
// Bei ~80 Kacheln läuft der GPU-Speicher voll und das Blatt wird leer. Daher die vorige Karte hier freigeben.
let vorige = null;
function aufraeumen(scene) {
  const m = vorige?.userData?.sonne?.shadow?.map;
  if (m) { m.dispose(); vorige.userData.sonne.shadow.map = null; }
  vorige = scene;
}

function haus(stil, w, d, geschosse, seed, extra = {}) {
  return {
    titel: `${NAMEN[stil]}${extra.eck ? ' Eckhaus' : ''} ${w}×${d}, ${geschosse} OG`,
    bau(S, scene) {
      aufraeumen(scene);
      sockel(S, 0, 0, w, d, 4);
      const res = stadthaus(S, scene, { x: 0, z: 0, w, d, geschosse, stil, seed, ...extra });
      this.unter = `seed ${seed}${extra.region ? ' · ' + extra.region : ''} · ${res.teile} Teile · ${res.hoehe.toFixed(1)} m`;
    },
  };
}
function zeile(titel, n, seed, extra = {}) {
  const laenge = n * 13;
  return {
    titel,
    bau(S, scene) {
      aufraeumen(scene);
      sockel(S, 0, 0, laenge, 14, 4);
      const res = haeuserzeile(S, scene, { x: 0, z: 0, laenge, d: 14, seed, anzahl: n, ...extra });
      this.unter = `${res.haeuser.map((h) => NAMEN[h.stil]).join(', ')} · max ${Math.max(...res.haeuser.map((h) => h.teile))} Teile`;
    },
  };
}

// Pro Stil sechs Varianten gleicher Größe: Vielfalt kommt nur aus dem Seed
const GROESSE = {
  gruenderzeit: [17, 14, 4], jugendstil: [16, 13, 4], backstein: [15, 14, 5], fachwerk: [11, 12, 3],
  fuenfziger: [16, 12, 4], siebziger: [18, 14, 5], neubau: [16, 14, 5], barock: [13, 13, 3],
  ddr_platte: [24, 13, 5], bauhaus: [16, 13, 4], wiederaufbau: [14, 12, 3],
};
const REGIONEN = ['Nord', 'Ost', 'West', 'Mitte', 'Süd'];
const eintraege = [];
for (const [stil, [w, d, g]] of Object.entries(GROESSE)) {
  for (let i = 0; i < 6; i++) eintraege.push(haus(stil, w, d, g, 100 + i * 37, { region: REGIONEN[i % 5] }));
}
eintraege.push(
  haus('gruenderzeit', 24, 16, 5, 5, { eck: true }), haus('jugendstil', 22, 15, 5, 14, { eck: true }),
  haus('backstein', 26, 16, 6, 24, { eck: true }), haus('barock', 18, 14, 3, 7, { eck: true }),
  haus('bauhaus', 22, 14, 4, 9, { eck: true }), haus('ddr_platte', 26, 14, 5, 3, { eck: true }),
);
for (const reg of REGIONEN) eintraege.push(zeile(`Häuserzeile ${reg}`, 8, 70 + REGIONEN.indexOf(reg), { region: reg, cluster: 'grossstadt' }));
eintraege.push(zeile('Mittelstadt Süd', 8, 91, { region: 'Süd', cluster: 'mittelstadt' }));

// Für Detailprüfung: Indizes eintragen, sonst null
const DETAIL = null;
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(DETAIL ? DETAIL.map((i) => eintraege[i]) : eintraege, { titel: 'Stadthäuser – Vielfalt', spalten: 6, kachel: DETAIL ? [420, 420] : [420, 420] }), 50));
