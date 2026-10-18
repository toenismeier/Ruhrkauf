import { zeigeKatalog } from '../kit/katalog.js';
import { abteilungKachel } from '../kit/abteilung.js';
import { SPORT_NAMEN } from '../kit/sportabteilung.js';

const HG = '#26313a';
const k = (art, titel, o = {}) => ({
  titel: titel ?? SPORT_NAMEN[art], hintergrund: HG,
  bau(S, scene) {
    const box = abteilungKachel(S, scene, art, { seed: o.seed ?? art.length * 7, ...o });
    this.unter = `${o.unter ?? art} · ${(o.nx ?? 3) * 5} × ${(o.nz ?? 3) * 5} m · ${S.anzahl} Teile`;
    return box;
  },
});
const eintraege = [
  k('sportschuhe', 'Sportschuhe', { unter: 'Schuhwand nach Sportarten, Anprobe, Laufanalyse' }),
  k('sporttextil', 'Sportbekleidung', { unter: 'Markenshops Nordline, Sprinta, Talgrat, Trikots', seed: 3 }),
  k('outdoor', 'Outdoor', { unter: 'Zelt, Kanu, Rucksack-, Jacken-, Schlafsackwand' }),
  k('rad', 'Fahrrad', { unter: 'Radwand, Helme, Räder, Werkstatt mit Montageständern' }),
  k('wintersport', 'Wintersport', { unter: 'Skiwand, Skischuh-Anprobe, Snowboards, Skiservice' }),
  k('teamsport', 'Teamsport', { unter: 'Kunstrasen, Tor, Ballkörbe, Trikotwand, Beflockung' }),
];
zeigeKatalog(eintraege, { titel: 'Hartwig Sport: Abteilungen · 15 × 15 m', spalten: 3, kachel: [700, 640] });
