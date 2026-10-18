// HQ-Ergänzung: Vorstandsetage (Büros mit Namensschild, CEO, Sitzungssaal, Empfang), Produktentwicklungs-Studio
// (Startbesetzung der Engine, CRO und CDO unbesetzt) in den Stufen 0 bis 3 und Marketing mit CRM-Leitstand. Alle Namen fiktiv.
import { zeigeKatalog } from '../kit/katalog.js';
import { hqEtage, hqEtagenMasse, ABTEILUNGEN } from '../kit/hq.js';
import hq from '../../hq-beispiel.json';

const HG = '#26313a';
const RESSORTS = [
  { id: 'cfo', kurz: 'CFO', titel: 'Finanzen', name: 'Renate Kolbeck', portraet: { kleidungFarbe: 'marine' } },
  { id: 'coo', kurz: 'COO', titel: 'Betrieb', name: 'Dieter Hambrock', portraet: { kleidungFarbe: 'anthrazit' } },
  { id: 'cso', kurz: 'CSO', titel: 'Vertrieb', name: 'Murat Demirel', portraet: { kleidungFarbe: 'bordeaux' } },
  { id: 'cpo', kurz: 'CPO', titel: 'Einkauf', name: 'Gisela Wernicke', portraet: { kleidungFarbe: 'camel' } },
  { id: 'cmo', kurz: 'CMO', titel: 'Marketing', name: 'Jens Opitz', portraet: { kleidungFarbe: 'petrol' } },
  { id: 'chro', kurz: 'CHRO', titel: 'Personal', name: 'Sabine Lückemeyer', portraet: { kleidungFarbe: 'grau' } },
  { id: 'cro', kurz: 'CRO', titel: 'Restrukturierung' },
  { id: 'cdo', kurz: 'CDO', titel: 'Digital' },
];
const turm = hq.gebaeude[0], scheibe = hq.gebaeude[1];
const oben = [...turm.etagen].sort((a, b) => b.nr - a.nr)[0];
const vorstand = { etage: { gebaeudeId: turm.id, nr: oben.nr }, ressorts: RESSORTS };
const eintraege = [];
const eintrag = (g, nr, titel, opt) => eintraege.push({
  titel, hintergrund: HG,
  bau(S, scene) {
    const res = hqEtage(S, scene, g, nr, opt);
    this.unter = `${res.breite} × ${res.tiefe} m · ${res.zonen.map((z) => z.art === 'abt' ? ABTEILUNGEN[z.id].name : z.art).join(', ')} · ${res.figuren} Figuren · ${res.anzahl} Teile`;
    return res.box;
  },
});
eintrag(turm, oben.nr, `${turm.name} · ${oben.nr}. OG · Vorstandsetage`, { vorstand });
eintrag(turm, oben.nr, 'Vorstandsetage · Ausschnitt', { vorstand, zone: 'vorstand' });
const alleBesetzt = { ...vorstand, ressorts: RESSORTS.map((R, i) => R.name ? R : { ...R, name: ['Pieter van Hulst', 'Ingrid Sörensen'][i - 6], portraet: { kleidungFarbe: 'schwarz' } }) };
const sOben = [...scheibe.etagen].sort((a, b) => b.nr - a.nr)[0];
eintrag(scheibe, sOben.nr, `${scheibe.name} · ${sOben.nr}. OG · Vorstand voll besetzt`, { vorstand: { ...alleBesetzt, etage: { gebaeudeId: scheibe.id, nr: sOben.nr } } });
eintrag(turm, oben.nr, 'Vorstand ohne Ressortdaten', { vorstand: { etage: vorstand.etage, ressorts: [] }, zone: 'vorstand' });
// Produktentwicklung und Marketing in den Stufen 0 bis 3 (Abteilung füllt die Etage)
const g0 = turm, e0 = turm.etagen.find((e) => e.nr === 3);
for (const id of ['produkt', 'marketing']) {
  const em = hqEtagenMasse(g0, e0.nr), fte = Math.floor(((em.w - 8.3) * em.d) / 14 * (id === 'produkt' ? 0.45 : 1));
  const g1 = { ...g0, etagen: g0.etagen.map((e) => (e === e0 ? { ...e, abteilungen: [{ id, fte, stufe: 1 }] } : e)) };
  for (const st of [0, 1, 2, 3]) eintrag(g1, e0.nr, `${ABTEILUNGEN[id].name} · Stufe ${st} · Ausschnitt`, { stufe: st, zone: id });
}
zeigeKatalog(eintraege, { titel: 'HQ: Vorstandsetage, Produktentwicklung, CRM-Leitstand', spalten: 3, kachel: [900, 640] });
