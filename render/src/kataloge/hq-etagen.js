// HQ-Etagen als Schnitt: echte Etagen aus hq-beispiel.json (Teilbelegung, zwei Abteilungen auf einer Etage, Leerfläche,
// freie Etage) und alle zehn Abteilungen in den Stufen 0 bis 3 (Stufe aus dem JSON überschrieben).
import { zeigeKatalog } from '../kit/katalog.js';
import { hqEtage, hqEtagenMasse, ABTEILUNGEN } from '../kit/hq.js';
import hq from '../../hq-beispiel.json';
import umzug from '../../hq-beispiel-umzug.json';

const HG = '#26313a';
const geschoss = (nr) => (nr === 0 ? 'EG' : `${nr}. OG`);
const eintraege = [];
const eintrag = (g, nr, titel, stufe, zone) => eintraege.push({
  titel, hintergrund: HG,
  bau(S, scene) {
    const res = hqEtage(S, scene, g, nr, { ...(stufe === undefined ? {} : { stufe }), zone });
    const e = g.etagen.find((q) => q.nr === nr);
    const belegt = (e.abteilungen ?? []).map((a) => `${ABTEILUNGEN[a.id].name} ${a.fte} FTE`).join(', ') || (e.gemietet ? 'gemietet, leer' : 'nicht gemietet');
    this.unter = `${res.breite} × ${res.tiefe} m · ${e.qm} m² · ${belegt} · ${res.figuren} Figuren · ${res.anzahl} Teile`;
    return res.box;
  },
});
// 1. Alle zehn Abteilungen in den Stufen 0 bis 3: je Abteilung die Etage aus dem JSON mit dem größten FTE-Anteil
const alleGeb = hq.gebaeude;
for (const id of Object.keys(ABTEILUNGEN)) {
  let best = null;
  for (const g of alleGeb) for (const e of g.etagen) for (const a of e.abteilungen ?? []) if (a.id === id && (!best || a.fte > best.a.fte)) best = { g, e, a };
  if (!best) continue;
  // Etage nur mit dieser Abteilung, FTE aus dem JSON
  // Abteilungskachel: die Abteilung füllt die Etage (FTE = Nutzfläche hinter dem Kern / 14 m²)
  const em = hqEtagenMasse(best.g, best.e.nr), fte = Math.floor(((em.w - 8.3) * em.d) / 14);
  const g1 = { ...best.g, etagen: best.g.etagen.map((e) => (e === best.e ? { ...e, abteilungen: [{ ...best.a, fte }] } : e)) };
  for (const st of [0, 1, 2, 3]) eintrag(g1, best.e.nr, `${ABTEILUNGEN[id].name} · Stufe ${st} · ${best.g.name.replace('Hartwig-', '')} ${geschoss(best.e.nr)} · Ausschnitt`, st, id);
}
// 2. Echte Etagen: zwei Abteilungen auf einer Etage, Empfang im EG, Leerfläche, freie Etage (Angebot)
const turm = hq.gebaeude[0];
const zwei = turm.etagen.find((e) => e.nr !== 0 && (e.abteilungen ?? []).length === 2);
const leer = turm.etagen.find((e) => e.gemietet && !(e.abteilungen ?? []).length);
eintrag(turm, 0, `${turm.name} · EG mit Empfang`);
if (zwei) eintrag(turm, zwei.nr, `${turm.name} · ${geschoss(zwei.nr)} · zwei Abteilungen`);
if (leer) eintrag(turm, leer.nr, `${turm.name} · ${geschoss(leer.nr)} · Leerfläche`);
const ang = hq.angebote[0];
if (ang) eintrag(ang, ang.etagen[1]?.nr ?? 0, `Angebot ${ang.stadt} · freie Etage`);
// 3. Nach Umzug: Etage mit zwei Abteilungen im neuen Gebäude
const neu = umzug.gebaeude[0];
const neuZwei = neu?.etagen.find((e) => (e.abteilungen ?? []).length >= 2);
if (neuZwei) eintrag(neu, neuZwei.nr, `Nach Umzug · ${neu.name} · ${geschoss(neuZwei.nr)}`);
zeigeKatalog(eintraege, { titel: 'HQ-Etagen: zehn Abteilungen, Stufen 0 bis 3', spalten: 4, kachel: [800, 640] });
